
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Manage your QuickSave preferences.
      </Text>

      <View style={styles.card}>
        <Text style={styles.rowTitle}>Storage</Text>
        <Text style={styles.rowSubtitle}>
          Saved videos will be stored on your device.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowTitle}>App version</Text>
        <Text style={styles.rowSubtitle}>1.0.0</Text>
      </View>

      <Text style={styles.footer}>QuickSave · Made for simplicity</Text>
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
    marginBottom: 26,
  },
  card: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 6,
  },
  footer: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
