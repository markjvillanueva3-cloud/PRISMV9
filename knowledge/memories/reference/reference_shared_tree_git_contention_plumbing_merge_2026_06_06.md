---
name: shared-tree-git-contention-plumbing-merge
description: On the shared cad-fusion-live-ms0 tree under live peers, git merge/commit/push die on index.lock contention + a 257K-file untracked walk; integrate via plumbing (commit-tree + CAS update-ref) and gitignore big corpora. Also a gc-corruption finding.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.935Z
aliases: reference_shared_tree_git_contention_plumbing_merge_2026_06_06
---


When golf (integrator) must advance the shared `cad-fusion-live-ms0` branch while peers actively commit to it, plain `git merge` fails repeatedly:
1. **index.lock contention** — a peer holds `.git/index.lock`, so merge/commit error "could not write index" / "another git process seems to be running".
2. **Slow working-tree walk** — git status/merge walked the un-ignored 257K-file `Docustrata/` OCR corpus. Measured 2026-06-06: full `git status` 300s+ (timeout) but `--untracked-files=no` was 0.287s -> the entire cost was the untracked walk, not the 5,943 tracked-modified.

**Fixes proven 2026-06-06 (slot:golf):**
- **gitignore big external corpora** (`Docustrata/`, `knowledge/wiki/.hook-cache/`, `extracted/`) -> git status 300s+ -> 3.2s fleet-wide. Takes effect uncommitted. Committed `1deb6ff521`.
- **Plumbing merge** when the resolution is `-s ours`-equivalent (merged tree == HEAD tree): `git commit-tree $(git rev-parse HEAD^{tree}) -p HEAD -p origin/<branch> -m ...` then `git update-ref refs/heads/<branch> <mergeSha> <oldHEAD>` (CAS). Touches only the ref lock (NOT index.lock), does ZERO working-tree scan, and the CAS retry handles peer races. Resolved a 2627-ahead/1-behind divergence in ONE attempt where `git merge` had died ~10x on lock/slowness. Conflict here was host-specific docker-compose comments only (this PC = RTX PRO 6000 Blackwell 96GB; other PC = RTX 4080 16GB) -> kept this machine's version.
- **Clear stale dead-PID locks** age-gated (>600s): `.git/index.lock`, `.git/index.stash.<pid>.lock`, `.git/next-index-<pid>.lock`, `.git/gc.pid`. The fleet git-lock-sweep hook clears `index.lock` but missed the stash/next-index/gc variants.

**Corruption finding (bug):** a `git gc`/repack firing during the dead-PID lock chaos left a **missing/corrupt tree object** (`e36809bbd2`, local-only — `git fetch --refetch origin` did NOT recover it, proving it is not in shared history). Symptoms: `git push` dies `fatal: bad tree object <sha>` mid-enumeration; `git cat-file -t <sha>` -> "could not get object info"; recent-40 commits + 9 depth-probes all ls-tree-intact (so it is pack-level or a probe-gap commit). Repair needs a full `git fsck --full` in a REAL terminal (agent background env kills fsck at ~280s) -> locate the broken link -> reconstruct subtree (`git mktree`+`git replace`) or excise via history rewrite (coordinate the fleet to re-sync). Prevention: do not let auto-gc run amid crashed-git PIDs; keep locks swept; the slot-worktree model exists precisely to avoid this shared-tree contention.

Related: [[feedback_commit_to_slot_worktree]] · [[feedback_golf_owns_reaper]] · [[feedback_verify_actual_contract_not_proxy]].
