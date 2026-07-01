---
policy:
  tier: 3
  triggers:
    - "generate-roadmap"
composes_with:
  - "/action-help"
  - "/action-search"
  - "/calibrate"
  - "/forge-engines"
  - "/forge-triple"
  - "/forge-wiring"
  - "/navigate"
  - "/physics-verify"
  - "/playbook"
  - "/prism-review"
  - "/program-validate"
  - "/scrutinize"
  - "/test"
  - "/trace"
consumes:
  - "prism_session:auto_checkpoint"
  - "prism_session:context_boot"
  - "prism_session:dispatcher_map"
  - "prism_session:memory_save"
---
Generate a fully-detailed RGS-format roadmap from a brief.

> **PLANNING-LOOP-BRIDGE (RGS-PLANNING-LOOP-BRIDGE-MS0/MS1).** This skill is the P1 GENERATE stage. After generating the roadmap, hand off to the closed **plan -> build -> loop** (canonical detail: `/rgs6` PLANNING-LOOP-BRIDGE LAW): P2 plan-mode (vault-warm + master-graph dedup + per-unit `routeTask` substrate plan + `state/active-plan.json` gated by `enforce-plan-before-build.mjs`), P3 autonomous build (bypass is already the global default), P4 eval-fed loop (`loop-state next` -> `decidePlanningAction`). Substrates: Obsidian + Hermes + /system-viz + Ollama + PSN.

## Prerequisites
Load these skills before starting:
1. `prism_skill_script->skill_content(id="prism-roadmap-schema")` — understand the format
2. `prism_skill_script->skill_content(id="prism-roadmap-generator")` — follow the 7-stage pipeline
3. `prism_skill_script->skill_content(id="prism-roadmap-atomizer")` — decomposition rules

## Input
Capture the user's brief from $ARGUMENTS or ask for it if not provided.

## Advisor Strategy (`advisor_20260301`)
- **Executor**: Sonnet 4.6 (runs the 7-stage pipeline, generates roadmap structure)
- **Advisor**: Opus 4.6, `max_uses: 2`
- **When Sonnet should call advisor**: (1) after brief analysis — to validate scope, complexity assessment, and decomposition strategy, (2) after full generation — to scrutinize roadmap quality before output

## Execution
Execute the 7-stage pipeline:

1. **Brief Analysis** — Parse raw text into structured brief (goal, scope, constraints, domain, urgency, complexity, category). If ambiguous, ask clarifying questions.
2. **Codebase Audit** — Search existing assets: skills (250+), scripts (48), dispatchers (79), engines (1,304), algorithms (60+). Build leverage table. Use `prism_session:dispatcher_map` for live counts.
3. **Scope Estimation** — Classify complexity (S/M/L/XL), estimate phases, units, sessions, token cost.
4. **Phase Decomposition** — Break scope into ordered phases. Foundations before features. Each phase 1-3 sessions.
5. **Unit Population** — For EVERY unit, fill ALL mandatory schema fields: role (R1-R8), model, effort, steps with tool calls, entry/exit conditions, rollback, deliverables, index flags.
6. **Dependency Resolution** — Validate DAG (no cycles), resolve tool/skill references, build tool_map + role_matrix + dependency_graph.
7. **Output Formatting** — Render markdown roadmap + position.json + scrutiny-log.json.

## MANDATORY SECTIONS IN EVERY GENERATED ROADMAP

Every roadmap MUST include these sections at the top (before any phase/milestone content):

### 1. MCP Full Utilization Protocol
```
## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

SESSION START:  prism_session:context_boot -> dispatcher_map -> memory_recall -> system_snapshot -> action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) -> action_search -> tool_route_best -> wip_capture
SESSION END:    prism_session:memory_save -> system_snapshot -> checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start -> write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

### 2. Enforcement & Knowledge Protocol
```
## ENFORCEMENT & KNOWLEDGE PROTOCOL

ENFORCEMENT HOOKS (fire automatically):
  - review-gate.sh: BLOCKS edits after 3 engine changes without /prism-review
  - enforce-auto-compact.py: WARN@15, URGENT@25, BLOCK@35 edits
  - PostToolUse stub detector: BLOCKS stub returns in engines
  - PostToolUse test quality: BLOCKS || true and bare .includes() in tests
  - enforce-constants-check.py: BLOCKS inline kc1.1/Taylor constants

SKILLS TO USE:
  /forge-engines, /forge-wiring, /prism-review, /test, /physics-verify,
  /program-validate, /calibrate, /playbook, /scrutinize, /trace,
  /forge-triple, /action-search, /action-help, /navigate
```

### 3. Exit Gate Template (per session/milestone)
Every exit gate MUST include:
- Measurable criteria with proof type (test_count, compilation, integration_pass)
- Rollback instruction (specific files + git commands)
- OMEGA_FLOOR quality threshold (>= 0.85)
- SVI/Psi delta target (baseline -> target %)
- Feature Cascade: NEW_HOOKS, NEW_ACTIONS, NEW_SKILLS built by this session
- Self-updating test count (AUTO, not frozen number)

### 4. Rollback Block (per unit)
Every unit MUST include:
- FILES_CREATED: [exact list]
- FILES_MODIFIED: [specific changes per file]
- ABORT_CRITERIA: [>= 3 measurable conditions]
- ROLLBACK_PROCEDURE: [specific git commands + verification]

### 5. Feature Cascade Block (per exit gate)
Every exit gate MUST include:
- NEW_HOOKS: [hook_name -> protection_scope]
- NEW_ACTIONS: [dispatcher:action_name -> consumer_intent]
- NEW_SKILLS: [/skill_name -> trigger_condition]
- REGISTRIES_UPDATED: [registry -> new_entry_count]
- AVAILABLE_TO: [downstream sessions that can now use these]

### 6. 4-LOOP Quality Protocol
Every unit follows: BUILD -> SCRUTINIZE -> GAP FILL -> TIE UP
Label as EXIT GATE (not "4-LOOP GATE" or "SESSION BOUNDARY")

### 7. Compaction Strategy
- /compact checkpoint after every 2-3 units or at milestone boundaries
- ESTIMATED_CONTEXT per session
- HANDOFF.md + COMPACTION_SURVIVAL references at each compact point

## Post-Generation Scrutiny (3-LOOP MANDATORY)

After generating the roadmap, run 3 scrutiny loops:

### Loop 1: Multi-Agent Review (10+ agents)
Launch parallel review agents with DISTINCT roles:
- Protocol Structure (SESSION blocks, field ordering)
- Unit Naming (U-XXX convention, domain prefixes)
- SMART CONFIG (role/model/effort/context_budget completeness)
- Exit Gate Rigor (measurability, rollback, omega_floor)
- Forge-Triple (per-unit hook+action+skill declarations)
- Physics Rigor (canonical constants, safety gating)
- Feature Cascade (self-update mechanism, tool propagation)
- Dependency Graph (DAG consistency, no cycles)
- MCP Utilization (session actions referenced, plugins listed)
- Cross-Roadmap Coherence (authority, ownership, status)
Each agent scores 0-100. Average must be >= 70 to proceed.

### Loop 2: Focused Fix
Target the 3 worst-scoring dimensions from Loop 1.
Launch deep-scrutiny agents to produce fix templates.
Apply fixes to the generated roadmap.

### Loop 3: Verification
Re-score after fixes. All dimensions must be >= 60.
If any dimension still < 60, iterate Loop 2 again.

## Model Selection
- Use Opus for stages 1, 4, 5 (analysis, decomposition, population)
- Use Sonnet for stages 2, 3, 6 (audit, estimation, resolution)
- Use Haiku for stage 7 (formatting) and Loop 1 review agents

## Output Files (Modular)
For each milestone generated:
- Envelope: `H:\prism\mcp-server\data\milestones\{MILESTONE-ID}.json`
- Position: `H:\prism\mcp-server\data\state\{MILESTONE-ID}\position.json`
- Index entry added to: `H:\prism\mcp-server\data\roadmap-index.json`

Legacy (full roadmap markdown):
- Roadmap: `H:\prism\mcp-server\data\docs\roadmap\{ROADMAP-ID}-{slug}.md`
- Scrutiny log: `H:\prism\state\{roadmap-id}\scrutiny-log.json`

## Post-Generation
- Write each milestone envelope to `data/milestones/{MILESTONE-ID}.json`
- Update `data/roadmap-index.json` with new milestone entries
- Run 3-loop scrutinization (10+ agents per loop, fix all CRITICAL+HIGH+MEDIUM)
- Report: roadmap location, unit count, session estimate, scrutiny score
- Target Omega >= 1.0 for generated roadmap quality

## Validation
- Every unit must validate against roadmapSchema.ts
- Every deliverable must be produced by exactly one unit
- Every tool reference must resolve to an actual prism_* dispatcher (live counts from PRISM-INVENTORY-LATEST.md)
- Every skill reference must exist in skills-consolidated/
- No circular dependencies allowed
- MCP Utilization Protocol section MUST be present
- Enforcement Protocol section MUST be present
- Exit gates MUST be measurable with rollback
- Feature Cascade blocks MUST be present
