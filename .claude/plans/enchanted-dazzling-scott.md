# TOOL-CATALOG-INGEST-MS0 — Plan

## Context

PRISM currently has 38 vendor tool catalogs (PDFs) sitting at `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/` representing an estimated **35,920 tools** missing from `ToolRegistry` (current: 54K, target: 90K per `vendor-catalog-manifest.json`). Today the catalogs are only **text-extracted** via pdftotext (publisher + grade families + coating mentions); the actual structured per-tool data — geometry, cutting parameters per material × operation, holder compatibility, 2D/3D dimensional envelopes — is **not yet in the database**. STEP files for collision avoidance + CAD/CAM AI training data are also missing.

This milestone closes that gap with a 5-phase pipeline that **builds on existing infrastructure**, not green-field. Recon confirmed: schema is mature, STEP parser is installed (occt-import-js WASM), CAM-LoRA trainer is wired, collision engines are ready. The actual delta is (a) per-vendor PDF→structured-JSON extractors with table parsing, (b) vendor portal scrapers for STEP files, (c) merge orchestrator into ToolRegistry, (d) wiring into existing CAM-LoRA + collision pipelines.

User-approved scope decisions: **PDF-first**, **operator-provides-creds for portal phase**, **store all STEP locally** (~20-50GB on 4TB SSD) **to feed CAD/CAM AI training**.

## Goal

Every tool in the 38 owned catalogs (~36K entries) lives in `ToolRegistry` with:
- Geometry (D, L, flute count, helix, corner radius, neck, shank, edge prep)
- Cutting parameters per ISO group × operation (SFM min/max/recommended, fz, ap_max, ae_max, conditions, coolant)
- Coating (substrate, coating type, thickness, max temp)
- Holder compatibility (interface, gauge length, max RPM)
- Application scenarios (roughing/finishing/profiling/slotting, material recommendations, surface-finish targets)
- 2D dimensional envelope (parametric cylinder for collision check)
- STEP file path when available (for full 3D collision + AI training)
- Source provenance (catalog file, page, confidence, last_verified date)

## Architecture (build on existing)

```
H:/prism/resources/MANUFACTURER_CATALOGS/
├── uploaded/                          # 38 PDFs (existing)
├── step/<vendor>/<part-number>.step   # NEW — vendor STEP files
└── extracted/<vendor>-<type>-extracted.json   # NEW — per-vendor structured (matches manifest.targetJson contract)

mcp-server/data/
├── tool-catalog-inventory.json        # existing — extend with per-tool count + last_ingest_at
├── vendor-catalog-manifest.json       # existing — drives the extraction queue
└── catalog-extractions/               # existing empty dir — fill with per-vendor outputs
```

## Phases & Units

### Phase A — Schema + Scaffold (3 units)

- **U-TCI-A1**: Define `CatalogExtractionResult` schema (`mcp-server/src/schemas/CatalogExtractionResult.ts`) matching `vendor-catalog-manifest.json[].targetJson` contract. Reuse `CatalogExtractionEngine.CuttingDataSet` shape (already exists with isoGroup, Vc/fz/ap/ae min/max/recommended, conditions, coolant, source). Add `step_file_path?`, `datasheet_pdf_path?`, `application_scenarios[]`, `collision_envelope: {boundingCylinderD, boundingCylinderL, neckD?, neckL?, shankD, gaugeLength?}`.
- **U-TCI-A2**: Extend `CuttingTool` interface in `mcp-server/src/registries/ToolRegistry.ts` with the same `step_file_path?` + `datasheet_pdf_path?` + `collision_envelope` fields. Backward compatible (all optional).
- **U-TCI-A3**: Storage convention helpers (`scripts/lib/catalog-storage-paths.mjs`) — `stepPathFor(vendor, partNumber)`, `extractedJsonPathFor(vendor, type)`, `pdfPathFor(filename)`. Single source of truth so downstream scripts never hard-code paths.

### Phase B — PDF Table Extraction (5 units, one per vendor batch)

Today's pipeline uses **pdftotext only** (text). Cutting-parameter tables need column parsing. Add **camelot-py** (Python) as the table-extraction backend, invoked via `execFileAsync(PYTHON_PATH, ...)` from `documentLearningDispatcher.ts` (the existing dispatcher pattern).

- **U-TCI-B1**: `scripts/extract-vendor-pdf.mjs` orchestrator — for one vendor: enumerate matching PDFs from manifest, run camelot extraction → cutting tables, run pdftotext → narrative, classify each detected entity (tool, holder, insert, accessory) via existing `CatalogExtractionEngine`, write `extracted/<vendor>-<type>-extracted.json` matching the A1 schema. Idempotent + resumable (skip if hash unchanged).
- **U-TCI-B2..B5**: Per-vendor batches in priority order (highest estimated tool count first per `manifest.estimatedTools`):
  - **B2**: Iscar (3 catalogs, ~18.7K tools) + Tungaloy GC_* series (8 catalogs, ~17.7K tools) — **largest first**
  - **B3**: Kennametal (3 catalogs) + Korloy (2) + Big Daishowa (1) + AMPC (1, ~6.6K)
  - **B4**: Mid-tier — Sandvik, MA Ford, Rego-Fix, Emuge, Guhring, Seco, OSG, SGS, YG-1, Mitsubishi, Flash
  - **B5**: Tail — Global CNC, Rapidkut, Orange Vise, AccuPro, Metalmorphosis, zeni, YU25, Tooling Systems

Each B-unit: extract → review CuttingDataSet output against the source PDF spot-check (R12 fail-loud) → merge into ToolRegistry via U-TCI-D1 → per-file scrutiny gate → commit.

### Phase C — STEP File Local-Catalog Ingest (2 units)

Some vendor PDFs reference STEP/CAD downloads via the vendor website (URLs embedded in the PDF). Extract those URLs first to seed the portal phase.

- **U-TCI-C1**: Scan all 38 extracted JSONs for embedded vendor URLs → write `state/shared/specs/VENDOR-STEP-URL-INVENTORY.json` (per-vendor list of part-number → URL pairs). Advisory list for phase D.
- **U-TCI-C2**: For any STEP files that already exist on disk (check `resources/CAD FILES/`, `resources/MACHINE MODELS/`, `JM DIE/`), index them into `mcp-server/data/state/STEP_FILE_INDEX.json` (path, vendor-inferred, part-number-inferred, SHA-256). Cross-reference into ToolRegistry's `step_file_path` field where part-number matches an extracted tool.

### Phase D — Vendor Portal Scrapers (6 units, gated on operator creds)

Use **playwright-mcp** (already installed) for browser automation. One scraper per portal, sharing a common pattern (`scripts/lib/vendor-portal-base.mjs`): rate-limited, cookie-jar persisted, resumable via per-part checkpoint file. **Strictly respect each site's robots.txt + ToS** — when scraping is disallowed, fall back to spec-sheet PDF download only.

- **U-TCI-D1**: Catalog merge orchestrator — `scripts/merge-catalog-extraction-to-registry.mjs`. Reads extracted/*.json, dedup against existing ToolRegistry via `duplicationGuardEngine` (existing), upserts with provenance trail. Wired into a new `dataDispatcher` action `catalog_extraction_merge`.
- **U-TCI-D2**: **PTS Tools scraper** — `scripts/scrape-pts-tools.mjs`. Per recon: site has `/all-categories/[cat]/[sub]/[product].html` URL pattern, e-commerce only. Scrape product detail pages for spec sheet PDFs + STEP download links if exposed.
- **U-TCI-D3**: **Misumi scraper** — `scripts/scrape-misumi.mjs`. Requires login (operator-provided creds via `capture-claude-credentials` skill). Misumi exposes STEP via the meCAD configurator on product pages — playwright walks the configurator to "Generate STEP" → download → store at `resources/MANUFACTURER_CATALOGS/step/misumi/<part>.step`. Aggressive rate-limit (1 req / 3s).
- **U-TCI-D4**: **Sandvik CoroPlus** scraper — uses their public Tool Library export endpoint (`coromant.com/coroplus/toollibrary`). Better than scraping — actually a documented data export.
- **U-TCI-D5**: **Kennametal NOVO + Iscar etool** scrapers — both vendor portals with structured product data + STEP downloads (better signal than catalog PDFs).
- **U-TCI-D6**: **GrabCAD + TraceParts** STEP backfill — for any tool/part-number in ToolRegistry where `step_file_path` is still null after D2-D5, query these two community libraries (both have search APIs / scraping-tolerant pages) as STEP-of-last-resort.

### Phase E — AI Training + Collision Wiring (3 units)

- **U-TCI-E1**: Wire the new STEP corpus into existing `CADCorpusIngesterEngine` — add `resources/MANUFACTURER_CATALOGS/step/**/*.step` to its scan roots. Output appends to existing `data/state/CAD_CORPUS_ALLVENDOR.jsonl`. Triggers `CADTrainingCorpusOrchestratorEngine` for the next CAD-LoRA training cycle.
- **U-TCI-E2**: Wire cutting-parameter priors into `UltimateSpeedFeedEngine.GRADE_SPEED_FACTORS` — when a tool from the catalog is selected, its per-ISO-group recommended Vc/fz from `CuttingDataSet` becomes a calibration overlay prior, not a hard override. The orchestrator already supports calibration overlays (`sf_autopilot_run`).
- **U-TCI-E3**: Wire `collision_envelope` into existing `CollisionDetectionEngine` — when a catalog tool is referenced in a job, build the parametric bounding-cylinder + holder envelope automatically from the catalog dims. No collision-physics changes; just a data-flow wire so collision checks pick up the new tool DB without per-job manual envelope entry.

### Phase F — System-viz + PSN synergy (1 unit)

- **U-TCI-F1**: Extend `scripts/generate-vendor-catalog-features.mjs` (shipped in iter15) — replace the placeholder 38-leaf roost with **live per-vendor stats**: tool_count_extracted, step_files_downloaded, ai_training_coverage_pct. Register in `regen-viz.mjs FAST[]` + `merge-augmentations.mjs` splice (the U-AUDIT-V5 follow-on we deferred). Add a new `ghost.tool_step_corpus` L7 roost with leaves per vendor showing STEP coverage.

## Critical files (reuse, do not reinvent)

| Existing asset | Path | How it's used |
|---|---|---|
| `CuttingTool` interface | `mcp-server/src/registries/ToolRegistry.ts` | Target schema for U-TCI-A2 extension |
| `CatalogExtractionEngine` + `CuttingDataSet` | `mcp-server/src/engines/CatalogExtractionEngine.ts` | Output schema for U-TCI-B PDF extractors |
| `VendorCatalogManifestEngine` | `mcp-server/src/engines/VendorCatalogManifestEngine.ts` | Drives the extraction queue (manifest.catalogs[]) |
| `documentLearningDispatcher` | `mcp-server/src/tools/dispatchers/documentLearningDispatcher.ts` | Pattern for execFileAsync(PYTHON_PATH, ...) — copy for camelot wrapper |
| `StepImportEngine` (occt-import-js WASM) | `mcp-server/src/engines/StepImportEngine.ts` | STEP→mesh + bounding box for U-TCI-D3 Misumi |
| `STEPGeometryParserEngine` | `mcp-server/src/engines/STEPGeometryParserEngine.ts` | Feature inference from STEP entities |
| `CADCorpusIngesterEngine` + `CADTrainingCorpusOrchestratorEngine` | `mcp-server/src/engines/CADCorpusIngesterEngine.ts`, `CADTrainingCorpusOrchestratorEngine.ts` | Already supports `.step` files — U-TCI-E1 only adds the new dir to scan roots |
| `CAMLoRAAdapterTrainerEngine` + `CAMLoRAEngine` | `mcp-server/src/engines/CAMLoRAAdapterTrainerEngine.ts`, `CAMLoRAEngine.ts` | Picks up the new corpus automatically on next training run |
| `CollisionDetectionEngine` (AABB/OBB/SAT) | `mcp-server/src/engines/CollisionDetectionEngine.ts` | Consumes `collision_envelope` for U-TCI-E3 |
| `ToolHolderDatabaseEngine` (80+ holder types) | `mcp-server/src/engines/ToolHolderDatabaseEngine.ts` | Validates holder compatibility per ingested tool |
| `UltimateSpeedFeedEngine.GRADE_SPEED_FACTORS` | `mcp-server/src/engines/UltimateSpeedFeedEngine.ts` | Calibration-overlay target for U-TCI-E2 |
| `duplicationGuardEngine` | `mcp-server/src/engines/DuplicationGuardEngine.ts` | Dedup gate for merge orchestrator |
| `dataDispatcher` (144 actions, `catalog_*` + `mfr_catalog_*` + `tool_enrich_*`) | `mcp-server/src/tools/dispatchers/dataDispatcher.ts` | New action `catalog_extraction_merge` wires here |
| Apr 16 manifest (authoritative publisher labels) | `mcp-server/data/vendor-catalog-manifest.json` | Source of truth for B-phase per-vendor batching |
| iter14 pdftotext sidecars | `mcp-server/data/tool-catalog-inventory.json[].pdftotext_extraction` | Already-extracted text seed for B-phase; cross-check publishers |
| Playwright MCP | `.mcp.json` | Browser automation for D-phase scrapers |
| Existing chrome-devtools-mcp | already installed | Companion for D-phase auth flows |

## Slot allocation

- **alpha + bravo** (parallel) — Phase B PDF extraction (B2-B5), one vendor batch each in parallel slot worktrees
- **charlie** — Phase A schema + scaffold (small, blocks B-phase), then Phase C STEP local indexing
- **delta** — Phase D portal scrapers (one at a time, sequential to avoid concurrent browser sessions)
- **echo** — Phase E AI + collision wiring (after B-phase delivers data)
- **juliett** — Phase F system-viz augmentation + close-out (juliett owns vendor-catalog lineage from this session)
- **golf** — hygiene/integration only (no feature commits per allowlist)

Each unit: per-file scrutiny gate (2 parallel reviewers per file) + 3-of-3 Stop gate + slot-routed commit. Standard SF-PSN-WIRE-MS0 protocol.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Misumi/PTS ToS may prohibit bulk scraping | Phase D-2/D-3 starts with publicly-available spec PDFs only; STEP scraping behind auth + per-vendor rate limit (1 req / 3-5s); fall back to D-6 GrabCAD/TraceParts for any vendor that blocks |
| Camelot table extraction may misparse complex multi-row cutting tables | R12 fail-loud: every extracted vendor JSON is spot-checked against 5 random source PDF pages before merge; confidence-tagged in `source` field; bad rows → manual flag, not silent drop |
| 21 missing zip-part gaps (still operator-blocked) | Not in scope — the 38 already-uploaded PDFs deliver ~36K tools, blocked zip parts are a separate operator action |
| occt-import-js WASM memory limits on giant STEP files | Per-STEP byte-cap (50MB hard, 100MB warn); fall back to STEPGeometryParserEngine text-only feature inference for oversize files |
| Disk: ~20-50GB of STEP files | Operator OK'd 4TB SSD; storage convention isolates STEP files in their own subtree for easy backup/exclusion |
| Vendor catalog publisher mis-attribution (iter12 lesson) | Authoritative source: pdftotext cover-page verification > Apr manifest pattern-guess > filename heuristic. Resolution order codified in U-TCI-B1 |

## Verification

After each phase:

**A**: `npx tsc --noEmit` passes; `vitest run src/schemas/__tests__/CatalogExtractionResult.test.ts` passes; backward-compat — every existing `CuttingTool` row still loads.

**B**: For each vendor batch, `node scripts/extract-vendor-pdf.mjs --vendor <name> --verify` reports tool-count, cutting-data-row count, and spot-checks 5 random tools against source PDF pages. Compare against `manifest.catalogs[].estimatedTools` — should be ±15%.

**C**: `node scripts/index-step-files.mjs --report` shows count + total bytes; cross-reference hit-rate for `step_file_path` linkage in ToolRegistry.

**D**: Per scraper, `--dry-run` mode walks 10 sample products without download to verify selectors. Production runs are resumable + idempotent (per-part checkpoint file prevents re-downloads).

**E**: `npx vitest run --testNamePattern "catalog-corpus|catalog-overlay|catalog-collision"` — round-trip test for each wiring (a tool from a B-phase extraction surfaces correctly in `prism_calc:auto_speed_feed_calc` + `prism_safety:check_collision`).

**F**: `node scripts/generate-vendor-catalog-features.mjs && node scripts/regen-viz.mjs --augment-only` — `/system-viz` shows live per-vendor coverage stats.

**Milestone close**: `MILESTONE_PROGRESS` shows 20/20 units; `BUILD_STATE` engine count unchanged (no new engines — pure orchestration + data); ToolRegistry tool count ≥ 85K (54K + extracted); CAD corpus +STEP count visible; commit chain `[TOOL-CATALOG-INGEST-MS0]/U-TCI-*` clean.

## What this does NOT do (intentional non-scope)

- Does not solve the 21 missing zip-part gaps (operator action)
- Does not add new physics/cutting models (calibration overlays only — `UltimateSpeedFeedEngine` is authoritative)
- Does not introduce a new vendor data format — reuses `CatalogExtractionEngine.CuttingDataSet` as defined today
- Does not store STEP file binary inside ToolRegistry — only the path reference
- Does not run unattended portal scraping without operator-provided creds (D-3..D-5 are gated)
- Does not change the existing PDF text extraction path (pdftotext stays; camelot is additive for table parsing)
