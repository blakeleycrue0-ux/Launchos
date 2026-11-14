import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StepHeader } from '@/features/StepHeader';
import { useSnapshot, useUpdateProfile } from '@/data/hooks';
import { useT, type TKey } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const OPTIONS = [
  { key: 'expenses', icon: 'wallet' },
  { key: 'saving', icon: 'shield' },
  { key: 'recurring', icon: 'repeat' },
  { key: 'friends', icon: 'users' },
  { key: 'couple', icon: 'heart' },
] as const;

export default function Intents() {
  const { t } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { data } = useSnapshot();
  const update = useUpdateProfile();
  const [sel, setSel] = useState<string[]>(data?.profile.intents ?? []);
  const toggle = (k: string) => { haptic.select(); setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k])); };
  const next = () => { update.mutate({ intents: sel, onboardingStep: 2 }); router.push('/setup'); };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen contentStyle={{ gap: 20 }}>
        <StepHeader step={1} />
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text variant="title">{t('intents.title')}</Text>
          <Text tone="soft">{t('intents.sub')}</Text>
        </View>
        <View style={{ gap: 10 }}>
          {OPTIONS.map((o, i) => {
            const on = sel.includes(o.key);
            return (
              <Animated.View key={o.key} entering={FadeInDown.delay(80 * i).duration(450)}>
                <PressableScale onPress={() => toggle(o.key)} feedback={false} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  testID={`intent-${o.key}`}
                  style={[styles.opt, { backgroundColor: on ? c.ink : c.surface, borderColor: c.line }]}>
                  <View style={[styles.ico, { backgroundColor: on ? c.inverse : c.surfaceAlt }]}><Icon name={o.icon} size={22} color={c.ink} /></View>
                  <Text variant="bodyStrong" style={{ flex: 1, color: on ? c.inverse : c.ink }}>{t(`intents.${o.key}` as TKey)}</Text>
                  <View style={[styles.check, { borderColor: on ? c.inverse : c.line, backgroundColor: on ? c.inverse : 'transparent' }]}>
                    {on ? <Icon name="check" size={14} color={c.ink} stroke={2.6} /> : null}
                  </View>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>
      </Screen>
      <View style={[styles.footer, { backgroundColor: c.bg, paddingBottom: insets.bottom + 12 }]}>
        <Button label={t('common.continue')} onPress={next} testID="intents-next" />
        <PressableScale onPress={() => { update.mutate({ onboardingStep: 2 }); router.push('/setup'); }} style={{ alignSelf: 'center', padding: 10 }}><Text tone="soft">{t('common.skip')}</Text></PressableScale>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth * 2, minHeight: 72 },
  ico: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
