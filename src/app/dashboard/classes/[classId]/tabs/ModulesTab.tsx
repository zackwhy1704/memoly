'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, type MuddiestPoint, type ClassModule } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { useTranslation } from '@/lib/messages';
import type { MessageKey } from '@/lib/messages/en';
import { NarrationAction, NARRATION_ENABLED } from '../components/NarrationAction';
import { ModulePreviewModal } from '../components/ModulePreviewModal';

/**
 * Mastery as a 0–100 integer, or null when there's no finite data yet.
 * The backend returns null/absent avgMastery for a fresh module (no attempts),
 * and `Math.round(null * 100)` is NaN — which renders as "NaN%" and an invalid
 * `width: NaN%` (a broken bar). null lets the UI show "—" instead of a fake 0%.
 */
export function masteryPct(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  // Backend sends mastery on a 0–100 scale — do NOT ×100. Clamp defensively so no
  // legacy row can render >100% (the 2600% bug class).
  return Math.min(100, Math.max(0, Math.round(value)));
}

function MasteryBar({ value }: { value: number | null | undefined }) {
  const pct = masteryPct(value);
  if (pct === null) {
    // No mastery recorded yet — show an empty track + dash, not a misleading 0%.
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-panel2 rounded-full" />
        <span className="text-xs font-mono tabular-nums text-ink3">—</span>
      </div>
    );
  }
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

const STAGE_LABEL_KEY: Record<string, MessageKey> = {
  LEARN: 'moduleStageLearn',
  TEST: 'moduleStageTest',
  PROVE: 'moduleStageProve',
  COMPLETE: 'moduleStageComplete',
};

function StageBadge({ stage }: { stage: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    LEARN: 'bg-blue-900/40 text-blue-300',
    TEST: 'bg-amber-900/40 text-amber-300',
    PROVE: 'bg-purple-900/40 text-purple-300',
    COMPLETE: 'bg-ok/20 text-ok',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[stage] ?? 'bg-panel2 text-ink3'}`}>
      {STAGE_LABEL_KEY[stage] ? t(STAGE_LABEL_KEY[stage]) : stage}
    </span>
  );
}

// ── Muddiest-point bar (A3) — "walk into Tuesday knowing what to reteach" ──────
function MuddiestBar({ classId, moduleId }: { classId: string; moduleId: string }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['muddiest', classId, moduleId],
    queryFn: () => api.muddiest(classId, moduleId),
  });

  if (query.isLoading) {
    return <p className="text-xs text-ink3">{t('modulesTabMuddiestLoading')}</p>;
  }
  if (query.error) {
    return (
      <button onClick={() => query.refetch()} className="text-xs text-ink3 hover:text-ink2 underline">
        {t('modulesTabMuddiestRetry')}
      </button>
    );
  }

  const points = asArray<MuddiestPoint>(query.data).filter((p) => p.count > 0).sort((a, b) => b.count - a.count);

  if (points.length === 0) {
    return (
      <p className="text-xs text-ink3">
        {t('modulesTabMuddiestEmpty')}
      </p>
    );
  }

  const max = points[0].count; // highest-voted = the one to reteach first

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-warn">{t('modulesTabMuddiestHeading')}</p>
      <div className="space-y-1.5">
        {points.map((p: MuddiestPoint, i) => {
          const pct = max > 0 ? Math.round((p.count / max) * 100) : 0;
          const top = i === 0;
          return (
            <div key={p.conceptId} className="flex items-center gap-3">
              <span
                className={`flex-1 min-w-0 text-xs truncate ${top ? 'font-semibold text-ink' : 'text-ink2'}`}
                title={p.conceptLabel}
              >
                {p.conceptLabel}
              </span>
              <div className="w-1/2 h-2 bg-panel2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${top ? 'bg-warn' : 'bg-warn/40'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs font-mono tabular-nums w-6 text-right ${top ? 'text-warn' : 'text-ink3'}`}>
                {p.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Non-blocking "compiling N chapters" indicator (FIX 3). Driven by the EXISTING
 *  avatar poll — after the teacher picks chapters (the picker closes immediately),
 *  the brain is non-READY / awaiting until each chapter's modules land. Resolves on
 *  its own as the poll flips to READY. */
function CompilingChaptersIndicator({ pendingChapters }: { pendingChapters: number }) {
  const { tp } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent/5 border border-accent/20">
      <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
      <p className="text-sm text-ink2">
        {tp.modulesTabCompiling(pendingChapters)}
      </p>
    </div>
  );
}

export function ModulesTab({
  orgId,
  classId,
  corpusAvatarId,
}: {
  orgId: string;
  classId: string;
  /** When provided, ModulesTab polls the avatar so background chapter-compiles
   *  surface a non-blocking indicator that resolves into modules as they land. */
  corpusAvatarId?: string;
}) {
  const { t, tp } = useTranslation();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<ClassModule | null>(null);
  const query = useQuery({
    queryKey: ['classModules', orgId, classId],
    queryFn: () => api.classModules(orgId, classId),
  });

  // Poll the avatar ONLY while a compile is in flight (brain not READY, or chapters
  // awaiting selection). Stops as soon as it's READY — the SAME signal the wizard
  // and Teach flow already poll, so no new backend surface.
  const avatarQ = useQuery({
    queryKey: ['avatar', corpusAvatarId],
    queryFn: () => api.avatar(corpusAvatarId as string),
    enabled: !!corpusAvatarId,
    refetchInterval: (q) => {
      const d = q.state.data?.data;
      const inFlight = !!d && (d.brainState !== 'READY' || d.awaitingChapterSelection === true);
      return inFlight ? 4000 : false;
    },
  });
  const av = avatarQ.data?.data;
  const compiling = !!av && (av.brainState !== 'READY' || av.awaitingChapterSelection === true);
  const pendingChapters = av?.pendingChapterCount ?? 0;

  // When compile finishes, pull the freshly-built modules in so the indicator
  // resolves directly into the new module rows.
  const wasCompiling = useRef(compiling);
  useEffect(() => {
    if (wasCompiling.current && !compiling) {
      qc.invalidateQueries({ queryKey: ['classModules', orgId, classId] });
    }
    wasCompiling.current = compiling;
  }, [compiling, qc, orgId, classId]);

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">{t('modulesTabLoading')}</p>;
  if (query.error) return <ErrorView message={t('modulesTabCouldNotLoad')} onRetry={() => query.refetch()} />;

  const modules = asArray<ClassModule>(query.data);

  if (modules.length === 0) {
    // Mid-compile with nothing built yet → show the honest compiling indicator, not
    // the "No modules yet" empty state (which reads as a dead end).
    if (compiling) return <CompilingChaptersIndicator pendingChapters={pendingChapters} />;
    return (
      <EmptyState
        icon="📦"
        title={t('modulesTabEmptyTitle')}
        description={t('modulesTabEmptyDescription')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {compiling && <CompilingChaptersIndicator pendingChapters={pendingChapters} />}
      {modules.map((m) => (
        <div key={m.moduleId} className="bg-panel border border-line rounded-2xl p-5 space-y-4">
          {/* Muddiest-point bar FIRST — the reteach signal sits at the top of the row. */}
          <MuddiestBar classId={classId} moduleId={m.moduleId} />

          <div className="border-t border-line pt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-sm font-medium text-ink truncate">{m.title}</span>
              <StageBadge stage={m.stage} />
            </div>
            <div className="text-xs text-ink2 tabular-nums shrink-0">
              {tp.modulesTabCompletedCount(m.completedCount ?? 0, m.studentCount ?? 0)}
            </div>
            <div className="min-w-[140px] flex-1 max-w-[220px]">
              <MasteryBar value={m.masteryPct} />
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => setPreview(m)}
                className="px-3 py-1.5 rounded-lg border border-line text-sm font-medium text-ink2 hover:bg-panel2 transition"
              >
                {t('modulesTabPreview')}
              </button>
              {NARRATION_ENABLED && (
                <NarrationAction orgId={orgId} classId={classId} moduleId={m.moduleId} />
              )}
            </div>
          </div>
        </div>
      ))}

      {preview && (
        <ModulePreviewModal
          orgId={orgId}
          classId={classId}
          moduleId={preview.moduleId}
          moduleTitle={preview.title}
          wikiSlug={preview.wikiSlug}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
