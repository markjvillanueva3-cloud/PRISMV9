# MCP Max Utilization Roadmap — Design Specification

**Date**: 2026-03-25
**Track**: MXU (Max Utilization)
**Milestones**: MXU-MS0A, MXU-MS0 through MXU-MS11
**Target**: Fully activate the existing PRISM MCP server, external skill/script/hook stores, context/token systems, persistent memory systems, and product-pillar capabilities so the platform behaves like a true manufacturing operating system for both product workflows and software-building workflows
**Approach**: Truth First -> Inventory -> Activate -> Orchestrate -> Remember -> Expose -> Prove -> Gate

---

## Problem Statement

The audit shows that PRISM already contains an unusually large amount of real capability:

- large dispatcher, engine, registry, and test surfaces
- working context/session/token-budget infrastructure
- real learning, document, video, and extracted-course assets
- externalized skill, script, and hook stores
- significant product depth across speed/feed, post processing, print-to-program, and ERP/business flows

The core limitation is no longer only "missing features." It is **under-utilization**:

- the system does not yet have a canonical activation layer that decides what skills, scripts, hooks, memories, digests, and prompts should load for a given task
- coding/build workflows do not yet exploit the platform as aggressively as they should
- context retention and token-economy systems exist, but they are not yet enforced as one coherent operating model
- persistent memory exists in several forms, but promotion, retrieval, provenance, and product-flow reuse are still fragmented
- extracted course assets exist, but there is not yet a canonical, traceable course-to-capability pipeline
- many powerful capabilities are still latent, partially exposed, or hard to discover across MCP, routes, UI, and internal build workflows

This roadmap exists to close that utilization gap.

---

## Why This Roadmap Is Needed

Existing roadmaps cover adjacent concerns, but not this full problem:

- [2026-03-15-mcp-modernization-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-15-mcp-modernization-design.md) expands MCP primitives and client compatibility
- [2026-03-15-quality-synergy-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-15-quality-synergy-roadmap-design.md) hardens quality and physics correctness
- [2026-03-20-prism-max-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md) broadens platform ambition and buildout
- [2026-03-25-engine-integrity-gap-closure-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md) closes truth and stub/no-op gaps
- [CCM-MS0.json](/C:/PRISM/mcp-server/data/milestones/CCM-MS0.json) and [CCM-MS1.json](/C:/PRISM/mcp-server/data/milestones/CCM-MS1.json) target Claude Code hook modernization

What is still missing is the layer that says:

- how the system should decide what to load
- how the system should conserve tokens while staying effective
- how the system should preserve knowledge across sessions and product workflows
- how the extracted educational corpus should become executable building capability
- how the entire platform should route itself into the four flagship PRISM pillars

This roadmap is that missing layer.

---

## Strategic Goals

This roadmap must make PRISM excellent at two things simultaneously.

### 1. Product Execution

The platform must reliably accelerate and prove the four flagship pillars:

1. physics-based speed/feed optimization
2. ultimate post processor generation
3. print to CNC program
4. ERP, quoting, and business management

### 2. Self-Building / Software Engineering

The platform must also become a better builder of itself:

1. better coding-task routing
2. better skill/script/hook utilization during implementation
3. better token efficiency during repo work
4. better session continuity and recovery
5. better persistent memory and design reuse
6. better automated scrutiny, testing, and anti-regression discipline

---

## Audit Signals Driving This Roadmap

The utilization audit and capability audit point to the following truth:

- context retention infrastructure is real and relatively strong
- token budget and digest infrastructure is real and relatively strong
- learning and extracted-course infrastructure is real, but not fully operationalized
- large external stores exist for skills, scripts, and hooks, but runtime activation is inconsistent
- capability counts and discoverability are not fully trustworthy
- some powerful capabilities are MCP-internal or registry-internal rather than product-surface-ready

This roadmap therefore assumes:

- there is already enough real capability to justify an activation layer
- utilization, orchestration, discoverability, and continuity are now the highest-leverage force multipliers

---

## Product-Pillar Alignment

Every MXU milestone must strengthen at least one of these layers:

### A. Coding / Building Capability

- task classification for backend, frontend, CAD/Python, routing, QA, roadmap, and data work
- skill/script/hook bundles for implementation and review
- test-impact analysis, build routing, and artifact generation

### B. Token Utilization

- graph-first and digest-first lookup
- bounded reads and staged hydration
- automatic compaction planning and output budgeting

### C. Context Retention

- session state, handoff, compaction snapshots, decision logs, and active todo continuity
- phase-aware and domain-aware context loading

### D. Persistent Memory

- durable decision memory
- benchmark memory
- issue memory
- feature memory
- product-flow memory
- course-derived knowledge memory

### E. PRISM Product Capability

- speed/feed
- ultimate post
- print-to-program
- ERP / quoting / business

No milestone should optimize only infrastructure while ignoring the product surface, and no product milestone should bypass the context/token/memory discipline.

---

## Required Design Standards

### 1. Activation Truth Rule

Every important asset class must be tracked as one of:

- `loaded_now`
- `available_not_loaded`
- `latent_unindexed`
- `deprecated`
- `blocked`
- `planned`

If the system cannot say which state an asset is in, it is not fully utilized.

### 2. Bundle Rule

For high-value tasks, the unit of utilization is not a single asset.
It is a **bundle**:

- relevant engines
- relevant dispatchers
- relevant skills
- relevant scripts
- relevant hooks
- relevant memories
- relevant tests
- relevant product routes or UI surfaces

### 3. Digest-First Rule

Before reading large live source trees, the system must attempt:

1. digest
2. index
3. graph
4. targeted file read

Full file hydration is the last step, not the default step.

### 4. Persistent-Memory Promotion Rule

Information becomes durable only if it is one of:

- decision with lasting architectural value
- repeated failure mode
- benchmark or calibration result
- product contract or support truth
- validated workflow pattern
- high-value lesson distilled from course or extraction assets

Everything else should remain session-local.

### 5. Course-to-Capability Provenance Rule

If a course, extraction file, or academic source produces a skill, script, hook, test, prompt, or engine rule, the lineage must be traceable.

### 6. Product-Surface Exposure Rule

If a capability is strategically important and working, it should not remain buried solely in:

- one dispatcher
- one registry
- one extracted file
- one internal route

It must have an intentional exposure path.

### 7. Scrutiny-Loop Rule

Every milestone must include repeated scrutiny loops for:

- correctness
- utilization truth
- token efficiency
- context retention
- memory quality
- product impact

---

## Companion Tracks

This roadmap complements, but does not replace:

- [2026-03-15-mcp-modernization-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-15-mcp-modernization-design.md)
- [2026-03-15-quality-synergy-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-15-quality-synergy-roadmap-design.md)
- [2026-03-20-prism-max-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md)
- [2026-03-25-engine-integrity-gap-closure-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md)
- [CCM-MS0.json](/C:/PRISM/mcp-server/data/milestones/CCM-MS0.json)
- [CCM-MS1.json](/C:/PRISM/mcp-server/data/milestones/CCM-MS1.json)
- [PRISM-PRODUCT-roadmap.json](/C:/PRISM/mcp-server/data/milestones/PRISM-PRODUCT-roadmap.json)
- [CPL-ROADMAP.json](/C:/PRISM/mcp-server/data/milestones/CPL-ROADMAP.json)

MXU should consume those tracks as dependencies whenever possible instead of cloning their work.

---

## Mandatory Document Lookup Order

Read these documents in this exact order before executing MXU work.

### 1. Global system inventory

Read:

- `data/docs/MASTER_INDEX.md`
- `data/docs/MASTER_INDEX_COMPACT.md`
- `data/docs/PATH_INDEX.md`

Purpose:

- establish the current system surface
- avoid duplicate files
- confirm canonical directories before adding anything

### 2. Code lookup and digest layer

Read:

- `data/docs/CODE_SYSTEM_INDEX.md`
- `data/docs/CODE_SYSTEM_INDEX.json`
- `data/docs/PROJECT_WIDE_DIGEST.md`
- `data/docs/ENGINE_DIGEST.md`
- `data/docs/DISPATCHER_DIGEST.md`
- `data/docs/DIRECTORY_DIGEST.md`
- `data/docs/SYSTEM_INVENTORY.md`

Purpose:

- establish digest-first and index-first navigation
- see current counts, code routing, and project-wide directory coverage

### 3. Token and continuity layer

Read:

- `data/docs/TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md`
- `data/docs/SESSION_HANDOFF.md`
- `data/docs/COMPACTION_SNAPSHOT.md`
- `data/docs/DECISIONS_LOG.md`
- `data/docs/SKILL_TIER_MAP.json`

Purpose:

- understand the current token-economy infrastructure
- understand current session recovery and durable-state patterns
- understand the current skill prioritization baseline

### 4. Roadmap operating layer

Read:

- `data/docs/roadmap/ROADMAP_INSTRUCTIONS.md`
- `data/docs/roadmap/ROADMAP_TRACKER.md`
- `data/docs/roadmap/ROADMAP_SECTION_INDEX.md`
- `data/docs/roadmap/SCRIPT_INDEX.json`

Purpose:

- align with the roadmap operating system already in the repo
- reuse existing scripts and tracker practices
- treat stale references as advisory, not canonical

### 5. Companion roadmap layer

Read:

- `docs/superpowers/specs/2026-03-15-mcp-modernization-design.md`
- `docs/superpowers/specs/2026-03-15-quality-synergy-roadmap-design.md`
- `docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md`
- `docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md`
- `data/milestones/CCM-MS0.json`
- `data/milestones/CCM-MS1.json`
- `data/milestones/PRISM-PRODUCT-roadmap.json`
- `data/milestones/CPL-ROADMAP.json`

Purpose:

- prevent overlap
- identify prerequisites already planned elsewhere
- keep MXU focused on activation and utilization

### 6. Live source and external asset layer

Only after the indexes above, inspect the live roots that matter to MXU:

- `src/tools/dispatchers/`
- `src/engines/`
- `src/registries/`
- `src/hooks/`
- `src/routes/`
- `src/mcp/`
- `src/data/academy/`
- `state/`
- `C:\PRISM\skills-consolidated`
- `C:\PRISM\scripts`
- `C:\PRISM\data\hooks`
- `C:\PRISM\extracted\mit`
- `C:\PRISM\extracted\learning`

Purpose:

- validate what is actually live
- compare runtime exposure to external asset inventory
- build the activation matrix from real evidence

---

## Important Ground-Truth Notes

- This roadmap is a **new roadmap spec** and must not overwrite prior roadmap specs.
- `CURRENT_POSITION.md` is still referenced in some roadmap docs, but it is not reliable as the sole source of truth in this repo snapshot.
- For MXU work, truth comes from:
  1. runtime code
  2. targeted tests
  3. live registry loads
  4. milestone state artifacts created during execution
  5. roadmap tracker entries
- External asset stores are part of the real PRISM platform surface:
  - `C:\PRISM\skills-consolidated`
  - `C:\PRISM\scripts`
  - `C:\PRISM\data\hooks`
  - `C:\PRISM\extracted\mit`
  - `C:\PRISM\extracted\learning`
- Capability claims must distinguish:
  - file exists on disk
  - registry can load it
  - dispatcher can call it
  - route/UI can expose it
  - product workflow can rely on it

---

## Strict Milestone Execution Loop

Every MXU milestone must follow this loop exactly.

1. Read only the required docs for the milestone.
2. Create milestone state under:
   - `state/MXU-MS*/position.md`
   - `state/MXU-MS*/artifact-manifest.json`
   - `state/MXU-MS*/activation-matrix.json`
   - `state/MXU-MS*/scrutiny/`
3. Define the bounded slice:
   - exact files or asset roots
   - exact activation gap
   - exact expected outcome
   - exact validation commands
4. Run a short inventory pass before edits:
   - confirm file already exists or does not exist
   - confirm related tests
   - confirm related skills/scripts/hooks
5. Implement only that bounded slice.
6. Flush durable findings immediately:
   - decisions
   - counts
   - matrices
   - benchmark results
   - support-truth adjustments
7. Run scrutiny pass 1.
8. Fix pass-1 issues before widening scope.
9. Run scrutiny pass 2.
10. If a new truth or regression issue appears, stop and resolve it.
11. Run targeted validation.
12. Update milestone state artifacts.
13. Only then advance to the next slice.

Do not:

- batch unrelated activation problems into one milestone step
- widen scope because adjacent assets look tempting
- update roadmap truth before code, runtime load, and validation agree

---

## Scrutiny Loop Protocol

Every milestone uses the same scrutiny loop.

### Pass 1. Correctness

Check:

- does the feature or activation path actually work
- do counts, routes, and dispatchers align with the code touched
- do related tests exist or need to be added

### Pass 2. Utilization Truth

Check:

- is the capability now actually loaded, exposed, or callable
- does registry truth match runtime truth
- is the asset still latent or now active

### Pass 3. Token Economy

Check:

- was a digest/index/graph used before full reads
- did the implementation reduce or increase context load
- are there new large files that need sectioning or digest support

### Pass 4. Continuity and Memory

Check:

- what should remain session-local
- what should be promoted to durable memory
- whether the decision and benchmark outputs were flushed to disk

### Pass 5. Product Impact

Check:

- which flagship pillar improved
- whether coding/build productivity improved
- whether the capability is now more usable in a real workflow

### Convergence Rule

Stop the scrutiny loop only when:

- no open P0/P1 issues remain
- activation status is explicit
- validation passes
- durable findings have been written

---

## Compaction Points and Session Discipline

MXU work must assume long-running sessions and context pressure.

### Mandatory compaction points

Flush and checkpoint whenever one of these happens:

- more than 6 files edited in one slice
- more than 12 files read in one subsystem
- more than 90 minutes spent in one milestone slice
- more than 3 scrutiny passes executed without convergence
- a new count or capability matrix is produced
- a product support claim changes

### What to flush at every compaction point

Write or refresh:

- `state/MXU-MS*/position.md`
- `state/MXU-MS*/artifact-manifest.json`
- `state/MXU-MS*/activation-matrix.json`
- `state/MXU-MS*/scrutiny/pass-0N.md`
- `data/docs/DECISIONS_LOG.md` when the decision has repo-wide value
- `data/docs/SESSION_HANDOFF.md` when the session is likely to pause

### Compaction quality rule

Never compact with undocumented:

- count deltas
- benchmark results
- unresolved P1 findings
- changed support classifications

---

## File Creation Rules

This roadmap prefers adding canonical artifacts instead of spreading state randomly.

### Allowed new MXU artifact locations

- `docs/superpowers/specs/`
- `data/docs/`
- `data/docs/roadmap/` only if a roadmap operating artifact is truly needed
- `data/milestones/` only after the MXU spec is accepted
- `state/MXU-MS*/`
- normal source roots under `src/`, `cad-engine/`, `web/`, `scripts/`, or external skill/hook stores when milestone implementation requires it

### Naming rules

- roadmap spec: `YYYY-MM-DD-mcp-max-utilization-roadmap-design.md`
- milestone envelopes: `MXU-MS*.json`
- state directory: `state/MXU-MS*`
- benchmark artifacts: `MXU_*`
- matrices: `*_matrix.json` or `*_matrix.md`

### Do not do this

- do not overwrite existing roadmap specs
- do not update milestone registry files until the roadmap is reviewed
- do not create alternate indexes when a canonical index already exists

---

## Validation Stack

Each milestone must declare exact commands, but the standard validation stack is:

1. `npx tsc --noEmit`
2. targeted `vitest` for the touched surface
3. live registry-load checks where registries are involved
4. relevant roadmap scripts from `data/docs/roadmap/SCRIPT_INDEX.json`
5. targeted runtime smoke checks for routes, MCP surfaces, or bundle activation paths

If `npm run lint` is still broken, MXU must treat lint restoration as a milestone deliverable, not as an assumed gate.

---

## Milestone Map

### MXU-MS0A — Utilization Contract Hardening

**Goal**

Define the canonical operating contract for utilization, activation truth, bundle composition, memory promotion, and product-surface exposure.

**Step-by-step**

1. Create a capability-status taxonomy for live, latent, blocked, deprecated, and planned assets.
2. Define the activation bundle model for coding, product, and learning tasks.
3. Define memory-promotion rules and durable-memory classes.
4. Define the product-surface exposure policy.
5. Define the trust hierarchy for counts and activation claims.
6. Store all contract docs under `data/docs/`.

**Deliverables**

- `data/docs/MXU_CAPABILITY_STATUS.md`
- `data/docs/MXU_ACTIVATION_CONTRACT.md`
- `data/docs/MXU_MEMORY_PROMOTION_RULES.md`
- `data/docs/MXU_TRUTH_HIERARCHY.md`

**Exit criteria**

- every later MXU milestone can reference one canonical contract set

---

### MXU-MS0 — Capability Census and Activation Matrix

**Goal**

Build the first trusted utilization map of what exists, what loads, what is exposed, and what remains latent.

**Step-by-step**

1. Inventory live source surfaces.
2. Inventory external skill/script/hook/course asset stores.
3. Run live registry loads and compare them to filesystem counts.
4. Build an activation matrix:
   - on disk
   - loadable
   - callable
   - surfaced
   - product-relevant
5. Build an orphan and overlap report.
6. Mark the highest-value latent capabilities.

**Deliverables**

- `data/docs/MXU_CAPABILITY_CENSUS_2026-03-25.md`
- `data/docs/MXU_ACTIVATION_MATRIX.json`
- `data/docs/MXU_ORPHAN_ASSET_REPORT.md`

**Exit criteria**

- the system can answer "what exists and what is actually usable"

---

### MXU-MS1 — Coding and Build Copilot Plane

**Goal**

Make PRISM a far stronger software engineering accelerator for its own codebase.

**Step-by-step**

1. Identify the main coding work classes:
   - backend TS
   - frontend web
   - CAD/Python
   - dispatcher/registry wiring
   - roadmap/spec work
   - QA/review/regression work
2. Build activation bundles for each class:
   - top skills
   - top scripts
   - top hooks
   - top digests
   - top tests
3. Add targeted auto-routing for build, test, and review tasks.
4. Add or wire test-impact analysis and validation recommendations.
5. Add per-workflow guidance for companion asset creation.
6. Define worktree/agent/script usage rules for large implementation tasks.

**Deliverables**

- `data/docs/MXU_CODING_BUNDLES.json`
- `data/docs/MXU_BUILD_WORKFLOW_MAP.md`
- `data/docs/MXU_TEST_IMPACT_POLICY.md`

**Exit criteria**

- common coding tasks now trigger focused, high-value capability bundles instead of generic repo exploration

---

### MXU-MS2 — Token Economy and Context Kernel

**Goal**

Turn the current token and digest infrastructure into a mandatory operating model.

**Step-by-step**

1. Define graph-first and digest-first routing rules.
2. Identify high-cost read paths that still bypass digests.
3. Create or refresh missing high-value digests and section indexes.
4. Wire bounded-read and staged-hydration practices into coding workflows.
5. Define response-budget and compaction thresholds per workflow class.
6. Benchmark before/after token load on representative tasks.

**Deliverables**

- `data/docs/MXU_CONTEXT_LOADING_PROTOCOL.md`
- `data/docs/MXU_TOKEN_BUDGET_MATRIX.json`
- `data/docs/MXU_DIGEST_GAP_REPORT.md`
- `data/docs/MXU_TOKEN_BENCHMARKS.md`

**Exit criteria**

- the platform uses context deliberately instead of expensively

---

### MXU-MS3 — Persistent Memory Fabric

**Goal**

Unify session continuity, durable decisions, benchmark memory, issue memory, and product-flow memory into a coherent memory model.

**Step-by-step**

1. Map current memory stores and state artifacts.
2. Define memory classes:
   - session
   - durable decision
   - benchmark/calibration
   - failure pattern
   - feature memory
   - product-flow memory
   - course-derived memory
3. Define promotion criteria and retention windows.
4. Define retrieval ranking rules for each workflow.
5. Wire memory use into session start, compaction, and milestone completion.
6. Add cold-start recovery benchmarks.

**Deliverables**

- `data/docs/MXU_MEMORY_MODEL.md`
- `data/docs/MXU_MEMORY_RETRIEVAL_POLICY.md`
- `data/docs/MXU_COLD_START_BENCHMARKS.md`

**Exit criteria**

- the system retains the right things for the right reasons and can recover them on demand

---

### MXU-MS4 — Course-to-Capability Transformation

**Goal**

Turn the extracted educational corpus, including MIT-derived assets, into traceable executable building capability.

**Step-by-step**

1. Inventory course and extracted learning assets.
2. Build a canonical course-source ledger.
3. Define the transformation pipeline:
   - source concept
   - distilled lesson
   - skill
   - script
   - hook
   - prompt
   - test or benchmark
4. Prioritize software engineering, architecture, infrastructure, and manufacturing-relevant concepts.
5. Create provenance metadata for all transformed artifacts.
6. Define quality gates for executable course-derived assets.

**Deliverables**

- `data/docs/MXU_COURSE_SOURCE_LEDGER.json`
- `data/docs/MXU_COURSE_TO_CAPABILITY_RULES.md`
- `data/docs/MXU_COURSE_CAPABILITY_INDEX.json`
- `data/docs/MXU_COURSE_PROVENANCE_POLICY.md`

**Exit criteria**

- the platform can trace which educational assets produced which executable capabilities

---

### MXU-MS5 — Hook, Script, Agent, and Worktree Orchestration

**Goal**

Operationalize the automation layer so utilization improves without requiring constant manual remembering.

**Step-by-step**

1. Reconcile hook truth across runtime, registry, and external files.
2. Finish or align event coverage with CCM tracks.
3. Define phase-aware and task-aware hook activation.
4. Define script recommendation and execution rules.
5. Define agent/worktree orchestration patterns for large implementation tasks.
6. Add telemetry for hook fire rates, script usefulness, and orchestration outcomes.

**Deliverables**

- `data/docs/MXU_HOOK_ACTIVATION_MODEL.md`
- `data/docs/MXU_SCRIPT_RECOMMENDATION_MODEL.md`
- `data/docs/MXU_AGENT_ORCHESTRATION_MODEL.md`
- `data/docs/MXU_AUTOMATION_TELEMETRY.md`

**Exit criteria**

- automation assets are no longer mostly passive inventory

---

### MXU-MS6 — Product-Pillar Capability Packages

**Goal**

Package the platform into intentionally activated bundles for the four flagship PRISM pillars.

**Step-by-step**

1. For each flagship pillar, define the canonical bundle:
   - engines
   - dispatchers
   - skills
   - scripts
   - hooks
   - memories
   - tests
   - UI/routes/resources/prompts
2. Define the capability gaps in each bundle.
3. Define the activation order and required truth gates.
4. Define the durable memory each pillar should write.
5. Define the support and exposure surface for each pillar.

**Deliverables**

- `data/docs/MXU_SPEED_FEED_PACKAGE.md`
- `data/docs/MXU_POST_PACKAGE.md`
- `data/docs/MXU_PRINT_TO_PROGRAM_PACKAGE.md`
- `data/docs/MXU_ERP_QUOTE_PACKAGE.md`

**Exit criteria**

- each flagship pillar has an intentional activation package instead of scattered assets

---

### MXU-MS7 — Discoverability and Surface Unification

**Goal**

Expose high-value capabilities cleanly across MCP, routes, UI, docs, and internal developer workflows.

**Step-by-step**

1. Identify high-value latent capabilities.
2. Decide whether each should surface through:
   - dispatcher
   - MCP resource/prompt/completion
   - route/API
   - UI
   - internal build workflow only
3. Reconcile naming and support labels.
4. Add or update a capability discovery layer.
5. Ensure academy/course capabilities and coding capabilities are not trapped in one surface only.

**Deliverables**

- `data/docs/MXU_DISCOVERY_MATRIX.json`
- `data/docs/MXU_SURFACE_MAPPING.md`
- `data/docs/MXU_SUPPORT_TAXONOMY.md`

**Exit criteria**

- high-value capabilities are intentionally discoverable where they matter

---

### MXU-MS8 — Evidence, Telemetry, and Self-Improvement

**Goal**

Make utilization measurable so the platform can tune itself over time.

**Step-by-step**

1. Define utilization metrics:
   - bundle hit rate
   - script usefulness
   - hook fire quality
   - token savings
   - recovery time
   - memory retrieval quality
   - product-path success rate
2. Define telemetry destinations and retention.
3. Build tuning loops for:
   - weak bundles
   - noisy hooks
   - stale skills
   - low-value scripts
   - missing digests
4. Define review cadences.

**Deliverables**

- `data/docs/MXU_UTILIZATION_METRICS.md`
- `data/docs/MXU_TUNING_LOOP.md`
- `data/docs/MXU_REVIEW_CADENCE.md`

**Exit criteria**

- utilization quality becomes measurable and improvable

---

### MXU-MS9 — Golden-Path End-to-End Utilization Proof

**Goal**

Prove that PRISM can use its own platform capabilities effectively on real workflows.

**Step-by-step**

1. Define representative developer golden paths:
   - add a backend feature
   - patch a dispatcher or registry
   - add a CAD/Python feature
   - add a UI surface
   - transform a course asset into executable capability
2. Define representative product golden paths:
   - material + machine + tool -> speed/feed
   - machine + controller + CAM -> post package
   - geometry + process route -> print-to-program
   - part + routing + costing -> quote/ERP flow
3. Benchmark:
   - token usage
   - context recovery
   - memory recall
   - validation coverage
   - final output quality
4. Write failures back into the roadmap gap queue.

**Deliverables**

- `data/docs/MXU_GOLDEN_PATHS.md`
- `data/docs/MXU_E2E_RESULTS.md`
- `data/docs/MXU_GAP_FEEDBACK_QUEUE.md`

**Exit criteria**

- PRISM can demonstrate full-stack self-use, not just isolated subsystem strength

---

### MXU-MS10 — Governance and Release Gates

**Goal**

Prevent utilization drift after the initial activation work lands.

**Step-by-step**

1. Restore or replace broken hard gates.
2. Define freshness rules for counts, digests, activation matrices, and support claims.
3. Define release gates for flagship packages.
4. Define gating for course-derived capability provenance.
5. Define gating for memory health and session recovery quality.

**Deliverables**

- `data/docs/MXU_RELEASE_GATES.md`
- `data/docs/MXU_FRESHNESS_POLICY.md`
- `data/docs/MXU_MEMORY_HEALTH_GATE.md`

**Exit criteria**

- utilization quality is protected by policy, not memory

---

### MXU-MS11 — Continuous Improvement and Rollout

**Goal**

Operationalize MXU so it becomes part of normal platform evolution.

**Step-by-step**

1. Define rollout sequence for teams and product areas.
2. Define quarterly utilization audits.
3. Define archive and deprecation rules for stale assets.
4. Define how new milestones in other tracks must update MXU matrices.
5. Define the handoff from roadmap mode to maintenance mode.

**Deliverables**

- `data/docs/MXU_ROLLOUT_PLAN.md`
- `data/docs/MXU_QUARTERLY_AUDIT_PROTOCOL.md`
- `data/docs/MXU_ASSET_RETIREMENT_POLICY.md`

**Exit criteria**

- MXU becomes a maintained operating system layer instead of a one-time cleanup effort

---

## Recommended Execution Order

Execute in this order:

1. `MXU-MS0A`
2. `MXU-MS0`
3. `MXU-MS1`
4. `MXU-MS2`
5. `MXU-MS3`
6. `MXU-MS4`
7. `MXU-MS5`
8. `MXU-MS6`
9. `MXU-MS7`
10. `MXU-MS8`
11. `MXU-MS9`
12. `MXU-MS10`
13. `MXU-MS11`

Reason:

- define the contract first
- measure the real surface second
- activate developer workflows before broad product exposure
- stabilize token, continuity, and memory before golden-path proof
- gate and operationalize only after proof exists

---

## Success Criteria

This roadmap succeeds only if all of the following become true:

- PRISM can clearly state what capabilities are live, latent, blocked, or planned
- coding/build workflows automatically benefit from the platform's best skills, scripts, hooks, digests, and tests
- token usage and context loading are deliberate and benchmarked
- durable memory is promoted intentionally and recovered effectively
- course-derived assets become traceable executable capability, not just raw content
- the four flagship product pillars have explicit activation packages
- high-value capabilities are discoverable across the surfaces that matter
- utilization quality is measured, benchmarked, and protected by gates

---

## Non-Goals

This roadmap does **not** by itself:

- replace the engine-integrity roadmap
- replace product breadth roadmaps
- replace CCM hook-modernization milestone families
- solve every feature gap in the product

Its job is to make the existing and planned capability surface **actually usable to maximum effect**.

---

## Next-Step Recommendation

After this spec is reviewed, the next artifacts should be:

1. `data/milestones/MXU-MS0A.json` through `data/milestones/MXU-MS11.json`
2. `state/MXU-MS0A/` bootstrap state files
3. the initial `MXU_CAPABILITY_CENSUS_2026-03-25.md`
4. the first machine-readable `MXU_ACTIVATION_MATRIX.json`

Do not update the canonical milestone registry until the MXU track is accepted.
