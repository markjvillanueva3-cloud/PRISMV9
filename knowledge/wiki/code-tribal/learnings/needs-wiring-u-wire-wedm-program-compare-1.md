# NEEDS-WIRING/U-WIRE-WEDM-PROGRAM-COMPARE-1 — [MAIN] [NEEDS-WIRING]/U-WIRE-WEDM-PROGRAM-COMPARE-1 (slot:charlie): wire WEDMProgramComparisonEngine

**Commit:** `26da291efc6a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T17:54:19-05:00
**Tags:** needs-wiring, u-wire-wedm-program-compare-1, auto-distilled

## Subject
[MAIN] [NEEDS-WIRING]/U-WIRE-WEDM-PROGRAM-COMPARE-1 (slot:charlie): wire WEDMProgramComparisonEngine

## Body
```
[MAIN] [NEEDS-WIRING]/U-WIRE-WEDM-PROGRAM-COMPARE-1 (slot:charlie): wire WEDMProgramComparisonEngine

Wires the program-improvement-loop linchpin into prism_edm as
wedm_program_compare. The engine parses a real-shop reference WEDM NC
program and a PRISM-generated one and emits a per-parameter deviation
report + weighted match score + production_ready gate (overall_match
>= 0.85 AND no critical deviations).

Operator value: this is the comparison primitive for the queued /goal
phase 3 (improve all existing JM Die wire-EDM programs by diffing
shop programs against wizard output).

Changes:
  - edmActionSchemas.ts: wedm_program_compare Zod schema + map registration
  - edmDispatcher.ts: enum entry + case handler (positional-args
    destructure: compare(reference_nc, generated_nc, options))
  - WEDMProgramCompareWiring.test.ts (NEW): 9 tests (wiring registration,
    schema accept/reject, engine round-trip with identical-input baseline
    100% match, filename-pass-through, determinism)

Build: tsc clean. Tests: 9/9 pass. Per-file scrutiny SKIPPED this iter
per documented YELLOW-budget trade-off (61% ctx) — wiring template is
established from 5 prior units this session; engine is a 392-line pure
parser-driven comparator with internal validation. 3-of-3 deferred to
next post-/compact iter per iter-13/14 precedent.

Sets up phase 3 of the operator's queued wire-EDM wizard goal: feed
reference programs from JM DIE/WIRE EDM/ into the wizard, compare via
this action, surface deviations as training-corpus signal for phase 4.
```

## Files touched (4)
- .../src/__tests__/WEDMProgramCompareWiring.test.ts | 115 +++++++++++++++++++++
- mcp-server/src/schemas/edmActionSchemas.ts         |  38 +++++++
- mcp-server/src/tools/dispatchers/edmDispatcher.ts  |  27 +++++
- 3 files changed, 180 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 26da291efc6a`
- Milestone envelope: `mcp-server/data/milestones/NEEDS-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._