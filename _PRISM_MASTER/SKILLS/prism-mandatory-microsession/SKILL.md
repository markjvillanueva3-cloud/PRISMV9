# PRISM MANDATORY MICROSESSION SKILL v1.0
## ⛔ THIS SKILL IS ALWAYS-ON - LEVEL 0 - CANNOT BE DISABLED
## Every task MUST be decomposed into microsessions before execution
### Location: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\SKILLS\prism-mandatory-microsession\SKILL.md

---

# ════════════════════════════════════════════════════════════════════════════════
# SKILL METADATA
# ════════════════════════════════════════════════════════════════════════════════

```yaml
id: prism-mandatory-microsession
version: 1.0
level: 0  # ALWAYS-ON - Same level as life-safety
trigger: ALWAYS
purpose: Enforce microsession decomposition for ALL tasks
dependencies: [prism-session-master, prism-sp-planning]
agents: [task_decomposer, coordinator, session_continuity]
enforcement: HARD_BLOCK  # Cannot proceed without microsession plan
```

---

# ════════════════════════════════════════════════════════════════════════════════
# CORE PRINCIPLE
# ════════════════════════════════════════════════════════════════════════════════

**EVERY task, no matter how small, MUST be executed within a microsession framework.**

This is not optional. This is not a suggestion. This is MANDATORY.

## Why?

1. **Context limits** - Claude has finite context. Large tasks overflow.
2. **Compaction risk** - Work is lost when context compacts mid-task.
3. **Restart prevention** - Microsessions have clear checkpoints to resume from.
4. **Progress tracking** - Know exactly where you are at all times.
5. **Quality assurance** - Smaller chunks = better verification.

---

# ════════════════════════════════════════════════════════════════════════════════
# ENFORCEMENT GATE
# ════════════════════════════════════════════════════════════════════════════════

## ⛔ BEFORE ANY TASK EXECUTION

Claude MUST:

1. **DECOMPOSE** the task into microsessions
2. **DOCUMENT** the microsession plan
3. **ANNOUNCE** the current microsession scope
4. **TRACK** progress within microsession
5. **CHECKPOINT** at microsession boundaries

## Enforcement Protocol

```
TASK_RECEIVED:
  ├── Is this a trivial task (< 3 tool calls)? 
  │   ├── YES → Execute directly but still track
  │   └── NO → MUST create microsession plan
  │
  ├── Create MICROSESSION_PLAN:
  │   ├── Decompose into chunks of 15-25 items
  │   ├── Each chunk must complete in < 15 tool calls
  │   ├── Define checkpoint triggers
  │   └── Define success criteria per chunk
  │
  └── Execute in microsessions with checkpoints
```

---

# ════════════════════════════════════════════════════════════════════════════════
# MICROSESSION STRUCTURE
# ════════════════════════════════════════════════════════════════════════════════

## Required Fields

Every microsession MUST have:

```
MICROSESSION: [TASK-ID]-MS-[NNN]
═══════════════════════════════════════════════════════════════════════════════
│ SCOPE:              [Specific, bounded description of what this MS does]
│ ITEMS:              [Count] items (e.g., "25 materials", "10 modules")
│ ESTIMATED_CALLS:    [N] tool calls expected
│ CHECKPOINT_AT:      [Trigger condition - e.g., "10 items OR 12 calls"]
│ SUCCESS_CRITERIA:   [How to know this MS is complete]
│ ABORT_CRITERIA:     [When to stop and checkpoint early]
│ DEPENDENCIES:       [What must exist before this MS can run]
│ OUTPUTS:            [What this MS produces]
│ NEXT_MS:            [What microsession follows this one]
═══════════════════════════════════════════════════════════════════════════════
```

---

# ════════════════════════════════════════════════════════════════════════════════
# AUTO-DECOMPOSITION RULES
# ════════════════════════════════════════════════════════════════════════════════

## Task Size → Microsession Count

| Task Size | Microsession Strategy |
|-----------|----------------------|
| Trivial (< 3 calls) | Single execution, still announce scope |
| Small (3-10 calls) | Single microsession with checkpoint |
| Medium (10-30 calls) | 2-3 microsessions |
| Large (30-100 calls) | 5-10 microsessions |
| Very Large (100+ calls) | 10+ microsessions with Ralph loop |

## Item Count → Chunk Size

| Item Type | Recommended Chunk Size |
|-----------|----------------------|
| Materials | 20-25 per microsession |
| Modules | 10-15 per microsession |
| Lines of code | 200-400 per microsession |
| Files to process | 5-10 per microsession |
| Database records | 50-100 per microsession |

---

# ════════════════════════════════════════════════════════════════════════════════
# MICROSESSION LIFECYCLE
# ════════════════════════════════════════════════════════════════════════════════

## Phase 1: PLAN (Before First Tool Call)

```
1. Receive task
2. Analyze scope and complexity
3. Decompose into microsessions
4. Announce plan
```

## Phase 2: EXECUTE (During Microsession)

```
1. Announce microsession start
2. Execute in batches of 5-10 items
3. Report progress after each batch
4. Checkpoint at trigger
```

## Phase 3: COMPLETE (At Microsession End)

```
1. Verify success criteria met
2. Update CURRENT_STATE.json
3. Announce completion and next MS
```

## Phase 4: HANDOFF (If Session Ending)

```
1. Save full checkpoint
2. Write quickResume with MS context
```

---

# ════════════════════════════════════════════════════════════════════════════════
# RALPH LOOP INTEGRATION
# ════════════════════════════════════════════════════════════════════════════════

## Ralph-Microsession Hybrid

```
RALPH_LOOP: TASK-XYZ
├── MAX_ITERATIONS: 10
├── ITERATION = MICROSESSION
├── QUALITY_CHECK: After each MS
├── COMPLETION_CHECK: After quality passes
└── CHECKPOINT: Every MS boundary

while not complete AND iteration < max:
    execute_microsession()
    checkpoint()
    quality_check()
    completion_check()
    iteration++
```

---

# ════════════════════════════════════════════════════════════════════════════════
# DEFENSIVE MEASURES
# ════════════════════════════════════════════════════════════════════════════════

## Anti-Overflow Protection

- At 12 calls: "Approaching checkpoint trigger"
- At 15 calls: "CHECKPOINT NOW" - mandatory save
- At 18 calls: "ABORT MICROSESSION" - save and stop

## Anti-Restart Protection

Every checkpoint includes:
- Exact item index
- Partial work state
- Clear "NEXT" action
- Recovery instructions

## Anti-Loss Protection

Checkpoint saves:
- Timestamp
- Microsession ID
- Item range completed
- Files modified

---

# ════════════════════════════════════════════════════════════════════════════════
# ENFORCEMENT SUMMARY
# ════════════════════════════════════════════════════════════════════════════════

## HARD RULES

❌ **BLOCKED**: Starting task without MS decomposition
❌ **BLOCKED**: MS exceeding 18 calls without checkpoint
❌ **BLOCKED**: Completing MS without success verification
❌ **BLOCKED**: Next MS without checkpointing current

## SOFT RULES

⚠️ Keep MS to 15-25 items
⚠️ Checkpoint every 10 items
⚠️ Announce progress every 5 items
⚠️ Quality check at MS boundaries

---

**This skill ensures work is never lost. Every task. Every time. No exceptions.**
