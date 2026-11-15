import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, type TKey } from '@/i18n';
import { authApi } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { MioMascot } from '@/ui/MioMascot';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Mode = 'login' | 'signup' | 'forgot';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null); setInfo(null);
    if (!EMAIL.test(email.trim())) return setError(t('auth.errEmail'));
    if (mode !== 'forgot' && password.length < 8) return setError(t('auth.errPassword'));
    setBusy(true);
    try {
      if (mode === 'login') await authApi.signIn(email, password);
      else if (mode === 'signup') {
        const immediate = await authApi.signUp(email, password);
        if (!immediate) setInfo(t('auth.confirmEmail'));
      } else { await authApi.resetPassword(email); setInfo(t('auth.resetSent')); }
      haptic.success();
    } catch (e) {
      haptic.warn();
      setError(e instanceof Error ? e.message : t('error.generic'));
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 14, paddingBottom: insets.bottom + 24 }}>
        <PressableScale onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center' }} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Icon name="chevron-left" size={26} color={c.ink} />
        </PressableScale>
        <View style={{ alignItems: 'center' }}><MioMascot size={76} /></View>
        <View style={{ gap: 6 }}>
          <Text variant="title">{t(`auth.${mode}Title` as TKey)}</Text>
          <Text tone="soft">{t(`auth.${mode}Sub` as TKey)}</Text>
        </View>
        <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" testID="auth-email" />
        {mode !== 'forgot' ? (
          <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'} onSubmitEditing={submit} testID="auth-password" />
        ) : null}
        {error ? <Text variant="caption" tone="soft" accessibilityRole="alert">{error}</Text> : null}
        {info ? <Text variant="caption" tone="soft">{info}</Text> : null}
        <Button label={t(`auth.${mode}Cta` as TKey)} onPress={submit} loading={busy} testID="auth-submit" />
        {mode === 'login' ? (
          <PressableScale onPress={() => router.push('/forgot')} style={{ alignSelf: 'center', padding: 8 }}><Text tone="soft">{t('auth.forgot')}</Text></PressableScale>
        ) : null}
        {mode !== 'forgot' ? (
          <PressableScale onPress={() => router.replace(mode === 'login' ? '/signup' : '/login')} style={{ alignSelf: 'center', padding: 8 }}>
            <Text tone="soft">{mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')} <Text variant="bodyStrong">{mode === 'login' ? t('auth.signupCta') : t('welcome.login')}</Text></Text>
          </PressableScale>
        ) : null}
        <Text variant="caption" tone="faint" align="center">{t('auth.legal')}</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
