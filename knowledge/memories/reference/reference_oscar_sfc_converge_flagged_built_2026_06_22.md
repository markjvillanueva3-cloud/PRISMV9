---
name: reference_oscar_sfc_converge_flagged_built_2026_06_22
description: "BUILT (slot:oscar 2026-06-22, operator 'build everything'): SFC convergence P2 is now implemented FLAG-GATED behind PRISM_SFC_CONVERGE (DEFAULT OFF -- production unchanged). ecb2c583da. SpeedFeedOrchestratorEngine.compute() delegates its 7 core-physics outputs to UltimateSpeedFeedEngine when the flag is set, keeping all resolved/advisory layers. Flag-off byte-identical (full 284-test SFC suite green). Plus re-mine cron installer (243da34546) + frontend nav-link to the uncertainty page (4e3ed0af70). Operator flips PRISM_SFC_CONVERGE=1 to enable AFTER reviewing SFC-CONVERGENCE-DIFF.md."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.699Z
aliases: reference_oscar_sfc_converge_flagged_built_2026_06_22
---


**SFC remaining-work BUILD (slot:oscar 2026-06-22, operator directive "build everything we need", Ultracode).** 3 tracks built via parallel sonnet agents, verified + committed by the opus main loop. Builds on [[reference_oscar_sfc_proven_activated_2026_06_22]] + [[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]].

## Track 1 -- U-SFC-CONVERGE-P2-FLAGGED (ecb2c583da) -- the keystone
`SpeedFeedOrchestratorEngine.compute()` now OPTIONALLY delegates its 7 core-physics outputs
(Vc, fz, Vf, Fc, power, torque, tool_life, Ra) to `UltimateSpeedFeedEngine.calculate(orchestratorToUltimateInput(resolvedInput))`
when `PRISM_SFC_CONVERGE === '1'`, keeping ALL orchestrator-resolved context + advisory layers
(resolved_*, limiting_factors, safety_checks, alternatives, stability) -- the NineAxisOrchestrator
delegate-then-layer pattern.
- **DEFAULT OFF -> production unchanged.** All new code is inside `if (process.env.PRISM_SFC_CONVERGE === '1')` (engine ~L3192); `converge*` shadow vars init to the orchestrator finals. Flag-off byte-identical PROVEN by the full SFC suite (10 files / 284 tests + 1 todo) passing flag-unset -- zero existing orchestrator test moved.
- **Fail-loud (R12):** engine exception OR invalid (<=0) -> fallback to orchestrator values + formulas_used note.
- **Tests** `SpeedFeedOrchestrator-converge-flag.test.ts` (6/6): flag-off matches captured baseline (steel-P mill-rough Vc 57.7 / life 1355); flag-on Vc 160 / life 19 (the 160 MATCHES the independent SFC-CONVERGENCE-DIFF.md steel-P prediction -> field mapping validated against known-expected, not just "differs") AND resolved/limiting/safety layers still populated.
- **TO ENABLE (operator-gated, outward-facing):** set `PRISM_SFC_CONVERGE=1` ONLY after reviewing `state/shared/SFC-CONVERGENCE-DIFF.md` per-case (milling = clean win incl 2 over-speed fixes; turning-rough runs hotter = correct Taylor physics, a display-review item). A physics-review is the recommended final gate BEFORE enabling. Engine `require()`s the compiled bundle -> also needs a rebuild for the live server.

## Track 2 -- U-SFC-REMINE-CRON (243da34546)
`.claude/helpers/install-sfc-remine-task.ps1` -- operator-run weekly Windows scheduled task
"PRISM SFC Proven Re-Mine" running the resumable harness (`extract-jm-proven-speedfeed.ts --lane both --json`)
from mcp-server, logging to data/state/sfc-remine.log. Idempotent (-Force), -RunNow/-Uninstall/-DryRun.
NOT auto-registered (operator runs: `powershell -File install-sfc-remine-task.ps1 [-RunNow]`). Keeps the
proven store fresh as JM adds programs.

## Track 3 -- U-SFC-NAV-SURFACE-UNCERTAINTY (4e3ed0af70) -- web=quebec domain (operator-authorized)
`mcp-server/web/src/components/shell/shellCatalog.ts` +2 nav entries: `/speed-feed` (the orphaned
uncertainty-complete page -- CI95/confidence/safety_checks/limiting_factors/weibull via sf_orchestrate)
+ `/speed-feed-calc`, both previously nav-orphaned. tsc --noEmit clean. **VISUAL-VERIFY DEFERRED** (Playwright
desktop+iOS+Android per web/CLAUDE.md cannot run headless here; low-risk additive nav entry to an
already-working page) -- flag for a visual-capable session.

## Remaining (NOT built -- correctly gated)
Electron + iOS/Android shells = quebec whole-app infra, gated on the web SFC page proving 100% (visual-verify).
Out of logical order + cross-galaxy to build now. See [[reference_oscar_sfc_frontend_build_plan_2026_06_18]].
