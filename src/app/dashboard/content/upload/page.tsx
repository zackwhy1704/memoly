'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import FileDropzone from '@/components/FileDropzone';

// ── AroundTheWorld Mochi series ───────────────────────────────────────────────

interface CentreMochi {
  characterType: string;
  name: string;
  image: string | null;  // /characters/atw_xxx.png — null = emoji fallback
  emoji: string;
  rarity: 'COMMON' | 'RARE' | 'SECRET';
  tagline: string;
}

const CENTRE_MOCHIS: CentreMochi[] = [
  { characterType: 'ATWBERET',      name: 'Beret Mochi',    image: '/characters/atw_beret.png',      emoji: '🎭', rarity: 'COMMON', tagline: 'Paris, France' },
  { characterType: 'ATWGLOBERIDER', name: 'Globe Rider',     image: '/characters/atw_globerider.png', emoji: '🌍', rarity: 'RARE',   tagline: 'Around the World' },
  { characterType: 'ATWKEBAYA',     name: 'Kebaya Mochi',    image: '/characters/atw_kebaya.png',     emoji: '👘', rarity: 'COMMON', tagline: 'Southeast Asia' },
  { characterType: 'ATWLIONCITY',   name: 'Lion City Mochi', image: '/characters/atw_lioncity.png',   emoji: '🦁', rarity: 'SECRET', tagline: 'Singapore' },
  { characterType: 'ATWPHARAOH',    name: 'Pharaoh Mochi',   image: '/characters/atw_pharaoh.png',    emoji: '🏺', rarity: 'COMMON', tagline: 'Egypt' },
  { characterType: 'ATWSAKURA',     name: 'Sakura Mochi',    image: '/characters/atw_sakura.png',     emoji: '🌸', rarity: 'COMMON', tagline: 'Japan' },
  { characterType: 'ATWSOMBRERO',   name: 'Sombrero Mochi',  image: '/characters/atw_sombrero.png',   emoji: '🪅', rarity: 'COMMON', tagline: 'Mexico' },
  { characterType: 'ATWKILT',       name: 'Kilt Mochi',      image: '/characters/atw_kilt.png',       emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', rarity: 'COMMON', tagline: 'Scotland' },
];

const RARITY_LABEL: Record<string, { label: string; cls: string }> = {
  RARE:   { label: 'RARE',   cls: 'text-accent border-accent/50 bg-accent/10' },
  SECRET: { label: 'SECRET', cls: 'text-warn  border-warn/50  bg-warn/10'  },
};

function UploadContent() {
  const [selected, setSelected] = useState<CentreMochi | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; avatarId?: string } | null>(null);
  const [error, setError] = useState('');

  async function handleUpload() {
    if (!file || !selected) return;
    setUploading(true);
    setResult(null);
    setError('');

    try {
      const avatarsRes = await api.avatars();
      const raw = avatarsRes.data ?? avatarsRes;
      const list = Array.isArray(raw) ? raw : [];

      const centreAvatar =
        list.find((a) => a.centreManaged && a.characterType?.toUpperCase() === selected.characterType) ??
        list.find((a) => a.characterType?.toUpperCase() === selected.characterType);

      if (!centreAvatar) {
        setError(
          `No ${selected.name} avatar found. Create one in the Memoly app first, then mark it as a centre Mochi from the Overview page.`
        );
        return;
      }

      const res = await api.uploadFile(centreAvatar.id, file);
      const data = res?.data;
      setResult({
        success: true,
        message: data?.pageCount
          ? `${data.pageCount} page${data.pageCount !== 1 ? 's' : ''} compiled into ${selected.name}'s brain!`
          : `File uploaded! ${selected.name} is processing it in the background…`,
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
          Pick a Centre Mochi then upload PDFs, notes, or images to grow its knowledge base.
        </p>
      </div>

      {/* Step 1 — Character picker */}
      <div className="bg-panel rounded-xl border border-line p-6 mb-4">
        <p className="text-xs font-semibold text-ink3 uppercase tracking-wider mb-4">
          Step 1 — Select Centre Mochi
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CENTRE_MOCHIS.map((mochi) => {
            const isSelected = selected?.characterType === mochi.characterType;
            const rarity = RARITY_LABEL[mochi.rarity];

            return (
              <button
                key={mochi.characterType}
                onClick={() => setSelected(mochi)}
                className={`
                  relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                  ${isSelected
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-line bg-panel2 hover:border-accent/40'}
                `}
              >
                {/* Rarity badge */}
                {rarity && (
                  <span className={`absolute top-2 right-2 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${rarity.cls}`}>
                    {rarity.label}
                  </span>
                )}

                {/* Character image or emoji fallback */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  {mochi.image ? (
                    <Image
                      src={mochi.image}
                      alt={mochi.name}
                      width={64}
                      height={64}
                      className="object-contain drop-shadow-sm"
                    />
                  ) : (
                    <span className="text-4xl leading-none">{mochi.emoji}</span>
                  )}
                </div>

                {/* Name + tagline */}
                <div className="text-center">
                  <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-accent' : 'text-ink'}`}>
                    {mochi.name}
                  </p>
                  <p className="text-[10px] text-ink3 mt-0.5">{mochi.tagline}</p>
                </div>

                {isSelected && (
                  <span className="absolute bottom-2 right-2 text-accent text-sm leading-none">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-4 flex items-center gap-3 text-sm bg-panel2 rounded-lg px-3 py-2.5">
            {selected.image ? (
              <Image src={selected.image} alt={selected.name} width={28} height={28} className="object-contain" />
            ) : (
              <span className="text-xl">{selected.emoji}</span>
            )}
            <span className="text-ink">
              <strong>{selected.name}</strong>
              <span className="text-ink3"> · {selected.tagline}</span>
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
          disabled={uploading || !selected}
        />
        {!selected && (
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
        disabled={!file || !selected || uploading}
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
          `↑ Upload to ${selected?.name ?? 'Centre Mochi'}`
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
