'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CreateAssignmentBody } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

export function ExamReadinessTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['examReadiness', orgId, classId],
    queryFn: () => api.examReadiness(orgId, classId),
  });

  const createRevisionMut = useMutation({
    mutationFn: (concepts: string[]) => {
      const body: CreateAssignmentBody = {
        title: `Revision: weak concepts (${new Date().toLocaleDateString()})`,
        type: 'REVISION',
        moduleIds: [],
        masteryThreshold: 60,
      };
      return api.createAssignment(orgId, classId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', orgId, classId] });
    },
  });

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading exam readiness...</p>;
  if (query.error) return <ErrorView message="Could not load exam readiness data." onRetry={() => query.refetch()} />;

  const data = query.data?.data;
  if (!data) return null;

  const weakConcepts = data.concepts
    .filter((c) => c.avgMastery < 0.6)
    .sort((a, b) => a.avgMastery - b.avgMastery);

  const readinessPct = Math.round(data.avgReadiness * 100);
  const readinessColor = readinessPct >= 70 ? 'text-ok' : readinessPct >= 40 ? 'text-warn' : 'text-bad';

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-panel border border-line rounded-2xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-ink3 mb-1">Average Readiness</p>
          <p className={`text-3xl font-bold tabular-nums ${readinessColor}`}>{readinessPct}%</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-ink3 mb-1">Students Below 60%</p>
          <p className="text-3xl font-bold tabular-nums text-bad">{data.studentsBelow60}</p>
          <p className="text-xs text-ink3 mt-0.5">of {data.totalStudents}</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-ink3 mb-1">Concepts Tracked</p>
          <p className="text-3xl font-bold tabular-nums text-ink">{data.concepts.length}</p>
        </div>
      </div>

      {/* Per-concept mastery bars (weakest first) */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm font-semibold text-ink mb-4">Concept Mastery (weakest first)</p>
        {data.concepts.length === 0 ? (
          <p className="text-ink3 text-sm">No concept data available yet.</p>
        ) : (
          <div className="space-y-3">
            {[...data.concepts].sort((a, b) => a.avgMastery - b.avgMastery).map((c) => {
              const pct = Math.round(c.avgMastery * 100);
              const barColor = pct >= 70 ? 'bg-ok' : pct >= 40 ? 'bg-warn' : 'bg-bad';
              const textColor = pct >= 70 ? 'text-ok' : pct >= 40 ? 'text-warn' : 'text-bad';
              return (
                <div key={c.concept} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-ink capitalize">{c.concept.replace(/-/g, ' ')}</span>
                      <span className={`text-sm font-mono tabular-nums ${textColor}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revision CTA */}
      {weakConcepts.length > 0 && (
        <div className="bg-warn/10 border border-warn/30 rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink mb-1">
            {weakConcepts.length} concept{weakConcepts.length !== 1 ? 's' : ''} below 60%
          </p>
          <p className="text-xs text-ink3 mb-3">
            Create a revision assignment targeting these weak concepts?
          </p>
          <button
            onClick={() => createRevisionMut.mutate(weakConcepts.map((c) => c.concept))}
            disabled={createRevisionMut.isPending}
            className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
          >
            {createRevisionMut.isPending ? 'Creating...' : createRevisionMut.isSuccess ? 'Created!' : 'Assign revision'}
          </button>
        </div>
      )}
    </div>
  );
}
