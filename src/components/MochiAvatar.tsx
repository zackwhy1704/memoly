'use client';

import { BODY_VARIANTS, type MochiConfig } from '@/lib/api';
import { AccessoryNodes, AuraNodes } from '@/components/mochiOverlays';

/**
 * MochiAvatar renders a single Mochi look from `MochiConfig`:
 *
 *   1. an optional soft aura glow + aura ring behind the body,
 *   2. the base PNG (`/mochi-base-transparent.png`) recoloured via CSS filter,
 *   3. an accessory + aura SVG overlay.
 *
 * The base PNG already has eyes and cheeks baked in, so the customiser does
 * not draw them — it only controls body colour, accessory and aura.
 *
 * Overlays use a 170×170 coordinate system (body cx=85) scaled to whatever
 * `size` is requested via SVG viewBox. Accessories that sit over the baked-in
 * eyes (e.g. glasses) use the measured eye coords below (x≈65/104, y≈89).
 *
 * IMPORTANT: the only `dangerouslySetInnerHTML` here is fed by the pure,
 * code-generated SVG string builders below. No user input ever reaches it —
 * the config only selects between fixed enum branches.
 */

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
  const body = BODY_VARIANTS[bodyIdx];
  const hasAura = config.aura !== 'none';

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Mochi avatar"
      // Build stamp — inspect on the deployed site to confirm current code.
      data-mochi-build="overlay-v6-jsx"
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
      {/* next-image-exempt: absolute-fill overlay with a per-avatar CSS recolor
          filter + breathe animation; layered composition, not a plain mascot. */}
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

      {/* 3. Accessory + aura overlay — real SVG JSX elements (no innerHTML), so
          the markup can never be malformed by SSR/serialization. */}
      <svg
        viewBox="0 0 170 170"
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <AccessoryNodes accessory={config.accessory} />
        <AuraNodes aura={config.aura} />
      </svg>
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
