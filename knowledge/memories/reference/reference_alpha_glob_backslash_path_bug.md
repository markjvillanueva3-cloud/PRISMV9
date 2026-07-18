---
name: reference_alpha_glob_backslash_path_bug
description: Glob tool path arg with backslashes silently returns empty even when files exist
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.469Z
aliases: reference_alpha_glob_backslash_path_bug
---


The `Glob` tool's `path:` argument with **Windows backslashes** (e.g. `path: "H:\\prism"`) silently returns "No files found" even when matching files exist. Observed 2026-05-29 (slot:alpha): `Glob({pattern:"mcp-server/src/engines/token-optimization/*", path:"H:\\prism"})` → empty, while Bash `ls H:/prism/mcp-server/src/engines/token-optimization/` showed `CLAUDE.md` + `MEMORY.md`. Failed 3× in one session before catching it.

**Workaround:** verify file presence with Bash `ls H:/prism/...` (forward slash), OR call `Glob` with NO `path` (defaults to CWD) and a full relative pattern. Never trust an empty Glob result when a backslash `path:` was passed. Related: [[reference_alpha_workflow_inventory_pattern]].
