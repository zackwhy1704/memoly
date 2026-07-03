'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { OrgProvider } from '@/lib/org-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api.getMe()
      .then((me) => {
        if (me.data.role === 'ADMIN' && !me.data.isCentreStaff) {
          // Pure platform admin with no centre — send to admin console.
          // Staff-admins (admin who also owns/teaches at a centre) may use both.
          router.replace('/admin');
        } else if (!me.data.isCentreStaff) {
          // Student or non-staff — redirect to get-the-app
          router.replace('/get-the-app');
        } else {
          setReady(true);
        }
      })
      .catch((err) => {
        // An auth failure that reaches here (401/403) must NOT open the shell —
        // bounce to login. Only a network/5xx error allows through (the backend
        // still gates every data call by JWT, so no data renders unauthorized).
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          router.replace('/login');
          return;
        }
        setReady(true);
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mochi-base-transparent.png" alt="Loading…" className="w-9 h-9 object-contain animate-bounce" />
          <p className="text-ink3 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <OrgProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        {/* Main content — offset by sidebar width on large screens */}
        <main className="flex-1 lg:ml-64 min-w-0">
          {/* Top padding: extra on mobile to clear the hamburger; a comfortable
              gap on desktop so page titles aren't flush to the top edge. */}
          <div className="pt-16 lg:pt-10 px-4 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </OrgProvider>
  );
}
