# JM-FUSION-TOOLS-MS0/U-JFT-HYPERMILL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-HYPERMILL (slot:romeo): JM crib -> hyperMILL .hmt SQL (compat-gated cutting data)

**Commit:** `4c54ecaca440` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T19:38:53-05:00
**Tags:** jm-fusion-tools-ms0, u-jft-hypermill, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-HYPERMILL (slot:romeo): JM crib -> hyperMILL .hmt SQL (compat-gated cutting data)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-HYPERMILL (slot:romeo): JM crib -> hyperMILL .hmt SQL (compat-gated cutting data)

G4 of the goal "tool+holder+machine DB for Fusion, convertible to hyperMILL +
Mastercam, compatibility-gated." Picks up romeo's uncommitted G4 work (built,
tested 12/12, never committed before the session ended).

scripts/lib/jm-tool-model.ts (382 LOC, shared with the future G5 Mastercam
generator): parseJmCribTools + cuttingDataForGroup + ISO model. Inch->mm
normalized; physics cutting data via UltimateSpeedFeedEngine.lookupCuttingData.

scripts/generate-jm-hypermill-tool-library.ts (300 LOC): emits a hyperMILL Tool
DB (.hmt SQLite) as DDL+INSERT SQL. Geometry/SQL faithfully replicated from
HyperMillToolExportEngine E1127 (sqlite.sql v1.53) -- NOT imported, because that
engine pulls the 25MB toolCatalogEngine at module top which crashes under tsx
(catalogLoader __dirname). Adds a per-tool x per-COMPATIBLE-material CuttingData
table (the operator's "only populate compatible material domains" constraint,
materialized as rows; gated by CoatingSelectionAdapter.compatibleGroups).
Materials Vc/fz factors derived from lookupCuttingData (no inlined constants).
R12 fail-loud: skips tools with no usable geometry rather than zero-filling.

Output (regenerated, deterministic): state/shared/jm-hypermill-tools/
JM-CRIB-hypermill.sql -- 218 tools, 933 gated cutting rows, 0 skipped + README.
Materialize: sqlite3 JM-CRIB-hypermill.hmt < JM-CRIB-hypermill.sql.

Tests: src/__tests__/jm-hypermill-export.test.ts (12/12 pass).
NEXT (G5): MastercamToolExportEngine -> real .tooldb (reuses jm-tool-model).
```

## Files touched (7)
- knowledge/wiki/architecture/tests/jm/jm-hypermill-export.md |   53 ++++
- mcp-server/scripts/generate-jm-hypermill-tool-library.ts    |  300 ++++++++++++++++++++++
- mcp-server/scripts/lib/jm-tool-model.ts                     |  382 ++++++++++++++++++++++++++++
- mcp-server/src/__tests__/jm-hypermill-export.test.ts        |  134 ++++++++++
- state/shared/jm-hypermill-tools/JM-CRIB-hypermill.sql       | 1647 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/jm-hypermill-tools/README.md                   |   26 ++
- 6 files changed, 2542 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c54ecaca440`
- Milestone envelope: `mcp-server/data/milestones/JM-FUSION-TOOLS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._