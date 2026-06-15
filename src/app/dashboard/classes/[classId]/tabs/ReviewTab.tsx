'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ReviewItem } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

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

  // Group by module
  const grouped = new Map<string, ReviewItem[]>();
  for (const item of draftItems) {
    const key = item.moduleTitle || 'Uncategorized';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
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

      {Array.from(grouped.entries()).map(([moduleTitle, moduleItems]) => (
        <div key={moduleTitle} className="space-y-2">
          <h3 className="text-xs font-semibold text-ink2 uppercase tracking-wider">{moduleTitle}</h3>
          <div className="space-y-2">
            {moduleItems.map((item) => (
              <div key={item.itemId} className="bg-panel border border-line rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <ContentTypeBadge type={item.type} />
                    <ContentPreview item={item} />
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
