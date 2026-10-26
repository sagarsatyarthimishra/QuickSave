
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const API_BASE_URL = 'http://192.168.1.7:5000';
const REQUEST_TIMEOUT_MS = 60000;
const SUPPORTED_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v']);

type VideoFormat = {
  id: string;
  label: string;
  resolution: number;
  ext: string;
  sizeBytes: number | null;
  sizeType?: 'exact' | 'estimated' | 'unknown';
  hasAudio?: boolean;
};

type VideoInfoResponse = {
  success: boolean;
  platform?: string;
  title?: string;
  duration?: number | null;
  formats?: VideoFormat[];
  message?: string;
};

type DownloadResponse = {
  success: boolean;
  job?: {
    id: string;
    status?: string;
  };
  message?: string;
};

function getQualityLabel(height: number) {
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  if (height >= 240) return '240p';
  return `${height}p`;
}

function formatSize(
  bytes: number | null,
  sizeType?: 'exact' | 'estimated' | 'unknown',
) {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
    return 'Size unavailable';
  }

  const size =
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return sizeType === 'estimated' ? `~${size}` : size;
}

async function requestJson<T>(
  url: string,
  body?: Record<string, unknown>,
): Promise<T> {
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
    let data: unknown;

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error('Server returned an invalid response.');
    }

    if (!response.ok) {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : `Request failed (${response.status}).`;

      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Cannot connect to QuickSave backend. Check that the backend is running and your device is on the same Wi-Fi.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getAvailableFormats(input: unknown): VideoFormat[] {
  if (!Array.isArray(input)) return [];

  const uniqueByResolution = new Map<number, VideoFormat>();

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;

    const format = item as VideoFormat;

    if (
      typeof format.id !== 'string' ||
      !format.id.trim() ||
      !Number.isFinite(format.resolution) ||
      format.resolution <= 0 ||
      typeof format.ext !== 'string' ||
      !SUPPORTED_EXTENSIONS.has(format.ext.toLowerCase())
    ) {
      continue;
    }

    const existing = uniqueByResolution.get(format.resolution);

    // Keep only one valid option per resolution.
    if (!existing || format.ext.toLowerCase() === 'mp4') {
      uniqueByResolution.set(format.resolution, format);
    }
  }

  return [...uniqueByResolution.values()].sort(
    (a, b) => b.resolution - a.resolution,
  );
}

export default function QualityScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    platform?: string;
    url?: string;
  }>();

  const videoUrl =
    typeof params.url === 'string' ? params.url.trim() : '';

  const requestedPlatform =
    typeof params.platform === 'string' ? params.platform : 'Video';

  const [videoInfo, setVideoInfo] = useState<VideoInfoResponse | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const loadVideoInfo = useCallback(async () => {
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setSelectedFormatId('');

    if (!videoUrl) {
      setError('Video URL is missing. Please go back and enter a URL.');
      setLoading(false);
      return;
    }

    try {
      const data = await requestJson<VideoInfoResponse>(
        `${API_BASE_URL}/api/video-info`,
        { url: videoUrl },
      );

      if (!data.success) {
        throw new Error(data.message || 'Unable to retrieve video qualities.');
      }

      const availableFormats = getAvailableFormats(data.formats);

      setVideoInfo({
        ...data,
        formats: availableFormats,
      });

      if (availableFormats.length === 0) {
        setError('No supported video qualities are available for this video.');
        return;
      }

      setSelectedFormatId(availableFormats[0].id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not retrieve video information.',
      );
    } finally {
      setLoading(false);
    }
  }, [videoUrl]);

  useEffect(() => {
    void loadVideoInfo();
  }, [loadVideoInfo, retryKey]);

  const formats = videoInfo?.formats ?? [];

  const resolutions = useMemo(
    () =>
      [...new Set(formats.map((format) => format.resolution))].sort(
        (a, b) => b - a,
      ),
    [formats],
  );

  const selectedFormat = formats.find(
    (format) => format.id === selectedFormatId,
  );

  const handleDownload = useCallback(async () => {
    if (!selectedFormat || downloading) return;

    setDownloading(true);

    try {
      // The backend validates and uses the numeric resolution in `quality`.
      const result = await requestJson<DownloadResponse>(
        `${API_BASE_URL}/api/download`,
        {
          url: videoUrl,
          quality: selectedFormat.resolution,
        },
      );

      const jobId = result.job?.id;

      if (!result.success || !jobId) {
        throw new Error(
          result.message || 'Backend did not return a download job ID.',
        );
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
  }, [
    selectedFormat,
    downloading,
    videoUrl,
    router,
    videoInfo?.title,
    videoInfo?.platform,
    requestedPlatform,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Choose Quality</Text>
        <Text style={styles.subtitle}>
          Only qualities available for this video are shown.
        </Text>

        <View style={styles.videoCard}>
          <Text style={styles.platform}>
            {videoInfo?.platform ?? requestedPlatform}
          </Text>
          <Text style={styles.videoTitle}>
            {videoInfo?.title ?? 'Video information'}
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
            <Text style={styles.stateText}>
              Fetching available qualities...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              {formats.length === 0
                ? 'No qualities available'
                : 'Could not load qualities'}
            </Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => setRetryKey((value) => value + 1)}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {resolutions.length > 0 && (
              <Text style={styles.sectionTitle}>Available resolutions</Text>
            )}

            {resolutions.map((resolution) => {
              const options = formats.filter(
                (format) => format.resolution === resolution,
              );

              // No empty resolution groups are rendered.
              if (options.length === 0) return null;

              return (
                <View key={resolution} style={styles.qualityCard}>
                  <View style={styles.qualityHeader}>
                    <Text style={styles.qualityName}>
                      {getQualityLabel(resolution)}
                    </Text>
                    <Text style={styles.pixelText}>
                      {resolution} pixels high
                    </Text>
                  </View>

                  {options.map((format) => {
                    const selected = format.id === selectedFormatId;

                    return (
                      <Pressable
                        key={format.id}
                        onPress={() => setSelectedFormatId(format.id)}
                        disabled={downloading}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={[
                          styles.formatOption,
                          selected && styles.selectedOption,
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            selected && styles.radioSelected,
                          ]}
                        >
                          {selected && <View style={styles.radioDot} />}
                        </View>

                        <View style={styles.formatDetails}>
                          <Text style={styles.formatName}>
                            {format.ext.toUpperCase()}
                          </Text>
                          <Text style={styles.formatSize}>
                            {format.label} ·{' '}
                            {formatSize(format.sizeBytes, format.sizeType)}
                            {format.hasAudio === false ? ' · Video only' : ''}
                          </Text>
                        </View>

                        {selected && (
                          <Text style={styles.selectedLabel}>Selected</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Ready to download</Text>
              <Text style={styles.noticeText}>
                Choose one of the available qualities and tap Download Video.
              </Text>
            </View>

            <Pressable
              style={[
                styles.continueButton,
                (!selectedFormat || downloading) && styles.disabledButton,
              ]}
              onPress={() => void handleDownload()}
              disabled={!selectedFormat || downloading}
              accessibilityRole="button"
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
  heading: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#64748B', marginTop: 6, marginBottom: 22 },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  platform: { color: '#2563EB', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  videoTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', lineHeight: 23 },
  duration: { marginTop: 8, color: '#64748B', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  qualityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  qualityName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  pixelText: { fontSize: 12, color: '#64748B' },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  selectedOption: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioSelected: { borderColor: '#2563EB' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  formatDetails: { flex: 1 },
  formatName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  formatSize: { fontSize: 12, color: '#64748B', marginTop: 3 },
  selectedLabel: { fontSize: 11, color: '#2563EB', fontWeight: '700', marginLeft: 6 },
  centerState: { paddingVertical: 50, alignItems: 'center' },
  stateText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  errorCard: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#991B1B' },
  errorText: { color: '#991B1B', marginTop: 8, lineHeight: 21 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 10, marginTop: 8 },
  retryText: { color: '#1D4ED8', fontWeight: '700' },
  notice: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 8 },
  noticeTitle: { color: '#9A3412', fontSize: 14, fontWeight: '800' },
  noticeText: { color: '#9A3412', fontSize: 13, lineHeight: 19, marginTop: 5 },
  continueButton: { backgroundColor: '#2563EB', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disabledButton: { opacity: 0.5 },
  continueText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
