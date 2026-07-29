'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type OrgClass } from '@/lib/api';
import { CENTRE_SUBJECTS } from '@/lib/centre-mochis';
import { CONTENT_LANGUAGES, type ContentLanguageCode } from '@/lib/content-languages';

export default function EditClassModal({
  orgId,
  cls,
  onClose,
  onSaved,
}: {
  orgId: string;
  cls: OrgClass;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(cls.name);
  const [subject, setSubject] = useState(cls.subject ?? 'GENERAL');
  const [level, setLevel] = useState(cls.level ?? '');

  // Teaching language lives on the class's CORPUS avatar (content_language), not the class row —
  // fetch it to prefill. Default 'en' until loaded / when the class has no corpus.
  const avatarQuery = useQuery({
    queryKey: ['avatar', cls.corpusAvatarId],
    queryFn: () => api.avatar(cls.corpusAvatarId!),
    enabled: !!cls.corpusAvatarId,
  });
  const initialLang: ContentLanguageCode =
    avatarQuery.data?.data.contentLanguage === 'zh' ? 'zh' : 'en';
  // Derive, don't sync-via-effect: the select shows the teacher's override if they picked one,
  // otherwise the fetched value (which fills in once the avatar query resolves). No setState-in-effect.
  const [languageOverride, setLanguageOverride] = useState<ContentLanguageCode | null>(null);
  const contentLanguage = languageOverride ?? initialLang;

  const mut = useMutation({
    mutationFn: async () => {
      await api.updateClass(orgId, cls.id, {
        name: name.trim(),
        subject,
        level: level.trim() || undefined,
      });
      // Language is a SEPARATE avatar PATCH, only when it changed. A failure fails the whole save
      // (mut.isError → the visible error + Retry below), never a silent partial success.
      if (cls.corpusAvatarId && contentLanguage !== initialLang) {
        await api.setContentLanguage(cls.corpusAvatarId, contentLanguage);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', orgId] });
      onSaved();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">Edit class</h2>

        <div className="space-y-3">
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
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
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
          <label className="block">
            <span className="text-xs text-ink2 font-medium">Teaching language</span>
            <select
              value={contentLanguage}
              onChange={(e) => setLanguageOverride(e.target.value as ContentLanguageCode)}
              disabled={!cls.corpusAvatarId}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:opacity-40"
            >
              {CONTENT_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink3">
              Changing this affects only material compiled from now on — existing lessons and quizzes keep the language they were created in.
            </span>
          </label>
        </div>

        {mut.isError && (
          <p className="text-xs text-bad">
            {(mut.error as Error)?.message || 'Could not save. Please try again.'}
            {' '}
            <button className="underline" onClick={() => mut.mutate()}>Retry</button>
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!name.trim() || mut.isPending}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {mut.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
