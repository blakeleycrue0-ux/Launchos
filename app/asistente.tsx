import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryLabel } from '@/features/labels';
import { useFinance } from '@/data/hooks';
import { answerQuestion, type AssistantAnswer } from '@/domain/assistant';
import { formatMoney } from '@/domain/money';
import { useT, type TKey } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';
import { Chip } from '@/ui/Chip';
import { noOutline } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { MioMascot } from '@/ui/MioMascot';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';

interface Msg { id: number; from: 'me' | 'mio'; text: string }
const SUGGESTIONS: TKey[] = ['ai.sSpent', 'ai.sTop', 'ai.sAvailable', 'ai.sBuy'];

/**
 * Asistente en modo básico: respuestas CALCULADAS con funciones deterministas sobre los datos del usuario.
 * No hay ningún modelo de IA conectado; la pantalla lo dice de forma explícita.
 */
export default function Assistant() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  if (!f) return null;
  const cur = f.profile.currency;
  const money = (v: number) => formatMoney(v, cur, intl);

  const render = (a: AssistantAnswer): string => {
    switch (a.kind) {
      case 'spent': return t('ai.aSpent', { amount: money(a.amount) });
      case 'income': return t('ai.aIncome', { amount: money(a.amount) });
      case 'available': return t('ai.aAvailable', { amount: money(a.amount) });
      case 'total': return t('ai.aTotal', { amount: money(a.amount) });
      case 'noSpending': return t('ai.aNoSpending');
      case 'topCategory': {
        const cat = f.categories.find((x) => x.id === a.categoryId);
        return t('ai.aTop', { category: cat ? categoryLabel(cat, t) : t('ai.uncategorized'), amount: money(a.amount) });
      }
      case 'purchase': return `${t(`buy.verdict.${a.sim.verdict}` as TKey)} ${t('ai.aPurchase', { price: money(a.sim.price), before: money(a.sim.before), after: money(a.sim.after) })}`;
      default: return t('ai.aUnknown');
    }
  };
  const ask = (q: string) => {
    const question = q.trim();
    if (!question) return;
    const answer = render(answerQuestion(question, { available: f.availability.available, totalMoney: f.availability.totalMoney, month: f.thisMonth, currency: cur }));
    setMsgs((m) => [...m, { id: m.length, from: 'me', text: question }, { id: m.length + 1, from: 'mio', text: answer }]);
    setText('');
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}><Header backLabel={t('common.back')} title={t('ai.title')} /></View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 10 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <MioMascot size={88} float />
          <Text variant="headline" align="center">{t('ai.hello')}</Text>
          <View style={[styles.notice, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Icon name="info" size={15} color={c.accent} />
            <Text variant="caption" tone="soft" style={{ flex: 1 }}>{t('ai.notice')}</Text>
          </View>
        </View>
        {msgs.map((m) => (
          <View key={m.id} testID={m.from === 'mio' ? 'ai-answer' : undefined}
            style={[styles.bubble, m.from === 'me' ? { alignSelf: 'flex-end', backgroundColor: c.ink } : { alignSelf: 'flex-start', backgroundColor: c.surface, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
            <Text style={{ color: m.from === 'me' ? c.inverse : c.ink }}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom + 10, gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((k) => <Chip key={k} label={t(k)} onPress={() => ask(t(k))} testID={k} />)}
        </ScrollView>
        <View style={[styles.inputRow, { backgroundColor: c.surface, borderColor: c.line }]}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={() => ask(text)} placeholder={t('ai.placeholder')} placeholderTextColor={c.inkFaint} returnKeyType="send"
            selectionColor={c.accent} accessibilityLabel={t('ai.placeholder')} testID="ai-input" style={{ flex: 1, color: c.ink, fontFamily: fonts[500], fontSize: 15, height: 44, ...noOutline }} />
          <PressableScale onPress={() => ask(text)} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel={t('ai.send')} testID="ai-send"
            style={[styles.send, { backgroundColor: text.trim() ? c.accent : c.surfaceAlt }]}>
            <Icon name="send" size={17} color={text.trim() ? '#16130D' : c.inkFaint} stroke={2.25} />
          </PressableScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, maxWidth: 340 },
  bubble: { maxWidth: '84%', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, paddingLeft: 16, paddingRight: 5, borderRadius: 25, borderWidth: StyleSheet.hairlineWidth },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
