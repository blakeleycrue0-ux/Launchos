import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { transactionsToCsv } from '@/domain/csv';
import { useFinance, useRepo, useSaveAccount, useUpdateProfile, wipeAll } from '@/data/hooks';
import { categoryLabel } from '@/features/labels';
import { SUPPORTED_CURRENCIES, currencySymbol } from '@/domain/money';
import { useT } from '@/i18n';
import { authApi, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/config';
import { confirm, notify, shareTextFile } from '@/lib/platform';
import { useSettings, type Locale, type ThemePref } from '@/lib/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TAB_BAR_HEIGHT } from './_layout';

function Row({ icon, label, value, onPress, danger, testID, hint }: { icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean; testID?: string; hint?: string }) {
  const c = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={!onPress} testID={testID} scaleTo={0.985} style={styles.row} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={20} color={danger ? c.ink : c.inkSoft} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? <Text variant="caption" tone="soft">{hint}</Text> : null}
      </View>
      {value ? <Text tone="soft">{value}</Text> : null}
      {onPress ? <Icon name="chevron-right" size={18} color={c.inkFaint} /> : null}
    </PressableScale>
  );
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 6 }}>
    <Text variant="micro" tone="soft" upper style={{ marginLeft: 6 }}>{title}</Text>
    <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>{children}</Card>
  </View>
);

export default function Settings() {
  const f = useFinance();
  const { t, locale, intl } = useT();
  const c = useTheme();
  const qc = useQueryClient();
  const r = useRepo();
  const session = useAuth((s) => s.session);
  const { theme, setTheme, setLocale, dashboard, setDashboard } = useSettings();
  const update = useUpdateProfile();
  const saveAccount = useSaveAccount();
  const [name, setName] = useState(f?.profile.displayName ?? '');
  const [sheet, setSheet] = useState<'cur' | 'lang' | null>(null);
  useEffect(() => { if (f) setName(f.profile.displayName); }, [f?.profile.displayName]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!f || !r) return null;

  const hasTx = f.transactions.length > 0;
  const exportJson = async () => {
    try {
      const data = { exportedAt: new Date().toISOString(), profile: { ...f.profile }, accounts: f.accounts, categories: f.categories, transactions: f.transactions };
      await shareTextFile('mio-datos.json', JSON.stringify(data, null, 2), 'application/json');
    } catch { notify(t('error.generic')); }
  };
  const exportCsv = async () => {
    try { await shareTextFile('mio-movimientos.csv', transactionsToCsv(f.transactions, f.accounts, f.categories, f.profile.currency, (x) => categoryLabel(x, t)), 'text/csv'); }
    catch { notify(t('error.generic')); }
  };
  const del = async () => {
    const ok = await confirm(t(isSupabaseConfigured ? 'set.deleteTitle' : 'set.wipeTitle'), t(isSupabaseConfigured ? 'set.deleteBody' : 'set.wipeBody'), t('common.delete'), t('common.cancel'));
    if (!ok) return;
    try {
      await wipeAll(r.repo, qc);
    } catch { notify(t('error.generic')); }
  };
  const changeCurrency = (cur: string) => {
    update.mutate({ currency: cur });
    f.accounts.forEach((a) => saveAccount.mutate({ ...a, currency: cur }));
  };

  return (
    <Screen bottomExtra={TAB_BAR_HEIGHT + 24} contentStyle={{ gap: 20 }}>
      <Text variant="title" style={{ minHeight: 48, paddingTop: 6 }}>{t('set.title')}</Text>

      <Section title={t('set.profile')}>
        <View style={{ paddingVertical: 12, gap: 10 }}>
          <Field label={t('setup.name')} value={name} onChangeText={setName} maxLength={40} testID="settings-name"
            onEndEditing={() => { if (name.trim() !== f.profile.displayName) update.mutate({ displayName: name.trim() }); }} />
          <Text variant="caption" tone="soft">{isSupabaseConfigured ? session?.user.email : t('set.localMode')}</Text>
        </View>
      </Section>

      <Section title={t('set.preferences')}>
        <Row icon="coins" label={t('set.currency')} value={`${f.profile.currency} ${currencySymbol(f.profile.currency, intl)}`}
          hint={hasTx ? t('set.currencyLocked') : undefined} onPress={hasTx ? undefined : () => setSheet('cur')} testID="row-currency" />
        <Row icon="globe" label={t('set.language')} value={locale === 'es' ? 'Español' : 'English'} onPress={() => setSheet('lang')} testID="row-language" />
        <View style={{ paddingVertical: 12, gap: 10 }}>
          <View style={styles.rowInner}><Icon name={c.scheme === 'dark' ? 'moon' : 'sun'} size={20} color={c.inkSoft} /><Text variant="bodyStrong">{t('set.theme')}</Text></View>
          <Segmented<ThemePref> value={theme} onChange={setTheme} options={[{ value: 'system', label: t('set.themeAuto') }, { value: 'light', label: t('set.themeLight') }, { value: 'dark', label: t('set.themeDark') }]} />
        </View>
      </Section>

      <Section title={t('set.home')}>
        {([['month', 'home.thisMonth'], ['accounts', 'home.inAccounts'], ['recent', 'home.recent']] as const).map(([k, label]) => (
          <View key={k} style={styles.row}>
            <Icon name="layout" size={20} color={c.inkSoft} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>{t(label)}</Text>
            <Switch value={dashboard[k]} onValueChange={(v) => setDashboard({ [k]: v })} trackColor={{ true: c.ink, false: c.surfaceAlt }} thumbColor={c.scheme === 'dark' ? '#111' : '#fff'} accessibilityLabel={t(label)} />
          </View>
        ))}
      </Section>

      <Section title={t('set.data')}>
        <Row icon="tag" label={t('set.categories')} onPress={() => router.push('/categorias')} testID="row-categories" />
        <Row icon="download" label={t('set.exportCsv')} onPress={exportCsv} />
        <Row icon="download" label={t('set.exportJson')} onPress={exportJson} />
      </Section>

      <Section title={t('set.privacy')}>
        <View style={{ paddingVertical: 12 }}><Text tone="soft">{t(isSupabaseConfigured ? 'set.privacyCloud' : 'set.privacyLocal')}</Text></View>
        {isSupabaseConfigured ? <Row icon="logout" label={t('set.signOut')} onPress={async () => { await authApi.signOut(); qc.clear(); }} testID="row-signout" /> : null}
        <Row icon="trash" label={t(isSupabaseConfigured ? 'set.deleteAccount' : 'set.wipe')} onPress={del} danger testID="row-delete" />
      </Section>

      <Text variant="caption" tone="faint" align="center">mio {Constants.expoConfig?.version ?? ''} · {t(isSupabaseConfigured ? 'set.modeCloud' : 'set.modeLocal')}</Text>

      <Sheet<string> visible={sheet === 'cur'} title={t('set.currency')} value={f.profile.currency} onClose={() => setSheet(null)} onSelect={changeCurrency}
        options={SUPPORTED_CURRENCIES.map((x) => ({ value: x, label: `${x} · ${currencySymbol(x, intl)}` }))} />
      <Sheet<Locale> visible={sheet === 'lang'} title={t('set.language')} value={locale} onClose={() => setSheet(null)} onSelect={setLocale}
        options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 8 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
