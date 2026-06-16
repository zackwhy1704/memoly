'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type OrgClass } from '@/lib/api';
import { mochiFor } from '@/lib/centre-mochis';
import { useOrg } from '@/lib/org-context';
import ClassAvatar from '@/components/ClassAvatar';
import MochiAvatar from '@/components/MochiAvatar';
import { ClassCodeBox } from './components/ClassCodeBox';
import { RosterTab } from './tabs/RosterTab';
import { ModulesTab } from './tabs/ModulesTab';
import { HeatmapTab } from './tabs/HeatmapTab';
import { ConceptMasteryTab } from './tabs/ConceptMasteryTab';
import { ContentTab } from './tabs/ContentTab';
import { AssignmentsTab } from './tabs/AssignmentsTab';
import { ChallengesTab } from './tabs/ChallengesTab';
import { ReviewTab } from './tabs/ReviewTab';
import { ExamReadinessTab } from './tabs/ExamReadinessTab';
import { AddStudentsTab } from './tabs/AddStudentsTab';
import { ClassBriefTab } from './tabs/ClassBriefTab';

type Tab = 'roster' | 'modules' | 'heatmap' | 'concepts' | 'content' | 'assignments' | 'challenges' | 'review' | 'readiness' | 'brief' | 'add';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const org = useOrg();
  const classId = params.classId as string;
  const [tab, setTab] = useState<Tab>('roster');

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
          ← Back to classes
        </button>
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm text-bad">
          Class not found.
        </div>
      </div>
    );
  }

  const m = mochiFor(cls.characterType);

  return (
    <div className="max-w-5xl space-y-6">
      <button onClick={() => router.push('/dashboard/classes')} className="text-ink3 text-sm hover:text-ink transition">
        ← Back to classes
      </button>

      {/* Header */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex items-center gap-4">
        {cls.mochiConfig ? (
          <MochiAvatar config={cls.mochiConfig} size={64} animate={false} />
        ) : appearance ? (
          <ClassAvatar appearance={appearance} size={64} />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: (cls.accentColor ?? '#7042ED') + '22' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.image} alt={m.name} width={52} height={52} className="object-contain" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink truncate">{cls.brandName || cls.name}</h1>
          <p className="text-ink3 text-sm">
            {[cls.subject, cls.level].filter(Boolean).join(' · ') || 'No subject set'} · {cls.studentCount} students
          </p>
        </div>
        <ClassCodeBox code={cls.joinCode} />
      </div>

      {/* How students join — one code, self-serve in the app */}
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl leading-none">🎓</span>
        <p className="text-ink2 text-sm leading-relaxed">
          Share the <span className="font-semibold text-ink">join code</span> above. Students open the
          Apalchi app → Home → <span className="font-semibold text-ink">&ldquo;Got a class code?&rdquo;</span>{' '}
          and enter it. They join this class instantly and get its Mochi — no separate centre code needed.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {(['roster', 'modules', 'heatmap', 'concepts', 'content', 'assignments', 'challenges', 'review', 'readiness', 'brief', 'add'] as Tab[]).map((t) => {
          const label: Record<Tab, string> = {
            roster: 'Roster',
            modules: 'Modules',
            heatmap: 'Heatmap',
            concepts: 'Concept Mastery',
            content: 'Content',
            assignments: 'Assignments',
            challenges: 'Challenges',
            review: 'Review',
            readiness: 'Exam Readiness',
            brief: 'Class Brief',
            add: 'Add students',
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t ? 'border-accent text-ink' : 'border-transparent text-ink3 hover:text-ink2'
              }`}
            >
              {label[t]}
            </button>
          );
        })}
      </div>

      {tab === 'roster' && <RosterTab orgId={org.orgId} classId={classId} />}
      {tab === 'modules' && <ModulesTab orgId={org.orgId} classId={classId} />}
      {tab === 'heatmap' && <HeatmapTab orgId={org.orgId} classId={classId} />}
      {tab === 'concepts' && <ConceptMasteryTab orgId={org.orgId} classId={classId} />}
      {tab === 'content' && <ContentTab corpusAvatarId={cls.corpusAvatarId} classId={classId} />}
      {tab === 'assignments' && <AssignmentsTab orgId={org.orgId} classId={classId} />}
      {tab === 'challenges' && <ChallengesTab orgId={org.orgId} classId={classId} />}
      {tab === 'review' && <ReviewTab orgId={org.orgId} classId={classId} />}
      {tab === 'readiness' && <ExamReadinessTab orgId={org.orgId} classId={classId} />}
      {tab === 'brief' && <ClassBriefTab orgId={org.orgId} classId={classId} />}
      {tab === 'add' && <AddStudentsTab orgId={org.orgId} classId={classId} />}
    </div>
  );
}
