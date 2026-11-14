import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { categoryLabel } from '@/features/labels';
import { useFinance, useSaveCategory } from '@/data/hooks';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { confirm } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const ICONS = ['utensils', 'bus', 'home', 'ticket', 'bag', 'pulse', 'book', 'repeat', 'plane', 'heart', 'coins', 'tag'];

export default function Categories() {
  const f = useFinance();
  const { t } = useT();
  const c = useTheme();
  const save = useSaveCategory();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  if (!f) return null;
  const add = () => {
    if (!name.trim()) return;
    haptic.success();
    save.mutate({ id: newId(), key: null, name: name.trim(), icon, archived: false });
    setName('');
  };
  return (
    <Screen contentStyle={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PressableScale onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={t('common.back')}><Icon name="chevron-left" size={26} color={c.ink} /></PressableScale>
        <Text variant="title">{t('set.categories')}</Text>
      </View>
      <Card style={{ gap: 12 }}>
        <Field label={t('cats.new')} value={name} onChangeText={setName} maxLength={30} testID="cat-name" onSubmitEditing={add} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ICONS.map((i) => (
            <PressableScale key={i} onPress={() => setIcon(i)} accessibilityRole="button" accessibilityState={{ selected: icon === i }} accessibilityLabel={i}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: icon === i ? c.ink : c.surfaceAlt }}>
              <Icon name={i} size={20} color={icon === i ? c.inverse : c.ink} />
            </PressableScale>
          ))}
        </ScrollView>
        <Button label={t('cats.add')} onPress={add} disabled={!name.trim()} compact testID="cat-add" />
      </Card>
      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        {f.categories.map((cat) => (
          <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 }}>
            <Icon name={cat.icon} size={20} color={c.inkSoft} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>{categoryLabel(cat, t)}</Text>
            {cat.key === null ? (
              <PressableScale accessibilityRole="button" accessibilityLabel={t('common.delete')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                onPress={async () => { if (await confirm(t('cats.hideTitle'), t('cats.hideBody'), t('cats.hide'), t('common.cancel'), false)) save.mutate({ ...cat, archived: true }); }}>
                <Icon name="trash" size={18} color={c.inkFaint} />
              </PressableScale>
            ) : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
