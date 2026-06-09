'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
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
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
