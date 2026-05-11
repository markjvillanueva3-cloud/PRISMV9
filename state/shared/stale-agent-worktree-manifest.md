# Stale Agent Worktree Manifest — 2026-05-10

Inventory of leaked `Agent({isolation: "worktree"})` worktrees discovered during harness audit. All 10 are at the same orphan commit `4bdfcc902`, all were locked at the time of audit, none have meaningful committed work.

**Per the never-delete-only-disable rule** (memory: `feedback_never_delete_only_disable.md`), this audit:
- ✅ Unlocks each worktree (reversible)
- ❌ Does NOT remove worktree directories (preserves files)
- ❌ Does NOT prune `.git/worktrees/<name>/` metadata (preserves recoverability)

Files in each worktree:
- ~17,506 "deletions" relative to HEAD = sparse-checkout artifacts (files were never materialized)
- 32 untracked = scratch files created by the agent runs
- Working tree size on disk: 28 top-level entries per worktree (small)

## Worktrees (head=4bdfcc902, all unlocked 2026-05-10)

| Worktree | Untracked files |
|----------|-----------------|
| agent-a2dbbde37acb31853 | 32 |
| agent-a380ee37b24d7d896 | 32 |
| agent-a4a5be90641098c78 | 32 |
| agent-a4c52aa39ad6d485c | 1 |
| agent-a4e321fdc0ec2e9fc | 32 |
| agent-a724972470c649d3f | 0 |
| agent-aa75d734f41d2dcdf | 32 |
| agent-aabfea707213c4900 | 32 |
| agent-abe382a71c1ff13e9 | 32 |
| agent-af27fc4e051bb7e40 | 32 |

## Recovery procedure

If you ever need to reuse one of these:
```bash
git -C H:/PRISM/.claude/worktrees/agent-<id> status
# Inspect the 32 scratch files for any meaningful work
# If you want to lock it again to prevent reuse:
git worktree lock H:/PRISM/.claude/worktrees/agent-<id>
```

## Why preserve them

These worktrees were created by the `Agent({isolation: "worktree"})` feature for parallel agent runs. Their existence proves the agent feature ran. If a future audit needs to trace "which agents ran on 2026-05-09", these are the disk evidence. Removing them would erase that history.

## Future prevention

Tier 3 fix #7 of the harness audit: add a SubagentEnd hook that calls `git worktree unlock + prune` for the specific worktree the agent used. That stops new leaks. Existing 10 stay as-is.
