import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GroupCard } from '@/features/GroupCard';
import { ledgerKey, snapshotKey, useFinance, useGroupRepo } from '@/data/hooks';
import type { GroupKind } from '@/domain/types';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { inviteTokenFrom } from '@/lib/platform';
import { useSettings } from '@/lib/settings';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Aceptar una invitación a un grupo (llega por enlace o pegando el enlace). */
export default function JoinGroup() {
  const params = useLocalSearchParams<{ token?: string }>();
  const f = useFinance();
  const repo = useGroupRepo();
  const qc = useQueryClient();
  const { t } = useT();
  const pending = useSettings((s) => s.pendingInvite);
  const setPending = useSettings((s) => s.setPendingInvite);
  const [token, setToken] = useState<string | null>(inviteTokenFrom(params.token ?? '') ?? pending);
  const [paste, setPaste] = useState('');
  const [name, setName] = useState(f?.profile.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (pending) setPending(null); }, [pending, setPending]);
  const preview = useQuery({ queryKey: ['invite-preview', token], queryFn: () => repo!.previewInvite(token!), enabled: !!repo && !!token, retry: false });
  if (!f) return null;

  const join = async () => {
    if (!repo || !token) return;
    if (!name.trim()) return setError(t('join.errName'));
    setBusy(true); setError(null);
    try {
      const gid = await repo.acceptInvite(token, name.trim());
      haptic.success();
      await Promise.all([qc.invalidateQueries({ queryKey: snapshotKey(f.me) }), qc.invalidateQueries({ queryKey: ledgerKey(f.me) })]);
      router.replace({ pathname: '/grupo-detalle', params: { id: gid } });
    } catch { setError(t('join.invalid')); } finally { setBusy(false); }
  };
  const p = preview.data;

  return (
    <Screen contentStyle={{ gap: 14 }}>
      <Header close backLabel={t('common.close')} title={t('join.title')} />
      {!repo ? (
        <Card><EmptyState title={t('join.needAccount')} /></Card>
      ) : !token ? (
        <>
          <Text tone="soft">{t('join.pasteBody')}</Text>
          <Field label={t('join.link')} value={paste} onChangeText={(v) => { setPaste(v); setError(null); }} autoCapitalize="none" autoCorrect={false} placeholder="https://…/unirse?token=…" testID="join-paste" />
          {error ? <Text variant="caption" accessibilityRole="alert">{error}</Text> : null}
          <Button label={t('common.continue')} testID="join-continue" onPress={() => { const tk = inviteTokenFrom(paste); if (tk) setToken(tk); else setError(t('join.invalid')); }} />
        </>
      ) : preview.isLoading ? (
        <Text tone="soft" align="center" style={{ paddingVertical: 24 }}>{t('join.loading')}</Text>
      ) : !p ? (
        <Card><EmptyState title={t('join.invalid')} body={t('join.invalidBody')} action={t('join.tryAnother')} onAction={() => { setToken(null); setPaste(''); }} /></Card>
      ) : (
        <>
          <GroupCard group={{ name: p.name, kind: p.kind as GroupKind, photoPreset: p.photoPreset, photoUri: null, currency: 'EUR', budgetMinor: 0 }} height={140} caption={t('join.invitedTo')} />
          {p.alreadyMember ? (
            <>
              <Text tone="soft">{t('join.already')}</Text>
              <Button label={t('join.open')} onPress={() => router.replace({ pathname: '/grupo-detalle', params: { id: p.groupId } })} testID="join-open" />
            </>
          ) : (
            <>
              <Field label={t('join.yourName')} value={name} onChangeText={(v) => { setName(v); setError(null); }} maxLength={40} testID="join-name" />
              <Text variant="caption" tone="faint">{t('join.privacy')}</Text>
              {error ? <Text variant="caption" accessibilityRole="alert">{error}</Text> : null}
              <View><Button label={t('join.cta')} onPress={join} loading={busy} testID="join-accept" /></View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
