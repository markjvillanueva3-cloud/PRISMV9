---
name: reference_sierra_viz_query_oom_heap_respawn_2026_06_25
description: "system-viz-query --help OOM fix + Blackwell heap self-respawn on the main loadGraph() path (2026-06-25, slot:sierra)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.204Z
aliases: reference_sierra_viz_query_oom_heap_respawn_2026_06_25
---


**system-viz-query OOM-on-help + missing graph-path heap guard (2026-06-25, slot:sierra, commit f5a64533de).**

`scripts/system-viz-query.mjs` is the fleet's canonical search-first CLI (fired ~1060x/day by hooks). Two real defects, surfaced live this session when `node scripts/system-viz-query.mjs --help` OOM'd at ~380MB:

- **Defect A (OOM/cost on typo):** an UNKNOWN command (`--help`/`-h`/a typo) is non-empty, so it skipped the empty-cmd usage, matched no cheap short-circuit, and fell through to the eager `loadGraph()` (644MB) -- OOMing on the default heap -- before finally reaching the `unknown command` else at the bottom. A typo paid (and crashed on) a full graph load.
- **Defect B (Blackwell utilization):** the main `loadGraph()` path had NO `--max-old-space-size` guard, unlike the `subgraph` short-circuit which already self-respawns. So every roadmap-candidates/blast-radius/dispatcher-summary/coverage-by-domain/worktrees/build-order OOM'd on the default heap. 136GB box -> the gap was utilization, not capacity.

**Fix (build-once, R15):** new pure planner `scripts/lib/viz-query-heap-reexec.mjs` -- `isKnownGraphCmd(cmd)` + `planHeapRespawn({execArgv,env,breakerVar,heapVar,defaultMb})` + frozen `GRAPH_CMDS` (mirrors the post-loadGraph dispatch chain) + `GRAPH_USAGE`. CLI: (1) unknown-cmd guard BEFORE loadGraph (help -> usage exit 0, typo -> usage exit 2, neither loads the graph); (2) one-shot heap self-respawn `PRISM_VIZQUERY_HEAP_MB` (default 16384) on the graph path; (3) migrated the inline `subgraph` heap block to the SAME planner (also fixed its old `|| "4096"` garbage-heap edge: env "0"/"abc" used to ship `--max-old-space-size=0`/launch-error). Headline cheap-fallback diagnostic gated on the planner so it logs once, not twice.

**Validated:** 13/13 unit tests; live -- `--help` 0.12s usage exit 0 (was OOM), `frobnicate` exit 2 no load, `node-card` unregressed, `coverage-by-domain` exit 0 7.2s (was OOM), subgraph works, headline-fallback logs once. Per-file reviewer arm PASS (P2 headline double-log fixed inline).

**Lesson:** a search-first CLI must validate the command + arrange its heap BEFORE the eager graph load -- an unknown cmd must NEVER pay (or OOM on) a 644MB parse, and a graph-loading entrypoint that assumes a big heap must self-arrange it (never fight a low default; Blackwell). Sibling of [[reference_systemviz_find_oom_2026_06_09]] (that fixed `find`; this fixes `--help` + the whole graph path).

**Next (queued, iteration 2):** R15-APPLY -- ~33 scripts import `loadGraph`/system-viz-graph; sweep the sibling CLIs (system-viz-node-dispatch, build-system-viz-livediff, hub-blast-radius-rank, etc.) that load the graph without a heap guard and apply `planHeapRespawn` (build-once -> everywhere). Verify each genuinely loads the graph on a hot path before adding the guard. Part of the `/goal` "harden backend-dev systems + no hard caps on utilization" loop. See [[feedback_build_for_blackwell_hardware]].
