'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global error]', error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#0f0f14', color: '#e8e4f5' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 24, padding: '0 16px', textAlign: 'center' }}>
          <span style={{ fontSize: 56 }}>⚠️</span>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#9d94b8', marginBottom: 4 }}>
              The application encountered an unexpected error.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p style={{ fontSize: 12, color: '#ff6660', fontFamily: 'monospace', marginTop: 8, padding: '8px 12px', background: 'rgba(255,102,96,0.1)', borderRadius: 8, maxWidth: 480 }}>
                {error.message}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            style={{ padding: '10px 24px', background: '#7042ED', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
