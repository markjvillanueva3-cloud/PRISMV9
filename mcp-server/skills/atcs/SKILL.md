# ATCS — Autonomous Task Completion System

## Dispatcher: prism_atcs (10 actions)

## When to Use
- Large-scale data campaigns (e.g., populate 2000+ materials with 127 parameters each)
- Multi-session tasks that exceed a single context window
- Batch operations requiring validation per unit
- Any task where "continue" should resume exactly where you left off
- Tasks requiring zero placeholders / zero stubs / mathematical certainty

## Core Concept
ATCS is a **file-system state machine**. All state lives on disk at:
`C:\PRISM\autonomous-tasks\[task-id]\`

This means:
- Context resets between sessions don't lose work
- Any session can cold-resume from manifest
- Work products accumulate incrementally across unlimited sessions

## Actions

| Action | Purpose |
|---|---|
| `task_init` | Create manifest + queue + criteria + stub patterns on disk |
| `task_resume` | Cold-resume: reads manifest, returns exact resume point |
| `task_status` | Progress report with omega averages, unit breakdown |
| `queue_next` | Returns next batch (default 20) with dependency checking |
| `unit_complete` | Runs stub scan + acceptance criteria per unit |
| `batch_validate` | Batch-level validation + Ralph Loop integration point |
| `checkpoint` | Progress snapshot to disk |
| `replan` | Failure analysis, auto-requeue failed units, create retry batches |
| `assemble` | Cross-batch consistency check, duplicate detection, final output |
| `stub_scan` | Standalone placeholder/stub scanner on any data |

## Execution Loop

```
task_init (once)
  ↓
queue_next → [process units] → unit_complete (per unit)
  ↓
batch_validate (per batch of 20)
  ↓
checkpoint (save progress)
  ↓
[if failure > 30%] → replan → retry batch
  ↓
[repeat until queue empty]
  ↓
assemble → final output
```

## Session Resume Protocol

When user says "continue" or "resume":
```
1. prism_atcs action=task_resume           → Returns current_batch, current_unit, progress%
2. prism_atcs action=queue_next            → Get next batch
3. [Execute units using appropriate prism_* tools]
4. prism_atcs action=unit_complete         → Per unit, validates result
5. prism_atcs action=batch_validate        → After batch complete
6. prism_atcs action=checkpoint            → Save progress
```

## Quality Stack (5 layers)
1. **Execution rules**: Never generate placeholders, TODOs, approximate values
2. **Stub scanner**: Pattern matching (TODO, FIXME, PLACEHOLDER, 0.0, -1, 999, ~approximately~)
3. **Acceptance criteria**: Field-level type/range/completeness validation
4. **Ralph Loop**: Iterative review with Ω ≥ 0.70 gate (requires API key)
5. **Assembly validation**: Cross-batch consistency, duplicate detection, coverage check

## Unit Statuses
- `PENDING` → Waiting in queue
- `IN_PROGRESS` → Currently being worked on
- `COMPLETED` → Passed all validation
- `FAILED` → Failed validation, queued for retry
- `NEEDS_RESEARCH` → Uncertain data, flagged for manual review
- `HALTED` → Failed MAX_RALPH_ITERATIONS times

## Constants
- DEFAULT_BATCH_SIZE: 20
- MAX_RALPH_ITERATIONS: 3
- REPLAN_FAILURE_THRESHOLD: 30%
- REPLAN_BATCH_INTERVAL: every 5 batches

## Key Principle
**Never guess. Never approximate. Never stub.**
If data is uncertain → mark as NEEDS_RESEARCH.
If validation fails → replan and retry.
Lives depend on correctness.
