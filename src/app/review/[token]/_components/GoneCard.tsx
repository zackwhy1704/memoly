import { MessageCard } from './MessageCard';
import { useTranslation } from '@/lib/messages';

export function GoneCard({ status }: { status: string }) {
  const { t } = useTranslation();
  const s = (status ?? '').toUpperCase();
  let emoji = '🔗';
  let title = t('goneCardDefaultTitle');
  let body = t('goneCardDefaultBody');

  if (s === 'EXPIRED') {
    emoji = '⏳';
    title = t('goneCardExpiredTitle');
    body = t('goneCardExpiredBody');
  } else if (s === 'APPROVED' || s === 'FLAGGED' || s === 'REVIEWED') {
    emoji = '✅';
    title = t('goneCardReviewedTitle');
    body = t('goneCardReviewedBody');
  } else if (s === 'REVOKED') {
    emoji = '🔗';
    title = t('goneCardDefaultTitle');
    body = t('goneCardDefaultBody');
  }

  return <MessageCard emoji={emoji} title={title} body={body} />;
}
