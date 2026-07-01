---
type: "chat-session"
source: "claude-code-cli"
session_id: "80d35610-4a16-481b-b67b-df0e2cf8ebe8"
title: "Review H:/prism/scripts/classify-git-tree.mjs end-to-end as a content-specialist"
date: "2026-05-14"
first_ts: "2026-05-14T00:53:43.347Z"
last_ts: "2026-05-14T00:54:09.597Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/80d35610-4a16-481b-b67b-df0e2cf8ebe8/subagents/agent-a304acffdcf467df1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review H:/prism/scripts/classify-git-tree.mjs end-to-end as a content-specialist

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/80d35610-4a16-481b-b67b-df0e2cf8ebe8/subagents/agent-a304acffdcf467df1.jsonl`

## Transcript

### User | 2026-05-14T00:53:43.347Z

Review H:/prism/scripts/classify-git-tree.mjs end-to-end as a content-specialist code-analyzer.

Context: This is a brand-new read-only audit script. It classifies all git worktrees + local branches into recommendation classes (KEEP / REMOVE_WORKTREE / PRUNE_CORRUPT / ARCHIVE_TAG_AND_DELETE / NEEDS_REVIEW) and emits state/shared/GIT-TREE-PUNCHLIST.{json,md}. The operator runs the destructive commands manually after reviewing the .md.

I ran it in the live H:/prism repo and got: 51 worktrees → 35 KEEP / 12 NEEDS_REVIEW / 3 REMOVE_WORKTREE / 1 PRUNE_CORRUPT. 119 branches → 83 KEEP (none old enough for archive). Then I executed the 4 cleanly-recommended removes and the worktree count went to 47 — the script's recommendations matched git reality.

What I want you to verify (PASS/FAIL):
1. The classification logic correctly identifies a "safe to remove worktree" — branch ref exists AND is merged into cad-fusion-live-ms0 OR origin/main AND the worktree directory is clean (zero uncommitted files). Any way this could classify a worktree REMOVE_WORKTREE when it still holds unmerged work?
2. The is-ancestor check (git merge-base --is-ancestor) — is that the right primitive for "branch X is merged into branch Y"? Could it false-positive when X is a recently-deleted branch that happens to share an ancestor with Y?
3. The `worktreeBranches` Set built from `worktrees.map(w => w.branch)` — branches like `refs/heads/work/foo` get compared against `for-each-ref --format=%(refname:short)` output which strips the `refs/heads/` prefix. Are those keys compatible? Could a branch in a worktree be classified as "not in worktree" and then ARCHIVE_TAG_AND_DELETE'd?
4. The corrupt-detection regex `/^0+$/` on the HEAD field — does it correctly catch the all-zero SHA case and only that case?
5. Magic-number / convention check: ARCHIVE_DAYS=90 reasonable? Any branches stale near the boundary that should be flagged on the next run?
6. Error-handling around git invocations — script throws if `git 
... [+215 chars truncated]

### Assistant | 2026-05-14T00:53:48.044Z

I'll review the script end-to-end.

### Assistant | 2026-05-14T00:53:48.378Z

[tool_use: Read]

### User | 2026-05-14T00:53:49.181Z

[tool_result] 1	#!/usr/bin/env node
2	// classify-git-tree.mjs — classify all worktrees + branches with a recommended action.
3	// Read-only. Emits state/shared/GIT-TREE-PUNCHLIST.json + .md.
4	// Usage:
5	//   node scripts/classify-git-tree.mjs [--repo H:/prism] [--out state/shared/GIT-TREE-PUNCHLIST]
6	//
7	// Classification rules:
8	//   worktrees:
9	//     - HEAD == 000000000... → PRUNE_CORRUPT (git worktre
... [+14083 chars truncated]

### Assistant | 2026-05-14T00:54:09.597Z

## Code Quality Analysis Report

**Verdict: PASS with P1 + P2 findings**

### 1. REMOVE_WORKTREE safety — PASS with P1 caveat
The merged+clean logic at L187–195 is sound: requires `mergedIntoPrimary || mergedIntoSecondary` AND `result.dirty === false`. **P1 gap**: `worktreeDirty()` only checks `git status --porcelain` — this catches working-tree + index changes but **not unpushed local commits** ahead of the base. If branch X is merged into base via squash/rebase but has additional unpushed commits past the merge point, `is-ancestor` returns false (so this path won't fire), so the gap is theoretical. However, **stashed changes are invisible** to `--porcelain` — a worktree with stashed WIP would be classified as clean+REMOVE. P1 because `git worktree remove` itself blocks on local stashes, providing a backstop.

### 2. `merge-base --is-ancestor` — PASS
Correct primitive. It tests "is commit X reachable from Y" — by definition, if X's tip is reachable from Y, then Y contains all of X's history. No false-positive from deleted branches because `isMergedInto` calls `branchExists` first (L80) and a deleted branch fails `rev-parse --verify`. Squash-merges return false (correctly conservative — leaves them as KEEP/NEEDS_REVIEW rather than auto-removing).

### 3. Branch-key prefix mismatch — **P0 BLOCKER**
`worktrees.map(w => w.branch)` emits `refs/heads/work/foo` (porcelain format, L66) but `for-each-ref --format=%(refname:short)` emits `work/foo` (L106). The `Set.has(b.name)` check at L213 will always return false for any branch in a worktree, so the `inWorktree` gate at L220–223 is dead code. The branch falls through to L232's merge check, and if merged + >90d, it gets **ARCHIVE_TAG_AND_DELETE** — but that branch is actively checked out in a worktree. Your live run didn't trip it only because no branches were old enough (`83 KEEP, none old enough for archive`). **Fix**: `new Set(worktrees.map(w => w.branch?.replace(/^refs\/heads\//, "")).filter(Boolean))`.

### 4. Zero-SH
... [+1005 chars truncated]
