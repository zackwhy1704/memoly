'use client';

import { useState } from 'react';

const MIN_PASTE_CHARS = 50;
const WARN_PASTE_CHARS = 5000;

interface PasteModeProps {
  value: string;
  submitting: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}

export default function PasteMode({ value, submitting, onChange, onSubmit }: PasteModeProps) {
  const charCount = value.length;

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type your teaching materials here..."
        rows={8}
        className="w-full rounded-xl border border-line bg-panel2 p-4 text-ink text-sm font-mono resize-y min-h-[200px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <p
          className={`text-xs ${
            charCount > 0 && charCount < MIN_PASTE_CHARS
              ? 'text-warn'
              : charCount >= WARN_PASTE_CHARS
                ? 'text-warn'
                : 'text-ink3'
          }`}
        >
          {charCount === 0
            ? `Minimum ${MIN_PASTE_CHARS} characters`
            : charCount < MIN_PASTE_CHARS
              ? `${MIN_PASTE_CHARS - charCount} more characters needed`
              : charCount >= WARN_PASTE_CHARS
                ? `${charCount.toLocaleString()} characters (large input may take longer)`
                : `${charCount.toLocaleString()} characters`}
        </p>
      </div>
      <button
        onClick={onSubmit}
        disabled={charCount < MIN_PASTE_CHARS || submitting}
        className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-40"
      >
        {submitting ? 'Adding...' : 'Add to class content'}
      </button>
    </div>
  );
}
