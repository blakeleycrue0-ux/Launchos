import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupCard } from '@/features/GroupCard';
import { dayLabel } from '@/features/labels';
import { ledgerKey, snapshotKey, useFinance, useGroupRepo, useSyncPersonalEffects } from '@/data/hooks';
import { groupSpent, netBalances, settlementEffects, settlementRef, simplifyDebts, type Transfer } from '@/domain/groupLedger';
import { formatMoney } from '@/domain/money';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { appOrigin, confirm, notify, shareLink } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Header, IconButton } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { ProgressBar } from '@/ui/ProgressBar';
import { Screen } from '@/ui/Screen';
import { BottomSheet, Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const NO_ACCOUNT = '__none__';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const f = useFinance();
  const repo = useGroupRepo();
  const qc = useQueryClient();
  const sync = useSyncPersonalEffects();
  const { t, intl } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<Transfer | null>(null);
  const group = f?.groups.find((g) => g.id === id);
  const isOwner = !!f && f.ledger.members.some((m) => m.groupId === id && m.userId === f.me && m.role === 'owner');
  const invites = useQuery({ queryKey: ['invites', id], queryFn: () => repo!.listInvites(id), enabled: !!repo && inviteOpen && isOwner });
  if (!f || !repo) return null;
  if (!group) { setTimeout(() => router.back(), 0); return null; }

  const money = (v: number) => formatMoney(v, group.currency, intl);
  const members = f.ledger.members.filter((m) => m.groupId === id);
  const name = (uid: string) => (uid === f.me ? t('group.you') : members.find((m) => m.userId === uid)?.name ?? t('group.exMember'));
  const expenses = f.ledger.expenses.filter((e) => e.groupId === id);
  const settlements = f.ledger.settlements.filter((s) => s.groupId === id);
  const net = netBalances({ expenses, settlements });
  const transfers = simplifyDebts(net);
  const spent = groupSpent({ expenses });
  const mine = net[f.me] ?? 0;
  const activity = [
    ...expenses.map((e) => ({ type: 'expense' as const, at: `${e.occurredOn}|${e.createdAt}`, e })),
    ...settlements.map((s) => ({ type: 'settlement' as const, at: `${s.occurredOn}|${s.createdAt}`, s })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ledgerKey(f.me) }), qc.invalidateQueries({ queryKey: snapshotKey(f.me) })]);

  const createLink = async () => {
    setBusy(true);
    try {
      const token = await repo.createInvite(id, 7);
      setLink(`${appOrigin()}/unirse?token=${token}`);
      invites.refetch();
    } catch (e) { notify(t('error.generic'), e instanceof Error ? e.message : undefined); } finally { setBusy(false); }
  };
  const share = async () => { if (link) { const r = await shareLink(link, group.name); if (r === 'copied') notify(t('group.linkCopied')); } };

  // Marcar una liquidación como pagada: se registra en el grupo y, si se elige cuenta, en mis movimientos.
  const settle = async (accountId: string) => {
    if (!paying) return;
    const s = { id: newId(), groupId: id, fromUser: paying.from, toUser: paying.to, amountMinor: paying.amountMinor, occurredOn: f.today };
    setPaying(null);
    try {
      await repo.saveSettlement(s);
      await sync(settlementRef(s.id), settlementEffects(s, f.me), accountId === NO_ACCOUNT ? null : accountId, `${group.name} · ${t('group.settlement')}`);
      haptic.success();
      await refresh();
    } catch (e) { notify(t('error.generic'), e instanceof Error ? e.message : undefined); }
  };
  const removeSettlement = async (sid: string) => {
    if (!(await confirm(t('group.delSettleTitle'), t('group.delSettleBody'), t('common.delete'), t('common.cancel')))) return;
    try { await repo.deleteSettlement(sid); await sync(settlementRef(sid), [], null, ''); await refresh(); }
    catch (e) { notify(t('error.generic'), e instanceof Error ? e.message : undefined); }
  };
  const leave = async () => {
    if (!(await confirm(t('group.leaveTitle'), t('group.leaveBody'), t('group.leave'), t('common.cancel')))) return;
    try { await repo.leaveGroup(id); await refresh(); router.back(); }
    catch (e) { notify(t('error.generic'), e instanceof Error ? e.message : undefined); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen contentStyle={{ gap: 14 }} bottomExtra={70}>
        <Header backLabel={t('common.back')} title={group.name}
          right={isOwner ? <IconButton icon="settings" label={t('group.edit')} onPress={() => router.push({ pathname: '/grupo', params: { id } })} testID="group-settings" /> : undefined} />
        <GroupCard group={group} height={116} caption={t('group.people', { n: members.filter((m) => m.active).length })} />

        <Card style={{ padding: 14, gap: 10 }}>
          <View style={styles.between}>
            <View>
              <Text variant="micro" tone="soft" upper>{t('group.spent')}</Text>
              <Text variant="title" testID="group-spent">{money(spent)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="micro" tone="soft" upper>{t('group.yourBalance')}</Text>
              <Text variant="headline" style={{ color: mine === 0 ? c.inkSoft : c.accent }} testID="group-my-balance">
                {mine > 0 ? t('group.owedToYou', { amount: money(mine) }) : mine < 0 ? t('group.youOwe', { amount: money(-mine) }) : t('group.settled')}
              </Text>
            </View>
          </View>
          {group.budgetMinor > 0 ? (
            <View style={{ gap: 6 }}>
              <ProgressBar value={(spent * 100) / group.budgetMinor} />
              <Text variant="caption" tone="soft" testID="group-budget-line">
                {spent > group.budgetMinor ? t('group.overBudget', { amount: money(spent - group.budgetMinor), budget: money(group.budgetMinor) }) : t('group.budgetLeft', { amount: money(group.budgetMinor - spent), budget: money(group.budgetMinor) })}
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {members.map((m) => (
            <View key={m.userId} style={[styles.member, { backgroundColor: c.surface, borderColor: c.line, opacity: m.active ? 1 : 0.5 }]}>
              <View style={[styles.avatar, { backgroundColor: c.surfaceAlt }]}><Text variant="micro">{(m.name || '?').slice(0, 1).toUpperCase()}</Text></View>
              <Text variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>{m.userId === f.me ? `${m.name} (${t('group.you')})` : m.name}</Text>
            </View>
          ))}
          {isOwner ? <Chip icon="plus" label={t('group.invite')} onPress={() => setInviteOpen(true)} testID="group-invite" /> : null}
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="headline">{t('group.howToSettle')}</Text>
          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            {transfers.length === 0 ? <Text tone="soft" style={{ paddingVertical: 14 }}>{expenses.length ? t('group.allSettled') : t('group.noExpenses')}</Text> : transfers.map((x, i) => {
              const involved = x.from === f.me || x.to === f.me;
              return (
                <View key={`${x.from}-${x.to}`} style={[styles.row, i < transfers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]} testID="transfer-row">
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>{t('group.owes', { from: name(x.from), to: name(x.to) })}</Text>
                    <Text variant="caption" tone="soft">{money(x.amountMinor)}</Text>
                  </View>
                  {involved ? (
                    <PressableScale onPress={() => setPaying(x)} testID="mark-settled" accessibilityRole="button" style={[styles.pill, { backgroundColor: c.surfaceAlt }]}>
                      <Icon name="check" size={14} color={c.ink} stroke={2.25} />
                      <Text variant="caption" style={{ fontWeight: '700' }}>{t('group.markPaid')}</Text>
                    </PressableScale>
                  ) : null}
                </View>
              );
            })}
          </Card>
          <Text variant="caption" tone="faint">{t('group.settleNote')}</Text>
        </View>

        {activity.length ? (
          <View style={{ gap: 6 }}>
            <Text variant="headline">{t('group.activity')}</Text>
            <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
              {activity.map((a, i) => {
                const last = i === activity.length - 1;
                const border = !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line };
                if (a.type === 'expense') {
                  const e = a.e;
                  const canEdit = e.createdBy === f.me || isOwner;
                  const myShare = e.shares[f.me] ?? 0;
                  return (
                    <PressableScale key={e.id} disabled={!canEdit} scaleTo={0.985} onPress={() => router.push({ pathname: '/grupo-gasto', params: { group: id, id: e.id } })} style={[styles.row, border]} testID={`gexp-${e.description}`}>
                      <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}><Icon name="expense" size={17} color={c.ink} /></View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>{e.description || t('group.expense')}</Text>
                        <Text variant="caption" tone="soft" numberOfLines={1}>{t('group.paidBy', { name: name(e.paidBy) })} · {dayLabel(e.occurredOn, t, intl)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="bodyStrong">{money(e.amountMinor)}</Text>
                        <Text variant="caption" tone="soft">{myShare > 0 ? t('group.yourShare', { amount: money(myShare) }) : t('group.notIncluded')}</Text>
                      </View>
                    </PressableScale>
                  );
                }
                const s = a.s;
                return (
                  <PressableScale key={s.id} disabled={s.createdBy !== f.me} scaleTo={0.985} onPress={() => removeSettlement(s.id)} style={[styles.row, border]} testID="settlement-row">
                    <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}><Icon name="check" size={17} color={c.accent} /></View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>{t('group.paidTo', { from: name(s.fromUser), to: name(s.toUser) })}</Text>
                      <Text variant="caption" tone="soft">{t('group.settlement')} · {dayLabel(s.occurredOn, t, intl)}</Text>
                    </View>
                    <Text variant="bodyStrong">{money(s.amountMinor)}</Text>
                  </PressableScale>
                );
              })}
            </Card>
          </View>
        ) : null}
        {!isOwner ? <Button variant="ghost" label={t('group.leave')} onPress={leave} testID="group-leave" /> : null}
      </Screen>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 12 }}>
        <Button icon="plus" label={t('group.addExpense')} onPress={() => router.push({ pathname: '/grupo-gasto', params: { group: id } })} testID="group-add-expense" />
      </View>

      <BottomSheet visible={inviteOpen} title={t('group.invite')} onClose={() => { setInviteOpen(false); setLink(null); }}>
        <View style={{ gap: 12 }}>
          <Text tone="soft">{t('group.inviteBody')}</Text>
          {link ? (
            <>
              <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 12 }}><Text variant="caption" selectable testID="invite-link">{link}</Text></View>
              <Button icon="send" label={t('group.shareLink')} onPress={share} testID="invite-share" />
            </>
          ) : <Button label={t('group.createLink')} onPress={createLink} loading={busy} testID="invite-create" />}
          {(invites.data ?? []).filter((x) => !x.revokedAt && new Date(x.expiresAt) > new Date()).map((x) => (
            <View key={x.id} style={styles.between}>
              <Text variant="caption" tone="soft" style={{ flex: 1 }}>{t('group.inviteActive', { date: new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short' }).format(new Date(x.expiresAt)), uses: x.uses })}</Text>
              <PressableScale hitSlop={8} onPress={async () => { try { await repo.revokeInvite(x.id); invites.refetch(); } catch { notify(t('error.generic')); } }} testID="invite-revoke">
                <Text variant="caption" style={{ color: c.accent, fontWeight: '700' }}>{t('group.revoke')}</Text>
              </PressableScale>
            </View>
          ))}
        </View>
      </BottomSheet>

      <Sheet<string> visible={!!paying} title={t('group.registerIn')} value="" onClose={() => setPaying(null)} onSelect={settle}
        options={[...f.activeAccounts.map((a) => ({ value: a.id, label: a.name, hint: t(paying?.from === f.me ? 'group.registerOut' : 'group.registerIn2') })), { value: NO_ACCOUNT, label: t('group.registerNone') }]} />
    </View>
  );
}
const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 8 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 4, paddingRight: 12, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, maxWidth: 190 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
