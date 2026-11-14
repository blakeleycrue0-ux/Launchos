import { Tabs, router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, type TKey } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
export const TAB_BAR_HEIGHT = 64;
const ICONS: Record<string, string> = { inicio: 'home', movimientos: 'list', cuentas: 'wallet', ajustes: 'sliders' };
const LABELS: Record<string, TKey> = { inicio: 'tab.home', movimientos: 'tab.transactions', cuentas: 'tab.accounts', ajustes: 'tab.settings' };

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const c = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.pill, { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.shadow, shadowOpacity: c.scheme === 'light' ? 0.14 : 0.6 }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = t(LABELS[route.name] ?? 'tab.home');
          return (
            <PressableScale
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              scaleTo={0.9}
              onPress={() => { if (!focused) navigateToTab(route.key); }}
              style={[styles.tab, focused && { backgroundColor: c.surfaceAlt }]}
            >
              <Icon name={ICONS[route.name] ?? 'dots'} size={22} color={focused ? c.ink : c.inkFaint} stroke={focused ? 2.1 : 1.8} />
              {focused ? <Text variant="caption" style={{ fontWeight: '700', fontSize: 12 }}>{label}</Text> : null}
            </PressableScale>
          );
        })}
      </View>
      <PressableScale testID="add-button" accessibilityRole="button" accessibilityLabel={t('add.title')} scaleTo={0.9}
        onPress={() => router.push('/movimiento/nuevo')}
        style={[styles.fab, { backgroundColor: c.ink, shadowColor: c.shadow }]}>
        <Icon name="plus" size={26} color={c.inverse} stroke={2.4} />
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
      <Tabs.Screen name="cuentas" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  pill: {
    flex: 1, height: TAB_BAR_HEIGHT, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth * 2, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around', padding: 6, shadowOffset: { width: 0, height: 12 }, shadowRadius: 28,
  },
  tab: { height: 50, minWidth: 50, paddingHorizontal: 14, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  fab: { width: TAB_BAR_HEIGHT, height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
});
