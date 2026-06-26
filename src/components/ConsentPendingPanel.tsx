'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, type ConsentPendingInfo } from '@/lib/api';

type ResendState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; maskedEmail: string }
  | { kind: 'cooldown'; seconds: number }
  | { kind: 'error' };

/** "12 sec" / "2 min" friendly countdown label. */
function waitLabel(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.ceil(seconds / 60);
    return `${mins} min`;
  }
  return `${Math.max(0, seconds)} sec`;
}

/**
 * Pulls a "wait N seconds" hint out of a 429 resend message
 * (e.g. "Please wait 45s before resending..."). Returns null when absent so the
 * caller falls back to a generic disabled state — never a silent no-op.
 */
function secondsFrom429(message: string): number | null {
  const m = message.match(/(\d+)\s*(?:s|sec|second)/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * The single, reusable "waiting for your parent — resend" panel. Rendered
 * centrally whenever an ApiError carries `consentPending` (any gated request).
 * Takes the masked email from the ORIGINAL error payload; the resend button
 * issues a fresh approval token server-side. All resend states are visible:
 * success, cooldown (disabled + countdown), and failure.
 */
export default function ConsentPendingPanel({
  info,
  onDismiss,
}: {
  info: ConsentPendingInfo;
  /** Optional close affordance when hosted in a modal/overlay. */
  onDismiss?: () => void;
}) {
  const initialCooldown =
    !info.resendAvailable && info.resendAvailableInSeconds > 0
      ? info.resendAvailableInSeconds
      : 0;

  const [state, setState] = useState<ResendState>(
    initialCooldown > 0
      ? { kind: 'cooldown', seconds: initialCooldown }
      : { kind: 'idle' }
  );

  // Countdown timer — only runs while in cooldown. The functional updater inside
  // the interval callback (not a synchronous setState in the effect body) drives
  // the label down each second and flips back to 'idle' at zero.
  const inCooldown = state.kind === 'cooldown';
  useEffect(() => {
    if (!inCooldown) return;
    const timer = setInterval(() => {
      setState((s) =>
        s.kind === 'cooldown'
          ? s.seconds <= 1
            ? { kind: 'idle' }
            : { kind: 'cooldown', seconds: s.seconds - 1 }
          : s
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [inCooldown]);

  const masked = info.parentEmailMasked || 'their email';

  async function handleResend() {
    if (state.kind === 'sending' || state.kind === 'cooldown') return;
    setState({ kind: 'sending' });
    try {
      const res = await api.resendParentConsent();
      setState({
        kind: 'success',
        maskedEmail: res.parentEmailMasked || info.parentEmailMasked || masked,
      });
    } catch (err) {
      // 429 = cooldown. Read seconds from the message, else disable generically.
      if (err instanceof ApiError && err.status === 429) {
        const secs = secondsFrom429(err.userMessage) ?? 60;
        setState({ kind: 'cooldown', seconds: secs });
        return;
      }
      setState({ kind: 'error' });
    }
  }

  const buttonDisabled = state.kind === 'sending' || state.kind === 'cooldown';

  return (
    <div
      role="alert"
      className="bg-panel border border-line rounded-2xl px-5 py-5 text-sm text-ink flex flex-col gap-3 max-w-md"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 text-xl leading-none mt-0.5">🔒</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink">Waiting for your parent</p>
          <p className="text-ink2 mt-1">
            Your account is waiting for your parent to approve it. Ask them to
            check their email at{' '}
            <span className="font-semibold text-ink break-all">{masked}</span>{' '}
            and tap the approval link.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-ink3 hover:text-ink2 transition-colors text-xs leading-none mt-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleResend}
          disabled={buttonDisabled}
          className="self-start px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.kind === 'sending' ? 'Sending…' : 'Resend email'}
        </button>

        {/* Visible resend states — never a silent no-op. */}
        {state.kind === 'success' && (
          <p className="text-ok text-xs">
            ✓ Approval email re-sent to {state.maskedEmail} — check inbox/spam.
          </p>
        )}
        {state.kind === 'cooldown' && (
          <p className="text-ink3 text-xs">
            You can resend in {waitLabel(state.seconds)}.
          </p>
        )}
        {state.kind === 'error' && (
          <p className="text-bad text-xs">Couldn&apos;t resend — try again shortly.</p>
        )}
      </div>
    </div>
  );
}
