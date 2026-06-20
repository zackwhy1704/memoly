'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/Toast';
import { initAnalytics } from '@/lib/analytics';
import { GOOGLE_CLIENT_ID, isGoogleEnabled } from '@/lib/google';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
    if (process.env.NODE_ENV === 'development' && !isGoogleEnabled) {
      console.warn(
        'Google sign-in disabled: NEXT_PUBLIC_GOOGLE_CLIENT_ID not set. ' +
          'Add it to .env.local (see .env.example) and restart the dev server.',
      );
    }
  }, []);

  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        refetchInterval: 45_000,
        retry: (failureCount, error) => {
          // Don't retry non-retryable API errors
          if (error && 'retryable' in error && !(error as { retryable: boolean }).retryable) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  }));
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
