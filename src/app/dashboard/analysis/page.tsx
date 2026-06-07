'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, Avatar, WikiPage } from '@/lib/api';
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
        const list = res.data ?? [];
        setAvatars(list);
        if (!selectedAvatarId && list.length === 1) {
          setSelectedAvatarId(list[0].id);
        }
      })
      .catch(() => setError('Failed to load avatars.'));
  }, [selectedAvatarId]);

  // Load wiki pages whenever avatar changes
  useEffect(() => {
    if (!selectedAvatarId) return;
    setLoading(true);
    setError('');
    setPages([]);

    api
      .wikiPages(selectedAvatarId)
      .then((res) => setPages(res.data ?? []))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load';
        setError(msg);
      })
      .finally(() => setLoading(false));
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
    router.replace(`/dashboard/analysis?avatarId=${id}`, { scroll: false });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analysis</h1>
        <p className="text-gray-500 text-sm mt-1">Browse compiled wiki pages for each tutor</p>
      </div>

      {/* Avatar selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Tutor
          </label>
          <select
            value={selectedAvatarId}
            onChange={(e) => handleAvatarChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#7042ED]/30 focus:border-[#7042ED] bg-white"
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Search pages
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or slug…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-[#7042ED]/30 focus:border-[#7042ED]
                placeholder:text-gray-400"
            />
          </div>
        )}
      </div>

      {/* Stats row */}
      {pages.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-[#7042ED]">{pages.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total pages</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Verified</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{conflictCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Conflicts</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl animate-bounce">📚</span>
            <p className="text-gray-400 text-sm">Loading wiki pages…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Empty state — no avatar selected */}
      {!selectedAvatarId && !loading && (
        <div className="text-center py-20">
          <span className="text-5xl block mb-4">🧠</span>
          <p className="text-gray-500 font-medium">Select a tutor to see its wiki pages</p>
        </div>
      )}

      {/* Empty state — avatar selected but no pages */}
      {selectedAvatarId && !loading && !error && pages.length === 0 && (
        <div className="text-center py-20">
          <span className="text-5xl block mb-4">📭</span>
          <p className="text-gray-500 font-medium">No wiki pages yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload content to build this tutor's knowledge base</p>
        </div>
      )}

      {/* Page grid */}
      {!loading && filteredPages.length > 0 && (
        <>
          {search && (
            <p className="text-sm text-gray-500 mb-4">
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
          <p className="text-gray-500">No pages match &quot;{search}&quot;</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-sm text-[#7042ED] hover:underline"
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
    <Suspense fallback={<div className="py-24 text-center text-gray-400">Loading…</div>}>
      <AnalysisContent />
    </Suspense>
  );
}
