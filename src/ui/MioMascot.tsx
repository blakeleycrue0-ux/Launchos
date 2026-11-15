import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Mascota oficial de MIO. Se muestra SIEMPRE desde el archivo de imagen, sin redibujarla
 * ni alterarla. Las únicas animaciones son externas: aparición y flotación suaves.
 *
 * Para sustituir la mascota basta con reemplazar assets/mascot/mio.png.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SOURCE = require('../../assets/mascot/mio.png');

interface Props {
  size?: number;
  /** Flotación discreta. Respeta «reducir movimiento». */
  float?: boolean;
  /**
   * Base negra circular detrás de la imagen. La mascota está pensada para fondo oscuro:
   * en tema claro se activa sola para que el halo se vea como en el original.
   */
  plate?: boolean | 'auto';
}

export function MioMascot({ size = 120, float = false, plate = 'auto' }: Props) {
  const c = useTheme();
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined); }, []);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (!float || reduce) { bob.value = 0.5; return; }
    bob.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float, reduce, bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: (bob.value - 0.5) * size * 0.05 }] }));
  const showPlate = plate === true || (plate === 'auto' && c.scheme === 'light');
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(300)} style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessible accessibilityRole="image" accessibilityLabel="Mio">
      {showPlate ? <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: '#090909' }} /> : null}
      <Image source={SOURCE} style={{ width: showPlate ? size * 0.86 : size, height: showPlate ? size * 0.86 : size }} resizeMode="contain" fadeDuration={0} />
    </Animated.View>
  );
}
