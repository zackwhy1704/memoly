'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

// Deep link back into the native app after a web-originated checkout completes.
// Scheme MUST match the app's AndroidManifest intent filter + iOS CFBundleURLSchemes
// (scheme "pally"). The HOST is intentionally empty (triple slash): Flutter's built-in
// deep linking routes on Uri.path, so "pally:///subscription/return" yields path
// "/subscription/return" which matches the GoRouter route. A two-slash
// "pally://subscription/return" would parse host=subscription, path="/return" and miss.
const RETURN_DEEP_LINK = 'pally:///subscription/return?status=success';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

type Phase = 'activating' | 'success' | 'timeout';

export default function SuccessPage() {
  const [phase, setPhase] = useState<Phase>('activating');
  // Guard so the interval callback stops scheduling work once we're done.
  const settledRef = useRef(false);

  useEffect(() => {
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (settledRef.current) return;
      try {
        const res = await api.entitlement();
        if (settledRef.current) return;
        if (res.data?.isPremium) {
          settledRef.current = true;
          setPhase('success');
          return;
        }
      } catch {
        // Transient error — keep polling until the timeout window closes.
      }
      if (settledRef.current) return;
      if (Date.now() - start >= POLL_TIMEOUT_MS) {
        settledRef.current = true;
        setPhase('timeout');
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      settledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div
      data-mkt="1"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(160deg, #f4f0ff 0%, #fff 60%)',
        fontFamily: 'Nunito, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mochi-base-transparent.png"
        alt="Mochi"
        style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 24 }}
      />

      {phase === 'activating' && (
        <>
          <div
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              border: '3px solid #E0DAF0',
              borderTopColor: '#7042ED',
              borderRadius: '50%',
              animation: 'mkt-spin 0.8s linear infinite',
              marginBottom: 20,
            }}
          />
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            Activating your subscription…
          </h1>
          <p style={{ fontSize: 13, color: '#A8A0BD' }}>
            This usually takes a few seconds. Hang tight.
          </p>
          <style>{'@keyframes mkt-spin { to { transform: rotate(360deg); } }'}</style>
        </>
      )}

      {phase === 'success' && (
        <>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            You&apos;re all set! 🎉
          </h1>
          <p style={{ fontSize: 14, color: '#6B618A', marginBottom: 32, maxWidth: 360 }}>
            Your subscription is active. Head back to the Apalchi app to keep learning with Mochi.
          </p>
          <a
            href={RETURN_DEEP_LINK}
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              background: '#7042ED',
              color: '#fff',
              borderRadius: 14,
              fontWeight: 800,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Open Apalchi app
          </a>
        </>
      )}

      {phase === 'timeout' && (
        <>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            Almost there…
          </h1>
          <p style={{ fontSize: 14, color: '#6B618A', marginBottom: 32, maxWidth: 380 }}>
            Your payment went through but activation is taking a little longer than usual. It may still be
            processing — open the app and it should appear shortly.
          </p>
          <a
            href={RETURN_DEEP_LINK}
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              background: '#7042ED',
              color: '#fff',
              borderRadius: 14,
              fontWeight: 800,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Open Apalchi app
          </a>
        </>
      )}
    </div>
  );
}
