
import { NativeTabs } from 'expo-router/native-tabs';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const colors = Colors.light;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{
        selected: { color: '#2563EB' },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="house.fill"
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="downloads">
        <NativeTabs.Trigger.Label>Downloads</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="arrow.down.circle"
          md="download"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="gearshape"
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
