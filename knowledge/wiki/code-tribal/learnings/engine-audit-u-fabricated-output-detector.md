# ENGINE-AUDIT/U-FABRICATED-OUTPUT-DETECTOR — [MAIN-FORCE] [ENGINE-AUDIT]/U-FABRICATED-OUTPUT-DETECTOR (slot:bravo): automated fabricated-output detector + ratchet baseline + 8th defect FIXED (found by the detector)

**Commit:** `72c1f868f38d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T14:56:28-05:00
**Tags:** engine-audit, u-fabricated-output-detector, auto-distilled

## Subject
[MAIN-FORCE] [ENGINE-AUDIT]/U-FABRICATED-OUTPUT-DETECTOR (slot:bravo): automated fabricated-output detector + ratchet baseline + 8th defect FIXED (found by the detector)

## Body
```
[MAIN-FORCE] [ENGINE-AUDIT]/U-FABRICATED-OUTPUT-DETECTOR (slot:bravo): automated fabricated-output detector + ratchet baseline + 8th defect FIXED (found by the detector)

Codifies the manual fabricated-output sweep into a re-runnable guard (bravo =
stub-hunting charter):
 - scripts/audit-fabricated-output.mjs: pure scanSource/classifyHit core + CLI
   (report / --json / --guard / --write-baseline). Detects hardcoded numeric
   literals assigned with an estimate-marker comment; classifies parser-state /
   material-branched / if-not-specified idiom as benign, cost/time/volume literals
   in cost-bearing engines as review. CANDIDATE surfacer (regex, not a flow prover).
 - scripts/audit-fabricated-output.test.mjs: 6 node:test cases -- all 7 real
   fixed-defect patterns detected + the real benign idioms classified benign +
   0/1-toggle + empty/multiline edge cases. 6/6 PASS.
 - state/shared/fabricated-output-baseline.json: 38-key acknowledged candidate
   backlog (RATCHET, explicitly NOT a clean bill of health); --guard fails on NEW
   keys only -> prevents adding fabrications without forcing the backlog cleared.
 - 8th REAL defect FIXED (detector-found): LatheOpusReasoningEngine.buildOperationSequence
   estimatedVolume=1000 Placeholder -> real geometry-derived stock volume (pi/4*(bar_od^2-
   finished_od^2)*length split per op), guarded fallback; was fabricating returned
   estimated_time_sec + estimated_cost. +1 regression test (bigger stock -> longer time;
   pre-fix constant 1000 made them equal). LatheOpus 54/54 PASS, tsc clean.
G-code/post/safety layer (169 engines) swept: ZERO silent fabrications (proper
default-if-absent/parser-state/material-branched idiom) -- recorded in the audit report.
```

## Files touched (7)
- .../src/__tests__/engines/LatheOpusReasoningEngine.test.ts       |  26 +++++
- mcp-server/src/engines/LatheOpusReasoningEngine.ts               |  15 ++-
- scripts/audit-fabricated-output.mjs                              | 157 +++++++++++++++++++++++++++++
- scripts/audit-fabricated-output.test.mjs                         |  71 +++++++++++++
- state/shared/fabricated-output-baseline.json                     |  45 +++++++++
- state/shared/specs/ENGINE-ALGORITHM-FORMULA-AUDIT-2026-06-19.md  |   4 +
- 6 files changed, 317 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tiline edge cases. 6/6 PASS.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 72c1f868f38d`
- Milestone envelope: `mcp-server/data/milestones/ENGINE-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._