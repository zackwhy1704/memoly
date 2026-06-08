'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type CreateClassBody, type OrgClass } from '@/lib/api';
import { CENTRE_MOCHIS, CENTRE_SUBJECTS, mochiFor } from '@/lib/centre-mochis';
import { useOrg } from '@/lib/org-context';

function MochiBadge({ characterType, size = 40 }: { characterType: string; size?: number }) {
  const m = mochiFor(characterType);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span style={{ fontSize: size * 0.7 }}>{m.emoji}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={m.image}
      alt={m.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="object-contain"
    />
  );
}

export default function ClassesPage() {
  const router = useRouter();
  const org = useOrg();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['classes', org?.orgId],
    queryFn: () => api.classes(org!.orgId),
    enabled: !!org,
  });

  const classes: OrgClass[] = Array.isArray(data?.data) ? data!.data : [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Classes</h1>
          <p className="text-ink3 text-sm mt-1">
            Each class has its own join code, shared corpus, and branded Mochi.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
        >
          + New class
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <span className="text-3xl animate-bounce">🏫</span>
            <p className="text-ink3 text-sm">Loading classes…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
          Failed to load classes.
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
              className="bg-panel border border-line rounded-2xl p-5 text-left hover:border-accent/40 hover:bg-panel2 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: (cls.accentColor ?? '#7042ED') + '22' }}
                >
                  <MochiBadge characterType={cls.characterType} size={36} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-ink truncate">
                    {cls.brandName || cls.name}
                  </h2>
                  <p className="text-ink3 text-xs truncate">
                    {[cls.subject, cls.level].filter(Boolean).join(' · ') || 'No subject set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink3">{cls.studentCount} students</span>
                <span className="font-mono text-xs px-2 py-1 rounded bg-panel2 text-ink2 tracking-wider">
                  {cls.joinCode}
                </span>
              </div>
            </button>
          ))}

          {classes.length === 0 && (
            <div className="col-span-2 text-center py-20 text-ink3">
              <p className="text-4xl mb-3">🏫</p>
              <p>No classes yet — create your first class to get a join code.</p>
            </div>
          )}
        </div>
      )}

      {showCreate && org && (
        <CreateClassModal
          orgId={org.orgId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['classes', org.orgId] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateClassModal({
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
  const [characterType, setCharacterType] = useState('ATWSAKURA');
  const [brandName, setBrandName] = useState('');
  const [accentColor, setAccentColor] = useState('#7042ED');

  const mutation = useMutation({
    mutationFn: (body: CreateClassBody) => api.createClass(orgId, body),
    onSuccess: (res) => onCreated(res.data),
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
          <p className="text-ink3 text-xs mt-1">A join code is generated automatically.</p>
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
            {mutation.isPending ? 'Creating…' : 'Create class'}
          </button>
        </div>
      </div>
    </div>
  );
}
