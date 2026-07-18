---
name: loop-state-tracking-discipline
category: software-engineering
domain: backend-dev
tags: [loop, state, tracking, fleet-awareness, peer-visibility, prism-development, ai-development]
last_updated: 2026-05-19
---

# Loop State Tracking Discipline — register your /loop so peers can see it

PRISM has TWO independent loop mechanisms running side by side:

1. **The cron/ScheduleWakeup harness** — fires your /loop prompt on a cadence. Lives in the Claude session's runtime ([[cron-and-scheduled-task-discipline]]).
2. **The `loop-state.mjs` tracker** — durable JSON state per session at `state/shared/loop-state/loop-<sid>.json` that peer chats see in their `─── /loop awareness ───` inject as *"Other active /loop sessions across fleet."*

**They are not coupled.** The cron fires regardless of whether you register loop-state; loop-state is visible to peers regardless of whether a cron drives it. A chat that runs /loop but never registers via `loop-state.mjs` is **invisible to peer fleet awareness** — peers see "No active loop" for this session ID and can't coordinate. That's the silent gap this wiki names.

## The bookend pattern — 3 calls

```bash
# At the START of the loop (first iteration, after /loop fires):
node H:/prism/.claude/helpers/loop-state.mjs start \
  --session <claude-session-id> \
  --task "<one-line task description>" \
  --target 20                                            # expected iteration count

# At EACH iteration (after delivering its work):
node H:/prism/.claude/helpers/loop-state.mjs tick \
  --session <claude-session-id> \
  --status ok \                                          # ok | warn | failed
  --note "<one-line summary of this tick's deliverable>"

# At LOOP END (operator stop, drift discipline triggers stop, target reached):
node H:/prism/.claude/helpers/loop-state.mjs end \
  --session <claude-session-id> \
  --reason done                                          # done | stopped | timeout | error
```

The session ID is your stable claude session id (from `stable-session-id.mjs` or the Chat Isolation line). It's how peers cross-reference your loop in their fleet roster.

## What it surfaces

The `loop-iteration-inject` hook reads `state/shared/loop-state/*.json` and emits the `─── /loop awareness ───` block on every UserPromptSubmit. Two parts:

- **This session's loop:** *"iter N/target · status=ok · task=…"*
- **Fleet rolledup:** *"Other active /loop sessions across fleet: …"* — top-K by most-recently-updated, with short task descriptions

Without `start`, your session shows *"No active /loop state — starting fresh"* and you contribute nothing to the fleet view.

## The R10 checkpoint relationship

Karpathy R10 (CLAUDE.md §CLAUDE.md RULES) says: *"checkpoint state between iterations — never continue from a state you can't describe."* The `tick --note` IS the canonical checkpoint:

- The note tells **you** (and future-you-after-/compact) what last iteration delivered
- It tells **peers** what you're working on right now
- It tells **the operator** at-a-glance via fleet status

A loop that doesn't tick is a loop that has lost its own state — both literally (loop-state doesn't update) and metaphorically (no per-iteration restatement).

## When to register vs not

| Loop shape | Register loop-state? |
|---|---|
| `/loop 5m <task>` cron-driven, multiple iterations | **YES — start + tick each tick + end** |
| `/loop <task>` dynamic-mode (ScheduleWakeup) | **YES** |
| `/loop 1h /weekly-audit` once-a-week cron | **YES, but tick is rare** — peers should still see the loop exists |
| Single-iteration `/loop` (user types it once, no recurrence) | NO — the bookend overhead doesn't pay |
| Sub-loop of a larger plan (you're not the operator) | Defer — typically the orchestrator owns the loop-state |
| Cloud-scheduled (via `/schedule`) routine | NO — different mechanism (cloud routines have their own visibility) |

## The session-ID anchoring trap

`loop-state.mjs` keys state by `--session <id>`. Mismatch the ID and you create a ghost loop:

```bash
# Bad — used $PPID which rotates between hook invocations
node loop-state.mjs start --session $PPID --task "..."

# Good — use stable-session-id helper
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node loop-state.mjs start --session "$STABLE" --task "..."
```

The same pattern that bit per-agent-handoff writers ([[handoff-discipline]]) bites loop-state. The stable helper anchors to claude's own session_id and survives `/compact`.

## The `tick --status` contract

Three valid statuses with specific meaning:

- **`ok`** — this iteration delivered its goal. Note describes the deliverable.
- **`warn`** — this iteration completed but flagged a concern (peer collision avoided, lock contention sustained, no-deliverable per drift-discipline). Note describes the warn.
- **`failed`** — this iteration could not deliver (genuine blocker, not transient). Note describes the failure.

Drift-discipline ([[autonomous-loop-drift-discipline]]) honest-no-deliverable ticks should record as `warn`, NOT `ok` — the deliverable WAS deferred. Recording `ok` on no-deliverable hides the saturation signal from peer chats AND future-you.

## The `end --reason` contract

Four valid reasons:

- **`done`** — target reached, all expected deliverables shipped
- **`stopped`** — operator interrupt (Ctrl-C, /compact-without-resume, manual cron delete)
- **`timeout`** — cadence cron lapsed past the 7-day auto-expire
- **`error`** — unrecoverable failure (host crash, permission denial)

After `end`, the loop-state file is NOT deleted — it stays as historical record. The awareness inject filters to recent OR `status != ended` entries; ended entries surface in audit/dashboard contexts.

## Multi-host coexistence

The state lives in `state/shared/loop-state/` (shared across PCs). Use **per-host suffix** only if two PCs may run the SAME session-id (rare; sessions are per-claude-instance). The default unsuffixed pattern works for the canonical case.

If you find two `loop-<sid>.json` files for the same SID across hosts — that's an indicator something is sharing session IDs across instances. Diagnose before continuing.

## Cron vs loop-state — independent failure modes

| Cron alive? | loop-state present? | Means |
|---|---|---|
| ✓ | ✓ | Healthy — chat is iterating + peers can see |
| ✓ | ✗ | Cron firing but invisible to peers; you're a ghost in the fleet roster |
| ✗ | ✓ | Loop-state lingers from a finished/crashed loop; need `end` or stale-reap |
| ✗ | ✗ | No loop running |

Most session-end-without-end-call leaves a **stale `loop-state` file** that the next session inherits incorrectly. The `awareness-snapshot` hook surfaces these as warnings; clean up with explicit `end --reason stopped` on session close, or let the cron expire (7-day auto-expire).

## Anti-patterns

- **Run `/loop 5m <task>` but never call `loop-state.mjs start`** → invisible to fleet; peers can't coordinate; future-you can't see iter count after `/compact`.
- **`tick --status ok` on a no-deliverable iteration** → hides saturation from peers; later audits think the loop was always productive.
- **Use `$PPID` for `--session`** → rotates between hook invocations; creates ghost loops.
- **Forget to call `end`** → loop-state lingers; next session's awareness inject may misread it as active.
- **Tick after every minor sub-action** → noise; one tick per loop iteration (per cron-fire OR per ScheduleWakeup cycle), not per tool call.
- **Re-register `start` mid-loop** → resets iteration count; loses peer visibility continuity. The bookend is start ONCE + tick MANY + end ONCE.
- **Skip the `--note`** → R10 violation. The note IS the checkpoint.
- **Cross-PC session-ID collision** without per-host suffix → ambiguous loops in fleet roster.

## Checklist — every /loop session

- [ ] On first iteration: `start --session <stable> --task "..." --target N`?
- [ ] Each subsequent iteration: `tick --status <ok|warn|failed> --note "..."`?
- [ ] Stable session ID (NOT `$PPID`)?
- [ ] Status reflects honest deliverable (no-deliverable = `warn`)?
- [ ] Note is one line + describes WHAT shipped (not just "did the thing")?
- [ ] At loop end OR session close: `end --reason <done|stopped|...>`?
- [ ] No stale loop-state files lingering from crashed prior sessions?

## Verification

```bash
# Is my loop registered?
ls -la state/shared/loop-state/loop-<my-sid>.json

# What does the fleet see?
ls -la state/shared/loop-state/*.json | sort -t- -k2

# Stale loops to reap (no tick in >2h):
find state/shared/loop-state -name "loop-*.json" -mmin +120
```

## Related

- [[autonomous-loop-drift-discipline]] — when to call `tick --status warn` vs `ok`
- [[fleet-coordination-discipline]] — peers seeing your loop is half of coordination
- [[cron-and-scheduled-task-discipline]] — the cron half of the loop trio (CronCreate / ScheduleWakeup / Windows Scheduled Task)
- [[recall-injection-flow]] — `loop-iteration-inject` consumes loop-state on every UserPromptSubmit
- [[handoff-discipline]] — same session-ID anchoring trap
- [[scan-lived-signals-for-wiki-gaps]] (memory) — this wiki was discovered via the lived "No active /loop state" inject
- `.claude/helpers/loop-state.mjs` — the source of truth
- `.claude/hooks/loop-iteration-inject.mjs` — the consumer hook
- CLAUDE.md §DEV PRODUCTIVITY HOOKS — the loop-inject mention
