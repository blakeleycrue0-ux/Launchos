import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { champagne, radii } from '@/theme/tokens';

/**
 * Superficie premium: negro profundo que vira a champagne metálico, con un reflejo discreto.
 * Es igual en tema claro y oscuro (una tarjeta negra-dorada sobre cualquier fondo).
 */
export function MetalCard({ children, style, radius = radii.xl }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  return (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 60">
        <Defs>
          <LinearGradient id="mc-base" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0D0D0C" />
            <Stop offset="0.42" stopColor="#1C1A16" />
            <Stop offset="0.72" stopColor={champagne.shadow} />
            <Stop offset="1" stopColor={champagne.deep} />
          </LinearGradient>
          <RadialGradient id="mc-glow" cx="92%" cy="100%" r="75%">
            <Stop offset="0" stopColor={champagne.light} stopOpacity="0.62" />
            <Stop offset="0.45" stopColor={champagne.base} stopOpacity="0.2" />
            <Stop offset="1" stopColor={champagne.base} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="mc-sheen" x1="0" y1="0" x2="1" y2="0.35">
            <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.07" />
            <Stop offset="0.62" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="60" fill="url(#mc-base)" />
        <Rect width="100" height="60" fill="url(#mc-glow)" />
        <Rect width="100" height="60" fill="url(#mc-sheen)" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(233,220,195,0.28)' }]} pointerEvents="none" />
      {children}
    </View>
  );
}
/** Colores de texto sobre la tarjeta metálica (independientes del tema). */
export const onMetal = { ink: '#F7F6F3', soft: 'rgba(247,246,243,0.66)', line: 'rgba(247,246,243,0.14)' } as const;

const styles = StyleSheet.create({ wrap: { overflow: 'hidden', backgroundColor: '#151515' } });
