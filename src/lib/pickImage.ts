import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Reduce una imagen en web y la devuelve como data URL (cabe en el almacenamiento local). */
async function downscaleWeb(uri: string, maxW = 900): Promise<string> {
  const img = new window.Image();
  img.src = uri;
  await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; });
  const scale = Math.min(1, maxW / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Abre la galería y devuelve una URI persistente de la foto elegida (o null si se cancela).
 * La foto se copia al almacenamiento de la app: no depende de la caché del selector.
 */
export async function pickPersistentPhoto(name: string): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 10], quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  const uri = res.assets[0].uri;
  if (Platform.OS === 'web') return downscaleWeb(uri);
  const dest = new File(Paths.document, `${name}-${Date.now()}.jpg`);
  new File(uri).copy(dest);
  return dest.uri;
}
