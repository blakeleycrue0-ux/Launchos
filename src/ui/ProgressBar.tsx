import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

/** Barra de progreso fina en champagne. `value` de 0 a 100. */
export function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const c = useTheme();
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(Math.max(0, Math.min(100, value)), { duration: 300 }); }, [value, v]);
  const fill = useAnimatedStyle(() => ({ width: `${v.value}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.surfaceAlt, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: c.accent }, fill]} />
    </View>
  );
}
