'use client';

import { useState } from 'react';
import {
  BODY_VARIANTS,
  BODY_PREVIEW_HEX,
  CHEEK_VARIANTS,
  randomMochiConfig,
  type MochiConfig,
  type MochiEyeStyle,
  type MochiAccessory,
  type MochiAura,
} from '@/lib/api';
import MochiAvatar from '@/components/MochiAvatar';

// ── 16 named presets — quick-pick looks built from MochiConfig. ───────────────
const PRESETS: ReadonlyArray<{ name: string; config: MochiConfig }> = [
  { name: 'Sunny',     config: { body: 0, cheek: 0, eyes: 'happy', accessory: 'none', aura: 'sparkle' } },
  { name: 'Peachy',    config: { body: 1, cheek: 3, eyes: 'uwu', accessory: 'bow', aura: 'none' } },
  { name: 'Coral Pop', config: { body: 2, cheek: 1, eyes: 'happy', accessory: 'none', aura: 'bloom' } },
  { name: 'Rosie',     config: { body: 3, cheek: 2, eyes: 'star', accessory: 'bow', aura: 'sparkle' } },
  { name: 'Bubbly',    config: { body: 4, cheek: 2, eyes: 'surprised', accessory: 'crown', aura: 'bloom' } },
  { name: 'Lavender',  config: { body: 5, cheek: 4, eyes: 'sleepy', accessory: 'none', aura: 'chill' } },
  { name: 'Scholar',   config: { body: 6, cheek: 0, eyes: 'happy', accessory: 'cap', aura: 'none' } },
  { name: 'Sky Diver', config: { body: 7, cheek: 5, eyes: 'star', accessory: 'glasses', aura: 'electric' } },
  { name: 'Minty',     config: { body: 8, cheek: 0, eyes: 'uwu', accessory: 'headband', aura: 'chill' } },
  { name: 'Matcha',    config: { body: 9, cheek: 1, eyes: 'happy', accessory: 'none', aura: 'bloom' } },
  { name: 'Sandy',     config: { body: 10, cheek: 3, eyes: 'sleepy', accessory: 'cap', aura: 'none' } },
  { name: 'Stormy',    config: { body: 11, cheek: 5, eyes: 'surprised', accessory: 'none', aura: 'electric' } },
  { name: 'Royal',     config: { body: 5, cheek: 2, eyes: 'star', accessory: 'crown', aura: 'sparkle' } },
  { name: 'Ember',     config: { body: 2, cheek: 1, eyes: 'happy', accessory: 'headband', aura: 'fire' } },
  { name: 'Nerd',      config: { body: 6, cheek: 0, eyes: 'happy', accessory: 'glasses', aura: 'none' } },
  { name: 'Frost',     config: { body: 7, cheek: 5, eyes: 'sleepy', accessory: 'none', aura: 'chill' } },
];

const EYE_OPTIONS: ReadonlyArray<{ value: MochiEyeStyle; label: string }> = [
  { value: 'happy', label: 'Happy' },
  { value: 'sleepy', label: 'Sleepy' },
  { value: 'star', label: 'Star' },
  { value: 'surprised', label: 'Surprised' },
  { value: 'uwu', label: 'UwU' },
];

const ACCESSORY_OPTIONS: ReadonlyArray<{ value: MochiAccessory; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'bow', label: 'Bow' },
  { value: 'cap', label: 'Grad cap' },
  { value: 'glasses', label: 'Glasses' },
  { value: 'crown', label: 'Crown' },
  { value: 'headband', label: 'Headband' },
];

const AURA_OPTIONS: ReadonlyArray<{ value: MochiAura; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'sparkle', label: 'Sparkle' },
  { value: 'fire', label: 'Fire' },
  { value: 'chill', label: 'Chill' },
  { value: 'electric', label: 'Electric' },
  { value: 'bloom', label: 'Bloom' },
];

type Tab = 'presets' | 'customise';

export default function AvatarPickerModal({
  initial,
  onSave,
  onDismiss,
}: {
  initial: MochiConfig;
  onSave: (cfg: MochiConfig) => void;
  onDismiss: () => void;
}) {
  const [tab, setTab] = useState<Tab>('presets');
  const [config, setConfig] = useState<MochiConfig>(initial);

  const set = (patch: Partial<MochiConfig>) => setConfig((c) => ({ ...c, ...patch }));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Customise class Mochi"
      onClick={onDismiss}
    >
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + tabs */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold text-ink">Customise class Mochi</h2>
          <button
            onClick={onDismiss}
            aria-label="Close"
            className="text-ink3 hover:text-ink text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="px-6 flex gap-1 border-b border-line">
          <TabButton active={tab === 'presets'} onClick={() => setTab('presets')}>
            Presets
          </TabButton>
          <TabButton active={tab === 'customise'} onClick={() => setTab('customise')}>
            Customise
          </TabButton>
        </div>

        <div className="p-6 space-y-5">
          {tab === 'presets' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setConfig(p.config)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 border-line bg-panel2 hover:border-accent/50 transition"
                >
                  <MochiAvatar config={p.config} size={80} animate={false} />
                  <span className="text-[11px] text-ink2 font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Live preview on a dark stage — preview section ONLY. */}
              <div
                className="rounded-xl flex items-center justify-center py-6"
                style={{ background: '#0d0d0d' }}
              >
                <MochiAvatar config={config} size={140} />
              </div>

              {/* Body colour */}
              <Section label="Body colour">
                <div className="flex flex-wrap gap-2">
                  {BODY_PREVIEW_HEX.map((hex, i) => (
                    <button
                      key={i}
                      aria-label={`Body ${BODY_VARIANTS[i].name}`}
                      onClick={() => set({ body: i })}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        config.body === i ? 'border-accent scale-110' : 'border-line'
                      }`}
                      style={{ background: hex }}
                    />
                  ))}
                </div>
              </Section>

              {/* Cheeks */}
              <Section label="Cheeks">
                <div className="flex flex-wrap gap-2">
                  {CHEEK_VARIANTS.map((c, i) => (
                    <button
                      key={i}
                      aria-label={`Cheek ${c.name}`}
                      onClick={() => set({ cheek: i })}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        config.cheek === i ? 'border-accent scale-110' : 'border-line'
                      }`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </Section>

              {/* Eyes */}
              <Section label="Eyes">
                <PillRow
                  options={EYE_OPTIONS}
                  value={config.eyes}
                  onSelect={(v) => set({ eyes: v })}
                />
              </Section>

              {/* Accessory */}
              <Section label="Accessory">
                <PillRow
                  options={ACCESSORY_OPTIONS}
                  value={config.accessory}
                  onSelect={(v) => set({ accessory: v })}
                />
              </Section>

              {/* Aura */}
              <Section label="Aura">
                <PillRow
                  options={AURA_OPTIONS}
                  value={config.aura}
                  onSelect={(v) => set({ aura: v })}
                />
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-1 flex items-center justify-between gap-3">
          <button
            onClick={() => setConfig(randomMochiConfig())}
            className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm font-medium hover:bg-panel2 transition"
          >
            🎲 Random
          </button>
          <button
            onClick={() => onSave(config)}
            className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Save avatar
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
        active ? 'border-accent text-accent' : 'border-transparent text-ink3 hover:text-ink2'
      }`}
    >
      {children}
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink3 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

function PillRow<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            value === o.value
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-line text-ink2 hover:border-accent/40'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
