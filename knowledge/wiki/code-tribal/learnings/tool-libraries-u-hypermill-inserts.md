# TOOL-LIBRARIES/U-HYPERMILL-INSERTS — [MAIN-FORCE] [TOOL-LIBRARIES]/U-HYPERMILL-INSERTS (slot:romeo): hyperMILL insert lane (R15 apply-to-all)

**Commit:** `30257b948cd8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T09:41:52-05:00
**Tags:** tool-libraries, u-hypermill-inserts, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-HYPERMILL-INSERTS (slot:romeo): hyperMILL insert lane (R15 apply-to-all)

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-HYPERMILL-INSERTS (slot:romeo): hyperMILL insert lane (R15 apply-to-all)

Iter 13 -- inserts now reach BOTH CAMs that have insert libraries, not just Mastercam.

- Extracted selectInsertRows() shared selector (R8/DRY) -- the ISO-insert filter (require parseable
  IC, drop product-code junk, gate >6.4mm garbage corner radii) now feeds both insert builders.
- buildHypermillInserts + serializeHypermillInserts emit a SQLite Inserts table (.hmt.sql):
  id/name/iso_code/shape/inscribed_circle/corner_radius/manufacturer_id, mm_system_id=1, UNIQUE name
  dedup. Wired into BUILDERS + harness (validateHypermillInsertContent, 8-field arity) + placement
  (built to .hmt binary in the v31 seat) + cron.
- placement buildHmt generalized to count Tools OR Inserts (sqlite_master detect).
- LIVE: 1,459 inserts / 3 brands; SQLite round-trip validated (Kennametal CNGG real ISO/IC/corner-R);
  full cron cycle 5 formats + index, exit 0; .hmt binaries placed in the v31 seat.
- Tests: emitter 33/33 (selectInsertRows, buildHypermillInserts, serialize), harness 7/7, placement 4/4.
```

## Files touched (7)
- scripts/cam-tool-library-harness.mjs                        | 17 +++++++-
- scripts/emit-brand-tool-libraries.mjs                       | 74 +++++++++++++++++++++++++++++------
- scripts/emit-brand-tool-libraries.test.mjs                  | 35 +++++++++++++++++
- scripts/place-cam-tool-libraries.mjs                        |  9 ++++-
- scripts/place-cam-tool-libraries.test.mjs                   |  4 +-
- state/shared/tool-libraries/hypermill-inserts/MANIFEST.json | 45 +++++++++++++++++++++
- 6 files changed, 170 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 30257b948cd8`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._