---
name: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-jmdie-roundtrip-harness
description: Auto-distilled learnings from shipping HURCO-VM30I-FULL-PSN-MS0/U-HURCO-JMDIE-ROUNDTRIP-HARNESS (commit fcc434a31). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.503Z
aliases: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-jmdie-roundtrip-harness
---


# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-JMDIE-ROUNDTRIP-HARNESS

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-JMDIE-ROUNDTRIP-HARNESS (slot:echo iter8 2026-05-24): Phase-1 roundtrip harness against JM Die programs. scripts/hurco-jmdie-roundtrip-harness.mjs reads representative .hnc, parses via HurcoParserEngine, re-emits via V11.generateProgramWithFullPSN(), diffs line counts + first-50 match + PSN enrichment, writes report.{json,md} + reemit/*.hnc for operator WinMax validation. FINDING: harness ran clean but HurcoParserEngine.operations is empty for all 3 JM Die files - parser does not recognize inline-G-code .hnc format (their files are Fanuc-style with comment-block tool sections + Hurco UltiMotion M16 macros, not WinMax conversational blocks). Documented in report. Next unit U-HURCO-PARSER-GCODE-MODE will extend parser to detect T# M6 tool-change boundaries as operation seams. Operator can still test V11 emit TODAY using 10 pre-shipped .hnc artifacts in state/shared/hurco-winmax-proveout/.

**Shipped:** 2026-05-24T21:04:15-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[hurco-vm30i-full-psn-ms0-u-hurco-jmdie-roundtrip-harness]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._