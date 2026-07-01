# PSN-SYNERGY-COLLECT-MS3/U-FIVE-LEG-OUTEDGE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-FIVE-LEG-OUTEDGE (slot:alpha): real out-edge scan for the 5 single-peer legs (algorithms/formulas/nn_gnn/prism_os/prism_ai) — p0_critical 19→10

**Commit:** `813d3822ab4a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T21:42:22-05:00
**Tags:** psn-synergy-collect-ms3, u-five-leg-outedge, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-FIVE-LEG-OUTEDGE (slot:alpha): real out-edge scan for the 5 single-peer legs (algorithms/formulas/nn_gnn/prism_os/prism_ai) — p0_critical 19→10

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-FIVE-LEG-OUTEDGE (slot:alpha): real out-edge scan for the 5 single-peer legs (algorithms/formulas/nn_gnn/prism_os/prism_ai) — p0_critical 19→10

Continuation of the PSN measurement-honesty thread (MS2 fixed obsidian/wiki/memories;
MS1 fixed system_viz/prism_os/prism_ai engine-counts). The collector still carried the
SAME single-pattern blind spot on five legs: algorithms, formulas, nn_gnn, prism_os, and
prism_ai each hardcoded exactly ONE cross_ref (`engines`) — so the inspector falsely
reported them as near-isolated (out-peers=1) despite real production bridges.

Fix (scripts/psn-synergy-collect.mjs):
- PSN_OUT_PATTERNS: canonical "reference TO leg X" detector set for the generic
  code/dispatcher case — extends the obsidian/wiki maps with engines/memories/wiki
  detectors + a code-aware formulas detector (physics/constants import).
- scanLegOutEdges(files, selfKey): file-list legs (algorithms/formulas/nn_gnn).
- scanDispatcherOutEdges(name, selfKey): dispatcher-source legs (prism_os/prism_ai) —
  full-file scan (refs scattered through handler bodies). Precise MS1 lazy-import engine
  counts override the regex tally (real wiring, not mentions).
- Each scan DELETES its own key — self-mentions never become a cross-leg edge (R12).
- stripFrontmatter(): drops leading YAML frontmatter before tallying. Caught a vanity
  inflation — every auto-gen formula stub carries `tags:[…, system-viz]` boilerplate that
  tallied formulas→system_viz at 15000 (3×/file). One template applied N times is NOT N
  independent edges. Strip → 10000; the residual is the genuine `Live graph:
  system-graph.json` structural pointer (every formula IS a system-viz graph node — real,
  uniform, honestly counted).

Honest result (real-snapshot E2E via psn-synergy-rank.mjs):
- p0_critical 19 → 10 (fewer zero-ref pairs; the residual 10 are genuine missing bridges).
- nn_gnn coverage 40%→90% (refs_out 82→831), prism_ai 40%→70%, tribal 30%→60%,
  algorithms now {engines,memories,nn_gnn}, formulas now multi-peer.
- most_isolated_leg = prism_os (refs_out 11) — an HONEST actionable gap: the OS dispatcher
  genuinely references few PSN legs by these patterns (a real bridge to build, not an
  artifact). Metric is now honest in BOTH directions.

Tests: scripts/psn-synergy-collect.test.mjs 17/17 (11 prior + 6 new): PSN_OUT_PATTERNS
code-aware honesty (no bare-word matches), scanLegOutEdges self-key drop + honest-isolation,
scanDispatcherOutEdges real-data E2E against the live AI dispatcher + fail-soft, stripFrontmatter
anti-vanity lock. No engine change — ranker uses the MS1 dist quantile engine (no rebuild).
```

## Files touched (5)
- mcp-server/src/__tests__/QuotingTrainingStatusAction.test.ts | 237 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/QuotingActiveFactorLoaderEngine.ts    |  91 +++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts               |   8 ++++
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts        |  16 ++++++++
- 4 files changed, 352 insertions(+)

## Lessons surfaced in commit body
- till carried the
- tile engine (no rebuild).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 813d3822ab4a`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS3.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._