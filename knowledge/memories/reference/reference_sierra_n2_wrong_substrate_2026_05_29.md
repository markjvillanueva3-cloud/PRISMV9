---
name: reference_sierra_n2_wrong_substrate_2026_05_29
description: N2 orphan→hub pairing CANNOT work on architecture-graph — its subgroup is a type-bucket not a domain cluster; needs the merged graph (OOM-blocked). Negative finding.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.939Z
aliases: reference_sierra_n2_wrong_substrate_2026_05_29
---


**NEGATIVE FINDING (2026-05-29, slot:sierra) — do NOT re-attempt N2 on architecture-graph.json.** SIERRA-HIGH-LEVERAGE §N2 ("hub × orphan pairs — cheapest connect-two-existing-nodes wins, ranked by N1 importance") is **merge-OOM-blocked**, same keystone as W1.

Built + tested a correct pure-core (`extractOrphanHubPairs` — for each low-degree built code node, suggest the biggest same-subgroup hub it isn't already wired to; 10/10 node:tests on synthetic domain-clustered graphs). Then ran it on the live OOM-safe `architecture-graph.json` and it produced **garbage anchors** → reverted (uncommitted).

**Root cause (the load-bearing lesson):** `architecture-graph.json` node `subgroup` is a **TYPE bucket** (`"dispatcher"`, `"registry"`, `"fs"`), NOT a domain cluster. So "biggest same-subgroup hub" = "another node of the same type" → it suggests `disp.adaptivecontroldispatcher → disp.camdispatcher` (dispatchers don't wire to each other). Meaningless. Two further substrate facts:
1. The documented orphans (AISubsystem=`reg.aisubsystemregistry`, Agent, Alarm) are at degree 2 (in 1·out 1) in arch-graph → `subgroup:"registry"` has no hub → all `needsTarget`.
2. The arch-graph (L1-L10 arch-only) does NOT carry per-engine call-edges or per-engine orphan nodes — those live in the 548MB **merged** graph. So the orphan→hub *domain adjacency* N2 needs is only in the merged graph, which OOMs (exit 134) on a full `JSON.parse`.

**Conclusion:** meaningful orphan→hub anchoring requires (a) domain-clustered subgroups AND (b) engine↔dispatcher call-edges — both only in the merged graph. N2 is therefore blocked by the same merge-OOM keystone as W1's 7 generators. The fix that unblocks BOTH: a streaming/sharded merge-augmentations (or a domain-clustered OOM-safe export). Until then, N2 = GNN tier-5's job (the `needsTarget` rows ARE the GNN's input — india owns the model).

**Process lesson (R8):** verify the substrate's field SEMANTICS (is `subgroup` a domain or a type?) before building an analysis that assumes domain meaning. A field existing ≠ a field meaning what you assume. Cost: one build cycle. See [[reference_sierra_ranked_hybrid_n1_2026_05_29]] (N1 succeeded because it used `utilization`/`confidence` which ARE semantically what I assumed) · [[reference_sierra_regen_fast_registration_gap_2026_05_29]] (the shared merge-OOM keystone).
