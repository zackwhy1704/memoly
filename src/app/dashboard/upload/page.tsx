'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Avatar } from '@/lib/api';
import FileDropzone from '@/components/FileDropzone';

function UploadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryAvatarId = searchParams.get('avatarId') ?? '';

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState(queryAvatarId);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    avatarId?: string;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .avatars()
      .then((res) => {
        // Guard: ensure we always set an array regardless of envelope shape
        const raw = res.data ?? res;
        const list: Avatar[] = Array.isArray(raw) ? raw : [];
        setAvatars(list);
        if (!selectedAvatarId && list.length === 1) {
          setSelectedAvatarId(list[0].id);
        }
      })
      .catch(() => setError('Failed to load avatars.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAvatar = Array.isArray(avatars)
    ? avatars.find((a) => a.id === selectedAvatarId)
    : undefined;

  async function handleUpload() {
    if (!file || !selectedAvatarId) return;
    setUploading(true);
    setResult(null);
    setError('');

    try {
      const res = await api.uploadFile(selectedAvatarId, file);
      const data = res?.data;
      setResult({
        success: true,
        message: data?.pageCount
          ? `${data.pageCount} page${data.pageCount !== 1 ? 's' : ''} compiled successfully!`
          : 'File uploaded! Processing in background…',
        avatarId: selectedAvatarId,
      });
      setFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg.includes('relevance') || msg.includes('413')
        ? 'File may be too large or off-topic for this tutor.'
        : `Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Upload Content</h1>
        <p className="text-ink3 text-sm mt-1">
          Add PDFs, notes, or images to a tutor's knowledge base
        </p>
      </div>

      {/* Avatar selector */}
      <div className="bg-panel rounded-xl border border-line p-6 mb-4">
        <label className="block text-sm font-semibold text-ink2 mb-3">
          Select Tutor
        </label>

        {avatars.length === 0 ? (
          <p className="text-ink3 text-sm">Loading tutors…</p>
        ) : (
          <select
            value={selectedAvatarId}
            onChange={(e) => {
              setSelectedAvatarId(e.target.value);
              setResult(null);
              router.replace(`/dashboard/upload?avatarId=${e.target.value}`, { scroll: false });
            }}
            className="w-full px-3.5 py-2.5 rounded-lg border border-line text-sm bg-panel2 text-ink
              focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          >
            <option value="">— Choose a tutor —</option>
            {avatars.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.subject}
              </option>
            ))}
          </select>
        )}

        {selectedAvatar && (
          <div className="mt-3 flex items-center gap-2 text-sm text-ink3">
            <span>🐾</span>
            <span>
              {selectedAvatar.name} currently has{' '}
              <strong className="text-accent">{selectedAvatar.wikiPageCount}</strong> wiki pages
            </span>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div className="bg-panel rounded-xl border border-line p-6 mb-4">
        <label className="block text-sm font-semibold text-ink2 mb-3">
          File
        </label>
        <FileDropzone
          onFileSelected={(f) => {
            setFile(f);
            setResult(null);
          }}
          disabled={uploading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad mb-4">
          {error}
        </div>
      )}

      {/* Success result */}
      {result?.success && (
        <div className="bg-ok/10 border border-ok/30 rounded-xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-ok">{result.message}</p>
              {result.avatarId && (
                <Link
                  href={`/dashboard/analysis?avatarId=${result.avatarId}`}
                  className="inline-block mt-2 text-sm text-accent font-medium hover:underline"
                >
                  View wiki pages →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || !selectedAvatarId || uploading}
        className="w-full py-3 px-4 rounded-xl bg-accent text-white font-semibold text-sm
          hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Uploading…
          </>
        ) : (
          '↑ Upload File'
        )}
      </button>

      {!file && (
        <p className="text-center text-xs text-ink3 mt-3">
          Drop a file above before uploading
        </p>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-ink3">Loading…</div>}>
      <UploadContent />
    </Suspense>
  );
}
