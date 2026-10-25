
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type AnimatedSplashOverlayProps = {
  onFinish: () => void;
};

export function AnimatedSplashOverlay({
  onFinish,
}: AnimatedSplashOverlayProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, {
      duration: 650,
      easing: Easing.out(Easing.back(1.3)),
    });

    opacity.value = withTiming(1, { duration: 450 });

    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.15, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    const timer = setTimeout(onFinish, 2500);

    return () => clearTimeout(timer);
  }, [onFinish, opacity, progress, scale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={styles.overlay}
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => { });
      }}
    >
      <Animated.View style={[styles.logo, logoStyle]}>
        <Text style={styles.logoArrow}>↓</Text>
      </Animated.View>

      <Animated.View style={[styles.brand, logoStyle]}>
        <Text style={styles.title}>QuickSave</Text>
        <Text style={styles.subtitle}>
          Save what you love watching.
        </Text>
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={[styles.progress, progressStyle]} />
        </View>
        <Text style={styles.loading}>
          PREPARING YOUR EXPERIENCE
        </Text>
      </View>
    </View>
  );
}

// Kept for compatibility with the existing Explore screen.
export function AnimatedIcon() {
  return (
    <View style={styles.smallLogo}>
      <Text style={styles.logoArrow}>↓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  logoArrow: {
    color: '#FFFFFF',
    fontSize: 60,
    lineHeight: 70,
    fontWeight: '700',
  },
  brand: {
    alignItems: 'center',
    marginTop: 24,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },
  bottom: {
    position: 'absolute',
    bottom: 65,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  track: {
    height: 4,
    width: '100%',
    backgroundColor: '#DBEAFE',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 5,
  },
  loading: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 13,
  },
  smallLogo: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
