'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api, asArray, ApiError,
  type MarkingReference, type MarkingReferenceKind,
} from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

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
  '✓ Upload 2–3 fully marked exemplars across grade bands (A, C, fail)',
  '✓ Include your rubric / mark scheme',
  '✓ Add a note on what made each one that grade',
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

// ── Upload form ──────────────────────────────────────────────────────────
function UploadForm({ orgId, classId, onDone, onCancel }: {
  orgId: string; classId: string; onDone: () => void; onCancel: () => void;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markingReferences', orgId, classId] }),
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
            <span>indexed: {reference.extractedChars.toLocaleString()} chars</span>
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

// ── Panel root ────────────────────────────────────────────────────────────
export function MarkingAssistantPanel({ orgId, classId }: { orgId: string; classId: string }) {
  const [showUpload, setShowUpload] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const qc = useQueryClient();

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

      {showUpload && (
        <UploadForm
          orgId={orgId}
          classId={classId}
          onCancel={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            qc.invalidateQueries({ queryKey: ['markingReferences', orgId, classId] });
          }}
        />
      )}

      {query.isLoading ? (
        <p className="text-ink3 text-xs py-6">Loading reference material…</p>
      ) : query.error ? (
        <ErrorView message="Could not load your marking references." onRetry={() => query.refetch()} />
      ) : refs.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl">
          <EmptyState
            icon="🎯"
            title="No reference material yet"
            description="Upload your marked papers and rubrics so AI feedback drafts match your marking standard."
            actionLabel="Add reference"
            onAction={() => setShowUpload(true)}
          />
          <div className="border-t border-line px-5 py-4 bg-panel2 rounded-b-2xl">
            <p className="text-xs font-semibold text-ink2 mb-2">What good reference material looks like</p>
            <GuidanceList />
          </div>
        </div>
      ) : (
        <>
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
