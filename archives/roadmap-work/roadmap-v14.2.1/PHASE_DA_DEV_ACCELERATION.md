# PHASE DA: DEVELOPMENT ACCELERATION — v14.3
# Status: not-started | Sessions: 1 | MS: 6 (MS0-MS5) | Role: DevOps Engineer
# Environment: Claude Code 100% | Model: Sonnet
# Gate: Ω ≥ 0.70 | All 5 subagents respond, 5 commands execute, 15 skills auto-load,
#       hooks fire on edit/bash, E2E test passes, Claude Code operational
#
# WHY THIS PHASE EXISTS AND WHY IT GOES FIRST:
#   Every session we lose context to compaction. Every session we under-utilize
#   skills, scripts, hooks, and agents. Every session we re-discover what was
#   already known. Every session we could be 2-3x faster if the development
#   infrastructure was optimized. This phase fixes that BEFORE R1 continues,
#   because the ROI compounds across every subsequent session.
#
#   Estimated time saved: 15-30 minutes per session × 50+ remaining sessions
#   = 12-25 hours of recovered development time.
#
# DEPENDS ON: P0 complete (dispatchers wired, Opus 4.6 configured)
# LEVERAGES: F2 (Memory Graph), F3 (Telemetry), F6 (NL Hooks), W2.5 (HSS)
#
# v14.3 REWRITE: Concrete Claude Code configuration milestones replace
#   abstract optimization goals. Every MS produces verifiable artifacts.

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: P0 wired 31 dispatchers. F1-F8 features all complete. W2.5 HSS
optimization delivered 53 hooks, 6 skill chains, 6 response templates, pressure-adaptive
auto-injection. R1-MS0 through MS4 loaded registries to >95%.

WHAT THIS PHASE DOES: Configures Claude Code as the primary development environment —
CLAUDE.md hierarchy, subagents with persistent memory, slash commands, skill conversion,
and deterministic hooks. Replaces manual session boot protocols with automated tooling.

WHAT COMES AFTER: R1-MS4.5 through MS9 (data foundation completion), then R2 safety.

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

---

## DA-MS2: Slash Commands (30 minutes)

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

---

## DA PRODUCES (artifacts for downstream phases):

```
CLAUDE.md (project root)       — Project context for Claude Code auto-load
src/engines/CLAUDE.md          — Engine conventions + AtomicValue patterns
src/dispatchers/CLAUDE.md      — Dispatcher patterns + routing
~/.claude/agents/ (5 files)    — Subagents with persistent memory
~/.claude/commands/ (5 files)  — Slash commands for session management
~/.claude/skills/ (15 files)   — Manufacturing domain skills
.claude/settings.json          — Deterministic hook configuration
DA_E2E_TEST_RESULTS.md         — Integration test results and findings
```
