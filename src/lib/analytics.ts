import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (typeof window === 'undefined' || initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
  });
  initialized = true;
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, props);
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(name, props);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}
