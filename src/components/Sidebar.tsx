'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useOrg } from '@/lib/org-context';
import { useMe } from '@/lib/use-me';
import AccountFooter from '@/components/AccountFooter';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '⊞', exact: true },
  { href: '/dashboard/students', label: 'Students', icon: '👥', exact: false },
  { href: '/dashboard/classes', label: 'Classes', icon: '🏫', exact: false },
  { href: '/dashboard/teachers', label: 'Teachers', icon: '🎓', exact: false },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙', exact: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const org = useOrg();

  const { data: me } = useMe();
  const personaLabel = me?.isOwner ? 'Owner' : 'Teacher';

  function isActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-line">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mochi-base-transparent.png"
            alt="Apalchi"
            className="w-8 h-8 object-contain"
          />
          <div>
            <p className="text-ink font-bold text-lg leading-tight">Apalchi</p>
            <p className="text-ink3 text-xs">{personaLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                active
                  ? 'bg-accent/15 border-accent text-ink'
                  : 'border-transparent text-ink3 hover:text-ink hover:bg-panel2'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Org info */}
      {org && (
        <div className="px-4 py-3 border-b border-line">
          <p className="text-ink text-sm font-semibold truncate">{org.orgName}</p>
          <p className="text-ink3 text-xs">{org.seatsUsed}/{org.seatLimit} seats · {personaLabel}</p>
        </div>
      )}

      <AccountFooter />
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-panel text-ink p-2 rounded-lg shadow-lg border border-line"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        <span className="text-lg">{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slides in */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-side z-40 transition-transform duration-200
          lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <NavContent />
      </aside>
    </>
  );
}
