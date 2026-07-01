# JM-DIE-LATHE-UPGRADE-MS0/U-GCANALYZER-OKUMA-START-BLOCK — [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-OKUMA-START-BLOCK (slot:whiskey iter17): okuma controller safe-start drops mill-centric codes (G80/G40/G49/G17) — keeps only G90 absolute positioning (universally required). [BOOTSTRAP-SLOT-ENFORCE]. Okuma OSP-controller lathes default-init to G90+G40+lathe-mode at power-on — Fanuc mill subset (G80 canned cancel, G49 tool offset cancel, G17 XY plane) is dialect-inappropriate for lathe programs. Cuts HIGH-18 false-positive rate 5x on JM Die corpus (5 missing codes per program → 1). Remaining G90 finding is honest lint (declare-explicit-default-state). Follow-up: U-OKUMA-LATHE-G50-CHECK adds dedicated G50 max-RPM-clamp rule.

**Commit:** `ab0a6e0f9c33` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T17:57:57-05:00
**Tags:** jm-die-lathe-upgrade-ms0, u-gcanalyzer-okuma-start-block, auto-distilled

## Subject
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-OKUMA-START-BLOCK (slot:whiskey iter17): okuma controller safe-start drops mill-centric codes (G80/G40/G49/G17) — keeps only G90 absolute positioning (universally required). [BOOTSTRAP-SLOT-ENFORCE]. Okuma OSP-controller lathes default-init to G90+G40+lathe-mode at power-on — Fanuc mill subset (G80 canned cancel, G49 tool offset cancel, G17 XY plane) is dialect-inappropriate for lathe programs. Cuts HIGH-18 false-positive rate 5x on JM Die corpus (5 missing codes per program → 1). Remaining G90 finding is honest lint (declare-explicit-default-state). Follow-up: U-OKUMA-LATHE-G50-CHECK adds dedicated G50 max-RPM-clamp rule.

## Body
```
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-OKUMA-START-BLOCK (slot:whiskey iter17): okuma controller safe-start drops mill-centric codes (G80/G40/G49/G17) — keeps only G90 absolute positioning (universally required). [BOOTSTRAP-SLOT-ENFORCE]. Okuma OSP-controller lathes default-init to G90+G40+lathe-mode at power-on — Fanuc mill subset (G80 canned cancel, G49 tool offset cancel, G17 XY plane) is dialect-inappropriate for lathe programs. Cuts HIGH-18 false-positive rate 5x on JM Die corpus (5 missing codes per program → 1). Remaining G90 finding is honest lint (declare-explicit-default-state). Follow-up: U-OKUMA-LATHE-G50-CHECK adds dedicated G50 max-RPM-clamp rule.
```

## Files touched (2)
- .../src/engines/GCodeSafetyAnalyzerEngine.ts       | 23 ++++++++++++++++++++--
- 1 file changed, 21 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ab0a6e0f9c33`
- Milestone envelope: `mcp-server/data/milestones/JM-DIE-LATHE-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._