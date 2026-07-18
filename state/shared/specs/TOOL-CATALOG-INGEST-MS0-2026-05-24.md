# TOOL-CATALOG-INGEST-MS0 — Spec (2026-05-24)

> Operator-facing summary. Authoritative envelope: `mcp-server/data/milestones/TOOL-CATALOG-INGEST-MS0.json`. Plan: `H:/.claude/plans/enchanted-dazzling-scott.md`.

## Why

PRISM owns 38 vendor tool catalogs at `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/` representing **~35,920 tools** missing from `ToolRegistry` (current 54K → target 90K per `vendor-catalog-manifest.json` Apr-16-2026). Today only **text** (publisher + grade families + coatings) is extracted via pdftotext — the structured per-tool data (geometry, cutting parameters per material × operation, holder compatibility, 2D/3D dimensional envelopes) is **not yet in the database**. STEP files for collision avoidance + CAD/CAM AI training are also missing.

This milestone closes that gap with a 6-phase pipeline that **builds on existing infrastructure** rather than green-field. Recon confirmed: tool-registry schema is mature, STEP parser is installed (occt-import-js WASM), CAM-LoRA trainer is wired, collision engines are ready.

## Prior art to align with (read first)

- **mike 2026-05-23**: `H:/prism-slot-mike/scripts/extract-fusion-tooling-catalog.mjs` + `state/shared/FUSION-TOOLING-CATALOG-2026-05-23.json` (947 KB, 712 tools / 329 presets / 8 libraries). Pattern source for vendor PDF extractors. Memory: `[[reference_fusion_tooling_catalog_2026_05_23]]`. **The U-TCI-A1 schema MUST share top-level keys** (`schemaVersion`, `generatedAt`, `advisoryOnly`, `must_human_verify`, `purpose`, `summary`, `raw_tools`) so the two ingest paths produce interoperable JSON.
- **iter12-15 vendor-catalog audit (this session)**: `scripts/vendor-catalog-audit.mjs` + `scripts/vendor-catalog-summarize.mjs` + `state/shared/specs/VENDOR-CATALOG-{AUDIT,SUMMARIES}-2026-05-23.{json,md}`. Already provides per-PDF publisher verification (30 of 38 verified via pdftotext cover-page).
- **April vendor-catalog-manifest.json**: source of truth for per-vendor `targetJson` paths + estimated tool counts.

## Scope

20 units across 6 phases. **Pure orchestration + data**, no new physics engines (calibration overlays only). Detailed unit list in the envelope.

| Phase | Name | Units | Owner | Blocks |
|-------|------|-------|-------|--------|
| **A** | Schema + Scaffold | 3 (A1-A3) | juliett (this session) | B,C,D,E,F |
| **B** | PDF Table Extraction | 5 (B1-B5) | alpha + bravo parallel | D1,E2 |
| **C** | STEP Local Ingest | 2 (C1-C2) | charlie | D6 |
| **D** | Vendor Portal Scrapers | 6 (D1-D6) | delta | E1,E3,F |
| **E** | AI Training + Collision Wiring | 3 (E1-E3) | echo | F |
| **F** | System-viz + close-out | 1 (F1) | juliett | — |

## User-approved decisions (2026-05-24)

| Decision | Choice |
|----------|--------|
| Build order | **PDF-first, then portals** — extract owned data before chasing live STEP files |
| Auth | **Operator provides creds** for Misumi / Sandvik CoroPlus / Kennametal NOVO / Iscar etool |
| STEP storage | **Store all locally** at `H:/prism/resources/MANUFACTURER_CATALOGS/step/<vendor>/` (~20-50GB on 4TB SSD) |
| STEP purpose | Both **collision-avoidance** AND **CAD/CAM AI training data** (feeds CADCorpusIngesterEngine) |

## Critical existing infrastructure (reuse, do not reinvent)

| Asset | Path | Use |
|-------|------|-----|
| `CuttingTool` interface | `mcp-server/src/registries/ToolRegistry.ts` | Target — extend with 3 optional fields (A2) |
| `CatalogExtractionEngine.CuttingDataSet` | `mcp-server/src/engines/CatalogExtractionEngine.ts` | Cutting-data shape reused by A1 |
| `VendorCatalogManifestEngine` | `mcp-server/src/engines/VendorCatalogManifestEngine.ts` | Drives extraction queue |
| `documentLearningDispatcher` | `mcp-server/src/tools/dispatchers/documentLearningDispatcher.ts` | execFileAsync(PYTHON_PATH, ...) pattern for camelot wrapper |
| `StepImportEngine` (occt-import-js WASM) | `mcp-server/src/engines/StepImportEngine.ts` | STEP→mesh + bounding box |
| `STEPGeometryParserEngine` | `mcp-server/src/engines/STEPGeometryParserEngine.ts` | Feature inference fallback |
| `CADCorpusIngesterEngine` | `mcp-server/src/engines/CADCorpusIngesterEngine.ts` | Already accepts .step — only add new scan root in E1 |
| `CADTrainingCorpusOrchestratorEngine` | `mcp-server/src/engines/CADTrainingCorpusOrchestratorEngine.ts` | Auto-picks new corpus on next train cycle |
| `CAMLoRAAdapterTrainerEngine` + `CAMLoRAEngine` | `mcp-server/src/engines/CAMLoRA*.ts` | Per-vendor LoRA adapters consume training data |
| `CollisionDetectionEngine` (AABB/OBB/SAT) | `mcp-server/src/engines/CollisionDetectionEngine.ts` | Consumes `collision_envelope` for E3 |
| `ToolHolderDatabaseEngine` | `mcp-server/src/engines/ToolHolderDatabaseEngine.ts` | 80+ holder types, spindle-taper validation |
| `UltimateSpeedFeedEngine.GRADE_SPEED_FACTORS` | `mcp-server/src/engines/UltimateSpeedFeedEngine.ts` | Calibration-overlay target (E2) |
| `duplicationGuardEngine` | `mcp-server/src/engines/DuplicationGuardEngine.ts` | Dedup gate for merge orchestrator (D1) |
| `dataDispatcher` (144 actions) | `mcp-server/src/tools/dispatchers/dataDispatcher.ts` | New action `catalog_extraction_merge` wires here |
| Apr 16 vendor-catalog-manifest | `mcp-server/data/vendor-catalog-manifest.json` | Per-vendor batching authority |
| iter14 pdftotext sidecars | `mcp-server/data/tool-catalog-inventory.json[].pdftotext_extraction` | Already-extracted text seed |
| playwright-mcp + chrome-devtools-mcp | `.mcp.json` | Browser automation for D-phase |
| `capture-claude-credentials` skill | `.claude/commands/capture-claude-credentials.md` | Operator-creds capture for D3-D5 |
| Mike's fusion extractor | `H:/prism-slot-mike/scripts/extract-fusion-tooling-catalog.mjs` | Pattern source for B1 orchestrator |

## Disk layout (new)

```
H:/prism/resources/MANUFACTURER_CATALOGS/
├── uploaded/                                # 38 PDFs (existing)
├── datasheets/<vendor>/<part-number>.pdf   # NEW — per-part spec sheets from D-phase scrapers
├── step/<vendor>/<part-number>.step        # NEW — vendor STEP files
└── extracted/<vendor>-<type>-extracted.json # NEW — per-vendor structured data
                                              # naming matches vendor-catalog-manifest.json[].targetJson contract

H:/prism/mcp-server/data/
├── tool-catalog-inventory.json              # existing — extend with per-tool count + last_ingest_at
├── vendor-catalog-manifest.json             # existing — drives extraction queue
└── catalog-extractions/                     # existing empty dir — Phase B fills it
```

## Risks + mitigations

| Risk | Mitigation |
|------|------------|
| Misumi / PTS ToS may prohibit bulk scraping | D2/D3 starts with publicly-visible spec PDFs only; STEP scraping behind auth + 1 req / 3-5s rate limit; D6 GrabCAD/TraceParts fallback for blocked vendors |
| Camelot table extraction may misparse complex multi-row cutting tables | R12 fail-loud: every extracted vendor JSON spot-checks 5 random source PDF pages before merge; confidence-tagged in `source` field |
| 21 missing zip-part gaps still operator-blocked | Out of scope — the 38 already-uploaded PDFs deliver ~36K tools |
| occt-import-js WASM memory limits on giant STEP files | 50MB hard cap + STEPGeometryParserEngine text-only fallback |
| 20-50GB STEP disk | Operator OK'd 4TB SSD; storage convention isolates to a single subtree for easy backup/exclusion |
| Vendor publisher mis-attribution (iter12 lesson) | Authoritative order: pdftotext cover-verify > Apr manifest > filename heuristic |
| Slot worktree concurrency (peer-sweep #5 observed this session) | Strict slot allocation in envelope; each unit commits in its own slot worktree; juliett delegates B-F to other slots after Phase A |

## Verification (per-phase)

- **A**: `npx tsc --noEmit` clean; `vitest run scripts/lib/__tests__/catalog-storage-paths.test.mjs` PASS; ToolRegistry schema backward-compat.
- **B**: `node scripts/extract-vendor-pdf.mjs --vendor <name> --verify` — tool-count within ±15% of `manifest.estimatedTools`, 5-of-5 spot-check verbatim-match.
- **C**: `node scripts/index-step-files.mjs --report` — cross-reference linkage rate ≥ 5% (any non-zero on first pass).
- **D**: Per scraper `--dry-run --sample 10`; per-part checkpoint resumability proven.
- **E**: `npx vitest run --testNamePattern 'catalog-corpus|catalog-overlay|catalog-collision'`.
- **F**: `node scripts/generate-vendor-catalog-features.mjs && node scripts/regen-viz.mjs --augment-only`.
- **Milestone close**: 20/20 units; ToolRegistry tool count ≥ 85K; CAD corpus +STEP count visible; commit chain `[TOOL-CATALOG-INGEST-MS0]/U-TCI-*` clean.

## PSN synergy targets

- **PSN-OS (Obsidian brain)** — Cross-link extracted tool specs to Obsidian memories via `/route-to-obsidian` (Phase F)
- **PSN-Wiki** — Promote per-vendor extraction summaries to `knowledge/wiki/code-tribal/` (Phase F)
- **PSN-Tribal** — Mine vendor recommended-cutting-data into tribal tips (Phase E2)
- **PSN-AI** — Cutting params feed `UltimateSpeedFeedEngine.calibrationFactors`; STEP files feed CAD-LoRA (Phase E1+E2)
- **PSN-Engines** — Extracted GRADE_SPEED_FACTORS + coating multipliers into ExtendedTaylor + Kienzle overlays (Phase E2)
- **PSN-System-Viz** — Live per-vendor stats roost (Phase F1)

## Out of scope

- Re-uploading the 21 missing zip parts (operator action)
- New physics/cutting models (calibration overlays only)
- New vendor data format (reuses `CatalogExtractionEngine.CuttingDataSet`)
- Storing STEP binary inside ToolRegistry (path reference only)
- Unattended portal scraping without operator creds (D3-D5 gated)
- Changing existing pdftotext path (camelot additive for table parsing)
