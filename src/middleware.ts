import { NextResponse, type NextRequest } from 'next/server';

/**
 * ⚠️ DO NOT MERGE / ENABLE until the auth-cookie cutover is verified in a browser.
 *
 * Edge auth guard for the END STATE of the JWT localStorage → httpOnly cookie
 * migration. It redirects /dashboard and /admin to /login when the `auth_token`
 * cookie is absent. That is ONLY safe once:
 *   1. Vercel `NEXT_PUBLIC_API_URL` points at https://api.apalchi.com/api/v1
 *      (so the cookie is same-site and actually gets sent), AND
 *   2. bridgeAuthCookie() (Providers) has had a chance to establish the cookie for
 *      existing bearer sessions — otherwise this bounces a legitimate session to
 *      /login (and, with the login page's auto-resolve, risks a redirect loop).
 *
 * Until both hold, this file must NOT be on main. It lives on the
 * feat/auth-cookie-frontend branch as the ready-to-apply final step.
 */
export function middleware(request: NextRequest) {
  // Flag-gated (default OFF): even if this reaches main early, it can't lock anyone
  // out until NEXT_PUBLIC_AUTH_COOKIE_MW=on is set in Vercel — same config-gated
  // rollout posture as the backend AUTH_COOKIE_DOMAIN.
  if (process.env.NEXT_PUBLIC_AUTH_COOKIE_MW !== 'on') {
    return NextResponse.next();
  }
  const hasAuthCookie = request.cookies.has('auth_token');
  if (!hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
