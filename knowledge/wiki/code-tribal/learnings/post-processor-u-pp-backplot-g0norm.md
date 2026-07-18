# POST-PROCESSOR/U-PP-BACKPLOT-G0NORM — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-BACKPLOT-G0NORM (slot:echo): fix dead backplot gouge + rapid-into-material detection (G0-normalization bug) + 72-test companion

**Commit:** `8f4787223730` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T12:11:52-05:00
**Tags:** post-processor, u-pp-backplot-g0norm, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-BACKPLOT-G0NORM (slot:echo): fix dead backplot gouge + rapid-into-material detection (G0-normalization bug) + 72-test companion

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-BACKPLOT-G0NORM (slot:echo): fix dead backplot gouge + rapid-into-material detection (G0-normalization bug) + 72-test companion

ROOT CAUSE (surfaced by writing the PostValidationSuiteEngine companion test): parseGCode normalized the motion word with `modal_motion.replace(/^G0*/, "G")`, which collapses "G0"/"G00" -> "G" (NOT "G0"). So `is_rapid = (norm === "G0")` was STRUCTURALLY ALWAYS FALSE, and `is_cutting = !is_rapid` ALWAYS TRUE. Consequences in runBackplot:
- min_cutting_z included EVERY move (all classified cutting) -> no move could ever be below it by >0.05mm -> `gouge_detected` was UNREACHABLE (always false).
- `rapid_into_material` requires is_rapid -> also UNREACHABLE (always false).
Both safety checks were dead: a gouging / rapid-into-stock optimised program wrongly "passed" backplot, and BP-001 (the backplot gouge error) could never fire.

FIX: normalize by numeric value -- `const motionNum = parseInt(modal_motion.slice(1),10); norm = isNaN ? modal_motion : "G"+motionNum` -> "G0"/"G00"->"G0" (rapid), "G01"->"G1" (cutting), "G2"->"G2" (arc). Restores both detectors.

VALIDATION: 72/72 companion tests green, including 3 that now PROVE the detectors fire (a G0 rapid 0.5mm below the G1 cutting floor -> gouge_detected=true + BP-001 emitted; a G0 to Z<0 inside the cut XY zone -> rapid_into_material=true) and corrected move-count tests (OPT_GCODE: 2 G0 rapids + 2 G1 cutting, was mis-counted 0/4). Blast radius fully contained to this engine (no external importer); U05/consistency/regression unaffected (G0 time cancels in orig-vs-opt diffs). No 3-of-3 this pass (5h session ceiling) -- fix is a parse-correctness change proven by the now-passing safety tests.
```

## Files touched (3)
- mcp-server/src/__tests__/PostValidationSuiteEngine.test.ts | 770 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/PostValidationSuiteEngine.ts        |   7 +-
- 2 files changed, 776 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrongly "passed" backplot, and BP-001 (the backplot gouge error) could never fire.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8f4787223730`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._