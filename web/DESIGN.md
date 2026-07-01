# PRISM web — Design Doctrine

> Companion to `web/src/lib/motion.ts` (U-V3-MOTION-TOKENS) and the existing
> `prism-glow-*` / `prism-led-sweep` / `prism-chip` / `prism-spectrum-fill`
> class system in `web/src/index.css`. This file is **doctrine, not API
> reference** — it tells you which token to pick, not what the token is.
>
> Authoritative spec: `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md`
> §6 + §9.5 + §9.6. Recall via [[ui-ux-ai-mutations-flag-gated]] +
> [[feedback_frontend_codex]] before mutating any visual surface.

## Visual identity

PRISM dark theme. Glow borders. LED sweep spectrum effects. Status chips with
color coding. Tab-based layouts where appropriate. Source-of-truth pattern is
**Calculator Studio** (`web/src/pages/CalculatorPage.tsx` — also the largest
page in the codebase at 12,856 LOC per U-F5 measurement). Match its tokens:

- `prism-glow-*` (`cyan`, `violet`, `emerald`, `amber`, `red`) for colored
  glows on focusable / state-bearing elements
- `prism-chip` for status badges
- `prism-spectrum-fill` for progress bars
- `prism-led-sweep` for animated highlight effects
- Dark background: `bg-[rgba(2,6,23,0.78)]`
- Subtle border: `border-white/10` or `rgba(148,163,184,0.08)`

## Motion

Use `motionStyle("<token>")` from `web/src/lib/motion.ts`. Do NOT hand-pick
duration/easing pairs. The current token table (subject to growth, NOT
modification — change a value only if the existing animation in `index.css`
is being deprecated):

- **Interaction (200ms standard)** — `button-hover`, `focus-ring`, `tooltip`
- **Layout (480ms decel-in / accel-out)** — `modal-open` / `modal-close`,
  `drawer-open` / `drawer-close`, `panel-collapse`, `page-fade`
- **Ambient (1.6s..4.8s ease-in-out infinite)** — `led-pulse`, `heartbeat`,
  `machine-loop-slow`. Always wrap in a `prefersReducedMotion()` gate; the
  ambient loops are the most accessibility-sensitive class.

When introducing a NEW pattern that doesn't match an existing token, add the
token to `motion.ts` in the same PR (don't inline the literal duration in
the new component).

## State coverage

Per U-V1 audit (`STATE-COVERAGE-AUDIT.md`), 98.2% of pages currently miss at
least one of the three branches below. NEW work must cover all three:

1. **loading** — `isLoading` / `isPending` / `isFetching` from react-query or
   equivalent, rendered as `<Shimmer />` / `<Skeleton />` / `<Spinner />`
2. **errored** — `isError` / `hasError`, rendered as `<ErrorState />` inside a
   `<WorkspaceErrorBoundary>` (already wired in `App.tsx` at the route layer
   — page-internal errors need their own boundary)
3. **empty** — `data && data.length === 0` rendered as `<EmptyState />` with
   actionable copy (NOT just "No data")

A page that ships without all three is a doctrine violation. The U-V1 audit
report surfaces gaps; closing them is per-page operator-gated work.

## AI-proposed visual mutations

Behind a feature flag, default OFF, operator activates after review. Full
doctrine at [[ui-ux-ai-mutations-flag-gated]]. Short version: `VITE_FEATURE_*`
env var + `localStorage.getItem('prism.feature.<name>')` runtime override;
both code paths ship; default branch ships flag off so live experience is
unchanged until the operator opts in.

## Codex-built pages

Do NOT build over Codex frontend pages — analyze and improve. Full doctrine
at [[feedback_frontend_codex]]. The `pre-frontend-page-create-audit` blocking
hook enforces this; if your work would overlap an existing page by >50% the
hook will refuse the Write.

## Page size

Per U-F5 + U-B1 audits, 9 pages are over 1000 LOC and 3 of those are over
2400 LOC. Page-level lazy is already 100% (119 of 121 routes use
`lazyElement`, the 2 exceptions are `<div />` wildcard + `<Layout />` wrapper).
Intra-page tab-level dynamic-import is the next axis; operator-gated per page.

Soft target: pages stay under 1500 LOC. Pages that exceed it require an
intra-page split plan in the PR description naming the seams (which tabs /
sections / wizard-steps to lazy-load).

## Accessibility (shop-floor profile)

PRISM ships to shop-floor tablets — gloves, glare, oblique angles, sometimes
direct sunlight. Stricter than ordinary web a11y:

- Color contrast: APCA Lc ≥ 75 (not WCAG 2.1 AA's 4.5:1 — APCA is the 2026+
  successor and the right target for our dark-theme on tablets)
- Tap targets: minimum 44×44px
- Don't gate primary actions on hover (gloves can't hover-precise)
- Don't rely on color alone for state (red/green colorblindness ≈ 8% of male
  operators; pair color with an icon and a label)

Recommended audit tooling: `@axe-core/playwright` (U-F8, deferred) for
automated WCAG/APCA assertion via existing Playwright MCP harness.

## When in doubt

Open Calculator Studio in dev (`http://localhost:3100/calculator`), find the
existing pattern, copy it. The token system is downstream of what Calculator
Studio already does well — when this doc and Calculator Studio disagree,
Calculator Studio wins.

## Provenance

- Created 2026-05-26 by slot quebec /goal-loop iter3 as the doctrine
  companion to U-V3-MOTION-TOKENS (`web/src/lib/motion.ts`).
- Closes the §9.5 + §6 doctrine half of FRONTEND-PLAN-EXTENSION's U-V3 unit.
- The U-F3-TAB-LEVEL-DYNAMIC-IMPORTS / U-F6-LIGHTHOUSE-CI-GATE / U-INSTALL-*
  units remain operator-gated per `feedback_backend_before_frontend`.
