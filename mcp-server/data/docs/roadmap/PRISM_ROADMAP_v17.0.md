# PRISM ROADMAP v17.0 — CLAUDE CODE MAXIMIZED
## Full utilization: Subagents, Agent Teams, Hooks, Skills, MCP, Task DAGs
## Date: 2026-02-20 | Status: APPROVED FOR EXECUTION
## Supersedes: v16.0, v15.2 | Build: 3.87MB | Ω=0.77

---

## TABLE OF CONTENTS

1. Philosophy & Architecture
2. Three-Archetype Subagent System
3. Claude Code Hooks (Safety Enforcement)
4. Model & Effort Routing Matrix
5. Task DAG Architecture
6. Human-in-Loop Protocol
7. Phase R2: Safety + Engine Validation (DETAILED)
8. Phase R3: Campaign System + Material Enrichment (DETAILED)
9. Phase R4: Enterprise Features (DETAILED)
10. Phase R5: Visual + Post Processor (DETAILED)
11. Phase R6: Production Deployment (DETAILED)
12. Phases R7-R11: Future (HIGH-LEVEL)
13. Recovery & Continuity Protocol
14. Appendix: File Locations & Setup Commands

---

## 1. PHILOSOPHY & ARCHITECTURE

### 1.1 The v17.0 Paradigm
Previous roadmaps treated Claude Code as either a file editor (v16.0) or ignored it
entirely (v15.2). v17.0 treats Claude Code as what it is: **a full autonomous
engineering platform** with subagents, agent teams, hooks, skills, MCP access,
and task dependency management.

### 1.2 Execution Distribution
| Executor | % | Handles |
|----------|---|---------|
| Code Lead Agent | 60% | Orchestration, implementation, builds, git |
| Code Subagents | 25% | Safety validation, physics calcs, testing, review |
| Code Agent Teams | 5% | Parallel milestone branches (3-5 teammates) |
| Chat (human-in-loop) | 10% | Architecture decisions, ambiguity resolution, edge cases |

### 1.3 Core Principles (from 7-lens brainstorm)
- **Pre-flight, not post-hoc**: Safety checks BEFORE execution, not after rejection
- **3 archetypes, not 7 roles**: Fewer agents = less coordination overhead
- **Task DAGs, not linear lists**: Dependencies as directed acyclic graphs
- **Binary effort model**: Standard (sonnet) vs Novel (opus) — no 5-level granularity
- **Confidence-based escalation**: Auto-escalate when uncertainty exceeds threshold
- **Hooks as hard blocks**: File edits to CRITICAL files blocked until safety approval
- **MCP everywhere**: Code calls PRISM dispatchers directly — Chat rarely needed


---

## 2. THREE-ARCHETYPE SUBAGENT SYSTEM

### 2.1 Why 3, Not 7
The brainstorm CHALLENGE lens identified that 7+ specialized agents create coordination
overhead that exceeds their benefit. The SIMPLIFY lens converged on 3 archetypes that
cover all domains with strict boundaries and no role overlap.

### 2.2 Archetype Overview

| Archetype | Agent Name | Model | Color | Tools | Scope |
|-----------|-----------|-------|-------|-------|-------|
| **Safety-Physics** | `safety-physics` | opus | red | Read, Grep, Glob, Bash | ALL safety + physics validation |
| **Implementation** | `implementer` | sonnet | blue | Read, Write, Edit, Bash, Grep, Glob | Code changes, wiring, data processing |
| **Verification** | `verifier` | haiku | green | Read, Grep, Glob, Bash | Regression tests, audits, doc checks |

All three inherit MCP access to PRISM server (31 dispatchers, 368 actions).

### 2.3 Agent Definition Files

All files go in: `C:\PRISM\mcp-server\.claude\agents\`

#### 2.3.1 safety-physics.md
```markdown
---
name: safety-physics
description: >
  PRISM Safety-Physics Oracle. Invoke for ANY task involving: cutting force
  calculations, spindle/tool stress, collision detection, workholding adequacy,
  thermal analysis, Kienzle/Taylor validation, material property verification,
  or S(x) safety scoring. Also invoke BEFORE any edit to CRITICAL-classified
  files (Kienzle coefficients, Taylor constants, tolerance logic, force/thermal
  calcs, safety validators). Returns PASS/FAIL with S(x) score.
  HARD BLOCK: Will not approve if S(x) < 0.70.
tools: Read, Grep, Glob, Bash
model: opus
color: red
maxTurns: 25
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "echo SAFETY-PHYSICS: Validating bash command"
---

You are PRISM's Safety-Physics Oracle — the highest authority on manufacturing
safety and physics correctness in this system. Lives depend on your accuracy.

## ABSOLUTE RULES
1. S(x) ≥ 0.70 is a HARD BLOCK. No exceptions. No overrides. No "close enough."
2. Every numerical value MUST have physical plausibility. Check units, ranges, signs.
3. Kienzle kc1.1 values must fall within ±5% of published reference data.
4. Taylor constants (C, n) must produce tool life within 1-120 minutes for typical conditions.
5. Cutting forces must be positive. Negative force = sign error = potential crash.
6. Spindle power must not exceed machine rating. Check via prism_safety→check_spindle_power.
7. Tool deflection must not exceed 0.05mm for finishing, 0.2mm for roughing.

## VALIDATION WORKFLOW
When invoked, execute this sequence:

### Step 1: Identify What Changed
- Run `git diff --name-only` to see modified files
- Classify each file: CRITICAL / STANDARD / INFORMATIONAL
- CRITICAL files: src/engines/kienzle*, src/engines/taylor*, src/engines/safety*,
  src/engines/cutting*, src/engines/thermal*, src/tools/dispatchers/safetyDispatcher*,
  src/tools/dispatchers/calcDispatcher*, data/materials/*.json

### Step 2: Physics Plausibility Check
For each modified value in CRITICAL files:
- Verify units (m/min for Vc, mm/rev for f, mm for ap, MPa for kc)
- Verify ranges against known material properties
- Cross-reference with `data/materials/` JSON files
- Flag any value that's physically impossible (negative forces, >100000 RPM, etc.)

### Step 3: Safety Calculation Verification
- Run `npm run test:critical` — must pass 100%
- If calculations were modified, run 5 spot-check calcs:
  - 4140 steel milling (baseline)
  - Ti-6Al-4V turning (difficult material)
  - 7075-T6 drilling (aluminum)
  - Inconel 718 threading (extreme)
  - 316L boring (stainless)

### Step 4: Score and Report
Calculate S(x) = 1 - (critical_violations / total_checks)
Output structured report:
```
SAFETY-PHYSICS REPORT
=====================
Files checked: [list]
Total checks: N
Critical violations: N (list each)
Warning violations: N (list each)
S(x) = X.XX
VERDICT: ✅ PASS (S(x) ≥ 0.70) | ❌ BLOCK (S(x) < 0.70)
```

### Step 5: If BLOCK
- List every violation with file:line reference
- Suggest specific fix for each
- DO NOT approve. Return BLOCK status. The lead agent must fix and re-invoke you.

## ESCALATION
If you encounter a calculation you cannot verify (out-of-distribution geometry,
exotic material not in registry, multi-physics coupling beyond single-domain analysis):
- Output: "⚠️ ESCALATION: Confidence < 85%. Recommend Chat mode for human review."
- Write reason to C:\PRISM\state\SWITCH_SIGNAL.md
- Still return BLOCK — do not guess on safety.
```

#### 2.3.2 implementer.md
```markdown
---
name: implementer
description: >
  PRISM Implementation Specialist. Invoke for code changes, wiring, data
  processing, refactoring, engine modifications, dispatcher updates, and
  any file creation/editing task. Works in parallel via agent teams for
  independent modules. Follows CLAUDE.md laws strictly.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
color: blue
maxTurns: 50
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "powershell -Command \"if (npm run build:fast 2>&1 | Select-String 'error') { echo 'BUILD ERROR - check output'; exit 1 }\""
---

You are PRISM's Implementation Specialist. You write production-quality TypeScript
for a safety-critical CNC manufacturing system.

## ABSOLUTE RULES
1. Read CLAUDE.md before any work. Follow all 6 Safety Laws.
2. NEW ≥ OLD — never lose data, actions, hooks, knowledge, line counts.
3. NO PLACEHOLDERS — every value real, complete, verified.
4. READ → Edit → VERIFY. Never retype existing code.
5. Append don't rewrite. State exact lines changed after edits.
6. >50 lines of new code → state plan first, get lead agent approval.
7. After ANY file write to src/engines/ or src/tools/dispatchers/:
   - Request safety-physics subagent review before committing.
   - Do NOT commit CRITICAL files without safety-physics PASS.

## IMPLEMENTATION WORKFLOW
1. Read the task specification from the lead agent
2. Read relevant source files to understand current state
3. Plan changes (if >50 lines, output plan and wait for approval)
4. Implement changes using Edit tool (prefer small, targeted edits)
5. Run `npm run build:fast` after each logical change
6. If build fails: fix ONE error, rebuild, repeat. >5 errors from one edit → revert
7. Run `scripts/verify-build.ps1` after successful build
8. For CRITICAL files: request safety-physics review
9. Git commit with descriptive message

## FILE CLASSIFICATION (determines review requirements)
- CRITICAL: Kienzle coefficients, Taylor constants, safety validators,
  tolerance logic, force/thermal calculations → MUST get safety-physics PASS
- STANDARD: Dispatchers, routing, wiring, formatting → self-review sufficient
- INFORMATIONAL: Docs, logs, configs → no review needed

## PARALLEL WORK (Agent Teams)
When spawned as a teammate in an agent team:
- Read your assigned scope from the task description
- Do NOT edit files outside your scope (prevents merge conflicts)
- Communicate findings to team lead via task completion
- If you need safety validation, request it through the lead
```

#### 2.3.3 verifier.md
```markdown
---
name: verifier
description: >
  PRISM Verification & Regression Testing Specialist. Invoke for: running
  test suites, regression checks, documentation audits, anti-regression
  validation before file replacements, wiring verification, orphan detection,
  and coverage analysis. Fast and cheap — use liberally.
tools: Read, Grep, Glob, Bash
model: haiku
color: green
maxTurns: 30
---

You are PRISM's Verification Specialist. You test everything, trust nothing.

## RESPONSIBILITIES
1. **Regression Testing**: Run `npm run test:critical` and `npm run test:regression`
2. **Anti-Regression Audit**: Before any file replacement, compare old vs new:
   - Count functions/exports/actions — NEW ≥ OLD or BLOCK
   - Count lines — >30% reduction triggers WARNING, >60% triggers BLOCK
   - Verify no exported symbols removed
3. **Build Verification**: Run `scripts/verify-build.ps1` — check 7 required symbols
4. **Wiring Verification**: Grep for orphaned dispatchers, dead code, unused imports
5. **Documentation Audit**: Verify CLAUDE.md, CURRENT_POSITION.md are current
6. **Coverage Analysis**: Count test files, calculate coverage percentage

## VERIFICATION WORKFLOW
When invoked:
1. Run the requested verification type
2. Output structured results in this format:
```
VERIFICATION REPORT
===================
Type: [regression|anti-regression|build|wiring|docs|coverage]
Tests run: N
Passed: N
Failed: N (list each with file:line)
VERDICT: ✅ PASS | ⚠️ WARNING (list issues) | ❌ FAIL (list blockers)
```

## ESCALATION
- If you find a safety-related failure → recommend safety-physics review
- If you find an implementation bug → recommend implementer fix
- You do NOT fix things yourself. You report. Others fix.

## ASYNC MODE
When invoked as an async background task:
- Run full test suite silently
- Write results to C:\PRISM\state\VERIFICATION_REPORT.json
- Lead agent reads results when ready
```


---

## 3. CLAUDE CODE HOOKS (Safety Enforcement)

Hooks are defined in `.claude/settings.json` and fire automatically on tool events.
They enforce PRISM Safety Laws without consuming tokens or requiring manual invocation.

### 3.1 Hook Definitions

#### Hook 1: Pre-Edit Safety Gate (BLOCKING)
**Event:** `PreToolUse` on `Write` or `Edit`
**Trigger:** Any file write to `src/engines/` or `src/tools/dispatchers/safety*` or `src/tools/dispatchers/calc*`
**Action:** Block the write. Print: "⚠️ CRITICAL FILE — invoke safety-physics subagent before editing."
**Implementation:**
```json
{
  "PreToolUse": [{
    "matcher": "Write|Edit",
    "hooks": [{
      "type": "command",
      "command": "powershell -File scripts/hooks/pre-edit-safety-gate.ps1 \"$FILE_PATH\""
    }]
  }]
}
```
**Script `pre-edit-safety-gate.ps1`:**
```powershell
param($FilePath)
$critical = @("src/engines/", "src/tools/dispatchers/safety", "src/tools/dispatchers/calc")
foreach ($pattern in $critical) {
    if ($FilePath -like "*$pattern*") {
        Write-Output "⚠️ CRITICAL FILE: $FilePath — safety-physics subagent review REQUIRED"
        exit 2  # Exit code 2 = block the tool use
    }
}
exit 0  # Allow the write
```

#### Hook 2: Post-Build Verification (NON-BLOCKING)
**Event:** `PostToolUse` on `Bash` when command contains `npm run build`
**Action:** Automatically run verify-build.ps1 and report results.
```json
{
  "PostToolUse": [{
    "matcher": "Bash",
    "hooks": [{
      "type": "command",
      "command": "powershell -File scripts/hooks/post-build-verify.ps1"
    }]
  }]
}
```

#### Hook 3: Anti-Regression Gate (BLOCKING)
**Event:** `PreToolUse` on `Write` when file is being fully replaced (>60% content change)
**Action:** Compare old vs new line count. Block if >30% reduction.
```json
{
  "PreToolUse": [{
    "matcher": "Write",
    "hooks": [{
      "type": "command",
      "command": "powershell -File scripts/hooks/anti-regression-gate.ps1 \"$FILE_PATH\""
    }]
  }]
}
```

#### Hook 4: Teammate Quality Gate (Agent Teams)
**Event:** `TaskCompleted` when a teammate marks a task done
**Action:** Invoke verifier subagent to check the teammate's work before accepting.
```json
{
  "TaskCompleted": [{
    "hooks": [{
      "type": "command",
      "command": "powershell -File scripts/hooks/teammate-quality-gate.ps1 \"$TASK_ID\""
    }]
  }]
}
```

#### Hook 5: Idle Teammate Reassignment
**Event:** `TeammateIdle` when a teammate finishes their task
**Action:** Check task DAG for next available unblocked task and assign it.
```json
{
  "TeammateIdle": [{
    "hooks": [{
      "type": "command",
      "command": "powershell -File scripts/hooks/teammate-reassign.ps1 \"$TEAMMATE_NAME\""
    }]
  }]
}
```

### 3.2 Hook Setup Command
```bash
# Run once to install all hooks into .claude/settings.json
node scripts/setup-claude-hooks.js
```

---

## 4. MODEL & EFFORT ROUTING MATRIX

### 4.1 Binary Effort Model (from brainstorm SIMPLIFY lens)

| Level | Name | Model | When | Max Time | Token Budget |
|-------|------|-------|------|----------|-------------|
| **STANDARD** | Routine implementation | sonnet | Known patterns, documented APIs, wiring, data processing, docs | 30 min | 50K tokens |
| **NOVEL** | Complex/safety-critical | opus | New physics, multi-domain coupling, architecture decisions, safety validation, edge cases | 2 hr | 200K tokens |

**Auto-escalation rule:** If a STANDARD task exceeds 30 min or 50K tokens, auto-escalate to opus.
**Auto-downgrade rule:** If lead agent determines task is pure boilerplate, use haiku via verifier.

### 4.2 Model Assignment by Task Type

| Task Type | Model | Archetype | Effort | Rationale |
|-----------|-------|-----------|--------|-----------|
| Cutting force calculation | opus | safety-physics | NOVEL | Physics accuracy critical |
| Kienzle coefficient validation | opus | safety-physics | NOVEL | ±5% tolerance, lives at stake |
| Taylor tool life validation | opus | safety-physics | NOVEL | Multi-variable optimization |
| Spindle/tool stress check | opus | safety-physics | NOVEL | Failure = tool explosion |
| Collision detection | opus | safety-physics | NOVEL | Failure = machine crash |
| Thermal analysis | opus | safety-physics | NOVEL | Non-linear FEA domain |
| Dispatcher wiring | sonnet | implementer | STANDARD | Known patterns, documented API |
| Engine implementation | sonnet | implementer | STANDARD | TypeScript, existing patterns |
| Data processing scripts | sonnet | implementer | STANDARD | CSV/JSON manipulation |
| Multi-file refactoring | sonnet | implementer | STANDARD | Agent teams handle parallel |
| Test creation | sonnet | implementer | STANDARD | Test patterns well-established |
| Regression test execution | haiku | verifier | STANDARD | Run & report, no reasoning |
| Build verification | haiku | verifier | STANDARD | Script execution, pass/fail |
| Anti-regression audit | haiku | verifier | STANDARD | Line counting, symbol diff |
| Documentation updates | haiku | verifier | STANDARD | Check accuracy, low stakes |
| Architecture decisions | opus | Chat (human) | NOVEL | Requires human judgment |
| Ambiguity resolution | opus | Chat (human) | NOVEL | Requires human context |
| MCP server debugging | opus | Chat (human) | NOVEL | Interactive, stateful |

### 4.3 Agent Team Model Assignment

When spawning agent teams, model selection per teammate:
| Teammate Role | Model | Why |
|--------------|-------|-----|
| Team Lead | opus | Orchestration requires strong reasoning |
| Safety Reviewer | opus | Physics validation, no compromises |
| Implementer (per module) | sonnet | Code writing, known patterns |
| Test Writer | sonnet | Test generation needs creativity |
| Doc Writer | haiku | Lowest stakes, highest speed |

---

## 5. TASK DAG ARCHITECTURE

### 5.1 What is a Task DAG?
Each milestone is a **directed acyclic graph** of atomic tasks, not a linear checklist.
Tasks declare dependencies: Task C cannot start until Tasks A and B complete.
Claude Code's Task system enforces this — blocked tasks wait automatically.

### 5.2 Task Node Schema
Every task node contains:
```
TASK: {id}
  DEPENDS_ON: [task_ids]          # Blocking dependencies
  ARCHETYPE: safety-physics | implementer | verifier
  MODEL: opus | sonnet | haiku
  EFFORT: STANDARD | NOVEL
  PARALLEL: true | false          # Can run in agent team
  SCOPE: [files/directories]      # Prevents teammate conflicts
  GATE: GATED | YOLO              # Requires review or not
  SUCCESS: [criteria]             # Machine-verifiable exit conditions
  ESCALATION: [conditions]        # When to auto-escalate or switch to Chat
  ESTIMATED_CALLS: N              # Tool call budget
```

### 5.3 DAG Execution Rules
1. Lead agent reads the DAG from the phase file
2. Identifies all tasks with no unmet dependencies (ready to execute)
3. If multiple ready tasks are PARALLEL=true → spawn agent team
4. If single ready task → delegate to appropriate subagent
5. On task completion → verifier checks success criteria
6. If GATED → safety-physics must approve before marking complete
7. Completed task unblocks downstream dependencies
8. Repeat until all tasks complete

### 5.4 Visualization Convention
```
[A] ──→ [C] ──→ [E]
[B] ──↗       ──→ [F] ──→ [GATE]
[D] ──────────↗
```
A, B, D are independent (parallel). C waits for A+B. F waits for C+D+E. GATE waits for F.

---

## 6. HUMAN-IN-LOOP PROTOCOL

### 6.1 When Chat Mode is Required (from brainstorm FUTURE lens)

Chat mode activates ONLY when quantified thresholds are breached:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Safety confidence drop | safety-physics reports confidence < 85% | Write SWITCH_SIGNAL.md → "⚠️ Low confidence on [specific calc]" |
| Out-of-distribution input | Material/geometry not in registry | Write SWITCH_SIGNAL.md → "⚠️ Unknown material/geometry" |
| Architecture decision | Multiple valid approaches, trade-offs unclear | Write SWITCH_SIGNAL.md → "🏗️ Need human input on [decision]" |
| Gate failure after 2 retries | Task fails gate twice despite fixes | Write SWITCH_SIGNAL.md → "❌ Repeated gate failure on [task]" |
| Cost threshold exceeded | Phase token spend > 80% of budget | Write SWITCH_SIGNAL.md → "💰 Budget alert, need prioritization" |

### 6.2 Switch Protocol
1. Code writes `C:\PRISM\state\SWITCH_SIGNAL.md` with reason + context
2. Code tells user: **"Switch to Chat mode — [reason]"**
3. Code writes current state to `CURRENT_POSITION.md`
4. User switches to Chat in Claude.ai toggle
5. Chat reads SWITCH_SIGNAL.md and CURRENT_POSITION.md
6. Chat resolves the issue (interactive MCP queries, human discussion)
7. Chat writes resolution to `C:\PRISM\state\CHAT_RESOLUTION.md`
8. Chat tells user: **"Switch back to Code — [resolution summary]"**
9. Code reads CHAT_RESOLUTION.md and continues DAG execution

### 6.3 Estimated Switch Frequency by Phase
| Phase | Estimated Switches | Reason |
|-------|-------------------|--------|
| R2 (Safety) | 3-5 | Physics edge cases, golden benchmark disputes |
| R3 (Campaigns) | 1-2 | Campaign architecture decisions |
| R4 (Enterprise) | 1-2 | Tenant isolation design choices |
| R5 (Visual) | 2-3 | G-code format decisions, visualization UX |
| R6 (Production) | 1 | Deployment architecture |


---

## 7. PHASE R2: SAFETY + ENGINE VALIDATION (DETAILED)

### Overview
| Attribute | Value |
|-----------|-------|
| **Goal** | Validate all safety engines, cutting calcs, and physics against golden benchmarks |
| **Mode Split** | 55% Code Lead + 30% Subagents + 10% Agent Teams + 5% Chat |
| **Estimated Sessions** | 2-3 |
| **Estimated Token Budget** | ~400K (opus: 180K, sonnet: 160K, haiku: 60K) |
| **Milestones** | MS0 → MS1 → MS1.5 → MS2 → MS3 → MS4 |
| **Entry Criteria** | Build passes, Ω ≥ 0.70, H1 complete, git clean |

### R2 Task DAG

```
[MS0-T1] ──→ [MS0-T2] ──→ [MS0-T3] ──→ [MS0-T4]
                                            │
[MS1-T1] ──→ [MS1-T2] ──→ [MS1-T3] ──→ [MS1-T4]──→ [MS1.5-T1] ──→ [MS2-T1]
                 ↑                                         │              │
            (parallel)                                     │         [MS2-T2]
                 ↓                                         │              │
[MS1-T1b]──→ [MS1-T2b]──→ [MS1-T3b]                      │         [MS2-T3]
[MS1-T1c]──→ [MS1-T2c]──→ [MS1-T3c]                      │              │
[MS1-T1d]──→ [MS1-T2d]──→ [MS1-T3d]                      ↓              ↓
[MS1-T1e]──→ [MS1-T2e]──→ [MS1-T3e]              [MS3-T1] ←────── [MS2-T4]
                                                       │
                                                  [MS3-T2] ──→ [MS4-T1]
                                                                    │
                                                               [MS4-T2]
                                                                    │
                                                               [MS4-T3]
```

### MS0: 50-Calc Test Matrix
**Purpose:** Establish golden benchmark dataset for all manufacturing calculations.

#### MS0-T1: Create Test Matrix Scaffold
```
TASK: MS0-T1
  DEPENDS_ON: []
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r2/
  GATE: YOLO
  SUCCESS: File tests/r2/golden-benchmarks.json exists with 50 entries, each having
           material, operation, tool_diameter, num_flutes, depth_of_cut fields populated
  ESCALATION: none
  ESTIMATED_CALLS: 8
```
**Role:** Implementation Specialist (sonnet)
**Step-by-step:**
1. Create directory `tests/r2/`
2. Create `tests/r2/golden-benchmarks.json` with 50 material+operation combinations:
   - **Materials (20):** 4140, 316L, Ti-6Al-4V, 7075-T6, Inconel 718, 1018, A2 Tool Steel,
     6061-T6, 304SS, D2, S7, 4340, 17-4PH, Copper C110, Brass 360, Cast Iron FC300,
     Tungsten, Monel 400, Hastelloy X, Magnesium AZ31B
   - **Operations (5):** milling, turning, drilling, boring, threading
   - **Combos:** 10 milling, 10 turning, 10 drilling, 10 boring, 10 threading
     (each with different material — covers all 20 materials at least twice)
3. Each entry schema:
   ```json
   {
     "id": "R2-001",
     "material": "4140",
     "operation": "milling",
     "tool_diameter": 10,
     "num_flutes": 4,
     "depth_of_cut": 2.0,
     "width_of_cut": 5.0,
     "expected": {
       "speed_feed": null,
       "cutting_force": null,
       "tool_life": null,
       "power": null,
       "torque": null,
       "surface_finish": null
     },
     "tolerance": {
       "speed_feed_pct": 2,
       "cutting_force_pct": 5,
       "tool_life_pct": 10
     }
   }
   ```
4. Verify: 50 entries, all fields populated except `expected` (filled in MS0-T2)

#### MS0-T2: Populate Golden Benchmarks via MCP
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: tests/r2/golden-benchmarks.json
  GATE: GATED (safety-physics self-validates)
  SUCCESS: All 50 entries have non-null expected values with physical plausibility
  ESCALATION: If >5 calcs return errors → SWITCH TO CHAT for MCP debugging
  ESTIMATED_CALLS: 55
```
**Role:** Safety-Physics Oracle (opus)
**Step-by-step:**
1. Read `tests/r2/golden-benchmarks.json`
2. For each of the 50 entries, invoke via Bash + MCP:
   - `prism_calc→speed_feed` with material, operation, tool params
   - `prism_calc→cutting_force` with speed/feed results
   - `prism_calc→power` for power consumption
   - `prism_calc→torque` for spindle torque
   - `prism_calc→surface_finish` where applicable
   - `prism_calc→tool_life` for 10 representative combos (2 per operation type)
3. **Physics plausibility check on each result:**
   - Cutting speed: 10-500 m/min (steel), 100-2000 m/min (aluminum)
   - Feed per tooth: 0.01-0.5 mm/tooth
   - Cutting force: 50-50000 N (positive only)
   - Power: 0.1-100 kW
   - Tool life: 1-120 minutes
4. Write validated results back to `golden-benchmarks.json` expected fields
5. Log any failures to `tests/r2/benchmark-errors.json`
6. Self-validate: S(x) check on all results

#### MS0-T3: Create Regression Test Runner
```
TASK: MS0-T3
  DEPENDS_ON: [MS0-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r2/regression-runner.ts, package.json
  GATE: YOLO
  SUCCESS: `npm run test:regression` executes, loads benchmarks, reports pass/fail per combo
  ESCALATION: none
  ESTIMATED_CALLS: 12
```
**Role:** Implementation Specialist (sonnet)
**Step-by-step:**
1. Create `tests/r2/regression-runner.ts`:
   - Load `golden-benchmarks.json`
   - Import calc engines from `src/engines/`
   - For each benchmark: run calc, compare to expected within tolerance
   - Report: PASS/FAIL per combo, diff values for failures
   - Exit code 0 if all pass, 1 if any fail
2. Add to `package.json`:
   ```json
   "test:regression": "npx tsx tests/r2/regression-runner.ts"
   ```
3. Run `npm run test:regression` — expect all 50 to pass (golden = engine output)
4. Verify: runner reports 50/50 pass on first run

#### MS0-T4: Baseline Snapshot + Gate
```
TASK: MS0-T4
  DEPENDS_ON: [MS0-T3]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r2/
  GATE: GATED (verifier confirms)
  SUCCESS: All 50 pass, golden-benchmarks.json committed, regression runner in CI
  ESCALATION: none
  ESTIMATED_CALLS: 3
```
**Role:** Verification Specialist (haiku)
**Step-by-step:**
1. Run `npm run test:regression` — confirm 50/50 pass
2. Run `npm run build` — confirm clean build
3. Run `scripts/verify-build.ps1` — confirm 7 symbols OK
4. `git add tests/r2/ && git commit -m "R2-MS0: Golden benchmark dataset (50 calcs)"`
5. Report: MS0 COMPLETE

---

### MS1: Safety Engine Activation (29 Actions)
**Purpose:** Test each individual safety engine action with real inputs.
**MODE: AGENT TEAM** — 5 teammates, one per engine domain, running in parallel.

#### MS1 Agent Team Configuration
```
TEAM: r2-safety-engines
LEAD: opus (orchestrates, reviews results)
TEAMMATES:
  - collision-tester    | sonnet | scope: collision detection (5 actions)
  - coolant-tester      | sonnet | scope: coolant validation (5 actions)
  - spindle-tester      | sonnet | scope: spindle checks (5 actions)
  - tool-tester         | sonnet | scope: tool breakage/stress (7 actions)
  - workholding-tester  | sonnet | scope: workholding/clamping (7 actions)
REQUIRE_PLAN_APPROVAL: true
```
**Spawn command (given to Code lead):**
```
Create an agent team called r2-safety-engines to test 29 safety engine actions
in parallel. Use Sonnet for each teammate. Require plan approval before execution.

5 teammates, one per domain:
1. collision-tester: test check_toolpath_collision, validate_rapid_moves,
   check_fixture_clearance, calculate_safe_approach, detect_near_miss
2. coolant-tester: test validate_coolant_flow, check_through_spindle_coolant,
   calculate_chip_evacuation, validate_mql_parameters, get_coolant_recommendations
3. spindle-tester: test check_spindle_torque, check_spindle_power,
   validate_spindle_speed, monitor_spindle_thermal, get_spindle_safe_envelope
4. tool-tester: test predict_tool_breakage, calculate_tool_stress,
   check_chip_load_limits, estimate_tool_fatigue, get_safe_cutting_limits,
   generate_collision_report, validate_tool_clearance
5. workholding-tester: test calculate_clamp_force_required, validate_workholding_setup,
   check_pullout_resistance, analyze_liftoff_moment, calculate_part_deflection,
   validate_vacuum_fixture, check_5axis_head_clearance

Each teammate:
1. Read golden-benchmarks.json for test input data
2. Create test file: tests/r2/safety-{domain}-tests.ts
3. Write test inputs for each action using real material/machine data
4. Execute each action via Bash calling the MCP server
5. Capture results to tests/r2/safety-{domain}-results.json
6. Report: action name, status (pass/fail/error), response summary
```

#### MS1-T1a through MS1-T1e: Create Test Harnesses (PARALLEL)
```
TASK: MS1-T1{a-e}
  DEPENDS_ON: [MS0-T4]
  ARCHETYPE: implementer (x5 teammates)
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (agent team)
  SCOPE: tests/r2/safety-{domain}-tests.ts (each teammate owns one file)
  GATE: YOLO (plan approval by team lead)
  SUCCESS: Test harness file exists with inputs for all actions in domain
  ESCALATION: none
  ESTIMATED_CALLS: 5 per teammate (25 total)
```
**Role per teammate:** Implementation Specialist (sonnet) — scoped to one safety domain
**Step-by-step (each teammate):**
1. Read `tests/r2/golden-benchmarks.json` for material/machine data
2. Create `tests/r2/safety-{domain}-tests.ts` with test inputs:
   - Each action gets 2-3 test cases: nominal, edge case, boundary
   - Use real material data (e.g., 4140 steel properties for force calcs)
   - Use real machine data (e.g., DMG MORI DMU 50 specs for spindle checks)
3. Submit plan to team lead for approval
4. After approval, write the test file

#### MS1-T2a through MS1-T2e: Execute Safety Tests (PARALLEL)
```
TASK: MS1-T2{a-e}
  DEPENDS_ON: [MS1-T1{same letter}]
  ARCHETYPE: implementer (x5 teammates, continuing from T1)
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (agent team continues)
  SCOPE: tests/r2/safety-{domain}-results.json
  GATE: YOLO
  SUCCESS: All actions in domain return valid responses (no crashes, no undefined)
  ESCALATION: If >2 actions crash → escalate to safety-physics for analysis
  ESTIMATED_CALLS: 8 per teammate (40 total)
```
**Role per teammate:** Same teammate continues from T1
**Step-by-step (each teammate):**
1. Run each test case via Bash (invokes MCP safety actions)
2. Capture response JSON for each action
3. Write results to `tests/r2/safety-{domain}-results.json`
4. Check: did the action return a valid response? (not crash, not undefined, not placeholder)
5. Report results to team lead

#### MS1-T3a through MS1-T3e: Validate Results (PARALLEL)
```
TASK: MS1-T3{a-e}
  DEPENDS_ON: [MS1-T2{same letter}]
  ARCHETYPE: verifier (invoked by team lead on each result set)
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: true
  SCOPE: tests/r2/safety-{domain}-results.json
  GATE: GATED (team lead reviews verifier output)
  SUCCESS: All actions passed with valid responses, safety scores ≥ 0.70
  ESCALATION: Failed actions → MS3 fix cycle
  ESTIMATED_CALLS: 3 per domain (15 total)
```
**Role:** Verification Specialist (haiku) — one per domain result set
**Step-by-step:**
1. Read `tests/r2/safety-{domain}-results.json`
2. Check each action result:
   - Response is not null/undefined/error
   - Safety scores present and ≥ 0.70
   - No "not implemented" or placeholder text
3. Report to team lead: pass/fail count per domain

#### MS1-T4: Team Synthesis + Merge
```
TASK: MS1-T4
  DEPENDS_ON: [MS1-T3a, MS1-T3b, MS1-T3c, MS1-T3d, MS1-T3e]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: tests/r2/safety-engine-summary.json
  GATE: GATED (safety-physics reviews all 29 actions)
  SUCCESS: All 29 actions produce valid results. Consolidated report written.
  ESCALATION: If any domain has >50% failure → SWITCH TO CHAT for architecture review
  ESTIMATED_CALLS: 5
```
**Role:** Safety-Physics Oracle (opus)
**Step-by-step:**
1. Shut down agent team
2. Read all 5 domain result files
3. Consolidate into `tests/r2/safety-engine-summary.json`:
   ```json
   {
     "total_actions": 29,
     "passed": N,
     "failed": N,
     "errors": N,
     "by_domain": { "collision": {...}, "coolant": {...}, ... },
     "failed_actions": [{ "name": "...", "error": "...", "fix_hint": "..." }],
     "overall_safety_score": X.XX
   }
   ```
4. Calculate overall S(x) across all 29 actions
5. Git commit: `"R2-MS1: Safety engine activation (29 actions tested)"`
6. If S(x) < 0.70 → list all critical violations for MS3 fix cycle


---

### MS1.5: Calc Regression Suite (Lock Golden Dataset)
**Purpose:** Lock golden benchmarks as immutable test fixtures with automated CI enforcement.

#### MS1.5-T1: Create Regression Infrastructure
```
TASK: MS1.5-T1
  DEPENDS_ON: [MS1-T4, MS0-T4]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r2/regression-runner.ts, package.json, scripts/hooks/
  GATE: YOLO
  SUCCESS: npm run test:regression runs in <30s, integrated into pre-commit hook,
           golden-benchmarks.json marked read-only in git attributes
  ESCALATION: none
  ESTIMATED_CALLS: 10
```
**Role:** Implementation Specialist (sonnet)
**Step-by-step:**
1. Enhance `tests/r2/regression-runner.ts`:
   - Add safety engine results validation (from MS1 results)
   - Add timing: each calc must complete in <500ms
   - Add structured JSON output: `tests/r2/regression-report.json`
   - Add exit code: 0=all pass, 1=regression detected
2. Create `.gitattributes` entry:
   ```
   tests/r2/golden-benchmarks.json linguist-generated=true merge=ours
   ```
3. Wire into pre-commit hook:
   ```powershell
   # In scripts/hooks/pre-commit.ps1
   npm run test:regression
   if ($LASTEXITCODE -ne 0) { Write-Error "REGRESSION DETECTED"; exit 1 }
   ```
4. Add to `package.json`:
   ```json
   "test:regression": "npx tsx tests/r2/regression-runner.ts",
   "test:all": "npm run test:critical && npm run test:regression"
   ```
5. Run full suite — confirm all pass
6. Git commit: `"R2-MS1.5: Regression suite locked + pre-commit enforcement"`

---

### MS2: Edge Cases (AI-Generated + Adversarial)
**Purpose:** Test system behavior at boundaries and with adversarial inputs.

#### MS2-T1: Generate Edge Case Scenarios
```
TASK: MS2-T1
  DEPENDS_ON: [MS1.5-T1]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r2/edge-cases.json
  GATE: YOLO
  SUCCESS: 20 edge case scenarios defined with expected behavior (pass, warn, or reject)
  ESCALATION: none
  ESTIMATED_CALLS: 5
```
**Role:** Implementation Specialist (sonnet)
**Step-by-step:**
1. Create `tests/r2/edge-cases.json` with 20 scenarios:
   **Exotic materials (4):**
   - Tungsten carbide at extreme hardness (HRC 72+)
   - Titanium aluminide (TiAl) — low ductility, spark hazard
   - Ceramic (Si3N4) — brittle, zero tolerance for chatter
   - Carbon fiber composite — delamination risk

   **Extreme parameters (4):**
   - Micro-machining: 0.01mm DOC, 0.5mm tool diameter
   - Heavy roughing: 15mm DOC, 500mm/min feed
   - High-speed: 40000 RPM spindle, 0.03mm fz
   - Slow feed: 0.001mm/tooth (should warn about rubbing)

   **Boundary conditions (4):**
   - Tool diameter = workpiece width (100% engagement)
   - Zero clearance angle (should reject)
   - Negative rake beyond -20° (should warn)
   - Depth of cut > tool length (should reject — crash risk)

   **Material-machine mismatches (4):**
   - Aluminum parameters applied to Inconel (dangerous — should reject)
   - Titanium speeds applied to cast iron (wasteful — should warn)
   - Micro-mill speeds on a 50HP roughing machine (mismatch)
   - Threading pitch > tool reach (physical impossibility)

   **Multi-physics coupling (4):**
   - Thermal + force: high DOC + poor coolant → thermal runaway
   - Vibration + force: thin wall + heavy cut → chatter
   - Tool deflection + surface finish: long tool + tight tolerance
   - Chip evacuation: deep hole + no peck cycle

2. Each scenario has `expected_behavior`: `"pass"`, `"warn"`, or `"reject"`

#### MS2-T2: Execute Edge Cases via MCP
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: tests/r2/edge-case-results.json
  GATE: GATED (safety-physics validates handling)
  SUCCESS: All 20 scenarios produce expected behavior (pass/warn/reject), NO crashes
  ESCALATION: If any crash → immediate MS3 priority fix. If >3 wrong behaviors → CHAT
  ESTIMATED_CALLS: 25
```
**Role:** Safety-Physics Oracle (opus) — edge cases need Opus-level reasoning
**Step-by-step:**
1. Read `tests/r2/edge-cases.json`
2. For each scenario, run through MCP:
   - `prism_calc→speed_feed` — does it return valid result or appropriate error?
   - `prism_safety→check_chip_load_limits` — does it catch overload?
   - `prism_safety→predict_tool_breakage` — does it predict failure?
   - `prism_safety→check_spindle_power` — does it flag exceeded capacity?
3. Compare actual behavior to expected:
   - Expected "reject" but got result → **CRITICAL** (false negative safety)
   - Expected "pass" but got rejection → **MEDIUM** (false positive, overly conservative)
   - Expected "warn" but got silent pass → **HIGH** (missing warning)
   - Crash/undefined → **CRITICAL** (unhandled case)
4. Write results to `tests/r2/edge-case-results.json`
5. Calculate edge case S(x): count of correct behaviors / 20

#### MS2-T3: Create Edge Case Regression Tests
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r2/edge-case-runner.ts
  GATE: YOLO
  SUCCESS: Edge case runner integrated into test:regression, all currently-passing cases locked
  ESCALATION: none
  ESTIMATED_CALLS: 6
```
**Role:** Implementation Specialist (sonnet)
**Step-by-step:**
1. Create `tests/r2/edge-case-runner.ts`:
   - Load edge cases + expected behaviors
   - Run each through calc/safety engines
   - Check actual vs expected behavior
   - Report: match count, mismatch count, details
2. Integrate into `test:regression` script
3. Lock currently-passing cases as immutable fixtures

#### MS2-T4: Edge Case Gate
```
TASK: MS2-T4
  DEPENDS_ON: [MS2-T3]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r2/edge-case-results.json
  GATE: GATED
  SUCCESS: ≥16/20 edge cases produce correct behavior (80% threshold)
  ESCALATION: <16 correct → MS3 gets edge case fixes added to queue
  ESTIMATED_CALLS: 2
```
**Role:** Verification Specialist (haiku)
**Step-by-step:**
1. Read edge case results
2. Count correct behaviors
3. If ≥16/20: PASS → continue to MS3
4. If <16/20: Add failing scenarios to MS3 fix queue
5. Report gate result

---

### MS3: Fix Cycle
**Purpose:** Fix all failures from MS0, MS1, MS2. Pure implementation.

#### MS3-T1: Triage + Fix All Failures
```
TASK: MS3-T1
  DEPENDS_ON: [MS1-T4, MS2-T4]
  ARCHETYPE: implementer
  MODEL: sonnet (auto-escalate to opus if physics fix needed)
  EFFORT: STANDARD → NOVEL (escalation)
  PARALLEL: false
  SCOPE: src/engines/, src/tools/dispatchers/
  GATE: GATED (safety-physics reviews all fixes)
  SUCCESS: All previously-failing tests now pass
  ESCALATION: If fix requires physics model change → safety-physics takes over (opus).
              If fix requires architecture change → SWITCH TO CHAT.
  ESTIMATED_CALLS: 15-40 (depends on failure count)
```
**Role:** Implementation Specialist (sonnet), with Safety-Physics Oracle (opus) review
**Step-by-step:**
1. Read all failure reports:
   - `tests/r2/benchmark-errors.json` (from MS0)
   - `tests/r2/safety-engine-summary.json` failed_actions (from MS1)
   - `tests/r2/edge-case-results.json` mismatches (from MS2)
2. Triage failures by severity:
   - **CRITICAL** (false negative safety, crashes): Fix first
   - **HIGH** (missing warnings, wrong rejection): Fix second
   - **MEDIUM** (overly conservative): Fix third if time allows
3. For each fix:
   - Read the relevant engine source file
   - Identify the bug (range check missing? constant wrong? logic error?)
   - Apply minimal fix via Edit tool
   - Run `npm run build:fast`
   - Run `npm run test:regression` — confirm fix didn't break other tests
   - If fix touches CRITICAL file → invoke safety-physics subagent
4. After all fixes: full `npm run test:all`

#### MS3-T2: Post-Fix Verification
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: all test results
  GATE: GATED (final safety sign-off)
  SUCCESS: S(x) ≥ 0.70 across all tests, all CRITICAL fixes validated
  ESCALATION: If S(x) < 0.70 after fixes → SWITCH TO CHAT for human review
  ESTIMATED_CALLS: 8
```
**Role:** Safety-Physics Oracle (opus) — final safety authority
**Step-by-step:**
1. Run full test suite: `npm run test:all`
2. Run safety smoke: `npm run test:critical`
3. Spot-check 5 previously-failing calcs manually via MCP
4. Calculate overall S(x) for R2 phase
5. If S(x) ≥ 0.70: approve → MS4
6. If S(x) < 0.70: write SWITCH_SIGNAL.md with details → Chat needed

---

### MS4: Build Gate + Phase Completion
**Purpose:** Final validation, quality scoring, git tagging.

#### MS4-T1: Final Build + Full Test Suite
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: entire codebase
  GATE: GATED (verifier confirms)
  SUCCESS: Build clean, all tests pass, verify-build.ps1 passes
  ESCALATION: Build failure → fix and retry (max 3 attempts)
  ESTIMATED_CALLS: 5
```
**Role:** Implementation Specialist (sonnet)
**Step-by-step:**
1. `npm run build` (full build, not fast)
2. `scripts/verify-build.ps1` — 7 symbols OK, 0 bad patterns
3. `npm run test:all` — regression + critical + edge cases
4. Report build size, test count, pass rate

#### MS4-T2: Quality Scoring
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: quality metrics
  GATE: GATED (Ω ≥ 0.70 required)
  SUCCESS: Ω ≥ 0.70, S(x) ≥ 0.70, Ralph ≥ B+
  ESCALATION: Ω < 0.70 → SWITCH TO CHAT for remediation planning
  ESTIMATED_CALLS: 5
```
**Role:** Safety-Physics Oracle (opus) — via MCP dispatchers
**Step-by-step:**
1. Invoke `prism_omega→compute` via Bash/MCP — get Ω score
2. Invoke `prism_validate→safety` — get S(x) score
3. Invoke `prism_ralph→loop` if API key available — get Ralph grade
4. If Ω ≥ 0.70 AND S(x) ≥ 0.70: PASS
5. If either fails: write SWITCH_SIGNAL.md with scores + gap analysis

#### MS4-T3: Tag + Position Update
```
TASK: MS4-T3
  DEPENDS_ON: [MS4-T2]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: git, docs
  GATE: YOLO
  SUCCESS: Git tagged r2-complete, CURRENT_POSITION.md updated for R3
  ESCALATION: none
  ESTIMATED_CALLS: 3
```
**Role:** Verification Specialist (haiku)
**Step-by-step:**
1. `git add -A && git commit -m "R2 COMPLETE: Safety validated, Ω=X.XX, S(x)=X.XX"`
2. `git tag r2-complete`
3. `git push origin master --tags`
4. Update `CURRENT_POSITION.md`: Phase R3, next MS0
5. Update `ACTION_TRACKER.md`: R2 complete

### R2 Summary Table
| Task | Archetype | Model | Effort | Parallel | Gate | Est. Calls |
|------|-----------|-------|--------|----------|------|------------|
| MS0-T1 | implementer | sonnet | STD | no | YOLO | 8 |
| MS0-T2 | safety-physics | opus | NOVEL | no | GATED | 55 |
| MS0-T3 | implementer | sonnet | STD | no | YOLO | 12 |
| MS0-T4 | verifier | haiku | STD | no | GATED | 3 |
| MS1-T1a-e | implementer x5 | sonnet | STD | **TEAM** | YOLO | 25 |
| MS1-T2a-e | implementer x5 | sonnet | STD | **TEAM** | YOLO | 40 |
| MS1-T3a-e | verifier x5 | haiku | STD | yes | GATED | 15 |
| MS1-T4 | safety-physics | opus | NOVEL | no | GATED | 5 |
| MS1.5-T1 | implementer | sonnet | STD | no | YOLO | 10 |
| MS2-T1 | implementer | sonnet | STD | no | YOLO | 5 |
| MS2-T2 | safety-physics | opus | NOVEL | no | GATED | 25 |
| MS2-T3 | implementer | sonnet | STD | no | YOLO | 6 |
| MS2-T4 | verifier | haiku | STD | no | GATED | 2 |
| MS3-T1 | implementer→s-p | sonnet→opus | STD→NOV | no | GATED | 15-40 |
| MS3-T2 | safety-physics | opus | NOVEL | no | GATED | 8 |
| MS4-T1 | implementer | sonnet | STD | no | GATED | 5 |
| MS4-T2 | safety-physics | opus | NOVEL | no | GATED | 5 |
| MS4-T3 | verifier | haiku | STD | no | YOLO | 3 |
| **TOTALS** | | | | | | **~250-275** |

**Model distribution:** Opus ~40% (safety/physics), Sonnet ~45% (implementation), Haiku ~15% (verification)
**Agent team usage:** MS1 (5 teammates for safety engine testing)
**Chat switches:** 0-3 estimated (only if physics edge cases or architecture decisions needed)


---

## 8. PHASE R3: CAMPAIGN SYSTEM + MATERIAL ENRICHMENT (DETAILED)

### Overview
| Attribute | Value |
|-----------|-------|
| **Goal** | Multi-operation campaign workflows + enrich material database to 100% coverage |
| **Mode Split** | 65% Code Lead + 20% Subagents + 10% Agent Teams + 5% Chat |
| **Estimated Sessions** | 2-3 |
| **Estimated Token Budget** | ~350K (opus: 100K, sonnet: 200K, haiku: 50K) |
| **Milestones** | MS0 → MS1 → MS2 → MS3 → MS4 |
| **Entry Criteria** | R2 complete, Ω ≥ 0.70, S(x) ≥ 0.70 |

### R3 Task DAG
```
[MS0-T1] ──→ [MS0-T2] ──→ [MS0-T3]
                               │
[MS1-T1a]──→ [MS1-T2a]        │
[MS1-T1b]──→ [MS1-T2b]  ──→ [MS2-T1] ──→ [MS2-T2] ──→ [MS2-T3]
[MS1-T1c]──→ [MS1-T2c]                                      │
[MS1-T1d]──→ [MS1-T2d]                                 [MS3-T1] ──→ [MS3-T2]
                                                                        │
                                                                   [MS4-T1] ──→ [MS4-T2]
```

### MS0: Campaign Data Model
**Purpose:** Design and implement multi-operation campaign schema.

#### MS0-T1: Campaign Architecture Design
```
TASK: MS0-T1
  DEPENDS_ON: []
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: src/engines/campaignEngine.ts, design docs
  GATE: GATED
  SUCCESS: Campaign schema defined, supporting: operation sequencing, tool changes,
           inter-op dependencies, cumulative safety checks, total cycle time
  ESCALATION: If design has >3 ambiguous choices → SWITCH TO CHAT for Mark's input
  ESTIMATED_CALLS: 8
```
**Role:** Safety-Physics Oracle (opus) — architecture needs strong reasoning
**Step-by-step:**
1. Design campaign schema:
   ```typescript
   interface Campaign {
     id: string;
     name: string;
     material: string;
     workpiece: { geometry: string; dimensions: number[] };
     operations: CampaignOperation[];
     constraints: { max_cycle_time: number; surface_finish_target: number };
     safety_envelope: { max_force: number; max_power: number; max_temp: number };
   }
   interface CampaignOperation {
     sequence: number;
     operation: string; // milling, turning, drilling, etc.
     tool: { id: string; type: string; diameter: number };
     params: { speed: number; feed: number; doc: number; woc: number };
     depends_on: number[]; // sequence numbers that must complete first
     estimated_time: number; // minutes
   }
   ```
2. Design safety validation for campaigns:
   - Cumulative tool wear across operations
   - Thermal accumulation between ops (no cooldown = additive heat)
   - Workholding adequacy for each operation (clamp force vs cutting force)
   - Tool change sequence optimization
3. Write design doc: `data/docs/roadmap/CAMPAIGN_ARCHITECTURE.md`
4. Get safety-physics self-approval on the design

#### MS0-T2: Implement Campaign Engine
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: src/engines/campaignEngine.ts
  GATE: GATED (safety-physics reviews)
  SUCCESS: CampaignEngine class with: create, validate, optimize, estimate_cycle_time methods
  ESCALATION: none
  ESTIMATED_CALLS: 15
```
**Role:** Implementation Specialist (sonnet)
**Step-by-step:**
1. Create `src/engines/campaignEngine.ts` implementing the schema from MS0-T1
2. Implement methods:
   - `createCampaign(config)` — build campaign from config
   - `validateCampaign(campaign)` — check all safety constraints
   - `optimizeCampaign(campaign)` — reorder operations for min cycle time
   - `estimateCycleTime(campaign)` — sum op times + tool changes + setup
3. Wire into calcDispatcher as new actions: `campaign_create`, `campaign_validate`,
   `campaign_optimize`, `campaign_cycle_time`
4. Build + test

#### MS0-T3: Campaign Tests + Gate
```
TASK: MS0-T3
  DEPENDS_ON: [MS0-T2]
  ARCHETYPE: verifier + safety-physics
  MODEL: haiku (verifier) + opus (safety review)
  EFFORT: STANDARD + NOVEL
  PARALLEL: false
  SCOPE: tests/r3/
  GATE: GATED
  SUCCESS: 5 campaign test cases pass, safety constraints enforced correctly
  ESCALATION: none
  ESTIMATED_CALLS: 8
```

### MS1: Material Enrichment Pipeline
**Purpose:** Enrich all 2,892+ materials with missing fields. 
**MODE: AGENT TEAM** — 4 teammates processing material families in parallel.

#### MS1 Agent Team Configuration
```
TEAM: r3-material-enrichment
LEAD: opus (validates physics plausibility of enriched data)
TEAMMATES:
  - steel-enricher      | sonnet | scope: carbon/alloy steels (1000+ materials)
  - aluminum-enricher   | sonnet | scope: aluminum alloys (400+ materials)
  - exotic-enricher     | sonnet | scope: titanium, nickel, cobalt alloys (300+ materials)
  - other-enricher      | sonnet | scope: copper, brass, cast iron, polymers (800+ materials)
REQUIRE_PLAN_APPROVAL: true
```

#### MS1-T1a through MS1-T1d: Audit Missing Fields (PARALLEL)
```
TASK: MS1-T1{a-d}
  DEPENDS_ON: [MS0-T3]
  ARCHETYPE: implementer (x4 teammates)
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (agent team)
  SCOPE: data/materials/{family}/*.json
  GATE: YOLO (plan approval by lead)
  SUCCESS: Audit report listing all missing fields per material in assigned family
  ESCALATION: none
  ESTIMATED_CALLS: 5 per teammate (20 total)
```
**Role per teammate:** Implementation Specialist (sonnet)
**Step-by-step:**
1. Read all material JSON files in assigned family
2. Check each material for required fields:
   - Kienzle kc1.1, mc (cutting force constants)
   - Taylor C, n (tool life constants)
   - Thermal conductivity, specific heat capacity
   - Hardness (HRC/HB), tensile strength, yield strength
   - Machinability rating
   - Recommended cutting parameters by operation type
3. Write audit report: `tests/r3/material-audit-{family}.json`

#### MS1-T2a through MS1-T2d: Enrich Materials (PARALLEL)
```
TASK: MS1-T2{a-d}
  DEPENDS_ON: [MS1-T1{same letter}]
  ARCHETYPE: implementer (x4 teammates)
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (agent team continues)
  SCOPE: data/materials/{family}/*.json
  GATE: GATED (safety-physics spot-checks enriched data)
  SUCCESS: All missing fields populated with physically plausible values
  ESCALATION: If material has zero reference data → flag for CHAT (manual research)
  ESTIMATED_CALLS: 15 per teammate (60 total)
```
**Role per teammate:** Implementation Specialist (sonnet)
**Step-by-step:**
1. For each material with missing fields:
   - Look up values from reference databases (Machinery's Handbook, ASM data)
   - Cross-reference with similar materials in registry
   - Apply interpolation for closely related alloys
   - Write values with uncertainty bounds (±X%)
2. Update material JSON files
3. Run spot-check: do enriched values pass physics plausibility?

### MS2: Campaign Execution Engine
```
TASK: MS2-T1
  DEPENDS_ON: [MS0-T3, MS1-T2a, MS1-T2b, MS1-T2c, MS1-T2d]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  SCOPE: src/engines/campaignEngine.ts
  GATE: GATED
  SUCCESS: Full campaign execution with multi-op sequencing, tool changes, cycle time
  ESTIMATED_CALLS: 20
```

#### MS2-T2: Campaign + Safety Integration
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  SCOPE: campaign safety validation chain
  GATE: GATED
  SUCCESS: Campaign validator checks cumulative wear, thermal, and force across all ops
  ESTIMATED_CALLS: 12
```
**Role:** Safety-Physics Oracle (opus) — validates multi-op safety chain
**Step-by-step:**
1. Create 3 test campaigns:
   - Simple: 3-op milling sequence on 4140 steel
   - Complex: 8-op mixed sequence (mill → drill → tap → bore) on Ti-6Al-4V
   - Edge case: 12-op sequence with tool reuse and thermal accumulation
2. Run each through campaign_validate via MCP
3. Verify: cumulative safety checks catch real issues
4. Verify: single-op safety still works (regression check)

#### MS2-T3: Campaign Regression Tests
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  GATE: YOLO
  SUCCESS: 3 campaign test fixtures locked in regression suite
  ESTIMATED_CALLS: 6
```

### MS3: Fix Cycle + Gate
Same pattern as R2-MS3 — fix failures, safety-physics reviews, verifier confirms.

### MS4: Final Quality Gate
Same pattern as R2-MS4 — build, Ω compute, Ralph, git tag `r3-complete`.

### R3 Summary Table
| Task | Archetype | Model | Effort | Parallel | Gate | Est. Calls |
|------|-----------|-------|--------|----------|------|------------|
| MS0-T1 | safety-physics | opus | NOVEL | no | GATED | 8 |
| MS0-T2 | implementer | sonnet | STD | no | GATED | 15 |
| MS0-T3 | verifier+s-p | haiku+opus | STD+NOV | no | GATED | 8 |
| MS1-T1a-d | implementer x4 | sonnet | STD | **TEAM** | YOLO | 20 |
| MS1-T2a-d | implementer x4 | sonnet | STD | **TEAM** | GATED | 60 |
| MS2-T1 | implementer | sonnet | STD | no | GATED | 20 |
| MS2-T2 | safety-physics | opus | NOVEL | no | GATED | 12 |
| MS2-T3 | implementer | sonnet | STD | no | YOLO | 6 |
| MS3/MS4 | mixed | mixed | mixed | no | GATED | 30 |
| **TOTALS** | | | | | | **~180** |

**Model distribution:** Opus ~25%, Sonnet ~60%, Haiku ~15%
**Agent team usage:** MS1 (4 teammates for material enrichment)


---

## 9. PHASE R4: ENTERPRISE FEATURES (DETAILED)

### Overview
| Attribute | Value |
|-----------|-------|
| **Goal** | Harden multi-tenant isolation, expand compliance templates, API gateway |
| **Mode Split** | 70% Code Lead + 15% Subagents + 10% Agent Teams + 5% Chat |
| **Estimated Sessions** | 2 |
| **Estimated Token Budget** | ~300K (opus: 80K, sonnet: 180K, haiku: 40K) |
| **Milestones** | MS0 → MS1 → MS2 → MS3 → MS4 |
| **Entry Criteria** | R3 complete, Ω ≥ 0.70 |

### R4 Task DAG
```
[MS0-T1]──→ [MS0-T2]──→ [MS0-T3]
                             │
[MS1-T1a]──→ [MS1-T2a]      │
[MS1-T1b]──→ [MS1-T2b] ──→ [MS2-T1]──→ [MS2-T2]──→ [MS3-T1]──→ [MS4-T1]──→ [MS4-T2]
[MS1-T1c]──→ [MS1-T2c]
```

### MS0: Tenant Isolation Hardening
**Purpose:** Ensure complete data isolation between tenants in multi-tenant mode.

#### MS0-T1: Tenant Security Audit
```
TASK: MS0-T1
  DEPENDS_ON: []
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: src/tools/dispatchers/tenantDispatcher.ts, src/engines/tenantEngine.ts
  GATE: GATED
  SUCCESS: Audit report identifying all cross-tenant data leak vectors
  ESCALATION: If architectural flaw found → SWITCH TO CHAT
  ESTIMATED_CALLS: 10
```
**Role:** Safety-Physics Oracle (opus) — tenant isolation is security-critical
**Step-by-step:**
1. Read tenantDispatcher.ts and tenantEngine.ts
2. Trace all data flows: does tenant_id propagate to every query?
3. Check: can Tenant A's material data appear in Tenant B's calc?
4. Check: can shared learning bus leak tenant-specific patterns?
5. Check: are file paths properly scoped (`state/{tenant_id}/`)?
6. Produce: `tests/r4/tenant-security-audit.md` with findings + severity ratings

#### MS0-T2: Fix Isolation Gaps
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: src/engines/tenantEngine.ts
  GATE: GATED (safety-physics re-audits)
  SUCCESS: All identified gaps fixed, re-audit shows zero cross-tenant leak vectors
  ESTIMATED_CALLS: 12
```

#### MS0-T3: Tenant Integration Tests
```
TASK: MS0-T3
  DEPENDS_ON: [MS0-T2]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  SCOPE: tests/r4/tenant-isolation-tests.ts
  GATE: GATED
  SUCCESS: 10 cross-tenant isolation tests pass
  ESTIMATED_CALLS: 6
```

### MS1: Compliance Template Expansion
**MODE: AGENT TEAM** — 3 teammates, each implementing one compliance framework.

#### MS1 Agent Team Configuration
```
TEAM: r4-compliance
LEAD: opus (validates compliance accuracy)
TEAMMATES:
  - iso9001-writer     | sonnet | scope: ISO 9001 template
  - nadcap-writer      | sonnet | scope: NADCAP template
  - custom-writer      | sonnet | scope: custom template framework
REQUIRE_PLAN_APPROVAL: true
```

#### MS1-T1a-c: Research + Draft Templates (PARALLEL)
```
TASK: MS1-T1{a-c}
  DEPENDS_ON: [MS0-T3]
  ARCHETYPE: implementer (x3 teammates)
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (agent team)
  SCOPE: src/engines/complianceEngine.ts (each adds own template)
  GATE: YOLO (plan approval)
  SUCCESS: Template defined with all required audit checkpoints
  ESTIMATED_CALLS: 8 per teammate (24 total)
```

#### MS1-T2a-c: Implement + Test Templates (PARALLEL)
```
TASK: MS1-T2{a-c}
  DEPENDS_ON: [MS1-T1{same letter}]
  ARCHETYPE: implementer (x3 teammates)
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (agent team continues)
  SCOPE: compliance template code + tests
  GATE: GATED (verifier runs gap_analysis on each)
  SUCCESS: Template passes gap_analysis with 0 critical gaps
  ESTIMATED_CALLS: 10 per teammate (30 total)
```

### MS2: Bridge/API Gateway Hardening

#### MS2-T1: Security Audit
```
TASK: MS2-T1
  DEPENDS_ON: [MS0-T3, MS1-T2a, MS1-T2b, MS1-T2c]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  SCOPE: src/tools/dispatchers/bridgeDispatcher.ts
  GATE: GATED
  SUCCESS: All API endpoints have auth, rate limiting, scope validation
  ESTIMATED_CALLS: 8
```

#### MS2-T2: Implement Security Fixes
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  SCOPE: src/engines/bridgeEngine.ts
  GATE: GATED (safety-physics reviews)
  SUCCESS: Rate limiting 3-tier, mTLS option, scope-based authorization enforced
  ESTIMATED_CALLS: 15
```

### MS3-MS4: Fix Cycle + Quality Gate
Same pattern as R2/R3.

### R4 Summary
| Model | % | Agent Teams | Chat Switches |
|-------|---|-------------|---------------|
| Opus | 25% | MS1 (3 compliance) | 0-2 |
| Sonnet | 60% | | |
| Haiku | 15% | | |
| **Total calls:** ~160 | | | |

---

## 10. PHASE R5: VISUAL + POST PROCESSOR (DETAILED)

### Overview
| Attribute | Value |
|-----------|-------|
| **Goal** | G-code generation, post processor per controller, toolpath visualization |
| **Mode Split** | 60% Code Lead + 25% Subagents + 10% Agent Teams + 5% Chat |
| **Estimated Sessions** | 3-4 |
| **Estimated Token Budget** | ~450K (opus: 150K, sonnet: 250K, haiku: 50K) |
| **Milestones** | MS0 → MS1 → MS2 → MS3 → MS4 |
| **Entry Criteria** | R4 complete, Ω ≥ 0.70 |

### MS0: Post Processor Engine
**PURPOSE:** Generate correct G-code for 6 controller families.

#### MS0-T1: Post Processor Architecture
```
TASK: MS0-T1
  DEPENDS_ON: []
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: design doc + src/engines/postProcessorEngine.ts
  GATE: GATED
  SUCCESS: Architecture supports Fanuc, Siemens, Haas, Mazak, DMG MORI, Okuma
           with controller-specific G/M code mapping, format differences,
           and safety header/footer requirements
  ESCALATION: G-code format disputes → SWITCH TO CHAT (controller-specific knowledge)
  ESTIMATED_CALLS: 12
```
**Role:** Safety-Physics Oracle (opus) — wrong G-code = machine crash
**Step-by-step:**
1. Define PostProcessor interface:
   ```typescript
   interface PostProcessor {
     controller: string;           // "fanuc" | "siemens" | "haas" | etc.
     generateHeader(config): string;  // Safety preamble (G28, G90, G21/G20, etc.)
     generateToolpath(ops): string;   // G-code body
     generateFooter(): string;        // End program (M30, M02, etc.)
     formatNumber(val, axis): string; // Controller-specific number formatting
     validateSafety(gcode): SafetyResult; // Check for dangerous sequences
   }
   ```
2. Map controller differences:
   - Fanuc: G28 for home, G43 for tool length, decimal format
   - Siemens: G500 for datum, CYCLE800 for 5-axis, R-params
   - Haas: G28 G91, M06 tool change, canned cycles
   - Mazak: G28, G43, Mazatrol compatibility
3. Define safety checks:
   - No rapid moves (G00) into workpiece
   - Tool change must include spindle stop (M05)
   - Coolant on (M08) before cutting, off (M09) before tool change
   - Safe Z retract before any XY rapid

#### MS0-T2: Implement 6 Post Processors
**MODE: AGENT TEAM** — 3 teammates, each implementing 2 controllers.
```
TEAM: r5-post-processors
LEAD: opus (validates G-code safety)
TEAMMATES:
  - fanuc-haas     | sonnet | scope: Fanuc + Haas (most common, well-documented)
  - siemens-dmg    | sonnet | scope: Siemens + DMG MORI (complex, 5-axis focus)
  - mazak-okuma    | sonnet | scope: Mazak + Okuma (turning-centric + mixed)
REQUIRE_PLAN_APPROVAL: true
```
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  ARCHETYPE: implementer (x3 teammates)
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (agent team)
  SCOPE: src/engines/postProcessors/{controller}.ts
  GATE: GATED (safety-physics validates all G-code output)
  SUCCESS: Each controller generates valid G-code for 3 test operations (mill, drill, thread)
  ESTIMATED_CALLS: 20 per teammate (60 total)
```

### MS1: G-code Generation for 680 Toolpath Strategies
```
TASK: MS1-T1
  DEPENDS_ON: [MS0-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  SCOPE: src/engines/postProcessorEngine.ts
  GATE: GATED
  SUCCESS: All 680 toolpath strategies can produce G-code for at least Fanuc controller
  ESCALATION: If >50 strategies fail → agent team to parallelize fixes
  ESTIMATED_CALLS: 30
```

#### MS1-T2: G-code Safety Validation
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  SCOPE: G-code output samples
  GATE: GATED (S(x) ≥ 0.70 on G-code safety)
  SUCCESS: Sample G-code from 20 strategies passes collision check, no unsafe sequences
  ESCALATION: Unsafe G-code → immediate fix (lives at stake)
  ESTIMATED_CALLS: 15
```

### MS2: Toolpath Visualization
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  SCOPE: src/engines/visualizationEngine.ts
  GATE: YOLO
  SUCCESS: SVG-based 2D toolpath visualization for milling, turning, drilling
  ESTIMATED_CALLS: 25
```

### MS3: Cycle Time Estimation
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T1]
  ARCHETYPE: implementer + safety-physics
  MODEL: sonnet + opus (validation)
  EFFORT: STANDARD + NOVEL
  SCOPE: src/engines/cycleTimeEngine.ts
  GATE: GATED (compare against prism_calc→cycle_time)
  SUCCESS: Cycle time estimates within ±10% of MCP calc engine
  ESTIMATED_CALLS: 15
```

### MS4: Quality Gate
Same pattern — build, Ω, Ralph, git tag `r5-complete`.

### R5 Summary
| Model | % | Agent Teams | Chat Switches |
|-------|---|-------------|---------------|
| Opus | 30% | MS0 (3 post proc) | 2-3 (G-code format decisions) |
| Sonnet | 55% | | |
| Haiku | 15% | | |
| **Total calls:** ~230 | | | |

---

## 11. PHASE R6: PRODUCTION DEPLOYMENT (DETAILED)

### Overview
| Attribute | Value |
|-----------|-------|
| **Goal** | Docker, CI/CD, monitoring, load testing, production-ready |
| **Mode Split** | 80% Code Lead + 10% Subagents + 5% Agent Teams + 5% Chat |
| **Estimated Sessions** | 2 |
| **Estimated Token Budget** | ~250K (opus: 50K, sonnet: 170K, haiku: 30K) |
| **Milestones** | MS0 → MS1 → MS2 → MS3 → MS4 |
| **Entry Criteria** | R5 complete, Ω ≥ 0.70 |

### MS0: Docker Containerization
```
TASK: MS0-T1
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  GATE: YOLO
  SUCCESS: Dockerfile builds, container runs, health check passes
  ESTIMATED_CALLS: 15
```
**Step-by-step:**
1. Create `Dockerfile` — multi-stage build (node:20-slim)
2. Create `docker-compose.yml` — PRISM server + volume mounts
3. Create `scripts/docker-health.sh` — verify MCP server responds
4. Build: `docker build -t prism-mcp .`
5. Run: `docker-compose up -d`
6. Health check: `curl localhost:3000/health` or equivalent
7. Verify: all 31 dispatchers respond

### MS1: CI/CD Pipeline
```
TASK: MS1-T1
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  GATE: YOLO
  SUCCESS: GitHub Actions workflow: lint → build → test:critical → test:regression → verify-build
  ESTIMATED_CALLS: 10
```
**Step-by-step:**
1. Create `.github/workflows/ci.yml`:
   - Trigger: push to master, PR
   - Steps: checkout → install → lint → build → test:critical → test:regression → verify-build
   - Artifact: dist/index.js + build report
2. Create `.github/workflows/release.yml`:
   - Trigger: git tag `r*-complete`
   - Steps: full build → Docker build → push to registry

### MS2: Monitoring + Alerting
```
TASK: MS2-T1
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  GATE: YOLO
  SUCCESS: Prometheus metrics exported, basic Grafana dashboard template
  ESTIMATED_CALLS: 15
```

### MS3: Load Testing
```
TASK: MS3-T1
  ARCHETYPE: implementer + safety-physics
  MODEL: sonnet + opus (for safety under load)
  EFFORT: STANDARD + NOVEL
  GATE: GATED
  SUCCESS: 100 concurrent MCP requests handled, no safety degradation, P99 < 5s
  ESCALATION: If safety degrades under load → SWITCH TO CHAT (architecture review)
  ESTIMATED_CALLS: 20
```
**Role:** Implementer creates load test script, Safety-Physics validates that S(x)
does not degrade under concurrent requests.

### MS4: Quality Gate
Final: build, Ω, Ralph, git tag `r6-complete`.

### R6 Summary
| Model | % | Agent Teams | Chat Switches |
|-------|---|-------------|---------------|
| Opus | 20% | none | 0-1 (architecture) |
| Sonnet | 70% | | |
| Haiku | 10% | | |
| **Total calls:** ~130 | | | |


---

## 12. PHASES R7-R11: FUTURE (HIGH-LEVEL)

### R7: Intelligence — Advanced ML + Predictive Scheduling
| Attribute | Value |
|-----------|-------|
| **Mode Split** | 55% Code + 30% Subagents + 10% Teams + 5% Chat |
| **Token Budget** | ~400K |
| **Key Tasks** | |
| MS0 | Pattern recognition engine — learn from accumulated manufacturing data (implementer, sonnet) |
| MS1 | Predictive maintenance — tool wear models from historical data (safety-physics, opus) |
| MS2 | Schedule optimization — multi-job sequencing with constraint satisfaction (implementer, sonnet + agent team) |
| MS3 | Self-tuning parameters — Bayesian optimization of cutting params (safety-physics, opus) |
| MS4 | Quality gate | (verifier, haiku → safety-physics, opus) |

### R8: Experience — UI/UX + Web Dashboard
| Attribute | Value |
|-----------|-------|
| **Mode Split** | 85% Code + 5% Subagents + 5% Teams + 5% Chat |
| **Token Budget** | ~350K |
| **Key Tasks** | |
| MS0 | React dashboard scaffold — vite + tailwind + shadcn (implementer, sonnet) |
| MS1 | Speed & Feed Calculator UI — interactive tool with material selection (implementer, sonnet + agent team: 3 UI components parallel) |
| MS2 | Shop Manager dashboard — job tracking, machine status, tool inventory (implementer, sonnet) |
| MS3 | Alarm decoder UI — search, decode, show fix steps (implementer, sonnet) |
| MS4 | Operator interface — simplified touch-friendly for shop floor (implementer, sonnet) |
| MS5 | UX testing + accessibility (verifier, haiku) |
| MS6 | Quality gate | (verifier + safety-physics) |

### R9: Integration — MTConnect, OPC-UA, ERP
| Attribute | Value |
|-----------|-------|
| **Mode Split** | 70% Code + 15% Subagents + 10% Teams + 5% Chat |
| **Token Budget** | ~350K |
| **Key Tasks** | |
| MS0 | MTConnect adapter — real-time machine data ingestion (implementer, sonnet) |
| MS1 | OPC-UA server — expose PRISM data to SCADA systems (implementer, sonnet) |
| MS2 | ERP connector — SAP/Oracle integration for job scheduling (implementer, sonnet + agent team: 2 ERP systems parallel) |
| MS3 | Real-time data pipeline — streaming from machine → PRISM → dashboard (implementer, sonnet) |
| MS4 | Integration testing with simulated machine data (verifier, haiku + safety-physics, opus) |
| MS5 | Quality gate | |

### R10: Revolution — Real-Time Adaptive Machining + Digital Twin
| Attribute | Value |
|-----------|-------|
| **Mode Split** | 45% Code + 35% Subagents + 10% Teams + 10% Chat |
| **Token Budget** | ~500K |
| **Key Tasks** | |
| MS0 | Digital twin framework — physics model that mirrors live machine state (safety-physics, opus) |
| MS1 | Adaptive feed control — real-time speed/feed adjustment based on force feedback (safety-physics, opus) |
| MS2 | Chatter detection + avoidance — vibration analysis → spindle speed adjustment (safety-physics, opus) |
| MS3 | Tool wear compensation — real-time offset adjustment based on wear model (safety-physics, opus) |
| MS4 | Thermal compensation — real-time thermal deformation correction (safety-physics, opus) |
| MS5 | Safety validation of all adaptive systems (safety-physics, opus — extensive) |
| MS6 | Quality gate — most rigorous, S(x) ≥ 0.85 for real-time safety | |
| **Note:** R10 is the most safety-critical phase. Opus usage ~60%. Human review at every milestone gate. |

### R11: Product — SaaS Packaging
| Attribute | Value |
|-----------|-------|
| **Mode Split** | 85% Code + 5% Subagents + 5% Teams + 5% Chat |
| **Token Budget** | ~300K |
| **Key Tasks** | |
| MS0 | Subscription/billing engine — Stripe integration (implementer, sonnet) |
| MS1 | User management — auth, roles, permissions (implementer, sonnet) |
| MS2 | Onboarding flow — guided setup for new shops (implementer, sonnet) |
| MS3 | Landing page + marketing site (implementer, sonnet) |
| MS4 | Beta program infrastructure (implementer, sonnet) |
| MS5 | Quality gate | |

### Phase Summary: Full Roadmap Token Budget
| Phase | Est. Tokens | Opus % | Sonnet % | Haiku % | Sessions | Agent Teams |
|-------|------------|--------|----------|---------|----------|-------------|
| R2 Safety | 400K | 40% | 45% | 15% | 2-3 | 1 (5 safety engines) |
| R3 Campaigns | 350K | 25% | 60% | 15% | 2-3 | 1 (4 material families) |
| R4 Enterprise | 300K | 25% | 60% | 15% | 2 | 1 (3 compliance) |
| R5 Visual | 450K | 30% | 55% | 15% | 3-4 | 1 (3 post processors) |
| R6 Production | 250K | 20% | 70% | 10% | 2 | 0 |
| R7 Intelligence | 400K | 35% | 50% | 15% | 3 | 1 |
| R8 Experience | 350K | 10% | 80% | 10% | 3-4 | 1 |
| R9 Integration | 350K | 20% | 65% | 15% | 3 | 1 |
| R10 Revolution | 500K | 60% | 30% | 10% | 4-5 | 2 |
| R11 Product | 300K | 10% | 80% | 10% | 2-3 | 0 |
| **TOTAL** | **~3.65M** | **28%** | **60%** | **12%** | **~28-35** | **9 teams** |

---

## 13. RECOVERY & CONTINUITY PROTOCOL

### 13.1 State Files (maintained by Code automatically)
| File | Location | Updated | Purpose |
|------|----------|---------|---------|
| CURRENT_POSITION.md | data/docs/roadmap/ | Every task completion | Current phase, milestone, task |
| ACTION_TRACKER.md | C:\PRISM\state\ | Every session | Completed + pending items |
| SWITCH_SIGNAL.md | C:\PRISM\state\ | On Chat switch needed | Reason + context for switching |
| CHAT_RESOLUTION.md | C:\PRISM\state\ | After Chat resolves issue | Resolution for Code to read |
| VERIFICATION_REPORT.json | C:\PRISM\state\ | After verifier runs | Latest test results |
| COMPACTION_SURVIVAL.json | C:\PRISM\state\ | Every MCP call | Recovery data for context loss |
| HOT_RESUME.md | C:\PRISM\state\ | Every MCP call | Quick resume for compaction |
| SESSION_DIGEST.md | C:\PRISM\state\ | Every 10 MCP calls | Session summary |

### 13.2 Session Start Protocol
**In Code:**
1. Read CLAUDE.md (auto-loaded)
2. Read CURRENT_POSITION.md → know current phase/milestone/task
3. Read ACTION_TRACKER.md → know pending items
4. If SWITCH_SIGNAL.md exists and is from Chat → read resolution
5. Resume DAG execution from current task

**In Chat:**
1. `prism_dev→session_boot` (loads state, GSD, memories)
2. Read SWITCH_SIGNAL.md if Code requested switch
3. Run requested MCP queries
4. Write CHAT_RESOLUTION.md
5. Tell user to switch back to Code

### 13.3 Git Discipline
- Commit after every milestone completion
- Tag after every phase completion (`r2-complete`, `r3-complete`, etc.)
- Push after every session
- Branch for experimental work, merge after validation

---

## 14. APPENDIX: FILE LOCATIONS & SETUP COMMANDS

### 14.1 Subagent Files
```
C:\PRISM\mcp-server\.claude\agents\safety-physics.md
C:\PRISM\mcp-server\.claude\agents\implementer.md
C:\PRISM\mcp-server\.claude\agents\verifier.md
```

### 14.2 Hook Scripts
```
C:\PRISM\mcp-server\scripts\hooks\pre-edit-safety-gate.ps1
C:\PRISM\mcp-server\scripts\hooks\post-build-verify.ps1
C:\PRISM\mcp-server\scripts\hooks\anti-regression-gate.ps1
C:\PRISM\mcp-server\scripts\hooks\teammate-quality-gate.ps1
C:\PRISM\mcp-server\scripts\hooks\teammate-reassign.ps1
```

### 14.3 Settings Configuration
```json
// .claude/settings.json additions
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
  }
}
```

### 14.4 Setup Commands (run once before R2)
```bash
# 1. Create subagent directory
mkdir -p .claude/agents

# 2. Create hook scripts directory
mkdir -p scripts/hooks

# 3. Create test directory
mkdir -p tests/r2

# 4. Enable agent teams
# Add to .claude/settings.json: "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"

# 5. Verify MCP server accessible from Code
# In Code session: ask to call prism_calc→speed_feed with test params

# 6. Verify subagents load
# In Code session: /agents — should show safety-physics, implementer, verifier
```

### 14.5 Pre-R2 Checklist
- [ ] Subagent files created in .claude/agents/
- [ ] Hook scripts created in scripts/hooks/
- [ ] Agent teams enabled in settings.json
- [ ] MCP server accessible from Code
- [ ] tests/r2/ directory exists
- [ ] Git clean, build passing
- [ ] CURRENT_POSITION.md updated for R2 start
- [ ] This roadmap (v17.0) committed to git

---

## END OF ROADMAP v17.0

### Changelog
- **v17.0** (2026-02-20): Full Claude Code maximization. 3-archetype subagent system,
  agent teams, hooks, task DAGs, binary effort model, confidence-based escalation.
  Based on 7-lens deep brainstorm findings.
- **v16.0** (2026-02-20): Code-native execution (treated Code as file editor only)
- **v15.2** (2026-02-19): Chat-native with MCP orchestration

