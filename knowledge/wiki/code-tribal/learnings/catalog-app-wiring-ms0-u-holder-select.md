# CATALOG-APP-WIRING-MS0/U-HOLDER-SELECT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HOLDER-SELECT (slot:romeo): HolderSelectionEngine -- real holders by type->brand, the verified core of tool-holder DB population

**Commit:** `4ab181a78d01` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:19:47-05:00
**Tags:** catalog-app-wiring-ms0, u-holder-select, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HOLDER-SELECT (slot:romeo): HolderSelectionEngine -- real holders by type->brand, the verified core of tool-holder DB population

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HOLDER-SELECT (slot:romeo): HolderSelectionEngine -- real holders by type->brand, the verified core of tool-holder DB population

The 3 CAM tool exporters synthesize holders by size-guess today (inferHolder /
Math.max(shankD+8,26)) -- none reads the real holder catalogs. HolderSelectionEngine
is the pure, testable core that replaces that guess: loads 643 real branded holders
(HAIMER 489 / BIG DAISHOWA 131 / GUHRING 23) across 7 types (shrink_fit 476, hydraulic
46, weldon 42, collet_chuck 40, milling_chuck 21, power_chuck 16, ER 2) and 20 tapers,
selects by taper + shank-bore fit + type-preference, and organizes by type->brand.

Exact-bore semantics: shrink_fit/weldon/side_lock clamp an EXACT bore (+/-0.05mm);
hydraulic/collet/chuck holders clamp a range. Ranking: type-pref, then tightest grip,
then shortest gauge (rigidity).

LIVE: CAT40/12mm/shrink_fit -> HAIMER bore[12,12] '.12.4' (real catalog holder). 11/11
tests (real reference holders, exact-bore invariant, taper-miss/oversize null, type->brand
organization). Next: wire into Fusion/Mastercam/hyperMILL exporters (replace inferHolder).
[[reference_fusion_holder_tooling_db_plan_2026_06_09]]
```

## Files touched (3)
- mcp-server/src/__tests__/HolderSelectionEngine.test.ts | 107 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/HolderSelectionEngine.ts        | 217 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 324 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ab181a78d01`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._