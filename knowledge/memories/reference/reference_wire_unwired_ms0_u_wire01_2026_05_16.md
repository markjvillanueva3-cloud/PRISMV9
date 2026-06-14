---
name: reference-wire-unwired-ms0-u-wire01-2026-05-16
description: WIRE-UNWIRED-MS0/U-WIRE01 — the "861 unwired engines" pool is 96% noise; bash_classify wired; 3 backend-dev candidates pre-vetted for the next /loop iteration
aliases: reference_wire_unwired_ms0_u_wire01_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.061Z
---


# WIRE-UNWIRED-MS0/U-WIRE01 — wire unwired backend-dev engines

**Shipped 2026-05-16, slot alpha claude-6655163e, commit `4db3bb203`.** Task: `/checkin-golf` "wire unwired engines, /loop /yolo until all wired, backend-dev first."

## The decisive finding — the 861-pool is 96% noise
`scripts/validate-unwired-signal.mjs` (50-sample, seed 42) on `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` (861 engines): **TRULY-UNWIRED 4% · WEAK-SIGNAL 84% · FALSE-POSITIVE-WIRED 12% → verdict FAIL** (the script's own gate blocks wiring milestones at >10% FP). "Wire all 861" is structurally unsound — ~100+ already wired (would hit duplication-guard), ~720 are WEAK-SIGNAL (consumed via tests/cross-engine, many WIRE-EXEMPT singletons by design). Confirms [[feedback_dont_wire_for_wiring_sake_2026_05_16]] applies to engines too.

## Method (self-computed, validated against the 50-sample)
102 backend-dev candidates (suggestedDispatcher ∈ dev/session/monitoring/context OR dev-tool name keyword) → dispatcher-grep → 79 not-in-dispatcher → test + cross-engine split → **26 truly-unwired** → scope filter (drop ERP/dashboard/sensor/WEDM/LoRA-dataset) → 16 → dedup vetting → **~4 genuine**.

## Vetting verdicts (16 candidates)
- **Superseded duplicates — LEAVE UNWIRED:** ResponseCacheEngine (devDispatcher `output_cache_*`), ContextWindowPressureEngine (`context_pressure` action exists), PluginInventoryEngine (`infra:plugin_*`), SemanticAssetIndexEngine (`infra:search_semantic` + needs Qdrant), SchemaCompactEngine / ToolCallDeduplicatorEngine (compact/tool-call infra wired).
- **Covered by a script:** MasterIndexGenerator (used by `scripts/generate-master-index.mjs`).
- **Risky:** ExtractionWiringEngine auto-edits source files — rule #6, do not wire.
- **Genuine orphans (zero refs anywhere, clean API):** BashCommandClassifierEngine ✅ DONE · AgentRegistryEngine · SVIRankedBacklogEngine · NeuralDeterminismTestingEngine.

## Shipped — 3 engines wired, all 3-of-3 scrutiny PASS, /loop ran to completion
All commits `[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE0n`, fresh-instance-per-call, tsc-clean:
1. **U-WIRE01 `4db3bb203`** — BashCommandClassifierEngine → `prism_dev:bash_classify` — classify a `command`/`commands[]` → category + est. tokens + token-efficient alternative. 25 tests.
2. **U-WIRE02 `6ca2d98bb`** — AgentRegistryEngine → `prism_orchestrate:agent_recommend` — keyword-trigger match of Task-tool agents; loads `mcp-server/data/state/AGENT_REGISTRY.json` (134 agents) or inline `agents[]`/`registryFile`. 26 tests. **Path gotcha:** `PATHS.STATE_DIR` = legacy `H:/prism/state`, NOT `mcp-server/data/state` — use `path.join(PATHS.MCP_SERVER,"data","state",...)`.
3. **U-WIRE03 `bf5bea4b6`** — SVIRankedBacklogEngine → `prism_dev:svi_ranked_backlog` — rank backlog units by Ψ-delta/hour. 23 tests.

74 tests total, all green. 3-of-3 scrutiny PASS twice (U-WIRE01 standalone; U-WIRE02+03 combined).

## 4th candidate — NeuralDeterminismTestingEngine: deliberately NOT wired
On closer inspection it is a seeded-PRNG + distribution-comparison **test-support library** (`compareOutputs`, `runDistributionTest`), meant to be imported by test files, not exposed as a dispatcher action. Wiring it would be wiring-for-wiring's-sake. "Zero refs" here means *no test uses it yet* — an adopt-or-delete decision, not a wire decision. Milestone complete: all genuinely dispatcher-wireable backend-dev orphans are wired.

## Follow-on — U-DEVDISPATCHER tsc cleanup (commit `1f1fec299`)
Same session, after the 3 wires, fixed the 4 pre-existing `devDispatcher.ts` tsc
errors (L2555 nodeCount dup-key reorder, L3944 redundant `success` key, L5070/5080
`Record<string,unknown>`→`Record<string,Primitive>` casts; exported `Primitive`
from CompactFormatterEngine). All behaviour-preserving; tsc 4→0, 95 tests pass.

## P3 follow-up (non-blocking, reviewer-flagged)
`agent_recommend`'s `registryFile` param has no path-traversal guard — acceptable for a local MCP dev-tool surface (try/catch graceful-degrade), but a defense-in-depth refinement if ever network-exposed.

## Next wave (fresh context window) — other-domain truly-unwired engines
Backend-dev set is exhausted. The remaining ~30 truly-unwired engines are other
domains (lathe/machine/turning/multi). Re-run `node scripts/validate-unwired-signal.mjs
--all --report <file>`, filter to TRULY-UNWIRED, vet each (dedup + not-obsolete +
has a real dispatcher consumer) before wiring. Same pattern as commits 4db3bb203 /
6ca2d98bb / bf5bea4b6.

Sister: [[feedback_dont_wire_for_wiring_sake_2026_05_16]] · [[reference_hook_wiring_yolo_25_2026_05_16]] (hook-side equivalent).
