'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, type Chapter } from '@/lib/api';

/**
 * The ONE place chapter-picking lives. Opened right after a large upload (the
 * picker) AND from the locked-chapter surface (the return loop) — same component,
 * same interaction design mobile mirrors screenshot-for-screenshot:
 *   - chapter list, page counts, none pre-selected
 *   - a live "N of M compiles left this month" counter
 *   - compile-selected + (where allowance permits) compile-all
 *   - a 402 allowance-hit state with a reset framing + upgrade path
 *
 * "Same flow, no bypass" extended to the UI: teacher and student see the identical
 * component; tier differences are only the allowance NUMBER the counter shows.
 */
export default function ChapterPickerModal({
  avatarId,
  onClose,
  onCompiled,
}: {
  avatarId: string;
  onClose: () => void;
  onCompiled?: () => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['chapters', avatarId],
    queryFn: () => api.chapters(avatarId),
  });

  const result = data?.data;
  const chapters: Chapter[] = useMemo(() => result?.chapters ?? [], [result]);
  const locked = useMemo(() => chapters.filter((c) => c.state === 'LOCKED'), [chapters]);

  const limit = result?.allowanceLimit ?? 0;
  const used = result?.allowanceUsed ?? 0;
  const unlimited = limit < 0;
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);

  // BACKGROUND PICK-AND-COMPILE (FIX 3). compileChunk only ENQUEUES — the backend
  // flips PENDING_CHUNK→READY and schedules the debounced recompile; it does NOT
  // block on generation (CompileChunkUseCase). So picking chapters fires the
  // requests and CLOSES the picker IMMEDIATELY — there is nothing for the teacher to
  // wait on. The parent's EXISTING avatar poll then surfaces the non-blocking
  // "compiling…" state and resolves it into modules as they land. Requests run
  // sequentially in the background so a 402 (over-allowance) stops at the first
  // over-limit pick instead of firing N doomed requests; the client also pre-checks
  // the allowance below so a 402 is only ever a cross-session race.
  function startCompile(ids: string[]) {
    if (ids.length === 0) return;
    void (async () => {
      try {
        for (const id of ids) await api.compileChunk(avatarId, id);
      } catch {
        /* allowance/transient — the refreshed counter + poll reflect reality */
      } finally {
        qc.invalidateQueries({ queryKey: ['chapters', avatarId] });
        qc.invalidateQueries({ queryKey: ['wikiPages', avatarId] });
        qc.invalidateQueries({ queryKey: ['avatar', avatarId] }); // wake the poll fast
        onCompiled?.();
      }
    })();
    onClose(); // close immediately — do NOT await generation (the core FIX 3 ask)
  }

  const selectedCount = selected.size;
  const overLimit = !unlimited && selectedCount > remaining;
  const canCompileSelected = selectedCount > 0 && !overLimit;
  const showCompileAll = locked.length >= 2 && (unlimited || remaining >= locked.length);
  // Out of monthly compiles but chapters remain → show the upgrade path proactively
  // (previously only surfaced after a 402; the picker now closes before that fires).
  const allowanceExhausted = !unlimited && remaining === 0 && locked.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            <h3 className="text-base font-bold text-ink">Choose chapters to compile</h3>
            <p className="text-xs text-ink3 mt-0.5">
              Mochi only reads the chapters you pick — start with what you&apos;re teaching now.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink3 hover:text-ink text-xl leading-none shrink-0"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Allowance counter — one source (GET /chapters). */}
        {!isLoading && !isError && (
          <div className="text-xs">
            {unlimited ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 font-semibold text-accent">
                Unlimited chapter compiles
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold border ${
                  remaining === 0
                    ? 'bg-bad/10 border-bad/20 text-bad'
                    : 'bg-panel2 border-line text-ink2'
                }`}
              >
                {remaining} of {limit} compiles left this month
              </span>
            )}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto -mx-1 px-1 flex-1 min-h-[4rem]">
          {isLoading && <p className="text-sm text-ink3 py-6 text-center">Loading chapters…</p>}
          {isError && (
            <p className="text-sm text-bad py-6 text-center">
              Couldn&apos;t load chapters. Please close and try again.
            </p>
          )}
          {!isLoading && !isError && chapters.length === 0 && (
            <p className="text-sm text-ink3 py-6 text-center">No chapters to compile.</p>
          )}
          {!isLoading && !isError && chapters.length > 0 && (
            <ul className="space-y-1.5">
              {chapters.map((c) => {
                const isLocked = c.state === 'LOCKED';
                const checked = selected.has(c.chunkId);
                return (
                  <li key={c.chunkId}>
                    <label
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                        isLocked
                          ? 'border-line bg-panel2 hover:border-accent/40 cursor-pointer'
                          : 'border-line bg-panel opacity-70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!isLocked}
                        checked={checked}
                        onChange={() => toggle(c.chunkId)}
                        className="h-4 w-4 accent-[var(--color-accent)] shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink truncate">{c.title}</span>
                        <span className="block text-[11px] text-ink3">
                          Pages {c.pageFrom}–{c.pageTo} · {c.pageCount} {c.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      </span>
                      <StateBadge state={c.state} />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {allowanceExhausted ? (
          <div className="rounded-xl bg-bad/5 border border-bad/20 p-3 space-y-2">
            <p className="text-sm text-ink">
              You&apos;ve used all {limit} chapter compiles this month.
            </p>
            <p className="text-xs text-ink3">
              Your allowance resets on a rolling 30-day basis — the ones you already compiled are saved.
            </p>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button onClick={onClose} className="text-xs text-ink3 hover:text-ink">
                Close
              </button>
              <Link
                href="/account/billing"
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
              >
                Upgrade for more
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-ink3">
              {overLimit
                ? `Only ${remaining} left — deselect ${selectedCount - remaining} or upgrade.`
                : selectedCount > 0
                  ? `${selectedCount} selected`
                  : 'Select one or more chapters'}
            </p>
            <div className="flex items-center gap-2">
              {showCompileAll && (
                <button
                  onClick={() => startCompile(locked.map((c) => c.chunkId))}
                  className="px-3 py-2 rounded-lg border border-accent/40 text-accent text-sm font-semibold hover:bg-accent/5 transition"
                >
                  Compile all ({locked.length})
                </button>
              )}
              <button
                onClick={() => startCompile([...selected])}
                disabled={!canCompileSelected}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {`Compile selected${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: Chapter['state'] }) {
  if (state === 'COMPILED') {
    return <span className="shrink-0 text-[11px] font-semibold text-ok">✓ Compiled</span>;
  }
  if (state === 'COMPILING') {
    return <span className="shrink-0 text-[11px] font-semibold text-accent">Compiling…</span>;
  }
  return <span className="shrink-0 text-[11px] font-medium text-ink3">Not compiled</span>;
}
