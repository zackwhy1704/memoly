'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asArray, ApiError, type KnowledgeFile } from '@/lib/api';
import { extractionState, extractionBadgeClasses } from '@/lib/extraction';
import { pollBrainReady } from '@/lib/upload-pipeline';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0-.6 11.1A2 2 0 0 1 14.4 20H9.6a2 2 0 0 1-2-1.9L7 7m3 3.5v5m4-5v5" />
    </svg>
  );
}

/**
 * Uploaded-files list with per-row Delete (mobile parity: deleteFile → backend
 * recompiles → brain page count + modules refresh). The brain is shared by every
 * student's Mochi in the class, so a delete is destructive and confirmed.
 */
export function FilesPanel({ avatarId }: { avatarId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['classFiles', avatarId],
    queryFn: () => api.files(avatarId),
  });

  const [confirmFile, setConfirmFile] = useState<KnowledgeFile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [brainUpdating, setBrainUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files = asArray<KnowledgeFile>(query.data);

  async function refreshBrainDerived() {
    // Everything downstream of the wiki: the file list, the brain page count on
    // the avatar, the wiki pages themselves, and modules (derived from pages).
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['classFiles', avatarId] }),
      qc.invalidateQueries({ queryKey: ['wikiPages', avatarId] }),
      qc.invalidateQueries({ queryKey: ['avatar', avatarId] }),
      qc.invalidateQueries({ queryKey: ['classModules'] }),
    ]);
  }

  async function handleDelete(f: KnowledgeFile) {
    if (deletingId) return; // re-entry guard — one delete at a time
    setConfirmFile(null);
    setDeletingId(f.id);
    setError(null);
    try {
      await api.deleteFile(avatarId, f.id);
      // Row disappears straight away — don't wait on the recompile for that.
      await qc.invalidateQueries({ queryKey: ['classFiles', avatarId] });
      // Backend fired a debounced recompile on delete. Poll (no extra recompile),
      // then refresh derived data so page count / modules aren't stale.
      setBrainUpdating(true);
      await pollBrainReady(avatarId);
    } catch (e) {
      setError(e instanceof ApiError ? e.userMessage : 'Could not delete this file. Please try again.');
    } finally {
      setDeletingId(null);
      setBrainUpdating(false);
      await refreshBrainDerived();
    }
  }

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
        <h3 className="text-sm font-semibold text-ink">Uploaded files</h3>
        {brainUpdating && (
          <span className="inline-flex items-center gap-1.5 text-xs text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Updating brain…
          </span>
        )}
      </div>

      {error && (
        <div className="px-5 pt-4">
          <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-bad/70 hover:text-bad text-lg leading-none" aria-label="Dismiss">
              &times;
            </button>
          </div>
        </div>
      )}

      {query.isLoading ? (
        <p className="text-ink3 text-sm p-5">Loading files...</p>
      ) : query.error ? (
        <div className="p-4">
          <ErrorView message="Could not load uploaded files." onRetry={() => query.refetch()} />
        </div>
      ) : files.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon="📭"
            title="No content uploaded yet"
            description="Upload teaching material to build this class's knowledge base."
          />
        </div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {files.map((f) => {
              const busy = deletingId === f.id;
              return (
                <tr key={f.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{f.fileName}</td>
                  <td className="px-5 py-3.5 text-ink3 text-xs">{f.pageCount} pages</td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className="px-2 py-1 rounded-full bg-panel2 text-ink2">{f.status}</span>
                    {f.status === 'READY' && (() => {
                      const s = extractionState(f.extractedChars);
                      return (
                        <span className={`ml-2 px-2 py-1 rounded-full ${extractionBadgeClasses(s.tone)}`}>
                          {s.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3.5 text-right w-px">
                    <button
                      onClick={() => setConfirmFile(f)}
                      disabled={busy || !!deletingId}
                      title={`Delete ${f.fileName}`}
                      aria-label={`Delete ${f.fileName}`}
                      className="inline-flex items-center gap-1.5 text-ink3 hover:text-bad transition disabled:opacity-40 disabled:hover:text-ink3"
                    >
                      {busy ? <span className="text-xs">Deleting…</span> : <TrashIcon />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {confirmFile && (
        <ConfirmDeleteDialog
          fileName={confirmFile.fileName}
          onCancel={() => setConfirmFile(null)}
          onConfirm={() => handleDelete(confirmFile)}
        />
      )}
    </div>
  );
}

function ConfirmDeleteDialog({
  fileName,
  onCancel,
  onConfirm,
}: {
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-panel border border-line rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-ink">Delete this file?</h3>
        <p className="text-sm text-ink2">
          Delete <span className="font-semibold text-ink">{fileName}</span>? This removes its
          pages from the class brain and regenerates content for every student.
        </p>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink2 hover:text-ink border border-line bg-panel2 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-bad hover:opacity-90 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
