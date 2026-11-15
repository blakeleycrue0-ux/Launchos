import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Botón redondo de icono (40 pt; área táctil ampliada con hitSlop). */
export function IconButton({ icon, onPress, label, testID, plain }: { icon: IconName; onPress?: () => void; label: string; testID?: string; plain?: boolean }) {
  const c = useTheme();
  return (
    <PressableScale onPress={onPress} hitSlop={6} testID={testID} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.92}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: plain ? 'transparent' : c.surface, borderWidth: plain ? 0 : 0.5, borderColor: c.line }}>
      <Icon name={icon} size={19} color={c.ink} />
    </PressableScale>
  );
}

/** Cabecera de pantallas secundarias: volver/cerrar, título centrado y acción opcional. */
export function Header({ title, close, right, backLabel }: { title: string; close?: boolean; right?: React.ReactNode; backLabel: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
      <IconButton icon={close ? 'close' : 'chevron-left'} label={backLabel} onPress={() => router.back()} testID="header-back" />
      <Text variant="headline" numberOfLines={1} style={{ flex: 1, textAlign: 'center', marginHorizontal: 8 }}>{title}</Text>
      <View style={{ width: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
