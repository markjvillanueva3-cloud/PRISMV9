# CATALOG-APP-WIRING-MS0/U-CATALOG-INDEX-REGEN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-INDEX-REGEN (slot:romeo): regenerate the stale CATALOG_INDEX.json — 51,336 -> 62,727 real tools

**Commit:** `05fdfb047405` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T15:07:05-05:00
**Tags:** catalog-app-wiring-ms0, u-catalog-index-regen, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-INDEX-REGEN (slot:romeo): regenerate the stale CATALOG_INDEX.json — 51,336 -> 62,727 real tools

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-INDEX-REGEN (slot:romeo): regenerate the stale CATALOG_INDEX.json — 51,336 -> 62,727 real tools

R12 data-integrity fix found this session: CATALOG_INDEX.json (gen 2026-04-16, the only file VendorCatalogManifestEngine reads) declared totalEntries=51,336 while the actual *-extracted.json files in src/data hold 62,727. Divergence: osg-tools-extracted.json declared 42 but has 11,550 rows (OSG re-extracted ~275x, manifest never refreshed); korloy/seco/guhring drifted by small amounts. 44 of 48 files were already accurate.

No existing generator recomputed this index (save-catalog-manifest.mjs READS it to build a different file). New scripts/regenerate-catalog-index.mjs counts real rows per file, recomputes entries/byManufacturer/totalEntries, preserves file/manufacturer/type, fail-loud aborts on unread files. Dry-run by default; --apply to write.

Updated the loader test invariant: was "reads MORE than the stale manifest" (totalRead > declared); now "manifest matches the files" (totalRead === declared) since the manifest is fresh. Fails if it drifts again. Engine + test header comments updated 51,336 -> 62,727. 16/16 loader + 52/52 session tests green.
```

## Files touched (5)
- mcp-server/data/CATALOG_INDEX.json                         | 389 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/regenerate-catalog-index.mjs            | 120 ++++++++++++++++++++++
- mcp-server/src/__tests__/CatalogCorpusLoaderEngine.test.ts |  19 ++--
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts        |   2 +-
- 4 files changed, 520 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 05fdfb047405`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._