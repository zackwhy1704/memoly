// Off by default — production uses real API data. Set NEXT_PUBLIC_USE_MOCK=true
// only for local UI work without a backend.
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export const mockOverview = {
  activeThisWeek: 18,
  totalStudents: 24,
  avgGrasp: 0.68,
  graspDelta: 0.04,
  topicsLive: 12,
  atRiskCount: 3,
  graspTrend: Array.from({ length: 12 }, (_, i) => ({
    week: new Date(Date.now() - (11 - i) * 7 * 864e5).toISOString().slice(0, 10),
    value: parseFloat((0.55 + i * 0.012 + Math.random() * 0.04).toFixed(2)),
  })),
  classes: [
    { cohort: 'Sec 3A', studentCount: 12, avgGrasp: 0.72 },
    { cohort: 'Sec 3B', studentCount: 12, avgGrasp: 0.63 },
  ],
  atRisk: [
    { studentId: 's1', name: 'Wei Ming', cohort: 'Sec 3B', reason: 'Inactive 9d', severity: 'high' },
    { studentId: 's2', name: 'Priya S.', cohort: 'Sec 3A', reason: 'Low grasp', severity: 'high' },
    { studentId: 's3', name: 'Jun Hao', cohort: 'Sec 3B', reason: 'Developing', severity: 'medium' },
  ],
  recentActivity: [
    { studentName: 'Alice Tan', topic: 'integration', wasCorrect: true, at: new Date().toISOString() },
    { studentName: 'Wei Ming', topic: 'differentiation', wasCorrect: false, at: new Date(Date.now() - 6e5).toISOString() },
    { studentName: 'Priya S.', topic: 'vectors', wasCorrect: true, at: new Date(Date.now() - 12e5).toISOString() },
    { studentName: 'Jun Hao', topic: 'statistics', wasCorrect: false, at: new Date(Date.now() - 18e5).toISOString() },
  ],
};

export const mockHeatmap = {
  students: [
    { id: 's1', displayName: 'Alice Tan', initials: 'AT' },
    { id: 's2', displayName: 'Wei Ming', initials: 'WM' },
    { id: 's3', displayName: 'Priya S.', initials: 'PS' },
    { id: 's4', displayName: 'Jun Hao', initials: 'JH' },
    { id: 's5', displayName: 'Sarah L.', initials: 'SL' },
  ],
  topics: ['integration', 'differentiation', 'complex-numbers', 'vectors', 'statistics'],
  cells: [
    [0.85, 0.40, 0.72, 0.91, 0.60],
    [0.90, 0.55, null, 0.78, 0.45],
    [0.60, null, 0.35, 0.82, 0.70],
    [0.75, 0.68, 0.82, null, 0.55],
    [0.88, 0.42, 0.65, 0.73, 0.38],
  ],
  topicAverages: [
    { topic: 'integration', avg: 0.80 },
    { topic: 'differentiation', avg: 0.72 },
    { topic: 'complex-numbers', avg: 0.32 },
    { topic: 'vectors', avg: 0.81 },
    { topic: 'statistics', avg: 0.41 },
  ],
  weakest: [
    { topic: 'complex-numbers', avg: 0.32 },
    { topic: 'statistics', avg: 0.41 },
    { topic: 'differentiation', avg: 0.51 },
  ],
};

export const mockStudent = {
  studentId: 's1',
  displayName: 'Alice Tan',
  cohortLabel: 'Sec 3A',
  streakDays: 7,
  level: 5,
  xp: 420,
  grasp: 0.74,
  examInDays: 18,
  graspOverTime: Array.from({ length: 10 }, (_, i) => ({
    week: new Date(Date.now() - (9 - i) * 7 * 864e5).toISOString().slice(0, 10),
    value: parseFloat((0.60 + i * 0.015).toFixed(2)),
  })),
  topicGrasp: [
    { topic: 'complex-numbers', grasp: 0.42, attempts: 18 },
    { topic: 'statistics', grasp: 0.55, attempts: 12 },
    { topic: 'vectors', grasp: 0.73, attempts: 22 },
    { topic: 'integration', grasp: 0.85, attempts: 30 },
    { topic: 'differentiation', grasp: 0.90, attempts: 28 },
  ],
  engagement: {
    questions: 110,
    quizDays: 14,
    lastActive: new Date(Date.now() - 864e5 * 2).toISOString().slice(0, 10),
  },
};

export const mockRoster = {
  students: [
    { userId: 's1', displayName: 'Alice Tan', level: 5, xp: 420, streakDays: 7, cohortLabel: 'Sec 3A' },
    { userId: 's2', displayName: 'Wei Ming', level: 3, xp: 180, streakDays: 0, cohortLabel: 'Sec 3B' },
    { userId: 's3', displayName: 'Priya S.', level: 4, xp: 310, streakDays: 2, cohortLabel: 'Sec 3A' },
    { userId: 's4', displayName: 'Jun Hao', level: 2, xp: 90, streakDays: 0, cohortLabel: 'Sec 3B' },
    { userId: 's5', displayName: 'Sarah L.', level: 6, xp: 550, streakDays: 12, cohortLabel: 'Sec 3A' },
    { userId: 's6', displayName: 'Marcus T.', level: 4, xp: 280, streakDays: 5, cohortLabel: 'Sec 3B' },
    { userId: 's7', displayName: 'Hui Ling', level: 3, xp: 150, streakDays: 1, cohortLabel: 'Sec 3A' },
    { userId: 's8', displayName: 'Raj K.', level: 5, xp: 390, streakDays: 9, cohortLabel: 'Sec 3B' },
  ],
  totalElements: 8,
};

// Identity / org / billing mocks so the dashboard renders with no backend.
export const mockMe = {
  userId: 'mock-owner',
  email: 'demo@apalchi.test',
  displayName: 'Demo Owner',
  setupComplete: true,
  role: 'USER',
  isCentreStaff: true,
  isOwner: true,
  accountStatus: 'ACTIVE',
  defaultAnswerMode: 'GUIDED',
  preferredLocale: 'en',
};

export const mockCentreMe = {
  orgId: 'mock-org',
  orgName: 'Demo Tuition Centre',
  seatsUsed: 24,
  seatLimit: 50,
  cohorts: ['Sec 3A', 'Sec 3B'],
};

export const mockEntitlement = {
  isPremium: true,
  source: 'SELF',
  plan: 'CENTRE',
  status: 'ACTIVE',
  trialEndsAt: null as string | null,
};

export const mockClasses = [
  { id: 'c1', name: 'Sec 3A Maths', subject: 'MATHS', level: 'Sec 3', joinCode: 'ABC123',
    corpusAvatarId: null, characterType: 'MOCHI', brandName: null, accentColor: '#4C6FFF',
    examDate: null, cosmeticEyewear: null, cosmeticClothes: null, cosmeticShoes: null, studentCount: 12 },
  { id: 'c2', name: 'Sec 3B Science', subject: 'SCIENCE', level: 'Sec 3', joinCode: 'DEF456',
    corpusAvatarId: null, characterType: 'MOCHI', brandName: null, accentColor: '#43C97A',
    examDate: null, cosmeticEyewear: null, cosmeticClothes: null, cosmeticShoes: null, studentCount: 12 },
];
