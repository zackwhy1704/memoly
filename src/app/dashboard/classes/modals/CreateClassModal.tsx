'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type CreateClassBody, type OrgClass } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import MochiUploader from '@/components/MochiUploader';
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
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('MATHS');
  const [level, setLevel] = useState('');
  const [brandName, setBrandName] = useState('');
  const [accentColor, setAccentColor] = useState('#4C6FFF');
  // Two-step: create the class, then upload to its brain.
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
      characterType: 'MOCHI',
      brandName: brandName.trim() || undefined,
      accentColor,
    });
  }

  // ── Step 2 — upload to the new class brain ────────────────────────────────
  if (created) {
    const displayName = created.brandName || created.name;
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
              <h2 className="text-lg font-bold text-ink">Add to {displayName}&apos;s brain</h2>
              <p className="text-ink3 text-xs mt-1">
                Join code <span className="font-mono text-accent">{created.joinCode}</span> ·
                upload notes now, or skip and add them anytime from the Brain tab.
              </p>
            </div>
          </div>

          {created.corpusAvatarId && (
            <div className="bg-panel border border-line rounded-2xl p-4">
              <p className="text-ink3 text-xs mb-3">
                Upload notes, worksheets or PDFs — every student&apos;s Mochi in this class reads this shared brain.
              </p>
              <MochiUploader
                avatarId={created.corpusAvatarId}
                onComplete={() => {
                  qc.invalidateQueries({ queryKey: ['classFiles', created.corpusAvatarId] });
                  qc.invalidateQueries({ queryKey: ['wikiPages', created.corpusAvatarId] });
                }}
              />
            </div>
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

  // ── Step 1 — class identity ───────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-ink">New class</h2>
          <p className="text-ink3 text-xs mt-1">Step 1 of 2 — a join code is generated automatically.</p>
        </div>

        {/* Class name */}
        <div className="bg-panel border border-line rounded-2xl p-4 space-y-3">
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
        </div>

        {/* Branding */}
        <div className="bg-panel border border-line rounded-2xl p-4 space-y-3">
          <label className="block">
            <span className="text-xs text-ink2 font-medium">Brand name</span>
            <span className="text-ink3 text-xs ml-1">(optional)</span>
            <p className="text-ink3 text-[11px] mt-0.5 mb-1">
              Shown to students as their tutor&apos;s name — e.g. &ldquo;Bright Minds P4 Math&rdquo;.
            </p>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Bright Minds P4 Math"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink2 font-medium">Accent colour</span>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-line bg-panel2 cursor-pointer"
            />
          </label>
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
