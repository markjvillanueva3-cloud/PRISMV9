---
title: Orphan frontend pages are often old hardcoded-data prototypes, not ready features
type: lesson
domain: frontend-app
slot: quebec
date: 2026-06-25
tags: [orphan-pages, R12, fake-data, build-and-route, frontend-wiring, R7-duplication]
---

# Orphan frontend pages are often old prototypes -- verify before "build & route"

## Context
Operator directive "build & route the orphan pages" (pages that exist in `web/src/pages/` but are
NOT routed in `App.tsx`). The intuitive read is "ready features that just need a route." The scout
of 8 orphans (slot:quebec, 2026-06-25) proved that intuition WRONG for 7 of 8.

## The finding (R12)
Most orphan pages are **old prototypes**, recognizable by:
- **Hardcoded literal data seeded via `useState`** (e.g. `MillTurnPage`: `useState([{ id:'$1',
  program:'O1001', status:'running' ... }])`) -- fake machine/job state with NO backend call.
- **Old inline styling** (`style={{ fontFamily:'system-ui' }}`, raw hex) that predates and does
  NOT match the current design system (Tailwind tokens + `DESIGN.md`).
- **Dead API endpoints** -- they POST to paths that were never mounted (e.g. `/api/dispatch/business`,
  `/api/dispatch/cam`, `/api/prism` -- none exist; the real route is `/api/v1/business/dispatch`).
- **Duplication** of an already-routed flow (R7) -- e.g. two `LathePrintToProgram*` pages duplicating
  the routed `LatheUpload/Wizard/Results` lathe surface.

## Why "just route them" is wrong
**Routing a hardcoded-data prototype RE-INTRODUCES the fake-data-shown-as-real anti-pattern.** The same
session had just removed exactly that from `MachineDataAuditPage` (Math.random fallback) and
`ShopDashboardPage` (MOCK seed + random tick). Routing the prototypes would have undone that R12 work.

## The decision rule
Before "build & route" an orphan, classify it:
1. **Well-built but dead-wired** (real data-states, design-system, real backend EXISTS but wrong
   path/auth) -> CLEAN BUILD: repoint to the canonical API client (fixes path + auth token + envelope
   unwrap in ONE change), allowlist its read actions, add the route. (e.g. `LatheERPDashboard` ->
   `callBusinessAction`+`unwrapBusiness`, +5 allowlist entries, `secure(lead)` route. 12/12 + 23/23.)
2. **Hardcoded-data prototype** (fake literals, old styling, no backend) -> NOT a wire; it's a real
   per-feature backend PROJECT (machine-telemetry / cad-regen / studio), usually CROSS-DOMAIN. Surface
   the scope; do not route as-is.
3. **Duplicate of a routed flow** (R7) -> drop/dedupe, do not route (a confusing duplicate surface).

## The clean-build pattern (case 1)
A dead-wired-but-well-built page is fixed by **reusing the canonical client, not reinventing fetch**
(R8/R11): one repoint of its `defaultDispatch` to the shared `callBusinessAction`+`unwrapBusiness`
simultaneously fixes the stale path, adds the missing auth token, and normalizes the
`{success,data}`-or-bare dispatcher envelope so each consumer gets its plain payload.

## Related
- Session memory: `reference_quebec_fe_be_wiring_state_2026_06_25`
- Doctrine: [[feedback_frontend_ui_owned_by_desktop_claude_2026_06_25]] (Claude Design owns UI; quebec
  owns data/API wiring), R12 (fail loud / no fabrication), R7 (surface conflicts/dupes), R16 (assess
  fit before building).
