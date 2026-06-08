'use client';
import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const DEMO_ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['centreMe'],
    queryFn: () => api.centreMe().then(r => r.data),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  // Dev fallback: if /centre/me fails AND DEMO_ORG_ID is set, use it
  const orgInfo: OrgInfo | null = data ?? (
    isError && DEMO_ORG_ID
      ? { orgId: DEMO_ORG_ID, orgName: 'Demo Centre', seatsUsed: 0, seatLimit: 30, cohorts: [] }
      : null
  );

  if (isLoading && !DEMO_ORG_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-ink3 text-sm animate-pulse">Loading centre…</p>
      </div>
    );
  }

  return <OrgContext.Provider value={orgInfo}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgInfo | null {
  return useContext(OrgContext);
}
