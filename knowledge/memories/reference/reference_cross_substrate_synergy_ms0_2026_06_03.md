---
name: reference_cross_substrate_synergy_ms0_2026_06_03
description: CROSS-SUBSTRATE-SYNERGY-MS0 (sierra) — typed ADD-only cross-substrate edge spine connecting system-viz graph nodes to the Hermes slot fleet
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.073Z
aliases: reference_cross_substrate_synergy_ms0_2026_06_03
---


CROSS-SUBSTRATE-SYNERGY-MS0 (slot:sierra, 2026-06-03) — the bounded answer to the `/goal` "synergize system-viz + Obsidian + Hermes + PRISM-AI; map every node to all logical combinations." Decomposed via the `brainstorm-path-forward` 5-lens workflow, which (correctly, R12) rejected the unbounded literal framing (all-pairs O(V³) closure + 34-galaxy atomic doc-sync is non-terminating).

**Shipped + verified:**
- `scripts/lib/cross-substrate-edge-schema.mjs` (+`.test.mjs`, 18/18) — typed edge whitelist (`documented-by | owned-by-slot | embeds | consensus-of`) + `{source,confidence,addedBy,addedAt}` provenance + `assertAddOnly()` (throws on deletion). Pure module.
- `scripts/generate-cross-substrate-edges.mjs` (+`.test.mjs`, 6/6) → `state/shared/system-viz/cross-substrate-edges-augmentation.json`: **120 edges across 2 types + 34 galaxy-roost nodes**, NO 548MB load, endpoints confirmed:
  - **82 `owned-by-slot`** (7 eng-canon@1.0 + 41 domain-infer@0.85 + 34 galaxy-roost@1.0) — U-XSUB-GALAXY-ROOST lifted coverage 7→**all 34 galaxies** via self-emitted `ghost.galaxy.<name>` roosts.
  - **38 `documented-by`** (U-XSUB-DOCUMENTED-BY, 2026-06-03 follow-on) — galaxy → wiki/memory note = the **system-viz↔Obsidian/Wiki** edge. Namespaces confirmed: `memory_<kind>.<slug>` + `wiki.<section>.<slug>` (both folded live). Conv B (galaxy→`memory_patterns.<galaxy>_synthesis`, 1:1) drives all 38; conv C (galaxy MEMORY.md `[[backlinks]]`, bare + `section/slug`) wired, yields 0 vs today's 103-wiki+121-memory subset — compounds ADD-only as node coverage grows. 2-reviewer per-file scrutiny PASS (0 P0/P1).
- `scripts/merge-augmentations.mjs` — `loadOptional` + ADD-only deduped splice block (mirrors `knowledgeGal`); both edge types fold on next `regen-viz` (NOT executed — 24GB regen gated on fleet RAM). Targets fold via wiki-entries + `mergeIndexedAugmentation`(memories-atomic) → no dangling.

**Key calls:** `owned-by-slot` shipped first (endpoints existed day-1); `documented-by` second once the knowledge-note namespace was confirmed. Dropped the speculative `engines_audit_*→eng.*` convention (per-engine ids unconfirmable → dangling risk, R12: endpoints over yield). Confidence field is the guardrail (graded inference never read as ground truth — the GNN-AUROC-0.5 trap). Test's NO-DANGLING invariant re-derives the confirmed-node union independently → catches any future dangling-edge regression.

**Deferred (fleet):** ledger at `state/shared/specs/CROSS-SUBSTRATE-SYNERGY-BOUNDED.md`. Remaining: regen execution, `embeds` (graph-node→embedding; india+sierra) + `consensus-of` (decision→octopus ledger; bravo+india, gated on 2nd model) edge types, broaden confirmed knowledge-note set so conv C resolves, Blackwell offload (`generate-system-viz.mjs`+`build-node-embeddings.mjs`), per-galaxy doc-sync as per-slot `/loop`. GNN-edge + dense-N×N + closure-as-dedup DEFERRED-with-reason. Pre-existing merge P2s (handoff): xsub node fold uses `G.nodes.push`+local set not `addNodeIndexed` (byId desync, benign); `assertAddOnly()` exported but unwired in merge path.

**Why:** the cross-substrate edge spine makes "connect every node" finite, typed, and falsifiable instead of an O(V²) soup. **How to apply:** any new cross-substrate edge type goes through `cross-substrate-edge-schema.mjs` (extend `EDGE_TYPES` deliberately); regenerate the artifact with `node scripts/generate-cross-substrate-edges.mjs`. Wiki: [[cross-substrate-synergy-ms0]]. Related: [[feedback_crossroad_brainstorm_workflow]], [[reference_psn_octopus_fleet_synergy_2026_05_31]].
