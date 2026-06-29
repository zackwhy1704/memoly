'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrg } from '@/lib/org-context';
import MochiUploader from '@/components/MochiUploader';
import EmptyState from '@/components/EmptyState';
import { FilesPanel } from '../components/FilesPanel';
import { BrainPagesSection } from '../components/BrainPagesSection';

export function ClassBrainTab({ corpusAvatarId, classId }: { corpusAvatarId: string | null; classId: string }) {
  const qc = useQueryClient();
  const org = useOrg();
  const [uploaderOpen, setUploaderOpen] = useState(false);

  if (!corpusAvatarId) {
    return (
      <EmptyState
        icon="📚"
        title="No corpus yet"
        description="This class has no content corpus. Contact support if this is unexpected."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Compiled notes — primary content */}
      <BrainPagesSection avatarId={corpusAvatarId} orgId={org?.orgId} classId={classId} />

      {/* Source files with delete */}
      <FilesPanel avatarId={corpusAvatarId} />

      {/* Upload more — secondary, collapsed by default */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <button
          onClick={() => setUploaderOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-panel2 transition"
        >
          <span className="text-sm font-semibold text-ink">Upload more files</span>
          <span className="text-ink3 text-xs">{uploaderOpen ? '▲ collapse' : '▼ expand'}</span>
        </button>
        {uploaderOpen && (
          <div className="px-5 pb-5 border-t border-line pt-4">
            <p className="text-ink3 text-xs mb-4">
              Upload notes, worksheets or PDFs — every student in this class reads this shared brain.
            </p>
            <MochiUploader
              avatarId={corpusAvatarId}
              classId={classId}
              onComplete={() => {
                qc.invalidateQueries({ queryKey: ['classFiles', corpusAvatarId] });
                qc.invalidateQueries({ queryKey: ['wikiPages', corpusAvatarId] });
                setUploaderOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
