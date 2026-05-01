# Engine Integrity Gap Closure Roadmap — Design Specification

**Date**: 2026-03-25
**Track**: EIGC (Engine-Integrity Gap Closure)
**Milestones**: EIGC-MS0A, EIGC-MS0 through EIGC-MS11 (13 milestones)
**Target**: Eliminate success-shaped stubs, silent no-ops, roadmap-state drift, uncovered fallback paths, and proof gaps that would keep the four flagship PRISM pillars from being trustworthy at ship time
**Approach**: Define Contracts -> Truth First -> Fail Closed -> Complete or Downgrade -> Prove End-to-End -> Calibrate -> Gate

---

## Problem Statement

The follow-up engine audit showed a second class of quality gaps beyond the already-logged AlgorithmGateway, feed-profile, thread-standard, lint, and gateway-test findings:

- Some engines advertise support for capabilities that still return stub payloads at runtime.
- Some fallback paths return placeholder G-code or empty physics while preserving success-shaped contracts.
- Some geometry and verification paths silently no-op while returning `success: true`.
- Some roadmap and milestone files claim completion or `not_started` states that do not match the code actually present in `src/engines`.
- Several of these paths have little or no direct test coverage, so regressions can survive normal validation.

This roadmap is intentionally scoped to the **missed gaps** from the deeper audit, not the findings already logged elsewhere.

---

## Product-Pillar Alignment

This add-on roadmap exists to protect the four flagship PRISM capabilities that define the product:

1. **Physics-based Speed and Feed Calculator**
   - depends on truthful machine, tool, holder, fixture, and kinematic capability modeling
   - cannot tolerate fake-success helper outputs or ambiguous support states
2. **Ultimate Post Processor Generator**
   - depends on accurate controller/CAM/export capability contracts
   - cannot sell or promise support breadth that is still bridge-only or roadmap-only
3. **Print to CNC Program**
   - depends on real geometry mutation, real process planning, and zero placeholder G-code in production paths
   - is especially sensitive to silent no-ops and success-shaped fallback programs
4. **ERP / Business / Quoting System**
   - depends on roadmap truth, support truth, and confidence-aware outputs
   - quoting, ROI, and workflow orchestration must know whether a downstream capability is real, partial, or deferred

If the system lacks contract-level truth, these four pillars become hard to trust, hard to price, and hard to package safely.

---

## Design Gaps This Roadmap Must Close

The deeper audit exposed not only implementation gaps, but design gaps:

- There is no single **engine result contract** shared by adapters, orchestrators, planners, and geometry engines.
- There is no system-wide **capability status taxonomy** distinguishing supported, partial, bridge-only, experimental, unsupported, and planned.
- There is no enforced **fail-closed artifact rule** for G-code, geometry, sync, or export outputs.
- There is no mutation truth rule that says a mutating API may only report success if state actually changed.
- There is no clear **truth hierarchy** between code, tests, milestone JSON, tracker logs, and design specs.
- There is no explicit lifecycle for **legacy vs authoritative** engine surfaces.
- There is no required direct-coverage standard for public engine actions in high-impact product paths.

This roadmap must therefore fix both:

- **runtime gaps** in specific engines
- **design-contract gaps** that allow those runtime problems to recur

---

## Required Design Standards

These standards are prerequisites for implementation and must be referenced during EIGC execution.

### 1. Capability Status Taxonomy

Every public engine capability in scope must be labeled as one of:

- `supported` — production-ready, tested, non-placeholder output
- `partial` — real output exists, but not all advertised sub-capabilities are complete
- `bridge_only` — adapter/transform exists, but no native target-specific completion exists
- `experimental` — available for internal or guarded use only
- `unsupported` — explicitly unavailable at runtime
- `planned` — roadmap-only, not implemented

### 2. Result Contract Rule

Every public result in scope should eventually converge on a contract that includes, at minimum:

- `status`
- `reason` or machine-readable explanation
- artifact payload only when real
- degraded/partial metadata when not fully complete

No path may hide degraded state only in comments or warning strings.

### 3. Artifact Integrity Rule

The following may never be emitted as normal success output:

- placeholder G-code
- empty physics standing in for real physics
- unchanged geometry after a claimed mutating operation
- bridge-row data presented as native export completion

### 4. Mutation Truth Rule

If an API claims to modify geometry, plans, corrections, or execution ordering:

- `success: true` requires real mutation or real correction
- otherwise it must return degraded/unsupported/failed status explicitly

### 5. Truth Hierarchy

When documents disagree, use this order of authority:

1. runtime code in `src/`
2. targeted tests proving behavior
3. milestone envelope JSON in `data/milestones/`
4. roadmap tracker / roadmap index metadata
5. design specs and plans
6. archived or superseded documents

### 6. Legacy Surface Rule

If two engine surfaces overlap:

- exactly one must be marked authoritative for new work
- the other must be marked legacy, partial, or deprecated
- roadmap claims must not count legacy overlap as completed breadth

---

## Audit Scope Covered By This Roadmap

Primary engines and docs in scope:

- `src/engines/ToolSyncOrchestratorEngine.ts`
- `src/engines/BatchCAMToolBridgeEngines.ts`
- `src/engines/MultiProcessCAMBridgeEngine.ts`
- `src/engines/SolidEditingEngine.ts`
- `src/engines/SecondaryOpsPipelineEngine.ts`
- `src/engines/ExecutionVerificationEngine.ts`
- `src/engines/ToolpathSimulationEngine.ts`
- `data/milestones/CAMX-MS10.json`
- `data/milestones/L0-P2-MS1.json`
- `data/milestones/L1-P2-MS1.json`
- `data/milestones/SYS-MS4.json`

Companion tracks this roadmap should align with, not replace:

- `docs/superpowers/specs/2026-03-15-quality-synergy-roadmap-design.md`
- `docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md`

---

## Mandatory Document Lookup Order

Read documents in this exact order before building anything for this roadmap.

### 1. Global inventory first

Read:

- `data/docs/MASTER_INDEX.md`

Why:

- This is the repo-wide asset catalog.
- Its own header says to read it before building anything new to prevent duplicates.
- Use it to confirm whether an engine, test, util, or doc already exists before adding new assets.

### 2. Fast path / counts second

Read:

- `data/docs/MASTER_INDEX_COMPACT.md`

Why:

- This is the shortest high-signal snapshot of current totals, core paths, and major digests.
- Use it to orient quickly before opening larger indexes.

### 3. Exact filesystem map third

Read:

- `data/docs/PATH_INDEX.md`

Why:

- This gives the canonical paths for engine, dispatcher, algorithm, registry, test, and roadmap roots.
- Use it when deciding where a fix, test, or milestone artifact should live.

### 4. Code shortcode index fourth

Read:

- `data/docs/CODE_SYSTEM_INDEX.md`
- `data/docs/CODE_SYSTEM_INDEX.json`

Why:

- Use these when you need to resolve shortcodes, inspect counts by category, or verify whether a file is already indexed.
- Prefer the Markdown file for quick reading and the JSON file for exact lookup work.

### 5. Canonical roadmap registry fifth

Read:

- `data/roadmap-index.json`

Why:

- This is the canonical milestone registry and dependency map for the app roadmap.
- Use it to confirm whether a new milestone family must later be added to the official roadmap index.

### 6. Roadmap navigation aids sixth

Read:

- `data/docs/roadmap/ROADMAP_SECTION_INDEX.md`
- `data/docs/roadmap/ROADMAP_TRACKER.md`
- `data/docs/roadmap/ROADMAP_INSTRUCTIONS.md`
- `data/docs/roadmap/SCRIPT_INDEX.json`

Why:

- `ROADMAP_SECTION_INDEX.md` tells you where phase sections live without loading full phase docs.
- `ROADMAP_TRACKER.md` tells you what the system already claims is complete or in progress.
- `ROADMAP_INSTRUCTIONS.md` captures the intended operating model, but it contains some stale references and should be treated as guidance, not ground truth.
- `SCRIPT_INDEX.json` tells you what roadmap-maintenance scripts exist and when to use them.

### 7. Existing roadmap companions seventh

Read:

- `docs/superpowers/specs/2026-03-15-quality-synergy-roadmap-design.md`
- `docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md`
- `data/milestones/PRISM-PRODUCT-roadmap.json`
- `docs/superpowers/plans/2026-03-15-v7-wave1-calculate-and-quote.md`
- `data/milestones/CPL-ROADMAP.json`

Why:

- Use these to avoid duplicating hardening work already planned elsewhere.
- This roadmap should only absorb the gaps that those tracks do not explicitly close.
- These files also anchor the four flagship product pillars:
  - speed/feed calculator
  - post processor platform
  - print-to-program
  - quoting / business value packaging

### 8. Milestone truth documents eighth

Read:

- `data/milestones/CAMX-MS10.json`
- `data/milestones/L0-P2-MS1.json`
- `data/milestones/L1-P2-MS1.json`
- `data/milestones/SYS-MS4.json`

Why:

- These are the roadmap artifacts whose status currently drifts from runtime truth.
- They are the source documents to reconcile during EIGC-MS4.

### 9. Live source files last

Only after the indexes and milestone docs are loaded, open the actual engine files in scope:

- `src/engines/ToolSyncOrchestratorEngine.ts`
- `src/engines/BatchCAMToolBridgeEngines.ts`
- `src/engines/MultiProcessCAMBridgeEngine.ts`
- `src/engines/SolidEditingEngine.ts`
- `src/engines/SecondaryOpsPipelineEngine.ts`
- `src/engines/ExecutionVerificationEngine.ts`
- `src/engines/ToolpathSimulationEngine.ts`

---

## Important Ground-Truth Notes

- `data/docs/CURRENT_POSITION.md` is referenced by older roadmap operating docs, but it is **not currently present** in this repo snapshot.
- Because of that, do **not** treat `position-validator.js` as a required first step for this roadmap until a live current-position file is restored.
- For this roadmap, use `data/docs/roadmap/ROADMAP_TRACKER.md` plus the milestone envelopes and the new EIGC state artifacts as the actual source of execution truth.
- `npm run lint` is **not currently a valid hard gate** in this repo snapshot because ESLint 10 flat config is missing. Until that is repaired, use `npx tsc`, targeted Vitest, roadmap lint/regression scripts, and the integrity audit as the actual validation stack for EIGC work.

---

## Mandatory Milestone Execution Loop

Every EIGC milestone must follow this exact loop. This is the quality-control spine for the roadmap.

1. Open the prior milestone artifacts and the dependencies listed in this spec.
2. Create or refresh the working set for the current milestone:
   - `state/EIGC-MS*/position.md`
   - `state/EIGC-MS*/artifact-manifest.json`
   - `state/EIGC-MS*/scrutiny/`
3. Write the bounded slice about to be touched:
   - target files
   - target behavior
   - contract rules being enforced
   - rollback path
4. Implement only that bounded slice before touching any unrelated area.
5. Flush all non-regenerable findings, matrices, benchmark results, and state notes to disk.
6. Run a scrutiny pass immediately after that slice lands.
7. If scrutiny finds a new P0 or P1 truth violation, stop forward work and resolve it before continuing.
8. After pass 3, compare the delta from the prior pass:
   - if `delta < 2` and no new P0/P1 issues remain, declare convergence
   - otherwise continue up to pass 7
9. Only after convergence:
   - run targeted validation
   - update milestone state artifacts
   - update roadmap or milestone truth where appropriate
10. Only after the milestone exit criteria pass, close the milestone and advance.

Do not:

- batch unrelated engine families into one unchecked edit block
- update roadmap truth before code truth and tests exist
- carry unresolved scrutiny findings across milestone boundaries

---

## Scrutiny Loop Protocol

Use an adaptive scrutiny loop for every `MEDIUM` and `HIGH` effort EIGC milestone.

- `mode`: adaptive
- `min_passes`: 3
- `max_passes`: 7
- `convergence_rule`: `delta < 2` between consecutive passes
- `escalation_rule`: if pass 4 or later still finds a new P0/P1 issue, stop and flag for human review before claiming milestone completion
- `improvement_threshold`: `0.92`
- `required_outputs`:
  - `state/EIGC-MS*/scrutiny/pass-01.md` through `pass-0N.md`
  - `state/EIGC-MS*/scrutiny/summary.json`

Mandatory scrutiny focus categories:

- fake-success artifacts
- silent mutation no-ops
- unsupported branch leakage
- missing exit conditions or weak gates
- orphaned deliverables or unwired helpers
- support-matrix drift
- roadmap/code contradiction
- cross-pillar workflow gaps
- provenance/confidence omissions

Minimum pass order:

1. Contract scrutiny:
   - check capability taxonomy, mutation truth, fail-closed behavior, and legacy-surface labels
2. Artifact scrutiny:
   - inspect emitted G-code, geometry, sync/export payloads, simulation outputs, and physics outputs
3. Gate scrutiny:
   - inspect tests, audit scripts, milestone exit criteria, and artifact wiring
4. Product scrutiny:
   - sample at least one path per impacted flagship pillar
5. Drift scrutiny:
   - if roadmap, milestone, or tracker docs changed, compare code/test truth back against those docs

---

## Compaction and Session Control

Treat compaction as part of the quality system, not as a convenience step.

### Risk Classification

- `LOW`: fewer than 15 file touches or only one deliverable family
- `MEDIUM`: 15-30 file touches or 2-3 deliverable families
- `HIGH`: more than 30 file touches, multi-engine edits, or mixed code plus roadmap plus validation changes

### Mandatory Compaction Points

1. After the baseline manifest or schema inventory is created.
2. After each engine cluster or product-pillar slice is completed.
3. After any capability-taxonomy, provenance, or support-matrix decision changes.
4. Before any roadmap-status or milestone-JSON update.
5. Before final gate validation and milestone close.

At every `MEDIUM` or `HIGH` compaction point, flush:

- `state/EIGC-MS*/position.md`
- `state/EIGC-MS*/artifact-manifest.json`
- milestone-specific deliverables created so far
- current scrutiny findings and convergence status

Each `position.md` entry should capture:

- current milestone and step
- active slice or batch number
- cumulative scrutiny pass count
- open P0/P1/P2 issue counts
- last completed validation command
- next required compaction point

Because `CURRENT_POSITION.md` is absent in this repo snapshot, use `state/EIGC-MS*/position.md` plus `data/docs/roadmap/ROADMAP_TRACKER.md` as the cross-session recovery pair.

---

## Strict Step-by-Step Build Procedure

Follow these steps in order. Do not skip ahead.

### Phase 0: Boot and verify context

1. Read `data/docs/MASTER_INDEX.md`.
2. Read `data/docs/MASTER_INDEX_COMPACT.md`.
3. Read `data/docs/PATH_INDEX.md`.
4. Read `data/docs/CODE_SYSTEM_INDEX.md`.
5. Read `data/roadmap-index.json`.
6. Read `data/docs/roadmap/ROADMAP_SECTION_INDEX.md`.
7. Read `data/docs/roadmap/ROADMAP_TRACKER.md`.
8. Read `data/docs/roadmap/SCRIPT_INDEX.json`.
9. Read this roadmap file.
10. Read the two companion design specs:
   - `docs/superpowers/specs/2026-03-15-quality-synergy-roadmap-design.md`
   - `docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md`
11. Read the product-facing companions:
   - `data/milestones/PRISM-PRODUCT-roadmap.json`
   - `docs/superpowers/plans/2026-03-15-v7-wave1-calculate-and-quote.md`
   - `data/milestones/CPL-ROADMAP.json`

Exit condition:

- Builder understands which gaps are already covered elsewhere and which are unique to EIGC.

### Phase 0A: Freeze design contracts before auditing code

1. Write down the capability taxonomy from this roadmap:
   - `supported`
   - `partial`
   - `bridge_only`
   - `experimental`
   - `unsupported`
   - `planned`
2. Write down the truth hierarchy from this roadmap.
3. Write down the fail-closed artifact rule.
4. Write down the mutation truth rule.
5. Treat these rules as the acceptance bar for all later milestone work.

Exit condition:

- No scoped engine or roadmap file will be judged ad hoc; all later work uses the same design-contract standard.

### Phase 1: Establish baseline truth before changing code

1. Open the four drifting milestone files:
   - `data/milestones/CAMX-MS10.json`
   - `data/milestones/L0-P2-MS1.json`
   - `data/milestones/L1-P2-MS1.json`
   - `data/milestones/SYS-MS4.json`
2. Open the seven scoped engine files listed above.
3. Record all incomplete or misleading runtime paths into:
   - `state/EIGC-MS0/engine-capability-manifest.json`
   - `state/EIGC-MS0/missed-gap-findings.md`
4. For each path, classify it as `real`, `partial`, `stub`, `noop`, or `roadmap_drift`.
5. For each path, record whether direct tests already exist.

Exit condition:

- No coding begins until the manifest exists and every scoped engine action is classified.

### Phase 2: Fix runtime honesty before adding new support

1. Patch `ToolSyncOrchestratorEngine.ts` so unsupported sync targets return explicit unsupported/deferred metadata, not disguised support.
2. Patch `BatchCAMToolBridgeEngines.ts` so bridge fallbacks are clearly bridge transforms, not native export completion.
3. Patch `MultiProcessCAMBridgeEngine.ts` so delegate failure cannot yield placeholder G-code as if it were a real process plan.
4. Patch `SecondaryOpsPipelineEngine.ts` so unsupported ops are surfaced structurally before G-code output.
5. Patch `ExecutionVerificationEngine.ts` so unsupported correction types do not imply correction success.

Exit condition:

- All incomplete runtime paths fail closed or degrade explicitly.

### Phase 3: Fix silent no-ops and helper correctness

1. Patch `SolidEditingEngine.ts`:
   - either implement true boolean operations for `cut` and `intersect`
   - or return unsupported / failed status instead of `success: true`
2. Patch `ToolpathSimulationEngine.ts`:
   - either wire feed profiling to a real extension
   - or remove the misleading placeholder extension hook
3. If any helper still returns unchanged state while claiming mutation, fix it now.

Exit condition:

- No scoped mutating API silently no-ops while claiming success.

### Phase 4: Decide feature promotion vs downgrade

1. For hyperMILL export/sync:
   - either implement the minimum viable native path
   - or remove it from supported claims
2. For each partial engine, decide:
   - promote to real support
   - downgrade to explicit unsupported
   - keep as partial but mark as partial in contract and docs
3. Reflect that decision in code comments, statuses, and test assertions.

Exit condition:

- There is no ambiguity between “supported”, “partially supported”, and “planned only”.

### Phase 5: Reconcile roadmap truth after code truth

1. Re-open:
   - `data/milestones/CAMX-MS10.json`
   - `data/milestones/L0-P2-MS1.json`
   - `data/milestones/L1-P2-MS1.json`
   - `data/milestones/SYS-MS4.json`
2. Compare each claimed status to the repaired codebase.
3. Update milestone states and wording so they reflect:
   - complete
   - partial
   - implemented but not hardened
   - planned only
4. Save drift evidence into:
   - `state/EIGC-MS4/roadmap-code-drift.json`
   - `state/EIGC-MS4/status-reconciliation-notes.md`

Exit condition:

- No scoped milestone file overstates or understates actual implementation state.

### Phase 6: Add direct integrity coverage

1. Add direct tests for all scoped engines.
2. Add assertions that degraded paths must expose degraded status.
3. Add assertions that unsupported paths do not return fake artifacts.
4. Add assertions that no-op geometry operations cannot report success.
5. Add or update an audit script to catch:
   - placeholder G-code in production paths
   - `success: true` on no-op mutation branches
   - `status: "stub"` on claimed supported systems
   - roadmap-state contradictions for the scoped milestones

Exit condition:

- Every repaired gap has a regression test or audit check.

### Phase 7: Validate and cleanly close the pass

Run these in order:

1. `cd C:\PRISM\mcp-server && npx tsc`
2. `cd C:\PRISM\mcp-server && npx vitest run <targeted test files>`
3. Run the engine-integrity audit script added by this roadmap.
4. `powershell -File C:\PRISM\mcp-server\scripts\roadmap\roadmap-lint.ps1` if roadmap docs or milestone files changed.
5. `powershell -File C:\PRISM\mcp-server\scripts\roadmap\roadmap-regression-test.ps1` after major roadmap edits.
6. `powershell -File C:\PRISM\mcp-server\scripts\roadmap\rebuild-section-index.ps1` if any file under `data/docs/roadmap\` changed line structure.

Only after all of the above:

7. Update tracker or milestone status notes.

Exit condition:

- Code, tests, and roadmap metadata all agree.

### Phase 8: Build the canonical manufacturing domain model

1. Inventory the shared product entities that must agree across the four flagship pillars:
   - machine
   - controller
   - kinematics
   - spindle limits
   - holder
   - tool body / insert / solid tool
   - material
   - fixture / setup
   - CAM software / post target
2. Identify conflicting schemas, enums, field names, and capability labels across engines, tests, and roadmap artifacts.
3. Define a canonical representation plus an explicit alias or translation map where legacy names must survive temporarily.
4. Persist artifacts into:
   - `state/EIGC-MS6/canonical-domain-model.md`
   - `state/EIGC-MS6/domain-compatibility-map.json`
5. Run scrutiny loop with focus on schema drift, naming drift, and private one-off models that would fracture cross-pillar behavior.

Exit condition:

- The four flagship pillars can reference the same manufacturing entities without hidden schema drift.

### Phase 9: Add provenance and confidence contracts

1. Define the minimum provenance fields required for high-value outputs:
   - source basis
   - key assumptions
   - completeness
   - confidence
   - degraded reason when applicable
2. Identify the result surfaces that must expose provenance first:
   - speed/feed outputs
   - post-generation outputs
   - print-to-program planning outputs
   - quote / ERP handoff outputs
3. Define confidence downgrade rules for:
   - partial support
   - bridge-only support
   - uncalibrated physics
   - missing machine or tooling details
4. Persist artifacts into:
   - `state/EIGC-MS7/provenance-contract.md`
   - `state/EIGC-MS7/confidence-rules.json`
5. Run scrutiny loop with focus on unsupported inference, unjustified high confidence, and hidden assumptions.

Exit condition:

- High-value outputs can explain what they know, what they inferred, and how trustworthy the result is.

### Phase 10: Govern support truth with one capability matrix

1. Build one machine-readable support matrix that maps runtime capability claims to:
   - `supported`
   - `partial`
   - `bridge_only`
   - `experimental`
   - `unsupported`
   - `planned`
2. Populate the matrix for:
   - machine/controller families
   - CAM systems
   - export/sync targets
   - physics and simulation features
   - quoting / workflow handoff capabilities
3. Define the promotion and downgrade rules required to move a capability between support states.
4. Require roadmap docs, milestone envelopes, tests, and product-facing claims to consume this same matrix.
5. Persist artifacts into:
   - `state/EIGC-MS8/support-matrix-governance.md`
   - `state/EIGC-MS8/product-capability-matrix.json`
6. Run scrutiny loop with focus on overclaimed support, stale matrix rows, and doc/UI/API drift.

Exit condition:

- No scoped capability can be sold, documented, or roadmap-marked outside the same support-truth matrix.

### Phase 11: Prove the four flagship pillars end to end

1. Select at least one golden-path scenario for each flagship pillar:
   - physics-based speed/feed calculator
   - ultimate post processor generator
   - print to CNC program
   - ERP / business / quoting
2. Select at least one cross-pillar scenario that chains multiple pillars together:
   - quote -> calculate -> plan -> post -> ERP handoff
3. Define starting inputs, expected outputs, degraded behaviors, and hard failure conditions for each scenario.
4. Add automated acceptance coverage and a manual sample-review protocol for output quality.
5. Persist artifacts into:
   - `state/EIGC-MS9/golden-path-scenarios.json`
   - `state/EIGC-MS9/acceptance-results.md`
6. Run scrutiny loop with focus on broken handoffs, success-shaped degraded flows, and missing coverage.

Exit condition:

- Each flagship pillar and at least one cross-pillar chain have evidence-backed acceptance coverage.

### Phase 12: Calibrate against field reality

1. Assemble a benchmark corpus using trusted references, internal fixtures, or field measurements where available.
2. Compare predicted vs observed behavior for the highest-risk outputs:
   - speed/feed recommendations
   - cycle-time estimates
   - spindle or load assumptions
   - tooling or machine compatibility assumptions
   - quote-driving time/cost assumptions
3. Define tolerance bands and escalation rules when outputs exceed acceptable deviation.
4. Downgrade confidence or support where calibration evidence is weak or missing.
5. Persist artifacts into:
   - `state/EIGC-MS10/calibration-corpus.md`
   - `state/EIGC-MS10/calibration-results.json`
6. Run scrutiny loop with focus on overfit examples, untracked assumptions, and unproven high-confidence outputs.

Exit condition:

- High-risk outputs are backed by calibration evidence or are explicitly downgraded.

### Phase 13: Orchestrate the product and lock production gates

1. Map the end-to-end flagship workflows:
   - quote -> calculate -> program -> post -> ERP feedback
   - print -> interpret -> plan -> generate -> verify
2. Define the handoff contracts and required artifacts between pillars.
3. Define the production release gates per flagship feature, including the honest gate stack while lint remains broken.
4. Specify how lint returns to the hard-gate path once ESLint flat-config recovery lands.
5. Persist artifacts into:
   - `state/EIGC-MS11/workflow-orchestration-map.md`
   - `state/EIGC-MS11/release-gate-matrix.md`
   - `state/EIGC-MS11/production-governance-checklist.md`
6. Run a final scrutiny loop across all four pillars plus the cross-pillar chain.

Exit condition:

- PRISM behaves as one coherent manufacturing product and the production gates are truthful at the product level.

---

## Script Usage For This Roadmap

Use the roadmap-maintenance scripts already indexed in `data/docs/roadmap/SCRIPT_INDEX.json`.

### Required when roadmap docs change

- `scripts/roadmap/roadmap-lint.ps1`
- `scripts/roadmap/roadmap-regression-test.ps1`

### Required when anchor/line positions in roadmap phase docs change

- `scripts/roadmap/rebuild-section-index.ps1`

### Use with caution

- `scripts/roadmap/position-validator.js`

Reason:

- It is meant to validate `CURRENT_POSITION.md` against `ROADMAP_TRACKER.md`.
- Since the live `CURRENT_POSITION.md` file is absent in this repo snapshot, do not make this script a hard gate for EIGC until that source file is restored.

---

## File Creation Rules

When implementing this roadmap:

- Put state artifacts under `state/EIGC-MS*/`
- Put milestone position files under `state/EIGC-MS*/position.md`
- Put milestone artifact manifests under `state/EIGC-MS*/artifact-manifest.json`
- Put scrutiny outputs under `state/EIGC-MS*/scrutiny/`
- Put new tests under `src/__tests__/`
- Put new utilities under `src/utils/`
- Put new audit scripts under `scripts/audit/` or `scripts/roadmap/` depending on scope
- Do not create duplicate roadmap indexes; reuse the existing files under `data/docs/` and `data/docs/roadmap/`
- Do not overwrite existing roadmap design specs; extend the canonical milestone and tracker artifacts only after code truth is established

---

## Dependency Chain

```text
EIGC-MS0A (Design Contract Hardening)
  -> EIGC-MS0 (Capability Truth Audit)
    -> EIGC-MS1 (Honest Runtime Contracts)
      -> EIGC-MS2 (CAM Export/Sync Closure)
        -> EIGC-MS3 (Geometry + Execution Correctness)
          -> EIGC-MS4 (Roadmap Truth Reconciliation)
            -> EIGC-MS5 (Integrity Gates + Coverage)
              -> EIGC-MS6 (Canonical Domain Model)
                -> EIGC-MS7 (Provenance + Confidence Contracts)
                  -> EIGC-MS8 (Support Matrix Governance)
                    -> EIGC-MS9 (Golden-Path End-to-End Acceptance)
                      -> EIGC-MS10 (Field Calibration + Reality Check)
                        -> EIGC-MS11 (Workflow Orchestration + Production Governance)
```

---

## Compaction Risk Map

- `EIGC-MS0A`: `MEDIUM` — flush after each standards artifact and before acceptance.
- `EIGC-MS0`: `HIGH` — flush after each engine-family audit batch.
- `EIGC-MS1`: `HIGH` — flush after each engine contract rewrite and before shared helper rollout.
- `EIGC-MS2`: `HIGH` — flush after each CAM target decision and before milestone truth edits.
- `EIGC-MS3`: `MEDIUM` — flush after each mutating-path repair and before regression additions.
- `EIGC-MS4`: `MEDIUM` — flush after each milestone-file reconciliation cluster.
- `EIGC-MS5`: `MEDIUM` — flush after each new test or audit harness family lands.
- `EIGC-MS6`: `HIGH` — flush after each domain-entity family is normalized.
- `EIGC-MS7`: `MEDIUM` — flush after each provenance contract group is defined.
- `EIGC-MS8`: `MEDIUM` — flush after each support-matrix population block.
- `EIGC-MS9`: `HIGH` — flush after each flagship scenario pack is defined or verified.
- `EIGC-MS10`: `HIGH` — flush after each benchmark batch and before tolerance changes.
- `EIGC-MS11`: `MEDIUM` — flush after each workflow or release-gate family is reconciled.

---

## Feature Traceability Matrix

| Product Pillar | Critical EIGC Coverage |
|---|---|
| Physics-based Speed/Feed Calculator | EIGC-MS0A contract rules, EIGC-MS3 helper correctness, EIGC-MS5 integrity coverage, EIGC-MS6 canonical domain model, EIGC-MS7 provenance/confidence, EIGC-MS9 golden-path acceptance, EIGC-MS10 calibration |
| Ultimate Post Processor Generator | EIGC-MS0A capability taxonomy, EIGC-MS1 honest runtime contracts, EIGC-MS2 CAM export/sync closure, EIGC-MS4 roadmap truth, EIGC-MS6 canonical domain model, EIGC-MS8 support-matrix governance, EIGC-MS9 golden-path acceptance, EIGC-MS11 production governance |
| Print to CNC Program | EIGC-MS1 placeholder-program elimination, EIGC-MS3 geometry/execution correctness, EIGC-MS5 direct regression coverage, EIGC-MS6 canonical domain model, EIGC-MS7 provenance/confidence, EIGC-MS9 golden-path acceptance, EIGC-MS11 workflow orchestration |
| ERP / Business / Quoting | EIGC-MS0A truth hierarchy, EIGC-MS2 support-truth for sellable features, EIGC-MS4 roadmap/state reconciliation, EIGC-MS7 confidence contracts, EIGC-MS8 support-matrix governance, EIGC-MS9 cross-pillar acceptance, EIGC-MS10 calibrated assumptions, EIGC-MS11 workflow orchestration |

---

## EIGC-MS0A: Design Contract Hardening

**Goal**: Define the design contracts that all later milestones use to judge runtime behavior, roadmap truth, and product-facing capability claims.

**New deliverables**:

- `state/EIGC-MS0A/design-contract-standard.md`
- `state/EIGC-MS0A/capability-taxonomy.json`
- `state/EIGC-MS0A/truth-hierarchy.md`

**Tasks**:

- Convert the taxonomy in this roadmap into a machine-checkable reference artifact.
- Define the canonical status meanings for `supported`, `partial`, `bridge_only`, `experimental`, `unsupported`, and `planned`.
- Define what fields a degraded result must expose.
- Define what counts as a fake-success artifact.
- Define the source-of-truth ordering between code, tests, milestone JSON, tracker metadata, design specs, and archives.
- Define how legacy/overlapping engine surfaces are labeled.

**Acceptance**:

- Later milestones can classify capabilities without ambiguity.
- Runtime gaps and roadmap gaps can be measured against the same contract.
- Product-facing support claims for calculator, post, print-to-program, and ERP/quote flows now rest on explicit definitions.

---

## EIGC-MS0: Capability Truth Audit

**Goal**: Build a source-of-truth inventory for all public engine actions in scope, classifying each as `real`, `partial`, `stub`, `noop`, or `roadmap_drift`.

**New deliverables**:

- `state/EIGC-MS0/engine-capability-manifest.json`
- `state/EIGC-MS0/missed-gap-findings.md`

**Tasks**:

- Enumerate all public entry points for the seven in-scope engines.
- Record whether each path returns:
  - production output
  - degraded but honest output
  - stub output
  - silent no-op output
  - roadmap or milestone metadata inconsistent with the code
- Tag each issue with severity:
  - P0: silent success with false result
  - P1: advertised support with stub payload
  - P2: incomplete helper or extension path
- Cross-link each gap to tests that exist today, if any.
- Cross-link each gap to one or more flagship product pillars:
  - calculator
  - ultimate post
  - print-to-program
  - ERP/quoting

**Acceptance**:

- Every scoped engine action is classified.
- No in-scope stub or no-op remains undocumented.
- The manifest distinguishes runtime truth from roadmap truth.
- The manifest makes it clear which product pillars are put at risk by each gap.

---

## EIGC-MS1: Honest Runtime Contracts

**Goal**: Remove success-shaped deception from partial engines. Any incomplete path must either produce real output or fail/downgrade explicitly.

**Core rule**:

- No engine may return placeholder G-code, empty physics, unchanged geometry, or deferred-sync behavior while still presenting the result as normal success.

**Tasks**:

- Create a shared degraded-result contract helper in `src/utils/` for partial engine outputs.
- Update `ToolSyncOrchestratorEngine` so unsupported systems report a first-class unsupported or deferred status with machine-readable metadata.
- Update `BatchCAMToolBridgeEngines` fallbacks so bridge exports are clearly marked as bridge-only row transforms, not native export completion.
- Update `MultiProcessCAMBridgeEngine` so delegate failure returns explicit degraded status or structured error instead of placeholder programs.
- Update `SecondaryOpsPipelineEngine` unsupported operation handling so callers can branch on unsupported capability instead of consuming fake G-code.
- Update `ExecutionVerificationEngine` so unsupported correction modes do not imply a correction was actually applied.

**Acceptance**:

- Zero placeholder-program fallbacks remain in scoped engines.
- Zero unsupported operations return success-shaped production artifacts.
- All degraded paths expose explicit status and reason fields.

---

## EIGC-MS2: CAM Export/Sync Closure

**Goal**: Close the gap between advertised CAM support and actual runtime support, especially around hyperMILL and bridge/export orchestration.

**Primary focus**:

- `ToolSyncOrchestratorEngine`
- `BatchCAMToolBridgeEngines`
- `CAMX-MS10`

**Tasks**:

- Decide one of two honest paths for hyperMILL:
  - implement `HyperMillToolExportEngine` to the level required by sync/export callers, or
  - remove `hypermill` from supported-sync claims until native export exists
- Tighten Mastercam and hyperMILL bridge fallbacks so they cannot be mistaken for native-format completion.
- Add capability probes so orchestration can distinguish:
  - native exporter available
  - bridge transform only
  - unsupported
- Reconcile `data/milestones/CAMX-MS10.json` with actual code state:
  - not started
  - partially implemented
  - completed
  must reflect reality per unit, not aspiration.

**Acceptance**:

- Sync status for each CAM target matches real runtime support.
- hyperMILL is either implemented enough for real sync/export or explicitly downgraded.
- `CAMX-MS10.json` no longer contradicts the codebase.

---

## EIGC-MS3: Geometry + Execution Correctness

**Goal**: Eliminate silent no-op behavior in geometry and execution helpers.

**Primary focus**:

- `SolidEditingEngine`
- `ExecutionVerificationEngine`
- `SecondaryOpsPipelineEngine`
- `ToolpathSimulationEngine`

**Tasks**:

- For `SolidEditingEngine`:
  - implement real `cut` and `intersect`, or
  - return `success: false` / unsupported with no false geometry claim
- For `ExecutionVerificationEngine`:
  - implement sequence reordering correction, or
  - downgrade that correction type to explicit unsupported
- For `SecondaryOpsPipelineEngine`:
  - define the supported operation matrix
  - surface unsupported ops before G-code assembly
- For `ToolpathSimulationEngine`:
  - either wire feed profiling into a real extension path, or
  - remove the placeholder hook and make the absence explicit

**Acceptance**:

- No silent geometry no-ops remain in scoped paths.
- No verification correction claims survive without actual corrective behavior.
- Secondary-op support is explicit and testable.

---

## EIGC-MS4: Roadmap Truth Reconciliation

**Goal**: Make milestone and roadmap state truthful with respect to the codebase.

**Primary focus**:

- `data/milestones/L0-P2-MS1.json`
- `data/milestones/L1-P2-MS1.json`
- `data/milestones/SYS-MS4.json`
- `data/milestones/CAMX-MS10.json`

**Known drift to reconcile**:

- `L0-P2-MS1` claims AlgorithmGateway expansion to full registry.
- `L1-P2-MS1` claims all algorithms wired into AlgorithmGateway and routing.
- `SYS-MS4` marks engine wiring cleanup complete while `AlgorithmGatewayEngine` is still exported and still broken.
- `CAMX-MS10` marks export/sync work `not_started` even though partial engines already exist.

**Tasks**:

- Re-audit each milestone against present code, tests, and exports.
- Split milestone status into one of:
  - complete
  - partial
  - implemented but not hardened
  - planned only
- Add evidence-backed notes or completion criteria where the current status is too coarse.
- Update any roadmap prose that overstates engine legitimacy or support breadth.

**New deliverables**:

- `state/EIGC-MS4/roadmap-code-drift.json`
- `state/EIGC-MS4/status-reconciliation-notes.md`

**Acceptance**:

- No scoped roadmap file claims completion for behavior the code does not provide.
- No scoped roadmap file claims `not_started` where partial implementation already exists.

---

## EIGC-MS5: Integrity Gates + Coverage

**Goal**: Prevent reintroduction of stubbed success paths and roadmap-state drift.

**Tasks**:

- Add direct test suites for:
  - `ToolSyncOrchestratorEngine`
  - `BatchCAMToolBridgeEngines`
  - `MultiProcessCAMBridgeEngine`
  - `SolidEditingEngine`
  - `SecondaryOpsPipelineEngine`
  - `ExecutionVerificationEngine`
- Add assertions that degraded paths must expose degraded status, not normal success.
- Add a repository audit script that scans for risky patterns in engine outputs:
  - `"not yet implemented"` inside generated artifacts
  - `success: true` on placeholder/no-op branches
  - `status: "stub"` on claimed supported systems
  - empty `physics` / placeholder `gcode` fallbacks in production paths
- Wire that audit into the normal validation flow immediately.
- Once ESLint flat-config recovery lands, add `npm run lint` back into the hard-gate sequence.
- Until then, explicitly document that TypeScript + targeted Vitest + roadmap lint + integrity audit are the enforced stack.

**Suggested deliverables**:

- `src/__tests__/engine-integrity-bridges.test.ts`
- `src/__tests__/engine-integrity-geometry.test.ts`
- `scripts/audit/engine-integrity-check.ps1`

**Acceptance**:

- All scoped engines have direct regression coverage.
- The integrity audit fails on fake-success patterns.
- Future roadmap claims can be checked against runtime capability evidence.
- The validation chain is truthful about what is and is not currently gated.

---

## EIGC-MS6: Canonical Domain Model

**Goal**: Unify the manufacturing entities and compatibility vocabulary shared by calculator, post, print-to-program, and ERP/quote flows.

**New deliverables**:

- `state/EIGC-MS6/canonical-domain-model.md`
- `state/EIGC-MS6/domain-compatibility-map.json`

**Tasks**:

- Inventory the domain objects that cross product pillars:
  - machine
  - controller
  - kinematics
  - spindle envelope
  - holder
  - tool body / insert / solid tool
  - material
  - fixture / setup
  - CAM / post target
- Identify conflicting field names, enums, units, or assumptions across scoped engines and companion roadmaps.
- Define the authoritative representation for each entity plus an alias map for temporary compatibility.
- Mark which engines own canonical truth and which only consume or translate it.
- Run scrutiny loop focused on schema drift, unit drift, and private one-off entity models.

**Acceptance**:

- The four flagship pillars can reason about the same manufacturing entities without hidden translation drift.
- Legacy aliases are explicit, temporary, and testable.

---

## EIGC-MS7: Provenance + Confidence Contracts

**Goal**: Ensure high-value outputs explain their source basis, assumptions, completeness, and confidence so the system can be trusted in business and shop-floor contexts.

**New deliverables**:

- `state/EIGC-MS7/provenance-contract.md`
- `state/EIGC-MS7/confidence-rules.json`

**Tasks**:

- Define the minimum provenance fields for high-value outputs:
  - source basis
  - critical assumptions
  - completeness
  - confidence
  - degraded reason
- Apply those rules first to:
  - speed/feed outputs
  - post-generation outputs
  - print-to-program planning outputs
  - quote / ERP handoff outputs
- Define confidence downgrade rules for bridge-only support, missing machine detail, missing tooling detail, and uncalibrated physics.
- Add regression checks ensuring high-confidence responses cannot be returned without the required evidence fields.
- Run scrutiny loop focused on hidden assumptions and unjustified confidence.

**Acceptance**:

- High-value outputs can explain what they know, what they inferred, and how complete the result is.
- Unsupported or weakly-supported outputs cannot masquerade as fully trusted results.

---

## EIGC-MS8: Support Matrix Governance

**Goal**: Make runtime claims, roadmap status, product messaging, and test expectations consume one shared support-truth matrix.

**New deliverables**:

- `state/EIGC-MS8/support-matrix-governance.md`
- `state/EIGC-MS8/product-capability-matrix.json`

**Tasks**:

- Build the canonical support matrix using the taxonomy frozen in EIGC-MS0A.
- Populate support truth for machine/controller families, CAM systems, export/sync paths, physics features, and quoting/workflow handoffs.
- Define the promotion, downgrade, and deprecation rules that move a capability between support states.
- Require milestone files, tests, and product-facing claims to consume the same matrix.
- Add audit checks for rows that drift from runtime code or tests.
- Run scrutiny loop focused on overclaimed support and stale documentation.

**Acceptance**:

- No in-scope capability is marketed, roadmap-marked, or test-labeled outside the same support matrix.
- Product truth and runtime truth now share one capability ledger.

---

## EIGC-MS9: Golden-Path End-to-End Acceptance

**Goal**: Prove that the four flagship PRISM pillars work end to end, not just engine by engine.

**New deliverables**:

- `state/EIGC-MS9/golden-path-scenarios.json`
- `state/EIGC-MS9/acceptance-results.md`

**Suggested coverage targets**:

- `src/__tests__/golden-path-pillars.test.ts`
- `src/__tests__/golden-path-cross-pillar.test.ts`

**Tasks**:

- Select at least one representative scenario for each flagship pillar.
- Select at least one cross-pillar chain:
  - quote -> calculate -> plan -> post -> ERP handoff
- Define exact start inputs, expected outputs, degraded behaviors, and hard failure conditions for each scenario.
- Add automated acceptance coverage and a manual quality-review sample protocol.
- Record where real output is required and where fail-closed behavior is required.
- Run scrutiny loop focused on broken handoffs, false-success degradations, and missing end-to-end assertions.

**Acceptance**:

- Each flagship pillar has at least one evidence-backed golden path.
- At least one multi-pillar chain passes end to end with truthful degraded behavior where support is incomplete.

---

## EIGC-MS10: Field Calibration + Reality Check

**Goal**: Increase trust by comparing high-risk outputs against trusted references or field measurements and downgrading confidence where evidence is weak.

**New deliverables**:

- `state/EIGC-MS10/calibration-corpus.md`
- `state/EIGC-MS10/calibration-results.json`

**Tasks**:

- Assemble a benchmark corpus from trusted references, internal fixtures, or field measurements.
- Compare predicted vs observed behavior for the highest-risk outputs:
  - speed/feed recommendations
  - cycle-time estimates
  - spindle/load assumptions
  - tooling or machine compatibility assumptions
  - quote-driving time/cost assumptions
- Define tolerance bands and escalation rules when output deviation exceeds acceptable bounds.
- Downgrade confidence or support in areas that lack calibration evidence.
- Add audit hooks or tests that fail when calibrated tolerance rules are violated.
- Run scrutiny loop focused on overfit examples, weak evidence, and unjustified precision.

**Acceptance**:

- High-risk outputs are backed by calibration evidence or are explicitly downgraded.
- The roadmap can distinguish science-backed output from unverified extrapolation.

---

## EIGC-MS11: Workflow Orchestration + Production Governance

**Goal**: Make the four flagship pillars behave as one coherent product and enforce truthful production release gates.

**New deliverables**:

- `state/EIGC-MS11/workflow-orchestration-map.md`
- `state/EIGC-MS11/release-gate-matrix.md`
- `state/EIGC-MS11/production-governance-checklist.md`

**Tasks**:

- Define the cross-pillar workflows:
  - quote -> calculate -> program -> post -> ERP feedback
  - print -> interpret -> plan -> generate -> verify
- Define the handoff contracts and required artifacts between pillars.
- Define product-level release gates per flagship feature using the honest current gate stack.
- Specify how `npm run lint` returns to the hard-gate path once ESLint flat-config recovery lands.
- Require each flagship release gate to check both count and quality, not just artifact existence.
- Run final scrutiny loop across all four pillars plus the cross-pillar chain.

**Acceptance**:

- PRISM now has explicit product-level orchestration, not only engine-level capability islands.
- Production release gates are truthful, evidence-backed, and aligned with runtime support.

---

## Execution Order

1. Run EIGC-MS0A first and freeze the design contracts before auditing code.
2. Run EIGC-MS0 next and freeze the capability manifest before changing milestone statuses.
3. Land EIGC-MS1 before any roadmap completion claims are updated.
4. Use EIGC-MS2 and EIGC-MS3 to decide whether incomplete features are promoted to real support or downgraded honestly.
5. Only then execute EIGC-MS4 so roadmap truth reflects post-fix reality.
6. Land EIGC-MS5 so the same class of engine-integrity issues cannot quietly return.
7. Run EIGC-MS6 to unify the canonical manufacturing domain model before cross-pillar proof work.
8. Run EIGC-MS7 so high-value outputs expose provenance and confidence before they are used in business or automation flows.
9. Run EIGC-MS8 to make support truth machine-readable and shared across runtime, roadmap, and product claims.
10. Run EIGC-MS9 to prove one golden path per flagship pillar plus at least one cross-pillar chain.
11. Run EIGC-MS10 to calibrate high-risk outputs against real or trusted reference evidence.
12. Finish with EIGC-MS11 so workflow orchestration and release gates stay truthful at the product level.

---

## Success Criteria

This roadmap is complete when all of the following are true:

- No scoped engine returns fake-success output.
- No scoped engine silently no-ops on a mutating operation.
- No scoped roadmap file overstates or understates actual implementation state.
- Partial capabilities are surfaced honestly and testably.
- The capability taxonomy and truth hierarchy are documented and actually used.
- Integrity checks and direct tests guard the repaired paths.
- The four flagship pillars share a canonical domain model or explicit translation map.
- High-value outputs expose provenance, assumptions, completeness, and confidence.
- A shared support matrix governs runtime truth, roadmap truth, and product claims.
- At least one golden path per flagship pillar and one cross-pillar chain pass with evidence-backed outputs.
- High-risk outputs are calibrated or explicitly downgraded.
- Product-level workflow orchestration and release gates are evidence-backed and honest.

---

## Notes

- This roadmap complements, but does not replace, the existing findings for `AlgorithmGatewayEngine`, `FeedRateOptimizationEngine`, `HyperMillThreadStandardEngine`, lint recovery, and default test-scope repair.
- It is intentionally designed to support the four flagship product pillars, not just engine cleanup in isolation.
- If desired, this design can be decomposed next into milestone envelopes under `data/milestones/`.
