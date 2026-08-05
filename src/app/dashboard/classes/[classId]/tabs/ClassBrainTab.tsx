'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import MochiUploader from '@/components/MochiUploader';
import ChapterPickerModal from '@/components/ChapterPicker';
import EmptyState from '@/components/EmptyState';
import { useTranslation } from '@/lib/messages';
import { FilesPanel } from '../components/FilesPanel';
import { BrainPagesSection } from '../components/BrainPagesSection';

export function ClassBrainTab({ corpusAvatarId, classId }: { corpusAvatarId: string | null; classId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const org = useOrg();
  const [uploaderOpen, setUploaderOpen] = useState(false);

  if (!corpusAvatarId) {
    return (
      <EmptyState
        icon="📚"
        title={t('classBrainTabNoCorpusTitle')}
        description={t('classBrainTabNoCorpusDescription')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Ingestion-quality tips — input quality is the #1 driver of brain quality. */}
      <div className="rounded-2xl bg-accent/5 border border-accent/20 px-4 py-3 text-xs text-ink2 leading-relaxed">
        <span className="font-semibold text-ink">{t('classBrainTabTipsTitle')}</span> {t('classBrainTabTipsBody')}
      </div>

      {/* 1 — Read: compiled brain pages */}
      <BrainPagesSection avatarId={corpusAvatarId} orgId={org?.orgId} classId={classId} />

      {/* 1b — the return loop: chapters uploaded but not yet compiled */}
      <LockedChaptersCard avatarId={corpusAvatarId} />

      {/* 2 — Read + Delete: source files */}
      <FilesPanel avatarId={corpusAvatarId} />

      {/* 3 — Update: how the Mochi teaches this class */}
      {org && <TeachingStyleCard orgId={org.orgId} classId={classId} avatarId={corpusAvatarId} />}

      {/* 4 — Update: add more notes (collapsed by default) */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <button
          onClick={() => setUploaderOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-panel2 transition"
        >
          <span className="text-sm font-semibold text-ink">{t('classBrainTabUploadMore')}</span>
          <span className="text-ink3 text-xs">{uploaderOpen ? t('classBrainTabCollapse') : t('classBrainTabExpand')}</span>
        </button>
        {uploaderOpen && (
          <div className="px-5 pb-5 border-t border-line pt-4">
            <p className="text-ink3 text-xs mb-4">
              {t('classBrainTabUploadDescription')}
            </p>
            <MochiUploader
              avatarId={corpusAvatarId}
              classId={classId}
              onComplete={() => {
                qc.invalidateQueries({ queryKey: ['classFiles', corpusAvatarId] });
                qc.invalidateQueries({ queryKey: ['wikiPages', corpusAvatarId] });
                setUploaderOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** The locked-chapter surface (0.7): uploaded-but-uncompiled chapters, tappable →
 *  the SAME ChapterPickerModal the post-upload picker uses. Copy stays honest. */
function LockedChaptersCard({ avatarId }: { avatarId: string }) {
  const { t, tp } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['chapters', avatarId],
    queryFn: () => api.chapters(avatarId),
    enabled: !!avatarId,
  });
  const locked = (data?.data.chapters ?? []).filter((c) => c.state === 'LOCKED');
  if (locked.length === 0) return null;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">
          {tp.classBrainTabChapterNotCompiled(locked.length)}
        </h3>
        <p className="text-ink3 text-xs mt-1">
          {tp.classBrainTabNotRead(locked.length)}
        </p>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition shrink-0"
      >
        {t('classBrainTabChooseChapters')}
      </button>
      {open && (
        <ChapterPickerModal
          avatarId={avatarId}
          onClose={() => setOpen(false)}
          onCompiled={() => qc.invalidateQueries({ queryKey: ['wikiPages', avatarId] })}
        />
      )}
    </div>
  );
}

const TEACHING_PRESETS: Record<string, string> = {
  'More examples': 'Use more worked examples.',
  'Harder questions': 'Challenge students with harder questions.',
  'Explain simply': 'Explain things as simply as possible.',
  'Exam-focused': 'Focus on exam-style questions and techniques.',
};
// UI-chrome labels only (translated below) — the phrase VALUES above stay
// English: they're free-text teacher-instruction DATA sent to the AI prompt
// assembler (teacherPreferences), not client-side chrome, so changing their
// language is a content_language-scoped decision, not a UI-locale one — the
// same axis distinction PromptLanguage/content_language draws elsewhere in
// this codebase. Translating only the button caption keeps that boundary.
const PRESET_LABEL_KEY: Record<string, 'teachingPresetMoreExamples' | 'teachingPresetHarderQuestions' | 'teachingPresetExplainSimply' | 'teachingPresetExamFocused'> = {
  'More examples': 'teachingPresetMoreExamples',
  'Harder questions': 'teachingPresetHarderQuestions',
  'Explain simply': 'teachingPresetExplainSimply',
  'Exam-focused': 'teachingPresetExamFocused',
};

function TeachingStyleCard({ orgId, classId, avatarId }: { orgId: string; classId: string; avatarId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['avatar', avatarId],
    queryFn: () => api.avatar(avatarId),
    enabled: !!avatarId,
  });
  const [text, setText] = useState<string | null>(null);
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
        <h3 className="text-sm font-semibold text-ink">{t('classBrainTabTeachingStyleQuestion')}</h3>
        <p className="text-ink3 text-xs mt-1">
          {t('classBrainTabTeachingStyleHint')}
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
              {on ? '✓ ' : ''}{t(PRESET_LABEL_KEY[label])}
            </button>
          );
        })}
      </div>
      <textarea
        value={value}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        rows={3}
        placeholder={t('classBrainTabTeachingStylePlaceholder')}
        className="w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm
          focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
      />
      <div className="flex items-center justify-end gap-3">
        {save.isSuccess && text === null && (
          <span className="text-xs text-ok">{t('classBrainTabSaved')}</span>
        )}
        <button
          onClick={() => { save.mutate(value.trim()); setText(null); }}
          disabled={save.isPending}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {save.isPending ? t('classBrainTabSaving') : t('classBrainTabSaveTeachingStyle')}
        </button>
      </div>
    </div>
  );
}
