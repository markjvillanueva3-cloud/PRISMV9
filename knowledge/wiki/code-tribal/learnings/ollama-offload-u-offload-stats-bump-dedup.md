# OLLAMA-OFFLOAD/U-OFFLOAD-STATS-BUMP-DEDUP — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-STATS-BUMP-DEDUP (slot:alpha): extract shared atomic-RMW offload-stats envelope (scripts/lib/offload-stats-bump.mjs: atomicOffloadStatsRMW/ensureOffloadBucket/clampSaved); migrate the 4 byte-identical writers recordUsage(ask-hermes)/recordTieredUsage/recordFileDigestOffload/recordLocalOffload to it. Behavior-preserving: 150 tests green (12 new + 21+20+28+69 unchanged), 2-arm scrutiny PASS (arm B empirically confirmed the test catches a write-before-mutate regression). Hook-side updateOffloadStats/bumpStats copies are decision/decay-gate-coupled -> separate follow-up, not byte-identical.

**Commit:** `7d6f3149906a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T14:43:15-05:00
**Tags:** ollama-offload, u-offload-stats-bump-dedup, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-STATS-BUMP-DEDUP (slot:alpha): extract shared atomic-RMW offload-stats envelope (scripts/lib/offload-stats-bump.mjs: atomicOffloadStatsRMW/ensureOffloadBucket/clampSaved); migrate the 4 byte-identical writers recordUsage(ask-hermes)/recordTieredUsage/recordFileDigestOffload/recordLocalOffload to it. Behavior-preserving: 150 tests green (12 new + 21+20+28+69 unchanged), 2-arm scrutiny PASS (arm B empirically confirmed the test catches a write-before-mutate regression). Hook-side updateOffloadStats/bumpStats copies are decision/decay-gate-coupled -> separate follow-up, not byte-identical.

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-STATS-BUMP-DEDUP (slot:alpha): extract shared atomic-RMW offload-stats envelope (scripts/lib/offload-stats-bump.mjs: atomicOffloadStatsRMW/ensureOffloadBucket/clampSaved); migrate the 4 byte-identical writers recordUsage(ask-hermes)/recordTieredUsage/recordFileDigestOffload/recordLocalOffload to it. Behavior-preserving: 150 tests green (12 new + 21+20+28+69 unchanged), 2-arm scrutiny PASS (arm B empirically confirmed the test catches a write-before-mutate regression). Hook-side updateOffloadStats/bumpStats copies are decision/decay-gate-coupled -> separate follow-up, not byte-identical.
```

## Files touched (7)
- scripts/ask-hermes.mjs                  |  22 ++++++----------------
- scripts/lib/offload-stats-bump.mjs      |  91 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/offload-stats-bump.test.mjs | 131 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/verified-offload-tiered.mjs |  26 ++++++--------------------
- scripts/ollama-file-digest.mjs          |  33 ++++++++++-----------------------
- scripts/ollama-offload.mjs              |  40 ++++++++++++++--------------------------
- 6 files changed, 258 insertions(+), 85 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7d6f3149906a`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._

---

## Reusable shared asset -- USE THIS, do NOT re-fork (enriched 2026-06-24, slot:alpha)

`scripts/lib/offload-stats-bump.mjs` is the ONE fail-safe atomic-RMW envelope for the canonical
offload-stats file (`mcp-server/data/state/ollama-offload-stats.json`). Before adding a NEW writer
of that file, adopt this -- do not inline another copy (8 forks were the reason this exists).

**Exports:**
- `atomicOffloadStatsRMW(statsPath, mutate) -> boolean` -- the envelope. Loads the stats JSON, runs
  `mutate(stats)` IN PLACE, stamps `lastUpdated`, atomically writes (`${path}.${pid}.${ts}.tmp` then
  `renameSync`). Returns false (no write) on bad-arg / absent file / garbage JSON / non-object / a
  throwing mutate. A throwing mutate discards the partial in-memory change (never a partial write).
- `ensureOffloadBucket(stats, key, {withByMode}) -> bucketRef` -- get-or-init `stats.byHook[key]` with
  `{fired,offloaded,kept,suggested,tokensSaved}` (+`byMode` if asked). Falsy-only re-init, so an
  existing bucket is never reset (accumulation preserved).
- `clampSaved(x) -> int>=0` -- `Math.max(0, Math.round(Number(x)||0))`.

**Adoption pattern (each caller keeps its OWN mutate -- R7 surface-don't-fork):**
```js
export function recordX({ tokensSaved = 0, statsPath = STATS_PATH } = {}) {
  return atomicOffloadStatsRMW(statsPath, (stats) => {
    const h = ensureOffloadBucket(stats, "my-byHook-key");
    h.fired = (h.fired | 0) + 1;
    h.offloaded = (h.offloaded | 0) + 1;
    h.tokensSaved = (h.tokensSaved | 0) + clampSaved(tokensSaved);
  });
}
```
Cross-tree import from a `.claude/hooks/*.mjs`: `../../scripts/lib/offload-stats-bump.mjs` (proven --
30 hooks already import from `../../scripts/lib/`).

**THE contract that gates adoption -- NEVER-CREATE:** the envelope existsSync-guards and returns false
if the stats file is absent (an execution/advisory writer must never FABRICATE a telemetry file or
spawn a parallel store). A writer that intentionally CREATES the file (`mkdirSync` + write-if-absent),
like `ollama-route-pretooluse.mjs#updateOffloadStats`, is a DIFFERENT contract -- do NOT migrate it to
this never-create envelope (it would lose first-run telemetry). That is why 8 of 9 writers consolidated
and the 9th is honestly excluded.

**Writers on the envelope (8):** execution -- `recordUsage` (ask-hermes), `recordTieredUsage`
(verified-offload-tiered), `recordFileDigestOffload` (ollama-file-digest), `recordLocalOffload`
(ollama-offload); advisory -- `bumpStats` x4 (large-read-digest / nav-rerank / wiki-read-offload /
ollama-nav-enforce, via **U-ADVISORY-BUMPSTATS-DEDUP** commit `1f927b3c1b`, the R15 APPLY-TO-ALL pass).
Live-validated: 5 `byHook` buckets recording through the envelope in production (`ollama-offload-dashboard.mjs`).

## Code-tribal lesson: partial-function-edit dangling-try (caught live this session)

When swapping a `try { ... } catch {}` function body for an arrow-callback (`fn(STATS_PATH, (j) => {...})`),
replace the WHOLE function. Anchoring an Edit mid-body (e.g. at `h.fired = ...`) leaves the original
`function f() { try {` top half intact above your new `});` -> an unclosed `try` -> `SyntaxError: Missing
catch or finally after try`. It surfaced in `wiki-read-offload-advisory.mjs`; transitively broke
`large-read-digest-advisory.mjs` (which `import`s `countLines` from it). Caught by the hook test gate
(`node <hook>.test.mjs` -> SyntaxError at load), fixed by replacing the entire function. Always re-run
the importing siblings' tests, not just the edited file's.

Related: [[reference_alpha_hermes_verified_tier_2026_06_24]] · memory `reference_alpha_offload_stats_bump_dedup_2026_06_24`.