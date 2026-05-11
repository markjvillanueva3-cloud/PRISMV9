# REVENUE-MS3 v2 — Wire-backlog harvest (revenue-relevant orphans first)

> **Round-4 revision** — collapses the "875 unwired" framing into the **531 true-revenue-relevant** subset after subtracting ML-plumbing (289), singleton wrappers (30), and infrastructure facades (25). Replaces the original 18-unit × 47-engine-per-batch plan (round-2 verdict: INFEASIBLE at 7.8x historical velocity) with **12 batches @ 8-12 engines** sustainable under the 3way scrutiny gate.

## Corrected math (round-3/07 forensic)

| Bucket | Count | Action |
|---|---|---|
| BUILD_STATE.needs_wiring (raw) | 875 | starting pool |
| − singleton wrappers in unwired pool | 30 | TAG-AS-EXEMPT (do not wire) |
| − ML-plumbing (LoRA/Federated/ProtoMAML/AdaLoRA/DoRA/Continual/TTA/Replay/Synaptic/DER) | 289 | defer to MS-ML-PLUMBING |
| − infrastructure / Base / Facade / Bridge / Event / ChatBus / Provenance survivors | 25 | TAG-AS-EXEMPT |
| **= true revenue-relevant orphans** | **531** | wire in MS3 + MS3.5 |
| MS3 v2 coverage (12 batches × ~9.5) | 116 | this sprint (22%) |
| MS3.5 carry-over | 415 | defer to next sprint |
| MS-ML-PLUMBING (separate milestone) | 289 | post-MS3, research-tier |

Note: `BUILD_STATE` already deducts the 81 already-tagged `WIRE-EXEMPT` engines from the 875 (verified by `grep WIRE-EXEMPT mcp-server/src/engines/` → 86 files / 87 occurrences, matches within rounding). The 30 above are **untagged** singleton wrappers that the detector cannot infer.

## Historical velocity calibration

- **Sustained**: 6 engines / commit (BATCH2/3/4/5/7/8/9 evidence)
- **Ceiling**: 12 / commit (BATCH5-6-RETRY combined catch-up)
- **Floor**: 4 / commit (BATCH11 — late-stage drag)
- **Empirical saturation**: BATCH7 needed RETRY2 + HARDEN at only 6 engines under 3way scrutiny → **9.5/batch is the sustainable upper bound**, 47/batch (old plan) is 7.8× over capacity and would deadlock the Stop hook.

## Revenue-priority ordering (Lathe-first)

| Rank | Batch | Domain | Count | Why first |
|---|---|---|---|---|
| 1 | `U-WIRE-LATHE-BATCH12` | Lathe AI/CAM/chemistry | 9 | JM-Die is a lathe-heavy fastener shop; highest customer-impact gap |
| 2 | `U-WIRE-LATHE-BATCH13` | Lathe knowledge/material/measurement | 9 | Closes the L12→L13 tribal-RAG chain |
| 3 | `U-WIRE-TURNING-BATCH1` | Turning (full domain close) | 11 | Single-shot clears Turning (11→0); compounds with Lathe |
| 4 | `U-WIRE-LATHE-BATCH14` | Lathe sequencing/optimization/strategy | 10 | Consumes B12-B13 outputs |
| 5 | `U-WIRE-LATHE-BATCH15` | Lathe tools/validation/workholding | 10 | Closes lathe revenue subset |
| 6 | `U-WIRE-MACHINE-BATCH1` | Machine speed/feed/OEE | 9 | Double-wire to `prism_calc` per WIRE-TO-ALL |
| 7 | `U-WIRE-MACHINE-BATCH2` | Machine ROI/state/telemetry | 8 | Closes Machine domain (17→0) |
| 8 | `U-WIRE-MULTI-BATCH1` | Multi-agent / multi-vendor | 12 | Closes Multi (12→0); consensus double-wires to `prism_intelligence` |
| 9 | `U-WIRE-CAM-OTHER-BATCH1` | CAD subset of Other | 10 | Quote/DFM pipeline foundation |
| 10 | `U-WIRE-CAM-OTHER-BATCH2` | CAM subset of Other | 10 | Fixture/holder/probe revenue |
| 11 | `U-WIRE-QUALITY-OTHER-BATCH1` | AS9100/PPAP/FAIR | 8 | Audit-grade traceability — high revenue per seat |
| 12 | `U-WIRE-OTHER-MISC-BATCH1` | ShopFloor + GCode templates | 10 | Dashboard cluster → `prism_quote` double-wire |

**Totals**: 12 batches, avg **9.67 engines**, **116 engines wired in MS3**, **415 deferred to MS3.5**, **289 deferred to MS-ML-PLUMBING**.

## Per-batch unit spec (every batch is one Unit-of-Commit)

Each `U-WIRE-*` unit produces in a single 3way-cleared commit:
1. Dispatcher import + `actions` enum entry per engine
2. Schema entry (Zod) in matching `src/schemas/*.ts`
3. Lazy-import resolution in dispatcher router
4. **Engine-named test file** `<EngineName>.test.ts` with ≥15 `it()` cases (round-3/06 F-r2-a6-6 was social-enforced; **MS3 v2 moves it to HOOK-ENFORCED** via the new `stop_on_unnamed_engine_tests.mjs` gate — see §Hook addition below)
5. ≥1 round-trip E2E case asserting input → dispatcher action → engine method → concrete output (no singleton bypass)
6. 3way scrutiny PASS (Codex + Gemini + Opus all VERDICT: PASS) recorded in `SCRUTINY_LEDGER.json`

## Top-3 first batches — engine lists

### `U-WIRE-LATHE-BATCH12` (9 → `prism_turning`)
`LatheAdvancedOperationsEngine`, `LatheAIFeatureRegistration`, `LatheAIUltraEngine`, `LatheCAMIntelligenceEngine`, `LatheCuttingChemistryEngine`, `LatheDeepAIHardeningEngine`, `LatheEnvelopeDistanceEngine`, `LatheFinishingStrategyEngine`, `LatheGcodeAnalyzerEngine`

### `U-WIRE-LATHE-BATCH13` (9 → `prism_turning`)
`LatheGroovingEngine`, `LatheHardenedSelfEngine`, `LatheJMDieKnowledgeEngine`, `LatheKienzleEngine`, `LatheKnowledgeRetrievalEngine`, `LatheLubricantEngine`, `LatheMachineProfileEngine`, `LatheMaterialKBEngine`, `LatheMeasurementBridgeEngine`

### `U-WIRE-TURNING-BATCH1` (11 → `prism_turning`)
`TurningEnvelopeDistanceEngine`, `TurningInspectionPlanEngine`, `TurningRulesGeneratorEngine`, `TurningSensitivityAnalysisEngine`, `TurningStochasticPlanEngine`, `TurningStrategyCatalog`, `TurningSurfaceFinishEngine`, `TurningThreadEngine`, `TurningToolDeflectionEngine`, `TurningToolLifeEngine`, `TurningValidationEngine`

## Deferred — MS-ML-PLUMBING milestone (post-MS3)

289 ML-plumbing engines (LoRA / Federated / ProtoMAML / AdaLoRA / DoRA / Continual / TestTimeAdaptation / Replay / Synaptic / DER) → **no inference revenue path** (training-time research infra). Many already carry `WIRE-EXEMPT` tags. Defer to a dedicated `MS-ML-PLUMBING` milestone post-MS3 close so they don't dilute the revenue cadence.

## WIRE-EXEMPT + singleton-wrapper exclusion list (do NOT re-flag)

Singleton wrappers (30) where wiring would create circular deps — TAG ONLY:
- `QdrantMemoryEngineSingleton` (wraps `QdrantMemoryEngine`)
- `*EngineSingleton` pattern across memory/context/session engines
- `*Bridge`, `*Facade`, `*EventBus`, `*ChatBus`, `*Provenance` infrastructure surface
- Base classes: `BaseEngine`, `BaseDispatcher`, `BaseSchema`

Action: extend `stop_on_unwired_assets.mjs` to recognize `// WIRE-EXEMPT: <reason>` and the singleton naming pattern. Audit run produces a `WIRE_EXEMPT_REGISTRY.json` so the same 30+25 don't re-surface in MS3.5 backlog.

## Hook addition (new in MS3 v2)

`stop_on_unnamed_engine_tests.mjs` — Stop hook that BLOCKS if a batch commit adds engines to a dispatcher without matching `<EngineName>.test.ts` containing ≥1 dispatcher-round-trip assertion. Replaces the social convention from round-3/06 F-r2-a6-6. Lives in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` can't disable.

## Acceptance per batch

- Build: `npm run build:fast` < 10s incremental
- Tests: 8-12 `.test.ts` × 15 cases = 120-180 new test cases; `vitest run <batch-files>` < 60s
- Review: 3way scrutiny ledger 3-of-3 PASS within ~15-20min PR cycle
- Stop hooks: `stop_on_unwired_assets`, `stop_on_unnamed_engine_tests`, `scrutinize-before-stop` all PASS
- Dispatcher contract: every wired action callable from MCP client → returns typed payload (no `unknown`)

## MS3.5 — carry-over (415 engines, separate milestone)

Domains still uncovered after MS3 close: Other-misc residual, CAM long-tail, niche knowledge engines, vendor-specific bridges. Plan 12 more batches @ ~10 engines for MS3.5; reorder by then-current revenue telemetry rather than static priority.
