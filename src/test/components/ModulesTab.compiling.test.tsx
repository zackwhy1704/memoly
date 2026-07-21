import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModulesTab } from '@/app/dashboard/classes/[classId]/tabs/ModulesTab';

// Keep muddiest calls quiet; ModulesTab renders a MuddiestBar per module.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, muddiest: vi.fn().mockResolvedValue({ data: [] }) },
  };
});

const AV = 'av1';
const ORG = 'org1';
const CLS = 'cls1';

function seededClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

describe('ModulesTab — poll transition compiling → modules (FIX 3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the compiling indicator, then resolves into modules as the poll flips to READY', async () => {
    const qc = seededClient();
    // Seed the caches directly so no network is touched (staleTime Infinity).
    qc.setQueryData(['classModules', ORG, CLS], { data: [] });
    qc.setQueryData(['avatar', AV], {
      data: { brainState: 'COMPILING', awaitingChapterSelection: true, pendingChapterCount: 3, wikiPageCount: 0 },
    });

    render(
      <QueryClientProvider client={qc}>
        <ModulesTab orgId={ORG} classId={CLS} corpusAvatarId={AV} />
      </QueryClientProvider>
    );

    // Non-blocking indicator with the pending count — NOT the "No modules yet" dead end.
    expect(screen.getByText(/Compiling 3 chapters/i)).toBeInTheDocument();
    expect(screen.queryByText(/No modules yet/i)).not.toBeInTheDocument();

    // Poll flips READY and the freshly-built module lands.
    act(() => {
      qc.setQueryData(['avatar', AV], {
        data: { brainState: 'READY', awaitingChapterSelection: false, pendingChapterCount: 0, wikiPageCount: 5 },
      });
      qc.setQueryData(['classModules', ORG, CLS], {
        data: [{ moduleId: 'm1', title: 'Fractions', stage: 'LEARN', studentCount: 0, completedCount: 0, masteryPct: null, wikiSlug: 'fractions' }],
      });
    });

    expect(await screen.findByText('Fractions')).toBeInTheDocument();
    expect(screen.queryByText(/Compiling 3 chapters/i)).not.toBeInTheDocument();
  });
});
