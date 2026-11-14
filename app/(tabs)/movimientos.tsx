import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { TxRow } from '@/features/TxRow';
import { categoryLabel, dayLabel, monthLabel, txTitle } from '@/features/labels';
import { useFinance } from '@/data/hooks';
import { transactionsToCsv } from '@/domain/csv';
import { addMonths, isInMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { monthSummary } from '@/domain/summary';
import type { Transaction } from '@/domain/types';
import { useT } from '@/i18n';
import { notify, shareTextFile } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TAB_BAR_HEIGHT } from './_layout';

export default function Transactions() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  const [month, setMonth] = useState<string | null>(f?.month ?? null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [acc, setAcc] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'cat' | 'acc' | null>(null);

  const filtered = useMemo(() => {
    if (!f) return [] as Transaction[];
    const q = query.trim().toLowerCase();
    return f.transactions
      .filter((tx) => (month ? isInMonth(tx.occurredOn, month) : true))
      .filter((tx) => (cat ? tx.categoryId === cat : true))
      .filter((tx) => (acc ? tx.accountId === acc || tx.toAccountId === acc : true))
      .filter((tx) => (q ? `${txTitle(tx, f.categories, t)} ${tx.notes}`.toLowerCase().includes(q) : true))
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  }, [f, month, cat, acc, query, t]);

  if (!f) return null;
  const cur = f.profile.currency;
  const sum = monthSummary(filtered, month ?? '');
  const totals = month ? sum : (() => {
    let income = 0, spending = 0;
    for (const tx of filtered) { if (tx.kind === 'income') income += tx.amountMinor; else if (tx.kind === 'expense') spending += tx.amountMinor; else if (tx.kind === 'refund') spending -= tx.amountMinor; }
    return { income, spending };
  })();

  const groups: { date: string; items: Transaction[] }[] = [];
  for (const tx of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.occurredOn) last.items.push(tx); else groups.push({ date: tx.occurredOn, items: [tx] });
  }
  const catName = f.categories.find((x) => x.id === cat);
  const accName = f.accounts.find((x) => x.id === acc);

  const exportCsv = async () => {
    try {
      const csv = transactionsToCsv(filtered, f.accounts, f.categories, cur, (x) => categoryLabel(x, t));
      await shareTextFile('mio-movimientos.csv', csv, 'text/csv');
    } catch { notify(t('error.generic')); }
  };

  return (
    <Screen bottomExtra={TAB_BAR_HEIGHT + 24} contentStyle={{ gap: 16 }}>
      <View style={styles.titleRow}>
        <Text variant="title">{t('tx.title')}</Text>
        <PressableScale onPress={exportCsv} testID="export-csv" accessibilityRole="button" accessibilityLabel={t('tx.exportCsv')}
          style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}><Icon name="download" size={20} color={c.ink} /></PressableScale>
      </View>

      <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
        <Icon name="search" size={18} color={c.inkFaint} />
        <TextInput value={query} onChangeText={setQuery} placeholder={t('tx.search')} placeholderTextColor={c.inkFaint} testID="tx-search"
          style={{ flex: 1, color: c.ink, fontFamily: fonts[500], fontSize: 16, height: 46 }} returnKeyType="search" accessibilityLabel={t('tx.search')} />
        {query ? <PressableScale onPress={() => setQuery('')} accessibilityLabel={t('common.clear')}><Icon name="close" size={18} color={c.inkSoft} /></PressableScale> : null}
      </View>

      <View style={styles.monthRow}>
        <PressableScale disabled={!month} onPress={() => month && setMonth(addMonths(month, -1))} style={styles.iconBtn} accessibilityLabel={t('tx.prevMonth')}><Icon name="chevron-left" size={22} color={month ? c.ink : c.inkFaint} /></PressableScale>
        <Text variant="bodyStrong">{month ? monthLabel(month, intl) : t('tx.allTime')}</Text>
        <PressableScale disabled={!month} onPress={() => month && setMonth(addMonths(month, 1))} style={styles.iconBtn} accessibilityLabel={t('tx.nextMonth')}><Icon name="chevron-right" size={22} color={month ? c.ink : c.inkFaint} /></PressableScale>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }} contentInset={{ left: 20, right: 20 }}>
        <View style={{ width: 12 }} />
        <Chip label={t('tx.allTime')} selected={!month} onPress={() => setMonth(month ? null : f.month)} testID="filter-all" />
        <Chip label={catName ? categoryLabel(catName, t) : t('tx.category')} selected={!!cat} trailing="chevron-down" onPress={() => setSheet('cat')} testID="filter-category" />
        <Chip label={accName ? accName.name : t('tx.account')} selected={!!acc} trailing="chevron-down" onPress={() => setSheet('acc')} testID="filter-account" />
        <View style={{ width: 12 }} />
      </ScrollView>

      <Card style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, gap: 2 }}><Text variant="micro" tone="soft" upper>{t('home.incomeLabel')}</Text><Text variant="headline">{formatMoney(totals.income, cur, intl)}</Text></View>
        <View style={{ width: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }} />
        <View style={{ flex: 1, gap: 2 }}><Text variant="micro" tone="soft" upper>{t('home.spendingLabel')}</Text><Text variant="headline">{formatMoney(totals.spending, cur, intl)}</Text></View>
      </Card>

      {groups.length === 0 ? (
        <EmptyState title={f.transactions.length ? t('tx.noResults') : t('tx.emptyTitle')} body={f.transactions.length ? undefined : t('tx.emptyBody')}
          action={f.transactions.length ? undefined : t('home.emptyCta')} onAction={() => router.push('/movimiento/nuevo')} />
      ) : (
        groups.map((g) => (
          <View key={g.date} style={{ gap: 2 }}>
            <Text variant="micro" tone="soft" upper style={{ marginBottom: 2 }}>{dayLabel(g.date, t, intl)}</Text>
            <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
              {g.items.map((tx) => <TxRow key={tx.id} tx={tx} accounts={f.accounts} categories={f.categories} currency={cur} onPress={() => router.push(`/movimiento/${tx.id}`)} />)}
            </Card>
          </View>
        ))
      )}

      <Sheet visible={sheet === 'cat'} title={t('tx.category')} value={cat} onClose={() => setSheet(null)} onSelect={setCat}
        options={[{ value: null, label: t('tx.allCategories') }, ...f.categories.map((x) => ({ value: x.id as string | null, label: categoryLabel(x, t) }))]} />
      <Sheet visible={sheet === 'acc'} title={t('tx.account')} value={acc} onClose={() => setSheet(null)} onSelect={setAcc}
        options={[{ value: null, label: t('tx.allAccounts') }, ...f.accounts.map((x) => ({ value: x.id as string | null, label: x.name }))]} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: radii.pill },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
