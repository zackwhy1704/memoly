'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Single source of truth for the authenticated user's profile.
 * Always writes the FLAT (unwrapped) shape so every consumer that shares
 * the ['me'] cache key sees the same data structure regardless of which
 * surface populated the cache first.
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe().then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}
