# PRISM App Surface Legitimacy Roadmap — Design Specification

**Date**: 2026-03-25
**Track**: PASL (PRISM App Surface Legitimacy)
**Milestones**: PASL-MS0A, PASL-MS0 through PASL-MS8
**Target**: Make the primary PRISM app surfaces truthful end to end so mounted routes, dispatcher actions, engine contracts, schemas, catalogs, and UI-facing feature claims all match runtime reality
**Approach**: Freeze Surface Truth -> Audit Live HTTP Paths -> Fix Wiring -> Fix Contracts -> Prove End to End -> Sync UI -> Gate Drift

---

## Problem Statement

The live HTTP audit showed a gap the current roadmap stack still leaves too implicit:

- a route can exist in `src/routes/` without being mounted
- a mounted route can call an action name that does not exist
- a dispatcher can expose an action but call an engine with the wrong contract
- a schema can describe a payload the engine does not accept
- a route can be reachable but still return empty or unusable discovery data
- the UI can build against a feature surface that looks present in code but is not legitimate at runtime

The broader roadmaps now cover the right classes of integrity, utilization, automation, and governance work.
What they do **not** yet do strongly enough is name the current primary app-surface blockers as first-class execution items.

This roadmap exists to close that exact gap.

---

## Confirmed Surface Gaps In Scope

This roadmap is scoped to the route-level and product-surface failures already confirmed in the live app audit.

### 1. Speed/Feed surface split-brain

- `src/routes/speedfeed.ts` defines `/api/v1/speed-feed/*`
- `src/routes/index.ts` does not mount that router
- `src/tools/dispatchers/calcDispatcher.ts` advertises `sf_orchestrate`
- the runtime execution switch does not actually implement `sf_orchestrate`
- the older `/api/v1/sfc/*` surface works, which creates authority confusion between `sfc` and `speed-feed`

### 2. CAM generate/post contract mismatch

- `src/routes/cam.ts` forwards one request object
- `src/tools/dispatchers/camDispatcher.ts` forwards that object directly to low-level engines
- `src/engines/ToolpathGenerationEngine.ts` expects positional arguments plus `tool_diameter_mm`
- `src/engines/PostProcessorEngine.ts` expects `(input, config)`, not one undifferentiated params object

### 3. PPG route/action drift

- `src/routes/ppg.ts` calls action names such as `gcode_generate`, `gcode_program`, `post_validate`, `post_compare`, `gcode_optimize`, and `gcode_operations`
- those names do not line up with the currently supported actions in `generatorDispatcher.ts` and `camDispatcher.ts`
- the route surface therefore overstates PPG completion

### 4. ERP analytics route drift

- `src/routes/erp.ts` exposes `oee_calculate` and `predictive_maint`
- `src/tools/dispatchers/intelligenceDispatcher.ts` does not provide those actions
- `bottleneck_identify` is real but route usability depends on an engine-shaped payload contract the route does not normalize

### 5. Context catalog discoverability gap

- `src/routes/context.ts` exposes catalog overview, search, engine, and stats
- the live catalog surface returned zero useful entries and engine lookup failure
- discoverability exists as a public feature surface but not as a trustworthy product feature

### 6. UI dependency risk

- one Claude terminal is actively building UI while another is executing the roadmap
- if backend route truth is not frozen and published, the UI can wire against dead or drifted endpoints and appear complete while the backend is not

---

## Why This Roadmap Must Exist Separately

This roadmap is additive and companion-only.
It must not overwrite any existing roadmap spec.

It specifically complements:

- [2026-03-20-prism-max-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md)
- [2026-03-25-engine-integrity-gap-closure-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md)
- [2026-03-25-mcp-max-utilization-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-mcp-max-utilization-roadmap-design.md)
- [2026-03-25-mcp-automation-control-plane-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-mcp-automation-control-plane-roadmap-design.md)

Those roadmaps cover the broader system well.
PASL turns the newly confirmed primary-surface failures into explicit, testable, merge-ready work.

---

## Product-Pillar Alignment

PASL exists to protect the four flagship PRISM surfaces where the app must be honest and usable:

1. **Physics-based Speed/Feed**
   - route authority must be unambiguous
   - mounted surfaces must align with real dispatcher support
2. **Ultimate Post Processor Generator**
   - PPG routes must call real actions with real contracts
   - CAM post routes must use the correct engine/pipeline contract
3. **Print to CNC Program**
   - CAM and PPG public surfaces must not expose broken generation paths
4. **ERP / Quoting / Business**
   - analytics and quote routes must match real backend capability
   - partially working analytics cannot be sold as complete

---

## Required Design Rules

### 1. Surface Truth Rule

A public route is only `supported` if all of the following are true:

- mounted in the live app
- calls an existing dispatcher action
- passes a contract the downstream layer actually accepts
- returns real structured output or explicit degraded metadata
- has direct route-level regression coverage

If any layer fails, the route must be labeled `partial`, `unsupported`, or `planned`.

### 2. Mounted-Or-Deprecated Rule

No major product router may remain in `src/routes/` as a silent orphan.
Each router must be one of:

- mounted
- intentionally deprecated
- internal-only
- planned only and moved out of the live route tree

### 3. One Public Contract Rule

For every public route:

- route schema
- dispatcher validation
- engine signature
- route docs
- UI expectation

must describe the same payload contract.

### 4. Route Authority Rule

Where overlapping public surfaces exist, exactly one must be authoritative.

Examples:

- `/api/v1/sfc/*` vs `/api/v1/speed-feed/*`
- `/api/v1/cam/post-process` vs `/api/v1/ppg/generate`

If overlap remains, the non-authoritative surface must be explicitly marked compatibility-only, legacy, or redirected.

### 5. UI Sync Rule

No UI flow may depend on a backend surface until the route is classified in the PASL surface matrix as:

- `supported`
- contract-frozen
- acceptance-tested

### 6. Fail-Closed Public Feature Rule

If a route is mounted but the capability is incomplete, it must:

- return explicit unsupported or degraded status
- be excluded from UI-ready support claims
- be listed correctly in the surface matrix

It must not look finished because the file exists.

---

## Mandatory Document Lookup Order

Read these in order before executing PASL work.

### 1. Inventory and path layer

- `data/docs/MASTER_INDEX.md`
- `data/docs/MASTER_INDEX_COMPACT.md`
- `data/docs/PATH_INDEX.md`
- `data/docs/CODE_SYSTEM_INDEX.md`

### 2. Roadmap context layer

- `docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md`
- `docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md`
- `docs/superpowers/specs/2026-03-25-mcp-max-utilization-roadmap-design.md`
- `docs/superpowers/specs/2026-03-25-mcp-automation-control-plane-roadmap-design.md`
- `data/docs/roadmap/ROADMAP_TRACKER.md`
- `data/roadmap-index.json`

### 3. Live surface layer

- `src/routes/index.ts`
- `src/routes/sfc.ts`
- `src/routes/speedfeed.ts`
- `src/routes/cam.ts`
- `src/routes/ppg.ts`
- `src/routes/erp.ts`
- `src/routes/context.ts`

### 4. Dispatcher and schema layer

- `src/tools/dispatchers/calcDispatcher.ts`
- `src/tools/dispatchers/camDispatcher.ts`
- `src/tools/dispatchers/generatorDispatcher.ts`
- `src/tools/dispatchers/intelligenceDispatcher.ts`
- `src/tools/dispatchers/contextDispatcher.ts`
- `src/schemas/camActionSchemas.ts`

### 5. Downstream engine layer

- `src/engines/ToolpathGenerationEngine.ts`
- `src/engines/PostProcessorEngine.ts`
- `src/engines/PostProcessorPipelineEngine.ts`
- `src/engines/BottleneckIdentificationEngine.ts`

### 6. Test and consumer layer

- `src/__tests__/`
- web or UI code that consumes these routes
- any OpenAPI or route-doc generation path already in the repo

Do not start implementation until the live route, dispatcher, and engine contracts are all read together.

---

## Mandatory Execution Loop

Every PASL milestone must follow this exact loop.

1. Freeze the bounded surface family for the milestone.
2. Write the current truth into milestone state artifacts.
3. Run live route verification before editing code.
4. Fix only that surface family.
5. Add or update route-level tests immediately.
6. Re-run live verification.
7. Run a scrutiny loop.
8. Publish contract or support-state changes for the UI builder.
9. Only then advance.

Do not:

- batch speed/feed, CAM/PPG, ERP, and catalog work into one unchecked patch wave
- update UI expectations before route truth is stable
- treat file presence as capability proof

---

## Scrutiny Loop Protocol

Every PASL milestone must use an adaptive scrutiny loop.

- `min_passes`: 3
- `max_passes`: 6
- `convergence_rule`: no new P0/P1 route-truth issue in two consecutive passes

### Pass 1. Mount and exposure scrutiny

Check:

- is the router mounted
- is the route reachable
- is the authoritative surface clear

### Pass 2. Contract scrutiny

Check:

- does route payload match schema
- does dispatcher validation match engine signature
- does output shape match product expectation

### Pass 3. Live HTTP scrutiny

Check:

- do real requests succeed with valid inputs
- do invalid or incomplete routes fail honestly
- are degraded routes explicit

### Pass 4. UI-consumer scrutiny

Check:

- is the UI or API consumer pointing at the correct route
- has any endpoint name or payload contract changed
- were those changes published

### Pass 5. Drift scrutiny

Check:

- do route comments, counts, OpenAPI docs, support matrices, and roadmap claims still match reality

If pass 4 or pass 5 finds a new P1 issue, the milestone is not complete.

---

## Compaction Points

Flush state whenever:

- a surface family is completed
- a route authority decision changes
- an endpoint contract changes
- a UI-facing support classification changes
- more than 6 files were edited in one slice

At each compaction point, refresh:

- `state/PASL-MS*/position.md`
- `state/PASL-MS*/surface-matrix.json`
- `state/PASL-MS*/scrutiny/pass-0N.md`
- `state/PASL-MS*/surface-change-notes.md`

`surface-change-notes.md` is mandatory while backend and UI are being built in parallel.

---

## Validation Stack

Each PASL milestone must declare exact commands, but the normal stack is:

1. `npx tsc --noEmit`
2. targeted Vitest for touched routes, dispatchers, and route consumers
3. live HTTP smoke checks against the mounted server
4. a route-surface audit comparing:
   - mounted routers
   - route handlers
   - dispatcher actions
   - schema contracts
   - engine signatures
5. product-surface regression checks for any affected UI flows

If `npm run lint` is still broken, PASL must not pretend lint is part of the hard gate.

---

## Milestone Map

### PASL-MS0A — Surface Contract Freeze

**Goal**

Define the app-surface truth contract so all later route decisions use one standard.

**Deliverables**

- `state/PASL-MS0A/surface-contract-standard.md`
- `state/PASL-MS0A/surface-status-taxonomy.json`
- `state/PASL-MS0A/route-authority-map.md`

**Tasks**

1. Define route support states:
   - `supported`
   - `partial`
   - `compat_only`
   - `internal_only`
   - `unsupported`
   - `planned`
2. Define the authoritative-vs-compatibility rule for overlapping surfaces.
3. Define the conditions under which UI may consume a route.
4. Define how route comments, OpenAPI docs, and support matrices must reflect route truth.

**Acceptance**

- every later PASL milestone can classify a route without ambiguity

---

### PASL-MS0 — Primary Surface Truth Audit

**Goal**

Create the first explicit truth matrix for the primary Prism app surfaces.

**Deliverables**

- `state/PASL-MS0/primary-surface-matrix.json`
- `state/PASL-MS0/route-gap-findings.md`
- `state/PASL-MS0/ui-dependency-risk.md`

**Tasks**

1. Enumerate every primary route under:
   - speed/feed
   - SFC
   - CAM
   - PPG
   - ERP
   - context catalog
2. Classify each route as:
   - mounted
   - action-valid
   - contract-valid
   - output-valid
   - tested
   - UI-safe
3. Record exact failure type for each invalid route:
   - unmounted
   - action missing
   - signature mismatch
   - schema mismatch
   - empty discovery surface
   - overlap ambiguity
4. Publish the first UI dependency risk list.

**Acceptance**

- no primary route remains unclassified
- UI-risky routes are explicitly listed before implementation continues

---

### PASL-MS1 — Speed/Feed Surface Closure

**Goal**

Resolve the authority and legitimacy of the speed/feed public surface.

**Primary focus**

- `src/routes/index.ts`
- `src/routes/sfc.ts`
- `src/routes/speedfeed.ts`
- `src/tools/dispatchers/calcDispatcher.ts`

**Tasks**

1. Decide the authoritative public surface:
   - keep `sfc`
   - promote `speed-feed`
   - or support both with explicit compatibility semantics
2. If `speed-feed` remains public:
   - mount it
   - implement or retire `sf_orchestrate`
   - ensure all public actions have runtime handlers
3. If `sfc` remains authoritative:
   - mark `speed-feed` compatibility-only or planned
   - remove deceptive support claims
4. Add route-level tests for both success and unsupported/degraded cases.
5. Publish updated route authority notes for the UI builder.

**Acceptance**

- there is one truthful public speed/feed story
- no mounted speed/feed route points to a non-existent runtime action

---

### PASL-MS2 — CAM and PPG Contract Closure

**Goal**

Make CAM generation/post and PPG routes legitimate end to end.

**Primary focus**

- `src/routes/cam.ts`
- `src/routes/ppg.ts`
- `src/tools/dispatchers/camDispatcher.ts`
- `src/tools/dispatchers/generatorDispatcher.ts`
- `src/schemas/camActionSchemas.ts`
- `src/engines/ToolpathGenerationEngine.ts`
- `src/engines/PostProcessorEngine.ts`
- `src/engines/PostProcessorPipelineEngine.ts`

**Tasks**

1. For CAM toolpath generation:
   - align the route schema with the true engine contract
   - or add an adapter layer that transforms route payloads into the engine signature
2. For CAM post-process:
   - stop passing one undifferentiated object into `PostProcessorEngine.process`
   - either adapt to `(input, config)` or route through the pipeline engine that matches public use
3. For PPG:
   - replace dead action names with real ones
   - or explicitly downgrade/remove unsupported endpoints
4. Decide route authority between CAM post and PPG generate/program/template flows.
5. Add direct HTTP and dispatcher tests for:
   - toolpath generate
   - post-process
   - template/program/validate/compare/optimize/operations
6. Update route docs and support state accordingly.

**Acceptance**

- CAM generate and post routes are contract-valid
- PPG no longer advertises dead actions as working endpoints
- overlapping CAM/PPG public surfaces have a clear authority model

---

### PASL-MS3 — ERP Analytics Surface Closure

**Goal**

Make ERP analytics routes truthful and consumable.

**Primary focus**

- `src/routes/erp.ts`
- `src/tools/dispatchers/intelligenceDispatcher.ts`
- `src/engines/BottleneckIdentificationEngine.ts`

**Tasks**

1. For `oee` and `predictive`:
   - implement real backing actions
   - or explicitly downgrade/remove those public routes
2. For `bottleneck`:
   - either normalize incoming route payloads into the engine contract
   - or update the public contract and docs so callers know the true required shape
3. Add route-level acceptance tests for supported analytics paths.
4. Publish UI-safe and unsupported analytics status.

**Acceptance**

- ERP analytics routes no longer claim support where no action exists
- supported analytics routes are usable without hidden engine-only payload knowledge

---

### PASL-MS4 — Context Catalog and Discovery Closure

**Goal**

Make the public context catalog surface genuinely useful or explicitly downgrade it.

**Primary focus**

- `src/routes/context.ts`
- `src/tools/dispatchers/contextDispatcher.ts`

**Tasks**

1. Audit why overview, search, and engine lookup return empty or useless results.
2. Decide whether the catalog is:
   - production-ready
   - partial
   - internal-only
3. If kept public:
   - populate real catalog data
   - make search and engine lookup return useful results
4. If not ready:
   - downgrade the public claim honestly
5. Add route-level discoverability tests.

**Acceptance**

- context catalog is either truly discoverable or honestly downgraded

---

### PASL-MS5 — Primary Surface End-to-End Acceptance

**Goal**

Prove that the main app-fed backend surfaces work end to end.

**Deliverables**

- `state/PASL-MS5/primary-surface-acceptance.md`
- `state/PASL-MS5/route-regression-matrix.json`

**Tasks**

1. Build automated route acceptance coverage for:
   - authoritative speed/feed surface
   - CAM generate
   - CAM post
   - authoritative PPG surface
   - quote and ERP analytics
   - context catalog
2. Add negative-path assertions:
   - missing action must fail honestly
   - unsupported route must be explicit
   - contract mismatch must be impossible or clearly rejected
3. Run live HTTP checks on a mounted server, not engine-only tests.

**Acceptance**

- primary product surfaces have evidence-backed HTTP legitimacy

---

### PASL-MS6 — UI Contract Sync and Safe Consumption

**Goal**

Keep the active UI build aligned with truthful backend capability.

**Deliverables**

- `state/PASL-MS6/ui-surface-contract.md`
- `state/PASL-MS6/ui-backend-support-matrix.json`
- `state/PASL-MS6/surface-change-notes.md`

**Tasks**

1. Publish the authoritative route list and payload shapes for the UI.
2. Mark unsupported or partial routes so the UI does not wire against them.
3. Define compatibility shims only where necessary and temporary.
4. Require any backend route contract change to append a short surface-change note while the UI terminal is active.
5. Add consumer-side checks where the UI depends on these routes.

**Acceptance**

- the UI can only consume backend surfaces that are contract-frozen and tested

---

### PASL-MS7 — Surface Drift Detection and Gates

**Goal**

Prevent route truth from drifting again.

**Suggested deliverables**

- `scripts/audit/route-surface-legitimacy-check.ps1`
- `src/__tests__/route-surface-legitimacy.test.ts`
- `state/PASL-MS7/drift-rules.md`

**Tasks**

1. Add an audit that compares:
   - mounted routes
   - declared route handlers
   - dispatcher action tables
   - schema names
   - downstream engine signatures where public adapters exist
2. Fail if:
   - a public route calls a missing action
   - a public route is unmounted but still advertised
   - a public route schema drifts from its adapter contract
   - a compatibility route is mislabeled as supported
3. Add this audit to the normal validation stack.

**Acceptance**

- future route/dispatcher/engine drift becomes a gated failure, not a rediscovered surprise

---

### PASL-MS8 — Main Roadmap Merge and Release Governance

**Goal**

Merge PASL outcomes into the main roadmap and release truth without losing specificity.

**Deliverables**

- `state/PASL-MS8/main-roadmap-merge-notes.md`
- `state/PASL-MS8/release-surface-gates.md`

**Tasks**

1. Map PASL milestones into the main roadmap under Production Readiness and product-surface hardening.
2. Link PASL dependencies to:
   - EIGC for runtime honesty
   - MXU for discoverability and exposure
   - ACP for surface-sync automation
3. Define release gates that block UI/product claims until PASL-MS5 and PASL-MS6 pass.
4. Update support truth artifacts and tracker notes to reflect final surface status.

**Acceptance**

- the main roadmap can consume PASL without flattening its route-specific findings

---

## How To Merge PASL Into the Main Roadmap

Do not overwrite the main roadmap spec.
Merge PASL as a companion dependency layer.

Recommended merge points:

1. Attach PASL under Track A / Production Readiness as a route-legitimacy dependency.
2. Make UI-facing feature work depend on:
   - `PASL-MS1` for speed/feed
   - `PASL-MS2` for CAM and PPG
   - `PASL-MS3` for ERP analytics
   - `PASL-MS4` for context catalog surfaces
3. Make public release or marketing claims depend on `PASL-MS5`.
4. Make the active UI build consume the outputs of `PASL-MS6`.
5. Make ongoing backend quality gates consume `PASL-MS7`.

---

## Success Criteria

PASL is complete when all of the following are true:

- every primary app route is classified and truthfully labeled
- no public route calls a missing action
- no public route uses a payload contract the downstream engine cannot accept
- speed/feed surface authority is explicit
- CAM and PPG public routes are legitimate or honestly downgraded
- ERP analytics routes no longer over-claim support
- context catalog is either useful or intentionally non-public
- UI-facing backend contract changes are published while parallel UI work is active
- route legitimacy is proven with live HTTP acceptance coverage
- drift between route, dispatcher, schema, engine, and UI contract is gated

---

## Notes

- PASL is intentionally narrower than EIGC, MXU, and ACP.
- It exists because live route legitimacy needs to be explicit while the roadmap and UI are actively being built in parallel.
- This roadmap should be handed directly to the Claude terminal running the roadmap so these route blockers become named work, not implicit assumptions.
