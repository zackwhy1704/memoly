import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Rendering smoke test for the roster pages (PR3) — proves translated
 * content actually resolves at RENDER time in both locales, the same
 * discipline as i18n-tabs-render.test.tsx. Mounts TeachersPage (simple)
 * and the student-detail page (complex: uses tp() templates + a chart).
 */
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMe: vi.fn(),
      listStaff: vi.fn(),
      student: vi.fn(),
    },
  };
});

vi.mock('@/lib/org-context', () => ({
  useOrg: () => ({ orgId: 'o1', orgName: 'Test Centre', seatsUsed: 1, seatLimit: 10, cohorts: [] }),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ studentId: 's1' }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

import { api } from '@/lib/api';
import { LocaleProvider } from '@/lib/locale';
import TeachersPage from '@/app/dashboard/teachers/page';
import StudentPage from '@/app/dashboard/students/[studentId]/page';

const mockedGetMe = vi.mocked(api.getMe);
const mockedListStaff = vi.mocked(api.listStaff);
const mockedStudent = vi.mocked(api.student);

function renderWithLocale(ui: React.ReactElement, locale: 'en' | 'zh') {
  if (locale === 'zh') localStorage.setItem('memoly_locale_v1', 'zh');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientProvider>
  );
}

describe('roster pages render translated content live (not just routed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockedGetMe.mockResolvedValue({ data: { preferredLocale: 'en' } } as never);
  });

  it('TeachersPage (simple) shows English heading + empty state by default', async () => {
    mockedListStaff.mockResolvedValue({ data: [] } as never);
    renderWithLocale(<TeachersPage />, 'en');
    expect(screen.getByText('Teachers')).toBeInTheDocument();
    expect(screen.getByText('Current staff')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('No staff yet — invite a teacher below.')).toBeInTheDocument()
    );
  });

  it('TeachersPage (simple) shows Simplified Chinese heading + empty state under zh', async () => {
    mockedListStaff.mockResolvedValue({ data: [] } as never);
    renderWithLocale(<TeachersPage />, 'zh');
    expect(screen.getByText('教师')).toBeInTheDocument();
    expect(screen.getByText('当前教职人员')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('暂无教职人员——请在下方邀请教师。')).toBeInTheDocument());
  });

  it('student-detail page (complex, uses tp() templates) renders English level/XP/streak chips', async () => {
    mockedStudent.mockResolvedValue({
      data: {
        studentId: 's1', displayName: 'Alex Tan', cohortLabel: 'P5', streakDays: 4, level: 7, xp: 320,
        grasp: 0.62, examInDays: 3,
        graspOverTime: [{ week: '2026-W01', value: 0.5 }],
        topicGrasp: [{ topic: 'fractions', grasp: 0.4, attempts: 5 }],
        engagement: { questions: 12, quizDays: 6, lastActive: '2026-08-01' },
      },
    } as never);
    renderWithLocale(<StudentPage />, 'en');
    await waitFor(() => expect(screen.getByText('Lv 7')).toBeInTheDocument());
    expect(screen.getByText('320 XP')).toBeInTheDocument();
    expect(screen.getByText('🔥 4d streak')).toBeInTheDocument();
    expect(screen.getByText('Exam in 3d')).toBeInTheDocument();
    expect(screen.getByText('5 attempts')).toBeInTheDocument();
  });

  it('student-detail page (complex, uses tp() templates) renders Chinese level/XP/streak chips under zh', async () => {
    mockedStudent.mockResolvedValue({
      data: {
        studentId: 's1', displayName: 'Alex Tan', cohortLabel: 'P5', streakDays: 4, level: 7, xp: 320,
        grasp: 0.62, examInDays: 3,
        graspOverTime: [{ week: '2026-W01', value: 0.5 }],
        topicGrasp: [{ topic: 'fractions', grasp: 0.4, attempts: 5 }],
        engagement: { questions: 12, quizDays: 6, lastActive: '2026-08-01' },
      },
    } as never);
    renderWithLocale(<StudentPage />, 'zh');
    await waitFor(() => expect(screen.getByText('等级 7')).toBeInTheDocument());
    expect(screen.getByText('320 XP')).toBeInTheDocument();
    expect(screen.getByText('🔥 连续 4 天')).toBeInTheDocument();
    expect(screen.getByText('距考试还有 3 天')).toBeInTheDocument();
    expect(screen.getByText('5 次尝试')).toBeInTheDocument();
  });
});
