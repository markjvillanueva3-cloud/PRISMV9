---
name: reference_oscar_sfc_ui_uncertainty_surfacing_2026_06_21
description: "SFC web UI now surfaces the orchestrator's previously-dropped uncertainty/advisory signal (slot:oscar, 2026-06-21). Reusable deriveAdvisory() + UncertaintyAdvisoryBanner; condition_warning + recommendations[] were silently dropped by the frontend type/render before this. USE these, don't rebuild."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.713Z
aliases: reference_oscar_sfc_ui_uncertainty_surfacing_2026_06_21
---


**SFC UI uncertainty surfacing shipped (slot:oscar, 2026-06-21).** U-SFC-UI-UNCERTAINTY (c5fac24e43) + P2 hardening (26d5adbb36) on cad-fusion-live-ms0. Frontend sub-unit (b) of [[reference_oscar_sfc_frontend_build_plan_2026_06_18]].

## The gap (found via an Explore map of backend output vs UI render points)
`SpeedFeedOrchestratorEngine.compute()` (prism_calc:sf_orchestrate, the production web engine) ALWAYS emits overall_confidence, uncertainty.* (incl. the conditional `condition_warning` = thin-wall / high-temp edge signal), safety_checks[], limiting_factors[], playbook_warnings[], recommendations[]. The SFC frontend DROPPED:
- `uncertainty.condition_warning` -- NO field on the frontend `OrchestratorResult` type (web/src/types/speedfeed.ts) -> never reached any UI (the safety-critical drop).
- `recommendations[]` -- in the type but rendered on NO page.
- `speed/feed/life/force/ra_cv_pct` -- not in the frontend type at all.
So a speed/feed could be shown with no surfaced uncertainty (violates oscar soul: never publish without uncertainty).

## What shipped (reusable, ADDITIVE -- changes NO computed number)
- `web/src/types/speedfeed.ts`: added the dropped optional uncertainty fields (condition_warning + 5 *_cv_pct).
- `web/src/components/sfc/deriveAdvisory.ts`: PURE framework-free summarizer -> SfcAdvisory {level, confidencePct, confidenceBand, headline, conditionWarning, failedSafetyChecks, critical/warningFactors, playbookWarnings, recommendations}. Level precedence critical > warning > caution > ok; unknown/NaN confidence is never 'ok'; defensive vs null/partial/empty. 14/14 R9 tests. **USE THIS for any SFC advisory display -- do not rebuild.**
- `web/src/components/sfc/UncertaintyAdvisoryBanner.tsx`: thin presentation, reuses the shared `Badge` (../ui), role=status + aria-label. 5/5 RTL DOM tests. Wired ABOVE the Results card in SpeedFeedPage.tsx.
- 3-of-3 scrutiny PASS (arms A/B/C). Test infra note: web vitest is configured (jsdom + RTL), tests live in `mcp-server/web/src/__tests__/`, run `npx vitest run` from `mcp-server/web` (no `test` script in package.json).

## STILL OPEN (follow-ons)
- Render per-metric CV% (the 5 *_cv_pct are typed but not displayed).
- `SfcCalculatorPage` (the focused page) -> `ResultsDisplay.tsx` shows ONLY a safety score + numerics; it calls the THIN `/api/v1/speed-feed` route (useSfcCalculate), NOT `/orchestrate`, so the entire orchestrator uncertainty signal is dropped there. Surfacing it needs a route switch or a thin-route uncertainty field (bigger, a behavior change -- not unilateral).
- Deploy: the SpeedFeedPage advisory is in source; the live app reflects it on the next Vite build/serve (separate from the :3100 MCP bridge restart that the turning fix needs).
