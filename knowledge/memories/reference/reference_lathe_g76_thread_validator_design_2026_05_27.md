---
name: reference-lathe-g76-thread-validator-design-2026-05-27
description: Design notes for U-LATHE-G76-THREAD-VALIDATOR — dedicated threading-cycle validator. 4 of 11 ALCOA programs do threading (36%); current validators don't catch threading-specific defects.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.188Z
aliases: reference_lathe_g76_thread_validator_design_2026_05_27
---


# G76 thread-validator design

## Why this exists

ALCOA baseline (iter7): 4 of 11 programs do threading. Validators in `lathe-quality-pipeline.mjs` catch generic G-code errors but miss thread-specific class:
- Thread depth (P) vs pitch (F) incoherence
- Infeed angle (A) outside material-safe range
- Chamfer/lead-in length (`P` first 2 digits) inadequate
- Number of passes (P last 4 digits) too few for material
- Tap drill ID before threading vs major-OD before external threading

## Validation rules (each emits Issue{severity, kind, message, suggestion})

### Rule 1: Thread depth vs pitch coherence
Standard 60° UN/Metric thread: depth ≈ 0.6134 × pitch.
- G76 `P1300` (1.30mm depth) with `F2.0` (2.0mm pitch) → expected 0.6134 × 2.0 = 1.227mm → 1.30mm OK
- G76 `P3000` (3.0mm depth) with `F2.0` (2.0mm pitch) → DEPTH > PITCH → broken thread profile, P0 critical

### Rule 2: Infeed angle for material
60° UN external: A=29 (flank infeed) safe for steel; A=0 (radial infeed) risks chatter on lead-in.
- A29 for ISO-P / ISO-M / ISO-K → OK
- A29 for ISO-N (aluminum) → could be A0 (radial) at small pitch; not critical
- A0 for ISO-M (stainless) on long pitch → chatter risk → P1 warning

### Rule 3: Number of finishing passes (P last 2 digits)
For external 60° thread, conventional minimum passes by pitch:
- pitch ≤ 1.0: ≥4 passes
- 1.0 < pitch ≤ 2.0: ≥6 passes
- pitch > 2.0: ≥8 passes
G76 `P020060` means 02 chamfer + 00 hard-coded + 60 deg → followed by 6-digit form differs; need controller-aware parsing.

### Rule 4: Chamfer/lead-in (P first 2 digits — Fanuc 6-digit form)
P020060 = 2× pitch chamfer (suffix 0.2 mm × pitch unit). Bad: P000060 (0 chamfer → no insert lead-in → likely chipped insert).

### Rule 5: Tap-drill / pre-thread diameter sanity
Pair G76 with the preceding G71/G72 finish-pass:
- Internal thread: pre-bore ID ≈ major_OD − pitch (rule of thumb)
- External thread: pre-turn OD ≈ major_OD (full)
If preceding pass doesn't establish the pre-thread diameter, surface as P0 (thread will fail or cut chips).

### Rule 6: G92 deprecated when G76 available
G92 = single-pass thread block, controller iterates manually.
G76 = canned cycle, controller manages roughing + finish + chamfer.
G92 used when G76 was available → P1 (works but amateur).

### Rule 7: Threading at incorrect feed mode
G99 (feed per rev) is mandatory for threading. G98 (feed per minute) → P0 critical: at G98 0.5 IPM you'd never cut a thread because pitch sync is broken.

## Engine API

```ts
LatheG76ThreadValidator.validate(program: ParsedProgram, ctx: ValidationContext) → IssueReport {
  issues: Array<{
    rule: string,
    severity: "P0" | "P1" | "P2",
    block_index: number,
    thread_block_idx: number,
    actual: any,
    expected_range: any,
    message: string,
    suggestion: string  // controller-aware concrete fix
  }>,
  thread_block_count: number,
  all_passed: boolean
}
```

`ctx` provides `iso_group`, `controller`, `material_grade`.

## Wiring

- Called from `lathe-quality-pipeline.mjs validatePhysics` as a sub-validator
- Adds to `IssueReport` of the outer pipeline
- Score impact: each P0 → -25, P1 → -10, P2 → -3 (matches existing convention from iter6+iter8)

## Tests (hermetic)

25 cases minimum:
- One pass-clean program per controller (Fanuc/Haas/Okuma/Mazak with their thread syntax)
- One case per rule violation × 7 rules = 7 negative cases
- Edge cases: G33 (Okuma) thread, G92 thread, dual-thread on one part (both ID and OD), thread with chamfer, thread with taper
- Boundary cases at each rule threshold

## Estimated scope

- Engine: ~200 LOC
- Sub-routines per rule: ~50 LOC each × 7 = ~350 LOC supporting
- Tests: ~400 LOC / 30 cases
- Total: ~950 LOC, ~5 hours including tests

Note: thread validation needs controller-aware parsing (Fanuc 6-digit P000000 vs Mazak `D` codes vs Okuma `H D A K P` block) — depends on [[reference_lathe_canned_cycle_dialects_2026_05_27]] dialect map.

## Why this matters separately

Threading defects don't just cause cosmetic flaws — they cause:
- Stripped threads on assembly → field failure
- Cross-threading → fastener won't seat
- Chipped insert on first-pass infeed → broken tool + scrap part
- Crashed turret on too-aggressive entry on small thread

Each defect class P0 → no negotiation with a "warning that gets ignored". This validator must FAIL the program at quality-pipeline level, blocking the wizard from emitting it.

## Related

- [[reference_lathe_canned_cycle_dialects_2026_05_27]] — controller-aware syntax parsing
- [[reference_lathe_program_quality_rubric_2026_05_27]] — slots into Category D scoring
- [[reference_shop_tool_library_bridge_design_2026_05_27]] — insert-fit per material check
- [[reference_lathe_training_loop_stages_1_5_design_2026_05_27]] — Stage 4 calls this validator
- [[reference_whiskey_lathe_next_session_p0_implementation_roadmap_2026_05_27]] — Phase 3 position
- `scripts/lathe-quality-pipeline.mjs validatePhysics` — wiring target
