'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, asArray, type AssignmentType, type AssignmentStudentStatus, type AssignmentSummary, type AssignmentStudentRow } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { useTranslation } from '@/lib/messages';
import type { MessageKey } from '@/lib/messages/en';
import { CreateAssignmentModal } from '../modals/CreateAssignmentModal';
import { AnswerReleasePanel } from '../modals/AnswerReleasePanel';
import { ReadinessModal } from '../modals/ReadinessModal';

const TYPE_LABEL_KEY: Record<AssignmentType, MessageKey> = {
  PRE_CLASS: 'assignmentTypePreClass',
  POST_CLASS: 'assignmentTypePostClass',
  REVISION: 'assignmentTypeRevision',
  CUSTOM: 'assignmentTypeCustom',
};
const STATUS_LABEL_KEY: Record<AssignmentStudentStatus, MessageKey> = {
  PENDING: 'studentStatusPending',
  IN_PROGRESS: 'studentStatusInProgress',
  COMPLETED: 'studentStatusCompleted',
  OVERDUE: 'studentStatusOverdue',
};

function AssignmentTypeBadge({ type }: { type: AssignmentType }) {
  const { t } = useTranslation();
  const styles: Record<AssignmentType, string> = {
    PRE_CLASS: 'bg-teal-900/40 text-teal-300',
    POST_CLASS: 'bg-amber-900/40 text-amber-300',
    REVISION: 'bg-purple-900/40 text-purple-300',
    CUSTOM: 'bg-pink-900/40 text-pink-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[type] ?? 'bg-panel2 text-ink3'}`}>
      {TYPE_LABEL_KEY[type] ? t(TYPE_LABEL_KEY[type]) : type}
    </span>
  );
}

function StudentStatusBadge({ status }: { status: AssignmentStudentStatus }) {
  const { t } = useTranslation();
  const styles: Record<AssignmentStudentStatus, string> = {
    PENDING: 'bg-panel2 text-ink3',
    IN_PROGRESS: 'bg-blue-900/40 text-blue-300',
    COMPLETED: 'bg-ok/20 text-ok',
    OVERDUE: 'bg-bad/20 text-bad',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[status] ?? 'bg-panel2 text-ink3'}`}>
      {STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status]) : status.replace('_', ' ')}
    </span>
  );
}

export function AssignmentsTab({ orgId, classId }: { orgId: string; classId: string }) {
  const { t, tp } = useTranslation();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readinessId, setReadinessId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['assignments', orgId, classId],
    queryFn: () => api.assignments(orgId, classId),
  });

  const detailQuery = useQuery({
    queryKey: ['assignment', orgId, classId, expandedId],
    queryFn: () => api.assignment(orgId, classId, expandedId!),
    enabled: !!expandedId,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteAssignment(orgId, classId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', orgId, classId] });
      setExpandedId(null);
    },
  });

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">{t('assignmentsTabLoading')}</p>;
  if (query.error) return <ErrorView message={t('assignmentsTabCouldNotLoad')} onRetry={() => query.refetch()} />;

  const assignments = asArray<AssignmentSummary>(query.data);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink2">{tp.assignmentsTabCount(assignments.length)}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition"
        >
          {t('assignmentsTabCreate')}
        </button>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon="📋"
          title={t('assignmentsTabEmptyTitle')}
          description={t('assignmentsTabEmptyDescription')}
          actionLabel={t('assignmentsTabCreate')}
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="bg-panel border border-line rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-panel2/50 transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink truncate">{a.title}</span>
                    <AssignmentTypeBadge type={a.type} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink3">
                    <span>{tp.assignmentsTabCompletedCount(a.completedCount, a.totalStudents)}</span>
                    {a.overdueCount > 0 && (
                      <span className="text-bad">{tp.assignmentsTabOverdueCount(a.overdueCount)}</span>
                    )}
                    {a.dueDate && (
                      <span>{tp.assignmentsTabDue(new Date(a.dueDate).toLocaleDateString())}</span>
                    )}
                  </div>
                </div>
                <span className="text-ink3 text-xs">{expandedId === a.id ? '▲' : '▼'}</span>
              </button>

              {expandedId === a.id && (
                <div className="border-t border-line">
                  {detailQuery.isLoading ? (
                    <p className="px-5 py-4 text-ink3 text-xs">{t('assignmentsTabLoadingDetails')}</p>
                  ) : detailQuery.error ? (
                    <div className="px-5 py-4">
                      <ErrorView message={t('assignmentsTabCouldNotLoadDetails')} onRetry={() => detailQuery.refetch()} />
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
                            <th className="text-left px-5 py-2.5 font-medium">{t('assignmentsTabStudentColumn')}</th>
                            <th className="text-left px-5 py-2.5 font-medium">{t('assignmentsTabStatusColumn')}</th>
                            <th className="text-left px-5 py-2.5 font-medium">{t('assignmentsTabTargetedTopicsColumn')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {asArray<AssignmentStudentRow>(detailQuery.data?.data?.students).map((s) => {
                            const topics = (s.resolvedModules ?? []).map((m) => m.title);
                            return (
                              <tr key={s.userId} className="border-b border-line last:border-0">
                                <td className="px-5 py-2.5 text-ink">
                                  {s.displayName || `${t('assignmentsTabStudentColumn')} ${s.userId.slice(0, 8)}`}
                                </td>
                                <td className="px-5 py-2.5"><StudentStatusBadge status={s.status} /></td>
                                <td className="px-5 py-2.5 text-ink2">
                                  {topics.length > 0 ? (
                                    <span className="flex flex-wrap gap-1">
                                      {topics.map((t2, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded-md text-[11px] bg-panel2 text-ink2">
                                          {t2}
                                        </span>
                                      ))}
                                    </span>
                                  ) : (
                                    <span className="text-ink3">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {asArray<AssignmentStudentRow>(detailQuery.data?.data?.students).length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-5 py-4 text-ink3 text-xs">
                                {t('assignmentsTabNoStudents')}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <AnswerReleasePanel
                        orgId={orgId}
                        classId={classId}
                        assignmentId={a.id}
                        dueDate={a.dueDate}
                      />
                      <div className="px-5 py-3 flex items-center justify-between border-t border-line">
                        {a.type === 'PRE_CLASS' ? (
                          <button
                            onClick={() => setReadinessId(a.id)}
                            className="text-xs font-semibold text-accent hover:underline"
                          >
                            {t('assignmentsTabViewReadiness')}
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={() => deleteMut.mutate(a.id)}
                          disabled={deleteMut.isPending}
                          className="text-xs text-bad hover:underline disabled:opacity-40"
                        >
                          {deleteMut.isPending ? t('assignmentsTabDeleting') : t('assignmentsTabDeleteAssignment')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAssignmentModal
          orgId={orgId}
          classId={classId}
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['assignments', orgId, classId] })}
        />
      )}

      {readinessId && (
        <ReadinessModal
          orgId={orgId}
          classId={classId}
          assignmentId={readinessId}
          onClose={() => setReadinessId(null)}
        />
      )}
    </div>
  );
}
