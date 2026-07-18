---
name: reference_audit_wired_via_engine_2026_06_10
description: "audit-unwired-engines.mjs only counted dispatcher/route/registry/orch/hook/singleton consumers -- NOT plain engine->engine consumption -- so library-layer engines (e.g. QdrantVectorStoreEngine, 3 engine consumers) were mis-counted UNWIRED and chased as false dispatcher-wiring targets. Fixed U-AUDIT-WIRED-VIA-ENGINE (commit a6dbec1842, slot:sierra): added a lowest-priority self-excluded WIRED-VIA-ENGINE pass. LIVE: UNWIRED 89 -> 66 truly-dormant + 23 library-layer. The 'N unwired engines' fleet metric is now honest."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.474Z
aliases: reference_audit_wired_via_engine_2026_06_10
---


# Unwired-engine audit blind spot: engine->engine consumption (U-AUDIT-WIRED-VIA-ENGINE, 2026-06-10, slot:sierra, commit a6dbec1842)

## The gap (verified empirically, then fixed)
`scripts/audit-unwired-engines.mjs` -- the source of `BUILD_STATE.json` NEEDS_WIRING, the SessionStart-injected "N engines built but UNWIRED" count, and the `/system-viz` ghost-orphan roosts -- classified an engine by which CONSUMER files import it. The consumer set was `{dispatchers, routes, registries, orchestrators, hooks, singletons}` but **NOT plain engine->engine consumption**. So a library-layer engine consumed only by OTHER (non-orchestrator, non-singleton) engines showed `UNWIRED` even though it is transitively reachable + correctly wired as a library.

**Proof (live grep before the fix):** `QdrantVectorStoreEngine` had 3 engine-consumers / 0 dispatcher-refs -> listed UNWIRED. `LocalEmbeddingEngine`/`FormalVerificationEngine`/`SemanticAssetIndexEngine` had 0/0 -> genuinely dormant. The audit lumped both classes together as "89 unwired", driving cargo-cult dispatcher-wiring of engines that don't need it (R13: comprehensive CORRECTNESS, not cosmetic churn -- a library engine does NOT need a dispatcher action).

## The fix
Extracted the classifier into a pure exported `applyConsumerClassification(engines, consumerFiles, classification, {excludeSelf})` (unit-testable without disk I/O -- callers pre-read `{rel, content, engineName}`), then added a LAST-priority `WIRED-VIA-ENGINE` pass over all engine files, **self-excluded** (an engine's own source never marks it wired). First-match priority preserved: dispatcher/route/etc wiring still wins; the engine pass only catches engines wired SOLELY via another engine. Detection reuses the unchanged `engineReferencedInConsumer` predicate.

## LIVE validation (R15 step-3, real 3786-engine tree)
`node scripts/audit-unwired-engines.mjs` -> **UNWIRED 89 -> 66 truly-dormant + 23 WIRED-VIA-ENGINE** (66+23=89 reconciles exactly; nothing else shifted). `QdrantVectorStoreEngine` reclassified OUT; `LocalEmbeddingEngine`/`FormalVerificationEngine`/`SemanticAssetIndexEngine` correctly STILL dormant. 23/23 tests (18 predicate tests unchanged + 5 new: WIRED-VIA-ENGINE classify, priority-not-downgraded, self-exclusion, WIRE-EXEMPT-preserved, zero-consumer-stays-dormant). The regenerated `UNWIRED-ENGINE-AUDIT-2026-05-07.json` is UNTRACKED local state -- the committed SCRIPT propagates the fix fleet-wide on the next audit run.

## So the actionable dormant set is 66, not 89
A "wire the unwired engines" loop should target the **66 truly-dormant** (0 consumers of any kind), NOT the 23 library-layer ones. Even among the 66, verify-before-wiring: many are superseded-by-better-implementations (e.g. LocalEmbeddingEngine vs the live nomic-embed/ONNX path) -- wiring them to a dispatcher would be redundant. Truly-dormant != automatically-should-be-wired.

## Residual note (NOT chased -- drift discipline)
`FeedbackCollectorEngine` stays UNWIRED per the STRICT import-path detector even though a loose `grep import.*FeedbackCollectorEngine` found 3 hits -- the loose grep over-counted (prose/comment/multi-segment mentions); the strict detector found no real import. If a future audit pass shows it's consumed via a re-export/barrel/singleton-with-different-basename the strict detector misses, that's a SEPARATE potential blind spot (sibling to [[reference_audit_multiline_import_false_orphan_2026_06_02]]) -- left as a future-look, orthogonal to this unit.

## Lineage
Third audit-detector correctness fix in the same file. Builds on [[reference_audit_actionmap_synergy_chain_2026_05_18]] (table-driven ACTION_MAP detection, commit 9e27d9d420) + [[reference_audit_multiline_import_false_orphan_2026_06_02]] (multi-line await-import false-orphan). Pattern: the wiring auditor is load-bearing for the fleet's whole "what needs wiring" picture -- every detection gap inflates the dormant count + drives wasted wiring. Verify the metric before acting on it. See also [[reference_unwired_engine_gap_audit_2026_06_08]].
