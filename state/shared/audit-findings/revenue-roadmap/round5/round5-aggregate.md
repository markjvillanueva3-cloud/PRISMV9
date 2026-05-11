# revenue-roadmap round 5 aggregate

**Generated:** 2026-05-11T12:28:13.907Z
**Agents responded:** 10/10  ·  **Missing:** none
**Consensus verdict:** v7.1 architecture is sound — dispatcher routing, lane discipline, and 9-milestone dep-graph are coherent; ship after fixing cross-MS-order edges (MS0 paywall prose-depends on MS1 SUB hoist set without declared depends_on) and normalizing MS2/MS3 narrative deps into the depends_on schema.

## Severity rollup
- BLOCKER: 6
- MAJOR:   50
- MINOR:   28

## Verdict distribution
- v7.1 architecture is sound — dispatcher routing, lane discipline, and 9-milestone dep-graph are coherent; ship after fixing cross-MS-order edges (MS0 paywall prose-depends on MS1 SUB hoist set without declared depends_on) and normalizing MS2/MS3 narrative deps into the depends_on schema.: 1
- UNKNOWN: 8
- PASS-WITH-RESIDUAL-RISK: 1

## Findings by category
- uncategorized: 12
- missing-high-pull: 10
- dep: 4
- infra-disguised-as-revenue: 4
- boundary-condition: 3
- arch: 2
- verified-correct: 2
- ambiguous-pull: 2
- validation: 2
- routing: 1
- constants-mismatch: 1
- formula-incomplete: 1
- dimensional-clarification: 1
- coverage-claim: 1
- scope-correctness: 1
- cross-milestone-grounding-break: 1
- train-pilot-divergence: 1
- controller-order-vs-archive: 1
- build-vision-misalignment: 1
- cam-tier1-scope-drift: 1
- naming-inconsistency: 1
- internal-arithmetic-drift: 1
- missing-tier1-cam-build: 1
- ms-train-gap-not-funded: 1
- ai-hierarchy-absent: 1
- lora-vs-disk-reality: 1
- frontend-merge-doctrine: 1
- anti-regression-burden: 1
- haas-master-post-gap: 1
- wedm-controller-set-drift: 1
- cross-milestone-order-violation: 1
- unresolved-reference: 1
- orphan-leaf: 1
- ambiguous-status: 1
- transitive-redundancy: 1
- no-cycles-detected: 1
- all-references-resolve: 1
- implicit-cross-milestone-dep: 1
- controller-dialect-mismatch: 1
- ordering-mismatch: 1
- arr-unlock-ranking: 1
- credibility-multiplier: 1
- pricing-power-lever: 1
- execution-gate: 1
- infra-vs-revenue-classification: 1
- conversion-model-sensitivity: 1
- drift: 1
- extraction-logic: 1
- ms-bucket-counts: 1
- compliance-checklist: 1
- tier-pie: 1
- title-mismatch: 1

## Blockers (full list)
- **R5A2-001** (agent 2): mc exponents in Row 25 data-surface contradict canonical constants.ts
  - Evidence: ``
  - Fix: 
- **R5A5-005** (agent 5): undefined
  - Evidence: `JM_DIE_CONTROLLER_MAP shows 5 controller dialects on 15 machines: 7x Okuma, 2x Haas, 1x Hurco WinMAX, 1x Roku-Roku Fanuc, 2x Mitsubishi sinker, 1x Mitsubishi wire. Daily reality: a program written for`
  - Fix: 
- **R5A5-006** (agent 5): undefined
  - Evidence: `JM_DIE_CUSTOMERS = 118 customers. JM_DIE_PROGRAM_COUNT = 24,545. The archive top-level shows ITW, ALCOA, ARCONIC, SFS, HOLO-KROME, SIG SAUER, FASTENAL -- repeat customers with repeat parts. Daily ques`
  - Fix: 
- **R5A9-001** (agent 9): v7.A `verifies_via` references 4 non-existent scripts
  - Evidence: `v7.1 lines 290, 962 reference `node scripts/check-engine-wired.mjs` and `node scripts/audit-sfc-cluster.mjs`; lines for U-SUB-21/24 reference `paddle-fixture-replay.mjs` / `vies-sandbox-probe.mjs`. `l`
  - Fix: 
- **R5A9-002** (agent 9): .github/workflows/ci.yml has no v7.A enforcement step
  - Evidence: `ci.yml `build-and-test` job = `npm run build` + `npx vitest run --cache`; `test-coverage` job = `npm run test:coverage`. No grep hit for verify-bridge|check-engine-wired|expectNotStub|audit-test-asser`
  - Fix: 
- **R5A9-003** (agent 9): 4 of 6 stub-trap dispatcher actions have no remediation unit in v7.1
  - Evidence: `round3/10 catalog: mill_physics_* (MillingForceEngine 15L stub, millDispatcher L66), mill_scientific_analyze, mill_scientific_optimize, mill_uncertainty_quantify (MillScientificPipelineEngine 14L stub`
  - Fix: 

## Top 10 majors
- **R5A1-001** (agent 1): MS0 paywall units prose-depend on MS1 SUB hoist set (U-SUB-00/19/22/28) but declare no depends_on against them
- **R5A1-002** (agent 1): MS2 and MS3 use narrative track/batch dependency tables, not per-unit depends_on fields — not uniformly DAG-checkable
- **R5A1-003** (agent 1): MS2 mill physics units risk wiring to the MillingForceEngine stub (millDispatcher 'physics' bucket) instead of MillingPhysicsKernelEngine
- **R5A1-004** (agent 1): Master Post milestone overlaps the documented PostProcessor consolidation opportunity (53 engines → 1 MasterPost + 9 vendor strategies) without a scope-fence vs MS2 lathe-post / hyperMILL-NC dispatchers
- **R5A2-002** (agent 2): Sandvik average chip thickness formula missing arcsin normalization
- **R5A2-004** (agent 2): SLD formula needs sign-convention guard at Re[Phi] = 0
- **R5A3-001** (agent 3): undefined
- **R5A3-002** (agent 3): undefined
- **R5A3-003** (agent 3): undefined
- **R5A3-004** (agent 3): undefined

_Regenerate: `node scripts/audit-round-aggregate.mjs --round 5 --scope revenue-roadmap`_
