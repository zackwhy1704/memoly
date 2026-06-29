'use client';

import { ContentReviewPanel } from '../components/ContentReviewPanel';

export function ReviewTab({ orgId, classId }: { orgId: string; classId: string }) {
  return <ContentReviewPanel orgId={orgId} classId={classId} />;
}
