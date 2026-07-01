# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-BALANCED-SAMPLING — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-BALANCED-SAMPLING (slot:charlie /goal-yolo iter39): close iter38 2.67x->3x variance gap. Add --balance-by-class + walkArchiveBalanced (per-top-level walk replacing BFS-alphabetic-bias) + balanceByClass post-filter + extractTopLevelClass helper. 11/11 iter39 tests. LIVE: machine_class=mill:60+lathe:5+wire-edm:4 (FIRST 3-way variance), rate_range $85-$110, material_range $35-$60, time-bucket 4-way. Pipeline override spread $68.49->$399.01 = 5.83x SPREAD (smashes 3x target). Total iter9-39: 30 code units + 318 tests + 7 real findings.

**Commit:** `4f6a1c92fc16` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T05:49:01-05:00
**Tags:** quoting-synergy-ms0, u-qp-bootstrap-balanced-sampling, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-BALANCED-SAMPLING (slot:charlie /goal-yolo iter39): close iter38 2.67x->3x variance gap. Add --balance-by-class + walkArchiveBalanced (per-top-level walk replacing BFS-alphabetic-bias) + balanceByClass post-filter + extractTopLevelClass helper. 11/11 iter39 tests. LIVE: machine_class=mill:60+lathe:5+wire-edm:4 (FIRST 3-way variance), rate_range $85-$110, material_range $35-$60, time-bucket 4-way. Pipeline override spread $68.49->$399.01 = 5.83x SPREAD (smashes 3x target). Total iter9-39: 30 code units + 318 tests + 7 real findings.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-BALANCED-SAMPLING (slot:charlie /goal-yolo iter39): close iter38 2.67x->3x variance gap. Add --balance-by-class + walkArchiveBalanced (per-top-level walk replacing BFS-alphabetic-bias) + balanceByClass post-filter + extractTopLevelClass helper. 11/11 iter39 tests. LIVE: machine_class=mill:60+lathe:5+wire-edm:4 (FIRST 3-way variance), rate_range $85-$110, material_range $35-$60, time-bucket 4-way. Pipeline override spread $68.49->$399.01 = 5.83x SPREAD (smashes 3x target). Total iter9-39: 30 code units + 318 tests + 7 real findings.
```

## Files touched (5)
- .../quoting-baseline-bootstrap.balance.test.mjs    | 105 ++++
- scripts/quoting-baseline-bootstrap.mjs             |  82 ++-
- .../quoting/baseline-records-with-synth.json       | 619 ++++++++++++++-------
- state/shared/quoting/baseline-records.json         | 570 ++++++++++++-------
- 4 files changed, 979 insertions(+), 397 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4f6a1c92fc16`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._