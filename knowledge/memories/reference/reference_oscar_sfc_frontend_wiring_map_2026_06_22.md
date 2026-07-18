---
name: reference_oscar_sfc_frontend_wiring_map_2026_06_22
description: "SFC FRONTEND wiring map (slot:oscar 2026-06-22, Explore recon). 3 SFC pages / 3 DIFFERENT backend paths: CalculatorPage(/calculator, linked) + SpeedFeedPage(/speed-feed, ORPHANED) both hit sf_orchestrate; SfcCalculatorPage(/speed-feed-calc, linked, focused) hits sfc_calculate (prism_product, a 3rd engine path) with NO uncertainty. R7 CORRECTION of the build plan: the ORPHAN SpeedFeedPage is the RICHEST page (full uncertainty UI) -- do NOT deprecate it; LINK it or port its uncertainty into the focused page. SfcCalculatorPage violates oscar-soul (publishes speed/feed with no uncertainty)."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.705Z
aliases: reference_oscar_sfc_frontend_wiring_map_2026_06_22
---


**SFC frontend wiring map + corrected phase-1 plan (slot:oscar 2026-06-22).** Supersedes the "deprecate the orphan" assumption in [[reference_oscar_sfc_frontend_build_plan_2026_06_18]] -- the orphan is the BEST page (R7 surface-don't-average).

## 3 SFC pages, 3 backend paths (web/src, file:line from Explore recon)
| Page | Route | Linked? | Hook -> api -> endpoint -> dispatcher action | Engine | Uncertainty UI? |
|---|---|---|---|---|---|
| **SpeedFeedPage.tsx** (~895L) | /speed-feed | **ORPHAN** (no nav/Link/navigate) | useSpeedFeedOrchestrate -> speedFeedApi.orchestrate -> POST /api/v1/speed-feed/orchestrate -> routes/speedfeed.ts:14 -> prism_calc **sf_orchestrate** | SpeedFeedOrchestratorEngine | **YES -- FULL** (force_ci95/life_ci95/ra_ci95, confidence, stability, safety_checks, playbook_warnings, limiting_factors, weibull, sobol; lines 657-829) |
| **CalculatorPage.tsx** (~13kL monolith) | /calculator | linked (SurfaceCrossLink) | sfOrchestrate() -> /api/v1/speed-feed/orchestrate -> prism_calc **sf_orchestrate** | SpeedFeedOrchestratorEngine | NO (predates uncertainty UI) |
| **SfcCalculatorPage.tsx** (~405L focused) | /speed-feed-calc | linked | useSfcCalculate -> sfcApi.calculate -> POST /api/v1/sfc/calculate -> routes/sfc.ts:23 -> **prism_product sfc_calculate** | separate SFC stack (3rd path!) | **NO** |

## Key findings
1. **R7 CONFLICT (build-plan correction):** the build plan said "deprecate orphan SpeedFeedPage". WRONG -- it is the RICHEST, most-complete SFC UI (the only page with full uncertainty). Correct move: **LINK it** (add nav) OR **port its uncertainty display into the focused SfcCalculatorPage**. Do NOT deprecate.
2. **CORRECTED (R12, 2026-06-22) -- NOT an oscar-soul violation.** An earlier draft here claimed SfcCalculatorPage "publishes speed/feed with ZERO uncertainty". FALSE -- verified by reading the delegated component: it renders results via `ResultsDisplay.tsx` which ALREADY shows the S(x) **safety block** (score/status/factors, lines 62-125) sourced from `result.safety` (backend `routes/sfc.ts:28` returns `{result, safety: result?.safety}`; `useApiCall` returns `res.result` carrying `.safety`). So the focused page DOES surface a safety/accuracy signal. The real (gated) gap is only the RICHER STATISTICAL uncertainty (CI95/confidence/weibull) that `sf_orchestrate` produces but `prism_product sfc_calculate` does not -> needs the D2 canonical-engine decision, NOT a blind UI add. (The "Uncertainty UI? NO" cells in the table above mean no CI95/statistical-uncertainty; safety/S(x) IS shown.)
3. **THREE engine paths now confirmed:** sf_orchestrate (SpeedFeedOrchestratorEngine), ultimate_speed_feed (UltimateSpeedFeedEngine -- backend convergence target), AND sfc_calculate (prism_product, powering the focused page). The two-engine divergence ([[reference_oscar_sfc_two_engine_divergence_2026_06_21]]) is actually a THREE-path story on the frontend.
4. **Port (verified):** backend MCP HTTP server listens on `PORT || 3000` (index.ts:1435); vite proxy /api -> localhost:3000 (PRISM_API_PORT default 3000, vite.config.ts) -> MATCH by default, NO bug. BUT fleet hooks + docs expect the bridge on :3100 (mcp-bridge-enforce probes :3100); if PORT=3100 in prod, the dev proxy (->3000) would miss. NEEDS quebec runtime verification (frontend-app infra, not oscar).

## Corrected phase-1 sequence (logical order)
1. **Verify which page is the product's canonical SFC UI** (operator/quebec) -- /calculator (monolith, no uncertainty), /speed-feed-calc (focused, no uncertainty, 3rd engine), or /speed-feed (orphan, full uncertainty). This decides whether to link the orphan or enrich the focused page.
2. **Surface uncertainty on the linked user-facing page** (oscar-soul) -- either (a) link SpeedFeedPage, or (b) port the UncertaintyAdvisoryBanner + CI95/confidence/limiting_factors block into SfcCalculatorPage (needs SfcCalculatorPage on a sf_orchestrate-shaped result, OR sfc_calculate to return uncertainty -- backend check first).
3. **Runtime end-to-end verify** against the live :3100/:3000 bridge (quebec coord).
4. Resolve the 3-path proliferation (which engine is canonical -- ties into U-SFC-CONVERGE-P2).

DEPENDENCY: the canonical-page + canonical-engine decisions are coupled to the operator-gated convergence (U-SFC-CONVERGE-P2). Frontend uncertainty-surfacing can proceed independently on whichever page is chosen.
