
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',

          height:
            Platform.OS === 'ios'
              ? 60 + insets.bottom
              : 56 + insets.bottom,

          paddingTop: 7,
          paddingBottom:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom, 8)
              : Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>⌂</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 21 }}>↓</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 21 }}>⚙</Text>
          ),
        }}
      />

      <Tabs.Screen name="quality" options={{ href: null }} />
    </Tabs>
  );
}
