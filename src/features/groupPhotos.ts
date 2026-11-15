import type { ImageSourcePropType } from 'react-native';
import type { Group, GroupKind } from '@/domain/types';

/**
 * Fotografías predeterminadas de grupos (a color, incluidas en la app).
 * Procedencia y licencia de cada archivo: assets/groups/CREDITS.md.
 * Si una clave no tiene archivo, el grupo usa la portada sin fotografía.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const GROUP_PRESETS: Partial<Record<GroupKind, ImageSourcePropType>> = {
  travel: require('../../assets/groups/travel.jpg'),
  couple: require('../../assets/groups/couple.jpg'),
  home: require('../../assets/groups/home.jpg'),
  friends: require('../../assets/groups/friends.jpg'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export const GROUP_KIND_ICON: Record<GroupKind, string> = {
  travel: 'plane', couple: 'heart', home: 'home', friends: 'groups', event: 'party', other: 'dots',
};

export function groupPhotoSource(g: Pick<Group, 'photoUri' | 'photoPreset'>): ImageSourcePropType | null {
  if (g.photoUri) return { uri: g.photoUri };
  if (g.photoPreset && GROUP_PRESETS[g.photoPreset as GroupKind]) return GROUP_PRESETS[g.photoPreset as GroupKind]!;
  return null;
}
