---
name: prism-mandatory-microsession
description: |
  LEVEL 0 ALWAYS-ON skill that ENFORCES microsession decomposition for ALL tasks.
  Every task MUST be broken into 15-25 item chunks with checkpoints.
  HARD_BLOCK enforcement - cannot proceed without microsession plan.
  Prevents context overflow, work loss, and restart issues.
  Key principle: Every task. Every time. No exceptions.
  Part of SP.1 Core Development Workflow.
---

# PRISM MANDATORY MICROSESSION SKILL v1.0
## ⛔ THIS SKILL IS ALWAYS-ON - LEVEL 0 - CANNOT BE DISABLED
## Every task MUST be decomposed into microsessions before execution

---

# SKILL METADATA

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

# CORE PRINCIPLE

**EVERY task, no matter how small, MUST be executed within a microsession framework.**

This is not optional. This is not a suggestion. This is MANDATORY.

## Why?

1. **Context limits** - Claude has finite context. Large tasks overflow.
2. **Compaction risk** - Work is lost when context compacts mid-task.
3. **Restart prevention** - Microsessions have clear checkpoints to resume from.
4. **Progress tracking** - Know exactly where you are at all times.
5. **Quality assurance** - Smaller chunks = better verification.

---

# ENFORCEMENT GATE

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

# MICROSESSION STRUCTURE

## Required Announcement

Every microsession MUST start with:

```
───────────────────────────────────────────────────────────────────────────────
MICROSESSION MS-[NNN] START
───────────────────────────────────────────────────────────────────────────────
Scope: [What this MS does]
Items: [N]
Checkpoint at: [Trigger condition]
Success criteria: [How to verify]
───────────────────────────────────────────────────────────────────────────────
```

---

# AUTO-DECOMPOSITION RULES

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

# BUFFER ZONES (Enforced)

| Zone | Tool Calls | Required Action |
|------|------------|-----------------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Say: "Yellow zone. Checkpoint after current unit." |
| 🟠 ORANGE | 15-18 | Say: "Orange zone. Checkpointing NOW." Then save immediately. |
| 🔴 RED | 19+ | Say: "RED ZONE. Emergency checkpoint." Stop all work. |

---

# ENFORCEMENT SUMMARY

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
