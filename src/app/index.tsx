
import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

type PlatformName = 'YouTube' | 'Facebook' | 'Instagram';

const PLATFORMS: {
  name: PlatformName;
  symbol: string;
  color: string;
}[] = [
    { name: 'YouTube', symbol: '▶', color: '#FF0033' },
    { name: 'Facebook', symbol: 'f', color: '#1877F2' },
    { name: 'Instagram', symbol: '◎', color: '#C13584' },
  ];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformName>('YouTube');
  const [videoUrl, setVideoUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = () => {
    Keyboard.dismiss();

    const trimmedUrl = videoUrl.trim();

    if (!trimmedUrl) {
      Alert.alert('Video URL required', 'Please paste a video URL first.');
      return;
    }

    let parsedUrl: URL;

    const handleDownload = () => {
      Keyboard.dismiss();

      const trimmedUrl = videoUrl.trim();

      if (!trimmedUrl) {
        Alert.alert('Video URL required', 'Please paste a video URL first.');
        return;
      }

      let parsedUrl: URL;

      try {
        parsedUrl = new URL(trimmedUrl);
      } catch {
        Alert.alert('Invalid URL', 'Please enter a valid video URL.');
        return;
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        Alert.alert('Invalid URL', 'Please enter a valid HTTP or HTTPS URL.');
        return;
      }

      router.push({
        pathname: '/quality',
        params: {
          platform: selectedPlatform,
          url: trimmedUrl,
        },
      });
    };

    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>↓</Text>
            </View>

            <View>
              <Text style={styles.brandName}>QuickSave</Text>
              <Text style={styles.brandSubtitle}>
                Your media, your way
              </Text>
            </View>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>QS</Text>
          </View>
        </View>

        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.eyebrow}>VIDEO DOWNLOADER</Text>

          <Text style={styles.heading}>
            Save what you{'\n'}
            <Text style={styles.headingAccent}>love watching.</Text>
          </Text>

          <Text style={styles.description}>
            Paste a supported video link to get started.
          </Text>
        </View>

        {/* Platform selection */}
        <Text style={styles.sectionTitle}>Choose a platform</Text>

        <View style={styles.platformRow}>
          {PLATFORMS.map((platform) => {
            const selected = selectedPlatform === platform.name;

            return (
              <Pressable
                key={platform.name}
                onPress={() => setSelectedPlatform(platform.name)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.platformCard,
                  selected && styles.platformCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.platformIcon,
                    { backgroundColor: platform.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.platformSymbol,
                      platform.name === 'Facebook' &&
                      styles.facebookSymbol,
                    ]}
                  >
                    {platform.symbol}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.platformName,
                    selected && styles.selectedText,
                  ]}
                >
                  {platform.name}
                </Text>

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
        </View>

        {/* URL input card */}
        <View style={styles.inputCard}>
          <View style={styles.cardHeadingRow}>
            <View style={styles.linkIcon}>
              <Text style={styles.linkIconText}>↗</Text>
            </View>

            <View style={styles.cardHeadingText}>
              <Text style={styles.cardTitle}>Video link</Text>
              <Text style={styles.cardSubtitle}>
                Paste the URL below
              </Text>
            </View>
          </View>

          <TextInput
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://example.com/video"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleDownload}
            style={styles.urlInput}
            accessibilityLabel="Video URL"
          />

          <Pressable
            onPress={handleDownload}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.downloadButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.downloadIcon}>↓</Text>
            <Text style={styles.downloadButtonText}>
              {isLoading ? 'Checking link...' : 'Continue'}
            </Text>
            {!isLoading && (
              <Text style={styles.buttonArrow}>→</Text>
            )}
          </Pressable>

          <View style={styles.noticeRow}>
            <Text style={styles.noticeIcon}>ⓘ</Text>
            <Text style={styles.noticeText}>
              Only use supported links and content you are
              authorized to download.
            </Text>
          </View>
        </View>

        {/* Download activity */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Download activity</Text>
          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>RECENT</Text>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>↓</Text>
          </View>

          <Text style={styles.emptyTitle}>Nothing here yet</Text>

          <Text style={styles.emptyDescription}>
            Your download progress and saved videos will
            appear here.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          QUICKSave  ·  SIMPLE. FAST. ORGANIZED.
        </Text>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
  },
  brandName: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E8EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  welcomeSection: {
    marginTop: 35,
    marginBottom: 27,
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  heading: {
    color: '#111827',
    fontSize: 35,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  headingAccent: {
    color: '#2563EB',
  },
  description: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 11,
  },
  sectionTitle: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 25,
  },
  platformCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 17,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 9,
  },
  platformCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F5FF',
  },
  platformIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformSymbol: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  facebookSymbol: {
    fontSize: 31,
  },
  platformName: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedText: {
    color: '#1D4ED8',
  },
  radio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF4',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 17,
  },
  linkIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIconText: {
    color: '#2563EB',
    fontSize: 23,
    fontWeight: '700',
  },
  cardHeadingText: {
    flex: 1,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  urlInput: {
    height: 51,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    paddingHorizontal: 13,
    color: '#111827',
    fontSize: 13,
    marginBottom: 13,
  },
  downloadButton: {
    minHeight: 53,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  downloadIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '700',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    marginLeft: 2,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 15,
  },
  noticeIcon: {
    color: '#64748B',
    fontSize: 13,
  },
  noticeText: {
    flex: 1,
    color: '#64748B',
    fontSize: 10,
    lineHeight: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 29,
    marginBottom: 13,
  },
  historyBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#EAF0FF',
  },
  historyBadgeText: {
    color: '#2563EB',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF4',
    paddingHorizontal: 20,
    paddingVertical: 23,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconText: {
    color: '#64748B',
    fontSize: 29,
    fontWeight: '600',
  },
  emptyTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyDescription: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 240,
  },
  footer: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 27,
  },
});
