'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

/**
 * Pre-class readiness view (Phase 2 payoff): a per-student weak-concept map over
 * the assignment's prerequisite topics, so the teacher can tailor the lesson to
 * the gaps the class walked in with. Reads the readiness endpoint directly.
 */
export function ReadinessModal({
  orgId,
  classId,
  assignmentId,
  onClose,
}: {
  orgId: string;
  classId: string;
  assignmentId: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['assignmentReadiness', orgId, classId, assignmentId],
    queryFn: () => api.assignmentReadiness(orgId, classId, assignmentId),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const data = query.data?.data;
  const students = data?.students ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <h2 className="text-sm font-bold text-ink">Pre-class readiness</h2>
            <p className="text-[11px] text-ink3 mt-0.5">
              Where each student is shaky on the prerequisites — teach to the gaps.
            </p>
          </div>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="px-5 py-5">
          {query.isLoading ? (
            <p className="text-ink3 text-xs">Loading readiness…</p>
          ) : query.error ? (
            <ErrorView message="Could not load readiness." onRetry={() => query.refetch()} />
          ) : students.length === 0 ? (
            <p className="text-ink3 text-xs">
              No prerequisite data yet — students need attempted modules on the selected prior topics.
            </p>
          ) : (
            <div className="space-y-3">
              {students.map((s) => {
                const weak = s.concepts.filter((c) => c.weak);
                const strong = s.concepts.filter((c) => !c.weak && c.attempted);
                return (
                  <div key={s.userId} className="border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-ink">
                        {s.displayName || `Student ${s.userId.slice(0, 8)}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.weakCount > 0 ? 'bg-bad/20 text-bad' : 'bg-ok/20 text-ok'
                        }`}
                      >
                        {s.weakCount > 0 ? `${s.weakCount} weak` : 'ready'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {weak.map((c) => (
                        <span
                          key={c.slug}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-bad/15 text-bad"
                          title={c.masteryPct != null ? `${Math.round(c.masteryPct)}% mastery` : undefined}
                        >
                          {c.title}
                          {c.masteryPct != null ? ` · ${Math.round(c.masteryPct)}%` : ''}
                        </span>
                      ))}
                      {strong.map((c) => (
                        <span
                          key={c.slug}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-ok/10 text-ok"
                        >
                          {c.title}
                        </span>
                      ))}
                      {weak.length === 0 && strong.length === 0 && (
                        <span className="text-[11px] text-ink3">No attempted prerequisites yet.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
