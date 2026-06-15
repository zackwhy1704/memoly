'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type Challenge, type CreateChallengeBody } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

// ── Challenges (A4): teacher poster + list ────────────────────────────────────
function ChallengePoster({
  orgId,
  classId,
  onPosted,
}: {
  orgId: string;
  classId: string;
  onPosted: () => void;
}) {
  const [question, setQuestion] = useState('');
  // MCQ is optional: empty array = free-text/open challenge. Two starter rows.
  const [options, setOptions] = useState<string[]>(['', '']);
  const [answer, setAnswer] = useState('');
  const [revealAt, setRevealAt] = useState('');

  const post = useMutation({
    mutationFn: () => {
      const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
      const body: CreateChallengeBody = {
        question: question.trim(),
        answer: answer.trim(),
        revealAt: new Date(revealAt).toISOString(),
        ...(trimmedOptions.length > 0 ? { options: trimmedOptions } : {}),
      };
      return api.createChallenge(orgId, classId, body);
    },
    onSuccess: () => {
      trackEvent('challenge_posted', { classId, hasOptions: options.some((o) => o.trim()) });
      setQuestion('');
      setOptions(['', '']);
      setAnswer('');
      setRevealAt('');
      onPosted();
    },
  });

  const setOption = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (i: number) =>
    setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const canPost = question.trim() && answer.trim() && revealAt && !post.isPending;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-ink">Post a challenge</h3>

      {/* Question */}
      <div>
        <label className="block text-xs font-medium text-ink2 mb-1.5">Question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="e.g. What gas do plants release during photosynthesis?"
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
        />
      </div>

      {/* Optional MCQ options */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-ink2">Options (optional — leave blank for open answer)</label>
          <button
            onClick={addOption}
            type="button"
            className="text-xs font-semibold text-accent hover:underline"
          >
            + Add option
          </button>
        </div>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button
                onClick={() => removeOption(i)}
                type="button"
                disabled={options.length <= 1}
                className="text-ink3 hover:text-bad text-lg leading-none px-1 disabled:opacity-30"
                title="Remove option"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Correct answer */}
      <div>
        <label className="block text-xs font-medium text-ink2 mb-1.5">Correct answer</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="The answer students see after reveal"
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {/* Reveal time */}
      <div>
        <label className="block text-xs font-medium text-ink2 mb-1.5">Reveal at</label>
        <input
          type="datetime-local"
          value={revealAt}
          onChange={(e) => setRevealAt(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {post.error && (
          <p className="text-xs text-bad flex-1">
            {post.error instanceof Error ? post.error.message : 'Could not post the challenge.'}
          </p>
        )}
        <button
          onClick={() => post.mutate()}
          disabled={!canPost}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
        >
          {post.isPending ? 'Posting…' : 'Post challenge'}
        </button>
      </div>
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const revealDate = new Date(challenge.revealAt);
  const revealed = challenge.answer != null && challenge.answer !== '';
  const dist = challenge.distribution ?? null;
  const distTotal = dist ? dist.reduce((sum, d) => sum + d.count, 0) : 0;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <p className="flex-1 min-w-0 text-sm font-medium text-ink">{challenge.question}</p>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            revealed ? 'bg-ok/20 text-ok' : 'bg-panel2 text-ink3'
          }`}
        >
          {revealed ? 'Revealed' : 'Scheduled'}
        </span>
      </div>

      <p className="text-xs text-ink3">
        {revealed ? 'Revealed' : 'Reveals'} {revealDate.toLocaleString()}
      </p>

      {challenge.options && challenge.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {challenge.options.map((o, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-full text-xs ${
                revealed && o === challenge.answer
                  ? 'bg-ok/20 text-ok font-semibold'
                  : 'bg-panel2 text-ink2'
              }`}
            >
              {o}
            </span>
          ))}
        </div>
      )}

      {revealed && (
        <div className="bg-panel2 rounded-lg px-3 py-2">
          <p className="text-xs text-ink3">Answer</p>
          <p className="text-sm font-semibold text-ok">{challenge.answer}</p>
        </div>
      )}

      {revealed && dist && dist.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink3">Responses</p>
          {dist.map((d, i) => {
            const pct = distTotal > 0 ? Math.round((d.count / distTotal) * 100) : 0;
            const correct = d.option === challenge.answer;
            return (
              <div key={i} className="flex items-center gap-3">
                <span
                  className={`flex-1 min-w-0 text-xs truncate ${correct ? 'text-ok font-semibold' : 'text-ink2'}`}
                  title={d.option}
                >
                  {d.option}
                </span>
                <div className="w-1/2 h-2 bg-panel2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${correct ? 'bg-ok' : 'bg-accent/50'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums w-6 text-right text-ink3">{d.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChallengesTab({ orgId, classId }: { orgId: string; classId: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['challenges', classId],
    queryFn: () => api.listChallenges(classId),
  });

  if (query.isLoading) return <p className="text-ink3 text-sm py-8">Loading challenges...</p>;
  if (query.error) return <ErrorView message="Could not load challenges." onRetry={() => query.refetch()} />;

  const challenges = query.data ?? [];

  return (
    <div className="space-y-4">
      <ChallengePoster
        orgId={orgId}
        classId={classId}
        onPosted={() => qc.invalidateQueries({ queryKey: ['challenges', classId] })}
      />

      {challenges.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No challenges yet"
          description="Post a challenge above. Students answer it, and the correct answer reveals at the time you set."
        />
      ) : (
        <div className="space-y-3">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
