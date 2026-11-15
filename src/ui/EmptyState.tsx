import React from 'react';
import { View } from 'react-native';
import { Button } from './Button';
import { MioMascot } from './MioMascot';
import { Text } from './Text';

/** Estado vacío con la mascota: breve, útil y con una sola acción. */
export function EmptyState({ title, body, action, onAction }: { title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
      <MioMascot size={72} float />
      <Text variant="headline" align="center" style={{ marginTop: 6 }}>{title}</Text>
      {body ? <Text tone="soft" align="center" style={{ maxWidth: 270 }}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 10 }}><Button label={action} onPress={onAction} compact /></View> : null}
    </View>
  );
}
