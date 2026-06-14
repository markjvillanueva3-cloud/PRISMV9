---
name: reference-shared-tree-commit-sweep-2026-06-02
description: "Shared H:/PRISM tree multi-committer hazard (golf 2026-06-02): with 5+ chats committing concurrently to cad-fusion-live-ms0 in the SAME working tree H:/PRISM, (1) a raw `git commit` from golf ORPHANED twice — the branch ref moved to a peer's commit (alpha, then bravo) so golf's commit became a dangling object; (2) a peer's broad `git add`/`commit -a` (bravo's U-SLOT-BRIEF-DOCREFLECT) SWEPT golf's uncommitted working-tree changes (mcp-reconnect-action.mjs+test) into bravo's unrelated commit dde9e2d068 — code landed but mis-attributed. index.lock thrashes (5 git procs). Lesson: never leave uncommitted changes in H:/PRISM while peers are active; commit in a quiet window or in golf's own slot worktree; never history-rewrite a shared tree to fix attribution."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.934Z
aliases: reference_shared_tree_commit_sweep_2026_06_02
---


# Shared H:/PRISM tree — concurrent-committer sweep + orphan hazard

**Observed (golf, 2026-06-02, MCP-ALWAYS-CONNECTED build):** golf edited `scripts/lib/mcp-reconnect-action.mjs` (+test) in the shared `H:/PRISM` checkout (cad-fusion-live-ms0, the runtime+integration tree). While committing:
1. **Orphan race ×2.** `git commit` created `ae8da465d2`, but the branch ref had already advanced to a peer's commit (alpha `1be4e99e06`, then bravo `dde9e2d068`); golf's commit was never an ancestor → **dangling** (recoverable by sha ~2 weeks, NOT lost). Every *successful* peer commit carried `[BOOTSTRAP-SLOT-ENFORCE]`; golf's raw commit did not — suggesting a slot-enforce routing/reset the raw path bypassed.
2. **`index.lock` thrash.** 5 concurrent `git.exe`; `git add`/`reset` failed with `Unable to create index.lock: File exists`. A `git reset --soft HEAD~1` attempted while HEAD had moved would have uncommitted the PEER's commit — the lock failure *prevented* that damage. **Never reset on a shared tree whose HEAD is moving under you.**
3. **Peer sweep.** Bravo's commit `dde9e2d068` ("U-SLOT-BRIEF-DOCREFLECT", unrelated) **included golf's uncommitted working-tree changes** — a broad `git add`/`commit -a` swept them. Net: golf's code + tests landed durably on the branch but mis-attributed to bravo. (Symmetric to golf's own earlier sweep of a peer's uncommitted `.gitignore` reorg.)

**Rules (reinforce the slot-worktree doctrine — this is exactly what it prevents):**
- **Never leave uncommitted changes in `H:/PRISM` while peers are active** — they will be swept into a peer's `git add -A`/`commit -a`.
- **Scoped `git add <explicit paths>`, never `-A`/`-a`** (already doctrine: [[feedback_commit_prefix_main_on_shared_tree]]) — and commit IMMEDIATELY after editing, in a quiet window, or do the work in golf's own slot worktree `H:/prism-slot-golf` (slot/golf) and integrate.
- **Never history-rewrite a shared tree** (`reset`/`rebase`/amend a pushed-or-peer-built commit) to fix attribution or sweeps — it orphans every concurrent chat. Accept messy-but-correct; document instead.
- **Verify after committing on a shared tree:** `git merge-base --is-ancestor <yoursha> HEAD` (orphan check) AND `git diff HEAD -- <files>` (did it actually land / get swept elsewhere?).

Pairs with [[feedback_conflict_fork_rule]], [[reference_slot_worktree_activation_2026_05_16]]. The MCP boot-guard foundation (decideRestart + port-lock helpers, 54/54 tests, 2-reviewer PASS) is the change that landed via this sweep; durable anchor tag `golf/mcp-boot-guard-core` → ae8da465d2 (the orphan, which additionally carried the swept .gitignore — re-land cleanly from working tree, not that tag).
