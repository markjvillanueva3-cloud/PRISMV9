---
name: reference_system_viz_fs_coverage_layer_absent_2026_06_15
description: "system-viz finding (route to sierra): the merged 762MB system-graph.json LACKS the expand-system-viz-l12-files fs-coverage layer -- NO L12 nodes, L9 use subgroup not namespace, L11 are ghost nodes. Blocks H-DRIVE-VAULT U-3 full run + U-7. Fix: regen the fs layer into the merged graph."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.215Z
aliases: reference_system_viz_fs_coverage_layer_absent_2026_06_15
---


# system-viz: fs-coverage layer absent from the merged graph (2026-06-15, found by slot:papa)

**Route to: sierra** (system-viz upgrades/integration/regen owner).

While building H-DRIVE-VAULT-SYNERGY/U-3 (`scripts/h-drive-graph-parity.mjs`, graph<->vault coverage
parity), a live stream of the 762MB `state/shared/system-viz/system-graph.json` (344,968 nodes)
revealed the merged graph does NOT carry the `expand-system-viz-l12-files.mjs` fs-coverage layer:

- **NO `L12` layer at all** (layer tally: 7, L0-L10, L11=102841, L4a, Lgit, L13 — zero L12).
- **L9 fs nodes use `subgroup`** (e.g. `{id:"fs.%systemdrive%", layer:"L9", subgroup:"prism", label:"H:/prism/%SystemDrive%/"}`), **NOT `namespace`** — so they don't carry the per-domain key.
- **L11 nodes are ghost/corpus nodes** (e.g. `ghost.jm_die_tribal_wiki_corpus...`), NOT the fs file-bundles expand-system-viz-l12-files emits.

So 0 namespaced fs file-nodes exist in the live graph. This is the documented **generate-system-viz
vs regen-viz divergence** (CLAUDE.md §Recent regressions): a generator that does NOT include the
L12 fs-coverage expansion last-wrote the merged graph.

## Impact
- **U-3** (`h-drive-graph-parity.mjs`) correctly **fails loud** (exit 2, `fsCoverageDetected` guard) rather than reporting a false "PARITY OK". It is fixture-proven to run green (exit 0/1) the moment the fs layer is present.
- **U-7** (DIRECTORY_DIGEST reconcile, depends on U-3) stays **blocked** until the layer is restored.

## Fix (sierra)
Regenerate the fs-coverage layer into the merged graph: `node scripts/expand-system-viz-l12-files.mjs`
(walking H:/ TOP-LEVEL roots — a sub-path walk yields a spurious namespace) then ensure
`regen-viz.mjs` merges it WITHOUT the architecture-only generator clobbering it (the OUT_FILE split:
`generate-system-viz.mjs` -> `architecture-graph.json`, `regen-viz` -> merged `system-graph.json`).
Verify: `node scripts/h-drive-graph-parity.mjs` returns exit 0/1 (not exit-2 measurement-failure).

Related: [[reference_papa_hdrive_vault_synergy_2026_06_14]] · CLAUDE.md §Recent regressions (system-graph 3-writer race).
