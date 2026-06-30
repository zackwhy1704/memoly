'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api, asArray, parseAiDraft, ApiError,
  type Submission, type SubmissionStatus, type SubmissionFileMeta,
  type ClassRosterStudent,
} from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { MarkingAssistantPanel } from './MarkingAssistantPanel';

// ── Status presentation ─────────────────────────────────────────────────
const STATUS_LABEL: Record<SubmissionStatus, string> = {
  SUBMITTED: 'New',
  AI_DRAFTED: 'AI drafted',
  TEACHER_REVIEWING: 'Reviewing',
  RELEASED: 'Released',
  RETURNED: 'Returned',
};
const STATUS_STYLE: Record<SubmissionStatus, string> = {
  SUBMITTED: 'bg-amber-900/40 text-amber-300',
  AI_DRAFTED: 'bg-blue-900/40 text-blue-300',
  TEACHER_REVIEWING: 'bg-purple-900/40 text-purple-300',
  RELEASED: 'bg-ok/20 text-ok',
  RETURNED: 'bg-pink-900/40 text-pink-300',
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

type FilterKey = 'all' | 'to_mark' | 'in_review' | 'released';
const FILTERS: Array<{ key: FilterKey; label: string; match: (s: SubmissionStatus) => boolean }> = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'to_mark', label: 'Needs marking', match: (s) => s === 'SUBMITTED' || s === 'RETURNED' },
  { key: 'in_review', label: 'In review', match: (s) => s === 'AI_DRAFTED' || s === 'TEACHER_REVIEWING' },
  { key: 'released', label: 'Released', match: (s) => s === 'RELEASED' },
];

// ── Bearer-fetched artifact preview ─────────────────────────────────────
function FilePreview({ orgId, classId, submissionId, file }: {
  orgId: string; classId: string; submissionId: string; file: SubmissionFileMeta;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Keyed by file.index with a stable submissionId, so this runs once on mount;
    // initial state (null url, no error) already shows the loading placeholder.
    let active = true;
    let objectUrl: string | null = null;
    api.submissionFileUrl(orgId, classId, submissionId, file.index)
      .then((u) => {
        if (!active) { URL.revokeObjectURL(u); return; }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orgId, classId, submissionId, file.index]);

  const isImage = file.contentType.startsWith('image/');
  const isPdf = file.contentType === 'application/pdf';

  return (
    <div className="rounded-xl border border-line overflow-hidden bg-panel2">
      <div className="flex items-center justify-between px-3 py-2 text-xs text-ink3 border-b border-line">
        <span className="truncate">{file.name}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline shrink-0 ml-2">
            Open ↗
          </a>
        )}
      </div>
      {error ? (
        <p className="px-3 py-6 text-xs text-bad text-center">Couldn&apos;t load this file.</p>
      ) : !url ? (
        <p className="px-3 py-6 text-xs text-ink3 text-center">Loading preview…</p>
      ) : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full max-h-[480px] object-contain bg-black/20" />
      ) : isPdf ? (
        <iframe src={url} title={file.name} className="w-full h-[480px] bg-white" />
      ) : (
        <p className="px-3 py-6 text-xs text-ink3 text-center">
          No inline preview — use Open ↗ to view.
        </p>
      )}
    </div>
  );
}

// ── Upload-for-student form ──────────────────────────────────────────────
function UploadForm({ orgId, classId, onDone, onCancel }: {
  orgId: string; classId: string; onDone: () => void; onCancel: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const roster = useQuery({
    queryKey: ['classRoster', orgId, classId],
    queryFn: () => api.classRoster(orgId, classId),
  });

  const mut = useMutation({
    mutationFn: () => api.uploadSubmission(orgId, classId, {
      title: title.trim(),
      subject: subject.trim() || undefined,
      studentId: studentId || undefined,
      files,
    }),
    onSuccess: onDone,
  });

  const students = asArray<ClassRosterStudent>(roster.data?.data);
  const canSubmit = title.trim().length > 0 && files.length > 0 && !mut.isPending;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Upload homework</h3>
        <button onClick={onCancel} className="text-ink3 hover:text-ink text-sm">✕</button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">Student <span className="text-ink3">(optional)</span></label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink"
        >
          <option value="">Unassigned</option>
          {students.map((s) => (
            <option key={s.userId} value={s.userId}>{s.displayName || s.userId.slice(0, 8)}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">Title <span className="text-bad">*</span></label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Maths Worksheet 3"
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">Subject <span className="text-ink3">(optional)</span></label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Maths"
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
          {mut.isPending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

// ── Detail / marking panel ────────────────────────────────────────────────
function DetailPanel({ orgId, classId, submissionId }: {
  orgId: string; classId: string; submissionId: string;
}) {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [showReturn, setShowReturn] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  // Track which submission we've hydrated the editor from, so we don't clobber
  // the teacher's in-progress edits on every background refetch.
  const hydratedFor = useRef<string | null>(null);

  const detail = useQuery({
    queryKey: ['submission', orgId, classId, submissionId],
    queryFn: () => api.submission(orgId, classId, submissionId),
  });

  const s: Submission | undefined = detail.data?.data;

  useEffect(() => {
    if (!s) return;
    if (hydratedFor.current === s.id) return;
    hydratedFor.current = s.id;
    const draft = parseAiDraft(s.aiDraftFeedbackJson);
    setFeedback(s.teacherFeedback ?? draft?.feedback ?? '');
    setGrade(s.teacherGrade ?? draft?.suggestedGrade ?? '');
  }, [s]);

  const refresh = (updated?: Submission) => {
    if (updated) qc.setQueryData(['submission', orgId, classId, submissionId], { data: updated });
    qc.invalidateQueries({ queryKey: ['submissions', orgId, classId] });
  };

  const draftMut = useMutation({
    mutationFn: () => api.generateSubmissionDraft(orgId, classId, submissionId),
    onSuccess: (res) => {
      const draft = parseAiDraft(res.data.aiDraftFeedbackJson);
      // Prefill the editor from the fresh AI draft (teacher then edits).
      if (draft?.feedback) setFeedback((f) => f.trim() ? f : draft.feedback!);
      if (draft?.suggestedGrade) setGrade((g) => g.trim() ? g : draft.suggestedGrade!);
      refresh(res.data);
    },
  });

  const saveMut = useMutation({
    mutationFn: () => api.saveSubmissionReview(orgId, classId, submissionId, feedback, grade),
    onSuccess: (res) => refresh(res.data),
  });

  const releaseMut = useMutation({
    mutationFn: () => api.releaseSubmission(orgId, classId, submissionId, { feedback, grade }),
    onSuccess: (res) => refresh(res.data),
  });

  const returnMut = useMutation({
    mutationFn: () => api.returnSubmission(orgId, classId, submissionId, returnNote.trim() || undefined),
    onSuccess: (res) => { setShowReturn(false); setReturnNote(''); refresh(res.data); },
  });

  if (detail.isLoading) return <p className="px-5 py-4 text-ink3 text-xs">Loading submission…</p>;
  if (detail.error || !s) {
    return <div className="px-5 py-4"><ErrorView message="Could not load this submission." onRetry={() => detail.refetch()} /></div>;
  }

  const draft = parseAiDraft(s.aiDraftFeedbackJson);
  const released = s.status === 'RELEASED';
  const canRelease = feedback.trim().length > 0 && !released;
  const busy = draftMut.isPending || saveMut.isPending || releaseMut.isPending || returnMut.isPending;

  return (
    <div className="border-t border-line px-5 py-4 space-y-5">
      {/* Artifacts */}
      <div className="space-y-3">
        {s.files.map((f) => (
          <FilePreview key={f.index} orgId={orgId} classId={classId} submissionId={s.id} file={f} />
        ))}
      </div>

      {/* OCR'd text */}
      {s.extractedText && s.extractedText.trim() && (
        <div>
          <button onClick={() => setShowOcr((v) => !v)} className="text-xs font-semibold text-ink2 hover:text-ink">
            {showOcr ? '▼' : '▶'} Extracted text
          </button>
          {showOcr && (
            <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-panel2 border border-line p-3 text-xs text-ink2 whitespace-pre-wrap font-sans">
              {s.extractedText}
            </pre>
          )}
        </div>
      )}

      {/* AI draft */}
      {released ? (
        <div className="rounded-xl bg-ok/10 border border-ok/30 px-4 py-3 text-xs text-ink2">
          Released to the student{s.releasedAt ? ` on ${new Date(s.releasedAt).toLocaleString()}` : ''}.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => draftMut.mutate()}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-panel2 border border-line text-xs font-semibold text-ink hover:bg-line disabled:opacity-40"
            >
              {draftMut.isPending ? 'Generating…' : draft ? 'Regenerate AI draft' : '✨ Generate AI draft'}
            </button>
            <span className="text-[11px] text-ink3">AI suggests — you decide what the student sees.</span>
          </div>

          {draftMut.isError && (
            <p className="text-xs text-bad">
              {draftMut.error instanceof ApiError ? draftMut.error.userMessage : 'Could not generate a draft.'}{' '}
              You can still mark this manually.
            </p>
          )}

          {draft && (draft.criteria?.length || draft.suggestedGrade) && (
            <div className="rounded-xl bg-blue-900/15 border border-blue-900/30 px-4 py-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">AI first-pass (draft)</p>
              {draft.suggestedGrade && (
                <p className="text-xs text-ink2">Suggested grade: <span className="font-semibold text-ink">{draft.suggestedGrade}</span></p>
              )}
              {draft.criteria?.map((c, i) => (
                <p key={i} className="text-xs text-ink2"><span className="font-medium text-ink">{c.criterion}:</span> {c.comment}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teacher feedback editor */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink2">
            Feedback to student {!released && <span className="text-bad">*</span>}
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            readOnly={released}
            rows={5}
            placeholder="Write the feedback the student will read…"
            className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 read-only:opacity-70"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink2">Grade <span className="text-ink3">(optional)</span></label>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            readOnly={released}
            placeholder="e.g. B+ or 17/25"
            className="w-full max-w-[200px] px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 read-only:opacity-70"
          />
        </div>

        {(saveMut.isError || releaseMut.isError) && (() => {
          const err = releaseMut.error ?? saveMut.error;
          return (
            <p className="text-xs text-bad">
              {err instanceof ApiError ? err.userMessage : 'Something went wrong. Please try again.'}
            </p>
          );
        })()}

        {!released && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => saveMut.mutate()}
              disabled={busy || feedback.trim().length === 0}
              className="px-4 py-2 rounded-lg border border-line text-ink2 text-xs font-semibold hover:bg-panel2 disabled:opacity-40"
            >
              {saveMut.isPending ? 'Saving…' : 'Save draft'}
            </button>
            <button
              onClick={() => releaseMut.mutate()}
              disabled={busy || !canRelease}
              title={canRelease ? undefined : 'Add feedback before releasing'}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40"
            >
              {releaseMut.isPending ? 'Releasing…' : 'Release to student'}
            </button>
            <button
              onClick={() => setShowReturn((v) => !v)}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-bad text-xs font-semibold hover:bg-bad/10 disabled:opacity-40"
            >
              Return for redo
            </button>
          </div>
        )}

        {showReturn && !released && (
          <div className="rounded-xl border border-line bg-panel2 p-3 space-y-2">
            <textarea
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              rows={2}
              placeholder="Optional note for the student (why it's coming back)…"
              className="w-full px-3 py-2 rounded-lg bg-panel border border-line text-sm text-ink placeholder:text-ink3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReturn(false)} className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs hover:bg-panel">Cancel</button>
              <button
                onClick={() => returnMut.mutate()}
                disabled={returnMut.isPending}
                className="px-3 py-1.5 rounded-lg bg-bad text-white text-xs font-semibold hover:bg-bad/90 disabled:opacity-40"
              >
                {returnMut.isPending ? 'Returning…' : 'Confirm return'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab root ──────────────────────────────────────────────────────────────
export function SubmissionsTab({ orgId, classId }: { orgId: string; classId: string }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['submissions', orgId, classId],
    queryFn: () => api.submissions(orgId, classId),
  });

  const all = useMemo(() => asArray<Submission>(query.data?.data), [query.data]);
  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const visible = all.filter((s) => activeFilter.match(s.status));
  const toMarkCount = all.filter((s) => s.status === 'SUBMITTED' || s.status === 'RETURNED').length;

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading submissions…</p>;
  if (query.error) return <ErrorView message="Could not load submissions." onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink2">
          {all.length} submission{all.length !== 1 ? 's' : ''}
          {toMarkCount > 0 && <span className="text-amber-300"> · {toMarkCount} need marking</span>}
        </p>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition"
        >
          + Upload homework
        </button>
      </div>

      <details className="bg-panel2/50 border border-line rounded-2xl group">
        <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-ink2 hover:text-ink list-none flex items-center gap-2">
          <span className="text-ink3 text-xs transition-transform group-open:rotate-90">▶</span>
          🎯 Marking assistant — train AI feedback on YOUR standard
        </summary>
        <div className="px-5 pb-5 pt-1">
          <MarkingAssistantPanel orgId={orgId} classId={classId} />
        </div>
      </details>

      {showUpload && (
        <UploadForm
          orgId={orgId}
          classId={classId}
          onCancel={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            qc.invalidateQueries({ queryKey: ['submissions', orgId, classId] });
          }}
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? all.length : all.filter((s) => f.match(s.status)).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f.key ? 'bg-accent text-white' : 'bg-panel2 text-ink3 hover:text-ink2'
              }`}
            >
              {f.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="📥"
          title={all.length === 0 ? 'No submissions yet' : 'Nothing in this view'}
          description={all.length === 0
            ? 'When a student uploads homework — or you upload it for them — it lands here to mark.'
            : 'Try a different filter.'}
          {...(all.length === 0 ? { actionLabel: 'Upload homework', onAction: () => setShowUpload(true) } : {})}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <div key={s.id} className="bg-panel border border-line rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-panel2/50 transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink truncate">{s.title}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink3">
                    {s.subject && <span>{s.subject}</span>}
                    <span>{s.files.length} file{s.files.length !== 1 ? 's' : ''}</span>
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="text-ink3 text-xs">{expandedId === s.id ? '▲' : '▼'}</span>
              </button>
              {expandedId === s.id && (
                <DetailPanel orgId={orgId} classId={classId} submissionId={s.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
