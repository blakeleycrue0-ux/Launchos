import { router } from 'expo-router';
import React from 'react';
import { Welcome } from '@/features/Welcome';

export default function AuthWelcome() {
  return <Welcome onStart={() => router.push('/signup')} onLogin={() => router.push('/login')} />;
}
