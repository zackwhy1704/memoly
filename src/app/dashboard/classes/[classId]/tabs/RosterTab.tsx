'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, type ClassRosterAnalyticsRow } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

export function RosterTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['classRosterAnalytics', orgId, classId],
    queryFn: () => api.classRosterAnalytics(orgId, classId),
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => api.removeMember(orgId, classId, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classRosterAnalytics', orgId, classId] });
      qc.invalidateQueries({ queryKey: ['classes', orgId] });
    },
  });

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading roster...</p>;
  if (query.error) return <ErrorView message="Could not load class roster." onRetry={() => query.refetch()} />;

  const rows = asArray<ClassRosterAnalyticsRow>(query.data);

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
            <th className="text-left px-5 py-3 font-medium">Student</th>
            <th className="text-left px-5 py-3 font-medium">Grasp</th>
            <th className="text-left px-5 py-3 font-medium">Attempts</th>
            <th className="text-left px-5 py-3 font-medium">Last active</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId} className="border-b border-line last:border-0">
              <td className="px-5 py-3.5 font-medium text-ink">{r.displayName || '—'}</td>
              <td className="px-5 py-3.5 tabular-nums text-ink2">{Math.round(r.grasp * 100)}%</td>
              <td className="px-5 py-3.5 tabular-nums text-ink2">{r.attempts}</td>
              <td className="px-5 py-3.5 text-ink3 text-xs">
                {r.lastActive ? new Date(r.lastActive).toLocaleDateString() : 'never'}
              </td>
              <td className="px-5 py-3.5 text-right">
                <button
                  onClick={() => remove.mutate(r.studentId)}
                  disabled={remove.isPending}
                  className="text-xs text-bad hover:underline disabled:opacity-40"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-16 text-center text-ink3">
                No students assigned yet. Use “Add students”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
