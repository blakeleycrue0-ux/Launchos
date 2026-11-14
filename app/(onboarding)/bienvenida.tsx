import { router } from 'expo-router';
import React from 'react';
import { Welcome } from '@/features/Welcome';
import { useUpdateProfile } from '@/data/hooks';

export default function LocalWelcome() {
  const update = useUpdateProfile();
  return <Welcome onStart={() => { update.mutate({ onboardingStep: 1 }); router.push('/intents'); }} />;
}
