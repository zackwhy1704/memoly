import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Rendering smoke test for PR4 — proves translated content, including tp()
 * template output, resolves live in both locales. Mounts ClassCodeBox
 * (simple) and CreateAssignmentModal (complex: uses tp() for the mastery
 * threshold label and reads real query data).
 */
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMe: vi.fn(),
      classModules: vi.fn(),
    },
  };
});

import { api } from '@/lib/api';
import { LocaleProvider } from '@/lib/locale';
import { ClassCodeBox } from '@/app/dashboard/classes/[classId]/components/ClassCodeBox';
import { CreateAssignmentModal } from '@/app/dashboard/classes/[classId]/modals/CreateAssignmentModal';

const mockedGetMe = vi.mocked(api.getMe);
const mockedClassModules = vi.mocked(api.classModules);

function renderWithLocale(ui: React.ReactElement, locale: 'en' | 'zh') {
  if (locale === 'zh') localStorage.setItem('memoly_locale_v1', 'zh');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientProvider>
  );
}

describe('PR4 renders translated content live (not just routed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockedGetMe.mockResolvedValue({ data: { preferredLocale: 'en' } } as never);
  });

  it('ClassCodeBox (simple) shows the English "tap to copy" hint by default', async () => {
    renderWithLocale(<ClassCodeBox code="ABC123" />, 'en');
    expect(screen.getByText('Class code')).toBeInTheDocument();
    expect(screen.getByText('Tap to copy')).toBeInTheDocument();
  });

  it('ClassCodeBox (simple) shows the Chinese hint under zh', async () => {
    renderWithLocale(<ClassCodeBox code="ABC123" />, 'zh');
    expect(screen.getByText('班级代码')).toBeInTheDocument();
    expect(screen.getByText('点击复制')).toBeInTheDocument();
  });

  it('CreateAssignmentModal (complex, uses tp() for mastery threshold) renders in English', async () => {
    mockedClassModules.mockResolvedValue({
      data: [{ moduleId: 'm1', title: 'Fractions', wikiSlug: 's1' }],
    } as never);
    renderWithLocale(
      <CreateAssignmentModal orgId="o1" classId="c1" onClose={vi.fn()} onCreated={vi.fn()} />,
      'en'
    );
    await waitFor(() => expect(screen.getByText('Create Assignment')).toBeInTheDocument());
    expect(screen.getByText('Modules')).toBeInTheDocument();
    expect(screen.getByText('Due date (optional)')).toBeInTheDocument();
  });

  it('CreateAssignmentModal (complex, uses tp() for mastery threshold) renders in Chinese', async () => {
    mockedClassModules.mockResolvedValue({
      data: [{ moduleId: 'm1', title: 'Fractions', wikiSlug: 's1' }],
    } as never);
    renderWithLocale(
      <CreateAssignmentModal orgId="o1" classId="c1" onClose={vi.fn()} onCreated={vi.fn()} />,
      'zh'
    );
    await waitFor(() => expect(screen.getByText('创建作业')).toBeInTheDocument());
    expect(screen.getByText('模块')).toBeInTheDocument();
    expect(screen.getByText('截止日期（可选）')).toBeInTheDocument();
  });
});
