import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const DURATION = 480;
const OFFSET = 20;

export function TabScreenAnimation({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(OFFSET);
  const opacity = useSharedValue(0);

  useFocusEffect(
    React.useCallback(() => {
      translateY.value = OFFSET;
      opacity.value = 0;
      translateY.value = withTiming(0, {
        duration: DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      opacity.value = withTiming(1, {
        duration: DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.wrapper, animatedStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
});
