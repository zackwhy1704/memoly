/**
 * Parameterized message templates — the ICU-placeholder equivalent for
 * sentences built around a count/name/date rather than a flat string.
 * Each function returns a COMPLETE sentence per language; English and
 * Chinese branches are independent (not string-substituted into a shared
 * template), because Chinese has no plural forms and several of these
 * sentences have different word order — the same reason PromptLanguage's
 * ZH_DIRECTIVE work earlier this thread had to fix an English few-shot
 * example rather than translate its fragments in place.
 */

export interface Templates {
  fileCount: (n: number) => string;
  assignmentsTabCompletedCount: (completed: number, total: number) => string;
  assignmentsTabOverdueCount: (n: number) => string;
  assignmentsTabDue: (date: string) => string;
  classBrainTabChapterNotCompiled: (n: number) => string;
  classBrainTabNotRead: (n: number) => string;
  classBriefTabFailedPct: (pct: number) => string;
  classBriefTabStruggling: (names: string) => string;
  examReadinessTabConceptsBelow: (n: number) => string;
  assignmentsTabCount: (n: number) => string;
  markingScopeBanner: (centre: string, subject: string | null) => string;
  markingTrains: (centre: string, subject: string | null) => string;
  markingSharedFor: (subject: string | null, centre: string) => string;
  markingGradedAgainst: (n: number) => string;
  markingTrainedOn: (n: number) => string;
  markingDeleteConfirm: (title: string) => string;
  modulesTabCompletedCount: (completed: number, total: number) => string;
  modulesTabCompiling: (n: number) => string;
  reportTabGenerated: (date: string, cached: boolean) => string;
  submissionsTabReleasedTo: (date: string | null) => string;
  submissionsTabCount: (n: number) => string;
  submissionsTabNeedMarking: (n: number) => string;
  rosterLevelBadge: (n: number) => string;
  rosterXp: (n: number) => string;
  /** Compact table-cell chip ("🔥 Nd") — no "streak" word, sits under a "Streak" column header. */
  rosterStreakBadge: (n: number) => string;
  /** Inline prose chip ("Nd streak") — used where there's no adjacent column header. */
  rosterStreakDays: (n: number) => string;
  studentsPageShowingCount: (shown: number, total: number) => string;
  studentsPageRemoveConfirmHeading: (name: string) => string;
  studentDetailExamInDays: (n: number) => string;
  studentDetailAttemptsCount: (n: number) => string;
  teachersPageAlreadyRegistered: (email: string) => string;
  teachersPageInviteSent: (email: string) => string;
}

export const templatesEn: Templates = {
  fileCount: (n) => `${n} file${n !== 1 ? 's' : ''}`,
  assignmentsTabCount: (n) => `${n} assignment${n !== 1 ? 's' : ''}`,
  assignmentsTabCompletedCount: (completed, total) => `${completed}/${total} completed`,
  assignmentsTabOverdueCount: (n) => `${n} overdue`,
  assignmentsTabDue: (date) => `Due ${date}`,
  classBrainTabChapterNotCompiled: (n) => `${n} chapter${n === 1 ? '' : 's'} not compiled yet`,
  classBrainTabNotRead: (n) =>
    `Mochi hasn't read ${n === 1 ? 'this chapter' : 'these chapters'} yet — pick which to compile.`,
  classBriefTabFailedPct: (pct) => `${pct}% failed`,
  classBriefTabStruggling: (names) => `Struggling: ${names}`,
  examReadinessTabConceptsBelow: (n) => `${n} concept${n !== 1 ? 's' : ''} below 60%`,
  markingScopeBanner: (centre, subject) => {
    const subj = subject?.trim() || null;
    const subjName = subj ?? 'this subject';
    const sharedScope = subj ? `all your ${subj} classes` : 'all your classes of this subject';
    const everyClass = subj ? `every ${subj} class` : 'every class of this subject';
    return `You're training ${centre}'s ${subjName} marking standard. It's shared across ${sharedScope} — uploading here improves marking for ${everyClass} in your centre.`;
  },
  markingTrains: (centre, subject) => {
    const subj = subject?.trim() || null;
    const subjName = subj ?? 'this subject';
    const sharedScope = subj ? `all your ${subj} classes` : 'all your classes of this subject';
    return `Trains ${centre}'s shared ${subjName} marking standard (${sharedScope}).`;
  },
  markingSharedFor: (subject, centre) => {
    const subjName = subject?.trim() || 'this subject';
    return `Shared ${subjName} marking standard for ${centre}.`;
  },
  markingGradedAgainst: (n) =>
    `AI feedback drafts are graded against these ${n} marking rule${n !== 1 ? 's' : ''}, learned from your uploads.`,
  markingTrainedOn: (n) => `your assistant is trained on ${n} reference${n !== 1 ? 's' : ''}.`,
  markingDeleteConfirm: (title) => `Delete "${title}"? This removes it from your marking assistant.`,
  modulesTabCompletedCount: (completed, total) => `${completed}/${total} completed`,
  modulesTabCompiling: (n) =>
    n > 0
      ? `Compiling ${n} chapter${n === 1 ? '' : 's'} — modules will appear here as they land.`
      : 'Compiling chapters — modules will appear here as they land.',
  reportTabGenerated: (date, cached) => `Generated ${date}${cached ? ' · cached' : ''}`,
  submissionsTabReleasedTo: (date) => `Released to the student${date ? ` on ${date}` : ''}.`,
  submissionsTabCount: (n) => `${n} submission${n !== 1 ? 's' : ''}`,
  submissionsTabNeedMarking: (n) => `${n} need marking`,
  // Shared across the student roster + student-detail pages — both render the
  // exact same "Lv N" / "N XP" / "Nd streak" chips.
  rosterLevelBadge: (n) => `Lv ${n}`,
  rosterXp: (n) => `${n} XP`,
  rosterStreakBadge: (n) => `🔥 ${n}d`,
  rosterStreakDays: (n) => `${n}d streak`,
  studentsPageShowingCount: (shown, total) => `Showing ${shown} of ${total} students`,
  studentsPageRemoveConfirmHeading: (name) => `Remove ${name}?`,
  studentDetailExamInDays: (n) => `Exam in ${n}d`,
  studentDetailAttemptsCount: (n) => `${n} attempts`,
  teachersPageAlreadyRegistered: (email) =>
    `✓ ${email} was already registered and has been added to your centre.`,
  teachersPageInviteSent: (email) => `✓ Invite sent to ${email}`,
};

export const templatesZh: Templates = {
  fileCount: (n) => `${n} 个文件`,
  assignmentsTabCount: (n) => `${n} 份作业`,
  assignmentsTabCompletedCount: (completed, total) => `${completed}/${total} 已完成`,
  assignmentsTabOverdueCount: (n) => `${n} 项逾期`,
  assignmentsTabDue: (date) => `截止日期 ${date}`,
  classBrainTabChapterNotCompiled: (n) => `${n} 个章节尚未编译`,
  classBrainTabNotRead: () => '小伴还没有读取这（些）章节——请选择要编译的章节。',
  classBriefTabFailedPct: (pct) => `${pct}% 未通过`,
  classBriefTabStruggling: (names) => `困难学生：${names}`,
  examReadinessTabConceptsBelow: (n) => `${n} 个概念低于60%`,
  markingScopeBanner: (centre, subject) => {
    const subj = subject?.trim() || null;
    const subjName = subj ?? '该科目';
    const scope = subj ? `你所有的${subj}班级` : '你所有该科目的班级';
    return `你正在为${centre}训练${subjName}评分标准。此标准已共享至${scope}——在此上传将改善本中心${scope}的评分。`;
  },
  markingTrains: (centre, subject) => {
    const subj = subject?.trim() || null;
    const subjName = subj ?? '该科目';
    const scope = subj ? `你所有的${subj}班级` : '你所有该科目的班级';
    return `训练${centre}的共享${subjName}评分标准（适用于${scope}）。`;
  },
  markingSharedFor: (subject, centre) => {
    const subjName = subject?.trim() || '该科目';
    return `${centre}的共享${subjName}评分标准。`;
  },
  markingGradedAgainst: (n) => `AI反馈草稿依据这 ${n} 条从你的上传中学到的评分规则来评分。`,
  markingTrainedOn: (n) => `你的助手已基于 ${n} 份参考材料完成训练。`,
  markingDeleteConfirm: (title) => `删除"${title}"？这将从你的批改助手中移除该内容。`,
  modulesTabCompletedCount: (completed, total) => `${completed}/${total} 已完成`,
  modulesTabCompiling: (n) =>
    n > 0
      ? `正在编译 ${n} 个章节——模块生成后将显示在此处。`
      : '正在编译章节——模块生成后将显示在此处。',
  reportTabGenerated: (date, cached) => `生成于 ${date}${cached ? '（缓存）' : ''}`,
  submissionsTabReleasedTo: (date) => `已发布给学生${date ? `（${date}）` : ''}。`,
  submissionsTabCount: (n) => `${n} 份作业`,
  submissionsTabNeedMarking: (n) => `${n} 份待批改`,
  // "等级 N" mirrors pally's homeLevelBadge precedent ("⭐ 等级 {level}").
  rosterLevelBadge: (n) => `等级 ${n}`,
  rosterXp: (n) => `${n} XP`,
  rosterStreakBadge: (n) => `🔥 ${n} 天`,
  rosterStreakDays: (n) => `连续 ${n} 天`,
  studentsPageShowingCount: (shown, total) => `显示 ${total} 名学生中的 ${shown} 名`,
  studentsPageRemoveConfirmHeading: (name) => `移除 ${name}？`,
  studentDetailExamInDays: (n) => `距考试还有 ${n} 天`,
  studentDetailAttemptsCount: (n) => `${n} 次尝试`,
  teachersPageAlreadyRegistered: (email) => `✓ ${email} 已注册，并已加入你的中心。`,
  teachersPageInviteSent: (email) => `✓ 邀请已发送至 ${email}`,
};
