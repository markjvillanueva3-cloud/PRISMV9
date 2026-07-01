---
name: feedback_git_commit_only_race_proof
description: "On the thrashed shared cad-fusion-live-ms0 tree, `git add <files>` then `git commit` loses your staged files to concurrent peer `git add`/commit -> the commit-ownership-guard aborts with 'every staged file belonged to other sessions'. FIX: `git commit --only <paths> -F -` builds a temp index from HEAD + named paths AT commit time, ignoring whatever peers staged. Race-proof; does not disturb peers' staged work."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.428Z
aliases: feedback_git_commit_only_race_proof
---


# git commit --only is the race-proof commit on the thrashed shared tree

**Observed (slot:bravo, 2026-06-10):** committing 2 files to the shared `H:/prism` tree (branch `cad-fusion-live-ms0`) while ~4 peers (echo/india/alpha/golf) were committing concurrently. The normal `git add <files>` then `git commit` FAILED TWICE: the `commit-ownership-guard` pre-commit hook aborted with "every staged file (N) belonged to other sessions; auto-unstaged all of them -- nothing left to commit," listing PEER files. Between my `git add` and the commit, a peer's `git add`/`git reset`/commit had cleared my files from the shared index, leaving only the peer's staged files for the guard to see.

**Root cause:** there is ONE shared `.git/index` on the shared tree. `git add` then `git commit` is a two-step with a window; concurrent peers mutate the index in that window. A lock-wait loop on `.git/index.lock` does NOT help -- the lock is released between the two git invocations, so the race is on index *content*, not the lock.

**FIX (race-proof):**
```
git add <new-untracked-file>     # only needed for NEW files, so git knows them
git commit --only <path1> <path2> -F - <<'EOF'
...message...
EOF
```
`git commit --only <paths>` (-o) builds a TEMPORARY index from HEAD + the working-tree content of ONLY the named paths, AT commit time -- it disregards whatever is staged for other paths. So:
- The commit-ownership-guard sees ONLY your paths -> proceeds.
- Peers' staged files are left untouched in the real index (you don't steal/clobber their WIP).
- No add->commit window to lose.

**How to apply:** on the shared `cad-fusion-live-ms0` tree, ALWAYS commit with `git commit --only <explicit paths>` rather than `git add` + `git commit`. For a brand-new file, `git add` it first (so it is tracked), then name it in `--only`. This is strictly better than the stage-then-commit retry loop under contention.

Related: [[reference_shared_tree_absorption_2026_06_03]] (the absorption hazard this prevents), [[reference_shared_tree_commit_sweep_2026_06_02]] (concurrent-committer sweep), [[feedback_conflict_fork_rule]] (the heavier fix -- fork to a worktree -- when contention is persistent), [[feedback_commit_prefix_main_on_shared_tree]].
