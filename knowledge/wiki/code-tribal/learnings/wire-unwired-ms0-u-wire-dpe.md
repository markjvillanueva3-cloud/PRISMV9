# WIRE-UNWIRED-MS0/U-WIRE-DPE — wire DocPropagationEngine into prism_dev (3 actions)

**Commit:** `56b85124f865` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T04:56:46-05:00
**Tags:** wire-unwired-ms0, u-wire-dpe, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-DPE: wire DocPropagationEngine into prism_dev (3 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-DPE: wire DocPropagationEngine into prism_dev (3 actions)

Pure deterministic doc-cascade classifier — file path → regen targets.
No I/O, no mutation; rule scan only.

- doc_propagation_classify: single path → matched rules + targets
- doc_propagation_classify_batch: ≤500 paths in one shot
- doc_propagation_get_rules: serializable rule metadata
  (id + reason + targets; `match` predicate omitted)

DEFERRED: mergeTargets() — composition helper whose input shape
(ClassificationResult[]) is too complex to safely round-trip without
bespoke schema mirroring. Callers can dedupe client-side after batch.

Wire-safety doctrine:
- DoS guards: ≤4096-char path, ≤500-path batch
- matched_count / target_count / input_count / total_targets exposed
  alongside potentially-empty arrays (slimResponse strips empty:[])
- get_rules strips the `match: (p) => boolean` function literal
  (function literals don't survive JSON round-trip)

Tests: 15/15 PASS (5 schema gates incl. DoS bounds + 2 ROUTING PROOF
byte-equal + VARIABILITY across path classes + explicit `match` absence
assertion + 2 schema-reject envelope checks).
```

## Files touched (4)
- .../__tests__/dispatcher.docPropagation.test.ts    | 188 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  23 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  47 +++++-
- 3 files changed, 257 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 56b85124f865`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._