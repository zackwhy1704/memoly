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
  classesPageStudentCount: (n: number) => string;
  classesPageDeleteConfirmHeading: (name: string) => string;
  createClassModalReady: (name: string) => string;
  createClassModalChaptersReady: (n: number) => string;
  createClassModalPagesCompiled: (completed: number, total: number) => string;
  createClassModalReadyForStudents: (name: string) => string;
  brainPagesQuality: (score: number) => string;
  brainPagesQuizUseCount: (n: number) => string;
  contentReviewClaimCount: (n: number) => string;
  contentReviewItemsPendingReview: (n: number) => string;
  contentReviewApproveAllButton: (n: number) => string;
  filesPanelPageCount: (n: number) => string;
  narrationCardsDuration: (count: number, duration: string) => string;
  narrationCardDuration: (cardNum: number, duration: string) => string;
  answerReleaseReleased: (date: string | null) => string;
  answerReleaseScheduleDefaultLabel: (dueDate: string | null) => string;
  readinessModalStudentFallback: (id: string) => string;
  readinessModalWeakCount: (n: number) => string;
  readinessModalMasteryTitle: (pct: number) => string;
  buildStatusCompilingProgress: (completed: number, total: number) => string;
  buildStatusLessonCount: (n: number) => string;
  buildStatusFailedCount: (n: number) => string;
  modulePreviewAriaLabel: (title: string) => string;
  createAssignmentMasteryThreshold: (pct: number) => string;
  accountPageStoreSoon: (store: string) => string;
  billingPagePriceMonthly: (price: string) => string;
  billingPagePriceAnnual: (price: string) => string;
  dashboardPageOfStudents: (n: number) => string;
  dashboardPageVsLastWeek: (deltaStr: string) => string;
  dashboardPageMinutesAgo: (m: number) => string;
  dashboardPageHoursAgo: (h: number) => string;
  settingsPageSeatsUsed: (used: number, limit: number) => string;
  acceptInviteStaffTitle: (centreName: string) => string;
  deleteAccountScheduledBodyWithDate: (date: string) => string;
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
  classesPageStudentCount: (n) => `${n} student${n !== 1 ? 's' : ''}`,
  classesPageDeleteConfirmHeading: (name) => `Delete "${name}"?`,
  createClassModalReady: (name) => `${name} is ready!`,
  createClassModalChaptersReady: (n) => (n > 0 ? `${n} chapters ready to pick` : 'Chapters ready to pick'),
  createClassModalPagesCompiled: (completed, total) => `${completed} / ${total} pages compiled`,
  createClassModalReadyForStudents: (name) => `${name} is ready for students to join.`,
  brainPagesQuality: (score) => `Quality ${score}/100`,
  brainPagesQuizUseCount: (n) => `Used in ${n} quiz item${n !== 1 ? 's' : ''}`,
  contentReviewClaimCount: (n) => `${n} claim${n !== 1 ? 's' : ''}`,
  contentReviewItemsPendingReview: (n) => `${n} item${n !== 1 ? 's' : ''} pending review`,
  contentReviewApproveAllButton: (n) => `Approve all (${n})`,
  filesPanelPageCount: (n) => `${n} pages`,
  narrationCardsDuration: (count, duration) => `${count} cards · ${duration} total`,
  narrationCardDuration: (cardNum, duration) => `Card ${cardNum} · ${duration}`,
  answerReleaseReleased: (date) => (date ? `✓ Released at ${date}` : '✓ Released'),
  answerReleaseScheduleDefaultLabel: (dueDate) =>
    dueDate ? `Schedule release (default: due ${dueDate})` : 'Schedule release (default: due date)',
  readinessModalStudentFallback: (id) => `Student ${id}`,
  readinessModalWeakCount: (n) => `${n} weak`,
  readinessModalMasteryTitle: (pct) => `${pct}% mastery`,
  buildStatusCompilingProgress: (completed, total) => `Compiling ${completed}/${total} pages…`,
  buildStatusLessonCount: (n) => `Mochi compiled ${n} page${n === 1 ? '' : 's'} from your notes.`,
  buildStatusFailedCount: (n) =>
    `${n} page${n === 1 ? ' was' : 's were'} hard to read — Mochi may have missed some content.`,
  modulePreviewAriaLabel: (title) => `Preview: ${title}`,
  createAssignmentMasteryThreshold: (pct) => `Mastery threshold: ${pct}%`,
  accountPageStoreSoon: (store) => `${store} — soon`,
  billingPagePriceMonthly: (price) => `${price} / month`,
  billingPagePriceAnnual: (price) => `${price} / year`,
  dashboardPageOfStudents: (n) => `of ${n} students`,
  dashboardPageVsLastWeek: (deltaStr) => `${deltaStr} vs last week`,
  dashboardPageMinutesAgo: (m) => `${m}m ago`,
  dashboardPageHoursAgo: (h) => `${h}h ago`,
  settingsPageSeatsUsed: (used, limit) => `${used} of ${limit} used`,
  acceptInviteStaffTitle: (centreName) => `Join ${centreName} as a teacher`,
  deleteAccountScheduledBodyWithDate: (date) => `It will be permanently deleted on ${date}. `,
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
  classesPageStudentCount: (n) => `${n} 名学生`,
  classesPageDeleteConfirmHeading: (name) => `删除"${name}"？`,
  createClassModalReady: (name) => `${name} 已就绪！`,
  createClassModalChaptersReady: (n) => (n > 0 ? `${n} 个章节可供选择` : '章节可供选择'),
  createClassModalPagesCompiled: (completed, total) => `已编译 ${completed} / ${total} 页`,
  createClassModalReadyForStudents: (name) => `${name} 已可供学生加入。`,
  brainPagesQuality: (score) => `质量 ${score}/100`,
  brainPagesQuizUseCount: (n) => `已用于 ${n} 道测验题`,
  contentReviewClaimCount: (n) => `${n} 条论述`,
  contentReviewItemsPendingReview: (n) => `${n} 项待复核`,
  contentReviewApproveAllButton: (n) => `全部批准（${n}）`,
  filesPanelPageCount: (n) => `${n} 页`,
  narrationCardsDuration: (count, duration) => `${count} 张卡片 · 共 ${duration}`,
  narrationCardDuration: (cardNum, duration) => `第 ${cardNum} 张 · ${duration}`,
  answerReleaseReleased: (date) => (date ? `✓ 已于${date}发布` : '✓ 已发布'),
  answerReleaseScheduleDefaultLabel: (dueDate) =>
    dueDate ? `安排发布时间（默认：截止日期 ${dueDate}）` : '安排发布时间（默认：截止日期）',
  readinessModalStudentFallback: (id) => `学生 ${id}`,
  readinessModalWeakCount: (n) => `${n} 项薄弱`,
  readinessModalMasteryTitle: (pct) => `掌握度 ${pct}%`,
  buildStatusCompilingProgress: (completed, total) => `正在编译 ${completed}/${total} 页…`,
  buildStatusLessonCount: (n) => `小伴已根据你的笔记编译了 ${n} 页内容。`,
  buildStatusFailedCount: (n) => `${n} 页内容难以识别——小伴可能遗漏了部分内容。`,
  modulePreviewAriaLabel: (title) => `预览：${title}`,
  createAssignmentMasteryThreshold: (pct) => `掌握度阈值：${pct}%`,
  accountPageStoreSoon: (store) => `${store}——即将上线`,
  billingPagePriceMonthly: (price) => `${price} / 月`,
  billingPagePriceAnnual: (price) => `${price} / 年`,
  dashboardPageOfStudents: (n) => `共 ${n} 名学生中`,
  dashboardPageVsLastWeek: (deltaStr) => `较上周 ${deltaStr}`,
  dashboardPageMinutesAgo: (m) => `${m} 分钟前`,
  dashboardPageHoursAgo: (h) => `${h} 小时前`,
  settingsPageSeatsUsed: (used, limit) => `已用 ${used}，共 ${limit} 个席位`,
  acceptInviteStaffTitle: (centreName) => `作为教师加入${centreName}`,
  deleteAccountScheduledBodyWithDate: (date) => `账户将于${date}被永久删除。`,
};
