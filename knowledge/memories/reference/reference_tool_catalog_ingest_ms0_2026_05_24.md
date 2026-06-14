---
name: tool-catalog-ingest-ms0-2026-05-24
description: TOOL-CATALOG-INGEST-MS0 milestone opened by juliett 2026-05-24 — 20 units to ingest 38 vendor tool catalogs (~36K tools) with full cutting params + 2D/3D dimensional + STEP files for collision-avoidance + CAD/CAM AI training. Phase A foundation (3 units) shipped commit 13b31ae2a3 on slot/juliett. Phase B-F open for pickup by alpha/bravo/charlie/delta/echo from their slot worktrees.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.974Z
aliases: reference_tool_catalog_ingest_ms0_2026_05_24
---


# TOOL-CATALOG-INGEST-MS0 — Phase A complete, B-F open for pickup

## User /goal (2026-05-24)

> "do whatever we need to do to get entire catalogs into our data base with full cutting parameters, usage scenarios and 2d/3d dimensional data for collision avoidance. if available, download step files for parts. pts-tools.com and misumi have a vast database of step files…"

Three operator decisions captured:
1. **PDF-first, then portals** (build order)
2. **Operator-provides creds** for Misumi / Sandvik CoroPlus / Kennametal NOVO / Iscar etool
3. **Store ALL STEP files locally** (~20-50GB on 4TB SSD) — **dual purpose**: collision-avoidance AND CAD/CAM AI training data

## What shipped this session (Phase A, juliett iter16)

Commit `13b31ae2a3` on slot/juliett. 8 files, 1823 insertions:

- `mcp-server/src/schemas/CatalogExtractionResult.ts` (14.2 KB) — TypeScript schema for per-vendor extraction JSON. Top-level keys (`schemaVersion`, `generatedAt`, `advisoryOnly`, `must_human_verify`, `summary`, `raw_tools`) deliberately mirror mike's 2026-05-23 Fusion 360 catalog extractor output so the two ingest paths produce interoperable JSON. Per-tool `CuttingDataSet` reuses `CatalogExtractionEngine.CuttingDataSet` (existing). **27/27 vitest tests PASS**. R12 null-typeof gotcha caught in test + fixed.
- `mcp-server/src/registries/ToolRegistry.ts` — `CuttingTool` extended with 3 optional fields: `step_file_path?`, `datasheet_pdf_path?`, `collision_envelope?`. All optional — existing consumers compile unchanged. `npx tsc --noEmit` clean.
- `scripts/lib/catalog-storage-paths.mjs` (5.5 KB) — pure path helpers: `slugify`, `stepPathFor`, `extractedJsonPathFor`, `pdfPathFor`, `datasheetPdfPathFor`, `parseStepPath`. Slugify byte-matches iter15 `generate-vendor-catalog-features.mjs`. R12: throws TypeError on empty inputs. **31/31 node:test PASS**.
- `mcp-server/data/milestones/TOOL-CATALOG-INGEST-MS0.json` — 20-unit envelope, 6 phases, slot allocation
- `state/shared/specs/TOOL-CATALOG-INGEST-MS0-2026-05-24.md` + `.html` — operator spec
- Plan: `H:/.claude/plans/enchanted-dazzling-scott.md` (operator-approved)

## Disk layout (new conventions for Phase B-F)

```
H:/prism/resources/MANUFACTURER_CATALOGS/
├── uploaded/                                # 38 PDFs (existing)
├── datasheets/<vendor>/<part-number>.pdf   # NEW — Phase D scrapers
├── step/<vendor>/<part-number>.step        # NEW — Phase D + Phase E AI corpus
└── extracted/                              # via PATHS.extractionsDir
        <vendor>-<type>-extracted.json      # Phase B output, Phase D-1 merge input
```

All path strings MUST come from `scripts/lib/catalog-storage-paths.mjs` — never hard-code paths in Phase B-F units.

## Phase B-F handoff for /pick-unit

Slot allocation (envelope `phases.<id>.owner_slot`):

| Phase | Units | Slot | Highlights |
|-------|-------|------|------------|
| **B** | B1-B5 (5) | alpha + bravo parallel | PDF→structured-JSON via camelot Python. B2 first: Iscar + Tungaloy GC_* = 36K tools (largest batch) |
| **C** | C1-C2 (2) | charlie | Vendor STEP URL inventory from extracted JSONs; index existing on-disk STEP files in resources/CAD FILES/, JM DIE/ |
| **D** | D1-D6 (6) | delta | Merge orchestrator + 5 vendor portal scrapers (PTS / Misumi / Sandvik CoroPlus / Kennametal NOVO + Iscar etool / GrabCAD + TraceParts) |
| **E** | E1-E3 (3) | echo | Wire STEP corpus into CADCorpusIngesterEngine; CuttingDataSet → UltimateSpeedFeedEngine calibration overlays; collision_envelope → CollisionDetectionEngine |
| **F** | F1 (1) | juliett | Extend `scripts/generate-vendor-catalog-features.mjs` with live per-vendor stats + close-out |

Each slot picks units from `mcp-server/data/milestones/TOOL-CATALOG-INGEST-MS0.json` via `/pick-unit` and works **in its own slot worktree** (`H:/prism-slot-<name>/`) — NOT main tree. Main tree had 5 peer-races this session.

## Reuse-don't-reinvent (read first)

- `CatalogExtractionEngine.CuttingDataSet` already defines cutting-data shape
- `StepImportEngine` (occt-import-js WASM, already installed) handles STEP→mesh + bounding box
- `CADCorpusIngesterEngine` already accepts `.step` — Phase E1 only adds new scan root
- `CollisionDetectionEngine` already does AABB/OBB/SAT — Phase E3 only wires data flow
- `UltimateSpeedFeedEngine.GRADE_SPEED_FACTORS` accepts calibration overlays via `sf_autopilot_run`
- `ToolHolderDatabaseEngine` has 80+ holder types for spindle-taper validation
- `duplicationGuardEngine` for dedup on merge
- `dataDispatcher` has the `catalog_*` action surface — add `catalog_extraction_merge` action
- `documentLearningDispatcher` pattern: `execFileAsync(PYTHON_PATH, 'scripts/camelot-extract.py', ...)` — copy this for Phase B camelot wrapper
- Mike's `scripts/extract-fusion-tooling-catalog.mjs` (in H:/prism-slot-mike) is the orchestrator pattern to copy for Phase B-1

## Prior art

- [[reference_fusion_tooling_catalog_2026_05_23]] — mike's Fusion 360 extractor (712 tools / 329 presets / 8 libs)
- [[reference_vendor_catalog_misclassification_2026_05_23]] — iter12-15 R12 fail-loud win; the authoritative-source order codified here (pdftotext cover > Apr manifest > filename heuristic)
- [[reference_sf_psn_wire_ms0_6iter_2026_05_23]] — sibling Phase A pattern (schema → unit-by-unit ship → close-out)

## Open advisories (out of scope)

- 21 missing zip-part gaps in `MANUFACTURER CATALOGS.zip.*` (operator must re-upload)
- 8 still-unknown PDFs (Apr manifest labels 7, only `Tooling Systems.pdf` truly unknown)
- April 16 manifest vs iter14 pdftotext disagree on 15 catalogs (Sandvik/Tungaloy re-litigation — pdftotext cover-verify wins where it ran)

## Process

This commit was forked to slot/juliett after **5 peer-races on main tree this session** ([[feedback_conflict_fork_rule]]). All Phase B-F units MUST follow the slot-worktree pattern. `[BOOTSTRAP-SLOT-ENFORCE]` was used as a one-shot bypass for this scaffold commit only.

## Related

[[skills/goal|/goal]] · [[skills/checkin-juliett|/checkin-juliett]] · [[skills/pick-unit|/pick-unit]] · [[reference_fusion_tooling_catalog_2026_05_23]] · [[reference_vendor_catalog_misclassification_2026_05_23]] · [[feedback_conflict_fork_rule]] · [[feedback_psn_definition]]
