---
name: reference_alpha_brain_refresh_ms0_2026_05_30
description: BRAIN-REFRESH-MS0 — one orchestrator (brain-refresh.mjs) fanning out to the 5 unwired brain refresh pipelines; O_EXCL single-writer lock, 56 tests
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.012Z
aliases: reference_alpha_brain_refresh_ms0_2026_05_30
---


The first BUILD off the 2026-05-30 brain-upgrade sweep ([[reference_alpha_amp_consume_synthesis_line_2026_05_30]]
sibling; full inventory at `state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.md`). The sweep's
headline meta-finding: the brain's #1 weakness is **UNWIRED REFRESH PIPELINES** — 5 built+tested
refresh stacks (memory BM25 index, dense embeddings, AMP2 galaxy synthesis, wiki→tribal embed,
system-viz regen) all needed a human to run them, so each silently rotted.

**What shipped:** `scripts/brain-refresh.mjs` — fans out SEQUENTIALLY + dependency-ordered to all 5,
from one throttled, health-gated, lock-serialized entry. Plus `scripts/install-brain-refresh-task.ps1`
(scheduled-task floor, `--with-viz`) and a Stop-hook patch-sibling (DETACHED spawn, light steps).
Commit `[OBSIDIAN-BRAIN]/BRAIN-REFRESH-MS0`. 56 node:test.

**The load-bearing correctness piece:** the steps write SHARED sidecars → two concurrent runs corrupt
them. Defended by throttle stamp + **O_EXCL global lock** + strictly-sequential execution. The lock's
stale-reclaim is **atomic rename-aside, NOT unlink+recreate** (I caught the unlink+recreate TOCTOU
race in my own code before scrutiny: two processes both see stale, both unlink, one clobbers the
other's fresh lock → invariant broken). Rename: only one racer wins, loser defers.

**Two scrutiny P1s fixed (both reviewers PASS):**
1. **regen-viz benignExits** — exit 4 (a peer fleet chat holds the system-graph write-lock — ROUTINE
   under concurrency) and exit 3 (merge-no-op) were mis-classified as `failed`. Generalized `exit3`
   into a per-step `benignExits` map: AMP2 `{3:deferred}`, regen-viz `{4:skipped-locked,3:deferred}`.
2. **lock had ZERO test coverage** — the orchestrate oracle injected a fake `acquireLock`, so the
   actual O_EXCL + rename-aside reclaim was untested (the same "main-seam untested / hermetic fakes
   don't prove wiring" class that let the entry-point bug ship). Fixed: parameterized
   `acquireLockAt`/`releaseLockAt`/`pidAlive` (exported) + a real-fs tmpdir oracle (clean acquire,
   live-holder-defers, dead-PID reclaim, TTL-expiry reclaim, garbage-lock-refuse, release-only-own).

**Recurring lessons reinforced:** (1) the **live --dry-run smoke caught a Windows entry-point bug** the
56 unit tests missed — `isMain` via `path.resolve(new URL(import.meta.url).pathname)` yields
`/H:/...` (leading slash) → false → `main()` silently never runs → exit 0, no output. Fix:
`import.meta.url === pathToFileURL(process.argv[1]).href`. ALWAYS run the real CLI, never trust green
units alone (R12). (2) per-file scrutiny's 2 reviewers found a real misclassification bug + the
untested-lock gap that I'd otherwise have shipped. (3) AMP2's internal cascade redoing mem-index/embed
is wasteful-but-safe (idempotent `--resume`) — sequential ordering makes overlap a non-issue.

P2 follow-ups (logged, not blocking): mid-run Ollama-flap → mem-embed/wiki-tribal exit 1 (not 3)
mis-read as failed; wiki-tribal exit 2 = prereq-missing; child stderr discarded on failure. Wiki:
[[brain-refresh-ms0]].
