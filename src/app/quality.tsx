
import { useEffect, useState } from 'react';
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

type VideoFormat = {
  id: string;
  label: string;
  resolution: number | null;
  sizeBytes: number | null;
  url: string;
};

type VideoInfoResponse = {
  success: boolean;
  platform?: string;
  formats?: VideoFormat[];
  message?: string;
};

const API_BASE_URL = 'http://192.168.1.7:5000';

function formatSize(bytes: number | null) {
  if (bytes == null || bytes <= 0) {
    return 'File size unavailable';
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QualityScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    platform?: string;
    url?: string;
  }>();

  const platform =
    typeof params.platform === 'string'
      ? params.platform
      : 'Video';

  const videoUrl =
    typeof params.url === 'string'
      ? params.url.trim()
      : '';

  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [selectedQuality, setSelectedQuality] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverMessage, setServerMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadVideoInfo() {
      setIsLoading(true);
      setError('');
      setServerMessage('');
      setFormats([]);
      setSelectedQuality('');

      if (!videoUrl) {
        setError('Please return and enter a video URL.');
        setIsLoading(false);
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
            data.message || 'Could not load video information.'
          );
        }

        if (cancelled) return;

        const availableFormats = Array.isArray(data.formats)
          ? data.formats.filter(
              (format) =>
                typeof format.id === 'string' &&
                typeof format.url === 'string'
            )
          : [];

        setFormats(availableFormats);
        setServerMessage(data.message || '');

        if (availableFormats.length > 0) {
          setSelectedQuality(availableFormats[0].id);
        } else {
          setError(
            data.message ||
              'No supported video formats are available.'
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to connect to the backend.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadVideoInfo();

    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  const selectedFormat = formats.find(
    (format) => format.id === selectedQuality
  );

  const handleContinue = () => {
    if (!videoUrl) {
      Alert.alert(
        'Missing URL',
        'Please return and enter a video URL.'
      );
      return;
    }

    if (isLoading) {
      Alert.alert(
        'Please wait',
        'Video information is still loading.'
      );
      return;
    }

    if (!selectedFormat) {
      Alert.alert(
        'No format selected',
        'A supported video format is required before continuing.'
      );
      return;
    }

    router.push({
      pathname: '/download-progress',
      params: {
        platform,
        url: videoUrl,
        quality: selectedFormat.id,
        formatUrl: selectedFormat.url,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>DOWNLOAD SETTINGS</Text>

        <Text style={styles.title}>Choose quality</Text>

        <Text style={styles.subtitle}>
          Available video information is checked before you continue.
        </Text>

        <View style={styles.sourceCard}>
          <View style={styles.sourceIcon}>
            <Text style={styles.sourceIconText}>↗</Text>
          </View>

          <View style={styles.sourceContent}>
            <Text style={styles.sourceLabel}>Selected platform</Text>

            <Text style={styles.sourcePlatform}>{platform}</Text>

            <Text style={styles.url} numberOfLines={3}>
              {videoUrl}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Available quality options
        </Text>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color="#2563EB" />

            <Text style={styles.stateTitle}>
              Checking video information...
            </Text>

            <Text style={styles.stateDescription}>
              Connecting to QuickSave backend.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>!</Text>
            </View>

            <Text style={styles.stateTitle}>
              No formats available
            </Text>

            <Text style={styles.stateDescription}>{error}</Text>

            <Pressable
              onPress={() => router.back()}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>
                Go back
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {formats.map((format) => {
              const selected = selectedQuality === format.id;

              return (
                <Pressable
                  key={format.id}
                  onPress={() => setSelectedQuality(format.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.qualityCard,
                    selected && styles.qualityCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.qualityIcon,
                      selected && styles.qualityIconSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.qualityIconText,
                        selected && styles.qualityIconTextSelected,
                      ]}
                    >
                      {format.resolution
                        ? `${format.resolution}p`
                        : 'ORIG'}
                    </Text>
                  </View>

                  <View style={styles.qualityContent}>
                    <Text style={styles.qualityName}>
                      {format.label}
                    </Text>

                    <Text style={styles.qualityDescription}>
                      {format.resolution
                        ? `${format.resolution}p resolution`
                        : 'Original resolution'}
                    </Text>

                    <Text style={styles.qualitySize}>
                      {formatSize(format.sizeBytes)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}

            <View style={styles.notice}>
              <Text style={styles.noticeIcon}>ⓘ</Text>

              <Text style={styles.noticeText}>
                {serverMessage ||
                  'Formats are based on information returned by the server.'}
                {'\n\n'}
                The original file may not expose its actual resolution.
                Multiple resolutions require source metadata support.
              </Text>
            </View>
          </>
        )}

        <Pressable
          onPress={handleContinue}
          disabled={isLoading || !selectedFormat}
          style={({ pressed }) => [
            styles.continueButton,
            (pressed || isLoading || !selectedFormat) &&
              styles.buttonDisabled,
          ]}
        >
          <Text style={styles.continueText}>
            {isLoading ? 'Please wait...' : 'Continue'}
          </Text>

          <Text style={styles.continueArrow}>→</Text>
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
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 10,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 23,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 27,
  },
  sourceIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIconText: {
    fontSize: 24,
    color: '#2563EB',
    fontWeight: '700',
  },
  sourceContent: {
    flex: 1,
  },
  sourceLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  sourcePlatform: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },
  url: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 13,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 12,
  },
  stateTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  stateDescription: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconText: {
    color: '#DC2626',
    fontSize: 23,
    fontWeight: '800',
  },
  retryButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
  },
  qualityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: 11,
  },
  qualityCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F5FF',
  },
  qualityIcon: {
    minWidth: 45,
    height: 45,
    paddingHorizontal: 4,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityIconSelected: {
    backgroundColor: '#DBEAFE',
  },
  qualityIconText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  qualityIconTextSelected: {
    color: '#2563EB',
  },
  qualityContent: {
    flex: 1,
  },
  qualityName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  qualityDescription: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  qualitySize: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 5,
  },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 13,
    borderRadius: 13,
    marginTop: 8,
  },
  noticeIcon: {
    color: '#2563EB',
    fontSize: 14,
  },
  noticeText: {
    flex: 1,
    color: '#475569',
    fontSize: 11,
    lineHeight: 17,
  },
  continueButton: {
    minHeight: 53,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2563EB',
    borderRadius: 15,
    marginTop: 22,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  continueArrow: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
