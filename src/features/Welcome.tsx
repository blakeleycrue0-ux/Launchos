import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useT } from '@/i18n';
import { ForceTheme } from '@/theme/ThemeProvider';
import { champagne, dark } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { MioMascot } from '@/ui/MioMascot';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';

/** Bienvenida: negro profundo, un reflejo champagne muy sutil y la mascota oficial. */
export function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin?: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <ForceTheme colors={dark}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
          <Defs>
            <RadialGradient id="w-top" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={champagne.base} stopOpacity="0.2" />
              <Stop offset="0.6" stopColor={champagne.deep} stopOpacity="0.05" />
              <Stop offset="1" stopColor="#090909" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="200" cy="-40" rx="380" ry="330" fill="url(#w-top)" />
        </Svg>
        <View style={styles.center}>
          <MioMascot size={184} float plate={false} />
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={{ alignItems: 'center', gap: 6, marginTop: 20 }}>
            <Text variant="display" style={{ fontSize: 44, lineHeight: 50, letterSpacing: -1.8 }}>
              mio<Text variant="display" style={{ fontSize: 44, lineHeight: 50, color: champagne.base }}>.</Text>
            </Text>
            <Text tone="soft" align="center" style={{ fontSize: 17, lineHeight: 24 }}>{t('welcome.tagline')}</Text>
          </Animated.View>
        </View>
        <Animated.View entering={FadeIn.delay(250).duration(300)} style={{ gap: 4 }}>
          <Button label={t('welcome.start')} onPress={onStart} testID="welcome-start" />
          {onLogin ? (
            <PressableScale onPress={onLogin} style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 }} accessibilityRole="button" testID="welcome-login">
              <Text variant="bodyStrong" tone="soft">{t('welcome.haveAccount')}</Text>
            </PressableScale>
          ) : (
            <Text variant="caption" tone="faint" align="center" style={{ paddingVertical: 12 }}>{t('welcome.localNote')}</Text>
          )}
        </Animated.View>
      </View>
    </ForceTheme>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
