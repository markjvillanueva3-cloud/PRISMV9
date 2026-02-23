# PRISM AUTO-BOOTSTRAP v1.0
## ⛔ READ THIS FILE COMPLETELY AT EVERY SESSION START
## This single file contains EVERYTHING Claude needs to operate autonomously
### Location: C:\\PRISM\_PRISM_MASTER\AUTO_BOOTSTRAP.md

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 0: IMMEDIATE ACTIONS (Do these BEFORE reading the rest)
# ════════════════════════════════════════════════════════════════════════════════

## ⛔ STEP 1: READ STATE FILE NOW

```
Tool: Filesystem:read_file
Path: C:\\PRISM\CURRENT_STATE.json
```

**DO THIS IMMEDIATELY. DO NOT PROCEED WITHOUT READING STATE.**

## ⛔ STEP 2: CHECK STATUS AND RESPOND

After reading state, you MUST:

1. **Quote the quickResume field** - This proves you read it
2. **Check currentTask.status**:
   - If "IN_PROGRESS" → Say: "Resuming [task] from step [N]. Last completed: [X]. Next: [Y]"
   - If "COMPLETE" → Say: "Previous task complete. Ready for new instructions."

## ⛔ STEP 3: STATE YOUR TOOL CALL COUNT

Say: "Tool calls this session: 1 (read state). Buffer zone: GREEN."

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1: THE 4 IMMUTABLE LAWS (Always Active)
# ════════════════════════════════════════════════════════════════════════════════

## LAW 1: LIFE-SAFETY MINDSET

This is manufacturing intelligence controlling CNC machines. Errors can KILL.

**Before EVERY action ask:** "Would I trust this if MY life depended on it?"

- No placeholders in production code
- No "good enough" approximations
- No incomplete data
- Every output must have verification

## LAW 2: MAXIMUM COMPLETENESS

100% coverage. No exceptions.

- Every parameter populated
- Every edge case handled
- Every uncertainty quantified
- Every source documented

## LAW 3: ANTI-REGRESSION

New ≥ Old. Always.

Before ANY replacement:
1. Count old: lines, parameters, features
2. Count new: same metrics
3. If new < old: STOP and justify every removal

## LAW 4: PREDICTIVE THINKING

Before EVERY action:
1. What are 3 ways this could fail?
2. What's the mitigation for each?
3. What's the rollback plan?

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 2: MICROSESSION FRAMEWORK
# ════════════════════════════════════════════════════════════════════════════════

## What is a Microsession?

A **microsession** is a small, checkpoint-able unit of work (15-25 items, 200-400 lines).

**Purpose:** Prevent losing work due to context limits or interruptions.

## Microsession Structure

```
MICROSESSION: [ID]
├── SCOPE: [What will be done - specific, bounded]
├── CHECKPOINT_TRIGGER: [After N items OR N tool calls]
├── SUCCESS_CRITERIA: [How to verify complete]
├── ABORT_CRITERIA: [When to stop and checkpoint]
└── NEXT_MICROSESSION: [What comes after]
```

## Microsession Protocol

1. **START**: Define scope, success criteria, abort criteria
2. **WORK**: Execute in small batches (5-10 items)
3. **CHECK**: After each batch, assess buffer zone
4. **CHECKPOINT**: At yellow zone (9-14 calls), save progress
5. **COMPLETE or HANDOFF**: Either finish or cleanly transition

## Example Microsession

```
MICROSESSION: MAT-ENHANCE-001
├── SCOPE: Enhance materials P_STEELS index 0-24 (25 items)
├── CHECKPOINT_TRIGGER: After every 10 materials OR at 12 tool calls
├── SUCCESS_CRITERIA: All 25 materials have full 127 parameters
├── ABORT_CRITERIA: Tool calls > 15 OR context pressure detected
└── NEXT_MICROSESSION: MAT-ENHANCE-002 (index 25-49)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3: BUFFER ZONES & AUTO-CHECKPOINT
# ════════════════════════════════════════════════════════════════════════════════

## Buffer Zone Definitions

| Zone | Tool Calls | Action | Claude Must Say |
|------|------------|--------|-----------------|
| 🟢 GREEN | 0-8 | Work freely | Nothing required |
| 🟡 YELLOW | 9-14 | Plan checkpoint | "Entering yellow zone. Will checkpoint after current unit." |
| 🟠 ORANGE | 15-18 | CHECKPOINT NOW | "Orange zone. Checkpointing immediately." |
| 🔴 RED | 19+ | EMERGENCY STOP | "RED ZONE. Emergency checkpoint. Session handoff required." |

## Auto-Checkpoint Triggers

Claude MUST checkpoint when ANY of these occur:
- Tool call count reaches 10
- Before ANY destructive operation (delete, replace, overwrite)
- After completing any logical unit
- Before large operation that might fail
- When uncertainty about success

## Checkpoint Actions

**Micro-checkpoint (quick):**
```json
Update CURRENT_STATE.json: {"currentTask": {"step": N+1, "lastCompleted": "X"}}
```

**Standard checkpoint:**
```json
Update CURRENT_STATE.json with:
- currentTask.step, lastCompleted, nextToDo
- checkpoint.timestamp, toolCallsSinceCheckpoint = 0
```

**Full checkpoint (session end):**
```json
Update everything including quickResume with 5-second format:
DOING: [what]
STOPPED: [where]
NEXT: [action]
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4: RALPH WIGGUM LOOPS (Iterate Until Complete)
# ════════════════════════════════════════════════════════════════════════════════

## What is a Ralph Loop?

A **Ralph Loop** iterates on a task until a completion criteria is met, with built-in quality gates.

Named after "Ralph Wiggum" methodology: "I'm helping!" → Check if actually helping → Adjust → Repeat.

## When to Use Ralph Loops

- Task has uncertain scope (don't know how many items)
- Quality must meet threshold before done
- Iterative refinement needed
- Can't complete in single pass

## Ralph Loop Structure

```
RALPH_LOOP: [NAME]
├── GOAL: [What "complete" looks like]
├── MAX_ITERATIONS: [Hard limit, usually 5-10]
├── ITERATION_SCOPE: [What one iteration does]
├── QUALITY_CHECK: [How to verify progress]
├── COMPLETION_CRITERIA: [When to stop]
├── CHECKPOINT_FREQUENCY: [Every N iterations]
└── ABORT_CONDITIONS: [When to give up]
```

## Ralph Loop Protocol

```
iteration = 0
while not complete AND iteration < max_iterations:
    1. Execute iteration scope
    2. Run quality check
    3. If quality_check.passed:
        - Check completion criteria
        - If complete: EXIT LOOP
    4. If iteration % checkpoint_frequency == 0:
        - Checkpoint progress
    5. Assess: Can we continue or should we abort?
    6. iteration += 1

If iteration >= max_iterations:
    - Checkpoint current state
    - Report: "Max iterations reached. Progress: X%. Recommend: [action]"
```

## Example Ralph Loop

```
RALPH_LOOP: EXTRACT_MATERIALS
├── GOAL: Extract all materials from monolith with 100% parameter coverage
├── MAX_ITERATIONS: 10
├── ITERATION_SCOPE: Extract 50 materials, validate, enhance
├── QUALITY_CHECK: All materials have ≥100 of 127 parameters
├── COMPLETION_CRITERIA: All materials extracted AND quality ≥ 95%
├── CHECKPOINT_FREQUENCY: Every 2 iterations
└── ABORT_CONDITIONS: 3 consecutive failures OR data corruption detected
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5: AUTO-SKILL LOADING
# ════════════════════════════════════════════════════════════════════════════════

## Keyword → Skill Mapping

When you see these keywords in a task, automatically consider loading these skills:

| Keywords | Skills to Consider |
|----------|-------------------|
| brainstorm, design, architect | prism-sp-brainstorm |
| plan, breakdown, tasks | prism-sp-planning |
| execute, implement, build | prism-sp-execution |
| extract, parse, pull | prism-monolith-extractor |
| material, alloy, steel | prism-material-schema, prism-material-physics |
| debug, fix, error, bug | prism-sp-debugging, prism-root-cause-tracing |
| verify, validate, check | prism-sp-verification |
| test, tdd, unittest | prism-tdd-enhanced |
| session, resume, state | prism-session-master |
| gcode, fanuc, siemens | prism-controller-quick-ref |
| cutting, machining, milling | prism-expert-master |

## Skill Loading Protocol

1. Analyze task for keywords
2. Identify relevant skills (usually 1-3)
3. If skill content needed, read from: `C:\PRISM REBUILD...\_SKILLS\[skill-name]\SKILL.md`
4. Apply skill protocols to task

## When to Load Full Skill Content

- **Always load** for: safety-critical tasks, debugging, complex extractions
- **Reference manifest** for: simple lookups, standard operations
- **Skip loading** for: tasks fully covered by this bootstrap file

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 6: TOOL QUICK REFERENCE
# ════════════════════════════════════════════════════════════════════════════════

## File Operations (C: Drive)

| Task | Tool | Example |
|------|------|---------|
| Read file | `Filesystem:read_file` | `path: "C:\PRISM...\file.txt"` |
| Write file | `Filesystem:write_file` | `path, content` |
| Edit file | `Filesystem:edit_file` | `path, edits: [{oldText, newText}]` |
| List dir | `Filesystem:list_directory` | `path: "C:\PRISM...\folder"` |

## Large File Operations (Desktop Commander)

| Task | Tool | Parameters |
|------|------|------------|
| Read with offset | `Desktop Commander:read_file` | `path, offset, length` |
| Append to file | `Desktop Commander:write_file` | `path, content, mode:"append"` |
| Search content | `Desktop Commander:start_search` | `searchType:"content", pattern, path` |
| Search files | `Desktop Commander:start_search` | `searchType:"files", pattern, path` |
| Run script | `Desktop Commander:start_process` | `command, timeout_ms` |
| Get file info | `Desktop Commander:get_file_info` | `path` |

## Critical Paths

```
ROOT:       C:\\PRISM\
STATE:      C:\\PRISM\CURRENT_STATE.json
MASTER:     C:\\PRISM\_PRISM_MASTER\
SKILLS:     C:\\PRISM\_SKILLS\
MONOLITH:   C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\
EXTRACTED:  C:\\PRISM\EXTRACTED\
MATERIALS:  C:\\PRISM\EXTRACTED\materials\
```

**⚠️ NEVER save to /home/claude/ - RESETS EVERY SESSION**

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: API AGENT SYSTEM (When Available)
# ════════════════════════════════════════════════════════════════════════════════

## When to Use API Agents

Use API swarm when:
- Parallel work needed (5+ items simultaneously)
- Multiple expert opinions required
- Heavy computation (100+ items)
- Need to iterate until complete (Ralph loops via API)

## Quick Commands

```powershell
cd "C:\\PRISM\_SCRIPTS"

# Intelligent mode (auto-detects everything)
python prism_unified_system_v4.py --intelligent "Your task"

# Manufacturing analysis
python prism_unified_system_v4.py --manufacturing "Ti-6Al-4V" "pocket milling"

# Ralph loop (iterate until done)
python prism_unified_system_v4.py --ralph architect "Complete design. Exit when done." 10

# List all 56 agents
python prism_unified_system_v4.py --list
```

## Agent Categories (56 total)

- **CORE (8):** extractor, validator, merger, coder, analyst, researcher, architect, coordinator
- **MANUFACTURING (10):** materials_scientist, machinist, tool_engineer, physics_validator...
- **PRISM (8):** monolith_navigator, migration_specialist, regression_checker...
- **QUALITY (6):** test_generator, code_reviewer, optimizer, refactorer...
- **CALCULATORS (4):** cutting_calculator, thermal_calculator, force_calculator, surface_calculator
- **LOOKUP (4):** standards_expert, formula_lookup, material_lookup, tool_lookup
- **SPECIALIZED (4):** debugger, root_cause_analyst, task_decomposer, estimator
- **INTELLIGENCE (12):** context_builder, learning_extractor, verification_chain...

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 8: THE 10 COMMANDMENTS
# ════════════════════════════════════════════════════════════════════════════════

1. **USE EVERYWHERE** - 100% DB/engine utilization. Min 6-8 consumers per database.
2. **FUSE** - Cross-domain concepts (materials + physics + tooling + limits)
3. **VERIFY** - Min 3 validation sources (physics + empirical + historical)
4. **LEARN** - Every interaction → extract patterns → store in _LEARNING
5. **UNCERTAINTY** - ALWAYS confidence intervals, NEVER bare numbers
6. **EXPLAIN** - XAI for all recommendations, show reasoning
7. **GRACEFUL** - Fallbacks for every failure, degrade gracefully
8. **PROTECT** - Validate inputs, sanitize outputs, backup before changes
9. **PERFORM** - <2s load, <500ms calculations
10. **USER-OBSESS** - 3-click rule for any action

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 9: HARD STOPS (Non-Negotiable)
# ════════════════════════════════════════════════════════════════════════════════

## NEVER DO THESE

❌ Work without reading CURRENT_STATE.json first
❌ Restart an IN_PROGRESS task (MUST resume)
❌ Exceed 18 tool calls without checkpoint
❌ Save PRISM work to /home/claude/
❌ Create module without wiring 6+ consumers
❌ Output calculation without uncertainty bounds
❌ Replace file without anti-regression audit
❌ Skip predictive thinking (3 failure modes)

## ALWAYS DO THESE

✅ Read state first, quote quickResume
✅ Resume IN_PROGRESS tasks from checkpoint
✅ Checkpoint at yellow zone (9-14 calls)
✅ Use microsessions for large tasks
✅ Apply 4 immutable laws to every action
✅ Verify before AND after operations
✅ Extract learnings after task completion

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 10: PREDICTIVE CHECKLIST (Auto-Apply)
# ════════════════════════════════════════════════════════════════════════════════

## Before EVERY Significant Action

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PREDICTIVE CHECKLIST                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ □ FAILURE MODE 1: _______________________________________________           │
│   Mitigation: ___________________________________________________           │
│                                                                             │
│ □ FAILURE MODE 2: _______________________________________________           │
│   Mitigation: ___________________________________________________           │
│                                                                             │
│ □ FAILURE MODE 3: _______________________________________________           │
│   Mitigation: ___________________________________________________           │
│                                                                             │
│ □ ROLLBACK PLAN: ________________________________________________           │
│                                                                             │
│ □ VERIFICATION METHOD: __________________________________________           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Predictive Check (For Simple Actions)

"Before doing X, I anticipate: (1) [failure], (2) [failure], (3) [failure]. Mitigations in place."

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 11: SESSION END PROTOCOL
# ════════════════════════════════════════════════════════════════════════════════

## Before Ending ANY Session

1. **Complete current logical unit** (no partial work)
2. **Update CURRENT_STATE.json**:
   - currentTask.status (COMPLETE or IN_PROGRESS)
   - currentTask.step, lastCompleted, nextToDo
   - checkpoint.timestamp, toolCallsSinceCheckpoint = 0
   - quickResume.forNextChat (5-second format)
3. **Verify checkpoint saved** (re-read to confirm)
4. **Announce next session scope**: "Next session should: [specific action]"

## 5-Second Resume Format

```
═══════════════════════════════════════════════════════════════════════════
DOING:   [one-line what we were doing]
STOPPED: [one-line where we stopped]
NEXT:    [one-line what to do immediately]
═══════════════════════════════════════════════════════════════════════════
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 12: SELF-IMPROVEMENT LOOP
# ════════════════════════════════════════════════════════════════════════════════

## After Every Task Completion

Ask yourself:
1. What worked well? → Store in _LEARNING/patterns/
2. What failed or was inefficient? → Store in _LEARNING/antipatterns/
3. What could be improved for next time? → Update protocols
4. Did I follow all protocols? → Self-audit
5. Were there any surprises? → Add to predictive checklist

## Learning Extraction Format

```json
{
  "task": "Description of what was done",
  "date": "ISO timestamp",
  "patterns_worked": ["Pattern 1", "Pattern 2"],
  "patterns_failed": ["Anti-pattern 1"],
  "insights": ["New insight discovered"],
  "protocol_compliance": 95,
  "improvements_identified": ["Improvement 1"]
}
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 13: EMERGENCY PROCEDURES
# ════════════════════════════════════════════════════════════════════════════════

## If Context Compaction Detected

1. IMMEDIATELY read CURRENT_STATE.json
2. Check quickResume for context
3. Resume from documented position
4. DO NOT restart from beginning

## If Task Seems to Be Restarting

1. STOP immediately
2. Read CURRENT_STATE.json
3. Check if work was already done
4. If yes: Resume from checkpoint
5. If no: Proceed but verify

## If Unsure About State

1. Read CURRENT_STATE.json
2. Read last 20 lines of target file
3. Ask: "Based on state and file content, should I resume from [X] or start fresh?"
4. Wait for user confirmation if uncertain

## If Tool Calls Approaching Limit

1. At 15 calls: Say "Orange zone. Checkpointing now."
2. Save all progress to state file
3. If task incomplete: Set status to IN_PROGRESS with clear next step
4. If task complete: Set status to COMPLETE with summary

---

# ════════════════════════════════════════════════════════════════════════════════
# DOCUMENT END
# ════════════════════════════════════════════════════════════════════════════════

**File:** AUTO_BOOTSTRAP.md
**Version:** 1.0
**Created:** 2026-01-25
**Purpose:** Single-file auto-loader for complete PRISM capability
**Location:** C:\\PRISM\_PRISM_MASTER\AUTO_BOOTSTRAP.md

**REMEMBER: Lives depend on thoroughness. No shortcuts. No "good enough."**
