---
name: reference_oscar_sfc_focused_page_contract_mismatch_2026_06_18
description: "R12 finding (slot:oscar 2026-06-18): the FOCUSED SFC web page /speed-feed-calc has a frontend<->backend field-name contract mismatch -> renders dash for every result. Canonical Studio /calculator is unaffected. Blocked on web toolchain + bridge for a verified fix."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.702Z
aliases: reference_oscar_sfc_focused_page_contract_mismatch_2026_06_18
---


**Found while executing the SFC frontend build (phase 1b: add an uncertainty advisory).** Before adding UI I audited what the page renders + the data contract, and found a deeper P1 bug.

## The bug (CONFIRMED static; NOT live-verified)
The focused SFC page `/speed-feed-calc` (`web/src/pages/SfcCalculatorPage.tsx`) reads result fields that the backend never returns:

- **Backend** `/api/v1/sfc/calculate` -> `prism_product:sfc_calculate` -> `ProductEngine.sfcCalculate` (`mcp-server/src/engines/ProductEngine.ts:582`, result built `:714-739`) returns `SFCResult` with **verbose keys**: `cutting_speed_m_min`, `spindle_rpm`, `table_feed_mm_min`, `feed_per_tooth_mm`, `cutting_force_N`, `power_kW`, flat `safety_score` / `safety_status` / `safety_warnings`, `uncertainty` (4 ranges), `sustainability`, `tier`. **No `meta`, no nested `safety` object.**
- **Frontend** reads **short keys**: `ResultsDisplay.tsx` -> `result.cutting_speed`, `result.feed_rate`, `result.feed_per_tooth`, `result.spindle_speed`, `result.safety.{score,status,factors}`; `SfcCalculatorPage.tsx:207-208` -> `result.spindle_speed`, `result.meta.power_kw`. Type `web/src/types/sfc.ts:15-22 SfcCalculateResult` declares only the short keys + `safety:{score,status,factors}` + `meta`.
- **No mapper anywhere**: `web/src/api/sfc.ts` `post()` returns `res.json()` raw; `useSfc.ts` `useApiCall` sets `data = res.result`; `routes/sfc.ts:17-20` just rewraps `{result, safety:result?.safety, meta:result?.meta}`. So every short key resolves `undefined` -> `fmt(undefined)` -> `"—"` (dash). The page shows dash for all 4 primary results, no safety badge, and the machine-selector validation gets `requiredRpm=0` / `requiredPowerKw=0`.

## Blast radius (IMPORTANT)
- **Isolated to the FOCUSED page** `/speed-feed-calc`. The **canonical full Studio** `/calculator` (`CalculatorPage.tsx`) does NOT use `useSfc`/`sfcApi`; its panels fetch their own endpoints (e.g. `/api/v1/turning/calculate`) and read **verbose keys** (`cutting_speed_m_min`, `spindle_rpm`, `feed_per_tooth_mm`) -> consistent with the backend convention -> unaffected by this mismatch (not full end-to-end verified, but convention-consistent).
- So this is **P1 (a secondary/duplicate page is broken)**, not P0 (the main SFC surface is down). There are/were THREE SFC pages: SpeedFeedPage (deprecated this session, [[reference_oscar_sfc_frontend_scope_2026_06_18]]), SfcCalculatorPage (focused, THIS bug), CalculatorPage (canonical, works).

## Why not fixed this session (R12 fail-loud)
- **No web toolchain in the oscar worktree** — `vitest`, `vite`, `tsc`, `tsx`, `react`, `jsdom` are ABSENT from `mcp-server/node_modules` (only `@testing-library/*` present); worktrees run lean. A full `npm install` is ~470MB, **no package-lock.json** (registry version-drift risk), minutes-long. So a frontend fix cannot be built/tested here.
- **The :3000/:3100 bridge is DOWN this session** -> cannot capture the live `POST /api/v1/sfc/calculate` JSON to confirm the exact wrap (single `{result:SFCResult}` vs flat) before fixing. Blind-fixing the wrong wrap level could double-map. R8: do not change blind.

## Fix direction (R7 surface-don't-average) for the next session / quebec
Prefer aligning the **focused-page frontend to the verbose backend keys** (match the EXISTING WORKING Studio convention) over inventing a new mapping:
1. `web/src/types/sfc.ts` `SfcCalculateResult` -> verbose keys + `safety_warnings: string[]` + `uncertainty: {cutting_speed_range,force_range,tool_life_range,surface_roughness_range}`.
2. `web/src/components/sfc/ResultsDisplay.tsx` -> read `spindle_rpm` / `cutting_speed_m_min` / `table_feed_mm_min` / `feed_per_tooth_mm`, flat `safety_score`/`safety_status`; THEN add the phase-1b uncertainty advisory (ranges + `safety_warnings` + low-confidence note) -- the data already exists in the response.
3. `web/src/pages/SfcCalculatorPage.tsx:207-208` -> `result.spindle_rpm` + `result.power_kW`.
4. **Add the missing real contract test** (the existing `src/__tests__/route-contract-sfc-speedfeed.test.ts` is MISNAMED -- it tests engine fns + route->action string maps, NOT the HTTP JSON shape). New vitest component test: feed `ResultsDisplay` the real `SFCResult` shape -> assert it renders values (currently would render dash -> proves bug + the fix). Needs the toolchain.

ALTERNATIVE (if focused page is deemed redundant given the canonical Studio): deprecate `/speed-feed-calc` like SpeedFeedPage was. But it IS routed + cross-linked from the Studio, so that is an operator/quebec call, not unilateral.

## Status of the SFC frontend goal (operator: "finish the SFC frontend page")
- **1a DONE + shipped** (`fd582dd22a`): unrouted the orphan SpeedFeedPage (2-arm PASS).
- **1c**: transport wiring VERIFIED (page->hook->api->vite proxy :3100->backend :3000 `app.use("/api/v1/sfc", createSfcRouter)` -> 7 routes -> dispatcher). But the CONTRACT (this memory) is broken on the focused page. Canonical ports = web :3100 / backend :3000 (vite `PRISM_API_PORT||3000`); old "bridge on :3100" phrasing conflated the web-server port with the backend port.
- **1b (uncertainty advisory) BLOCKED** behind this contract fix (no point on a dash page) + toolchain.

Link: [[reference_oscar_sfc_frontend_build_plan_2026_06_18]] · [[reference_oscar_sfc_frontend_scope_2026_06_18]] · [[reference_oscar_sfc_divergence_direction_2026_06_18]]
