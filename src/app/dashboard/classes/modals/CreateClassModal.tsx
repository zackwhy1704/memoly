'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type CreateClassBody, type OrgClass } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CENTRE_MOCHIS, CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import MochiUploader from '@/components/MochiUploader';
import MochiBadge from '../components/MochiBadge';
import CreatedClassAvatar from '../components/CreatedClassAvatar';

export default function CreateClassModal({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: (cls: OrgClass) => void;
}) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('MATHS');
  const [level, setLevel] = useState('');
  const [characterType, setCharacterType] = useState('MOCHI');
  const [brandName, setBrandName] = useState('');
  const [accentColor, setAccentColor] = useState('#4C6FFF');
  // Two-step journey, mirroring the mobile app: create the Mochi, then upload.
  const [created, setCreated] = useState<OrgClass | null>(null);

  const mutation = useMutation({
    mutationFn: (body: CreateClassBody) => api.createClass(orgId, body),
    onSuccess: (res) => {
      trackEvent('class_created', { classId: res.data.id, subject: res.data.subject });
      setCreated(res.data);
    },
  });

  function submit() {
    if (!name.trim()) return;
    mutation.mutate({
      name: name.trim(),
      subject,
      level: level.trim() || undefined,
      characterType,
      brandName: brandName.trim() || undefined,
      accentColor,
    });
  }

  // ── Step 2 — upload up to 10 files to the new class corpus (mobile pipeline) ──
  if (created) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={() => onCreated(created)}
      >
        <div
          className="bg-panel border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            {created.corpusAvatarId && <CreatedClassAvatar avatarId={created.corpusAvatarId} />}
            <div>
              <h2 className="text-lg font-bold text-ink">Add content to {created.brandName || created.name}</h2>
              <p className="text-ink3 text-xs mt-1">
                Join code <span className="font-mono text-accent">{created.joinCode}</span> ·
                upload now or skip and do it later.
              </p>
            </div>
          </div>

          {created.corpusAvatarId && (
            <MochiUploader avatarId={created.corpusAvatarId} />
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={() => onCreated(created)}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-ink">New class</h2>
          <p className="text-ink3 text-xs mt-1">Step 1 of 2 — a join code is generated automatically.</p>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-ink2 font-medium">Class name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="P4 Math"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink2 font-medium">Subject</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {CENTRE_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink2 font-medium">Level</span>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="P4"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </label>
          </div>

          <div>
            <span className="text-xs text-ink2 font-medium">Base Mochi</span>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {CENTRE_MOCHIS.map((m) => {
                const selected = m.characterType === characterType;
                return (
                  <button
                    key={m.characterType}
                    type="button"
                    onClick={() => setCharacterType(m.characterType)}
                    title={`${m.name} — ${m.tagline}`}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition ${
                      selected
                        ? 'border-accent bg-accent/10'
                        : 'border-line bg-panel2 hover:border-accent/40'
                    }`}
                  >
                    <MochiBadge characterType={m.characterType} size={40} />
                    <span className="text-[10px] text-ink2 truncate w-full text-center">
                      {m.name.replace(' Mochi', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink2 font-medium">Brand name (optional)</span>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="ABC P4 Math"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs text-ink2 font-medium">Accent color</span>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-line bg-panel2 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Accessories — layered-art scaffold, inert until art is commissioned */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink2 font-medium">Accessories</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel2 text-ink3">Coming soon</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['Eyewear', 'Clothes', 'Shoes'] as const).map((slot) => (
              <select
                key={slot}
                disabled
                title="Layered accessory art is on the way"
                className="px-2 py-2 rounded-lg border border-line bg-panel2 text-ink3 text-xs opacity-60 cursor-not-allowed"
              >
                <option>{slot} — none</option>
              </select>
            ))}
          </div>
        </div>

        {mutation.isError && (
          <p className="text-xs text-bad">Could not create the class. Please try again.</p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || mutation.isPending}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {mutation.isPending ? 'Creating…' : 'Create & add content →'}
          </button>
        </div>
      </div>
    </div>
  );
}
