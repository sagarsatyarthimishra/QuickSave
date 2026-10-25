
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const API_BASE_URL = 'http://192.168.1.7:5000';

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
  downloadReady?: boolean;
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
  sizeType?: 'exact' | 'estimated' | 'unknown'
) {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
    return 'Size unavailable';
  }

  const size =
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  if (sizeType === 'estimated') return `~${size}`;
  return size;
}

export default function QualityScreen() {
  const params = useLocalSearchParams<{
    platform?: string;
    url?: string;
  }>();

  const videoUrl =
    typeof params.url === 'string' ? params.url.trim() : '';

  const requestedPlatform =
    typeof params.platform === 'string' ? params.platform : 'Video';

  const [videoInfo, setVideoInfo] =
    useState<VideoInfoResponse | null>(null);

  const [selectedFormatId, setSelectedFormatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchVideoInfo() {
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
        const response = await fetch(
          `${API_BASE_URL}/api/video-info`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: videoUrl }),
          }
        );

        const data: VideoInfoResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Unable to retrieve video formats.'
          );
        }

        if (cancelled) return;

        const availableFormats = Array.isArray(data.formats)
          ? data.formats.filter(
            (format) =>
              typeof format.id === 'string' &&
              Number.isFinite(format.resolution) &&
              format.resolution > 0
          )
          : [];

        setVideoInfo({
          ...data,
          formats: availableFormats,
        });

        if (availableFormats.length > 0) {
          setSelectedFormatId(availableFormats[0].id);
        } else {
          setError('No supported video formats were returned.');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not connect to the QuickSave backend.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchVideoInfo();

    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  const formats = videoInfo?.formats ?? [];

  const resolutions = useMemo(
    () =>
      [...new Set(formats.map((format) => format.resolution))]
        .sort((a, b) => b - a),
    [formats]
  );

  const selectedFormat = formats.find(
    (format) => format.id === selectedFormatId
  );

  function handleContinue() {
    if (!selectedFormat) {
      Alert.alert('Select quality', 'Please select a video format.');
      return;
    }

    Alert.alert(
      'Format selected',
      `${getQualityLabel(selectedFormat.resolution)} ${selectedFormat.ext.toUpperCase()} selected.\n\nThe actual download handler has not been connected yet. No file has been downloaded.`
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Choose Quality</Text>
        <Text style={styles.subtitle}>
          Select an available video resolution.
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
              Could not load qualities
            </Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => {
                // Re-entering this screen or changing the URL
                // triggers a fresh request. This button gives a clear
                // action without creating a second fetch implementation.
                Alert.alert(
                  'Retry',
                  'Go back and open this video again to retry metadata retrieval.'
                );
              }}
            >
              <Text style={styles.retryText}>Retry instructions</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Available resolutions
            </Text>

            {resolutions.map((resolution) => {
              const options = formats.filter(
                (format) => format.resolution === resolution
              );

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
                            {format.label} · {formatSize(format.sizeBytes, format.sizeType)}
                            {!format.hasAudio ? ' · Video only' : ''}                          </Text>
                        </View>

                        {selected && (
                          <Text style={styles.selectedLabel}>
                            Selected
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>
                Download integration pending
              </Text>
              <Text style={styles.noticeText}>
                These options come from the metadata API. Selecting a
                format does not start a download yet.
              </Text>
            </View>

            <Pressable
              style={[
                styles.continueButton,
                !selectedFormat && styles.disabledButton,
              ]}
              onPress={handleContinue}
              disabled={!selectedFormat}
            >
              <Text style={styles.continueText}>
                Confirm Selected Quality
              </Text>
            </Pressable>
          </>
        )}
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
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 22,
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  platform: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 23,
  },
  duration: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
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
  qualityName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  pixelText: {
    fontSize: 12,
    color: '#64748B',
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  selectedOption: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
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
  radioSelected: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  formatDetails: {
    flex: 1,
  },
  formatName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  formatSize: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  selectedLabel: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
    marginLeft: 6,
  },
  centerState: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  stateText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorText: {
    color: '#991B1B',
    marginTop: 8,
    lineHeight: 21,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  notice: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  noticeTitle: {
    color: '#9A3412',
    fontSize: 14,
    fontWeight: '800',
  },
  noticeText: {
    color: '#9A3412',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  continueButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
