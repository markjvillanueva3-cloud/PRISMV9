# SYSTEM-VIZ/U-SV-NAV-INJECT-GREP-WRITE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-VIZ]/U-SV-NAV-INJECT-GREP-WRITE (slot:sierra): exact-path nav inject in pre-grep + pre-write via shared graph-exact-match helper

**Commit:** `96507b436afd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T08:52:39-05:00
**Tags:** system-viz, u-sv-nav-inject-grep-write, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-VIZ]/U-SV-NAV-INJECT-GREP-WRITE (slot:sierra): exact-path nav inject in pre-grep + pre-write via shared graph-exact-match helper

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DB-COVERAGE-GAPFILL-MS0]/U-HEL01+U-SUM01 (slot:romeo): fill empty Helical + Sumitomo tool catalogs

src/data/{helical,sumitomo}-tools.json were empty [] -> _loadHelicalTools/_loadSumitomoTools dead. Filled real Helical Solutions (8: HEV-5 5fl + HVAL 3fl Al + HBN ball, AlTiN/ZrN) + Sumitomo (9: MultiDrill MDW carbide drills + GSX MILL end/ball mills), metric, shank=nominal, OAL/flute via engine imputation. tool-catalog-vendor-fill.test.ts 5/5. F-EMPTY-CATALOGS: guhring+osg+sandvik+helical+sumitomo done; remaining: indexable/global-cnc/additional/emuge(diff contract).
```

## Files touched (4)
- mcp-server/src/__tests__/tool-catalog-vendor-fill.test.ts | 30 ++++++++++++++++++++++++++++++
- mcp-server/src/data/helical-tools.json                    | 11 ++++++++++-
- mcp-server/src/data/sumitomo-tools.json                   | 12 +++++++++++-
- 3 files changed, 51 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 96507b436afd`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._