'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import AsyncBoundary from '@/components/AsyncBoundary';
import { useTranslation } from '@/lib/messages';

function GraspRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * value;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#4C6FFF"
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
  const { t, tp } = useTranslation();
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
          {t('studentDetailBackLink')}
        </button>

        <AsyncBoundary
          query={query}
          loadingIcon="📈"
          loadingLabel={t('studentDetailLoading')}
          errorMessage={t('studentDetailCouldNotLoad')}
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
                          <span className="text-xs text-ink3">{tp.rosterLevelBadge(d.level)}</span>
                          <span className="text-xs text-ink3">·</span>
                          <span className="text-xs text-ink3">{tp.rosterXp(d.xp)}</span>
                          {d.streakDays > 0 && (
                            <>
                              <span className="text-xs text-ink3">·</span>
                              <span className="text-xs text-warn">🔥 {tp.rosterStreakDays(d.streakDays)}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-ink2 mt-1">
                          {t('studentDetailOverallGraspLabel')}
                          <span className="font-semibold text-ink">{Math.round(d.grasp * 100)}%</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 no-print">
                      {d.examInDays > 0 && (
                        <span className="text-xs bg-warn/20 text-warn px-3 py-1.5 rounded-full font-medium">
                          {tp.studentDetailExamInDays(d.examInDays)}
                        </span>
                      )}
                      <button
                        onClick={() => window.print()}
                        className="text-xs bg-panel2 border border-line text-ink2 px-3 py-1.5 rounded-lg hover:text-ink transition-colors"
                      >
                        {t('studentDetailPrintReport')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grasp trend */}
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <p className="text-sm font-semibold text-ink mb-4">{t('studentDetailGraspOverTime')}</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={d.graspOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sGraspGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4C6FFF" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4C6FFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11, fill: '#66666F' }}
                        tickFormatter={(v: string) => v.slice(5)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tick={{ fontSize: 11, fill: '#66666F' }}
                        tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ background: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ECECEF', fontSize: 12 }}
                        formatter={(v) => [`${Math.round((v as number) * 100)}%`, t('studentDetailGraspTooltipLabel')]}
                      />
                      <Area type="monotone" dataKey="value" stroke="#4C6FFF" strokeWidth={2} fill="url(#sGraspGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Topic grasp */}
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <p className="text-sm font-semibold text-ink mb-4">{t('studentDetailTopicGraspHeading')}</p>
                  <div className="space-y-3">
                    {sortedTopics.map((topic) => (
                      <div key={topic.topic}>
                        <div className="flex items-center justify-between mb-1">
                          {/* topic.topic is a backend-generated slug (data, not UI chrome) — left as-is,
                              same content-vs-chrome boundary as ClassBrainTab's TEACHING_PRESETS. */}
                          <span className="text-sm text-ink capitalize">{topic.topic.replace(/-/g, ' ')}</span>
                          <span className="text-sm font-mono text-ink2">{Math.round(topic.grasp * 100)}%</span>
                        </div>
                        <div className="h-2 bg-panel2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor(topic.grasp)}`}
                            style={{ width: `${Math.round(topic.grasp * 100)}%`, opacity: 0.8 }}
                          />
                        </div>
                        <p className="text-xs text-ink3 mt-0.5">{tp.studentDetailAttemptsCount(topic.attempts)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engagement */}
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <p className="text-sm font-semibold text-ink mb-4">{t('studentDetailEngagementHeading')}</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: t('studentDetailQuestionsAsked'), value: d.engagement.questions },
                      { label: t('studentDetailQuizDays'), value: d.engagement.quizDays },
                      { label: t('studentDetailLastActive'), value: d.engagement.lastActive },
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
