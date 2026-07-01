# TANGO Engine / Algorithm / Formula Assessment (2026-06-15)

**Slot:** tango (discovery) · **Work order:** "assess and analyze engines, algorithms and formulas; find opportunities for improvements."
**Method:** single-pass scanner `scripts/assess-engine-algo-improvements.mjs` over the FULL population (no fan-out, fork-storm-safe) + verify-on-disk on the top finding. Data: `state/shared/ENGINE-ALGO-ASSESSMENT-2026-06-15.json`.

## Population (ALL MEANS ALL)
**3796 engines · 122 algorithms · 6 physics/formula files · 111 dispatchers.**
Compliance baseline: 262 engines correctly import `physics/constants.ts`.

## Improvement opportunities (5 dimensions scanned)

| signal | count | verdict |
|---|---|---|
| **inline-physics-constant (SAFETY)** | **70** | **VERIFIED real** (spot-checked 5/5) — top priority |
| no-test (name-match) | 1736 | UPPER BOUND only — over-counts (integration/dispatcher/grouped tests not name-matched); do NOT treat as 1736 real gaps |
| stub markers | 0 | clean — the no-stub PreToolUse hook works |
| dormant-algorithm (0 consumers) | 9 | 7 are the KNOWN WIRE-EXEMPT course-forge PDE suite (closures can't cross a JSON dispatcher) + SafeExpressionEvaluator; only **TSNEAlgorithm** is a genuine review candidate |
| tiny (<400B) | 2 | likely re-exports |

## #1 finding — 70 inline-physics-constant violations (SAFETY)

Engines that **re-define** Kienzle `kc1.1` / Taylor `C` values **locally** instead of
importing `KIENZLE_BY_ISO` / `CANONICAL_TAYLOR` from `physics/constants.ts`. This is the
documented anti-pattern (CLAUDE.md: *"never inline Kienzle/Taylor/material constants"*) —
**no auditor enforced it until this scanner.** Verified real (e.g. `CAMPluginSDKEngine`
re-defines the entire `{P:{kc1_1:1800},M:{kc1_1:2100},K:{kc1_1:1100}}` table;
`AdvancedPostPhysicsEngine` has `{steel:{kc11:1800}}`; `AIMLEngine` has `const taylorC=400`).

**Why it matters (not cosmetic):** an inline table can DRIFT from canonical →
divergent cutting force → wrong feed/speed → machine damage. Proof it happens:
`CryogenicCuttingEngine:170` carries a comment that a prior inline value `1500/0.26`
was *below Sandvik/ISO 3685* and corrected to canonical `1800/0.25`. papa hit the same
class this session (`CounterfactualMill` DEFERRED — divergent inlined constants).

### Routed to domain owners (remediation is physics work + physics-reviewer per file — NOT tango's lane to change physics)

| owner | count | sample engines |
|---|---|---|
| **other/cross** | 25 | AdaptivePipelineGenerator, AIIntelligenceMaximizer, AIML, BayesianAdaptive, ChanceConstrainedOptimization, EndToEndPipeline |
| **cam (kilo)** | 18 | BatchCAMMaterialBridge, CAMKernelOrchestrator, CAMPluginSDK, CrossCamNovelAlgorithms, HyperMillDeepLearning |
| **speedfeed (oscar)** | 11 | CADPhysicsConsistencyGate, CryogenicCutting, CuttingDataExport, DeepHoleDrillingPhysics, FusionMaterialPhysicsBridge |
| **infra/test-fixture** | 5 | BenchmarkReportGenerator, CalibratedSimulation, CNCSimulationPipeline, SensorSimulator, TestingProtocol — *lower priority: some are benchmark fixtures, not live calcs* |
| **lathe (whiskey)** | 5 | TurningForce, TurningProfile, TurningProgramAssembler, LatheAITraining, LatheTroubleshootingIntelligence |
| **post (echo)** | 4 | AdvancedPostPhysics, PostPhysicsFoundation, PostProcessorTribalKnowledgeIntegration, PostValidationSuite |
| **mill (foxtrot)** | 2 | MillingAIUltraIntelligence, MillingDeepKnowledgeSynthesis |

**Remediation pattern per engine (physics-reviewer gated):**
1. Compare each inline `kc1_1`/`taylor_C` value to canonical for that ISO group.
2. If **identical** → pure refactor: `import { KIENZLE_BY_ISO } from "../physics/constants.js"`, delete the local table, repoint references. Safe.
3. If **divergent** → SAFETY BUG: physics-reviewer decides canonical-vs-local correctness, then import. **This is the high-priority subset.**
4. Full-build + affected tests after each.

**Re-run the scanner any time:** `node scripts/assess-engine-algo-improvements.mjs`
(emits the dated JSON). Recommend wiring it as `prism_dev:physics_const_compliance`
(a standing CI gate so new inline constants are caught at write-time).

### Refinement — matches-canonical vs non-group split (2026-06-15, commit `f1f13896f4`)

The original regex matched **only** the 6 canonical ISO-group values, so it flagged
the harmless matches-canonical subset and was BLIND to any other value. Extracted to a
pure, unit-tested lib `scripts/lib/inline-const-classify.mjs` (`classifyInlineKc` ->
`{values, matchesCanonical, divergent}`, 11/11 tests) and broadened to ANY value.
**Count 70 -> 73** (3 non-group-only files the old regex missed); new `inlineDivergent`
dimension = **36**.

**R12 honesty (verify-on-disk):** `inlineDivergent` is NOT "36 safety bugs." The 6
canonical values are per-ISO-GROUP representatives; engines legitimately carry
per-MATERIAL kc1.1 tables that differ by design -- `KienzleForceModelEngine:260` is an
explicit `{ kc1_1: 1780, iso_group: "P", description: "AISI 1045" }` table (commented as
"more granular than the per-ISO-group values in constants.ts"); `CryogenicCuttingEngine`
carries aluminium `kc1_1: 750`. So `divergent` = **"review whether this should reference
`MATERIAL_DB` instead of an inline table"** -- a physics-reviewer triage signal,
occasionally real drift (historical CryogenicCutting 1500-below-ISO-3685), mostly
legitimate. The cleaner actionable subset is the **matches-canonical-only** files (they
inline exactly the 6 group values = unambiguous refactor-to-import).

## Formula layer
The 6 `physics/*.ts` files (incl. `constants.ts` with `KIENZLE_BY_ISO`,
`CANONICAL_TAYLOR`, `MATERIAL_DB`, `EDM_PHYSICS`) ARE the canonical source of truth and
are correct. The improvement opportunity is **adoption** — 70 engines bypass them. No
formula-definition defects found; the gap is compliance, addressed above.

## Algorithm layer (count corrected — scanner false-negative fixed)
122 algorithms. **29 are production-dormant** (imported only by tests, or unconsumed —
NOT used by any production engine/dispatcher). NOTE: the first scan reported only 9 — a
false-negative: name-token matching let a same-named ENGINE mask an algorithm's dormancy
(`ClusteringEngine` lives in BOTH `algorithms/` and `engines/`). Fixed (`3229f11549`) with
precise import-path detection; verified `ClusteringEngine` correctly EXCLUDED (real
dispatcher import at `algorithmDispatcher.ts:944`) and test-only algos (AntColonyTSP,
DigitalTwinEstimator) correctly INCLUDED.

Of the 29: **7 are intentional WIRE-EXEMPT** course-forge closures (FiniteDifference,
FEM1D, ODEIntegrator, OperatorSplitting, Lagrangian, LinearStateSpace, GradientDescent) +
SafeExpressionEvaluator. The other **~20 are real algorithm capabilities** built + tested
but **not wired into any production engine/dispatcher** — BayesianOptimizer, AntColonyTSP,
MonteCarlo, SimulatedAnnealing, PIDController, FEASolver2D, ThermalFEAModel, ToolDeflectionModel,
UsuiWearModel, SpindleVibFFTModel, etc. = **build-out-consumer / wire candidates** (india +
domain owners): these are the genuine algorithm-layer improvement opportunity.

## Engine near-duplicate clusters (added — first systematic engine-dedup audit)

No engine-dedup auditor existed (DuplicationGuardEngine is create-time only; the
`dedupe-*` scripts cover hooks/graph, not engines). The scanner now name-clusters
the population by stripped stem → **22 clusters / 45 files**. Three categories:

**A. Same-stem pairs — CORRECTED 2026-06-15 (verify-on-disk): owner-led MERGE, NOT free consolidation.**
The original "true dups (consolidate)" framing OVERCLAIMED. Verify-on-disk shows every
candidate is BOTH-consumed (real-consumer-file counts, excluding self/test/dispatcher/index):
- `BatchCAMStrategyEngines` (53KB, 2 consumers) + `BatchCAMStrategyEngines2` (32KB, **1 consumer**) -- the `2` is NOT a free leftover; it has a live consumer. CAM (kilo) merge.
- `JMDieLatheProgramUpgraderEngine` (10KB, 4 consumers) + `…V2Engine` (14KB, **2 consumers**) -- both in use; lathe (whiskey) merge.
- `HyperMillMetricCfgExtractor` (10KB, 2 consumers) + `…Engine` (19KB, 2 consumers) -- both in use; hyperMILL (kilo/echo) merge.
- `ClusteringEngine` exists in BOTH `algorithms/` AND `engines/` but they are **two DIFFERENT impls** sharing a name (algorithms = K-means Algorithm-interface, 0 importers; engines = KMedoids/MeanShift, 1 importer) -- NOT a code dup (verified last session). Do not merge.

**None is a tango free-quarantine.** Each needs the owner to repoint consumers + merge logic
(a real refactor), so they are SURFACED to owners, not consolidated by tango. Lesson (R12):
a name-cluster heuristic flags same-stem pairs but cannot tell "free dup" from "both-used" --
consumer fan-in is the discriminator the clusterer lacked.

**B. Engine-vs-Adapter redundancy (the discovery-sweep "wire Adapter, retire Engine" pattern — now the COMPLETE set, romeo/kilo/oscar lane):**
CoatingSelection, CoolantStrategy, EntryExitStrategy, IntelligentSequencing,
BlueprintOCR, EventBus(+Engine), MaterialDatabase(Bridge+Engine),
MultiProcessCAM(Bridge+Router), ToolpathStrategy(Engine+Router), and
**TransferLearning has THREE impls** (Adapter+Bridge+Engine).

**C. Legit algorithm-wrapper pairs (NOT dups — do not merge):** same-stem but
*different name* across `algorithms/` + `engines/` = the intentional "pure
algorithm + engine wrapper" layering: KalmanFilter/KalmanFilterEngine,
MonteCarlo/MonteCarloEngine, PIDController/PIDControllerEngine,
SimulatedAnnealing/…Engine, KienzleForceModel/…Engine, RCSA/…Engine,
ChipThinningCompensation/…Engine, SurfaceFinishPredictor/…Engine. Flagged by the
clusterer but architecturally correct — listed so they're not mistaken for dups.

Highest-confidence consolidation targets: **Category A** (accidental/versioned).
Category B = the romeo wire-then-retire queue (overlaps the discovery-sweep report).

## Test-assertion quality (added 2026-06-15, commit `e2292fdee1`)

A 6th dimension, built by **extending the existing `stub-class-audit-tobedefined.mjs`**
(anti-sprawl -- dedup law found it already covered the strict `toBeDefined()`-only
case; a parallel scanner would have been a duplicate). Added three R9/R12 gaps it did
NOT cover + a `stripCode()` preprocessor, run over the FULL `mcp-server/src` tree
(was central `__tests__` only): `node scripts/stub-class-audit-tobedefined.mjs --quality [--json]`.

| dimension | live count | verdict |
|---|---|---|
| toBeDefined-only stub (R9) | 0 | clean (pre-existing check holds) |
| **skipped (R12)** | **5 files / ~17 skips** | **VERIFIED real** -- biggest `lathe-orchestration.test.ts` (11 `describe.skip`: MACHINE_READINESS / EMERGENCY_RECOVERY / PROVE_OUT) |
| focused `.only` (R12) | 0 | clean after FP fix |
| assertion-free (R9) | 0 | clean |

**Two false-positive classes were found ON LIVE DATA and fixed before shipping (R12):**
1. Jasmine `fit()`/`fdescribe()` aliases collided with curve-`fit()`/`model.fit()`
   (CPK surrogate, ArcFitting, Weibull, regression) -- 13 false focused hits. Dropped
   (vitest/node:test have no `fit`/`fdescribe`).
2. focus/skip markers inside test-FIXTURE strings (`GapPredictorEngine`,
   `CounterfactualBuildSimulator` carry them as INPUT data) + comments -- fixed by
   `stripCode()` blanking string/comment contents (delimiters kept). 34/34 tests PASS.

**Routed (advisory):** the ~17 skipped tests are mostly **lathe (whiskey)** -- likely
intentional (unbuilt features: PROVE_OUT etc.), but each skip is a silently-unrun test
and should be confirmed-or-deleted, not left ambiguous (R12). Re-run any time; emits no
file (stdout/`--json` only -- a pure read, no artifact to rot).

---
Advisory + must-human-verify. Scanner + raw data committed (`1cfacbdce8`, dedup dim `e480d28ae8`); test-quality dim `e2292fdee1`.
