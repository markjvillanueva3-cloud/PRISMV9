# SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY — [MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P3-VERIFY-UNIT-READY: pre-claim dependency check

**Commit:** `bb97427afc02` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T19:42:16-05:00
**Tags:** system-viz-brain-ms0, u-p3-verify-unit-ready, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P3-VERIFY-UNIT-READY: pre-claim dependency check

## Body
```
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P3-VERIFY-UNIT-READY: pre-claim dependency check

scripts/verify-unit-ready.mjs — pure helper + hardened CLI for checking whether a
unit's depends_on chain is shipped. Pure exports for /pick-unit and other callers;
CLI for shell pipelines. Exit codes 0/2/3 (ready/blocked/bad-invocation), --json
mode emits shape {ready, reason, missingDeps[], chain[], hostFound}.

Schema convention (introduced by this unit, opt-in):
- "U-FOO" — in-milestone dep (resolves to same envelope)
- "MS-OTHER:U-BAR" — cross-milestone dep
- depends_on missing/empty → unit is always ready (backward-compat with the
  25 existing envelopes that haven't adopted the field yet)

Hardening (per per-file scrutiny gate):
- /^[A-Z0-9][A-Z0-9_-]{0,63}$/ regex on milestone+unit IDs blocks path traversal
  at parseDep + parseArgs + safeLoadEnvelope.
- path.resolve + startsWith(resolvedDir + path.sep) defense-in-depth.
- Object.prototype.hasOwnProperty.call in lookupUnitStatus blocks __proto__ /
  constructor probes.
- pathToFileURL for isMain (cross-platform robust, no endsWith looseness).
- exitWith / exitWithErr flush stdout / stderr via callback before process.exit
  (Windows pipe truncation safety).
- CYCLE_LIMIT=64 truncation surfaces as a missingDep entry, NOT silently
  ignored.
- hostFound boolean distinguishes host-envelope-missing from
  host-found-with-zero-deps in the result.

Tests: 38 node:test cases, all passing in 435ms. Uses process.execPath instead
of bare "node" in spawnSync tests to dodge Windows ENOENT. Real-value
assertions throughout (Karpathy R9). Integration test reads the actual
envelope and locks today's behavior to fail-loud on schema shift.

Per-file scrutiny gate (4 parallel reviewer agents, 2 rounds):
- Round 1: 3 of 4 arms FAILED (P0 path traversal + P0 untested CYCLE_LIMIT +
  P0 untested CLI + 7 P1s).
- Fixes applied across both files (isSafeId regex, pathToFileURL isMain,
  exitWith callback, safeLoadEnvelope path-resolve, hostFound field,
  cycle-limit surface, 14 new tests including 5 CLI spawnSync).
- Round 2: all 4 arms PASS, 1 residual P1 found (bare process.exit in error
  paths bypassed the flush callback) → fixed with parallel exitWithErr helper.

Envelope:
- U-P3-VERIFY-UNIT-READY status: pending → complete.
- SYSTEM-VIZ-BRAIN-MS0 complete units: 10 → 11 of 26.

Loop: /loop iter 2/14 OK.
```

## Files touched (4)
- .../data/milestones/SYSTEM-VIZ-BRAIN-MS0.json      |  25 +-
- scripts/verify-unit-ready.mjs                      | 284 +++++++++++++++
- scripts/verify-unit-ready.test.mjs                 | 379 +++++++++++++++++++++
- 3 files changed, 687 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb97427afc02`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._