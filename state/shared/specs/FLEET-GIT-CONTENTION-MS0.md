# FLEET-GIT-CONTENTION-MS0 — eliminate cross-chat git collisions

**Authored:** 2026-06-03 · slot:alpha (token-optimization/efficiency lane) · operator-directed
**Problem owner:** alpha (mutex) + golf (worktree adoption, fleet-hygiene) + golf (churn quarantine)

## Root cause (single)
All ~26 NATO chats share ONE git working tree + ONE index + ONE `HEAD` ref
(`H:/prism` @ `cad-fusion-live-ms0`). Git is not built for N concurrent committers
in one directory. Every observed cross-chat failure is a symptom:

| Symptom | Observed this session |
|---|---|
| `cannot lock ref 'HEAD'` ref-race | HEAD moved 4× during one alpha commit |
| `index.lock` contention / aborted commits | repeated 255 exits |
| foreign staged files swept into a commit | 16 CIMCO files in alpha's index |
| whitespace/EOL absorption via `git add` | schema 902-line + offloader 1210-line phantom diffs |
| `[BOOTSTRAP-SLOT-ENFORCE]` bypass is the disease | every recent commit uses it to route back onto the shared tree |

Two archetypes fix the root: **isolate** the sharing (per-chat tree/HEAD) or
**serialize** it (one commit at a time). This milestone does both, sequenced by
leverage-vs-effort so chats get relief immediately while the structural fix lands.

## Sequenced units

### U-FGC-1 — Fleet commit-mutex (IMMEDIATE relief) · owner: alpha
A cross-process advisory lock every slot acquires before committing to the shared
tree, with ref-race auto-retry + a foreign-staged-file guard.
- Helper `.claude/helpers/git-commit-mutex.mjs`: `withCommitLock(fn, opts)` +
  CLI `commit -- <git args>`.
- Lock at `.git/prism-commit.lock` (untracked, local). Atomic O_EXCL create;
  stale reclaim on dead-PID OR age > timeout; bounded acquire-wait.
- Wraps `git commit`: on `cannot lock ref` retry up to N (re-parent); on a real
  error, surface (no blind retry).
- Foreign-staged guard: refuse if the index holds files outside the caller's
  pathspec (prevents peer-absorption) — nudge to `git commit <pathspec>`.
- Tests: concurrent-acquire race, stale reclaim, ref-race retry, foreign guard.
- Adoption: document now; wire into the PreToolUse commit-routing hook in a
  follow-up so raw `git commit` is transparently serialized (zero chat change).
- **Acceptance:** two simulated concurrent committers never both hold the lock;
  a ref-race retry succeeds; foreign-staged commit is refused.

### U-FGC-2 — Quarantine generated-file churn (shrinks blast radius) · owner: golf
48K untracked + 5.9K auto-gen modified files inflate `git status`/`add` and are the
absorption surface. Gitignore/quarantine the regenerated noise (state dashboards,
caches, viz graph, tmp orphans) so `git add -A` and status are sane.
- **Acceptance:** `git status --porcelain | wc -l` drops by >90%; no auto-gen file
  reappears as "modified" after a clean SessionStart regen.

### U-FGC-3 — Finish slot-worktree adoption (STRUCTURAL, eliminates root) · owner: golf + fleet
Make each chat default to `H:/prism-slot-<nato>` (own branch + HEAD = zero
contention). Fix `/checkin` Step-2c cutover so it actually migrates; tighten
`[BOOTSTRAP-SLOT-ENFORCE]` to genuinely-rare + audited (it is currently the default
path). golf integrates slot branches → `cad-fusion-live-ms0`.
- **Acceptance:** >80% of a day's commits land from `slot/*` branches, not the
  shared tree; `[BOOTSTRAP-SLOT-ENFORCE]` usage drops to <10% of commits.

## Composition
U-FGC-1 gives relief TODAY without migration. U-FGC-2 makes the tree clean.
U-FGC-3 removes the sharing entirely; once adopted, the mutex becomes a safety net
for the residual shared-tree commits (golf integrator merges). Build order:
1 → (2 ∥ 3). U-FGC-1 dogfoods itself (lands its own commit through the mutex).
