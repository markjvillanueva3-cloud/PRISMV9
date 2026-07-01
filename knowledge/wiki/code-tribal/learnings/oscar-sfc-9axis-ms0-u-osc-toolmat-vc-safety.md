# OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-VC-SAFETY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC-SAFETY (slot:oscar): physics-reviewer P2 — apply tool-material factor ONLY when EXPLICITLY chosen. inferToolMaterial(H)→cbn would silently give a hardened cut the aggressive 2.5x CBN speed even if the shop runs coated carbide; now inferred→1.0 (carbide-conservative, no surprise over-speed), explicit HSS still 0.35x / explicit cbn still 2.5x (user opted in). +safety test locking inferred==carbide-baseline. 62/62 (10 toolmat + 52 gauntlet)

**Commit:** `658c8280fe24` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T08:49:49-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-toolmat-vc-safety, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC-SAFETY (slot:oscar): physics-reviewer P2 — apply tool-material factor ONLY when EXPLICITLY chosen. inferToolMaterial(H)→cbn would silently give a hardened cut the aggressive 2.5x CBN speed even if the shop runs coated carbide; now inferred→1.0 (carbide-conservative, no surprise over-speed), explicit HSS still 0.35x / explicit cbn still 2.5x (user opted in). +safety test locking inferred==carbide-baseline. 62/62 (10 toolmat + 52 gauntlet)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC-SAFETY (slot:oscar): physics-reviewer P2 — apply tool-material factor ONLY when EXPLICITLY chosen. inferToolMaterial(H)→cbn would silently give a hardened cut the aggressive 2.5x CBN speed even if the shop runs coated carbide; now inferred→1.0 (carbide-conservative, no surprise over-speed), explicit HSS still 0.35x / explicit cbn still 2.5x (user opted in). +safety test locking inferred==carbide-baseline. 62/62 (10 toolmat + 52 gauntlet)
```

## Files touched (3)
- mcp-server/src/__tests__/toolMaterialSpeedFactor.test.ts | 14 ++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts        |  9 +++++++--
- 2 files changed, 21 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till 0.35x / explicit cbn still 2.5x (user opted in). +safety test locking inferred==carbide-baseline. 62/62 (10 toolmat + 52 gauntlet)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 658c8280fe24`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._