---
name: scripts-lib-coverage
description: U-VIZ-SCRIPTLIB-COVERAGE — scripts/lib/ now node-visible in /system-viz. 144 new scriptlib.<slug> + scriptlib.<slug>.test nodes + 212 edges (contains + test-coverage) closes the largest "new files invisible to master-index" coverage gap.
type: architecture
status: shipped
shipped_at: 2026-05-20
slot: sierra
commit_scope: SYSTEM-VIZ-HIGH-ROI-MS0
unit_ids:
  - U-VIZ-SCRIPTLIB-COVERAGE
related:
  - "[[seeder-prefix-fix]]"
  - "[[system-viz-dead-pixel-sweep]]"
  - "[[master-index-surface]]"
---

# scripts/lib/ atomic coverage (U-VIZ-SCRIPTLIB-COVERAGE)

## The gap

`scripts/generate-scripts-atomic.mjs:40` deliberately does NOT recurse into
sub-directories of `scripts/`:

```js
// Don't recurse — sub-dirs (audit/, batch/, automation/) are utilities,
// not first-class scripts.
```

That comment is correct for `audit/`, `batch/`, `automation/` — but `lib/`
is different. Every file under `scripts/lib/` is a pure load-bearing
library imported by hooks, dispatchers, and other scripts. **144 of
them**, as of 2026-05-20:

- `memory-index-search-lib.mjs`, `memory-index-search-lib.test.mjs`
- `system-viz-dead-pixel-detector.mjs` + test
- `zulu-orchestrator-lib.mjs`, `zulu-bd-priority.mjs`, `zulu-drift-detect.mjs`
- `atomic-json.mjs`, `slot-task-claim-store.mjs`, `chat-slots-store.mjs`
- `blueprint-extractor-lib.mjs`, `blueprint-accuracy-consumer-lib.mjs`
- 130+ more

Their absence from the system-viz graph meant:
- `master-index-precheck-inject.mjs` couldn't pre-search them
- Per-task subagent pre-search (`reference_subagent_per_task_presearch_2026_05_15`)
  couldn't surface them
- Blast-radius queries via `/impact` couldn't find consumers/dependencies
- `/system-viz` 3D viz showed `core.scripts` with 100+ children but
  hid 144 sibling lib files

## The generator

`scripts/generate-scripts-lib-atomic.mjs` — pure deterministic generator.
Output: `state/shared/system-viz/scripts-lib-atomic-augmentation.json`.

**Node emission:**
- Impl files (`*.mjs`, `*.js`, `*.cjs`, `*.ts` that are NOT `.test.*`) →
  `scriptlib.<slug>` (subgroup `scriptlib`)
- Test files (`*.test.{mjs,js,ts,cjs}`) → `scriptlib.<slug>.test`
  (subgroup `scriptlib-test`)
- All nodes attach to `core.scripts` parent via `contains` edge
  (intensity 0.18, mirrors sibling `generate-scripts-atomic.mjs` 0.15
  offset to visually rank libs slightly above utility scripts)

**Edge emission:**
- 144 `contains` edges (one per node, from `core.scripts`)
- 68 `test-coverage` edges (impl `scriptlib.<x>` → test `scriptlib.<x>.test`,
  intensity 0.4). This edge `type` is **distinct** from the `covers` edge
  family in `generate-test-coverage-edges.mjs` — no viz collision; the
  two edge types live independently.

**R12 fail-loud behaviour:**
- Intra-batch slug collision (two lib files that slugify to the same id)
  **throws** with the colliding id + file. Surfaces a real bug rather
  than silently dropping one node.
- Existing-graph collision (already-merged from prior regen) silently
  skips — that's a legitimate re-merge, not a bug.
- `status` field is hard-cased to `built` or `stub`; never undefined.

## Wiring

Per the canonical PRISM augmentation pattern (which requires BOTH —
"augmentations need BOTH no auto-discover"):

1. **`scripts/regen-viz.mjs` FAST[]** — 1-line insert after
   `"generate-scripts-atomic.mjs"` so the generator runs on every regen.
2. **`scripts/merge-augmentations.mjs`** — 4 surgical inserts mirroring
   the existing `scriptsAtomic` sibling:
   - `loadOptional("scripts-lib-atomic-augmentation.json")` decl (line 113)
   - `versions.scriptsLibAtomic` stamp (line 180)
   - `mergeIndexedAugmentation(scriptsLibAtm, "scriptsLibAtomic")` call (line 1493)
   - Summary log addition: `scriptsLib: ${scriptLibN} / ${scriptLibE}` (line 1561)

## Tests

`scripts/generate-scripts-lib-atomic.test.mjs` — 14 hermetic `node:test`
cases run against the live `scripts/lib/` and live `system-graph.json`.
**14/14 PASS** as of ship.

Test coverage:
- Stable shape: `schemaVersion`, `generatedAt`, `newNodes`, `newEdges`, `stats`
- Node count == real lib file count
- Prefix conformance: `scriptlib.*` only; never `script.*`; never double-prefix
- Test id shape: `scriptlib.<x>.test`; impl id shape: `scriptlib.<x>`
- Parent attach via `contains` edge from `core.scripts`
- No self-loop on `test-coverage` edges
- Idempotency: two runs produce same id set
- No node-id collision within emitted set
- No edge-key collision (from|to|type unique)
- `stats.perExt` matches real extension distribution
- R12: `status` is `built` or `stub`, never undefined
- Cross-platform: file paths use forward slashes
- Graph-clobber check **auto-detects already-merged state** (`scriptlib.*`
  already in graph) so the test stays honest after the first regen merge.

## Verify

```bash
cd H:/prism

# Run the generator standalone
node scripts/generate-scripts-lib-atomic.mjs
# expected: 144 lib files scanned → 144 emitted → 68 test edges (or similar
# as scripts/lib/ grows)

# Run the test suite
node --test scripts/generate-scripts-lib-atomic.test.mjs
# expected: 14/14 PASS

# Full regen (picks the augmentation up automatically via wired loadOptional)
node scripts/regen-viz.mjs --full

# Behavioral spot-check: count scriptlib.* nodes in the merged graph
node --max-old-space-size=12288 -e "
  const g=JSON.parse(require('fs').readFileSync('state/shared/system-viz/system-graph.json','utf8'));
  const lib=g.nodes.filter(n=>n.id.startsWith('scriptlib.'));
  console.log('scriptlib.* nodes:',lib.length);
"
# expected: 144+ (grows as scripts/lib/ grows)
```

## Sister artifacts / queued follow-ups

The 60-new-file audit that surfaced this gap also identified other
generator gaps not addressed by this unit:

- **Milestone envelopes** (`mcp-server/data/milestones/*.json`) — no
  atomic generator; only `generate-milestone-wiki.mjs` (wiki-only).
  Queued: `U-VIZ-MILESTONE-ENVELOPE-COVERAGE`.
- **State specs** (`state/shared/specs/*.{md,html}`) — no clear generator.
- **Dead-pixel reports** (`state/shared/system-viz-dead-pixels-*.{json,md}`)
  — no generator; these are timestamped one-shots.
- **`.claude/helpers/*.ps1`** — `generate-scripts-atomic.mjs` only scans
  `scripts/`, not `.claude/helpers/`.

This unit closes the **largest single class** (10 newly-added libs + 134
historical lib files invisible since system-viz inception).

## Lesson

The same "two pieces both work but assume different conventions" failure
class that drove the G1 type-backfill and G4 seeder-prefix fixes. Here:
the file-ranger (generate-scripts-atomic) and the master-index consumers
both worked in isolation; the failure mode was at the join — non-scanned
sub-dirs were invisible to the index but still load-bearing in the
codebase. The audit-the-60-new-files pass is the canary that
re-surfaces this class on every regen.
