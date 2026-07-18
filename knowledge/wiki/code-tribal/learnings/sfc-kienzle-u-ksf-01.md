# SFC-KIENZLE/U-KSF-01 — [MAIN-FORCE] [SFC-KIENZLE]/U-KSF-01 (slot:oscar): OEM-verified spindle caps for the 5 JM mills (VMC-01..05)

**Commit:** `690a72ad1695` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T14:57:00-05:00
**Tags:** sfc-kienzle, u-ksf-01, auto-distilled

## Subject
[MAIN-FORCE] [SFC-KIENZLE]/U-KSF-01 (slot:oscar): OEM-verified spindle caps for the 5 JM mills (VMC-01..05)

## Body
```
[MAIN-FORCE] [SFC-KIENZLE]/U-KSF-01 (slot:oscar): OEM-verified spindle caps for the 5 JM mills (VMC-01..05)

ShopConfigurationEngine served NO max_rpm/max_power_kw for any JM mill via GET /api/v1/shop/machines
(lathes already had them), so the new Kienzle SFC page could not pass machine_max_rpm to sf_orchestrate.
Web-verified OEM nameplates; CORRECTS 2 Claude-design jm-data.js errors caught by verification:
OM-2 7.5->5 hp (3.7 kW), Roku-Roku 40k->32k rpm (40k would allow 25% over-speed). 4/4 reference-value
+ regression tests. Adds SFC frontend build-plan spec. NOTE: sf_orchestrate reads machine caps from its
OWN input (machine_max_rpm) / MACHINE_CATALOG_QUICK, not ShopConfig -- the adapter must pass these
through (queued U-KSF-03); this unit fills the shop SoT.
```

## Files touched (4)
- mcp-server/src/__tests__/shop-config-mill-spindle-caps.test.ts   | 47 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ShopConfigurationEngine.ts                | 12 ++++++++++++
- state/shared/specs/KIENZLE-SFC-FRONTEND-BUILD-PLAN-2026-06-26.md | 69 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 128 insertions(+)

## Lessons surfaced in commit body
- NOTE: sf_orchestrate reads machine caps from its

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 690a72ad1695`
- Milestone envelope: `mcp-server/data/milestones/SFC-KIENZLE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._