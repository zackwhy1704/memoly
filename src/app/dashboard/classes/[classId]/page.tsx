'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SECTIONS,
  SUBTAB_LABEL_KEY,
  DEFAULT_TAB,
  isTab,
  sectionOf,
  type Tab,
} from './sections';
import { useTranslation } from '@/lib/messages';
import { TourOverlay } from './TourOverlay';
import { firstRunLandingTab } from './tourSteps';
import { isTourSeen, markTourSeen } from './tourStorage';
import { api, type OrgClass } from '@/lib/api';
import { mochiFor } from '@/lib/centre-mochis';
import { useOrg } from '@/lib/org-context';
import ClassAvatar from '@/components/ClassAvatar';
import MochiAvatar from '@/components/MochiAvatar';
import { ClassCodeBox } from './components/ClassCodeBox';
import EditClassModal from '../modals/EditClassModal';
import { RosterTab } from './tabs/RosterTab';
import { HeatmapTab } from './tabs/HeatmapTab';
import { ConceptMasteryTab } from './tabs/ConceptMasteryTab';
import { SubmissionsTab } from './tabs/SubmissionsTab';
import { ChallengesTab } from './tabs/ChallengesTab';
import { ExamReadinessTab } from './tabs/ExamReadinessTab';
import { AddStudentsTab } from './tabs/AddStudentsTab';
import { ClassBriefTab } from './tabs/ClassBriefTab';
import { ReportTab } from './tabs/ReportTab';
import TabErrorBoundary from '@/components/TabErrorBoundary';
import { TeachFlow } from './teach/TeachFlow';

export default function ClassDetailPage() {
  const { t, tp } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const org = useOrg();
  const qc = useQueryClient();
  const classId = params.classId as string;
  const [tab, setTab] = useState<Tab>(DEFAULT_TAB);
  const [showTour, setShowTour] = useState(false);
  const tourInitRef = useRef(false);
  const hasExplicitTabRef = useRef(false);

  // Restore ?tab= on load (shareable/bookmarkable deep links; old bookmarks use
  // the same 13 keys) and keep the URL in sync on select — via history so it
  // doesn't pull useSearchParams (and its Suspense requirement) into the page.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (isTab(t)) {
      hasExplicitTabRef.current = true; // a deep link — don't override its landing
      setTab(t);
    }
  }, []);

  const selectTab = useCallback((t: Tab) => {
    setTab(t);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', t);
      window.history.replaceState(null, '', url.toString());
    }
  }, []);
  const [editingClass, setEditingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => api.deleteClass(org!.orgId, classId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', org!.orgId] });
      router.replace('/dashboard/classes');
    },
  });

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes', org?.orgId],
    queryFn: () => api.classes(org!.orgId),
    enabled: !!org,
  });

  const cls: OrgClass | undefined = classesData?.data.find((c) => c.id === classId);

  // Fetch the class's CENTRE_CLASS avatar DTO so the uniform comes from the server.
  const { data: avatarData } = useQuery({
    queryKey: ['avatar', cls?.corpusAvatarId],
    queryFn: () => api.avatar(cls!.corpusAvatarId!),
    enabled: !!cls?.corpusAvatarId,
  });
  const appearance = avatarData?.data.appearance;

  // Brain empty-state: detect zero wiki pages so we can show an action banner.
  const { data: wikiPagesData, isLoading: wikiPagesLoading } = useQuery({
    queryKey: ['wikiPages', cls?.corpusAvatarId],
    queryFn: () => api.wikiPages(cls!.corpusAvatarId!),
    enabled: !!cls?.corpusAvatarId,
  });
  const brainIsEmpty = !wikiPagesLoading && wikiPagesData !== undefined && (wikiPagesData.data?.length ?? 0) === 0;

  // First-run feature tour: once, after data settles, for a teacher who hasn't
  // seen it. First-run landing: an empty brain (and no deep-linked ?tab=) starts
  // on Teach ▸ Brain so the tour's opening action lands on the real uploader.
  const brainSettled = !cls?.corpusAvatarId || !wikiPagesLoading;
  useEffect(() => {
    if (tourInitRef.current) return;
    if (isLoading || !cls || !brainSettled) return; // wait for class + brain state
    tourInitRef.current = true;
    const seen = isTourSeen();
    const landing = firstRunLandingTab({
      brainIsEmpty,
      hasExplicitTab: hasExplicitTabRef.current,
      tourSeen: seen,
    });
    if (landing) setTab(landing);
    if (!seen) setShowTour(true);
  }, [isLoading, cls, brainSettled, brainIsEmpty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <span className="text-3xl animate-bounce">🏫</span>
      </div>
    );
  }

  if (!cls || !org) {
    return (
      <div className="max-w-3xl space-y-4">
        <button onClick={() => router.push('/dashboard/classes')} className="text-ink3 text-sm hover:text-ink">
          {t('classDetailBackToClasses')}
        </button>
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
          {t('classDetailNotFound')}
        </div>
      </div>
    );
  }

  const m = mochiFor(cls.characterType);

  return (
    <div className="max-w-5xl space-y-6">
      <button onClick={() => router.push('/dashboard/classes')} className="text-ink3 text-sm hover:text-ink transition">
        {t('classDetailBackToClasses')}
      </button>

      {/* Header */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex items-center gap-4">
        {cls.mochiConfig ? (
          <MochiAvatar config={cls.mochiConfig} size={64} animate={false} />
        ) : appearance ? (
          <ClassAvatar appearance={appearance} size={64} />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-accent/10">
            {/* Kept as <img>: m.image is a per-module dynamic/remote thumbnail URL
                (no fixed host to allowlist for next/image). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.image} alt={m.name} width={52} height={52} className="object-contain" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink truncate">{cls.name}</h1>
            <button
              onClick={() => setEditingClass(true)}
              className="text-ink3 hover:text-ink transition shrink-0 text-sm leading-none"
              title={t('classDetailEditClass')}
            >
              ✏️
            </button>
            <button
              onClick={() => setDeletingClass(true)}
              className="text-ink3 hover:text-bad transition shrink-0 text-sm leading-none"
              title={t('classDetailDeleteClass')}
            >
              🗑
            </button>
          </div>
          <p className="text-ink3 text-sm">
            {[cls.subject, cls.level].filter(Boolean).join(' · ') || t('classesPageNoSubjectSet')} · {tp.classesPageStudentCount(cls.studentCount)}
          </p>
        </div>
        <ClassCodeBox code={cls.joinCode} />
      </div>

      {/* How students join — one code, self-serve in the app */}
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl leading-none">🎓</span>
        <p className="text-ink2 text-sm leading-relaxed">
          {t('classDetailJoinInstructionsPrefix')}<span className="font-semibold text-ink">{t('classDetailJoinCodeBold')}</span>{t('classDetailJoinInstructionsMid')}<span className="font-semibold text-ink">{t('classDetailGotClassCodeBold')}</span>{t('classDetailJoinInstructionsSuffix')}
        </p>
      </div>

      {/* Section nav — job-based: Teach · Mark · Insights · Students */}
      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {SECTIONS.map((s) => {
          const active = sectionOf(tab) === s.key;
          return (
            <button
              key={s.key}
              data-tour={`nav-${s.key}`}
              onClick={() => selectTab(s.subtabs[0])}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                active ? 'border-accent text-ink' : 'border-transparent text-ink3 hover:text-ink2'
              }`}
            >
              {t(s.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Sub-nav — the views within the active section (hidden when only one) */}
      {(() => {
        const section = SECTIONS.find((s) => s.key === sectionOf(tab));
        // TEACH is a guided flow (its own stepper), not a sub-nav of pills.
        if (!section || section.subtabs.length <= 1 || section.key === 'teach') return null;
        return (
          <div className="flex gap-1.5 flex-wrap">
            {section.subtabs.map((subtab) => (
              <button
                key={subtab}
                data-tour={`subtab-${subtab}`}
                onClick={() => selectTab(subtab)}
                className={`px-3 py-1.5 text-sm rounded-full transition ${
                  tab === subtab
                    ? 'bg-accent text-white'
                    : 'bg-panel2 text-ink3 hover:text-ink2'
                }`}
              >
                {t(SUBTAB_LABEL_KEY[subtab])}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Empty brain banner — only after loading settles, never while loading */}
      {cls.corpusAvatarId && brainIsEmpty && tab !== 'content' && (
        <button
          onClick={() => selectTab('content')}
          className="w-full text-left px-4 py-3 rounded-xl bg-warn/10 border border-warn/30 text-sm text-warn font-medium hover:bg-warn/15 transition"
        >
          {t('classDetailEmptyBrainBannerPrefix')}{' '}
          <span className="underline">{t('classDetailOpenBrain')}</span>
        </button>
      )}

      <TabErrorBoundary resetKey={sectionOf(tab) === 'teach' ? 'teach' : tab}>
        {/* TEACH: the guided flow unifies Brain + Modules + Assignments + Review. */}
        {sectionOf(tab) === 'teach' && (
          <TeachFlow corpusAvatarId={cls.corpusAvatarId} classId={classId} orgId={org.orgId} />
        )}
        {tab === 'roster' && <RosterTab orgId={org.orgId} classId={classId} />}
        {tab === 'heatmap' && <HeatmapTab orgId={org.orgId} classId={classId} />}
        {tab === 'concepts' && <ConceptMasteryTab orgId={org.orgId} classId={classId} />}
        {tab === 'submissions' && <SubmissionsTab orgId={org.orgId} classId={classId} subject={cls.subject} />}
        {tab === 'challenges' && <ChallengesTab orgId={org.orgId} classId={classId} />}
        {tab === 'readiness' && <ExamReadinessTab orgId={org.orgId} classId={classId} />}
        {tab === 'brief' && <ClassBriefTab orgId={org.orgId} classId={classId} />}
        {tab === 'report' && <ReportTab orgId={org.orgId} classId={classId} />}
        {tab === 'add' && <AddStudentsTab orgId={org.orgId} classId={classId} />}
      </TabErrorBoundary>

      {editingClass && (
        <EditClassModal
          orgId={org.orgId}
          cls={cls}
          onClose={() => setEditingClass(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['classes', org.orgId] });
            setEditingClass(false);
          }}
        />
      )}

      {deletingClass && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !deleteMut.isPending && setDeletingClass(false)}
        >
          <div
            className="bg-panel border border-line rounded-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-ink">{tp.classesPageDeleteConfirmHeading(cls.name)}</h2>
            <p className="text-sm text-ink2">
              {t('classDetailDeleteWarningBody')}{' '}
              <strong className="text-bad">{t('classesPageDeleteWarningBold')}</strong>
            </p>
            {deleteMut.isError && (
              <p className="text-xs text-bad">{t('classesPageDeleteError')}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingClass(false)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg border border-line text-ink2 text-sm hover:bg-panel2 transition disabled:opacity-40"
              >
                {t('classesPageCancel')}
              </button>
              <button
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg bg-bad text-white text-sm font-semibold hover:bg-bad/90 transition disabled:opacity-40"
              >
                {deleteMut.isPending ? t('classesPageDeleting') : t('classesPageDeleteClassButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-run feature tour — never over a modal (2.1). */}
      {showTour && !editingClass && !deletingClass && (
        <TourOverlay
          onNavigate={selectTab}
          onClose={() => {
            markTourSeen();
            setShowTour(false);
          }}
        />
      )}
    </div>
  );
}
