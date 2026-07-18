# MCP Full Automation Blueprint

## Status

Active design overlay under the current `finish-current-delivery-first` gate.

This blueprint does not replace `C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md`.
It defines how PRISM should reach trustworthy development automation and post-setup business automation without inventing dark features or silent authority drift.

Execution roadmap:

- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-DEVELOPMENT-AUTOMATION-ROADMAP.md`

## Goal

After initial shop setup, PRISM should be able to:

- detect newly added capabilities and datasets
- register them canonically
- generate or suggest required wiring
- prove consumer propagation
- promote only through fail-closed gates
- keep Claude and Codex aligned while they wire backend and frontend in parallel

This applies to:

- engines
- routes
- dispatchers
- hooks
- skills
- scripts
- formulas
- decision policies
- automation policies
- machines
- tooling
- tool holders
- workholding
- materials
- catalogs
- CAD/simulation assets
- learned knowledge artifacts

## Current Truth

PRISM already has important automation surfaces:

- orchestration routes
- hook routes
- skill/script routes
- registry/index builders
- shared coordination, task queue, and roadmap sync
- an implemented `FormulaRegistry`
- task-queue `challenge` and `file-lock` support for duplicate task collisions and concurrent edit protection

But PRISM still lacks universal self-wiring because:

- new routes can exist without being mounted
- new engines can exist without dispatcher or consumer coverage
- new data sources can exist without canonical propagation to backend and frontend consumers
- schema, policy, provenance, and consumer-matrix artifacts are not yet complete enough to fail closed

## Core Design Rule

No new artifact counts as complete merely because code exists.

Each new artifact must pass this lifecycle:

`detect -> classify -> register -> declare consumers -> generate wiring -> verify mounts -> prove propagation -> promote`

## Canonical Registries

Required canonical registries:

- `ArtifactRegistry`
- `RouteMountRegistry`
- `FormulaRegistry`
- `SchemaRegistry`
- `ConstantsAndUnitsRegistry`
- `DecisionPolicyRegistry`
- `AutomationPolicyRegistry`
- `ConsumerMatrix`
- `ProviderSurfaceRegistry`
- `CapabilityCatalogRegistry`

Registry rules:

- one schema owner per canonical payload
- one mount owner per route surface
- one consumer declaration set per artifact
- no inline constants for production business, physics, or automation decisions
- no production automation without provenance, confidence, and rollback posture

## Artifact Classes

The automation spine should classify newly detected artifacts into one or more of:

- `backend_engine`
- `dispatcher_action`
- `route_module`
- `route_mount`
- `event_schema`
- `formula`
- `policy`
- `hook`
- `skill`
- `script`
- `provider_surface`
- `frontend_entry`
- `test_asset`
- `machine_asset`
- `tooling_asset`
- `holder_asset`
- `workholding_asset`
- `catalog_asset`
- `cad_asset`
- `learning_artifact`

## Automation Pipeline

### `MCPA-0 Artifact Census`

- detect new repo artifacts and new shop-data artifacts
- classify artifact type, domain, owner lane, and candidate consumers
- assign canonical ids

### `MCPA-1 Registry Write`

- write/update registry rows
- require provenance, schema/version, units, source, and consumer declarations
- block promotion when required metadata is missing

### `MCPA-2 Wiring Planner`

For each artifact, determine whether PRISM should generate or update:

- dispatcher registration
- route export and route mount
- schema validators
- orchestrator registration
- event-bus publication/subscription
- API client methods
- provider/live-fallback seams
- shell catalog entries
- page notices and route-stage fallback state
- index and command-bridge surfaces
- test attachment points

### `MCPA-3 Forge Generation`

Generate draft packages for:

- engine + dispatcher action
- route + route mount
- client + provider seam
- hook + skill + script companion surfaces
- frontend feature entry when user-facing
- formula/policy stubs when a decision surface is introduced

Rule:

- generate in dry-run mode by default
- require named owner acceptance before production promotion

### `MCPA-4 Proof Pack`

Every promoted artifact should have a proof pack:

- mounted route proof
- dispatcher reachability proof
- schema parity proof
- consumer-matrix row
- propagation test
- fallback-safety proof
- SVI/Psi impact note

### `MCPA-5 Promotion`

Promote only when:

- route is mounted
- schema is registered
- consumer declarations exist
- at least one authoritative consumer is wired
- propagation proof is green
- rollback path is defined for automated writes

## Backend / Frontend Split

Claude backend-first ownership:

- artifact census for backend classes
- route mount authority
- dispatcher/orchestrator/event registration
- schema, formula, policy, and provenance registries
- database migrations
- authoritative event flow

Codex frontend-first ownership:

- client/provider/live-fallback generation
- shell catalog and desk exposure
- route-stage notices and staged/live honesty
- mounted continuity tests
- consumer-surface hardening

Convergence rule:

- backend artifacts should expose declared consumer contracts
- frontend surfaces should refuse silent authority assumptions
- neither side should invent truth the other side cannot see

## Conflict Arbitration

Queue ownership and roadmap ownership still win first.

Only when Claude and Codex converge on the same unclaimed shared blocker should they use quick arbitration.

Canonical helper:

`node C:\PRISM\.claude\helpers\rps-arbitration.mjs --issue "<issue>" --agent-a "<Claude instance>" --play-a r --agent-b "<Codex instance>" --play-b s`

Rules:

- allowed values: `r`, `p`, `s`
- winner gets temporary priority ownership on that blocker
- loser moves to adjacent non-conflicting work and posts a short coordination note
- arbitration must be logged to shared state
- RPS never overrides an explicit queue claim or user instruction
- for task-bound conflicts, prefer `node C:\PRISM\.claude\helpers\task-queue.mjs challenge --task "<id>" --move r|p|s`
- for concurrent edits, prefer `file-lock`, `file-unlock`, and `file-locks` in the same helper

## Data-Source Automation

When the new artifact is a machine, tool, holder, workholding component, catalog entry, or CAD asset, the automation spine should also decide whether it must feed:

- quoting and cost models
- machine/holder/tool compatibility
- setup and workholding recommendations
- alarms and troubleshooting
- inventory and receiving
- post processor/controller matching
- simulation and prove-out
- learning and handbook consumers

No technical asset should enter a canonical registry without:

- source
- revision/hash
- units
- compatibility tags
- validation state
- declared consumers

## Full-Automation Gate

PRISM should only claim full automation readiness when all of the following are true:

- `RouteMountRegistry` prevents unmounted route drift
- `ConsumerMatrix` prevents orphan capabilities
- `SchemaRegistry` and provenance rules fail closed
- frontend provider surfaces can distinguish `live`, `live-fallback`, `staged`, and `local-only`
- the proof ladder is green for the target workflow
- business-trust gates are green for finance, compliance, and customer-visible automation

## First Implementation Slice

The first practical build slice for this blueprint should be:

1. artifact census for engines/routes/dispatchers/hooks/skills/scripts/provider surfaces
2. `RouteMountRegistry`
3. `ConsumerMatrix`
4. auto-check for route export + mount parity
5. auto-check for dispatcher registration + schema presence
6. auto-check for provider surface declaration + fallback posture
7. proof-pack stub generation

This is the shortest path from today's partial automation to a trustworthy self-wiring system.
