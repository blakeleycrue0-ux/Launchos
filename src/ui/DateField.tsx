import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fromISODate, toISODate } from '@/domain/dates';
import type { ISODate } from '@/domain/types';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  label?: string;
  value: ISODate | null;
  onChange: (v: ISODate | null) => void;
  /** Permite dejar la fecha vacía. */
  optional?: boolean;
  /** Sin caja: para usar dentro de una fila de formulario. */
  inline?: boolean;
  testID?: string;
}

const display = (iso: ISODate, intl: string) =>
  new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', year: 'numeric' }).format(fromISODate(iso));

/**
 * Selector de fecha del sistema: rueda/calendario nativo en iOS y Android,
 * y el selector de fecha del navegador en web (en Safari de iPhone es la rueda nativa).
 */
export function DateField({ label, value, onChange, optional, inline, testID }: Props) {
  const c = useTheme();
  const { t, intl } = useT();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const box = inline ? null : { backgroundColor: c.surfaceAlt, height: 48, borderRadius: radii.md, paddingHorizontal: 14 };

  let control: React.ReactNode;
  if (Platform.OS === 'web') {
    control = (
      <View style={[styles.row, box]}>
        {React.createElement('input', {
          type: 'date',
          value: value ?? '',
          'data-testid': testID,
          'aria-label': label ?? t('add.date'),
          onChange: (e: { target: { value: string } }) => onChange(e.target.value ? e.target.value : optional ? null : value),
          style: {
            flex: 1, minWidth: 0, height: inline ? 32 : 46, border: 'none', outline: 'none', background: 'transparent', color: value ? c.ink : c.inkFaint,
            fontFamily: fonts[inline ? 700 : 500], fontSize: 16, colorScheme: c.scheme, textAlign: inline ? 'right' : 'left', padding: 0,
          },
        })}
      </View>
    );
  } else {
    control = (
      <PressableScale onPress={() => setOpen(true)} scaleTo={0.98} testID={testID} accessibilityRole="button" accessibilityLabel={label ?? t('add.date')} style={[styles.row, box]}>
        {inline ? null : <Icon name="calendar" size={17} color={c.inkSoft} />}
        <Text variant={inline ? 'bodyStrong' : 'body'} tone={value ? 'ink' : 'faint'} style={{ flex: inline ? 0 : 1 }}>{value ? display(value, intl) : t('date.none')}</Text>
        {optional && value && !inline ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityLabel={t('common.clear')}><Icon name="close" size={16} color={c.inkSoft} /></Pressable>
        ) : null}
      </PressableScale>
    );
  }

  const current = value ? fromISODate(value) : new Date();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{label}</Text> : null}
      {control}
      {Platform.OS === 'android' && open ? (
        <DateTimePicker value={current} mode="date" onChange={(e, d) => { setOpen(false); if (e.type === 'set' && d) onChange(toISODate(d)); }} />
      ) : null}
      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}>
            <DateTimePicker value={current} mode="date" display="inline" themeVariant={c.scheme} accentColor={c.accent} onChange={(_e, d) => { if (d) onChange(toISODate(d)); }} />
            <Button label={t('common.done')} onPress={() => setOpen(false)} />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
});
