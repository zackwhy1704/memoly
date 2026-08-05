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
import { useTranslation } from '@/lib/messages';
import type { MessageKey } from '@/lib/messages/en';
import { MarkingAssistantPanel } from './MarkingAssistantPanel';
import { StudentWeaknessPanel } from './StudentWeaknessPanel';

// ── Status presentation ─────────────────────────────────────────────────
const STATUS_LABEL_KEY: Record<SubmissionStatus, MessageKey> = {
  SUBMITTED: 'submissionStatusNew',
  AI_DRAFTED: 'submissionStatusAiDrafted',
  TEACHER_REVIEWING: 'submissionStatusReviewing',
  RELEASED: 'submissionStatusReleased',
  RETURNED: 'submissionStatusReturned',
};
const STATUS_STYLE: Record<SubmissionStatus, string> = {
  SUBMITTED: 'bg-amber-900/40 text-amber-300',
  AI_DRAFTED: 'bg-blue-900/40 text-blue-300',
  TEACHER_REVIEWING: 'bg-purple-900/40 text-purple-300',
  RELEASED: 'bg-ok/20 text-ok',
  RETURNED: 'bg-pink-900/40 text-pink-300',
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status]}`}>
      {t(STATUS_LABEL_KEY[status])}
    </span>
  );
}

type FilterKey = 'all' | 'to_mark' | 'in_review' | 'released';

function useFilters(): Array<{ key: FilterKey; label: string; match: (s: SubmissionStatus) => boolean }> {
  const { t } = useTranslation();
  return [
    { key: 'all', label: t('submissionFilterAll'), match: () => true },
    { key: 'to_mark', label: t('submissionFilterNeedsMarking'), match: (s) => s === 'SUBMITTED' || s === 'RETURNED' },
    { key: 'in_review', label: t('submissionFilterInReview'), match: (s) => s === 'AI_DRAFTED' || s === 'TEACHER_REVIEWING' },
    { key: 'released', label: t('submissionFilterReleased'), match: (s) => s === 'RELEASED' },
  ];
}

// ── Bearer-fetched artifact preview ─────────────────────────────────────
function FilePreview({ orgId, classId, submissionId, file }: {
  orgId: string; classId: string; submissionId: string; file: SubmissionFileMeta;
}) {
  const { t } = useTranslation();
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
            {t('submissionsTabOpen')}
          </a>
        )}
      </div>
      {error ? (
        <p className="px-3 py-6 text-xs text-bad text-center">{t('submissionsTabFileLoadFailed')}</p>
      ) : !url ? (
        <p className="px-3 py-6 text-xs text-ink3 text-center">{t('submissionsTabLoadingPreview')}</p>
      ) : isImage ? (
        // Kept as <img>: src is a signed/arbitrary submission-file URL — next/image
        // would need a wildcard remote host (security smell) and can break signed URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full max-h-[480px] object-contain bg-black/20" />
      ) : isPdf ? (
        <iframe src={url} title={file.name} className="w-full h-[480px] bg-white" />
      ) : (
        <p className="px-3 py-6 text-xs text-ink3 text-center">
          {t('submissionsTabNoPreview')}
        </p>
      )}
    </div>
  );
}

// ── Upload-for-student form ──────────────────────────────────────────────
function UploadForm({ orgId, classId, onDone, onCancel }: {
  orgId: string; classId: string; onDone: () => void; onCancel: () => void;
}) {
  const { t, tp } = useTranslation();
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
        <h3 className="text-sm font-semibold text-ink">{t('submissionsTabUploadHomework')}</h3>
        <button onClick={onCancel} className="text-ink3 hover:text-ink text-sm">✕</button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">{t('submissionsTabStudent')} <span className="text-ink3">{t('markingOptional')}</span></label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink"
        >
          <option value="">{t('submissionsTabUnassigned')}</option>
          {students.map((s) => (
            <option key={s.userId} value={s.userId}>{s.displayName || s.userId.slice(0, 8)}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">{t('submissionsTabTitle')} <span className="text-bad">*</span></label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('submissionsTabTitlePlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">{t('submissionsTabSubject')} <span className="text-ink3">{t('markingOptional')}</span></label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('submissionsTabSubjectPlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink2">{t('submissionsTabFiles')} <span className="text-bad">*</span></label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-xs text-ink2 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-panel2 file:text-ink2 file:text-xs hover:file:bg-line"
        />
        {files.length > 0 && (
          <p className="text-xs text-ink3">{tp.fileCount(files.length)}</p>
        )}
      </div>

      {mut.isError && (
        <p className="text-xs text-bad">
          {mut.error instanceof ApiError ? mut.error.userMessage : t('submissionsTabUploadFailed')}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={mut.isPending} className="px-4 py-2 rounded-lg border border-line text-ink2 text-xs hover:bg-panel2 disabled:opacity-40">
          {t('submissionsTabCancel')}
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={!canSubmit}
          className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40"
        >
          {mut.isPending ? t('submissionsTabUploading') : t('submissionsTabUpload')}
        </button>
      </div>
    </div>
  );
}

// ── Detail / marking panel ────────────────────────────────────────────────
function DetailPanel({ orgId, classId, submissionId }: {
  orgId: string; classId: string; submissionId: string;
}) {
  const { t, tp } = useTranslation();
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

  if (detail.isLoading) return <p className="px-5 py-4 text-ink3 text-xs">{t('submissionsTabLoadingSubmission')}</p>;
  if (detail.error || !s) {
    return <div className="px-5 py-4"><ErrorView message={t('submissionsTabCouldNotLoadSubmission')} onRetry={() => detail.refetch()} /></div>;
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
            {showOcr ? '▼' : '▶'} {t('submissionsTabExtractedText')}
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
          {tp.submissionsTabReleasedTo(s.releasedAt ? new Date(s.releasedAt).toLocaleString() : null)}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => draftMut.mutate()}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-panel2 border border-line text-xs font-semibold text-ink hover:bg-line disabled:opacity-40"
            >
              {draftMut.isPending ? t('submissionsTabGenerating') : draft ? t('submissionsTabRegenerateDraft') : t('submissionsTabGenerateDraft')}
            </button>
            <span className="text-[11px] text-ink3">{t('submissionsTabAiSuggests')}</span>
          </div>

          {draftMut.isError && (
            <p className="text-xs text-bad">
              {draftMut.error instanceof ApiError ? draftMut.error.userMessage : t('submissionsTabDraftFailed')}{' '}
              {t('submissionsTabMarkManually')}
            </p>
          )}

          {draft && (draft.criteria?.length || draft.suggestedGrade) && (
            <div className="rounded-xl bg-blue-900/15 border border-blue-900/30 px-4 py-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">{t('submissionsTabAiFirstPass')}</p>
              {draft.suggestedGrade && (
                <p className="text-xs text-ink2">{t('submissionsTabSuggestedGrade')} <span className="font-semibold text-ink">{draft.suggestedGrade}</span></p>
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
            {t('submissionsTabFeedbackLabel')} {!released && <span className="text-bad">*</span>}
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            readOnly={released}
            rows={5}
            placeholder={t('submissionsTabFeedbackPlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 read-only:opacity-70"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink2">{t('submissionsTabGradeLabel')} <span className="text-ink3">{t('markingOptional')}</span></label>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            readOnly={released}
            placeholder={t('submissionsTabGradePlaceholder')}
            className="w-full max-w-[200px] px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 read-only:opacity-70"
          />
        </div>

        {(saveMut.isError || releaseMut.isError) && (() => {
          const err = releaseMut.error ?? saveMut.error;
          return (
            <p className="text-xs text-bad">
              {err instanceof ApiError ? err.userMessage : t('submissionsTabSomethingWrong')}
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
              {saveMut.isPending ? t('submissionsTabSaving') : t('submissionsTabSaveDraft')}
            </button>
            <button
              onClick={() => releaseMut.mutate()}
              disabled={busy || !canRelease}
              title={canRelease ? undefined : t('submissionsTabAddFeedbackBeforeReleasing')}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40"
            >
              {releaseMut.isPending ? t('submissionsTabReleasing') : t('submissionsTabRelease')}
            </button>
            <button
              onClick={() => setShowReturn((v) => !v)}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-bad text-xs font-semibold hover:bg-bad/10 disabled:opacity-40"
            >
              {t('submissionsTabReturnForRedo')}
            </button>
          </div>
        )}

        {showReturn && !released && (
          <div className="rounded-xl border border-line bg-panel2 p-3 space-y-2">
            <textarea
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              rows={2}
              placeholder={t('submissionsTabReturnPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-panel border border-line text-sm text-ink placeholder:text-ink3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReturn(false)} className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs hover:bg-panel">{t('submissionsTabCancel')}</button>
              <button
                onClick={() => returnMut.mutate()}
                disabled={returnMut.isPending}
                className="px-3 py-1.5 rounded-lg bg-bad text-white text-xs font-semibold hover:bg-bad/90 disabled:opacity-40"
              >
                {returnMut.isPending ? t('submissionsTabReturning') : t('submissionsTabConfirmReturn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab root ──────────────────────────────────────────────────────────────
export function SubmissionsTab({ orgId, classId, subject }: {
  orgId: string; classId: string; subject?: string | null;
}) {
  const { t, tp } = useTranslation();
  const FILTERS = useFilters();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  // Default-open so the marking trainer is discoverable (it drives the whole
  // feedback loop); still user-collapsible once they've trained it.
  const [markingOpen, setMarkingOpen] = useState(true);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['submissions', orgId, classId],
    queryFn: () => api.submissions(orgId, classId),
  });

  const all = useMemo(() => asArray<Submission>(query.data?.data), [query.data]);
  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const visible = all.filter((s) => activeFilter.match(s.status));
  const toMarkCount = all.filter((s) => s.status === 'SUBMITTED' || s.status === 'RETURNED').length;

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">{t('submissionsTabLoadingList')}</p>;
  if (query.error) return <ErrorView message={t('submissionsTabCouldNotLoadList')} onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink2">
          {tp.submissionsTabCount(all.length)}
          {toMarkCount > 0 && <span className="text-amber-300"> · {tp.submissionsTabNeedMarking(toMarkCount)}</span>}
        </p>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition"
        >
          {t('submissionsTabUploadCta')}
        </button>
      </div>

      <details
        open={markingOpen}
        onToggle={(e) => setMarkingOpen(e.currentTarget.open)}
        className="bg-panel2/50 border border-line rounded-2xl group"
      >
        <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-ink2 hover:text-ink list-none flex items-center gap-2">
          <span className="text-ink3 text-xs transition-transform group-open:rotate-90">▶</span>
          {t('submissionsTabMarkingAssistantSummary')}
        </summary>
        <div className="px-5 pb-5 pt-1">
          <MarkingAssistantPanel orgId={orgId} classId={classId} subject={subject} />
        </div>
      </details>

      {/* Closes the teacher loop: where each student struggles (weakness pilot,
          self-hides until enabled). */}
      <StudentWeaknessPanel classId={classId} />

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
          title={all.length === 0 ? t('submissionsTabEmptyNoneTitle') : t('submissionsTabEmptyFilterTitle')}
          description={all.length === 0
            ? t('submissionsTabEmptyNoneDescription')
            : t('submissionsTabEmptyFilterDescription')}
          {...(all.length === 0 ? { actionLabel: t('submissionsTabUploadHomework'), onAction: () => setShowUpload(true) } : {})}
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
                    <span>{tp.fileCount(s.files.length)}</span>
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
