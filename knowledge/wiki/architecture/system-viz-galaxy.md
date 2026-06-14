---
title: System-Viz Galaxy (sierra)
type: architecture
tags: [system-viz, graph, regen-viz, ghost-roost, master-index, sierra, galaxy]
status: active
maintainer: sierra
created: 2026-05-29
---

# System-Viz Galaxy

Slot **sierra** owns system-viz upgrades, integration & utilization. Galaxy dir: `mcp-server/src/engines/system-viz/` (CLAUDE.md + MEMORY.md + PATHS.md + TOOLBELT.md).

## What system-viz is
PRISM's 3D visual map, canonical query/search surface, AND task/roadmap tracking surface. The merged graph `state/shared/system-viz/system-graph.json` (370-575 MB, ~244K nodes) renders every remaining unit fleet-wide as ghost roosts (priority-queue, misc-tasks, bridge-synergy, feature-gap-audit, domain-pipelines). It is the **substrate the whole fleet's search reads** — `master-index-precheck-inject`, `awareness-snapshot-inject`, `pre-{bash,grep,read,write}-graph-inject`, and `audit-viz-first` all query it. A degraded graph is a fleet-wide search outage.

## Two graphs, two files (U-VIZ-SPLIT-OUT-FILE)
- `system-graph.json` (548 MB merged) — writer: `regen-viz.mjs` (the ONE canonical writer).
- `architecture-graph.json` (53 MB, L1-L10 arch-only) — writer: `generate-system-viz.mjs` (split out so it no longer clobbers the merged graph). See [[reference_sierra_split_out_file]].

## Regen pipeline
`regen-viz.mjs` runs: FAST[] generators → `merge-augmentations.mjs` (fail-loud via [[regen-viz-merge-guard]]) → repair-classification → dedup → reparent → parent-edges → `seed-ghost-from-unwired.mjs` → drift-gate. ~7 min/run @ `--max-old-space-size=16384`. Status sidecars: `.last-successful-regen.json` / `.last-regen-failure.json`.

## Ghost-roost dual registration
~48 `scripts/generate-*-features.mjs` generators each emit an augmentation. **Each needs BOTH** `regen-viz.mjs` FAST[] AND `merge-augmentations.mjs` splice — one without the other = silently-discarded data. See [[reference_sierra_fast_splice_dual_registration]].

## Load-bearing failure modes
- 548 MB graph OOM on naive `JSON.parse` / `JSON.stringify(null,2)` (V8 string cap) → exit 134. Use `scripts/lib/system-viz-graph.mjs` + compact stringify.
- One-writer-per-path: a second writer silently clobbers the merged graph.
- SIGKILLed-merge silent-continue past a stale graph (R12) — guarded by [[regen-viz-merge-guard]].

## PSN edges
india's GNN tier-5 consumes sierra's seed-ghost ref-pool + node embeddings; golf queries the graph for orphan/utilization; alpha audits the call-graph for token-waste; delta/echo ghost nodes flow through merge-augmentations.

## See also
[[system-viz-add-node]] · [[regen-viz-merge-guard]] · [[viz-domain-coverage]] · [[feedback_system_viz_first_audit]] · [[reference_sierra_galaxy_buildout_2026_05_29]]
