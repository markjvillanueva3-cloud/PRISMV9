# LEGO-STACK-MS0/U-COHORT-DETECTOR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LEGO-STACK-MS0]/U-COHORT-DETECTOR (slot:romeo iter28, 2026-05-24): Stage 1 of the lego-stacking cross-domain compatibility plan — vintage-cohort clustering of 3,501 L5 engines

**Commit:** `d479285dd012` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T20:16:38-05:00
**Tags:** lego-stack-ms0, u-cohort-detector, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LEGO-STACK-MS0]/U-COHORT-DETECTOR (slot:romeo iter28, 2026-05-24): Stage 1 of the lego-stacking cross-domain compatibility plan — vintage-cohort clustering of 3,501 L5 engines

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LEGO-STACK-MS0]/U-COHORT-DETECTOR (slot:romeo iter28, 2026-05-24): Stage 1 of the lego-stacking cross-domain compatibility plan — vintage-cohort clustering of 3,501 L5 engines

[BOOTSTRAP-SLOT-ENFORCE rationale: global META artifact + outputs, same
shape as iter23 bridge-graph-builder + iter27 bridge-auto-wire.]

Per user directive 2026-05-24 ("is it possible to strategically plan for
assessing batches of nodes for cross domain compatibility, older nodes
being updated with newer node data or at least bridge or wire them
together so they dont have to be rewritten, think of legos stacking
together") — Stage 1 of the 5-stage strategic plan now in the task
queue (tasks #17-#21).

What this ships:
  scripts/cohort-detector.mjs reads system-graph.json + samples first 4KB
  of every engine .ts file in mcp-server/src/engines/, parses header
  signals (schemaVersion, iter\d tag, MS-tag, deprecation marker, import
  style), and combines with file-mtime quartile to assign each engine
  to a vintage cohort.

First-run results:
  Engines scanned:    3,501
  Cohorts found:      12
  Cohort populations: esm-js (current NodeNext) 1396 · esm-plain 968 ·
                      iter12-18 (slot-worktree era) 312 · cjs-era 261 ·
                      iter19-23 (JM-Die-page era) 144 · MS3-5 (mid-MS) 113 ·
                      iter24+ (generic-bridge era) 91 · iter<12 (pre-slot-
                      worktree) 79 · MS0-1 (early-MS) 64 · deprecated 38 ·
                      [other small cohorts]

Why this matters:
  Lego-stacking strategy: rather than rewriting older engines to match
  newer conventions, identify cohort boundaries and ship adapter shims
  that translate between cohort APIs. Old engines never modified;
  shims handle the impedance match.

Unblocks Stage 2 (batch-compat-scorer, task #18) which consumes
PRISM-COHORTS.json to score every (oldCohort × newCohort) pair on
API-shape match + domain alignment + bridge-cost class.

R12 honesty: every cohort assignment is heuristic (mtime + sampled
header). The output carries mustHumanVerify:true; operator MUST
eyeball cohort boundaries before Stage 2 acts on them. Mis-classified
engines should be tagged explicitly in their file header.

Files (3 total, +35,998 lines because PRISM-COHORTS.json is the full
per-engine assignment for all 3,501 engines + 12 cohort rollups):
  scripts/cohort-detector.mjs            (200 LOC — re-runnable in ~30s)
  state/shared/specs/PRISM-COHORTS.json  (full structured output)
  state/shared/specs/PRISM-COHORTS.md    (operator digest)

Compounding-gains property: re-runs nightly via the same cron schedule
as bridge-graph-builder. Every time PRISM grows, the cohort map
re-clusters; Stage 2 scorer consumes the fresh map.

Strategic plan status (5-stage lego-stack):
  Stage 1: ✅ THIS COMMIT — cohort-detector
  Stage 2: ⬜ blocked-by #17 — batch-compat-scorer (cohort × cohort heat-map)
  Stage 3: ⬜ blocked-by #18 — lego adapter shim library
  Stage 4: ⬜ blocked-by #19 — bridge-auto-wire --shims flag
  Stage 5: ⬜ blocked-by #20 — cohort-drift-watch Stop hook

Cumulative session totals (iter19→iter28, 10 commits):
  166/166 tests · 30/30 top-30 cross-domain bridges wired ·
  87 graph edges auto-emitted · 3,501 engines cohort-clustered ·
  4 META artifacts (bridge-graph-builder, bridge-auto-wire,
  cohort-detector, JM-Die verify-e2e).
```

## Files touched (4)
- scripts/cohort-detector.mjs           |   247 +
- state/shared/specs/PRISM-COHORTS.json | 35430 ++++++++++++++++++++++++++++++++
- state/shared/specs/PRISM-COHORTS.md   |   321 +
- 3 files changed, 35998 insertions(+)

## Lessons surfaced in commit body
- tile to assign each engine

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d479285dd012`
- Milestone envelope: `mcp-server/data/milestones/LEGO-STACK-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._