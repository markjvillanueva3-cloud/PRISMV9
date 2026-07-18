# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-PARSER-GCODE-MODE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-PARSER-GCODE-MODE (slot:echo iter9 2026-05-24): extend HurcoParserEngine for inline-G-code .hnc files. JM Die's production .hnc files are Fanuc-style (T#M6 + modal G1/G2/G3 motion, NOT WinMax conversational) - the existing canned-cycle classifier returned 0 ops for them. NEW _extractInlineGCodeOps fallback synthesizes one HurcoOperation per T#M6 boundary with full modal-state tracking (current motion mode persists across X/Y/Z-only blocks), captures coordinates + first-seen spindle/feed, classifies type from (STRATEGY:...) / (OPERATION:...) / (face mill) annotation comments. Guard fires only when mode is gcode/mixed AND no existing op carries coordinates AND no canned cycle (g_code!==null) - preserves existing G81/G83/etc detection AND conversational classifier paths. EXTENDED HurcoOperation interface with optional tool_number/spindle_rpm/feed_mm_min/axial_depth/radial_depth/end_line_number/coordinates fields (additive, no breakage to 14 existing V11 tests). 20/20 new tests PASS: happy path × 12 (2 segments, type classification, S/F capture, modal-state inheritance), 4 adversarial (no-tool / WinMax / empty-segment / malformed), 2 backward-compat (canned cycles still work + no fallback when they exist). Closes gap for JM Die roundtrip harness.

**Commit:** `e47be0250464` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T21:58:22-05:00
**Tags:** hurco-vm30i-full-psn-ms0, u-hurco-parser-gcode-mode, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-PARSER-GCODE-MODE (slot:echo iter9 2026-05-24): extend HurcoParserEngine for inline-G-code .hnc files. JM Die's production .hnc files are Fanuc-style (T#M6 + modal G1/G2/G3 motion, NOT WinMax conversational) - the existing canned-cycle classifier returned 0 ops for them. NEW _extractInlineGCodeOps fallback synthesizes one HurcoOperation per T#M6 boundary with full modal-state tracking (current motion mode persists across X/Y/Z-only blocks), captures coordinates + first-seen spindle/feed, classifies type from (STRATEGY:...) / (OPERATION:...) / (face mill) annotation comments. Guard fires only when mode is gcode/mixed AND no existing op carries coordinates AND no canned cycle (g_code!==null) - preserves existing G81/G83/etc detection AND conversational classifier paths. EXTENDED HurcoOperation interface with optional tool_number/spindle_rpm/feed_mm_min/axial_depth/radial_depth/end_line_number/coordinates fields (additive, no breakage to 14 existing V11 tests). 20/20 new tests PASS: happy path × 12 (2 segments, type classification, S/F capture, modal-state inheritance), 4 adversarial (no-tool / WinMax / empty-segment / malformed), 2 backward-compat (canned cycles still work + no fallback when they exist). Closes gap for JM Die roundtrip harness.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-PARSER-GCODE-MODE (slot:echo iter9 2026-05-24): extend HurcoParserEngine for inline-G-code .hnc files. JM Die's production .hnc files are Fanuc-style (T#M6 + modal G1/G2/G3 motion, NOT WinMax conversational) - the existing canned-cycle classifier returned 0 ops for them. NEW _extractInlineGCodeOps fallback synthesizes one HurcoOperation per T#M6 boundary with full modal-state tracking (current motion mode persists across X/Y/Z-only blocks), captures coordinates + first-seen spindle/feed, classifies type from (STRATEGY:...) / (OPERATION:...) / (face mill) annotation comments. Guard fires only when mode is gcode/mixed AND no existing op carries coordinates AND no canned cycle (g_code!==null) - preserves existing G81/G83/etc detection AND conversational classifier paths. EXTENDED HurcoOperation interface with optional tool_number/spindle_rpm/feed_mm_min/axial_depth/radial_depth/end_line_number/coordinates fields (additive, no breakage to 14 existing V11 tests). 20/20 new tests PASS: happy path × 12 (2 segments, type classification, S/F capture, modal-state inheritance), 4 adversarial (no-tool / WinMax / empty-segment / malformed), 2 backward-compat (canned cycles still work + no fallback when they exist). Closes gap for JM Die roundtrip harness.
```

## Files touched (3)
- .../src/__tests__/HurcoParserInlineGCode.test.ts   | 217 +++++++++++++++++++++
- mcp-server/src/engines/HurcoParserEngine.ts        | 204 +++++++++++++++++++
- 2 files changed, 421 insertions(+)

## Lessons surfaced in commit body
- till work + no fallback when they exist). Closes gap for JM Die roundtrip harness.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e47be0250464`
- Milestone envelope: `mcp-server/data/milestones/HURCO-VM30I-FULL-PSN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._