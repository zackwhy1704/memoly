'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, asArray, ApiError, type AssignmentType, type CreateAssignmentBody, type ClassModule } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from '@/lib/messages';

/**
 * Surface the REAL backend message. apiFetch throws an ApiError whose
 * `.message` is the backend envelope's `error` field (e.g. a BusinessException
 * like "No modules below mastery threshold 60.0%"). Show that to the teacher;
 * fall back to the generic copy only when there's no specific message.
 */
function createAssignmentErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const msg = error.message.trim();
    if (msg) return msg;
  }
  return fallback;
}

export function CreateAssignmentModal({
  orgId,
  classId,
  onClose,
  onCreated,
}: {
  orgId: string;
  classId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, tp } = useTranslation();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssignmentType>('POST_CLASS');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [masteryThreshold, setMasteryThreshold] = useState(60);

  const modulesQuery = useQuery({
    queryKey: ['classModules', orgId, classId],
    queryFn: () => api.classModules(orgId, classId),
  });

  const modules = asArray<ClassModule>(modulesQuery.data);

  // The backend bounds per-student selection by wiki slug, not module id.
  const slugsFor = (ids: string[]) =>
    ids
      .map((id) => modules.find((m) => m.moduleId === id)?.wikiSlug)
      .filter((s): s is string => !!s);

  const create = useMutation({
    mutationFn: () => {
      const body: CreateAssignmentBody = {
        title,
        type,
        moduleIds: selectedModules,
        dueDate: dueDate || undefined,
        // Threshold drives REVISION auto-select AND the personalized weak cut-off.
        masteryThreshold: type === 'REVISION' || personalized ? masteryThreshold : undefined,
        personalized: personalized || undefined,
        topicScope: personalized ? slugsFor(selectedModules) : undefined,
        prereqScope:
          personalized && type === 'PRE_CLASS' && selectedPrereqs.length > 0
            ? slugsFor(selectedPrereqs)
            : undefined,
      };
      return api.createAssignment(orgId, classId, body);
    },
    onSuccess: () => {
      trackEvent('assignment_created', {
        type,
        classId,
        moduleCount: selectedModules.length,
        personalized,
      });
      onCreated();
      onClose();
    },
  });

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const togglePrereq = (id: string) => {
    setSelectedPrereqs((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-sm font-bold text-ink">{t('createAssignmentHeading')}</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-lg leading-none">&times;</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">{t('createAssignmentTitleLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('createAssignmentTitlePlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">{t('createAssignmentTypeLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {(['PRE_CLASS', 'POST_CLASS', 'REVISION', 'CUSTOM'] as AssignmentType[]).map((at) => (
                <button
                  key={at}
                  onClick={() => setType(at)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    type === at
                      ? 'bg-accent text-white'
                      : 'bg-panel2 text-ink3 hover:text-ink2'
                  }`}
                >
                  {at.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">{t('createAssignmentModulesLabel')}</label>
            {modulesQuery.isLoading ? (
              <p className="text-ink3 text-xs">{t('createAssignmentLoadingModules')}</p>
            ) : modules.length === 0 ? (
              <p className="text-ink3 text-xs">{t('createAssignmentNoModules')}</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {modules.map((m) => (
                  <label key={m.moduleId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(m.moduleId)}
                      onChange={() => toggleModule(m.moduleId)}
                      className="w-4 h-4 rounded border-line text-accent focus:ring-accent/40"
                    />
                    <span className="text-sm text-ink">{m.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Personalize per student */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={personalized}
                onChange={(e) => setPersonalized(e.target.checked)}
                className="w-4 h-4 rounded border-line text-accent focus:ring-accent/40"
              />
              <span className="text-xs font-semibold text-ink2">{t('createAssignmentPersonalizeLabel')}</span>
            </label>
            {personalized && (
              <p className="text-[11px] text-ink3 mt-1">
                {type === 'PRE_CLASS'
                  ? t('createAssignmentPersonalizePreClassHint')
                  : t('createAssignmentPersonalizeOtherHint')}
              </p>
            )}
          </div>

          {/* Prerequisite diagnostic (pre-class personalized) */}
          {personalized && type === 'PRE_CLASS' && (
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">
                {t('createAssignmentDiagnosePrereqsLabel')}
              </label>
              {modules.length === 0 ? (
                <p className="text-ink3 text-xs">{t('createAssignmentNoModules')}</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {modules.map((m) => (
                    <label key={m.moduleId} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPrereqs.includes(m.moduleId)}
                        onChange={() => togglePrereq(m.moduleId)}
                        className="w-4 h-4 rounded border-line text-accent focus:ring-accent/40"
                      />
                      <span className="text-sm text-ink">{m.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">{t('createAssignmentDueDateLabel')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Mastery threshold — drives REVISION auto-select and the personalized
              weak-concept cut-off. */}
          {(type === 'REVISION' || personalized) && (
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">
                {tp.createAssignmentMasteryThreshold(masteryThreshold)}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={masteryThreshold}
                onChange={(e) => setMasteryThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-line">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-panel2 hover:bg-panel2/80 rounded-lg text-ink transition"
          >
            {t('createAssignmentCancel')}
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!title.trim() || selectedModules.length === 0 || create.isPending}
            className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
          >
            {create.isPending ? t('createAssignmentCreating') : t('createAssignmentCreate')}
          </button>
        </div>
        {create.error && (
          <div className="px-5 pb-4">
            <p className="text-xs text-bad">{createAssignmentErrorMessage(create.error, t('createAssignmentFallbackError'))}</p>
          </div>
        )}
      </div>
    </div>
  );
}
