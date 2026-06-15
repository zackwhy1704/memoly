'use client';

import { useState } from 'react';
import { renderMarkdown } from '@/lib/markdown';
import { respondReview, type ReviewContent } from '@/lib/review-api';

const NOTE_MAX = 500;

export function ReviewBody({
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
