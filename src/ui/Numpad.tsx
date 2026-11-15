import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NumpadKey } from '@/domain/amountInput';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const ROWS: NumpadKey[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['dec', '0', 'back']];

/** Teclado numérico compacto: teclas planas, sin cajas, proporciones de teclado nativo. */
export function Numpad({ onKey, decimalSep = ',', allowDecimal = true, keyHeight = 46 }: {
  onKey: (k: NumpadKey) => void; decimalSep?: string; allowDecimal?: boolean; keyHeight?: number;
}) {
  const c = useTheme();
  return (
    <View style={[styles.pad, { backgroundColor: c.surface, borderColor: c.line }]}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((k) => {
            const hidden = k === 'dec' && !allowDecimal;
            return (
              <PressableScale
                key={k}
                feedback={false}
                disabled={hidden}
                scaleTo={0.92}
                onPress={() => { haptic.select(); onKey(k); }}
                accessibilityRole="button"
                accessibilityLabel={k === 'back' ? 'Borrar' : k === 'dec' ? decimalSep : k}
                style={[styles.key, { height: keyHeight }]}
              >
                {k === 'back' ? <Icon name="backspace" size={20} color={c.inkSoft} /> : hidden ? null : (
                  <Text variant="headline" style={{ fontSize: 21, lineHeight: 26, fontWeight: '600' }}>{k === 'dec' ? decimalSep : k}</Text>
                )}
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  pad: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 4, paddingHorizontal: 6 },
  row: { flexDirection: 'row' },
  key: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
});
