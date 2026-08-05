'use client';

import { useState, Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import AsyncBoundary from '@/components/AsyncBoundary';
import EmptyState from '@/components/EmptyState';
import { useTranslation } from '@/lib/messages';

function StudentsContent() {
  const { t, tp } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortFilter = searchParams.get('cohort') ?? '';
  const [search, setSearch] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const org = useOrg();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['roster', org?.orgId, cohortFilter],
    queryFn: () => api.roster(org!.orgId, cohortFilter || undefined),
    enabled: !!org,
  });

  const removeMut = useMutation({
    mutationFn: (studentId: string) => api.removeStudentFromOrg(org!.orgId, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster', org?.orgId] });
    },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('studentsPageHeading')}</h1>
        <p className="text-ink3 text-sm mt-1">{t('studentsPageSubtitle')}</p>
      </div>

      <AsyncBoundary
        query={query}
        loadingIcon="👥"
        loadingLabel={t('studentsPageLoading')}
        errorMessage={t('studentsPageCouldNotLoad')}
        empty={
          <EmptyState
            icon="👥"
            title={t('studentsPageEmptyTitle')}
            description={t('studentsPageEmptyDescription')}
            actionLabel={t('studentsPageGoToClasses')}
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

          const confirmStudent = filtered.find((s) => s.userId === confirmRemoveId)
            ?? students.find((s) => s.userId === confirmRemoveId);

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
                  placeholder={t('studentsPageSearchPlaceholder')}
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
                  <option value="">{t('studentsPageAllCohorts')}</option>
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
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">{t('studentsPageNameColumn')}</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">{t('studentsPageCohortColumn')}</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">{t('studentsPageLevelColumn')}</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">{t('studentsPageXpColumn')}</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">{t('studentsPageStreakColumn')}</th>
                        <th className="text-left px-5 py-3.5 text-xs uppercase tracking-wider text-ink3 font-medium">{t('studentsPageStatusColumn')}</th>
                        <th className="px-5 py-3.5" />
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
                            <td className="px-5 py-4 text-ink2">{tp.rosterLevelBadge(s.level)}</td>
                            <td className="px-5 py-4 text-ink2 tabular-nums">{s.xp.toLocaleString()}</td>
                            <td className="px-5 py-4 text-ink2">
                              {s.streakDays > 0 ? tp.rosterStreakBadge(s.streakDays) : '—'}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  active ? 'bg-ok/20 text-ok' : 'bg-panel2 text-ink3'
                                }`}
                              >
                                {active ? t('studentsPageActive') : t('studentsPageInactive')}
                              </span>
                            </td>
                            <td
                              className="px-5 py-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setConfirmRemoveId(s.userId)}
                                className="text-xs text-bad hover:underline"
                              >
                                {t('rosterTabRemove')}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-16 text-center text-ink3">
                            {t('studentsPageNoneFound')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {roster && (
                  <div className="px-5 py-3 border-t border-line text-xs text-ink3">
                    {tp.studentsPageShowingCount(filtered.length, roster.totalElements)}
                  </div>
                )}
              </div>

              {/* Remove from centre confirmation */}
              {confirmStudent && (
                <div
                  className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                  onClick={() => !removeMut.isPending && setConfirmRemoveId(null)}
                >
                  <div
                    className="bg-panel border border-line rounded-2xl w-full max-w-sm p-6 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 className="text-lg font-bold text-ink">
                      {tp.studentsPageRemoveConfirmHeading(confirmStudent.displayName)}
                    </h2>
                    <p className="text-sm text-ink2">
                      {t('studentsPageRemoveWarningPrefix')}
                      <strong>{t('studentsPageAllClassesBold')}</strong>
                      {t('studentsPageRemoveWarningSuffix')}
                    </p>
                    {removeMut.isError && (
                      <p className="text-xs text-bad">{t('studentsPageRemoveError')}</p>
                    )}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        disabled={removeMut.isPending}
                        className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition disabled:opacity-40"
                      >
                        {t('studentsPageCancel')}
                      </button>
                      <button
                        onClick={() => {
                          removeMut.mutate(confirmStudent.userId, {
                            onSuccess: () => setConfirmRemoveId(null),
                          });
                        }}
                        disabled={removeMut.isPending}
                        className="px-4 py-2 rounded-lg bg-bad text-white text-sm font-semibold hover:bg-bad/90 transition disabled:opacity-40"
                      >
                        {removeMut.isPending ? t('studentsPageRemoving') : t('studentsPageRemoveFromCentre')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}

function StudentsSuspenseFallback() {
  const { t } = useTranslation();
  return <div className="py-24 text-center text-ink3">{t('studentsPageSuspenseLoading')}</div>;
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<StudentsSuspenseFallback />}>
      <StudentsContent />
    </Suspense>
  );
}
