import { Redirect } from 'expo-router';
import React from 'react';
import { useSnapshot } from '@/data/hooks';

const ROUTES = ['/bienvenida', '/intents', '/setup', '/ready'] as const;

/** Punto de entrada del onboarding: retoma en el último paso guardado en el perfil. */
export default function OnboardingStart() {
  const { data } = useSnapshot();
  const step = Math.min(data?.profile.onboardingStep ?? 0, ROUTES.length - 1);
  // En modo cuenta (Supabase) la bienvenida ya se vio antes de registrarse.
  const first = step === 0 && !!data && process.env.EXPO_PUBLIC_SUPABASE_URL ? 1 : step;
  return <Redirect href={ROUTES[first]} />;
}
