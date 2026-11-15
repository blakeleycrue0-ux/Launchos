import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSnapshot } from '@/data/hooks';
import { useT } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/config';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } } });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const init = useAuth((s) => s.init);
  useEffect(() => init(), [init]);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Gate />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Gate() {
  const c = useTheme();
  const { t } = useT();
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const snap = useSnapshot();
  const needsAuth = isSupabaseConfigured && !session;
  const resolved = ready && (needsAuth || snap.data || snap.isError);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (resolved && !hidden) { SplashScreen.hideAsync().catch(() => undefined); setHidden(true); }
  }, [resolved, hidden]);

  if (!resolved) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  if (!needsAuth && !snap.data) {
    // Error de conexión al cargar: reintento explícito, sin pantalla rota.
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24 }}>
        <EmptyState title={t('error.loadTitle')} body={t('error.loadBody')} />
        <View style={{ alignItems: 'center' }}><Button label={t('common.retry')} onPress={() => snap.refetch()} compact /></View>
      </View>
    );
  }

  const done = !!snap.data?.profile.onboardingDone;
  return (
    <>
      <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={needsAuth}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!needsAuth && !done}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={!needsAuth && done}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="movimiento/nuevo" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="movimiento/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="cuenta" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="grupo" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="comprar" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="pago" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="objetivo" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="pagos" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="objetivos" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="asistente" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="cuentas" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajustes" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="categorias" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
