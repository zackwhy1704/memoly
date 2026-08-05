'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ModulePreviewItem } from '@/lib/api';
import { useTranslation } from '@/lib/messages';
import type { MessageKey } from '@/lib/messages/en';

// Read-only teacher preview of a generated module — the LEARN/TEST/PROVE content a
// student will see, so the teacher can look before assigning. No answer keys (the
// backend omits answerJson), no editing.

const STAGE_ORDER = ['LEARN', 'TEST', 'PROVE'] as const;
const STAGE_LABEL_KEY: Record<string, MessageKey> = {
  LEARN: 'modulePreviewStageLearn',
  TEST: 'modulePreviewStageTest',
  PROVE: 'modulePreviewStageProve',
};

function itemText(
  contentJson: string,
  t: (key: MessageKey) => string
): { heading: string; detail?: string; terms: string[] } {
  let p: Record<string, unknown> = {};
  try {
    p = JSON.parse(contentJson) as Record<string, unknown>;
  } catch {
    return { heading: t('modulePreviewContentUnreadable'), terms: [] };
  }
  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : undefined);
  const heading = str('title') ?? str('statement') ?? str('question') ?? str('problem') ?? t('modulePreviewNoText');
  const detail = str('body') ?? str('wrongSolution') ?? str('explanation');
  const terms = Array.isArray(p.keyTerms) ? (p.keyTerms.filter((term) => typeof term === 'string') as string[]) : [];
  return { heading, detail, terms };
}

export function ModulePreviewModal({
  orgId,
  classId,
  moduleId,
  moduleTitle,
  wikiSlug,
  onClose,
}: {
  orgId: string;
  classId: string;
  moduleId: string;
  moduleTitle: string;
  wikiSlug: string;
  onClose: () => void;
}) {
  const { t, tp } = useTranslation();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['modulePreview', orgId, classId, moduleId],
    queryFn: () => api.moduleContentPreview(orgId, classId, moduleId),
  });

  const regenerate = useMutation({
    mutationFn: () => api.regenerateContent(orgId, classId, wikiSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modulePreview', orgId, classId, moduleId] });
      qc.invalidateQueries({ queryKey: ['classModules', orgId, classId] });
    },
  });

  const items = query.data?.data ?? [];
  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    items: items.filter((i) => i.stage === stage).sort((a, b) => a.sortOrder - b.sortOrder),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tp.modulePreviewAriaLabel(moduleTitle)}
      onClick={onClose}
    >
      <div
        className="bg-bg border border-line rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink truncate">{moduleTitle}</h2>
            <p className="text-xs text-ink3">{t('modulePreviewSubtitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('modulePreviewClose')} className="text-ink3 hover:text-ink text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-6 flex-1">
          {query.isLoading && <p className="text-sm text-ink3">{t('modulePreviewLoading')}</p>}
          {query.isError && (
            <p className="text-sm text-bad">{t('modulePreviewLoadError')}</p>
          )}
          {!query.isLoading && !query.isError && items.length === 0 && (
            <p className="text-sm text-ink3">{t('modulePreviewEmpty')}</p>
          )}

          {byStage.map((group) => (
            <section key={group.stage} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink3">
                {STAGE_LABEL_KEY[group.stage] ? t(STAGE_LABEL_KEY[group.stage]) : group.stage}{' '}
                <span className="text-ink3/70">· {group.items.length}</span>
              </h3>
              <ol className="space-y-2">
                {group.items.map((item: ModulePreviewItem, i) => {
                  const it = itemText(item.contentJson, t);
                  return (
                    <li key={item.id} className="bg-panel border border-line rounded-xl p-3.5">
                      <div className="flex gap-2">
                        <span className="text-ink3 text-sm tabular-nums">{i + 1}.</span>
                        <div className="min-w-0 space-y-1.5">
                          <p className="text-sm text-ink font-medium">{it.heading}</p>
                          {it.detail && <p className="text-sm text-ink2 leading-relaxed">{it.detail}</p>}
                          {it.terms.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {it.terms.map((term) => (
                                <span key={term} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                                  {term}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className="inline-block text-[10px] uppercase tracking-wide text-ink3">
                            {item.type.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line">
          <button
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-ink2 hover:bg-panel2 transition disabled:opacity-60"
          >
            {regenerate.isPending ? t('modulePreviewRegenerating') : t('modulePreviewRegenerateModule')}
          </button>
          {regenerate.isError && <span className="text-xs text-bad">{t('modulePreviewRegenFailed')}</span>}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition"
          >
            {t('modulePreviewCloseButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
