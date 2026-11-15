import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepHeader } from '@/features/StepHeader';
import { useFinance, useUpdateProfile } from '@/data/hooks';
import { formatMoney } from '@/domain/money';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { MioMascot } from '@/ui/MioMascot';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function Ready() {
  const { t, intl } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const f = useFinance();
  const update = useUpdateProfile();
  const cur = f?.profile.currency ?? 'EUR';
  const name = f?.profile.displayName;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen contentStyle={{ gap: 20 }}>
        <StepHeader step={3} />
        <Animated.View entering={ZoomIn.duration(600)} style={{ alignItems: 'center', marginTop: 8 }}>
          <MioMascot size={128} float />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ gap: 8, alignItems: 'center' }}>
          <Text variant="title" align="center">{name ? t('ready.titleName', { name }) : t('ready.title')}</Text>
          <Text tone="soft" align="center" style={{ maxWidth: 320 }}>{t('ready.intro')}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(350).duration(600)}>
          <Card style={{ gap: 8 }}>
            <Text variant="micro" tone="soft" upper>{t('home.available')}</Text>
            <Text variant="display" style={{ fontSize: 34, lineHeight: 40 }}>{formatMoney(f?.availability.available ?? 0, cur, intl)}</Text>
            {f && f.profile.monthlyIncomeMinor > 0 ? (
              <Text tone="soft">{t('ready.income', { amount: formatMoney(f.profile.monthlyIncomeMinor, cur, intl) })}</Text>
            ) : null}
            <Text variant="caption" tone="soft">{t('ready.explain')}</Text>
          </Card>
        </Animated.View>
        <Text variant="caption" tone="faint" align="center">{t('ready.assistantNote')}</Text>
      </Screen>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 8 }}>
        <Button label={t('ready.cta')} testID="ready-go" onPress={() => { haptic.success(); update.mutate({ onboardingDone: true, onboardingStep: 4 }); }} />
      </View>
    </View>
  );
}
