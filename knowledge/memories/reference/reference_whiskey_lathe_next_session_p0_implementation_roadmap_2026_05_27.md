---
name: reference-whiskey-lathe-next-session-p0-implementation-roadmap-2026-05-27
description: Synthesis roadmap tying iter106-iter112 design memos into a deterministic next-session build sequence. 6 P0 units, dependency-ordered, with concrete per-unit acceptance criteria.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.260Z
aliases: reference_whiskey_lathe_next_session_p0_implementation_roadmap_2026_05_27
---


# Whiskey lathe — next-session P0 implementation roadmap

## What's already in place (this session)

All 6 P0 units have design memos written + 432-video corpus + 14-vendor index + 87+ grade table. The wizard's domain knowledge is now corpus-complete; what's missing is the wiring.

## Dependency DAG

```
                ┌─→ U-LATHE-AB-VERSION-LOCATOR (iter109)
                │       ↓ (produces A/B pair corpus)
shop-tool-library-bridge (iter108) ──┐
                                     ├─→ wizard-vendor-lookup (iter110)
tribal-query-dispatcher (iter111) ───┘       ↓
                                     LOOP-STAGE-IMPL-1-TO-5 (iter112)
canned-cycle-dialect-advisor ────────┘       ↓
   (informal — code lives in
    LathePostProcessor today)            U-LATHE-G76-THREAD-VALIDATOR
                                          (P0, no design memo yet)
```

## Recommended build order (deterministic)

### Phase 1: Foundation (parallel-safe)
1. **U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE** ([[reference_shop_tool_library_bridge_design_2026_05_27]])
   - ~450 LOC, ~3-4 hours
   - Closes 0% insert-coverage P0 gap
   - Tests: 40+ hermetic cases (each layer fallback × each ISO group)
   - **Acceptance**: `validateTools` returns concrete insert info for any T-block

2. **U-LATHE-TRIBAL-QUERY-DISPATCHER** ([[reference_lathe_tribal_query_dispatcher_design_2026_05_27]])
   - ~550 LOC, ~4 hours
   - Makes 432-video + 14-vendor corpus AI-queryable
   - **Acceptance**: `prism_lathe:query_vendor_tribal` round-trips an ISO+operation query in <100ms

### Phase 2: Wizard core (sequential, after Phase 1)
3. **U-LATHE-WIZARD-VENDOR-LOOKUP** ([[reference_lathe_wizard_vendor_lookup_design_2026_05_27]])
   - ~450 LOC, ~3 hours
   - Wires `selectInsert(spec)` into LatheCAMIntelligenceEngine
   - Depends on: tool-library-bridge (vendor-inventory scoring)
   - **Acceptance**: wizard auto-selects insert with rationale + confidence ≥ 70 for typical part

4. **U-LATHE-AB-VERSION-LOCATOR** ([[reference_lathe_ab_version_locator_design_2026_05_27]])
   - ~450 LOC, ~3-4 hours
   - Generates JM-Die A/B-pair training corpus
   - **Acceptance**: emits >50 (A, B) pairs with Δ-score per pair to JSONL

### Phase 3: Reasoning + generation (depends on Phase 2)
5. **U-LATHE-LOOP-STAGE-IMPL-1-TO-5** ([[reference_lathe_training_loop_stages_1_5_design_2026_05_27]])
   - ~850 LOC, ~5-6 hours
   - Stage 4 REASON + Stage 5 GENERATE engine-backed
   - Depends on: 1+3+canned-cycle-dialect-advisor
   - **Acceptance**: A-version program → wizard emits B-grade program with diff + lever-engagement report

6. **U-LATHE-G76-THREAD-VALIDATOR** (no design memo — sketched in iter6 doctrine)
   - ~200 LOC + tests, ~2 hours
   - Dedicated threading-cycle validator (4/11 ALCOA threading)
   - **Acceptance**: catches G92 vs G76 mistakes + thread-depth-vs-pitch incoherence

## Total estimated effort

~2,950 LOC across 6 units + ~1,200 LOC tests = ~4,150 LOC
~21-25 hours implementation (multiple sessions)

## End-state validation

Once all 6 ship:
- Run wizard on each of the 11 ALCOA programs → expect mean score ≥ 80 (current ~44)
- Re-run on 50 random JM-Die programs from AB-pair corpus → wizard's "C" version should beat the operator's "B" version on lever-engagement count in ≥30% of cases (delta-stretch goal)
- All `validateTools` calls resolve concrete inserts (no more "dead-loaded" zeros)
- `prism_lathe:query_vendor_tribal` answers operator + Codex + Ollama queries with non-empty hits

## Companion P1/P2 backlog (after Phase 3)

- U-LATHE-LOOP-STAGE-IMPL-6-TO-11 — operator-review UI + learn sinks + embed + wiki promote + viz tick
- U-LATHE-VENDOR-EXPANSION-DEEP-CURATE — 11 tier-B brands
- U-LATHE-H-CLASS-CBN-EXPANSION — Sumitomo BNX + Mitsubishi MB8000 + Sandvik CB7015
- U-LATHE-VENDOR-PDF-DOWNLOAD — operator wget remaining catalog PDFs
- U-LATHE-MACHINE-VENDOR-MODELS — per-machine specs JSON
- U-LATHE-VENDOR-GRAPH-NODE — /system-viz `ghost.lathe_vendors` roost
- U-LATHE-MEDIA-INGEST-PIPELINE — RSS scraper for MMS + CTE

## Cron-loop graceful handoff

The whiskey /yolo-mode cron (4d08d27a, */5min) auto-fires into the next session. The next session should:
1. Pick up via `/checkin-whiskey` → resume directive
2. Open this memo first: `[[reference_whiskey_lathe_next_session_p0_implementation_roadmap_2026_05_27]]`
3. Pick Phase 1 unit (whichever resource-uncontested)
4. Build → test → commit → tick → repeat

The corpus + design substrate is COMPLETE. Next session = implementation pass, not more harvesting.

## Related

- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus snapshot
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter42]] — earlier snapshot
- [[reference_lathe_program_quality_rubric_2026_05_27]] — scoring foundation
- [[reference_insert_edge_rotation_strategy_2026_05_27]] — geometry foundation
- [[reference_lathe_canned_cycle_dialects_2026_05_27]] — controller-dialect foundation
- [[reference_mazatrol_vs_gmcode_paradigm_2026_05_27]] — paradigm foundation
- [[reference_shop_tool_library_bridge_design_2026_05_27]] — Phase 1
- [[reference_lathe_tribal_query_dispatcher_design_2026_05_27]] — Phase 1
- [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — Phase 2
- [[reference_lathe_ab_version_locator_design_2026_05_27]] — Phase 2
- [[reference_lathe_training_loop_stages_1_5_design_2026_05_27]] — Phase 3
- [[reference_lathe_cycle_time_levers_2026_05_27]] — Stage-4 improvement-direction map
- [[feedback_yolo_mode_nonterminal_goal_pattern]] — governs the loop
