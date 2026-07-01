---
title: "chat-slots lock-release leaked 28,761 orphans (rename-as-delete antipattern)"
type: lesson
created: 2026-06-04
slot: golf
tags: [git-contention, chat-slots, lock, file-leak, FLEET-GIT-CONTENTION-MS0, regression]
commits: [50f598afcf, 3e39feeaaa]
---

# chat-slots lock-release leaked 28,761 orphan files

## Symptom
`git status --porcelain | wc -l` = **56,589** on the shared `H:/prism` tree. The single
biggest contributor: **28,761 untracked `state/shared/chat-slots.lock.released-<epochms>`
files** — 57% of the entire churn, growing by one file on every chat-slots lock release
fleet-wide (all 26 slots, every claim/heartbeat).

## Root cause
`.claude/helpers/chat-slots.mjs` `releaseLock()` did:
```js
writeFileSync(lockPath, "", { flag: "w" });
// Best-effort delete; if it fails, the next acquireLock will detect stale.
try { renameSync(lockPath, `${lockPath}.released-${Date.now()}`); } catch {}
```
The comment says **"delete"** but the code **renames** the lock aside to a timestamped
name that is never cleaned up. Classic **rename-as-delete antipattern**: it moves the file
out of the active path (so the next `acquireLock` wx-exclusive create succeeds) but leaks
the renamed copy forever. One orphan per release × months × 26 slots = 28,761.

## Fix (U-FGC-2)
`unlinkSync(lockPath)` primary (the documented intent), with the rename kept **only** as a
catch-fallback for the rare Windows case where unlink races a concurrent open handle:
```js
try { unlinkSync(lockPath); }
catch { try { renameSync(lockPath, `${lockPath}.released-${Date.now()}`); } catch {} }
```
Plus: swept the 28,761 existing orphans, `.gitignore` guards `state/shared/*.lock.released-*`
(the fallback path), and 2 regression tests (`chat-slots-release-no-orphan.test.mjs`) that go
RED if releaseLock reverts to rename-only (verified by reviewer B mutating it back).
Result: **git status 56,589 → 28,013 (-50.5%)**.

## Lesson
- **A comment that says "delete" + code that renames is a leak waiting to happen.** Renaming
  is not deletion; the renamed artifact must be swept or it accumulates unboundedly.
- On Windows, `unlinkSync` of a file the same process just wrote essentially always succeeds
  (no foreign open handle) — the rename "safety" was cargo-culted and unnecessary as the
  primary path.
- A fleet-shared primitive (lock used by all 26 slots) amplifies a per-call leak into a
  repo-dominating churn problem. Audit shared primitives for per-call side effects.

## Still open (NOT this fix)
>90% churn reduction (the U-FGC-2 acceptance) is NOT met by the lock fix alone. The residual
28,013 is dominated by ~16K **generated-but-content-like** `knowledge/wiki/architecture/`
pages (16,797 tracked vs 13,161 untracked — auto-generated per-action stubs). Whether to
track or ignore them is a genuine **cross-PC-divergence policy decision**, NOT blind noise,
and was correctly NOT auto-decided. See [[fleet-git-contention-ms0]].

Related: [[reference_shared_tree_commit_sweep_2026_06_02]] (same session re-hit the foreign-
staged-file absorption hazard — a peer's hermes files were swept into a golf commit and had
to be extracted with `git reset --soft` + `git restore --staged`).
