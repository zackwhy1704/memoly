'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, randomMochiConfig, type MochiConfig, type OrgClass } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import MochiAvatar from '@/components/MochiAvatar';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import MochiUploader from '@/components/MochiUploader';
import { ContentReviewPanel } from '../[classId]/components/ContentReviewPanel';

// ── Friendly compile messages — rotate while the brain compiles ──────────────
const COMPILE_MESSAGES = [
  'Mochi is reading your notes carefully… 📚',
  'Building lessons from your content… ✏️',
  'Crafting quiz questions for your students… 🧠',
  'Organising everything into chapters… 📖',
  'Distilling your notes into the best study material… 🌟',
  'Nearly done — Mochi is a very fast learner! ⚡',
  'This usually takes 1–3 minutes. Worth the wait! ☕',
  'Great notes make great lessons — almost there… 🎓',
];

function useRotatingMessage(active: boolean, intervalMs = 5000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % COMPILE_MESSAGES.length), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs]);
  return COMPILE_MESSAGES[idx];
}

// ── Wizard step types ─────────────────────────────────────────────────────────
type WizardStep = 'identity' | 'avatar' | 'upload' | 'review' | 'done';
const STEP_ORDER: WizardStep[] = ['identity', 'avatar', 'upload', 'review', 'done'];
const STEP_LABELS: Record<WizardStep, string> = {
  identity: 'Class',
  avatar: 'Mochi',
  upload: 'Upload',
  review: 'Review',
  done: 'Share',
};

function Stepper({ current }: { current: WizardStep }) {
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
                {STEP_LABELS[step]}
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

  // Step 3 — track at least one compile-complete so the review gate is meaningful
  const [uploadCompleted, setUploadCompleted] = useState(false);

  // Step 4 — compile poll + review ready
  const [allReviewed, setAllReviewed] = useState(false);
  const [compileTimedOut, setCompileTimedOut] = useState(false);

  // Poll avatar brainState (proven approach from recompileAndPollBrain)
  const brainQuery = useQuery({
    queryKey: ['avatar', created?.corpusAvatarId],
    queryFn: () => api.avatar(created!.corpusAvatarId!),
    enabled: step === 'review' && !!created?.corpusAvatarId,
    refetchInterval: (q) => (q.state.data?.data?.brainState === 'READY' ? false : 4000),
  });
  const brainReady = brainQuery.data?.data?.brainState === 'READY';

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

  const compilingMessage = useRotatingMessage(step === 'review' && !brainReady && !compileTimedOut);

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
      setStep('upload');
    },
  });

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

  // ── Helpers ───────────────────────────────────────────────────────────────
  function advance() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }

  function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
      <button
        onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition whitespace-nowrap"
      >
        {copied ? 'Copied!' : 'Copy code'}
      </button>
    );
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
                <h2 className="text-lg font-bold text-ink">Name your class</h2>
                <p className="text-ink3 text-xs mt-1">You&apos;ll design the Mochi in the next step.</p>
              </div>
              <div className="bg-panel border border-line rounded-2xl p-4 space-y-3">
                <label className="block">
                  <span className="text-xs text-ink2 font-medium">Class name *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="P4 Math"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-ink2 font-medium">Subject</span>
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
                    <span className="text-xs text-ink2 font-medium">Level</span>
                    <input
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      placeholder="P4"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 — Avatar studio ───────────────────────────────────── */}
          {step === 'avatar' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Design your class Mochi</h2>
                <p className="text-ink3 text-xs mt-1">Students will learn from this Mochi — make it theirs.</p>
              </div>
              <div className="bg-panel border border-line rounded-2xl p-6 flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-[#0d0d0d] p-6">
                  <MochiAvatar config={mochiConfig} size={140} />
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm font-medium hover:bg-panel2 transition"
                >
                  Choose a style or customise ↗
                </button>
              </div>
              {createMut.isError && (
                <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
                  {createMut.error instanceof ApiError
                    ? createMut.error.userMessage
                    : 'Could not create the class. Please try again.'}
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
                  <h2 className="text-lg font-bold text-ink">{created.name} is ready!</h2>
                  <p className="text-ink3 text-xs mt-0.5">
                    Join code: <span className="font-mono text-accent">{created.joinCode}</span>
                  </p>
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="ml-auto px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition whitespace-nowrap shrink-0"
                >
                  Customise Mochi ↗
                </button>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 text-xs text-ink2 leading-relaxed">
                Upload your teaching notes, worksheets, or PDFs below. Mochi will compile them into
                lessons and quiz questions — this typically takes <strong className="text-ink">1–3 minutes</strong>.
                Larger files may occasionally take longer.
              </div>

              {created.corpusAvatarId && (
                <MochiUploader
                  avatarId={created.corpusAvatarId}
                  onComplete={(pageCount) => {
                    if (pageCount > 0) setUploadCompleted(true);
                    qc.invalidateQueries({ queryKey: ['classFiles', created.corpusAvatarId] });
                    qc.invalidateQueries({ queryKey: ['wikiPages', created.corpusAvatarId] });
                  }}
                />
              )}

              {!uploadCompleted && (
                <p className="text-xs text-ink3 text-center">
                  Upload at least one file so Mochi has something to teach.
                </p>
              )}
            </div>
          )}

          {/* ── Step 4 — Review ──────────────────────────────────────────── */}
          {step === 'review' && created && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Review Mochi&apos;s lessons</h2>
                <p className="text-ink3 text-xs mt-1">Approve or reject what Mochi generated from your notes.</p>
              </div>

              {/* Compiling state */}
              {!brainReady && !compileTimedOut && (
                <div className="flex flex-col items-center gap-5 py-10">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-ink">{compilingMessage}</p>
                    {pagesTotal != null && pagesTotal > 0 && (
                      <p className="text-xs text-ink3">
                        {pagesCompiled ?? 0} / {pagesTotal} pages compiled
                      </p>
                    )}
                    <p className="text-[11px] text-ink3 mt-2">
                      Compilation usually takes 1–3 minutes. This tab will update automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Timeout fallback */}
              {!brainReady && compileTimedOut && (
                <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-4 space-y-2">
                  <p className="text-sm font-semibold text-warn">⏱ This is taking longer than usual</p>
                  <p className="text-xs text-ink2">
                    The brain is still compiling in the background — it may be processing a large file.
                    You can skip to finish setup now and check the Review tab from the class page once it&apos;s done.
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
                <h2 className="text-xl font-bold text-ink">Your class is live! 🎉</h2>
                <p className="text-ink3 text-sm">{created.name} is ready for students to join.</p>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 text-center space-y-3">
                <p className="text-xs font-semibold text-ink2 uppercase tracking-wider">Join code</p>
                <p className="text-4xl font-bold font-mono text-ink tracking-widest">{created.joinCode}</p>
                <CopyButton text={created.joinCode} />
              </div>

              <div className="bg-panel border border-line rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-ink2">
                <span className="text-lg shrink-0">🎓</span>
                <p>
                  Students open the Apalchi app → Home →{' '}
                  <span className="font-semibold text-ink">&ldquo;Got a class code?&rdquo;</span>{' '}
                  and enter the code above to join instantly.
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
                Cancel
              </button>
            )}
            {step === 'avatar' && (
              <button
                onClick={() => setStep('identity')}
                className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
              >
                ← Back
              </button>
            )}
            {(step === 'upload' || step === 'review') && (
              <p className="text-xs text-ink3">
                Class created · join code{' '}
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
                Skip for now
              </button>
            )}

            {step === 'identity' && (
              <button
                onClick={() => advance()}
                disabled={!name.trim()}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                Next →
              </button>
            )}

            {step === 'avatar' && (
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                {createMut.isPending ? 'Creating…' : 'Create class & continue →'}
              </button>
            )}

            {step === 'upload' && (
              <button
                onClick={() => advance()}
                disabled={!uploadCompleted}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
                title={!uploadCompleted ? 'Upload at least one file first' : undefined}
              >
                Continue to review →
              </button>
            )}

            {step === 'review' && (brainReady && allReviewed) && (
              <button
                onClick={() => setStep('done')}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
              >
                Looks good — continue →
              </button>
            )}

            {step === 'done' && (
              <button
                onClick={() => created && onCreated(created)}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
              >
                Done
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
