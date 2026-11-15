import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

/** Interruptor propio (el nativo en web usa un turquesa que no pertenece a la paleta). */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useTheme();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => { p.value = withTiming(value ? 1 : 0, { duration: 180 }); }, [value, p]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [c.raised, c.accent]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 18 }] }));
  return (
    <Pressable onPress={() => { haptic.select(); onChange(!value); }} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <Animated.View style={[{ width: 44, height: 26, borderRadius: 13, padding: 3 }, track]}>
        <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: value ? '#16130D' : c.inkSoft }, thumb]} />
      </Animated.View>
    </Pressable>
  );
}
