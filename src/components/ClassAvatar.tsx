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

/** Below this size, initials are illegible — the corner chip shows the glyph only. */
const INITIALS_MIN_SIZE = 64;

/**
 * Renders a CENTRE_CLASS avatar with visual parity to the mobile app's
 * `ClassUniformAvatar`/`class_uniform_mochi_painter.dart`: the base Mochi is
 * rendered UNTOUCHED, and the class identity sits AROUND it —
 *
 *   • a coloured **ring** (3–4px) in `bandColorHex` around the whole avatar, and
 *   • a small circular **corner chip** anchored bottom-right (≤30% of size)
 *     carrying the subject glyph (and `initials` only at size ≥ 64px).
 *
 * Appearance fields come straight from the backend DTO — this component does
 * NOT derive any of them.
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
  const initials = (appearance?.initials || '').trim();
  const glyph = glyphEmoji(appearance?.subjectGlyph);

  // Ring stroke scales gently with size, clamped to a crisp 3–4px band.
  const ringStroke = Math.min(4, Math.max(3, size * 0.035));
  // Corner chip is at most 30% of the avatar.
  const chipSize = size * 0.3;
  // Base Mochi is inset so the ring sits AROUND it, not over the body.
  const bodyInset = ringStroke + size * 0.01;
  const mochiSize = size - bodyInset * 2;

  const showInitials = initials.length > 0 && size >= INITIALS_MIN_SIZE;

  return (
    <div
      role="img"
      aria-label={`Class avatar${initials ? ` ${initials}` : ''}`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      {/* 1. Coloured ring AROUND the avatar — never over the body. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{ border: `${ringStroke}px solid ${band}` }}
      />

      {/* 2. Base Mochi, rendered untouched, inset within the ring. */}
      <div
        className="absolute flex items-center justify-center"
        style={{ inset: bodyInset }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mochi-base.svg"
          alt=""
          aria-hidden="true"
          width={mochiSize}
          height={mochiSize}
          style={{ width: mochiSize, height: mochiSize }}
        />
      </div>

      {/* 3. Corner chip — bottom-right, carrying the subject glyph + (optional) initials. */}
      <div
        className="absolute bottom-0 right-0 flex flex-col items-center justify-center rounded-full leading-none"
        style={{
          width: chipSize,
          height: chipSize,
          background: band,
          border: `${ringStroke * 0.6}px solid #ffffff`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: chipSize * 0.5, lineHeight: 1 }}>
          {glyph}
        </span>
        {showInitials && (
          <span
            className="font-bold text-white"
            style={{ fontSize: chipSize * 0.34, lineHeight: 1, marginTop: chipSize * 0.04 }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}
