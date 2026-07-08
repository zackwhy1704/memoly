'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const TOKEN_KEY = 'memoly_token';
const USER_ID_KEY = 'memoly_user_id';
const LAST_EMAIL_KEY = 'memoly_last_email';

export function saveAuth(token: string, userId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  // intentionally keep LAST_EMAIL_KEY so the login form can pre-fill on next visit
}

export function saveLastEmail(email: string) {
  localStorage.setItem(LAST_EMAIL_KEY, email);
}

export function getLastEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(LAST_EMAIL_KEY) ?? '';
}

/** Clear session and hard-navigate to /login. Safe to call from any context. */
export function logout(): void {
  clearAuth();
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

/** The signed-in user's id (persisted at login), for client-scoped per-user
 *  keys like the feature-tour seen-flag. Null when logged out / SSR. */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function getToken(): string | null {
  // In mock mode the dashboard runs with no backend; hand the auth gate a
  // dummy token so it doesn't bounce to /login. The token is never sent —
  // every api.* call is short-circuited to mock data.
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') return 'mock-token';
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Redirect to /login if no token. Returns true once auth is confirmed. */
export function useAuthGuard(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  return ready;
}
