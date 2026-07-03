'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import AccountFooter from '@/components/AccountFooter';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isCentreStaff, setIsCentreStaff] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    api.getMe()
      .then((me) => {
        if (me.data.role !== 'ADMIN') {
          router.replace(me.data.isCentreStaff ? '/dashboard' : '/get-the-app');
        } else {
          setIsCentreStaff(me.data.isCentreStaff);
          setReady(true);
        }
      })
      .catch((err) => {
        // An auth failure (401/403) reaching here must bounce to login, not open
        // the admin shell. Only network/5xx allows through (backend gates data).
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
          <Image src="/mochi-base-transparent.png" alt="Loading…" width={36} height={36} className="object-contain animate-bounce" />
          <p className="text-ink3 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Admin sidebar */}
      <nav className="w-56 shrink-0 bg-surface border-r border-line flex flex-col gap-1 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink3 mb-3 px-2">Platform Admin</p>
        <NavLink href="/admin">Overview</NavLink>
        <NavLink href="/admin/centres">Centres</NavLink>
        <NavLink href="/admin/users">Users</NavLink>
        <NavLink href="/admin/leads">Leads</NavLink>
        <NavLink href="/admin/safety">Safety</NavLink>
        {isCentreStaff && (
          <NavLink href="/dashboard">← Dashboard</NavLink>
        )}
        <div className="mt-auto">
          <AccountFooter />
        </div>
      </nav>
      <main className="flex-1 min-w-0 px-8 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-lg text-sm font-semibold text-ink2 hover:bg-panel2 hover:text-ink transition"
    >
      {children}
    </Link>
  );
}
