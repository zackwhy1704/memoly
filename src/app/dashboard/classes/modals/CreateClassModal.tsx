'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, randomMochiConfig, type MochiConfig, type OrgClass } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import { CONTENT_LANGUAGES, type ContentLanguageCode } from '@/lib/content-languages';
import MochiAvatar from '@/components/MochiAvatar';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import MochiUploader from '@/components/MochiUploader';
import type { UploadStatus } from '@/lib/upload-pipeline';
import { ContentReviewPanel } from '../[classId]/components/ContentReviewPanel';
import { useTranslation } from '@/lib/messages';
import type { MessageKey } from '@/lib/messages/en';

// ── Friendly compile messages — rotate while the brain compiles ──────────────
// Keys only at module scope (t() needs the hook, which only exists inside a
// component) — resolved to text via t() in useRotatingMessage.
const COMPILE_MESSAGE_KEYS: MessageKey[] = [
  'createClassModalCompile1',
  'createClassModalCompile2',
  'createClassModalCompile3',
  'createClassModalCompile4',
  'createClassModalCompile5',
  'createClassModalCompile6',
  'createClassModalCompile7',
  'createClassModalCompile8',
];

function useRotatingMessage(active: boolean, t: (key: MessageKey) => string, intervalMs = 5000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % COMPILE_MESSAGE_KEYS.length), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
  return t(COMPILE_MESSAGE_KEYS[idx]);
}

// ── Wizard step types ─────────────────────────────────────────────────────────
type WizardStep = 'identity' | 'avatar' | 'upload' | 'review' | 'done';
const STEP_ORDER: WizardStep[] = ['identity', 'avatar', 'upload', 'review', 'done'];
const STEP_LABEL_KEY: Record<WizardStep, MessageKey> = {
  identity: 'createClassModalStepClass',
  avatar: 'createClassModalStepMochi',
  upload: 'createClassModalStepUpload',
  review: 'createClassModalStepReview',
  done: 'createClassModalStepShare',
};

function Stepper({ current }: { current: WizardStep }) {
  const { t } = useTranslation();
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEP_ORDER.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? 'bg-ok text-white'
                    : active
                    ? 'bg-accent text-white'
                    : 'bg-panel2 text-ink3'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-ink' : 'text-ink3'}`}>
                {t(STEP_LABEL_KEY[step])}
              </span>
            </div>
            {i < STEP_ORDER.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-4 transition-colors ${i < idx ? 'bg-ok' : 'bg-line'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Hoisted to module scope so it isn't re-created every render (react-hooks
// static-components). Takes the text as a prop; no parent-scope dependencies.
function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition whitespace-nowrap"
    >
      {copied ? t('createClassModalCopied') : t('createClassModalCopyCode')}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreateClassModal({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: (cls: OrgClass) => void;
}) {
  const { t, tp } = useTranslation();
  const qc = useQueryClient();

  // ── Shared state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('identity');
  const [mochiConfig, setMochiConfig] = useState<MochiConfig>(randomMochiConfig);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [created, setCreated] = useState<OrgClass | null>(null);

  // Step 1
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('MATHS');
  const [level, setLevel] = useState('');
  const [contentLanguage, setContentLanguage] = useState<ContentLanguageCode>('en');
  // Loud-failure state for the teaching-language PATCH: the class is created but the language
  // couldn't be set. We do NOT advance to upload while this is set — a silent failure would mean
  // the teacher uploads Chinese material and gets English lessons with no explanation.
  const [langError, setLangError] = useState<string | null>(null);
  const [langRetrying, setLangRetrying] = useState(false);

  // Step 3 — a file finished UPLOADING (compile runs on afterwards, out of band).
  // This gates "Continue to review": we enable on upload, NOT on compile finishing
  // (see the PRODUCT DECISION note on the Continue button).
  const [uploadCompleted, setUploadCompleted] = useState(false);
  // The ONE derived upload/compile status emitted by MochiUploader — the single
  // source of truth for the step-3 banner AND the second continue-enable path
  // (so we light up the moment a compile/awaiting state begins, before onComplete).
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  // True while a server RelevanceWarning dialog is open in the uploader. Blocks
  // "Continue to review" so the teacher can't click past an unresolved Go-Back /
  // Add-Anyway choice (and land on step 4 having never seen it).
  const [relevancePending, setRelevancePending] = useState(false);

  // Step 4 — compile poll + review ready
  const [allReviewed, setAllReviewed] = useState(false);
  const [compileTimedOut, setCompileTimedOut] = useState(false);

  // Poll avatar brainState (proven approach from recompileAndPollBrain). The poll
  // now also reads the compile-time honesty fields the backend added to GET
  // /avatars/{id}: a dead compile (compileFailureReason) and compile-time chapter
  // segmentation (awaitingChapterSelection) are terminal — surface them instead of
  // spinning forever, and stop polling once any terminal state is reached.
  const brainQuery = useQuery({
    queryKey: ['avatar', created?.corpusAvatarId],
    queryFn: () => api.avatar(created!.corpusAvatarId!),
    enabled: step === 'review' && !!created?.corpusAvatarId,
    refetchInterval: (q) => {
      const d = q.state.data?.data;
      if (d?.brainState === 'READY' || d?.compileFailureReason || d?.awaitingChapterSelection) return false;
      return 4000;
    },
  });
  const avatarData = brainQuery.data?.data;
  const brainReady = avatarData?.brainState === 'READY';
  const compileFailureReason = avatarData?.compileFailureReason ?? null;
  const awaitingChapters = avatarData?.awaitingChapterSelection === true;
  const pendingChapterCount = avatarData?.pendingChapterCount ?? 0;

  // Compile progress numbers from the compile-status endpoint
  const statusQuery = useQuery({
    queryKey: ['compileStatus', created?.corpusAvatarId],
    queryFn: () => api.compileStatus(created!.corpusAvatarId!),
    enabled: step === 'review' && !!created?.corpusAvatarId && !brainReady,
    refetchInterval: 4000,
  });
  const pagesCompiled = statusQuery.data?.data?.pagesCompiled;
  const pagesTotal = statusQuery.data?.data?.pagesTotal;

  // Compile timeout — 2 min safety net
  useEffect(() => {
    if (step !== 'review' || brainReady || compileTimedOut) return;
    const t = setTimeout(() => setCompileTimedOut(true), 120_000);
    return () => clearTimeout(t);
  }, [step, brainReady, compileTimedOut]);

  const compilingMessage = useRotatingMessage(
    step === 'review' && !brainReady && !compileTimedOut && !compileFailureReason && !awaitingChapters,
    t
  );

  // Step-4 header is STATE-MATCHED: the "Review… / Approve or reject…" framing appears
  // ONLY when the brain is READY and there is real content to review. On failure /
  // awaiting-chapters / timeout / still-compiling, the generic review framing would lie
  // by omission (claiming a review is happening above a banner saying nothing exists),
  // so each state gets its own honest title; the banners below carry the detail.
  const reviewHeader = brainReady
    ? { title: t('createClassModalReviewReadyTitle'), subtitle: t('createClassModalReviewReadySubtitle') }
    : compileFailureReason
      ? { title: t('createClassModalCompileFailedTitle'), subtitle: null }
      : awaitingChapters
        ? { title: t('createClassModalChaptersReadyTitle'), subtitle: null }
        : compileTimedOut
          ? { title: t('createClassModalStillWorkingTitle'), subtitle: null }
          : { title: t('createClassModalCompilingTitle'), subtitle: null };

  // ── Step 2 — class creation mutation ─────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () =>
      api.createClass(orgId, {
        name: name.trim(),
        subject,
        level: level.trim() || undefined,
        characterType: 'MOCHI',
      }),
    onSuccess: async (res) => {
      trackEvent('class_created', { classId: res.data.id, subject: res.data.subject });
      try {
        await api.setMochiConfig(orgId, res.data.id, mochiConfig);
      } catch {
        // Non-blocking — look already applied locally.
      }
      setCreated(res.data);
      // Teaching language must be set BEFORE the upload step: generation reads content_language at
      // COMPILE time, so a file uploaded while the class is 'en' produces English content permanently.
      // Only 'zh' needs a call (the corpus avatar is created 'en' by default — byte-identical path).
      // LOUD on failure: do NOT advance to upload; surface the error and let the teacher retry.
      if (contentLanguage !== 'en' && res.data.corpusAvatarId) {
        try {
          await api.setContentLanguage(res.data.corpusAvatarId, contentLanguage);
        } catch (e) {
          setLangError(
            e instanceof ApiError
              ? e.userMessage
              : t('createClassModalLangErrorFallback')
          );
          return; // stay on the avatar step; do NOT present the class as configured
        }
      }
      setStep('upload');
    },
  });

  // Retry ONLY the teaching-language set (the class already exists — never re-create it).
  async function retryLanguage() {
    if (!created?.corpusAvatarId) return;
    setLangError(null);
    setLangRetrying(true);
    try {
      if (contentLanguage !== 'en') {
        await api.setContentLanguage(created.corpusAvatarId, contentLanguage);
      }
      setStep('upload');
    } catch (e) {
      setLangError(
        e instanceof ApiError ? e.userMessage : t('createClassModalLangRetryErrorFallback')
      );
    } finally {
      setLangRetrying(false);
    }
  }

  // Re-customise Mochi in step 3/4 (non-blocking persist to already-created class)
  async function saveAvatar(cfg: MochiConfig) {
    setMochiConfig(cfg);
    setPickerOpen(false);
    if (!created) return;
    try {
      await api.setMochiConfig(orgId, created.id, cfg);
    } catch {
      /* non-blocking */
    }
  }

  // Continue-to-review enablement: TRUE once at least one file has uploaded —
  // either a completion fired (onComplete, including a segmented 0-page upload) OR
  // the derived status has moved past "empty"/"uploading" (a compile/awaiting/ready
  // state means a file already landed). Deliberately NOT gated on the compile
  // finishing (see the PRODUCT DECISION note on the Continue button).
  const canContinue =
    !relevancePending &&
    (uploadCompleted ||
      (uploadStatus != null && uploadStatus.kind !== 'empty' && uploadStatus.kind !== 'uploading'));

  // ── Helpers ───────────────────────────────────────────────────────────────
  function advance() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={step === 'identity' ? onClose : undefined}
    >
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          <Stepper current={step} />

          {/* ── Step 1 — Identity ────────────────────────────────────────── */}
          {step === 'identity' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-ink">{t('createClassModalNameYourClass')}</h2>
                <p className="text-ink3 text-xs mt-1">{t('createClassModalDesignNextStep')}</p>
              </div>
              <div className="bg-panel border border-line rounded-2xl p-4 space-y-3">
                <label className="block">
                  <span className="text-xs text-ink2 font-medium">{t('classFormNameLabel')}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('classFormNamePlaceholder')}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-ink2 font-medium">{t('classFormSubjectLabel')}</span>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                      {CENTRE_SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-ink2 font-medium">{t('classFormLevelLabel')}</span>
                    <input
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      placeholder={t('classFormLevelPlaceholder')}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-ink2 font-medium">{t('classFormTeachingLanguageLabel')}</span>
                  <select
                    value={contentLanguage}
                    onChange={(e) => setContentLanguage(e.target.value as ContentLanguageCode)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    {CONTENT_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-ink3">
                    {t('createClassModalTeachingLanguageHelper')}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ── Step 2 — Avatar studio ───────────────────────────────────── */}
          {step === 'avatar' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-ink">{t('createClassModalDesignMochi')}</h2>
                <p className="text-ink3 text-xs mt-1">{t('createClassModalStudentsLearnFrom')}</p>
              </div>
              <div className="bg-panel border border-line rounded-2xl p-6 flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-[#0d0d0d] p-6">
                  <MochiAvatar config={mochiConfig} size={140} />
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm font-medium hover:bg-panel2 transition"
                >
                  {t('createClassModalChooseStyle')}
                </button>
              </div>
              {createMut.isError && (
                <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
                  {createMut.error instanceof ApiError
                    ? createMut.error.userMessage
                    : t('createClassModalCreateFailedFallback')}
                </div>
              )}
              {langError && (
                <div role="alert" className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
                  {langError} {t('createClassModalLangErrorSuffix')}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 — Upload ──────────────────────────────────────────── */}
          {step === 'upload' && created && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#0d0d0d] p-2 shrink-0">
                  <MochiAvatar config={mochiConfig} size={40} animate={false} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">{tp.createClassModalReady(created.name)}</h2>
                  <p className="text-ink3 text-xs mt-0.5">
                    {t('createClassModalJoinCodeLabel')} <span className="font-mono text-accent">{created.joinCode}</span>
                  </p>
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="ml-auto px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition whitespace-nowrap shrink-0"
                >
                  {t('createClassModalCustomiseMochi')}
                </button>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 text-xs text-ink2 leading-relaxed">
                {t('createClassModalUploadInstructionsPrefix')}
                <strong className="text-ink">{t('createClassModalUploadInstructionsBold')}</strong>
                {t('createClassModalUploadInstructionsSuffix')}
              </div>

              {created.corpusAvatarId && (
                <MochiUploader
                  avatarId={created.corpusAvatarId}
                  onComplete={(pageCount) => {
                    // Enable on ANY completion, including a segmented upload that
                    // reports 0 pages (chapters still to pick) — never gate on
                    // pageCount>0, which stranded segmented uploads behind a
                    // permanently-disabled Continue.
                    void pageCount;
                    setUploadCompleted(true);
                    qc.invalidateQueries({ queryKey: ['classFiles', created.corpusAvatarId] });
                    qc.invalidateQueries({ queryKey: ['wikiPages', created.corpusAvatarId] });
                  }}
                  onStatusChange={setUploadStatus}
                  onPendingRelevanceChange={setRelevancePending}
                />
              )}

              {/* SINGLE-RENDER INVARIANT: the derived upload/compile status is shown
                  in EXACTLY ONE place — MochiUploader's own UploadResult card. The
                  wizard no longer renders a second banner (that was the third of the
                  "three red boxes"). `uploadStatus` is still consumed, but only as
                  LOGIC for the Continue gate below — never as a duplicate string. */}
            </div>
          )}

          {/* ── Step 4 — Review ──────────────────────────────────────────── */}
          {step === 'review' && created && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-ink">{reviewHeader.title}</h2>
                {reviewHeader.subtitle && (
                  <p className="text-ink3 text-xs mt-1">{reviewHeader.subtitle}</p>
                )}
              </div>

              {/* Honest compile failure — terminal, from the poll's
                  compileFailureReason. Distinct from the soft "taking longer"
                  timeout: this compile is NOT going to finish on its own. */}
              {!brainReady && compileFailureReason && (
                <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-4 space-y-2">
                  <p className="text-sm font-semibold text-bad">⚠ {t('createClassModalCompileFailedTitle')}</p>
                  <p className="text-xs text-ink2">
                    {compileFailureReason} {t('createClassModalCompileFailedBodySuffix')}
                  </p>
                </div>
              )}

              {/* Compile-time chapter segmentation — the file was split DURING
                  compile, so the picker signal arrives on this poll, not on the
                  upload response. The teacher must choose chapters to continue. */}
              {!brainReady && !compileFailureReason && awaitingChapters && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-4 space-y-2">
                  <p className="text-sm font-semibold text-accent">
                    📖 {tp.createClassModalChaptersReady(pendingChapterCount)}
                  </p>
                  <p className="text-xs text-ink2">
                    {t('createClassModalChaptersBody')}
                  </p>
                </div>
              )}

              {/* Compiling state */}
              {!brainReady && !compileFailureReason && !awaitingChapters && !compileTimedOut && (
                <div className="flex flex-col items-center gap-5 py-10">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-ink">{compilingMessage}</p>
                    {pagesTotal != null && pagesTotal > 0 && (
                      <p className="text-xs text-ink3">
                        {tp.createClassModalPagesCompiled(pagesCompiled ?? 0, pagesTotal)}
                      </p>
                    )}
                    <p className="text-[11px] text-ink3 mt-2">
                      {t('createClassModalCompilingSubtext')}
                    </p>
                  </div>
                </div>
              )}

              {/* Timeout fallback */}
              {!brainReady && !compileFailureReason && !awaitingChapters && compileTimedOut && (
                <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-4 space-y-2">
                  <p className="text-sm font-semibold text-warn">{t('createClassModalTimeoutHeading')}</p>
                  <p className="text-xs text-ink2">
                    {t('createClassModalTimeoutBody')}
                  </p>
                </div>
              )}

              {/* Review items (once brain is ready) */}
              {brainReady && (
                <ContentReviewPanel
                  orgId={orgId}
                  classId={created.id}
                  onAllReviewed={() => setAllReviewed(true)}
                />
              )}
            </div>
          )}

          {/* ── Step 5 — Done / Share ────────────────────────────────────── */}
          {step === 'done' && created && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="flex justify-center mb-3">
                  <div className="rounded-2xl bg-[#0d0d0d] p-4">
                    <MochiAvatar config={mochiConfig} size={100} />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-ink">{t('createClassModalClassLive')}</h2>
                <p className="text-ink3 text-sm">{tp.createClassModalReadyForStudents(created.name)}</p>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 text-center space-y-3">
                <p className="text-xs font-semibold text-ink2 uppercase tracking-wider">{t('createClassModalJoinCodeHeading')}</p>
                <p className="text-4xl font-bold font-mono text-ink tracking-widest">{created.joinCode}</p>
                <CopyButton text={created.joinCode} />
              </div>

              <div className="bg-panel border border-line rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-ink2">
                <span className="text-lg shrink-0">🎓</span>
                <p>
                  {t('createClassModalStudentsJoinPrefix')}
                  <span className="font-semibold text-ink">{t('createClassModalStudentsJoinBold')}</span>
                  {t('createClassModalStudentsJoinSuffix')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer buttons ────────────────────────────────────────────── */}
        <div className="border-t border-line px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          {/* Left — back / cancel */}
          <div>
            {step === 'identity' && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
              >
                {t('classFormCancel')}
              </button>
            )}
            {step === 'avatar' && (
              <button
                onClick={() => setStep('identity')}
                className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
              >
                {t('createClassModalBack')}
              </button>
            )}
            {(step === 'upload' || step === 'review') && (
              <p className="text-xs text-ink3">
                {t('createClassModalClassCreatedPrefix')}{' '}
                <span className="font-mono text-accent">{created?.joinCode}</span>
              </p>
            )}
          </div>

          {/* Right — primary action */}
          <div className="flex items-center gap-2">
            {/* Step 4 skip */}
            {step === 'review' && (!brainReady || !allReviewed) && (
              <button
                onClick={() => setStep('done')}
                className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
              >
                {t('createClassModalSkipForNow')}
              </button>
            )}

            {step === 'identity' && (
              <button
                onClick={() => advance()}
                disabled={!name.trim()}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                {t('createClassModalNext')}
              </button>
            )}

            {step === 'avatar' && (
              <button
                onClick={() => (created ? retryLanguage() : createMut.mutate())}
                disabled={createMut.isPending || langRetrying}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                {createMut.isPending || langRetrying
                  ? t('createClassModalWorking')
                  : created
                    ? t('createClassModalRetryContinue')
                    : t('createClassModalCreateContinue')}
              </button>
            )}

            {step === 'upload' && (
              // PRODUCT DECISION (allow-continue, not a wall): class exists + join
              // code issued, so a teacher isn't blocked behind a compile that can
              // silently die; the banner keeps compile/awaiting state visible.
              // Flagged for Zack — flip to hard-block here if product decides otherwise.
              <button
                onClick={() => advance()}
                disabled={!canContinue}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
                title={!canContinue ? t('createClassModalUploadFirstTitle') : undefined}
              >
                {t('createClassModalContinueToReview')}
              </button>
            )}

            {step === 'review' && (brainReady && allReviewed) && (
              <button
                onClick={() => setStep('done')}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
              >
                {t('createClassModalLooksGoodContinue')}
              </button>
            )}

            {step === 'done' && (
              <button
                onClick={() => created && onCreated(created)}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
              >
                {t('createClassModalDone')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AvatarPickerModal — floats over the wizard */}
      {pickerOpen && (
        <AvatarPickerModal
          initial={mochiConfig}
          onSave={saveAvatar}
          onDismiss={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
