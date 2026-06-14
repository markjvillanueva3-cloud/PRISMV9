---
title: CAD Foundations — GD&T standards, model-based definition, PMI conformance, feature-recognition theory
galaxy: cad
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); deepened by galaxy-fill-workflow (2026-06-09); second deepen pass by galaxy-fill-workflow (2026-06-10)"
verification_method: "Institutional/standards/method facts WebFetch-confirmed against accessible primary/reputable sources (Wikipedia ASME Y14.41 + Model-based definition, NIST MBE-PMI project page, Oxford Academic JCDE BRepGAT, Wikipedia STEP-NC). DEEPEN pass 1 added free-courseware + gov-program + solid-modeling-theory coverage: MIT OCW 2.158J Computational Geometry, NIST Model-Based Enterprise program page, Wikipedia Boundary representation / Constructive solid geometry / NURBS / GD&T / ISO 10303. DEEPEN pass 2 (2026-06-10) added NOT-YET-CITED free-courseware + gov-tool + standards-lineage breadth: IIT Guwahati ME 661 Computer Aided Engineering Design (Sections 10), MIT OCW 2.008 Design and Manufacturing II (Section 11), NIST STEP File Analyzer and Viewer (Section 12), Wikipedia ASME Y14.5 + NASA GSFC Engineering Drawing Standards Manual (Section 13). ISO.org + ProSTEP + NIST-PDF (binary) + NPTEL-PDF (403) + Nature were access-blocked so claims resting ONLY on those stay owner-gated. Every numeric tolerance constant + formula stays owner-gated for delta."
tags: [cad, gdt, asme-y14-5, asme-y14-41, iso-16792, model-based-definition, mbd, pmi, step-ap242, feature-recognition, nist-conformance]
---

# CAD Foundations

The domain-knowledge spine for the **cad** galaxy: the geometric-dimensioning, model-based-definition, PMI-conformance, and feature-recognition theory that underpins print-to-program. Promoted from the deep-domain research packet (`knowledge/wiki/cad/_staging/deep-domain-research-2026-06-09.md`) after papa WebFetch-confirmed the institutional/method facts against accessible primary/reputable sources.

**What is promoted here is WebFetch-CONFIRMED** (marked CONFIRMED with the source link). **Numeric tolerance constants, formulas, and any claim that rested only on an access-blocked source stay in `_staging/` as owner-gated** (see the Owner-gate section) for delta to confirm against the normative standard text before any cad engine/doctrine hardcodes them.

---

## 1. Model-Based Definition (MBD) — the governing standards

**CONFIRMED** against [Wikipedia "ASME Y14.41"](https://en.wikipedia.org/wiki/ASME_Y14.41) and [Wikipedia "Model-based definition"](https://en.wikipedia.org/wiki/Model-based_definition):

- **ASME Y14.41** was first issued **2003-08-15** as ASME Y14.41-2003 ("Digital Product Definition Data Practices"), reorganized/revised in **2012**, and most recently revised **2019** (ASME Y14.41-2019). It establishes requirements for preparing digital product definition data (model-based definition) in CAD software and the 3D model.
- **ASME Y14.41 served as the basis for the international standard ISO 16792:2006** ("Technical product documentation — Digital product definition data practices"), which shares many similarities with the ASME standard.
- **MBD embeds PMI directly in the 3D model** — modern 3D CAD applications allow inserting dimensions, GD&T, notes, materials, BOM, and design intent into the 3D digital data set, which "may contain enough information to manufacture and inspect product without the need for engineering drawings."

**Design implication for cad:** the `CADDrawingKnowledgeEngine` / `CADAccuracyValidatorEngine` path should treat the 3D model + embedded PMI (not a 2D drawing) as the authoritative definition, and target Y14.41 / ISO 16792 conformance for any digital-product-definition output.

## 2. Representation vs presentation PMI — NIST conformance testing

**CONFIRMED** against [NIST "MBE PMI Validation and Conformance Testing Project"](https://www.nist.gov/ctl/smart-connected-systems-division/smart-connected-manufacturing-systems-group/mbe-pmi-validation):

- NIST built a **test system to evaluate how well CAD software conforms to ASME standards for PMI**, particularly GD&T.
- The page distinguishes the two PMI forms (the critical digital-thread distinction):
  - **Representation (semantic) PMI** is machine-processable — "the engineering application software can process the PMI directly," enabling automation of design (CAD), manufacturing (CAM), and inspection (CMM) functions.
  - **Presentation (graphical) PMI** consists of geometric elements preserving the exact appearance of the annotations and is meant to be **human-readable**.
- The project derives **test cases from ASME Y14.5 and Y14.41**, builds test CAD models in multiple CAD systems, and produces **derivative STEP, JT, and 3D-PDF files** plus validation reports — all downloadable for testing model-based design/engineering workflows.

**Design implication for cad:** a STEP emitter (delta's `cad-step-ap242-emitter.mjs`) that claims MBD support must carry **semantic/representation PMI**, not just graphical annotations — and the NIST downloadable test cases are a ready conformance gate for `CADAccuracyValidatorEngine`.

## 3. STEP AP242 — tolerance / PMI capability (partial confirmation)

**CONFIRMED (supporting)** against [Wikipedia "STEP-NC"](https://en.wikipedia.org/wiki/STEP-NC):

- **AP242 introduced geometry, tolerance, and kinematics improvements** that were subsequently incorporated into AP238's third edition (2022) for model-based integrated manufacturing. This corroborates AP242's role as the tolerance/PMI-carrying neutral exchange protocol.
- The NIST MBE-PMI project (Section 2 above) independently confirms STEP is a target derivative format for semantic PMI exchange.

**Owner-gated (NOT confirmed here):** the specific claim that AP242 *merges* legacy AP203 + AP214, the edition/page-count specifics, and the AIM/Domain-Model exchange detail rested only on ISO.org (HTTP 403) and the ProSTEP fact-sheet PDF (binary, unparseable) — left in `_staging/` for delta.

## 4. Feature-recognition theory — the CAD->CAM bridge

**CONFIRMED** against [Oxford Academic, JCDE — "BRepGAT: Graph neural network to segment machining feature faces in a B-rep model"](https://academic.oup.com/jcde/article/10/6/2384/7453688):

- **Conventional machining-feature recognition divides into four families:** "graph-based, volume decomposition, hint-based, and similarity-based approaches."
- **B-rep models carry shape but not feature intent** — they "are advantageous for visualizing 3D product shape" but "have the drawback of lacking machining feature information within the model, which is necessary for computer-aided manufacturing (CAM) systems," so machining features must be recovered.
- **The deep-learning shift:** methods operating **directly on the B-rep** avoid the **information loss** that comes from converting CAD models to voxels / point clouds (which "causes decreased recognition accuracy"). BRepGAT is a graph-attention network segmenting feature faces on the native B-rep.

**Design implication for cad:** `CADFeatureRecognitionEngine` recovers machining features from a shape-only B-rep — and a GNN-on-B-rep approach (aligning with PRISM's NN-graph tier-5 substrate) is the resolution-preserving path vs voxel/point-cloud conversion.

---

# DEEPEN PASS (2026-06-09) — free-courseware, gov-program, and solid-modeling-theory breadth

The sections below were added in a deepening pass that reached for the source categories the original packet had not used: a **free MIT graduate course** (MIT OpenCourseWare), a **U.S. government program page** (NIST Model-Based Enterprise), and the **foundational solid-modeling / curve-math / GD&T theory** that underpins every CAD kernel. Each claim is WebFetch-CONFIRMED against the linked source; numeric tolerance constants and formulas remain owner-gated for delta.

## 5. Solid-modeling representations — B-rep vs CSG (the two kernel paradigms)

**CONFIRMED** against [Wikipedia "Boundary representation"](https://en.wikipedia.org/wiki/Boundary_representation) and [Wikipedia "Constructive solid geometry"](https://en.wikipedia.org/wiki/Constructive_solid_geometry):

- **Boundary representation (B-rep)** is "a method for representing a 3D shape by defining the limits of its volume" — a solid is interconnected surface elements marking the boundary between interior and exterior points. It separates **topology** (faces, edges, vertices, shells, loops, and winged-edge / half-edge links) from **geometry** (the surfaces, curves, and points those topological elements reference).
- **B-rep history is independent dual-origin:** Ian C. Braid (Cambridge) and Bruce G. Baumgart (Stanford) independently developed early B-rep methods in the **early 1970s**; later contributors include Martti Mantyla (who built GWB). Commercial kernels **Parasolid and ACIS** became foundational for modern CAD — relevant because PRISM's CAD galaxy interoperates with files those kernels emit.
- **Constructive solid geometry (CSG)** "allows a modeler to create a complex surface or object by using Boolean operators to combine simpler objects" — primitives (cuboids, cylinders, prisms, pyramids, spheres, cones) combined via **union (OR), intersection (AND), and difference (NOT)**. A CSG model is a **binary tree** where leaf nodes are primitives and internal nodes are Boolean operations.
- **The watertight guarantee:** CSG "ensures objects are solid or water-tight if all primitives are water-tight" and "easily classifies points as inside or outside the resulting shape." B-rep extends beyond Booleans with "extrusion (or sweeping), chamfer, blending, drafting, shelling, tweaking and other operations."

**Design implication for cad:** the CAD galaxy's geometry layer must handle BOTH paradigms — a feature-recognition pass operates on the explicit faces/edges of a **B-rep**, while a parametric/procedural generator (electrode/trilobe gen) is naturally a **CSG tree**. The in/out point-classification CSG guarantees is the cheap robustness check before any toolpath consumes the solid.

## 6. NURBS — the exact-conic curve/surface math behind CAD

**CONFIRMED** against [Wikipedia "Non-uniform rational B-spline"](https://en.wikipedia.org/wiki/Non-uniform_rational_B-spline):

- **NURBS** (non-uniform rational basis spline) is "a mathematical model using basis splines (B-splines) ... commonly used in computer graphics for representing curves and surfaces," and is used extensively in "computer-aided design (CAD), manufacturing (CAM), and engineering (CAE)."
- A NURBS curve is defined by four elements: **order/degree** (cubic is the most common), **control points** (which determine the shape), **weights** (one scalar per control point — "the term *rational* in NURBS refers to these weights"), and a **knot vector** (the parameter sequence that determines where/how control points affect the curve).
- **The exact-conic capability** is the load-bearing CAD property: "Rational splines can represent any conic section — including the circle — exactly," whereas "non-rational splines or Bezier curves may approximate a circle, but they cannot represent it exactly."
- **NURBS is embedded in the exchange standards** — it is part of **IGES, STEP, ACIS, and PHIGS** industry standards, tying directly to Section 3's AP242 PMI/geometry exchange.

**Design implication for cad:** any CAD reader/writer that round-trips circles, arcs, fillets, or revolved features must preserve the **rational weights**, not just control points — dropping a weight silently turns an exact circle into a polynomial approximation (a tolerance-leak class of error for a galaxy feeding collision clearance). The weight is where exactness lives.

## 7. GD&T tolerance taxonomy — the five geometric-control categories

**CONFIRMED** against [Wikipedia "Geometric dimensioning and tolerancing"](https://en.wikipedia.org/wiki/Geometric_dimensioning_and_tolerancing):

- **GD&T** is "a system for defining and communicating engineering tolerances via a symbolic language on engineering drawings and computer-generated 3D models," describing permissible variation in size, form, orientation, and location of features.
- **Standards split confirmed:** **ASME Y14.5** "provides a fairly complete set of rules for GD&T in one document," whereas **ISO** geometrical-tolerancing standards (notably **ISO 1101**) "typically only address a single topic at a time" — i.e. the ASME-single-document vs ISO-GPS-many-parts structural difference is a real, cited distinction (corroborates Section 1's Y14.41/ISO 16792 lineage).
- **A datum** is "a theoretically exact plane, line, point, or axis"; the **datum reference frame** describes "how the part fits or functions."
- **The five categories of geometric tolerance** (cited taxonomy): **Form** (straightness, flatness, circularity, cylindricity), **Orientation** (perpendicularity, angularity, parallelism), **Location** (symmetry, position, concentricity), **Profile** (line and surface), and **Runout** (circular and total).
- **The feature control frame (FCF)** is "the rectangular box on drawings containing the type of geometric control, tolerance value, modifier(s) and/or datum(s) relevant to the feature."

**Design implication for cad:** a PMI extractor must classify each callout into one of these five families to drive the right downstream check — a **runout** callout implies a rotational inspection routine, a **profile** callout a surface-deviation scan; mis-binning the category sends the wrong inspection plan to the CMM. (The numeric zone values, MMC bonus math, and DOF-per-datum breakdown stay owner-gated — see Owner-gate.)

## 8. STEP / ISO 10303 — AP242 merger now PRIMARY-confirmed

**CONFIRMED** against [Wikipedia "ISO 10303"](https://en.wikipedia.org/wiki/ISO_10303):

- **ISO 10303 (STEP, "Standard for the Exchange of Product model data")** is "a family of ISO standards for computer-interpretable representation (description) and exchange of product manufacturing information (PMI)," providing CAD interoperability and "long-term archival of 3D, CAD and PDM data." It is "subdivided into approximately 700 underlying standards total."
- **Application Protocols (APs)** "give information for [the standard's] practical implementation in specific contexts" and "describe scope, functional requirements, definitions requirements, and levels of conformance."
- **AP242 is "Managed model based 3d engineering"** and was "created by merging the following two Application protocols": **AP 203 (Configuration controlled 3D designs)** and **AP 214 (Core data for automotive mechanical design processes)**. AP242 edition 1 "also contains extensions and significant updates for Geometric dimensioning and tolerancing, Kinematics, [and] Tessellation."

**Promotion note:** the **AP242 = AP203 + AP214 merger** claim was OWNER-GATED in the original packet (it rested only on ISO.org, which returned HTTP 403). It is now **PRIMARY-confirmed by an accessible source** and promoted here. The specific **edition/page-count** for AP242 (e.g. "Ed.4 = ISO 10303-242:2025, 64 pages") remains owner-gated — Wikipedia confirms the merger and the GD&T/Kinematics/Tessellation extensions, not the page count.

## 9. Institutional grounding — MIT OCW + NIST MBE program (the free-source spine)

**CONFIRMED** against [MIT OpenCourseWare "2.158J Computational Geometry, Spring 2003"](https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/) and [NIST "Model-Based Enterprise Program"](https://www.nist.gov/programs-projects/model-based-enterprise-program):

- **MIT OCW 2.158J Computational Geometry** is a **graduate** course offered jointly by MIT Mechanical Engineering, Civil & Environmental Engineering, and Aeronautics & Astronautics. Its surface-modeling syllabus explicitly covers "b-splines, non-uniform rational b-splines, physically based deformable surfaces, sweeps and generalized cylinders, offsets, blending and filleting surfaces," plus solid-modeling approaches — "constructive solid geometry, boundary representation, non-manifold and mixed-dimension boundary representation models, octrees" — and "tolerances, inspection methods, feature representation and recognition" for "shape interrogation for design, analysis, and manufacturing." This is the **free college-course corpus** that independently grounds Sections 4-7 (every representation paradigm and the feature-recognition framing in one MIT graduate syllabus).
- **NIST's Model-Based Enterprise (MBE) program** aims to let manufacturers "integrate system, service, product, process, and logistics models across the manufacturing enterprise," and states that "both distributed and federated systems can be integrated using the **digital thread** to form a model-based enterprise." It develops "advances in standards, test methods, and measurement science" and references "3D model-based product definition standards" as key to product quality — the gov-program framing under which the Section 2 NIST PMI conformance-testing work sits.

**Design implication for cad:** the MIT 2.158J syllabus is a free, citable curriculum scaffold for the academy galaxy's CAD-geometry track, and the NIST MBE program page is the policy/standards umbrella that motivates PRISM treating the 3D model + semantic PMI (not a 2D drawing) as the authoritative product definition (Sections 1-2).

---

# DEEPEN PASS 2 (2026-06-10) — second-pass breadth from NOT-YET-CITED free courseware + gov tooling + standards-lineage sources

The sections below were added in a SECOND deepening pass. Every source here is **distinct from the Sources list above** (no URL re-cited). The pass reached for: another **MIT OpenCourseWare undergraduate course** (2.008), an **Indian-Institute-of-Technology graduate course page** (IIT Guwahati ME 661, the NPTEL/IIT open-courseware family), a **U.S. government conformance tool** (NIST STEP File Analyzer and Viewer), the **dedicated ASME Y14.5 standards-lineage article**, and a **NASA gov drawing standard** (GSFC). Each claim is WebFetch-CONFIRMED against the linked source; all numeric tolerance constants, zone values, and formulas remain owner-gated for delta.

## 10. Geometric-modeling curriculum — the curve / surface / solid trinity (IIT graduate courseware)

**CONFIRMED** against [IIT Guwahati ME 661 "Computer Aided Engineering Design"](https://iitg.ac.in/mech/academics/pg-courses-electives/latest/computer-aided-engineering-design/):

- This graduate CAD course's syllabus lays out the **three-tier geometric-modeling stack** that every CAD kernel implements, with the classical named formulations for each tier:
  - **Parametric curves:** "Differential geometry of curves, Hermite (PC), Bezier and B-Spline curves" — i.e. the Hermite (piecewise-cubic), Bezier, and B-Spline families are the canonical curve representations (NURBS, Section 6, is the rational generalization of B-Spline).
  - **Parametric surfaces:** "Differential geometry of surfaces, differential geometry of ruled and developable surfaces, Ferguson, Coon's, Bezier and B-Spline surface patches, sweep and cylindrical surfaces, composite surface" — naming the **Ferguson and Coons patch** formulations alongside Bezier/B-Spline surface patches, plus the **ruled / developable** special surfaces.
  - **Solid representation:** "Cellular decomposition models, b-rep and CSG models, parametric instancing and sweep" — independently corroborating Section 5's B-rep vs CSG paradigms AND adding **cellular decomposition** and **parametric instancing** as two further solid-modeling schemes.
- The course also lists "CG, mass & geometrical properties; Data transfer; CAD for FEA, design optimization and CAM" and emerging topics "reverse engineering and rapid manufacturing" — situating geometric modeling inside the full design→analysis→manufacture chain.
- **Classic citable references** named: Rogers & Adams *Mathematical Elements of Computer Graphics* (McGraw Hill, 2nd ed. 1990); Mortenson *Geometric Modeling* (Wiley, 1985) and *Mathematics for Computer Graphics Applications* (Industrial Press, 2nd ed. 1999); Lee *Principles of CAD/CAM/CAE systems* (Addison Wesley, 1999).

**Design implication for cad:** when `CADFeatureRecognitionEngine` or an electrode/trilobe generator emits geometry, it lives somewhere in this curve/surface/solid trinity — a fillet is a B-Spline-or-NURBS surface, a swept boss is a sweep solid, a Boolean cut is a CSG node. Tagging each generated feature with its **modeling scheme** (Hermite/Bezier/B-Spline curve · Ferguson/Coons/Bezier/B-Spline patch · b-rep/CSG/cellular/instancing solid) is the vocabulary a downstream CAM consumer needs, and these classic texts are the citable derivation source (vs a vendor blog) for the academy galaxy's CAD-math track.

## 11. Manufacturing-process grounding — design for a stochastic process (MIT OCW undergraduate)

**CONFIRMED** against [MIT OpenCourseWare "2.008 Design and Manufacturing II" (course page via OCW mirror)](https://opencw.aprende.org/courses/mechanical-engineering/2-008-design-and-manufacturing-ii-spring-2003/):

- MIT 2.008 (a mechanical-engineering course taught by David Dow, Emanuel Sachs, Jung-Hoon Chun, Patrick McAtamney, and Sanjay Sarma) is framed around the **"physics and stochastic nature of manufacturing processes and systems, and their effects on quality, rate, cost, and flexibility."** Its scope: "Integration of design, engineering, and management disciplines and practices for analysis and design of manufacturing enterprises," covering "process physics and control, design for manufacturing, and manufacturing systems," plus a group project "design and fabrication of parts using mass-production and assembly methods."
- The load-bearing teaching point for a CAD galaxy: a part is not made to its nominal CAD geometry — it is made by a **stochastic process** whose variation must be designed around. That is precisely why GD&T (Section 7) exists: a tolerance zone is the design's contract with process variation.

**Design implication for cad:** the CAD model's tolerances are the interface to a stochastic manufacturing reality — so a feature-recognition / DFM pass should not treat a dimension as an exact value but as a nominal-plus-zone that a real process must hit. This grounds PRISM's `cad-dfm` path: design-for-manufacturing is the discipline of choosing geometry and tolerances a stochastic process can economically achieve, and MIT 2.008 is the free-courseware anchor for that framing.

## 12. PMI conformance tooling — the NIST STEP File Analyzer (a ready gov conformance gate)

**CONFIRMED** against [NIST "STEP File Analyzer and Viewer"](https://www.nist.gov/services-resources/software/step-file-analyzer-and-viewer):

- NIST's **STEP File Analyzer and Viewer (SFA)** "generates a spreadsheet of all entity and attribute information," "reports and analyzes any semantic PMI, graphic PMI, and validation properties for conformance to recommended practices," and "checks for basic STEP file format errors." The companion **STEP File Viewer** "displays many features of a STEP file in a web browser."
- **The conformance target is the CAx-IF recommended practices** — the SFA checks semantic-PMI / presentation-PMI / validation-properties against the CAx Implementor Forum recommended practices (the industry interoperability spec layer that sits on top of the ISO 10303 application protocols).
- **Application-protocol coverage confirmed:** the tool "supports AP242, AP203, AP214, and other STEP formats including AP238, AP209, AP239, and AP210." This is the broadest AP-coverage statement in this entry and directly extends Sections 2–3 and 8 (AP242 semantic PMI exchange) with a concrete, downloadable, government-provided conformance instrument.

**Design implication for cad:** delta's `cad-step-ap242-emitter.mjs` + `CADAccuracyValidatorEngine` now have a **named, free, gov-grade conformance harness** — running emitted STEP through the NIST SFA validates that the carried PMI is semantic (machine-processable) and conforms to CAx-IF practice, not merely graphical. The SFA's red-flag of nonconformant entities is exactly the gate that catches a "graphical-only PMI masquerading as MBD" defect before it reaches CAM/CMM.

## 13. Standards lineage — ASME Y14.5 and the NASA gov drawing standard

**CONFIRMED** against [Wikipedia "ASME Y14.5"](https://en.wikipedia.org/wiki/ASME_Y14.5) and the [NASA Engineering Drawing Standards Manual (GSFC)](https://www.engineersedge.com/drafting/nasa_engineering_drawing_standards_manual_15265.htm):

- **ASME Y14.5** "establish[es] rules, symbols, definitions, requirements, defaults, and recommended practices for stating and interpreting geometric dimensioning and tolerancing (GD&T)" and "contains 15 sections which cover symbols and datums as well as tolerances of form, orientation, position, profile and runout" — independently corroborating Section 7's five-category taxonomy (form / orientation / location / profile / runout) AND pinning the document structure at 15 sections.
- **Lineage / revision cadence:** ASME/ANSI "issued the first version in 1973," the most recent edition is **2018** (succeeding 2009), and the standard "traces its roots to the military standard MIL-STD-8 published in 1949," with **MIL-STD-8A (1953)** introducing "the concept of modern GD&T 'Rule 1'." (Note: the dedicated ASME Y14.5 article does NOT assert the 1982 edition was "the first to fully incorporate GD&T" — that secondary claim stays out.)
- **Government adoption (NASA):** the **NASA Engineering Drawing Standards Manual**, from NASA's Mechanical Engineering Branch at **Goddard Space Flight Center (GSFC)**, does NOT reinvent GD&T — it requires that "persons engaged in the preparation of drawings shall have a thorough understanding of the fundamentals of drafting and geometrical dimensioning and tolerancing (in accordance with ANSI Y14.5M-1982...)." It is "generally in accordance with the Department of Defense and industry practices and procedures" but "does contain specific differences and exceptions to Engineering Drawing Practices, MIL-STD-100E," and covers dimensioning/tolerancing practices, metric/SI dimensioning and conversions, surface-texture control, thread and welding specifications.

**Design implication for cad:** ASME Y14.5 is the **interpretation authority** every PMI extractor must conform to (it defines the symbols, defaults, and Rule 1 a feature-control-frame parser relies on), and the NASA GSFC manual is a concrete demonstration of the institutional pattern PRISM should follow — **defer to the normative GD&T standard, layer shop/center-specific exceptions on top, never fork the GD&T rules**. The MIL-STD-8 (1949) → MIL-STD-8A "Rule 1" (1953) → ANSI/ASME Y14.5 lineage is the citable history behind why Rule 1 (the envelope principle) is a default a CAD interpreter must assume unless overridden.

---

## Owner-gate (NOT promoted — left UNVERIFIED in _staging for delta)

The following stay owner-gated in `knowledge/wiki/cad/_staging/deep-domain-research-2026-06-09.md` because the source was access-blocked, the claim is numeric/safety-relevant, or the specific attribution diverged from what an accessible source confirmed. delta must check each against the **normative standard text** before any cad engine hardcodes it:

- **All ASME Y14.5 page counts + section counts** (e.g. "Y14.5-2018 = 326 pages, ~15 sections") — sourced from GD&T secondary blogs; verify against the standard's table of contents.
- **ISO 1101:2017 edition/replacement specifics** ("4th edition, cancels/replaces ISO 1101:2012, ISO/TC 213") — **ISO.org returned HTTP 403** so this could not be primary-confirmed; do not promote until checked against the ISO listing or the standard cover.
- **STEP AP242 edition/page count** ("Ed.4 = ISO 10303-242:2025, 64 pages") — ISO.org 403 + ProSTEP fact-sheet PDF unparseable; the page count is NOT confirmed. **(UPDATE 2026-06-09 DEEPEN pass: the AP242 = AP203 + AP214 *merger* itself is now PRIMARY-confirmed via Wikipedia "ISO 10303" — promoted to Section 8 above; only the edition/page-count remains gated.)**
- **All MMC / bonus-tolerance / virtual-condition FORMULAS and numeric examples** (`Bonus = |MMC - actual|`; `VC = MMC +/- geometric tolerance`; the 0.270"/0.010"/0.280" gauge example; pin-gauge sizing) — numeric/safety-relevant; gauge-sizing direction errors are scrap/crash class. Verify against Y14.5 directly.
- **Tolerance stack-up formulas + rules of thumb** (`WC = sum|tol|`; `RSS = sqrt(sum tol^2)`; "RSS reduces stack by ~sqrt(n)"; "+/-3 sigma = 99.7%"; "~50% reduction for 4 components") — numeric; the +/-3-sigma and sqrt(n) heuristics carry distribution assumptions delta must validate before any stack-up engine relies on them.
- **The specific historical AFR attributions** (Joshi -> AAG, Woo -> Alternating Sum of Volumes, Vandenbrande & Requicha -> hint-based) — the cited Nature paper was behind an auth wall (303 to idp.nature.com), and the accessible JCDE source attributes graph-based methods to **Elinson et al. (1997)**, NOT Joshi/Chang. The four-family *taxonomy* is confirmed (Section 4); the named-author attributions are NOT — verify against the primary reference lists.
- **Feature Control Frame symbol order + zone semantics, DRF degree-of-freedom breakdown (primary=3/secondary=2/tertiary=1), and the MMC-cannot-apply-to-profile caveat** — drawn from secondary GD&T blogs that "do not give the DOF breakdown"; verify against Y14.5 sections.

Why gated, in one line: **a small honestly-VERIFIED institutional/method set beats a large unverified one** (R12). Numeric GD&T/tolerance constants are scrap/crash-class for a galaxy that feeds collision clearance — they must come from the normative standard, not a blog.

## Sources (WebFetch-confirmed by papa, 2026-06-09)

- Wikipedia — "ASME Y14.41" — https://en.wikipedia.org/wiki/ASME_Y14.41
- Wikipedia — "Model-based definition" — https://en.wikipedia.org/wiki/Model-based_definition
- NIST — "MBE PMI Validation and Conformance Testing Project" — https://www.nist.gov/ctl/smart-connected-systems-division/smart-connected-manufacturing-systems-group/mbe-pmi-validation
- Oxford Academic, JCDE — "BRepGAT: Graph neural network to segment machining feature faces in a B-rep model" — https://academic.oup.com/jcde/article/10/6/2384/7453688
- Wikipedia — "STEP-NC" (supporting, AP242 tolerance/kinematics improvements) — https://en.wikipedia.org/wiki/STEP-NC

### DEEPEN pass — free-courseware, gov-program, and solid-modeling-theory sources (WebFetch-confirmed 2026-06-09)

- MIT OpenCourseWare — "2.158J Computational Geometry, Spring 2003" (free graduate course; B-splines/NURBS/CSG/B-rep/feature-recognition syllabus) — https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/
- NIST — "Model-Based Enterprise Program" (U.S. gov program; digital thread, 3D model-based product definition) — https://www.nist.gov/programs-projects/model-based-enterprise-program
- Wikipedia — "Boundary representation" (B-rep topology/geometry split, winged-edge, Braid/Baumgart history, Parasolid/ACIS) — https://en.wikipedia.org/wiki/Boundary_representation
- Wikipedia — "Constructive solid geometry" (Boolean union/intersection/difference, CSG tree, watertight guarantee) — https://en.wikipedia.org/wiki/Constructive_solid_geometry
- Wikipedia — "Non-uniform rational B-spline" (control points/weights/knots/degree, exact conic representation, IGES/STEP embedding) — https://en.wikipedia.org/wiki/Non-uniform_rational_B-spline
- Wikipedia — "Geometric dimensioning and tolerancing" (five tolerance categories, datums, feature control frame, ASME-vs-ISO structure) — https://en.wikipedia.org/wiki/Geometric_dimensioning_and_tolerancing
- Wikipedia — "ISO 10303" (STEP family, application protocols, AP242 = AP203 + AP214 merger PRIMARY-confirmed) — https://en.wikipedia.org/wiki/ISO_10303

### DEEPEN PASS 2 — second-pass NOT-YET-CITED free-courseware / gov-tool / standards-lineage sources (WebFetch-confirmed 2026-06-10)

- IIT Guwahati — ME 661 "Computer Aided Engineering Design" (free graduate courseware; Hermite/Bezier/B-Spline curves, Ferguson/Coons surface patches, cellular-decomposition/b-rep/CSG/parametric-instancing solids, classic geometric-modeling texts) — https://iitg.ac.in/mech/academics/pg-courses-electives/latest/computer-aided-engineering-design/
- MIT OpenCourseWare — "2.008 Design and Manufacturing II" (free undergraduate course; physics + stochastic nature of manufacturing processes, design-for-manufacturing, process control) — https://opencw.aprende.org/courses/mechanical-engineering/2-008-design-and-manufacturing-ii-spring-2003/
- NIST — "STEP File Analyzer and Viewer" (U.S. gov conformance tool; semantic vs graphic PMI + validation properties, CAx-IF recommended practices, AP242/AP203/AP214/AP238/AP209/AP239/AP210 coverage, format-error checks) — https://www.nist.gov/services-resources/software/step-file-analyzer-and-viewer
- Wikipedia — "ASME Y14.5" (15 sections; 1973 first / 2018 latest; MIL-STD-8 1949 → MIL-STD-8A 1953 Rule 1 lineage) — https://en.wikipedia.org/wiki/ASME_Y14.5
- NASA Engineering Drawing Standards Manual (Goddard Space Flight Center; defers to ANSI Y14.5M-1982, MIL-STD-100E exceptions, metric/SI + surface-texture + thread + welding coverage) — https://www.engineersedge.com/drafting/nasa_engineering_drawing_standards_manual_15265.htm

## Cross-refs

- Staging packet (owner-gated remainder): `knowledge/wiki/cad/_staging/deep-domain-research-2026-06-09.md`
- Galaxy doctrine: `mcp-server/src/engines/cad/CLAUDE.md` (§5 cad-specific gotchas, §6 tribal pointers)
- Galaxy memory: `mcp-server/src/engines/cad/MEMORY.md` (Authoritative free-source corpus block)
- Sibling exemplar: `knowledge/wiki/academy/academy-pedagogy-foundations.md` (same promotion pattern)
- Tribal: `knowledge/wiki/code-tribal/math-cad-geometry-nurbs-gdt.md`
