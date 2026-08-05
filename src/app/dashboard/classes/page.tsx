'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, type OrgClass } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import AsyncBoundary from '@/components/AsyncBoundary';
import EmptyState from '@/components/EmptyState';
import ClassAvatar from '@/components/ClassAvatar';
import MochiAvatar from '@/components/MochiAvatar';
import { useClassAvatarMap } from './hooks/useClassAvatarMap';
import MochiBadge from './components/MochiBadge';
import CreateClassModal from './modals/CreateClassModal';
import EditClassModal from './modals/EditClassModal';
import { useTranslation } from '@/lib/messages';

function ClassCard({
  cls,
  avatarMap,
  onNavigate,
  onEdit,
  onDelete,
}: {
  cls: OrgClass;
  avatarMap: Map<string, { bandColorHex: string; subjectGlyph: string; initials: string }>;
  onNavigate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, tp } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className="relative bg-panel border border-line rounded-2xl p-5 hover:border-accent/40 hover:bg-panel2 transition-colors">
      {/* Card body — navigates to class detail */}
      <div className="cursor-pointer" onClick={onNavigate}>
        <div className="flex items-center gap-3 mb-3">
          {(() => {
            if (cls.mochiConfig) {
              return <MochiAvatar config={cls.mochiConfig} size={48} animate={false} />;
            }
            const appearance = cls.corpusAvatarId ? avatarMap.get(cls.corpusAvatarId) : undefined;
            return appearance ? (
              <ClassAvatar appearance={appearance} size={48} />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-accent/10">
                <MochiBadge characterType={cls.characterType} size={36} />
              </div>
            );
          })()}
          <div className="min-w-0 pr-6">
            <h2 className="text-base font-bold text-ink truncate">{cls.name}</h2>
            <p className="text-ink3 text-xs truncate">
              {[cls.subject, cls.level].filter(Boolean).join(' · ') || t('classesPageNoSubjectSet')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink3">{tp.classesPageStudentCount(cls.studentCount)}</span>
          <span className="font-mono text-xs px-2 py-1 rounded bg-panel2 text-ink2 tracking-wider">
            {cls.joinCode}
          </span>
        </div>
      </div>

      {/* Kebab menu — top-right, stops propagation */}
      <div
        ref={menuRef}
        className="absolute top-3 right-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-ink3 hover:text-ink hover:bg-panel2 transition text-base font-bold"
          title={t('classesPageOptionsTitle')}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 bg-panel border border-line rounded-xl shadow-xl py-1 min-w-[140px]">
            <button
              onClick={() => { onEdit(); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-panel2 transition"
            >
              {t('classesPageEditClass')}
            </button>
            <button
              onClick={() => { onDelete(); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-bad hover:bg-bad/10 transition"
            >
              {t('classesPageDeleteClass')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const { t, tp } = useTranslation();
  const router = useRouter();
  const org = useOrg();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingClass, setEditingClass] = useState<OrgClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<OrgClass | null>(null);

  const query = useQuery({
    queryKey: ['classes', org?.orgId],
    queryFn: () => api.classes(org!.orgId),
    enabled: !!org,
  });

  const avatarMap = useClassAvatarMap();

  const deleteMut = useMutation({
    mutationFn: (classId: string) => api.deleteClass(org!.orgId, classId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', org!.orgId] });
      setDeletingClass(null);
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('classesPageHeading')}</h1>
          <p className="text-ink3 text-sm mt-1">
            {t('classesPageSubtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
        >
          {t('classesPageNewClass')}
        </button>
      </div>

      <AsyncBoundary
        query={query}
        loadingIcon="🏫"
        loadingLabel={t('classesPageLoading')}
        errorMessage={t('classesPageCouldNotLoad')}
        empty={
          <EmptyState
            icon="🏫"
            title={t('classesPageEmptyTitle')}
            description={t('classesPageEmptyDescription')}
            actionLabel={t('classesPageNewClass')}
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
                title={t('classesPageEmptyTitle')}
                description={t('classesPageEmptyDescription')}
                actionLabel={t('classesPageNewClass')}
                onAction={() => setShowCreate(true)}
              />
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  avatarMap={avatarMap}
                  onNavigate={() => router.push(`/dashboard/classes/${cls.id}`)}
                  onEdit={() => setEditingClass(cls)}
                  onDelete={() => setDeletingClass(cls)}
                />
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

      {editingClass && org && (
        <EditClassModal
          orgId={org.orgId}
          cls={editingClass}
          onClose={() => setEditingClass(null)}
          onSaved={() => setEditingClass(null)}
        />
      )}

      {deletingClass && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !deleteMut.isPending && setDeletingClass(null)}
        >
          <div
            className="bg-panel border border-line rounded-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-ink">{tp.classesPageDeleteConfirmHeading(deletingClass.name)}</h2>
            <p className="text-sm text-ink2">
              {t('classesPageDeleteWarningBody')}{' '}
              <strong className="text-bad">{t('classesPageDeleteWarningBold')}</strong>
            </p>
            {deleteMut.isError && (
              <p className="text-xs text-bad">
                {(deleteMut.error as Error)?.message || t('classesPageDeleteError')}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingClass(null)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition disabled:opacity-40"
              >
                {t('classesPageCancel')}
              </button>
              <button
                onClick={() => deleteMut.mutate(deletingClass.id)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg bg-bad text-white text-sm font-semibold hover:bg-bad/90 transition disabled:opacity-40"
              >
                {deleteMut.isPending ? t('classesPageDeleting') : t('classesPageDeleteClassButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
