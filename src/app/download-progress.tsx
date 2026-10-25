
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
type DownloadState = 'ready' | 'downloading' | 'completed' | 'cancelled' | 'error';

export default function DownloadProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    platform?: string;
    url?: string;
    quality?: string;
  }>();

  const platform = typeof params.platform === 'string' ? params.platform : 'Video';
  const videoUrl = typeof params.url === 'string' ? params.url.trim() : '';
  const quality = typeof params.quality === 'string' ? params.quality : '720p';

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<DownloadState>('ready');
  const [message, setMessage] = useState(
    'Enter a direct video-file URL to begin downloading.',
  );

  const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      activeRef.current = false;
    };
  }, []);

  const startDownload = async () => {
    if (status === 'downloading') return;

    let parsed: URL;

    try {
      parsed = new URL(videoUrl);
    } catch {
      Alert.alert(
        'Direct file URL required',
        'This link is not a valid direct video-file URL. A YouTube, Facebook or Instagram page URL cannot be downloaded directly by this screen.',
      );
      return;
    }

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      !/\.(mp4|mov|m4v|webm)(?:$|[?#])/i.test(videoUrl)
    ) {
      Alert.alert(
        'Unsupported link',
        'Use an authorized direct video URL ending in .mp4, .mov, .m4v or .webm.',
      );
      return;
    }

    if (!FileSystem.documentDirectory) {
      Alert.alert('Storage unavailable', 'App storage is not available on this device.');
      return;
    }

    activeRef.current = true;
    setStatus('downloading');
    setProgress(0);
    setMessage('Downloading video…');

    const filename = `quicksave-${Date.now()}.mp4`;
    const destination = `${FileSystem.documentDirectory}${filename}`;

    try {
      const task = FileSystem.createDownloadResumable(
        videoUrl,
        destination,
        {},
        (event) => {
          if (!activeRef.current) return;

          if (event.totalBytesExpectedToWrite > 0) {
            setProgress(
              Math.min(
                100,
                Math.round(
                  (event.totalBytesWritten / event.totalBytesExpectedToWrite) * 100,
                ),
              ),
            );
          }
        },
      );

      downloadRef.current = task;
      const result = await task.downloadAsync();

      if (!activeRef.current) return;

      if (!result?.uri) {
        throw new Error('The download did not return a file.');
      }

      const permission = await MediaLibrary.requestPermissionsAsync(true);

      if (!permission.granted) {
        setStatus('error');
        setMessage('Gallery permission was not granted. The file may remain in app storage.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(result.uri);

      if (!activeRef.current) return;

      setProgress(100);
      setStatus('completed');
      setMessage('Video saved to your Gallery.');
      Alert.alert('Download complete', 'The video was saved to your Gallery.');
    } catch (error) {
      if (!activeRef.current) return;

      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Download failed. Please try again.',
      );
    } finally {
      downloadRef.current = null;
    }
  };

  const cancelDownload = async () => {
    activeRef.current = false;

    try {
      await downloadRef.current?.cancelAsync();
    } catch {
      // The download may already have finished.
    }

    downloadRef.current = null;
    setStatus('cancelled');
    setMessage('Download cancelled.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>‹  Home</Text>
        </Pressable>

        <Text style={styles.eyebrow}>DOWNLOAD MANAGER</Text>
        <Text style={styles.title}>Download progress</Text>
        <Text style={styles.subtitle}>Download and save an authorized video file.</Text>

        <View style={styles.mainCard}>
          <View style={styles.videoIcon}>
            <Text style={styles.videoIconText}>↓</Text>
          </View>

          <Text style={styles.platform}>{platform}</Text>
          <Text style={styles.videoUrl} numberOfLines={3}>
            {videoUrl || 'No URL provided'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Selected quality</Text>
            <Text style={styles.detailValue}>{quality}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.status}>{status.toUpperCase()}</Text>
          </View>

          <View style={styles.progressHeading}>
            <Text style={styles.progressLabel}>Download progress</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.progressHint}>{message}</Text>
        </View>

        {status !== 'completed' && status !== 'downloading' && (
          <Pressable onPress={startDownload} style={styles.homeButton}>
            <Text style={styles.homeButtonText}>
              {status === 'ready' ? 'Start Download' : 'Try Again'}
            </Text>
          </Pressable>
        )}

        {status === 'downloading' && (
          <Pressable onPress={cancelDownload} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel Download</Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.replace('/')} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 24 },
  backText: { color: '#2563EB', fontSize: 15, fontWeight: '600' },
  eyebrow: { color: '#2563EB', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#111827', fontSize: 28, fontWeight: '800', marginTop: 10 },
  subtitle: { color: '#64748B', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 23 },
  mainCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 22, padding: 20 },
  videoIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#EAF0FF', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  videoIconText: { color: '#2563EB', fontSize: 36, fontWeight: '700' },
  platform: { color: '#111827', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 15 },
  videoUrl: { color: '#64748B', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 22 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailLabel: { color: '#64748B', fontSize: 12 },
  detailValue: { color: '#1F2937', fontSize: 12, fontWeight: '700' },
  status: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  progressHeading: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 10 },
  progressLabel: { color: '#1F2937', fontSize: 13, fontWeight: '700' },
  progressPercent: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 8, backgroundColor: '#DBEAFE', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 8 },
  progressHint: { color: '#64748B', fontSize: 11, lineHeight: 17, marginTop: 12 },
  homeButton: { backgroundColor: '#2563EB', borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  homeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  cancelButton: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  cancelText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
});
