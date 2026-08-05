'use client';

import { useQuery } from '@tanstack/react-query';
import { api, asArray, type ClassWeakness, type StudentWeakness } from '@/lib/api';
import { useTranslation } from '@/lib/messages';

/**
 * Teacher view that closes the loop: per-student weak areas for this class's
 * subject, so a teacher sees WHERE each student struggles and what to reteach.
 * Renders nothing until the weakness pilot is enabled (backend `enabled` flag).
 */
export function StudentWeaknessPanel({ classId }: { classId: string }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['classWeakness', classId],
    queryFn: () => api.classWeakness(classId),
  });

  const data = query.data?.data as ClassWeakness | undefined;
  // Hidden entirely while the pilot is off — no empty shell for teachers.
  if (!data || !data.enabled) return null;

  const students = asArray<StudentWeakness>(data.students);
  const withGaps = students.filter((s) => s.weakAreas.length > 0);

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">{t('studentWeaknessHeading')}</h3>
        <p className="text-xs text-ink2 mt-0.5">
          {t('studentWeaknessDescription')}
        </p>
      </div>

      {withGaps.length === 0 ? (
        <p className="text-xs text-ink3 py-2">
          {t('studentWeaknessEmpty')}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {withGaps.map((s) => (
            <li key={s.studentId} className="py-2.5 flex items-start gap-3">
              <span className="text-xs font-medium text-ink w-32 shrink-0 truncate">
                {s.displayName || t('studentWeaknessDefaultName')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {s.weakAreas.map((a) => (
                  <span
                    key={a}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-900/40 text-amber-300"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
