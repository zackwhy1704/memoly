'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import AsyncBoundary from '@/components/AsyncBoundary';

function GraspRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * value;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={6} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--color-accent)"
        strokeWidth={6}
        fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function barColor(grasp: number) {
  if (grasp >= 0.7) return 'bg-ok';
  if (grasp >= 0.45) return 'bg-warn';
  return 'bg-bad';
}

export default function StudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const org = useOrg();

  const query = useQuery({
    queryKey: ['student', org?.orgId, studentId],
    queryFn: () => api.student(org!.orgId, studentId),
    enabled: !!org,
  });

  return (
    <>
      {/* Print styles */}
      <style>{`@media print { nav, aside, .no-print { display: none !important; } }`}</style>

      <div className="max-w-4xl space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="text-ink3 text-sm hover:text-ink transition-colors no-print"
        >
          ← Back to students
        </button>

        <AsyncBoundary
          query={query}
          loadingIcon="📈"
          loadingLabel="Loading student profile..."
          errorMessage="Could not load student data."
        >
          {(data) => {
            const d = data.data;
            const sortedTopics = [...d.topicGrasp].sort((a, b) => a.grasp - b.grasp);

            return (
              <>
                {/* Header card */}
                <div className="bg-panel border border-line rounded-2xl p-6">
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <GraspRing value={d.grasp} size={64} />
                      <div>
                        <h1 className="text-xl font-bold text-ink">{d.displayName}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                            {d.cohortLabel}
                          </span>
                          <span className="text-xs text-ink3">Lv {d.level}</span>
                          <span className="text-xs text-ink3">·</span>
                          <span className="text-xs text-ink3">{d.xp} XP</span>
                          {d.streakDays > 0 && (
                            <>
                              <span className="text-xs text-ink3">·</span>
                              <span className="text-xs text-warn">🔥 {d.streakDays}d streak</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-ink2 mt-1">Overall grasp: <span className="font-semibold text-ink">{Math.round(d.grasp * 100)}%</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 no-print">
                      {d.examInDays > 0 && (
                        <span className="text-xs bg-warn/20 text-warn px-3 py-1.5 rounded-full font-medium">
                          Exam in {d.examInDays}d
                        </span>
                      )}
                      <button
                        onClick={() => window.print()}
                        className="text-xs bg-panel2 border border-line text-ink2 px-3 py-1.5 rounded-lg hover:text-ink transition-colors"
                      >
                        Print report
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grasp trend */}
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <p className="text-sm font-semibold text-ink mb-4">Grasp Over Time</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={d.graspOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sGraspGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11, fill: 'var(--color-ink3)' }}
                        tickFormatter={(v: string) => v.slice(5)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tick={{ fontSize: 11, fill: 'var(--color-ink3)' }}
                        tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)', borderRadius: 8, color: 'var(--color-ink)', fontSize: 12 }}
                        formatter={(v) => [`${Math.round((v as number) * 100)}%`, 'Grasp']}
                      />
                      <Area type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} fill="url(#sGraspGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Topic grasp */}
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <p className="text-sm font-semibold text-ink mb-4">Topic Grasp (quiz accuracy)</p>
                  <div className="space-y-3">
                    {sortedTopics.map((t) => (
                      <div key={t.topic}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-ink capitalize">{t.topic.replace(/-/g, ' ')}</span>
                          <span className="text-sm font-mono text-ink2">{Math.round(t.grasp * 100)}%</span>
                        </div>
                        <div className="h-2 bg-panel2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor(t.grasp)}`}
                            style={{ width: `${Math.round(t.grasp * 100)}%`, opacity: 0.8 }}
                          />
                        </div>
                        <p className="text-xs text-ink3 mt-0.5">{t.attempts} attempts</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engagement */}
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <p className="text-sm font-semibold text-ink mb-4">Engagement</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Questions asked', value: d.engagement.questions },
                      { label: 'Quiz days', value: d.engagement.quizDays },
                      { label: 'Last active', value: d.engagement.lastActive },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-panel2 rounded-xl p-4 text-center">
                        <p className="text-xl font-bold text-ink tabular-nums">{stat.value}</p>
                        <p className="text-xs text-ink3 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          }}
        </AsyncBoundary>
      </div>
    </>
  );
}
