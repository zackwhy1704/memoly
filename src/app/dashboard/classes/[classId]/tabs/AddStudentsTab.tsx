'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

export function AddStudentsTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => api.members(orgId),
  });
  const assign = useMutation({
    mutationFn: (userId: string) => api.assignMember(orgId, classId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', orgId] });
      qc.invalidateQueries({ queryKey: ['classRosterAnalytics', orgId, classId] });
      qc.invalidateQueries({ queryKey: ['classes', orgId] });
    },
  });

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading members...</p>;
  if (query.error) return <ErrorView message="Could not load centre members." onRetry={() => query.refetch()} />;
  const members = query.data?.data ?? [];

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
            <th className="text-left px-5 py-3 font-medium">Member</th>
            <th className="text-left px-5 py-3 font-medium">Classes</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {members.map((mem) => {
            const inThisClass = mem.classes.some((c) => c.classId === classId);
            return (
              <tr key={mem.userId} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5 font-medium text-ink">
                  {mem.displayName || '—'}
                  {mem.unassigned && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-warn/20 text-warn">unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink3 text-xs">
                  {mem.classes.length > 0 ? mem.classes.map((c) => c.className).join(', ') : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {inThisClass ? (
                    <span className="text-xs text-ok">✓ In class</span>
                  ) : (
                    <button
                      onClick={() => assign.mutate(mem.userId)}
                      disabled={assign.isPending}
                      className="text-xs font-semibold text-accent hover:underline disabled:opacity-40"
                    >
                      Add to class
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-16 text-center text-ink3">
                No centre members yet. Share the centre enroll code so students can join.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
