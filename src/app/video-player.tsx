
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';

export default function VideoPlayerScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    uri?: string;
    title?: string;
  }>();

  const uri = typeof params.uri === 'string' ? params.uri : '';
  const title =
    typeof params.title === 'string'
      ? params.title
      : 'QuickSave Video';

  const [fileReady, setFileReady] = useState(false);
  const [error, setError] = useState('');

  const player = useVideoPlayer(
    uri ? { uri } : null,
    (instance) => {
      instance.loop = false;
    }
  );

  useEffect(() => {
    let active = true;

    async function checkFile() {
      if (!uri) {
        setError('Video file ka URI nahi mila.');
        return;
      }

      try {
        const info = await FileSystem.getInfoAsync(uri);

        if (!info.exists) {
          if (active) {
            setError('Video file device par nahi mili. Dobara download karo.');
          }
          return;
        }

        if (active) {
          setFileReady(true);
          setError('');
        }
      } catch {
        if (active) {
          setError('Video file access nahi ho pa rahi.');
        }
      }
    }

    void checkFile();

    return () => {
      active = false;
    };
  }, [uri]);

  useEffect(() => {
    if (!fileReady || !uri) return;

    try {
      player.play();
    } catch {
      setError('Video start nahi ho paayi. Dobara try karo.');
    }

    return () => {
      player.pause();
    };
  }, [fileReady, player, uri]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>

      <View style={styles.videoContainer}>
        {error ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setError('');
                setFileReady(false);
                if (uri) setFileReady(true);
              }}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : !fileReady ? (
          <View style={styles.messageBox}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Video load ho rahi hai...</Text>
          </View>
        ) : (
          <VideoView
            player={player}
            style={styles.video}
            nativeControls
            contentFit="contain"
            allowsPictureInPicture
          />
        )}
      </View>

      <Text style={styles.footer}>
        Agar video start na ho, toh file ko dobara download karke try karo.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 4,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  messageBox: {
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  errorText: {
    color: '#FF7777',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    color: '#999999',
    fontSize: 12,
    textAlign: 'center',
    padding: 12,
  },
});
