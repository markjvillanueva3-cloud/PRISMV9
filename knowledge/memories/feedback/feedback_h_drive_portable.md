---
name: H Drive Portability Requirement
description: H: drive is portable between work PC and home PC — all fixes must work on both machines
type: feedback
originSessionId: c2d5488a-3e31-4b90-aec3-3ac651b39c67
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
