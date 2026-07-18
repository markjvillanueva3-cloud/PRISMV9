---
name: reference_cad_phase4_deep_2026_06_13
description: "CAD galaxy (slot:delta) Phase-4 deep anchor — Hermes-planned (Grok, :8645), R12-tempered. Five deeper sub-domains a world-leading CAD expert masters beyond Phase-2/3: NURBS/OCCT kernel internals (Boehm/Oslo knot algorithms, BOPAlgo robustness), ISO GPS GeoSpelling full math framework (ISO 17450/8015/1101/5459), MBE semantic data pipeline (AP242+QIF 3.0+LOTAR NAS 9300), parametric constraint solving (DCM/LGS/GCS graph decomp, persistent naming), B-rep healing/defeaturing. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.495Z
aliases: reference_cad_phase4_deep_2026_06_13
---


**Context:** Phase-4 anchor for the CAD galaxy (delta). Builds on:
- [[reference_cad_step_ap242_afr_gdt_2026_06_13]] — Phase-2 (AP242 B-rep, AFR families, Y14.5-2018 GD&T basics)
- [[reference_cad_phase3_semantic_unified_graph_2026_06_13]] — Phase-3 (unified Semantic Feature-GD&T-DFM graph, AP242 PMI substrate, Y14.5.1-2019 math defs)

Planner: Hermes bridge (xAI Grok via :8645, confirmed response). Content R12-tempered: stripped unverifiable data claims, marked hypotheses, retained only named verifiable sources.

---

## The deeper increments: 5 sub-domains

### 1. NURBS / OCCT Kernel Internals — Exact Geometry & Robustness

**What it adds beyond "OCCT is the CAD kernel":** The Phase-2 anchor names OCCT and NURBS surfaces. Phase-4 goes to the algorithmic internals that determine whether Boolean operations, healing, and topology repairs actually succeed or silently corrupt.

**Named algorithms:**
- **Knot insertion:** Boehm algorithm (1980) — inserts a single knot into a B-spline curve/surface without changing geometry. Requires `N(i,p)` basis recomputation. Oslo algorithm (Cohen, Lyche, Riesenfeld 1980) — multi-knot insertion generalisation. Both are foundational to local mesh refinement.
- **Degree elevation/reduction:** Degree elevation exact; degree reduction is approximation (L2-minimisation + continuity constraints) — Piegl & Tiller 1997 §5.9. Degree reduction introduces error; OCCT `GeomConvert` handles this with user-supplied tolerance.
- **T-splines / local refinement:** Sederberg et al. 2003 — T-splines allow T-junctions in the knot grid, enabling local refinement without propagating knot lines globally. Not yet in OCCT mainline; relevant as Autodesk/Rhino target.
- **Boolean robustness (OCCT BOPAlgo):** `BOPAlgo_PaveFiller` builds the Pave Face intersection graph; exact arithmetic vs floating-point tolerance is the failure mode. Hoffmann 2001 ("Robustness in Geometric Computations", *J. Computing and Information Science in Engineering*) is the canonical paper on why floating-point B-rep Booleans fail silently.
- **ShapeFix pipeline:** `ShapeFix_Shape` → `ShapeFix_Face` → `ShapeFix_Wire` cascade in OCCT heals small gaps, orientation errors, degenerate edges. Understanding which fixer runs in which order determines whether delta's B-rep import pipeline produces valid topology.

**Key text:** Piegl & Tiller, *The NURBS Book* (2nd ed., Springer, 1997) — the canonical NURBS reference, contains Boehm/Oslo, degree elevation, and reparametrisation algorithms.

**Real data source for validation:** NIST MBE PMI Test Suite (public, CAx-IF) — STEP files with known-good topology, used as healing benchmark.

---

### 2. ISO GPS / GeoSpelling — Full Mathematical Framework

**What it adds beyond Y14.5-2018:** Phase-2/3 covered ASME Y14.5-2018 (FCF, DRF, MMC) and Y14.5.1-2019 (mathematical defns). ISO GPS is the parallel European framework with deeper formal foundations — particularly the **GeoSpelling** operator algebra, which defines tolerancing as a sequence of mathematical operations on the "skin model" of a part.

**Named standards (verifiable ISO standard numbers):**
- **ISO 8015:2011** — GPS fundamentals (independence principle: size and form independent unless noted).
- **ISO 17450-1:2011** — General concepts: Skin model, feature model, characteristic, tolerance indicator.
- **ISO 17450-2:2012** — Operators and uncertainties: the 6 operators (partition, filtration, extraction, association, collection, construction) that formally define how a tolerance is evaluated.
- **ISO 1101:2017** — Geometrical tolerancing (ISO equivalent of Y14.5; defines all characteristic symbols).
- **ISO 2692:2021** — Maximum material requirement (MMR) — mathematically more general than ASME MMC; includes reciprocity requirement (RPR).
- **ISO 5459:2011** — Datums and datum systems (3-2-1 locking, datum targets).
- **ISO 14405-1:2016** — Linear sizes (LP = least-squares, GG = global Gaussian, GX = max inscribed, GN = min circumscribed) — more granular than ASME.
- **ISO/TR 14638:2015** — GPS Masterplan (the roadmap linking all GPS standards).

**GeoSpelling operators (ISO 17450-2):** The sequence partition → filtration → extraction → association → collection → construction defines how a measured surface is mapped to a tolerance-zone check. Delta's DFM/quality engine should encode this as a pipeline rather than ad-hoc checks.

**Key paper:** Ballu et al., "GeoSpelling: a common language for specification and verification", *CIRP Annals* 2018. Also: Mathieu & Ballu, *Geometrical Product Specification and Verification* (Springer, 2018) — the graduate-level GPS textbook.

**ASME vs ISO practical gap:** Y14.5-2018 and ISO 1101:2017 are NOT interchangeable; they differ in independence principle defaults, MMR/MMC wording, and profile tolerance scope. Any MBE pipeline must flag the governing standard (ASME vs ISO) for each FCF — this is a real interop failure mode in AP242 export/import.

---

### 3. Model-Based Enterprise (MBE) Semantic Data Pipeline

**What it adds beyond AP242 basics:** Phase-2 covered AP242 ed2 structure. Phase-4 covers the full end-to-end MBE data pipeline: how semantic PMI flows from CAD through inspection planning, quality, and long-term archival — the pipeline delta must implement to serve quality+ERP.

**Named standards:**
- **ISO 10303-242:2022 (AP242 ed2)** — current edition; Annexes add Part 21 file 3rd edition (p21e3) with UTF-8 and multiple scopes, XML binding (Part 28), JSON binding (experimental). Delta must handle p21e3 for modern CAD exports.
- **QIF 3.0 (ANSI/DMSC QIF-2022)** — Quality Information Framework; XML schema for PMI, measurement plans, results, and statistics. QIF is the bridge between AP242 (design) and CMM/FAI (quality). The `QIF_Document` root schema carries `MeasurementResources`, `MeasurementPlan`, `MeasurementResults` alongside GD&T feature references.
- **ASME Y14.45-2021** — Model-Based Definition (MBD): rules for what annotations must appear in the 3D model to eliminate 2D drawings. Defines minimum PMI content.
- **LOTAR EN/NAS 9300 series** — Long-Term Archiving and Retrieval: NAS 9300-110 (3D CAD with PMI, aerospace-focused). Defines validation properties that must be present in an AP242 file for it to be archivally valid. Key for aerospace customers (Alcoa/ITW context at JM Die).

**NIST reference implementation:** Hedberg et al., NIST Technical Note 2206 (2021), "A Reference Implementation of the Model-Based Enterprise Data Pipeline" — public NIST document, describes a working AP242→QIF→inspection pipeline. The NIST MBE PMI Test Suite (CAx-IF) provides public STEP files with known PMI content for delta's import validation.

**Pipeline the delta galaxy must own:**
```
CAD (STEP AP242 p21e3) → PMI extract (semantic) → QIF 3.0 → Inspection plan → CMM (quality galaxy) → results → QIF results → AP242 update
```
Each arrow is a data transform with a standard schema. The PMI extract step is what delta's engines must do; downstream consumers are quality (CMM) and ERP (archival).

---

### 4. Parametric Constraint Solving — GCS Internals

**What it adds:** Phase-2/3 covered AFR (what features exist) but not how parametric CAD maintains design intent through geometric constraint solving — which is what makes PRISM's "edit the model" workflows possible.

**Named algorithms:**
- **Geometric Constraint Solving (GCS):** Given a set of geometric entities (points, lines, circles, planes) and constraints (distance, angle, coincident, tangent), find a consistent configuration. Two families: (a) algebraic (Gröbner basis / homotopy continuation — complete but slow for large systems); (b) **graph-based decomposition** (Owen 1991 — decompose the constraint graph into rigid subsystems solvable in sequence).
- **D-Cubed DCM (Dimensional Constraint Manager)** — the industrial standard GCS engine used inside CATIA, NX, SolidWorks, Creo. Proprietary. The open-source equivalent used in FreeCAD's Sketcher is **PLANEGCS** (derived from Bouma et al. 1995 approach).
- **LEDAS LGS (LEDAS Geometric Solver)** — another industrial GCS, used in some CAD kernels.
- **Degrees-of-freedom analysis:** A sketch with N geometric entities and DOF(entity) degrees of freedom and C constraint equations is fully-constrained when DOF_total − C = 0, under-constrained when > 0, over-constrained when < 0. Owen 1991 gives the graph-theoretic version.
- **Persistent naming problem:** When a parametric model regenerates (user changes a dimension), the topology changes (faces/edges split, merge). Mapping old topology ids to new topology is the persistent naming problem. Kripac 1997 (*CAD* 29(11)) and Raghothama & Shapiro 1998 are the canonical papers. This is an unsolved production problem — every major CAD system handles it differently, causing downstream AFR/PMI attachment failures on edit.

**Key papers (verifiable):**
- Bouma et al., "Geometric Constraint Solving in Parametric CAD", *CAD* 27(6), 1995
- Owen, "Algebraic Solution for Geometry from Dimensional Constraints", *Proc. ACM Symposium on Solid Modeling*, 1991
- Kripac, "A Mechanism for Persistently Naming Topological Entities in History-Based Parametric Solid Models", *CAD* 29(11), 1997

**PRISM relevance:** Any "edit the CAD model" action (electrode offset, DFM auto-fix, tolerance propagation) requires understanding which constraints drive the topology — otherwise a delta-engine edit breaks the constraint graph silently.

---

### 5. B-rep Healing, Defeaturing & Repair Algorithms

**What it adds:** Phase-2/3 cover AFR assuming valid B-rep. In practice, imported STEP/IGES files have gaps, slivers, non-manifold edges, and invalid orientations. Healing is the prerequisite for all downstream work.

**Named defect classes and algorithms:**
- **Gap healing:** edge endpoints mismatched by more than model tolerance. OCCT `ShapeFix_Wire::FixGaps3d()` stitches via nearest-point projection. Gap tolerance vs model tolerance distinction is critical (healing gap ≠ geometry tolerance).
- **Sliver faces:** thin faces that cause Boolean instability. Defeatured by merging into adjacent face (requires re-parameterisation of bounding edges). OCCT `ShapeUpgrade_RemoveInternalWires` addresses a subset.
- **Non-manifold topology:** an edge shared by >2 faces. Valid in some representations (shell intersections) but invalid for solid B-rep. Detection: walk `BRep_Builder` edge-face incidence.
- **Surface continuity repair:** C0 (positional), C1 (tangent), C2 (curvature) continuity at patch boundaries. OCCT `GeomAPI_ProjectPointOnSurf` + `GeomFill` handle positional; tangent/curvature matching requires knot adjustment.
- **Defeaturing (simplification):** remove fillets, small holes, chamfers for CAM/FEA meshing. Approaches: (a) suppression by feature type (if AFR identified it); (b) topological defeaturing (identify and remove the face set + re-trim neighbors). Automated defeaturing is an active research area — CADfix (ITI TranscenData) is the industrial tool; OCCT `ShapeUpgrade` handles basic cases.

**Key paper:** Shapiro & Vossler, "What Is a Parametric Family of Solids?", *Proc. ACM Symposium on Solid Modeling*, 1993 — foundational on valid B-rep semantics that healing must restore.

**Practical pipeline for delta:** Import → `ShapeFix_Shape` (orientation, gaps, degenerate) → `ShapeUpgrade_UnifySameDomain` (merge coplanar/coaxial faces) → `BOPCheck` validation → AFR. Document what each fixer changes so errors are traceable.

---

## Wiring / consumers (R15)

- **GALAXY engines:** `mcp-server/src/engines/cad/` (delta). The 5 sub-domains map to distinct engine families:
  - Sub-domain 1 (NURBS/OCCT): `CadOcctHealingEngine`, `CadBooleanRobustnessEngine` — preprocessing inputs to all downstream CAD engines.
  - Sub-domain 2 (ISO GPS): `CadGpsGeoSpellingEngine` — tolerance validation complement to the Y14.5 GD&T engines; feeds quality galaxy CMM planning.
  - Sub-domain 3 (MBE pipeline): `CadMbePmiExtractEngine`, `CadQifExportEngine` — the AP242→QIF bridge; consumers are quality + ERP galaxies.
  - Sub-domain 4 (GCS): `CadConstraintSolverEngine` — needed for any "edit model" action (electrode offset, DFM auto-fix); persistent naming is the cross-cutting concern for all AFR engines when models regenerate.
  - Sub-domain 5 (healing): `CadBrepHealingEngine` — runs BEFORE AFR, DFM, and GD&T extraction on every imported STEP file.
- **Cross-galaxy consumers:** quality (QIF 3.0 results, ISO GPS tolerance zones → CMM inspection), kilo/CAM (healed + defeatured B-rep → toolpath), india/GNN (healed B-rep → AAG for learned AFR), quoting (features + tolerances → cost).
- **Physics constants:** no cutting physics in this galaxy anchor. Any speed/feed constants remain in `src/physics/constants.ts` (never inlined).
- **Dispatcher actions needed:** `cad_atomic_ops` dispatcher (delta) should expose `heal_brep`, `extract_pmi_qif`, `evaluate_gps_tolerance`, `solve_constraints`, `defeature` as named actions — currently not verified as wired; flag for delta buildout.

---

## Next (Phase-5, honestly scoped)

Phase-5 should move from knowledge to **validated implementation anchors**:
1. **OCCT healing pipeline validation:** run `ShapeFix_Shape` on the `resources/CAD FILES` STEP corpus (blisk.stp, impeller.stp, assembly of jet.STEP) and document actual defect counts per class — this produces real ground-truth for the healing engine tests.
2. **QIF 3.0 schema binding in TypeScript:** map AP242 semantic PMI to QIF `QIF_Document` XML — the concrete interface between delta and quality galaxies. Validate against the NIST MBE PMI Test Suite files.
3. **GCS DOF analysis for delta's electrode-offset workflow:** verify that the electrode-offset parametric edit can be expressed as a constraint perturbation without breaking persistent naming in the STEP representation delta uses.
4. **ISO GPS vs ASME Y14.5 flag in PMI extractor:** for each FCF extracted from AP242, record governing standard (ASME/ISO) — needed before the quality galaxy can correctly evaluate tolerance zones.

These are engineering units, not research — they have defined inputs (real STEP files), defined outputs (test assertions), and defined pass criteria.

---

## Sources

- Piegl & Tiller, *The NURBS Book* (2nd ed., Springer, 1997) — knot algorithms, degree elevation, NURBS fundamentals
- Hoffmann, "Robustness in Geometric Computations", *Journal of Computing and Information Science in Engineering* 1(2), 2001
- Ballu, Mathieu et al., "GeoSpelling: a common language for specification and verification", *CIRP Annals* 67(1), 2018
- Mathieu & Ballu, *Geometrical Product Specification and Verification* (Springer, 2018)
- ISO 8015:2011, ISO 17450-1:2011, ISO 17450-2:2012, ISO 1101:2017, ISO 2692:2021, ISO 5459:2011, ISO 14405-1:2016, ISO/TR 14638:2015 (GPS Masterplan)
- Hedberg et al., NIST Technical Note 2206 (2021) — MBE data pipeline reference implementation
- ANSI/DMSC QIF-2022 (QIF 3.0) — Quality Information Framework schema
- NAS 9300-110 (LOTAR 3D CAD with PMI)
- ASME Y14.45-2021 — Model-Based Definition minimum content
- Bouma et al., "Geometric Constraint Solving in Parametric CAD", *CAD* 27(6), 1995
- Owen, "Algebraic Solution for Geometry from Dimensional Constraints", *ACM SMA*, 1991
- Kripac, "A Mechanism for Persistently Naming Topological Entities", *CAD* 29(11), 1997
- Shapiro & Vossler, "What Is a Parametric Family of Solids?", *ACM SMA*, 1993
- NIST MBE PMI Test Suite (CAx-IF, public) — real STEP files for healing/PMI validation
- Planner: Hermes (xAI Grok via :8645 bridge), tempered per R12 discipline (hype stripped, hypotheses marked, fabricated data sources removed)
