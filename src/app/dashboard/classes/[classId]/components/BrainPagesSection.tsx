'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, ApiError, type WikiPage } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

/**
 * "Brain pages" — the compiled wiki the whole class learns from. Parity with the
 * mobile correction flow: a teacher opens a page and edits it; the edit is saved
 * as a human correction (humanVerified), which the backend treats as the source
 * of truth over the AI draft. This is the robust, backend-native "edit your
 * content" path (vs file-text edit, which has no GET to source already-uploaded
 * text — see report).
 */
export function BrainPagesSection({ avatarId }: { avatarId: string }) {
  const query = useQuery({
    queryKey: ['wikiPages', avatarId],
    queryFn: () => api.wikiPages(avatarId),
  });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const pages = asArray<WikiPage>(query.data);
  const editingPage = pages.find((p) => p.slug === editingSlug) ?? null;

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line">
        <h3 className="text-sm font-semibold text-ink">Brain pages</h3>
        <p className="text-xs text-ink3 mt-0.5">
          The compiled notes every student&apos;s Mochi teaches from. Edit a page to correct it —
          your version is kept as the verified source.
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-ink3 text-sm p-5">Loading brain pages…</p>
      ) : query.error ? (
        <div className="p-4">
          <ErrorView message="Could not load brain pages." onRetry={() => query.refetch()} />
        </div>
      ) : pages.length === 0 ? (
        <p className="text-ink3 text-sm p-5">
          No brain pages yet — upload content above and they&apos;ll appear once it compiles.
        </p>
      ) : (
        <ul>
          {pages.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-line last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{p.title || p.slug}</p>
              </div>
              {p.humanVerified && (
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-ok/20 text-ok">
                  Teacher-edited
                </span>
              )}
              <button
                onClick={() => setEditingSlug(p.slug)}
                className="shrink-0 text-xs font-semibold text-accent hover:underline"
              >
                View / Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      {editingPage && (
        <WikiPageEditModal
          avatarId={avatarId}
          page={editingPage}
          onClose={() => setEditingSlug(null)}
        />
      )}
    </div>
  );
}

function WikiPageEditModal({
  avatarId,
  page,
  onClose,
}: {
  avatarId: string;
  page: WikiPage;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Load the freshest full page on open (the list row could be stale relative to
  // another teacher's correction). The effective text is the human correction if
  // one exists, otherwise the AI draft.
  const full = useQuery({
    queryKey: ['wikiPage', avatarId, page.slug],
    queryFn: () => api.getWikiPage(avatarId, page.slug),
  });
  const loaded = full.data?.data;
  const serverText = loaded ? (loaded.humanCorrection ?? loaded.content) : (page.humanCorrection ?? page.content);

  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? serverText ?? '';

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return; // re-entry guard
    const text = value.trim();
    if (!text) {
      setError('Content cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.applyCorrection(avatarId, page.slug, text);
      // The correction persists in place and is marked verified — no recompile
      // needed (the page IS the brain; modules derive from page structure, not
      // corrected text). Refresh the list + this page so the badge/text update.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['wikiPages', avatarId] }),
        qc.invalidateQueries({ queryKey: ['wikiPage', avatarId, page.slug] }),
        qc.invalidateQueries({ queryKey: ['classModules'] }),
      ]);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.userMessage : 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-line rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink truncate">{page.title || page.slug}</h3>
            <p className="text-xs text-ink3 mt-0.5">
              Edits are saved as your verified version and override the AI draft.
            </p>
          </div>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-xl leading-none shrink-0" aria-label="Close">
            &times;
          </button>
        </div>

        {full.isLoading ? (
          <p className="text-ink3 text-sm py-8">Loading page…</p>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="flex-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-y font-mono"
          />
        )}

        {error && <p className="text-sm text-bad">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink2 hover:text-ink border border-line bg-panel2 transition"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || full.isLoading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save correction'}
          </button>
        </div>
      </div>
    </div>
  );
}
