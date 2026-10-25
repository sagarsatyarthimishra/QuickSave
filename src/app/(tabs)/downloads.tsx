
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const STORAGE_KEY = '@quicksave_download_history';

type DownloadItem = {
  id: string;
  platform: string;
  url: string;
  quality: string;
  fileUri: string;
  downloadedAt: string;
  status: 'completed';
};

export default function DownloadsScreen() {
  const router = useRouter();

  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDownloads = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setDownloads([]);
        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        setDownloads([]);
        return;
      }

      const validDownloads = parsed.filter(
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

      setDownloads(validDownloads);
    } catch {
      Alert.alert('Error', 'Could not load download history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, [loadDownloads]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDownloads();
  };

  const deleteItem = (id: string) => {
    Alert.alert(
      'Remove from history?',
      'This removes the entry from QuickSave history, but does not delete the video from Gallery.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = downloads.filter((item) => item.id !== id);

              await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(updated),
              );

              setDownloads(updated);
            } catch {
              Alert.alert('Error', 'Could not remove this history entry.');
            }
          },
        },
      ],
    );
  };

  const clearHistory = () => {
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
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
              setDownloads([]);
            } catch {
              Alert.alert('Error', 'Could not clear download history.');
            }
          },
        },
      ],
    );
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Downloads</Text>
          <Text style={styles.subtitle}>
            Your saved download history.
          </Text>
        </View>

        {downloads.length > 0 && (
          <Pressable
            onPress={clearHistory}
            accessibilityRole="button"
            accessibilityLabel="Clear all download history"
            hitSlop={8}
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
            {downloads.length}{' '}
            {downloads.length === 1 ? 'video' : 'videos'} in history
          </Text>
        </View>

        <Text style={styles.count}>{downloads.length}</Text>
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.description}>Loading history...</Text>
        </View>
      ) : downloads.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>↓</Text>
          </View>

          <Text style={styles.cardTitle}>No downloads yet</Text>

          <Text style={styles.description}>
            Completed downloads will appear here after download history is
            connected.
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
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>▶</Text>
              </View>

              <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.platform} video
                </Text>

                <Text style={styles.itemMeta}>
                  {item.quality} · Completed
                </Text>

                <Text style={styles.itemDate}>
                  {formatDate(item.downloadedAt)}
                </Text>

                <Text style={styles.itemUrl} numberOfLines={2}>
                  {item.url}
                </Text>
              </View>

              <Pressable
                onPress={() => deleteItem(item.id)}
                accessibilityRole="button"
                accessibilityLabel="Remove from download history"
                hitSlop={8}
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
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 7,
  },
  clearText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
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
  summaryIconText: {
    color: '#2563EB',
    fontSize: 28,
    fontWeight: '700',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  summarySubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  count: {
    color: '#2563EB',
    fontSize: 20,
    fontWeight: '800',
  },
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
  icon: {
    fontSize: 32,
    color: '#2563EB',
  },
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
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  list: {
    paddingTop: 18,
    paddingBottom: 30,
    gap: 12,
  },
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
  fileIconText: {
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '800',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  itemDate: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 5,
  },
  itemUrl: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  deleteButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  deleteText: {
    color: '#DC2626',
    fontSize: 23,
    lineHeight: 25,
  },
  pressed: {
    opacity: 0.75,
  },
});
