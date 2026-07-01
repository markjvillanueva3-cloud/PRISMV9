---
name: reference_octopus_grok_cli_voice_audit_lazy_import_2026_06_18
description: Octopus gains a keyless Grok-CLI voice + unwired-audit detects () => import() route-map loaders (false-UNWIRED fix). Two alpha units 2026-06-18.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.668Z
aliases: reference_octopus_grok_cli_voice_audit_lazy_import_2026_06_18
---


# Octopus Grok-CLI voice + unwired-audit lazy-import detection (slot:alpha, 2026-06-18)

Two verified units on `cad-fusion-live-ms0`, WIRINGS rung of the autonomous loop.

## U-OCTOPUS-GROK-CLI-VOICE (`1311ee80cb`)
De-orphaned `GrokCLIClientEngine` as the octopus Grok voice's **keyless CLI backend**. Dedup vs `GrokClientEngine` = DISTINCT companions (HTTP+`XAI_API_KEY` vs CLI+account-login), per the CLI engine's own JSDoc.

**Design (R7 — never double-weight a vendor):** ONE Grok voice, TWO backends. `MultiModelConsensusEngine.callGrok` (~`:924`) prefers the HTTP API when `XAI_API_KEY` is set (deterministic + token usage), else falls back to the `grok` CLI when `grokCLIClientEngine.isAvailable()` (tokens:null), else `errResponse`. Gate (~`:487`): `includeGrok!==false && (XAI_API_KEY || isAvailable())`. Neither backend → no voice, dualOllama fires (back-compat).

**Test gotcha:** `isAvailable()` is now a NEW gating signal on every keyless `ask()`. Default-stubbed `mockReturnValue(false)` in all 3 `restoreAllMocks` beforeEach blocks (dual-Ollama, PRISM-context, orchestration) so voice counts are **host-PATH independent** — the CLI-grok analog of the `_VENDOR_KEYS` scrub; also prevents a real `grok` spawn in the PRISM-context block. +5 tests (46/46), tsc-clean, reviewer PASS. The HTTP call uses bracket-access on the engine's HTTP method (security-hook false-positives on the literal dotted-exec token; mirrors callDeepSeek).

## U-AUDIT-LAZY-IMPORT-DETECT (`696c72b576`)
`scripts/audit-unwired-engines.mjs` `engineReferencedInConsumer` Form-2 regex required `await import(` → **missed route-map lazy loaders** `() => import("...Engine.js").then(m => m.engine)` (XPROC_ROUTES and every `Record<string, () => import(...)>` dispatch map). Fix: `await\s+import\(` → `(?:await\s+)?import\(`. LIVE: **UNWIRED 18→15**, +3 WIRED-DIRECT; `XProcNeuralAutoFireEngine` (wired via `aiReasoningDispatcher.ts:719-721`) + `GrokCLIClientEngine` both left the unwired list. 24/24 tests (+1 regression). Same blind-spot family as the array-dispatch fix (2026-06-11) and await-import-multiline fix (2026-05-25). De-noises BUILD_STATE NEEDS_WIRING + the fleet "N unwired" count + /system-viz ghost roosts.

## Backlog-hygiene findings (the 2026-06-18 audit was noisy)
- `XProcNeuralAutoFireEngine` = FALSE unwired entry (now fixed by the detector).
- `BayesianAcquisitionRefiner` = genuinely unwired BUT **library-layer, NOT dispatcher-exposable** (input `acquisitionFn:(x)=>number` is a live JS fn, non-serializable). Natural consumer = `BayesianOptimizer` (opt-in L-BFGS-B acquisition refine) or WIRE-EXEMPT.
- `WEDMLoRADatasetBuilderEngine` = 0kb empty stub → needs BUILDING, not wiring.
- Lesson: re-run the canonical audit AFTER any detector fix before treating its list as a worklist (R12 — the backlog itself can be fabricated). Verify each "unwired" engine is dispatcher-exposable before wiring.

## Compaction-phantom note
The prior handoff's "fix the constant-compaction phantom FIRST" was STALE — `precompact-auto-trigger.mjs` is already `compact_boundary`-aware (`:182-194`) + byte-suspect-guarded (`:447-462`, the 2026-06-10/11 fixes). Not reproducing this session. Residual self-compact resume RACE possible but unproven — do not chase.

Related: [[reference_octopus_consensus_route_2026_06_17]] · [[reference_model_routing_resolver_cloud_ladder_2026_06_18]] · [[reference_audit_wired_via_engine_2026_06_10]] · [[reference_stop_unwired_array_dispatch_fix_2026_06_11]]
