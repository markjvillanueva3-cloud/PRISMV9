---
type: feedback
name: feedback_lint_staged_cascade
description: lint-staged tsc cascade caused ~196k loose objects in .git/, hanging all 6 chats. Diagnosed + fixed 2026-05-10.
---

# lint-staged tsc cascade — 6-chat hang root cause

**Rule:** When configuring `lint-staged` to run `tsc --noEmit`, never let tsc see the project's `tsconfig.json`. tsc loads `include` regardless of whether file args were passed, so it lint-checks the whole tree on every commit. In a multi-chat repo with 6 concurrent chats touching shared peer code, this cascades into a `.git/objects/` storm that hangs all chats.

**Why:** Encountered 2026-05-10. Six concurrent Claude chats accumulated **~196,000 loose objects** in `.git/objects/` (normal repo: a few hundred to ~10k). Symptom: `git count-objects -v` and `du -sh .git` both hang past 90 s. `git status` returns fast (cached) but `git fsck`, `git stash list` with full info, and any commit-time stash storms freeze for 1–1.5 min — visible to user as "chat just stopped responding."

The cascade was triggered every commit attempt:

1. `husky` pre-commit fires `npx lint-staged`
2. `lint-staged` backs up the working tree (we had **7,090 dirty files** across 6 chats) — adds **~7,000 new loose blobs** to `.git/objects/`
3. lint-staged runs `tsc --noEmit ...` on `*.ts` matched files. tsc loads tsconfig.json's `include: ["src/**/*.ts"]` and lint-checks the whole tree, failing on peer-chat WIP errors (e.g. `OutcomePublishAdapterEngine.test.ts` had unstable types from claude-845cf238's in-progress work)
4. lint-staged restores from stash. Original blobs stay live (still referenced by stash). Stash entry persists.
5. After 30+ commits across 6 chats: ~196k loose objects, ~33 stashes (27 of them `lint-staged automatic backup`). `git` internals hang.

**How to apply:**

- **Detect early:** when `git count-objects -v` takes >5 s or `git stash list` shows >10 entries with the same `lint-staged automatic backup` message, the cascade is live. Recovery needed before next commit storm.
- **Patch:** drop the broken matcher entirely (we used `"*.never-matches-anything-xyz": ["true"]`) until either:
  - `tsc-files` is installed (`npm i -D tsc-files`) and the matcher swapped to `"*.ts": ["tsc-files --noEmit --pretty --skipLibCheck"]` — `tsc-files` actually limits scope to staged file set
  - or the whole pre-commit type check is moved to CI and removed from local hooks
- **Recover from existing bloat:**
  1. `git stash list | grep "lint-staged automatic backup"` → drop them all in reverse-index order
  2. `git reflog expire --expire-unreachable=now --all` (fast — clears dead pointers)
  3. `git gc --prune=now` (slow — 5–15 min on large repos; may hit corrupt objects in dead reflog history; partial success still helps)
  4. If gc hits `bad tree object <sha>`, find the ref via `git for-each-ref` + `git merge-base --is-ancestor`. Most are in dead reflogs (no active branch references) — safe to leave.
- **Prevent regression:** any change to `lint-staged` config that adds `tsc` should be code-reviewed for the tsconfig-include trap. Comment in the config noting why the matcher is neutralized.

**Verified at this commit chain:**
- `52fa17253` — `[CAD-FUSION-LIVE-MS0]/U-LINT-STAGED-DISABLE-TSC` neutralized the matcher
- After fix: object enumeration 10 s (was hanging past 20 s), loose count ~4,200 (was ~196,000)
- 16,511 prune-packable objects + 2 corrupt unreachable trees remain — needs maintenance window with no concurrent chats to fully resolve via `git repack -a -d --window=250 --depth=50`
