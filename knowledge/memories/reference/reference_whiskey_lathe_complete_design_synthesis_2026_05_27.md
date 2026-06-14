---
name: reference-whiskey-lathe-complete-design-synthesis-2026-05-27
description: One-entry-point synthesis of all 14 lathe-domain design memos written iter105-iter120 this session. Single landing-page for next-session pick-up; consolidates P0/P1/P2 unit roadmap with cross-references.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.046Z
aliases: reference_whiskey_lathe_complete_design_synthesis_2026_05_27
---


# Whiskey lathe domain — complete design synthesis (iter121 landing page)

## TL;DR

This session (iter40-iter121) shipped:
1. **~120 video transcripts harvested** (iter40-iter101) → corpus now ~430 videos / ~120 lathe-relevant
2. **5 JM-fleet controllers covered** (Okuma OSP, Mazak Mazatrol, Haas NGC, Fanuc 0i, Doosan)
3. **5 PRISM CAM bridges covered** (Mastercam, Esprit, Fusion 360, hyperMILL, Inventor HSM)
4. **6 ISO material groups covered** (P/M/K/N/S/H)
5. **14 design memos** for next-session implementation (iter105-iter120 — listed below)
6. **Snapshot reference** at [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]]

Next session = **implementation pass**, not more harvesting. Substrate is complete.

## All 14 design memos

### Foundation (knowledge / rubric)
- iter105 — [[reference_insert_edge_rotation_strategy_2026_05_27]] — 8 ANSI geometry edge counts + rotation discipline
- iter106 — [[reference_lathe_program_quality_rubric_2026_05_27]] — 10-point/100 program-quality rubric + 5 program-killers + ALCOA re-mapping (current ~44/100)
- iter107 — [[reference_lathe_canned_cycle_dialects_2026_05_27]] — G71/G70/G76/G75 across 5 controller dialects + Mazak D×1000 silent-miss anti-pattern
- iter104 — [[reference_lathe_cycle_time_levers_2026_05_27]] — 3-tier cycle-time levers (structural/parametric/micro) + 5 anti-patterns

### Paradigm
- iter103 — [[reference_mazatrol_vs_gmcode_paradigm_2026_05_27]] — conversational vs G/M-code paradigm + .MIN vs .PIM file detection

### P0 units (6 — gate wizard correctness)
- iter108 — [[reference_shop_tool_library_bridge_design_2026_05_27]] — Phase 1, ~3-4h
- iter111 — [[reference_lathe_tribal_query_dispatcher_design_2026_05_27]] — Phase 1, ~4h
- iter110 — [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — Phase 2, ~3h
- iter109 — [[reference_lathe_ab_version_locator_design_2026_05_27]] — Phase 2, ~3-4h
- iter112 — [[reference_lathe_training_loop_stages_1_5_design_2026_05_27]] — Phase 3, ~5-6h
- iter114 — [[reference_lathe_g76_thread_validator_design_2026_05_27]] — Phase 3, ~5h

### P1 units (4 — coverage breadth)
- iter115 — [[reference_lathe_h_class_cbn_expansion_design_2026_05_27]] — 12 CBN grades (Sumitomo/Mitsubishi/Sandvik)
- iter118 — [[reference_lathe_vendor_pdf_download_design_2026_05_27]] — 4-tier PDF download workflow (~80-100 PDFs)
- iter119 — [[reference_lathe_machine_vendor_models_design_2026_05_27]] — per-JM-fleet-machine specs JSON
- iter120 — [[reference_lathe_vendor_expansion_deep_curate_design_2026_05_27]] — 11 tier-B brand deep-curate

### P2 units (2 — UX + corpus growth)
- iter116 — [[reference_lathe_vendor_graph_node_design_2026_05_27]] — `/system-viz` `ghost.lathe_vendors` roost
- iter117 — [[reference_lathe_media_ingest_pipeline_design_2026_05_27]] — RSS scraper for 19 manufacturing magazines

### Earlier roadmap (superseded by this synthesis)
- iter113 — [[reference_whiskey_lathe_next_session_p0_implementation_roadmap_2026_05_27]] — P0-only roadmap; this landing-page extends to P1/P2

## Recommended implementation sequence (12-unit total)

### Phase 1: Foundation (parallel-safe, ~7-8 hours)
- U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE (iter108)
- U-LATHE-TRIBAL-QUERY-DISPATCHER (iter111)

### Phase 2: Wizard core (sequential after Phase 1, ~7 hours)
- U-LATHE-WIZARD-VENDOR-LOOKUP (iter110)
- U-LATHE-AB-VERSION-LOCATOR (iter109)

### Phase 3: Reasoning + generation (depends on Phase 2, ~10 hours)
- U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (iter112)
- U-LATHE-G76-THREAD-VALIDATOR (iter114)

### Phase 4: Coverage breadth (P1, depends on operator wget, ~30 hours operator+claude)
- U-LATHE-VENDOR-PDF-DOWNLOAD (iter118) — gates Phase 4 + Phase 5
- U-LATHE-H-CLASS-CBN-EXPANSION (iter115)
- U-LATHE-MACHINE-VENDOR-MODELS (iter119)
- U-LATHE-VENDOR-EXPANSION-DEEP-CURATE (iter120)

### Phase 5: UX + corpus-growth (P2, deferrable, ~13 hours)
- U-LATHE-VENDOR-GRAPH-NODE (iter116)
- U-LATHE-MEDIA-INGEST-PIPELINE (iter117)

**P0+P1 total: ~55 hours implementation**
**P0+P1+P2 total: ~68 hours implementation**

## Total session output (iter40-iter121)

- **Commits**: 82 (iter40-iter121)
- **Memory files**: 16 (15 design memos + 1 snapshot reference)
- **Slot-worktree wiki entries**: ~120 video-extract stubs + 14 vendor-expansion entries
- **Corpus contribution**: 432 videos / ~120 lathe-relevant / ~5K segments / ~250K transcript chars

## What this session DID NOT do (genuine work remaining)

- Did not write any TypeScript engine code (all design-only memos)
- Did not implement any of the 12 unit specs
- Did not run end-to-end pipeline test on real JM-Die programs
- Did not generate actual wizard "C" version output for any ALCOA program
- Did not validate any design memo's accuracy via implementation feedback
- Did not commit the design memos themselves to slot-worktree (memos auto-mirror to `H:/knowledge/memories/` via Stop hook; not in git)

## Failure modes to watch

1. **Design memos contain assumed APIs that don't exist** — verify per [[feedback_verify_actual_contract_not_proxy]] before relying
2. **Memo recommendations contradict each other** — cross-check at integration time per CLAUDE.md R7 (surface conflicts, don't average)
3. **The 11 tier-B brand list rotated since iter9** — read live file at integration time per CLAUDE.md "do not trust counts baked into this document"

## Doctrine governing this loop

[[feedback_yolo_mode_nonterminal_goal_pattern]] — /yolo-mode is non-terminal by architectural design. Stop hook perpetually blocks. The cron 4d08d27a re-injects `/goal /yolo-mode` every 5 minutes. Operator intervention (new substantive directive, `/goal clear`, or `CronDelete 4d08d27a`) is the only natural termination.

This session captured a complete design substrate during one /yolo-mode loop pass. Next session inherits this synthesis as the landing page.

## Pickup procedure for next session

1. `/checkin-whiskey` → claim slot, read auto-resume
2. Read THIS file first: `[[reference_whiskey_lathe_complete_design_synthesis_2026_05_27]]`
3. Pick from Phase 1 (uncontested + foundation): U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE OR U-LATHE-TRIBAL-QUERY-DISPATCHER
4. Read that unit's design memo
5. Implement → test → commit in slot-worktree → tick → repeat
