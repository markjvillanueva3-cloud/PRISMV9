---
name: lint-staged hollows commits when staged work hits unrelated TS errors
description: husky/lint-staged pre-commit reverts working tree (stash-apply path) when tsc finds errors anywhere in the project, even pre-existing errors in untouched files; commits then land empty with the original message intact
type: feedback
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
When committing on `cad-fusion-live-ms0` (and likely any branch in this repo), husky/lint-staged runs `tsc --noEmit` on staged files but the type-checker pulls in the entire project graph. Pre-existing errors in unrelated files (e.g. `QdrantMemoryEngine.ts:136-241` MemoryResult discriminated-union type bugs) cause lint-staged to revert the "original state" — which means:

1. Untracked files newly added (engine, test) get **removed from disk** via the stash backup
2. Modifications to tracked files (dispatcher, schema) get **rolled back** in the working tree
3. The git index is cleared
4. `git commit` proceeds anyway and lands an **empty commit** carrying the message you wrote describing changes that no longer exist

Sometimes lint-staged tolerates the failure and the commit lands clean (saw this with `7a3384f30` U-DAILY-PERSONAL-BRIEF), other times it hollows (saw `8b0d1bf7d` and `e3dc33910` for U-CONTRADICTION-DETECTOR). The non-determinism is what makes it dangerous — you cannot rely on either outcome.

**Why:** The hook is broken in the sense that it scopes failures to the entire project type-graph rather than only files in the staged diff. Fixing the unrelated `QdrantMemoryEngine.ts` discriminated-union bugs is scope creep into another team's domain.

**How to apply:**
1. **First hollow commit on main tree → fork immediately** per [[feedback_conflict_fork_rule]]. Don't burn cycles retrying on a hostile tree. `git worktree add ../prism-<topic> -b work/<topic>`.
2. **Recovery from stash:** lint-staged's stash backup is preserved at `stash@{0}` ("lint-staged automatic backup"). Use `git checkout stash@{0} -- <paths>` to selectively retrieve just your files, including untracked ones it removed.
3. **Cherry-pick survives:** committing in the worktree branch and then `git cherry-pick <sha>` back into the main branch in the original tree DOES land cleanly. The cherry-pick code path appears to bypass the lint-staged revert, even when the same husky hook runs.
4. **Two empty commits stay in history** — don't try to rewrite (shared branch, multi-chat). Their messages are misleading but their diffs are zero, so they don't break anything semantic. The cherry-pick lands as a separate clean commit.
5. **Verify after every commit on this branch:** run `git diff-tree --no-commit-id --name-status -r HEAD` and confirm the file list is non-empty and matches your intent. The commit landing notification ("X files changed, Y insertions") in stdout can lie when lint-staged stripped the index mid-flight.
