import os, re

BASE = r'C:\PRISM\mcp-server\roadmap_v14_3\roadmap-v14.2.1'

def read(f):
    with open(os.path.join(BASE, f), 'r', encoding='utf-8') as fh:
        return fh.read()

def write(f, content):
    with open(os.path.join(BASE, f), 'w', encoding='utf-8') as fh:
        fh.write(content)

def insert_after(content, marker, new_text):
    idx = content.find(marker)
    if idx == -1:
        raise ValueError(f"Marker not found: {marker[:60]}")
    end = content.find('\n', idx)
    return content[:end+1] + new_text + content[end+1:]

def insert_before(content, marker, new_text):
    idx = content.find(marker)
    if idx == -1:
        raise ValueError(f"Marker not found: {marker[:60]}")
    return content[:idx] + new_text + content[idx:]

# ===========================================================
# CHANGE 1: PRISM_PROTOCOLS_CORE.md — Phase Execution Context
# ===========================================================
print("CHANGE 1: PRISM_PROTOCOLS_CORE.md...")
pc = read('PRISM_PROTOCOLS_CORE.md')

PHASE_EXEC_CONTEXT = """
---

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
```
- Write/test/fix loops or batch processing → Claude Code
- Design/planning/validation/phase gates → Claude.ai MCP
- Both needed → Hybrid, with explicit handoff points documented in phase file
- Safety calculations → ALWAYS through MCP (server-side validation)
- Build verification → ALWAYS through Claude Code hooks (deterministic)
- Registry loading → Prefer Code for parallelism, MCP for validation
```

### Cost Model (inform session planning)
```
- Haiku: 1x baseline (exploration, grep, file reading)
- Sonnet: 3x (implementation, normalization, testing)
- Opus: 15x (safety review, architecture, physics, phase gates)
- Impact: R1 is cheap (mostly Haiku/Sonnet). R7 coupled physics is expensive (Opus).
  You can fit ~3x more R1 work into a session budget than R7 work.
- Estimated savings vs all-Opus: 40-60% token cost reduction
```

"""

# Insert before ## OPUS 4.6 CONFIGURATION
pc = insert_before(pc, '## OPUS 4.6 CONFIGURATION', PHASE_EXEC_CONTEXT)

# Update STEP 1.5 to reference new table
pc = pc.replace(
    'Load active role ONLY from PRISM_PROTOCOLS_REFERENCE.md §Role Protocol.\n  State the role in first response.',
    'Load active role from §Phase Execution Context table above (replaces PRISM_PROTOCOLS_REFERENCE.md §Role Protocol).\n  State the role AND execution environment in first response.'
)

# NEW ITEM A: Cost model reference added to protocols (already in Phase Exec Context section above)
# Also add a brief reference in the session planning step
pc = pc.replace(
    'WHY: Opus 4.6\'s strength is long-range planning. Using it reactively wastes the capability.',
    'WHY: Opus 4.6\'s strength is long-range planning. Using it reactively wastes the capability.\n  COST: Check §Phase Execution Context Cost Model. R1 sessions (Haiku/Sonnet) fit ~3x more work than R7 (Opus).'
)

write('PRISM_PROTOCOLS_CORE.md', pc)
print(f"  Done. New length: {len(pc.splitlines())} lines")


# ===========================================================
# CHANGE 2: PRISM_MASTER_INDEX.md — Add Execution lines
# ===========================================================
print("CHANGE 2: PRISM_MASTER_INDEX.md...")
mi = read('PRISM_MASTER_INDEX.md')

# Update phase registry table — add Execution column
# The table has: | ID | Title | Doc | Status | Depends On | Sessions | Role |
# Replace each row with added Execution info
# Actually the handoff says to add Execution: lines to each "phase summary block"
# Looking at the master index, phases are in a table. The "phase summary blocks" are 
# likely the descriptions in the BUILD SEQUENCE section. Let me add execution lines there.

# Add to the PHASE REGISTRY table - replace the Role column values with Role + add Execution
phase_exec_map = {
    '| DA |': '| DA | Development Acceleration | PHASE_DA_DEV_ACCELERATION.md | **not-started** | P0 complete | 1 | DevOps Engineer |\n| | Execution: Claude Code 100% \\| Sonnet \\| 1 session |',
    '| R1 |': '| R1 | Registry + Data Foundation | PHASE_R1_REGISTRY.md | **in-progress** (MS0-4 ✅) | P0 complete | 2-3 more | Data Architect |\n| | Execution: Claude Code 80% + MCP 20% \\| Haiku→Sonnet→Opus \\| Parallel: MS5+MS6+MS7 |',
}

# Actually, embedding execution lines in the markdown table is messy. Better approach:
# Add an EXECUTION PROFILES section after the Phase Registry table.
exec_profiles = """
---

## EXECUTION PROFILES (per-phase environment + model + parallelism)

```
DA:  Claude Code 100% | Sonnet | 1 session | No parallelism
R1:  Claude Code 80% + MCP 20% | Haiku→Sonnet→Opus | Parallel: MS5+MS6+MS7 (3 subagents), MS8 (5 agents)
R2:  Hybrid Code+MCP | Sonnet→Opus | Parallel: 5-agent benchmark fan, 29 safety tests background
R3:  Hybrid Code+MCP | Sonnet→Opus | Background: data campaigns via agents
R4:  Claude Code 90% | Sonnet, Opus at gate | Standard Code workflow
R5a: Claude Code 100% | Sonnet | Parallel with R4
R5b: Hybrid MCP+Code | Sonnet | After R4+R5a
R6:  Claude Code 80% + MCP 20% | Sonnet→Opus | After R8, 10 fault injection tests
R7:  Hybrid Code+MCP | Haiku→Sonnet→Opus | Background: catalog extraction (5 agents by manufacturer)
R8:  Claude.ai MCP 80% + Code 20% | Opus→Sonnet | 22 app skills batch-create in Code
R9:  Claude Code 90% | Sonnet | Protocol adapters parallelizable
R10: Claude.ai MCP 100% | Opus | Vision-phase, no implementation
R11: Claude Code 70% + MCP 30% | Sonnet→Opus | SFC/PPG/ShopMgr/ACNC independent streams
```

"""

# Insert after the phase registry table's closing backticks
mi = mi.replace(
    '```\n\n---\n\n## BUILD SEQUENCE',
    '```\n' + exec_profiles + '---\n\n## BUILD SEQUENCE',
    1  # only first occurrence
)

# Update ROLE PER PHASE in DEVELOPMENT PROTOCOLS
mi = mi.replace(
    """ROLE PER PHASE (switches at phase boundary):
  DA → Context Engineer          R1 → Data Architect
  R2 → Safety Systems Engineer   R3 → Principal Architect
  R4 → Platform Engineer         R5 → Product Designer
  R6 → Site Reliability Engineer  R7 → Applied Research Engineer
  R8 → Product Architect         R9 → Integration Architect
  R10 → CTO / Visionary          R11 → Product Manager""",
    """ROLE PER PHASE (switches at phase boundary — see §Execution Profiles for full context):
  DA → DevOps Engineer (Code)    R1 → Data Architect (Code+MCP)
  R2 → Safety Systems Eng (Hybrid) R3 → Principal Architect (Hybrid)
  R4 → Platform Engineer (Code)  R5a → Frontend Eng (Code) / R5b → Product Designer (Hybrid)
  R6 → SRE (Code+MCP)           R7 → Applied Research Eng (Hybrid)
  R8 → Product Architect (MCP)  R9 → Integration Architect (Code)
  R10 → CTO / Visionary (MCP)   R11 → Product Engineer (Code+MCP)
  Cross-cutting → Principal Systems Architect (MCP, Opus)"""
)

# Update DA session estimate from 2-3 to 1
mi = mi.replace('| DA | Development Acceleration | PHASE_DA_DEV_ACCELERATION.md | **not-started** | P0 complete | 2-3 | Context Engineer |',
                '| DA | Development Acceleration | PHASE_DA_DEV_ACCELERATION.md | **not-started** | P0 complete | 1 | DevOps Engineer |')

write('PRISM_MASTER_INDEX.md', mi)
print(f"  Done. New length: {len(mi.splitlines())} lines")


# ===========================================================
# CHANGE 3: PHASE_DA — Complete Rewrite
# ===========================================================
print("CHANGE 3: PHASE_DA_DEV_ACCELERATION.md...")

DA_CONTENT = """# PHASE DA: DEVELOPMENT ACCELERATION v14.3
# Role: DevOps Engineer | Environment: Claude Code 100% | Model: Sonnet
# Gate: Ω ≥ 0.70 | All 5 subagents respond, 5 commands execute, 15 skills auto-load,
#       hooks fire on edit/bash, E2E test passes, Claude Code operational
# Sessions: 1 | Depends: P0 complete
# v14.3: Complete rewrite — 5 concrete milestones for Claude Code deep integration

---

## CONTEXT BRIDGE
```
WHAT CAME BEFORE: P0 activated 31 dispatchers, 368 actions, 37 engines. Opus 4.6 configured.
  Ω=0.77. Build clean at 3.9MB. All wiring complete. MCP server operational.
WHAT THIS PHASE DOES: Configure Claude Code for maximum PRISM development velocity.
  CLAUDE.md hierarchy, persistent-memory subagents, slash commands, skill conversion,
  deterministic hooks. This phase directly speeds up every subsequent phase.
WHAT COMES AFTER: R1 continues registry data foundation work (MS4.5 onward).
  R1 will use the subagents, commands, and skills configured here.
```

---

## DA-MS0: CLAUDE.md Hierarchy (1 hour)

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

---

## DA-MS1: Subagents with Persistent Memory (1 hour)

Create 5 subagent definition files at ~/.claude/agents/:

1. **prism-safety-reviewer.md**
   - Model: Opus | Memory: project | Tools: Read, Grep, Glob, Bash
   - Context: S(x)≥0.70 hard block. Check all calcs against CALC_BENCHMARKS.json.
     Update memory with calculation failure patterns across sessions.

2. **prism-registry-expert.md**
   - Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
   - Context: Manages 3518 materials, 824 machines, tools, 9200+ alarms,
     500 formulas, 697 strategies. Knows schemas. Updates memory with
     data quality patterns discovered during loading.

3. **prism-architect.md**
   - Model: Opus | Memory: project | Tools: Read, Write, Grep, Glob, Bash
   - Context: Principal Systems Architect. Tracks design decisions with rationale.
     Consults wiring registries (D2F, F2E, E2S) before new implementations.
     Updates memory with architectural decisions across sessions.

4. **prism-test-runner.md**
   - Model: Sonnet | Memory: project | Tools: Read, Bash, Glob
   - Context: Runs test suites, regression checks, benchmark validation.
     Tracks test coverage and failure history in memory.

5. **prism-data-validator.md**
   - Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
   - Context: Validates registry data quality — schema compliance, completeness,
     cross-reference integrity. Quarantines bad records with reason codes.

WHY: Persistent memory replaces HANDOFF.md and COMPACTION_SNAPSHOT.md.
The safety reviewer accumulates knowledge about which calculations fail
and why. The architect remembers design decisions without handoff files.

VERIFY: Invoke each subagent with a test query. End session. Start new session.
Ask subagent to recall the test query result. If it remembers → PASS.

---

## DA-MS2: Slash Commands (30 minutes)

Create 5 command files at ~/.claude/commands/:

1. **/boot** (boot.md) — Load CURRENT_POSITION.md, identify active phase, load phase doc,
   check for HANDOFF.md, plan session. Report: current MS, next 3 steps, blockers,
   estimated session scope.

2. **/gate** (gate.md) — Run phase gate check: verify all milestone criteria met,
   run npm run build, check test suite, report Omega estimate, list unresolved findings.

3. **/checkpoint** (checkpoint.md) — Save state: update CURRENT_POSITION.md with active
   subtask, append ROADMAP_TRACKER.md with progress, write session notes to HANDOFF.md,
   run npm run build to verify clean state.

4. **/plan** (plan.md) — Read current phase doc, identify next milestone, break into steps,
   estimate effort per step, identify parallelizable work, propose session plan with
   model tier recommendations.

5. **/build** (build.md) — Run npm run build, parse output, report errors with file:line,
   suggest fixes for common patterns. NEVER run standalone tsc.

WHY: Replaces manual multi-step session protocols. One keystroke instead of 9 steps.

VERIFY: Execute each command in sequence. /boot should report current position.
/plan should produce actionable steps. /build should succeed or report errors.

---

## DA-MS3: Skill Conversion (2 hours)

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

---

## DA-MS4: Deterministic Hook Configuration (30 minutes)

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

---

## DA-MS5: End-to-End Integration Test (1 hour)

Execute this exact sequence:
1. /boot → should report current position, phase, next steps
2. Pick a small R1 task (e.g., validate one material file schema)
3. Invoke registry-expert subagent for schema guidance
4. Make an edit → verify post-edit build hook fires
5. /checkpoint → should save state to all 3 files
6. Resume → /boot again → should pick up exactly where checkpoint left off
7. Spawn 3 parallel subagents on 3 independent file validation tasks
8. Verify all 3 complete and results merge correctly
9. End session. Start new session. Verify subagent memory persists.

### EXIT GATE

ALL of the following must pass:
```
□ CLAUDE.md loads automatically (no manual injection)
□ All 5 subagents respond correctly to domain queries
□ All 5 slash commands execute without error
□ At least 10/15 skills auto-load when relevant topics arise
□ Post-edit hook fires build within 2 seconds
□ Parallel subagents complete independent tasks correctly
□ Subagent memory persists across session boundary
□ /checkpoint → /boot cycle preserves state
□ Ω ≥ 0.70 for DA phase
```

FAILURE PROTOCOL: If any check fails, fix the specific config file and re-test
that check. Do not proceed to R1 until all checks pass.

---

## COMPANION ASSETS (built after DA features)

```
Skills created: 15 (DA-MS3, converted from skills-consolidated/)
Subagents: 5 (DA-MS1, with persistent memory)
Commands: 5 (DA-MS2, slash commands)
Hooks: 4+ (DA-MS4, deterministic Claude Code hooks)
```

---

## ARTIFACTS

```
REQUIRES: PHASE_FINDINGS.md (P0 section), P0_DISPATCHER_BASELINE.md
PRODUCES: CLAUDE.md (root + 2 nested), 5 subagent definitions,
          5 command definitions, 15 skill files, hook configuration,
          DA_INTEGRATION_TEST_RESULTS.md
```
"""

write('PHASE_DA_DEV_ACCELERATION.md', DA_CONTENT)
print(f"  Done. New length: {len(DA_CONTENT.splitlines())} lines")


# ===========================================================
# CHANGE 4: PHASE_R1_REGISTRY.md — Add parallel execution
# ===========================================================
print("CHANGE 4: PHASE_R1_REGISTRY.md...")
r1 = read('PHASE_R1_REGISTRY.md')

R1_EXEC = """
---

### EXECUTION MODEL
```
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
```

"""

# Insert after the first --- separator following the header
first_sep = r1.find('---', r1.find('#'))
if first_sep == -1:
    # Insert after header block
    first_newline_block = r1.find('\n\n', 50)
    r1 = r1[:first_newline_block] + R1_EXEC + r1[first_newline_block:]
else:
    # Insert after first ---
    next_line = r1.find('\n', first_sep) + 1
    r1 = r1[:next_line] + R1_EXEC + r1[next_line:]

write('PHASE_R1_REGISTRY.md', r1)
print(f"  Done. New length: {len(r1.splitlines())} lines")


# ===========================================================
# CHANGE 5: PHASE_R2_SAFETY.md — Benchmark fan-out
# ===========================================================
print("CHANGE 5: PHASE_R2_SAFETY.md...")
r2 = read('PHASE_R2_SAFETY.md')

R2_EXEC = """
---

### EXECUTION MODEL
```
Environment: Hybrid — Claude Code (benchmark execution) + Claude.ai MCP (Ralph validation)
Model: Sonnet (test harness creation) → Opus (safety calculation review, failure classification)

PARALLEL EXECUTION:
- 50-calc benchmark matrix: fan across 5 subagents (10 materials each)
- 29 safety engine tests (from Superpower Phase 1): execute as background agent batch
- Main session handles ONLY failure analysis and Ralph validation loops
- Ralph validation requires API key and prism_ralph dispatcher → MUST use MCP
- safety-reviewer subagent accumulates failure patterns in persistent memory
```

"""

first_sep = r2.find('---', r2.find('#'))
if first_sep != -1:
    next_line = r2.find('\n', first_sep) + 1
    r2 = r2[:next_line] + R2_EXEC + r2[next_line:]

write('PHASE_R2_SAFETY.md', r2)
print(f"  Done. New length: {len(r2.splitlines())} lines")


# ===========================================================
# CHANGE 6: PHASE_R3_CAMPAIGNS.md — Code vs MCP milestones
# ===========================================================
print("CHANGE 6: PHASE_R3_CAMPAIGNS.md...")
r3 = read('PHASE_R3_CAMPAIGNS.md')

R3_EXEC = """
---

### EXECUTION MODEL
```
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
```

"""

first_sep = r3.find('---', r3.find('#'))
if first_sep != -1:
    next_line = r3.find('\n', first_sep) + 1
    r3 = r3[:next_line] + R3_EXEC + r3[next_line:]

write('PHASE_R3_CAMPAIGNS.md', r3)
print(f"  Done. New length: {len(r3.splitlines())} lines")


# ===========================================================
# CHANGE 7: PHASE_R7_INTELLIGENCE.md — Background agents
# ===========================================================
print("CHANGE 7: PHASE_R7_INTELLIGENCE.md...")
r7 = read('PHASE_R7_INTELLIGENCE.md')

R7_EXEC = """
---

### EXECUTION MODEL
```
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
```

"""

first_sep = r7.find('---', r7.find('#'))
if first_sep != -1:
    next_line = r7.find('\n', first_sep) + 1
    r7 = r7[:next_line] + R7_EXEC + r7[next_line:]

write('PHASE_R7_INTELLIGENCE.md', r7)
print(f"  Done. New length: {len(r7.splitlines())} lines")


# ===========================================================
# CHANGE 8: SYSTEM_CONTRACT.md — Tool Environment Invariants
# ===========================================================
print("CHANGE 8: SYSTEM_CONTRACT.md...")
sc = read('SYSTEM_CONTRACT.md')

TOOL_ENV_INVARIANTS = """

---

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
"""

sc += TOOL_ENV_INVARIANTS
write('SYSTEM_CONTRACT.md', sc)
# Also update the v14.2.1 copy
if os.path.exists(os.path.join(BASE, 'SYSTEM_CONTRACT_v14.2.1.md')):
    sc2 = read('SYSTEM_CONTRACT_v14.2.1.md')
    sc2 += TOOL_ENV_INVARIANTS
    write('SYSTEM_CONTRACT_v14.2.1.md', sc2)
print(f"  Done. New length: {len(sc.splitlines())} lines")


# ===========================================================
# CHANGE 9: ROADMAP_INSTRUCTIONS.md — Decision tree
# ===========================================================
print("CHANGE 9: ROADMAP_INSTRUCTIONS.md...")
ri = read('ROADMAP_INSTRUCTIONS.md')

CC_DECISION_TREE = """

---

## CLAUDE CODE vs CLAUDE.AI DECISION TREE

When starting any task, determine execution environment FIRST:

```
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
```

### Session Planning with Cost Awareness
```
- Haiku: 1x cost (exploration, grep, file reading) — use for R1 bulk work
- Sonnet: 3x cost (implementation, normalization, testing) — default for most work
- Opus: 15x cost (safety, architecture, physics, gates) — reserve for high-value decisions
- Budget impact: ~3x more R1 work fits in a session vs R7 coupled physics work
- Estimated savings vs all-Opus: 40-60% token cost reduction
```
"""

ri += CC_DECISION_TREE
write('ROADMAP_INSTRUCTIONS.md', ri)
print(f"  Done. New length: {len(ri.splitlines())} lines")


# ===========================================================
# CHANGE 10: CLAUDE_CODE_INTEGRATION.md — Full execution guide
# ===========================================================
print("CHANGE 10: CLAUDE_CODE_INTEGRATION.md...")

CCI_CONTENT = """# CLAUDE CODE INTEGRATION GUIDE v14.3
# Complete execution guide for PRISM development using Claude Code
# This document expands the reference into a full operational guide.
#
# v14.3: Expanded from reference to execution guide with:
#   - Complete DA-MS0 through DA-MS5 milestones
#   - Per-phase environment declarations
#   - Model switching strategy with cost model
#   - Subagent definitions with full specs
#   - Slash command definitions
#   - Hook configurations
#   - Plugin packaging instructions (R6 exit gate)

---

## OVERVIEW

Claude Code is the primary development environment for PRISM phases DA through R11.
This guide defines HOW to use Claude Code for each phase, including:
- Which model tier to use (Haiku/Sonnet/Opus)
- When to use subagents vs main session
- When to switch to Claude.ai MCP
- How to handle safety-critical operations

---

## PER-PHASE ENVIRONMENT DECLARATIONS

| Phase | Environment | Model Strategy | Key Workflow |
|-------|-------------|----------------|-------------|
| DA | Code 100% | Sonnet | Config, setup, skill conversion |
| R1 | Code 80% + MCP 20% | Haiku→Sonnet→Opus | Parallel registry loading, schema design in MCP |
| R2 | Hybrid | Sonnet→Opus | Benchmarks in Code, Ralph validation in MCP |
| R3 | Hybrid | Sonnet→Opus | Campaigns in Code, action design in MCP |
| R4 | Code 90% | Sonnet (Opus at gate) | Multi-file refactoring |
| R5a | Code 100% | Sonnet | Component development, parallel with R4 |
| R5b | Hybrid | Sonnet | UX design in MCP, implement in Code |
| R6 | Code 80% + MCP 20% | Sonnet→Opus | Fault injection in Code, gates in MCP |
| R7 | Hybrid | Haiku→Sonnet→Opus | Catalog extraction in Code, physics in MCP |
| R8 | MCP 80% + Code 20% | Opus→Sonnet | Architecture in MCP, skill batch in Code |
| R9 | Code 90% | Sonnet | Protocol adapters (parallelizable) |
| R10 | MCP 100% | Opus | Pure strategic design |
| R11 | Code 70% + MCP 30% | Sonnet→Opus | Packaging in Code, product arch in MCP |

---

## MODEL SWITCHING STRATEGY

### Cost Model
```
Haiku:  1x baseline — file exploration, grep, reading, simple parsing
Sonnet: 3x — implementation, normalization, testing, script writing
Opus:   15x — safety review, architecture decisions, physics modeling, phase gates
```

### When to Use Each Tier
```
HAIKU (cheapest — use aggressively for):
  - File exploration and directory scanning
  - Grep/search operations across large codebases
  - Simple file reading and content extraction
  - Catalog PDF parsing at volume
  - Registry file enumeration

SONNET (default — use for most work):
  - Writing implementation code
  - Creating normalization scripts
  - Running test suites
  - Data transformation and loading
  - Skill file creation
  - Standard code review

OPUS (expensive — reserve for high-value):
  - S(x) safety score calculations (MANDATORY)
  - Phase gate reviews (MANDATORY)
  - Architecture and design decisions
  - Coupled physics modeling (R7)
  - Cross-system integration design (R3)
  - Ralph/Omega validation loops
  - 85-param tool holder schema design (R1-MS5)
```

### Session Budget Impact
```
R1 session (mostly Haiku/Sonnet): ~3x more work per session
R3 session (mixed Sonnet/Opus): ~2x more work per session
R7 session (heavy Opus): baseline — coupled physics is expensive
Estimated savings vs all-Opus: 40-60% token cost reduction
```

---

## SUBAGENT DEFINITIONS

### 1. prism-safety-reviewer
```yaml
name: prism-safety-reviewer
model: opus
memory: project
tools: [Read, Grep, Glob, Bash]
context: |
  You are the PRISM safety reviewer. S(x)≥0.70 is a HARD BLOCK.
  Check all calculations against CALC_BENCHMARKS.json.
  Track calculation failure patterns in memory across sessions.
  Flag any bare numbers (missing uncertainty bounds).
  Reference: SYSTEM_CONTRACT.md for safety invariants.
```

### 2. prism-registry-expert
```yaml
name: prism-registry-expert
model: sonnet
memory: project
tools: [Read, Grep, Glob, Bash]
context: |
  You are the PRISM registry expert. You manage:
  - 3518 materials (127 params each, target 100% enriched)
  - 824 machines (44 manufacturers, need power specs + work envelopes)
  - 5238 tools on disk (1944 active, need indexing + schema consistency)
  - 9200+ alarm codes (100% loaded)
  - 500 formulas (105 INVENTION/NOVEL, 162 zero-coverage)
  - 697 toolpath strategies (only 8 exposed)
  Track data quality patterns in memory. Quarantine bad records with codes.
```

### 3. prism-architect
```yaml
name: prism-architect
model: opus
memory: project
tools: [Read, Write, Grep, Glob, Bash]
context: |
  You are the PRISM Principal Systems Architect.
  Consult wiring registries before ANY new implementation:
  - PRECISE_WIRING_D2F.json (Dispatchers → Formulas)
  - PRECISE_WIRING_F2E.json (Formulas → Engines)
  - PRECISE_WIRING_E2S.json (Engines → Services)
  Track design decisions with rationale in memory.
  Anti-regression: new content must always be >= old content.
```

### 4. prism-test-runner
```yaml
name: prism-test-runner
model: sonnet
memory: project
tools: [Read, Bash, Glob]
context: |
  You are the PRISM test runner.
  Build: npm run build (NEVER standalone tsc — OOM at current scale).
  Test: npm test (Vitest framework).
  Track test coverage and failure history in memory.
  Report errors with file:line format for quick navigation.
```

### 5. prism-data-validator
```yaml
name: prism-data-validator
model: sonnet
memory: project
tools: [Read, Grep, Glob, Bash]
context: |
  You are the PRISM data validator.
  Validate registry data quality: schema compliance, completeness,
  cross-reference integrity. Quarantine bad records with reason codes.
  Materials must have 127 params. Tools need consistent schema.
  Machines need power specs and work envelopes.
```

---

## SLASH COMMAND DEFINITIONS

### /boot (boot.md)
```markdown
Load CURRENT_POSITION.md from data/docs/roadmap/.
Identify active phase and milestone.
Load the active phase document.
Check for HANDOFF.md in state/.
Plan session: current MS, next 3 steps, blockers, estimated scope.
Report using format:
  POSITION: [phase]-[MS] step [N]
  NEXT: [step 1], [step 2], [step 3]
  BLOCKERS: [none | description]
  SCOPE: [estimated MS completions this session]
```

### /gate (gate.md)
```markdown
Run phase gate check:
1. Verify all milestone criteria met (check phase doc exit gate)
2. Run: npm run build
3. Run: npm test
4. Estimate Omega score based on criteria coverage
5. List any unresolved findings from PHASE_FINDINGS.md
6. Report PASS/FAIL with specific gaps
```

### /checkpoint (checkpoint.md)
```markdown
Save current state:
1. Update CURRENT_POSITION.md with active subtask
2. Append ROADMAP_TRACKER.md with progress entry
3. Write session notes to HANDOFF.md
4. Run: npm run build (verify clean state)
Report: "Checkpoint saved at [phase]-[MS] step [N]"
```

### /plan (plan.md)
```markdown
Read current phase doc. Identify next milestone.
Break into steps with effort estimates.
Identify parallelizable work streams.
Propose session plan with model tier recommendations.
Format:
  MILESTONE: [MS-ID] — [title]
  STEPS: [numbered list with effort]
  PARALLEL: [independent streams, if any]
  MODEL: [recommended tiers per step]
  ESTIMATED: [calls | time]
```

### /build (build.md)
```markdown
Run: npm run build 2>&1
Parse output for errors.
Report errors with file:line format.
Suggest fixes for common patterns:
- Type errors → show expected vs actual
- Import errors → check path and exports
- OOM → NEVER use standalone tsc, only npm run build
NEVER run standalone tsc — causes OOM at current codebase scale.
```

---

## HOOK CONFIGURATIONS

### .claude/settings.json
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "command": "npm run build 2>&1 | tail -5",
        "description": "Auto-build after every file edit"
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "node scripts/validate-safety-score.js",
        "description": "Safety score context check before bash"
      },
      {
        "matcher": "Write",
        "command": "node scripts/anti-regression-check.js",
        "description": "Backup + size check before file overwrites"
      }
    ]
  }
}
```

### Why Deterministic Hooks Matter
```
MCP hooks (probabilistic): Claude may skip based on context pressure or reasoning
Claude Code hooks (deterministic): ALWAYS fire, no exceptions, no reasoning required

Use MCP hooks for: safety calculations, registry validation, quality enforcement
Use Code hooks for: build verification, anti-regression, file backup

Both systems are complementary, not competing.
```

---

## PLUGIN PACKAGING (R6 Exit Gate)

At R6 completion, bundle all PRISM Claude Code configuration as a distributable plugin:

### Contents
```
prism-claude-code-plugin/
├── CLAUDE.md                    # Root project context
├── src/engines/CLAUDE.md        # Engine conventions
├── src/dispatchers/CLAUDE.md    # Dispatcher patterns
├── .claude/
│   ├── settings.json            # Hook configurations
│   ├── agents/
│   │   ├── prism-safety-reviewer.md
│   │   ├── prism-registry-expert.md
│   │   ├── prism-architect.md
│   │   ├── prism-test-runner.md
│   │   └── prism-data-validator.md
│   ├── commands/
│   │   ├── boot.md
│   │   ├── gate.md
│   │   ├── checkpoint.md
│   │   ├── plan.md
│   │   └── build.md
│   └── skills/
│       ├── cutting-parameters.md
│       ├── material-selection.md
│       ├── safety-validation.md
│       └── ... (15 total)
├── scripts/
│   ├── validate-safety-score.js
│   └── anti-regression-check.js
└── README.md                    # Setup instructions
```

### Verification Criteria
```
□ Fresh install on clean machine produces working PRISM dev environment
□ Time from plugin install to first successful /boot: < 5 minutes
□ All 5 subagents respond to domain queries
□ All 5 slash commands execute
□ At least 10/15 skills auto-load on relevant topics
□ Post-edit build hook fires
□ MCP server connection established
```

This plugin bridges to R11 product packaging — the same distribution mechanism
scales to customer-facing PRISM installations.
"""

write('CLAUDE_CODE_INTEGRATION.md', CCI_CONTENT)
print(f"  Done. New length: {len(CCI_CONTENT.splitlines())} lines")


# ===========================================================
# NEW ITEM B: PHASE_R6_PRODUCTION.md — Plugin packaging exit gate
# ===========================================================
print("NEW ITEM B: PHASE_R6_PRODUCTION.md...")
r6 = read('PHASE_R6_PRODUCTION.md')

PLUGIN_GATE = """

---

## ADDITIONAL EXIT CRITERIA (v14.3)

### Plugin Packaging Gate
Package complete PRISM Claude Code configuration (15+ skills, 5 subagents, 5 commands,
hooks, MCP connection config) as a distributable Claude Code plugin.

Verify: fresh install of plugin on clean machine produces working PRISM development
environment within 5 minutes. See CLAUDE_CODE_INTEGRATION.md §Plugin Packaging for
full contents and verification criteria.

This gate ensures the development toolchain is reproducible and bridges to R11
product packaging for customer-facing installations.
"""

r6 += PLUGIN_GATE
write('PHASE_R6_PRODUCTION.md', r6)
print(f"  Done. New length: {len(r6.splitlines())} lines")


# ===========================================================
# VERSION HEADERS: Update all files from v14.2 → v14.3
# ===========================================================
print("VERSION HEADERS: Updating all files...")

version_updates = {
    'PRISM_MASTER_INDEX.md': [
        ('v14.2', 'v14.3'),
        ('v14.2.1', 'v14.3'),
    ],
    'PRISM_PROTOCOLS_CORE.md': [
        ('v13.9', 'v14.3'),
    ],
    'SYSTEM_CONTRACT.md': [],  # Will handle manually
    'ROADMAP_INSTRUCTIONS.md': [],  # Will handle manually  
    'DEPLOYMENT_GUIDE.md': [],
    'CURRENT_POSITION.md': [],
}

# Update MASTER_INDEX version header
mi = read('PRISM_MASTER_INDEX.md')
mi = mi.replace('# PRISM MODULAR ROADMAP — MASTER INDEX v14.2', '# PRISM MODULAR ROADMAP — MASTER INDEX v14.3')
mi = mi.replace('# THIS FILE REPLACES v14.1. Load THIS first, then load only what you need.', 
                '# THIS FILE REPLACES v14.2. Load THIS first, then load only what you need.')

# Add version history entry
VERSION_ENTRY = """#
# v14.3 (2026-02-16): Claude Code deep integration
#   - Dynamic role + environment + model table replaces static role assignment
#   - DA phase rewritten: 5 concrete milestones for Claude Code configuration
#   - Every phase declares execution environment (Code/MCP/Hybrid)
#   - Parallel execution instructions added to R1, R2, R3, R7
#   - Cost model added (Haiku 1x → Sonnet 3x → Opus 15x)
#   - Tool Environment Invariants added to SYSTEM_CONTRACT.md
#   - Claude Code decision tree added to ROADMAP_INSTRUCTIONS.md
#   - CLAUDE_CODE_INTEGRATION.md expanded from reference to execution guide
#   - Plugin packaging added as R6 exit gate
#   - Source: CLAUDE_CODE_BRIEFING_FOR_PRISM.md capability mapping"""

# Insert after the v14.2 header block
mi = mi.replace(
    '#   SOURCE: ROADMAP_v14_2_GAP_ANALYSIS.md (77 files audited, 150K+ lines reviewed)',
    '#   SOURCE: ROADMAP_v14_2_GAP_ANALYSIS.md (77 files audited, 150K+ lines reviewed)\n' + VERSION_ENTRY
)

# Update ROADMAP version in CURRENT_POSITION reference
mi = mi.replace('ROADMAP: v14.2', 'ROADMAP: v14.3')

write('PRISM_MASTER_INDEX.md', mi)

# Also update the duplicate if it exists
if os.path.exists(os.path.join(BASE, 'PRISM_MASTER_INDEX_v14.2.1.md')):
    # Rename conceptually — write the updated content
    write('PRISM_MASTER_INDEX_v14.2.1.md', mi)

# Update CURRENT_POSITION.md
write('CURRENT_POSITION.md', 'CURRENT: DA-MS0 | LAST_COMPLETE: R1-MS4 2026-02-15 | PHASE: DA not-started | ROADMAP: v14.3\n')

# Update PROTOCOLS_CORE version header
pc = read('PRISM_PROTOCOLS_CORE.md')
pc = pc.replace('# PRISM PROTOCOLS — CORE v13.9', '# PRISM PROTOCOLS — CORE v14.3')
write('PRISM_PROTOCOLS_CORE.md', pc)

# Update DEPLOYMENT_GUIDE
dg = read('DEPLOYMENT_GUIDE.md')
if 'v14.2' in dg:
    dg = dg.replace('v14.2.1', 'v14.3', 1)  # Update first occurrence in header
write('DEPLOYMENT_GUIDE.md', dg)

print("  All version headers updated.")


# ===========================================================
# FINAL: Anti-regression line count verification
# ===========================================================
print("\n=== ANTI-REGRESSION CHECK ===")
baselines = {
    'PRISM_PROTOCOLS_CORE.md': 1686,
    'PRISM_MASTER_INDEX.md': 439,
    'PHASE_DA_DEV_ACCELERATION.md': 291,
    'PHASE_R1_REGISTRY.md': 1203,
    'PHASE_R2_SAFETY.md': 578,
    'PHASE_R3_CAMPAIGNS.md': 761,
    'PHASE_R7_INTELLIGENCE.md': 822,
    'SYSTEM_CONTRACT.md': 379,
    'ROADMAP_INSTRUCTIONS.md': 193,
    'CLAUDE_CODE_INTEGRATION.md': 130,
    'PHASE_R6_PRODUCTION.md': 212,
    'CURRENT_POSITION.md': 1,
}

all_pass = True
for fname, baseline in baselines.items():
    fp = os.path.join(BASE, fname)
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as fh:
            new_count = len(fh.readlines())
        status = "PASS" if new_count >= baseline else "FAIL"
        if status == "FAIL":
            all_pass = False
        delta = new_count - baseline
        print(f"  {fname}: {baseline} → {new_count} ({'+' if delta >= 0 else ''}{delta}) [{status}]")
    else:
        print(f"  {fname}: FILE NOT FOUND [FAIL]")
        all_pass = False

print(f"\n{'ALL CHECKS PASSED' if all_pass else 'SOME CHECKS FAILED'}")
print("\nDone. All 10 changes + 2 new items applied.")
