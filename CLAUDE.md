# Apalchi Web (Centre Dashboard) — Claude Code Rules

> Rules file. Read fully before changing code.
> Product: **Apalchi** — the B2B centre dashboard where tuition centres create classes, upload content,
> customise their class **Mochi**, assign work, and view analytics. Backend is the Apalchi Spring Boot
> API on Railway. Mascot: **Mochi**.

> ⚠️ This is a recent Next.js — APIs, conventions, and file structure may differ from training data.
> When unsure about a Next.js API, check `node_modules/next/dist/docs/` and heed deprecation notices.

## Stack
- Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
- Deploys to **Vercel** → talks to the Railway backend. Production site is **apalchi.com**.

## MANDATORY WORKFLOW (every change)
1. `npm run build` — must pass.
2. Lint clean.
3. Verify behaviour on the DEPLOYED Vercel preview, not just localhost (localhost is dev only; sign-off
   happens on the deployed URL).

## ARCHITECTURE — MANDATORY
**No god-pages.** A route `page.tsx` is a thin shell that composes components. Every tab, modal, and panel
lives in its OWN file:
```
classes/[classId]/
  page.tsx          # thin shell: header + tab nav + <XxxTab/> — keep < ~300 lines
  tabs/             # one file per tab
  modals/           # one file per modal
  components/        # shared leaf components (badges, cells)
```
A page file over ~300 lines MUST be split. (The class-detail page was once 2163 lines / 28 components —
never again.)

**Shared types live in `src/lib/api.ts`** (or a typed module). Never duplicate a type across files.

**One reusable component per repeated UI concern** — empty states, badges, avatar rendering. Never
re-implement the same empty/no-data/loading block inline in multiple places.

**Avatar rendering goes through the single `MochiAvatar` component** (CSS-filter recolour of the base PNG
+ code-generated SVG overlays for accessories/aura). Never fork or reinvent its rendering logic. The
overlay coordinate system is calibrated to the base art — don't hand-tweak per-call.

**Data fetching stays in the tab/component that owns it (or a hook).** Keep fetching out of leaf
presentational components.

## PROD / ENV
- API base = explicit `NEXT_PUBLIC_API_URL` pointing at the Railway prod backend. `review-api.ts` MUST use
  the same base (never default to an empty/relative path — that only works on localhost).
- Static asset changes (e.g. the Mochi base PNG) → bump the filename so the CDN can't serve a stale copy.
  After deploy, verify the deployed asset is byte-identical to the repo.
- If prod looks wrong but localhost is fine, suspect a stale Vercel bundle/asset: confirm the deployed
  commit SHA matches HEAD and do a clean redeploy before assuming a code bug.

## TESTING
- The web is the thinnest-tested repo — every new component/util gets at least a render or logic test.

## DON'T
- god-page (>300 lines) · duplicated type defs · inline-duplicated empty/loading states · forking
  `MochiAvatar` · relying on localhost for sign-off · committing without a deployed-preview check ·
  letting `review-api.ts` default to a relative base.

## API CALL UX CONTRACT (mandatory on every button that fires a network call)
Three phases every mutation button must implement:
1. **LOADING** — `disabled={mutation.isPending}`; show an inline spinner (not just text colour change).
2. **SUCCESS** — `queryClient.invalidateQueries(...)` for affected queries.
3. **ERROR** — display error inline for primary actions; `toast` is acceptable only for secondary/
   background actions where context is not lost on dismiss.

**Timeouts** — `apiFetch` has a default **30 s** `AbortController` timeout (override via `timeoutMs`).
File uploads get **3 minutes**. Never call `fetch` without an `AbortController` signal.

**Concurrent mutations** — one in-flight mutation per resource. Use `disabled={mutation.isPending}` on
every trigger button; add per-item pending state when a list has per-row actions.

## DON'T (additions)
- `fetch` without `AbortController` signal · toast-only error for a primary action · mutation trigger
  with no `disabled={mutation.isPending}` · concurrent PATCH/POST on the same resource.

## Common commands
```
npm run dev        # local dev (against NEXT_PUBLIC_API_URL)
npm run build      # production build (must pass before done)
npm run lint
```

## Hard-won lessons (enforce these)
- **Keep the zero-`any` discipline.** No `any` / `as any` / `<any>`. Type at the boundary.
- **One module = one domain.** Don't let `api.ts` (or any file) become the whole API surface — split by
  domain under `src/lib/api/*` re-exported from an index that preserves the public import surface.
- **State-changing links need a HUMAN click.** Never auto-fire a mutating POST on page load — email
  pre-fetchers / link scanners consume one-time tokens (the parental-approve token bug). Require an explicit
  Approve button; fire the POST on click.
- **CONSISTENCY over cleverness.** The recurring root cause across these repos is a good pattern applied in
  one place but not its siblings. Fix a pattern → grep all siblings → add a guard.
