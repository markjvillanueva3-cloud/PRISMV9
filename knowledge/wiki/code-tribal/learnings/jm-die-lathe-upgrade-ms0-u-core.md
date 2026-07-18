# JM-DIE-LATHE-UPGRADE-MS0/U-CORE — [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-CORE (slot:whiskey iter11): JMDieLatheProgramUpgraderEngine + prism_ai:jm_die_lathe_upgrade

**Commit:** `35cb160f6eda` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T16:37:05-05:00
**Tags:** jm-die-lathe-upgrade-ms0, u-core, auto-distilled

## Subject
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-CORE (slot:whiskey iter11): JMDieLatheProgramUpgraderEngine + prism_ai:jm_die_lathe_upgrade

## Body
```
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-CORE (slot:whiskey iter11): JMDieLatheProgramUpgraderEngine + prism_ai:jm_die_lathe_upgrade

Closes /goal directive (whiskey 2026-05-23): upgrade every JM Die lathe program with PRISM-computed S/F + per-machine variants. Engine emits 7 variants per source program (one per JM Die Okuma lathe: GENOS L300-M, GENOS L200E-M, LNC8, LB-3000EX (x2), LB-3000EX Big Bore, Multus B250II) named <partNumber>_<machineModel>.nc.

Baked-in operator assumptions: HSSco Allied Engineering TA inserts with TiAlN coating, baseline 180 SFM × 0.13 mm/rev × 1.5 mm DoC on tool steel default. Per-machine rigidity multiplier (heavy 1.10/medium 1.0/light 0.85). RPM clamped to spindle max per machine.

Trust contract: Box-archive S/F values are NOT trusted (feedback_shop_programs_amateur). Upgrader uses program STRUCTURE only; computes fresh S/F from physics. Materials default to tool_steel with operator-review warning; material_override accepted for per-program prints.

extractPartNumber() supports filename stem + (P/N: ...) header comment fallback per JM Die naming conventions. 14/14 hermetic tests PASS. tsc clean.

This is the CORE upgrader — batch corpus execution is a CLI-orchestrator follow-up unit. The action is invokable per-program via prism_ai:jm_die_lathe_upgrade today.
```

## Files touched (5)
- .../JMDieLatheProgramUpgraderEngine.test.ts        | 130 +++++++++++++++
- .../src/engines/JMDieLatheProgramUpgraderEngine.ts | 183 +++++++++++++++++++++
- mcp-server/src/schemas/aiReasoningActionSchemas.ts |  12 ++
- .../src/tools/dispatchers/aiReasoningDispatcher.ts |  13 ++
- 4 files changed, 338 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 35cb160f6eda`
- Milestone envelope: `mcp-server/data/milestones/JM-DIE-LATHE-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._