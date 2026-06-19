'use client';
import { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

interface OrgInfo {
  orgId: string;
  orgName: string;
  seatsUsed: number;
  seatLimit: number;
  cohorts: string[];
}

const OrgContext = createContext<OrgInfo | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['centreMe'],
    queryFn: () => api.centreMe().then((r) => r.data),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-ink3 text-sm animate-pulse">Loading centre…</p>
      </div>
    );
  }

  if (data) {
    return <OrgContext.Provider value={data}>{children}</OrgContext.Provider>;
  }

  // Logged in (auth guard ensures a token) but no centre yet → onboard inline.
  return <CentreOnboarding onCreated={() => qc.invalidateQueries({ queryKey: ['centreMe'] })} />;
}

function CentreOnboarding({ onCreated }: { onCreated: () => void }) {
  const [centreName, setCentreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    if (!centreName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.onboardCentre(centreName.trim());
      onCreated();
    } catch {
      setError('Could not create your centre. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-panel border border-line mb-4">
            <span className="text-3xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Create your centre</h1>
          <p className="text-ink3 text-sm mt-1">You&apos;re signed in — name your centre to get started.</p>
        </div>
        <div className="bg-panel rounded-2xl border border-line p-8 space-y-4">
          <div>
            <label htmlFor="org" className="block text-sm font-medium text-ink2 mb-1.5">
              Centre name
            </label>
            <input
              id="org"
              value={centreName}
              onChange={(e) => setCentreName(e.target.value)}
              placeholder="ABC Learning Centre"
              className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink3"
            />
          </div>
          {error && (
            <div className="bg-bad/10 border border-bad/30 rounded-lg px-3.5 py-2.5 text-sm text-bad">
              {error}
            </div>
          )}
          <button
            onClick={create}
            disabled={loading || !centreName.trim()}
            className="w-full py-2.5 px-4 rounded-lg bg-accent text-white text-sm font-semibold
              hover:bg-accent/80 transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create centre'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useOrg(): OrgInfo | null {
  return useContext(OrgContext);
}
