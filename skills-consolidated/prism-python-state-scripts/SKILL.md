---
name: prism-python-state-scripts
description: Python session/state/checkpoint scripts — start sessions, update state, generate context, and manage checkpoints from the command line
---
# Python State & Session Scripts

## When To Use
- Starting a PRISM development session from the command line
- "How do I update CURRENT_STATE.json quickly?" / "How do I checkpoint?"
- When using Desktop Commander to run session management commands
- After completing a task and need to log the state change
- NOT for: material validation scripts (use prism-python-validation-scripts)
- NOT for: batch extraction or audit scripts (those are R2+ phase tools)

## How To Use
All scripts are in `C:\PRISM\SCRIPTS\`. Run from that directory for module imports to work.

**SESSION MANAGEMENT** (session_manager.py):
```bash
python session_manager.py start 1.A.5    # Start session, loads state, sets task
python session_manager.py status          # Current session info
python session_manager.py verify          # Verify state file integrity
python session_manager.py end             # Clean shutdown, logs session
```

**QUICK STATE UPDATES** (update_state.py — most used script):
```bash
python update_state.py complete "Extracted materials DB"    # Mark task complete
python update_state.py next "1.A.2" "Extract Machines"      # Set next task
python update_state.py stats databases 8                    # Update counter
python update_state.py blocker "Waiting for file"           # Set blocker
python update_state.py clear-blocker                        # Clear blocker
```
State updates are atomic (read-modify-write) — safe for concurrent access.

**CONTEXT GENERATION** (context_generator.py):
```bash
python context_generator.py --clipboard    # Minimal context, copies to clipboard
```
Generates compressed context for starting a new Claude session with full state awareness.

**CHECKPOINT SYSTEM** (state/checkpoint_system.py):
```bash
python -m state.checkpoint_system create    # Create checkpoint
python -m state.checkpoint_system restore   # Restore from last checkpoint
python -m state.checkpoint_system list      # List available checkpoints
```

**FROM CLAUDE via Desktop Commander:**
```javascript
Desktop Commander:start_process({
  command: 'python C:\\PRISM\\SCRIPTS\\update_state.py complete "Task done"',
  timeout_ms: 30000
})
```

**COMMON WORKFLOW — Start of session:**
  1. `python session_manager.py start 1.A.5`
  2. Work...
  3. `python update_state.py complete "Did X, Y, Z"`
  4. `python session_manager.py end`

**DEPENDENCIES:** json5, colorama, tqdm (install with `pip install json5 colorama tqdm`)
**PATHS:** All scripts use `C:\PRISM` as root. State file at `C:\PRISM\CURRENT_STATE.json`.

## What It Returns
- session_manager: session lifecycle events logged to SESSION_LOGS/
- update_state: atomic CURRENT_STATE.json updates with timestamp
- context_generator: clipboard-ready compressed context string
- checkpoint_system: timestamped state snapshots for recovery
- All write to logs in `C:\PRISM\SESSION_LOGS\`

## Examples
- Input: "I just finished creating 5 atomic skills and need to update state"
  Command: `python update_state.py complete "Created 5 atomic skills: lifecycle, pressure, recovery, authoring, enforcement"`
  Result: CURRENT_STATE.json updated with completion note + timestamp

- Input: "New Claude chat, need full context of where we left off"
  Command: `python context_generator.py --clipboard`
  Result: compressed state summary copied to clipboard, paste into new chat

- Edge case: "State file got corrupted after a crash"
  Command: `python -m state.checkpoint_system restore`
  Result: restores last good checkpoint. If no checkpoints: `python session_manager.py verify` to diagnose.
SOURCE: Split from prism-python-tools (11.5KB)
RELATED: prism-python-validation-scripts, prism-session-lifecycle
