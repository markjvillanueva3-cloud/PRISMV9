# MCP Development Automation Roadmap

## Status

Active execution roadmap under the current `finish-current-delivery-first` gate.

This roadmap implements the architecture defined in:

- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-FULL-AUTOMATION-BLUEPRINT.md`

It also absorbs tactical execution detail from:

- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-AUTOMATION-HARDENING-ROADMAP.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\ULTIMATE-PRISM-ROADMAP-v25.md`

It does not replace:

- `C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md`

## Purpose

Make PRISM's MCP-server development system react to new code automatically and safely.

When a new artifact enters the system, PRISM should immediately:

1. detect it
2. classify it
3. determine impacted consumers
4. generate the required improvement pack
5. validate mount/wiring/proof posture
6. either promote it safely or queue the missing work deterministically

## Current Truth

Already present:

- hook routes
- orchestration routes
- skill/script routes
- shared task queue
- shared roadmap sync
- implemented `FormulaRegistry`
- challenge and file-lock support in `task-queue.mjs`

Still missing as a complete system:

- canonical route-mount registry
- canonical consumer matrix
- automatic provider-surface declaration
- code-entry improvement reaction pipeline
- proof-pack generation
- automatic drift/freshness/provenance gates

## Finite Maximum Resolution Model

PRISM should treat development automation as a finite-resolution state machine, not an infinite fuzzy process.

Every artifact moves through exactly these states:

`U0 unknown -> U1 detected -> U2 classified -> U3 registered -> U4 wired -> U5 proved -> U6 promoted`

No skipping is allowed.

### Resolution Formulas

`ResolutionScore(artifact) = state_index / 6`

where:

- `U0 = 0`
- `U1 = 1`
- `U2 = 2`
- `U3 = 3`
- `U4 = 4`
- `U5 = 5`
- `U6 = 6`

`WiringClosure = satisfied_required_edges / total_required_edges`

`ConsumerClosure = active_verified_consumers / declared_consumers`

`ProofClosure = passed_required_proofs / total_required_proofs`

`ReactionLatency = time(improvement_pack_ready) - time(code_entry_detected)`

`AutoImprovementCoverage = impacted_surfaces_with_generated_improvement / total_impacted_surfaces`

`PromotionTrust = 0.30*SchemaParity + 0.20*WiringClosure + 0.20*ConsumerClosure + 0.15*ProofClosure + 0.15*RollbackReadiness`

`FiniteResolutionIndex = 0.20*ArtifactDetectionCoverage + 0.20*WiringClosure + 0.20*ConsumerClosure + 0.20*ProofClosure + 0.20*PromotionTrust`

## Hard Gates

No artifact may reach `U6 promoted` unless:

- `SchemaParity = 1.00`
- `WiringClosure = 1.00`
- `ConsumerClosure >= 0.80` for non-user-facing internal artifacts
- `ConsumerClosure = 1.00` for user-facing or customer-visible artifacts
- `ProofClosure = 1.00` on required proofs
- `RollbackReadiness = 1.00` for automated writes

## Artifact Classes In Scope

- engines
- dispatchers
- route modules
- route mounts
- hooks
- skills
- scripts
- formulas
- policies
- schemas
- provider surfaces
- frontend entries
- tests
- machines
- tooling
- holders
- workholding
- materials
- catalogs
- CAD/simulation assets
- learned knowledge artifacts

## Code Entry Reaction Pipeline

This is the core loop PRISM should execute the moment code enters the repo.

### `REACTION-0 Code Entry Detect`

Trigger surfaces:

- write/edit/multiedit hooks
- git diff staging points
- CI changed-file detection
- generated-file import surfaces

Outputs:

- changed artifact list
- impacted domains
- owner lane hint
- risk level

### `REACTION-1 Artifact Census`

Required script:

- `artifact-census.mjs`

Outputs:

- artifact ids
- artifact classes
- schema owner candidates
- route/dispatcher/provider impact
- candidate consumer sets

### `REACTION-2 Improvement Planner`

Required script:

- `feature-improvement-planner.mjs`

Outputs:

- required registry updates
- required wiring updates
- required proof updates
- generated dry-run improvement plan

### `REACTION-3 Forge Improvement Pack`

Required generators:

- `forge-route-pack.mjs`
- `forge-dispatcher-pack.mjs`
- `forge-provider-pack.mjs`
- `forge-proof-pack.mjs`
- `forge-doc-pack.mjs`

Outputs:

- route mount suggestions
- schema validator stubs
- dispatcher registration updates
- client/provider/page update suggestions
- proof-pack and test stubs
- index/bridge update suggestions

### `REACTION-4 Guard Rails`

Required checks:

- `route-mount-audit.mjs`
- `dispatcher-registration-audit.mjs`
- `provider-surface-audit.mjs`
- `consumer-matrix-audit.mjs`
- `proof-pack-audit.mjs`
- `schema-parity-audit.mjs`

### `REACTION-5 Promotion Or Queue`

If all gates are green:

- promote registry rows
- promote wiring
- update SVI/Psi notes

If not:

- create deterministic missing-work records
- update task queue / roadmap lane
- block unsafe promotion

## Scripts To Build

### Registry scripts

- `artifact-census.mjs`
- `route-mount-registry-builder.mjs`
- `consumer-matrix-builder.mjs`
- `provider-surface-registry-builder.mjs`
- `automation-policy-registry-builder.mjs`

### Audit scripts

- `route-mount-audit.mjs`
- `dispatcher-registration-audit.mjs`
- `event-contract-audit.mjs`
- `provider-surface-audit.mjs`
- `consumer-matrix-audit.mjs`
- `proof-pack-audit.mjs`
- `auto-improvement-drift-audit.mjs`

### Generator scripts

- `feature-improvement-planner.mjs`
- `forge-improvement-pack.mjs`
- `forge-route-pack.mjs`
- `forge-provider-pack.mjs`
- `forge-proof-pack.mjs`
- `forge-test-pack.mjs`

## Hooks To Build

### `CodeEntryDetect`

Runs on write/edit and CI changed-file sets.

### `ArtifactCensusSync`

Refreshes affected registries after code entry.

### `ImprovementPlanner`

Computes impacted routes, dispatchers, providers, tests, and docs.

### `ProofPackGuard`

Blocks promotion when proof-pack requirements are incomplete.

### `RouteMountGuard`

Blocks route-module additions that are not mounted or declared.

### `ConsumerPropagationGuard`

Blocks promotion when declared consumers are absent or unproven.

### `ProviderHonestyGuard`

Blocks frontend surfaces from silently claiming `live` without backend authority.

## Tools To Build

### MCP tools

- `automation_detect_artifacts`
- `automation_plan_improvements`
- `automation_generate_pack`
- `automation_run_guards`
- `automation_promote_ready`
- `automation_queue_gaps`

### Slash/tooling surfaces

- `/forge-improve`
- `/forge-wire`
- `/forge-proof`
- `/forge-promote`
- `/forge-impact`

Rule:

- all generator surfaces should be dry-run by default
- all promotion surfaces should emit explicit missing requirements when blocked

## Multi-Agent Execution Rule

Claude should own backend automation slices:

- route mount registry
- dispatcher and orchestration audits
- schema and event guards
- artifact detection and backend proof gates

Codex should own frontend automation slices:

- provider-surface registry
- client/provider/page improvement packs
- frontend honesty guards
- mounted continuity proof packs

Shared rule:

- use task queue claims first
- use file locks for concurrent edit protection
- use `task-queue.mjs challenge --task <id> --move r|p|s` for task conflicts
- use `rps-arbitration.mjs` only for non-task shared-blocker collisions

## Phases

### `MDA-0 Foundation`

Build:

- `ArtifactRegistry`
- `RouteMountRegistry`
- `ConsumerMatrix`
- code-entry detection hook

Exit gate:

- every changed route/dispatcher/provider artifact is detectable and classifiable

### `MDA-1 Wiring Truth`

Build:

- route mount audit
- dispatcher registration audit
- provider-surface audit
- event contract audit

Exit gate:

- no new route or dispatcher can silently exist outside canonical wiring truth

### `MDA-2 Improvement Generation`

Build:

- improvement planner
- forge improvement pack
- route/provider/proof/test generation stubs

Exit gate:

- changed artifacts get a deterministic dry-run improvement pack automatically

### `MDA-3 Proof And Promotion`

Build:

- proof-pack generator
- proof-pack audit
- promotion gates
- queue fallback for unresolved improvement gaps

Exit gate:

- no artifact reaches promoted state without proof, consumers, and rollback posture

### `MDA-4 Self-Improving Fabric`

Build:

- drift audit
- repeated-gap clustering
- recommendation engine for recurring missing surfaces
- automation metrics dashboard

Exit gate:

- the system starts improving the improvement system itself from repeated patterns

## Tomorrow-Safe Sequencing

While the finish-first gate remains active:

- this roadmap may produce registries, guards, scripts, and dry-run generators
- it should not slow current blocker closure
- it must not silently change production route wiring or UI defaults

The best immediate starting slice is:

1. `RouteMountRegistry`
2. `ConsumerMatrix`
3. `route-mount-audit.mjs`
4. `dispatcher-registration-audit.mjs`
5. `provider-surface-audit.mjs`

## Success Condition

PRISM development automation is only “flawless” when a new piece of code entering the system causes:

- immediate detection
- deterministic artifact classification
- automatic identification of missing consumers and wiring
- automatic generation of the required improvement pack
- automatic proof and promotion gating
- zero silent drift between backend, frontend, hooks, tools, and shared indexes

That is the point where “new code entered the system” reliably becomes “the system improved itself safely.”
