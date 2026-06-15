'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, type AssignmentType, type CreateAssignmentBody } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

export function CreateAssignmentModal({
  orgId,
  classId,
  onClose,
  onCreated,
}: {
  orgId: string;
  classId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssignmentType>('POST_CLASS');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [masteryThreshold, setMasteryThreshold] = useState(60);

  const modulesQuery = useQuery({
    queryKey: ['classModules', orgId, classId],
    queryFn: () => api.classModules(orgId, classId),
  });

  const create = useMutation({
    mutationFn: () => {
      const body: CreateAssignmentBody = {
        title,
        type,
        moduleIds: selectedModules,
        dueDate: dueDate || undefined,
        masteryThreshold: type === 'REVISION' ? masteryThreshold : undefined,
      };
      return api.createAssignment(orgId, classId, body);
    },
    onSuccess: () => {
      trackEvent('assignment_created', { type, classId, moduleCount: selectedModules.length });
      onCreated();
      onClose();
    },
  });

  const modules = modulesQuery.data?.data ?? [];

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-sm font-bold text-ink">Create Assignment</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-lg leading-none">&times;</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 5 Review"
              className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-2">
              {(['PRE_CLASS', 'POST_CLASS', 'REVISION', 'CUSTOM'] as AssignmentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    type === t
                      ? 'bg-accent text-white'
                      : 'bg-panel2 text-ink3 hover:text-ink2'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Modules</label>
            {modulesQuery.isLoading ? (
              <p className="text-ink3 text-xs">Loading modules...</p>
            ) : modules.length === 0 ? (
              <p className="text-ink3 text-xs">No modules available.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {modules.map((m) => (
                  <label key={m.moduleId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(m.moduleId)}
                      onChange={() => toggleModule(m.moduleId)}
                      className="w-4 h-4 rounded border-line text-accent focus:ring-accent/40"
                    />
                    <span className="text-sm text-ink">{m.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Due date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-panel2 border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Mastery threshold for REVISION */}
          {type === 'REVISION' && (
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">
                Mastery threshold: {masteryThreshold}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={masteryThreshold}
                onChange={(e) => setMasteryThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-line">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-panel2 hover:bg-panel2/80 rounded-lg text-ink transition"
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!title.trim() || selectedModules.length === 0 || create.isPending}
            className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-40"
          >
            {create.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
        {create.error && (
          <div className="px-5 pb-4">
            <p className="text-xs text-bad">Failed to create assignment. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
