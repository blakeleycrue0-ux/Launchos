import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SheetOption<T> { value: T; label: string; icon?: string; hint?: string }

/** Hoja inferior genérica. */
export function BottomSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grab, { backgroundColor: c.line }]} />
        <Text variant="headline" style={{ marginBottom: 10, marginHorizontal: 20 }}>{title}</Text>
        <View style={{ paddingHorizontal: 20 }}>{children}</View>
      </View>
    </Modal>
  );
}

/** Selector inferior de una opción. */
export function Sheet<T extends string | null>({ visible, title, options, value, onSelect, onClose }: {
  visible: boolean; title: string; options: SheetOption<T>[]; value: T; onSelect: (v: T) => void; onClose: () => void;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.grab, { backgroundColor: c.line }]} />
        <Text variant="headline" style={{ marginBottom: 8, marginHorizontal: 24 }}>{title}</Text>
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <PressableScale key={String(o.value)} scaleTo={0.99} onPress={() => { onSelect(o.value); onClose(); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={[styles.row, on && { backgroundColor: c.surfaceAlt }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{o.label}</Text>
                  {o.hint ? <Text variant="caption" tone="soft">{o.hint}</Text> : null}
                </View>
                {on ? <Icon name="check" size={18} color={c.accent} /> : null}
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radii.md, minHeight: 48 },
});
