import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Rendering smoke test proving the [classId]/tabs i18n wiring actually
 * works end to end — the static coverage guard (i18n-tabs-coverage-guard)
 * only proves every string is ROUTED through t()/tp(); it can't prove the
 * routing resolves to the right locale at render time. This file mounts one
 * simple tab (RosterTab) and one complex tab that also exercises a
 * parameterized template (ModulesTab, via tp.modulesTabCompletedCount) under
 * a real LocaleProvider, in both `en` and `zh`.
 */
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMe: vi.fn(),
      classRosterAnalytics: vi.fn(),
      classModules: vi.fn(),
    },
  };
});

import { api } from '@/lib/api';
import { LocaleProvider } from '@/lib/locale';
import { RosterTab } from '@/app/dashboard/classes/[classId]/tabs/RosterTab';
import { ModulesTab } from '@/app/dashboard/classes/[classId]/tabs/ModulesTab';

const mockedGetMe = vi.mocked(api.getMe);
const mockedRoster = vi.mocked(api.classRosterAnalytics);
const mockedModules = vi.mocked(api.classModules);

function renderWithLocale(ui: React.ReactElement, locale: 'en' | 'zh') {
  if (locale === 'zh') localStorage.setItem('memoly_locale_v1', 'zh');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientProvider>
  );
}

describe('[classId]/tabs render translated content live (not just routed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockedGetMe.mockResolvedValue({ data: { preferredLocale: 'en' } } as never);
  });

  it('RosterTab (simple) shows English column headers by default', async () => {
    mockedRoster.mockResolvedValue({ data: [] } as never);
    renderWithLocale(<RosterTab orgId="o1" classId="c1" />, 'en');
    await waitFor(() => expect(screen.getByText('Student')).toBeInTheDocument());
    expect(screen.getByText('Grasp')).toBeInTheDocument();
    expect(screen.getByText('No students assigned yet. Use "Add students".')).toBeInTheDocument();
  });

  it('RosterTab (simple) shows Simplified Chinese column headers under zh', async () => {
    mockedRoster.mockResolvedValue({ data: [] } as never);
    renderWithLocale(<RosterTab orgId="o1" classId="c1" />, 'zh');
    await waitFor(() => expect(screen.getByText('学生')).toBeInTheDocument());
    expect(screen.getByText('掌握度')).toBeInTheDocument();
  });

  it('ModulesTab (complex, uses tp() templates) renders English stage badge + completed-count template', async () => {
    mockedModules.mockResolvedValue({
      data: [
        { moduleId: 'm1', title: 'Photosynthesis', stage: 'TEST', completedCount: 3, studentCount: 10, masteryPct: 42, wikiSlug: 's1' },
      ],
    } as never);
    renderWithLocale(<ModulesTab orgId="o1" classId="c1" />, 'en');
    await waitFor(() => expect(screen.getByText('TEST')).toBeInTheDocument());
    expect(screen.getByText('3/10 completed')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('ModulesTab (complex, uses tp() templates) renders Chinese stage badge + completed-count template under zh', async () => {
    mockedModules.mockResolvedValue({
      data: [
        { moduleId: 'm1', title: 'Photosynthesis', stage: 'TEST', completedCount: 3, studentCount: 10, masteryPct: 42, wikiSlug: 's1' },
      ],
    } as never);
    renderWithLocale(<ModulesTab orgId="o1" classId="c1" />, 'zh');
    await waitFor(() => expect(screen.getByText('测验')).toBeInTheDocument());
    expect(screen.getByText('3/10 已完成')).toBeInTheDocument();
    expect(screen.getByText('预览')).toBeInTheDocument();
  });
});
