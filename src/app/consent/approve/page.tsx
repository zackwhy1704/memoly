'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type View =
  | { state: 'loading' }
  | { state: 'success' }
  | { state: 'already_used' }
  | { state: 'expired' }
  | { state: 'invalid' }
  | { state: 'error'; message: string };

function ConsentApproveBody() {
  const params = useSearchParams();
  const token = params.get('token');
  const [view, setView] = useState<View>({ state: 'loading' });

  useEffect(() => {
    if (!token) {
      setView({ state: 'invalid' });
      return;
    }

    apiFetch<{ data: { status: string } }>(
      `/consent/approve?token=${encodeURIComponent(token)}`,
      { method: 'POST', skipAuth: true }
    )
      .then(() => setView({ state: 'success' }))
      .catch((err) => {
        const msg: string = err?.message ?? '';
        if (msg.includes('already been used')) {
          setView({ state: 'already_used' });
        } else if (msg.includes('expired')) {
          setView({ state: 'expired' });
        } else if (err?.status === 404) {
          setView({ state: 'invalid' });
        } else {
          setView({ state: 'error', message: msg || 'An unexpected error occurred.' });
        }
      });
  }, [token]);

  function retry() {
    if (!token) return;
    setView({ state: 'loading' });
    apiFetch<unknown>(
      `/consent/approve?token=${encodeURIComponent(token)}`,
      { method: 'POST', skipAuth: true }
    )
      .then(() => setView({ state: 'success' }))
      .catch((err) =>
        setView({ state: 'error', message: err?.message ?? 'Please try again.' })
      );
  }

  return (
    <>
      {view.state === 'loading' && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <span className="w-8 h-8 border-4 border-[#7042ED] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6B618A] text-sm">Processing consent…</p>
        </div>
      )}

      {view.state === 'success' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">Consent granted!</h2>
          <p className="text-[#6B618A] text-sm">
            Your child&apos;s account is now active. They can open Apalchi and start
            studying right away.
          </p>
        </div>
      )}

      {view.state === 'already_used' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">✔️</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">Already approved</h2>
          <p className="text-[#6B618A] text-sm">
            This consent link has already been used. Your child&apos;s account should
            already be active.
          </p>
        </div>
      )}

      {view.state === 'expired' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">⏰</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">Link expired</h2>
          <p className="text-[#6B618A] text-sm">
            This consent link expired after 7 days. Ask your child to open Apalchi
            and request a new link.
          </p>
        </div>
      )}

      {view.state === 'invalid' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">Link not found</h2>
          <p className="text-[#6B618A] text-sm">
            We couldn&apos;t find this consent link. Double-check the link, or ask your
            child to send you a new one.
          </p>
        </div>
      )}

      {view.state === 'error' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">Something went wrong</h2>
          <p className="text-[#6B618A] text-sm">{view.message}</p>
          <button
            onClick={retry}
            className="mt-4 px-6 py-2 bg-[#7042ED] text-white text-sm font-bold rounded-lg hover:bg-[#8F66FA] transition"
          >
            Try again
          </button>
        </div>
      )}
    </>
  );
}

export default function ConsentApprovePage() {
  return (
    <main className="min-h-screen bg-[#FAFAFF] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-6">📚</div>
        <h1 className="text-2xl font-extrabold text-[#1F1733] mb-2">Apalchi</h1>
        <Suspense
          fallback={
            <div className="mt-8 flex flex-col items-center gap-4">
              <span className="w-8 h-8 border-4 border-[#7042ED] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#6B618A] text-sm">Loading…</p>
            </div>
          }
        >
          <ConsentApproveBody />
        </Suspense>
      </div>
    </main>
  );
}
