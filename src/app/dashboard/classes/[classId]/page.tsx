'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { mockHeatmap, USE_MOCK } from '@/lib/mock';
import { useOrg } from '@/lib/org-context';

function HeatCell({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="w-10 h-10 bg-panel2 rounded flex items-center justify-center text-xs text-ink3">—</div>;
  }
  const bg = value >= 0.7 ? 'bg-ok' : value >= 0.45 ? 'bg-warn' : 'bg-bad';
  const opacity = 0.4 + value * 0.6;
  return (
    <div
      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-mono text-ink ${bg}`}
      style={{ opacity }}
      title={`${Math.round(value * 100)}%`}
    >
      {Math.round(value * 100)}
    </div>
  );
}

export default function ClassHeatmapPage() {
  const params = useParams();
  const router = useRouter();
  const classId = decodeURIComponent(params.classId as string);
  const org = useOrg();

  const { data, isLoading, error } = useQuery({
    queryKey: ['heatmap', org?.orgId, classId],
    queryFn: async () => {
      if (!USE_MOCK) {
        return api.heatmap(org!.orgId, classId);
      }
      try {
        return await api.heatmap(org!.orgId, classId);
      } catch {
        return { data: mockHeatmap };
      }
    },
    enabled: !!org,
  });

  const d = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl animate-bounce">🗺</span>
          <p className="text-ink3 text-sm">Loading heatmap…</p>
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
        Failed to load heatmap data.
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-ink3 text-sm hover:text-ink transition-colors"
      >
        ← Back to classes
      </button>

      <div>
        <h1 className="text-2xl font-bold text-ink">{classId} — Topic Heatmap</h1>
        <p className="text-ink3 text-sm mt-1">Student grasp (quiz accuracy) by topic</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-ink3">
        <span className="font-medium text-ink2 mr-1">Grasp level:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-ok opacity-80" />≥70% strong</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warn opacity-80" />45–69% developing</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-bad opacity-80" />&lt;45% at risk</span>
      </div>

      {/* Heatmap grid */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1.5">
            <thead>
              <tr>
                {/* empty top-left corner */}
                <th className="w-36 pr-2" />
                {d.students.map((s) => (
                  <th key={s.id} className="w-10 text-center">
                    <div
                      className="w-10 h-10 rounded-full bg-panel2 border border-line flex items-center justify-center text-xs font-bold text-ink2 cursor-pointer hover:border-accent transition-colors"
                      title={s.displayName}
                      onClick={() => router.push(`/dashboard/students/${s.id}`)}
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

      {/* Reteach first */}
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
                  <div
                    className="h-full bg-bad rounded-full"
                    style={{ width: `${Math.round(w.avg * 100)}%`, opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
