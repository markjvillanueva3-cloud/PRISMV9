# LEGO-STACKING-MS0/U-LEGO-3-4-5 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LEGO-STACKING-MS0]/U-LEGO-3-4-5 (slot:romeo iter30-31-32): close out lego-stacking Stages 3+4+5 of cross-domain cohort-bridge substrate.

**Commit:** `ff0ece0acec0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T23:12:38-05:00
**Tags:** lego-stacking-ms0, u-lego-3-4-5, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LEGO-STACKING-MS0]/U-LEGO-3-4-5 (slot:romeo iter30-31-32): close out lego-stacking Stages 3+4+5 of cross-domain cohort-bridge substrate.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LEGO-STACKING-MS0]/U-LEGO-3-4-5 (slot:romeo iter30-31-32): close out lego-stacking Stages 3+4+5 of cross-domain cohort-bridge substrate.

Stage 3 — CohortBridgeShimEngine (mcp-server/src/engines/CohortBridgeShimEngine.ts):
  applyNodeNextSuffix(): pure rewrite of relative ESM specifiers for NodeNext
    resolution (bare/scoped/already-suffixed are no-ops). 23/23 vitest PASS.
  rewriteSourceImports(): file-level import/export/dynamic-import rewriter.
  buildShapeCoerceShim(): API-shape adapter spec (method-name remap) with
    R12 mustHumanVerify flag + defensive clone of caller's methodMap.
  recommendShimsForTopBridges(): consumes COHORT-COMPAT-MATRIX.json, emits
    NodeNext + shape-coerce shim specs per top-K MEDIUM bridge; preESM
    cohorts return empty shims (signal: full rewrite required, no shim viable).

Stage 4 — bridge-shim-emit.mjs (scripts/):
  Emits synthetic cohort-shim-bridge edges (cohortA._shim_anchor → cohortB._shim_anchor)
  into the same bridge-edges-auto.jsonl that bridge-auto-wire.mjs writes to.
  Idempotent via sha1(from|to|kind|shimKind) dedupe. Each edge carries
  synthesized:true + provenance + mustHumanVerify. First run: 10 edges,
  97 cumulative shim edges in JSONL. Operator log: BRIDGE-SHIM-EMIT-LOG.md.

Stage 5 — stop-cohort-drift-watch.mjs (.claude/hooks/, T3 advisory):
  Detects when engine cohort taxonomy drifts (new cohort name appears OR
  engine-count shifts ≥10%) so operator knows to refresh the matrix +
  shim emit. 24h throttle. Snapshot at state/shared/specs/.cohort-drift-snapshot.json.
  Smoke-tested: emits hint on first run (no prior baseline), silent thereafter.
  Knobs: PRISM_COHORT_DRIFT_WATCH_DISABLE=1, PRISM_COHORT_DRIFT_INTERVAL_MS=N.

Also includes (this session's earlier viz work, uncommitted until now):
  state/shared/system-viz/_server.cjs       — restored (was missing from disk;
                                              all docs assumed it existed)
                                              + /api/snapshot endpoint (dashboard data)
                                              + /api/graph-snapshot endpoint (3D viewer data)
                                              + /3d route + missing-producer 404s with
                                              clear messages (R12 fail-loud)
  state/shared/system-viz/dashboard.html    — live thin client (was stale 2026-05-16
                                              meta-dashboard); fetches /api/snapshot on
                                              load, renders 6 cards + fleet/commits/
                                              scrutiny tables; safe DOM APIs only
                                              (no innerHTML on dynamic data)
  state/shared/system-viz/viz3d.html        — NEW: Three.js InstancedMesh viewer at /3d;
                                              5,000-node layer-stratified point cloud
                                              from /api/graph-snapshot, OrbitControls,
                                              raycaster hover/click, search box; loads
                                              in ~1.5s (server caches downsample).
  .gitignore                                — explicit exceptions for the 3 viz source
                                              files (the entire system-viz dir was
                                              gitignored, which is why _server.cjs
                                              silently disappeared pre-2026-05-25 —
                                              no version-control protection).

Karpathy R12 throughout: every advisory artifact carries mustHumanVerify:true.
No new physics constants (none touched). No stubs (all 23 tests are concrete
asserts, no toBeDefined). Per feedback_commit_to_slot_worktree: 4 sister files
(.gitignore, batch-compat-scorer.mjs, COHORT-COMPAT-MATRIX.{json,md}) were
absorbed by peer commit 807d882c03 earlier this session — documented absorption
class, attribution lost but content preserved in git history.

Closes lego-stacking-ms0 stages 3+4+5. Stages 1+2 shipped earlier this session
(iter28 + iter29 of slot:romeo).
```

## Files touched (4)
- state/shared/specs/BRIDGE-SHIM-EMIT-LOG.md |  36 +++
- state/shared/system-viz/dashboard.html     | 393 +++++++++++++++++++++++++++++
- state/shared/system-viz/viz3d.html         | 305 ++++++++++++++++++++++
- 3 files changed, 734 insertions(+)

## Lessons surfaced in commit body
- til now):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ff0ece0acec0`
- Milestone envelope: `mcp-server/data/milestones/LEGO-STACKING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._