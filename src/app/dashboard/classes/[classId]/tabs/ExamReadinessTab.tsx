'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, type CreateAssignmentBody, type ExamReadinessConcept } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import { useTranslation } from '@/lib/messages';

export function ExamReadinessTab({ orgId, classId }: { orgId: string; classId: string }) {
  const { t, tp } = useTranslation();
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

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">{t('examReadinessTabLoading')}</p>;
  if (query.error) return <ErrorView message={t('examReadinessTabCouldNotLoad')} onRetry={() => query.refetch()} />;

  const data = query.data?.data;
  if (!data) return null;

  const concepts = asArray<ExamReadinessConcept>(data.concepts);

  // avgMastery / avgReadiness are on a 0–100 scale (backend contract) — do NOT ×100.
  const weakConcepts = concepts
    .filter((c) => c.avgMastery < 60)
    .sort((a, b) => a.avgMastery - b.avgMastery);

  const readinessPct = Math.round(data.avgReadiness);
  const readinessColor = readinessPct >= 70 ? 'text-ok' : readinessPct >= 40 ? 'text-warn' : 'text-bad';

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-panel border border-line rounded-2xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-ink3 mb-1">{t('examReadinessTabAvgReadiness')}</p>
          <p className={`text-3xl font-bold tabular-nums ${readinessColor}`}>{readinessPct}%</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-ink3 mb-1">{t('examReadinessTabStudentsBelow')}</p>
          <p className="text-3xl font-bold tabular-nums text-bad">{data.studentsBelow60}</p>
          <p className="text-xs text-ink3 mt-0.5">{t('examReadinessTabOf')} {data.totalStudents}</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-ink3 mb-1">{t('examReadinessTabConceptsTracked')}</p>
          <p className="text-3xl font-bold tabular-nums text-ink">{concepts.length}</p>
        </div>
      </div>

      {/* Per-concept mastery bars (weakest first) */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm font-semibold text-ink mb-4">{t('examReadinessTabConceptMastery')}</p>
        {concepts.length === 0 ? (
          <p className="text-ink3 text-sm">{t('examReadinessTabNoData')}</p>
        ) : (
          <div className="space-y-3">
            {[...concepts].sort((a, b) => a.avgMastery - b.avgMastery).map((c) => {
              const pct = Math.round(c.avgMastery); // 0–100 already
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
            {tp.examReadinessTabConceptsBelow(weakConcepts.length)}
          </p>
          <p className="text-xs text-ink3 mb-3">
            {t('examReadinessTabCreateRevision')}
          </p>
          <button
            onClick={() => createRevisionMut.mutate(weakConcepts.map((c) => c.concept))}
            disabled={createRevisionMut.isPending}
            className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
          >
            {createRevisionMut.isPending ? t('examReadinessTabCreating') : createRevisionMut.isSuccess ? t('examReadinessTabCreated') : t('examReadinessTabAssignRevision')}
          </button>
        </div>
      )}
    </div>
  );
}
