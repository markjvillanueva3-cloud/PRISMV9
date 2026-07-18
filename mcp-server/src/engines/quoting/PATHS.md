# Quoting Galaxy — PATHS.md (H:/-wide path atlas, slot:charlie 2026-05-28)

> Converts every future Grep/Glob for slot:charlie from O(N) → O(1). Absolute paths are canonical (main tree `H:/prism`); the slot worktree mirrors them on `slot/charlie`. `(verify)` = path asserted by a sister artifact but not re-confirmed this session — confirm before relying. Enumerated against the **main tree** 2026-05-28 (78 cost/quote engines counted live).

## Galaxy sentinel (this dir)
| Path | Purpose |
|------|---------|
| `mcp-server/src/engines/quoting/CLAUDE.md` | Galactic-center doctrine — domain scope, engines, gotchas, PSN edges |
| `mcp-server/src/engines/quoting/MEMORY.md` | Per-domain working brain (master-brain link + High-ROI memories) |
| `mcp-server/src/engines/quoting/PATHS.md` | This file |
| `mcp-server/src/engines/quoting/TOOLBELT.md` | Tool-call efficiency patterns |

## Engine source (flat at `mcp-server/src/engines/` — 78 Cost*/Quote*/Estimat*/Pricing*/Freight*/Import* files)
| Path | Role |
|------|------|
| `mcp-server/src/engines/InstantQuoteEngine.ts` (~38K) | Instant-quote pipeline (largest orchestrator) |
| `mcp-server/src/engines/BlueprintToQuoteBridgeEngine.ts` (~15K) | Print-to-quote entry point |
| `mcp-server/src/engines/QuoteEngine.ts` | Core quote engine |
| `mcp-server/src/engines/QuoteEstimatorEngine.ts` | Quote estimation |
| `mcp-server/src/engines/QuoteAutopilotEngine.ts` | Autonomous quote draft |
| `mcp-server/src/engines/QuoteRevisionEngine.ts` | Quote revisioning / history |
| `mcp-server/src/engines/QuoteAnalyticsEngine.ts` | Quote conversion + accuracy analytics |
| `mcp-server/src/engines/QuoteScenarioGeneratorEngine.ts` | What-if quote scenarios |
| `mcp-server/src/engines/QuoteToOrderBridgeEngine.ts` | Quote → order handoff (→ hotel ERP) |
| `mcp-server/src/engines/QuoteToShipOrchestratorEngine.ts` | Quote-to-ship full pipeline |
| `mcp-server/src/engines/QuoteOutcomeFeedEngine.ts` | Outcome feedback into quote model |
| `mcp-server/src/engines/QuoteOutcomePSIDeltaBridgeEngine.ts` | PSI-delta scoring on outcomes |
| `mcp-server/src/engines/JMDieQuoteTrainingPipelineEngine.ts` | JM Die-specific training loop |
| `mcp-server/src/engines/JobCostingEngine.ts` (~22K) | Core job-cost rollup |
| `mcp-server/src/engines/ActualCostEngine.ts` (~17K) | Actual-cost calc (canonical; `.ts-1.archive.2026-05-27.corrupted` = old backup, do NOT use) |
| `mcp-server/src/engines/CostEstimationEngine.ts` / `CostEstimatorEngine.ts` | Cost estimation (possibly redundant — consolidation candidate) |
| `mcp-server/src/engines/CycleTimeEstimatorEngine.ts` (~48K) | Cycle time → cost |
| `mcp-server/src/engines/GCodeTimeEstimatorEngine.ts` (~7K) | G-code runtime → cost |
| `mcp-server/src/engines/FreightCostEngine.ts` / `ImportCostEngine.ts` | Freight + duty/import cost |
| `mcp-server/src/engines/CoolantCostOptimizationEngine.ts` | Coolant lifecycle cost |
| `mcp-server/src/engines/CostSavingsTrackerEngine.ts` (~22K) | Savings-vs-baseline tracking |
| `mcp-server/src/engines/CostAlarmEngine.ts` (~21K) | Over-budget alarming |
| `mcp-server/src/engines/CostAwareRouterEngine.ts` (~7K) | Cost-optimal work routing |
| `mcp-server/src/engines/CostEfficiencyBridgeEngine.ts` (~16K) | Efficiency-vs-cost surface |
| `mcp-server/src/engines/HistoricalMaterialPriceEngine.ts` | Material price vintage curves |
| `mcp-server/src/engines/AdditiveQuoteEngine.ts` (~17K) | Additive/3DP quote |
| `mcp-server/src/engines/CastingQuoteEngine.ts` (~17K) | Casting quote |
| `mcp-server/src/engines/InjectionMoldQuoteEngine.ts` (~19K) | Injection-mold quote |
| `mcp-server/src/engines/SheetMetalQuoteEngine.ts` | Sheet-metal quote |
| `mcp-server/src/engines/LatheActualCostReconciliationEngine.ts` (~19K) | Lathe quote-vs-actual (cross-galaxy ↔ whiskey) |
| `mcp-server/src/engines/ERPCostFeedbackEngine.ts` (~10K) | Closes quote loop into ERP (cross-galaxy ↔ hotel) |
| _full list_ | `rtk grep -l "Quote\|Cost\|Estimat\|Pricing\|Freight\|Import" mcp-server/src/engines/*.ts` → 78 |

## Dispatchers (primary execution surface — prefer over inlining)
| Path | Quoting actions |
|------|-----------------|
| `mcp-server/src/tools/dispatchers/businessDispatcher.ts` (`prism_business`) | `quote_estimate`, `instant_quote`, `instant_quote_qty_breaks`, `instant_quote_lead_time`, `quote_revise`, `quote_generate_share_token`, `actual_cost_*`, `analytics_*`, `blueprint_to_quote`, `sheet_metal_quote`, `additive_quote`, `injection_mold_quote`, `casting_quote`, `multi_process_quote`, `roi_*`, many more |
| `mcp-server/src/tools/dispatchers/quotingDispatcher.ts` (`prism_quoting`) | `camera_intake_route`, `quote_xometry_style`, `outsource_recommend`, `scenario_generate`, `jm_die_docustrata_ingest`, `jm_die_quote_training_pipeline`, `gcode_time_estimate`, `inflation_adjust`, `fair_market_value`, `quote_outcome_feed`, `quoting_calibration_*`, `accuracy_*`, `deep_reasoning_*`, `quoting_*` |

## Constants (READ-ONLY — never inline)
| Path | Constant family |
|------|-----------------|
| `mcp-server/src/data/jm-die-profile.ts` | Per-shop machine-hour rates, labor, overhead, margin |
| `mcp-server/src/registries/machine-rates.ts` (verify) | Per-machine $/hr |
| `mcp-server/src/data/customer-profile.ts` (verify) | Customer terms, payment, discounts |
| `HistoricalMaterialPriceEngine.ts` runtime + persisted state | Material price + vintage |
| `mcp-server/src/physics/constants.ts` | Kienzle/Taylor — cited by cycle-time→cost, NEVER inlined |

## State / ledgers / corpora
| Path | Purpose |
|------|---------|
| `state/shared/quoting/baseline-records-corpus-with-synth.json` | Synth-augmented training baseline (47,905 records, iter58) |
| `state/shared/quoting/baseline-records-corpus-with-real.json` | Real-revenue overlay baseline (iter59) |
| `state/shared/quoting/baseline-records-corpus.json` / `baseline-records.json` / `baseline-records-with-synth.json` | Baseline corpus variants |
| `state/shared/quoting/latest-drift-alert.json` | **Canonical drift surface** — freshness gate before training |
| `state/shared/databases/jm-customers.jsonl` (~152KB, 473 customers) | Per-customer features (aliases, files-by-bucket, materials, machine-classes) |
| `state/shared/databases/jm-vendors.jsonl` (~3.4KB, 12 vendors) | Per-vendor grade/spend/unit-price stats |
| `mcp-server/data/state/cost-alarm-config.json` | Cost-alarm thresholds |
| `mcp-server/data/state/cost-telemetry.jsonl` | Cost-routing telemetry (append-only) |
| `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json` | Quoting milestone envelope (QUOTING-SYNERGY-MS0 lives in roadmap-index, not a milestone JSON) |

## Scripts (audit / build / regen for this domain)
| Path | Purpose |
|------|---------|
| `scripts/quoting-pipeline-verify.mjs` | **Single-command health check** — auto-discovers + runs quoting tests, aggregates TAP (`--json` for one number) |
| `scripts/quoting-alert-banner.mjs` | Formats `latest-drift-alert.json` for SessionStart injection |
| `scripts/quoting-baseline-bootstrap.mjs` | Bootstrap baseline (iter9-41 filter chain) + 4 test sidecars (balance/distribution/filter/variance) |
| `scripts/quoting-baseline-from-corpus.mjs` | iter58 — full-corpus baseline (streams jm-file-inventory.jsonl → 47,905 records) |
| `scripts/quoting-real-revenue-overlay.mjs` | iter59 — overlay real invoices on synth baseline |
| `scripts/quoting-docustrata-bridge.mjs` / `quoting-docustrata-extractor.mjs` | DocuStrata ingest bridge |
| `scripts/jm-die-full-corpus-ingest.mjs` | 554,999-file corpus ingest → customers + vendors + inventory DBs |
| `scripts/install-quoting-pipeline-cron.ps1` | Cron installer for nightly pipeline verify |
| `scripts/generate-quoting-pipeline-features.mjs` | Emits quoting nodes into system-viz |

## JM Die corpus (NOT Glob-able — 24,545+ files time out)
| Path | Access |
|------|--------|
| `H:/PRISM/JM DIE/` | Root (24,545 files, 473 customers). API: `prismSelfAwarenessEngine.getJMDieCustomerPath()` |
| `H:/PRISM/JM DIE/_PART LIBRARY/` | 473 customer folders |
| `H:/PRISM/JM DIE/Docustrata/` | 111,745 docs (INBOUND prints — 72% SCAN_GENERIC, NOT outbound revenue) |
| ⚠ `H:/PRISM/JM DIE/QUOTES/` | Does NOT exist (brief seed path was speculative) |

## Hooks / skills / wiki / memory
| Path | Purpose |
|------|---------|
| `.claude/hooks/slot-context-bundle-inject.mjs` | `SLOT_GALAXY_MAP` line 67 `charlie: "quoting"` — galaxy auto-load |
| `.claude/commands/quote-charlie.md` | `/quote-charlie` galaxy health + pickup macro (slot skill) |
| `knowledge/wiki/architecture/quoting-galaxy.md` | Galaxy overview wiki bridge |
| `knowledge/wiki/architecture/quoting-pipeline-verify.md` | Pipeline-verify + discovery-glob lesson |
| `knowledge/wiki/lessons/quoting-filter-conservative-match.md` | Customer-name false-positive lesson |
| `C:/Users/wompu/.claude/projects/H--prism/memory/reference_charlie_quoting_*.md` | Per-session quoting memories (mirror → `H:/prism/knowledge/memories/reference/`) |

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for quoting:** `Docustrata/JMD Quotes` · `Docustrata/JMD Sales Orders` · `Docustrata/JMD Orders Closed` · `JM DIE/JM DIE COMPANY`
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the quoting galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMSoldOrdersDB** (JM Die Sold Orders (Outbound Revenue)) — `state/shared/quoting/jm-sold-orders.json` · 500 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMToolPurchasesDB** (JM Die Tool Purchases (Procurement Spend)) — `state/shared/quoting/jm-tool-purchases.json` · 49 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMVendorAPLedgerDB** (JM Die Vendor A/P Ledger) — `state/shared/quoting/jm-vendor-ap-ledger.jsonl` · 20,736 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MachineDB** (Machine Database) — `data/machines/` · 1,015 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MaterialDB** (Material Database) — `data/materials/` · 6,509 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PrismReferenceDB** (PRISM Unified Reference Database) — `mcp-server/data/prism-reference-db/` · 13,920 entries · manifest `mcp-server/data/prism-reference-db/MANIFEST.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ReportTemplateDB** (Report Template Database) — `data/databases/ReportTemplateDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToleranceDB** (ISO 286 Tolerance Database) — `data/databases/ToleranceDB.json` · 260 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToolDB** (Cutting Tool Database) — `data/tools/` · 13,967 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **VendorCatalogDB** (Vendor / Manufacturer Catalog Database) — `mcp-server/data/vendor-catalog-db/` · 425 entries · manifest `mcp-server/data/vendor-catalog-db/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **WorkholdingDB** (Workholding Reference Database) — `data/databases/WorkholdingDB.json` · 14 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/quoting/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/quoting_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="quoting" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs quoting "<question>"` (hybrid CAG+RAG, local Ollama, $0)
- UP (pull from master): `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- DOWN (push to master): write `<type>_<slot>_<topic>.md` -> master memory dir -> auto-fed to `knowledge/memories/<type>/`

**All resources -- easily pathed + usable (search the INDEX, never re-scan -- R8):**
- CAD/CAM/training/catalog/post/machine trove: `resources/RESOURCES-INDEX.md` (`H:/PRISM/resources/`) -- every CAM seat + catalogs + MIT courses + machine-sim + macro/post libs
- JM Die shop ground-truth (38,251 files): `mcp-server/data/jm-die-database/` (`manifest.json` + `.index/*.jsonl`) -- programs by controller, posts, Fusion CAD/CAM, tribal+wiki corpus
- Business/order/financial docs (257,992 files): `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` + `manifest.json` -- quote-to-ship + ERP ground truth (ALREADY indexed; do NOT re-OCR)
- Vendor catalog corpus: `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors + catalog tables)
- The 3 critical roots + per-galaxy db-intake/vendor-corpus are plotted in their own marked blocks below (`critical-resource-roots`, etc.).
- USAGE (query every resource from this domain): `prism_data:database_search` / `database_list` / `globalSearch` · skills `/resource-census` `/prism-paths` · new PDFs -> `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf) · skip-list `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md`
<!-- END:knowledge-atlas -->
