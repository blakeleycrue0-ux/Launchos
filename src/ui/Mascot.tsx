import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export type Expression = 'idle' | 'happy' | 'sleepy' | 'wow';
const EYES: Record<Expression, { h: number; w: number; gap: number }> = {
  idle: { h: 36, w: 15, gap: 31 },
  happy: { h: 25, w: 17, gap: 33 },
  sleepy: { h: 9, w: 16, gap: 31 },
  wow: { h: 44, w: 15, gap: 29 },
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const CY = 100;

interface Props {
  size?: number;
  expression?: Expression;
  /** false = estática (estados donde la animación distraería). */
  animated?: boolean;
  glow?: boolean;
}

/** Mascota de MIO: una esfera oscura con anillo luminoso y dos ojos verticales. */
export function Mascot({ size = 140, expression = 'idle', animated = true, glow = true }: Props) {
  const [reduce, setReduce] = React.useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined); }, []);
  const live = animated && !reduce;

  const e = EYES[expression];
  const h = useSharedValue(e.h);
  const w = useSharedValue(e.w);
  const gap = useSharedValue(e.gap);
  const look = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    h.value = withTiming(e.h, { duration: 260, easing: Easing.out(Easing.cubic) });
    w.value = withTiming(e.w, { duration: 260 });
    gap.value = withTiming(e.gap, { duration: 260 });
  }, [e.h, e.w, e.gap, h, w, gap]);

  // Flotación suave
  useEffect(() => {
    if (!live) { bob.value = 0; return; }
    bob.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [live, bob]);

  // Parpadeo y mirada ocasionales (no continuos, para no distraer)
  useEffect(() => {
    if (!live) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      if (Math.random() < 0.3) {
        look.value = withSequence(withTiming((Math.random() - 0.5) * 12, { duration: 280 }), withTiming(0, { duration: 420 }));
      } else {
        const base = EYES[expression].h;
        h.value = withSequence(withTiming(3, { duration: 90 }), withTiming(base, { duration: 140 }));
      }
      timer = setTimeout(tick, 2200 + Math.random() * 3200);
    };
    timer = setTimeout(tick, 1600);
    return () => { alive = false; clearTimeout(timer); };
  }, [live, expression, h, look]);

  const left = useAnimatedProps(() => ({ x: 100 - gap.value - w.value / 2 + look.value, y: CY - h.value / 2, width: w.value, height: h.value, rx: w.value / 2 }));
  const right = useAnimatedProps(() => ({ x: 100 + gap.value - w.value / 2 + look.value, y: CY - h.value / 2, width: w.value, height: h.value, rx: w.value / 2 }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (bob.value - 0.5) * 8 * (size / 140) }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, floatStyle]} accessible accessibilityRole="image" accessibilityLabel="Mio">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0.62" stopColor="#8A6BFF" stopOpacity="0" />
            <Stop offset="0.82" stopColor="#8A6BFF" stopOpacity={glow ? 0.34 : 0} />
            <Stop offset="1" stopColor="#8A6BFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="body" cx="38%" cy="30%" r="85%">
            <Stop offset="0" stopColor="#2B2B36" />
            <Stop offset="0.6" stopColor="#12121A" />
            <Stop offset="1" stopColor="#09090D" />
          </RadialGradient>
          <RadialGradient id="warm" cx="74%" cy="80%" r="55%">
            <Stop offset="0" stopColor="#C9529F" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#C9529F" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="cool" cx="18%" cy="62%" r="42%">
            <Stop offset="0" stopColor="#7C6BFF" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#7C6BFF" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.92" />
            <Stop offset="0.55" stopColor="#CFC6F5" stopOpacity="0.75" />
            <Stop offset="1" stopColor="#8FD3D0" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        <Circle cx="100" cy="100" r="99" fill="url(#halo)" />
        <Circle cx="100" cy="100" r="70" fill="url(#body)" />
        <Circle cx="100" cy="100" r="70" fill="url(#cool)" />
        <Circle cx="100" cy="100" r="70" fill="url(#warm)" />
        <Circle cx="100" cy="100" r="70" fill="none" stroke="url(#ring)" strokeWidth="7" />
        <Ellipse cx="78" cy="58" rx="22" ry="9" fill="#FFFFFF" opacity="0.1" transform="rotate(-28 78 58)" />
        <AnimatedRect animatedProps={left} fill="#F2F2F4" />
        <AnimatedRect animatedProps={right} fill="#F2F2F4" />
      </Svg>
    </Animated.View>
  );
}

/** Mascota pequeña para cabeceras. */
export const MascotBadge = ({ size = 44 }: { size?: number }) => (
  <View style={styles.badge}><Mascot size={size} animated={false} glow={false} /></View>
);
const styles = StyleSheet.create({ badge: { alignItems: 'center', justifyContent: 'center' } });
