
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
const REQUEST_TIMEOUT_MS = 60000;

type VideoFormat = {
  id: string;
  label: string;
  resolution: number;
  ext: string;
  sizeBytes: number | null;
  hasAudio?: boolean;
};

type VideoInfoResponse = {
  success: boolean;
  platform?: string;
  title?: string;
  duration?: number | null;
  qualities?: Array<{ value: string; label: string }>;
  message?: string;
};

type DownloadResponse = {
  success: boolean;
  job?: { id: string; status?: string };
  message?: string;
};

async function requestJson<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: any;

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error('Backend returned an invalid response.');
    }

    if (!response.ok) {
      throw new Error(
        typeof data.message === 'string'
          ? data.message
          : `Request failed (${response.status}).`,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Cannot connect to QuickSave backend. Check that the backend is running and your phone and computer are on the same Wi-Fi.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function qualityLabel(height: number) {
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  if (height >= 240) return '240p';
  return `${height}p`;
}

function mapQualities(input: VideoInfoResponse['qualities']): VideoFormat[] {
  if (!Array.isArray(input)) return [];

  const unique = new Map<number, VideoFormat>();

  for (const item of input) {
    const resolution = Number(item?.value);
    if (!Number.isFinite(resolution) || resolution <= 0) continue;

    unique.set(resolution, {
      id: String(resolution),
      label: item.label || qualityLabel(resolution),
      resolution,
      ext: 'mp4',
      sizeBytes: null,
      hasAudio: true,
    });
  }

  return [...unique.values()].sort((a, b) => b.resolution - a.resolution);
}

export default function QualityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ platform?: string; url?: string }>();

  const videoUrl = typeof params.url === 'string' ? params.url.trim() : '';
  const requestedPlatform =
    typeof params.platform === 'string' ? params.platform : 'Video';

  const [videoInfo, setVideoInfo] = useState<VideoInfoResponse | null>(null);
  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const loadVideoInfo = useCallback(async () => {
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setFormats([]);
    setSelectedFormatId('');

    if (!videoUrl) {
      setError('Video URL is missing. Go back and enter a URL.');
      setLoading(false);
      return;
    }

    try {
      // Backend route is GET /api/video-info?url=...
      const data = await requestJson<VideoInfoResponse>(
        `${API_BASE_URL}/api/video-info?url=${encodeURIComponent(videoUrl)}`,
      );

      if (!data.success) {
        throw new Error(data.message || 'Could not load video information.');
      }

      const available = mapQualities(data.qualities);
      setVideoInfo(data);
      setFormats(available);

      if (available.length > 0) {
        setSelectedFormatId(available[0].id);
      } else {
        setError(
          'YouTube did not return available qualities. You can retry, or check the backend logs.',
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load video information.',
      );
    } finally {
      setLoading(false);
    }
  }, [videoUrl]);

  useEffect(() => {
    void loadVideoInfo();
  }, [loadVideoInfo, retryKey]);

  const selectedFormat = useMemo(
    () => formats.find((item) => item.id === selectedFormatId),
    [formats, selectedFormatId],
  );

  const handleDownload = useCallback(async () => {
    if (!selectedFormat || downloading) return;

    setDownloading(true);

    try {
      const result = await requestJson<DownloadResponse>(
        `${API_BASE_URL}/api/download`,
        {
          url: videoUrl,
          quality: selectedFormat.resolution,
        },
      );

      const jobId = result.job?.id;

      if (!result.success || !jobId) {
        throw new Error(result.message || 'Backend did not return a download job ID.');
      }

      router.push({
        pathname: '/download-progress',
        params: {
          jobId,
          url: videoUrl,
          title: videoInfo?.title || 'QuickSave Video',
          platform: videoInfo?.platform || requestedPlatform,
          quality: String(selectedFormat.resolution),
        },
      });
    } catch (err) {
      Alert.alert(
        'Download could not start',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setDownloading(false);
    }
  }, [selectedFormat, downloading, videoUrl, router, videoInfo, requestedPlatform]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.heading}>Choose Quality</Text>
        <Text style={styles.subtitle}>
          Choose a resolution available for this video.
        </Text>

        <View style={styles.videoCard}>
          <Text style={styles.platform}>
            {videoInfo?.platform || requestedPlatform}
          </Text>
          <Text style={styles.videoTitle}>
            {videoInfo?.title || 'Video information'}
          </Text>
          {videoInfo?.duration != null && (
            <Text style={styles.duration}>
              Duration: {videoInfo.duration} seconds
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.stateText}>Loading video qualities...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load qualities</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => setRetryKey((value) => value + 1)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Available resolutions</Text>

            {formats.map((format) => {
              const selected = format.id === selectedFormatId;

              return (
                <Pressable
                  key={format.id}
                  onPress={() => setSelectedFormatId(format.id)}
                  disabled={downloading}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.qualityCard, selected && styles.selectedOption]}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>

                  <View style={styles.formatDetails}>
                    <Text style={styles.qualityName}>
                      {qualityLabel(format.resolution)}
                    </Text>
                    <Text style={styles.formatSize}>
                      {format.resolution}p · MP4 (output format)
                    </Text>
                  </View>

                  {selected && <Text style={styles.selectedLabel}>Selected</Text>}
                </Pressable>
              );
            })}

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Ready to download</Text>
              <Text style={styles.noticeText}>
                The backend will select the best available stream up to the chosen resolution.
              </Text>
            </View>

            <Pressable
              style={[
                styles.continueButton,
                (!selectedFormat || downloading) && styles.disabledButton,
              ]}
              onPress={() => void handleDownload()}
              disabled={!selectedFormat || downloading}
            >
              {downloading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.continueText}>Starting download...</Text>
                </View>
              ) : (
                <Text style={styles.continueText}>Download Video</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 10 },
  backText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },
  heading: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 6, marginBottom: 22 },
  videoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0',
  },
  platform: { color: '#2563EB', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  videoTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', lineHeight: 23 },
  duration: { marginTop: 8, color: '#64748B', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  qualityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 15, padding: 15, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  selectedOption: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: { borderColor: '#2563EB' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  formatDetails: { flex: 1 },
  qualityName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  formatSize: { fontSize: 12, color: '#64748B', marginTop: 4 },
  selectedLabel: { fontSize: 11, color: '#2563EB', fontWeight: '700', marginLeft: 6 },
  centerState: { paddingVertical: 50, alignItems: 'center' },
  stateText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  errorCard: {
    backgroundColor: '#FEF2F2', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#991B1B' },
  errorText: { color: '#991B1B', marginTop: 8, lineHeight: 21 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 10, marginTop: 8 },
  retryText: { color: '#1D4ED8', fontWeight: '700' },
  notice: {
    backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1,
    borderRadius: 14, padding: 14, marginTop: 8,
  },
  noticeTitle: { color: '#9A3412', fontSize: 14, fontWeight: '800' },
  noticeText: { color: '#9A3412', fontSize: 13, lineHeight: 19, marginTop: 5 },
  continueButton: {
    backgroundColor: '#2563EB', padding: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 18,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disabledButton: { opacity: 0.5 },
  continueText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
