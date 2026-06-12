// Centre Mochis available in the dashboard's character pickers (class
// creation/editing + content upload). Single source of truth.
// characterType must match the backend CharacterType enum + Flutter jsonValue.
//
// The 8 "Around the World" Mochis were unreleased and have been scrapped
// product-wide; only the classic/default Mochi remains.

export interface CentreMochi {
  characterType: string;
  name: string;
  image: string;
  emoji: string; // fallback if the image fails to load
  tagline: string;
}

export const CENTRE_MOCHIS: CentreMochi[] = [
  { characterType: 'MOCHI', name: 'Mochi', image: '/mochi-base.svg', emoji: '🐻', tagline: 'Classic' },
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
