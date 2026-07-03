# Auth: move the JWT off localStorage → httpOnly cookie (Path A: same-site subdomain)

**Goal:** stop storing the web JWT in `localStorage` (XSS-token-theft risk). Move it to an
`HttpOnly; Secure; SameSite=Lax` cookie the browser sends automatically.

**Why Path A (and not "just set a cookie"):** the web (`apalchi.com`) and API
(`pallybackend-production.up.railway.app`) are **cross-site**. A cross-site auth cookie must be
`SameSite=None` → a **third-party cookie**, which Safari ITP / Firefox TCP / Chrome block →
auth breaks. It also can't be read by the Next middleware (different domain). The fix is to make
the API **same-site** with the web by serving it from `api.apalchi.com`. Then the cookie is
`Domain=.apalchi.com; SameSite=Lax` — first-party, Safari-safe, and middleware-readable.

**Non-negotiable invariant:** the **mobile app** (Flutter) uses the SAME `/auth/*` endpoints and
reads the token from the response **body** + sends it as a `Bearer` header. Every change below is
**additive** — the body token and header auth must keep working, or mobile breaks for everyone.

---

## Step 1 — DNS  *(you)*
Add a CNAME for the API subdomain pointing at Railway's target:
```
api.apalchi.com  CNAME  <the target Railway shows in Custom Domains>
```

## Step 2 — Railway custom domain  *(you)*
Backend service → Settings → Networking → Custom Domain → add `api.apalchi.com`. Wait for TLS to
provision. Verify it serves the API:
```
curl -sS https://api.apalchi.com/api/v1/health   # or any known GET → expect the normal JSON
```
Do NOT proceed until `api.apalchi.com` serves the API over HTTPS.

## Step 3 — Backend  *(code — additive, config-gated; safe to ship before Step 4)*
Files: `SecurityConfig.java`, `JwtAuthenticationFilter.java`, `AuthController.java`.

1. **CORS with credentials** — `SecurityConfig.corsSource()` (currently `setAllowCredentials(false)`,
   comment "Auth is JWT-in-header"):
   - `config.setAllowCredentials(true);`
   - keep `setAllowedOriginPatterns(...)` (it supports credentials + patterns, unlike `"*"`); add
     `https://apalchi.com` and `https://www.apalchi.com` to `pally.cors.allowed-origins`
     (env `PALLY_CORS_ALLOWED_ORIGINS`).
2. **Set the cookie on auth** — in `/auth/login`, `/auth/google`, `/auth/register`
   (`AuthController`), add an `HttpServletResponse` param and, alongside the existing
   `ApiResponse.success(result)` (KEEP the body token), attach:
   ```
   Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Domain=<AUTH_COOKIE_DOMAIN>; Path=/; Max-Age=<jwt-ttl-seconds>
   ```
   **Gate it:** only set the cookie when a new config `auth.cookie.domain` (env `AUTH_COOKIE_DOMAIN`)
   is non-empty. Leave it UNSET when you first deploy → **zero behavior change**. Set it to
   `.apalchi.com` only after Step 1-2 are live. (A `.apalchi.com` cookie can only be set by a
   `*.apalchi.com` host — that's why the API must be on the subdomain first.)
3. **Read the cookie in the filter** — `JwtAuthenticationFilter`: if there is **no** `Authorization`
   header, fall back to the `auth_token` cookie. Header keeps precedence → mobile + legacy web
   unaffected. (Reading an absent cookie is a no-op, so this is safe to ship immediately.)
4. Tests: filter authenticates via cookie when header absent; header still wins when both present;
   a bearer-only (mobile-style) request still authenticates; cookie is only set when
   `auth.cookie.domain` is configured.

## Step 4 — Frontend  *(code — AFTER `api.apalchi.com` is live + Step 3 deployed)*
Files: `src/lib/api.ts`, `src/lib/auth.ts`, new `src/middleware.ts`, Vercel env.
1. `NEXT_PUBLIC_API_URL=https://api.apalchi.com/api/v1` (Vercel). Now web→API is **same-site**.
2. `apiFetch`: add `credentials: 'include'` so the cookie flows.
3. Stop storing the JWT in `localStorage`; keep only a non-sensitive UI flag (or a readable
   `logged_in` cookie) for gating. Rely on the httpOnly cookie for auth.
4. `middleware.ts`: redirect `/dashboard/:path*` + `/admin/:path*` to `/login` when the `auth_token`
   cookie is absent (now readable — it's `.apalchi.com`). Keep the client-side layout guard as a
   second layer.

## Step 5 — Rollout order (no breakage)
1. Steps 1-2 live.
2. Deploy Step 3 with `AUTH_COOKIE_DOMAIN` **unset** → nothing changes; verify mobile + web still log in.
3. Set `AUTH_COOKIE_DOMAIN=.apalchi.com` → logins now ALSO set the cookie; web still uses its
   localStorage bearer (frontend unchanged) → both paths work.
4. Deploy Step 4 (points at `api.apalchi.com`, `credentials:'include'`) but **keep** the localStorage
   bearer send as a belt initially. Confirm in prod: cookie present + sent; auth works.
5. Remove the localStorage bearer send + token storage → **XSS item closed**; middleware active.
6. Mobile: untouched throughout.

## Verification gates
- After 5.2: mobile login OK, web login OK (no change).
- After 5.3: DevTools → Application → Cookies shows `auth_token` **HttpOnly**, `Domain=.apalchi.com`;
  it is sent to `api.apalchi.com`; a request with the cookie but **no** `Authorization` header → 200.
- After 5.5: `localStorage.getItem('memoly_token')` is `null`; direct hit to `/dashboard` while
  unauthenticated → middleware redirect to `/login`.
- **Mobile regression check (every step):** a bearer-only request (no cookie) still authenticates.

## Rollback
Any step: unset `AUTH_COOKIE_DOMAIN` (stops setting the cookie) and revert `NEXT_PUBLIC_API_URL` to
the Railway host. Header/bearer auth is untouched throughout, so rollback is a config flip.
