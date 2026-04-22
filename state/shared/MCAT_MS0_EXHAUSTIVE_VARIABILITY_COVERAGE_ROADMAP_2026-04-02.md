# MCAT-MS0 Supporting Roadmap - Exhaustive Variability Coverage

Date: 2026-04-02  
Owner: Codex  
Parent milestone: `MCAT-MS0`  
Lane: `MCAT-MS0 / P1-U01 support`  
Roadmap posture: supporting execution roadmap under the active `finish-current-backend-and-frontend-work-first` gate

## Intent

Prove the calculator's machine-selection, tooling, holder, coolant, toolpath, material, and fixture surfaces against the full legal state space that PRISM can represent, while also identifying every still-unwired data source that should feed those surfaces.

This roadmap is not a separate large-gap milestone. It is a mathematically explicit validation and wiring plan that supports the already active `MCAT-MS0` delivery tranche.

## Current Gate

- Collaboration mode: `finish-current-delivery-first`
- Active gate: `finish-current-backend-and-frontend-work-first`
- Active parent unit: `MCAT-MS0 / P1-U01`
- Consequence:
  - this roadmap must strengthen the active calculator/machine tranche
  - it must not fork into unrelated platform work
  - outputs should feed `MCAT-MS0` execution directly

## Execution Status

- `U-MVAR01` complete
  Artifacts:
  [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.md)
  and
  [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json)
- `U-MVAR02` complete
  Artifacts:
  [MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.md)
  and
  [MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json)
- `U-MVAR03` complete
  Artifacts:
  [MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.md),
  [MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json),
  and
  [MCAT_MS0_RISK_REGISTRY_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_RISK_REGISTRY_2026-04-02.json)
- `U-MVAR04` complete
  Artifacts:
  [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.md)
  and
  [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json)
- `U-MVAR05` complete
  Artifacts:
  [MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.md)
  and
  [MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json)
- Current headline drift now captured in shared artifacts:
  - `920` merged machines vs stale `824` MachineRegistry header
  - `910` machines in SVI vs `920` merged enhanced machine rows
  - `95,608` intended tool corpus vs `13,967` active unique live tool ids
  - calculator workholding and CAM/toolpath surfaces remain fallback-only
- Canonical legality extract headline:
  - `51` holder signatures enumerated from backend truth
  - `25` zero-holder signatures now named explicitly
  - `63` lathe-style rows still lack a published turret interface
  - `34` swiss gang layouts currently return zero holder legality
  - `6` mill-turn rows publish a magazine but not a milling spindle interface
- Session 1 status: complete
- Session 2 status: `U-MVAR07` complete
- Recovery-wave headline:
  - `22` source families need recovery or promotion
  - `3` are `P0` denominator-recovery families
  - `11` are `P1` backend-promotion or fallback-retirement families
  - `W0` is led by the tool corpus gap
  - `W1` is led by holder/tooling backend promotion
  - `W2` is led by workholding and CAM/toolpath fallback retirement
- Next active unit: `U-MVAR08`
  build weighted legality-aware `t=3/4/5` and numeric-oracle generators on top of the exact denominator sets from `U-MVAR07`

## Corpus Baseline

Verified on disk at generation time:

- Machine merged surface: `920`
  - Source: `H:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json`
- Machine source-family warning:
  - `MachineRegistry.ts` still carries stale `824`-machine language
  - the machine corpus actually spans `11` extracted source directories
- Intended full PRISM tool corpus from shared project/docs: `95,608`
  - Sources:
    - `H:/PRISM/PRISM-DESKTOP-PROJECT-INSTRUCTIONS.md`
    - `H:/PRISM/CLAUDE.md`
    - `H:/PRISM/CAMX-RESTRUCTURED-ROADMAP-v24.md`
- Active current `ToolRegistry` load roots:
  - `H:/PRISM/data/tools` -> `15,912` raw records
  - `H:/PRISM/extracted/tools` -> currently `0` JSON files
- Active unique tool ids visible from the current dual-path load roots: `13,967`
- Additional tool source families that must be tracked independently:
  - `ENDMILL_CATALOGS.json` -> `937`
  - `CUTTING_TOOLS_INDEX.json` -> `1,944`
  - `MANUFACTURER_CATALOGS.json` -> `1,051`
  - `SPECIALTY.json` -> `240`
  - `TURNING_HOLDERS_EXPANDED.json` -> `600`
  - `MILLING.json` -> `948`
  - `DRILLING.json` -> `360`
  - `THREADING.json` -> `126`
  - `HOLE_FINISHING.json` -> `189`
  - `TURNING.json` -> `81`
  - `TURNING_INSERTS.json` -> `1,710`
- Holder-related domains:
  - `TOOLHOLDERS.json` -> `6,741`
  - `INDEXABLE_MILLING_TOOLHOLDING.json` -> `984`
  - `TURNING_HOLDERS_EXPANDED.json` -> `600`
  - interface standards logic in `ToolHolderDatabaseEngine.ts`
- Material domains:
  - `MATERIALS_MASTER.json` -> `163`
  - `223` JSON files under `H:/PRISM/data/materials`
  - `214` detail JSON files excluding index/helper surfaces
  - `46` extracted material JS files
- Workholding domains:
  - `WORKHOLDING.json` top-level records -> `20`
  - internal split:
    - vises -> `5`
    - chucks -> `4`
    - collets -> `4`
    - fixtures -> `5`
    - toolholders -> `2`
- CAM and toolpath domains:
  - calculator programming packages in `calculatorWorkspace.ts` -> `66`
  - calculator toolpath entries in `calculatorWorkspace.ts` -> `337`
  - backend `ToolpathStrategyRegistry.ts` strategies -> about `721`

Known current calculator proof floor before this roadmap:

- current calculator machine package live proof stack passed on the already-wired package set
- current broader focused calculator proof stack: `55/55`
- current current-catalog machine coverage proved: `7` mills, `6` lathes
- gap:
  - current proof is strong for the wired calculator package set
  - current proof is not yet equivalent to the full machine/tool/holder/material/workholding/CAM corpus
  - current active live tool registry is not equivalent to the historical/intended `95,608`-tool PRISM corpus

Immediate corpus-risk note:

- the tool universe currently has a three-layer mismatch:
  - historical/intended PRISM tool corpus: `95,608`
  - active live registry load roots on disk: `15,912` raw records / `13,967` unique ids
  - calculator-wired tool subset: smaller still
- exhaustive calculator coverage must therefore include corpus recovery and family-by-family wiring parity, not only better UI tests

## Consumer Matrix

Coverage is not complete when the calculator alone is green. The propagation layer must be tracked explicitly:

- Calculator
  - status: primary UI consumer
  - source-of-truth status: consumer only
- UserMachineProfile
  - status: canonical persistence contract
  - source-of-truth status: backend canonical
- Program Release
  - status: partially converged consumer
  - known gaps:
    - controller feature bundles are still partially synthesized
    - coolant strategy packaging is still partially generic
- Print to CNC / print-to-program surfaces
  - status: downstream parity target
  - known gap:
    - must be explicitly pulled into the same legality surface, not left as a later assumption

Hard rule:

- backend legality and canonical package truth are authoritative
- frontend calculator behavior is evidence and consumer verification, not the legality source

## MCP FULL UTILIZATION PROTOCOL

Applies to every execution session for this roadmap.

SESSION START:

- `prism_dev:session_boot`
- `prism_dev:server_info`
- `prism_dev:svi_summary`
- shared task queue + roadmap sync refresh
- corpus delta audit before any new test harness expansion

DURING WORK:

- `prism_dev:test_smoke`
- targeted Vitest and route checks
- live browser proof for calculator route slices
- early thin live proof after each source-wiring wave
- checkpoint every 2-3 units or after each source-wiring wave

SESSION END:

- sync shared coordination
- record corpus counts and newly wired datasets
- log coverage metrics, ambiguity counts, and new invariants

## ENFORCEMENT & KNOWLEDGE PROTOCOL

Primary knowledge sources:

- `H:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json`
- `H:/PRISM/data/tools/TOOLHOLDERS.json`
- `H:/PRISM/data/tools/ENDMILL_CATALOGS.json`
- `H:/PRISM/data/tools/CUTTING_TOOLS_INDEX.json`
- `H:/PRISM/data/tools/MANUFACTURER_CATALOGS.json`
- `H:/PRISM/data/tools/SPECIALTY.json`
- `H:/PRISM/data/tools/MILLING.json`
- `H:/PRISM/data/tools/DRILLING.json`
- `H:/PRISM/data/tools/THREADING.json`
- `H:/PRISM/data/tools/HOLE_FINISHING.json`
- `H:/PRISM/data/tools/TURNING.json`
- `H:/PRISM/data/tools/TURNING_INSERTS.json`
- `H:/PRISM/data/tools/INDEXABLE_MILLING_TOOLHOLDING.json`
- `H:/PRISM/data/materials/MATERIALS_MASTER.json`
- `H:/PRISM/data/workholding/WORKHOLDING.json`
- `H:/PRISM/mcp-server/src/registries/MachineRegistry.ts`
- `H:/PRISM/mcp-server/src/registries/ToolRegistry.ts`
- `H:/PRISM/mcp-server/src/registries/MaterialRegistry.ts`
- `H:/PRISM/mcp-server/src/registries/ToolpathStrategyRegistry.ts`
- `H:/PRISM/mcp-server/src/engines/ToolCatalogEngine.ts`
- `H:/PRISM/mcp-server/src/engines/ToolHolderDatabaseEngine.ts`
- `H:/PRISM/mcp-server/src/engines/WorkholdingEngine.ts`
- `H:/PRISM/mcp-server/src/engines/FixtureAwareStrategyEngine.ts`
- `H:/PRISM/mcp-server/src/engines/InventoryAwareToolSelectorEngine.ts`
- `H:/PRISM/mcp-server/src/engines/ToolSelectionEngine.ts`
- `H:/PRISM/mcp-server/src/engines/MachineStrategyConstraintEngine.ts`
- `H:/PRISM/mcp-server/src/engines/MachineCapabilityIntelligenceEngine.ts`
- `H:/PRISM/mcp-server/src/engines/ROIAdvisorEngine.ts`
- `H:/PRISM/mcp-server/src/routes/operating-system.ts`
- `H:/PRISM/mcp-server/src/contracts/userMachineProfile.ts`
- `H:/PRISM/mcp-server/src/utils/programReleaseMachineCatalog.ts`
- `H:/PRISM/mcp-server/web/src/data/calculatorWorkspace.ts`
- `H:/PRISM/mcp-server/web/src/api/calculatorData.ts`
- `H:/PRISM/mcp-server/web/src/pages/CalculatorPage.tsx`
- current calculator proof tests under `H:/PRISM/mcp-server/web/src/__tests__`

Hard rules:

- legality beats convenience; no impossible combo may be rendered or saved
- inferred options must carry provenance and confidence
- missing wiring must be surfaced as a gap, not silently substituted
- numeric variability must use equivalence classes and boundary values, not naive random fuzzing
- set-valued domains must be modeled as bundles or subsets, not flattened into scalar labels

## Coverage Universe

Define the legal calculator state space as:

`U_legal = {(m, cfg, ctl_bundle, sp, cool_set, feat_bundle, tool_bundle, holder_bundle, cam_pkg, path_strategy, mat_state, fixture_bundle, cut_band, finish_state, overlay) | all legality constraints hold}`

Where:

- `m`: canonical machine package
- `cfg`: machine configuration package
- `ctl_bundle`: controller package plus enabled controller features
- `sp`: spindle package
- `cool_set`: coolant strategy subset actually installed on the machine
- `feat_bundle`: machine capability bundle
- `tool_bundle`: tool body / insert / geometry bundle
- `holder_bundle`: holder body / interface / turret or live-tooling bundle
- `cam_pkg`: programming environment or CAM stack
- `path_strategy`: exact toolpath family and strategy mapping
- `mat_state`: material family, grade, condition, hardness/state, provenance
- `fixture_bundle`: vise, chuck, collet, modular fixture, or workholding posture
- `cut_band`: numeric cut parameter band
- `finish_state`: target and predicted finish posture
- `overlay`: user-owned machine overlay and shop-specific constraints

## Mathematical Coverage Model

Brute-force Cartesian expansion is neither necessary nor correct for a constrained graph. The roadmap follows a layered legality-aware coverage model:

### 1. Constraint Partitioning

Partition the universe by canonical machine package and legal configuration:

`U_legal = Union over p of U_p`

Important correction:

- `Sum(Product(...))` is only an upper bound when cross-edge legality is present
- all denominators used for coverage claims must come from enumerated legal tuples or legal tuple generators

Denominator form:

- `legal_tuples(S) = enumerate_legal_tuples(S, constraint_graph)`

### 2. Exact Coverage Floors

Exact exhaustive coverage is required for:

- every single selectable value
- every legal pairwise interaction
- every legal saved-profile overlay edge
- every source-wired vs fallback parity edge
- every bundle-class variant for set-valued domains

Metrics:

- `Cov_1(d) = tested_values(d) / legal_values(d)`
- `Cov_2(d_i, d_j) = tested_pairs(i,j) / legal_pairs(i,j)`
- `Cov_bundle(d) = tested_bundle_classes(d) / legal_bundle_classes(d)`

Required floor:

- `Cov_1 = 1.0`
- `Cov_2 = 1.0` for all high-risk dimension pairs

### 3. Mixed-Strength Weighted t-Wise Coverage

For higher-order interactions, generate legality-aware mixed-strength covering arrays:

- baseline: `t = 3`
- elevated: `t = 4` for high-risk machining strata
- hotspot: `t = 5` for named machine-tool-holder-path-material hotspots on priority brands

High-risk weights are highest for:

- machine x spindle x holder x tool
- machine x controller feature bundle x CAM x toolpath
- machine x coolant bundle x material state x finish target
- lathe/mill-turn turret topology x live tooling x holder interface
- user overlay x canonical package x save/load roundtrip

Generator requirements:

- explicit risk registry with named brands and families
- weighting function per stratum
- mixed-strength assignment rules
- stopping rule tied to named floor completion and ambiguity burn-down

Metric:

- `Cov_t(stratum) = covered_legal_tuples(stratum) / enumerated_legal_tuples(stratum)`

### 4. Boundary and Numeric Oracle Coverage

For numeric fields:

- use min / nominal / max / near-limit / out-of-range bands
- define equivalence classes for:
  - spindle RPM
  - tool diameter
  - flute count or insert count
  - holder gauge length / projection
  - machine magazine or turret station counts
  - DOC / WOC / feed / SFM
  - finish targets

Boundary metric:

- `Cov_b = tested_boundaries / defined_boundaries`
- `Cov_num = within_tolerance_cases / oracle_scored_cases`

### 5. Metamorphic Invariants

When one dimension changes and others are held stable, the system should obey predictable relationships.

Example invariants:

- removing a controller feature cannot unlock new toolpaths
- reducing coolant capability cannot increase legal coolant options
- changing a holder interface cannot preserve an incompatible spindle interface
- increasing magazine size can expand inventory fit but cannot alter machine identity
- changing from fallback to source-backed live data cannot invent unsupported options
- save/load roundtrip must preserve canonical identity and legal overlays
- feature-bundle closure must hold after persistence and reload
- negative controls must reject known-impossible combinations

Metamorphic score:

- `Met_pass = passed_invariants / executed_invariants`

### 6. Source-Wiring Completeness

Every relevant source family must be classified as:

- wired to calculator
- partially wired
- present in backend only
- present in static fallback only
- present in raw corpus but unused

Wiring completeness:

- `Wire_cov_source = wired_source_families / discovered_source_families`
- `Wire_cov_consumer = consumers_using_canonical_truth / target_consumers`

### 7. Release Gates

Use `Q_cov` as a dashboard score, not a sole release gate:

`Q_cov = 0.15*Cov_1 + 0.20*Cov_2 + 0.10*Cov_bundle + 0.15*Cov_t + 0.10*Cov_b + 0.15*Cov_num + 0.10*Met_pass + 0.05*Wire_cov_source - Penalty`

Penalty is driven by unresolved ambiguity:

`Penalty = unresolved_legality_edges / total_legality_edges`

Target:

- dashboard target: `Q_cov >= 0.92`
- hard release floors:
  - `Cov_1 = 1.0`
  - critical `Cov_2 = 1.0`
  - critical `Cov_bundle = 1.0`
  - hotspot `Cov_t >= 0.95`
  - `Cov_num >= 0.97`
  - required `Met_pass = 1.0`
  - `Wire_cov_source >= 0.95`
  - `Wire_cov_consumer >= 0.90`
  - `Penalty <= 0.02` on priority machine families
  - source-count reconciliation complete for machines, tools, holders, materials, workholding, and toolpaths

## Execution Phases

### Session 1 - Universe, Reconciliation, and Contract

SMART CONFIG:

- Role: `R7 Architect + R4 QA`
- Model posture: high reasoning
- Effort: high
- Context budget: `35%`

Intent:

- leave the system with one explicit legality graph, one source-family ledger, one consumer matrix, and one executable metric contract

Units:

#### U-MVAR01 - Build the corpus census and count-reconciliation ledger

- classify every relevant machine, tool, holder, insert, material, CAM, toolpath, and workholding source family
- map each source to:
  - calculator live wiring
  - calculator fallback wiring
  - backend-only availability
  - currently unused status
- explicitly reconcile:
  - `920` vs stale `824` machine claims
  - `95,608` intended tools vs active live roots
  - holder family denominators
  - material master vs material directory trees
  - calculator CAM/toolpath counts vs backend strategy registry

FILES_CREATED:

- `H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.md`
- `H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json`

ABORT_CRITERIA:

- the tool corpus mismatch (`95,608` intended vs `15,912` active raw vs `13,967` unique ids) is not explicitly accounted for
- a relevant corpus source has no classification
- counts cannot be reproduced from scripts
- wiring state cannot distinguish live from fallback

#### U-MVAR02 - Define the legality graph and bundle schema

- formalize allowed edges between machine, controller bundle, spindle, holder bundle, tool bundle, CAM, toolpath, material state, coolant set, fixture bundle, and overlay
- define ambiguity classes and confidence tiers
- ensure set-valued domains are modeled as bundles, not scalar labels

FILES_CREATED:

- `H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.md`
- `H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json`

ABORT_CRITERIA:

- graph cannot represent mill, lathe, swiss, and mill-turn separately
- user overlay bypasses canonical legality
- holder/tool compatibility lacks interface-level representation
- bundle-class legality is flattened away

#### U-MVAR03 - Publish the coverage metric and risk contract

- lock the formulas, floors, invariants, strata, risk registry, and evidence format used by all later proof harnesses
- define named priority brands, families, and hotspot tuples
- define mixed-strength weighting and stopping rules

FILES_CREATED:

- `H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.md`
- `H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json`
- `H:/PRISM/state/shared/MCAT_MS0_RISK_REGISTRY_2026-04-02.json`

ABORT_CRITERIA:

 - metrics do not separate value, pair, bundle, higher-order, numeric, and wiring coverage
 - no explicit ambiguity penalty exists
 - no explicit consumer propagation matrix exists
 - `Cov_t` or release floors are undefined

EXIT GATE:

- every source family is classified
- legality graph dimensions are explicit
- risk registry is machine-readable
- coverage formulas are fixed and executable

/compact checkpoint

### Session 2 - Canonical Extraction, Corpus Recovery, and Early Proof

SMART CONFIG:

- Role: `R1 Builder + R7 Architect`
- Effort: high
- Context budget: `40%`

Intent:

- recover still-unwired corpora and make canonical legality machine-readable early enough to prove live behavior, not just plan it

Units:

#### U-MVAR04 - Build legality extractors from backend canonical registries

- derive per-machine legal controller/spindle/coolant/capability matrices
- derive holder interface legality for mill, lathe, swiss, and mill-turn
- treat backend legality as authoritative over frontend approximation
Completed:
- [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.md)
- [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json)

#### U-MVAR05 - Recover unwired source families

- compare calculator-exposed tool, holder, material, workholding, CAM, and toolpath universes with all discovered source families
- record every unwired but relevant family
- explicitly separate:
  - raw corpus present
  - backend wired
  - calculator wired
  - downstream consumer wired
Completed:
- [MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.md)
- [MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json)

#### U-MVAR06 - Early thin live proof and downstream sample

- run thin live calculator proof immediately after each source-family convergence wave
- pull one downstream consumer proof forward:
  - Program Release machine-profile fidelity
  - first print-to-program surface where applicable

EXIT GATE:

 - unwired source families are named and counted
 - legality matrices exist for machine-tool-holder-coolant-toolpath interactions
 - thin live proof artifacts exist
 - at least one downstream consumer proves the same canonical machine truth

Completed:

- published [MCAT_MS0_THIN_LIVE_PROOF_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_THIN_LIVE_PROOF_2026-04-02.md) and [MCAT_MS0_THIN_LIVE_PROOF_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_THIN_LIVE_PROOF_2026-04-02.json)
- proved calculator posture for `Okuma GENOS M460V-5AX`, `Haas ST-20Y`, and `Citizen Cincom L20`
- proved downstream Program Release machine surfaces live through REST and browser checks
- found and fixed duplicate downstream machine ids in [programReleaseMachineCatalog.ts](H:/PRISM/mcp-server/src/utils/programReleaseMachineCatalog.ts)

/compact checkpoint

### Session 3 - Coverage Harness Generation

SMART CONFIG:

- Role: `R4 QA + R6 Formalizer`
- Effort: max
- Context budget: `45%`

Intent:

- turn the legality graph into executable proof harnesses instead of ad hoc scenario tests

Units:

#### U-MVAR07 - Build exact value, pairwise, and bundle coverage generators

- generate legal-value, legal-pair, and legal-bundle audits over all covered domains

Completed:

- published [MCAT_MS0_EXACT_COVERAGE_GENERATORS_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_EXACT_COVERAGE_GENERATORS_2026-04-02.md) and [MCAT_MS0_EXACT_COVERAGE_GENERATORS_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_EXACT_COVERAGE_GENERATORS_2026-04-02.json)
- added the reusable generator at [mcat-exact-coverage-generators.mjs](H:/PRISM/scripts/mcat-exact-coverage-generators.mjs)
- exact outputs now include:
  - `15` value domains
  - `7` ready pair generators
  - `5` explicitly blocked pair generators
  - `6` bundle generators

#### U-MVAR08 - Build mixed-strength weighted t-wise and numeric oracle generators

- generate legality-aware `t=3/4/5` sweeps on named risk strata
- score numeric outputs against explicit oracles and tolerances

#### U-MVAR09 - Build metamorphic and roundtrip harnesses

- save/load overlay invariants
- live-vs-fallback parity invariants
- feature disabling invariants
- bundle-closure invariants
- negative controls

EXIT GATE:

- proof harnesses are generated from legality, not hand-curated arrays
- named high-risk strata exist in automated form
- invariants are encoded as automated proofs

/compact checkpoint

### Session 4 - Calculator Route and Live-System Proof

SMART CONFIG:

- Role: `R4 QA + R1 Builder`
- Effort: high
- Context budget: `35%`

Intent:

- prove the actual calculator route matches the legality model and source wiring

Units:

#### U-MVAR10 - Data-layer proof

- verify calculators' live data, fallback data, and save-profile data against legality

#### U-MVAR11 - UI contract proof

- verify dropdowns, toggles, cards, and saved defaults only expose legal options
- verify unavailable data degrades honestly

#### U-MVAR12 - Live browser proof and ambiguity capture

- route sweeps for machine families, material groups, holder families, CAM/toolpath families, coolant toggles, and fixture modes
- capture artifacts for failures and ambiguity

EXIT GATE:

- calculator route proves legality at data and UI layers
- unsupported options do not render live
- every live failure produces an artifact and backlog entry

/compact checkpoint

### Session 5 - Consumer Propagation and Protective Gate

SMART CONFIG:

- Role: `R7 Architect + R4 QA`
- Effort: high
- Context budget: `30%`

Intent:

- make coverage visible and reusable beyond the calculator

Units:

#### U-MVAR13 - Consumer parity

- run the same machine-profile truth against Program Release / Print to CNC consumer surfaces

#### U-MVAR14 - Coverage dashboard and ambiguity backlog

- publish machine, holder, tool, path, material, coolant, and fixture coverage metrics
- rank remaining ambiguity by operational risk

#### U-MVAR15 - Protective gate and follow-up execution queue

- define the blocking QA threshold before future machine/package expansion ships
- emit the next dependency-ordered remediation backlog

EXIT GATE:

- coverage metrics are published
- downstream consumers prove shared truth
- future calculator expansions have a coverage gate
- all hard release floors pass

## FORGE-TRIPLE

Protective hook:

- `calculator-coverage-gate`
  - blocks machine-catalog or tooling-surface expansions that reduce `Cov_1`, `Cov_2`, `Wire_cov`, or raise ambiguity penalty beyond threshold

MCP action:

- `prism_dev:calculator_variability_audit`
  - runs legality census, coverage metrics, and unwired-data checks in one session action

Skill / command:

- `/calculator-proof`
  - standardizes how Codex or Claude run the variability audit and interpret results

## Success Condition

This roadmap is complete when:

- every discovered machine/tool/holder/material/workholding/CAM source family is classified as wired, partially wired, fallback-only, backend-only, or unused
- all machine-package legality edges are explicit and testable
- exact value coverage, critical pairwise coverage, and critical bundle-class coverage are complete
- mixed-strength weighted `t-wise` coverage exists for the named high-risk strata
- numeric oracle accuracy and roundtrip invariants are enforced
- calculator route proof and downstream consumer proof share one backend legality model
- the remaining unwired data backlog is ranked, measurable, and safe to execute

## Immediate Starting Point

Start here next:

1. `U-MVAR02` - legality graph and bundle schema
2. `U-MVAR03` - metric and risk contract
3. tool-corpus recovery planning from the `95,608` vs `13,967` live-id gap captured in `U-MVAR01`

Those three units create the mathematical, corpus, and consumer-propagation foundation for every later exhaustive proof pass.
