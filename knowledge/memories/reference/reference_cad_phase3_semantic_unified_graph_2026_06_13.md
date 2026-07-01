---
name: reference_cad_phase3_semantic_unified_graph_2026_06_13
description: "CAD (delta) Phase-3 deeper anchor — Hermes-planned. The unified Semantic Feature–GD&T–DFM graph: AP242ed2 semantic PMI (machine-readable GD&T on faces) as the substrate, one graph whose nodes=faces/features+FCF-PMI+DFM-rules and edges=AAG-adjacency+datum-refs+tolerance-chains, consumed by india's GNN for joint feature-recognition + GD&T-validation + DFM in ONE representation. Sources: NIST AP242ed2 + CAx-IF recommended practices, 2023-25 GNN AFR (AAGNet/UV-Net/BRepNet + hint-GNN/Transformer hybrids), Y14.5.1-2019 (math defn) + Y14.5.2 (semantic GD&T), DFMA v11 + NX DFM rules. Written 2026-06-13 slot:zulu, Hermes-as-planner loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.495Z
aliases: reference_cad_phase3_semantic_unified_graph_2026_06_13
---


**Context:** Phase-3 (deeper) CAD anchor — planned by the **Hermes bridge** (Grok-class, outside Claude ctx)
in the per-galaxy harnessed loop. Builds on [[reference_cad_step_ap242_afr_gdt_2026_06_13]] (Phase-2 backbone).
Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §delta.

## The next integrated layer: one Semantic Feature–GD&T–DFM graph
- **Substrate = AP242 ed2 SEMANTIC PMI:** GD&T is attached to faces as machine-readable annotation (not just
  drawn) → the tolerance/datum data lives ON the B-rep, enabling a single unified graph instead of 3 siloed
  pipelines. Validate against NIST AP242ed2 test cases + **CAx-IF recommended practices** (the interop bar).
- **Unified graph:** nodes = {faces, recognized features, FCF/PMI annotations, DFM-rule instances};
  edges = {AAG face-adjacency (convex/concave), datum references, tolerance chains, feature→DFM-rule}. ONE graph
  that the GNN reasons over for **feature recognition AND GD&T validation AND DFM checking simultaneously** —
  vs today's separate AFR + GD&T + DFM passes. The cross-domain edges (datum chains, tolerance stacks) are
  exactly what a single-pass siloed recognizer misses.
- **Learned recognition (2023-25 SOTA):** AAGNet, UV-Net, BRepNet for B-rep GNN; hint-based **GNN/Transformer
  hybrids** + volumetric GNN feature recognition (ASME IDETC / CAD Journal / arXiv 2023-25). This graph is the
  natural input for india's GNN substrate (tier-5) — a CAD-domain learned AFR + tolerance reasoner.
- **Exact tolerance math:** **Y14.5.1-2019** (mathematical definition of GD&T — exact tolerance-zone geometry)
  + the **Y14.5.2** semantic-GD&T standard → the graph's validation edges compute real tolerance zones, not
  heuristics. Feeds quality (CMM/FAI inspection plan generation).
- **DFM as graph rules:** Boothroyd-Dewhurst **DFMA v11** + Siemens **NX DFM rules engine** + NIST MBE program
  DFM/GD&T integration → DFM violations become graph queries (feature + adjacency + tolerance → manufacturability).

## Wiring / consumers (R15 determination)
- GALAXY: `engines/cad/` (delta). CONSUMERS to bridge: india GNN (learned AFR over the graph), quality (Y14.5.1
  tolerance zones → inspection), quoting (features+tolerances → cost), CAM/kilo (features → strategy). DOMAIN:
  CAD-specific representation, but the GNN-over-graph PATTERN is fleet-reusable (clone to other geometric domains).
- AUTO-INVOCATION: none yet — this is a knowledge/architecture anchor; the build (graph schema + GNN consumer)
  is a delta+india engineering unit, queued for owning slots.

## Next (Phase-4 deeper, per Hermes)
Build the unified-graph schema (TS interface) + the AP242ed2 PMI extractor + the india GNN consumer; validate on
the `resources/CAD FILES` STEP corpus (blisk/impeller) with real feature+tolerance ground truth.

Sources (Hermes-planned, canonical): NIST AP242 ed2 formal schemas + CAx-IF recommended practices; ASME
Y14.5.1-2019 + Y14.5.2 (draft); 2023-25 GNN CAD-AFR literature (AAGNet/UV-Net/BRepNet + hint-GNN/Transformer);
Boothroyd-Dewhurst DFMA v11; Siemens NX DFM rules; NIST MBE program. Planner: Hermes (xAI Grok via :8645 bridge).
