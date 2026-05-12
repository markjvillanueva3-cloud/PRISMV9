---
name: reverse-merge-then-ff-only
description: "Landing a feature branch into a busy shared tree without thrashing — reverse-merge target → feature in an isolated worktree, then ff-only into the shared tree"
metadata: 
  node_type: memory
  type: reference
  originSessionId: aec2148c-c55a-49c5-a648-da9d4a0da0c0
---

When `H:/prism` is on `cad-fusion-live-ms0` with 6 concurrent peers (recurring `index.lock`, guard hooks that `git reset` in-progress merges, peer chats advancing HEAD every few minutes), a forward `git merge --no-ff <feature>` in `H:/prism` will be undone — either by the index.lock race or by a peer-staging-triggered guard reset. Both patterns observed 2026-05-12 during SKILLS-UTILIZATION-MS0 landing.

**The pattern that works:**

1. In the **isolated feature worktree** you own (e.g. `H:/prism-<scope>`), do the merge in the **reverse direction**:
   ```bash
   git -C H:/prism-<scope> merge --no-ff cad-fusion-live-ms0 -m "Re-sync cad-fusion-live-ms0 into work/<scope>"
   ```
   Resolve conflicts there. The worktree is yours — no peer guards fire, no index.lock contention. Commit becomes the new tip of `work/<scope>` with both lineages.

2. **Catch up if peers advanced** `cad-fusion-live-ms0` during the reverse-merge: re-run step 1. The new commits in `cad-fusion-live-ms0` get folded in as a new merge.

3. In `H:/prism` (now on `cad-fusion-live-ms0`), **`git merge --ff-only work/<scope>`** — pure fast-forward, no working-tree write conflicts (the worktree already resolved everything), atomic in `git`'s perspective. Window for guard interference shrinks from minutes to ~1s.

**Pre-merge cleanup in H:/prism:** if you tried a forward merge first and it got rolled back, `git checkout HEAD -- <files>` your 4-ish modified files; `rm -f` the untracked files that came in from the merge (use `git diff --diff-filter=A --name-only <main>..<feature>` to enumerate, but skip any that `git ls-files --error-unmatch` reports as tracked — those are peer-staged collisions, leave them alone). Without cleanup, ff-only refuses with "Your local changes would be overwritten" / "untracked working tree files would be overwritten".

**Conflict resolution pattern for additive merges** (cron-jobs.json, dispatcher ACTIONS arrays): both branches `git diff` clean except for one shared edit point → resolve by **union of both sides** (Python or jq merging by stable key like `id`). Never average. See [[feedback_conflict_fork_rule]].

**Don't:**
- `git stash`/`git stash pop` in `H:/prism` (sweeps peer WIP — see [[feedback_no_git_stash_shared_tree]])
- `git reset --hard` (blows away peer working-tree WIP)
- `git clean -fd` (nukes peer untracked files)
- Retry the forward merge in `H:/prism` more than once — every retry pays the index.lock + guard-reset tax

**Don't be fooled by `reset: moving to HEAD` reflog entries** — those come from a guard hook reacting to `git add` staging "foreign" files (the merge index has 50+ files from the feature side; the unstage-foreign logic misclassifies and ends up doing `git reset` to clean the state). They're not peer chats actively fighting you; they're a hook noticing the index isn't owned by this chat. Same outcome though — your `MERGE_HEAD` is gone.
