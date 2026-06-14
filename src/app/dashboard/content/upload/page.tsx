'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, randomMochiConfig, type MochiConfig, type OrgClass } from '@/lib/api';
import { CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import { useOrg } from '@/lib/org-context';
import MochiUploader from '@/components/MochiUploader';
import MochiAvatar from '@/components/MochiAvatar';
import AvatarPickerModal from '@/components/AvatarPickerModal';

// Mobile-parity journey: create a teaching Mochi (character + name + subject)
// then upload up to 10 files through the same relevance → files → recompile
// pipeline the app uses. Creating the Mochi provisions a class (with its own
// join code + shared corpus) so students can be assigned to it.

function UploadContent() {
  const org = useOrg();
  // Base character is always MOCHI now; teachers differentiate via the Mochi
  // studio (colour/preset/accessory), not a character grid.
  const [characterType] = useState('MOCHI');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('MATHS');
  const [level, setLevel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<OrgClass | null>(null);
  // Class Mochi look — designed in step 1 (the character choice IS the Mochi
  // studio now), persisted to the class on create, editable again in step 2.
  const [classAvatarConfig, setClassAvatarConfig] = useState<MochiConfig>(randomMochiConfig);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function createMochi() {
    if (!name.trim() || !org) return;
    setCreating(true);
    setError('');
    try {
      const res = await api.createClass(org.orgId, {
        name: name.trim(),
        subject,
        level: level.trim() || undefined,
        characterType,
      });
      setCreated(res.data);
      // Persist the Mochi the teacher designed in step 1 (non-blocking).
      try {
        await api.setMochiConfig(org.orgId, res.data.id, classAvatarConfig);
      } catch {
        /* optional — the look is already applied locally */
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : err instanceof Error ? err.message : 'Could not create the Mochi.');
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    setCreated(null);
    setName('');
    setLevel('');
    setClassAvatarConfig(randomMochiConfig());
    setPickerOpen(false);
  }

  async function saveAvatar(cfg: MochiConfig) {
    setClassAvatarConfig(cfg);
    setPickerOpen(false);
    if (!org || !created) return;
    try {
      const res = await api.setMochiConfig(org.orgId, created.id, cfg);
      // Adopt the canonical class back from the server when available.
      setCreated((prev) => (prev ? { ...prev, ...res.data } : prev));
    } catch {
      // Non-blocking optional step — the look is already applied locally.
    }
  }

  // ── Step 2 — upload ─────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Add content to {created.name}</h1>
          <p className="text-ink3 text-sm mt-1">
            Step 2 of 2 · join code <span className="font-mono text-accent">{created.joinCode}</span> ·
            upload up to 10 files at a time.
          </p>
        </div>

        {/* Optional, non-blocking step — give the class Mochi a custom look. */}
        {classAvatarConfig && (
          <div className="flex items-center gap-3 bg-panel rounded-xl border border-line p-3">
            <MochiAvatar config={classAvatarConfig} size={48} animate={false} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{created.name}</p>
              <p className="text-xs text-ink3">Class Mochi look</p>
            </div>
            <button
              onClick={() => setPickerOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition whitespace-nowrap"
            >
              Customise class Mochi ↗
            </button>
          </div>
        )}

        {created.corpusAvatarId && <MochiUploader avatarId={created.corpusAvatarId} />}

        {pickerOpen && classAvatarConfig && (
          <AvatarPickerModal
            initial={classAvatarConfig}
            onSave={saveAvatar}
            onDismiss={() => setPickerOpen(false)}
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
          >
            + Create another Mochi
          </button>
          <Link
            href={`/dashboard/classes/${created.id}`}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Go to class →
          </Link>
        </div>
      </div>
    );
  }

  // ── Step 1 — create the Mochi ───────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">New teaching Mochi</h1>
        <p className="text-ink3 text-sm mt-1">
          Step 1 of 2 — design your class Mochi, name it, choose a subject.
        </p>
      </div>

      <div className="bg-panel rounded-xl border border-line p-6">
        <p className="text-xs font-semibold text-ink3 uppercase tracking-wider mb-4">Design your class Mochi</p>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-[#0d0d0d] p-5">
            <MochiAvatar config={classAvatarConfig} size={120} />
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm font-medium hover:bg-panel2 transition"
          >
            Choose a style or customise ↗
          </button>
        </div>
      </div>

      <div className="bg-panel rounded-xl border border-line p-6 space-y-4">
        <label className="block">
          <span className="text-xs text-ink2 font-medium">Name *</span>
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

      {error && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">{error}</div>
      )}

      <button
        onClick={createMochi}
        disabled={!name.trim() || creating || !org}
        className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-40"
      >
        {creating ? 'Creating…' : 'Create & add content →'}
      </button>

      {pickerOpen && (
        <AvatarPickerModal
          initial={classAvatarConfig}
          onSave={(cfg) => { setClassAvatarConfig(cfg); setPickerOpen(false); }}
          onDismiss={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-ink3">Loading…</div>}>
      <UploadContent />
    </Suspense>
  );
}
