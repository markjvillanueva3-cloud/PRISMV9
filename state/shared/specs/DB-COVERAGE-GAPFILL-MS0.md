# DB-COVERAGE-GAPFILL-MS0 — CAM tooling / collision / machine / fixture / material / ERP database coverage

> **Provenance:** `db-coverage-assess` Workflow (run `wf_17d11221-a9c`, 11 agents, 10 read-only domain auditors + synthesis), launched 2026-06-03 by slot:romeo per operator work order:
> *"build all fusion, hypermill, mastercam and cimco tooling databases with all input data filled out and collision avoidance models within the tool creator filled out, machine databases, fixture and material databases | databases for front end erp should be cataloged. utilize workflow to help assess if we're missing functionality and coverage."*
> Full raw output: `C:/Users/wompu/AppData/Local/Temp/.../tasks/wtvi4birp.output` (160KB). This spec is the durable distillation.

## Coverage scorecard (audited 2026-06-03)

| domain | verdict | % | top gap |
|--------|---------|---|---------|
| master-tool-db | SKELETON | 25% | collision geometry + speed/feed cutting data 0% populated (720 tools; only 32% of critical fields filled) |
| fusion | MOSTLY | 79% | speed/feed presets missing for 3,288 tools; collision/holder detail absent (importable today) |
| hypermill | SKELETON | 12–18% | collision polyline/holder/coupling 0%; material-domain gate <1%; blocks v31 Tool Creator import |
| mastercam | PARTIAL | 15% | native tool-library ingestion stubbed (0 .tooldb/.mcam-tools); export works, import receives nothing |
| cimco | PARTIAL | 86% | only 1/5 cutter types (EndMill); 100 tools skipped; holder/material/coolant unfilled |
| collision-toolcreator | SKELETON | 8% | tool→holder linkage 0/153; no collision-geometry synthesis pipeline (675 holders exist, never joined) |
| machine-db | PARTIAL | 5% | 20/21 fleet machines lack handbook entries; 44+ handbook fields not integrated into ShopMachine |
| fixture-db | PARTIAL | 42% | collision CAD/STEP 0/29; per-fixture stiffness 31%; jaw actuation/dynamics 0% |
| material-db | PARTIAL | 25% | P/N/H-group data files entirely missing; engine complete but persisted layer 95% empty; AISI table 17/30 |
| erp-frontend-db | SKELETON | 18% | 5 P0 stores have no JSON file (invoices, employees, GL, material stock, tool txns); pages exist w/o data |

**Root cause:** engines + schemas are rich; the **persistent data layer and cross-store join tables are empty**. Fix the shared core once → 4 CAM export domains lift together.

## Dependency-ordered gap-fill plan (R13 logical order)

### TIER 0 — Foundational data the fleet consumes (build FIRST, verifiable in isolation)
- **U-MAT01** [P0] Create `P_STEEL_R3.json`, `N_NONFERROUS_R3.json`, `H_HARDENED_R3.json` mirroring K/M/S schema → `mcp-server/data/materials/`. Source: MaterialDatabaseEngine inline array + Sandvik 2024 + ASM Vol.2 + ISO 3685. Accept: all 6 ISO groups have a file; every in-code grade has a persisted record w/ real kc1.1/mc/Taylor C-n/HB-HRC/k_thermal; parity validator clean.
- **U-MAT02** [P1] Expand `AISI_CUTTING_COEFFICIENTS` to match `CANONICAL_MATERIAL_DB` length in `src/physics/constants.ts` (fill 8620/303/H13/S7/M2/gray_iron/C11000/C26000…). dep: U-MAT01.
- **U-MAT03** [P2] Archive/rewire `MaterialDatabaseBridgeEngine` (emits synthetic/random data — fake-physics hazard). dep: U-MAT01.
- **U-MTOOL01** [P0] New `ToolGeometryInferenceEngine` — parse 720 part numbers → corner_radius/helix/flute_length/neck into `tools.json`. Accept: ≥80% where PN encodes it, validated vs 30 known-good.
- **U-MTOOL02** [P0] Extract speed/feed tables from P1 vendor catalogs (Tungaloy 2023-24 TC-001..006,012) → `tools.json` cutting_data per ISO group. **Highest-leverage** (feeds SpeedFeedOrchestrator + all 4 exports).

### TIER 1 — Holder + collision geometry core (the join 4 CAM systems block on)
- **U-HOLD01** [P0] Add neck/flange/shoulder geometry fields to 5 holder catalogs (675 records).
- **U-HOLD02** [P1] `toolholder-interface-map.ts` — ER/HSK/VDI/CAT/BT taper codes + gauge lengths. dep: U-HOLD01.
- **U-COLL01** [P0] `CollisionGeometrySynthesisEngine` — holder record → stepped-cylinder `CollisionGeometry[]` envelope (the missing pipeline all 9 collision engines expect; `envelope` always null today). dep: U-HOLD01.
- **U-COLL02** [P0, SAFETY] `ToolHolderAssociationEngine` + fill 0/153 empty holder columns in `data/shop-tools/*.csv`. Collision checks currently run against `holder_diameter_mm:25` stubs (miss real interference 15-30mm). dep: U-HOLD01, U-COLL01.
- **U-COLL03** [P1] `ToolHolderLookupEngine` + wire `camDispatcher.tool_assembly` → synthesis so `ToolAssembly.holder.envelope` never null. dep: U-COLL02.

### TIER 2 — Machine + fixture data
- **U-MACH01** [P0] Create 20 missing fleet handbook JSONs (Hurco VM30i, Okuma M460V-5AX, Haas VF-2/OM-2, Roku-Roku, 3 Mitsubishi EDM, 7 Okuma lathes…) → `data/machine-handbooks/`. Source: `H:/PRISM/JM DIE/` archive + vendor docs.
- **U-MACH02** [P1] ShopMachine `handbook_id` + `MachineHandbookProfileEngine` (torque_curve/axis_specs lazy sub-resources, consumed by UltimateSpeedFeedEngine). dep: U-MACH01.
- **U-FIX01** [P0] Ingest fixture CAD/STEP + bounding boxes for 29 workholding records (Orange Vise + vendor CAD). dep: U-COLL01.
- **U-FIX02** [P1] Fixture stiffness matrix + jaw actuation/friction. dep: U-FIX01.

### TIER 3 — Per-CAM-system exports (consume Tier 0-2; build LAST)
- **U-CAM-FUS01** [P1] Complete Fusion speed/feed for 3,288 extremal-Ø tools + backfill unknown-vendor. dep: U-MAT01, U-MTOOL02.
- **U-CAM-CIM01** [P0] Emit Drill/Tap/Countersink/SpotDrill + holder CIMCO libs + recover 100 skipped (map tipDiameter/cutterDiameter). dep: U-MTOOL01, U-HOLD02.
- **U-CAM-HM01** [P1] hyperMILL collision polyline + holder couplings + material-domain gate (586/587 null). dep: U-COLL01, U-HOLD02, U-MAT02, U-MTOOL02.
- **U-CAM-MC01** [P1] Native Mastercam `.mcam-tools` ingestion (file-based MVP) + catalog-sourced cutting data. dep: U-MTOOL02, U-HOLD02.

### TIER 4 — ERP persistence (independent track — pages exist, data layer empty)
- **U-ERP01** [P0] Create `invoices.json`, `employees.json`, `general-ledger.json` → `data/state/`.
- **U-ERP02** [P1] `work-orders.json`, `materials-stock.json`, `tool-transactions.json`, `quote-history.json`. dep: U-ERP01, U-MAT01.
- **U-ERP03** [P2] `quality-ncrs.json`, `receiving-inspections.json`, `vendor-bills.json`. dep: U-ERP02.

## Highest-leverage / highest-safety
- **Leverage:** U-MTOOL02 (speed/feed extraction) — unblocks cutting-data in all 4 exports + SpeedFeedOrchestrator.
- **Safety:** U-COLL02 (tool→holder join) — collision checks run against stubs today, missing real interference.

## Missing FUNCTIONALITY (engines/exports that don't exist yet)
Collision-geometry synthesis pipeline · tool→holder association/join table · native Mastercam ingestion · ToolGeometryInferenceEngine · vendor-catalog speed/feed parser · MachineHandbookProfileEngine wrapper · ERP persistence layer · (remove) MaterialDatabaseBridgeEngine synthetic stub · fixture CAD ingestion feed.

## FINDINGS surfaced during build (for the physics/SFC owner — NOT fixed here)
- **F-DIVERGENCE-1 [P1] — `MaterialDatabaseEngine` in-code `MATERIALS` kc1.1/Taylor DIVERGE from canonical `constants.ts`.** `validateCoefficientParity()` (MaterialDatabaseEngine.ts:829) warns-but-does-not-throw on this. Examples: 4140 engine kc1.1 **2500** vs canonical AISI **1950** (28% gap); D2 2850 vs 3200; A2 2650 vs 3000; 303 2100 vs 2000. Two sources of truth → which value a cutting-force calc uses depends on access path (`getCanonicalKienzle()` returns AISI; `getMaterial().kienzle` returns engine inline). The R3 files deliberately use the **canonical** values (per CLAUDE.md "values live ONLY in constants.ts"). Resolution requires a physics decision on the authoritative value per grade → owner: oscar(SFC)/india. This is why U-MAT02 (below) is deferred.
- **F-COPPER-2 [P1] — N-group default kc1.1=700 under-predicts copper/brass force** (real Cu ~1000-1350). C11000/C26000 R3 records carry the default with an explicit warning in `kienzle.source` + `_provenance.caveat_copper` (fail-loud, not silent). Non-conservative for spindle/tool sizing. Owner: oscar(SFC).

## Execution log (slot:romeo)
- 2026-06-03 — assessment workflow shipped; this spec created. Building TIER 0 first.
- 2026-06-03 — **U-MAT01 SHIPPED**: `P_STEEL_R3.json` (6: 1018/1045/1144/4140/4340/8620), `N_NONFERROUS_R3.json` (5: 6061/7075/2024/C26000/C11000), `H_HARDENED_R3.json` (5: D2/A2/H13/S7/O1) + `src/__tests__/material-r3-parity.test.ts` (8 cases, all green). All 6 ISO groups now have persisted data files. Every kc1.1/mc/Taylor traces to `constants.ts` (AISI entry or per-ISO default), enforced by the parity test. 2 parallel reviewers (physics + code-analyzer): physics P0 was a verified false positive (A2 Taylor 130/0.16 DOES match canonical); both P1 batches fixed (sub-20-HRC rockwell_c→null, copper yield-min, O1 brinell, test floor derived-from-data, taylor iso_group cross-check).
- 2026-06-03 — **U-MAT02 DEFERRED** (was: expand AISI_CUTTING_COEFFICIENTS). Reason: promoting per-grade kc into the canonical table requires resolving F-DIVERGENCE-1 (engine inline vs canonical disagree) — a safety-critical physics decision needing the physics-reviewer gate + owner sign-off. Not safe to do blind. R3 files use per-ISO defaults for non-canonical grades in the meantime (honestly marked).
- 2026-06-03 (iter2) — **U-COLL01 CANCELLED — DUPLICATE (assessment error, R12 finding).** The coverage workflow claimed "no engine computes stepped-cylinder collision profiles." FALSE: `ToolCatalogEngine.assembly()`→`_buildEnvelope()`→`_findHolder()` (ToolCatalogEngine.ts:328/698/~600) ALREADY synthesizes the full cutting→neck→shank→holder envelope, with real holder-catalog lookup (Guhring/BIG DAISHOWA) before generic fallback. It is WIRED (`calcDispatcher` actions `tool_catalog_assembly` + `tool_catalog_collision_envelope`, cases 4589/4594) and TESTED (`tool-catalog-engine.test.ts` lines 90-129: builds envelope, monotone tip→holder diameters, taper selection, throws on incompatible). So "collision avoidance models within the tool creator" are BUILT. The real collision gap is DATA richness (most tools lack neck geometry; holder association is generic-fallback) → that's U-MTOOL01 + U-HOLD01 + U-COLL02, not a new engine. **Lesson: verify assessment claims empirically before building (the workflow over-stated 2 gaps now — collision + this).**
- 2026-06-03 (iter2) — **U-ERP01 SHIPPED** (via background agent, verified by parent): `state/shared/specs/ERP-FRONTEND-DB-CATALOG.md` (13 ERP stores catalogued; 9 had a front-end page but NO backing file — root cause: ERP engines hold stores in-memory, only ERPIntegration[Postgres] + GeneralLedger persist). Seeded 3 P0 stores in `data/state/`: invoices.json (20), employees.json (18/6 depts), general-ledger.json (51 accounts + 40 entries, debits===credits===$1,063,864.44) — all schemaVersion 1, real frontend `Invoice`/`Employee` + `GeneralLedgerEngine.LedgerState` schemas matched. `src/__tests__/erp-seed-stores.test.ts` 20/20 (double-entry invariant enforced). Frontend is Vite SPA `web/src/pages/` (NOT Next.js `web/app` — spec corrected). NOT wired to engine loaders (data-seed unit; loader-read wiring is follow-up).
- 2026-06-03 (iter2) — **U-GUHR01 + U-OSG01 SHIPPED**: populated empty `src/data/guhring-tools.json` (12 Guhring RT100U/RT100T solid-carbide drills) + `src/data/osg-tools.json` (14 OSG ADO carbide oil-feed drills + EX-SUS HSS drills + EXOCARB-WXL end mills). Both were `[]` stubs → their built loaders (`_loadGuhringTools`/`_loadOSGTools`) + speed/feed mappings were DEAD. Fixed 4 pre-existing RED tests in `tool-catalog-engine.test.ts` (now 46/46). Real series names + standard metric diameters + DIN 6535 HA shank=nominal; OAL/flute via the engine's own DIN-standard imputation (no fabricated dims). data_source on every record.

## FINDING F-EMPTY-CATALOGS [P1] — 8 manufacturer tool catalogs are empty `[]` stubs (route: kilo CAM / oscar SFC)
`src/data/{osg,sandvik,emuge,helical,sumitomo,indexable,global-cnc,additional}-tools.json` are/were empty arrays — their `_load*Tools` loaders + per-vendor speed/feed mappings are fully built but had ZERO data. This is the work-order's "tooling databases not filled out" at scale. romeo filled guhring + osg (the only two with failing tests) this iteration; the remaining **6** (sandvik, emuge, helical, sumitomo, indexable, global-cnc, additional) still need real per-vendor catalog sourcing (each is a domain-owner data task — `extract-<vendor>-tools` scripts exist on the graph but produced no tracked output). Master tool DB `prism-reference-db/tools.json` (720) is the richer corpus; these per-vendor files are the loader-fed supplements.
