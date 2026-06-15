'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import MochiUploader from '@/components/MochiUploader';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';

export function ContentTab({ corpusAvatarId, classId }: { corpusAvatarId: string | null; classId: string }) {
  const qc = useQueryClient();
  const org = useOrg();

  const query = useQuery({
    queryKey: ['classFiles', corpusAvatarId],
    queryFn: () => api.files(corpusAvatarId!),
    enabled: !!corpusAvatarId,
  });

  if (!corpusAvatarId) {
    return (
      <EmptyState
        icon="📚"
        title="No corpus yet"
        description="This class has no content corpus. Contact support if this is unexpected."
      />
    );
  }

  const files = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      {org && <TeachingStyleCard orgId={org.orgId} classId={classId} avatarId={corpusAvatarId} />}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm text-ink2 mb-4">
          Upload notes, worksheets or PDFs. Every student&apos;s Mochi in this class reads this shared corpus.
        </p>
        <MochiUploader
          avatarId={corpusAvatarId}
          classId={classId}
          onComplete={() => qc.invalidateQueries({ queryKey: ['classFiles', corpusAvatarId] })}
        />
      </div>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        {query.isLoading ? (
          <p className="text-ink3 text-sm p-5">Loading files...</p>
        ) : query.error ? (
          <div className="p-4">
            <ErrorView message="Could not load uploaded files." onRetry={() => query.refetch()} />
          </div>
        ) : files.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="📭"
              title="No content uploaded yet"
              description="Upload teaching material to build this class's knowledge base."
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{f.fileName}</td>
                  <td className="px-5 py-3.5 text-ink3 text-xs">{f.pageCount} pages</td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className="px-2 py-1 rounded-full bg-panel2 text-ink2">{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** Per-class teaching style → persisted on the corpus avatar's teacherPreferences,
 *  which the backend already injects into the tutor system prompt
 *  (## TEACHER INSTRUCTIONS). Applies to every student's Mochi in the class. */
const TEACHING_PRESETS: Record<string, string> = {
  'More examples': 'Use more worked examples.',
  'Harder questions': 'Challenge students with harder questions.',
  'Explain simply': 'Explain things as simply as possible.',
  'Exam-focused': 'Focus on exam-style questions and techniques.',
};

function TeachingStyleCard({ orgId, classId, avatarId }: { orgId: string; classId: string; avatarId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['avatar', avatarId],
    queryFn: () => api.avatar(avatarId),
    enabled: !!avatarId,
  });
  const [text, setText] = useState<string | null>(null);
  // Server value until the teacher edits, then the local draft.
  const value = text ?? data?.data.teacherPreferences ?? '';

  const save = useMutation({
    mutationFn: (prefs: string) => api.setClassTeachingStyle(orgId, classId, prefs),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avatar', avatarId] }),
  });

  function toggle(phrase: string) {
    const cur = value.trim();
    let next: string;
    if (cur.includes(phrase)) {
      next = cur.replace(phrase, '').replace(/\s{2,}/g, ' ').trim();
    } else {
      const sep = cur === '' ? '' : cur.endsWith('.') ? ' ' : '. ';
      next = `${cur}${sep}${phrase}`;
    }
    if (next.length <= 500) setText(next);
  }

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">How should this class&apos;s Mochi teach?</h3>
        <p className="text-ink3 text-xs mt-1">
          Tap a style or write your own. Every student&apos;s Mochi follows this in lessons and chat.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TEACHING_PRESETS).map(([label, phrase]) => {
          const on = value.includes(phrase);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(phrase)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                on
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-panel2 border-line text-ink2 hover:border-accent/30'
              }`}
            >
              {on ? '✓ ' : ''}{label}
            </button>
          );
        })}
      </div>
      <textarea
        value={value}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="e.g. Use the bar model for fractions. Always show full working."
        className="w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm
          focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
      />
      <div className="flex items-center justify-end gap-3">
        {save.isSuccess && text === null && (
          <span className="text-xs text-ok">Saved ✓</span>
        )}
        <button
          onClick={() => { save.mutate(value.trim()); setText(null); }}
          disabled={save.isPending}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save teaching style'}
        </button>
      </div>
    </div>
  );
}
