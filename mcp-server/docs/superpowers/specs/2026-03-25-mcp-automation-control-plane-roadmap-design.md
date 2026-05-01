# MCP Automation Control Plane Roadmap — Design Specification

**Date**: 2026-03-25
**Track**: ACP (Automation Control Plane)
**Milestones**: ACP-MS0A, ACP-MS0 through ACP-MS8
**Target**: Build the automation layer that turns PRISM's hooks, scripts, slash commands, session systems, and product bundles into a coherent, safe, high-autonomy control plane for both software-building workflows and flagship PRISM workflows
**Approach**: Inventory -> Map Chains -> Wire Entry -> Guard Execution -> Preserve State -> Launch Product Flows -> Measure -> Gate

---

## Problem Statement

PRISM already has strong automation ingredients:

- a large slash-command surface
- existing hook definitions and cadence behavior
- many core scripts for context, session, skill, orchestration, and recovery
- session continuity and compaction assets
- large external stores for skills, scripts, and hooks
- roadmap work already planned in the CCM and MXU tracks

What is missing is the **control plane**:

- one machine-readable chain map from event -> bundle -> script -> guard -> memory -> telemetry
- one entry-router for prompts, slash commands, and session starts
- one execution-guard layer for coding/build tasks and product workflows
- one continuity layer for compaction, handoff, and durable memory promotion
- one set of product autopilots for the four flagship pillars

Without that layer, PRISM has many powerful automation primitives, but they remain partially manual, partially implicit, or spread across unrelated files.

---

## Why This Roadmap Is Separate

This roadmap is intentionally narrower than the other new roadmap created today.

- [2026-03-25-mcp-max-utilization-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-mcp-max-utilization-roadmap-design.md) defines the broad utilization operating model
- [CCM-MS0.json](/C:/PRISM/mcp-server/data/milestones/CCM-MS0.json) defines low-level Claude Code hook event expansion
- [CCM-MS1.json](/C:/PRISM/mcp-server/data/milestones/CCM-MS1.json) defines prompt/agent/HTTP hook type modernization

ACP is the build roadmap that tells the main chat:

- how to turn those lower-level pieces into one automation system
- which chains to build first
- where to put the new files
- how to test each chain
- how to preserve safety and truth while increasing autonomy

---

## Existing Foundations To Reuse

This roadmap assumes the implementation will reuse, not bypass, the current base:

### Slash-command layer

- [autopilot-full.md](/C:/Users/Admin.DIGITALSTORM-PC/.claude/commands/autopilot-full.md)
- [boot.md](/C:/Users/Admin.DIGITALSTORM-PC/.claude/commands/boot.md)
- [forge.md](/C:/Users/Admin.DIGITALSTORM-PC/.claude/commands/forge.md)
- [context-integrity.md](/C:/Users/Admin.DIGITALSTORM-PC/.claude/commands/context-integrity.md)

### Hook and script layer

- [HOOK_DEFINITIONS_v20.md](/C:/PRISM/mcp-server/data/docs/HOOK_DEFINITIONS_v20.md)
- [SCRIPT_INDEX.json](/C:/PRISM/mcp-server/data/docs/SCRIPT_INDEX.json)
- [master_orchestrator_v2.py](/C:/PRISM/scripts/core/master_orchestrator_v2.py)
- [mcp_orchestrator.py](/C:/PRISM/scripts/core/mcp_orchestrator.py)
- [skill_loader.py](/C:/PRISM/scripts/core/skill_loader.py)
- [skill_preloader.py](/C:/PRISM/scripts/core/skill_preloader.py)
- [context_monitor.py](/C:/PRISM/scripts/core/context_monitor.py)
- [context_compressor.py](/C:/PRISM/scripts/core/context_compressor.py)
- [next_session_prep.py](/C:/PRISM/scripts/core/next_session_prep.py)
- [resume_validator.py](/C:/PRISM/scripts/core/resume_validator.py)
- [workflow_tracker.py](/C:/PRISM/scripts/core/workflow_tracker.py)
- [learning_store.py](/C:/PRISM/scripts/core/learning_store.py)

### Continuity and token layer

- [TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md](/C:/PRISM/mcp-server/data/docs/TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md)
- [SESSION_HANDOFF.md](/C:/PRISM/mcp-server/data/docs/SESSION_HANDOFF.md)
- [COMPACTION_SNAPSHOT.md](/C:/PRISM/mcp-server/data/docs/COMPACTION_SNAPSHOT.md)
- [DECISIONS_LOG.md](/C:/PRISM/mcp-server/data/docs/DECISIONS_LOG.md)

ACP should compose these pieces into chains instead of building parallel machinery.

---

## What ACP Must Deliver

ACP succeeds only if PRISM gains the following:

### 1. Entry Automation

Prompt, session, and slash-command entry points should automatically:

- classify the task
- load the right bundle
- hydrate the right context
- attach the right guards

### 2. Execution Automation

During work, the system should automatically:

- route to the right scripts and skills
- enforce safety and quality gates
- recommend or run targeted validation
- preserve context discipline

### 3. Continuity Automation

The system should automatically:

- survive compaction
- preserve WIP
- create handoff packages
- promote durable memory

### 4. Product Automation

The system should provide chainable autopilots for:

- speed/feed
- ultimate post
- print-to-program
- ERP/quote/business flows

### 5. Telemetry Automation

The system should automatically record:

- which chains fired
- which bundles were effective
- where token cost was saved or wasted
- where the automation drifted from reality

---

## Required Design Rules

### 1. Human-Gated Autonomy Rule

ACP should automate as much as possible, but keep human gates for:

- destructive git operations
- irreversible filesystem operations
- customer-facing capability claims
- safety-critical machining outputs

### 2. Chain Registry Rule

No automation chain should exist only in prose.
Every chain must be represented in a machine-readable registry.

### 3. Bundle-First Rule

Automation should operate on bundles, not isolated assets.
Every chain should resolve:

- task class
- bundle id
- assets to load
- guards to enable
- memories to hydrate
- telemetry to capture

### 4. Fail-Closed Rule

If the chain cannot classify or verify safely, it must downgrade to:

- suggestion only
- warning only
- manual mode

It must not silently pretend automation worked.

### 5. Compaction-Safe Rule

Every long-running automation path must write enough state to survive compaction or session interruption.

### 6. Reuse-First Rule

ACP should prefer:

- existing slash commands
- existing core scripts
- existing hook handlers
- existing digests and indexes

before inventing new components.

---

## Mandatory Document Lookup Order

The main chat should read these in order before building ACP.

### 1. System and path orientation

Read:

- `data/docs/MASTER_INDEX.md`
- `data/docs/MASTER_INDEX_COMPACT.md`
- `data/docs/PATH_INDEX.md`
- `data/docs/CODE_SYSTEM_INDEX.md`

### 2. Automation foundations

Read:

- `data/docs/HOOK_DEFINITIONS_v20.md`
- `data/docs/SCRIPT_INDEX.json`
- `data/docs/TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md`
- `data/docs/SESSION_HANDOFF.md`
- `data/docs/COMPACTION_SNAPSHOT.md`
- `data/docs/DECISIONS_LOG.md`

### 3. Existing roadmap dependencies

Read:

- `docs/superpowers/specs/2026-03-25-mcp-max-utilization-roadmap-design.md`
- `data/milestones/CCM-MS0.json`
- `data/milestones/CCM-MS1.json`

### 4. Live entrypoints

Read:

- `C:\Users\Admin.DIGITALSTORM-PC\.claude\commands\boot.md`
- `C:\Users\Admin.DIGITALSTORM-PC\.claude\commands\forge.md`
- `C:\Users\Admin.DIGITALSTORM-PC\.claude\commands\autopilot-full.md`
- `C:\Users\Admin.DIGITALSTORM-PC\.claude\commands\context-integrity.md`

### 5. Live core script roots

Inspect:

- `C:\PRISM\scripts\core`
- `C:\PRISM\data\hooks`
- `src/hooks/`
- `src/tools/dispatchers/`
- `state/`

---

## Main Chat Build Protocol

This section is written for the main chat that will execute ACP.

1. Build one milestone at a time.
2. Never implement two chain families in one unchecked batch.
3. Start from event-entry chains before product autopilots.
4. Reuse existing primitives whenever they satisfy 80% or more of the need.
5. Create machine-readable chain definitions before wiring automation code.
6. After every chain build:
   - run targeted validation
   - run scrutiny loop
   - write handoff and chain-state artifacts
7. Do not widen ACP into general platform work.

---

## Scrutiny Loop

Every ACP milestone uses this same loop.

### Pass 1. Chain Correctness

Check:

- does the event fire
- does the right chain resolve
- do the right assets load

### Pass 2. Safety and Downgrade Behavior

Check:

- do dangerous or ambiguous conditions downgrade cleanly
- are human gates preserved

### Pass 3. Token and Context Cost

Check:

- does the automation reduce or inflate context cost
- is it digest-first
- is it compaction-safe

### Pass 4. Memory and Telemetry

Check:

- does the chain persist the right facts
- does it avoid polluting durable memory
- does it emit useful telemetry

### Pass 5. Workflow Impact

Check:

- does the chain measurably improve developer or product workflow quality

Only advance after all five passes are acceptable.

---

## Compaction Points

The main chat must flush state whenever:

- more than 5 files are edited in one chain family
- a new event hook is wired
- a new registry/config file is created
- a chain touches both repo files and `~/.claude` files
- a product autopilot slice completes

At each compaction point, refresh:

- `state/ACP-MS*/position.md`
- `state/ACP-MS*/chain-registry.json`
- `state/ACP-MS*/scrutiny/pass-0N.md`
- `data/docs/SESSION_HANDOFF.md` when pausing
- `data/docs/DECISIONS_LOG.md` for architectural decisions

---

## File Creation Rules

Preferred locations for ACP artifacts:

- `docs/superpowers/specs/`
- `data/docs/`
- `data/milestones/` only after roadmap approval
- `state/ACP-MS*/`
- `C:\PRISM\scripts\core\`
- `C:\Users\Admin.DIGITALSTORM-PC\.claude\hooks\`
- `C:\Users\Admin.DIGITALSTORM-PC\.claude\commands\`

Preferred new machine-readable files:

- `data/docs/ACP_CHAIN_REGISTRY.json`
- `data/docs/ACP_COMMAND_CHAIN_MAP.json`
- `data/docs/ACP_EVENT_CHAIN_MAP.json`
- `data/docs/ACP_AUTOMATION_GATES.md`
- `data/docs/ACP_TELEMETRY_SCHEMA.json`

---

## Milestone Map

### ACP-MS0A — Automation Contract and Chain Schema

**Goal**

Define the canonical schema for automation chains, downgrade modes, gates, and telemetry.

**Step-by-step**

1. Define the automation-chain JSON schema.
2. Define event-to-chain mapping rules.
3. Define command-to-chain mapping rules.
4. Define downgrade and fail-closed behavior.
5. Define telemetry event schema.

**Deliverables**

- `data/docs/ACP_CHAIN_SCHEMA.md`
- `data/docs/ACP_AUTOMATION_GATES.md`
- `data/docs/ACP_TELEMETRY_SCHEMA.json`

**Exit criteria**

- later ACP milestones can register chains consistently

---

### ACP-MS0 — Existing Automation Census and Gap Map

**Goal**

Map the current slash commands, hooks, scripts, and chain fragments into one control-plane inventory.

**Step-by-step**

1. Inventory slash commands and classify them by workflow.
2. Inventory current hook definitions and planned hook work from CCM.
3. Inventory core scripts by purpose.
4. Identify which workflows already have partial chains.
5. Identify missing chain links and duplicate logic.

**Deliverables**

- `data/docs/ACP_AUTOMATION_CENSUS_2026-03-25.md`
- `data/docs/ACP_CHAIN_REGISTRY.json`
- `data/docs/ACP_GAP_MATRIX.md`

**Exit criteria**

- the system knows what automation already exists and where the missing links are

---

### ACP-MS1 — Entry Router: Prompt, Session, and Command Activation

**Goal**

Build the layer that decides what bundle and chain to activate at the moment work begins.

**Step-by-step**

1. Wire or align `UserPromptSubmit`, `SessionStart`, and slash-command entry.
2. Build a task classifier:
   - backend coding
   - web coding
   - CAD/Python
   - roadmap/spec
   - audit/review
   - speed/feed
   - post
   - print-to-program
   - ERP/quote
3. Map each class to a bundle id.
4. Resolve bundle assets:
   - skills
   - scripts
   - digests
   - tests
   - memories
5. Attach the right downstream chain ids.

**Deliverables**

- `C:\PRISM\scripts\core\capability_router.py`
- `C:\PRISM\scripts\core\bundle_loader.py`
- `data/docs/ACP_COMMAND_CHAIN_MAP.json`
- `data/docs/ACP_EVENT_CHAIN_MAP.json`

**Exit criteria**

- the system can auto-select the right chain and bundle at entry time

---

### ACP-MS2 — Coding and Build Guard Chain

**Goal**

Automate the software-engineering workflow around implementation, testing, and review.

**Step-by-step**

1. Wire entry bundles for coding tasks.
2. Add pre-tool guards for routing and safety.
3. Add post-tool chains for:
   - code quality review
   - test impact analysis
   - schema/wiring validation
   - targeted build/test recommendation
4. Keep human approval for destructive actions.
5. Make slash commands chain into this control plane instead of bypassing it.

**Deliverables**

- `C:\PRISM\scripts\core\build_chain_runner.py`
- `C:\PRISM\scripts\core\test_impact_router.py`
- `data/docs/ACP_CODING_CHAIN.md`

**Exit criteria**

- coding workflows become guided, validated, and compaction-safe

---

### ACP-MS3 — Context, Compaction, and Handoff Chain

**Goal**

Automate continuity before, during, and after context pressure.

**Step-by-step**

1. Align `PreCompact`, `PostCompact`, `SessionEnd`, and session-boot recovery.
2. Add explicit chain-state serialization.
3. Add context-trim rules by bundle class.
4. Add handoff package generation and validation.
5. Add recovery quality scoring.

**Deliverables**

- `C:\PRISM\scripts\core\chain_state_persist.py`
- `C:\PRISM\scripts\core\memory_handoff_builder.py`
- `data/docs/ACP_CONTINUITY_CHAIN.md`

**Exit criteria**

- ACP chains survive compaction and session boundaries reliably

---

### ACP-MS4 — Durable Memory Promotion Chain

**Goal**

Automate what gets remembered, where it is stored, and how it is retrieved later.

**Step-by-step**

1. Define memory classes for ACP.
2. Add post-tool and session-end promotion rules.
3. Distinguish:
   - temporary notes
   - durable decisions
   - reusable workflow patterns
   - benchmark data
   - failure signatures
4. Add retrieval hooks for future matching tasks.
5. Prevent noisy over-promotion.

**Deliverables**

- `C:\PRISM\scripts\core\memory_promoter.py`
- `C:\PRISM\scripts\core\memory_retriever.py`
- `data/docs/ACP_MEMORY_CHAIN.md`

**Exit criteria**

- automation improves continuity without polluting memory

---

### ACP-MS5 — Product Autopilots

**Goal**

Build controlled automation chains for the four flagship PRISM product pillars.

**Step-by-step**

1. Create a chain for speed/feed.
2. Create a chain for ultimate post.
3. Create a chain for print-to-program.
4. Create a chain for ERP/quote/business flows.
5. Attach the right product-specific guards and memory rules.
6. Ensure each autopilot can downgrade to assisted mode.

**Deliverables**

- `C:\PRISM\scripts\core\product_pillar_launcher.py`
- `data/docs/ACP_SPEED_FEED_CHAIN.md`
- `data/docs/ACP_POST_CHAIN.md`
- `data/docs/ACP_PRINT_TO_PROGRAM_CHAIN.md`
- `data/docs/ACP_ERP_CHAIN.md`

**Exit criteria**

- flagship product flows have intentional automation, not scattered manual steps

---

### ACP-MS6 — Surface Sync and Capability Exposure Chain

**Goal**

Automate the sync between working capability and the surfaces that should expose it.

**Step-by-step**

1. Detect capabilities that are live but under-exposed.
2. Check for surface presence across:
   - dispatcher
   - MCP prompt/resource/completion
   - route/API
   - UI
   - docs
3. Emit gaps and recommended exposure actions.
4. Add chain hooks to update exposure registries after major capability changes.

**Deliverables**

- `C:\PRISM\scripts\core\surface_sync_auditor.py`
- `data/docs/ACP_SURFACE_SYNC_MATRIX.json`
- `data/docs/ACP_EXPOSURE_GAPS.md`

**Exit criteria**

- high-value capability no longer disappears into one narrow surface

---

### ACP-MS7 — Telemetry, Drift Detection, and Self-Tuning

**Goal**

Measure automation effectiveness and catch drift before it becomes technical debt.

**Step-by-step**

1. Add chain-fire telemetry.
2. Add bundle-hit and script usefulness metrics.
3. Add drift checks between chain registry and live files.
4. Add tuning rules for noisy or low-value chains.
5. Add dashboard-friendly outputs.

**Deliverables**

- `C:\PRISM\scripts\core\chain_telemetry.py`
- `C:\PRISM\scripts\core\chain_drift_detector.py`
- `data/docs/ACP_METRICS.md`

**Exit criteria**

- ACP becomes measurable and tunable, not a black box

---

### ACP-MS8 — Rollout, Safety Gates, and Main-Chat Operating Procedure

**Goal**

Package ACP so the main chat can build and operate it safely over time.

**Step-by-step**

1. Define rollout order for chain families.
2. Define kill switches and downgrade switches.
3. Define testing protocol per chain family.
4. Define maintenance protocol for `~/.claude` assets and repo assets.
5. Define the main-chat implementation playbook.

**Deliverables**

- `data/docs/ACP_ROLLOUT_PLAN.md`
- `data/docs/ACP_KILL_SWITCHES.md`
- `data/docs/ACP_MAIN_CHAT_PLAYBOOK.md`

**Exit criteria**

- the main chat can build ACP incrementally without destabilizing the platform

---

## Recommended Build Order

The main chat should execute in this order:

1. `ACP-MS0A`
2. `ACP-MS0`
3. `ACP-MS1`
4. `ACP-MS2`
5. `ACP-MS3`
6. `ACP-MS4`
7. `ACP-MS5`
8. `ACP-MS6`
9. `ACP-MS7`
10. `ACP-MS8`

Reason:

- define the schema first
- map the current automation second
- solve entry routing before execution chains
- solve continuity before scaling product autopilots
- measure and gate only after the control plane exists

---

## Validation Stack

Each milestone must specify exact commands, but ACP normally validates with:

1. targeted syntax checks for hook handlers and scripts
2. targeted TypeScript validation for touched repo files
3. chain simulation or dry-run tests
4. compaction and recovery simulation
5. telemetry sanity checks

Do not rely on a vague "it seems wired" standard.

---

## Success Criteria

ACP is successful only if:

- prompt, session, and slash-command entry points can activate the right bundles automatically
- coding/build tasks receive the right guards and test-routing help
- compaction and handoff are chain-aware
- durable memory promotion is intentional and useful
- flagship product workflows gain safe autopilot chains
- capability exposure gaps can be detected automatically
- automation drift is measurable and correctable

---

## Non-Goals

ACP does not replace:

- CCM low-level event and hook-type expansion
- MXU broad utilization governance
- product feature roadmaps
- engine integrity remediation

ACP is the control-plane roadmap that operationalizes those tracks.

---

## Next-Step Recommendation

After this spec is reviewed, the next implementation artifacts should be:

1. `data/milestones/ACP-MS0A.json` through `data/milestones/ACP-MS8.json`
2. `data/docs/ACP_CHAIN_REGISTRY.json`
3. `state/ACP-MS0A/` bootstrap state artifacts
4. the first version of `capability_router.py` and `bundle_loader.py`

Do not overwrite the MXU or CCM documents when starting ACP work.
