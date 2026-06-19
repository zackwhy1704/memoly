'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { HeatCell } from '../components/HeatCell';

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

export function ConceptMasteryTab({ orgId, classId }: { orgId: string; classId: string }) {
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
                    {hd.students.map((s, si) => (
                      <td key={s.id} className="p-0">
                        <HeatCell value={hd.cells[ti]?.[si] ?? null} />
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
                  {cd.students.map((s, si) => (
                    <td key={s.id} className="p-0">
                      <ConceptHeatCell value={cd.cells[ci]?.[si] ?? null} />
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
