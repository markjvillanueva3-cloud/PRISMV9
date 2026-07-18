# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-FILTER-EXTEND-V2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-FILTER-EXTEND-V2 (slot:charlie /goal-yolo iter35): extend iter9 NON_CUSTOMER_SUBDIRS regex with explicit alternates for PRISM[\s_-]?MODIFIED + HURCO[\s_-]?+ PROGRAMS? — catches iter34-surfaced noise patterns. Conservative approach preserves whole-segment anchors so customer names containing noise-substrings (ALCOA POST OFFICE, DOC HOLLIDAY, POSTAL SERVICES, PROGRAMA, MANUAL DEXTERITY CORP) still accepted. 18/18 tests PASS (14 iter9 anti-regression + 4 iter35 new — anti-false-positive + 2 path-extract layered + 1 reject set). Confirmed on live --scan-archive run: top-customers shifted from {PRISM MODIFIED POST PROCESSORS:15, HURCO CNC PROGRAMS:15} to {MATTHEW programs:29, PRISM CAD TESTING:1}. Time bucket variance still 3-way (iter13 working). Closes iter34 follow-up F1; F2 layout audit (U-QP-JM-DIE-LAYOUT-AUDIT, P2) still deferred. Total iter9-35: 26 code units + 8 doc surfaces + 285 verified tests + 4 documented real findings + ITERATIVE FILTER REFINEMENT proven.

**Commit:** `848e0107ab21` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T05:00:13-05:00
**Tags:** quoting-synergy-ms0, u-qp-bootstrap-filter-extend-v2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-FILTER-EXTEND-V2 (slot:charlie /goal-yolo iter35): extend iter9 NON_CUSTOMER_SUBDIRS regex with explicit alternates for PRISM[\s_-]?MODIFIED + HURCO[\s_-]?+ PROGRAMS? — catches iter34-surfaced noise patterns. Conservative approach preserves whole-segment anchors so customer names containing noise-substrings (ALCOA POST OFFICE, DOC HOLLIDAY, POSTAL SERVICES, PROGRAMA, MANUAL DEXTERITY CORP) still accepted. 18/18 tests PASS (14 iter9 anti-regression + 4 iter35 new — anti-false-positive + 2 path-extract layered + 1 reject set). Confirmed on live --scan-archive run: top-customers shifted from {PRISM MODIFIED POST PROCESSORS:15, HURCO CNC PROGRAMS:15} to {MATTHEW programs:29, PRISM CAD TESTING:1}. Time bucket variance still 3-way (iter13 working). Closes iter34 follow-up F1; F2 layout audit (U-QP-JM-DIE-LAYOUT-AUDIT, P2) still deferred. Total iter9-35: 26 code units + 8 doc surfaces + 285 verified tests + 4 documented real findings + ITERATIVE FILTER REFINEMENT proven.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-FILTER-EXTEND-V2 (slot:charlie /goal-yolo iter35): extend iter9 NON_CUSTOMER_SUBDIRS regex with explicit alternates for PRISM[\s_-]?MODIFIED + HURCO[\s_-]?+ PROGRAMS? — catches iter34-surfaced noise patterns. Conservative approach preserves whole-segment anchors so customer names containing noise-substrings (ALCOA POST OFFICE, DOC HOLLIDAY, POSTAL SERVICES, PROGRAMA, MANUAL DEXTERITY CORP) still accepted. 18/18 tests PASS (14 iter9 anti-regression + 4 iter35 new — anti-false-positive + 2 path-extract layered + 1 reject set). Confirmed on live --scan-archive run: top-customers shifted from {PRISM MODIFIED POST PROCESSORS:15, HURCO CNC PROGRAMS:15} to {MATTHEW programs:29, PRISM CAD TESTING:1}. Time bucket variance still 3-way (iter13 working). Closes iter34 follow-up F1; F2 layout audit (U-QP-JM-DIE-LAYOUT-AUDIT, P2) still deferred. Total iter9-35: 26 code units + 8 doc surfaces + 285 verified tests + 4 documented real findings + ITERATIVE FILTER REFINEMENT proven.
```

## Files touched (4)
- scripts/quoting-baseline-bootstrap.filter.test.mjs |  63 +++++
- scripts/quoting-baseline-bootstrap.mjs             |   6 +-
- state/shared/quoting/baseline-records.json         | 286 ++++++++++-----------
- 3 files changed, 211 insertions(+), 144 deletions(-)

## Lessons surfaced in commit body
- till accepted. 18/18 tests PASS (14 iter9 anti-regression + 4 iter35 new — anti-false-positive + 2 path-extract layered + 1 reject set). Confirmed on live --scan-archive run: top-customers shifted from {PRISM MODIFIED POST PROCESSORS:15, HURCO CNC PROGRAMS:15} to {MATTHEW programs:29, PRISM CAD TESTING:1}. Time bucket variance still 3-way (iter13 working). Closes iter34 follow-up F1; F2 layout audit
- till deferred. Total iter9-35: 26 code units + 8 doc surfaces + 285 verified tests + 4 documented real findings + ITERATIVE FILTER REFINEMENT proven.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 848e0107ab21`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._