'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, randomMochiConfig, type CreateClassBody, type MochiConfig, type OrgClass } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import MochiAvatar from '@/components/MochiAvatar';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import MochiUploader from '@/components/MochiUploader';

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

  // ── Step 1 state ─────────────────────────────────────────────────────────
  const [mochiConfig, setMochiConfig] = useState<MochiConfig>(randomMochiConfig);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('MATHS');
  const [level, setLevel] = useState('');
  const [brandName, setBrandName] = useState('');
  const [accentColor, setAccentColor] = useState('#4C6FFF');

  // ── Step 2 state ─────────────────────────────────────────────────────────
  const [created, setCreated] = useState<OrgClass | null>(null);

  const mutation = useMutation({
    mutationFn: (body: CreateClassBody) => api.createClass(orgId, body),
    onSuccess: async (res) => {
      trackEvent('class_created', { classId: res.data.id, subject: res.data.subject });
      try {
        await api.setMochiConfig(orgId, res.data.id, mochiConfig);
      } catch {
        // Non-blocking — look already applied locally.
      }
      setCreated(res.data);
    },
  });

  function submit() {
    if (!name.trim() || mutation.isPending) return;
    mutation.mutate({
      name: name.trim(),
      subject,
      level: level.trim() || undefined,
      characterType: 'MOCHI',
      brandName: brandName.trim() || undefined,
      accentColor,
    });
  }

  // ── Step 2 — upload to brain + re-customise Mochi ─────────────────────────
  if (created) {
    const displayName = created.brandName || created.name;

    async function saveAvatar(cfg: MochiConfig) {
      setMochiConfig(cfg);
      setPickerOpen(false);
      if (!created) return;
      try {
        await api.setMochiConfig(orgId, created.id, cfg);
      } catch {
        // Non-blocking optional step.
      }
    }

    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={() => onCreated(created)}
      >
        <div
          className="bg-panel border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <h2 className="text-lg font-bold text-ink">Add to {displayName}&apos;s brain</h2>
            <p className="text-ink3 text-xs mt-1">
              Step 2 of 2 · join code{' '}
              <span className="font-mono text-accent">{created.joinCode}</span> ·
              upload notes now, or skip and add them anytime from the Brain tab.
            </p>
          </div>

          {/* Live Mochi preview + re-customise */}
          <div className="flex items-center gap-3 bg-panel2 border border-line rounded-xl p-3">
            <div className="rounded-xl bg-[#0d0d0d] p-2 shrink-0">
              <MochiAvatar config={mochiConfig} size={48} animate={false} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
              <p className="text-ink3 text-xs">Class Mochi look</p>
            </div>
            <button
              onClick={() => setPickerOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel transition whitespace-nowrap"
            >
              Customise ↗
            </button>
          </div>

          {/* Brain uploader */}
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
              Done →
            </button>
          </div>
        </div>

        {pickerOpen && (
          <AvatarPickerModal
            initial={mochiConfig}
            onSave={saveAvatar}
            onDismiss={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Step 1 — design Mochi + class identity ────────────────────────────────
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
          <p className="text-ink3 text-xs mt-1">Step 1 of 2 — design a Mochi for this class, then name it.</p>
        </div>

        {/* Mochi studio */}
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-xs font-semibold text-ink3 uppercase tracking-wider mb-4">Design your class Mochi</p>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-[#0d0d0d] p-5">
              <MochiAvatar config={mochiConfig} size={120} />
            </div>
            <button
              onClick={() => setPickerOpen(true)}
              className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm font-medium hover:bg-panel2 transition"
            >
              Choose a style or customise ↗
            </button>
          </div>
        </div>

        {/* Class identity */}
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

      {pickerOpen && (
        <AvatarPickerModal
          initial={mochiConfig}
          onSave={(cfg) => { setMochiConfig(cfg); setPickerOpen(false); }}
          onDismiss={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
