'use client';

import { useEffect, useRef } from 'react';

const APP_SCHEME  = 'apalchi://';
const IOS_STORE   = 'https://apps.apple.com/app/apalchi';
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.apalchi';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

export default function GetTheAppPage() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const isMobile = isIOS() || isAndroid();
    if (!isMobile) return;

    // Try the custom scheme deeplink. If the app is installed it opens immediately.
    // After 2 s (app not installed / no response), fall through to the store.
    const fallbackTimer = setTimeout(() => {
      if (isIOS()) window.location.href = IOS_STORE;
      else if (isAndroid()) window.location.href = ANDROID_STORE;
    }, 2000);

    window.location.href = APP_SCHEME;

    // If the page blurs the app opened — cancel the store redirect.
    const cancel = () => clearTimeout(fallbackTimer);
    window.addEventListener('blur', cancel, { once: true });
    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('blur', cancel);
    };
  }, []);

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mochi-base-transparent.png"
        alt="Mochi"
        style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 24 }}
      />

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
        Apalchi for students is on the app
      </h1>
      <p style={{ fontSize: 15, color: '#6B618A', maxWidth: 400, lineHeight: 1.6, marginBottom: 8 }}>
        This website is for <strong style={{ color: '#1F1733' }}>centres and teachers</strong>.
        If you&apos;re a student, please sign in through the Apalchi mobile app.
      </p>
      <p style={{ fontSize: 13, color: '#A8A0BD', marginBottom: 36 }}>
        Tap below — if you already have the app it will open automatically.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        <AppBadge href={IOS_STORE} label="Download on the" store="App Store" icon="🍎" />
        <AppBadge href={ANDROID_STORE} label="Get it on" store="Google Play" icon="▶" />
      </div>

      <p style={{ fontSize: 13, color: '#A8A0BD' }}>
        Are you a centre owner or teacher?{' '}
        <a href="/login" style={{ color: '#7042ED', fontWeight: 700 }}>
          Sign in here
        </a>
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
