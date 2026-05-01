SESSION HANDOFF — ROADMAP v14.3 PRODUCTION
CONTEXT
I'm uploading two files:

roadmap-v14_2_1.zip — The current PRISM roadmap (33 files, ~20K lines)
CLAUDE_CODE_BRIEFING_FOR_PRISM.md — A Claude Code capabilities briefing mapping native CC features to PRISM needs

In the previous chat (which had container failures), a full assessment was completed. Your job is to extract the zip, apply all changes below directly to the files, and produce a v14.3 zip. No planning discussion needed — the plan is final. Execute it.
YOUR ROLE
Principal Systems Architect. Preference: don't narrate your thought process, just get the work done. If you find issues, fix them or add to a todo list. Lives depend on correctness — a single misstep can cause tool explosions and operator injuries. Zero tolerance for placeholders or shortcuts.
SAFETY INVARIANTS (never violate)

S(x) ≥ 0.70 is a HARD BLOCK for all safety calculations
Ω ≥ 0.70 indicates release readiness
All values must include uncertainty bounds (AtomicValue schema)
No bare numbers anywhere
Build command: npm run build (NEVER standalone tsc — causes OOM)
Anti-regression: new content must always be ≥ old content


CHANGES TO APPLY (10 files + 2 new items)
CHANGE 1: PRISM_PROTOCOLS_CORE.md — Replace static role with dynamic Role + Environment + Model table
Find the current role assignment section and replace it with this complete table. Every phase now declares WHO you are, WHERE you work, and WHAT model tier to use:
## PHASE EXECUTION CONTEXT — ROLE + ENVIRONMENT + MODEL

Each phase declares its execution context. This determines response depth,
technical vocabulary, quality gate emphasis, risk tolerance, AND tooling.

| Phase | Role | Environment | Model Strategy | Parallel Opportunities |
|-------|------|-------------|----------------|----------------------|
| DA | DevOps Engineer | Claude Code (100%) | Sonnet | None — sequential config |
| R1 | Data Architect | Claude Code (80%) + MCP (20%) | Haiku explore → Sonnet normalize → Opus schema design | MS5+MS6+MS7 concurrent (3 subagents). MS8 fans across 5 agents (32 formulas each) |
| R2 | Safety Systems Engineer | Hybrid: Code (benchmarks) + MCP (Ralph validation) | Sonnet harness → Opus safety review | 50-calc benchmark fans across 5 subagents. 29 safety tests as background batch |
| R3 | Principal Systems Architect | Hybrid: Code (batch campaigns) + MCP (action design) | Sonnet implement → Opus integration design | Data campaigns via background agents. Action design sequential in MCP |
| R4 | Platform Engineer | Claude Code (90%) | Sonnet throughout. Opus at gate only | Multi-file refactoring — standard Code workflow |
| R5a | Frontend Engineer | Claude Code (100%) | Sonnet | Parallel with R4 |
| R5b | Product Designer | Hybrid: MCP (UX design) + Code (implement) | Sonnet | After R4+R5a |
| R6 | Site Reliability Engineer | Claude Code (80%) + MCP (gates) | Sonnet implement → Opus fault analysis | After R8. 10 fault injection tests |
| R7 | Applied Research Engineer | Hybrid: Code (catalog extraction) + MCP (physics design) | Haiku parse → Sonnet wire → Opus physics modeling | R7-MS6 catalog extraction: background agents parallel across manufacturer catalogs. Main session does R7-MS0 coupled physics simultaneously |
| R8 | Product Architect | Claude.ai MCP (80%) + Code (20%) | Opus architecture → Sonnet skill creation | 22 app skills can batch-create in Code |
| R9 | Integration Architect | Claude Code (90%) | Sonnet | Protocol adapters are independent — parallelizable |
| R10 | CTO / Visionary | Claude.ai MCP (100%) | Opus | Pure strategic design — no implementation |
| R11 | Product Engineer | Claude Code (70%) + MCP (30%) | Sonnet packaging → Opus product architecture | SFC, PPG, Shop Manager, ACNC as independent streams |
| Cross-cutting | Principal Systems Architect | Claude.ai MCP | Opus | Roadmap maintenance, gap analysis, dependency management |

### Execution Environment Decision Tree
- Write/test/fix loops or batch processing → Claude Code
- Design/planning/validation/phase gates → Claude.ai MCP
- Both needed → Hybrid, with explicit handoff points documented in phase file
- Safety calculations → ALWAYS through MCP (server-side validation)
- Build verification → ALWAYS through Claude Code hooks (deterministic)
- Registry loading → Prefer Code for parallelism, MCP for validation

### Cost Model (inform session planning)
- Haiku: 1x baseline (exploration, grep, file reading)
- Sonnet: 3x (implementation, normalization, testing)
- Opus: 15x (safety review, architecture, physics, phase gates)
- Impact: R1 is cheap (mostly Haiku/Sonnet). R7 coupled physics is expensive (Opus).
  You can fit ~3x more R1 work into a session budget than R7 work.
CHANGE 2: PRISM_MASTER_INDEX.md — Add Execution line to each phase summary
In each phase summary block, add an Execution: line after the existing metadata:

DA section: Execution: Claude Code 100% | Sonnet | 1 session
R1 section: Execution: Claude Code 80% + MCP 20% | Haiku→Sonnet→Opus | Parallel: MS5+MS6+MS7
R2 section: Execution: Hybrid Code+MCP | Sonnet→Opus | Parallel: 5-agent benchmark fan
R3 section: Execution: Hybrid Code+MCP | Sonnet→Opus | Background: data campaigns
R4 section: Execution: Claude Code 90% | Sonnet | Opus at gate
R5a section: Execution: Claude Code 100% | Sonnet | Parallel with R4
R5b section: Execution: Hybrid MCP+Code | Sonnet | After R4+R5a
R6 section: Execution: Claude Code 80% + MCP 20% | Sonnet→Opus | After R8
R7 section: Execution: Hybrid Code+MCP | Haiku→Sonnet→Opus | Background: catalog extraction
R8 section: Execution: Claude.ai MCP 80% + Code 20% | Opus→Sonnet
R9 section: Execution: Claude Code 90% | Sonnet
R10 section: Execution: Claude.ai MCP 100% | Opus | Vision-phase
R11 section: Execution: Claude Code 70% + MCP 30% | Sonnet→Opus

CHANGE 3: DA Phase — Complete Rewrite
Replace the current DA phase content with these 5 concrete milestones:
## DA: DEVELOPMENT ACCELERATION (1 session)
Role: DevOps Engineer | Environment: Claude Code 100% | Model: Sonnet
Gate: Ω ≥ 0.70 | All 5 subagents respond, 5 commands execute, 15 skills auto-load,
      hooks fire on edit/bash, E2E test passes, Claude Code operational

### DA-MS0: CLAUDE.md Hierarchy (1 hour)
Create root CLAUDE.md at project root containing:
- Core laws: S(x)≥0.70 hard block, Ω≥0.70 release ready
- Current position: phase, milestone, active subtask
- Build commands: npm run build (NEVER standalone tsc — OOM at current scale)
- Registry counts: materials 3518, machines 824, tools (pending), alarms 9200+
- Safety rules: no bare numbers, uncertainty bounds required on all values
- Key file locations: MASTER_INDEX.md, wiring registries (D2F, F2E, E2S), state files
- Code conventions: TypeScript patterns, import style, test structure

Create nested CLAUDE.md files:
- src/engines/CLAUDE.md — Engine conventions, AtomicValue schema requirement,
  force/power calculation patterns, uncertainty propagation rules
- src/dispatchers/CLAUDE.md — Dispatcher patterns, parameter normalization,
  action routing, effort tier mapping

WHY: Replaces ~80% of manual session boot protocol. Claude Code auto-loads
these every session — no manual context injection needed.

VERIFY: Start new Claude Code session, confirm it knows S(x) threshold,
build command, and current phase without being told.

### DA-MS1: Subagents with Persistent Memory (1 hour)
Create 5 subagent definition files at ~/.claude/agents/:

1. prism-safety-reviewer.md
   - Model: Opus | Memory: project | Tools: Read, Grep, Glob, Bash
   - Context: S(x)≥0.70 hard block. Check all calcs against CALC_BENCHMARKS.json.
     Update memory with calculation failure patterns across sessions.

2. prism-registry-expert.md
   - Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
   - Context: Manages 3518 materials, 824 machines, tools, 9200+ alarms,
     500 formulas, 697 strategies. Knows schemas. Updates memory with
     data quality patterns discovered during loading.

3. prism-architect.md
   - Model: Opus | Memory: project | Tools: Read, Write, Grep, Glob, Bash
   - Context: Principal Systems Architect. Tracks design decisions with rationale.
     Consults wiring registries (D2F, F2E, E2S) before new implementations.
     Updates memory with architectural decisions across sessions.

4. prism-test-runner.md
   - Model: Sonnet | Memory: project | Tools: Read, Bash, Glob
   - Context: Runs test suites, regression checks, benchmark validation.
     Tracks test coverage and failure history in memory.

5. prism-data-validator.md
   - Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
   - Context: Validates registry data quality — schema compliance, completeness,
     cross-reference integrity. Quarantines bad records with reason codes.

WHY: Persistent memory replaces HANDOFF.md and COMPACTION_SNAPSHOT.md.
The safety reviewer accumulates knowledge about which calculations fail
and why. The architect remembers design decisions without handoff files.

VERIFY: Invoke each subagent with a test query. End session. Start new session.
Ask subagent to recall the test query result. If it remembers → PASS.

### DA-MS2: Slash Commands (30 minutes)
Create 5 command files at ~/.claude/commands/:

1. /boot (boot.md) — Load CURRENT_POSITION.md, identify active phase, load phase doc,
   check for HANDOFF.md, plan session. Report: current MS, next 3 steps, blockers,
   estimated session scope.

2. /gate (gate.md) — Run phase gate check: verify all milestone criteria met,
   run npm run build, check test suite, report Omega estimate, list unresolved findings.

3. /checkpoint (checkpoint.md) — Save state: update CURRENT_POSITION.md with active
   subtask, append ROADMAP_TRACKER.md with progress, write session notes to HANDOFF.md,
   run npm run build to verify clean state.

4. /plan (plan.md) — Read current phase doc, identify next milestone, break into steps,
   estimate effort per step, identify parallelizable work, propose session plan with
   model tier recommendations.

5. /build (build.md) — Run npm run build, parse output, report errors with file:line,
   suggest fixes for common patterns. NEVER run standalone tsc.

WHY: Replaces manual multi-step session protocols. One keystroke instead of 9 steps.

VERIFY: Execute each command in sequence. /boot should report current position.
/plan should produce actionable steps. /build should succeed or report errors.

### DA-MS3: Skill Conversion (2 hours)
Convert top 15 skills from skills-consolidated/ to .claude/skills/ SKILL.md format
with YAML frontmatter (name, description fields). Priority order:

1. cutting-parameters (Kienzle, chip thinning, speed/feed)
2. material-selection (ISO groups, machinability, substitution)
3. safety-validation (S(x) computation, force limits, breakage risk)
4. toolpath-strategy (697 strategies, feature matching)
5. threading (tap drill, thread milling, engagement calc)
6. surface-finish (Ra/Rz prediction, parameter influence)
7. chip-control (chip breaking, evacuation, morphology)
8. workholding (clamping force, fixture validation)
9. coolant (flood/MQL/high-pressure selection, concentration)
10. tool-life (Taylor equation, wear prediction, cost optimization)
11. wear-analysis (flank/crater/notch patterns, countermeasures)
12. alarm-diagnosis (9200+ codes, root cause, resolution)
13. machine-capability (envelope, spindle, axis limits)
14. controller-programming (Fanuc/Haiku/Siemens/Okuma G-code patterns)
15. tolerance-analysis (IT grades, process capability, stack-up)

WHY: Claude Code auto-loads skills when it detects relevance. Replaces W2.5
pressure-adaptive injection system. Skills load on-demand, not by pressure threshold.
Hot-reloading means saving a skill file updates the running session immediately.

VERIFY: Start a conversation about cutting parameters without mentioning the skill.
Claude Code should auto-load cutting-parameters.md. If it doesn't → skill description
needs improvement.

### DA-MS4: Deterministic Hook Configuration (30 minutes)
Add to .claude/settings.json:

PostToolUse hooks:
- Matcher: "Edit" → command: "npm run build 2>&1 | tail -5"
  (Every file edit triggers a build — catch breaks immediately)

PreToolUse hooks:
- Matcher: "Bash" → command: "node scripts/validate-safety-score.js"
  (Every bash execution checks safety score context)

Additional hooks to configure:
- Pre-file-write: Anti-regression check (verify file exists, create backup)
- Post-session: Auto-write checkpoint to CLAUDE.md

WHY: These are DETERMINISTIC — Claude Code cannot skip, forget, or decide otherwise.
Unlike prompt-based MCP hooks which are probabilistic, these ALWAYS fire.
Development process hooks become guaranteed. Manufacturing calculation hooks
still run server-side via MCP for safety.

VERIFY: Edit any .ts file. Build should auto-run within 2 seconds.
If build fails, the error should appear in the session immediately.

### DA-MS5: End-to-End Integration Test (1 hour)
Execute this exact sequence:
1. /boot → should report current position, phase, next steps
2. Pick a small R1 task (e.g., validate one material file schema)
3. Invoke registry-expert subagent for schema guidance
4. Make an edit → verify post-edit build hook fires
5. /checkpoint → should save state to all 3 files
6. /compact → should summarize and free context
7. Resume → /boot again → should pick up exactly where checkpoint left off
8. Spawn 3 parallel subagents on 3 independent file validation tasks
9. Verify all 3 complete and results merge correctly
10. End session. Start new session. Verify subagent memory persists.

EXIT GATE: ALL of the following must pass:
□ CLAUDE.md loads automatically (no manual injection)
□ All 5 subagents respond correctly to domain queries
□ All 5 slash commands execute without error
□ At least 10/15 skills auto-load when relevant topics arise
□ Post-edit hook fires build within 2 seconds
□ Parallel subagents complete independent tasks correctly
□ Subagent memory persists across session boundary
□ /checkpoint → /compact → /boot cycle preserves state
□ Ω ≥ 0.70 for DA phase

FAILURE PROTOCOL: If any check fails, fix the specific config file and re-test
that check. Do not proceed to R1 until all checks pass.
CHANGE 4: PHASE_R1_REGISTRY.md — Add parallel execution instructions
At the top of R1, after the phase summary, add:
### EXECUTION MODEL
Environment: Claude Code 80% + Claude.ai MCP 20%
Model: Haiku (file exploration, grep) → Sonnet (normalization scripts) → Opus (schema design decisions only)

PARALLEL EXECUTION:
- MS5 (tool normalization), MS6 (material enrichment), MS7 (machine population)
  are independent data targets → spawn 3 parallel subagents, one per registry
- MS8 (formula classification of 162 zero-coverage formulas) → fan across 5 subagents
  at ~32 formulas each
- Use registry-expert subagent for all schema decisions
- Background agents handle batch loads > 500 files while main session reviews results
- Haiku subagents for file exploration/grep (cheap, fast)
- Sonnet for normalization script writing and execution
- Opus ONLY for the 85-param tool holder schema design decision (R1-MS5)
CHANGE 5: PHASE_R2_SAFETY.md — Add benchmark fan-out instructions
At the top of R2, after the phase summary, add:
### EXECUTION MODEL
Environment: Hybrid — Claude Code (benchmark execution) + Claude.ai MCP (Ralph validation)
Model: Sonnet (test harness creation) → Opus (safety calculation review, failure classification)

PARALLEL EXECUTION:
- 50-calc benchmark matrix: fan across 5 subagents (10 materials each)
- 29 safety engine tests (from Superpower Phase 1): execute as background agent batch
- Main session handles ONLY failure analysis and Ralph validation loops
- Ralph validation requires API key and prism_ralph dispatcher → MUST use MCP
- safety-reviewer subagent accumulates failure patterns in persistent memory
CHANGE 6: PHASE_R3_CAMPAIGNS.md — Mark Code vs MCP milestones
At the top of R3, after the phase summary, add:
### EXECUTION MODEL
Environment: Hybrid — Claude Code (batch campaigns) + Claude.ai MCP (action design)
Model: Sonnet (implementation) → Opus (coupled action chain design, cross-system integration)

MILESTONE ENVIRONMENT MAP:
- MS0 (unit/tolerance intelligence): MCP — design session with Opus
- MS0.5 (formula registry integration): MCP — design session with Opus
- MS1 (action implementation): Claude Code — Sonnet, write/test/fix loops
- MS2 (action implementation continued): Claude Code — Sonnet
- MS3 (controller intelligence): Hybrid — Opus design in MCP, Sonnet implement in Code
- MS4 (batch data campaigns): Claude Code — background agents, parallel across material families

11 new action designs (job_plan, setup_sheet, wear_prediction, process_cost,
uncertainty_chain, strategy_for_job, strategy_compare, material_substitute,
machine_recommend, controller_optimize, what_if) use the MCP workflow:
brainstorm → plan → execute → validate via prism_sp dispatcher.
CHANGE 7: PHASE_R7_INTELLIGENCE.md — Background agent instructions for catalog extraction
At the top of R7, after the phase summary, add:
### EXECUTION MODEL
Environment: Hybrid — Claude Code (catalog extraction, wiring) + Claude.ai MCP (physics design)
Model: Haiku (catalog parsing/grep) → Sonnet (wiring) → Opus (coupled physics modeling)

PARALLEL EXECUTION:
- R7-MS6 (catalog extraction): BACKGROUND AGENTS — this takes hours
  Fan across manufacturer catalog families:
  Agent 1: Sandvik catalogs
  Agent 2: Kennametal catalogs
  Agent 3: Seco/Dormer catalogs
  Agent 4: Iscar catalogs
  Agent 5: Walter/Mitsubishi catalogs
  Use Haiku subagents for PDF parsing (cheap at volume)
  Main session works on R7-MS0 (coupled physics) SIMULTANEOUSLY

- R7-MS0 (coupled physics): Claude.ai MCP with Opus
  This is the highest-value intellectual work in the entire roadmap.
  Thermal-mechanical-tool wear coupling requires Opus-grade reasoning.
  Do NOT attempt with Sonnet — physics model design is not implementation.
CHANGE 8: SYSTEM_CONTRACT.md — Add Tool Environment Invariants section
Add this new section after the existing invariants:
## TOOL ENVIRONMENT INVARIANTS

### Safety-Critical Operations — MCP ONLY
The following operations MUST execute through Claude.ai MCP server-side validation.
Claude Code hooks are supplementary, not replacement:
- All S(x) safety score calculations
- Force/power/torque predictions with operator safety implications
- Tool breakage risk assessment
- Workholding validation
- Spindle protection checks
- Any calculation where S(x) < 0.70 triggers a HARD BLOCK

### Build Verification — Claude Code Hooks ONLY
The following operations MUST execute through deterministic Claude Code hooks:
- Post-edit build verification (npm run build)
- Anti-regression file backup before overwrites
- Safety score context validation before bash execution

### Registry Operations — Environment Preference
- Batch loading (>500 files): Prefer Claude Code for parallelism
- Schema validation: Either environment, prefer Code for speed
- Cross-registry integrity checks: Prefer MCP for dispatcher access
- Data quality quarantine: Either environment, log to shared location

### Model Tier Enforcement
- Safety calculations: Opus ONLY (never Haiku/Sonnet for S(x) computation)
- Phase gate reviews: Opus ONLY
- File exploration/grep: Haiku preferred (cost optimization)
- Implementation/normalization: Sonnet standard
- Architecture/physics design: Opus required
CHANGE 9: ROADMAP_INSTRUCTIONS.md — Add Claude Code decision tree
Add this section:
## CLAUDE CODE vs CLAUDE.AI DECISION TREE

When starting any task, determine execution environment FIRST:

1. Is this a write/test/fix loop or batch processing?
   → Claude Code. Use parallel subagents for independent work streams.

2. Is this design, planning, validation, or a phase gate?
   → Claude.ai MCP. Use prism_sp for brainstorm→plan→execute→validate.

3. Does it need BOTH implementation AND design?
   → Hybrid. Design in MCP first (Opus), implement in Code second (Sonnet).
   Document the handoff point in the phase file.

4. Is it a safety calculation?
   → ALWAYS MCP. Server-side validation is non-negotiable.

5. Is it a long-running batch (>500 items)?
   → Claude Code background agent. Main session continues other work.

6. Does it need Ralph validation or Omega computation?
   → Claude.ai MCP. Requires API key and prism_ralph/prism_omega dispatchers.

### Session Planning with Cost Awareness
- Haiku: 1x cost (exploration, grep, file reading) — use for R1 bulk work
- Sonnet: 3x cost (implementation, normalization, testing) — default for most work
- Opus: 15x cost (safety, architecture, physics, gates) — reserve for high-value decisions
- Budget impact: ~3x more R1 work fits in a session vs R7 coupled physics work
- Estimated savings vs all-Opus: 40-60% token cost reduction
CHANGE 10: CLAUDE_CODE_INTEGRATION.md — Expand to full execution guide
This file exists but is currently just a reference. Expand it to include:

The complete DA-MS0 through DA-MS5 milestones (from Change 3 above)
The per-phase environment declarations (from the table in Change 1)
The model switching strategy with cost model
The subagent definitions with full YAML examples
The slash command definitions with full markdown content
The hook configurations with full JSON
Plugin packaging instructions for R6 exit gate:
"Bundle all PRISM Claude Code configuration (skills, subagents, commands, hooks,
MCP server connection) as a distributable plugin. This enables onboard-new-team-members
capability and bridges to R11 product packaging."


TWO NEW ITEMS
NEW ITEM A: Cost Awareness in PRISM_PROTOCOLS_CORE.md
The roadmap currently has zero mention of token costs or model selection economics.
Add the Haiku 1x / Sonnet 3x / Opus 15x cost model to the protocols so every phase
has a cost profile for session planning.
NEW ITEM B: Plugin Packaging as R6 Exit Gate
Add to R6's exit criteria: "Package complete PRISM Claude Code configuration
(15+ skills, 5 subagents, 5 commands, hooks, MCP connection config) as a
distributable Claude Code plugin. Verify: fresh install of plugin on clean
machine produces working PRISM development environment within 5 minutes."

VERSION HEADER
Update ALL file version headers from v14.2 to v14.3.
In the version history section of MASTER_INDEX, add:
v14.3 (2026-02-16): Claude Code deep integration
  - Dynamic role + environment + model table replaces static role assignment
  - DA phase rewritten: 5 concrete milestones for Claude Code configuration
  - Every phase declares execution environment (Code/MCP/Hybrid)
  - Parallel execution instructions added to R1, R2, R3, R7
  - Cost model added (Haiku 1x → Sonnet 3x → Opus 15x)
  - Tool Environment Invariants added to SYSTEM_CONTRACT.md
  - Claude Code decision tree added to ROADMAP_INSTRUCTIONS.md
  - CLAUDE_CODE_INTEGRATION.md expanded from reference to execution guide
  - Plugin packaging added as R6 exit gate
  - Source: CLAUDE_CODE_BRIEFING_FOR_PRISM.md capability mapping

EXECUTION INSTRUCTIONS

Extract roadmap-v14_2_1.zip to /home/claude/roadmap/
Apply all 10 changes above directly to the files
Add the 2 new items
Update all version headers to v14.3
Verify anti-regression: wc -l before and after for every modified file (new ≥ old)
Package as roadmap-v14_3.zip
Present the zip + a diff summary showing lines changed per file