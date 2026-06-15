'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type OrgClass } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import AsyncBoundary from '@/components/AsyncBoundary';
import EmptyState from '@/components/EmptyState';
import ClassAvatar from '@/components/ClassAvatar';
import MochiAvatar from '@/components/MochiAvatar';
import { useClassAvatarMap } from './hooks/useClassAvatarMap';
import MochiBadge from './components/MochiBadge';
import CreateClassModal from './modals/CreateClassModal';

export default function ClassesPage() {
  const router = useRouter();
  const org = useOrg();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const query = useQuery({
    queryKey: ['classes', org?.orgId],
    queryFn: () => api.classes(org!.orgId),
    enabled: !!org,
  });

  const avatarMap = useClassAvatarMap();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Classes</h1>
          <p className="text-ink3 text-sm mt-1">
            Each class has its own join code, shared corpus, and branded Mochi.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
        >
          + New class
        </button>
      </div>

      <AsyncBoundary
        query={query}
        loadingIcon="🏫"
        loadingLabel="Loading classes..."
        errorMessage="Could not load classes."
        empty={
          <EmptyState
            icon="🏫"
            title="No classes yet"
            description="Create your first class to get a join code and start adding students."
            actionLabel="+ New class"
            onAction={() => setShowCreate(true)}
          />
        }
      >
        {(data) => {
          const classes: OrgClass[] = Array.isArray(data.data) ? data.data : [];

          if (classes.length === 0) {
            return (
              <EmptyState
                icon="🏫"
                title="No classes yet"
                description="Create your first class to get a join code and start adding students."
                actionLabel="+ New class"
                onAction={() => setShowCreate(true)}
              />
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                  className="bg-panel border border-line rounded-2xl p-5 text-left hover:border-accent/40 hover:bg-panel2 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {(() => {
                      // A class with a designed Mochi renders its customised look
                      // (body colour + accessory + aura); otherwise fall back to the
                      // server class-uniform appearance, then a plain badge.
                      if (cls.mochiConfig) {
                        return <MochiAvatar config={cls.mochiConfig} size={48} animate={false} />;
                      }
                      const appearance = cls.corpusAvatarId
                        ? avatarMap.get(cls.corpusAvatarId)
                        : undefined;
                      return appearance ? (
                        <ClassAvatar appearance={appearance} size={48} />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: (cls.accentColor ?? '#7042ED') + '22' }}
                        >
                          <MochiBadge characterType={cls.characterType} size={36} />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-ink truncate">
                        {cls.brandName || cls.name}
                      </h2>
                      <p className="text-ink3 text-xs truncate">
                        {[cls.subject, cls.level].filter(Boolean).join(' · ') || 'No subject set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink3">{cls.studentCount} students</span>
                    <span className="font-mono text-xs px-2 py-1 rounded bg-panel2 text-ink2 tracking-wider">
                      {cls.joinCode}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          );
        }}
      </AsyncBoundary>

      {showCreate && org && (
        <CreateClassModal
          orgId={org.orgId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['classes', org.orgId] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
