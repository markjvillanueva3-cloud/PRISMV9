# Business/ERP Galaxy — H:/-wide PATH atlas (slot:hotel)

> THE highest-ROI artifact: converts future hotel Grep/Glob from O(N over 2700 engines) → O(1). Format: `<absolute-path> | <purpose> | <maintainer-slot>`. Built 2026-05-28 from a live recon of the main tree. Re-verify a line before trusting it if this file's mtime is older than the referenced dir.
>
> **⚠ Tree note (worktree vs main):** the galaxy-BUILT artifacts — `jm-die-{vendor-registry,purchases-summary}.json`, the 3 hotel scripts (`ingest-docustrata-jm-report`/`business-domain-atlas`/`hotel-domain-awareness`), the 2 hotel hooks (`hotel-financial-invariant-guard`/`hotel-pii-redaction-guard`), and `HotelERPTribalKnowledgeEngine.ts` — currently exist ONLY in the `slot/hotel` worktree; the `H:/prism/...` paths below resolve after golf merges to main. The ~261 business engines + dispatcher ARE in main.
>
> **Geography fact:** business engines live FLAT in `mcp-server/src/engines/*.ts` (~261 matched the business/ERP/HR keyword set — a prefix-regex ESTIMATE, may include domain-adjacent). The `business/` subdir holds only the cascade brain (this file + CLAUDE.md + MEMORY.md + TOOLBELT.md). JM DIE has NO `ACCOUNTING/` or `HR/` subtree — back-office data is in PRISM state + engine-internal stores + the shop's VBA spreadsheet.

## Galaxy brain home (the cascade sentinels)
- `H:/prism/mcp-server/src/engines/business/CLAUDE.md` | galactic-center doctrine (8 sections + Related galaxies) | hotel
- `H:/prism/mcp-server/src/engines/business/MEMORY.md` | per-domain working brain (master-brain link + High-ROI + failure modes) | hotel
- `H:/prism/mcp-server/src/engines/business/PATHS.md` | this atlas | hotel
- `H:/prism/mcp-server/src/engines/business/TOOLBELT.md` | tool-call cheatsheet | hotel
- `H:/prism/mcp-server/src/engines/business/GSD.md` | domain GSD protocol + the 8 invariant RULES (session lifecycle / build / commit / close-out, 2026-05-29) | hotel
- `H:/prism/state/shared/slot-souls/hotel.md` | hotel soul (role/voice/refuses/domain_filter) | hotel

## Dispatcher (the execution surface)
- `H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts` | `prism_business` — 6746 lines, 879 action cases, 16 buckets | hotel
- `business_sync_stats` action lives at `businessDispatcher.ts:5088` | reference anchor | hotel

## Engine source — by sub-domain (pointers; full bucket map in CLAUDE.md §8.6)
**Accounting / Finance:**
- `H:/prism/mcp-server/src/engines/GeneralLedgerEngine.ts` (25K) | GL journal/trial-balance/income-stmt/balance-sheet — invariant-gated | hotel
- `H:/prism/mcp-server/src/engines/BillingEngine.ts` (25K) | Stripe billing + post-price + invoicing | hotel
- `H:/prism/mcp-server/src/engines/AccountingHardeningEngine.ts` (28K) | bank-reconcile, WIP valuation, variance, QB sync | hotel
- `H:/prism/mcp-server/src/engines/JobProfitabilityWaterfallEngine.ts` (16K) | per-job profit waterfall | hotel
- `H:/prism/mcp-server/src/engines/{ActualCostEngine,JobCostingEngine,CostEstimationEngine,FreightCostEngine,ImportCostEngine}.ts` | costing family | hotel
- `H:/prism/mcp-server/src/engines/{FinancialAnalysisEngine,JMDieFinancialBaselineEngine}.ts` | NPV/IRR + JM-Die baseline | hotel

**HR / Employee (22 engines):**
- `H:/prism/mcp-server/src/engines/EmployeeEngine.ts` (29K) | central employee model | hotel
- `H:/prism/mcp-server/src/engines/EmployeePayrollGrossPayEngine.ts` | gross-pay compute (FLSA) | hotel
- `H:/prism/mcp-server/src/engines/{EmployeePTOAccrualEngine,EmployeeBenefitsEnrollmentEngine,EmployeeExpenseReimbursementEngine}.ts` | PTO/benefits/expense | hotel
- `H:/prism/mcp-server/src/engines/{EmployeeTimeClockEngine,EmployeeShiftScheduleEngine,EmployeeShiftSwapEngine,EmployeeTaskHandoffEngine}.ts` | time/shift/swap/handoff | hotel
- `H:/prism/mcp-server/src/engines/{EmployeePerformanceFeedbackEngine,EmployeeRoleAcademyInjectionEngine,EmployeeDailyDigestEngine}.ts` | perf/academy/digest | hotel
- `H:/prism/mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts` (47K) | HR↔training bridge (Cpk-floor gates) | hotel↔lima
- `H:/prism/mcp-server/src/engines/HRComplianceEngine.ts` (14K) | HR compliance alerts | hotel

**ERP:**
- `H:/prism/mcp-server/src/engines/ERPIntegrationEngine.ts` (31K) | central ERP bridge (7 vendors: JobBOSS/Epicor/ProShop/Global Shop/SAP/Oracle/Generic) | hotel
- `H:/prism/mcp-server/src/engines/{ERPWorkOrderEngine,ERPCostFeedbackEngine,ERPQualityEngine,ERPToolInventoryEngine,ERPImportEngine}.ts` | ERP sub-engines | hotel
- `H:/prism/mcp-server/src/engines/JMDieErpSimulationEngine.ts` | JM-Die ERP sim | hotel

**CRM:**
- `H:/prism/mcp-server/src/engines/{CustomerManagementEngine,CustomerKnowledgeEngine,CustomerPortalEngine}.ts` | CRM core + portal | hotel
- `H:/prism/mcp-server/src/engines/{CustomerPortfolioMinerEngine,CustomerComplaintIntakeEngine,CustomerMaterialMapEngine,JMCustomerVendorDatabaseEngine}.ts` | portfolio/complaint/vendor-db | hotel

**Quoting (consumed; charlie-owned):**
- `H:/prism/mcp-server/src/engines/{InstantQuoteEngine,BlueprintToQuoteBridgeEngine,AdditiveQuoteEngine,CastingQuoteEngine,InjectionMoldQuoteEngine}.ts` | quote estimators | charlie↔hotel
- `H:/prism/mcp-server/src/engines/quoting/` | quoting galaxy brain (charlie) | charlie

**Job / Order / Scheduling:**
- `H:/prism/mcp-server/src/engines/{JobLifecycleEngine,JobTravelerEngine,JobShopSchedulingEngine,JobRoutingTemplateEngine,JobDeskAggregatorEngine,AutomatedJobSchedulerEngine}.ts` | job/order/scheduling | hotel
- `H:/prism/mcp-server/src/engines/{CapacityPlanningEngine,CapacityMonteCarloEngine,EngineeringChangeOrderEngine}.ts` | capacity + ECO | hotel

**Quality / Compliance / Safety / Audit:**
- `H:/prism/mcp-server/src/engines/{ComplianceEngine,IndustryStandardsComplianceEngine,ISO9001QMSEngine,ITARComplianceTaggerEngine}.ts` | compliance | hotel
- `H:/prism/mcp-server/src/engines/{CAPAWorkflowEngine,AuditFindingToCAPABridgeEngine,LOTOLogEngine,KaizenLeanSigmaEngine}.ts` | CAPA/LOTO/kaizen | hotel
- `H:/prism/mcp-server/src/engines/{AuditEngine,AuditManagerEngine,AuditLoggingEngine,ConsensusAuditLogEngine,DepartmentAuditDashboardEngine}.ts` | audit suite | hotel
- `H:/prism/mcp-server/src/engines/compliance-safety/`, `H:/prism/mcp-server/src/engines/quality/` | sibling brain subdirs | (shared)

**Hotel-specific (slot's own marathon output):**
- `H:/prism/mcp-server/src/engines/HotelGateEngines.ts` (11K) | operator-gate verification | hotel
- `H:/prism/mcp-server/src/engines/HotelERPTribalKnowledgeEngine.ts` | ERP/HR tribal registry (17 cats) — ⚠ UNWIRED ORPHAN (0 dispatcher refs; "wired hotel_tribal_*" was aspirational, corrected 2026-05-29) | hotel

**Docustrata / BI bridges:**
- `H:/prism/mcp-server/src/engines/{DocustrataAccountingBridgeEngine,DocustrataCustomerIndexEngine}.ts` | doc→accounting/customer index | hotel
- `H:/prism/mcp-server/src/engines/{BusinessIntelligenceEngine,BusinessDocumentExtractorEngine,BusinessSyncEngine,CostEfficiencyBridgeEngine,CostSavingsTrackerEngine,CostAlarmEngine}.ts` | BI + cost telemetry | hotel

## State / data files
- `H:/prism/mcp-server/data/state/customer-consents.json` | PII/consent ledger — consult before customer export | hotel
- `H:/prism/mcp-server/data/state/jm-die-vendor-registry.json` | **174 JM Die vendors** (name / billLineCount / qtyTotalReported / itemCategories / first+last bill date) from the DocuStrata QuickBooks report — ERP vendor master (2026-05-29) | hotel
- `H:/prism/mcp-server/data/state/jm-die-purchases-summary.json` | JM Die purchasing aggregates (20,550 bill-lines · byCategory · byYear 2014-2026 · top-25 vendors by activity) | hotel
- `H:/prism/mcp-server/data/state/cost-alarm-config.json` | cost-alarm thresholds | hotel
- `H:/prism/mcp-server/data/state/cross-session-asset-registry.json` (1.6M) | cross-session asset registry (dedup) | (shared)
- `H:/prism/mcp-server/data/state/` | most ERP/HR state is engine-internal (per-engine JSON stores), NOT centralized | hotel
- `H:/prism/mcp-server/data/state/TRIBAL_TIP_INDEX.json` (133K) | general tribal store (slot-tagged) | (shared)

## Constants (⚠ extraction-first flags — verify before trusting; see CLAUDE.md §2)
- `mcp-server/src/data/payroll-tax-tables.ts` · `pto-policies.ts` · `benefits-plans.ts` · `customer-terms.ts` · `vendor-profile.ts` · `chart-of-accounts.ts` | likely inline in engines today — extraction is a real backlog item | hotel

## Scripts (galaxy + business ops)
- `H:/prism/scripts/build-state-snapshot.mjs` | regen BUILD_STATE (galaxy STEP 9) | (shared)
- `H:/prism/scripts/close-out-milestone.mjs` · `audit-close-out-candidates.mjs` | milestone close-out (5 surfaces) | (shared)
- `H:/prism/.claude/helpers/loop-state.mjs` | /loop start/tick/end (this buildout) | (shared)
- `H:/prism/scripts/ingest-docustrata-jm-report.mjs` | parse DocuStrata QuickBooks report → the 2 jm-die-*.json state files; honest (no fabricated $) | hotel
- `H:/prism/scripts/business-domain-atlas.mjs` | deep domain node atlas (--synergy 7/11 · --unwired punch-list) — `/business-atlas` | hotel
- `H:/prism/scripts/hotel-domain-awareness.mjs` | quick domain card — `/aware-hotel` | hotel

## Skills (`.claude/commands/`) — hotel
- `H:/prism/.claude/commands/{checkin-hotel,startup-hotel,handoff-hotel,precompact-hotel,smart-hotel,galaxy-buildout-hotel}.md` | hotel session lifecycle | hotel
- `H:/prism/.claude/commands/{erp-health,erp-sync,quote-to-ship,quote,shop-quote,job-cost,traveler}.md` | ERP/quote/job ops | hotel

## Hooks (`.claude/hooks/`) — hotel/erp
- `H:/prism/.claude/hooks/erp-quote-variance-guard.mjs` | PreToolUse — flags ERP↔quote cost variance | hotel
- `H:/prism/.claude/hooks/hotel-financial-invariant-guard.mjs` | PreToolUse — reminds debits=credits before GL writes (added this buildout) | hotel

## Memories (`C:/Users/wompu/.claude/projects/H--prism/memory/`)
- `reference_hotel_erp_hr_marathon_2026_05_25.md` · `reference_hotel_marathon_iter32_38_2026_05_26.md` · `reference_hotel_mus_customer_analytics_2026_05_22.md` · `reference_iter10_hotel_absorption_2026_05_26.md` | hotel session records | hotel
- `reference_u_bridge_{erp_quote,erp_sched,wire_business}_2026_05_20.md` | cross-galaxy bridge records | hotel
- `reference_hotel_business_*_2026_05_28.md` + `feedback_hotel_*.md` | this galaxy's buildout memories | hotel

## Wiki (`H:/prism/knowledge/wiki/`)
- `knowledge/wiki/index.md` → `[[prism_business]]` | dispatcher entry | (shared)
- `knowledge/wiki/architecture/business-financial-invariants.md` · `business-erp-vendor-adapters.md` · `business-quote-to-ship.md` | hotel business wiki bridges (this buildout) | hotel
- `knowledge/wiki/code-tribal/{business,learnings,canonical}/` | tribal markdown (auto-regen — capture via API not direct write) | (shared)

## JM Die corpus (back-office reality — NO accounting/HR subtree)
- `H:/prism/JM DIE/Automated Program_Corrected 5-25.xlsm` (5.3M) | the shop's actual VBA-driven automation spreadsheet (10+ VBA sheet modules) — closest thing to JM Die's "ERP" | hotel
- `H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf` (2.4M, 880pp) | QuickBooks **Purchases-by-Vendor-Detail** export (12yr AP history, 2014-2026) — ingested 2026-05-29 via `ingest-docustrata-jm-report.mjs` → the 2 jm-die-*.json state files. Re-extract text via pypdf one-liner in the script header. | hotel
- `H:/PRISM/Docustrata/.index/` | DocuStrata OCR/vision pipeline scripts (phase8 gemini-vision, electrode/template corpus scans) | (shared)
- `H:/prism/JM DIE/{JM DIE COMPANY,QUEUE,SETUPS}/` | company docs / job queue / setups | hotel
- JM Die customer files (~24,545) | access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob/Grep (noise-paths catalog) | hotel

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for business:** `Docustrata/JMD Acct RecPay` · `Docustrata/JMD TaxesIRS` · `Docustrata/JMD UPS` · `Docustrata/JMD Sales Orders` · `Docustrata/JMD Packing Slips` · `JM DIE/JM DIE COMPANY`
<!-- END:critical-resource-roots -->





<!-- BEGIN:vendor-catalog-corpus (generated by scripts/wire-vendor-corpus-to-galaxies.mjs — do not hand-edit) -->
## 🧰 Vendor catalog corpus (VENDOR-NETWORK-MS0 — wired by charlie 2026-05-31)
> Cutting-tool maker/vendor catalog corpus charlie's catalog-pull expanded. Source of truth: `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json` · owner: charlie (acquisition+triage); oscar owns the `.ts` S/F extraction. Corpus: **167 makers** (80 HIGH/not-ingested → extract now, 95 on-disk) · **241 pulled PDFs** · **482-vendor** directory.
- **Why business (hotel — ERP / procurement / business):** Supplier master for purchasing/procurement: the 433-vendor directory = sourcing list (website, reach, regions, pricing_access); jm-tool-purchases = real historical spend per maker. Feeds vendor-onboarding + purchase-order routing.
- `state/shared/quoting/vendor-directory.jsonl` (jsonl) — 433-vendor supplier/distributor directory (name, website, vendor_type, categories, reach, regions, pricing_access, has_api) — GITIGNORED, regenerate via build-vendor-directory.mjs
- `state/shared/quoting/VENDOR-DIRECTORY.md` (md) — human-readable view of the vendor directory
- `state/shared/quoting/vendor-directory-index.json` (json) — directory stats + machine-readable index (stats.total / stats.withWebsite)
- `state/shared/quoting/jm-tool-purchases.json` (json) — JM Die real tool-purchase data — which makers JM actually buys (~$211K of $4.9M; JM is a die shop, carbide-blank die stock is the majority spend)
<!-- END:vendor-catalog-corpus -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the business galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMSoldOrdersDB** (JM Die Sold Orders (Outbound Revenue)) — `state/shared/quoting/jm-sold-orders.json` · 500 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMToolPurchasesDB** (JM Die Tool Purchases (Procurement Spend)) — `state/shared/quoting/jm-tool-purchases.json` · 49 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMVendorAPLedgerDB** (JM Die Vendor A/P Ledger) — `state/shared/quoting/jm-vendor-ap-ledger.jsonl` · 20,736 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MachineDB** (Machine Database) — `data/machines/` · 1,015 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ReportTemplateDB** (Report Template Database) — `data/databases/ReportTemplateDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **VendorCatalogDB** (Vendor / Manufacturer Catalog Database) — `mcp-server/data/vendor-catalog-db/` · 425 entries · manifest `mcp-server/data/vendor-catalog-db/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/business/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/business_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="business" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs business "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
