'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BuildStatus, BuildPhase } from './BuildStatusView';

/**
 * Derives the honest {@link BuildStatus} from REAL backend signals:
 *  - GET /avatars/{id}          → brainState + wikiPageCount (the ready signal)
 *  - GET /wiki/compile/status   → pagesCompiled / pagesTotal / failedPages (real progress)
 * Polls every 4s until the brain is READY with pages. Never fabricates numbers.
 */
export function useBuildStatus(avatarId: string | null): {
  status: BuildStatus;
  refetch: () => void;
} {
  const qc = useQueryClient();

  const avatarQ = useQuery({
    queryKey: ['avatar', avatarId],
    queryFn: () => api.avatar(avatarId as string),
    enabled: !!avatarId,
    refetchInterval: (q) => {
      const d = q.state.data?.data;
      const ready = d?.brainState === 'READY' && (d?.wikiPageCount ?? 0) > 0;
      return ready ? false : 4000;
    },
  });

  const statusQ = useQuery({
    queryKey: ['compileStatus', avatarId],
    queryFn: () => api.compileStatus(avatarId as string),
    enabled: !!avatarId,
    refetchInterval: (q) => {
      const a = qc.getQueryData<Awaited<ReturnType<typeof api.avatar>>>(['avatar', avatarId]);
      const ready = a?.data?.brainState === 'READY' && (a?.data?.wikiPageCount ?? 0) > 0;
      return ready ? false : 4000;
    },
    retry: false,
  });

  const a = avatarQ.data?.data;
  const s = statusQ.data?.data;
  const files = a?.fileCount ?? 0;

  let phase: BuildPhase;
  if (!a) {
    phase = 'checking';
  } else if (a.brainState === 'READY' && a.wikiPageCount > 0) {
    phase = 'ready';
  } else if (a.brainState === 'READY' && a.wikiPageCount === 0 && files > 0) {
    // Compiled but produced no pages — a failure, not a false success.
    phase = 'timeout';
  } else if (files > 0) {
    phase = 'compiling';
  } else {
    phase = 'checking';
  }

  const status: BuildStatus = {
    phase,
    pagesCompiled: s?.pagesCompiled,
    pagesTotal: s?.pagesTotal,
    lessonCount: a?.wikiPageCount,
    failedCount: s?.failedPages?.length ?? s?.pagesFailed,
  };

  return {
    status,
    refetch: () => {
      qc.invalidateQueries({ queryKey: ['avatar', avatarId] });
      qc.invalidateQueries({ queryKey: ['compileStatus', avatarId] });
    },
  };
}
