'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ReviewItem, type ContentVerification } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

function parseVerification(raw?: string | null): ContentVerification | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as ContentVerification;
    return v?.status === 'flagged' && Array.isArray(v.flags) && v.flags.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z M12 9v4 M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Groundedness gate (B3) flag callout. Icon + severity colour + text (never colour
 * alone), the flagged claim, and the cited source line in a monospace block so the
 * teacher adjudicates "did the AI invent this?" before approving.
 */
function VerificationFlags({ verification }: { verification: ContentVerification }) {
  const contradicts = verification.flags.some((f) => /contradict/i.test(f.reason));
  const sev = contradicts
    ? { wrap: 'border-bad/30 bg-bad/10', text: 'text-bad', label: 'Contradicts your notes' }
    : { wrap: 'border-warn/30 bg-warn/10', text: 'text-warn', label: 'Needs your review' };

  return (
    <div className={`rounded-xl border ${sev.wrap} px-3 py-2.5`} role="alert">
      <div className="flex items-center gap-2">
        <WarningIcon className={`w-4 h-4 shrink-0 ${sev.text}`} />
        <span className={`text-xs font-semibold ${sev.text}`}>
          {sev.label} · {verification.flags.length} claim{verification.flags.length !== 1 ? 's' : ''}
        </span>
        <span className="ml-auto text-[10px] font-medium text-ink3">
          source: {verification.sourcePageVerified ? 'teacher-verified' : 'unverified'}
        </span>
      </div>
      <ul className="mt-2 space-y-2">
        {verification.flags.map((f, i) => (
          <li key={i} className="text-xs">
            <p className="text-ink">
              <span className="text-ink3">Claim: </span>{f.claim}
            </p>
            {f.sourceQuote ? (
              <p className="mt-1 rounded-md bg-panel2 border border-line px-2 py-1 font-mono text-[11px] text-ink2">
                {f.sourceQuote}
              </p>
            ) : (
              <p className="mt-0.5 text-ink3 italic">{f.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    LEARN: 'bg-blue-900/40 text-blue-300',
    HOT_TAKE: 'bg-amber-900/40 text-amber-300',
    QUIZ: 'bg-purple-900/40 text-purple-300',
    FLASHCARD: 'bg-teal-900/40 text-teal-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[type] ?? 'bg-panel2 text-ink3'}`}>
      {type.replace('_', ' ')}
    </span>
  );
}

function ContentPreview({ item }: { item: ReviewItem }) {
  try {
    const content = JSON.parse(item.contentJson);
    if (item.type === 'HOT_TAKE') {
      return (
        <div className="bg-panel2 rounded-lg px-3 py-2 text-sm text-ink">
          <p className="font-medium">{content.statement ?? content.question ?? JSON.stringify(content)}</p>
          {content.answer != null && (
            <p className="text-xs text-ink3 mt-1">Answer: {String(content.answer)}</p>
          )}
        </div>
      );
    }
    if (item.type === 'LEARN') {
      return (
        <div className="bg-panel2 rounded-lg px-3 py-2 text-sm text-ink">
          <p className="font-medium">{content.title ?? 'Untitled'}</p>
          <p className="text-xs text-ink3 mt-1 line-clamp-2">{content.body ?? content.text ?? JSON.stringify(content)}</p>
        </div>
      );
    }
    // Generic fallback
    return (
      <div className="bg-panel2 rounded-lg px-3 py-2 text-xs text-ink3 font-mono line-clamp-3 whitespace-pre-wrap">
        {JSON.stringify(content, null, 2)}
      </div>
    );
  } catch {
    return (
      <div className="bg-panel2 rounded-lg px-3 py-2 text-xs text-ink3 line-clamp-3">
        {item.contentJson}
      </div>
    );
  }
}

function ModuleRegenSection({
  orgId,
  classId,
  pageSlug,
  onSuccess,
}: {
  orgId: string;
  classId: string;
  pageSlug: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [guidance, setGuidance] = useState('');

  const mut = useMutation({
    mutationFn: () => api.regenerateContent(orgId, classId, pageSlug, guidance.trim() || undefined),
    onSuccess: () => {
      setOpen(false);
      setGuidance('');
      onSuccess();
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-ink3 hover:text-ink2 underline underline-offset-2 transition"
      >
        Regenerate with feedback
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={guidance}
        onChange={(e) => setGuidance(e.target.value)}
        placeholder="Optional: tell Mochi what to focus on, fix, or change…"
        rows={2}
        className="w-full rounded-lg bg-panel2 border border-line px-3 py-2 text-sm text-ink placeholder-ink3 resize-none focus:outline-none focus:ring-1 focus:ring-accent/60"
      />
      {mut.isError && (
        <p className="text-xs text-bad">
          {(mut.error as Error)?.message || 'Regeneration failed — please try again.'}
          {' '}
          <button className="underline" onClick={() => mut.mutate()}>Retry</button>
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
        >
          {mut.isPending ? 'Regenerating…' : 'Regenerate'}
        </button>
        <button
          onClick={() => { setOpen(false); setGuidance(''); mut.reset(); }}
          disabled={mut.isPending}
          className="px-3 py-1.5 text-xs text-ink3 hover:text-ink transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ReviewTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['contentReview', orgId, classId],
    queryFn: () => api.contentReview(orgId, classId),
  });

  const approveMut = useMutation({
    mutationFn: (itemId: string) => api.patchContentItem(orgId, classId, itemId, { status: 'APPROVED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contentReview', orgId, classId] }),
  });

  const rejectMut = useMutation({
    mutationFn: (itemId: string) => api.patchContentItem(orgId, classId, itemId, { status: 'REJECTED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contentReview', orgId, classId] }),
  });

  const approveAllMut = useMutation({
    mutationFn: () => api.approveAllContent(orgId, classId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contentReview', orgId, classId] }),
  });

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading content for review...</p>;
  if (query.error) return <ErrorView message="Could not load content review items." onRetry={() => query.refetch()} />;

  const items = query.data?.data ?? [];
  const draftItems = items.filter((i) => i.status === 'DRAFT');

  // Group by module title; track pageSlug per group for regenerate
  const grouped = new Map<string, { items: ReviewItem[]; pageSlug: string | null }>();
  for (const item of draftItems) {
    const key = item.moduleTitle || 'Uncategorized';
    if (!grouped.has(key)) grouped.set(key, { items: [], pageSlug: item.pageSlug ?? null });
    grouped.get(key)!.items.push(item);
  }

  if (draftItems.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="All content reviewed"
        description="No draft items pending review. New content will appear here after upload and compilation."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink2">{draftItems.length} item{draftItems.length !== 1 ? 's' : ''} pending review</p>
        <button
          onClick={() => approveAllMut.mutate()}
          disabled={approveAllMut.isPending}
          className="px-4 py-2 text-xs font-semibold bg-ok text-white rounded-lg hover:bg-ok/90 transition disabled:opacity-40"
        >
          {approveAllMut.isPending ? 'Approving...' : `Approve all (${draftItems.length})`}
        </button>
      </div>

      {approveAllMut.isSuccess && (
        <div className="bg-ok/10 border border-ok/30 rounded-xl px-4 py-3 text-sm text-ok">
          Approved {approveAllMut.data.data.approvedCount} items.
        </div>
      )}

      {Array.from(grouped.entries()).map(([moduleTitle, { items: moduleItems, pageSlug }]) => (
        <div key={moduleTitle} className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xs font-semibold text-ink2 uppercase tracking-wider">{moduleTitle}</h3>
            {pageSlug && (
              <ModuleRegenSection
                orgId={orgId}
                classId={classId}
                pageSlug={pageSlug}
                onSuccess={() => qc.invalidateQueries({ queryKey: ['contentReview', orgId, classId] })}
              />
            )}
          </div>
          <div className="space-y-2">
            {moduleItems.map((item) => {
              const verification = parseVerification(item.verification);
              const contradicts = verification?.flags.some((f) => /contradict/i.test(f.reason));
              const borderClass = verification
                ? contradicts ? 'border-bad/40' : 'border-warn/40'
                : 'border-line';
              return (
              <div key={item.itemId} className={`bg-panel border ${borderClass} rounded-2xl p-4`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <ContentTypeBadge type={item.type} />
                    <ContentPreview item={item} />
                    {verification && <VerificationFlags verification={verification} />}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => approveMut.mutate(item.itemId)}
                      disabled={approveMut.isPending}
                      className="px-3 py-1.5 text-xs font-semibold bg-ok text-white rounded-lg hover:bg-ok/90 transition disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectMut.mutate(item.itemId)}
                      disabled={rejectMut.isPending}
                      className="px-3 py-1.5 text-xs font-semibold bg-bad/20 text-bad rounded-lg hover:bg-bad/30 transition disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
