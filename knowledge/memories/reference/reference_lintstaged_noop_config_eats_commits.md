---
name: reference-lintstaged-noop-config-eats-commits
description: The fake lint-staged no-op config silently drops markdown-only / non-matching staged files — causes intermittent EMPTY commits fleet-wide
aliases: reference_lintstaged_noop_config_eats_commits
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.199Z
---


# lint-staged fake no-op config silently eats commits

**Discovered 2026-05-14** (slot charlie, claude-2081f435) while landing a markdown audit report — it took **3 commit attempts**; the first two (`979afafc2`, `902086553`) landed **completely empty** despite `git diff --cached --stat` showing the file staged with 164 insertions.

## Root cause

`H:/prism/.lintstagedrc.json` contains:

```json
{ "*.never-matches-anything-xyz": ["true"] }
```

This is a **fake no-op config** — someone created it so the husky pre-commit gate (`U-HUSKY-PRECOMMIT-HARDEN`, 2026-05-10) would pass. That gate runs `npx lint-staged` **only if a config file is present**. The hardening was meant to stop the unconfigured-lint-staged crash. But adding a config with a glob that matches *nothing* re-introduced a *different* failure: when `lint-staged` runs and **no staged file matches any task glob**, its partial-stage stash/restore cycle **drops the staged files that didn't match**. The commit then lands empty.

This is the **FIX1/FIX2 stash-leakage class** the `WORKTREE-CONSOLIDATE-MS0` envelope explicitly flagged — the envelope even warned *"Adding real rules now would re-introduce the very class WORKTREE-CONSOLIDATE-MS0 targeted."* The fake no-op config IS that re-introduction.

## Why it's intermittent

Multi-file commits that include `.ts`/`.mjs` files survive (those don't match the fake glob either, but the timing of lint-staged's stash dance differs when *some* vs *zero* files are processed). **Markdown-only / config-only / doc-only commits are the reliable victims** — the entire staged set fails to match, hits the no-match drop path, commit lands empty. `e460e9326` (7 files incl. .mjs) landed fine; `979afafc2` (1 .md file) landed empty.

## Symptom signature

- `git diff --cached --stat` shows files staged
- `git commit` reports success with a SHA
- `git show --stat <sha>` shows **zero files** — only the commit message landed
- The file is still `??` untracked on disk
- husky output line: `lint-staged could not find any staged files matching configured tasks`

## Workaround (used 2026-05-14)

`git commit --no-verify` — justified for **pure-markdown / doc-only commits** (the bypassed `lint-staged` + `cam-phase5-impl-gate` have nothing legitimate to check on a `.md`). Do NOT use `--no-verify` for code commits — the gates are real there.

## Proper fix (NOT yet done — logged as a SLOT-WORKTREE-MS0 Phase-1 candidate)

Pick one:
1. **Delete `.lintstagedrc.json`** — the husky gate already skips lint-staged when no config exists (the 2026-05-10 hardening). This is the cleanest: lint-staged becomes a true no-op.
2. **Add a real catch-all no-op task**: `{ "*": [] }` or `{ "*": "true" }` so every staged file matches a (do-nothing) task and the no-match drop path is never hit.
3. **Husky-level doc-only detection**: skip `npx lint-staged` when the staged set is markdown/json/md-only.

Option 1 is preferred — it's the smallest change and restores the documented "no-op if not configured" semantics.

## Companion memories

- [[reference_git_history_strip_recipe]] — sister git-hygiene reference
- [[feedback_conflict_fork_rule]] — the other shared-tree commit hazard
- The `WORKTREE-CONSOLIDATE-MS0` envelope (`mcp-server/data/milestones/WORKTREE-CONSOLIDATE-MS0.json`) §description flagged the FIX1/FIX2 stash-leakage class this bug belongs to.

## Verify

```bash
cat H:/prism/.lintstagedrc.json
# → { "*.never-matches-anything-xyz": ["true"] }   ← the smoking gun

git show --stat 979afafc2   # → empty (message only)
git show --stat 902086553   # → empty (message only)
git show --stat 2707a9aca   # → 164 insertions (the --no-verify rescue)
```
