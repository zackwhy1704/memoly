'use client';

import { useEffect, useState } from 'react';
import type { ConsentPendingInfo } from '@/lib/api';
import ConsentPendingPanel from '@/components/ConsentPendingPanel';

// ── Module-level pub/sub ──────────────────────────────────────────────
// The QueryClient's queryCache/mutationCache onError callbacks run OUTSIDE the
// React tree (they're plain functions on the client instance), so they can't
// call a hook. This tiny event bus lets them hand a consentPending payload to
// the mounted host. One listener (the host) is enough; extra ones are harmless.
let current: ConsentPendingInfo | null = null;
const listeners = new Set<(info: ConsentPendingInfo | null) => void>();

/** Called centrally from Providers' query/mutation onError. */
export function reportConsentPending(info: ConsentPendingInfo) {
  current = info;
  listeners.forEach((l) => l(info));
}

function clearConsentPending() {
  current = null;
  listeners.forEach((l) => l(null));
}

/**
 * Global host: renders `ConsentPendingPanel` as a centred overlay whenever ANY
 * query/mutation surfaces a half-elevated (under-13 awaiting parent) error.
 * Mounted once in `Providers`, so every gated request shows the actionable
 * resend panel without any call-site wiring.
 */
export default function ConsentPendingHost() {
  const [info, setInfo] = useState<ConsentPendingInfo | null>(current);

  useEffect(() => {
    const listener = (next: ConsentPendingInfo | null) => setInfo(next);
    listeners.add(listener);
    // Catch any payload reported between this component's render and the effect
    // running. Deferred to a microtask so it isn't a synchronous setState in the
    // effect body (the lazy useState(current) already covers the no-race case).
    queueMicrotask(() => {
      if (current) setInfo(current);
    });
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!info) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4">
      <ConsentPendingPanel info={info} onDismiss={clearConsentPending} />
    </div>
  );
}
