# HOTEL/U-HOTEL-DOMAIN-ROOSTS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-HOTEL-DOMAIN-ROOSTS (slot:hotel iter5 /goal): system-viz synergy — 3 ghost roosts + classifier emits 210 hotel-domain actions

**Commit:** `ecbbe984125f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T15:49:15-05:00
**Tags:** hotel, u-hotel-domain-roosts, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-HOTEL-DOMAIN-ROOSTS (slot:hotel iter5 /goal): system-viz synergy — 3 ghost roosts + classifier emits 210 hotel-domain actions

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-HOTEL-DOMAIN-ROOSTS (slot:hotel iter5 /goal): system-viz synergy — 3 ghost roosts + classifier emits 210 hotel-domain actions

Axis E: PSN + /system-viz synergy. Hotel domain now visible in visual system map.

Generator (scripts/generate-hotel-domain-features.mjs):
  - Reads businessDispatcher.ts + shopDispatcher.ts ACTIONS arrays
  - Classifies every action into safety / accounting / business via keyword-prefix regexes
  - Emits 3 ghost roosts (L8) + child hotel-action nodes (L9)

Three roosts:
  - ghost.business_frontend (violet) — customer + order + quote + employee + vendor + scheduling
  - ghost.shop_safety (red) — OSHA + ISO + CAPA + cert + audit + LOTO + SDS + training
  - ghost.realtime_accounting (sky) — GL + AR + AP + payroll + docustrata + adaptive_shop_rate + burden_rate

First-run: 210 nodes (3 roosts + 207 actions): 147 business / 53 accounting / 10 safety / 378 non-hotel correctly excluded.

Pure-function generator + CLI runner split + 15/15 node:test PASS.

Reader robustness: walks ALL [...] arrays, picks LARGEST with snake_case literals — survives both inline z.enum and const ACTIONS patterns.

Registration: scripts/regen-viz.mjs FAST[] + scripts/merge-augmentations.mjs splice (modeled on priority-queue pattern).

Closes axis E of the /goal — hotel-domain capability indexable in /system-viz alongside priority_queue / bridge_synergy / misc_tasks roosts. Augmentation JSON at state/shared/system-viz/staging/hotel-domain-features.json regenerates on every viz refresh.

Refs: priority-queue-ms0 pattern, bridge-synergy pattern.
```

## Files touched (6)
- scripts/generate-hotel-domain-features.mjs      | 261 ++++++++++++++++++++++++
- scripts/generate-hotel-domain-features.test.mjs | 147 +++++++++++++
- scripts/merge-augmentations.mjs                 |  30 +++
- scripts/regen-viz.mjs                           |   1 +
- scripts/run-hotel-domain-features.mjs           |  19 ++
- 5 files changed, 458 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ecbbe984125f`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._