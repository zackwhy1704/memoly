'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type AssignmentAnswerState } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

// ── Model-answer editor + release (A2) ────────────────────────────────────────
export function AnswerReleasePanel({
  orgId,
  classId,
  assignmentId,
  dueDate,
}: {
  orgId: string;
  classId: string;
  assignmentId: string;
  dueDate: string | null;
}) {
  // The assignment summary/detail DTOs don't yet expose the model answer, so we
  // hold the latest known state from the PUT/POST responses locally. Server
  // remains the source of truth — we never re-derive release status client-side.
  const [answer, setAnswer] = useState('');
  const [releaseAt, setReleaseAt] = useState('');
  const [state, setState] = useState<AssignmentAnswerState | null>(null);

  const saveMut = useMutation({
    mutationFn: () => api.setModelAnswer(orgId, classId, assignmentId, answer),
    onSuccess: (res) => {
      trackEvent('model_answer_saved', { classId, assignmentId });
      setState(res.data);
    },
  });

  const releaseNowMut = useMutation({
    mutationFn: () => api.releaseAnswers(orgId, classId, assignmentId, { releaseNow: true }),
    onSuccess: (res) => {
      trackEvent('answers_released', { classId, assignmentId, mode: 'now' });
      setState(res.data);
    },
  });

  const scheduleMut = useMutation({
    mutationFn: () =>
      api.releaseAnswers(orgId, classId, assignmentId, {
        // Empty → backend defaults to the due date.
        ...(releaseAt ? { releaseAt: new Date(releaseAt).toISOString() } : {}),
      }),
    onSuccess: (res) => {
      trackEvent('answers_released', { classId, assignmentId, mode: releaseAt ? 'scheduled' : 'duedate' });
      setState(res.data);
    },
  });

  const released = state?.answersReleased ?? false;
  const releasedAt = state?.answersReleasedAt ?? null;

  return (
    <div className="px-5 py-4 border-t border-line space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-ink2 uppercase tracking-wider">Model answer</h4>
        {released ? (
          <span className="text-xs font-semibold text-ok">
            ✓ Released{releasedAt ? ` at ${new Date(releasedAt).toLocaleString()}` : ''}
          </span>
        ) : (
          <span className="text-xs text-ink3">Not released</span>
        )}
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder="Write the model answer students will see after release…"
        className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => saveMut.mutate()}
          disabled={!answer.trim() || saveMut.isPending}
          className="px-4 py-2 text-xs font-semibold bg-panel2 hover:bg-panel2/80 rounded-lg text-ink transition disabled:opacity-40"
        >
          {saveMut.isPending ? 'Saving…' : saveMut.isSuccess ? 'Saved ✓' : 'Save model answer'}
        </button>
        <button
          onClick={() => releaseNowMut.mutate()}
          disabled={releaseNowMut.isPending}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
        >
          {releaseNowMut.isPending ? 'Releasing…' : 'Release now'}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-ink2 mb-1.5">
            Schedule release{dueDate ? ` (default: due ${new Date(dueDate).toLocaleDateString()})` : ' (default: due date)'}
          </label>
          <input
            type="datetime-local"
            value={releaseAt}
            onChange={(e) => setReleaseAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <button
          onClick={() => scheduleMut.mutate()}
          disabled={scheduleMut.isPending}
          className="px-4 py-2 text-xs font-semibold bg-panel2 hover:bg-panel2/80 rounded-lg text-ink transition disabled:opacity-40"
        >
          {scheduleMut.isPending ? 'Scheduling…' : releaseAt ? 'Schedule release' : 'Release at due date'}
        </button>
      </div>

      {(saveMut.error || releaseNowMut.error || scheduleMut.error) && (
        <p className="text-xs text-bad">
          {(saveMut.error || releaseNowMut.error || scheduleMut.error) instanceof Error
            ? (saveMut.error || releaseNowMut.error || scheduleMut.error)!.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}
    </div>
  );
}
