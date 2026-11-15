import { Tabs, router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, type TKey } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { champagne } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
export const TAB_BAR_HEIGHT = 56;
const ICONS: Record<string, string> = { inicio: 'home', movimientos: 'list', grupos: 'groups' };
const LABELS: Record<string, TKey> = { inicio: 'tab.home', movimientos: 'tab.transactions', grupos: 'tab.groups' };

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const c = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.shadow, shadowOpacity: c.scheme === 'light' ? 0.1 : 0.5 }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = t(LABELS[route.name] ?? 'tab.home');
          return (
            <PressableScale key={route.key} testID={`tab-${route.name}`} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }}
              scaleTo={0.94} onPress={() => { if (!focused) navigateToTab(route.key); }} style={styles.tab}>
              <Icon name={ICONS[route.name] ?? 'dots'} size={20} color={focused ? c.ink : c.inkFaint} stroke={focused ? 2 : 1.75} />
              <Text variant="micro" style={{ color: focused ? c.ink : c.inkFaint, letterSpacing: 0.1, fontSize: 10.5 }}>{label}</Text>
              <View style={[styles.dot, { backgroundColor: focused ? c.accent : 'transparent' }]} />
            </PressableScale>
          );
        })}
      </View>
      <PressableScale testID="add-button" accessibilityRole="button" accessibilityLabel={t('add.title')} scaleTo={0.92}
        onPress={() => router.push('/movimiento/nuevo')} style={[styles.fab, { shadowColor: c.shadow }]}>
        <Icon name="plus" size={22} color="#16130D" stroke={2.25} />
      </PressableScale>
    </View>
  );
}

export default function TabsLayout() {
  const c = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="movimientos" />
      <Tabs.Screen name="grupos" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  bar: { flex: 1, height: TAB_BAR_HEIGHT, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, shadowOffset: { width: 0, height: 10 }, shadowRadius: 24 },
  tab: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  fab: { width: TAB_BAR_HEIGHT, height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: champagne.base, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 },
});
