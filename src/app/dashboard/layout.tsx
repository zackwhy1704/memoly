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
      .catch(() => {
        // Network failure — allow through rather than kicking the user out.
        // 401s are handled globally in api.ts and never reach here.
        setReady(true);
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl animate-bounce">🐾</span>
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
          {/* Top padding for mobile hamburger */}
          <div className="pt-16 lg:pt-0 px-4 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </OrgProvider>
  );
}
