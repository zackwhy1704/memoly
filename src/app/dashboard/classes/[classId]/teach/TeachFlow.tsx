'use client';

import { useState } from 'react';
import MochiUploader from '@/components/MochiUploader';
import { ModulesTab } from '../tabs/ModulesTab';
import { AssignmentsTab } from '../tabs/AssignmentsTab';
import { TeachStepper, type StepNo } from './TeachStepper';
import { BuildStatusView } from './BuildStatusView';
import { TrainingTipsPanel } from './TrainingTipsPanel';
import { useBuildStatus } from './useBuildStatus';
import { useTranslation } from '@/lib/messages';

/**
 * The guided Teach flow: Add material → Mochi builds (REAL status) → Preview & assign.
 * The active step is DERIVED from real brain state (compiling/ready) so it can't lie;
 * the stepper lets the teacher move back to add more. Reuses the existing uploader,
 * modules list, and assignments components — this is orchestration, not a rebuild.
 */
export function TeachFlow({
  corpusAvatarId,
  classId,
  orgId,
}: {
  corpusAvatarId: string | null;
  classId: string;
  orgId: string;
}) {
  const { t } = useTranslation();
  const { status, refetch } = useBuildStatus(corpusAvatarId);
  const [manualStep, setManualStep] = useState<StepNo | null>(null);

  if (!corpusAvatarId) {
    return (
      <div className="bg-panel border border-line rounded-2xl p-6 text-sm text-ink2">
        {t('teachFlowNoAvatar')}
      </div>
    );
  }

  const derived: StepNo =
    status.phase === 'ready' ? 3 : status.phase === 'compiling' || status.phase === 'timeout' ? 2 : 1;
  const step: StepNo = manualStep ?? derived;

  return (
    <div className="space-y-5">
      <TeachStepper current={step} onNavigate={setManualStep} />

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-ink2">
            {t('teachFlowAddMaterialHint')}
          </p>
          <TrainingTipsPanel />
          <MochiUploader
            avatarId={corpusAvatarId}
            classId={classId}
            onComplete={() => {
              // Let the derived step take over (→ building → ready) from real state.
              setManualStep(null);
              refetch();
            }}
          />
        </div>
      )}

      {step === 2 && (
        <BuildStatusView
          status={status}
          onPreview={() => setManualStep(3)}
          onRetry={refetch}
          onReview={() => setManualStep(1)}
        />
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">{t('teachFlowPreviewAssignHeading')}</h3>
              <p className="text-sm text-ink3">
                {t('teachFlowPreviewAssignSubtitle')}
              </p>
            </div>
            <button
              onClick={() => setManualStep(1)}
              className="px-3 py-1.5 rounded-lg border border-line text-sm font-medium text-ink2 hover:bg-panel2 transition whitespace-nowrap"
            >
              {t('teachFlowAddMoreMaterial')}
            </button>
          </div>

          <ModulesTab orgId={orgId} classId={classId} corpusAvatarId={corpusAvatarId} />

          <div className="border-t border-line pt-6">
            <h4 className="text-sm font-semibold text-ink mb-3">{t('teachFlowAssignHeading')}</h4>
            <AssignmentsTab orgId={orgId} classId={classId} />
          </div>
        </div>
      )}
    </div>
  );
}
