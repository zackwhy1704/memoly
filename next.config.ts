import type { NextConfig } from "next";

// Fail a misconfigured PRODUCTION build loudly instead of silently shipping the
// mock-mode auth bypass (getToken() → 'mock-token', every api.* call → fake data).
if (
  process.env.NEXT_PUBLIC_USE_MOCK === "true" &&
  process.env.NODE_ENV === "production"
) {
  throw new Error(
    "NEXT_PUBLIC_USE_MOCK must never be 'true' in a production build — it bypasses auth and serves mock data.",
  );
}

// Fail a production build loudly when the Google client id is missing instead of
// silently self-hiding the Google sign-in button (google.ts defaults it to '' →
// Providers.tsx just warns to the console → the button vanishes). That silent
// self-hide already cost one debugging session; a required var must announce its
// absence at build time, not disappear a login path in the field. (The frontend var
// is SEPARATE from the backend auth.google.client-ids — both must be set.)
if (
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
) {
  throw new Error(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID must be set for a production build — without it the " +
      "Google sign-in button silently disappears. Set it on Vercel (same OAuth web client " +
      "as the backend auth.google.client-ids).",
  );
}

const BACKEND = "https://pallybackend-production.up.railway.app";
const POSTHOG = "https://us.i.posthog.com https://us-assets.i.posthog.com";

// Content-Security-Policy. connect-src is the key mitigation for a stolen token
// (localStorage JWT): even under XSS it can only be POSTed to our own hosts, not
// an attacker's. script-src keeps 'unsafe-inline'/'unsafe-eval' for Next runtime
// compatibility (widen-then-narrow); the framing/sniff/transport headers below
// carry the rest.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${POSTHOG}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${BACKEND} ${POSTHOG}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Remote hosts allowed for next/image optimisation. randomuser.me is the
    // placeholder testimonial avatars on the marketing homepage.
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
