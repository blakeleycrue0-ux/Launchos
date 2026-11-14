import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useT } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/config';
import { ForceTheme } from '@/theme/ThemeProvider';
import { dark } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Mascot } from '@/ui/Mascot';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';

/** Bienvenida: siempre en oscuro, con la mascota como protagonista. */
export function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin?: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <ForceTheme colors={dark}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 800" preserveAspectRatio="xMidYMin slice">
          <Defs>
            <RadialGradient id="arc" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#6F5BFF" stopOpacity="0.38" />
              <Stop offset="0.55" stopColor="#B8579B" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#09090A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="200" cy="250" rx="300" ry="260" fill="url(#arc)" />
        </Svg>
        <View style={styles.center}>
          <Animated.View entering={FadeIn.duration(900)}><Mascot size={196} /></Animated.View>
          <Animated.View entering={FadeInDown.delay(250).duration(700)} style={{ alignItems: 'center', gap: 10, marginTop: 28 }}>
            <Text variant="display" style={{ fontSize: 54, letterSpacing: -2.4 }}>mio</Text>
            <Text variant="headline" tone="soft" align="center">{t('welcome.tagline')}</Text>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(500).duration(700)} style={styles.bottom}>
          <Button label={t('welcome.start')} onPress={onStart} testID="welcome-start" />
          {onLogin ? (
            <PressableScale onPress={onLogin} style={{ alignSelf: 'center', paddingVertical: 12 }} accessibilityRole="button">
              <Text tone="soft">{t('welcome.haveAccount')} <Text variant="bodyStrong">{t('welcome.login')}</Text></Text>
            </PressableScale>
          ) : (
            <Text variant="caption" tone="faint" align="center" style={{ paddingTop: 10 }}>{t('welcome.localNote')}</Text>
          )}
        </Animated.View>
      </View>
    </ForceTheme>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { gap: 6 },
});

export const goStart = () => router.push(isSupabaseConfigured ? '/signup' : '/intents');
