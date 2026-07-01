---
name: reference_catalog_index_stale_manifest_2026_06_08
description: "CATALOG_INDEX.json is stale — declares 51,336 tools but real corpus on disk is 62,727 (osg re-extracted 42→11,550, manifest never regenerated)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.506Z
aliases: reference_catalog_index_stale_manifest_2026_06_08
---


**Found by slot:romeo 2026-06-08 (CATALOG-APP-WIRING-MS0) — R12 stale-index catch.**

`mcp-server/data/CATALOG_INDEX.json` (generated 2026-04-16) declares `totalEntries: 51,336` across 48 files. But the actual `*-extracted.json` files in `mcp-server/src/data/` now hold **62,727 rows** — the manifest is STALE. The single divergent file: **`osg-tools-extracted.json` manifest says `entries: 42` but the file has 11,550 rows** (OSG was re-extracted ~275× larger, manifest never regenerated). All other 47 files match.

Implication: any code that trusts the manifest's `totalEntries` or per-manufacturer `byManufacturer[x].entries` undercounts reality by ~11K tools. The manifest's `byManufacturer` also partitions by exact-case manufacturer string (`"ISCAR"` 6074 vs `"Iscar"` 173 are SEPARATE buckets) — do not reconcile a file-grouped count against it.

**`CatalogCorpusLoaderEngine` reads the FILES not the stale count**, so it picks up the real 62,727. Its test (`CatalogCorpusLoaderEngine.test.ts`) has a regression guard: `totalRead > declaredTotal` + `toolsNormalized >= 60_000` (fails if someone regresses to trusting the manifest).

**RESOLVED (slot:romeo 2026-06-08, commit `05fdfb0474`):** regenerated `CATALOG_INDEX.json` 51,336 → 62,727 via the new `mcp-server/scripts/regenerate-catalog-index.mjs` (dry-run by default; `--apply` to write; fail-loud aborts on unread files). There was NO pre-existing generator — `save-catalog-manifest.mjs` READS the index to build a *different* file (`vendor-catalog-manifest.json`). The regenerator counts real rows per file, recomputes `entries`/`byManufacturer`/`totalEntries`, preserves `file`/`manufacturer`/`type`. Re-run it whenever a vendor `*-extracted.json` is re-extracted. The loader test invariant is now "manifest matches files" (`totalRead === declaredTotal`) so future drift fails the test. Drift at fix time: osg 42→11,550, korloy 376→263, seco 1227→1224, guhring 3422→3421 (44/48 files already accurate). Related: [[reference_catalog_corpus_loader_2026_06_08]].
