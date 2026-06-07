'use client';

import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { mockOverview, USE_MOCK } from '@/lib/mock';
import { api } from '@/lib/api';
import Link from 'next/link';

const DEMO_ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? 'demo';

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['overview', DEMO_ORG_ID],
    queryFn: async () => {
      if (USE_MOCK) return { data: mockOverview };
      return api.overview(DEMO_ORG_ID);
    },
  });

  const d = data?.data ?? mockOverview;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl animate-bounce">📊</span>
          <p className="text-ink3 text-sm">Loading overview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
        Failed to load overview data.
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Overview</h1>
          <p className="text-ink3 text-sm mt-1">Centre performance at a glance</p>
        </div>
        <Link
          href="/dashboard/content/upload"
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors shrink-0"
        >
          + Upload Content
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active this week', value: d.activeThisWeek, sub: `of ${d.totalStudents} students` },
          {
            label: 'Avg Grasp',
            value: pct(d.avgGrasp),
            sub: d.graspDelta >= 0 ? `+${pct(d.graspDelta)} vs last week` : `${pct(d.graspDelta)} vs last week`,
            subColor: d.graspDelta >= 0 ? 'text-ok' : 'text-bad',
          },
          { label: 'At-risk students', value: d.atRiskCount, sub: 'need attention', subColor: d.atRiskCount > 0 ? 'text-bad' : 'text-ok' },
          { label: 'Topics live', value: d.topicsLive, sub: 'in knowledge base' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-panel border border-line rounded-2xl p-5">
            <p className="text-3xl font-bold tabular-nums text-ink">{kpi.value}</p>
            <p className="text-xs uppercase tracking-wider text-ink2 mt-1">{kpi.label}</p>
            {kpi.sub && (
              <p className={`text-xs mt-1 ${kpi.subColor ?? 'text-ink3'}`}>{kpi.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Grasp trend chart */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm font-semibold text-ink mb-4">Class Grasp Trend (12 weeks)</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={d.graspTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="graspGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B7DF7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8B7DF7" stopOpacity={0} />
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
              formatter={(v) => [`${Math.round((v as number) * 100)}%`, 'Grasp']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8B7DF7"
              strokeWidth={2}
              fill="url(#graspGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Class mastery */}
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink mb-4">Class Mastery</p>
          <div className="space-y-4">
            {d.classes.map((cls) => (
              <div key={cls.cohort}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-ink">{cls.cohort}</span>
                  <span className="text-sm font-semibold text-accent">{pct(cls.avgGrasp)}</span>
                </div>
                <div className="h-2 bg-panel2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/40 rounded-full"
                    style={{ width: pct(cls.avgGrasp) }}
                  />
                </div>
                <p className="text-xs text-ink3 mt-1">{cls.studentCount} students</p>
              </div>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink mb-4">Needs Attention</p>
          <div className="space-y-3">
            {d.atRisk.map((s) => (
              <Link
                key={s.studentId}
                href={`/dashboard/students/${s.studentId}`}
                className="flex items-center justify-between p-3 bg-panel2 rounded-xl hover:bg-line transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink3">{s.cohort} · {s.reason}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    s.severity === 'high' ? 'bg-bad/20 text-bad' : 'bg-warn/20 text-warn'
                  }`}
                >
                  {s.severity}
                </span>
              </Link>
            ))}
            {d.atRisk.length === 0 && (
              <p className="text-ink3 text-sm text-center py-4">All students on track ✓</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm font-semibold text-ink mb-4">Recent Activity</p>
        <div className="space-y-2">
          {d.recentActivity.map((act, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
              <span className={`text-lg w-6 text-center ${act.wasCorrect ? 'text-ok' : 'text-bad'}`}>
                {act.wasCorrect ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-ink font-medium">{act.studentName}</span>
                <span className="text-ink3 text-sm"> · </span>
                <span className="text-sm text-ink2">{act.topic}</span>
              </div>
              <span className="text-xs text-ink3 shrink-0">{timeAgo(act.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
