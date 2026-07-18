# BLUEPRINT-OCR-TRAINING-MS2/U-TDP06 — [MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP06: CNC-derived ground truth — presence-only GT from G-code corpus

**Commit:** `01e59ad58ac6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T20:40:02-05:00
**Tags:** blueprint-ocr-training-ms2, u-tdp06, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP06: CNC-derived ground truth — presence-only GT from G-code corpus

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP06: CNC-derived ground truth — presence-only GT from G-code corpus

CNC half of "compare to cad files AND cnc programs to determine if you
extracted the correct data" (CAD half = U-TDP05).

PRESENCE-ONLY by design (R12): a correct CNC nominal needs modal G90/G91 +
R-plane pairing + diameter/radius mode + datum — none recoverable from raw
text. The lib emits feature-KIND presence only, matching the proven CAD
half and the benchmark's allGtPresenceOnly grading path.

3 files: cnc-ground-truth-lib.mjs (pure: tokenizeNc w/ Math.trunc G-codes,
evidenceFromNcOps 3-kind vocab + modal canned-cycle latch + G96-only lathe
gate), .test.mjs (35 node:test incl. 2 benchmark-integration), and
cnc-ground-truth-build.mjs CLI (bounded walk, atomic per-class GT JSON).

Per-file scrutiny: lib+test 2-reviewer PASS round 2 (round 1 FAIL caught a
P0 nominal/nominal_mm benchmark-seam break -> rewrite to presence-only).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/cnc-ground-truth-build.mjs        | 210 ++++++++++++++++++++
- scripts/lib/cnc-ground-truth-lib.mjs      | 261 ++++++++++++++++++++++++
- scripts/lib/cnc-ground-truth-lib.test.mjs | 319 ++++++++++++++++++++++++++++++
- 3 files changed, 790 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 01e59ad58ac6`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._