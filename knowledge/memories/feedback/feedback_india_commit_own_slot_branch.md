---
name: feedback_india_commit_own_slot_branch
description: "india stages+commits its work to its own NATO slot branch (slot/india), not the shared main tree"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_commit_own_slot_branch
---


**Rule (operator directive, 2026-06-10):** the **india** slot stages and commits its work to its OWN chat-slot NATO-named branch — **`slot/india`** — in the git tree, not the shared main integration tree (`cad-fusion-live-ms0`). Each slot owns its lane; the 26 `slot/*` worktrees exist for exactly this (CLAUDE.md §Lane discipline + conflict-fork rule).

**Why:** per-slot branch isolation keeps india's AI-training work independently reviewable + mergeable and stops multi-chat thrash on the shared HEAD. Matches the conflict-fork rule (`git worktree add -b slot/<x>` from the live tip).

**How to apply:**
1. Work in india's worktree `H:/prism-slot-india` (branch `slot/india`), or commit to `slot/india` from a worktree on that branch — NOT `cd /h/prism` (the shared `cad-fusion-live-ms0` tree).
2. Keep `slot/india` CURRENT by forking/rebasing from the live tip BEFORE building — a stale slot branch missing the live substrate orphans new code (broken imports).
3. Commit format unchanged: `[<SCOPE>]/U-ID: title (slot:india)`.

**KNOWN BLOCKER (discovered 2026-06-10):** `slot/india` is currently **4114 commits behind** `cad-fusion-live-ms0` and is MISSING the entire live AI-training substrate (`scripts/lib/`, `scripts/seed-ghost-gnn-classify.mjs`, the `mcp-server/src/engines/ai-training/` galaxy). india's real recent work (the OBSIDIAN-AI-SYNERGY thread, today's 19 commits + the nn-graph pipeline) lives on `cad-fusion-live-ms0`. So `slot/india` MUST be SYNCED to the live tip (operator-gated — a hard-to-reverse op that may discard its 79 stale FLEET-AI-SYSTEMS commits) BEFORE it can be india's canonical lane. Until synced, new code that depends on the live substrate commits to the coherent tree to avoid broken-import orphans. Supersedes-for-india [[feedback_commit_prefix_main_on_shared_tree]]; pairs with [[feedback_conflict_fork_rule]].
