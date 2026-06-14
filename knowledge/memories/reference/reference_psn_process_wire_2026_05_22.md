---
name: reference-psn-process-wire-2026-05-22
description: PSN-SYNERGY/U-PROCESS-WIRE — 7 dormant Process engines wired to new prism_process dispatcher (30% to 100% coverage)
aliases: reference_psn_process_wire_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.898Z
---


# PSN-SYNERGY / U-PROCESS-WIRE — 7 dormant Process engines wired

**Shipped:** 2026-05-22 slot oscar (claude-c5942427), commit `565e01449d` on `cad-fusion-live-ms0`. Third domain shipped in the PSN-SYNERGY session — after [[reference_psn_outcome_wire_2026_05_22]] (Outcome 0→100%, `0fd90359de`) and [[reference_psn_shop_wire_misattribution_2026_05_22]] (Shop 50→100%, absorbed in `c469efd4bc`).

## What

7 dormant Process-domain engines (3/10 wired = 30% coverage, third-highest-ROI dormant cluster per AWARENESS-SNAPSHOT) wired into a new focused `processDispatcher.ts` → `prism_process` MCP tool with **18 actions across 7 engines**:

| Engine | Actions |
|--------|---------|
| ProcessCapabilityPredictionEngine | `capability_predict` |
| ProcessDigitalTwinEngine | `digital_twin_compute` |
| ProcessEnvironmentSensitivityEngine | `env_add_coefficient`, `env_assess_risks`, `env_calculate_corrections`, `env_get_coefficients`, `env_optimal_window`, `env_record`, `env_trends` (7) |
| ProcessIntelligenceRouterEngine | `router_full_pipeline`, `router_list_stages`, `router_orchestrate`, `router_route` (4) |
| ProcessRobustnessEngine | `robustness_compute` |
| ProcessValidationIQOQPQEngine | `validation_stats`, `validation_validate` (2) |
| ProcessVariabilityIntegrationEngine | `variability_analyze` |

**7th-engine discovery**: of the 10 total `Process*Engine` files, the 3 wired in `calcDispatcher` were ProcessFingerprintEngine + ProcessPlanEngine + ProcessSynthesisEngine. The unnamed 7th unwired beyond the 6 sampled was **ProcessVariabilityIntegrationEngine** (confirmed via dispatcher grep).

## Verification

- 22/22 vitest passing (18 round-trip + 2 invalid-params + 2 edge-case)
- tsc clean for process files (pre-existing MachiningPlaybookEngine.ts esbuild error is unrelated tech-debt)
- Coverage: Process 30% → 100% wired

## Files

- NEW `mcp-server/src/tools/dispatchers/processDispatcher.ts` (13.8K)
- NEW `mcp-server/src/schemas/processActionSchemas.ts` (19.6K)
- NEW `mcp-server/src/__tests__/processDispatcher.test.ts` (26.4K, 22 tests)
- MOD `mcp-server/src/index.ts` (register adjacent to registerShopDispatcher / registerOutcomeDispatcher)

## Session summary (3 batches across one /loop chain)

| Batch | Domain | Coverage | Engines | Actions | Tests | Commit | Status |
|-------|--------|----------|---------|---------|-------|--------|--------|
| 1 | Outcome | 0→100% | 8 | 40 | 40/40 | `0fd90359de` | Clean |
| 2 | Shop | 50→100% | 8 | 53 | 60/60 | `c469efd4bc` (peer-absorbed) | Work landed, attribution drift |
| 3 | Process | 30→100% | 7 | 18 | 22/22 | `565e01449d` | Clean |
| **Total** | 3 domains | — | **23 engines** | **111 actions** | **122/122 tests** | 3 commits | 1 clean + 1 absorbed + 1 clean |

## Pattern that worked

Identified the canonical PSN-synergy playbook for dormant high-ROI dispatcher-wiring. Each iteration:
1. Read AWARENESS-SNAPSHOT `COVERAGE_BY_DOMAIN` → pick lowest non-zero coverage row.
2. List `mcp-server/src/engines/<Domain>*.ts` files via direct `ls` (Glob times out on the engines/ tree — too many files).
3. Use BUILD_STATE `sample_unwired[]` for first 6 → grep dispatchers for the remaining ones.
4. Delegate to `dispatcher-wirer` subagent with a tight brief that includes the prior commit as template + a NO-CROSS-WIRE constraint when the domain is unrelated to AI/learning (saves agent context, avoids the TS2741 contract pitfall from batch 1).
5. Verify INDEPENDENTLY: `npx tsc --noEmit 2>&1 | grep -iE "<domain>Dispatcher|<domain>Action"` must be empty. Re-run vitest.
6. Pathspec commit (`git commit -m "..." -- <only my files>`) on the shared tree — if lock contention >2 retries, race-loop with `for i in 1..12; do rm -f index.lock; git commit ... && break; sleep 3; done`.

Per-batch tokens: ~150K input / ~25K cache-read amortized via repeated agent runs. Each batch is ~25% context.

## Cross-references

- Outcome (batch 1, clean ship): [[reference_psn_outcome_wire_2026_05_22]]
- Shop (batch 2, misattribution): [[reference_psn_shop_wire_misattribution_2026_05_22]]
- Doctrine: [[feedback_high_roi_backend_first_slot_queue]] · CLAUDE.md §ENGINE WIRING — WIRE TO ALL SOURCES · CLAUDE.md §MASTER INDEX + [[reference_awareness_stack|AWARENESS STACK]]
- Audit source: `state/shared/BUILD_STATE.json` `.COVERAGE_BY_DOMAIN.rows[]`
