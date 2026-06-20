// Single source of truth for the Google OAuth web client ID.
//
// `NEXT_PUBLIC_*` vars are inlined at BUILD time, so this is read once at
// module load. When it's empty the Google sign-in button must be hidden
// everywhere (login + signup) so an unconfigured deploy never renders
// Google's raw "Missing required parameter: client_id" 400 page.
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/** True only when a non-empty web client ID was provided at build time. */
export const isGoogleEnabled = GOOGLE_CLIENT_ID.length > 0;
