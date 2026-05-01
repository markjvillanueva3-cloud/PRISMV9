# prism-dev-state-scripts
## Purpose
Scripts for managing PRISM development state — checkpoints, snapshots, and state file management.
## When to Use
- Saving/restoring development state between sessions
- Creating state checkpoints before risky operations
- Managing CURRENT_POSITION.md and ACTION_TRACKER.md programmatically
## Examples
- `python dev_state_checkpoint.py` — snapshot current state
- `python dev_state_restore.py --checkpoint latest` — restore last checkpoint
