// SVG overlay builders for MochiAvatar (accessories + auras). Pure, code-generated
// strings — no user input reaches them (the config only selects enum branches).
// All shapes use EXPLICIT closing tags (not self-closing) so they parse correctly
// through React dangerouslySetInnerHTML / SSR. Lives in its own module so the
// incremental build cache compiles it fresh.
import type { MochiAccessory, MochiAura } from '@/lib/api';

// Measured from the 3D base PNG (1254² → 170 viewBox): baked-in eyes at x≈65/104, y≈89.
const LX = 65;
const RX = 104;
const EY = 89;

export function accessorySVG(acc: MochiAccessory): string {
  switch (acc) {
    case 'none':
      return '';
    case 'bow': {
      const cx = 50, cy = 30;
      return (
        `<path d="M ${cx} ${cy} L ${cx - 16} ${cy - 9} L ${cx - 16} ${cy + 9} Z" fill="#ff6f9c"></path>` +
        `<path d="M ${cx} ${cy} L ${cx + 16} ${cy - 9} L ${cx + 16} ${cy + 9} Z" fill="#ff6f9c"></path>` +
        `<circle cx="${cx}" cy="${cy}" r="5" fill="#e84f86"></circle>`
      );
    }
    case 'cap': {
      const cx = 85, y = 30;
      return (
        `<polygon points="${cx - 26},${y + 4} ${cx},${y - 6} ${cx + 26},${y + 4} ${cx},${y + 14}" fill="#2c2c3a"></polygon>` +
        `<rect x="${cx - 12}" y="${y + 8}" width="24" height="9" rx="2" fill="#2c2c3a"></rect>` +
        `<line x1="${cx + 22}" y1="${y + 2}" x2="${cx + 22}" y2="${y + 18}" stroke="#ffd44d" stroke-width="2"></line>` +
        `<circle cx="${cx + 22}" cy="${y + 19}" r="3" fill="#ffd44d"></circle>`
      );
    }
    case 'glasses': {
      const r = 13;
      return (
        `<circle cx="${LX}" cy="${EY}" r="${r}" fill="none" stroke="#2c2c3a" stroke-width="3"></circle>` +
        `<circle cx="${RX}" cy="${EY}" r="${r}" fill="none" stroke="#2c2c3a" stroke-width="3"></circle>` +
        `<line x1="${LX + r}" y1="${EY}" x2="${RX - r}" y2="${EY}" stroke="#2c2c3a" stroke-width="3"></line>`
      );
    }
    case 'crown': {
      const cx = 85, base = 36, top = 18;
      return (
        `<polygon points="${cx - 26},${base} ${cx - 26},${top + 6} ${cx - 13},${base - 6} ` +
        `${cx},${top} ${cx + 13},${base - 6} ${cx + 26},${top + 6} ${cx + 26},${base}" ` +
        `fill="#ffce3a" stroke="#e0a800" stroke-width="1.5" stroke-linejoin="round"></polygon>` +
        `<circle cx="${cx - 18}" cy="${top + 8}" r="2.4" fill="#e0533f"></circle>` +
        `<circle cx="${cx}" cy="${top + 2}" r="2.4" fill="#3fa0e0"></circle>` +
        `<circle cx="${cx + 18}" cy="${top + 8}" r="2.4" fill="#3fc06a"></circle>`
      );
    }
    case 'headband': {
      const y = 38;
      return (
        `<path d="M 56 ${y} Q 85 ${y - 12} 114 ${y}" stroke="#5b8df0" stroke-width="7" fill="none" stroke-linecap="round"></path>` +
        `<circle cx="110" cy="${y - 3}" r="4.5" fill="#ffce3a"></circle>`
      );
    }
    default:
      return '';
  }
}

export function auraSVG(aura: MochiAura): string {
  switch (aura) {
    case 'none':
      return '';
    case 'sparkle':
      return (
        sparkle(24, 40, 5, '#ffd75e') + sparkle(146, 52, 6, '#fff0a8') +
        sparkle(30, 120, 4, '#ffd75e') + sparkle(140, 118, 5, '#fff0a8') +
        sparkle(90, 18, 4, '#ffe680')
      );
    case 'fire':
      return flame(60, 150, '#ff7a3c') + flame(85, 156, '#ff5a2c') + flame(110, 150, '#ff9a4c');
    case 'chill':
      return snowflake(28, 46, 7) + snowflake(142, 60, 8) + snowflake(36, 124, 6) + snowflake(132, 122, 7);
    case 'electric':
      return bolt(26, 56) + bolt(140, 70);
    case 'bloom':
      return flower(26, 50, '#ff9ec4') + flower(146, 60, '#ffc46a') + flower(34, 124, '#b794f6');
    default:
      return '';
  }
}

function sparkle(cx: number, cy: number, r: number, fill: string): string {
  return `<path d="M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z" fill="${fill}"></path>`;
}
function flame(cx: number, cy: number, fill: string): string {
  return `<path d="M ${cx} ${cy} C ${cx - 8} ${cy - 8} ${cx - 6} ${cy - 18} ${cx} ${cy - 24} C ${cx + 6} ${cy - 18} ${cx + 8} ${cy - 8} ${cx} ${cy} Z" fill="${fill}" opacity="0.9"></path>`;
}
function snowflake(cx: number, cy: number, r: number): string {
  const c = '#9fd8ff';
  return (
    `<line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${c}" stroke-width="2" stroke-linecap="round"></line>` +
    `<line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${c}" stroke-width="2" stroke-linecap="round"></line>` +
    `<line x1="${cx - r * 0.7}" y1="${cy - r * 0.7}" x2="${cx + r * 0.7}" y2="${cy + r * 0.7}" stroke="${c}" stroke-width="2" stroke-linecap="round"></line>` +
    `<line x1="${cx - r * 0.7}" y1="${cy + r * 0.7}" x2="${cx + r * 0.7}" y2="${cy - r * 0.7}" stroke="${c}" stroke-width="2" stroke-linecap="round"></line>`
  );
}
function bolt(cx: number, cy: number): string {
  return `<polygon points="${cx},${cy} ${cx + 8},${cy} ${cx + 2},${cy + 9} ${cx + 11},${cy + 9} ${cx - 2},${cy + 24} ${cx + 3},${cy + 12} ${cx - 4},${cy + 12} Z" fill="#ffe14d" stroke="#f0b400" stroke-width="0.8"></polygon>`;
}
function flower(cx: number, cy: number, fill: string): string {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const px = cx + Math.cos(rad) * 5;
    const py = cy + Math.sin(rad) * 5;
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${fill}"></circle>`;
  }).join('');
  return petals + `<circle cx="${cx}" cy="${cy}" r="2.4" fill="#fff2a8"></circle>`;
}
