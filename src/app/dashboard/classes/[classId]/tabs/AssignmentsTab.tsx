'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type AssignmentType, type AssignmentStudentStatus } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { CreateAssignmentModal } from '../modals/CreateAssignmentModal';
import { AnswerReleasePanel } from '../modals/AnswerReleasePanel';
import { ReadinessModal } from '../modals/ReadinessModal';

function AssignmentTypeBadge({ type }: { type: AssignmentType }) {
  const styles: Record<AssignmentType, string> = {
    PRE_CLASS: 'bg-teal-900/40 text-teal-300',
    POST_CLASS: 'bg-amber-900/40 text-amber-300',
    REVISION: 'bg-purple-900/40 text-purple-300',
    CUSTOM: 'bg-pink-900/40 text-pink-300',
  };
  const labels: Record<AssignmentType, string> = {
    PRE_CLASS: 'Pre-class',
    POST_CLASS: 'Post-class',
    REVISION: 'Revision',
    CUSTOM: 'Custom',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[type] ?? 'bg-panel2 text-ink3'}`}>
      {labels[type] ?? type}
    </span>
  );
}

function StudentStatusBadge({ status }: { status: AssignmentStudentStatus }) {
  const styles: Record<AssignmentStudentStatus, string> = {
    PENDING: 'bg-panel2 text-ink3',
    IN_PROGRESS: 'bg-blue-900/40 text-blue-300',
    COMPLETED: 'bg-ok/20 text-ok',
    OVERDUE: 'bg-bad/20 text-bad',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[status] ?? 'bg-panel2 text-ink3'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function AssignmentsTab({ orgId, classId }: { orgId: string; classId: string }) {
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

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading assignments...</p>;
  if (query.error) return <ErrorView message="Could not load assignments." onRetry={() => query.refetch()} />;

  const assignments = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink2">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition"
        >
          + Create assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No assignments yet"
          description="Create an assignment to track student progress on specific modules."
          actionLabel="Create assignment"
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
                    <span>{a.completedCount}/{a.totalStudents} completed</span>
                    {a.overdueCount > 0 && (
                      <span className="text-bad">{a.overdueCount} overdue</span>
                    )}
                    {a.dueDate && (
                      <span>Due {new Date(a.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <span className="text-ink3 text-xs">{expandedId === a.id ? '▲' : '▼'}</span>
              </button>

              {expandedId === a.id && (
                <div className="border-t border-line">
                  {detailQuery.isLoading ? (
                    <p className="px-5 py-4 text-ink3 text-xs">Loading details...</p>
                  ) : detailQuery.error ? (
                    <div className="px-5 py-4">
                      <ErrorView message="Could not load assignment details." onRetry={() => detailQuery.refetch()} />
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
                            <th className="text-left px-5 py-2.5 font-medium">Student</th>
                            <th className="text-left px-5 py-2.5 font-medium">Status</th>
                            <th className="text-left px-5 py-2.5 font-medium">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailQuery.data?.data.perStudentStatus ?? []).map((s) => (
                            <tr key={s.userId} className="border-b border-line last:border-0">
                              <td className="px-5 py-2.5 text-ink">{s.displayName}</td>
                              <td className="px-5 py-2.5"><StudentStatusBadge status={s.status} /></td>
                              <td className="px-5 py-2.5 tabular-nums text-ink2">{s.score != null ? `${Math.round(s.score)}%` : '—'}</td>
                            </tr>
                          ))}
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
                            View pre-class readiness
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={() => deleteMut.mutate(a.id)}
                          disabled={deleteMut.isPending}
                          className="text-xs text-bad hover:underline disabled:opacity-40"
                        >
                          {deleteMut.isPending ? 'Deleting...' : 'Delete assignment'}
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
