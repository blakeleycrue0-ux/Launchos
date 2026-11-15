import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { dueLabel } from '@/features/dueLabel';
import { useFinance, useSavePayment, useSaveTransaction } from '@/data/hooks';
import { formatMoney } from '@/domain/money';
import { confirmPayment, monthlyEquivalent, yearlyCost } from '@/domain/recurring';
import { useT, type TKey } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Header, IconButton } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function Payments() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  const savePayment = useSavePayment();
  const saveTx = useSaveTransaction();
  if (!f) return null;
  const cur = f.profile.currency;
  const money = (v: number) => formatMoney(v, cur, intl);
  const active = f.payments.filter((p) => p.active);
  const monthly = active.reduce((s, p) => s + monthlyEquivalent(p), 0);
  const yearly = active.reduce((s, p) => s + yearlyCost(p), 0);
  // Solo se puede confirmar el vencimiento pendiente de cada pago (el primero de la lista).
  const firstDue = new Set<string>();
  const upcoming = f.upcomingPayments.map((o) => { const first = !firstDue.has(o.paymentId); firstDue.add(o.paymentId); return { ...o, first }; });

  const markPaid = (paymentId: string) => {
    const p = f.payments.find((x) => x.id === paymentId);
    if (!p) return;
    const r = confirmPayment(p, f.transactions, newId(), new Date().toISOString());
    haptic.success();
    if (r.tx) saveTx.mutate(r.tx);
    savePayment.mutate(r.payment);
  };

  return (
    <Screen contentStyle={{ gap: 14 }}>
      <Header backLabel={t('common.back')} title={t('pay.title')} right={<IconButton icon="plus" label={t('pay.new')} onPress={() => router.push('/pago')} testID="new-payment" />} />
      {f.payments.length === 0 ? (
        <Card><EmptyState title={t('pay.emptyTitle')} body={t('pay.emptyBody')} action={t('pay.new')} onAction={() => router.push('/pago')} /></Card>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', gap: 14, padding: 14 }}>
            <View style={{ flex: 1, gap: 2 }}><Text variant="micro" tone="soft" upper>{t('pay.monthly')}</Text><Text variant="headline" testID="pay-monthly">{money(monthly)}</Text></View>
            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.line }} />
            <View style={{ flex: 1, gap: 2 }}><Text variant="micro" tone="soft" upper>{t('pay.yearly')}</Text><Text variant="headline">{money(yearly)}</Text></View>
          </Card>

          <View style={{ gap: 6 }}>
            <View style={styles.between}>
              <Text variant="headline">{t('pay.nextDays', { n: f.reserveDays })}</Text>
              <Text variant="bodyStrong" style={{ color: c.accent }} testID="pay-reserved">{money(f.availability.reserved.payments)}</Text>
            </View>
            <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
              {upcoming.length === 0 ? <Text tone="soft" style={{ paddingVertical: 14 }}>{t('pay.noneDays', { n: f.reserveDays })}</Text> : upcoming.map((o, i) => (
                <View key={`${o.paymentId}-${o.due}`} style={[styles.row, i < upcoming.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>{o.name}</Text>
                    <Text variant="caption" style={{ color: o.overdue ? c.accent : c.inkSoft }}>{dueLabel(o.due, f.today, t, intl)}</Text>
                  </View>
                  <Text variant="bodyStrong">{money(o.amountMinor)}</Text>
                  {o.first ? (
                    <PressableScale onPress={() => markPaid(o.paymentId)} testID={`paid-${o.name}`} accessibilityRole="button" accessibilityLabel={`${t('pay.markPaid')} ${o.name}`}
                      style={[styles.paid, { backgroundColor: c.surfaceAlt }]}>
                      <Icon name="check" size={14} color={c.ink} stroke={2.25} />
                      <Text variant="caption" style={{ fontWeight: '700' }}>{t('pay.markPaid')}</Text>
                    </PressableScale>
                  ) : <View style={{ width: 4 }} />}
                </View>
              ))}
            </Card>
            <Text variant="caption" tone="faint">{t('pay.reserveNote', { n: f.reserveDays })}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="headline">{t('pay.all')}</Text>
            <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
              {f.payments.map((p, i) => (
                <PressableScale key={p.id} scaleTo={0.985} onPress={() => router.push({ pathname: '/pago', params: { id: p.id } })} testID={`payment-${p.name}`} accessibilityRole="button"
                  style={[styles.row, i < f.payments.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
                  <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}><Icon name="subscriptions" size={17} color={c.ink} /></View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1} tone={p.active ? 'ink' : 'faint'}>{p.name}</Text>
                    <Text variant="caption" tone="soft">{p.active ? t(`pay.freq.${p.frequency}` as TKey) : t('pay.paused')}</Text>
                  </View>
                  <Text variant="bodyStrong" tone={p.active ? 'ink' : 'faint'}>{money(p.amountMinor)}</Text>
                  <Icon name="chevron-right" size={15} color={c.inkFaint} />
                </PressableScale>
              ))}
            </Card>
          </View>
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 8 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  paid: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15 },
});
