'use client';

import type { ClassAvatarAppearance } from '@/lib/api';

/**
 * Maps a server-provided `subjectGlyph` key to a display emoji.
 * The key set is fixed by the backend contract; unknown keys fall back to 📖.
 */
const GLYPH_EMOJI: Record<string, string> = {
  math: '➗',
  science: '🧪',
  english: '📖',
  history: '📜',
  coding: '💻',
  art: '🎨',
  geography: '🌍',
  languages: '🗣️',
  music: '🎵',
  pe: '⚽',
  health: '❤️',
  literature: '📚',
  general: '📘',
};

export function glyphEmoji(subjectGlyph: string | undefined): string {
  if (!subjectGlyph) return '📖';
  return GLYPH_EMOJI[subjectGlyph.toLowerCase()] ?? '📖';
}

/**
 * Renders the server-derived class avatar "uniform": a rounded badge with the
 * appearance's band colour as the background, the subject glyph icon, and the
 * initials overlaid. Appearance fields come straight from the backend DTO —
 * this component does NOT derive any of them.
 */
export default function ClassAvatar({
  appearance,
  size = 48,
}: {
  appearance: ClassAvatarAppearance | null | undefined;
  size?: number;
}) {
  // Fallback when a class has no CENTRE_CLASS appearance (e.g. older data).
  const band = appearance?.bandColorHex || '#7042ED';
  const initials = appearance?.initials || '';
  const glyph = glyphEmoji(appearance?.subjectGlyph);

  return (
    <div
      role="img"
      aria-label={`Class avatar${initials ? ` ${initials}` : ''}`}
      className="relative rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: band }}
    >
      {/* Subject glyph — the "crest" on the uniform */}
      <span aria-hidden="true" style={{ fontSize: size * 0.42, lineHeight: 1 }}>
        {glyph}
      </span>

      {/* Initials badge overlaid in the corner */}
      {initials && (
        <span
          className="absolute bottom-0 right-0 font-bold text-white leading-none flex items-center justify-center"
          style={{
            fontSize: size * 0.26,
            paddingInline: size * 0.08,
            paddingBlock: size * 0.04,
            background: 'rgba(0,0,0,0.35)',
            borderTopLeftRadius: size * 0.18,
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
