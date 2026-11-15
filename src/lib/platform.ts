import { Alert, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Confirmación nativa (Alert) o del navegador (web, donde Alert.alert no muestra botones). */
export function confirm(title: string, message: string, confirmLabel: string, cancelLabel: string, destructive = true): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Guarda un texto como archivo y abre la hoja de compartir. */
export async function shareTextFile(filename: string, content: string, mime: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: filename });
  else notify('No se puede compartir en este dispositivo');
}

/** Comparte un enlace con la hoja del sistema; si no existe (escritorio), lo copia al portapapeles. */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS !== 'web') {
      const { Share } = await import('react-native');
      await Share.share({ message: url, title });
      return 'shared';
    }
    const nav = navigator as Navigator & { share?: (d: { url: string; title: string }) => Promise<void> };
    if (nav.share) { await nav.share({ url, title }); return 'shared'; }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    try { await navigator.clipboard.writeText(url); return 'copied'; } catch { return 'failed'; }
  }
}

/** Origen público de la app para construir enlaces de invitación. */
export const appOrigin = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : process.env.EXPO_PUBLIC_APP_URL ?? 'https://mio-finanzas.netlify.app';

/** Extrae el token de un enlace de invitación pegado (o devuelve el propio texto si ya es un token). */
export function inviteTokenFrom(text: string): string | null {
  const m = text.trim().match(/[?&]token=([a-f0-9]{64})/i) ?? text.trim().match(/^([a-f0-9]{64})$/i);
  return m ? m[1].toLowerCase() : null;
}
