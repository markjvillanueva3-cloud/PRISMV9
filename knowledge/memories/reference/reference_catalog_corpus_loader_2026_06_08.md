---
name: reference_catalog_corpus_loader_2026_06_08
description: CatalogCorpusLoaderEngine keystone — feeds the full 62.7K-tool vendor corpus into ToolCatalogEngine so every app exporter + SFC sees it
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.506Z
aliases: reference_catalog_corpus_loader_2026_06_08
---


**CATALOG-APP-WIRING-MS0/U-CATALOG-CORPUS-LOADER (slot:romeo, 2026-06-08, commits `aca389cc97` + scrutiny-fix `a44345e90f`).**

The keystone for "all tool/holder/insert/machine DBs added to Fusion/hyperMILL/Mastercam/HSMAdvisor/G-Wizard/SFC/mill+lathe wizards". Root cause found by an 11-agent audit workflow + independent verification:

- `mcp-server/data/CATALOG_INDEX.json` (manifest, 48 vendor files) was read ONLY by `VendorCatalogManifestEngine` (a gap-analysis engine — NOT a tool-record loader).
- Every app exporter (`FusionToolExportEngine`, `MastercamToolExportEngine`, `HyperMillToolExportEngine`, `InventorCAMToolExportEngine`) + SFC resolve tools through `toolCatalogEngine.search()`, which filters `ToolCatalogEngine`'s in-memory Map. That Map was seeded ONLY by `_loadStandardTools()` (~30 hardcoded vendor getters). ~20 `*-extracted.json` files (accupro/camfix/flash/korloy/ma-ford/rapidkut/yg1) were on disk but DORMANT (0 references).
- `ToolCatalogEngine.addTools(CatalogTool[])` (line ~549) was an open, unused ingestion door.

**Fix:** `mcp-server/src/engines/CatalogCorpusLoaderEngine.ts` reads the manifest + 48 files, normalizes flat extracted records → `CatalogTool[]`, feeds `addTools()`. ONE `load()` lights up all 5 consumers (no adapter changes — they already call `.search()`). Wired `prism_calc:tool_catalog_load_corpus` + `tool_catalog_corpus_stats`.

**Key facts:** real corpus = **62,727 tools** (not the 51,336 the manifest declares — see [[reference_catalog_index_stale_manifest_2026_06_08]]). Path resolution: manifest lives in `mcp-server/data/` (read via `__dirname` resolution), vendor files in `mcp-server/src/data/` (esbuild does NOT copy raw JSON to dist — read from src/data directly, NOT via `catalogLoader` which is dist-only). corpus IDs namespaced `corpus:<mfr>:<designation>` (disjoint from `STD-*`/`TNG-*` — no collision).

Next units (dependency-ordered, plan in `state/shared/romeo-catalog-app-wiring-audit.workflow.mjs` synthesis): U2 holder+insert normalization · U3-U6 per-app corpus feeds (Fusion JSON first, then Mastercam/hyperMILL native-writer risk) · U7 SFC resolveTool · U8 mill/lathe wizard bridge actions · U9 HSMAdvisor/G-Wizard cribs · U10 machine-DB export (independent track — `MachineDefinitionExportEngine`, 4-registry join, backfill 12 missing JM handbooks). Related: [[reference_shared_tree_commit_contamination_2026_06_08]].
