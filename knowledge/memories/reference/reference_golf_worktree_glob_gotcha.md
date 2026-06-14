---
name: reference-golf-worktree-glob-gotcha
description: golf CWD is the slot worktree (H:/prism-slot-golf) but galaxy/state/buildout files live in H:/prism main tree — relative Globs MISS them; use absolute H:/prism paths.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.133Z
aliases: reference_golf_worktree_glob_gotcha
---


**Gotcha (slot:golf, 2026-05-29):** A `/checkin-golf` session runs with CWD = the slot worktree `H:/prism-slot-golf` (branch `slot/golf`), but the per-domain galaxy files, `state/shared/per-slot-galaxy-buildout/golf.md`, and most shared state live in the `H:/prism` **main tree**.

A **relative** Glob like `mcp-server/src/engines/fleet-hygiene/*` resolves against the worktree and returns "No files found" even though the files exist in `H:/prism`. This caused a false "galaxy missing" read at session start — the galaxy + the buildout brief were both present in main tree the whole time.

**How to apply:** For galaxy / state / buildout / master-MEMORY lookups, use **absolute `H:/prism/...` paths** in Glob/Read, or `git -C H:/prism`. Don't trust a worktree-relative "not found" for shared-tree assets.
