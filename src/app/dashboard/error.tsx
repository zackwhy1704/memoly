'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/messages';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error('[Dashboard error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <span className="text-5xl">⚠️</span>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-ink">{t('dashboardErrorHeading')}</h2>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-bad font-mono bg-bad/10 px-3 py-2 rounded-lg max-w-lg">
            {error.message}
          </p>
        )}
        <p className="text-sm text-ink3">{t('dashboardErrorBody')}</p>
      </div>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition"
      >
        {t('dashboardErrorTryAgain')}
      </button>
    </div>
  );
}
