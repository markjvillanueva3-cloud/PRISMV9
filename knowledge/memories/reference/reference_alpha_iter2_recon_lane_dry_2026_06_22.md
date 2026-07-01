---
name: reference_alpha_iter2_recon_lane_dry_2026_06_22
description: Alpha autonomous-loop iter2 reconnaissance (2026-06-22) — in-domain token-savings lane re-confirmed exhausted + the 4 unwired engines each carry an R7/R8/operator-judgment flag (no clean alpha-competent unit this turn)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.470Z
aliases: reference_alpha_iter2_recon_lane_dry_2026_06_22
---


# Alpha /loop iter2 recon — clean in-competence queue dry (slot:alpha 2026-06-22)

After shipping U-PSN-INCREMENTAL-AGGREGATE (iter1, [[reference_psn_incremental_aggregate_2026_06_22]]), verify-first reconnaissance for iter2 (NEVER-IDLE descent). Recorded so the next chat does NOT re-investigate these (R12).

## In-domain token-savings levers — both NON-UNITS (verify-first, no fabricated fix)
- **latency-tiering trivial ask-ollama modes**: `scripts/ask-ollama.mjs:178` DELIBERATELY excludes tiny models (1.5b/7b) for output quality; `pickModel` → DEFAULT_MODEL (qwen2.5-coder:32b) or a warm substantial model. Routing trivial modes (classify/triage) to `:1.5b` is a contestable quality-vs-latency tradeoff against the operator's "WITHOUT quality loss" constraint — overriding a deliberate prior design needs operator sign-off (R7/R8), NOT an autonomous call.
- **ask-hermes savings (855 execs, dashboard tokensSaved=0)**: ALREADY correctly wired — `estimateHermesSaved` (ask-hermes.mjs:240) is called at the 3 record sites (:494/534/549) and tallied (:219). The live 0 is HONEST HISTORICAL: the 855 execs predate the fix and carry no per-call size data (can't retro-estimate); new calls accumulate. Not a bug. (U-OLLAMA-BRIDGE-EXEC-VISIBILITY, prior session.)
- **ask-openrouter**: 1 execution total — trivial, no unit.
→ Alpha token-savings/efficiency lane EXHAUSTED (re-confirms the prior 733K-tok Workflow audit).

## WIRINGS rung (audit-unwired-engines.mjs) — 4 UNWIRED, none clean for alpha
`state/shared/UNWIRED-ENGINE-AUDIT-2026-06-22.json` (live: 3821 engines, only 4 UNWIRED after sierra's WIRED-VIA-ENGINE fix a6dbec1842):
1. **AuthEngineV7** (prism_auth) — auth, sensitive, dormant since 2026-03-16 → R8 ask-why-first.
2. **RegressionBaselineEngine** (UNKNOWN) — well-built pure CI diff-gate engine BUT already imported by `WetRunAuthorizationEngine.ts` (engine→engine) → it's an internal library engine; direct dispatcher-wiring would be redundant/wrong (R8). NOTE: the audit STILL flags it UNWIRED despite that import → a likely gap in sierra's day-old `WIRED-VIA-ENGINE` classifier (transitive/consumer-must-be-wired). Re-touching a peer's just-shipped code = R7 coordinate-don't-blindly-refix → hand to tango/sierra or coordinate.
3. **PreMOUKickoffChecklistEngine** (UNKNOWN) — business/MOU domain, not alpha.
4. **IEngine** (0kb) — interface false-positive (audit should exclude).

## RESOLVED: RegressionBaseline + the audit (no bug)
`WetRunAuthorizationEngine.ts:47` imports RegressionBaselineEngine **type-only** (`import type { DiffGateReport }`), NOT the engine value. So the audit-unwired classifier is CORRECT (a type import is not runtime consumption) — NO classifier bug, do not "fix" it. RegressionBaselineEngine is a GENUINE orphan: its intended consumer is WetRun's "G3 (REGRESSION)" gate (docstring line 21, `RegressionBaselineEngine.evaluate()`) but only the type was ever imported — the engine is never called. Completing that wiring is **wet-run safety-authorization domain** (WetRun → authDispatcher), safety-critical (S(x)/shop-floor tier), needing the domain owner — NOT an autonomous alpha unit (R8 + safety preamble).

## Disposition (final)
No clean, low-risk, alpha-competent unit available this turn. Every remaining candidate needs operator judgment (latency-tiering quality tradeoff), is already-correct (ask-hermes savings; the unwired audit), or is safety/domain-coupled needing the owner (RegressionBaseline→WetRun G3; AuthEngineV7). Next iteration: operator-steer to a specific ANY-DOMAIN target, or load fresh domain context for a GHOST/MISC-TASKS pick. Idle is NOT being claimed — the queue is dry of *alpha-competent low-risk* units; the deeper rungs need context best loaded fresh next turn.
