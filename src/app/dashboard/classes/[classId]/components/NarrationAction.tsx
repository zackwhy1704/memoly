'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api, type NarrationData } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function NarrationAction({ orgId, classId, moduleId }: { orgId: string; classId: string; moduleId: string }) {
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const narrationQuery = useQuery({
    queryKey: ['narration', orgId, classId, moduleId],
    queryFn: () => api.getNarration(orgId, classId, moduleId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === 'GENERATING' ? 5000 : false;
    },
  });

  const generate = useMutation({
    mutationFn: () => api.generateNarration(orgId, classId, moduleId),
    onSuccess: () => {
      trackEvent('narration_generated', { moduleId, classId });
      qc.invalidateQueries({ queryKey: ['narration', orgId, classId, moduleId] });
    },
  });

  const narration = narrationQuery.data?.data ?? null;
  const status = narration?.status;

  if (narrationQuery.isLoading) {
    return <span className="text-xs text-ink3">...</span>;
  }

  if (!narration) {
    return (
      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="text-xs font-semibold text-accent hover:underline disabled:opacity-40"
      >
        {generate.isPending ? 'Starting...' : 'Generate narration'}
      </button>
    );
  }

  if (status === 'GENERATING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink3">
        <span className="w-3 h-3 border-2 border-ink3 border-t-transparent rounded-full animate-spin" />
        Generating...
      </span>
    );
  }

  if (status === 'FAILED') {
    return (
      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="text-xs font-semibold text-bad hover:underline disabled:opacity-40"
      >
        {generate.isPending ? 'Retrying...' : 'Retry'}
      </button>
    );
  }

  // READY
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPreviewOpen(true)}
          className="text-xs font-semibold text-accent hover:underline"
        >
          Preview
        </button>
        <span className="text-xs text-ink3 tabular-nums">{formatDuration(narration.totalDurationMs)}</span>
      </div>
      {previewOpen && (
        <NarrationPreviewModal
          narration={narration}
          onClose={() => setPreviewOpen(false)}
          onRegenerate={() => {
            setPreviewOpen(false);
            generate.mutate();
          }}
        />
      )}
    </>
  );
}

function NarrationPreviewModal({
  narration,
  onClose,
  onRegenerate,
}: {
  narration: NarrationData;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const segments = narration.segments;
  const segment = segments[currentIndex];

  const goToSegment = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      // Audio src will change via effect, auto-play handled there
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, segments.length]);

  // Auto-play when segment changes while playing
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentIndex, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current || !segment) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!segment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <h2 className="text-sm font-bold text-ink">Narration Preview</h2>
            <p className="text-xs text-ink3 mt-0.5">
              {segments.length} cards &middot; {formatDuration(narration.totalDurationMs)} total
            </p>
          </div>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-lg leading-none">&times;</button>
        </div>

        {/* Card navigation */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-line overflow-x-auto">
          {segments.map((seg, i) => (
            <button
              key={i}
              onClick={() => goToSegment(i)}
              className={`shrink-0 w-8 h-8 rounded-lg text-xs font-semibold transition ${
                i === currentIndex
                  ? 'bg-accent text-white'
                  : 'bg-panel2 text-ink3 hover:text-ink2'
              }`}
            >
              {seg.cardIndex + 1}
            </button>
          ))}
        </div>

        {/* Current segment */}
        <div className="px-5 py-5 space-y-4">
          <div className="bg-panel2 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink3 mb-2">
              Card {segment.cardIndex + 1} &middot; {formatDuration(segment.durationMs)}
            </p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{segment.scriptText}</p>
          </div>

          {/* Audio player */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shrink-0 hover:bg-accent/90 transition"
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12" rx="1" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z" /></svg>
              )}
            </button>
            <div className="flex-1 text-xs text-ink3">
              {currentIndex + 1} / {segments.length}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => goToSegment(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="px-2 py-1 text-xs text-ink3 hover:text-ink disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => goToSegment(Math.min(segments.length - 1, currentIndex + 1))}
                disabled={currentIndex === segments.length - 1}
                className="px-2 py-1 text-xs text-ink3 hover:text-ink disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>

          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={segment.audioUrl}
            onEnded={handleEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            preload="auto"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-line">
          <button
            onClick={onRegenerate}
            className="text-xs font-semibold text-bad hover:underline"
          >
            Re-generate
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-panel2 hover:bg-panel2/80 rounded-lg text-ink transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
