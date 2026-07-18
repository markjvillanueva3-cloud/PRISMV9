# FE-SPECIALTY-CONTRACT/U-FE-FORMING-SHEETMETAL — [MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-FORMING-SHEETMETAL (slot:bravo): wire /forming/sheet-metal to real press_brake_calculate (501->200)

**Commit:** `7fb818162df3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T07:48:43-05:00
**Tags:** fe-specialty-contract, u-fe-forming-sheetmetal, auto-distilled

## Subject
[MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-FORMING-SHEETMETAL (slot:bravo): wire /forming/sheet-metal to real press_brake_calculate (501->200)

## Body
```
[MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-FORMING-SHEETMETAL (slot:bravo): wire /forming/sheet-metal to real press_brake_calculate (501->200)

Backend-for-frontend: SPA /api/v1/forming/sheet-metal returned a deferred 501. Now
proxies the REAL prism_forming:press_brake_calculate (verified in ACTIONS enum + engineMap;
schema .passthrough() so engine-true keys reach PressBrakeEngine).

Faithful adapter, no fabrication: bend_radius_mm->inside_radius_mm, die_opening_mm->
v_die_opening_mm renames; free-string material->engine 6-material enum (default mild_steel);
AtomicValue unwrap; tonnes-force->kN x9.80665; warnings->recommendations. minimum_bend_radius_mm
+ blank_size_mm OMITTED (engine produces neither) -- SPA SheetMetalResult marked those optional.

Also fixed 4 pre-existing TS7030 in grinding/forming handlers (early-exits -> valueless
returns, behavior identical). Tests 7/7 round-trip the ACTUAL PressBrakeEngine (happy + 3
failure + 2 adversarial). tsc clean for changed files. Per-file 2-arm scrutiny PASS/PASS.
```

## Files touched (4)
- mcp-server/src/__tests__/specialty-forming-route.test.ts | 205 ++++++++++++++++++++++++++
- mcp-server/src/routes/specialty.ts                       | 284 ++++++++++++++++++++++++++++++++++---
- mcp-server/web/src/types/forming.ts                      |   8 +-
- 3 files changed, 478 insertions(+), 19 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7fb818162df3`
- Milestone envelope: `mcp-server/data/milestones/FE-SPECIALTY-CONTRACT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._