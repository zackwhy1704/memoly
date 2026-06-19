'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

type State = 'loading' | 'ok' | 'owner-only';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    api.getMe()
      .then((me) => {
        // Non-owner centre staff cannot manage the subscription — billing is owner-only.
        if (me.data.isCentreStaff && !me.data.isOwner) {
          setState('owner-only');
        } else {
          setState('ok');
        }
      })
      .catch(() => setState('ok')); // network failure → allow through
  }, [router, pathname]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <span className="text-3xl animate-bounce">🐾</span>
      </div>
    );
  }

  if (state === 'owner-only') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-4xl">🔐</p>
          <h1 className="text-xl font-bold text-ink">Owner access only</h1>
          <p className="text-ink3 text-sm leading-relaxed">
            Only the centre owner can manage the subscription.
            Ask your centre owner to make billing changes.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
