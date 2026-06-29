'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type OrgClass } from '@/lib/api';
import { CENTRE_SUBJECTS } from '@/lib/centre-mochis';

export default function EditClassModal({
  orgId,
  cls,
  onClose,
  onSaved,
}: {
  orgId: string;
  cls: OrgClass;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(cls.name);
  const [subject, setSubject] = useState(cls.subject ?? 'GENERAL');
  const [level, setLevel] = useState(cls.level ?? '');

  const mut = useMutation({
    mutationFn: () =>
      api.updateClass(orgId, cls.id, {
        name: name.trim(),
        subject,
        level: level.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', orgId] });
      onSaved();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-line rounded-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">Edit class</h2>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-ink2 font-medium">Class name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="P4 Math"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink2 font-medium">Subject</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {CENTRE_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-ink2 font-medium">Level</span>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="P4"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </label>
          </div>
        </div>

        {mut.isError && (
          <p className="text-xs text-bad">
            {(mut.error as Error)?.message || 'Could not save. Please try again.'}
            {' '}
            <button className="underline" onClick={() => mut.mutate()}>Retry</button>
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!name.trim() || mut.isPending}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {mut.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
