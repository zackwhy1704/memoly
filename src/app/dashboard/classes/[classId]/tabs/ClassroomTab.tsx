'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, asArray, type ClassroomSessionState, type WikiPage } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import ErrorView from '@/components/ErrorView';
import EmptyState from '@/components/EmptyState';
import { useTranslation } from '@/lib/messages';
import { ClassCodeBox } from '../components/ClassCodeBox';

/**
 * Teacher-facing live shared-boss classroom session: launch from one page of
 * the class's compiled material, start it, and watch the collective HP as
 * students attack from their phones.
 *
 * Polls the state endpoint (~2s) rather than subscribing to the backend's SSE
 * stream: that stream is scoped to a joined student's participantToken —
 * there is no teacher-scoped SSE endpoint, and the browser's EventSource API
 * can't carry a custom Authorization header, so a teacher-facing EventSource
 * would mean putting the JWT in the URL (logged, browser-history-visible).
 * Not introduced without a stronger reason than convenience. This is honestly
 * "near-live" polling, not a true push subscription.
 */
function SessionLauncher({
  orgId,
  classId,
  corpusAvatarId,
  onLaunched,
}: {
  orgId: string;
  classId: string;
  corpusAvatarId: string;
  onLaunched: (sessionId: string) => void;
}) {
  const { t } = useTranslation();
  const [pageId, setPageId] = useState('');

  const pagesQuery = useQuery({
    queryKey: ['wikiPages', corpusAvatarId],
    queryFn: () => api.wikiPages(corpusAvatarId),
  });
  const pages = asArray<WikiPage>(pagesQuery.data);

  const launch = useMutation({
    mutationFn: () => api.createClassroomSession(orgId, classId, pageId),
    onSuccess: (res) => {
      trackEvent('classroom_session_created', { classId, topicSlug: res.data.topicSlug });
      onLaunched(res.data.sessionId);
    },
  });

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-ink">{t('classroomTabLaunch')}</h3>
      <p className="text-xs text-ink3">{t('classroomTabLaunchHint')}</p>

      {pagesQuery.isLoading ? (
        <p className="text-ink3 text-sm">{t('classroomTabLoadingPages')}</p>
      ) : pagesQuery.error ? (
        <ErrorView message={t('classroomTabCouldNotLoadPages')} onRetry={() => pagesQuery.refetch()} />
      ) : pages.length === 0 ? (
        <p className="text-ink3 text-sm">{t('classroomTabNoPages')}</p>
      ) : (
        <select
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">{t('classroomTabPickTopic')}</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || p.slug}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center justify-end gap-3">
        {launch.error && (
          <p className="text-xs text-bad flex-1">
            {launch.error instanceof Error ? launch.error.message : t('classroomTabLaunchFailed')}
          </p>
        )}
        <button
          onClick={() => launch.mutate()}
          disabled={!pageId || launch.isPending}
          className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
        >
          {launch.isPending ? t('classroomTabLaunching') : t('classroomTabLaunchButton')}
        </button>
      </div>
    </div>
  );
}

function LiveSessionCard({
  orgId,
  classId,
  sessionId,
  onLaunchNew,
}: {
  orgId: string;
  classId: string;
  sessionId: string;
  onLaunchNew: () => void;
}) {
  const { t, tp } = useTranslation();
  const qc = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ['classroomSession', sessionId],
    queryFn: () => api.classroomSessionState(orgId, classId, sessionId),
    refetchInterval: (query) => (query.state.data?.data.status === 'ENDED' ? false : 2000),
  });

  const startMut = useMutation({
    mutationFn: () => api.startClassroomSession(orgId, classId, sessionId),
    onSuccess: (res) => qc.setQueryData(['classroomSession', sessionId], res),
  });

  const endMut = useMutation({
    mutationFn: () => api.endClassroomSession(orgId, classId, sessionId),
    onSuccess: (res) => qc.setQueryData(['classroomSession', sessionId], res),
  });

  if (stateQuery.isLoading) {
    return <p className="text-ink3 text-sm py-8">{t('classroomTabLoadingSession')}</p>;
  }
  if (stateQuery.error || !stateQuery.data) {
    return (
      <ErrorView message={t('classroomTabCouldNotLoadSession')} onRetry={() => stateQuery.refetch()} />
    );
  }
  const state = stateQuery.data.data;
  const hpPct = state.hpMax > 0 ? Math.round((state.hpRemaining / state.hpMax) * 100) : 0;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink truncate">{state.topicSlug}</h3>
          <p className="text-xs text-ink3 mt-0.5">{tp.classroomTabParticipantCount(state.participantCount)}</p>
        </div>
        <ClassCodeBox code={state.joinCode} />
      </div>

      {state.status !== 'ENDED' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-ink3">
            <span>{t('classroomTabSharedHp')}</span>
            <span>
              {state.hpRemaining} / {state.hpMax}
            </span>
          </div>
          <div className="w-full h-3 bg-panel2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${state.defeated ? 'bg-ok' : 'bg-bad'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      )}

      {state.defeated && <p className="text-sm font-semibold text-ok">{t('classroomTabDefeated')}</p>}

      {state.status === 'ENDED' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink3">{t('classroomTabEnded')}</p>
          <button onClick={onLaunchNew} className="text-xs font-semibold text-accent hover:underline">
            {t('classroomTabLaunchNew')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {state.status === 'CREATED' && (
          <button
            onClick={() => startMut.mutate()}
            disabled={startMut.isPending}
            className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
          >
            {startMut.isPending ? t('classroomTabStarting') : t('classroomTabStartButton')}
          </button>
        )}
        {(state.status === 'CREATED' || state.status === 'ACTIVE') && (
          <button
            onClick={() => endMut.mutate()}
            disabled={endMut.isPending}
            className="px-4 py-2 text-xs font-semibold border border-bad/40 text-bad rounded-lg hover:bg-bad/10 transition disabled:opacity-40"
          >
            {endMut.isPending ? t('classroomTabEnding') : t('classroomTabEndButton')}
          </button>
        )}
      </div>
    </div>
  );
}

export function ClassroomTab({
  orgId,
  classId,
  corpusAvatarId,
}: {
  orgId: string;
  classId: string;
  corpusAvatarId: string | null;
}) {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Recovers the session pointer once on mount (page refresh, or opening the
  // tab after the teacher already launched a session elsewhere): if the class
  // has a live (non-ENDED) session, jump straight to it instead of showing
  // the launcher again. `resumeChecked` makes this a ONE-SHOT check — once
  // it's run, a teacher-initiated "launch new" (sessionId -> null) must show
  // the launcher, not immediately re-resume the just-ended session.
  const [resumeChecked, setResumeChecked] = useState(false);
  const liveSessionsQuery = useQuery({
    queryKey: ['classroomSessionsLive', orgId, classId],
    queryFn: () => api.listLiveClassroomSessions(orgId, classId),
    enabled: !!corpusAvatarId && !resumeChecked,
  });
  // Adjust state during render (React's documented pattern for deriving
  // state from a value that just became available) rather than an effect —
  // guarded by resumeChecked so it fires exactly once.
  if (!resumeChecked && liveSessionsQuery.isSuccess) {
    const live = asArray<ClassroomSessionState>(liveSessionsQuery.data);
    setResumeChecked(true);
    if (live.length > 0) setSessionId(live[0].sessionId);
  }

  if (!corpusAvatarId) {
    return (
      <EmptyState
        icon="⚔️"
        title={t('classroomTabNoCorpusTitle')}
        description={t('classroomTabNoCorpusDescription')}
      />
    );
  }

  // Avoid flashing the launcher before the one-shot resume check settles —
  // that would briefly show "launch a session" then jump to a live one.
  if (!resumeChecked && liveSessionsQuery.isLoading) {
    return <p className="text-ink3 text-sm py-8">{t('classroomTabLoadingSession')}</p>;
  }

  return (
    <div className="space-y-4">
      {sessionId ? (
        <LiveSessionCard
          orgId={orgId}
          classId={classId}
          sessionId={sessionId}
          onLaunchNew={() => setSessionId(null)}
        />
      ) : (
        <SessionLauncher
          orgId={orgId}
          classId={classId}
          corpusAvatarId={corpusAvatarId}
          onLaunched={setSessionId}
        />
      )}
    </div>
  );
}
