'use client';

/**
 * PUBLIC review page — NO LOGIN. Reviewers open this from a WhatsApp link on a
 * phone. It lives OUTSIDE src/app/dashboard, so the dashboard auth guard
 * (useAuthGuard, called only in dashboard/layout.tsx) never wraps it — same as
 * /login and /signup. We use the unauthenticated review API (no JWT attached).
 */

import { use, useEffect, useState } from 'react';
import { loadReview, type ReviewContent, type ReviewLoadResult } from '@/lib/review-api';
import { Header } from './_components/Header';
import { LoadingCard } from './_components/LoadingCard';
import { ReviewBody } from './_components/ReviewBody';
import { SuccessCard } from './_components/SuccessCard';
import { GoneCard } from './_components/GoneCard';
import { MessageCard } from './_components/MessageCard';
import { useTranslation } from '@/lib/messages';

type View =
  | { state: 'loading' }
  | { state: 'content'; content: ReviewContent }
  | { state: 'gone'; status: string }
  | { state: 'notfound' }
  | { state: 'network' }
  | { state: 'error' }
  | { state: 'done'; verdict: 'APPROVED' | 'FLAGGED' };

export default function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { t } = useTranslation();
  const { token } = use(params);
  const [view, setView] = useState<View>({ state: 'loading' });

  useEffect(() => {
    let active = true;
    // Initial state is already 'loading'; the async result drives the rest.
    loadReview(token).then((res: ReviewLoadResult) => {
      if (!active) return;
      switch (res.kind) {
        case 'ok':
          setView({ state: 'content', content: res.content });
          break;
        case 'gone':
          setView({ state: 'gone', status: res.status });
          break;
        case 'notfound':
          setView({ state: 'notfound' });
          break;
        case 'network':
          setView({ state: 'network' });
          break;
        default:
          setView({ state: 'error' });
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-bg px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <Header />

        {view.state === 'loading' && <LoadingCard />}
        {view.state === 'content' && (
          <ReviewBody
            token={token}
            content={view.content}
            onDone={(verdict) => setView({ state: 'done', verdict })}
            onGone={(status) => setView({ state: 'gone', status })}
            onNotFound={() => setView({ state: 'notfound' })}
          />
        )}
        {view.state === 'done' && <SuccessCard />}
        {view.state === 'gone' && <GoneCard status={view.status} />}
        {view.state === 'notfound' && (
          <MessageCard
            emoji="🔍"
            title={t('reviewPageNotFoundTitle')}
            body={t('reviewPageNotFoundBody')}
          />
        )}
        {view.state === 'network' && (
          <MessageCard
            emoji="📶"
            title={t('reviewPageOfflineTitle')}
            body={t('reviewPageOfflineBody')}
          />
        )}
        {view.state === 'error' && (
          <MessageCard
            emoji="⚠️"
            title={t('acceptInviteSomethingWrong')}
            body={t('reviewPageErrorBody')}
          />
        )}
      </div>
    </main>
  );
}
