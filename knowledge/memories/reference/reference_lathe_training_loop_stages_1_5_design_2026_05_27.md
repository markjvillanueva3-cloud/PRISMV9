---
name: reference-lathe-training-loop-stages-1-5-design-2026-05-27
description: Design for U-LATHE-LOOP-STAGE-IMPL-1-TO-5 — engine-backed implementations of stages 1-5 of lathe-training-loop.mjs (GATHER, PARSE, VALIDATE, REASON, GENERATE). Stages 6-11 deferred to companion unit.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.641Z
aliases: reference_lathe_training_loop_stages_1_5_design_2026_05_27
---


# Training-loop stages 1-5 implementation design

## Current state

`scripts/lathe-training-loop.mjs` shipped in iter6 as an 11-stage skeleton. Stages 1-3 (GATHER/PARSE/VALIDATE) are functionally live via `lathe-quality-pipeline.mjs`. Stages 4-11 emit structured stubs. This unit implements stages 4-5 (REASON + GENERATE) engine-backed.

## Stage descriptions

### Stage 1 — GATHER (already live)
Collect input artifacts: part spec, machine spec, material, blueprint refs, customer tool-list. Pure I/O — no engine calls.

### Stage 2 — PARSE (already live, lathe-quality-pipeline.mjs parseProgram)
Parse any existing program input (A-version or template) into structured operations[]. Returns `Program{ operations, gCodes, cssMode, tBlocks, ... }`.

### Stage 3 — VALIDATE (already live, lathe-quality-pipeline.mjs)
Runs `validateTools + validateConsistency + validatePhysics + scoreOperationSequence + aggregateQualityScore`. Returns `QualityReport`.

### Stage 4 — REASON (this unit)

Synthesize improvements via:
1. **Lever-engagement analysis** (per [[reference_lathe_cycle_time_levers_2026_05_27]])
2. **Anti-pattern detection** (per [[reference_lathe_program_quality_rubric_2026_05_27]] program-killers)
3. **Material-fit check** (current insert vs ISO group via [[reference_shop_tool_library_bridge_design_2026_05_27]])
4. **Controller-dialect check** (per [[reference_lathe_canned_cycle_dialects_2026_05_27]])
5. **Edge-rotation cadence** (per [[reference_insert_edge_rotation_strategy_2026_05_27]])

Output `ReasonReport`:
```ts
{
  current_score: number,
  target_score: number,
  improvement_recommendations: [
    {
      category: "speed_feed" | "tooling" | "canned_cycle" | "safety" | "structure",
      severity: "P0" | "P1" | "P2",
      what: string,         // "Replace G92 threading with G76"
      why: string,          // "G76 supports multi-pass with chamfer + finish control"
      delta_score: number,  // expected improvement
      lever: string         // which lever (from cycle-time-levers memo)
    }, ...
  ],
  expected_delta_score: number,
  confidence: number
}
```

R12 fail-loud: if no improvements identified for an obviously-poor program, throw — the rubric scoring is bugged.

### Stage 5 — GENERATE (this unit)

Apply the ReasonReport recommendations to emit improved program text:

```ts
generate(originalProgram, reasonReport) → ProposedProgram {
  text: string,                  // new program text
  diff_from_original: string,    // unified diff
  changes_applied: [
    { lever, what, before_block_idx, after_block_idx }
  ],
  estimated_new_score: number,
  unapplied_recommendations: [], // ones we couldn't auto-apply
  needs_operator_review: boolean
}
```

R12 fail-loud: any recommendation requiring info the wizard doesn't have (e.g. "operator must confirm holder shank size") → mark unapplied + bubble to needs_operator_review.

## Engine wiring

```
LatheTrainingLoopEngine.runStage4_Reason(programReport, partSpec) → ReasonReport
  ├─ uses: LatheCAMIntelligenceEngine (vendor lookup, material fit)
  ├─ uses: LatheShopToolLibraryBridge (T-num resolution)
  ├─ uses: LatheCannedCycleDialectAdvisor (controller-aware suggestions)
  └─ uses: LatheCSSOptimizerEngine (speed/feed adjustments)

LatheTrainingLoopEngine.runStage5_Generate(originalProgram, reasonReport) → ProposedProgram
  ├─ uses: LathePostProcessor (controller-dialect-correct emission)
  └─ uses: LatheProgramAssembler (block sequencing + section ordering)
```

## Tests + R12 strategy

- 8-10 synthetic "amateur" program fixtures with known defects (no G50, single-tip, G92-threading, wrong DOC)
- For each, run runStage4_Reason → assert specific recommendations surface
- For each, run runStage5_Generate → assert specific blocks change
- R12 negative tests: an already-good program → reason returns empty recommendations + generate returns input unchanged + R12 fail-loud disabled-OR-explicit-no-change-flag

## Estimated scope

- runStage4_Reason: ~200 LOC + 5 helper subroutines
- runStage5_Generate: ~250 LOC + post-processor wiring
- Tests: ~400 LOC / 40 cases
- Total: ~850 LOC, ~5-6 hours

Largest of the 6 P0 units. Implement after all 5 dependencies land (shop-tool bridge, wizard vendor lookup, tribal query dispatcher, AB locator, canned-cycle dialect advisor).

## Stages 6-11 (companion unit U-LATHE-LOOP-STAGE-IMPL-6-TO-11 — P1)

- Stage 6 DIFF — operator-facing change-summary viewer
- Stage 7 OPERATOR_REVIEW — accept/reject UI hook
- Stage 8 LEARN — feed accepted/rejected decisions back to training data
- Stage 9 EMBED — vector-embed accepted recommendations (NN gate)
- Stage 10 WIKI_PROMOTE — promote validated patterns to wiki
- Stage 11 SYSTEM_VIZ_TICK — update lathe-domain roost graph

## Related

- [[reference_lathe_program_quality_rubric_2026_05_27]] — scoring foundation
- [[reference_lathe_cycle_time_levers_2026_05_27]] — improvement-direction map
- [[reference_shop_tool_library_bridge_design_2026_05_27]] — Stage-4 tool resolution
- [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — Stage-4 vendor lookup
- [[reference_lathe_canned_cycle_dialects_2026_05_27]] — Stage-5 controller-dialect output
- [[reference_insert_edge_rotation_strategy_2026_05_27]] — Stage-4 edge-rotation advice
- [[reference_lathe_tribal_query_dispatcher_design_2026_05_27]] — Stage-9 embed target
- `scripts/lathe-training-loop.mjs` — current skeleton
- `scripts/lathe-quality-pipeline.mjs` — Stage 1-3 already live
