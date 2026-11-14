import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { TxEditor } from '@/features/TxEditor';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TxEditor id={id} />;
}
