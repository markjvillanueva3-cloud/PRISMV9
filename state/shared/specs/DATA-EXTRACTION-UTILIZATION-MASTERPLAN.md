# DATA-EXTRACTION → UTILIZATION MASTERPLAN

> Canonical sequencing plan for PRISM catalog-data: **install → extract → categorize → persist → wire → utilize.**
> Owner: slot **juliett** (database-expansion) — synthesis lead. Co-owners per action below.
> Synthesized from 6 structured discovery findings (extraction tooling, raw-source inventory, categorization, persistence, cross-galaxy wiring, consumer engines).
> Generated 2026-05-31. ADVISORY — `mustHumanVerify` per item before flipping any envelope.
> **North star ("fullest potential"):** per-tooling CUSTOM CALCULATIONS that COMPOUND across domains + equation-parts — i.e. Kc1/mc/Taylor-n/wear-coeff calibrated per `[tool_id, material_iso]` from the JM Die archive, fed to NN/GNN + RAG, and jointly optimized (MRR × force × life × thermal × deflection) under operator constraints.

---

## ⚠️ VERIFIED CORRECTIONS (juliett, 2026-05-31 — on-disk MAIN-tree verification; supersedes body where they conflict)

The synthesis was partly drawn from a STALE slot worktree. I re-verified the load-bearing claims against `H:/prism` MAIN and the completeness-critic's findings. **Apply these before executing any step below:**

- **[P0] Phantom producer scripts — DO NOT exist (verified):** `scripts/merge-catalog-extraction-to-registry.mjs` and `scripts/extract-vendor-pdf.mjs` are NOT on disk. Any step (§0 ledger, W-201/W-202, PHASE-4) that "runs" them has no executable. → The extracted-JSON→tables **seeder is a NET-NEW BUILD** (move it from WIRE to BUILD). Extraction uses the REAL, present tools: `scripts/batch-pdf-extract.mjs` + `scripts/camelot-extract.py` (dispatched via `node scripts/db-toolbelt.mjs --run camelot-tables`).
- **[P0] Migration number/location — do NOT hard-code "011":** `mcp-server/src/migrations/` contains only `golf-ledger-v*.sql` + `stateMigrations.ts` — the numbered Postgres migrations the plan/critic reference live elsewhere. LOCATE the real Postgres migration dir + use the **next free** number; the runner's `ON CONFLICT(version) DO NOTHING` will SILENTLY SKIP a colliding number → catalog tables never created. Until located, the durable catalog DB is the existing file-stores (`mcp-server/data/vendor-catalog-db/` + `jm-die-database/`).
- **[P1] Engine duplication — PATCH, don't create (verified present):** a new `ConstrainedOptimizationEngine` (B-109) collides with existing `MultiObjectiveParetoEngine.ts` / `ChanceConstrainedOptimizationEngine.ts` / `AIPhysicsOptimizationEngine.ts` → add a method/action to one of those (duplicationGuard will THROW otherwise). The WIRE targets `UltimateSpeedFeedEngine.ts` (162K) + `ToolCatalogEngine.ts` already EXIST → **read their contract + PATCH**, never recreate.
- **[STATE — this session] PHASE-1 INSTALL is largely DONE:** `camelot-py 1.0.9` is **INSTALLED** (the audit's #1 P0 blocker — RESOLVED) and the pipeline is **validated** (`--run camelot-tables ... --flavor stream` → 12 tables from a real catalog; `stream` avoids the Ghostscript dep). `pymupdf 1.27.2.3` OK; `pypdf` pinned 6.12.2→**5.9.0** by camelot (lima extractor verified still works). Install gotcha: run the install **foreground** — detached bg installs get fleet-reaper-killed mid-build. Remaining INSTALL: `pdfplumber` (fallback, uninstalled), `llava` pull (vision). **Ollama is UP** (audit's "down" was stale; daemon serves qwen2.5-coder) + local stack (qdrant/postgres/prism-server) auto-started this session.
- **[VERIFY] Keystone is genuinely net-new:** `ToolingPhysicsCalibrationEngine` does NOT exist on disk → build it (no dup). But **verify the JM calibration-corpus size first** — the plan's 22,721-program count is unconfirmed (critic counted ~6.8K NC files); gate every per-`[tool_id,material_iso]` cell on sample-size + report a confidence interval (no single-sample "calibrated" claims).
- See **`## Completeness-critic addenda`** (end of doc) for the full critic findings (coolant-default omission, embedding-dim 768 contract, pdfplumber, sequencing nits).

### 🔬 EXECUTION FINDINGS — first real extraction run (juliett, 2026-05-31; supersedes optimistic PHASE-2 assumptions)

Ran the BUILT pipeline against the real 242-PDF corpus at `resources/MANUFACTURER_CATALOGS/uploaded/`. **The catalog→cutting_data path is NOT yet production-ready — PHASE-2 is not a simple "run the extractor" step.** Verified behavior:

- **`scripts/extract-generic-catalog.py` (BUILT, arg-driven `<pdf> <out> [mfr]`)** — extracts ISO-13399 **geometry** only. On a curated 8-catalog cross-domain batch: Korloy turning → 35 items but **MIS-PARSED** (`designation:"1/64~1/32"` paired with `cutting_diameter_mm:5` — 1/32″≈0.79 mm, wrong columns); maford-sf / ingersoll / lakeshore → **0 items** (speeds-feeds GRID ≠ geometry tables); garr-sf → **MuPDF "No common ancestor in structure tree" crash**; harvey → batch aborted (exit 255). Output has **no `cutting_data` field** → enricher can't consume it. **Persisting would poison a safety-critical cutting DB → refused per the "never fabricate" bar (R12). Output deleted, not committed.**
- **`scripts/camelot-extract.py` (BUILT, validated)** — cleanly extracts SF GRID tables (garr-sf → 13, applitec → 12) as `{page,table_index_on_page,row_count,col_count,rows[][]}`. **But these raw tables are NOT mapped to `cutting_data` / MATH_SCIENCE_SCHEMA** — that mapping is the missing piece.
- **`scripts/enrich-catalog-cutting-data.mjs` (BUILT)** — fills `cutting_data:[]` from trusted `.ts` (ALL_MANUFACTURER_SPEED_FEED + userProvenCuttingData); needs skeletons that HAVE the field → incompatible with the generic extractor's current output.

**NET-NEW BUILD (the real PHASE-2/3 keystone, replaces the optimistic "seeder"):** a **camelot-tables → MATH_SCIENCE_SCHEMA classifier + per-vendor column normalizer**: (a) classify each table cutting-data/geometry/index via header keywords (SFM/IPT/chipload/Vc/fz/RPM/ap/ae); (b) per-vendor column maps; (c) **validate each normalized [tool, material_iso, vc/fz] tuple against a known reference value BEFORE persist** (no single-sample "calibrated"; CI-gated); (d) provenance-tagged records (vendor+pdf+page) → `prism-reference-db`. Until it exists + passes a real-data validation oracle, the durable cutting stores stay the trusted `.ts`+enricher path — the 242 PDFs remain UN-ingested-by-design, loud-flagged here, NOT silently half-filled.

**Dashboard fix (shipped this run):** `db-toolbelt.mjs --status` was a silent misreport — printed `prism-reference-db · {}` while the store held **13,920 records** (summarizer didn't read the `byCategory` manifest shape). Fixed → now shows `total=13920` + category breakdown.

---

## 0. DE-DUPLICATION LEDGER (read FIRST — do NOT rebuild these)

The audit findings were captured in the **`prism-slot-juliett` worktree**, which is BEHIND the `H:/prism` main tree. Many items the findings flagged as "MISSING" **already exist in main**. Verified on disk 2026-05-31:

| Asset (audit said "missing/build") | Reality in `H:/prism` main | Action |
|---|---|---|
| `scripts/db-toolbelt.mjs` | **EXISTS** (8.5K) | USE — do not build |
| `scripts/lib/catalog-extraction-router.mjs` | **EXISTS** (11.4K) | USE — do not build |
| `scripts/batch-pdf-extract.mjs` | **EXISTS** (8.4K) | USE — do not build |
| `scripts/extract-accupro.py` | **EXISTS** (10.4K) | USE — do not build |
| `scripts/extract-ampc.py` | **EXISTS** (5.7K) | USE — do not build |
| `scripts/extract-jm-die-corpus-page-by-page.py` | **EXISTS** (11.1K) | USE — do not build |
| `scripts/enrich-catalog-cutting-data.mjs` | **EXISTS** (15.5K) | USE — do not build |
| `scripts/wire-galaxies-to-resource-roots.mjs` | **EXISTS** (9.4K) | USE — do not build |
| `scripts/wire-vendor-corpus-to-galaxies.mjs` | **EXISTS** (7.0K) | USE — do not build |
| `mcp-server/data/vendor-catalog-db/` | **EXISTS** | USE |
| `mcp-server/data/jm-die-database/` | **EXISTS** | USE |
| `mcp-server/data/vendor-catalog-manifest.json` | **EXISTS** (18.2K) | REFRESH (44d stale) |
| `mcp-server/src/db/migrations/*.sql` | **EXISTS** 001–010 | EXTEND (add 011 tool-catalog, not bootstrap) |
| Vendor extractor `.py` scripts | **52** present (kennametal/iscar/osg/guhring/seco/korloy/haimer/ingersoll/camfix/hypermill…) | USE — do not re-author |
| `extract-vendor-pdf.mjs` / `camelot-extract.py` | EXISTS (scaffold, camelot-gated) | UNBLOCK by install |
| `ingest-monolith-catalog-js.mjs` (B0) | EXISTS, 8 vendors extracted | DONE |
| `merge-catalog-extraction-to-registry.mjs` (D1) | EXISTS, operational | USE |
| `scripts/lib/catalog-storage-paths.mjs` | EXISTS, single source of path truth | USE |
| `build-vendor-step-url-inventory.mjs` / `index-step-files.mjs` / `scrape-step-backfill.mjs` | EXISTS | USE (Phase C) |

**Genuinely NET-NEW (the real BUILD list):** tool-catalog/cutting-data SQL migration (011+), `ToolingPhysicsCalibrationEngine`, `CatalogToNNTrainingPipelineEngine`, `QdrantCatalogVectorIndexEngine`, `ConstrainedOptimizationEngine`, tool-material/coating physics schemas, geometry→operation classifier, ISO-group inference engine. These are the leverage points — everything upstream (extract/persist plumbing) already exists.

**WORKTREE NOTE:** juliett must `git fetch && git merge origin/main` (or rebase its slot branch) before running any extraction script, or it will rebuild assets that already exist in main. First action of any juliett extraction session.

---

## 1. CRITICAL PATH (the few items that unblock the most)

```
[INSTALL] camelot-py[cv]  ──► unblocks B1 table-extraction for 30 PDFs / ~35k tools (7 vendors)
        │
        ▼
[EXTRACT] run batch-pdf-extract.mjs / extract-vendor-pdf.mjs on the 122 untapped vendors
        │
        ▼
[PERSIST] migration 011 (tool_catalogs + cutting_data + speed_feed) ──► durable + queryable
        │
        ▼
[BUILD]  ToolingPhysicsCalibrationEngine  ◄── THE KEYSTONE
        │   (regress JM Die archive → per-[tool_id,material_iso] Kc1/mc/Taylor-n/wear)
        ├──► feeds NN/GNN (india)        ── CatalogToNNTrainingPipelineEngine
        ├──► feeds RAG/Qdrant            ── QdrantCatalogVectorIndexEngine
        └──► feeds equation-part compounding + ConstrainedOptimizationEngine
                                          ──► "fullest potential" custom per-tool calcs
```

**The single highest-leverage net-new artifact is `ToolingPhysicsCalibrationEngine`** (gap P0 in the CONSUMERS layer). Catalogs are currently READ-ONLY reference; this engine is what converts extracted data + the 22,721-program JM Die archive into *tuned* physics coefficients per tool. Five downstream gaps (coating/coolant defaults, NN training, RAG indexing, equation-part compounding, constrained optimization) all sit behind it. Without it the entire extraction effort yields generic CANONICAL constants — the data is collected but never *compounds*.

**Two cheap unblocks gate the whole extract lane:** `pip install camelot-py[cv]` (P0) and the migration-011 SQL (P1). Both are <1 day and unblock weeks of downstream value.

---

## 2. HARD BLOCKERS (resolve before dependent lanes)

| # | Blocker | State (verified 2026-05-31) | Resolution | Blocks |
|---|---|---|---|---|
| B-1 | **camelot-py NOT installed** | `python -c "import camelot"` → ModuleNotFoundError | `H:/Tools/python/python.exe -m pip install "camelot-py[cv]"` (opencv already present) | B1 table extraction (122 vendors) |
| B-2 | **Ollama vision model absent** | Daemon is **UP** (`/api/tags` returns `qwen2.5-coder:3b`) but NO vision model | `ollama pull llava:7b` (or `minicpm-v`). Daemon-start is NOT needed — audit finding stale. | B3 scanned-PDF OCR only (defer; camelot covers selectable-text PDFs) |
| B-3 | **pypdf v5.9.0 broken import** | `ModuleNotFoundError: pypdf._reader` | `pip install pypdf==5.8.0` (downgrade) or use `pdfplumber` | jm-die corpus page-by-page (B4) |
| B-4 | Ghostscript absent (optional) | not in PATH | only needed for camelot `lattice` flavor; `stream` flavor (default) works without it | P3 — ruled-table quality only |
| B-5 | manifest 44d stale | generated 2026-04-16 | re-run manifest builder before counting coverage | accurate coverage math |

**Only B-1 is on the critical path.** B-2/B-3 gate side-streams (scanned PDFs, jm-die corpus) that are not required for the core 122-vendor cutting-data extraction. B-4 is quality-only.

---

## 3. THE THREE LANES

### LANE A — INSTALL (deps / services)

| ID | Action | Owner | Pri | Unblocks |
|----|--------|-------|-----|----------|
| I-1 | `pip install "camelot-py[cv]"` | juliett | **P0** | All B1 table extraction; flips extract-vendor-pdf.mjs from scaffold→live |
| I-2 | `pip install pypdf==5.8.0` (repair broken import) | juliett | P1 | jm-die corpus page-by-page extractor |
| I-3 | `ollama pull llava:7b` (vision model; daemon already up) | juliett | P2 | B3 scanned-PDF OCR (YU25, large image-only catalogs) |
| I-4 | `choco install ghostscript` (optional, camelot lattice) | juliett | P3 | Ruled-table extraction quality only |

**INSTALL count: 4** (1×P0, 1×P1, 1×P2, 1×P3)

### LANE B — BUILD (net-new producers/consumers; existing scripts EXCLUDED per §0)

| ID | Action | Owner | Pri | Unblocks |
|----|--------|-------|-----|----------|
| B-101 | **Migration `011-create-tool-catalog-tables.sql`** (tools, cutting_data, application_scenarios, speed_feed_recommendations) + indexes + seeder from `catalog-extractions/*.json` | juliett | **P1** | Durable queryable catalog; all downstream durable lookups |
| B-102 | **`ToolingPhysicsCalibrationEngine`** — regress JM Die archive (22,721 programs) → per-`[tool_id,material_iso]` `{kc1_actual, mc_actual, taylor_n_actual, wear_coeff, confidence}`; emit `dist/data/tooling-physics-tuning.json` | juliett (extract/persist) → india (consume) | **P0** | NN training, RAG, equation compounding, constrained opt — THE KEYSTONE |
| B-103 | **`mcp-server/src/physics/tool-materials.ts`** — `ToolSubstrate` enum + `CANONICAL_TOOL_MATERIALS` (E, density, hardness_hv, max_temp_c, wear_model) + `resolveToolMaterial()` | oscar (SFC physics) | P1 | Material-aware life/force; calibration overlays |
| B-104 | **`mcp-server/src/physics/tool-coatings.ts`** — `CoatingType` + `CANONICAL_COATINGS` (deposition, hardness band, wear-mode, substrate-compat) + `speedMultiplierByCoating()` | oscar | P1 | Coating-adjusted *default* speed/feed (not just tool-life) |
| B-105 | **`ToolGeometryClassifierEngine`** — geometry→operation + geometry→ISO-group heuristics (helix>45°→HSM, corner_r>0.5→finish); replaces `inferToolType()` stub | oscar | P1 | Auto-tag extracted tools; ISO inference for material-less tools |
| B-106 | **`ToolMaterialGroupInferenceEngine`** — `inferISOGroups(tool)` from substrate+geometry+name-regex; confidence-scored | oscar | P1 | Speed/feed lookup for tools with empty `material_groups` |
| B-107 | **`CatalogToNNTrainingPipelineEngine`** — catalog cutting_data × JM-archive actuals → training tuples `[material,tool,op,coating,vc,fz,mrr,life,success]` → NN trainer | india (NN/GNN) | P1 | NN/GNN generalization to unseen tool/material combos |
| B-108 | **`QdrantCatalogVectorIndexEngine`** — vectorize `{tool_id,cutting_params,material_suitability}` → Qdrant `tool_catalog` collection; semantic speed/feed + tool-similarity search | juliett (persist) → india (embed) | P2 | RAG tool discovery; semantic "tools like X for Inconel" |
| B-109 | **`ConstrainedOptimizationEngine`** — maximize MRR s.t. power≤budget ∧ life≥min ∧ deflection≤tol ∧ thermal≤limit; Pareto front; calcDispatcher action `cutting_param_optimize_constrained` | oscar (physics) + juliett (wire) | P1 | Operator-goal: per-tool compound equation tuning |
| B-110 | **EquationPartLibrary** — first-class `{kienzle_kc1, taylor_life, mrr, power, deflection, usui_diffusion, archard_flank, loewen_shaw}` with coefficient slots; per-coating equation-switching | oscar | P1 | Equation-part compounding across domains |
| B-111 | **`CompoundApplicationTag` schema** + `generateCompoundTags()` — substrate×coating×iso×operation cartesian → CAM-LoRA training labels | india | P2 | LoRA training stratification; per-compound calibration |
| B-112 | **`ToolGeometrySanityHook`** — validate shank>tool_dia, helix∈[0,90], corner_r≤dia/2; gate before D1 merge | juliett | P2 | Clean merge; physics-input quality |
| B-113 | Refresh `vendor-catalog-manifest.json` (re-run manifest builder) | juliett | P2 | Accurate coverage math; new-PDF detection |
| B-114 | Per-store stats/health (`ToolCatalogEngine.stats()`, `BusinessStore.count()`, Qdrant cardinality) → `state/persistence-stats.json` | juliett | P3 | Operational visibility |
| B-115 | `catalogLoader.ts` LRU eviction (TTL + size cap) | juliett | P3 | Memory pressure in long sessions |
| B-116 | Extend `CANONICAL_MATERIAL_DB` with `hardness_hv` + `wear_mode_dominant` for all entries | oscar | P2 | Wear-mode prediction; thermal-damage scoring |

**BUILD count: 16** (1×P0, 9×P1, 4×P2, 2×P3) — *existing scripts from §0 are NOT counted.*

### LANE C — WIRE (source → engine → dispatcher → galaxy)

| ID | Action | Owner | Pri | Unblocks |
|----|--------|-------|-----|----------|
| W-201 | Run `extract-vendor-pdf.mjs --live` / `batch-pdf-extract.mjs` over 122 untapped vendors (post camelot) → `catalog-extractions/` | juliett | **P0** | Closes 87% extraction gap (54k→90k tool goal) |
| W-202 | `merge-catalog-extraction-to-registry.mjs --apply` extracted JSON → ToolRegistry / migration-011 tables | juliett | P1 | Extracted data becomes queryable, not advisory-only |
| W-203 | Wire `UltimateSpeedFeedEngine` into `camDispatcher` (`ultimate_speed_feed` action) | echo (CAM) | P1 | CAM physics-backed S/F, not just AutoSF |
| W-204 | Add `turningDispatcher`: `speed_feed`, `tool_catalog_search`, `tool_catalog_recommend` → ToolCatalogEngine | whiskey (lathe) | P1 | Lathe thread/hard-turn query manufacturer data |
| W-205 | Add `millDispatcher`: `tool_catalog_search`, `tool_catalog_lookup`, `ultimate_speed_feed` | foxtrot (mill) | P1 | Mill strategy direct tool lookup |
| W-206 | Add `safetyDispatcher`: `safety_verify_cutting_params`, `safety_tool_limits` (validate vs manufacturer ranges) | golf/compliance | P1 | Collision/deflection validated vs safe ranges |
| W-207 | Wire `ToolingPhysicsCalibrationEngine` lookup INTO `UltimateSpeedFeedEngine` (tuning before CANONICAL fallback) | oscar + juliett | P1 | Custom per-tool calcs reach the optimizer |
| W-208 | Wire `CatalogToNNTrainingPipelineEngine` → NN trainers (Lathe/Mill/WEDM NN) | india | P1 | NN consumes catalog (currently dormant) |
| W-209 | Run `wire-vendor-corpus-to-galaxies.mjs` + `wire-galaxies-to-resource-roots.mjs` (EXISTING) | juliett | P2 | Auto-expose catalog actions per galaxy |
| W-210 | Add `secondaryOpsDispatcher`: `speed_feed_threading/reaming/boring` | whiskey | P2 | Op-specific cutting data |
| W-211 | Quoting: `vendor_price_lookup`, `tool_availability_check`, `tool_lead_time` → catalog + vendor-directory | charlie (quoting) | P2 | Realistic tool-cost estimates in quotes |
| W-212 | Unified `prism_vendor_data` cross-galaxy tool (search/lookup/recommend/availability) | juliett + galaxies | P2 | API cohesion; less dispatcher context-switch |
| W-213 | EDM/WEDM wire+electrode catalog extraction → `edm-wire-catalog.ts` → `edmDispatcher` | mike (wedm) | P2 | WEDM wire/electrode query |
| W-214 | `EXTRACTION-ROUTING.json` (source_catalog → [dispatcher, engine, galaxy]) audit map | juliett | P3 | Routing audit trail |
| W-215 | Populate empty `*-extracted.json` lazy-load placeholders from `.ts` sources | juliett | P2 | Lazy-load pattern; bundle de-bloat |

**WIRE count: 15** (1×P0, 7×P1, 6×P2, 1×P3)

---

## 4. SEQUENCED PHASES (dependency order — producer before consumer)

```
PHASE 0  PRE-FLIGHT     juliett: git merge origin/main into slot branch (avoid rebuilding §0 assets)
PHASE 1  INSTALL        I-1 camelot[cv] (P0) ‖ I-2 pypdf==5.8.0 ‖ I-3 llava pull ‖ I-4 ghostscript
PHASE 2  EXTRACT        W-201 run existing extractors over 122 vendors → catalog-extractions/  (needs I-1)
PHASE 3  CATEGORIZE     B-103 tool-materials ‖ B-104 tool-coatings ‖ B-105 geo-classifier ‖ B-106 ISO-infer
                        ‖ B-112 geometry-sanity ‖ B-116 material hardness   (oscar-heavy; parallelizable)
PHASE 4  PERSIST        B-101 migration-011 + seeder → W-202 merge --apply  (needs Phase 2+3)
PHASE 5  CALIBRATE      B-102 ToolingPhysicsCalibrationEngine  (KEYSTONE; needs Phase 4 + JM archive)
PHASE 6  WIRE-GALAXY    W-203..W-207 dispatcher/galaxy exposure ‖ W-209 existing wire scripts  (needs Phase 5)
PHASE 7  UTILIZE-AI     B-107 NN-pipeline → W-208 ‖ B-108 Qdrant-index ‖ B-111 compound-tags  (needs Phase 5)
PHASE 8  COMPOUND-OPT   B-110 EquationPartLibrary → B-109 ConstrainedOptimizationEngine → fullest potential
PHASE 9  POLISH         B-113 manifest ‖ B-114 stats ‖ B-115 LRU ‖ W-211 quoting ‖ W-213 edm ‖ W-214 routing-map
```

**Invariant enforced:** no galaxy/consumer phase (6,7,8) precedes its producer. Calibration (5) gates all utilization (6–8). Extraction (2) gates persistence (4) gates calibration (5). Install (1) gates extraction (2).

---

## 5. OWNER-SLOT MAP

| Slot | Domain | Owns |
|------|--------|------|
| **juliett** | database-expansion | extraction runs, persistence (migration-011, seeder), calibration data-pipe, Qdrant index plumbing, manifest, sanity-hook, routing-map, EXISTING-script invocation |
| **oscar** | speed-feed (SFC) | `.ts` physics schemas: tool-materials, tool-coatings, geo-classifier, ISO-infer, EquationPartLibrary, ConstrainedOptimizationEngine physics, material-hardness |
| **india** | NN/GNN training | CatalogToNN pipeline, Qdrant embedding, compound-tags/LoRA stratification, consume tuning.json |
| **charlie** | quoting | vendor price/availability/lead-time actions |
| **echo / foxtrot / whiskey / mike / golf** | CAM / mill / lathe / wedm / safety galaxies | CONSUME — dispatcher actions wiring catalog+calibration into each galaxy |

---

## 6. WHAT "FULLEST POTENTIAL" REQUIRES (gap closure → goal)

Operator goal: *"fine-tune OR generate custom calculations per tooling type that compound across domains + equation parts."* Realized only when these close, in order:

1. **B-102 calibration** (per-tool Kc1/mc/Taylor-n from archive) — without it, all calcs use generic CANONICAL constants.
2. **B-104 coating defaults** — coating multipliers reach *initial* speed/feed, not just tool-life.
3. **B-110 equation-parts + W-207 wiring** — Usui-diffusion vs Archard-flank switched per coating; tuning reaches the optimizer.
4. **B-107/B-108 NN+RAG** — calibrated data generalizes to unseen combos + becomes semantically searchable.
5. **B-109 constrained optimization** — MRR×force×life×thermal×deflection jointly solved under operator constraints (constraints→params, not params→consequences).

Current state: extraction plumbing is **built**; physics is **parametrically generic**; the per-tool tuning + compounding infrastructure is **absent**. The plan's center of gravity is Phases 5 & 8.

---

## 7. COVERAGE & TARGETS

- Vendor extraction: **8/38 monolith + ~16/140 SFC ingested → target 122 untapped closed** (54k→90k tool goal).
- Persistence: JSON advisory-only → **PostgreSQL queryable (migration-011)**.
- Calibration: 0 tuned tools → **per-`[tool_id,material_iso]` coefficients from 22,721 JM programs**.
- Utilization: NN/RAG dormant w.r.t. catalogs → **wired training + semantic index**.

---

*Atomic write: `.tmp` → fsync → rename. Sources: 6 discovery findings + on-disk verification of `H:/prism` main tree 2026-05-31. De-dup ledger §0 is load-bearing — re-verify before any BUILD.*

---

## Completeness-critic addenda (adversarial pass, 2026-05-31, slot juliett critic)

> On-disk verification against `H:/prism` main tree. These items are MISSING/WRONG in §0–§7. Severity P0=blocks core path, P1=blocks utilization, P2=quality/coverage.

### A. Migration number is WRONG (P0 — silent persistence failure)
- §0/§1/§2/§4 (B-101, W-202, PHASE 4, COVERAGE) all say **migration `011`**. **`011-employee-enhancements.sql` already EXISTS and is applied.** Migrations on disk run to **`017`** (next free = **`018`**). The runner (`migration-runner.ts`) keys `schema_migrations` on `version VARCHAR(50) PRIMARY KEY` with `ON CONFLICT (version) DO NOTHING`. A new `011-*.sql` would be **silently skipped — the catalog tables would never be created**, and the whole PERSIST→CALIBRATE→UTILIZE chain rests on this. **FIX: rename B-101 → `018-create-tool-catalog-tables.sql`.** (Bonus: there are already TWO `013-*.sql` files both parsing to version `013` — a latent collision worth a separate fix.)

### B. The merge step is a PHANTOM producer (P0 — sequencing break)
- §0 ledger lists `merge-catalog-extraction-to-registry.mjs` as "EXISTS, operational" and **W-202 / PHASE 4 depend on running it `--apply`**. It does **NOT exist on disk** (no file under any merge*/registry* name; `scripts/lib/catalog-extraction-router.mjs` does not contain registry/migration/seed logic). The seeder named in B-101 must therefore be authored, OR W-202 has no executable. **FIX: move the extracted-JSON → tables seeder into the BUILD list (it is net-new, not §0-existing) and make W-202 depend on it.**
- Same class: §0 says `extract-vendor-pdf.mjs` "EXISTS (scaffold)" and **I-1/W-201/PHASE 2 pivot on flipping it scaffold→live**. It does **NOT exist** (only `batch-pdf-extract.mjs` + `camelot-extract.py` exist). W-201 references `--live` on a non-existent script. **FIX: re-point W-201 to the real `batch-pdf-extract.mjs` + `camelot-extract.py`; drop `extract-vendor-pdf.mjs`.**

### C. Net-new engines collide with EXISTING engines (P1 — duplication-hard-block risk)
- **B-109 `ConstrainedOptimizationEngine`**: `MultiObjectiveParetoEngine.ts`, `ChanceConstrainedOptimizationEngine.ts`, `ConstraintSatisfactionEngine.ts`, `AIPhysicsOptimizationEngine.ts` (55K), `WEDMParetoFrontierSearchEngine.ts` already exist. Per CLAUDE.md `duplication-hard-block`, a new `*OptimizationEngine` will likely THROW. **FIX: declare B-109 as an *action/method* on `MultiObjectiveParetoEngine` (add MRR×force×life×thermal×deflection objective + constraint set), not a new engine — or tag WIRE-EXEMPT with the wrapped engine named.**
- **W-203/W-207 wire "UltimateSpeedFeedEngine"** as if it were a small addition — **`UltimateSpeedFeedEngine.ts` already EXISTS at 162.6 KB.** The plan never reads its current contract; W-207 ("inject calibration tuning before CANONICAL fallback") must patch an existing 162K engine, not wire a fresh one. Likewise `ToolCatalogEngine.ts` (113K) already exists — W-204/W-205 "add tool_catalog_search" must call it, and the plan never names it as the target. **FIX: name the existing engines as the integration targets; run `/dedup` on every B-1xx engine before authoring.**

### D. Coolant defaults are entirely OMITTED (P1 — the north-star "compound" gap is half-addressed)
- The north star + §6 fixate on **coating** defaults (B-104). **`coolant` appears 0 times in `constants.ts`.** Vc/fz are not adjusted for flood vs MQL vs dry vs high-pressure-through-tool — a first-order compounding term (HPC raises permissible Vc 30–60% in Inconel; dry shifts the Taylor-n and wear-mode). The plan's own framing ("coating/coolant-not-in-default-Vc gap") names coolant but **no BUILD item delivers coolant defaults.** **FIX: add B-1xx `tool-coolant.ts` (`CoolantStrategy` enum + `vcMultiplierByCoolant(material_iso, coolant)` + wear-mode shift) parallel to B-104; thread into W-207.**

### E. Persistence-dep gaps in LANE A (P1/P2)
- **Embedding model**: B-108 Qdrant index assumes embeddings but LANE A never lists the embedding model as a checked dep. Verified: Qdrant is **UP** (collections `prism_engines/skills/formulas`) and `nomic-embed-text` **IS present** — but the plan must pin the **embedding dimension contract** (nomic = 768-d) so the `tool_catalog` collection is created with the right vector size; a mismatch silently breaks search. **FIX: add LANE A check `ollama show nomic-embed-text` + assert Qdrant collection `size=768, distance=Cosine`.**
- **`pdfplumber` fallback is itself uninstalled**: B-3 resolution offers "or use `pdfplumber`" as the pypdf repair path — `pdfplumber` is **NOT installed** and **not in LANE A**. **FIX: add I-x `pip install pdfplumber` if it is to be a real fallback, or delete the fallback wording.**

### F. Calibration data-source count is unverified (P1 — keystone validity)
- B-102/§7 cite **"22,721 JM Die programs"** as the regression corpus. On-disk NC/program-file globs surface ~6.8K program files in `JM DIE/` (the 22,721 likely counts all file types or a different census). The keystone's statistical validity (per-`[tool_id,material_iso]` cells with enough samples for a stable Kc1/mc/Taylor-n fit) depends on this number. **FIX: B-102 must emit per-cell sample-count + confidence-interval, NOT point estimates, and gate cells below a min-sample floor to CANONICAL fallback. Reconcile the 22,721 vs ~6.8K census before claiming coverage.**

### G. Utilization paths under-specified (P2)
- **No GNN edge wiring**: B-107 feeds the NN trainer with tuples, but PRISM's tier-5 is a **GraphSAGE GNN over `system-graph.json`** (per CLAUDE.md NN-GRAPH). Catalog tools should become graph **nodes** with `[tool]→[material]→[operation]` edges so the GNN generalizes structurally, not just the flat-tuple NN. **FIX: add a B-1xx "catalog→system-graph node/edge emitter" so the GNN ref-pool ingests tools.**
- **RAG-over-catalog is only a vector index, no retrieval contract**: B-108 builds the Qdrant collection but no item wires it into a *retrieval-augmented* speed/feed answer (the "tools like X for Inconel" query needs a consumer action). **FIX: add a `prism_calc`/`cam` action `tool_catalog_semantic_recommend` that calls the index — index without a consumer is dormant (the exact dormancy §7 flags).**
- **EXTRACTION-ROUTING.json already exists** (9.2K in `vendor-catalog-db/`); **W-214 says "build" it.** **FIX: change W-214 to "refresh/extend existing".**

### H. Sequencing nits
- PHASE 3 CATEGORIZE (oscar `.ts` schemas) is placed AFTER PHASE 2 EXTRACT but the schemas (tool-materials/coatings/coolant) have **no dependency on extraction** — they are CANONICAL constants and can run in PHASE 1 parallel with INSTALL, shortening the critical path by one phase.
- PHASE 7 (NN/RAG) and PHASE 8 (compound-opt) both depend on PHASE 5 calibration but PHASE 8's `EquationPartLibrary` (B-110) is pure-physics with **no calibration dependency** — it can move to PHASE 3, so only `ConstrainedOptimizationEngine` (B-109) actually gates on calibration.

