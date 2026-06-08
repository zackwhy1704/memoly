'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import FileDropzone from '@/components/FileDropzone';

// ── AroundTheWorld Mochi series ───────────────────────────────────────────────
// These are the 8 exclusive Centre Mochis. The centre admin picks one
// to associate with the content they're uploading.

interface CentreMochi {
  characterType: string;  // matches backend CharacterType enum
  name: string;
  emoji: string;
  rarity: 'COMMON' | 'RARE' | 'SECRET';
  tagline: string;
}

const CENTRE_MOCHIS: CentreMochi[] = [
  { characterType: 'ATWBERET',      name: 'Beret Mochi',       emoji: '🎭', rarity: 'COMMON', tagline: 'Paris, France' },
  { characterType: 'ATWGLOBERIDER', name: 'Globe Rider',        emoji: '🌍', rarity: 'RARE',   tagline: 'Around the World' },
  { characterType: 'ATWKEBAYA',     name: 'Kebaya Mochi',       emoji: '👘', rarity: 'COMMON', tagline: 'Southeast Asia' },
  { characterType: 'ATWLIONCITY',   name: 'Lion City Mochi',    emoji: '🦁', rarity: 'SECRET', tagline: 'Singapore' },
  { characterType: 'ATWPHARAOH',    name: 'Pharaoh Mochi',      emoji: '🏺', rarity: 'COMMON', tagline: 'Egypt' },
  { characterType: 'ATWSAKURA',     name: 'Sakura Mochi',       emoji: '🌸', rarity: 'COMMON', tagline: 'Japan' },
  { characterType: 'ATWSOMBRERO',   name: 'Sombrero Mochi',     emoji: '🪅', rarity: 'COMMON', tagline: 'Mexico' },
  { characterType: 'ATWKILT',       name: 'Kilt Mochi',         emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', rarity: 'COMMON', tagline: 'Scotland' },
];

const RARITY_STYLE: Record<string, string> = {
  COMMON: 'text-ink3 border-line',
  RARE:   'text-accent border-accent/40',
  SECRET: 'text-warn border-warn/40',
};

function UploadContent() {
  const [selectedCharacter, setSelectedCharacter] = useState<CentreMochi | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; avatarId?: string } | null>(null);
  const [error, setError] = useState('');

  async function handleUpload() {
    if (!file || !selectedCharacter) return;
    setUploading(true);
    setResult(null);
    setError('');

    try {
      // Find or use the centre avatar for this character type.
      // The backend returns centreManaged avatars with matching characterType.
      const avatarsRes = await api.avatars();
      const raw = avatarsRes.data ?? avatarsRes;
      const list = Array.isArray(raw) ? raw : [];

      // Look for an existing centre avatar with this character type
      const centreAvatar = list.find(
        (a) => a.centreManaged && a.characterType?.toUpperCase() === selectedCharacter.characterType
      ) ?? list.find(
        // Fall back to any avatar with this character type (for mark-centre flow)
        (a) => a.characterType?.toUpperCase() === selectedCharacter.characterType
      );

      if (!centreAvatar) {
        setError(
          `No ${selectedCharacter.name} avatar found. Create one in the Memoly app first, then mark it as a centre Mochi from the Overview page.`
        );
        return;
      }

      const res = await api.uploadFile(centreAvatar.id, file);
      const data = res?.data;
      setResult({
        success: true,
        message: data?.pageCount
          ? `${data.pageCount} page${data.pageCount !== 1 ? 's' : ''} compiled into ${selectedCharacter.name}'s brain!`
          : `File uploaded! ${selectedCharacter.name} is processing it in the background…`,
        avatarId: centreAvatar.id,
      });
      setFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(
        msg.includes('413') ? 'File is too large.' :
        msg.includes('relevance') ? 'File may be off-topic for this Mochi.' :
        `Upload failed: ${msg}`
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Upload Centre Content</h1>
        <p className="text-ink3 text-sm mt-1">
          Pick a Centre Mochi then upload PDF, text, or images to grow its knowledge base.
        </p>
      </div>

      {/* Step 1 — Mochi picker */}
      <div className="bg-panel rounded-xl border border-line p-6 mb-4">
        <p className="text-xs font-semibold text-ink3 uppercase tracking-wider mb-4">
          Step 1 — Select Centre Mochi
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CENTRE_MOCHIS.map((mochi) => {
            const isSelected = selectedCharacter?.characterType === mochi.characterType;
            return (
              <button
                key={mochi.characterType}
                onClick={() => setSelectedCharacter(mochi)}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${isSelected
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-line bg-panel2 hover:border-accent/40 hover:bg-panel2'}
                `}
              >
                {/* Rarity badge */}
                {mochi.rarity !== 'COMMON' && (
                  <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${RARITY_STYLE[mochi.rarity]}`}>
                    {mochi.rarity}
                  </span>
                )}

                <span className="text-3xl leading-none">{mochi.emoji}</span>
                <div className="text-center">
                  <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-accent' : 'text-ink'}`}>
                    {mochi.name}
                  </p>
                  <p className="text-[10px] text-ink3 mt-0.5">{mochi.tagline}</p>
                </div>

                {isSelected && (
                  <span className="absolute bottom-2 right-2 text-accent text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {selectedCharacter && (
          <div className="mt-4 flex items-center gap-2 text-sm text-ink3 bg-panel2 rounded-lg px-3 py-2">
            <span>{selectedCharacter.emoji}</span>
            <span>
              <strong className="text-ink">{selectedCharacter.name}</strong>
              {' · '}{selectedCharacter.tagline}
            </span>
          </div>
        )}
      </div>

      {/* Step 2 — File drop */}
      <div className="bg-panel rounded-xl border border-line p-6 mb-4">
        <p className="text-xs font-semibold text-ink3 uppercase tracking-wider mb-4">
          Step 2 — Drop a file
        </p>
        <FileDropzone
          onFileSelected={(f) => { setFile(f); setResult(null); }}
          disabled={uploading || !selectedCharacter}
        />
        {!selectedCharacter && (
          <p className="text-center text-xs text-ink3 mt-3">Select a Centre Mochi above first</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad mb-4">
          {error}
        </div>
      )}

      {/* Success */}
      {result?.success && (
        <div className="bg-ok/10 border border-ok/30 rounded-xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-ok">{result.message}</p>
              {result.avatarId && (
                <Link
                  href={`/dashboard/content/analysis?avatarId=${result.avatarId}`}
                  className="inline-block mt-2 text-sm text-accent font-medium hover:underline"
                >
                  View compiled pages →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || !selectedCharacter || uploading}
        className="w-full py-3 px-4 rounded-xl bg-accent text-white font-semibold text-sm
          hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
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
          `↑ Upload to ${selectedCharacter?.name ?? 'Centre Mochi'}`
        )}
      </button>
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
