'use client';

/**
 * PUBLIC review page — NO LOGIN. Reviewers open this from a WhatsApp link on a
 * phone. It lives OUTSIDE src/app/dashboard, so the dashboard auth guard
 * (useAuthGuard, called only in dashboard/layout.tsx) never wraps it — same as
 * /login and /signup. We use the unauthenticated review API (no JWT attached).
 */

import { use, useEffect, useState } from 'react';
import { renderMarkdown } from '@/lib/markdown';
import {
  loadReview,
  respondReview,
  type ReviewContent,
  type ReviewLoadResult,
} from '@/lib/review-api';

type View =
  | { state: 'loading' }
  | { state: 'content'; content: ReviewContent }
  | { state: 'gone'; status: string }
  | { state: 'notfound' }
  | { state: 'network' }
  | { state: 'error' }
  | { state: 'done'; verdict: 'APPROVED' | 'FLAGGED' };

const NOTE_MAX = 500;

export default function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [view, setView] = useState<View>({ state: 'loading' });

  useEffect(() => {
    let active = true;
    // Initial state is already 'loading'; the async result drives the rest.
    loadReview(token).then((res: ReviewLoadResult) => {
      if (!active) return;
      switch (res.kind) {
        case 'ok':
          setView({ state: 'content', content: res.content });
          break;
        case 'gone':
          setView({ state: 'gone', status: res.status });
          break;
        case 'notfound':
          setView({ state: 'notfound' });
          break;
        case 'network':
          setView({ state: 'network' });
          break;
        default:
          setView({ state: 'error' });
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-bg px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <Header />

        {view.state === 'loading' && <LoadingCard />}
        {view.state === 'content' && (
          <ReviewBody
            token={token}
            content={view.content}
            onDone={(verdict) => setView({ state: 'done', verdict })}
            onGone={(status) => setView({ state: 'gone', status })}
            onNotFound={() => setView({ state: 'notfound' })}
          />
        )}
        {view.state === 'done' && <SuccessCard />}
        {view.state === 'gone' && <GoneCard status={view.status} />}
        {view.state === 'notfound' && (
          <MessageCard
            emoji="🔍"
            title="Review link not found"
            body="We couldn't find this review. Double-check the link, or ask the student to send it again."
          />
        )}
        {view.state === 'network' && (
          <MessageCard
            emoji="📶"
            title="Couldn't connect"
            body="You appear to be offline. Check your connection and try again."
          />
        )}
        {view.state === 'error' && (
          <MessageCard
            emoji="⚠️"
            title="Something went wrong"
            body="We hit a snag loading this review. Please try again in a moment."
          />
        )}
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-panel border border-line mb-3">
        <span className="text-2xl">🐾</span>
      </div>
      <h1 className="text-xl font-bold text-ink">Apalchi</h1>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">
        A student asked you to check this study guide.
      </p>
    </header>
  );
}

function LoadingCard() {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 flex flex-col items-center gap-3">
      <span className="text-3xl animate-bounce">🐾</span>
      <p className="text-ink3 text-sm">Loading the study guide…</p>
    </div>
  );
}

function ReviewBody({
  token,
  content,
  onDone,
  onGone,
  onNotFound,
}: {
  token: string;
  content: ReviewContent;
  onDone: (verdict: 'APPROVED' | 'FLAGGED') => void;
  onGone: (status: string) => void;
  onNotFound: () => void;
}) {
  // 'idle' = buttons shown; 'approve'/'flag' = form revealed for that verdict.
  const [mode, setMode] = useState<'idle' | 'approve' | 'flag'>('idle');
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const noteTrimmed = note.trim();
  const noteInvalid =
    mode === 'flag' && (noteTrimmed.length === 0 || noteTrimmed.length > NOTE_MAX);

  async function submit() {
    setError('');
    if (mode === 'idle') return;
    if (noteInvalid) {
      setError('Please add a quick note on what to double-check.');
      return;
    }
    setSubmitting(true);
    const res = await respondReview(token, {
      verdict: mode === 'approve' ? 'APPROVE' : 'FLAG',
      reviewerName: name.trim() ? name.trim() : undefined,
      note: mode === 'flag' ? noteTrimmed : undefined,
    });
    setSubmitting(false);

    switch (res.kind) {
      case 'ok':
        onDone(res.status);
        break;
      case 'conflict':
        setError('This guide has already been reviewed — thank you!');
        break;
      case 'ratelimited':
        setError('Too many attempts — please wait a moment and try again.');
        break;
      case 'gone':
        onGone(res.status);
        break;
      case 'notfound':
        onNotFound();
        break;
      case 'network':
        setError('You appear to be offline. Check your connection and try again.');
        break;
      default:
        setError('Something went wrong submitting your review. Please try again.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Content card */}
      <article className="bg-panel rounded-2xl border border-line p-6">
        <h2 className="text-lg font-bold text-ink">{content.pageTitle}</h2>
        {content.subject && (
          <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold">
            {content.subject}
          </span>
        )}
        <div className="mt-4 text-sm">{renderMarkdown(content.contentMarkdown)}</div>
      </article>

      {/* Action card */}
      <div className="bg-panel rounded-2xl border border-line p-6">
        <h3 className="text-base font-semibold text-ink">
          Does this look accurate?
        </h3>

        {mode === 'idle' && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setError('');
                setMode('approve');
              }}
              className="py-3 px-4 rounded-xl bg-ok text-white text-sm font-semibold
                hover:opacity-90 active:opacity-80 transition-opacity"
            >
              ✓ Looks good
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setMode('flag');
              }}
              className="py-3 px-4 rounded-xl bg-panel2 border border-line text-ink text-sm font-semibold
                hover:bg-bad/10 hover:border-bad/40 transition-colors"
            >
              ✗ Something&apos;s off
            </button>
          </div>
        )}

        {mode !== 'idle' && (
          <div className="mt-4 space-y-4">
            {mode === 'flag' && (
              <div>
                <label
                  htmlFor="review-note"
                  className="block text-sm font-medium text-ink2 mb-1.5"
                >
                  What should they double-check?
                </label>
                <textarea
                  id="review-note"
                  rows={4}
                  maxLength={NOTE_MAX}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. The date for the second event is wrong…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm
                    focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                    placeholder:text-ink3 transition-colors resize-none"
                />
                <p className="text-right text-xs text-ink3 mt-1">
                  {noteTrimmed.length}/{NOTE_MAX}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="review-name"
                className="block text-sm font-medium text-ink2 mb-1.5"
              >
                Your name{' '}
                <span className="text-ink3 font-normal">(optional)</span>
              </label>
              <input
                id="review-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ms Tan"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm
                  focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                  placeholder:text-ink3 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-bad/10 border border-bad/30 rounded-lg px-3.5 py-2.5 text-sm text-bad">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setMode('idle');
                  setError('');
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-panel2 border border-line text-ink2 text-sm font-semibold
                  hover:text-ink transition-colors disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting || noteInvalid}
                onClick={submit}
                className="flex-[2] py-2.5 px-4 rounded-lg bg-accent text-white text-sm font-semibold
                  hover:bg-accent/80 active:bg-accent/70 transition-colors
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Sending…'
                  : mode === 'approve'
                    ? 'Confirm — looks good'
                    : 'Send feedback'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessCard() {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 text-center">
      <span className="text-4xl">🎉</span>
      <h2 className="text-lg font-bold text-ink mt-3">
        Thanks — we&apos;ve let them know!
      </h2>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">
        Your feedback has been sent to the student.
      </p>
      <p className="text-ink3 text-xs mt-6 leading-relaxed">
        Apalchi turns students&apos; own notes into study material — adult-checked.{' '}
        <a
          href="https://apalchi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent font-semibold hover:underline whitespace-nowrap"
        >
          Learn more →
        </a>
      </p>
    </div>
  );
}

function GoneCard({ status }: { status: string }) {
  const s = (status ?? '').toUpperCase();
  let emoji = '🔗';
  let title = 'This review link is no longer active.';
  let body = 'Ask the student to send a fresh link if you still need to review it.';

  if (s === 'EXPIRED') {
    emoji = '⏳';
    title = 'This link has expired';
    body = 'Ask them to send a fresh one.';
  } else if (s === 'APPROVED' || s === 'FLAGGED' || s === 'REVIEWED') {
    emoji = '✅';
    title = 'This guide has already been reviewed';
    body = 'Thank you!';
  } else if (s === 'REVOKED') {
    emoji = '🔗';
    title = 'This review link is no longer active.';
    body = 'Ask the student to send a fresh link if you still need to review it.';
  }

  return <MessageCard emoji={emoji} title={title} body={body} />;
}

function MessageCard({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 text-center">
      <span className="text-4xl">{emoji}</span>
      <h2 className="text-lg font-bold text-ink mt-3">{title}</h2>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
