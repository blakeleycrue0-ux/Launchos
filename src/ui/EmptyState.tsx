import React from 'react';
import { View } from 'react-native';
import { Button } from './Button';
import { Mascot, type Expression } from './Mascot';
import { Text } from './Text';

/** Estado vacío con la mascota: breve, útil y con una sola acción. */
export function EmptyState({ title, body, action, onAction, expression = 'idle' }: {
  title: string; body?: string; action?: string; onAction?: () => void; expression?: Expression;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
      <Mascot size={104} expression={expression} />
      <Text variant="headline" align="center" style={{ marginTop: 6 }}>{title}</Text>
      {body ? <Text tone="soft" align="center" style={{ maxWidth: 280 }}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 10 }}><Button label={action} onPress={onAction} compact /></View> : null}
    </View>
  );
}
