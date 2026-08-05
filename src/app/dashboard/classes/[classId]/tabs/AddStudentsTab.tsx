'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, type CentreMember } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import { useTranslation } from '@/lib/messages';

export function AddStudentsTab({ orgId, classId }: { orgId: string; classId: string }) {
  const { t } = useTranslation();
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

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">{t('addStudentsTabLoading')}</p>;
  if (query.error) return <ErrorView message={t('addStudentsTabCouldNotLoad')} onRetry={() => query.refetch()} />;
  const members = asArray<CentreMember>(query.data);

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink3">
            <th className="text-left px-5 py-3 font-medium">{t('addStudentsTabMemberColumn')}</th>
            <th className="text-left px-5 py-3 font-medium">{t('addStudentsTabClassesColumn')}</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {members.map((mem) => {
            const inThisClass = (mem.classes ?? []).some((c) => c.classId === classId);
            return (
              <tr key={mem.userId} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5 font-medium text-ink">
                  {mem.displayName || '—'}
                  {mem.unassigned && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-warn/20 text-warn">{t('addStudentsTabUnassigned')}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink3 text-xs">
                  {(mem.classes ?? []).length > 0 ? (mem.classes ?? []).map((c) => c.className).join(', ') : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {inThisClass ? (
                    <span className="text-xs text-ok">{t('addStudentsTabInClass')}</span>
                  ) : (
                    <button
                      onClick={() => assign.mutate(mem.userId)}
                      disabled={assign.isPending}
                      className="text-xs font-semibold text-accent hover:underline disabled:opacity-40"
                    >
                      {t('addStudentsTabAddToClass')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-16 text-center text-ink3">
                {t('addStudentsTabEmpty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
