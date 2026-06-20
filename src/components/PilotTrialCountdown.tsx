'use client';

interface PilotTrialCountdownProps {
  endsAt: string | null | undefined;
  kind: 'pilot' | 'trial';
}

export default function PilotTrialCountdown({ endsAt, kind }: PilotTrialCountdownProps) {
  if (!endsAt) return null;

  const msLeft = new Date(endsAt).getTime() - Date.now();
  if (msLeft <= 0) return null;

  const daysLeft = Math.ceil(msLeft / 86_400_000);

  let message: string;
  if (daysLeft === 1) {
    message = kind === 'pilot' ? 'Your pilot ends tomorrow' : 'Your free trial ends tomorrow';
  } else if (daysLeft <= 3) {
    message = kind === 'pilot'
      ? `${daysLeft} days left in your pilot — ending soon`
      : `${daysLeft} days left in your free trial — ending soon`;
  } else {
    message = kind === 'pilot'
      ? `${daysLeft} days left in your 30-day pilot`
      : `${daysLeft} days left in your free trial`;
  }

  const ctaHref = kind === 'pilot' ? '/demo' : '/account/billing';
  const ctaText = kind === 'pilot' ? 'Talk to us about going live →' : 'Upgrade to keep access →';

  const isUrgent = daysLeft <= 3;
  const bg     = isUrgent ? '#FFF0E0' : '#FFF3CD';
  const border = isUrgent ? '#FF9A3C' : '#FFB81A';

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 700, color: '#2A2118', fontSize: 14 }}>
        {isUrgent ? '⚠️' : '🚀'} {message}
      </span>
      <a
        href={ctaHref}
        style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', textDecoration: 'none' }}
      >
        {ctaText}
      </a>
    </div>
  );
}
