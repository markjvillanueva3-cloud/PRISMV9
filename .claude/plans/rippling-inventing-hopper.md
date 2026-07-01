# CAM Feature-Catalog Completeness + Utilization — Fusion 360 · hyperMILL · Mastercam (slot:kilo)

## Context

Operator: *"follow delta's example of building everything we need for you to utilize Fusion, hyperMILL and Mastercam CAM features: every button, input, function, setting and parameter for each software."*

**What delta's example actually is:** delta built a *consumer layer* (engine + index + dispatcher + CLI + tests) over structured software-feature templates. For CAM, two parallel-Explore-agent passes found that **most of that consumer layer already exists** — so this is NOT "build a loader from scratch" (that would duplicate; R8/dedup):

**Already built — DO NOT rebuild (reuse/extend):**
- Data: `mcp-server/data/cam-functions/{fusion360,hypermill,mastercam,+22 vendors}/*.json` + a parallel `cam-ui/` tree. Fusion ≈847 params/27 ops, Mastercam ≈3475 params/45-50 ops, hyperMILL ≈1600 params/51 ops. Each dir has a reliable `function-index.json` manifest (`modules[]` with `path` + `parameter_count_estimate`).
- `CAMCatalogLoaderEngine.ts` — loads every `cam-functions/<slug>/` + `cam-ui/<slug>/`, **counts** params (recursive, depth≤8), reports `coverage_pct` vs `CLAIMED_PARAM_COUNTS` + drift. Wired: `cam_catalog_load_all` / `cam_catalog_load_one` / `cam_catalog_priority5_coverage` (camDispatcher).
- 25 per-system `*FunctionIndexEngine.ts` (Fusion360/Mastercam/HyperMill/…) — per-system index + lookup over the catalogs.
- 8 Phase-5 engines via `camFunctionDispatcher` (`cam_func_route|validate|strategy_recommend|param_optimize|translate|agi_reason|tribal_lookup|feature_recognize`), all inject `CAMCatalogLoaderEngine`.
- Scripts: `emit-4-system-coverage.mjs`, `emit-templates-4-systems.mjs`, `generate-cam-vendor-catalog.mjs`.

**The real gaps (this is what "build everything we need" means here):**
1. **Completeness** — the catalogs are a strong start but NOT exhaustive. 847 Fusion params / 27 ops is ~20-25% of Fusion CAM's true universe (real ops have Tool/Geometry/Heights/Passes/Linking tabs each 10-40 params; plus every ribbon *button*). No artifact measures the true gap → we cannot honestly claim "every button/input/parameter" (R12).
2. **Per-operation enumeration query** — `CAMCatalogLoaderEngine` only *counts*; there is no clean prism_cam surface that returns "**every** parameter (name/type/default/min/max/units/enum/ui_tab) for {system, operation}" + validates a proposed op against it. This is the "utilize" verb.
3. **Schema variance** — the 3 systems use 3 different param-record shapes (Fusion flat `name/type/min/max/unit`; Mastercam `id/type/values/range`; hyperMILL nested `value:{type,constraints}` + physics_links). A per-operation query needs per-system normalizing adapters.

Grounding rule (load-bearing): CAM parameters drive real G-code — **never hallucinate** a parameter/default/range. Every cataloged value must trace to a grounded source (vendor PDF corpus `cad-cam-resources-pdf-index.json`, OPEN MIND E-Learning, Mastercam X8 docs, the running seats) or be flagged `unverified`.

## Plan (phased — Phase 1 buildable now; Phase 2 is the multi-session grounded fill)

### Phase 1 — Measure + Utilize (the keystone; build this first)
- **U-CAM-CAT-AUDIT** — `scripts/cam-catalog-completeness-audit.mjs` (fs-only, no child_process). For each of fusion360/hypermill/mastercam: enumerate cataloged operations + params + UI buttons (via `function-index.json` manifest + the module files), compare against a grounded **target operation universe** per system (seed the universe list from the function-index + a curated `cam-catalog-target-universe.json` of the software's full operation set), emit per-system + per-operation coverage % + an explicit missing-ops/missing-tabs gap list → `state/shared/CAM-CATALOG-COVERAGE.{json,md}`. Reuses `CAMCatalogLoaderEngine` counts. Advisory + `mustHumanVerify`.
- **U-CAM-CAT-QUERY** — the "utilize" surface. Add a normalized per-operation query + validation:
  - **R8 build-time check first:** verify whether `Fusion360FunctionIndexEngine`/`MastercamFunctionIndexEngine`/`HyperMillFunctionIndexEngine` already expose per-operation param enumeration. If yes → build a thin normalizing facade over the 3; if no → the facade reads the JSON directly with 3 per-system adapters (per the documented schema variance).
  - New engine `CAMCatalogQueryEngine.ts` (or extend the index engines): `listOperations(system)`, `getOperationParams(system, operation)` → normalized `{name,type,default,min,max,unit,enumValues,uiTab,source}[]`, `lookupParam(system, op, param)`, `validateOperation(system, op, params)` → `{unknown[], missingRequired[], outOfRange[]}`.
  - Wire into `prism_cam`: `cam_catalog_operations`, `cam_catalog_operation_params`, `cam_catalog_param_lookup`, `cam_catalog_validate_op` (add to `ACTIONS` z.enum + switch + schemas). Keep the existing `cam_catalog_load_*` counts actions.
  - Tests `camDispatcher.catalog-query-wire.test.ts`: real-data round-trip across **all 3** systems (Fusion `adaptive_clearing` / hyperMILL a 5-axis op / Mastercam `dynamic_mill`) — assert concrete known params present with type/range; validation failure modes (unknown param, missing required, out-of-range) + adversarial (empty op, unknown system) + z.enum guard. Round-trip through `prism_cam`, not just the engine.

### Phase 2 — Grounded gap-fill (multi-session) — ⏸ SOURCE-STRATEGY CORRECTED 2026-05-29 (BLOCKED on operator green-light)
**Original assumption FALSIFIED by a grounded source probe (slot:kilo 2026-05-29).** "Extract from vendor PDFs / OPEN MIND / Mastercam X8 docs" does NOT work for exhaustive fill — the missing ~40% is **not in any text-parseable local source**:
- Mastercam `SharedDefaults/.../*.DEFAULTS-8`/`*.OPERATIONS-8` are **binary** (need the Mastercam SDK / live seat to decode).
- Local Mastercam PDFs are **install/admin guides**; feature tutorials (`Dynamic_Milling.pdf`) are **workflow** docs, not param references (low keyword density, defaults absent).
- `cad-cam-resources-pdf-index.json` is a **file catalog only** (0/3936 entries carry extracted text).
- The only `*.xml` in the mcamX8 tree is CATIA-interop metadata, not toolpath params.

**Corrected source strategy** — the path that worked for hyperMILL (152%, filled from its structured DB/menu export) is the model: enumerate the **live application's operation dialogs**, not scrape docs. Ranked:
1. **★ Live-seat enumeration via `CAMAddInFrameworkEngine` (76 K, already built; `/cam-bridge`).** Generate a Mastercam C-Hook/NET-Hook + Fusion `adsk.cam` Python add-in that walks every operation's parameter definitions in the running seat and exports to `cam-functions/<system>/*.json` (id/type/default/min/max/unit/enumValues/uiTab + `source:"<app> vX live-enum"`). Grounded by construction. **Requires the running seat + operator green-light on which app.** Fusion-first per CLAUDE-BRIEF CAM tier.
2. Online official help scrape (Mastercam/Autodesk portals) — external/network/permission; names grounded, values often `unverified`.
3. Binary `.DEFAULTS-8` decode via the Mastercam SDK — complex, no SDK present; lowest ROI.

**Punch list (grounded, from CAM-CATALOG-COVERAGE.json):** Fusion thinnest = `turning_profile_finishing/turning_face/part_alignment`(9), `spiral/ramp/turning_groove`(10); Mastercam thinnest = `Blade Platform/Top Cutting/Tangent`(2), `Impeller *`(3). Full list + feasibility detail: `state/shared/specs/CAM-GALAXY-COMPLETENESS-AUDIT-2026-05-29.md` §"Phase 2 grounded-source FEASIBILITY (CORRECTION)".

**Execution shape once a seat is authorized:** one add-in per system → enumerate → export → append to catalogs (`source` + `unverified` recorded) → re-run U-CAM-CAT-AUDIT until coverage targets met. NEVER hallucinate — an unextractable param is listed as a gap, not invented (unsafe G-code).

**STATUS 2026-05-29 — Fusion enumerator BUILT (operator chose Fusion-first), U-CAM-CAT-PHASE2-FUSION-ENUM:**
- `scripts/cam-enumerators/fusion-cam-param-enumerator.py` — Fusion 360 Script (adsk.cam): walks `cam.setups[].allOperations[].parameters[]`, dumps every API-exposed field per param (name/title/type/value/expression/unit/enumValues), fail-loud (no CAM product) + fail-soft (per-param try/except). Grounded by construction.
- `scripts/ingest-fusion-cam-enum.mjs` — dump → `cam-functions/fusion360/_live-enum.json` (engine glob-walked + de-duped). Pure fns `normalizeFusionStrategy/parseUnit/normalizeParam/mergeFusionEnum`. min/max NEVER fabricated (flagged `rangeSource:"not-exposed-by-fusion-api"`); inaccessible value → `unverified:true`.
- `scripts/ingest-fusion-cam-enum.test.mjs` — 10/10 node:test (incl. the no-fabricated-range invariant).
- `scripts/cam-enumerators/README-fusion-enumerator.md` — operator runbook (install Script → run against `JM DIE/FUSION CAD AND CAM FILES/` → ingest → re-audit).
- **E2E proven:** synthetic dump → ingest → audit rose 27/497 → 28/500 (+1 op/+3 params), cleanup restored baseline. Caught + fixed a real format bug (string `module` field collided with the audit's `section??module??json` unwrap → renamed `module_id`).
- **⏭ AWAITING:** operator runs the Script in their live Fusion seat against CAM-rich docs → hands dumps to the ingest. Mastercam C-Hook enumerator is the next build once Fusion coverage proven on real dumps.

### Phase 3 — Galaxy / knowledge / verify surfaces
- Add a catalog-coverage check to `scripts/cam-galaxy-verify.mjs` (warn when any system < target %).
- Reference CAM-CATALOG-COVERAGE in `CAM-KNOWLEDGE-INDEX` + the awareness snapshot; `/cam-catalog` skill (query a system's ops/params); galaxy MEMORY + wiki entry + memory file.

## Critical files
- New: `scripts/cam-catalog-completeness-audit.mjs`, `state/shared/cam-catalog-target-universe.json` (seed), `mcp-server/src/engines/CAMCatalogQueryEngine.ts` (or extend the 3 FunctionIndexEngines), `mcp-server/src/__tests__/camDispatcher.catalog-query-wire.test.ts`.
- Edit: `mcp-server/src/tools/dispatchers/camDispatcher.ts` (ACTIONS enum + 4 cases), the matching schema file under `mcp-server/src/schemas/`, `scripts/cam-galaxy-verify.mjs`, `mcp-server/src/engines/cam/{MEMORY,PATHS}.md`.
- Reuse (read, don't rebuild): `CAMCatalogLoaderEngine.ts`, `*FunctionIndexEngine.ts`, `cam-functions/<system>/function-index.json`, `emit-4-system-coverage.mjs`.

## Verification
- `node scripts/cam-catalog-completeness-audit.mjs` → emits CAM-CATALOG-COVERAGE with per-system %, no crash, counts match `CAMCatalogLoaderEngine`.
- `npx vitest run src/__tests__/camDispatcher.catalog-query-wire.test.ts` → green; per-op enumeration returns full param sets for ≥3 ops × 3 systems via `prism_cam`; validation catches unknown/missing/out-of-range.
- `npx tsc --noEmit` → 0 *new* errors (repo baseline ~548 pre-existing).
- `node scripts/cam-galaxy-verify.mjs` → exit 0 (with the new coverage check).
- 3-of-3 scrutiny + per-file 2-reviewer gate on each new file.

## Scope honesty (R12)
Phase 1 makes the existing 847/3475/1600-param catalogs fully *utilizable* per-operation AND *measures* the true completeness gap — it does NOT by itself make the catalogs exhaustive. "Every button/input/function/setting/parameter" is achieved by Phase 2's grounded fill, which is a multi-session campaign (likely several thousand params per system to reach true exhaustiveness). The audit is what lets us prove progress instead of claiming it.
