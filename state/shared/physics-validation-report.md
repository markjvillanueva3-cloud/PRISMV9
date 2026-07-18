# PRISM Physics Formula Validation Report

**Generated:** 2026-06-22T17:21:08Z (UTC)
**Scope:** Physics engine test coverage, canonical constant usage, formula-catalog reconciliation
**Run type:** Automated scheduled task (`physics-formula-validation`) — autonomous, no operator present
**Repo state:** branch `cad-fusion-live-ms0`, commit `2c74add91f`

---

## Executive Summary

All four flagship physics engines exist **and** have at least one dedicated test file — no naked engines among the core four. Every canonical constant exported from `src/physics/constants.ts` is referenced by at least two non-source files, so there are **no fully-dead constants**. The most material findings are (1) a **catalog/reality discrepancy** — the task brief and internal docs cite 499 / 109 formulas, but the live `FormulaRegistry` holds **51 built-in** entries and `quick-ref.json` contains **no formula list at all**; and (2) a **canonicalization gap** — Usui wear coefficients (the heart of `ThermalWearCouplingEngine`) are **not** in `constants.ts`, so thermal-wear results depend on un-canonicalized, caller-supplied coefficients (a Psi risk).

---

## 1. Physics Engine Test Coverage Matrix

| Engine | Source file | Lines | Imports `constants.ts` | Dedicated test file(s) | Test cases | Status |
|--------|-------------|-------|:--:|------------------------|:--:|--------|
| `SpeedFeedOrchestratorEngine` | `src/engines/SpeedFeedOrchestratorEngine.ts` | 4,101 | YES (2) | `speed-feed-orchestrator.test.ts`, `-dedicated.test.ts`, `-convergence-baseline.test.ts`, `SpeedFeedOrchestratorEngine.consultNN.test.ts`, `-boring/-turning/-converge` variants | 50+ across files | COVERED |
| `KienzleForceModelEngine` | `src/engines/KienzleForceModelEngine.ts` | 828 | YES (1) | `KienzleForceModelEngine.test.ts`, `kienzle-force-model.test.ts` | 27 + 17 | COVERED |
| `ChatterStabilityLobeEngine` | `src/engines/ChatterStabilityLobeEngine.ts` | 977 | YES (1) — `CANONICAL_KIENZLE`, `CANONICAL_TOOL_MODULUS` | `ChatterStabilityLobeEngine.test.ts` | 20 | COVERED |
| `ThermalWearCouplingEngine` | `src/engines/ThermalWearCouplingEngine.ts` | 542 | NO (0 imports) | `thermal-wear-coupling.test.ts` | 21 | COVERED, but no canonical-constant linkage (see §5) |

**Surrounding ecosystem:** 281 physics-adjacent test files in `src/__tests__/` (matching physics/kienzle/taylor/speed/feed/force/chatter/thermal/wear/merchant/oxley/johnson/deflect/stability). Enforcement is itself tested: `NoInlinePhysicsConstantsEngine.test.ts` and `camDispatcher-NoInlinePhysics.test.ts` guard against inlined constants.

**Note (doc drift):** the task brief lists `SpeedFeedOrchestratorEngine` at 2,851 lines; the live file is **4,101 lines**. The file grew ~44% since the brief was written — coverage assertions written against the old size should be re-checked.

---

## 2. Canonical Constant Usage Verification

`src/physics/constants.ts` exports **62 symbols** (constants + functions + types). Every canonical data constant is referenced by >=2 non-source files. Occurrence counts across `src/` (excluding `constants.ts` itself):

| Constant | Refs | Constant | Refs |
|----------|-----:|----------|-----:|
| `CANONICAL_KIENZLE` | 727 | `CANONICAL_MILLING_SPEEDS` | 13 |
| `CANONICAL_MATERIAL_DB` | 408 | `KIENZLE_BY_ISO` | 12 |
| `CANONICAL_TAYLOR` | 376 | `CANONICAL_TURNING_FEEDS` | 11 |
| `MATERIAL_DB` | 273 | `CANONICAL_TOOL_POISSON` | 11 |
| `EDM_PHYSICS` | 222 | `CANONICAL_TOOL_MATERIAL_SPEED_FACTOR` | 8 |
| `AISI_CUTTING_COEFFICIENTS` | 80 | `CANONICAL_HEAT_TREAT_REGIME` | 8 |
| `CANONICAL_TOOL_MODULUS` | 62 | `CANONICAL_MILLING_FEEDS` | 7 |
| `AISI_ALIAS` | 62 | `CANONICAL_COOLANT_TEMP_FACTOR` | 6 |
| `WHITE_LAYER_THRESHOLDS` | 26 | `CANONICAL_TAYLOR_LIFE_CV` | 5 |
| `CANONICAL_TURNING_SPEEDS` | 25 | `CANONICAL_MACHINE_RIGIDITY_VC_FACTOR` | 5 |
| `EPS_MACHINE` | 18 | `EPS_RANK` | 5 |
| `TAYLOR_DEFAULTS` | 14 | `YIELD_TO_TENSILE_RATIO` / `WORKPIECE_ELASTIC_MODULUS_GPA` / `MACHINABILITY_FACTOR_BY_ISO` | 4 each |
|  |  | `TOOL_MATERIAL_SPEED_FACTOR_MIN/MAX`, `EPS_EIGEN`, `EPS_SVD` | 2-3 each |

**Unused constants:** **none** among the 30 data constants audited. The lowest-traffic exports (`EPS_SVD`=2, `EPS_EIGEN`=3, `TOOL_MATERIAL_SPEED_FACTOR_MIN/MAX`=3) are still imported by real consumers, not dead.

308 engine files import from `physics/constants` — broad canonical adoption.

---

## 3. Formula Catalog vs. Implementation Reconciliation

**The `quick-ref.json` referenced by the task brief is NOT a formula catalog.** It is a counts/inventory file (engines, dispatchers, actions, commit). It has no `formulas` key. The real catalog is `src/registries/FormulaRegistry.ts`.

| Source | Claimed | Actual (live) |
|--------|--------:|--------------:|
| Task brief | 499 formulas | — |
| `data/FORMULA_REGISTRY_AUDIT.md` | 109 documented | 51 built-in verified |
| `FormulaRegistry.ts` (live, this run) | — | **51** (31 `BUILT_IN_FORMULAS` + 20 `HYPERMILL_FORMULAS`); 27 inline `id:` entries in the core file |

The audit doc already flags the gap: "External JSON (planned) 58+ — Future load." So the 109/499 figures count **planned** formulas not yet loaded into the registry.

**Categories present** (live, from `FormulaRegistry.ts`): tool_life (5), thermal (5), physics (5), linear_algebra (4), power (2), mechanics (2), edm (2), dimensionality_reduction (2), cutting_force (2), plus single entries for surface_integrity, speed_feed, dynamics, chip_formation, iterative_solvers, scoring, quality, productivity, resource_allocation, calculator.

**Domains defined (16):** KIENZLE, TAYLOR, JOHNSON_COOK, MERCHANT, OXLEY, THERMAL, STABILITY, DEFLECTION, SURFACE (+7). Each domain maps to a live engine, so there is **no orphaned formula domain** — every domain has an implementing engine. The gap is **breadth within domains** (planned external formulas unloaded), not missing implementations.

---

## 4. Tests Using Hardcoded Values (should reference canonical constants)

| Test file | Finding | Severity |
|-----------|---------|----------|
| `KienzleForceModelEngine.test.ts` | 36 occurrences of kc-magnitude literals (1800/2100/2800/3200). **Mixed:** lines 59-79 correctly assert against `CANONICAL_KIENZLE.{P,M,S}.kc1_1` (pins the canonical values). Lines 27-45 are **legitimate independent reference data** with cited sources (Sandvik, Kennametal, Boyer Ti Handbook) — valid per R9 cross-check. **But** lines ~108-129 redefine `const kc1_1 = 1800` inline inside compute blocks instead of importing — those specific cases would **not** fail if the canonical P-group value changed. | LOW-MEDIUM |
| `kienzle-force-model.test.ts` (17 cases) | Does **not** import `constants.ts` (import=0). No kc-magnitude literals detected, so likely tests behavior via the engine API, but it does not pin canonical values directly. | LOW |
| `ChatterStabilityLobeEngine.test.ts` (20) | No canonical import in test; engine itself imports `CANONICAL_KIENZLE`/`CANONICAL_TOOL_MODULUS`, so canonical values flow through the engine — acceptable but the test does not independently assert them. | LOW |
| `thermal-wear-coupling.test.ts` (21) | No `constants.ts` import. Engine takes Usui C1/C2 as inputs (see §5), so there is no canonical value to pin — but that is itself the gap. | MEDIUM (root cause is §5) |

No egregious "duplicate the whole constant table in the test" anti-patterns were found. The Kienzle inline `kc1_1 = 1800` recomputation blocks are the only clear case where a test would survive a canonical-constant change it should catch.

---

## 5. Highest-Severity Gap: Un-canonicalized Usui Wear Coefficients

`ThermalWearCouplingEngine.ts` has **zero import statements** and implements the canonical Usui (1978) wear ODE `dVB/dt = C1*sigma_n*V_s*exp(-C2/theta)`. The wear coefficients `usui_C1` and `usui_C2` are **optional caller inputs** (`usui_C1?: number`, `usui_C2?: number`), and `constants.ts` contains **no Usui / wear-coefficient / Archard table** (grep for `usui|wear_coeff|archard` in `constants.ts` -> empty).

**Why this is a Psi risk:** every thermal-wear prediction silently depends on whatever C1/C2 the caller passes (or on inline defaults). There is no single canonical, manufacturer-validated source of truth, no enforcement that callers use validated values, and no test that pins them to reference data. A wrong or defaulted coefficient produces a confidently-wrong wear/tool-life number with no guard tripping. Inline empirical constants in the engine (`Ctheta = 0.08`, `contactLength_m = 0.002`, `VBref = 0.3`) are documented but also live outside the canonical file.

---

## 6. Recommendations (ranked by impact)

1. **Add a canonical Usui/Archard wear-coefficient table to `constants.ts`** (per ISO group or per material, with cited sources: Usui 1978, Archard, manufacturer data), have `ThermalWearCouplingEngine` import it as the default when caller omits C1/C2, and add a `thermal-wear-coupling` test that pins predictions to reference values. **Highest impact** — closes the only physics engine with no canonical linkage and the largest silent-error surface.
2. **Reconcile the formula-count narrative.** Either load the planned 58+ external formulas into `FormulaRegistry` or update the task brief / docs that cite "499 formulas" to the verified live count (51 built-in). The 499 vs 51 gap is an R12 fail-loud issue — downstream consumers may assume coverage that does not exist.
3. **Move the Kienzle test's inline `kc1_1 = 1800` recompute blocks (lines ~108-129) to import `CANONICAL_KIENZLE.P.kc1_1`.** Keep the manufacturer reference rows (Sandvik/Kennametal/Boyer) as independent cross-checks — they are correct as-is. Low effort, removes the one place a canonical change wouldn't be caught.
4. **Add canonical-value assertion lines to `ChatterStabilityLobeEngine.test.ts` and the two SpeedFeed orchestrator tests** so a change to `CANONICAL_KIENZLE`/`CANONICAL_TOOL_MODULUS` produces a failing test at the consumer boundary, not just inside the engine.
5. **Fix the brief's stale line count** for `SpeedFeedOrchestratorEngine` (4,101 vs cited 2,851) and re-derive any coverage thresholds keyed to file size.

---

## Methodology & Caveats

- File counts and constant references gathered via `ripgrep` over `src/` on commit `2c74add91f`; reference counts are **total occurrences** (not distinct files), used only to prove non-zero usage.
- "Test case" counts are `it(`/`test(` occurrences per file.
- The four named engines were verified to exist by path; their test linkage by filename + `import` grep.
- Not exhaustively audited: every one of the 281 physics test files for hardcoded values (only the 7 tests tied to the four named engines were inspected line-level). A full sweep of the remaining ~274 is a recommended follow-up but exceeded this run's scope.
- `quick-ref.json` does not contain formulas; the live `FormulaRegistry.ts` was used instead and the discrepancy is reported rather than silently bridged.

*End of report.*
