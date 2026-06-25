'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, ApiError, type WikiPage } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

/**
 * "Brain pages" — the compiled wiki that drives every student's lessons. This is
 * the web side of the backend's human-correction model.
 *
 * IMPORTANT (verified against the backend): a CLASS corpus avatar is provisioned
 * as kind=CENTRE_CLASS with a classId, and `applyCorrection` is guarded by
 * `assertMaterialMutable`, which throws 403 CENTRE_MATERIAL_READ_ONLY for exactly
 * that shape. So on a class page the wiki is READ-ONLY: the teacher can't edit the
 * correction overlay directly. The sanctioned way to change what students learn is
 * to REGENERATE a page → fresh DRAFT content for the Review tab (explicit, never
 * automatic). For a personal (PERSONAL-kind) avatar the correction editor is live.
 */
export function BrainPagesSection({
  avatarId,
  orgId,
  classId,
}: {
  avatarId: string;
  orgId?: string;
  classId?: string;
}) {
  const pagesQuery = useQuery({
    queryKey: ['wikiPages', avatarId],
    queryFn: () => api.wikiPages(avatarId),
  });
  const avatarQuery = useQuery({
    queryKey: ['avatar', avatarId],
    queryFn: () => api.avatar(avatarId),
  });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const pages = asArray<WikiPage>(pagesQuery.data);
  const kind = avatarQuery.data?.data.kind;
  // Until we know the kind, treat as locked so we never show an editor that 403s.
  const mutable = kind === 'PERSONAL';
  const canRegenerate = !!orgId && !!classId;
  const editingPage = pages.find((p) => p.slug === editingSlug) ?? null;

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line">
        <h3 className="text-sm font-semibold text-ink">Brain pages</h3>
        <p className="text-xs text-ink3 mt-0.5">
          The compiled notes every student&apos;s Mochi teaches from.
        </p>
      </div>

      {!mutable && !avatarQuery.isLoading && (
        <div className="mx-5 mt-4 bg-panel2 border border-line rounded-xl px-4 py-3 text-xs text-ink2">
          Centre class material is managed centrally, so pages are read-only here. To change what
          students learn, open a page and <span className="font-semibold text-ink">regenerate its lessons</span>{' '}
          — that creates a draft for the <span className="font-semibold text-ink">Review</span> tab without
          touching what students currently see.
        </div>
      )}

      {pagesQuery.isLoading ? (
        <p className="text-ink3 text-sm p-5">Loading brain pages…</p>
      ) : pagesQuery.error ? (
        <div className="p-4">
          <ErrorView message="Could not load brain pages." onRetry={() => pagesQuery.refetch()} />
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
                {typeof p.qualityScore === 'number' && (
                  <p className="text-[11px] text-ink3 mt-0.5">Quality {p.qualityScore}/100</p>
                )}
              </div>
              {p.hasConflict && <ConflictMarker />}
              <ReviewStateBadge page={p} />
              <button
                onClick={() => setEditingSlug(p.slug)}
                className="shrink-0 text-xs font-semibold text-accent hover:underline"
              >
                {mutable ? 'View / Edit' : 'View'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editingPage && (
        <WikiPageModal
          avatarId={avatarId}
          orgId={orgId}
          classId={classId}
          page={editingPage}
          mutable={mutable}
          canRegenerate={canRegenerate}
          onClose={() => setEditingSlug(null)}
        />
      )}
    </div>
  );
}

function ConflictMarker() {
  return (
    <span
      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-bad/20 text-bad"
      title="Sources disagree — correcting or regenerating this page will resolve it"
    >
      Conflict
    </span>
  );
}

/** Server-derived confidence label. A human-corrected/verified page reuses the
 *  shipped "Teacher-reviewed" trust marker (don't invent a new label). */
function ReviewStateBadge({ page }: { page: WikiPage }) {
  const verified = page.humanVerified || page.reviewState === 'VERIFIED';
  if (verified) {
    return (
      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-ok/20 text-ok">
        Teacher-reviewed
      </span>
    );
  }
  const map: Record<string, { label: string; cls: string }> = {
    FLAGGED: { label: 'Flagged', cls: 'bg-bad/20 text-bad' },
    LOW_CONFIDENCE: { label: 'Low confidence', cls: 'bg-warn/20 text-warn' },
    UNVERIFIED: { label: 'Unverified', cls: 'bg-panel2 text-ink3' },
  };
  const s = map[page.reviewState ?? 'UNVERIFIED'] ?? map.UNVERIFIED;
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}

function WikiPageModal({
  avatarId,
  orgId,
  classId,
  page,
  mutable,
  canRegenerate,
  onClose,
}: {
  avatarId: string;
  orgId?: string;
  classId?: string;
  page: WikiPage;
  mutable: boolean;
  canRegenerate: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Freshest full page on open (the list row can be stale vs another teacher's edit).
  const full = useQuery({
    queryKey: ['wikiPage', avatarId, page.slug],
    queryFn: () => api.getWikiPage(avatarId, page.slug),
  });
  const loaded = full.data?.data ?? page;
  // Effective content = the human correction overlay if present, else the AI draft.
  const effective = loaded.humanCorrection ?? loaded.content ?? '';

  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? effective;

  // readOnly can flip on at runtime if a save is rejected by assertMaterialMutable.
  const [lockedReason, setLockedReason] = useState<string | null>(null);
  const readOnly = !mutable || !!lockedReason;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedVerified, setSavedVerified] = useState(false);

  // Regenerate (propagation) — explicit teacher choice; creates DRAFT for Review.
  const [showGuidance, setShowGuidance] = useState(false);
  const [guidance, setGuidance] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [regenDone, setRegenDone] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  async function saveCorrection() {
    if (saving || readOnly) return; // re-entry + read-only guard
    const text = value.trim();
    if (!text) {
      setError('Content cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.applyCorrection(avatarId, page.slug, text);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['wikiPages', avatarId] }),
        qc.invalidateQueries({ queryKey: ['wikiPage', avatarId, page.slug] }),
        qc.invalidateQueries({ queryKey: ['classModules'] }),
      ]);
      setSavedVerified(true); // show the propagation notice, keep modal open
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        // Material is centre-locked — degrade to read-only with the reason.
        setLockedReason(e.userMessage || 'This material is read-only.');
      } else {
        setError(e instanceof ApiError ? e.userMessage : 'Could not save your changes. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (regenerating || !canRegenerate || !orgId || !classId) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      await api.regenerateContent(orgId, classId, page.slug, guidance.trim() || undefined);
      setRegenDone(true);
    } catch (e) {
      setRegenError(e instanceof ApiError ? e.userMessage : 'Could not regenerate. Please try again.');
    } finally {
      setRegenerating(false);
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
              {readOnly
                ? 'Read-only — regenerate to create a reviewable draft.'
                : 'Edits are saved as your verified version and override the AI draft.'}
            </p>
          </div>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-xl leading-none shrink-0" aria-label="Close">
            &times;
          </button>
        </div>

        {/* Read-only context */}
        <PageContext page={loaded} />

        {lockedReason && (
          <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-2.5 text-xs text-warn">
            {lockedReason}
          </div>
        )}

        {full.isLoading ? (
          <p className="text-ink3 text-sm py-8">Loading page…</p>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            readOnly={readOnly}
            rows={14}
            className={`flex-1 w-full px-3 py-2 rounded-lg border border-line text-ink text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-y font-mono ${
              readOnly ? 'bg-panel2/60 text-ink2' : 'bg-panel2'
            }`}
          />
        )}

        {error && <p className="text-sm text-bad">{error}</p>}

        {/* Propagation notice after a successful correction (mutable case) */}
        {savedVerified && (
          <div className="bg-ok/10 border border-ok/30 rounded-xl px-4 py-3 text-sm text-ok">
            Correction saved and the page is now teacher-reviewed. Students still see the previously
            generated lessons until you regenerate.
          </div>
        )}

        {/* Regenerate (propagation) */}
        {canRegenerate && (
          <div className="border-t border-line pt-4 space-y-2">
            {regenDone ? (
              <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm text-ink2">
                Draft created — review &amp; approve it in the <span className="font-semibold text-ink">Review</span> tab.
                Student-facing lessons are unchanged until you approve it.
              </div>
            ) : (
              <>
                {showGuidance && (
                  <input
                    value={guidance}
                    onChange={(e) => setGuidance(e.target.value)}
                    placeholder="Optional guidance for the regeneration (e.g. 'use simpler examples')"
                    className="w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                )}
                {regenError && <p className="text-sm text-bad">{regenError}</p>}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setShowGuidance((s) => !s)}
                    className="text-xs text-ink3 hover:text-ink2"
                  >
                    {showGuidance ? 'Hide guidance' : 'Add guidance'}
                  </button>
                  <button
                    onClick={regenerate}
                    disabled={regenerating}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:opacity-90 transition disabled:opacity-50"
                  >
                    {regenerating ? 'Regenerating…' : 'Regenerate lessons from this page'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink2 hover:text-ink border border-line bg-panel2 transition"
          >
            Close
          </button>
          {!readOnly && !savedVerified && (
            <button
              onClick={saveCorrection}
              disabled={saving || full.isLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save correction'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Read-only context the backend already derives — sources, confidence, prereqs. */
function PageContext({ page }: { page: WikiPage }) {
  const sources = page.sourceFileNames ?? [];
  const prereqs = page.prerequisiteSlugs ?? [];
  const note = page.conflictNote || page.flagNote;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink3">
        {page.certainty && <span>Certainty: <span className="text-ink2">{String(page.certainty).toLowerCase()}</span></span>}
        {typeof page.qualityScore === 'number' && <span>Quality: <span className="text-ink2">{page.qualityScore}/100</span></span>}
        {typeof page.quizUseCount === 'number' && <span>Used in {page.quizUseCount} quiz item(s)</span>}
      </div>
      {sources.length > 0 && (
        <p className="text-ink3">From: <span className="text-ink2">{sources.join(', ')}</span></p>
      )}
      {prereqs.length > 0 && (
        <p className="text-ink3">Prerequisites: <span className="text-ink2">{prereqs.join(', ')}</span></p>
      )}
      {note && (
        <p className="text-bad bg-bad/10 border border-bad/20 rounded-lg px-3 py-2">{note}</p>
      )}
    </div>
  );
}
