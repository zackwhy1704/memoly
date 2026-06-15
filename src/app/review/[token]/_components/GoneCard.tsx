import { MessageCard } from './MessageCard';

export function GoneCard({ status }: { status: string }) {
  const s = (status ?? '').toUpperCase();
  let emoji = '🔗';
  let title = 'This review link is no longer active.';
  let body = 'Ask the student to send a fresh link if you still need to review it.';

  if (s === 'EXPIRED') {
    emoji = '⏳';
    title = 'This link has expired';
    body = 'Ask them to send a fresh one.';
  } else if (s === 'APPROVED' || s === 'FLAGGED' || s === 'REVIEWED') {
    emoji = '✅';
    title = 'This guide has already been reviewed';
    body = 'Thank you!';
  } else if (s === 'REVOKED') {
    emoji = '🔗';
    title = 'This review link is no longer active.';
    body = 'Ask the student to send a fresh link if you still need to review it.';
  }

  return <MessageCard emoji={emoji} title={title} body={body} />;
}
