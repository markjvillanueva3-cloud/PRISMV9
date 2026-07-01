---
name: reference_cad_step_ap242_afr_gdt_2026_06_13
description: "CAD (delta) Phase-2 deep-research anchor — STEP AP242 + automatic feature recognition (AFR) + GD&T Y14.5. AP242 (ISO 10303-242) = managed model-based 3D eng, supersedes AP203+AP214, carries semantic PMI/GD&T. UNITS: CONVERSION_BASED_UNIT 0.0254=inch vs SI_UNIT(.MILLI.,.METRE.)=mm (the 25.4× safety check). AFR families: graph-based (AAG), hint-based, volume-decomposition, ML/graph-NN. GD&T Y14.5-2018: FCF, DRF, MMC/LMC bonus, position/profile/runout. Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.497Z
aliases: reference_cad_step_ap242_afr_gdt_2026_06_13
---


**Context:** Phase-2 anchor for the CAD galaxy (delta), per the 2026-06-13 knowledge-max `/goal`. Standards-based
canonical knowledge. Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §delta.

## STEP / ISO 10303
- **AP242 ed2 (ISO 10303-242)** = "Managed model-based 3D engineering" — the convergence AP that **supersedes
  AP203 (config-controlled) + AP214 (automotive)**, adding **semantic PMI** (machine-readable GD&T, not just
  graphical), assembly/kinematics, tessellation alongside exact B-rep. The target import format for delta.
- **UNITS (safety-critical — the 25.4× rule):** STEP header `CONVERSION_BASED_UNIT` with factor **0.0254 ⇒ inch**;
  `SI_UNIT(.MILLI.,.METRE.) ⇒ mm`. Resolve from the file BEFORE any geometry/tool/holder work — a mismatch is a
  25.4× scale error (see [[feedback_check_units_first]] + `scripts/lib/units-guard.mjs`).
- **B-rep topology hierarchy:** solid → shell → face (bounded surface) → edge-loop → edge → vertex; geometry
  (NURBS surfaces/curves) vs topology (connectivity) separation. OpenCASCADE OCCT is the canonical open kernel
  (TopoDS, BRepBuilderAPI, GeomAPI). Tessellation for viz/CAM mesh.

## Automatic Feature Recognition (AFR) — the CAD→CAM bridge
- **Graph-based:** Attribute Adjacency Graph (AAG, Joshi-Chang 1988) — faces=nodes, edges labeled convex/concave;
  subgraph-match feature patterns. Robust for prismatic features, struggles with intersecting features.
- **Hint-based / trace:** look for feature "traces" (e.g. a hole's cylindrical face + bottom) then verify.
- **Volume decomposition:** convex-hull / cell-based delta-volume → map to features.
- **ML / deep AFR:** voxel-CNN, point-cloud (PointNet), and **graph-neural-net on the B-rep graph** (Shi 2020+,
  UV-Net, BRepNet, AAGNet) — state of the art for intersecting/freeform features. PRISM's GNN substrate (india)
  is the natural home for a learned AFR.
- **Manufacturing-feature taxonomy:** hole (simple/counterbore/countersink/tapped), pocket, slot, step, boss,
  chamfer, fillet, groove, thread, freeform-pocket → each maps to a CAM strategy (kilo).

## GD&T — ASME Y14.5-2018 (+ ISO 1101 / ISO GPS)
- **Feature Control Frame:** geometric characteristic | tolerance (+ Ø, material modifier) | datum refs.
- **Datum Reference Frame:** primary/secondary/tertiary datums constrain 6 DOF; datum precedence matters.
- **Material condition modifiers:** MMC Ⓜ (bonus tolerance as feature departs from MMC), LMC Ⓛ, RFS (default).
- **Controls:** form (flatness/straightness/circularity/cylindricity), orientation (perp/par/angularity),
  location (**position** — the workhorse, profile), runout (circular/total). Profile-of-a-surface is the most
  general (controls form+orientation+location).
- Consumed by the quality galaxy (CMM/FAI) + DFM checks. PMI in AP242 carries these semantically.

## DFM (design-for-manufacturability gate)
- Bralla *Design for Manufacturability Handbook* + Boothroyd DFMA: min wall thickness, draft on cast/molded,
  internal corner radius ≥ tool radius (no sharp internal corners millable), tool-access/line-of-sight,
  L/D depth limits for holes/pockets, standard drill sizes. delta's DFM engine flags violations pre-CAM.

## SFC/CAM integration (delta)
- AFR output feeds kilo (CAM strategy) + foxtrot/whiskey (speed-feed per feature). Next deep-research (roadmap
  §delta): OCCT topology API specifics, the AAGNet/BRepNet learned-AFR papers (wire to india GNN), ISO 10303-242
  ed2 PMI schema detail. Re-verify against the OCCT docs + a Y14.5-2018 reference on the next pass (web throttled).

Sources (canonical standards/literature): ISO 10303-242 (STEP AP242); ASME Y14.5-2018 (GD&T); Joshi & Chang 1988
(AAG); Shi et al. 2020 + UV-Net/BRepNet/AAGNet (deep AFR); OpenCASCADE OCCT documentation; Bralla DFM Handbook;
Boothroyd-Dewhurst DFMA. Expertise-authored anchor — specific source pages flagged for web re-verification.
