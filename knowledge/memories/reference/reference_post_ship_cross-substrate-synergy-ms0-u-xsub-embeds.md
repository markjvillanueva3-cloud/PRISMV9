---
name: reference_post_ship_cross-substrate-synergy-ms0-u-xsub-embeds
description: Auto-distilled learnings from shipping CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-EMBEDS (commit 88cb72b53). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.817Z
aliases: reference_post_ship_cross-substrate-synergy-ms0-u-xsub-embeds
---


# CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-EMBEDS

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CROSS-SUBSTRATE-SYNERGY-MS0]/U-XSUB-EMBEDS+DOCBY-ORACLE (slot:sierra): materialize the embeds cross-substrate edge type -- generator emits 948 edges linking graph nodes to the nomic-768d embedding pools (771 GNN ref-pool + 177 ghost; 459 stale-ghost correctly skipped), self-emitted ghost.embedding_index.* to-roosts, oracle-confirmed from, ADD-only, never-dangle. ALSO fix a pre-existing silent regression: documented-by had collapsed to 0 because it confirmed knowledge notes against the volatile rotating memories-atomic augmentation; now confirms against the node-card offset oracle (merged-graph node set) -- restored to 320 (42 synthesis@1.0 + 278 backlink@0.9) and hardened vs re-collapse. Generator produces 1347 edges/3 types + 36 newNodes; 7/7 tests incl oracle-absent CI path proven; per-file 2-reviewer PASS. Artifact is gitignored/derived (rebuilds via regen-viz FAST[]). Synergizes the NN/GNN/RAG embedding substrate into the system-viz search graph.

**Shipped:** 2026-06-10T13:31:16-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[cross-substrate-synergy-ms0-u-xsub-embeds]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._