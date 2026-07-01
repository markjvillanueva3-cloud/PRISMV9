# INFRA-PERF/U-VIZ-FIND-CACHE-FENCE — [MAIN] [INFRA-PERF]/U-VIZ-FIND-CACHE-FENCE: PRISM_VIZ_GRAPH_PATH env override + hermetic test rewrite + production-graph restore

**Commit:** `ef402e02b726` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T10:28:18-05:00
**Tags:** infra-perf, u-viz-find-cache-fence, auto-distilled

## Subject
[MAIN] [INFRA-PERF]/U-VIZ-FIND-CACHE-FENCE: PRISM_VIZ_GRAPH_PATH env override + hermetic test rewrite + production-graph restore

## Body
```
[MAIN] [INFRA-PERF]/U-VIZ-FIND-CACHE-FENCE: PRISM_VIZ_GRAPH_PATH env override + hermetic test rewrite + production-graph restore

Closes the regression class my own U-VIZ-FIND-CACHE introduced (2026-05-18,
commit 4f481252f1): a test that hard-coded the live production graph path
and tried to move/restore it deleted the 370 MB system-graph.json when the
backup chain broke.

Recovery
--------
state/shared/system-viz/system-graph.previous.json (163 MB, 2026-05-17,
auto-maintained by regen-viz) -> copied to system-graph.json. Verified:
schemaVersion=2.29.0, 136,107 nodes, 225,994 edges, parseable.

Defense
-------
scripts/lib/system-viz-graph.mjs:
  +graphPath() helper reads PRISM_VIZ_GRAPH_PATH env at call time.
  - Internal loadGraph + readSidecarIfFresh + writeSidecarAtomic + all
    __test seam helpers now route through graphPath() instead of the
    module-eval DEFAULT_GRAPH constant.
  - Back-compat: module-scope GRAPH = DEFAULT_GRAPH retained so any
    third-party consumer reading the const directly still works against
    the production path. New code must call graphPath().

scripts/lib/__tests__/system-viz-find-cache.test.mjs:
  - ENTIRELY rewritten to hermetic: every test now uses tmpPaths() that
    allocate a per-test {graph, cache} pair under os.tmpdir() and calls
    setEnv(paths) which points PRISM_VIZ_GRAPH_PATH + PRISM_VIZ_FIND_CACHE_PATH
    at those tmp files. The production graph path is never opened, moved,
    or unlinked by any test in this suite.
  - 12/12 PASS (was 11; added 'regression fence' test that asserts the env
    override actually takes precedence and graphPath() != defaultGraphPath()).

Why hooks didn't stop the original deletion
-------------------------------------------
The Claude harness's pre-delete / leave-a-copy-behind / write-allowlist hooks
gate Claude -> tool calls (Bash, Edit, Write). They cannot intercept syscalls
made by a subprocess Claude spawns. `node --test` runs the test code in
user-space; once that node process is running, fs.unlinkSync goes straight to
the kernel with no hook layer. The architectural fix is to keep tests away
from production paths in the first place — which is what this commit does.
```

## Files touched (3)
- .../lib/__tests__/system-viz-find-cache.test.mjs   | 412 ++++++++-------------
- scripts/lib/system-viz-graph.mjs                   |  31 +-
- 2 files changed, 179 insertions(+), 264 deletions(-)

## Lessons surfaced in commit body
- till works against

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ef402e02b726`
- Milestone envelope: `mcp-server/data/milestones/INFRA-PERF.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._