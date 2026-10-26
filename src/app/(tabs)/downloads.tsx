
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const STORAGE_KEY = '@quicksave_download_history';

type DownloadItem = {
  id: string;
  platform: string;
  url: string;
  quality: string;
  fileUri: string;
  fileName?: string;
  title?: string;
  downloadedAt: string;
  status: 'completed';
};

function parseHistory(value: string | null): DownloadItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is DownloadItem =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.platform === 'string' &&
        typeof item.url === 'string' &&
        typeof item.quality === 'string' &&
        typeof item.fileUri === 'string' &&
        typeof item.downloadedAt === 'string' &&
        item.status === 'completed',
    );
  } catch {
    return [];
  }
}

export default function DownloadsScreen() {
  const router = useRouter();

  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDownloads = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const history = parseHistory(saved);

      const seen = new Set<string>();
      const uniqueHistory = history.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setDownloads(uniqueHistory);

      if (uniqueHistory.length !== history.length) {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(uniqueHistory),
        );
      }
    } catch {
      Alert.alert('Error', 'Could not load download history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDownloads();
    }, [loadDownloads]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDownloads();
  }, [loadDownloads]);

  const persistHistory = useCallback(async (updated: DownloadItem[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setDownloads(updated);
  }, []);

  const removeFromHistory = useCallback(
    async (id: string) => {
      try {
        await persistHistory(downloads.filter((item) => item.id !== id));
      } catch {
        Alert.alert('Error', 'Could not update download history.');
      }
    },
    [downloads, persistHistory],
  );

  const deleteItem = useCallback(
    (item: DownloadItem) => {
      Alert.alert(
        'Remove from history?',
        'This removes the entry from QuickSave history. It will not delete a copy already saved to your Gallery.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => void removeFromHistory(item.id),
          },
        ],
      );
    },
    [removeFromHistory],
  );

  const clearHistory = useCallback(() => {
    Alert.alert(
      'Clear download history?',
      'All QuickSave history entries will be removed. Videos already saved to Gallery will remain there.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear history',
          style: 'destructive',
          onPress: async () => {
            try {
              await persistHistory([]);
            } catch {
              Alert.alert('Error', 'Could not clear download history.');
            }
          },
        },
      ],
    );
  }, [persistHistory]);

  const checkLocalFile = useCallback(async (item: DownloadItem) => {
    if (!item.fileUri) {
      throw new Error('The saved video path is missing.');
    }

    const info = await FileSystem.getInfoAsync(item.fileUri);

    if (!info.exists) {
      throw new Error(
        'The video file is missing from QuickSave storage. Check Gallery or download the video again.',
      );
    }

    return item.fileUri;
  }, []);

  const openVideo = useCallback(
    async (item: DownloadItem) => {
      if (busyId) return;

      setBusyId(item.id);

      try {
        const uri = await checkLocalFile(item);

        router.push({
          pathname: '/video-player' as any,
          params: {
            uri,
            title: item.title || item.fileName || 'QuickSave Video',
          },
        });
      } catch (error) {
        Alert.alert(
          'Could not open video',
          error instanceof Error ? error.message : 'Please try again.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Remove history',
              style: 'destructive',
              onPress: () => void removeFromHistory(item.id),
            },
          ],
        );
      } finally {
        setBusyId(null);
      }
    },
    [busyId, checkLocalFile, router, removeFromHistory],
  );

  const shareVideo = useCallback(
    async (item: DownloadItem) => {
      if (busyId) return;

      setBusyId(item.id);

      try {
        const uri = await checkLocalFile(item);
        const available = await Sharing.isAvailableAsync();

        if (available) {
          await Sharing.shareAsync(uri, {
            mimeType: 'video/mp4',
            dialogTitle: `Share ${item.title || item.fileName || 'video'}`,
          });
        } else {
          await Share.share({
            message: `${item.title || item.fileName || 'Downloaded video'}\n${item.url}`,
          });
        }
      } catch (error) {
        Alert.alert(
          'Could not share video',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setBusyId(null);
      }
    },
    [busyId, checkLocalFile],
  );

  const formatDate = useCallback((value: string) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : date.toLocaleString();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Downloads</Text>
          <Text style={styles.subtitle}>Your saved download history.</Text>
        </View>

        {downloads.length > 0 && (
          <Pressable
            onPress={clearHistory}
            accessibilityRole="button"
            accessibilityLabel="Clear all download history"
            hitSlop={8}
            disabled={Boolean(busyId)}
          >
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Text style={styles.summaryIconText}>↓</Text>
        </View>

        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>Download history</Text>
          <Text style={styles.summarySubtitle}>
            {downloads.length} {downloads.length === 1 ? 'video' : 'videos'} in history
          </Text>
        </View>

        <Text style={styles.count}>{downloads.length}</Text>
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.description}>Loading history...</Text>
        </View>
      ) : downloads.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563EB"
            />
          }
        >
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>↓</Text>
            </View>

            <Text style={styles.cardTitle}>No downloads yet</Text>
            <Text style={styles.description}>
              Completed videos will appear here after they are saved.
              Pull down to refresh your history.
            </Text>

            <Pressable
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.browseButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.browseButtonText}>Go to Home</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563EB"
            />
          }
        >
          {downloads.map((item) => (
            <View key={item.id} style={styles.downloadCard}>
              <Pressable
                onPress={() => void openVideo(item)}
                disabled={Boolean(busyId)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.title || item.fileName || 'downloaded video'}`}
                style={({ pressed }) => [
                  styles.fileIcon,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.fileIconText}>
                  {busyId === item.id ? '…' : '▶'}
                </Text>
              </Pressable>

              <View style={styles.itemContent}>
                <Pressable
                  onPress={() => void openVideo(item)}
                  disabled={Boolean(busyId)}
                  accessibilityRole="button"
                >
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title || item.fileName || `${item.platform} video`}
                  </Text>
                </Pressable>

                {item.fileName ? (
                  <Text style={styles.itemFileName} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                ) : null}

                <Text style={styles.itemMeta}>
                  {item.quality} · Completed
                </Text>

                <Text style={styles.itemDate}>
                  {formatDate(item.downloadedAt)}
                </Text>

                <Text style={styles.itemUrl} numberOfLines={2}>
                  {item.url}
                </Text>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => void openVideo(item)}
                    disabled={Boolean(busyId)}
                    style={({ pressed }) => [
                      styles.playButton,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.playButtonText}>▶ Play</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void shareVideo(item)}
                    disabled={Boolean(busyId)}
                    style={({ pressed }) => [
                      styles.shareButton,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.shareButtonText}>↗ Share</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={() => deleteItem(item)}
                accessibilityRole="button"
                accessibilityLabel="Remove from download history"
                hitSlop={8}
                disabled={Boolean(busyId)}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  headerContent: { flex: 1 },
  title: { fontSize: 29, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 7 },
  clearText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EAF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: { color: '#2563EB', fontSize: 28, fontWeight: '700' },
  summaryContent: { flex: 1 },
  summaryTitle: { color: '#111827', fontSize: 14, fontWeight: '700' },
  summarySubtitle: { color: '#64748B', fontSize: 11, marginTop: 4 },
  count: { color: '#2563EB', fontSize: 20, fontWeight: '800' },
  emptyScroll: { flexGrow: 1, paddingBottom: 24 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EAF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 32, color: '#2563EB' },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  browseButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  browseButtonText: { color: '#FFFFFF', fontWeight: '700' },
  list: { paddingTop: 18, paddingBottom: 30, gap: 12 },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconText: { color: '#2563EB', fontSize: 18, fontWeight: '800' },
  itemContent: { flex: 1 },
  itemTitle: { color: '#111827', fontSize: 14, fontWeight: '700' },
  itemFileName: { color: '#64748B', fontSize: 10, marginTop: 4 },
  itemMeta: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  itemDate: { color: '#94A3B8', fontSize: 10, marginTop: 5 },
  itemUrl: { color: '#64748B', fontSize: 10, lineHeight: 15, marginTop: 6 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  playButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  playButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  shareButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  shareButtonText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  deleteButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  deleteText: { color: '#DC2626', fontSize: 23, lineHeight: 25 },
  pressed: { opacity: 0.75 },
});
