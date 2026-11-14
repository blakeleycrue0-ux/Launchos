import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';

export function StepHeader({ step, total = 3, canGoBack = true }: { step: number; total?: number; canGoBack?: boolean }) {
  const c = useTheme();
  const { t } = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, justifyContent: 'space-between' }}>
      <View style={{ width: 44 }}>
        {canGoBack && router.canGoBack() ? (
          <PressableScale onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center' }} accessibilityLabel={t('common.back')} accessibilityRole="button">
            <Icon name="chevron-left" size={26} color={c.ink} />
          </PressableScale>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${step} / ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ width: i + 1 === step ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i + 1 <= step ? c.ink : c.line }} />
        ))}
      </View>
      <View style={{ width: 44 }} />
    </View>
  );
}
