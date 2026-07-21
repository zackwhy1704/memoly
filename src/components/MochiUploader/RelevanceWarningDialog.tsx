'use client';

/**
 * Mirrors the mobile app's PallyRelevanceWarningDialog
 * (lib/core/ui/pally_relevance_warning_dialog.dart): amber warning icon, the
 * same title/body copy, and the same two-button "Go Back" / "Add Anyway"
 * resolution. Shown when the SERVER's full-text relevance check (distinct from
 * the client's ~30-char pre-check in upload-pipeline.ts) rejects a file — see
 * the 'relevanceWarning' FileStage in upload-pipeline.ts.
 *
 * Applies uniformly to every caller of MochiUploader (personal Mochi + centre
 * class uploads) — this is the SAME shared upload pipeline on web, so there is
 * no centre-vs-solo gate here (unlike mobile, which only exposes user-initiated
 * upload on the personal flow).
 */
export default function RelevanceWarningDialog({
  subject,
  reason,
  onGoBack,
  onAddAnyway,
}: {
  subject: string;
  reason?: string;
  onGoBack: () => void;
  onAddAnyway: () => void;
}) {
  const body =
    reason ??
    `This file doesn't seem to match "${subject}". Your tutor works best with notes from that subject.`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Relevance warning"
    >
      <div className="bg-panel border border-line rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-warn/15 flex items-center justify-center mb-4 shrink-0">
          <span className="text-4xl" aria-hidden="true">&#9888;</span>
        </div>
        <h2 className="text-lg font-bold text-ink">Hmm, this might not fit!</h2>
        <p className="text-sm text-ink2 mt-2">{body}</p>
        <div className="flex gap-3 mt-6 w-full">
          <button
            onClick={onGoBack}
            className="flex-1 px-4 py-2 rounded-lg border border-line text-ink2 text-sm font-medium hover:bg-panel2 transition"
          >
            Go Back
          </button>
          <button
            onClick={onAddAnyway}
            className="flex-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Add Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
