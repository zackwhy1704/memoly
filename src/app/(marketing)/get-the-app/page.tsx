'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

export default function GetTheAppPage() {
  const router = useRouter();

  useEffect(() => {
    // If not logged in, redirect to the home/login page
    if (!getToken()) router.replace('/login');
  }, [router]);

  return (
    <div
      data-mkt="1"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(160deg, #f4f0ff 0%, #fff 60%)',
        fontFamily: 'Nunito, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      {/* Mochi */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mochi-base-transparent.png"
        alt="Mochi"
        style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 24 }}
      />

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
        Take Mochi with you
      </h1>
      <p style={{ fontSize: 15, color: '#6B618A', maxWidth: 380, lineHeight: 1.6, marginBottom: 36 }}>
        Apalchi lives on your phone. Download the app to start learning with your own notes.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}>
        <AppBadge
          href="https://apps.apple.com/app/apalchi"
          label="Download on the"
          store="App Store"
          icon="🍎"
        />
        <AppBadge
          href="https://play.google.com/store/apps/details?id=com.apalchi"
          label="Get it on"
          store="Google Play"
          icon="▶"
        />
      </div>

      <p style={{ fontSize: 13, color: '#A8A0BD' }}>
        Already have the app?{' '}
        <a href="/login" style={{ color: '#7042ED', fontWeight: 700 }}>
          Sign in
        </a>{' '}
        on a different device.
      </p>
    </div>
  );
}

function AppBadge({
  href,
  label,
  store,
  icon,
}: {
  href: string;
  label: string;
  store: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: '#1F1733',
        color: '#fff',
        borderRadius: 14,
        textDecoration: 'none',
        minWidth: 160,
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span>
        <span style={{ display: 'block', fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 800 }}>{store}</span>
      </span>
    </a>
  );
}
