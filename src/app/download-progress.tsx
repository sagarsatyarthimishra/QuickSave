
import { useEffect, useState } from 'react';
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

export default function DownloadProgressScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    platform?: string;
    url?: string;
    quality?: string;
  }>();

  const platform =
    typeof params.platform === 'string' ? params.platform : 'Video';

  const videoUrl =
    typeof params.url === 'string' ? params.url : '';

  const quality =
    typeof params.quality === 'string' ? params.quality : '720p';

  const [progress, setProgress] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    // UI demonstration only. This does not download a real video.
    const timer = setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          clearInterval(timer);
          return 100;
        }

        return Math.min(current + 5, 100);
      });
    }, 250);

    return () => clearInterval(timer);
  }, []);

  const handleCancel = () => {
    setCancelled(true);

    Alert.alert(
      'Preview stopped',
      'The demo progress has been cancelled. No video file was downloaded.',
      [
        {
          text: 'Back to Home',
          onPress: () => router.replace('/'),
        },
        {
          text: 'Stay here',
          style: 'cancel',
        },
      ],
    );
  };

  const completed = progress >= 100 && !cancelled;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.replace('/')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹  Home</Text>
        </Pressable>

        <Text style={styles.eyebrow}>DOWNLOAD MANAGER</Text>
        <Text style={styles.title}>Download progress</Text>
        <Text style={styles.subtitle}>
          Track the status of your selected video.
        </Text>

        <View style={styles.mainCard}>
          <View style={styles.videoIcon}>
            <Text style={styles.videoIconText}>↓</Text>
          </View>

          <Text style={styles.platform}>{platform}</Text>

          <Text style={styles.videoUrl} numberOfLines={2}>
            {videoUrl || 'No URL provided'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Selected quality</Text>
            <Text style={styles.detailValue}>{quality}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>File size</Text>
            <Text style={styles.detailValue}>Not available</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Download status</Text>
            <Text style={styles.status}>
              {cancelled
                ? 'Cancelled'
                : completed
                  ? 'Demo complete'
                  : 'Preview running'}
            </Text>
          </View>

          <View style={styles.progressHeading}>
            <Text style={styles.progressLabel}>Preview progress</Text>
            <Text style={styles.progressPercent}>
              {cancelled ? 'Stopped' : `${progress}%`}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${cancelled ? 0 : progress}%` },
              ]}
            />
          </View>

          <Text style={styles.progressHint}>
            {cancelled
              ? 'Preview cancelled.'
              : completed
                ? 'Preview finished. No video was saved.'
                : 'Demonstration only — no real download is running.'}
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>ⓘ</Text>
          <Text style={styles.noticeText}>
            This is a UI prototype. Real stream detection, network
            downloading, and saving to your Gallery are not connected yet.
          </Text>
        </View>

        {!completed && !cancelled && (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel preview</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            styles.homeButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 24,
  },
  backText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 10,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 23,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 22,
    padding: 20,
  },
  videoIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EAF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  videoIconText: {
    color: '#2563EB',
    fontSize: 36,
    fontWeight: '700',
  },
  platform: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 15,
  },
  videoUrl: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 7,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 12,
    flex: 1,
  },
  detailValue: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
  },
  status: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  progressHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  progressLabel: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
  },
  progressPercent: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  progressHint: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  notice: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 14,
    marginTop: 17,
  },
  noticeIcon: {
    color: '#2563EB',
    fontSize: 15,
  },
  noticeText: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  cancelText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  homeButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
});
