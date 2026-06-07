'use client';

import Sidebar from '@/components/Sidebar';
import { useAuthGuard } from '@/lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useAuthGuard();

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
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      {/* Main content — offset by sidebar width on large screens */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Top padding for mobile hamburger */}
        <div className="pt-16 lg:pt-0 px-4 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
