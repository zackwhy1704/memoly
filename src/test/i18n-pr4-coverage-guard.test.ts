import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanFile } from './lib/jsx-string-scanner';

/**
 * i18n COVERAGE GUARD for PR4 — the class-creation flow, the rest of
 * [classId] outside tabs/, the account/billing/settings/dashboard shell,
 * the in-scope auth-adjacent pages (accept-invite/delete-account/signup),
 * and the parent/external-reviewer pages (consent/approve, review/[token]/*,
 * wired for coverage-guard consistency even though they render English-only
 * in practice — no persisted locale to read from on an unauthenticated
 * magic-link page). Same shrink-only-baseline discipline as
 * i18n-tabs-coverage-guard.test.ts and i18n-roster-coverage-guard.test.ts
 * (shared scanner in ./lib/jsx-string-scanner).
 */
const APP_DIR = path.join(__dirname, '..', 'app');

const PR4_FILES: Array<{ label: string; filePath: string }> = [
  // Class-creation flow
  { label: 'dashboard/classes/page.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', 'page.tsx') },
  { label: 'dashboard/classes/modals/CreateClassModal.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', 'modals', 'CreateClassModal.tsx') },
  { label: 'dashboard/classes/modals/EditClassModal.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', 'modals', 'EditClassModal.tsx') },

  // [classId] non-tabs
  { label: '[classId]/page.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'page.tsx') },
  { label: '[classId]/TourOverlay.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'TourOverlay.tsx') },
  { label: '[classId]/components/BrainPagesSection.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'components', 'BrainPagesSection.tsx') },
  { label: '[classId]/components/ClassCodeBox.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'components', 'ClassCodeBox.tsx') },
  { label: '[classId]/components/ContentReviewPanel.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'components', 'ContentReviewPanel.tsx') },
  { label: '[classId]/components/FilesPanel.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'components', 'FilesPanel.tsx') },
  { label: '[classId]/components/HeatCell.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'components', 'HeatCell.tsx') },
  { label: '[classId]/components/ModulePreviewModal.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'components', 'ModulePreviewModal.tsx') },
  { label: '[classId]/components/NarrationAction.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'components', 'NarrationAction.tsx') },
  { label: '[classId]/modals/AnswerReleasePanel.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'modals', 'AnswerReleasePanel.tsx') },
  { label: '[classId]/modals/CreateAssignmentModal.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'modals', 'CreateAssignmentModal.tsx') },
  { label: '[classId]/modals/ReadinessModal.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'modals', 'ReadinessModal.tsx') },
  { label: '[classId]/teach/BuildStatusView.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'teach', 'BuildStatusView.tsx') },
  { label: '[classId]/teach/TeachFlow.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'teach', 'TeachFlow.tsx') },
  { label: '[classId]/teach/TeachStepper.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'teach', 'TeachStepper.tsx') },
  { label: '[classId]/teach/TrainingTipsPanel.tsx', filePath: path.join(APP_DIR, 'dashboard', 'classes', '[classId]', 'teach', 'TrainingTipsPanel.tsx') },

  // Account/billing/settings/dashboard shell
  { label: 'account/page.tsx', filePath: path.join(APP_DIR, 'account', 'page.tsx') },
  { label: 'account/layout.tsx', filePath: path.join(APP_DIR, 'account', 'layout.tsx') },
  { label: 'account/billing/page.tsx', filePath: path.join(APP_DIR, 'account', 'billing', 'page.tsx') },
  { label: 'dashboard/page.tsx', filePath: path.join(APP_DIR, 'dashboard', 'page.tsx') },
  { label: 'dashboard/layout.tsx', filePath: path.join(APP_DIR, 'dashboard', 'layout.tsx') },
  { label: 'dashboard/error.tsx', filePath: path.join(APP_DIR, 'dashboard', 'error.tsx') },
  { label: 'dashboard/settings/page.tsx', filePath: path.join(APP_DIR, 'dashboard', 'settings', 'page.tsx') },

  // Auth-adjacent, in scope (teacher/centre-owner audience)
  { label: 'accept-invite/[token]/page.tsx', filePath: path.join(APP_DIR, 'accept-invite', '[token]', 'page.tsx') },
  { label: 'delete-account/page.tsx', filePath: path.join(APP_DIR, 'delete-account', 'page.tsx') },
  { label: 'signup/page.tsx', filePath: path.join(APP_DIR, 'signup', 'page.tsx') },

  // Parent / external-reviewer audience — wired for guard consistency,
  // English-only in practice (no persisted locale on an unauthenticated page)
  { label: 'consent/approve/page.tsx', filePath: path.join(APP_DIR, 'consent', 'approve', 'page.tsx') },
  { label: 'review/[token]/page.tsx', filePath: path.join(APP_DIR, 'review', '[token]', 'page.tsx') },
  { label: 'review/[token]/_components/GoneCard.tsx', filePath: path.join(APP_DIR, 'review', '[token]', '_components', 'GoneCard.tsx') },
  { label: 'review/[token]/_components/Header.tsx', filePath: path.join(APP_DIR, 'review', '[token]', '_components', 'Header.tsx') },
  { label: 'review/[token]/_components/LoadingCard.tsx', filePath: path.join(APP_DIR, 'review', '[token]', '_components', 'LoadingCard.tsx') },
  { label: 'review/[token]/_components/MessageCard.tsx', filePath: path.join(APP_DIR, 'review', '[token]', '_components', 'MessageCard.tsx') },
  { label: 'review/[token]/_components/ReviewBody.tsx', filePath: path.join(APP_DIR, 'review', '[token]', '_components', 'ReviewBody.tsx') },
  { label: 'review/[token]/_components/SuccessCard.tsx', filePath: path.join(APP_DIR, 'review', '[token]', '_components', 'SuccessCard.tsx') },
];

// Baseline: `<file>::<text>` -> reason. Empty — every hardcoded string across
// this PR's 36 files is translated; no deferred carve-outs this time (unlike
// [classId]/tabs' checklist/TEACHING_PRESETS).
const BASELINE: Record<string, string> = {};

describe('PR4 (class-creation, [classId] non-tabs, account/billing/dashboard shell, auth-adjacent, consent/review) i18n coverage guard', () => {
  it('every hardcoded English JSX text is translated, or a reasoned baseline entry', () => {
    const unexplained: string[] = [];
    for (const { label, filePath } of PR4_FILES) {
      const leaks = scanFile(filePath);
      for (const text of leaks) {
        const key = `${label}::${text}`;
        if (!(key in BASELINE)) unexplained.push(key);
      }
    }

    expect(unexplained, `Untranslated (or unbaselined) strings found:\n${unexplained.join('\n')}`).toEqual([]);
  });

  it('every baseline entry has a reason (no bare allow — this is the guard\'s teeth)', () => {
    const unreasoned = Object.entries(BASELINE).filter(([, reason]) => !reason || reason.trim() === '');
    expect(unreasoned).toEqual([]);
  });
});
