import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';

const AP = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: boolean;
}

/** Pulsable con respuesta física: escala con muelle y vibración ligera. */
export function PressableScale({ style, scaleTo = 0.97, feedback = true, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AP
      {...rest}
      onPressIn={(e) => { s.value = withSpring(scaleTo, { damping: 18, stiffness: 420 }); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, { damping: 14, stiffness: 320 }); onPressOut?.(e); }}
      onPress={(e) => { if (feedback) haptic.tap(); onPress?.(e); }}
      style={[style, anim]}
    />
  );
}
