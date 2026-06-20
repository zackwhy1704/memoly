'use client';

import { useEffect, useRef } from 'react';

// Single source of truth for store URLs — set these env vars once the app
// listings are live. When unset, badges show "coming soon" instead of #.
// Android applicationId: com.apalchi.app (verified from android/app/build.gradle)
const IOS_STORE     = process.env.NEXT_PUBLIC_IOS_URL     || null;
const ANDROID_STORE = process.env.NEXT_PUBLIC_ANDROID_URL || null;
const APP_SCHEME    = 'apalchi://';

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

    const storeUrl = isIOS() ? IOS_STORE : isAndroid() ? ANDROID_STORE : null;
    if (!storeUrl) return; // listing not live yet — just show the page

    // Try the custom scheme deeplink. If the app is installed it opens immediately.
    // After 2 s (app not installed), fall through to the store listing.
    const fallbackTimer = setTimeout(() => {
      window.location.href = storeUrl;
    }, 2000);

    window.location.href = APP_SCHEME;

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
        background: 'linear-gradient(160deg, #FBF4EE 0%, #fff 60%)',
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

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#2A2118', marginBottom: 8 }}>
        Download Apalchi on the app!
      </h1>
      <p style={{ fontSize: 13, color: '#9C9078', marginBottom: 36 }}>
        Tap below — if you already have the app it will open automatically.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        <AppBadge href={IOS_STORE}     label="Download on the" store="App Store"   icon="🍎" />
        <AppBadge href={ANDROID_STORE} label="Get it on"       store="Google Play" icon="▶"  />
      </div>

      <p style={{ fontSize: 13, color: '#9C9078' }}>
        Are you a centre owner or teacher?{' '}
        <a href="/login" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
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
  href: string | null;
  label: string;
  store: string;
  icon: string;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    borderRadius: 14,
    minWidth: 160,
    textDecoration: 'none',
  };

  if (!href) {
    return (
      <span style={{ ...base, background: '#E8E1D4', color: '#9C9078', cursor: 'default', opacity: 0.7 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span>
          <span style={{ display: 'block', fontSize: 10, fontWeight: 400 }}>{label}</span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{store} — soon</span>
        </span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...base, background: '#2A2118', color: '#fff' }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span>
        <span style={{ display: 'block', fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 800 }}>{store}</span>
      </span>
    </a>
  );
}
