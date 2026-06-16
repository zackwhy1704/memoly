'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

export function ClassBriefTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['classBrief', orgId, classId],
    queryFn: () => api.classBrief(orgId, classId),
    retry: 1,
  });

  const refreshMut = useMutation({
    mutationFn: () => api.refreshClassBrief(orgId, classId),
    onSuccess: (res) => {
      qc.setQueryData(['classBrief', orgId, classId], res);
    },
  });

  if (query.isLoading) {
    return (
      <div className="py-12 flex flex-col items-center gap-3">
        <span className="w-7 h-7 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-ink3 text-sm">Generating class brief…</p>
      </div>
    );
  }

  if (query.error) {
    const msg = (query.error as { message?: string })?.message ?? 'Could not load class brief.';
    return <ErrorView message={msg} onRetry={() => query.refetch()} />;
  }

  const brief = query.data?.data;
  if (!brief) return null;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink">Class Brief</h2>
          <p className="text-xs text-ink3 mt-0.5">AI-generated action plan based on student progress</p>
        </div>
        <button
          onClick={() => refreshMut.mutate()}
          disabled={refreshMut.isPending}
          className="px-3 py-1.5 text-xs font-semibold bg-panel border border-line rounded-lg text-ink2 hover:text-ink hover:border-accent transition disabled:opacity-40 shrink-0"
        >
          {refreshMut.isPending ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      {refreshMut.error && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
          {(refreshMut.error as { message?: string })?.message ?? 'Regeneration failed — try again.'}
        </div>
      )}

      {/* Open with */}
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-1.5">
          Open your lesson with
        </p>
        <p className="text-sm font-semibold text-ink leading-snug">{brief.openWith}</p>
      </div>

      {/* Skip line — shown only when all mastered */}
      {brief.skipLine && (
        <div className="bg-ok/10 border border-ok/30 rounded-2xl px-5 py-4 text-sm text-ok font-medium">
          {brief.skipLine}
        </div>
      )}

      {/* Focus concepts */}
      {brief.focusConcepts.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-ink">Concepts to focus on</p>
          {brief.focusConcepts.map((c) => {
            const failPct = Math.round(c.failRate * 100);
            const barColor = failPct >= 70 ? 'bg-bad' : failPct >= 40 ? 'bg-warn' : 'bg-ok';
            const textColor = failPct >= 70 ? 'text-bad' : failPct >= 40 ? 'text-warn' : 'text-ok';
            return (
              <div key={c.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink font-medium capitalize">
                    {c.name.replace(/-/g, ' ')}
                  </span>
                  <span className={`text-xs font-mono tabular-nums ${textColor}`}>
                    {failPct}% failed
                  </span>
                </div>
                <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${failPct}%` }} />
                </div>
                {c.failingStudents.length > 0 && (
                  <p className="text-xs text-ink3 leading-relaxed">
                    Struggling: {c.failingStudents.join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Check on */}
      {brief.checkOn.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink mb-2">Check in with</p>
          <div className="flex flex-wrap gap-2">
            {brief.checkOn.map((name) => (
              <span
                key={name}
                className="px-3 py-1 bg-bad/10 text-bad text-xs font-semibold rounded-full border border-bad/20"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested groups */}
      {brief.suggestedGroups.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink mb-3">Suggested peer groups</p>
          <div className="space-y-2">
            {brief.suggestedGroups.map((group, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                {group.map((name, j) => (
                  <span key={name}>
                    <span className="px-3 py-1 bg-panel2 text-ink2 text-xs font-medium rounded-full border border-line">
                      {name}
                    </span>
                    {j < group.length - 1 && (
                      <span className="text-ink3 text-xs mx-1">+</span>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {brief.focusConcepts.length === 0 && brief.checkOn.length === 0 && !brief.skipLine && (
        <div className="text-center py-8 text-ink3 text-sm">
          Not enough student progress data to generate a brief yet.
          <br />
          Assign modules and wait for students to complete them.
        </div>
      )}
    </div>
  );
}
