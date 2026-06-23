'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import ErrorView from '@/components/ErrorView';

export function ReportTab({ orgId, classId }: { orgId: string; classId: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['classReport', orgId, classId],
    queryFn: () => api.classReport(orgId, classId),
    staleTime: 55 * 60 * 1000, // slightly under the 60-min server cache TTL
    // Poll every 3s while the report is generating; stop once ready/failed.
    refetchInterval: (q) =>
      q.state.data?.data?.status === 'generating' ? 3000 : false,
  });

  // Transport-level failure (genuine network / non-2xx), distinct from a
  // server-reported 'failed' generation status below.
  if (query.error) {
    const message =
      query.error instanceof ApiError
        ? query.error.userMessage
        : 'Could not load the class report.';
    return <ErrorView message={message} onRetry={() => query.refetch()} />;
  }

  const report = query.data?.data;

  // First load (no data yet) or generation in progress → spinner.
  if (query.isLoading || report?.status === 'generating') {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-ink3">
        <span className="text-4xl animate-pulse">📋</span>
        <p className="text-sm">Generating class report… (~10–20s)</p>
      </div>
    );
  }

  // Server-reported generation failure → message + Try again (forces refresh).
  if (report?.status === 'failed') {
    const handleTryAgain = async () => {
      // Force regeneration server-side, then re-poll via the normal query.
      await api.classReport(orgId, classId, { refresh: true });
      queryClient.invalidateQueries({ queryKey: ['classReport', orgId, classId] });
    };
    return (
      <ErrorView
        message={report.message ?? 'The class report could not be generated.'}
        onRetry={handleTryAgain}
      />
    );
  }

  if (!report || report.status !== 'ready') return null;

  const narrative = report.narrative ?? '';
  const generatedDate = report.generatedAt
    ? new Date(report.generatedAt).toLocaleString()
    : 'unknown';
  const cachedSuffix = report.cached ? ' (cached)' : '';

  function handleCopy() {
    navigator.clipboard.writeText(narrative);
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Class Report</title>
      <style>body{font-family:sans-serif;max-width:680px;margin:40px auto;line-height:1.7;color:#1F1733}
      h1{font-size:1.25rem}p{margin:0.75rem 0}small{color:#6B618A}</style>
      </head><body>
      <h1>Class Performance Report</h1>
      <small>Generated: ${generatedDate}${cachedSuffix}</small>
      ${narrative.split('\n\n').map((p) => `<p>${p}</p>`).join('')}
      </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">AI Class Report</h2>
          <p className="text-xs text-ink3 mt-0.5">
            Generated {generatedDate}{cachedSuffix ? ' · cached' : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium border border-line rounded-lg text-ink2 hover:text-ink hover:border-ink2 transition"
          >
            Copy
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-medium border border-line rounded-lg text-ink2 hover:text-ink hover:border-ink2 transition"
          >
            Print
          </button>
        </div>
      </div>

      {narrative ? (
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-4">
          {narrative.split('\n\n').filter(Boolean).map((para, i) => (
            <p key={i} className="text-sm text-ink leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-2xl p-6 text-sm text-ink3">
          No report content yet — students need to complete at least one lesson first.
        </div>
      )}
    </div>
  );
}
