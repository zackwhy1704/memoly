'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import AsyncBoundary from '@/components/AsyncBoundary';
import EmptyState from '@/components/EmptyState';

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortFilter = searchParams.get('cohort') ?? '';
  const [search, setSearch] = useState('');
  const org = useOrg();

  const query = useQuery({
    queryKey: ['roster', org?.orgId, cohortFilter],
    queryFn: () => api.roster(org!.orgId, cohortFilter || undefined),
    enabled: !!org,
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Students</h1>
        <p className="text-ink3 text-sm mt-1">All enrolled students and their progress</p>
      </div>

      <AsyncBoundary
        query={query}
        loadingIcon="👥"
        loadingLabel="Loading students..."
        errorMessage="Could not load students."
        empty={
          <EmptyState
            icon="👥"
            title="No students yet"
            description="Share your class join code to get students started."
            actionLabel="Go to classes"
            actionHref="/dashboard/classes"
          />
        }
      >
        {(data) => {
          const roster = data.data;
          const students = roster?.students ?? [];
          const cohorts = Array.from(new Set(students.map((s) => s.cohortLabel))).sort();

          const filtered = students.filter((s) => {
            const matchesSearch = !search || s.displayName.toLowerCase().includes(search.toLowerCase());
            const matchesCohort = !cohortFilter || s.cohortLabel === cohortFilter;
            return matchesSearch && matchesCohort;
          });

          function setCohort(c: string) {
            const params = new URLSearchParams(searchParams.toString());
            if (c) params.set('cohort', c);
            else params.delete('cohort');
            router.replace(`/dashboard/students?${params.toString()}`, { scroll: false });
          }

          return (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3.5 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm
                    placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                    min-w-48"
                />
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohort(e.target.value)}
                  className="px-3.5 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm
                    focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  <option value="">All cohorts</option>
                  {cohorts.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="bg-panel border border-line rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">Name</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">Cohort</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">Level</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">XP</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">Streak</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => {
                        const active = s.streakDays > 0;
                        return (
                          <tr
                            key={s.userId}
                            onClick={() => router.push(`/dashboard/students/${s.userId}`)}
                            className="border-b border-line last:border-0 cursor-pointer hover:bg-panel2 transition-colors"
                          >
                            <td className="px-5 py-4 font-medium text-ink">{s.displayName}</td>
                            <td className="px-5 py-4 text-ink2">{s.cohortLabel}</td>
                            <td className="px-5 py-4 text-ink2">Lv {s.level}</td>
                            <td className="px-5 py-4 text-ink2 tabular-nums">{s.xp.toLocaleString()}</td>
                            <td className="px-5 py-4 text-ink2">
                              {s.streakDays > 0 ? `🔥 ${s.streakDays}d` : '—'}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  active ? 'bg-ok/20 text-ok' : 'bg-panel2 text-ink3'
                                }`}
                              >
                                {active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-16 text-center text-ink3">
                            No students found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {roster && (
                  <div className="px-5 py-3 border-t border-line text-xs text-ink3">
                    Showing {filtered.length} of {roster.totalElements} students
                  </div>
                )}
              </div>
            </>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-ink3">Loading...</div>}>
      <StudentsContent />
    </Suspense>
  );
}
