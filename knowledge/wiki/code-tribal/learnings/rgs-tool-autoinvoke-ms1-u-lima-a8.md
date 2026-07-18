# RGS-TOOL-AUTOINVOKE-MS1/U-LIMA-A8 — [MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-LIMA-A8 (slot:lima): cross-pipeline transfer-priors adapter

**Commit:** `23eb5cd88ba6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T20:54:52-05:00
**Tags:** rgs-tool-autoinvoke-ms1, u-lima-a8, auto-distilled

## Subject
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-LIMA-A8 (slot:lima): cross-pipeline transfer-priors adapter

## Body
```
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-LIMA-A8 (slot:lima): cross-pipeline transfer-priors adapter

Closes RGS-TOOL-AUTOINVOKE-MS1 P1 punch-list item #6 (the final A-series unit; LIMA-ROSTER now 8/8).

What ships:
  - scripts/lib/rgs-transfer-priors-adapter.mjs (NEW) — makeTransferPriorsOutcomes()
    wraps the planner's makeOutcomesReader. When a pipeline's own outcomes are
    {0,0,0} (cold-start), the wrapper aggregates outcomes from donor-cluster
    sibling pipelines and returns the Math.floor'd, default-0.5x-discounted
    aggregate. Own-signal ALWAYS wins. Async factory -> async closure. Eight
    pipeline clusters (mill, lathe, wedm, cam, cad, knowledge, review, build)
    with a fixed TRANSFER_PAIRS table (mill<->lathe<->cam, cad<->knowledge,
    review<->build; wedm has no donors — different physics).
  - scripts/lib/rgs-transfer-priors-adapter.test.mjs (NEW) — 37 cases including
    2 real-data E2E (live makeOutcomesReader + temp-ledger end-to-end).
  - scripts/rgs-tool-planner.mjs (modified) — default-wires the wrapper around
    makeOutcomesReader() in main(); PRISM_RGS_TRANSFER_PRIORS=0 kill switch.
    Mirrors A6 (PRISM_RGS_RIE_ADAPTER) and A7 (PRISM_RGS_CALIBRATION) exactly.
  - knowledge/wiki/architecture/rgs-transfer-priors-adapter.md (NEW) —
    architecture wiki: mechanism, pipeline-clusters table, why-Math.floor
    rationale, graceful degradation matrix, and the honest punch-list-naming-
    mismatch surfacing (R7).
  - state/shared/slot-task-queues.json — U-LIMA-A8-TRANSFER-PRIORS flipped
    pending -> completed, with completed_at + closed_by + shipped_note.

Key design lesson (R7 — surface conflicts):
  The punch-list named this unit using prism_ai:xproc_transfer_*, which is
  backed by CrossProcessTransferLearningEngine — a MATERIAL-cluster neural-
  weight-transfer engine, NOT a milestone or pipeline transfer engine. The
  actually-useful scope was at the PIPELINE-cluster level (where the planner's
  re-rank multiplier couples to outcomes). A8 ships at THAT scope; the wiki
  entry documents the mismatch rather than forcing the literal hint.

  Standing rule: when a punch-list names a tool that's a bad fit, surface the
  mismatch in the wiki, ship at the right scope, do not force the literal
  hint.

Verification:
  - 37 adapter unit tests PASS (36 cases + 1 honest skip when the outcomes
    ledger is absent — degenerate-before state).
  - 27/27 planner regression PASS (no contract change to rgs-tool-planner
    public API).
  - 9/9 signal-fusion regression PASS.
  - Per-file 2-reviewer scrutiny x3 files: adapter 2/2 PASS, test 2/2 PASS
    (Reviewer A flagged 2 augmentations on discount=0 and discount=-1
    differentiation — both applied), planner-wire 2/2 PASS.

LIMA-ROSTER now 8/8 complete. RGS-TOOL-AUTOINVOKE-MS1 P1 backlog item #6
closed.
```

## Files touched (6)
- .../architecture/rgs-transfer-priors-adapter.md    | 131 ++++++
- scripts/lib/rgs-transfer-priors-adapter.mjs        | 371 +++++++++++++++
- scripts/lib/rgs-transfer-priors-adapter.test.mjs   | 504 +++++++++++++++++++++
- scripts/rgs-tool-planner.mjs                       |  16 +-
- state/shared/slot-task-queues.json                 |   7 +-
- 5 files changed, 1026 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- lesson (R7 — surface conflicts):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 23eb5cd88ba6`
- Milestone envelope: `mcp-server/data/milestones/RGS-TOOL-AUTOINVOKE-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._