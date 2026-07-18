---
name: feedback-commit-prefix-main-on-shared-tree
description: "On the shared H:/prism tree, prefix commit subjects [MAIN] — a [<slot>] scope is blocked by worktree-commit-route AND unstages the files"
aliases: feedback_commit_prefix_main_on_shared_tree
type: feedback
source: prism-memory
synced: 2026-06-18T04:19:52.023Z
---


When committing on the shared `H:/prism` tree (branch `cad-fusion-live-ms0`, not a `slot/<name>` worktree), the commit subject MUST be prefixed `[MAIN]`. A `[<slot>]`-scoped subject (e.g. `[DELTA]`) is blocked by the `worktree-commit-route` pre-commit hook whenever a matching `H:/prism-slot-<name>` worktree exists — and the blocked `git commit -- <pathspec>` leaves the files **UNSTAGED** (status flips to ` M` / `??`).

**Why:** observed 2026-05-19 — `git add A B C D && git commit -m "[DELTA] ..." -- A B C D` ran; the hook blocked it (scope `[delta]` matched the `H:/prism-slot-delta` worktree); the retry then failed with `pathspec ... did not match any file(s) known to git` because the partial-commit abort left the index without the staged paths. Recent git-log commits all use `[MAIN] [SCOPE]/...` — that is the convention on this tree.

**How to apply:**
1. On `H:/prism` (shared main tree), prefix every commit subject `[MAIN]`. Use a `[<slot>]` scope ONLY when actually committing inside that slot's worktree (`H:/prism-slot-<name>`).
2. After ANY blocked/aborted commit, re-run `git status` and re-`git add` before retrying — never assume the prior `git add` survived the abort.
3. The hook offers its own override in the block message ("prefix the commit subject with [MAIN]") — trust it.

Related: [[reference-slot-reclaim-2026-05-19]] · [[feedback_conflict_fork_rule]].
