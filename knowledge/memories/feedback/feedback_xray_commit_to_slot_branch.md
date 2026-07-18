---
name: feedback_xray_commit_to_slot_branch
description: "xray/blueprint-vision stages + commits its domain work to the slot/xray NATO-named git branch (its own worktree), not directly to main"
type: feedback
galaxy: blueprint-vision
source: prism-memory
synced: 2026-06-27T20:30:46.455Z
aliases: feedback_xray_commit_to_slot_branch
---


**Rule (operator directive, 2026-06-10, /yolo-mode "good night"):** the **xray** slot (blueprint-vision galaxy) stages and commits its domain work to its OWN chat-slot NATO-named git branch — **`slot/xray`** — through its worktree `H:/prism-slot-xray`, NOT directly to `main` / `cad-fusion-live-ms0`.

**Why:** per-slot branches keep each slot's work independently mergeable and prevent cross-slot collisions on the shared tree. The operator explicitly wants xray's commits isolated to `slot/xray`. This is the per-slot-worktree model (CLAUDE.md §PER-CHAT HANDOFF / §SLOT-WORKTREE) re-affirmed for the xray lane — it overrides the fleet's recent drift toward `[MAIN]`-prefixed direct-to-main commits.

**How to apply:**
- Work in the worktree `H:/prism-slot-xray` (checked out to `slot/xray`).
- `git add` ONLY your own changed files by explicit path. The worktree carries large fleet `.claude/` churn that is NOT yours — never `git add -A` / `git add .`; stage named paths only.
- Commit subject: `[xray] [SCOPE]/U-ID: title` (use `[MAIN]` prefix ONLY when explicitly integrating to the shared tree).
- Domain artifacts that belong to xray: `mcp-server/src/engines/blueprint-vision/**`, OCR/blueprint/CAD-extract scripts (`scripts/blueprint-ocr-*`, `scripts/lib/ocr-training-loop-lib.mjs`, `scripts/lib/vision-*`), blueprint-vision wiki + memories.
- The branch may be far behind main; commit your specific files regardless — they merge forward when `slot/xray` integrates. Do NOT rebase/reset the whole stale branch at autonomous time (high conflict risk in the `.claude/` churn).

Links: [[feedback_commit_prefix_main_on_shared_tree]] (the main-tree convention this supersedes for xray) · [[feedback_all_slots_free_access]] · [[reference_slot_worktree_activation_2026_05_16]].
