---
name: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-parser-gcode-mode
description: Auto-distilled learnings from shipping HURCO-VM30I-FULL-PSN-MS0/U-HURCO-PARSER-GCODE-MODE (commit e47be0250). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.504Z
aliases: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-parser-gcode-mode
---


# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-PARSER-GCODE-MODE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-PARSER-GCODE-MODE (slot:echo iter9 2026-05-24): extend HurcoParserEngine for inline-G-code .hnc files. JM Die's production .hnc files are Fanuc-style (T#M6 + modal G1/G2/G3 motion, NOT WinMax conversational) - the existing canned-cycle classifier returned 0 ops for them. NEW _extractInlineGCodeOps fallback synthesizes one HurcoOperation per T#M6 boundary with full modal-state tracking (current motion mode persists across X/Y/Z-only blocks), captures coordinates + first-seen spindle/feed, classifies type from (STRATEGY:...) / (OPERATION:...) / (face mill) annotation comments. Guard fires only when mode is gcode/mixed AND no existing op carries coordinates AND no canned cycle (g_code!==null) - preserves existing G81/G83/etc detection AND conversational classifier paths. EXTENDED HurcoOperation interface with optional tool_number/spindle_rpm/feed_mm_min/axial_depth/radial_depth/end_line_number/coordinates fields (additive, no breakage to 14 existing V11 tests). 20/20 new tests PASS: happy path × 12 (2 segments, type classification, S/F capture, modal-state inheritance), 4 adversarial (no-tool / WinMax / empty-segment / malformed), 2 backward-compat (canned cycles still work + no fallback when they exist). Closes gap for JM Die roundtrip harness.

**Shipped:** 2026-05-24T21:58:22-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hurco-vm30i-full-psn-ms0-u-hurco-parser-gcode-mode]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._