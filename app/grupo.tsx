import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupCard } from '@/features/GroupCard';
import { GROUP_KIND_ICON, GROUP_PRESETS } from '@/features/groupPhotos';
import { useDeleteGroup, useFinance, useSaveGroup } from '@/data/hooks';
import { SUPPORTED_CURRENCIES, currencySymbol, minorToInput, parseAmount } from '@/domain/money';
import type { GroupKind } from '@/domain/types';
import { useT, type TKey } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/config';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { pickPersistentPhoto } from '@/lib/pickImage';
import { confirm, notify } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Header, IconButton } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const KINDS: GroupKind[] = ['travel', 'couple', 'home', 'friends', 'event', 'other'];

export default function GroupModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const f = useFinance();
  const { t, intl, decimalSep } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const save = useSaveGroup();
  const del = useDeleteGroup();
  const existing = f?.groups.find((g) => g.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<GroupKind>(existing?.kind ?? 'travel');
  // Por defecto se usa la fotografía predeterminada del tipo; el usuario puede subir la suya o quitarla.
  const [preset, setPreset] = useState<string | null>(existing ? existing.photoPreset : GROUP_PRESETS.travel ? 'travel' : null);
  const [uri, setUri] = useState<string | null>(existing?.photoUri ?? null);
  const [autoPhoto, setAutoPhoto] = useState(!existing);
  const [currency, setCurrency] = useState(existing?.currency ?? f?.profile.currency ?? 'EUR');
  const [budget, setBudget] = useState(existing && existing.budgetMinor > 0 ? minorToInput(existing.budgetMinor, existing.currency, decimalSep) : '');
  const [curSheet, setCurSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!f) return null;

  const chooseKind = (k: GroupKind) => {
    setKind(k);
    if (autoPhoto && !uri) setPreset(GROUP_PRESETS[k] ? k : null);
  };
  const upload = async () => {
    try {
      const picked = await pickPersistentPhoto('group');
      if (picked) { setUri(picked); setAutoPhoto(false); }
    } catch { notify(t('error.generic')); }
  };
  const submit = () => {
    const b = budget.trim() ? parseAmount(budget, currency) : 0;
    if (!name.trim()) return setError(t('group.errName'));
    if (b === null || b < 0) return setError(t('setup.errAmount'));
    haptic.success();
    save.mutate({ id: existing?.id ?? newId(), name: name.trim(), kind, photoPreset: uri ? null : preset, photoUri: uri, currency, budgetMinor: b, createdAt: existing?.createdAt ?? new Date().toISOString() });
    router.back();
  };
  const remove = async () => {
    if (!existing) return;
    if (await confirm(t('group.deleteTitle'), t('group.deleteBody'), t('common.delete'), t('common.cancel'))) { del.mutate(existing.id); router.back(); }
  };
  const hasPhoto = !!uri || !!(preset && GROUP_PRESETS[preset as GroupKind]);
  const budgetMinor = budget.trim() ? parseAmount(budget, currency) ?? 0 : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 14 }}>
        <Header close backLabel={t('common.close')} title={existing ? t('group.edit') : t('group.new')}
          right={existing ? <IconButton icon="trash" label={t('common.delete')} onPress={remove} testID="group-delete" /> : undefined} />
        <GroupCard group={{ name: name.trim(), kind, photoUri: uri, photoPreset: uri ? null : preset, currency, budgetMinor: Math.max(0, budgetMinor) }} height={140} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {/* Subir foto propia: en modo cuenta necesita almacenamiento en la nube (fase de sincronización). */}
          {!isSupabaseConfigured ? <Chip icon="image-plus" label={uri ? t('group.photoChange') : t('group.photoUpload')} onPress={upload} testID="group-upload" /> : null}
          {GROUP_PRESETS[kind] && (uri || preset !== kind) ? <Chip icon="camera" label={t('group.photoDefault')} onPress={() => { setUri(null); setPreset(kind); setAutoPhoto(true); }} testID="group-default-photo" /> : null}
          {hasPhoto ? <Chip icon="close" label={t('group.photoRemove')} onPress={() => { setUri(null); setPreset(null); setAutoPhoto(false); }} testID="group-remove-photo" /> : null}
        </View>
        <Field label={t('group.name')} value={name} onChangeText={(v) => { setName(v); setError(null); }} maxLength={40} placeholder={t('group.namePlaceholder')} testID="group-name" />
        <View style={{ gap: 6 }}>
          <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('group.kind')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {KINDS.map((k) => <Chip key={k} icon={GROUP_KIND_ICON[k]} label={t(`group.kind.${k}` as TKey)} selected={k === kind} onPress={() => chooseKind(k)} testID={`group-kind-${k}`} />)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={`${t('group.budget')} (${currencySymbol(currency, intl)})`} value={budget} onChangeText={(v) => { setBudget(v); setError(null); }} keyboardType="decimal-pad" placeholder={t('group.optional')} testID="group-budget" />
          </View>
          <View style={{ gap: 6 }}>
            <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('setup.currency')}</Text>
            <Chip label={currency} trailing="chevron-down" onPress={() => setCurSheet(true)} testID="group-currency" />
          </View>
        </View>
        {error ? <Text variant="caption" accessibilityRole="alert">{error}</Text> : null}
        <Text variant="caption" tone="faint">{t(isSupabaseConfigured ? 'group.syncNoteCloud' : 'group.syncNoteLocal')}</Text>
      </Screen>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 6 }}>
        <Button label={existing ? t('common.save') : t('group.create')} onPress={submit} testID="group-save" />
      </View>
      <Sheet<string> visible={curSheet} title={t('setup.currency')} value={currency} onClose={() => setCurSheet(false)} onSelect={setCurrency}
        options={SUPPORTED_CURRENCIES.map((x) => ({ value: x, label: `${x} · ${currencySymbol(x, intl)}` }))} />
    </KeyboardAvoidingView>
  );
}
