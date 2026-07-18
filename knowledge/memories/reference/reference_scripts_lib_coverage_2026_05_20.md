---
name: reference-scripts-lib-coverage-2026-05-20
description: "2026-05-20 sierra /loop iter-3 — generate-scripts-lib-atomic.mjs closes the largest 'invisible to master-index' coverage gap. 144 new scriptlib.<slug> + scriptlib.<slug>.test nodes + 212 edges (contains + test-coverage). Wired into regen-viz FAST[] + merge-augmentations 4-site sibling-mirror. 14/14 tests + 2-reviewer PASS gate."
aliases: reference_scripts_lib_coverage_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.150Z
---


## SYSTEM-VIZ-HIGH-ROI-MS0 / U-VIZ-SCRIPTLIB-COVERAGE — scripts/lib/ now node-visible

**Shipped:** 2026-05-20 (slot sierra, /loop iter-3, fulfills "generate new
nodes to represent new files" half of the /goal directive)

**The gap:** `scripts/generate-scripts-atomic.mjs:40` deliberately does
NOT recurse into sub-dirs (`// Don't recurse — sub-dirs are utilities`).
Correct for `audit/`, `batch/`, `automation/` — but **`lib/` is
different**. 144 load-bearing pure libraries (`memory-index-search-lib`,
`zulu-*`, `system-viz-dead-pixel-detector`, `atomic-json`,
`slot-task-claim-store`, `chat-slots-store`, `blueprint-*`, ...) imported
by hooks, dispatchers, and other scripts — all invisible to:
- `master-index-precheck-inject.mjs` top-K hits
- subagent per-task pre-search ([[reference_subagent_per_task_presearch_2026_05_15]])
- `/impact` blast-radius queries
- `/system-viz` 3D viz

**The fix:** `scripts/generate-scripts-lib-atomic.mjs` — pure
deterministic generator. Two id-shapes:
- impl files → `scriptlib.<slug>` (subgroup `scriptlib`)
- test files → `scriptlib.<slug>.test` (subgroup `scriptlib-test`)

Output: `state/shared/system-viz/scripts-lib-atomic-augmentation.json`
(144 nodes + 212 edges: 144 `contains` from `core.scripts` + 68
`test-coverage` impl↔test pairs).

**R12 fail-loud properties:**
1. Intra-batch slug collision **throws** (surfaces real bug if two lib
   files ever slugify to the same id) — was silent skip in reviewer-B
   P2 finding, fixed pre-commit.
2. Existing-graph collision silently skips (legitimate re-merge).
3. `status` is hard-cased `built`|`stub` — pinned by test.

**Wired into BOTH:**
- `scripts/regen-viz.mjs` FAST[] (1-line insert after sibling `generate-scripts-atomic.mjs`)
- `scripts/merge-augmentations.mjs` 4 surgical inserts mirroring `scriptsAtomic`:
  loadOptional (L113), version stamp (L180), mergeIndexedAugmentation
  (L1493), summary line (L1561 → adds `scriptsLib: ${scriptLibN} / ${scriptLibE}`).

The destructured `scriptLibN / scriptLibE` are consumed by the summary
log — the unused-var TS diagnostic on the initial edit cleared.

**Tests:** `scripts/generate-scripts-lib-atomic.test.mjs` — **14/14 PASS**:
- shape, count, prefix conformance, test-id shape, parent-attach,
  no-self-loop, idempotency, no-node-collision, no-edge-collision,
  perExt accuracy, R12 status, forward-slash paths, **graph-clobber
  with auto-detected already-merged state** (test stays honest after
  first merge — reviewer-A P2 fix).

**Per-file scrutiny gate:** 2 parallel reviewers dispatched on the full
3-file change set (compressed from per-file due to /loop pacing).
- Reviewer A (holistic, `reviewer` agent): PASS, 2 P2 + 3 P3 (no P0/P1).
- Reviewer B (silent-breakage class, `code-analyzer` agent): PASS, 2 P2
  + 2 P3 (no P0/P1).
- Both P2s addressed pre-commit. P3s deferred (cosmetic / convention-
  matching with sibling generator).

**Stats:** 144 lib files scanned → 144 nodes emitted → 144 contains
edges + 68 test-coverage edges = 212 total. Zero parent-missing. All
status=`built` (no stub libs).

**Sister-gaps not closed by this unit** (queued as separate
generator-shipment units):
- Milestone envelopes (`mcp-server/data/milestones/*.json`) — no atomic
  generator, only `generate-milestone-wiki.mjs` (wiki-only).
- State specs (`state/shared/specs/*.{md,html}`).
- Dead-pixel reports.
- `.claude/helpers/*.ps1`.

**Commit pending:** 4 files staged (generator + test + merge-aug + regen-viz),
blocked on a 5-min stale peer index.lock (524KB, suggests crashed peer
git op). git-lock-sweeper hook will clear it on next 30s tick OR I retry
in iter-N. Work itself is COMPLETE on disk + tested + reviewed.

**Lesson:** sister to G1 type-backfill + G4 seeder-prefix — the "two
pieces both work but assume different conventions" failure class
re-surfaces in coverage-gap form. Resolution recipe: the audit-the-N-
new-files pass IS the canary that re-detects this class on every regen.

Wiki: [[scripts-lib-coverage]]. Related:
[[seeder-prefix-fix]] · [[reference_system_viz_dead_pixel_sweep_2026_05_20]] ·
[[reference_master_index_surface]].
