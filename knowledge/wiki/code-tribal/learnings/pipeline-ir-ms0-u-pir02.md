# PIPELINE-IR-MS0/U-PIR02 — [MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [PIPELINE-IR-MS0]/U-PIR02 (slot:bravo): Pipeline IR converter -- topo-sort + cycle/dangling/self/dup detection

**Commit:** `b54ebe0d3137` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T13:11:05-05:00
**Tags:** pipeline-ir-ms0, u-pir02, auto-distilled

## Subject
[MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [PIPELINE-IR-MS0]/U-PIR02 (slot:bravo): Pipeline IR converter -- topo-sort + cycle/dangling/self/dup detection

## Body
```
[MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [PIPELINE-IR-MS0]/U-PIR02 (slot:bravo): Pipeline IR converter -- topo-sort + cycle/dangling/self/dup detection

PipelineIRConverterEngine.convert(raw) -> discriminated {ok:true, ir, order} | {ok:false, errors[]}:
- schema gate (collects issues, no throw) + duplicate-stage-id + dangling-dependsOn + dangling param/condition ref + self-dependency
- Kahn topological sort (declaration-order-stable); residue = cycle error with members
- returns the FULL error list (validation outcomes are data, not first-throw)
13/13 vitest: topo-order invariant (every stage after its deps) + 4 pipeline shapes (print-to-program/single/diamond/two-chains) + 2/3-cycle + dangling dep/ref + self-dep + dup-id + schema-fail + null-adversarial + multi-error. Engine-layer (graph machinery); U-PIR03 executor + dispatcher wiring next.
```

## Files touched (4)
- mcp-server/data/milestones/PIPELINE-IR-MS0.json            |  14 +++++++++---
- mcp-server/src/__tests__/PipelineIRConverterEngine.test.ts | 120 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/PipelineIRConverterEngine.ts        | 139 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 270 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b54ebe0d3137`
- Milestone envelope: `mcp-server/data/milestones/PIPELINE-IR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._