'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api, type OrgClass, type ClassModule, type ConceptMasteryData, type NarrationData } from '@/lib/api';
import { mochiFor } from '@/lib/centre-mochis';
import { useOrg } from '@/lib/org-context';
import MochiUploader from '@/components/MochiUploader';
import AsyncBoundary from '@/components/AsyncBoundary';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

type Tab = 'roster' | 'modules' | 'heatmap' | 'concepts' | 'content' | 'add';

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
      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {(['roster', 'modules', 'heatmap', 'concepts', 'content', 'add'] as Tab[]).map((t) => {
          const label: Record<Tab, string> = {
            roster: 'Roster',
            modules: 'Modules',
            heatmap: 'Heatmap',
            concepts: 'Concept Mastery',
            content: 'Content',
            add: 'Add students',
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t ? 'border-accent text-ink' : 'border-transparent text-ink3 hover:text-ink2'
              }`}
            >
              {label[t]}
            </button>
          );
        })}
      </div>

      {tab === 'roster' && <RosterTab orgId={org.orgId} classId={classId} />}
      {tab === 'modules' && <ModulesTab orgId={org.orgId} classId={classId} />}
      {tab === 'heatmap' && <HeatmapTab orgId={org.orgId} classId={classId} />}
      {tab === 'concepts' && <ConceptMasteryTab orgId={org.orgId} classId={classId} />}
      {tab === 'content' && <ContentTab corpusAvatarId={cls.corpusAvatarId} classId={classId} />}
      {tab === 'add' && <AddStudentsTab orgId={org.orgId} classId={classId} />}
    </div>
  );
}

// ── Roster ─────────────────────────────────────────────────────────────────
function RosterTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
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

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading roster...</p>;
  if (query.error) return <ErrorView message="Could not load class roster." onRetry={() => query.refetch()} />;

  const rows = query.data?.data ?? [];

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
  const query = useQuery({
    queryKey: ['classHeatmap', orgId, classId],
    queryFn: () => api.classHeatmap(orgId, classId),
  });
  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading heatmap...</p>;
  if (query.error) return <ErrorView message="Could not load heatmap data." onRetry={() => query.refetch()} />;
  const d = query.data?.data;
  if (!d || d.topics.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No quiz activity yet"
        description="Students need to take quizzes first before the heatmap can show topic mastery."
      />
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

// ── Modules ────────────────────────────────────────────────────────────────────
function MasteryBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-ok' : pct >= 40 ? 'bg-warn' : 'bg-bad';
  const textColor = pct >= 70 ? 'text-ok' : pct >= 40 ? 'text-warn' : 'text-bad';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono tabular-nums ${textColor}`}>{pct}%</span>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    LEARN: 'bg-blue-900/40 text-blue-300',
    TEST: 'bg-amber-900/40 text-amber-300',
    PROVE: 'bg-purple-900/40 text-purple-300',
    COMPLETE: 'bg-ok/20 text-ok',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[stage] ?? 'bg-panel2 text-ink3'}`}>
      {stage}
    </span>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function NarrationAction({ orgId, classId, moduleId }: { orgId: string; classId: string; moduleId: string }) {
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const narrationQuery = useQuery({
    queryKey: ['narration', orgId, classId, moduleId],
    queryFn: () => api.getNarration(orgId, classId, moduleId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === 'GENERATING' ? 5000 : false;
    },
  });

  const generate = useMutation({
    mutationFn: () => api.generateNarration(orgId, classId, moduleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['narration', orgId, classId, moduleId] });
    },
  });

  const narration = narrationQuery.data?.data ?? null;
  const status = narration?.status;

  if (narrationQuery.isLoading) {
    return <span className="text-xs text-ink3">...</span>;
  }

  if (!narration) {
    return (
      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="text-xs font-semibold text-accent hover:underline disabled:opacity-40"
      >
        {generate.isPending ? 'Starting...' : 'Generate narration'}
      </button>
    );
  }

  if (status === 'GENERATING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink3">
        <span className="w-3 h-3 border-2 border-ink3 border-t-transparent rounded-full animate-spin" />
        Generating...
      </span>
    );
  }

  if (status === 'FAILED') {
    return (
      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="text-xs font-semibold text-bad hover:underline disabled:opacity-40"
      >
        {generate.isPending ? 'Retrying...' : 'Retry'}
      </button>
    );
  }

  // READY
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPreviewOpen(true)}
          className="text-xs font-semibold text-accent hover:underline"
        >
          Preview
        </button>
        <span className="text-xs text-ink3 tabular-nums">{formatDuration(narration.totalDurationMs)}</span>
      </div>
      {previewOpen && (
        <NarrationPreviewModal
          narration={narration}
          onClose={() => setPreviewOpen(false)}
          onRegenerate={() => {
            setPreviewOpen(false);
            generate.mutate();
          }}
        />
      )}
    </>
  );
}

function NarrationPreviewModal({
  narration,
  onClose,
  onRegenerate,
}: {
  narration: NarrationData;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const segments = narration.segments;
  const segment = segments[currentIndex];

  const goToSegment = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      // Audio src will change via effect, auto-play handled there
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, segments.length]);

  // Auto-play when segment changes while playing
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentIndex, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current || !segment) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!segment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <h2 className="text-sm font-bold text-ink">Narration Preview</h2>
            <p className="text-xs text-ink3 mt-0.5">
              {segments.length} cards &middot; {formatDuration(narration.totalDurationMs)} total
            </p>
          </div>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-lg leading-none">&times;</button>
        </div>

        {/* Card navigation */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-line overflow-x-auto">
          {segments.map((seg, i) => (
            <button
              key={i}
              onClick={() => goToSegment(i)}
              className={`shrink-0 w-8 h-8 rounded-lg text-xs font-semibold transition ${
                i === currentIndex
                  ? 'bg-accent text-white'
                  : 'bg-panel2 text-ink3 hover:text-ink2'
              }`}
            >
              {seg.cardIndex + 1}
            </button>
          ))}
        </div>

        {/* Current segment */}
        <div className="px-5 py-5 space-y-4">
          <div className="bg-panel2 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink3 mb-2">
              Card {segment.cardIndex + 1} &middot; {formatDuration(segment.durationMs)}
            </p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{segment.scriptText}</p>
          </div>

          {/* Audio player */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shrink-0 hover:bg-accent/90 transition"
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12" rx="1" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z" /></svg>
              )}
            </button>
            <div className="flex-1 text-xs text-ink3">
              {currentIndex + 1} / {segments.length}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => goToSegment(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="px-2 py-1 text-xs text-ink3 hover:text-ink disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => goToSegment(Math.min(segments.length - 1, currentIndex + 1))}
                disabled={currentIndex === segments.length - 1}
                className="px-2 py-1 text-xs text-ink3 hover:text-ink disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>

          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={segment.audioUrl}
            onEnded={handleEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            preload="auto"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-line">
          <button
            onClick={onRegenerate}
            className="text-xs font-semibold text-bad hover:underline"
          >
            Re-generate
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-panel2 hover:bg-panel2/80 rounded-lg text-ink transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ModulesTab({ orgId, classId }: { orgId: string; classId: string }) {
  const query = useQuery({
    queryKey: ['classModules', orgId, classId],
    queryFn: () => api.classModules(orgId, classId),
  });

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading modules...</p>;
  if (query.error) return <ErrorView message="Could not load modules." onRetry={() => query.refetch()} />;

  const modules = query.data?.data ?? [];

  if (modules.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="No modules yet"
        description="Upload teaching materials to the Content tab. Modules are generated automatically from compiled wiki pages."
      />
    );
  }

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
            <th className="text-left px-5 py-3 font-medium">Module</th>
            <th className="text-left px-5 py-3 font-medium">Stage</th>
            <th className="text-left px-5 py-3 font-medium">Completed</th>
            <th className="text-left px-5 py-3 font-medium min-w-[140px]">Avg Mastery</th>
            <th className="text-left px-5 py-3 font-medium">Narration</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m.moduleId} className="border-b border-line last:border-0">
              <td className="px-5 py-3.5 font-medium text-ink">{m.title}</td>
              <td className="px-5 py-3.5">
                <StageBadge stage={m.stage} />
              </td>
              <td className="px-5 py-3.5 tabular-nums text-ink2">
                {m.completedCount}/{m.studentCount}
              </td>
              <td className="px-5 py-3.5">
                <MasteryBar value={m.avgMastery} />
              </td>
              <td className="px-5 py-3.5">
                <NarrationAction orgId={orgId} classId={classId} moduleId={m.moduleId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Concept Mastery Heatmap ─────────────────────────────────────────────────────
function ConceptHeatCell({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="w-10 h-10 bg-panel2 rounded flex items-center justify-center text-xs text-ink3">&mdash;</div>;
  }
  const pct = Math.round(value * 100);
  const bg = pct >= 70 ? 'bg-ok' : pct >= 40 ? 'bg-warn' : 'bg-bad';
  return (
    <div
      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-mono text-ink ${bg}`}
      style={{ opacity: 0.4 + value * 0.6 }}
      title={`${pct}%`}
    >
      {pct}
    </div>
  );
}

function ConceptMasteryTab({ orgId, classId }: { orgId: string; classId: string }) {
  const conceptQuery = useQuery({
    queryKey: ['classConceptMastery', orgId, classId],
    queryFn: () => api.classConceptMastery(orgId, classId),
  });

  // Fallback to quiz heatmap if concept mastery is empty
  const heatmapQuery = useQuery({
    queryKey: ['classHeatmap', orgId, classId],
    queryFn: () => api.classHeatmap(orgId, classId),
    enabled: !conceptQuery.isLoading && (conceptQuery.data?.data?.concepts?.length ?? 0) === 0,
  });

  if (conceptQuery.isLoading) return <p className="text-ink3 text-sm py-8">Loading concept mastery...</p>;
  if (conceptQuery.error) return <ErrorView message="Could not load concept mastery data." onRetry={() => conceptQuery.refetch()} />;

  const cd = conceptQuery.data?.data;
  const hasConcepts = cd && cd.concepts.length > 0;

  // If no concept data, fall back to quiz heatmap
  if (!hasConcepts) {
    if (heatmapQuery.isLoading) return <p className="text-ink3 text-sm py-8">Loading heatmap...</p>;
    if (heatmapQuery.error) return <ErrorView message="Could not load heatmap data." onRetry={() => heatmapQuery.refetch()} />;

    const hd = heatmapQuery.data?.data;
    if (!hd || hd.topics.length === 0) {
      return (
        <EmptyState
          icon="🧩"
          title="No concept mastery data yet"
          description="Concept mastery will appear after students complete PROVE stages. Quiz data will show here as a fallback once students take quizzes."
        />
      );
    }

    // Render quiz heatmap as fallback
    return (
      <div className="space-y-6">
        <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 text-sm text-warn">
          Concept mastery will appear after students complete PROVE stages. Showing quiz topic mastery as a fallback.
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="w-36 pr-2" />
                  {hd.students.map((s) => (
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
                {hd.topics.map((topic, ti) => (
                  <tr key={topic}>
                    <td className="pr-3 text-right">
                      <span className="text-xs text-ink2 capitalize">{topic.replace(/-/g, ' ')}</span>
                    </td>
                    {hd.cells[ti].map((val, si) => (
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
        {hd.weakest.length > 0 && (
          <div className="bg-panel border border-line rounded-2xl p-5">
            <p className="text-sm font-semibold text-ink mb-4">Weakest Topics</p>
            <div className="space-y-3">
              {hd.weakest.map((w, i) => (
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
        )}
      </div>
    );
  }

  // Render concept mastery heatmap
  return (
    <div className="space-y-6">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="w-36 pr-2" />
                {cd.students.map((s) => (
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
              {cd.concepts.map((concept, ci) => (
                <tr key={concept}>
                  <td className="pr-3 text-right">
                    <span className="text-xs text-ink2 capitalize">{concept.replace(/-/g, ' ')}</span>
                  </td>
                  {cd.cells[ci].map((val, si) => (
                    <td key={si} className="p-0">
                      <ConceptHeatCell value={val} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {cd.weakest.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink mb-4">Reteach First &mdash; Weakest Concepts</p>
          <div className="space-y-3">
            {cd.weakest.map((w, i) => (
              <div key={w.concept} className="flex items-center gap-3">
                <span className="text-ink3 text-xs w-4 text-right">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink capitalize">{w.concept.replace(/-/g, ' ')}</span>
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
      )}
    </div>
  );
}

// ── Content (uploads to the class corpus avatar via the mobile pipeline) ──────
function ContentTab({ corpusAvatarId, classId }: { corpusAvatarId: string | null; classId: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['classFiles', corpusAvatarId],
    queryFn: () => api.files(corpusAvatarId!),
    enabled: !!corpusAvatarId,
  });

  if (!corpusAvatarId) {
    return (
      <EmptyState
        icon="📚"
        title="No corpus yet"
        description="This class has no content corpus. Contact support if this is unexpected."
      />
    );
  }

  const files = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm text-ink2 mb-4">
          Upload notes, worksheets or PDFs. Every student&apos;s Mochi in this class reads this shared corpus.
        </p>
        <MochiUploader
          avatarId={corpusAvatarId}
          classId={classId}
          onComplete={() => qc.invalidateQueries({ queryKey: ['classFiles', corpusAvatarId] })}
        />
      </div>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        {query.isLoading ? (
          <p className="text-ink3 text-sm p-5">Loading files...</p>
        ) : query.error ? (
          <div className="p-4">
            <ErrorView message="Could not load uploaded files." onRetry={() => query.refetch()} />
          </div>
        ) : files.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="📭"
              title="No content uploaded yet"
              description="Upload teaching material to build this class's knowledge base."
            />
          </div>
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
  const query = useQuery({
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

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading members...</p>;
  if (query.error) return <ErrorView message="Could not load centre members." onRetry={() => query.refetch()} />;
  const members = query.data?.data ?? [];

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
