'use client';
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/Toast';
import ConsentPendingHost, { reportConsentPending } from '@/components/ConsentPendingHost';
import { initAnalytics } from '@/lib/analytics';
import { isParentalConsentPending } from '@/lib/api';
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
    // CENTRAL half-elevated (under-13 awaiting parent) surface: every query AND
    // mutation error flows through here. When the error carries consentPending
    // (a 403 with data.code === 'PARENTAL_CONSENT_PENDING'), we route it to the
    // ConsentPendingHost which renders the actionable resend panel — so no
    // call-site has to special-case it. AI_CONSENT_REQUIRED / plain 403 are
    // untouched (isParentalConsentPending is false) and fall through to whatever
    // the call site already does.
    queryCache: new QueryCache({
      onError: (error) => {
        if (isParentalConsentPending(error)) reportConsentPending(error.consentPending);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isParentalConsentPending(error)) reportConsentPending(error.consentPending);
      },
    }),
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
          <ToastProvider>
            {children}
            <ConsentPendingHost />
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
