# SYSTEM-VIZ-UPGRADES-MS0/U-CACHE-LIB — [MAIN] [SYSTEM-VIZ-UPGRADES-MS0]/U-CACHE-LIB: in-process mtime+size cache for loadGraph

**Commit:** `db404038566a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:48:07-05:00
**Tags:** system-viz-upgrades-ms0, u-cache-lib, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-UPGRADES-MS0]/U-CACHE-LIB: in-process mtime+size cache for loadGraph

## Body
```
[MAIN] [SYSTEM-VIZ-UPGRADES-MS0]/U-CACHE-LIB: in-process mtime+size cache for loadGraph

P1 from /forge-audit-v2. loadGraph() keeps a module-scope cache keyed on the
graph file (mtimeMs,size) + 60s TTL belt. stat-BEFORE-read invariant: a racing
rewrite can only false-miss (extra parse), never false-hit (stale serve).
{fresh:true} bypasses without poisoning the shared cache. Env:
PRISM_VIZ_GRAPH_NO_CACHE=1, PRISM_VIZ_GRAPH_CACHE_TTL_MS (0 = full disable).

In-process micro-bench: cold 171ms -> cached 0.155ms = 1105x.

HONEST SCOPE (reviewer): in-process only. Spawn-per-call hooks + query CLI get
ZERO benefit; system-viz-health --bench-query CANNOT observe it (spawns per
sample). Real beneficiary: a long-lived process calling loadGraph() >=2x. Doc
corrected to strike the wrong "hooks" claim. 5 zero-arg callers grep-verified
read-then-write-separate-output — none mutate the shared returned graph.

+8 real tests (ref-identity cache hit, fresh no-poison, mtime invalidation via
utimes, NO_CACHE env, TTL=0 disable, read-vs-parse throw distinction). 14/14
node:test green. Backward compatible: zero-arg loadGraph() unchanged.
Path-scoped commit — peer monolith files left in shared index untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/lib/system-viz-graph.mjs      | 151 ++++++++++++++++++++++++++++++----
- scripts/lib/system-viz-graph.test.mjs |  89 +++++++++++++++++++-
- 2 files changed, 222 insertions(+), 18 deletions(-)

## Lessons surfaced in commit body
- wrong "hooks" claim. 5 zero-arg callers grep-verified

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show db404038566a`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-UPGRADES-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._