# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-JMDIE-ROUNDTRIP-HARNESS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-JMDIE-ROUNDTRIP-HARNESS (slot:echo iter8 2026-05-24): Phase-1 roundtrip harness against JM Die programs. scripts/hurco-jmdie-roundtrip-harness.mjs reads representative .hnc, parses via HurcoParserEngine, re-emits via V11.generateProgramWithFullPSN(), diffs line counts + first-50 match + PSN enrichment, writes report.{json,md} + reemit/*.hnc for operator WinMax validation. FINDING: harness ran clean but HurcoParserEngine.operations is empty for all 3 JM Die files - parser does not recognize inline-G-code .hnc format (their files are Fanuc-style with comment-block tool sections + Hurco UltiMotion M16 macros, not WinMax conversational blocks). Documented in report. Next unit U-HURCO-PARSER-GCODE-MODE will extend parser to detect T# M6 tool-change boundaries as operation seams. Operator can still test V11 emit TODAY using 10 pre-shipped .hnc artifacts in state/shared/hurco-winmax-proveout/.

**Commit:** `fcc434a315da` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T21:04:15-05:00
**Tags:** hurco-vm30i-full-psn-ms0, u-hurco-jmdie-roundtrip-harness, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-JMDIE-ROUNDTRIP-HARNESS (slot:echo iter8 2026-05-24): Phase-1 roundtrip harness against JM Die programs. scripts/hurco-jmdie-roundtrip-harness.mjs reads representative .hnc, parses via HurcoParserEngine, re-emits via V11.generateProgramWithFullPSN(), diffs line counts + first-50 match + PSN enrichment, writes report.{json,md} + reemit/*.hnc for operator WinMax validation. FINDING: harness ran clean but HurcoParserEngine.operations is empty for all 3 JM Die files - parser does not recognize inline-G-code .hnc format (their files are Fanuc-style with comment-block tool sections + Hurco UltiMotion M16 macros, not WinMax conversational blocks). Documented in report. Next unit U-HURCO-PARSER-GCODE-MODE will extend parser to detect T# M6 tool-change boundaries as operation seams. Operator can still test V11 emit TODAY using 10 pre-shipped .hnc artifacts in state/shared/hurco-winmax-proveout/.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-JMDIE-ROUNDTRIP-HARNESS (slot:echo iter8 2026-05-24): Phase-1 roundtrip harness against JM Die programs. scripts/hurco-jmdie-roundtrip-harness.mjs reads representative .hnc, parses via HurcoParserEngine, re-emits via V11.generateProgramWithFullPSN(), diffs line counts + first-50 match + PSN enrichment, writes report.{json,md} + reemit/*.hnc for operator WinMax validation. FINDING: harness ran clean but HurcoParserEngine.operations is empty for all 3 JM Die files - parser does not recognize inline-G-code .hnc format (their files are Fanuc-style with comment-block tool sections + Hurco UltiMotion M16 macros, not WinMax conversational blocks). Documented in report. Next unit U-HURCO-PARSER-GCODE-MODE will extend parser to detect T# M6 tool-change boundaries as operation seams. Operator can still test V11 emit TODAY using 10 pre-shipped .hnc artifacts in state/shared/hurco-winmax-proveout/.
```

## Files touched (4)
- scripts/hurco-jmdie-roundtrip-harness.mjs      | 268 +++++++++++++++++++++++++
- state/shared/hurco-jmdie-roundtrip-report.json | 126 ++++++++++++
- state/shared/hurco-jmdie-roundtrip-report.md   |  23 +++
- 3 files changed, 417 insertions(+)

## Lessons surfaced in commit body
- till test V11 emit TODAY using 10 pre-shipped .hnc artifacts in state/shared/hurco-winmax-proveout/.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fcc434a315da`
- Milestone envelope: `mcp-server/data/milestones/HURCO-VM30I-FULL-PSN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._