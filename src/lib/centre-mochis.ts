// The 8 exclusive "Around the World" centre Mochis. Single source of truth for
// the dashboard's character pickers (class creation/editing + content upload).
// characterType must match the backend CharacterType enum + Flutter jsonValue.

export interface CentreMochi {
  characterType: string;
  name: string;
  image: string; // /characters/atw_xxx.png
  emoji: string; // fallback if the image fails to load
  tagline: string;
}

export const CENTRE_MOCHIS: CentreMochi[] = [
  { characterType: 'ATWBERET', name: 'Beret Mochi', image: '/characters/atw_beret.png', emoji: '🎭', tagline: 'Paris, France' },
  { characterType: 'ATWGLOBERIDER', name: 'Globe Rider', image: '/characters/atw_globerider.png', emoji: '🌍', tagline: 'Around the World' },
  { characterType: 'ATWKEBAYA', name: 'Kebaya Mochi', image: '/characters/atw_kebaya.png', emoji: '👘', tagline: 'Southeast Asia' },
  { characterType: 'ATWLIONCITY', name: 'Lion City Mochi', image: '/characters/atw_lioncity.png', emoji: '🦁', tagline: 'Singapore' },
  { characterType: 'ATWPHARAOH', name: 'Pharaoh Mochi', image: '/characters/atw_pharaoh.png', emoji: '🏺', tagline: 'Egypt' },
  { characterType: 'ATWSAKURA', name: 'Sakura Mochi', image: '/characters/atw_sakura.png', emoji: '🌸', tagline: 'Japan' },
  { characterType: 'ATWSOMBRERO', name: 'Sombrero Mochi', image: '/characters/atw_sombrero.png', emoji: '🪅', tagline: 'Mexico' },
  { characterType: 'ATWKILT', name: 'Kilt Mochi', image: '/characters/atw_kilt.png', emoji: '🏴', tagline: 'Scotland' },
];

export function mochiFor(characterType: string | null | undefined): CentreMochi {
  return (
    CENTRE_MOCHIS.find((m) => m.characterType === (characterType ?? '').toUpperCase()) ??
    CENTRE_MOCHIS[0]
  );
}

// Subjects the centre admin can assign to a class. Must match the backend
// Subject enum names.
export const CENTRE_SUBJECTS: string[] = [
  'MATHS', 'SCIENCE', 'ENGLISH', 'HISTORY', 'GEOGRAPHY',
  'LITERATURE', 'LANGUAGES', 'CODING', 'ART', 'MUSIC',
  'PHYSICAL_EDUCATION', 'HEALTH', 'GENERAL',
];
