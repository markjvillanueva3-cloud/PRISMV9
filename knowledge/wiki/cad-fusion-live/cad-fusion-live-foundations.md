---
title: CAD-Fusion-Live Foundations — parametric feature history, constraint-based sketching, the timeline/rollback model, assembly mates, associativity
galaxy: cad-fusion-live
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-create-workflow (2026-06-10)"
verification_method: "Live-session / parametric-history / constraint-solver workflow facts WebFetch-confirmed against accessible free-courseware + gov + reputable reference sources (MIT OCW 2.158J Computational Geometry course + syllabus pages; NIST Digital Thread for Smart Manufacturing program page; Wikipedia Parametric design, Geometric constraint solving, Solid modeling, Parasolid, Degrees of freedom (mechanics), History of CAD software, Assembly modelling, Constructive solid geometry, Boundary representation, NURBS). Underlying solid-modeling math (B-rep/NURBS/CSG) is POINTED to knowledge/wiki/cad/cad-foundations.md rather than re-derived here. Numeric kernel tolerances, solver iteration counts, and any per-product behavior stay owner-gated for delta. Sources access-blocked this pass (Mating(CAD), Direct modeling, History of CAD software detail, NPTEL course page, Parasolid first attempt — all 404 on one URL form) were either re-fetched via a working URL or left out per R12."
tags: [cad-fusion-live, parametric-modeling, feature-history, feature-tree, constraint-solver, geometric-constraint-solving, degrees-of-freedom, assembly-mates, direct-vs-parametric, associativity, timeline-rollback, design-intent, digital-thread]
---

# CAD-Fusion-Live Foundations

The domain-knowledge spine for the **cad-fusion-live** galaxy: the *live / long-running parametric modeling session* — feature history and the feature tree, constraint-based sketching, the timeline/rollback model, assembly mates, and associativity. This is the **workflow/session dimension** of CAD. For the underlying solid-modeling **math** (B-rep topology, NURBS curves/surfaces, CSG booleans) this entry POINTS to [`knowledge/wiki/cad/cad-foundations.md`](../cad/cad-foundations.md) rather than re-deriving it.

**What is promoted here is WebFetch-CONFIRMED** (marked CONFIRMED with the source link). **Numeric kernel tolerances, solver iteration limits, and per-product UI specifics stay owner-gated for delta** (see the Owner-gate section) before any cad-fusion-live engine/doctrine hardcodes them.

---

## 1. Parametric, feature-based modeling — the core paradigm of a live session

**CONFIRMED** against [Wikipedia "Parametric design"](https://en.wikipedia.org/wiki/Parametric_design) and [Wikipedia "Solid modeling"](https://en.wikipedia.org/wiki/Solid_modeling):

- Parametric design is **"a design method in which features ... are shaped based on algorithmic processes rather than direct manipulation."** A **parameter, as opposed to a constant, is characterized by having a range of possible values** — parameters are variables that control the design outcome.
- The governing principle is design intent: **"parameters and rules establish the relationship between design intent and design response."** When a parameter changes, **"any change of parameters like editing or developing will be automatically and immediately updated in the model."**
- In feature-based solid modeling, **"features are defined to be parametric shapes associated with attributes such as intrinsic geometric parameters (length, width, depth etc.), position and orientation, geometric tolerances, material properties, and references to other features."** Features carry semantic richness and are **"a basis for linking CAD with downstream manufacturing applications."**
- The canonical worked example of parametric propagation (from the Solid modeling article): a shaft is extruded 100 mm with a hub assembled to its end; **"Later, the shaft is modified to be 200 mm long ... the hub will relocate to the end of the shaft to which it was assembled, and the engineering drawings and mass properties will reflect all changes automatically."**

**Design implication for cad-fusion-live:** the live-session model is a *graph of features driven by parameters*, not a static mesh. Editing an early feature must propagate forward — so the galaxy's session engines must treat each feature as a re-evaluable node with typed parameters + references, not a frozen body.

## 2. Construction history as a re-evaluable tree (the timeline / feature tree)

**CONFIRMED** against [Wikipedia "Constructive solid geometry"](https://en.wikipedia.org/wiki/Constructive_solid_geometry):

- A construction sequence can be encoded as a tree: **"CSG objects can be represented by binary trees, where leaves represent primitives, and nodes represent operations."** Each node is a boolean operation (union / difference / intersection); each leaf is a primitive. This *is* the construction history made explicit.
- Crucially for a live session: **"when CSG is procedural or parametric, the user can revise their complex geometry by changing the position of objects or by changing the Boolean operation used to combine those objects"** — i.e. you edit the tree, not the result, and re-evaluate. This is the mathematical underpinning of the timeline / rollback model: roll the marker back, change a node, re-run forward.

**Design implication for cad-fusion-live:** the timeline is a *re-evaluable DAG of operations*. Rollback = move the evaluation marker to an earlier node; edit = mutate a node's parameters; rebuild = re-evaluate downstream. A failure to re-evaluate a downstream feature (the classic "feature fails because its parent face was deleted") is the central failure mode the galaxy must surface, not swallow. (The Solid modeling article notes the same hazard: **"modifying an early feature may cause later features to fail."**)

## 3. Constraint-based sketching — geometric vs dimensional constraints, degrees of freedom

**CONFIRMED** against [Wikipedia "Geometric constraint solving"](https://en.wikipedia.org/wiki/Geometric_constraint_solving):

- Geometric constraint solving is **"constraint satisfaction in a computational geometry setting, which has primary applications in computer aided design"** — geometric elements and constraints are modeled as equations and solved by non-linear algebraic methods.
- The article splits constraints into two categories that map exactly to a CAD sketcher:
  - **Non-parametric (geometric) constraints**: tangency, horizontality, coaxiality.
  - **Parametric (dimensional) constraints**: distance, angle, radius.
- A constraint system is in exactly one of three states — this is the well-known sketcher status:
  1. **Well-constrained** — the appropriate number of constraints for a unique solution.
  2. **Under-constrained** — insufficient constraints (the article calls out "detection of under-constrained sets").
  3. **Over-constrained** — excessive/conflicting constraints ("detection of over- and under-constrained sets and subsets").
- Solving methods named: **algebraic (equation systems solved iteratively, Newton-Raphson being most common), graph-based decomposition (tree decomposition, C-tree, graph reduction), degrees-of-freedom analysis, symbolic/rule-based computation, constraint propagation, and genetic algorithms.**
- Historical note from the same article: the technology became integral to CAD in the 1980s **"when Pro/Engineer introduced parametric, feature-based modeling."**

### Why "degrees of freedom" is the right accounting unit

**CONFIRMED** against [Wikipedia "Degrees of freedom (mechanics)"](https://en.wikipedia.org/wiki/Degrees_of_freedom_(mechanics)):

- A rigid body in **2D has 3 degrees of freedom** (two translation + one rotation) — exactly the DOF budget of a 2D sketch entity's placement.
- A rigid body in **3D has 6 degrees of freedom** (three translation + three rotation): **"the body has six degrees of freedom."** A free part in an assembly starts with all six.
- Constraints remove DOF one equation at a time: two particles held at constant distance means **"the six coordinates must satisfy a single constraint equation"** (6 -> 5). In 3D mechanisms, **"hinges and sliders each impose five constraints and therefore remove five degrees of freedom."**

**Design implication for cad-fusion-live:** "fully defined" sketch = DOF driven to zero by a *well-constrained* system; the galaxy's sketch-health surface should report remaining DOF and flag under/over-constrained states, mirroring the constraint-solver vocabulary above rather than inventing its own.

## 4. Direct modeling vs parametric (history-based) modeling

**CONFIRMED** against [Wikipedia "Parasolid"](https://en.wikipedia.org/wiki/Parasolid):

- The Parasolid kernel exposes **both paradigms in one engine**: alongside history/feature operations it provides **"direct model editing"** features — tapering, offsetting, and geometry replacement. Direct editing mutates the B-rep result without re-running a feature history.
- This is the practical distinction a live-session galaxy must hold: *parametric/history-based* editing changes a feature node and re-evaluates the tree (Sections 1-2); *direct* editing pushes/pulls faces on the resulting solid with no history to replay. Modern kernels (and modern CAD apps built on them) support both, so a session may carry history AND accept direct edits.

> Note: a dedicated "Direct modeling" reference page was access-blocked (404) this pass, so the direct-vs-parametric contrast is grounded here only on the Parasolid kernel's confirmed capability set. The deeper tradeoff list (no feature tree, no design-intent capture for direct edits) is left **owner-gated** below.

## 5. Assembly mates — relating parts and constraining their DOF

**CONFIRMED** against [Wikipedia "Assembly modelling"](https://en.wikipedia.org/wiki/Assembly_modelling):

- Assembly modeling is **"a technology and method ... to handle multiple files that represent components within a product."** Rather than fixed coordinates, designers use **"mating conditions"** such as **"alignment of axis of two holes or distance of two faces from one another,"** and **"a geometry constraint engine then calculates final component positions based on these relationships."**
- Mates are the assembly-level analog of sketch constraints: they **restrict degrees of freedom by locking specific geometric relationships** between parts (a free part has 6 DOF per Section 3; each mate removes some).
- Two assembly strategies are distinguished:
  - **Bottom-up** — component files assembled through sub-assemblies into the product; **"All CAD systems support this approach."**
  - **Top-down** — establish product structure first, then detail parts, enabled **"via associative copying of geometry between components"** (advanced systems only).

**Design implication for cad-fusion-live:** an assembly is a second constraint system layered on top of per-part feature trees. Top-down associative copy means a change in one part can ripple into another — the cross-part edge of associativity (Section 6) the galaxy must track.

## 6. Associativity + the digital thread — why a live model propagates downstream

**CONFIRMED** against [NIST "Digital Thread for Smart Manufacturing"](https://www.nist.gov/programs-projects/digital-thread-smart-manufacturing) (gov program page):

- The digital thread is **"a 'digital thread' of information that is envisioned to integrate and drive modern design, manufacturing and product support processes."** It requires **"communication of the product designs, through well-structured 3D product models, to the manufacturing and quality activities."**
- It is explicitly **bidirectional**: it supports **"communication of manufacturing and quality considerations back to the design engineers"** and a **"feedback cycle from inspection stage back to design."**
- The standards that carry associativity downstream are named: **STEP (ISO 10303)** for product data, **PMI within STEP** for design intent, and **QIF (Quality Information Framework)** for inspection data.

**Design implication for cad-fusion-live:** *associativity is not just intra-model* (parameter -> geometry -> drawing). It extends along the digital thread to CAM and inspection — so a live-session change in the parametric model is, in principle, an event that should ripple to toolpaths and CMM plans. The galaxy's associativity model should be designed to emit STEP/PMI-carrying outputs (delegating the STEP-AP242 emit detail to the cad galaxy) so downstream consumers stay associated.

## 7. The kernel underneath — pointer to the cad galaxy (do NOT re-derive here)

The live-session workflow above rides on a geometric modeling kernel. **CONFIRMED** facts kept brief because the *math* belongs to [`cad-foundations.md`](../cad/cad-foundations.md):

- A **kernel** like Parasolid is **"a geometric modeling kernel ... now owned and developed by Siemens Digital Industries Software"** providing **"Boolean modeling operators, feature modeling support, advanced surfacing, thickening and hollowing, blending and filleting"**; it is integrated into SolidWorks, Siemens NX, Solid Edge, Onshape, Mastercam and others. [src: [Wikipedia "Parasolid"](https://en.wikipedia.org/wiki/Parasolid)]
- **Boundary representation (B-rep)** is the result form: **"a method for representing a 3D shape by defining the limits of its volume"** via topology (faces/edges/vertices/shells/loops) + geometry. It supports **"extrusion (or sweeping), chamfer, blending, drafting, shelling, tweaking"** beyond CSG booleans. [src: [Wikipedia "Boundary representation"](https://en.wikipedia.org/wiki/Boundary_representation)]
- Freeform geometry is carried by **NURBS** — **"a mathematical model using basis splines (B-splines)"** with control points, weights and knot vectors; they **"can represent any conic section — including the circle — exactly"** and are part of IGES, STEP, ACIS, PHIGS. [src: [Wikipedia "Non-uniform rational B-spline"](https://en.wikipedia.org/wiki/Non-uniform_rational_B-spline)]

> These are intentionally one-liners. The cad galaxy's `cad-foundations.md` owns B-rep/NURBS/CSG depth; cad-fusion-live owns the *session/history/constraint* dimension. Keep them de-duplicated.

## 8. Free courseware corpus for this galaxy

- **MIT OCW 2.158J Computational Geometry** (Patrikalakis & Maekawa, Spring 2003) — **CONFIRMED** the strongest free graduate analog: **"computational geometry with applications to computer-aided design and manufacturing,"** covering B-splines/NURBS, sweeps and generalized cylinders, offsets/blending/filleting, CSG + boundary representation + non-manifold models, **non-linear solvers and intersection problems**, feature representation and recognition, and tolerances/inspection. [src: [MIT OCW 2.158J](https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/)]
- **MIT OCW 2.158J syllabus** — **CONFIRMED** the problem-set spine that maps to this galaxy's math dependencies: **"PS2 on B-splines and NURBS: 25%", "PS3 on Blends, GCs and Intersections: 20%", "PS4 on Non-Linear Solver and Offsets: 25%", "PS5 on Solid Modeling: 15%"**; required text *Shape Interrogation for Computer Aided Design and Manufacturing*. [src: [MIT OCW 2.158J syllabus](https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/pages/syllabus/)]
- **History anchor** — **CONFIRMED** that parametric, feature-based, history-based modeling entered mainstream CAD with **"the release of Pro/ENGINEER in 1987, which heralded greater usage of feature-based modeling methods and parametric linking of the parameters of features; this marked the introduction of parametric modeling."** [src: [Wikipedia "History of CAD software"](https://en.wikipedia.org/wiki/History_of_CAD_software)]

## Owner-gate (NOT promoted — delta must verify before any engine hardcodes)

These were **not** WebFetch-confirmed to the depth needed for a doctrine constant, or rested on an access-blocked source. They stay owner-gated:

- **Direct-modeling tradeoff list** — the full "no feature tree / no design-intent capture / push-pull-only" contrast was *not* confirmable this pass (the dedicated Direct modeling reference page 404'd). Only the Parasolid kernel's confirmed *capability* (direct model editing exists alongside history) is promoted in Section 4. delta should confirm the tradeoff list against a primary CAD-vendor doc or textbook.
- **Specific mate types + their DOF removal counts** — Sections 3/5 confirm the *principle* (each mate removes DOF; 6-DOF free part) but the per-mate-type table (e.g. "coincident removes N DOF", "concentric removes M") was not fetched from a primary source. Do not hardcode a mate->DOF table without confirmation.
- **Constraint-solver iteration limits / convergence tolerances** — the *methods* (Newton-Raphson, graph decomposition) are confirmed; any numeric iteration cap or convergence epsilon is product/kernel-specific and owner-gated.
- **Kernel tolerance constants** (Parasolid linear/angular tolerances, model-unit precision) — owner-gated; pull from the kernel's own documentation, not a wiki summary.
- **Fusion-specific timeline UI behavior** (capture-design-history toggle, base-feature semantics, edit-in-place rules) — none of this was fetched from Autodesk primary docs this pass; the timeline/rollback *model* in Section 2 is grounded only on the CSG-tree re-evaluation principle. delta should confirm any product-specific claim against Autodesk's published documentation before doctrine relies on it.

## Sources

WebFetch-confirmed this pass (distinct URLs):

1. [MIT OCW 2.158J Computational Geometry — course page](https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/) — free college courseware
2. [MIT OCW 2.158J Computational Geometry — syllabus](https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/pages/syllabus/) — free college courseware
3. [NIST — Digital Thread for Smart Manufacturing](https://www.nist.gov/programs-projects/digital-thread-smart-manufacturing) — gov program page
4. [Wikipedia — Parametric design](https://en.wikipedia.org/wiki/Parametric_design)
5. [Wikipedia — Geometric constraint solving](https://en.wikipedia.org/wiki/Geometric_constraint_solving)
6. [Wikipedia — Solid modeling](https://en.wikipedia.org/wiki/Solid_modeling)
7. [Wikipedia — Constructive solid geometry](https://en.wikipedia.org/wiki/Constructive_solid_geometry)
8. [Wikipedia — Degrees of freedom (mechanics)](https://en.wikipedia.org/wiki/Degrees_of_freedom_(mechanics))
9. [Wikipedia — Assembly modelling](https://en.wikipedia.org/wiki/Assembly_modelling)
10. [Wikipedia — Parasolid](https://en.wikipedia.org/wiki/Parasolid)
11. [Wikipedia — Boundary representation](https://en.wikipedia.org/wiki/Boundary_representation)
12. [Wikipedia — Non-uniform rational B-spline](https://en.wikipedia.org/wiki/Non-uniform_rational_B-spline)
13. [Wikipedia — History of CAD software](https://en.wikipedia.org/wiki/History_of_CAD_software)

Related PRISM wiki: [`knowledge/wiki/cad/cad-foundations.md`](../cad/cad-foundations.md) (owns the B-rep/NURBS/CSG/GD&T/MBD math + standards — pointed-to, not duplicated here).
