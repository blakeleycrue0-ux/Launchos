import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts, typography, type TextVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type Tone = 'ink' | 'soft' | 'faint' | 'inverse';
interface Props extends TextProps {
  variant?: TextVariant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  upper?: boolean;
}

export function Text({ variant = 'body', tone = 'ink', align, upper, style, ...rest }: Props) {
  const c = useTheme();
  const v = typography[variant];
  const color = { ink: c.ink, soft: c.inkSoft, faint: c.inkFaint, inverse: c.inverse }[tone];
  return (
    <RNText
      {...rest}
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      style={[
        { fontFamily: fonts[v.weight], fontSize: v.size, lineHeight: v.line, letterSpacing: v.track, color, textAlign: align,
          fontVariant: ['tabular-nums'] },
        upper && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
