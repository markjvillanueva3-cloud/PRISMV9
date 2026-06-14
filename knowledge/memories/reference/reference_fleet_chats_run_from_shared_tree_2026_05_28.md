---
name: reference-fleet-chats-run-from-shared-tree
description: All fleet chats launch with cwd=H:/prism (shared tree), NOT their slot worktree — so any CWD-based per-slot runtime logic is inert. Per-slot runtime differentiation must use env or the ps-window-pin.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.113Z
aliases: reference_fleet_chats_run_from_shared_tree_2026_05_28
---


**Confirmed 2026-05-28 (slot:alpha, MCP-CONSOLIDATION-MS0/U-MCP-ROLLOUT):** every fleet chat launches with **process cwd = `H:/prism`** (the shared tree), NOT `H:/prism-slot-<name>`.

**Evidence:**
- `scripts/regenerate-launch-fleet.mjs` (lines ~344-357) builds every Windows-Terminal tab as `nt --title ... -d "%PRISM%" "%PWSH%" -NoExit ... ${bootArgs}` — `-d "%PRISM%"` = `H:/prism` for ALL slots.
- The SLOT-COMMIT-ENFORCE hook reports `commit cwd: H:/prism` / `expected tree: H:/prism-slot-alpha` for a slot chat — i.e. the chat runs from the shared tree.

**Why it matters:** the slot-worktree model (SLOT-WORKTREE-MS0) uses `H:/prism-slot-<name>` worktrees for **commits** (via the worktree-commit-route / git-add-lane / main-tree-write-block hooks), but the chat PROCESS — and therefore any MCP stdio child it spawns (e.g. the `mcp-http-bridge.mjs`) — has cwd = `H:/prism`. So:
- **Any `process.cwd()`-based per-slot detection is INERT in production.** (U-MCP-ROLLOUT's `slotFromCwd` fallback in `mcp-tool-domains.mjs` is correct + fail-open but never fires — it resolves `H:/prism` → null → all tools.)
- The chat reads `H:/prism/.mcp.json` (shared), NOT a per-worktree `.mcp.json`.

**How to apply — per-slot runtime differentiation options (ranked):**
1. **Env set by the launcher per tab** (e.g. `$env:PRISM_SLOT_GALAXY=<galaxy>` before `claude`) — reliable, the bridge/child inherits it at spawn. Requires editing `regenerate-launch-fleet.mjs`.
2. **ps-window-pin ancestry** — the pwsh window→slot pin, walked from a child process. BUT it's written by `/checkin-<slot>` (inside claude, AFTER MCP init), so it is NOT available at bridge-startup / MCP-init time. Unreliable for early resolution.
3. **CWD** — only works if the launcher is changed to `-d` the worktree per tab (it isn't; doing so would also change commit-cwd semantics fleet-wide).

See [[feedback_commit_to_slot_worktree]] · [[reference_slot_worktree_activation_2026_05_16]]. MCP filter mechanism: `mcp-server`/`.claude/helpers/mcp-tool-domains.mjs`.
