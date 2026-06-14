---
title: git-bloat-from-lint-staged-cascade
category: lessons
last_verified: 2026-05-10
author: claude-99eca613
related:
  - feedback_lint_staged_cascade
  - feedback_conflict_fork_rule
domain: backend-dev
---

# Git Bloat from lint-staged Cascade

## TL;DR

When `lint-staged` runs `tsc --noEmit` on `*.ts`, **tsc loads `tsconfig.json`'s `include` patterns regardless of whether files were passed as args** — so it checks the whole tree, not just staged files. Failing on any peer-chat WIP error blocks every commit. Each failed commit by `husky/lint-staged` adds ~7,000 loose blobs to `.git/objects/` because the tool stashes the entire working tree first. With 6 concurrent chats, this hits ~196,000 loose objects within hours and hangs every git operation that enumerates objects.

## Symptoms

- `git count-objects -v` hangs past 20 s (normal: instant)
- `du -sh .git` hangs past 90 s
- `git fsck` flooded with `error: HEAD: invalid reflog entry <sha>`
- `git stash list` shows ≥10 entries with message `lint-staged automatic backup`
- Multiple chats freeze for 1–1.5 min on git tool calls
- `git status` and `git rev-parse HEAD` are still fast (refs themselves are healthy)

## Why tsc misbehaves with file args

```jsonc
// mcp-server/package.json — the broken config that triggered this
"lint-staged": {
  "*.ts": ["sh -c 'npx tsc --noEmit --pretty ... $@' --"]
}
```

tsc on the command line: passing file args **silences `files`/`include` for the *files* tsc emits**, but not for the type-check graph. Imports from a staged file pull in the rest of `src/**/*.ts` via tsconfig's `include`. With 6 chats writing partially-typed engines simultaneously, the type graph almost always has at least one error somewhere unrelated to the staged change.

## Cascade per commit

```
chat A commits → husky pre-commit → npx lint-staged
              → backs up 7,090-file working tree (every chat's WIP)
              → +7,000 loose blobs in .git/objects/
              → tsc fails on peer-chat WIP error in src/engines/ChatB-WIP.ts
              → lint-staged restores from stash (blobs stay live)
              → stash entry stays in stash list (ref-protects the blobs)
              → next gc can't reclaim — list grows
```

## Recovery procedure (verified 2026-05-10)

```bash
# 1. drop accumulated lint-staged backup stashes (reverse-index order)
git stash list | grep 'lint-staged automatic backup' | awk -F'[{}]' '{print $2}' | sort -rn > /tmp/idx.txt
for idx in $(cat /tmp/idx.txt); do git stash drop "stash@{$idx}"; done

# 2. expire dead reflog entries (fast — they're often the source of fsck noise)
git reflog expire --expire-unreachable=now --all
git reflog expire --expire=30.days.ago --all

# 3. consolidate loose objects (slow — 5-15 min on large repos)
git gc --prune=now
# If it errors with "bad tree object <sha>" or "Could not read <sha>":
# - check git merge-base --is-ancestor <sha> for each branch ref
# - if no branch references it, the corruption is in dead reflog only — safe to ignore for now
# - full corruption sweep needs a maintenance window with no concurrent chats:
#     git repack -a -d --window=250 --depth=50 -k

# 4. patch the broken config so the cascade can't restart
# Option A (cleanest, requires npm install): tsc-files only checks staged files
#   npm i -D tsc-files
#   "*.ts": ["tsc-files --noEmit --pretty --skipLibCheck"]
# Option B (no npm change): neutralize the matcher
#   "*.never-matches-anything-xyz": ["true"]
```

## Diagnostic measurements (this incident)

| Metric | Before | After |
|---|---|---|
| Loose objects | ~196,000 | ~4,200 |
| Pack count | 55 | 55 (gc partial — corruption blocked full repack) |
| `git count-objects -v` | hangs past 20 s | 10 s |
| `git status --porcelain` | varied | 0.295 s |
| Active stashes | 33 | 6 |
| Lint-staged backup stashes | 27 | 0 |

## Anti-patterns to flag in code review

- Any `lint-staged.*.ts` entry that calls `tsc` without `tsc-files` or equivalent file-scoping
- Any pre-commit hook that runs full-project lint/type-check on a multi-chat repo
- Any husky config that triggers a full working-tree stash on commit (bumps loose-object count)
- Adding `*.ts` lint-staged matcher without testing in a 5+ unrelated-WIP scenario

## See also

- `feedback_lint_staged_cascade` — actionable rule
- `feedback_conflict_fork_rule` — companion lesson on multi-chat git hostility
- `52fa17253` — the commit that disabled the cascade
