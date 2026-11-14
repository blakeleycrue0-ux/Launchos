import { Redirect } from 'expo-router';
import React from 'react';
import { useSnapshot } from '@/data/hooks';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/config';

/** Entrada de la app: dirige a autenticación, onboarding o inicio según el estado guardado. */
export default function Index() {
  const session = useAuth((s) => s.session);
  const { data } = useSnapshot();
  if (isSupabaseConfigured && !session) return <Redirect href="/welcome" />;
  return <Redirect href={data?.profile.onboardingDone ? '/inicio' : '/start'} />;
}
