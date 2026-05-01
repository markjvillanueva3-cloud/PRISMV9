# CLAUDE CODE CAPABILITIES BRIEFING FOR PRISM
# Feed this to the main MCP chat to inform DA phase planning
# Generated: 2026-02-16

---

## EXECUTIVE SUMMARY

Claude Code has native features that solve 70% of DA phase goals out of the box.
Instead of building custom session continuity infrastructure, configure Claude Code
for PRISM. This document maps Claude Code capabilities to PRISM needs.

---

## 1. CLAUDE.md — AUTOMATIC PROJECT MEMORY

**What it is:** A markdown file at your project root that Claude Code loads automatically
every session. No manual loading. No boot protocol. It just knows.

**How PRISM should use it:**
Create `C:\PRISM\mcp-server\CLAUDE.md` containing:
- Core laws (S(x)≥0.70 hard block, Ω≥0.70 release ready)
- Current position (phase, MS, active subtask)
- Build commands (`npm run build` — never standalone tsc)
- Registry counts (materials 3392, machines 1016, tools 5238, etc.)
- Safety rules (no bare numbers, uncertainty bounds required)
- Active role per phase
- Key file locations (MASTER_INDEX.md, wiring registries, state files)
- Code conventions (TypeScript patterns, import style, test structure)

You can nest them: `src/engines/CLAUDE.md` for engine conventions,
`src/dispatchers/CLAUDE.md` for dispatcher patterns.

**What it replaces:** ~80% of session boot protocol, CURRENT_POSITION.md manual loading,
protocol loading steps, and the "every session re-discover project context" problem.

---

## 2. CUSTOM SUBAGENTS WITH PERSISTENT MEMORY

**What it is:** Specialized Claude instances you define in markdown files with YAML
frontmatter. Each gets its own context window, tools, model, and persistent memory
directory that survives across conversations.

**How PRISM should use it — create these subagents:**

```yaml
# ~/.claude/agents/prism-safety-reviewer.md
---
name: prism-safety-reviewer
description: Reviews calculations for safety compliance
tools: Read, Grep, Glob, Bash
model: opus
memory: project
---
You are a safety-critical manufacturing calculation reviewer.
S(x) >= 0.70 is a hard block. Every value needs uncertainty bounds.
Check all calculations against CALC_BENCHMARKS.json golden dataset.
Update your agent memory with patterns of calculation failures.
```

```yaml
# ~/.claude/agents/prism-registry-expert.md
---
name: prism-registry-expert
description: Manages and queries PRISM data registries
tools: Read, Grep, Glob, Bash
model: sonnet
memory: project
---
You manage PRISM's registries: 3392 materials, 1016 machines, 5238 tools,
10033 alarms, 500 formulas, 697 strategies. You know the schema for each.
Update memory with data quality patterns you discover.
```

```yaml
# ~/.claude/agents/prism-architect.md
---
name: prism-architect
description: Tracks design decisions and system architecture
tools: Read, Write, Grep, Glob, Bash
model: opus
memory: project
---
You are the Principal Systems Architect for PRISM.
Track all design decisions with rationale. Consult wiring registries
(D2F, F2E, E2S) before any new action implementation.
Update memory with architectural decisions across sessions.
```

**Key capability:** Memory persists across sessions. The safety reviewer accumulates
knowledge about which calculations fail and why. The registry expert learns data patterns.
The architect remembers design decisions without HANDOFF.md files.

**What it replaces:** Custom session handoff protocol, HANDOFF.md, COMPACTION_SNAPSHOT.md,
and much of the Memory Graph (F2) usage for session continuity.

---

## 3. PARALLEL SUBAGENTS (up to 10 concurrent)

**What it is:** Claude Code can spawn up to 10 subagents running simultaneously,
each with isolated context. Results return as summaries without bloating main context.

**How PRISM should use it:**

- **R1-MS5/6/7:** Run tool normalization, material enrichment, and machine population
  as 3 parallel subagents (they're independent data targets)
- **R2-MS0:** Fan 50-calc benchmark matrix across 5 subagents (10 materials each)
- **R3-MS4:** Data campaigns run batches in parallel across material families
- **R7-MS6:** Catalog extraction across multiple PDF batches simultaneously

**Example invocation:**
```
Have three agents work in parallel:
1. Normalize tool schema for END_MILLS.json
2. Normalize tool schema for TURNING_INSERTS.json
3. Normalize tool schema for DRILLS.json
```

**What it replaces:** prism_orchestrate→agent_parallel, sequential batch processing,
and the "this batch takes the whole session" problem.

---

## 4. SKILL.md FILES — ON-DEMAND EXPERTISE

**What it is:** Markdown files with YAML frontmatter that Claude Code auto-loads when
it detects the skill is relevant to the current conversation. The model decides when
it needs the knowledge and pulls it in — no manual injection.

**How PRISM should use it:**
Convert top PRISM skills to SKILL.md format:

```yaml
# .claude/skills/cutting-parameters.md
---
name: cutting-parameters
description: Calculate safe cutting parameters for CNC machining operations
---
# Cutting Parameter Calculation

When calculating cutting parameters:
1. Always query FormulaRegistry before computing
2. Use Kienzle force model for force prediction
3. Apply chip thinning compensation for ae < D/2
4. Include uncertainty bounds on all values
5. S(x) >= 0.70 or BLOCK the result
[... full skill content ...]
```

The 126 existing PRISM skills in skills-consolidated/ can be converted.
Claude Code's skill system replaces the W2.5 pressure-adaptive auto-injection
system — skills load on-demand based on relevance, not pressure thresholds.

**Claude Code 2.1 feature:** Skill hot-reloading. Save a SKILL.md file and it
updates in the running session immediately. No restart needed.

**What it replaces:** W2.5 auto-injection system, skill tier maps, pressure-adaptive
sizing, and the need to restart Claude Desktop after skill changes.

---

## 5. DETERMINISTIC HOOKS (PreToolUse / PostToolUse)

**What it is:** Shell scripts or commands that ALWAYS run before/after specific tool
invocations. Claude cannot skip, forget, or decide otherwise. These are deterministic,
not probabilistic like prompt-based hooks.

**How PRISM should use it:**

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{
          "type": "command",
          "command": "npm run build 2>&1 | tail -5"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "node scripts/validate-safety-score.js"
        }]
      }
    ]
  }
}
```

**PRISM hooks to implement as Claude Code hooks:**
- Post-edit: run build, catch breaks immediately
- Pre-calculation: validate inputs are within physical bounds
- Post-calculation: verify S(x) >= 0.70
- Pre-file-write: check anti-regression (file exists, backup first)
- Post-session: auto-write checkpoint to CLAUDE.md

**What it replaces:** Server-side MCP hook system for development workflow hooks.
Manufacturing calculation hooks still run server-side, but development process
hooks become deterministic Claude Code hooks.

---

## 6. SLASH COMMANDS — ONE-KEYSTROKE WORKFLOWS

**What it is:** Custom commands saved as markdown files that execute multi-step
workflows with a single `/command` invocation.

**How PRISM should create these:**

```markdown
# .claude/commands/boot.md
Load CURRENT_POSITION.md, identify active phase, load that phase doc,
check for any HANDOFF.md, plan the session. Report: current MS, next 3 steps,
any blockers, estimated session scope.
```

```markdown
# .claude/commands/gate.md
Run phase gate check:
1. Verify all milestone criteria met
2. Run npm run build
3. Check test suite passes
4. Report Omega estimate
5. List any unresolved findings
```

```markdown
# .claude/commands/checkpoint.md
Save current state:
1. Update CURRENT_POSITION.md with active subtask
2. Append ROADMAP_TRACKER.md with progress
3. Write session notes to HANDOFF.md
4. Run npm run build to verify clean state
```

```markdown
# .claude/commands/plan.md
Read current phase doc, identify next milestone, break it into steps,
estimate effort per step, identify parallelizable work, propose session plan.
```

**What it replaces:** Manual multi-step session protocols, boot sequences,
checkpoint procedures, and the 9-step session workflow.

---

## 7. BACKGROUND AGENTS

**What it is:** Fire off a long-running task to the background with Ctrl+B.
Keep working in the main session. Check results later.

**How PRISM should use it:**
- R1 registry loading batches → background
- R2 benchmark runs → background while reviewing previous results
- R3 data campaigns → background while working on intelligence features
- R7-MS6 catalog extraction → background (this takes hours)

**What it replaces:** Dedicating entire sessions to batch operations.

---

## 8. MODEL SWITCHING (alt+p)

**What it is:** Switch models mid-session. Use cheap/fast models for exploration,
expensive/powerful models for reasoning.

**PRISM model strategy:**
- **Haiku:** Exploration subagents reading files, searching registries, grep
- **Sonnet:** Daily implementation — writing engines, dispatchers, tests
- **Opus:** Safety calculations, phase gates, coupled physics design, Ralph validation

Maps directly to existing effort tiers:
  effort=low → Haiku | effort=medium → Sonnet | effort=high/max → Opus

**What it replaces:** Single-model sessions. Significant cost reduction.

---

## 9. /compact COMMAND — CONTROLLED COMPACTION

**What it is:** You choose when to compact context, not the system.
Summarizes conversation and frees context space.

**How PRISM should use it:**
- After completing a milestone, before starting next: `/compact`
- After loading large files for reference, once digested: `/compact`
- When context getting full but mid-task: save state first, then `/compact`

**What it replaces:** Surprise compaction mid-implementation that loses work.

---

## 10. PLUGINS — PORTABLE PRISM PACKAGE

**What it is:** Bundle skills, commands, subagents, hooks, and MCP servers into
a single distributable package.

**How PRISM should use it:**
Package all PRISM Claude Code configuration as a plugin:
- 10+ SKILL.md files (manufacturing domain expertise)
- 5+ subagents (safety reviewer, registry expert, architect, etc.)
- 5+ slash commands (boot, gate, checkpoint, plan, build)
- Hooks (post-edit build, safety validation)
- MCP server connection config

Share across workstations. Onboard new team members instantly.

---

## IMPACT ON DA PHASE

DA phase should be restructured as "Configure Claude Code for PRISM":

```
DA-MS0: Create CLAUDE.md hierarchy
  - Root CLAUDE.md with project context, laws, position, build commands
  - src/engines/CLAUDE.md with engine conventions
  - src/dispatchers/CLAUDE.md with dispatcher patterns
  Effort: 1-2 hours

DA-MS1: Create subagents + slash commands
  - 5 subagents: safety-reviewer, registry-expert, architect, test-runner, data-validator
  - 5 commands: /boot, /gate, /checkpoint, /plan, /build
  Effort: 1-2 hours

DA-MS2: Convert top skills to SKILL.md format
  - Convert 10-15 most-used skills from skills-consolidated/
  - Test auto-loading by relevance
  Effort: 2-3 hours

DA-MS3: Configure hooks
  - Post-edit: auto-build
  - Safety validation hooks
  - Anti-regression hooks
  Effort: 1 hour

DA-MS4: Test end-to-end workflow
  - Boot with /boot → work on R1-MS4.5 → checkpoint → compact → resume
  - Test parallel subagents on a small batch
  - Verify subagent memory persists across sessions
  Effort: 1 session
```

**Total DA phase: 1 session instead of 2-3 sessions.**
Savings carry forward to every subsequent session.

---

## HYBRID WORKFLOW RECOMMENDATION

```
USE CLAUDE CODE FOR:                    USE CLAUDE.AI MCP FOR:
─────────────────────                   ──────────────────────
Implementation (write/test/fix loops)   Planning and design sessions
R1 registry work                        Roadmap updates
R2 test suite creation                  Ralph/Omega validation
R3 action implementation                Phase gate reviews
R7 physics engine wiring                Brainstorm-to-ship expansions
Multi-file refactoring                  Strategic analysis
Parallel batch operations               Competitive positioning
Background long-running tasks           User experience design (R8)
```

---

## COST OPTIMIZATION

```
Current: All Opus, all the time via MCP
Proposed: Model per task type

Task Type              Model    Cost Multiplier
────────────────────   ──────   ──────────────
File exploration       Haiku    1x (baseline)
Implementation         Sonnet   3x
Safety/architecture    Opus     15x

Estimated savings: 40-60% of token costs for same output quality
because exploration and routine coding don't need Opus reasoning.
```

---

## THINGS YOUR ROADMAP ALREADY HAS THAT MAP TO CLAUDE CODE

| PRISM Concept | Claude Code Native Feature |
|---------------|---------------------------|
| Session boot protocol | CLAUDE.md auto-loading |
| CURRENT_POSITION.md | CLAUDE.md + /boot command |
| HANDOFF.md | Subagent persistent memory |
| prism_orchestrate→agent_parallel | Parallel subagents (up to 10) |
| W2.5 skill auto-injection | SKILL.md on-demand loading |
| Hook system (53 hooks) | Deterministic PreToolUse/PostToolUse hooks |
| Effort tiers (max/high/med/low) | Model switching (Opus/Sonnet/Haiku) |
| prism_context→context_compress | /compact command (user-controlled) |
| GSD commands | Slash commands (/boot, /gate, etc.) |
| Response templates | Skill-scoped output formatting |
| Skill chains | Subagent workflows with handoffs |
| Ralph loops | /gate command + safety-reviewer subagent |
| Session state_save | /checkpoint command + CLAUDE.md update |

---

## NEXT STEPS

1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Navigate to C:\PRISM\mcp-server\
3. Run `claude` to start
4. Run `/init` to auto-generate initial CLAUDE.md from codebase scan
5. Customize CLAUDE.md with PRISM-specific context
6. Create subagents, commands, skills, hooks per this document
7. Test with R1-MS4.5 (DataValidationEngine) as first real task
