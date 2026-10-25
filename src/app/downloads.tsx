
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function DownloadsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.title}>Downloads</Text>
      <Text style={styles.subtitle}>
        Track your video downloads in one place.
      </Text>

      <View style={styles.emptyCard}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>↓</Text>
        </View>

        <Text style={styles.cardTitle}>No downloads yet</Text>
        <Text style={styles.description}>
          Your download progress and completed videos
          will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#111827',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    marginTop: 32,
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
});
