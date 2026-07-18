---
title: System-Viz Knowledge Index (sierra — compiled)
type: architecture
tags: [system-viz, index, sierra, wiki, tribal, memory, paths, galaxy, knowledge-compilation]
status: active
maintainer: sierra
created: 2026-05-29
---

# System-Viz Knowledge Index — one place to find everything

Compiled index of ALL sierra/system-viz knowledge (wiki + tribal + memories + brain files + paths). Auto-surfaces via `wiki-precheck-inject` on system-viz keywords — read this FIRST when working in the domain; it points at the authoritative source for any sub-topic. Maintained by slot:sierra.

## 5 galaxy brain files (`mcp-server/src/engines/system-viz/`)
| File | Answers |
|------|---------|
| `CLAUDE.md` | scope · engine+dispatcher surface · ~48 ghost-roost generators · anti-patterns · R-SVIZ-1..7 operating rules · Related galaxies (PSN edges) |
| `MEMORY.md` | Master-brain link (UP/DOWN/MASTER-INDEX/Last-master-sync) · High-ROI memories · 15 indexed · regression classes |
| `PATHS.md` | H:/-wide path atlas (33 verified paths; recursive Glob TIMES OUT — use this) |
| `TOOLBELT.md` | viz-first search · regen+verify loop · NEVER-OOM patterns · Read/git/dispatcher patterns |
| `GSD.md` | the executable operating runbook (regen / add-roost / verify / OOM-recover / search / 3-graphs / disp-id SSOT) |

## Wiki entries (`knowledge/wiki/architecture/`)
- [[system-viz-galaxy]] — galaxy overview (the hub entry)
- [[system-viz-gsd]] — domain operating protocol summary
- [[system-viz-add-node]] — atomic single-node append (lock-respecting)
- [[regen-viz-merge-guard]] — fail-loud merge gate (R12, exit-134 OOM class)
- [[viz-domain-coverage]] — L5 engine-domain coverage (single-source from BUILD_STATE)
- [[system-viz]] — (pre-existing) 3D viewer + layered-graph architecture guide

## Tribal tips — `knowledge/tribal/sierra-system-viz-tips.md` (10 slot:sierra tips)
one-writer-per-path · FAST[]+splice dual-reg · 548MB OOM (no parse / no pretty-print) · merge-guard fail-loud · viz-first search · split-out architecture-graph · graph-IS-fleet-substrate · system-viz-query subcommands · three-graphs consumer map · disp.* id SSOT.

## Memories (15 `*_sierra_*` in C: auto-memory → H:/knowledge/memories/)
**Doctrine/standing:** [[feedback_sierra_graph_correctness_is_fleet_search]]
**Reference:** [[reference_sierra_galaxy_buildout_2026_05_29]] · [[reference_sierra_domain_gsd_2026_05_29]] · [[reference_sierra_one_writer_per_path]] · [[reference_sierra_fast_splice_dual_registration]] · [[reference_sierra_graph_oom_classes]] · [[reference_sierra_viz_first_search]] · [[reference_sierra_split_out_file]] · [[reference_sierra_regen_pipeline_stages]] · [[reference_sierra_graph_writers_history]] · [[reference_sierra_psn_legs_for_system_viz]] · [[reference_sierra_viz_query_subcommands]] · [[reference_sierra_three_graphs_consumer_map]] · [[reference_sierra_dispatcher_id_ssot]] · [[reference_sierra_token_savings_cag_2026_05_29]]

## Key code surfaces (compact — full lists in CLAUDE.md/PATHS.md)
- **Engines** (`mcp-server/src/engines/`): MasterIndexEngine · GraphImportanceEngine · VizAutoAugmentationEngine · GraphTheoryEngine · GraphAlgorithmsEngine · SpectralGraphEngine · HybridIndexEngine.
- **Dispatcher actions**: `prism_session:{master_index_query, master_index_node_status, master_index_utilization_dashboard}` · `prism_knowledge:{obsidian_viz_regenerate, obsidian_viz_status, obsidian_viz_recall_top}`.
- **Core scripts** (`scripts/`): regen-viz · generate-system-viz · merge-augmentations · system-viz-add-node · system-viz-query · seed-ghost-from-unwired · + ~48 generate-*-features ghost-roost generators.
- **Libs** (`scripts/lib/`): system-viz-graph (capped reader) · system-graph-write-lock · regen-viz-merge-guard · graphsage-* + nn-graph-eval (GNN tier-5).
- **Hooks** (`.claude/hooks/`): pre-{bash,grep,read,write}-graph-inject · audit-viz-first-inject · sessionstart-graph-staleness-inject · stop-graph-staleness-backstop · master-index-precheck-inject · nn-graph-health-inject · **sierra-graph-health-inject** (custom).
- **Skills**: `/system-viz` `/master-index` `/awareness-snapshot` `/utilization-dashboard` `/orphan-inventory` `/deep-search` `/viz-audit-sierra`.

## The three graphs (don't confuse — [[reference_sierra_three_graphs_consumer_map]])
`system-graph.json` (548MB merged → fleet search) · `architecture-graph.json` (53MB → 3D viewer) · `_node-embeddings.jsonl` (555MB → GNN).

_Compiled 2026-05-29 by slot:sierra (claude-109ba448). Update when a new system-viz wiki/tribal/memory ships._
