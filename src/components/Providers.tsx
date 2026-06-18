'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/Toast';
import { initAnalytics } from '@/lib/analytics';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
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
