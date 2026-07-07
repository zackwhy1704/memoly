'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, ApiError, type MarkingCorrection } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

// ── Status presentation (the honest pending-vs-applied distinction) ──────────
const STATUS_LABEL: Record<MarkingCorrection['status'], string> = {
  pending: 'Pending',
  applied: 'Applied',
};
const STATUS_STYLE: Record<MarkingCorrection['status'], string> = {
  pending: 'bg-amber-900/40 text-amber-300',
  applied: 'bg-teal-900/40 text-teal-300',
};
// CRITICAL COPY HONESTY: removing an APPLIED correction excludes it from FUTURE
// updates — it does NOT instantly un-learn (residual influence decays). The copy
// must match that, never overpromise instant reversal.
const STATUS_HINT: Record<MarkingCorrection['status'], string> = {
  pending: 'Remove it now to fully prevent it from ever shaping a draft.',
  applied: "Removing it excludes it from future updates — it won't instantly un-learn.",
};

function StatusBadge({ status }: { status: MarkingCorrection['status'] }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** One row of the AI-said → you-corrected delta. Omitted when the AI offered nothing. */
function Delta({ label, from, to }: { label: string; from: string | null; to: string | null }) {
  if (!from?.trim() && !to?.trim()) return null;
  return (
    <p className="text-xs text-ink2">
      <span className="font-semibold text-ink3">{label}:</span>{' '}
      <span className="line-through text-ink3">{from?.trim() || '—'}</span>
      {' → '}
      <span className="text-ink">{to?.trim() || '—'}</span>
    </p>
  );
}

function CorrectionCard({ orgId, classId, correction }: {
  orgId: string; classId: string; correction: MarkingCorrection;
}) {
  const qc = useQueryClient();

  const delMut = useMutation({
    mutationFn: () => api.deleteMarkingCorrection(orgId, classId, correction.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['markingCorrections', orgId, classId] });
      // The next recompile will exclude it — refresh the learned-standard view too.
      qc.invalidateQueries({ queryKey: ['markingBrain', orgId, classId] });
    },
  });

  function confirmRemove() {
    if (delMut.isPending) return;
    if (window.confirm('Remove this correction so it stops shaping future AI marking drafts?')) {
      delMut.mutate();
    }
  }

  return (
    <div className="bg-panel border border-line rounded-2xl px-5 py-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={correction.status} />
            {correction.subject && <span className="text-xs text-ink3">{correction.subject}</span>}
            {correction.capturedAt && (
              <span className="text-xs text-ink3">{new Date(correction.capturedAt).toLocaleDateString()}</span>
            )}
          </div>
          <Delta label="Grade" from={correction.aiSuggestedGrade} to={correction.teacherGrade} />
          <Delta label="Feedback" from={correction.aiFeedback} to={correction.teacherFeedback} />
          <p className="text-[11px] text-ink3">{STATUS_HINT[correction.status]}</p>
        </div>
        <button
          onClick={confirmRemove}
          disabled={delMut.isPending}
          className="px-3 py-1.5 rounded-lg text-bad text-xs font-semibold hover:bg-bad/10 disabled:opacity-40 shrink-0"
        >
          {delMut.isPending ? 'Removing…' : 'Remove'}
        </button>
      </div>
      {delMut.isError && (
        <p className="text-xs text-bad">
          {delMut.error instanceof ApiError ? delMut.error.userMessage : 'Could not remove. Please try again.'}
        </p>
      )}
    </div>
  );
}

/**
 * Shows the corrections the assistant has LEARNED from this teacher's marking —
 * the AI-vs-teacher deltas captured when a released grade/feedback disagreed with
 * the AI draft — and lets the teacher remove a bad one (the damper). Distinct
 * from the uploaded reference material: this is what it learned from real marking.
 */
export function MarkingCorrectionsSection({ orgId, classId }: {
  orgId: string; classId: string;
}) {
  const query = useQuery({
    queryKey: ['markingCorrections', orgId, classId],
    queryFn: () => api.markingCorrections(orgId, classId),
  });

  // Backend returns newest-first; preserve that order.
  const corrections = asArray<MarkingCorrection>(query.data?.data);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">📝 What the assistant learned from your marking</h3>
        <p className="text-xs text-ink2 mt-0.5">
          When you release feedback that differs from the AI&apos;s draft, the assistant learns your
          correction. Remove any it shouldn&apos;t have learned.
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-ink3 text-xs py-4">Loading corrections…</p>
      ) : query.error ? (
        <ErrorView message="Could not load your marking corrections." onRetry={() => query.refetch()} />
      ) : corrections.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl">
          <EmptyState
            icon="📝"
            title="No corrections learned yet"
            description="When you adjust the assistant's marking drafts, your corrections adapt it here — so future drafts match how you actually mark."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {corrections.map((c) => (
            <CorrectionCard key={c.id} orgId={orgId} classId={classId} correction={c} />
          ))}
        </div>
      )}
    </div>
  );
}
