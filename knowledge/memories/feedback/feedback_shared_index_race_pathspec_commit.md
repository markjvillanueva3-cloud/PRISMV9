---
name: feedback_shared_index_race_pathspec_commit
description: On the shared H:/prism tree under fleet contention, `git add <file> && git commit` absorbs a peer's concurrently-staged changes into YOUR commit — use path-scoped `git commit <pathspec>` to commit only your file
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.444Z
aliases: feedback_shared_index_race_pathspec_commit
---


On the shared `H:/prism` working tree (NOT a slot worktree), `git commit` commits **whatever is in the shared index**, so a peer's `git add` that lands between YOUR `git add <file>` and YOUR `git commit` gets swept into your commit. This is the same "absorbed into peer commits" hazard [[feedback_commit_to_slot_worktree]] warns about — but here it silently **mutated another slot's files** inside my commit.

**Why:** 2026-06-04 (slot juliett, branch cad-fusion-live-ms0). I ran `rtk git add state/shared/db-census/DB-GAP-LIST.md` then `rtk git commit -m …`. The commit reported "2 files changed, 5 insertions(+), 96 deletions(-)" — the 96 deletions were sierra's concurrently-staged DELETION of `scripts/build-card-offset-index.test.mjs` (93 lines), which I never touched. My commit `352861d357` de-tracked sierra's test file (it stayed intact on disk, only removed from git), leaving sierra's HEAD `.mjs` script (`1cb4b44fb`) testless — a broken half-state I created. Repaired via path-scoped re-track `2c0d53f1b7`.

**How to apply:**
1. **Prefer a slot worktree** (`H:/prism-slot-<nato>` on `slot/<nato>`) — the routing hooks isolate your index. This is the canonical fix.
2. **Stuck on the shared tree?** Commit path-scoped: `git commit <pathspec> -m "…"` commits ONLY that path's working-tree content, ignoring everything else staged in the shared index — immune to absorbing peer-staged changes. (For an UNtracked file you still need `git add <path>` first, but the `git commit <path>` form then limits the commit to that path.)
3. **Always verify what landed** (R12, juliett's "never claim a write succeeded blindly"): `git show --stat HEAD` (or the SHA) — an unexpected file or a deletion count that doesn't match your edit means you absorbed a peer. Check `git diff --cached --name-only | grep -qx "<yourfile>"` BEFORE committing to confirm your add actually landed (index.lock contention can make `git add` fail silently).
4. The `git-add-lane-guard` / file-claim guard auto-unstages peer files at commit time — trust its "auto-unstaged all of them" message; it's protecting you from this exact bug. If it says "nothing left to commit," your own `git add` didn't land (lock race) — retry until your file is staged, then path-scoped commit.

Pairs with [[feedback_commit_to_slot_worktree]] + [[feedback_verify_actual_contract_not_proxy]] + R12. Fleet-wide: any slot committing on the shared `H:/prism` tree under multi-chat load is exposed.
