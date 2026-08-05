import { describe, it, expect } from 'vitest';
import { resolvePostLoginDest } from '@/lib/post-login';
import type { MeResponse } from '@/lib/api';

function me(partial: Partial<MeResponse['data']>): MeResponse {
  return {
    data: {
      userId: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      setupComplete: true,
      role: 'USER',
      isCentreStaff: false,
      isOwner: false,
      accountStatus: 'ACTIVE',
      defaultAnswerMode: 'DEFAULT',
      preferredLocale: 'en',
      ...partial,
    },
  };
}

describe('resolvePostLoginDest', () => {
  it('routes centre staff to /dashboard', () => {
    expect(resolvePostLoginDest(me({ isCentreStaff: true }))).toBe('/dashboard');
  });

  it('routes ADMIN to /admin (admin takes precedence over staff)', () => {
    expect(resolvePostLoginDest(me({ role: 'ADMIN', isCentreStaff: true }))).toBe('/admin');
  });

  it('routes a plain consumer to /account by default (account hub, never a download/upgrade wall)', () => {
    expect(resolvePostLoginDest(me({ role: 'USER', isCentreStaff: false }))).toBe('/account');
  });

  it('honours a safe returnTo under /account/', () => {
    expect(resolvePostLoginDest(me({ role: 'ADMIN' }), '/account/billing')).toBe('/account/billing');
  });

  it('honours a safe returnTo under /accept-invite/', () => {
    expect(resolvePostLoginDest(me({}), '/accept-invite/abc123')).toBe('/accept-invite/abc123');
  });

  it('rejects an unsafe internal returnTo and falls back to role routing', () => {
    expect(resolvePostLoginDest(me({ role: 'ADMIN' }), '/dashboard')).toBe('/admin');
  });

  it('rejects an external returnTo and falls back to role routing', () => {
    expect(resolvePostLoginDest(me({ isCentreStaff: true }), 'https://evil.example.com/account/')).toBe('/dashboard');
  });

  it('falls back to /dashboard when me is null (lookup failed)', () => {
    expect(resolvePostLoginDest(null)).toBe('/dashboard');
  });

  it('still honours a safe returnTo even when me is null', () => {
    expect(resolvePostLoginDest(null, '/account/billing')).toBe('/account/billing');
  });

  it('treats a missing returnTo (null) as no redirect', () => {
    expect(resolvePostLoginDest(me({ isCentreStaff: false }), null)).toBe('/account');
  });
});
