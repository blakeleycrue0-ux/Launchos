import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupExpense, GroupLedger, GroupMember, GroupSettlement } from '@/domain/groupLedger';

const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

export interface GroupInvite { id: string; groupId: string; expiresAt: string; revokedAt: string | null; uses: number; createdAt: string }
export interface InvitePreview { groupId: string; name: string; kind: string; photoPreset: string | null; alreadyMember: boolean }

/**
 * Acceso a los datos compartidos de grupos. La RLS decide qué filas llegan (solo grupos donde soy miembro activo)
 * y todas las escrituras pasan por funciones del servidor que validan permisos y coherencia.
 */
export function createGroupRepo(client: SupabaseClient) {
  return {
    async loadLedger(): Promise<GroupLedger> {
      const [m, e, sh, st] = await Promise.all([
        client.from('group_members').select('group_id,user_id,display_name,role,left_at'),
        client.from('group_expenses').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }),
        client.from('group_expense_shares').select('expense_id,user_id,share_minor'),
        client.from('group_settlements').select('*').order('created_at', { ascending: false }),
      ]);
      fail(m.error); fail(e.error); fail(sh.error); fail(st.error);
      const shares: Record<string, Record<string, number>> = {};
      for (const r of sh.data ?? []) (shares[r.expense_id] ??= {})[r.user_id] = Number(r.share_minor);
      const members: GroupMember[] = (m.data ?? []).map((r) => ({ groupId: r.group_id, userId: r.user_id, name: r.display_name || '—', role: r.role, active: !r.left_at }));
      const expenses: GroupExpense[] = (e.data ?? []).map((r) => ({
        id: r.id, groupId: r.group_id, createdBy: r.created_by, paidBy: r.paid_by, amountMinor: Number(r.amount_minor), description: r.description ?? '',
        occurredOn: r.occurred_on, splitKind: r.split_kind, createdAt: r.created_at, shares: shares[r.id] ?? {},
      }));
      const settlements: GroupSettlement[] = (st.data ?? []).map((r) => ({
        id: r.id, groupId: r.group_id, fromUser: r.from_user, toUser: r.to_user, amountMinor: Number(r.amount_minor), occurredOn: r.occurred_on, createdBy: r.created_by, createdAt: r.created_at,
      }));
      return { members, expenses, settlements };
    },
    async saveExpense(x: Pick<GroupExpense, 'id' | 'groupId' | 'paidBy' | 'amountMinor' | 'description' | 'occurredOn' | 'splitKind' | 'shares'>) {
      fail((await client.rpc('save_group_expense', {
        p_id: x.id, p_group: x.groupId, p_paid_by: x.paidBy, p_amount: x.amountMinor, p_description: x.description, p_date: x.occurredOn, p_split_kind: x.splitKind,
        p_shares: Object.entries(x.shares).map(([user_id, share_minor]) => ({ user_id, share_minor })),
      })).error);
    },
    async deleteExpense(id: string) { fail((await client.rpc('delete_group_expense', { p_id: id })).error); },
    async saveSettlement(s: Pick<GroupSettlement, 'id' | 'groupId' | 'fromUser' | 'toUser' | 'amountMinor' | 'occurredOn'>) {
      fail((await client.rpc('save_group_settlement', { p_id: s.id, p_group: s.groupId, p_from: s.fromUser, p_to: s.toUser, p_amount: s.amountMinor, p_date: s.occurredOn })).error);
    },
    async deleteSettlement(id: string) { fail((await client.rpc('delete_group_settlement', { p_id: id })).error); },
    async createInvite(groupId: string, days = 7): Promise<string> {
      const r = await client.rpc('create_group_invite', { p_group: groupId, p_days: days });
      fail(r.error);
      return r.data as string;
    },
    async listInvites(groupId: string): Promise<GroupInvite[]> {
      const r = await client.from('group_invites').select('id,group_id,expires_at,revoked_at,uses,created_at').eq('group_id', groupId).order('created_at', { ascending: false });
      fail(r.error);
      return (r.data ?? []).map((x) => ({ id: x.id, groupId: x.group_id, expiresAt: x.expires_at, revokedAt: x.revoked_at, uses: x.uses, createdAt: x.created_at }));
    },
    async revokeInvite(id: string) { fail((await client.rpc('revoke_group_invite', { p_invite: id })).error); },
    async previewInvite(token: string): Promise<InvitePreview | null> {
      const r = await client.rpc('preview_group_invite', { p_token: token });
      fail(r.error);
      const x = (r.data as { group_id: string; name: string; kind: string; photo_preset: string | null; already_member: boolean }[] | null)?.[0];
      return x ? { groupId: x.group_id, name: x.name, kind: x.kind, photoPreset: x.photo_preset, alreadyMember: x.already_member } : null;
    },
    async acceptInvite(token: string, name: string): Promise<string> {
      const r = await client.rpc('accept_group_invite', { p_token: token, p_name: name });
      fail(r.error);
      return r.data as string;
    },
    async leaveGroup(groupId: string) { fail((await client.rpc('leave_group', { p_group: groupId })).error); },
  };
}
export type GroupRepo = ReturnType<typeof createGroupRepo>;
