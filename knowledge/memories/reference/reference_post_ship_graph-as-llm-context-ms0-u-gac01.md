---
name: reference_post_ship_graph-as-llm-context-ms0-u-gac01
description: Auto-distilled learnings from shipping GRAPH-AS-LLM-CONTEXT-MS0/U-GAC01 (commit 75cdffff7). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.879Z
aliases: reference_post_ship_graph-as-llm-context-ms0-u-gac01
---


# GRAPH-AS-LLM-CONTEXT-MS0/U-GAC01

[GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC01 (slot:sierra): GraphContextLensEngine -- scoped ego-graph extraction as LLM context + prism_ai:graph_context_lens_extract. BFS over the bounded adjacency sidecar (NOT the 644MB graph -- reuses build-viz-adjacency + seekCard, anti-OOM deviation from literal spec); extractEgoGraph/extractByDomain/summarizeCommunity/render(json|markdown|mermaid); cycle-safe, node-capped, fail-loud on missing/corrupt sidecar. 27 tests (engine 23 + dispatcher round-trip 4, incl live-data smoke 558ms on real 96MB sidecar). 2-agent scrutiny: A's 2 P1 fixed (cache-by-path+mtime, robust prev-sibling), B PASS. tsc+build clean. Keystone for the 8-unit milestone.

**Shipped:** 2026-06-15T10:02:57-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[graph-as-llm-context-ms0-u-gac01]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._