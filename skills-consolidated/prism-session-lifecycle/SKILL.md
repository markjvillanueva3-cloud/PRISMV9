---
name: prism-session-lifecycle
description: Session start, during, and end protocols — the 5-step boot, checkpoint rhythm, anti-restart rules, and clean shutdown procedure
---
# Session Lifecycle Protocol

## When To Use
- Starting any PRISM development session (first thing, every time)
- "How do I start a session?" / "What do I do when I'm done?"
- When you're mid-session and need to check if you should checkpoint
- When Claude Desktop restarts or a new chat begins on an existing task
- NOT for: context pressure zones and response budgets (use prism-context-pressure)
- NOT for: post-compaction or cross-session recovery (use prism-session-recovery)

## How To Use
**SESSION START (5 steps, execute in order):**
  1. Read CURRENT_POSITION.md → know which phase/MS you're in
  2. Check status: if IN_PROGRESS → resume from substep (never restart). If COMPLETE → advance.
  3. Read quick resume context: DOING [what], STOPPED [where], NEXT [what]
  4. Load phase-appropriate skills (from phase doc RECOMMENDED_SKILLS header)
  5. Initialize checkpoint counter at 0

**ANTI-RESTART RULES:**
  ❌ NEVER restart a task that's IN_PROGRESS — resume from where it stopped
  ❌ NEVER re-read files already in context — wastes tokens on known content
  ❌ NEVER repeat work from previous session — check tracker first
  ✅ CHECKPOINT progress → CONTINUE → COMPLETE is the only valid flow

**DURING SESSION — CHECKPOINT RHYTHM:**
  Every 3-5 tool calls: mental check — am I approaching yellow zone?
  Every 8-10 tool calls: micro-checkpoint — update CURRENT_POSITION.md substep
  After completing a logical unit: standard checkpoint — full state + tracker update
  Before any risky operation (file replace, schema change): full checkpoint first
  Auto-checkpoint triggers: 10+ calls since save, 3+ files modified, 200+ lines written,
  any destructive operation, any operation with uncertain outcome

**SESSION END (4 steps):**
  1. Update CURRENT_POSITION.md with exact stopping point and next action
  2. Append session summary to ROADMAP_TRACKER.md (what was done, counts, next)
  3. Write SESSION_HANDOFF.md if significant context needed for next session
  4. Verify: can a fresh instance read position + handoff and resume in <60s?

## What It Returns
- Start: a running session with correct position, loaded skills, zero counter
- During: regular checkpoints preventing work loss, predictable save rhythm
- End: clean handoff state where next session resumes without re-discovery
- The guarantee: no work lost between sessions, no repeated discussions, clear next action

## Examples
- Input: "New chat opens, CURRENT_POSITION says DA-MS10 step 3/5 IN_PROGRESS"
  Action: DO NOT restart MS10 from step 1. Read substep notes. Resume at step 3.
  Load recommended skills for DA phase. Counter starts at 0. Continue from where we stopped.

- Input: "Just finished writing 3 atomic skills and indexing them. 12 tool calls since last save."
  Action: 12 calls > 10 threshold → checkpoint NOW. Update CURRENT_POSITION substep.
  Append to tracker: "3 skills created, indexed, quality verified." Reset counter.

- Edge case: "Claude Desktop crashed mid-edit. New chat starts. No handoff file."
  Action: Read CURRENT_POSITION.md (always exists). Read last 5 ROADMAP_TRACKER entries.
  Check files in working directories for recent modifications. Reconstruct position.
  If uncertain: state what you think happened and ask user to confirm before proceeding.
SOURCE: Split from prism-session-master (26.9KB)
RELATED: prism-context-pressure, prism-session-recovery
