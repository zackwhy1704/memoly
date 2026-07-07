'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api, asArray, ApiError,
  type MarkingReference, type MarkingReferenceKind, type MarkingBrain,
} from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { useOrg } from '@/lib/org-context';
import { QualityBadge, extractionBadge, confidenceBadge, NOTES_TIPS_HREF } from '@/components/QualityBadge';
import { MarkingWorkedExample } from './MarkingWorkedExample';
import { MarkingCorrectionsSection } from './MarkingCorrections';

// ── Kind presentation ───────────────────────────────────────────────────
const KIND_LABEL: Record<MarkingReferenceKind, string> = {
  MARKED_PAPER: 'Marked paper',
  RUBRIC: 'Rubric',
  GUIDELINE: 'Guideline',
};
const KIND_STYLE: Record<MarkingReferenceKind, string> = {
  MARKED_PAPER: 'bg-purple-900/40 text-purple-300',
  RUBRIC: 'bg-blue-900/40 text-blue-300',
  GUIDELINE: 'bg-teal-900/40 text-teal-300',
};
const KIND_OPTIONS: MarkingReferenceKind[] = ['MARKED_PAPER', 'RUBRIC', 'GUIDELINE'];

function KindBadge({ kind }: { kind: MarkingReferenceKind }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${KIND_STYLE[kind]}`}>
      {KIND_LABEL[kind]}
    </span>
  );
}

// ── What-good-looks-like checklist (Phase C guidance) ────────────────────
const CHECKLIST = [
  '✓ Marked exemplars teach the most — include your ticks, marks per line, and the final grade',
  '✓ State the grade you gave each exemplar (the AI anchors to it)',
  '✓ Upload 2–3 marked exemplars across grade bands (A, C, fail)',
  '✓ Include your rubric / mark scheme — a typed rubric beats a photo of one',
  '✓ The more you add, the closer AI drafts match your marking',
];

function GuidanceList() {
  return (
    <ul className="space-y-1.5 text-left">
      {CHECKLIST.map((line) => (
        <li key={line} className="text-xs text-ink2">{line}</li>
      ))}
    </ul>
  );
}

// ── Shared-scope copy ─────────────────────────────────────────────────────
// The marking standard is one brain per (org, subject) — shared across ALL of
// the org's classes of that subject. The panel is mounted per-class, so make
// that sharing explicit (removes a surprise; no behavioural change).
function scopeCopy(centreName: string, subject: string | null) {
  const subj = subject?.trim() || null;
  return {
    subjName: subj ?? 'this subject',
    // "all your Maths classes" vs "all your classes of this subject"
    sharedScope: subj ? `all your ${subj} classes` : 'all your classes of this subject',
    everyClass: subj ? `every ${subj} class` : 'every class of this subject',
    centre: centreName?.trim() || 'your centre',
  };
}

function ScopeBanner({ centreName, subject }: { centreName: string; subject: string | null }) {
  const c = scopeCopy(centreName, subject);
  return (
    <div className="rounded-2xl bg-accent/5 border border-accent/20 px-4 py-3 flex items-start gap-3">
      <span className="text-lg leading-none">🏫</span>
      <p className="text-xs text-ink2 leading-relaxed">
        You&apos;re training <span className="font-semibold text-ink">{c.centre}&apos;s {c.subjName} marking
        standard</span>. It&apos;s shared across {c.sharedScope} — uploading here improves marking for{' '}
        {c.everyClass} in your centre.
      </p>
    </div>
  );
}

// ── Upload form ──────────────────────────────────────────────────────────
function UploadForm({ orgId, classId, centreName, subject, onDone, onCancel }: {
  orgId: string; classId: string; centreName: string; subject: string | null;
  onDone: () => void; onCancel: () => void;
}) {
  const [kind, setKind] = useState<MarkingReferenceKind>('MARKED_PAPER');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: () => api.uploadMarkingReference(orgId, classId, {
      kind,
      title: title.trim(),
      note: note.trim() || undefined,
      files,
    }),
    onSuccess: onDone,
  });

  const canSubmit = title.trim().length > 0 && files.length > 0 && !mut.isPending;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Add reference material</h3>
        <button onClick={onCancel} className="text-ink3 hover:text-ink text-sm">✕</button>
      </div>

      <p className="text-xs text-ink3 -mt-1">
        Trains {scopeCopy(centreName, subject).centre}&apos;s shared{' '}
        {scopeCopy(centreName, subject).subjName} marking standard ({scopeCopy(centreName, subject).sharedScope}).
      </p>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">Type <span className="text-bad">*</span></label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as MarkingReferenceKind)}
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">Title <span className="text-bad">*</span></label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 2024 Paper 1 — A-grade exemplar"
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">Note <span className="text-ink3">(optional)</span></label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. A-grade exemplar — full marks on structure"
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">Files <span className="text-bad">*</span></label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-xs text-ink2 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-panel2 file:text-ink2 file:text-xs hover:file:bg-line"
        />
        {files.length > 0 && (
          <p className="text-xs text-ink3">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
        )}
      </div>

      {mut.isError && (
        <p className="text-xs text-bad">
          {mut.error instanceof ApiError ? mut.error.userMessage : 'Upload failed. Please try again.'}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={mut.isPending} className="px-4 py-2 rounded-lg border border-line text-ink2 text-xs hover:bg-panel2 disabled:opacity-40">
          Cancel
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={!canSubmit}
          className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40"
        >
          {mut.isPending ? 'Uploading…' : 'Add reference'}
        </button>
      </div>
    </div>
  );
}

// ── Reference card ────────────────────────────────────────────────────────
function ReferenceCard({ orgId, classId, reference }: {
  orgId: string; classId: string; reference: MarkingReference;
}) {
  const qc = useQueryClient();

  const delMut = useMutation({
    mutationFn: () => api.deleteMarkingReference(orgId, classId, reference.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['markingReferences', orgId, classId] });
      qc.invalidateQueries({ queryKey: ['markingBrain', orgId, classId] });
    },
  });

  function confirmDelete() {
    if (delMut.isPending) return;
    if (window.confirm(`Delete "${reference.title}"? This removes it from your marking assistant.`)) {
      delMut.mutate();
    }
  }

  return (
    <div className="bg-panel border border-line rounded-2xl px-5 py-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-ink truncate">{reference.title}</span>
            <KindBadge kind={reference.kind} />
          </div>
          {reference.note && <p className="text-xs text-ink2">{reference.note}</p>}
          <div className="flex items-center gap-3 text-xs text-ink3 mt-1 flex-wrap">
            <span>{reference.files.length} file{reference.files.length !== 1 ? 's' : ''}</span>
            <QualityBadge {...extractionBadge(reference.extractedChars)} tipsHref={NOTES_TIPS_HREF} />
            <span>{new Date(reference.createdAt).toLocaleDateString()}</span>
          </div>
          {reference.files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {reference.files.map((f) => (
                <li key={f.index} className="text-xs text-ink3 truncate">📄 {f.name}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={confirmDelete}
          disabled={delMut.isPending}
          className="px-3 py-1.5 rounded-lg text-bad text-xs font-semibold hover:bg-bad/10 disabled:opacity-40 shrink-0"
        >
          {delMut.isPending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
      {delMut.isError && (
        <p className="text-xs text-bad">
          {delMut.error instanceof ApiError ? delMut.error.userMessage : 'Could not delete. Please try again.'}
        </p>
      )}
    </div>
  );
}

// ── Learned marking standard (compiled brain) ────────────────────────────
const BRAIN_STATE_LABEL: Record<MarkingBrain['state'], string> = {
  NOT_BUILT: 'Not built yet',
  COMPILING: 'Learning…',
  PENDING_RECOMPILE: 'Updating…',
  READY: 'Ready',
};
const BRAIN_STATE_STYLE: Record<MarkingBrain['state'], string> = {
  NOT_BUILT: 'bg-panel2 text-ink3',
  COMPILING: 'bg-amber-900/40 text-amber-300',
  PENDING_RECOMPILE: 'bg-amber-900/40 text-amber-300',
  READY: 'bg-teal-900/40 text-teal-300',
};

/**
 * Shows the COMPILED marking standard the assistant has learned — mirroring how
 * the student brain shows its wiki pages — so uploads visibly turn into a
 * structured standard, not vanish into a blob. Polls while compiling.
 */
function MarkingBrainSection({ orgId, classId, centreName, subject }: {
  orgId: string; classId: string; centreName: string; subject: string | null;
}) {
  const query = useQuery({
    queryKey: ['markingBrain', orgId, classId],
    queryFn: () => api.markingBrain(orgId, classId),
    refetchInterval: (q) => {
      const s = (q.state.data as { data?: MarkingBrain } | undefined)?.data?.state;
      return s === 'COMPILING' || s === 'PENDING_RECOMPILE' ? 4000 : false;
    },
  });

  const brain = query.data?.data;
  // Nothing compiled yet → the references empty-state already guides the teacher.
  if (!brain || (brain.state === 'NOT_BUILT' && brain.pageCount === 0)) return null;

  // Prefer the class's subject; fall back to the compiled brain's subject.
  const c = scopeCopy(centreName, subject ?? brain.subject ?? null);

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-ink">🧠 What your assistant has learned</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${BRAIN_STATE_STYLE[brain.state]}`}>
          {BRAIN_STATE_LABEL[brain.state]}
        </span>
      </div>
      <p className="text-[11px] text-ink3 -mt-1">Shared {c.subjName} marking standard for {c.centre}.</p>
      <p className="text-xs text-ink2">
        AI feedback drafts are graded against these {brain.pageCount} marking rule
        {brain.pageCount !== 1 ? 's' : ''}, learned from your uploads.
      </p>

      {brain.hasConflicts && (
        <div className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-3 py-2 text-xs text-amber-200">
          ⚠️ Some of your marking materials contradict each other — review the flagged rules below.
        </div>
      )}

      {brain.state === 'COMPILING' && brain.pageCount === 0 ? (
        <p className="text-xs text-ink3 py-2">Reading your marking materials…</p>
      ) : (
        <ul className="space-y-2">
          {brain.pages.map((p) => (
            <li key={p.slug} className="rounded-lg bg-panel2 border border-line px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-ink">{p.title}</span>
                <QualityBadge {...confidenceBadge(p.certaintyScore, p.certainty)} />
                {p.hasConflict && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-300">
                    conflict
                  </span>
                )}
              </div>
              {p.preview && <p className="text-xs text-ink3 mt-1 line-clamp-2">{p.preview}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Panel root ────────────────────────────────────────────────────────────
export function MarkingAssistantPanel({ orgId, classId, subject }: {
  orgId: string; classId: string; subject?: string | null;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const qc = useQueryClient();
  const centreName = useOrg()?.orgName?.trim() || 'your centre';
  const subj = subject ?? null;

  const query = useQuery({
    queryKey: ['markingReferences', orgId, classId],
    queryFn: () => api.markingReferences(orgId, classId),
  });

  const refs = asArray<MarkingReference>(query.data?.data);
  const grouped = KIND_OPTIONS
    .map((k) => ({ kind: k, items: refs.filter((r) => r.kind === k) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ink">🎯 Marking assistant</h3>
          <p className="text-xs text-ink2 mt-0.5">
            Train your marking assistant — upload your past marked papers and rubrics so AI feedback
            drafts match YOUR standard.
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition shrink-0"
        >
          + Add reference
        </button>
      </div>

      <ScopeBanner centreName={centreName} subject={subj} />

      {showUpload && (
        <UploadForm
          orgId={orgId}
          classId={classId}
          centreName={centreName}
          subject={subj}
          onCancel={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            setJustAdded(true);
            qc.invalidateQueries({ queryKey: ['markingReferences', orgId, classId] });
            // New material was just compiled into the marking brain — refresh it.
            qc.invalidateQueries({ queryKey: ['markingBrain', orgId, classId] });
          }}
        />
      )}

      {/* Success + progress cue right after an upload — the marking flow's
          equivalent of the student's "Brain updated!" screen. */}
      {justAdded && (
        <div className="rounded-2xl bg-teal-900/25 border border-teal-700/50 px-4 py-3 flex items-start gap-3">
          <span className="text-lg leading-none">✓</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-teal-200">Reference added — your assistant is learning your standard</p>
            <p className="text-xs text-teal-200/80 mt-0.5">
              This takes a moment. Once it&apos;s ready, open a submission below and tap
              <span className="font-semibold"> Generate AI draft</span> — it&apos;ll draft feedback in your marking style.
            </p>
          </div>
          <button onClick={() => setJustAdded(false)} className="text-teal-200/60 hover:text-teal-200 text-sm shrink-0">✕</button>
        </div>
      )}

      <MarkingBrainSection orgId={orgId} classId={classId} centreName={centreName} subject={subj} />

      <MarkingCorrectionsSection orgId={orgId} classId={classId} />

      {query.isLoading ? (
        <p className="text-ink3 text-xs py-6">Loading reference material…</p>
      ) : query.error ? (
        <ErrorView message="Could not load your marking references." onRetry={() => query.refetch()} />
      ) : refs.length === 0 ? (
        // Progressive disclosure: teach the mental model FIRST (worked example),
        // then ask for ONE upload, then demote the tips to a secondary expander.
        <div className="space-y-4">
          <MarkingWorkedExample onStart={() => setShowUpload(true)} />
          <div className="bg-panel border border-line rounded-2xl">
            <EmptyState
              icon="🎯"
              title="Upload one marked paper to start"
              description="Add a marked paper or rubric so AI feedback drafts match your marking standard. Start with just one — you can add more anytime."
              actionLabel="Upload a marked paper"
              onAction={() => setShowUpload(true)}
            />
            <div className="border-t border-line px-5 py-4 bg-panel2 rounded-b-2xl">
              <button
                onClick={() => setShowTips((v) => !v)}
                className="text-xs font-semibold text-ink2 hover:text-ink"
              >
                {showTips ? '▼' : '▶'} What makes a great exemplar
              </button>
              {showTips && (
                <div className="mt-2">
                  <GuidanceList />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Next step — close the feedback loop: point the teacher from
              "trained" to actually grading with it. */}
          <div className="rounded-xl bg-accent/5 border border-accent/20 px-4 py-3">
            <p className="text-xs text-ink2 leading-relaxed">
              <span className="font-semibold text-ink">Next step:</span> your assistant is trained on{' '}
              {refs.length} reference{refs.length !== 1 ? 's' : ''}. Open a student submission in the list
              below and tap <span className="font-semibold">Generate AI draft</span> — it drafts feedback in
              your marking style. Add more marked exemplars across grade bands anytime to sharpen it.
            </p>
          </div>

          <div className="rounded-xl bg-panel2 border border-line px-4 py-3">
            <button
              onClick={() => setShowTips((v) => !v)}
              className="text-xs font-semibold text-ink2 hover:text-ink"
            >
              {showTips ? '▼' : '▶'} Friendly reminders — what makes a great marking assistant
            </button>
            {showTips && (
              <div className="mt-3">
                <GuidanceList />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.kind} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink3">
                  {KIND_LABEL[g.kind]} ({g.items.length})
                </p>
                {g.items.map((r) => (
                  <ReferenceCard key={r.id} orgId={orgId} classId={classId} reference={r} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
