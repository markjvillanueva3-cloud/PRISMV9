---
name: reference_oscar_sfc_frontend_scope_2026_06_18
description: "SFC front-end scope (phase 2): the SFC web UI already EXISTS (4 routed pages, 2 of them speed-feed) — phase 2 is gap-analysis + completion, NOT greenfield"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.704Z
aliases: reference_oscar_sfc_frontend_scope_2026_06_18
---


Phase-2 scoping for the operator goal "move to front end tasks for sfc so we can focus on web app/phone app testing" (2026-06-18, slot:oscar, read-only scope — no build this session). The SFC front-end is **NOT greenfield** — a substantial surface already exists in `mcp-server/web`:

**Routed SFC pages (from `web/src/App.tsx`):**
- `/calculator` → `CalculatorPage.tsx`
- `/what-if` → `WhatIfPage.tsx`
- `/speed-feed-calc` → `SfcCalculatorPage.tsx`
- `/speed-feed` → `SpeedFeedPage.tsx`  ← **two distinct speed-feed pages are both routed** (consolidation/clarity question for app testing — which is THE canonical product SFC calculator?)

**Supporting SFC frontend assets:** hooks `useSfc.ts` + `useSpeedFeed.ts`; `components/sfc/` (`AdvancedCharts.tsx`, `comparison-types.ts`); `types/sfc.ts`; utils `sfcReport.ts`, `calculatorSpeedFeedContract.ts`, `calculatorSurfaceFinish.ts`, `calculatorPrismMode.ts`; `data/calculatorWorkspace.ts`. Frontend is a pure consumer of `prism_*` via the HTTP bridge (port 3100). There is a `route-contract-sfc-speedfeed.test.ts` (graph node) guarding the route contract.

**PHASE-2 WORK (next session, agents available — NOT done this session):**
1. **Gap-analysis, not greenfield** — enumerate the 4 SFC pages' actual state (live-data-wired? stubbed? duplicated?) before building. Quebec owns frontend generally; the operator goal authorizes oscar to do SFC-frontend work (backend-builder gate is advisory).
2. **Resolve the page duplication** (refined analysis 2026-06-18). Sizes + hooks:
   - `/calculator` → **CalculatorPage.tsx — 13,725 lines = THE comprehensive product calculator** (rich `components/calculator/*`: ProgramWorkbench, SetupPreview3D, BackendAiReview, SectionPurchaseModal). **Canonical product surface.**
   - `/speed-feed` → SpeedFeedPage.tsx (882 L, hook `useSpeedFeed`) — standalone speed-feed page.
   - `/speed-feed-calc` → SfcCalculatorPage.tsx (390 L, hook `useSfc`) — second, smaller standalone speed-feed page.
   - `/what-if` → WhatIfPage.tsx (502 L).
   **Two parallel speed-feed surfaces with two parallel hooks (`useSpeedFeed` vs `useSfc`)** — an app-tester hitting `/speed-feed` AND `/speed-feed-calc` AND `/calculator` is confused about which is THE calculator. Consolidation decision (canonical = CalculatorPage? deprecate/merge the two standalones? unify the hooks?) is a frontend-architecture call best made WITH quebec (frontend owner) + per-file scrutiny — not a solo autonomous edit. This is the #1 phase-2 build item.
   **Reachability (grep 2026-06-18, must-verify):** `/calculator` is nav-linked from LessonView + PostProcessorPage(x3) = confirmed canonical/well-integrated; `/speed-feed-calc` reachable via ONE cross-link (SurfaceCrossLink); `/speed-feed` (SpeedFeedPage) = **CONFIRMED ORPHAN** (verified 2026-06-18): NO `to=`, NO `href=`, NO `navigate('/speed-feed')` anywhere (non-test/non-api) -> unreachable by users -> SAFE DEPRECATION candidate. The CalculatorPage cross-link + comment resolve the roles: `/calculator` = "the full Studio" (canonical), `/speed-feed-calc` (SfcCalculatorPage) = "focused Codex SFC" (intentionally cross-linked from the Studio). So phase-2 consolidation = **deprecate the orphan SpeedFeedPage + its `useSpeedFeed` hook; keep CalculatorPage (full) + SfcCalculatorPage (focused)** — NOT 3 confusing dupes. (Still verify no external/bookmarked deep-link before deleting; surface this to quebec.)
3. **Surface the new backend accuracy signal** — the SFC frontend should show the uncertainty/advisory the backend now produces (over-speed flags on heat-sensitive ISO S, vendor-divergence) so the calculator never publishes a speed-feed without uncertainty (oscar soul). This ties phase-2 UI to the phase-1 accuracy work ([[reference_oscar_sfc_divergence_direction_2026_06_18]]).
4. Build with the per-file 2-arm scrutiny + 3-of-3 (UI/React `reviewer` weighting) — agent-gated.

Why read-only this session: subagents were rate-limited (reset 12:40pm CT 2026-06-18) so a scrutinized frontend build wasn't possible, and the 5h session ceiling was near. Phase-1 accuracy units shipped this session: [[reference_oscar_sfc_closed_loop_cpu_skip_2026_06_18]] · [[reference_oscar_sfc_divergence_direction_2026_06_18]].
