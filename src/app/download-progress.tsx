
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'http://192.168.1.7:5000';
const HISTORY_KEY = '@quicksave_download_history';
const POLL_INTERVAL_MS = 1500;

type DownloadState =
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'cancelled'
  | 'error';

type BackendJob = {
  id: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress?: number;
  title?: string | null;
  fileName?: string | null;
  message?: string;
  error?: string | null;
};

type JobResponse = {
  success: boolean;
  job?: BackendJob;
  message?: string;
};

type HistoryItem = {
  id: string;
  platform: string;
  url: string;
  quality: string;
  fileUri: string;
  fileName: string;
  title: string;
  downloadedAt: string;
  status: 'completed';
};

export default function DownloadProgressScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    platform?: string;
    url?: string;
    quality?: string;
    jobId?: string;
    title?: string;
  }>();

  const platform =
    typeof params.platform === 'string' ? params.platform : 'Video';
  const videoUrl = typeof params.url === 'string' ? params.url.trim() : '';
  const quality =
    typeof params.quality === 'string' ? params.quality : '720';
  const jobId = typeof params.jobId === 'string' ? params.jobId : '';
  const initialTitle =
    typeof params.title === 'string' ? params.title : 'QuickSave Video';

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<DownloadState>('ready');
  const [message, setMessage] = useState(
    'Ready to monitor your download.',
  );

  const activeRef = useRef(false);
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const fileTaskRef = useRef<FileSystem.DownloadResumable | null>(null);

  const safeFileName = useCallback((name: string) => {
    const cleaned = name
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
      .replace(/[. ]+$/g, '')
      .trim();

    return cleaned || `QuickSave-${Date.now()}.mp4`;
  }, []);

  const saveHistory = useCallback(
    async (fileUri: string, fileName: string, title: string) => {
      const existingText = await AsyncStorage.getItem(HISTORY_KEY);
      let history: HistoryItem[] = [];

      if (existingText) {
        try {
          const parsed: unknown = JSON.parse(existingText);
          if (Array.isArray(parsed)) {
            history = parsed.filter(
              (item): item is HistoryItem =>
                item !== null &&
                typeof item === 'object' &&
                typeof item.id === 'string',
            );
          }
        } catch {
          history = [];
        }
      }

      const entry: HistoryItem = {
        id: jobId || `${Date.now()}`,
        platform,
        url: videoUrl,
        quality,
        fileUri,
        fileName,
        title,
        downloadedAt: new Date().toISOString(),
        status: 'completed',
      };

      await AsyncStorage.setItem(
        HISTORY_KEY,
        JSON.stringify([
          entry,
          ...history.filter((item) => item.id !== entry.id),
        ]),
      );
    },
    [jobId, platform, videoUrl, quality],
  );

  const monitorDownload = useCallback(async () => {
    if (!jobId) {
      setStatus('error');
      setMessage(
        'Download job ID is missing. Return to quality selection and start the download again.',
      );
      return;
    }

    if (startedRef.current) return;

    startedRef.current = true;
    activeRef.current = true;
    setStatus('downloading');
    setMessage('Connecting to QuickSave backend...');

    try {
      let completedJob: BackendJob | null = null;

      while (activeRef.current) {
        const response = await fetch(
          `${API_BASE_URL}/api/download/${encodeURIComponent(jobId)}`,
        );

        const data = (await response.json()) as JobResponse;

        if (!response.ok || !data.success || !data.job) {
          throw new Error(
            data.message || 'Unable to retrieve download status.',
          );
        }

        const job = data.job;
        const nextProgress = Number(job.progress);

        if (Number.isFinite(nextProgress)) {
          setProgress(Math.max(0, Math.min(100, Math.round(nextProgress))));
        }

        setMessage(job.message || 'Processing video...');

        if (job.status === 'failed') {
          throw new Error(job.error || job.message || 'Download failed.');
        }

        if (job.status === 'completed') {
          completedJob = job;
          break;
        }

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, POLL_INTERVAL_MS);
          // The timeout is short and only used to poll the backend.
          void timer;
        });
      }

      if (!activeRef.current || !completedJob) return;

      setProgress(100);
      setMessage('Download completed on server. Saving video...');

      const directory = FileSystem.documentDirectory;
      if (!directory) {
        throw new Error('App storage is unavailable on this device.');
      }

      const fileName = safeFileName(
        completedJob.fileName ||
          completedJob.title ||
          initialTitle ||
          `QuickSave-${Date.now()}.mp4`,
      );

      const destination = `${directory}${Date.now()}-${fileName}`;

      const task = FileSystem.createDownloadResumable(
        `${API_BASE_URL}/api/download/${encodeURIComponent(jobId)}/file`,
        destination,
        {},
        (event) => {
          if (!activeRef.current) return;

          if (event.totalBytesExpectedToWrite > 0) {
            const fileProgress = Math.round(
              (event.totalBytesWritten / event.totalBytesExpectedToWrite) *
                100,
            );
            setProgress(Math.max(0, Math.min(100, fileProgress)));
          }
        },
      );

      fileTaskRef.current = task;
      const result = await task.downloadAsync();

      if (!activeRef.current) return;
      if (!result?.uri) throw new Error('The video file was not downloaded.');

      setMessage('Requesting Gallery permission...');
      const permission = await MediaLibrary.requestPermissionsAsync(true);

      if (!activeRef.current) return;

      if (!permission.granted) {
        setStatus('error');
        setMessage(
          `Video downloaded to app storage, but Gallery permission was denied. File: ${fileName}`,
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(result.uri);

      if (!activeRef.current || savedRef.current) return;

      await saveHistory(
        result.uri,
        fileName,
        completedJob.title || initialTitle,
      );

      savedRef.current = true;
      setProgress(100);
      setStatus('completed');
      setMessage('Video saved to Gallery and QuickSave history.');

      Alert.alert(
        'Download complete',
        `${fileName}\n\nSaved to Gallery and Downloads history.`,
        [
          {
            text: 'View Downloads',
            onPress: () => router.replace('/(tabs)/downloads'),
          },
          { text: 'Stay here', style: 'cancel' },
        ],
      );
    } catch (error) {
      if (!activeRef.current) return;

      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Download failed. Please try again.',
      );
    } finally {
      activeRef.current = false;
      startedRef.current = false;
      fileTaskRef.current = null;
    }
  }, [jobId, initialTitle, router, safeFileName, saveHistory]);

  useEffect(() => {
    void monitorDownload();

    return () => {
      activeRef.current = false;
    };
  }, [monitorDownload]);

  const cancelDownload = async () => {
    activeRef.current = false;

    try {
      await fileTaskRef.current?.cancelAsync();
    } catch {
      // The local file transfer may already have finished.
    }

    fileTaskRef.current = null;
    startedRef.current = false;
    setStatus('cancelled');
    setMessage(
      'Local monitoring or file saving was cancelled. The backend job may still be running.',
    );
  };

  const retryDownload = () => {
    startedRef.current = false;
    savedRef.current = false;
    setProgress(0);
    setStatus('ready');
    setMessage('Reconnecting to the existing download job...');
    void monitorDownload();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          onPress={() => router.replace('/')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Home</Text>
        </Pressable>

        <Text style={styles.eyebrow}>DOWNLOAD MANAGER</Text>
        <Text style={styles.title}>Download progress</Text>
        <Text style={styles.subtitle}>
          Downloading and saving your selected video.
        </Text>

        <View style={styles.mainCard}>
          <View style={styles.videoIcon}>
            <Text style={styles.videoIconText}>↓</Text>
          </View>

          <Text style={styles.platform}>{platform}</Text>
          <Text style={styles.videoUrl} numberOfLines={3}>
            {initialTitle}
          </Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Selected quality</Text>
            <Text style={styles.detailValue}>{quality}p</Text>
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
            <View
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>

          <Text style={styles.progressHint}>{message}</Text>
        </View>

        {status === 'downloading' && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.loadingText}>Working on your video...</Text>
          </View>
        )}

        {(status === 'error' || status === 'cancelled') && (
          <Pressable onPress={retryDownload} style={styles.homeButton}>
            <Text style={styles.homeButtonText}>Try Again</Text>
          </Pressable>
        )}

        {status === 'completed' && (
          <Pressable
            onPress={() => router.replace('/(tabs)/downloads')}
            style={styles.homeButton}
          >
            <Text style={styles.homeButtonText}>View Downloads</Text>
          </Pressable>
        )}

        {status === 'downloading' && (
          <Pressable onPress={cancelDownload} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace('/')}
          style={styles.secondaryButton}
        >
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  loadingText: { color: '#64748B', fontSize: 12 },
  homeButton: { backgroundColor: '#2563EB', borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  homeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  cancelButton: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  cancelText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
});
