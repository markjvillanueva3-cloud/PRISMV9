---
name: oscar-sfc-db-auto-absorb-2026-05-31
description: "SFC DB registry now AUTO-ABSORBS new tool/holder catalogs (U-OSC9-DB-AUTO-ABSORB, commit 5c1480c413) + recon map of the closed-loop comparison gap (deferred U-OSC9-DB-CLOSE-LOOP) (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.251Z
aliases: reference_oscar_sfc_db_auto_absorb_2026_05_31
---


Operator /goal (2026-05-31): "closed loop training: SFC calculation comparison to HSMAdvisor and G-Wizard; charlie is adding vendors/PDFs of tooling/machines/fixtures/holders; make sure we're wired into databases to gain AUTOMATIC ABSORPTION of new databases." Follows [[reference_oscar_sfc_db_registry_2026_05_29]] (the unified registry) + [[reference_oscar_sfc_vendor_parity_state]].

## Recon findings (2 code-analyzer agents, evidence-backed)

**Auto-absorption gap:** only `PRISMToolCatalogAggregatorEngine.ts:114` auto-globs (`readdirSync` + `*-extracted.json`). Everything else was STATIC: `SfcDatabaseRegistryEngine` read ONE hardcoded file per domain (tooling=accupro, holders=guhring); `SpeedFeedBaselineComparatorEngine.BASELINE_DB:110` is a hardcoded ~13-row array; Charlie's `vendor-catalog-db` (owner=juliett, 441 vendor *directory* entries — procurement metadata, NOT cutting data) has ZERO SFC consumers; DB_MANIFEST.json missing on disk in this tree.

**Closed-loop gap:** comparison is FRAGMENTED + loop is OPEN. `SpeedFeedTriVendorBatchComparatorEngine` uses STATIC HSMAdvisor baseline + LIVE G-Wizard; the LIVE `HSMAdvisorComparatorBridgeEngine` is an ORPHAN (no dispatcher action, no consumers). Deltas land in `state/outcomes/sf-tri-vendor-smoke.jsonl` (133KB live) but NOTHING reads them back. The L1 sink `SpeedFeedDeepLearningEngine.recordFeedback` (`:469`, wired `sfc_dl_record_feedback`) WORKS but its `actual` only comes from manual shop-floor entry — never a vendor delta. `calibrationFactors` (`:484`) has NO apply-back consumer (getCalibrationFactors = 0 consumers) → loop would be half-closed even after wiring. POST-TRAIN-MS0 trains POST-PROCESSORS (NC conformance), orthogonal. `PPGSFCClosedLoopOrchestratorEngine` is a synthetic Math.random demo, not a real loop.

## SHIPPED this session — U-OSC9-DB-AUTO-ABSORB (commit 5c1480c413, R13 foundation-first)

Converted `SfcDatabaseRegistryEngine` `tooling` + `tool-holders` domains from single-hardcoded-file to AUTO-GLOB via a new `readDataGlob(match)` helper (globs data dir at call time, unions matching `*.json`, per-file fail-soft, deterministic, returns `{records, files}`). A new catalog charlie/peers drop is absorbed with ZERO re-wiring. tooling=30 catalogs/53,568 records (was 1); holders=2/512 (was 1). Exact-complement predicates (`!/holder/` vs `/holder/`, both gated on `-extracted.json`) → every catalog in exactly one domain, no double-count, no silent drop. `sources[0]` surfaces the live count so `sfc_db_connect_all` REPORTS absorption working. NO cache by design (memoizing defeats auto-absorption; struck stale "per-domain memo" header claim). Reuses existing registry (R8 — no new engine, dedup-safe).

**Tests:** `SfcDatabaseRegistryEngine.auto-absorption.test.ts` 10/10 (R9 — INDEPENDENT fs oracle proves the engine globs ALL files → new catalog absorbed by construction). Existing registry 10/10 + dispatcher round-trip 4/4, zero regression. tsc clean. Per-file scrutiny 3 arms PASS (engine↔oracle parity proven empirically 53568/30, 512/2).

## NEXT — U-OSC9-DB-CLOSE-LOOP (deferred, the "closed loop training" half)

On the now-auto-absorbing foundation: build a thin **vendor-delta → L1 calibration bridge** — for each tri-vendor cell where a vendor matched in-envelope, call `speedFeedDeepLearningEngine.recordFeedback({predicted: prism, actual: vendorValue})` over the live `sf-tri-vendor-smoke.jsonl` ledger; AND verify/wire the `calibrationFactors` apply-back (else half-closed); AND wire the orphan `HSMAdvisorComparatorBridgeEngine` to `sfc_hsmadvisor_compare` for a LIVE HSMAdvisor actual. Both endpoints exist + are tested — this is the one wire that turns "compute+report" into "compute→learn". Prefer wiring existing engines (R8); avoid the synthetic PPGSFCClosedLoop shell.

Relates to [[reference_oscar_sfc_db_registry_2026_05_29]], [[feedback_always_fill_gaps]], [[feedback_net_benefit_auto_build]]. Wiki: [[sfc-db-auto-absorption]].
