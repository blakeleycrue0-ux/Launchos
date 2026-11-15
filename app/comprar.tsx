import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useFinance } from '@/data/hooks';
import { currencySymbol, formatMoney, parseAmount } from '@/domain/money';
import { simulatePurchase } from '@/domain/purchase';
import { useT, type TKey } from '@/i18n';
import { useSettings } from '@/lib/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const VERDICT_ICON = { fits: 'check', tight: 'info', no: 'close' } as const;

/** Simulador: calcula con los datos actuales. No registra la compra ni garantiza nada. */
export default function CanIBuyIt() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const tightPct = useSettings((s) => s.tightPct);
  if (!f) return null;
  const cur = f.profile.currency;
  const minor = price.trim() ? parseAmount(price, cur) : null;
  const sim = minor && minor > 0 ? simulatePurchase(f.availability.available, minor, tightPct) : null;
  const money = (v: number) => formatMoney(v, cur, intl);
  const r = f.availability.reserved;
  const reservedTotal = r.payments + r.debts + r.savings;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 14 }}>
        <Header close backLabel={t('common.close')} title={t('buy.title')} />
        <Field label={t('buy.what')} value={name} onChangeText={setName} placeholder={t('buy.whatPlaceholder')} maxLength={40} testID="buy-name" />
        <Field label={`${t('buy.price')} (${currencySymbol(cur, intl)})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" autoFocus testID="buy-price" />
        {price.trim() && !sim ? <Text variant="caption" tone="soft" accessibilityRole="alert">{t('buy.errPrice')}</Text> : null}
        {sim ? (
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.badge, { backgroundColor: c.surfaceAlt }]}><Icon name={VERDICT_ICON[sim.verdict]} size={17} color={c.accent} /></View>
              <Text variant="headline" style={{ flex: 1 }} testID="buy-verdict">{t(`buy.verdict.${sim.verdict}` as TKey)}</Text>
            </View>
            {([['buy.rowPrice', -sim.price], ['buy.rowBefore', sim.before], ['buy.rowAfter', sim.after]] as const).map(([k, v], i) => (
              <View key={k} style={[styles.row, i === 2 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: 10 }]}>
                <Text tone="soft" style={{ flex: 1 }}>{k === 'buy.rowPrice' && name.trim() ? name.trim() : t(k)}</Text>
                <Text variant={i === 2 ? 'headline' : 'bodyStrong'} testID={i === 2 ? 'buy-after' : undefined}>{money(v)}</Text>
              </View>
            ))}
            {sim.verdict !== 'no' ? <Text variant="caption" tone="soft">{t('buy.remaining', { pct: sim.remainingPct })}</Text> : null}
            <Text variant="caption" tone="soft">{reservedTotal > 0 ? t('buy.reserved', { amount: money(reservedTotal) }) : t('buy.noReserved')}</Text>
          </Card>
        ) : null}
        <Text variant="caption" tone="faint">{t('buy.disclaimer')}</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
