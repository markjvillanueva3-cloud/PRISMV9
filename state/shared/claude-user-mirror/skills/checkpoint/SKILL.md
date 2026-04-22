---
name: checkpoint
description: Create a named context checkpoint before destructive operations or after milestone completion. Saves current state summary.
model: haiku
effort: low
allowed-tools: Read, Write, Bash
---

# Session Checkpoint Skill

Create a named snapshot of the current work state for recovery after compaction or session loss.

## Usage
/checkpoint <name> - saves checkpoint
/checkpoint list - lists existing checkpoints
/checkpoint restore <name> - outputs checkpoint content for re-injection

## Steps for Save

1. **Gather state**: Collect the following information:
   - Current task description (from conversation context)
   - Active files being worked on (from recent tool calls)
   - Recent changes made (summarize last 3-5 actions)
   - Any pending work or next steps mentioned
   - Current build/test status if known

2. **Create checkpoint file**: Write to ~/.prism/checkpoints/{name}.json with fields: name, created_at, task, active_files, recent_changes, next_steps, build_status, notes.

3. **Confirm**: Output the checkpoint name and key contents.

## Steps for List

1. Use Glob to find ~/.prism/checkpoints/*.json
2. Read each file and output a table: name | created_at | task summary

## Steps for Restore

1. Read ~/.prism/checkpoints/{name}.json
2. Output the full checkpoint as a compact context block:
CHECKPOINT RESTORE [name] (timestamp):
Task: ...
Files: ...
Recent: ...
Next: ...
Notes: ...

## Auto-Checkpoint Triggers
When invoked without a name, use the current date-time as the name (e.g., 2026-03-20T14-30).
