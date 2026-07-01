---
name: prism-context-pressure
description: Context pressure zones with response caps — 4 zones (green/yellow/orange/red), 3 metrics (tool calls, exchange depth, response length), and mandatory zone actions
---
# Context Pressure Management

## When To Use
- During any session to decide response length and when to checkpoint
- "Am I running out of context?" / "Should I save now?"
- When PRISM cadence reports pressure_level in tool call output
- When you have been working for 10+ tool calls without checkpointing
- NOT for: how to start or end a session (use prism-session-lifecycle)
- NOT for: how to recover after compaction (use prism-session-recovery)

## How To Use
THREE METRICS determine your zone (use the WORST one):

Tool calls since checkpoint: 0-8 GREEN, 9-14 YELLOW, 15-18 ORANGE, 19+ RED
Conversation exchanges: 0-15 GREEN, 15-20 YELLOW, 20-25 ORANGE, 25+ RED
Response length (words): under 2000 GREEN, 2000-3000 YELLOW, 3000-3500 ORANGE, over 3500 RED

If any single metric hits a zone, you are in that zone.

ZONE ACTIONS (mandatory):

GREEN: Work freely. Optional micro-checkpoint every 5 calls.

YELLOW: Complete current logical unit, then checkpoint.
  Finish the unit. Update CURRENT_POSITION.md + tracker. Reset counter.

ORANGE: STOP current work. Checkpoint NOW.
  No new operations. Full checkpoint. Cap responses at 8KB.

RED: EMERGENCY. Save everything immediately.
  Full state save. Announce session must end. Cap responses at 5KB.

RESPONSE CAPS BY PRESSURE (GSD v22.0):
  0-59%: 20KB max. 60-69%: 12KB. 70-84%: 8KB. 85%+: 5KB survival mode.

AUTO-CHECKPOINT TRIGGERS (fire regardless of zone):
  10+ calls since save, 3+ files modified, 200+ lines written,
  before destructive ops, before uncertain outcomes, before external deps.

## What It Returns
- Current pressure zone based on 3 metrics
- Mandatory action for that zone
- Response length cap for current pressure level
- Whether auto-checkpoint should fire right now
- The cadence function pressure_check reports this automatically

## Examples
- Input: "14 tool calls since checkpoint, 18 exchanges, 1500 word response"
  Worst metric: 14 calls = YELLOW (exchanges 18 = also yellow)
  Action: finish current unit, then checkpoint. Do not start new skill file.

- Input: "22 tool calls, 28 exchanges, writing 4000-word response"
  All three metrics = RED
  Action: EMERGENCY STOP. Save everything. Write handoff. Session ends.

- Edge case: "Only 6 tool calls but 24 exchanges (long discussion)"
  Calls = GREEN, but exchanges = ORANGE. Zone: ORANGE (worst wins).
  Checkpoint NOW even though call count is low.
SOURCE: Split from prism-session-master (26.9KB)
RELATED: prism-session-lifecycle, prism-session-recovery
