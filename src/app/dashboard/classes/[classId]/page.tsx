'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type OrgClass } from '@/lib/api';
import { mochiFor } from '@/lib/centre-mochis';
import { useOrg } from '@/lib/org-context';
import MochiUploader from '@/components/MochiUploader';

type Tab = 'roster' | 'heatmap' | 'content' | 'add';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const org = useOrg();
  const classId = params.classId as string;
  const [tab, setTab] = useState<Tab>('roster');

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes', org?.orgId],
    queryFn: () => api.classes(org!.orgId),
    enabled: !!org,
  });

  const cls: OrgClass | undefined = classesData?.data.find((c) => c.id === classId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <span className="text-3xl animate-bounce">🏫</span>
      </div>
    );
  }

  if (!cls || !org) {
    return (
      <div className="max-w-3xl space-y-4">
        <button onClick={() => router.push('/dashboard/classes')} className="text-ink3 text-sm hover:text-ink">
          ← Back to classes
        </button>
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
          Class not found.
        </div>
      </div>
    );
  }

  const m = mochiFor(cls.characterType);

  return (
    <div className="max-w-5xl space-y-6">
      <button onClick={() => router.push('/dashboard/classes')} className="text-ink3 text-sm hover:text-ink transition">
        ← Back to classes
      </button>

      {/* Header */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: (cls.accentColor ?? '#7042ED') + '22' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.image} alt={m.name} width={52} height={52} className="object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink truncate">{cls.brandName || cls.name}</h1>
          <p className="text-ink3 text-sm">
            {[cls.subject, cls.level].filter(Boolean).join(' · ') || 'No subject set'} · {cls.studentCount} students
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-ink3">Join code</p>
          <p className="font-mono text-lg font-bold text-accent tracking-wider">{cls.joinCode}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {(['roster', 'heatmap', 'content', 'add'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition ${
              tab === t ? 'border-accent text-ink' : 'border-transparent text-ink3 hover:text-ink2'
            }`}
          >
            {t === 'add' ? 'Add students' : t}
          </button>
        ))}
      </div>

      {tab === 'roster' && <RosterTab orgId={org.orgId} classId={classId} />}
      {tab === 'heatmap' && <HeatmapTab orgId={org.orgId} classId={classId} />}
      {tab === 'content' && <ContentTab corpusAvatarId={cls.corpusAvatarId} />}
      {tab === 'add' && <AddStudentsTab orgId={org.orgId} classId={classId} />}
    </div>
  );
}

// ── Roster ─────────────────────────────────────────────────────────────────
function RosterTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['classRosterAnalytics', orgId, classId],
    queryFn: () => api.classRosterAnalytics(orgId, classId),
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => api.removeMember(orgId, classId, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classRosterAnalytics', orgId, classId] });
      qc.invalidateQueries({ queryKey: ['classes', orgId] });
    },
  });

  const rows = data?.data ?? [];
  if (isLoading) return <p className="text-ink3 text-sm py-8">Loading roster…</p>;

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
            <th className="text-left px-5 py-3 font-medium">Student</th>
            <th className="text-left px-5 py-3 font-medium">Grasp</th>
            <th className="text-left px-5 py-3 font-medium">Attempts</th>
            <th className="text-left px-5 py-3 font-medium">Last active</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId} className="border-b border-line last:border-0">
              <td className="px-5 py-3.5 font-medium text-ink">{r.displayName || '—'}</td>
              <td className="px-5 py-3.5 tabular-nums text-ink2">{Math.round(r.grasp * 100)}%</td>
              <td className="px-5 py-3.5 tabular-nums text-ink2">{r.attempts}</td>
              <td className="px-5 py-3.5 text-ink3 text-xs">
                {r.lastActive ? new Date(r.lastActive).toLocaleDateString() : 'never'}
              </td>
              <td className="px-5 py-3.5 text-right">
                <button
                  onClick={() => remove.mutate(r.studentId)}
                  disabled={remove.isPending}
                  className="text-xs text-bad hover:underline disabled:opacity-40"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-16 text-center text-ink3">
                No students assigned yet. Use “Add students”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Heatmap ──────────────────────────────────────────────────────────────────
function HeatCell({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="w-10 h-10 bg-panel2 rounded flex items-center justify-center text-xs text-ink3">—</div>;
  }
  const bg = value >= 0.7 ? 'bg-ok' : value >= 0.45 ? 'bg-warn' : 'bg-bad';
  return (
    <div
      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-mono text-ink ${bg}`}
      style={{ opacity: 0.4 + value * 0.6 }}
      title={`${Math.round(value * 100)}%`}
    >
      {Math.round(value * 100)}
    </div>
  );
}

function HeatmapTab({ orgId, classId }: { orgId: string; classId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['classHeatmap', orgId, classId],
    queryFn: () => api.classHeatmap(orgId, classId),
  });
  const d = data?.data;
  if (isLoading) return <p className="text-ink3 text-sm py-8">Loading heatmap…</p>;
  if (!d || d.topics.length === 0) {
    return (
      <div className="bg-panel border border-line rounded-2xl p-10 text-center text-ink3">
        Not enough quiz data yet to build a heatmap.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="w-36 pr-2" />
                {d.students.map((s) => (
                  <th key={s.id} className="w-10 text-center">
                    <div
                      className="w-10 h-10 rounded-full bg-panel2 border border-line flex items-center justify-center text-xs font-bold text-ink2"
                      title={s.displayName}
                    >
                      {s.initials}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.topics.map((topic, ti) => (
                <tr key={topic}>
                  <td className="pr-3 text-right">
                    <span className="text-xs text-ink2 capitalize">{topic.replace(/-/g, ' ')}</span>
                  </td>
                  {d.cells[ti].map((val, si) => (
                    <td key={si} className="p-0">
                      <HeatCell value={val} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm font-semibold text-ink mb-4">Reteach First — Weakest Topics</p>
        <div className="space-y-3">
          {d.weakest.map((w, i) => (
            <div key={w.topic} className="flex items-center gap-3">
              <span className="text-ink3 text-xs w-4 text-right">{i + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ink capitalize">{w.topic.replace(/-/g, ' ')}</span>
                  <span className="text-sm font-mono text-bad">{Math.round(w.avg * 100)}%</span>
                </div>
                <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                  <div className="h-full bg-bad rounded-full" style={{ width: `${Math.round(w.avg * 100)}%`, opacity: 0.7 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Content (uploads to the class corpus avatar via the mobile pipeline) ──────
function ContentTab({ corpusAvatarId }: { corpusAvatarId: string | null }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['classFiles', corpusAvatarId],
    queryFn: () => api.files(corpusAvatarId!),
    enabled: !!corpusAvatarId,
  });

  if (!corpusAvatarId) {
    return (
      <div className="bg-panel border border-line rounded-2xl p-10 text-center text-ink3">
        This class has no corpus yet.
      </div>
    );
  }

  const files = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm text-ink2 mb-4">
          Upload notes, worksheets or PDFs. Every student&apos;s Mochi in this class reads this shared corpus.
        </p>
        <MochiUploader
          avatarId={corpusAvatarId}
          onComplete={() => qc.invalidateQueries({ queryKey: ['classFiles', corpusAvatarId] })}
        />
      </div>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        {isLoading ? (
          <p className="text-ink3 text-sm p-5">Loading files…</p>
        ) : files.length === 0 ? (
          <p className="text-ink3 text-sm p-8 text-center">No content uploaded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{f.fileName}</td>
                  <td className="px-5 py-3.5 text-ink3 text-xs">{f.pageCount} pages</td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className="px-2 py-1 rounded-full bg-panel2 text-ink2">{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Add students (assign unassigned centre members) ───────────────────────────
function AddStudentsTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => api.members(orgId),
  });
  const assign = useMutation({
    mutationFn: (userId: string) => api.assignMember(orgId, classId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', orgId] });
      qc.invalidateQueries({ queryKey: ['classRosterAnalytics', orgId, classId] });
      qc.invalidateQueries({ queryKey: ['classes', orgId] });
    },
  });

  const members = data?.data ?? [];
  if (isLoading) return <p className="text-ink3 text-sm py-8">Loading members…</p>;

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
            <th className="text-left px-5 py-3 font-medium">Member</th>
            <th className="text-left px-5 py-3 font-medium">Classes</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {members.map((mem) => {
            const inThisClass = mem.classes.some((c) => c.classId === classId);
            return (
              <tr key={mem.userId} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5 font-medium text-ink">
                  {mem.displayName || '—'}
                  {mem.unassigned && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-warn/20 text-warn">unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink3 text-xs">
                  {mem.classes.length > 0 ? mem.classes.map((c) => c.className).join(', ') : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {inThisClass ? (
                    <span className="text-xs text-ok">✓ In class</span>
                  ) : (
                    <button
                      onClick={() => assign.mutate(mem.userId)}
                      disabled={assign.isPending}
                      className="text-xs font-semibold text-accent hover:underline disabled:opacity-40"
                    >
                      Add to class
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-16 text-center text-ink3">
                No centre members yet. Share the centre enroll code so students can join.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
