'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, ApiError, Avatar, WikiPage } from '@/lib/api';
import WikiPageCard from '@/components/WikiPageCard';

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryAvatarId = searchParams.get('avatarId') ?? '';

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState(queryAvatarId);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Load avatar list
  useEffect(() => {
    api
      .avatars()
      .then((res) => {
        const list = res.data?.avatars ?? [];
        setAvatars(list);
        if (!selectedAvatarId && list.length === 1) {
          setSelectedAvatarId(list[0].id);
        }
      })
      .catch(() => setError('Failed to load avatars.'));
  }, [selectedAvatarId]);

  function loadPages(avatarId: string) {
    setLoading(true);
    setError('');
    setPages([]);
    api
      .wikiPages(avatarId)
      .then((res) => setPages(res.data ?? []))
      .catch((err) => {
        const msg = err instanceof ApiError ? err.userMessage : err instanceof Error ? err.message : 'Failed to load wiki pages.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }

  // Load wiki pages whenever avatar changes
  useEffect(() => {
    if (!selectedAvatarId) return;
    loadPages(selectedAvatarId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAvatarId]);

  const filteredPages = pages.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const verifiedCount = pages.filter((p) => p.certainty === 'VERIFIED').length;
  const conflictCount = pages.filter((p) => p.hasConflict).length;

  function handleAvatarChange(id: string) {
    setSelectedAvatarId(id);
    setSearch('');
    router.replace(`/dashboard/content/analysis?avatarId=${id}`, { scroll: false });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Analysis</h1>
        <p className="text-ink3 text-sm mt-1">Browse compiled wiki pages for each tutor</p>
      </div>

      {/* Avatar selector */}
      <div className="bg-panel rounded-xl border border-line p-5 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-ink3 uppercase tracking-wide mb-1.5">
            Tutor
          </label>
          <select
            value={selectedAvatarId}
            onChange={(e) => handleAvatarChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-panel2 text-ink
              focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="">— Select a tutor —</option>
            {avatars.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.subject}
              </option>
            ))}
          </select>
        </div>

        {pages.length > 0 && (
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-ink3 uppercase tracking-wide mb-1.5">
              Search pages
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or slug…"
              className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-panel2 text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                placeholder:text-ink3"
            />
          </div>
        )}
      </div>

      {/* Stats row */}
      {pages.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-panel rounded-xl border border-line p-4 text-center">
            <p className="text-2xl font-bold text-accent">{pages.length}</p>
            <p className="text-xs text-ink3 mt-0.5">Total pages</p>
          </div>
          <div className="bg-panel rounded-xl border border-line p-4 text-center">
            <p className="text-2xl font-bold text-ok">{verifiedCount}</p>
            <p className="text-xs text-ink3 mt-0.5">Verified</p>
          </div>
          <div className="bg-panel rounded-xl border border-line p-4 text-center">
            <p className="text-2xl font-bold text-bad">{conflictCount}</p>
            <p className="text-xs text-ink3 mt-0.5">Conflicts</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl animate-bounce">📚</span>
            <p className="text-ink3 text-sm">Loading wiki pages…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl p-5 text-bad text-sm flex items-start justify-between gap-4">
          <span>{error}</span>
          {selectedAvatarId && (
            <button
              onClick={() => loadPages(selectedAvatarId)}
              className="shrink-0 px-3 py-1.5 bg-bad text-white rounded-lg text-xs font-semibold hover:bg-bad/80 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Empty state — no avatar selected */}
      {!selectedAvatarId && !loading && (
        <div className="text-center py-20">
          <span className="text-5xl block mb-4">🧠</span>
          <p className="text-ink3 font-medium">Select a tutor to see its wiki pages</p>
        </div>
      )}

      {/* Empty state — avatar selected but no pages */}
      {selectedAvatarId && !loading && !error && pages.length === 0 && (
        <div className="text-center py-20">
          <span className="text-5xl block mb-4">📭</span>
          <p className="text-ink3 font-medium">No wiki pages yet</p>
          <p className="text-ink3 text-sm mt-1">Upload content to build this tutor's knowledge base</p>
        </div>
      )}

      {/* Page grid */}
      {!loading && filteredPages.length > 0 && (
        <>
          {search && (
            <p className="text-sm text-ink3 mb-4">
              Showing {filteredPages.length} of {pages.length} pages
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPages.map((page) => (
              <WikiPageCard key={page.id} page={page} />
            ))}
          </div>
        </>
      )}

      {/* No results from search */}
      {!loading && search && filteredPages.length === 0 && pages.length > 0 && (
        <div className="text-center py-16">
          <p className="text-ink3">No pages match &quot;{search}&quot;</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-sm text-accent hover:underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-ink3">Loading…</div>}>
      <AnalysisContent />
    </Suspense>
  );
}
