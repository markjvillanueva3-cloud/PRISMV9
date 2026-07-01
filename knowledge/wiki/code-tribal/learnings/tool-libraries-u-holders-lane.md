# TOOL-LIBRARIES/U-HOLDERS-LANE — [MAIN-FORCE] [TOOL-LIBRARIES]/U-HOLDERS-LANE (slot:romeo): brand tool-holder lanes -- the 3rd explicitly-named category

**Commit:** `79b03d6a4778` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T09:50:23-05:00
**Tags:** tool-libraries, u-holders-lane, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-HOLDERS-LANE (slot:romeo): brand tool-holder lanes -- the 3rd explicitly-named category

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-HOLDERS-LANE (slot:romeo): brand tool-holder lanes -- the 3rd explicitly-named category

Iter 14 -- holders + tooling + inserts are now ALL delivered (the operator named all three).

- scripts/lib/holder-taper.mjs (7/7 tests): parses a holder designation -> spindle taper
  (BBT50->BT50 Big-Plus, ER-32->ER32, KM40, HSK-A63, CAT/Capto) + attaches book-value collision
  geometry (body dia, gauge length, projection, max rpm) per DIN69871/JIS B6339/ANSI B5.50/ISO12164.
  REUSES ER_COLLET from holder-geometry.mjs (R8 compose-not-duplicate). A MEGA collet-chuck HEAD
  (no spindle taper -- mounts on a separate BBT base) resolves null -> correctly excluded.
- buildMastercamHolders (CSV) + buildHypermillHolders (.hmt.sql Holders table) via a shared
  selectHolderRows; wired into BUILDERS + harness (validateMastercam/HypermillHolderContent) +
  placement (built to .hmt binary in the v31 seat) + cron.
- LIVE: 1,167 holders / 4 brands (Big Daishowa/Kennametal/OSG/Haimer); 51% of the holder corpus
  resolves a taper (the rest are chuck heads, honestly excluded). SQLite round-trip validated.
  Full cron cycle now 7 formats + index, exit 0; holder .hmt binaries placed in the v31 seat.
- Tests: holder-taper 7/7, emitter 36/36, harness 7/7, placement 4/4.
```

## Files touched (10)
- scripts/cam-tool-library-harness.mjs                        | 35 ++++++++++++-
- scripts/emit-brand-tool-libraries.mjs                       | 95 +++++++++++++++++++++++++++++++++
- scripts/emit-brand-tool-libraries.test.mjs                  | 38 ++++++++++++++
- scripts/lib/holder-taper.mjs                                | 99 +++++++++++++++++++++++++++++++++++
- scripts/lib/holder-taper.test.mjs                           | 56 ++++++++++++++++++++
- scripts/place-cam-tool-libraries.mjs                        | 14 ++++-
- scripts/place-cam-tool-libraries.test.mjs                   |  2 +-
- state/shared/tool-libraries/hypermill-holders/MANIFEST.json | 54 +++++++++++++++++++
- state/shared/tool-libraries/mastercam-holders/MANIFEST.json | 54 +++++++++++++++++++
- 9 files changed, 442 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 79b03d6a4778`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._