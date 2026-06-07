'use client';

import { useCallback, useRef, useState } from 'react';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['.pdf', '.txt', '.png', '.jpg', '.jpeg', '.webp'];
const ACCEPT_MIME = 'application/pdf,text/plain,image/png,image/jpeg,image/webp';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileDropzone({ onFileSelected, disabled }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setSelectedFile(file);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/50 hover:bg-panel2'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_MIME}
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">
              {selectedFile.type.includes('pdf') ? '📄' : selectedFile.type.includes('image') ? '🖼️' : '📝'}
            </span>
            <p className="font-semibold text-ink mt-1 break-all max-w-xs">{selectedFile.name}</p>
            <p className="text-sm text-ink2">{formatSize(selectedFile.size)}</p>
            <p className="text-xs text-accent mt-1">Click to change file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">☁️</span>
            <p className="font-semibold text-ink mt-2">Drop a file here</p>
            <p className="text-sm text-ink2">or click to browse</p>
            <p className="text-xs text-ink3 mt-2">Supports: {ACCEPTED_TYPES.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
