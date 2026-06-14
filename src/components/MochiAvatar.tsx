'use client';

import {
  BODY_VARIANTS,
  CHEEK_VARIANTS,
  type MochiConfig,
  type MochiEyeStyle,
  type MochiAccessory,
  type MochiAura,
} from '@/lib/api';

/**
 * MochiAvatar renders a single Mochi look from `MochiConfig`:
 *
 *   1. an optional soft aura glow + aura ring behind the body,
 *   2. the base PNG (`/mochi-base-transparent.png`) recoloured via CSS filter,
 *   3. a cheek-blush SVG overlay (two ellipses),
 *   4. an eyes + accessory + aura SVG overlay.
 *
 * All overlays use a 170×170 coordinate system (body cx=85, eyes lx=58 / rx=112,
 * eye y=64) scaled to whatever `size` is requested via SVG viewBox.
 *
 * IMPORTANT: the only `dangerouslySetInnerHTML` here is fed by the pure,
 * code-generated SVG string builders below. No user input ever reaches it —
 * the config only selects between fixed enum branches.
 */

const EYE_FILL = '#3a2e1e';
const LX = 58; // left eye centre x
const RX = 112; // right eye centre x
const EY = 64; // eye centre y

// ── Eyes ──────────────────────────────────────────────────────────────────
export function eyeSVG(style: MochiEyeStyle): string {
  switch (style) {
    case 'happy':
      // upward curved arcs (^‿^ style smiling eyes)
      return (
        `<path d="M ${LX - 9} ${EY + 2} Q ${LX} ${EY - 9} ${LX + 9} ${EY + 2}" ` +
        `stroke="${EYE_FILL}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        `<path d="M ${RX - 9} ${EY + 2} Q ${RX} ${EY - 9} ${RX + 9} ${EY + 2}" ` +
        `stroke="${EYE_FILL}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      );
    case 'sleepy':
      // flat horizontal lines (relaxed)
      return (
        `<line x1="${LX - 9}" y1="${EY}" x2="${LX + 9}" y2="${EY}" ` +
        `stroke="${EYE_FILL}" stroke-width="4" stroke-linecap="round"/>` +
        `<line x1="${RX - 9}" y1="${EY}" x2="${RX + 9}" y2="${EY}" ` +
        `stroke="${EYE_FILL}" stroke-width="4" stroke-linecap="round"/>`
      );
    case 'star':
      return star4(LX, EY, 9) + star4(RX, EY, 9);
    case 'surprised':
      // filled round eyes
      return (
        `<circle cx="${LX}" cy="${EY}" r="7" fill="${EYE_FILL}"/>` +
        `<circle cx="${RX}" cy="${EY}" r="7" fill="${EYE_FILL}"/>` +
        // tiny catchlight
        `<circle cx="${LX - 2}" cy="${EY - 2}" r="2" fill="#ffffff"/>` +
        `<circle cx="${RX - 2}" cy="${EY - 2}" r="2" fill="#ffffff"/>`
      );
    case 'uwu':
      // ^ ^ shapes (two strokes meeting at a peak)
      return uwuEye(LX) + uwuEye(RX);
    default:
      return '';
  }
}

function uwuEye(cx: number): string {
  return (
    `<path d="M ${cx - 9} ${EY + 4} L ${cx} ${EY - 5} L ${cx + 9} ${EY + 4}" ` +
    `stroke="${EYE_FILL}" stroke-width="4" fill="none" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function star4(cx: number, cy: number, r: number): string {
  const i = r * 0.34; // inner radius for a sparkly 4-point star
  const pts = [
    [cx, cy - r],
    [cx + i, cy - i],
    [cx + r, cy],
    [cx + i, cy + i],
    [cx, cy + r],
    [cx - i, cy + i],
    [cx - r, cy],
    [cx - i, cy - i],
  ]
    .map((p) => p.join(','))
    .join(' ');
  return `<polygon points="${pts}" fill="${EYE_FILL}"/>`;
}

// ── Accessories ─────────────────────────────────────────────────────────────
export function accessorySVG(acc: MochiAccessory): string {
  switch (acc) {
    case 'none':
      return '';
    case 'bow': {
      // two triangles + centre knot near the top-left of the head
      const cx = 50;
      const cy = 30;
      return (
        `<path d="M ${cx} ${cy} L ${cx - 16} ${cy - 9} L ${cx - 16} ${cy + 9} Z" fill="#ff6f9c"/>` +
        `<path d="M ${cx} ${cy} L ${cx + 16} ${cy - 9} L ${cx + 16} ${cy + 9} Z" fill="#ff6f9c"/>` +
        `<circle cx="${cx}" cy="${cy}" r="5" fill="#e84f86"/>`
      );
    }
    case 'cap': {
      // graduation cap centred at cx=85, y≈30
      const cx = 85;
      const y = 30;
      return (
        `<polygon points="${cx - 26},${y + 4} ${cx},${y - 6} ${cx + 26},${y + 4} ${cx},${y + 14}" ` +
        `fill="#2c2c3a"/>` +
        `<rect x="${cx - 12}" y="${y + 8}" width="24" height="9" rx="2" fill="#2c2c3a"/>` +
        `<line x1="${cx + 22}" y1="${y + 2}" x2="${cx + 22}" y2="${y + 18}" stroke="#ffd44d" stroke-width="2"/>` +
        `<circle cx="${cx + 22}" cy="${y + 19}" r="3" fill="#ffd44d"/>`
      );
    }
    case 'glasses': {
      // two circles + bridge over the eyes
      const r = 13;
      return (
        `<circle cx="${LX}" cy="${EY}" r="${r}" fill="none" stroke="#2c2c3a" stroke-width="3"/>` +
        `<circle cx="${RX}" cy="${EY}" r="${r}" fill="none" stroke="#2c2c3a" stroke-width="3"/>` +
        `<line x1="${LX + r}" y1="${EY}" x2="${RX - r}" y2="${EY}" stroke="#2c2c3a" stroke-width="3"/>`
      );
    }
    case 'crown': {
      // zigzag gold crown near the top
      const cx = 85;
      const base = 36;
      const top = 18;
      return (
        `<polygon points="${cx - 26},${base} ${cx - 26},${top + 6} ${cx - 13},${base - 6} ` +
        `${cx},${top} ${cx + 13},${base - 6} ${cx + 26},${top + 6} ${cx + 26},${base}" ` +
        `fill="#ffce3a" stroke="#e0a800" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<circle cx="${cx - 18}" cy="${top + 8}" r="2.4" fill="#e0533f"/>` +
        `<circle cx="${cx}" cy="${top + 2}" r="2.4" fill="#3fa0e0"/>` +
        `<circle cx="${cx + 18}" cy="${top + 8}" r="2.4" fill="#3fc06a"/>`
      );
    }
    case 'headband': {
      // a band across the forehead with a little side accent
      const y = 38;
      return (
        `<path d="M 56 ${y} Q 85 ${y - 12} 114 ${y}" stroke="#5b8df0" stroke-width="7" ` +
        `fill="none" stroke-linecap="round"/>` +
        `<circle cx="110" cy="${y - 3}" r="4.5" fill="#ffce3a"/>`
      );
    }
    default:
      return '';
  }
}

// ── Auras ─────────────────────────────────────────────────────────────────
export function auraSVG(aura: MochiAura): string {
  switch (aura) {
    case 'none':
      return '';
    case 'sparkle':
      // small ✦ dots around the body
      return (
        sparkle(24, 40, 5, '#ffd75e') +
        sparkle(146, 52, 6, '#fff0a8') +
        sparkle(30, 120, 4, '#ffd75e') +
        sparkle(140, 118, 5, '#fff0a8') +
        sparkle(90, 18, 4, '#ffe680')
      );
    case 'fire':
      // flame shapes at the base
      return (
        flame(60, 150, '#ff7a3c') +
        flame(85, 156, '#ff5a2c') +
        flame(110, 150, '#ff9a4c')
      );
    case 'chill':
      // snowflake dots
      return (
        snowflake(28, 46, 7) +
        snowflake(142, 60, 8) +
        snowflake(36, 124, 6) +
        snowflake(132, 122, 7)
      );
    case 'electric':
      // lightning bolts at the sides
      return bolt(26, 56) + bolt(140, 70);
    case 'bloom':
      // small flowers / petals
      return flower(26, 50, '#ff9ec4') + flower(146, 60, '#ffc46a') + flower(34, 124, '#b794f6');
    default:
      return '';
  }
}

function sparkle(cx: number, cy: number, r: number, fill: string): string {
  return (
    `<path d="M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} ` +
    `Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} ` +
    `Q ${cx} ${cy} ${cx} ${cy - r} Z" fill="${fill}"/>`
  );
}

function flame(cx: number, cy: number, fill: string): string {
  return (
    `<path d="M ${cx} ${cy} C ${cx - 8} ${cy - 8} ${cx - 6} ${cy - 18} ${cx} ${cy - 24} ` +
    `C ${cx + 6} ${cy - 18} ${cx + 8} ${cy - 8} ${cx} ${cy} Z" fill="${fill}" opacity="0.9"/>`
  );
}

function snowflake(cx: number, cy: number, r: number): string {
  const c = '#9fd8ff';
  return (
    `<line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` +
    `<line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` +
    `<line x1="${cx - r * 0.7}" y1="${cy - r * 0.7}" x2="${cx + r * 0.7}" y2="${cy + r * 0.7}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` +
    `<line x1="${cx - r * 0.7}" y1="${cy + r * 0.7}" x2="${cx + r * 0.7}" y2="${cy - r * 0.7}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`
  );
}

function bolt(cx: number, cy: number): string {
  return (
    `<polygon points="${cx},${cy} ${cx + 8},${cy} ${cx + 2},${cy + 9} ${cx + 11},${cy + 9} ` +
    `${cx - 2},${cy + 24} ${cx + 3},${cy + 12} ${cx - 4},${cy + 12} Z" ` +
    `fill="#ffe14d" stroke="#f0b400" stroke-width="0.8"/>`
  );
}

function flower(cx: number, cy: number, fill: string): string {
  const petals = [0, 72, 144, 216, 288]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const px = cx + Math.cos(rad) * 5;
      const py = cy + Math.sin(rad) * 5;
      return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${fill}"/>`;
    })
    .join('');
  return petals + `<circle cx="${cx}" cy="${cy}" r="2.4" fill="#fff2a8"/>`;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function MochiAvatar({
  config,
  size = 120,
  animate = true,
}: {
  config: MochiConfig;
  size?: number;
  animate?: boolean;
}) {
  const bodyIdx = clampIdx(config.body, BODY_VARIANTS.length);
  const cheekIdx = clampIdx(config.cheek, CHEEK_VARIANTS.length);
  const body = BODY_VARIANTS[bodyIdx];
  const cheek = CHEEK_VARIANTS[cheekIdx];
  const hasAura = config.aura !== 'none';

  // Code-generated SVG only — no user input flows into these strings.
  const overlayMarkup = eyeSVG(config.eyes) + accessorySVG(config.accessory) + auraSVG(config.aura);

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Mochi avatar"
    >
      {/* 1a. Soft aura glow behind everything (only when an aura is active). */}
      {hasAura && (
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            inset: -size * 0.06,
            background:
              'radial-gradient(circle, rgba(255,214,94,0.35) 0%, rgba(255,214,94,0) 70%)',
          }}
        />
      )}

      {/* 1b. Aura ring. */}
      {hasAura && (
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            inset: size * 0.02,
            border: `${Math.max(1.5, size * 0.015)}px solid rgba(255,255,255,0.35)`,
          }}
        />
      )}

      {/* 2. Recoloured base PNG with optional breathing animation. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mochi-base-transparent.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: body.filter,
          animation: animate ? 'mochi-breathe 3.6s ease-in-out infinite' : undefined,
          transformOrigin: 'center bottom',
        }}
      />

      {/* 3. Cheek-blush overlay. */}
      <svg
        viewBox="0 0 170 170"
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <ellipse cx={50} cy={84} rx={9} ry={5.5} fill={cheek.hex} opacity={0.55} />
        <ellipse cx={120} cy={84} rx={9} ry={5.5} fill={cheek.hex} opacity={0.55} />
      </svg>

      {/* 4. Eyes + accessory + aura overlay. */}
      {/*
        Code-generated SVG only — see eyeSVG/accessorySVG/auraSVG above.
        The config selects between fixed enum branches; no user-supplied
        string is ever interpolated, so dangerouslySetInnerHTML is safe here.
      */}
      <svg
        viewBox="0 0 170 170"
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: overlayMarkup }}
      />
    </div>
  );
}

function clampIdx(i: number, len: number): number {
  if (!Number.isFinite(i)) return 0;
  const n = Math.floor(i);
  if (n < 0) return 0;
  if (n >= len) return len - 1;
  return n;
}
