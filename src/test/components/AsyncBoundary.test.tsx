import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import AsyncBoundary from '@/components/AsyncBoundary';
import { ApiError } from '@/lib/api';

// ── Test helper: wrap with QueryClientProvider ───────────────────────
function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ── Helper: build a fake UseQueryResult ──────────────────────────────
function fakeQuery<T>(overrides: Partial<UseQueryResult<T>>): UseQueryResult<T> {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    status: 'pending',
    fetchStatus: 'idle',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    refetch: async () => ({}) as ReturnType<UseQueryResult<T>['refetch']>,
    promise: Promise.resolve({} as T),
    ...overrides,
  } as UseQueryResult<T>;
}

describe('AsyncBoundary', () => {
  it('renders loading skeleton when query is loading', () => {
    const query = fakeQuery<string>({ isLoading: true });
    render(
      <AsyncBoundary query={query} loadingIcon="⏳" loadingLabel="Loading data...">
        {(data) => <p>{data}</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('⏳')).toBeInTheDocument();
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders ErrorView when query has an error', () => {
    const query = fakeQuery<string>({
      error: new ApiError(500, null, 'Server exploded', true),
    });
    render(
      <AsyncBoundary query={query} errorMessage="Fallback error message">
        {(data) => <p>{data}</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    // Should use the ApiError's userMessage, not the fallback
    expect(screen.getByText('Server exploded')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('renders fallback errorMessage for non-ApiError errors', () => {
    const query = fakeQuery<string>({
      error: new Error('generic error'),
    });
    render(
      <AsyncBoundary query={query} errorMessage="Could not load data.">
        {(data) => <p>{data}</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('Could not load data.')).toBeInTheDocument();
  });

  it('renders empty state when data is null', () => {
    const query = fakeQuery<string | null>({ data: null as unknown as undefined });
    // data is undefined (default) and isLoading is false and error is null
    render(
      <AsyncBoundary
        query={query as unknown as import('@tanstack/react-query').UseQueryResult<string>}
        empty={<p>No data available</p>}
      >
        {(data) => <p>{data}</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders empty state when data is an empty array', () => {
    const query = fakeQuery<string[]>({ data: [] });
    render(
      <AsyncBoundary query={query} empty={<p>Nothing here</p>}>
        {(data) => <p>{data.length} items</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders empty state when data is { data: [] } envelope', () => {
    const query = fakeQuery<{ data: string[] }>({ data: { data: [] } });
    render(
      <AsyncBoundary query={query} empty={<p>Empty envelope</p>}>
        {(data) => <p>{data.data.length} items</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('Empty envelope')).toBeInTheDocument();
  });

  it('renders children when data is loaded', () => {
    const query = fakeQuery<{ name: string }>({
      data: { name: 'Mochi' },
      isSuccess: true,
    });
    render(
      <AsyncBoundary query={query}>
        {(data) => <p>Hello, {data.name}</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('Hello, Mochi')).toBeInTheDocument();
  });

  it('renders children when data is a non-empty array', () => {
    const query = fakeQuery<string[]>({
      data: ['a', 'b', 'c'],
      isSuccess: true,
    });
    render(
      <AsyncBoundary query={query} empty={<p>Nothing</p>}>
        {(data) => <p>{data.length} items loaded</p>}
      </AsyncBoundary>,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('3 items loaded')).toBeInTheDocument();
  });
});
