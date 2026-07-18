# CATALOG-APP-WIRING-MS0/U-CAM-TOOL-TREES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-TREES (slot:romeo): R15 -- material->type->brand TOOLING tree for Mastercam + hyperMILL (#23 step 2) + fix latent catalogLoader ESM crash

**Commit:** `149c64da28c7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T10:31:46-05:00
**Tags:** catalog-app-wiring-ms0, u-cam-tool-trees, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-TREES (slot:romeo): R15 -- material->type->brand TOOLING tree for Mastercam + hyperMILL (#23 step 2) + fix latent catalogLoader ESM crash

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-TREES (slot:romeo): R15 -- material->type->brand TOOLING tree for Mastercam + hyperMILL (#23 step 2) + fix latent catalogLoader ESM crash

Completes #23: the Fusion material->type->brand tree now also lives in the other two tier-1 CAM apps,
sourced from the full PRISM tooling catalog (toolCatalogEngine). generate-jm-cam-tool-trees.ts
partitions by (type,brand) via injective per-parent slugs (no silent merge) and emits, per leaf, the
step-1 subset entrypoints: hyperMillToolExportEngine.exportToHMT (TYPE->BRAND .hmt -- the Materials
table already encodes all 6 ISO factors + the per-tool ceiling from U-HMT-CUTTING-DATA) +
mastercamToolExportEngine.exportFromTools(...,[iso]) (ISO->TYPE->BRAND .mcam-tools, material-specific
SFM, mirrors the Fusion CSV tree). Fail-loud emitted===total. LIVE: 13238/13238 tools -> 63
(type,brand) leaves across 20+ real vendors (Tungaloy, WIDIA, Mitsubishi, Seco, Ingersoll, Global
CNC, Zenit, Dormer Pramet, Sandvik, OSG, ISCAR, Niagara, SGS, Horn, Kennametal...) -> 63 .hmt + 378
.mcam-tools, 0 trimmed. 84MB bulk gitignored (regenerable); INDEX.md + cam-tool-trees.json committed
as proof-of-structure.

ALSO fixes a latent ESM bug (R12): catalogLoader.ts used a bare __dirname (undefined in ES-module
scope) -> ANY tsx script transitively importing toolCatalogEngine crashed with ReferenceError. Now
derives MODULE_DIR from import.meta.url -- byte-identical in the esbuild ESM bundle (format:esm
preserves import.meta.url; idiom matches 50+ bundled src/), newly correct under raw ESM. Unblocks
all tsx tooling that uses the catalog.

9/9 generator tests (no-drop/no-merge/path-safe/cap-report/alt-fields + live-catalog) + step-1
Mastercam exportFromTools 7/7; per-file 2-arm scrutiny PASS (catalogLoader blast-radius verified
safe across bundle/vitest/tsx; dedup-checked vs NC generators).
```

## Files touched (7)
- mcp-server/scripts/generate-jm-cam-tool-trees.ts      | 214 ++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/CamToolTreesGenerate.test.ts | 108 ++++++++++++++++++
- mcp-server/src/data/catalogLoader.ts                  |  19 +++-
- state/shared/jm-cam-tool-trees/.gitignore             |   7 ++
- state/shared/jm-cam-tool-trees/INDEX.md               |  79 +++++++++++++
- state/shared/jm-cam-tool-trees/cam-tool-trees.json    | 458 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 6 files changed, 881 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 149c64da28c7`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._