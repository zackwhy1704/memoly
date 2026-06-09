'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import ErrorView from './ErrorView';
import { ApiError } from '@/lib/api';

/**
 * Skeleton loading indicator matching the existing dashboard style.
 */
function LoadingSkeleton({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <span className="text-3xl animate-bounce">{icon}</span>
        <p className="text-ink3 text-sm">{label}</p>
      </div>
    </div>
  );
}

/**
 * Wraps TanStack Query state — shows skeleton while loading, ErrorView on error
 * (with retry wired to refetch), the `empty` element when data is empty, and
 * renders children with loaded data otherwise.
 *
 * Usage:
 * ```
 * <AsyncBoundary
 *   query={query}
 *   loadingIcon="📊"
 *   loadingLabel="Loading overview..."
 *   errorMessage="Could not load overview."
 *   empty={<EmptyState icon="📊" title="No data yet" />}
 * >
 *   {(data) => <OverviewContent data={data} />}
 * </AsyncBoundary>
 * ```
 */
export default function AsyncBoundary<T>({
  query,
  loadingIcon = '⏳',
  loadingLabel = 'Loading...',
  errorMessage = 'Something went wrong.',
  empty,
  children,
}: {
  query: UseQueryResult<T>;
  loadingIcon?: string;
  loadingLabel?: string;
  errorMessage?: string;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) {
    return <LoadingSkeleton icon={loadingIcon} label={loadingLabel} />;
  }

  if (query.error) {
    const msg =
      query.error instanceof ApiError
        ? query.error.userMessage
        : errorMessage;

    return <ErrorView message={msg} onRetry={() => query.refetch()} />;
  }

  if (query.data == null) {
    return empty ?? null;
  }

  // Check for "empty" data — arrays, objects with a data array, etc.
  if (empty) {
    const d = query.data as Record<string, unknown>;
    // Handle { data: [] } envelope
    if (Array.isArray(d.data) && d.data.length === 0) return <>{empty}</>;
    // Handle raw arrays
    if (Array.isArray(d) && d.length === 0) return <>{empty}</>;
  }

  return <>{children(query.data)}</>;
}
