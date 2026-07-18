---
title: regen-viz-merge-guard (fail-loud merge gate)
type: architecture
tags: [system-viz, regen-viz, merge-augmentations, fail-loud, R12, sierra]
status: active
maintainer: sierra
created: 2026-05-29
---

# regen-viz-merge-guard — fail-loud merge gate

`scripts/lib/regen-viz-merge-guard.mjs` is the safety gate that prevents `regen-viz.mjs` from continuing past a failed/SIGKILLed `merge-augmentations` stage onto a STALE graph.

## The bug class it prevents
`merge-augmentations.mjs` can be OOM-killed (SIGKILL) on the 548 MB graph — V8 external-allocation / max-string-length cap (exit 134, see [[reference_sierra_graph_oom_classes]]). Pre-guard, the parent `regen-viz.mjs` would print "merge failed" with empty stderr (signal-kill leaves no V8 message) and then **continue through the 7 post-merge stages** (repair → dedup → reparent → parent-edges → seed-ghost → briefing → drift-gate), all reading the STALE pre-merge graph. Downstream artifacts (EXECUTIVE-BRIEFING, WIKI-DEBT-WORKLIST) published with stale headline metrics; the drift-gate falsely certified "clean" because stale ≠ truncated. Karpathy R12 — silent corruption masquerading as a recoverable failure (lima 2026-05-17, [[reference_u_regen_viz_merge_faillod_2026_05_17]]).

## The guard
`decideMergePostState({mergeStatus, mergeSignal, preMergeNodeCount, postMergeNodeCount, augTotalBytes})` returns `{abort, exitCode, reason, message}` for four paths: merge-fail (exit 2), silent-no-op (exit 3, defined as `augBytes ≥ 1MB && pre > 0 && post ≤ pre`), continue, default. The orchestrator snapshots pre+post node count, calls the guard, and `process.exit`s on abort — post-merge stages NEVER run against a stale graph.

## See also
[[system-viz-galaxy]] · [[reference_u_regen_viz_merge_faillod_2026_05_17]] · [[reference_sierra_graph_oom_classes]] · [[reference_sierra_regen_pipeline_stages]]
