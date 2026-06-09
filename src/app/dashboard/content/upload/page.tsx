'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type OrgClass } from '@/lib/api';
import { CENTRE_MOCHIS, CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import { useOrg } from '@/lib/org-context';
import MochiUploader from '@/components/MochiUploader';

// Mobile-parity journey: create a teaching Mochi (character + name + subject)
// then upload up to 10 files through the same relevance → files → recompile
// pipeline the app uses. Creating the Mochi provisions a class (with its own
// join code + shared corpus) so students can be assigned to it.
function MochiBadge({ characterType, size = 56 }: { characterType: string; size?: number }) {
  const m = CENTRE_MOCHIS.find((c) => c.characterType === characterType) ?? CENTRE_MOCHIS[0];
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: size * 0.7 }}>{m.emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.image} alt={m.name} width={size} height={size} onError={() => setFailed(true)} className="object-contain" />
  );
}

function UploadContent() {
  const org = useOrg();
  const [characterType, setCharacterType] = useState('ATWSAKURA');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('MATHS');
  const [level, setLevel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<OrgClass | null>(null);

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
  }

  // ── Step 2 — upload ─────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Add content to {created.name}</h1>
          <p className="text-ink3 text-sm mt-1">
            Step 2 of 2 · join code <span className="font-mono text-accent">{created.joinCode}</span> ·
            upload up to 10 files at a time.
          </p>
        </div>

        {created.corpusAvatarId && <MochiUploader avatarId={created.corpusAvatarId} />}

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
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">New teaching Mochi</h1>
        <p className="text-ink3 text-sm mt-1">
          Step 1 of 2 — pick a character, name it, choose a subject. Same journey as the app.
        </p>
      </div>

      <div className="bg-panel rounded-xl border border-line p-6">
        <p className="text-xs font-semibold text-ink3 uppercase tracking-wider mb-4">Choose a character</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CENTRE_MOCHIS.map((m) => {
            const selected = m.characterType === characterType;
            return (
              <button
                key={m.characterType}
                onClick={() => setCharacterType(m.characterType)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition ${
                  selected ? 'border-accent bg-accent/10' : 'border-line bg-panel2 hover:border-accent/40'
                }`}
              >
                <MochiBadge characterType={m.characterType} size={56} />
                <div className="text-center">
                  <p className={`text-xs font-semibold ${selected ? 'text-accent' : 'text-ink'}`}>{m.name}</p>
                  <p className="text-[10px] text-ink3">{m.tagline}</p>
                </div>
              </button>
            );
          })}
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
