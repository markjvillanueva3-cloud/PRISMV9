# CATALOG-APP-WIRING-MS0/U-TOOLDB-MAT-TYPE-BRAND — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-TOOLDB-MAT-TYPE-BRAND (slot:romeo): organize JM tooling DB material -> type -> brand

**Commit:** `96b78494162c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T20:54:22-05:00
**Tags:** catalog-app-wiring-ms0, u-tooldb-mat-type-brand, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-TOOLDB-MAT-TYPE-BRAND (slot:romeo): organize JM tooling DB material -> type -> brand

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-TOOLDB-MAT-TYPE-BRAND (slot:romeo): organize JM tooling DB material -> type -> brand

Operator headline: "tooling by pre-optimized SFM ... by material type, then type,
then brand." The JM Fusion generator already emitted per-ISO-group (material)
libraries with SFC-physics-optimal presets; this adds the full MATERIAL -> tool
TYPE -> BRAND tree on top, reusing the proven CSV_TOOLS_VERSION_1 format.

- tool-library-partition.ts: pure, INJECTIVE helper. Nests by RAW type/brand
  (never the slug), assigns unique filesystem-safe slugs per parent with a
  deterministic -2/-3 suffix on collision, so two distinct vendors/types
  (e.g. "YG-1" vs "YG 1") are NEVER silently merged. isoSegment() strips
  path-traversal chars. 14 unit tests (collision, traversal, no-drop, fallbacks).
- generator: emits by-type-brand/<ISO>/<type>/<brand>.csv + INDEX.md; fail-loud
  invariants (partition lockstep == by-group total; tree emits == expected;
  GROUPS map 1:1 under isoSegment).
- Live: 218 JM tools -> 41 leaf libraries (933 preset rows), each a valid
  CSV_TOOLS_VERSION_1 file Fusion imports directly.

HONEST DATA NOTE (R12): most JM tool_vendor is blank -> those file under
"unspecified" (never dropped); brand leaves populate where data exists (yg-1,
iscar). Richer brand granularity = follow-up (source from the 62K-tool corpus).

Scrutiny: 2 fix cycles. Claude reviewer PASS (mutation-tested: slug-key
regression breaks 6 tests, disambiguation 2, iso-sanitize 2). gpt-oss flagged a
theoretical iso-collision-on-reuse (R7): iso is a controlled enum, not free-text
like type/brand; closed structurally with the fail-loud GROUPS guard rather than
argued away.
```

## Files touched (46)
- mcp-server/scripts/generate-jm-fusion-tool-libraries.ts                                                  |  64 ++++++++++++++++++++++++++++++++
- mcp-server/scripts/lib/tool-library-partition.ts                                                         | 148 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/ToolLibraryPartition.test.ts                                                    | 141 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/H/bull-nose-end-mill/unspecified.csv |   6 +++
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/H/center-drill/unspecified.csv       |   2 +
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/H/drill/unspecified.csv              | 111 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/H/drill/yg-1.csv                     |   3 ++
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/H/spot-drill/unspecified.csv         |   4 ++
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/INDEX.md                             |  53 ++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/K/bull-nose-end-mill/unspecified.csv |   6 +++
_(+36 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 96b78494162c`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._