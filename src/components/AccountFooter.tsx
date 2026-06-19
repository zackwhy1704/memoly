'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getLastEmail, logout } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

function personaLabel(me: { role: string; isOwner: boolean } | undefined): string {
  if (!me) return '';
  if (me.role === 'ADMIN') return 'Platform Admin';
  if (me.isOwner) return 'Owner';
  return 'Teacher';
}

export default function AccountFooter() {
  const { theme, toggle } = useTheme();
  const email = getLastEmail();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const label = personaLabel(meQuery.data);

  return (
    <div className="px-3 py-4 border-t border-line space-y-0.5">
      {(email || label) && (
        <div className="px-3 py-2 mb-1">
          {email && <p className="text-xs font-semibold text-ink truncate">{email}</p>}
          {label && <p className="text-xs text-ink3">{label}</p>}
        </div>
      )}
      <button
        onClick={toggle}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-ink3 hover:text-ink hover:bg-panel2 transition-colors"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="text-base w-5 text-center">{theme === 'dark' ? '☀️' : '🌙'}</span>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <button
        onClick={logout}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-ink3 hover:text-ink hover:bg-panel2 transition-colors"
      >
        <span className="text-base w-5 text-center">⎋</span>
        Sign out
      </button>
    </div>
  );
}
