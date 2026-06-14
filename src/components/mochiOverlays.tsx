import React from 'react';
import type { MochiAccessory, MochiAura } from '@/lib/api';

// Measured from the 3D base PNG (1254² → 170 viewBox): baked-in eyes at x≈65/104, y≈89.
const LX = 65;
const RX = 104;
const EY = 89;

// Accessories + auras rendered as REAL SVG JSX elements (not innerHTML strings),
// so they can never be malformed by the SSR/serialization path. Pure functions of
// the enum value — no user input.
export function AccessoryNodes({ accessory }: { accessory: MochiAccessory }): React.ReactNode {
  switch (accessory) {
    case 'bow': {
      const cx = 50, cy = 30;
      return (
        <>
          <path d={`M ${cx} ${cy} L ${cx - 16} ${cy - 9} L ${cx - 16} ${cy + 9} Z`} fill="#ff6f9c" />
          <path d={`M ${cx} ${cy} L ${cx + 16} ${cy - 9} L ${cx + 16} ${cy + 9} Z`} fill="#ff6f9c" />
          <circle cx={cx} cy={cy} r={5} fill="#e84f86" />
        </>
      );
    }
    case 'cap': {
      const cx = 85, y = 30;
      return (
        <>
          <polygon points={`${cx - 26},${y + 4} ${cx},${y - 6} ${cx + 26},${y + 4} ${cx},${y + 14}`} fill="#2c2c3a" />
          <rect x={cx - 12} y={y + 8} width={24} height={9} rx={2} fill="#2c2c3a" />
          <line x1={cx + 22} y1={y + 2} x2={cx + 22} y2={y + 18} stroke="#ffd44d" strokeWidth={2} />
          <circle cx={cx + 22} cy={y + 19} r={3} fill="#ffd44d" />
        </>
      );
    }
    case 'glasses': {
      const r = 13;
      return (
        <>
          <circle cx={LX} cy={EY} r={r} fill="none" stroke="#2c2c3a" strokeWidth={3} />
          <circle cx={RX} cy={EY} r={r} fill="none" stroke="#2c2c3a" strokeWidth={3} />
          <line x1={LX + r} y1={EY} x2={RX - r} y2={EY} stroke="#2c2c3a" strokeWidth={3} />
        </>
      );
    }
    case 'crown': {
      const cx = 85, base = 36, top = 18;
      return (
        <>
          <polygon
            points={`${cx - 26},${base} ${cx - 26},${top + 6} ${cx - 13},${base - 6} ${cx},${top} ${cx + 13},${base - 6} ${cx + 26},${top + 6} ${cx + 26},${base}`}
            fill="#ffce3a" stroke="#e0a800" strokeWidth={1.5} strokeLinejoin="round"
          />
          <circle cx={cx - 18} cy={top + 8} r={2.4} fill="#e0533f" />
          <circle cx={cx} cy={top + 2} r={2.4} fill="#3fa0e0" />
          <circle cx={cx + 18} cy={top + 8} r={2.4} fill="#3fc06a" />
        </>
      );
    }
    case 'headband': {
      const y = 38;
      return (
        <>
          <path d={`M 56 ${y} Q 85 ${y - 12} 114 ${y}`} stroke="#5b8df0" strokeWidth={7} fill="none" strokeLinecap="round" />
          <circle cx={110} cy={y - 3} r={4.5} fill="#ffce3a" />
        </>
      );
    }
    default:
      return null;
  }
}

export function AuraNodes({ aura }: { aura: MochiAura }): React.ReactNode {
  switch (aura) {
    case 'sparkle':
      return (
        <>
          <Sparkle cx={24} cy={40} r={5} fill="#ffd75e" />
          <Sparkle cx={146} cy={52} r={6} fill="#fff0a8" />
          <Sparkle cx={30} cy={120} r={4} fill="#ffd75e" />
          <Sparkle cx={140} cy={118} r={5} fill="#fff0a8" />
          <Sparkle cx={90} cy={18} r={4} fill="#ffe680" />
        </>
      );
    case 'fire':
      return (
        <>
          <Flame cx={60} cy={150} fill="#ff7a3c" />
          <Flame cx={85} cy={156} fill="#ff5a2c" />
          <Flame cx={110} cy={150} fill="#ff9a4c" />
        </>
      );
    case 'chill':
      return (
        <>
          <Snowflake cx={28} cy={46} r={7} />
          <Snowflake cx={142} cy={60} r={8} />
          <Snowflake cx={36} cy={124} r={6} />
          <Snowflake cx={132} cy={122} r={7} />
        </>
      );
    case 'electric':
      return (<><Bolt cx={26} cy={56} /><Bolt cx={140} cy={70} /></>);
    case 'bloom':
      return (
        <>
          <Flower cx={26} cy={50} fill="#ff9ec4" />
          <Flower cx={146} cy={60} fill="#ffc46a" />
          <Flower cx={34} cy={124} fill="#b794f6" />
        </>
      );
    default:
      return null;
  }
}

function Sparkle({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return <path d={`M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z`} fill={fill} />;
}
function Flame({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
  return <path d={`M ${cx} ${cy} C ${cx - 8} ${cy - 8} ${cx - 6} ${cy - 18} ${cx} ${cy - 24} C ${cx + 6} ${cy - 18} ${cx + 8} ${cy - 8} ${cx} ${cy} Z`} fill={fill} opacity={0.9} />;
}
function Snowflake({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const c = '#9fd8ff';
  return (
    <>
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <line x1={cx - r * 0.7} y1={cy + r * 0.7} x2={cx + r * 0.7} y2={cy - r * 0.7} stroke={c} strokeWidth={2} strokeLinecap="round" />
    </>
  );
}
function Bolt({ cx, cy }: { cx: number; cy: number }) {
  return <polygon points={`${cx},${cy} ${cx + 8},${cy} ${cx + 2},${cy + 9} ${cx + 11},${cy + 9} ${cx - 2},${cy + 24} ${cx + 3},${cy + 12} ${cx - 4},${cy + 12}`} fill="#ffe14d" stroke="#f0b400" strokeWidth={0.8} />;
}
function Flower({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return <circle key={deg} cx={+(cx + Math.cos(rad) * 5).toFixed(1)} cy={+(cy + Math.sin(rad) * 5).toFixed(1)} r={3} fill={fill} />;
  });
  return (<>{petals}<circle cx={cx} cy={cy} r={2.4} fill="#fff2a8" /></>);
}
