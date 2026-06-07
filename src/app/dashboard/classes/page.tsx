'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { mockOverview, USE_MOCK } from '@/lib/mock';

const DEMO_ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? 'demo';

export default function ClassesPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['classes', DEMO_ORG_ID],
    queryFn: async () => {
      if (USE_MOCK) return { data: mockOverview.classes };
      return api.classes(DEMO_ORG_ID);
    },
  });

  const classes = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Classes</h1>
        <p className="text-ink3 text-sm mt-1">Performance summary by cohort</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <span className="text-3xl animate-bounce">🏫</span>
            <p className="text-ink3 text-sm">Loading classes…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
          Failed to load classes.
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <button
              key={cls.cohort}
              onClick={() => router.push(`/dashboard/classes/${encodeURIComponent(cls.cohort)}`)}
              className="bg-panel border border-line rounded-2xl p-6 text-left hover:border-accent/40 hover:bg-panel2 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-ink">{cls.cohort}</h2>
                  <p className="text-ink3 text-sm">{cls.studentCount} students</p>
                </div>
                <span className="text-2xl font-bold tabular-nums text-accent">
                  {Math.round(cls.avgGrasp * 100)}%
                </span>
              </div>
              <div className="h-2 bg-panel2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${cls.avgGrasp >= 0.7 ? 'bg-ok' : cls.avgGrasp >= 0.45 ? 'bg-warn' : 'bg-bad'}`}
                  style={{ width: `${Math.round(cls.avgGrasp * 100)}%`, opacity: 0.8 }}
                />
              </div>
              <p className="text-xs text-ink3 mt-3">View heatmap →</p>
            </button>
          ))}

          {classes.length === 0 && (
            <div className="col-span-2 text-center py-20 text-ink3">
              <p className="text-4xl mb-3">🏫</p>
              <p>No classes found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
