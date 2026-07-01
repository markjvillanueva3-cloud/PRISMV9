---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_h_drive_portable.md
source_filename: feedback_h_drive_portable.md
content_hash: cb68f4f873567525ebfa713b69c4fc801648a0627e88c730d27501cc43f0d2a1
mirror_ts: 2026-05-05T13:00:09.447Z
mirror_engine: ObsidianMemorySyncEngine
---
The H: drive is portable between two PCs (work and home). Any configuration, symlinks, or path fixes must be portable — do NOT create PC-specific fixes that only work on one machine.

**Why:** The user switches between machines and expects PRISM to work identically on both. Fixes that rely on C: drive paths or machine-specific symlinks break when the H: drive moves.

**How to apply:**
- Store tools/configs on H: drive, not C:
- Use SessionStart hooks to create necessary symlinks/paths dynamically (e.g., `rtk-path-ensure.mjs`)
- Reference paths as `/h/...` or `H:/...`, never hardcoded C: user paths
- When creating symlinks, do it via a hook that runs on session start, not a one-time manual fix
- Test mentally: "will this still work if I plug H: into the other PC?"

**Current portable guards (SessionStart hooks):**
- `portable-python-guard.mjs` — ensures Python is available
- `dotclaude-junctions-guard.mjs` — ensures .claude junctions exist
- `rtk-path-ensure.mjs` — ensures RTK is symlinked to a PATH directory
- `sync-h-c-drives.mjs` — syncs critical files between drives
