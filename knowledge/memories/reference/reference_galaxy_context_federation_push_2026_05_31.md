---
name: reference_galaxy_context_federation_push_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-PUSH (shipped 2026-05-31, slot alpha) — Phase C complete: selective cross-galaxy learning fan-out (MASTER-DIGEST topFact → whoKnows → matched targets, distinctive-token filter, never broadcast). Advisory, recall-bounded by card distillation."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.124Z
aliases: reference_galaxy_context_federation_push_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-PUSH** (shipped 2026-05-31, slot alpha) — 8th federation unit,
**Phase C complete** (XGALAXY-INJECT + PUSH). Sisters: [[reference_galaxy_context_federation_knows_map_2026_05_31]],
[[reference_galaxy_context_federation_rollup_2026_05_31]], [[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]].

**What it is:** selective cross-galaxy LEARNING fan-out. For each galaxy's headline learning (MASTER-DIGEST.json
ranked[].topFact), find the few OTHER galaxies whose domain it's relevant to (via whoKnows over KNOWS-MAP) and
emit a one-line ADVISORY push pointer to each. NEVER broadcast. Pure transform over two shipped artifacts
(MASTER-DIGEST.json + KNOWS-MAP.json) — no new data source. Emits PUSH-QUEUE.json (queue + per-target inbox).

**Shipped:** `scripts/lib/galaxy-push.mjs` (pure-core + injected-deps + fail-soft; reuses whoKnows/loadKnowsMap/
tokenize/DEFAULT_ROOTS; no ESM cycle; 19 node:test), `scripts/galaxy-push.mjs` (CLI build|inbox|show). Sidecar
(regenerable, NOT committed): `state/shared/galaxy-cards/PUSH-QUEUE.json`. Live: 18 sources → 39 targeted pushes / 24 galaxies.

**How to apply / lessons:**
1. **Three independent never-broadcast governors.** exclude-self + score≥threshold(1.5) + cap-at-k(3). A source
   can NEVER fan out to all galaxies even with k=Infinity unless every galaxy genuinely clears the idf threshold.
   Selective fan-out = the whole point (a broadcast is the token-waste this milestone fights).
2. **The distinctive-token filter is the noise-killer (RUN THE REAL BUILD to see it).** First cut matched on the
   raw topFact prose → 92 pushes, many noise (wedm←academy on generic "reference/scope/filename"). Fix: restrict
   the match query to the SOURCE's distinctive KNOWS-MAP forward topics that appear in the learning — generic
   prose has low idf so it's NOT in a galaxy's top distinctive topics → stripped. Result: 92→39 selective pushes,
   wedm's noisy inbox → 0. Reuses the forward map KNOWS-MAP already built (R8). The real build exposed the noise;
   hermetic tests didn't.
3. **Be honest about the residual recall bound (R12 — arm-B P2, 3rd overclaim catch this milestone).** The filter
   is bounded by card-token distinctiveness: low-distinctiveness/meta-prose cards (business, database-expansion)
   carry generic words ("across", "all", "working") in their OWN forward map, so those still drive ~8/39 weak
   single-token pushes. NOT a code bug — the design's relevance is heuristic. Fix was honesty: pushes are ADVISORY
   (inbox a galaxy reviews; weak pointer = low cost), and the pointer SELF-LABELS strength — a single-topic match
   renders `advisory match [weak: 1 topic]`, multi-topic is unflagged. Sharper relevance is a CARD-CONTENT lever,
   not a PUSH change. Every federation unit's quality is bounded by the upstream artifact (cards) — state it.
4. **Single-writer-per-file** (5th unit): writes only PUSH-QUEUE.json, never INDEX.json/MEMORY.md. Advisory queue +
   inbox; never auto-writes a peer-locked galaxy MEMORY.md (delivery is an operator/golf step).
5. **Distinct from obsidian-sync-push / grafana-push-metrics** (data sync / metrics) — dedup-cleared, net-new.

Knob: `PRISM_GCF_PUSH_DISABLE=1`. Wiki: [[galaxy-context-federation]]. PSN [[feedback_psn_definition]].
Federation status: 8/12 (Phases A+B+C complete; Phase D = RECALL-FIRST/XDEDUP/SAVINGS-TELEMETRY + OLLAMA-MAINT gated).
