# OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-VC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC (slot:oscar): close the #1 inert-axis gap — SFC now differentiates tool material in Vc. Was: carbide≡HSS≡ceramic (UltimateSpeedFeedEngine:2081 had no tool-material term). Now: canonical CANONICAL_TOOL_MATERIAL_SPEED_FACTOR (physics/constants.ts, cited Machinery's Handbook/Sandvik, clamped 0.3-3.0, fail-safe→carbide) scales the carbide-anchored base Vc. HSS 0.35x (SAFER — was over-speeding ~3x), carbide 1.0 (gauntlet identity, 52/52 preserved), ceramic/cbn/pcd 2.5x (aggressive dir, backed by downstream RPM cap + S(x) gate). 9/9 new tests incl HSS<carbide<ceramic integration proof. SAFETY: changes recommended Vc → flagged for physics-reviewer/S(x)

**Commit:** `134895d848db` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T08:43:20-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-toolmat-vc, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC (slot:oscar): close the #1 inert-axis gap — SFC now differentiates tool material in Vc. Was: carbide≡HSS≡ceramic (UltimateSpeedFeedEngine:2081 had no tool-material term). Now: canonical CANONICAL_TOOL_MATERIAL_SPEED_FACTOR (physics/constants.ts, cited Machinery's Handbook/Sandvik, clamped 0.3-3.0, fail-safe→carbide) scales the carbide-anchored base Vc. HSS 0.35x (SAFER — was over-speeding ~3x), carbide 1.0 (gauntlet identity, 52/52 preserved), ceramic/cbn/pcd 2.5x (aggressive dir, backed by downstream RPM cap + S(x) gate). 9/9 new tests incl HSS<carbide<ceramic integration proof. SAFETY: changes recommended Vc → flagged for physics-reviewer/S(x)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC (slot:oscar): close the #1 inert-axis gap — SFC now differentiates tool material in Vc. Was: carbide≡HSS≡ceramic (UltimateSpeedFeedEngine:2081 had no tool-material term). Now: canonical CANONICAL_TOOL_MATERIAL_SPEED_FACTOR (physics/constants.ts, cited Machinery's Handbook/Sandvik, clamped 0.3-3.0, fail-safe→carbide) scales the carbide-anchored base Vc. HSS 0.35x (SAFER — was over-speeding ~3x), carbide 1.0 (gauntlet identity, 52/52 preserved), ceramic/cbn/pcd 2.5x (aggressive dir, backed by downstream RPM cap + S(x) gate). 9/9 new tests incl HSS<carbide<ceramic integration proof. SAFETY: changes recommended Vc → flagged for physics-reviewer/S(x)
```

## Files touched (3)
- scripts/knowledge-link-audit.mjs      | 28 ++++++++++++++++++--
- scripts/knowledge-link-audit.test.mjs | 48 ++++++++++++++++++++++++++++++++++-
- 2 files changed, 73 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 134895d848db`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._