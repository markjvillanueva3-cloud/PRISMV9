# GALAXY-ENRICH/U-APPLIED-PRACTICE-META-6 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GALAXY-ENRICH]/U-APPLIED-PRACTICE-META-6 (slot:papa): applied-practice tribal-knowledge layer for 6 meta/infra galaxies (fleet-hygiene/discovery/bug-hunting/system-viz/backend-helper/token-optimization)

**Commit:** `3b47ea0373e0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T08:41:08-05:00
**Tags:** galaxy-enrich, u-applied-practice-meta-6, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GALAXY-ENRICH]/U-APPLIED-PRACTICE-META-6 (slot:papa): applied-practice tribal-knowledge layer for 6 meta/infra galaxies (fleet-hygiene/discovery/bug-hunting/system-viz/backend-helper/token-optimization)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GALAXY-ENRICH]/U-APPLIED-PRACTICE-META-6 (slot:papa): applied-practice tribal-knowledge layer for 6 meta/infra galaxies (fleet-hygiene/discovery/bug-hunting/system-viz/backend-helper/token-optimization)

Practitioner-knowledge / CS-engineering gotchas the foundations theory does not teach:
- fleet-hygiene: PID-reuse race, cannot-SIGKILL-a-zombie reap-the-ancestor, zombie-vs-orphan owners, SIGTERM-grace, kill-process-group, double-fork, heartbeat confirm-after-N-ticks (OSTEP/POSIX)
- discovery: stop-word/stemming match loss, MinHash/LSH dials, BM25 k1/b collection-specific, buffered-delete stale-index ghosts (MMDS/CS276/Lucene)
- bug-hunting: green-test-no-oracle (R9), 5 named flaky root causes, coverage!=correctness, mock drift, silent catch-continue, mutation testing (MIT 6.031)
- system-viz: force-layout local-min/non-determinism/super-linear (Barnes-Hut/LOD), hairball->matrix, NP-hard labels, colorblind 8pct, streaming-vs-materialize OOM (Munzner)
- backend-helper: NodeNext .js-suffix #1 silent break, esbuild-strips-types-vs-tsc, circular-import TDZ, any-leak, single-source-type, declaration-merging, tsc heap-OOM (TS handbook)
- token-optimization: lossy-summarization generation-loss, entropy floor, prompt-cache TTL cold-miss, dedup hash-collision false-merge, context thrash (Shannon/MIT 6.050J)

All 6: VERIFIED-PARTIAL, WebFetch-cited free/legal sources, Owner-gate + Sources sections, R12-clean (CS/infra galaxies, no cutting-physics or safety numerics). 6 index entries registered (65->71) + R15-validated through live wiki-precheck-inject (backend-helper + fleet-hygiene queries surface their slugs). Generator: state/shared/workflows/galaxy-applied-practice-meta.mjs (6/12 -- remaining 6 blocked on account session limit, re-run post-reset).
```

## Files touched (10)
- knowledge/wiki/backend-helper/backend-helper-applied-practice.md         | 145 +++++++++++++++++++++++++++++++
- knowledge/wiki/bug-hunting/bug-hunting-applied-practice.md               | 112 ++++++++++++++++++++++++
- knowledge/wiki/discovery/discovery-applied-practice.md                   | 265 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- knowledge/wiki/fleet-hygiene/fleet-hygiene-applied-practice.md           | 116 +++++++++++++++++++++++++
- knowledge/wiki/index.md                                                  | 126 ++++++++++++++-------------
- knowledge/wiki/system-viz/system-viz-applied-practice.md                 | 108 +++++++++++++++++++++++
- knowledge/wiki/token-optimization/token-optimization-applied-practice.md | 112 ++++++++++++++++++++++++
- scripts/register-foundations-in-wiki-index.mjs                           |   6 ++
- state/shared/workflows/galaxy-applied-practice-meta.mjs                  |  66 ++++++++++++++
- 9 files changed, 998 insertions(+), 58 deletions(-)

## Lessons surfaced in commit body
- gotchas the foundations theory does not teach:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3b47ea0373e0`
- Milestone envelope: `mcp-server/data/milestones/GALAXY-ENRICH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._