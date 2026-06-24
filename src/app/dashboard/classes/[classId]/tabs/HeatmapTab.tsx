'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { HeatCell } from '../components/HeatCell';

export function HeatmapTab({ orgId, classId }: { orgId: string; classId: string }) {
  const query = useQuery({
    queryKey: ['classHeatmap', orgId, classId],
    queryFn: () => api.classHeatmap(orgId, classId),
  });
  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading heatmap...</p>;
  if (query.error) return <ErrorView message="Could not load heatmap data." onRetry={() => query.refetch()} />;

  // Coerce every array defensively — a fresh class / zero students / partial
  // backend shape can leave these null/absent, and the raw `.map`/`.length`
  // would crash the whole tab. Degrade to EmptyState instead.
  const d = query.data?.data;
  const students = Array.isArray(d?.students) ? d.students : [];
  const topics = Array.isArray(d?.topics) ? d.topics : [];
  const cells = Array.isArray(d?.cells) ? d.cells : [];
  const weakest = Array.isArray(d?.weakest) ? d.weakest : [];

  if (topics.length === 0 || students.length === 0) {
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
                {students.map((s) => (
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
              {topics.map((topic, ti) => (
                <tr key={topic}>
                  <td className="pr-3 text-right">
                    <span className="text-xs text-ink2 capitalize">{topic.replace(/-/g, ' ')}</span>
                  </td>
                  {students.map((s, si) => (
                    <td key={s.id} className="p-0">
                      <HeatCell value={cells[ti]?.[si] ?? null} />
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
          {weakest.map((w, i) => (
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
