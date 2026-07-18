---
name: tribal-jm-die-018
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "noze-test", "taper", "uv-axis", "4-axis", "5-pass", "e28xx", "benchmark"]
confidence: 88
source: "jm_die_production_analysis:NOZE_TEST"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-018.md
promoted_at: 2026-06-09T22:31:16.786Z
---

# JM Die NOZE TEST pattern — 4-axis UV taper benchmark program

The NOZE TEST.NC program is JM Die's benchmark for 4-axis taper cutting on the FA-20S. Pattern: 5-pass E2821-E2825 taper sequence, UV axis engaged, M90 adaptive through pass 4, M91 for final skim. This program demonstrates proper UV move synchronization where upper and lower contours follow different paths (e.g., smaller opening at top, larger at bottom for draft angle). Quality score: 88% (penalized only for missing some optional codes). Use NOZE TEST as the reference when programming new taper work — verify your UV coordinates produce the expected angle before running on customer parts.

**Category:** machining
**Confidence:** 88
**Source:** jm_die_production_analysis:NOZE_TEST
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-wedm-jmd-005|UV taper programs: set all H-register offsets to zero]]
