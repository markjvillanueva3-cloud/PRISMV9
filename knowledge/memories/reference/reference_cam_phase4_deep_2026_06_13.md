---
name: reference_cam_phase4_deep_2026_06_13
description: "CAM galaxy (kilo) Phase-4 deep anchor — Hermes-planned, R12-tempered. Four deeper sub-domains: (1) exact 5-axis flank milling of ruled/developable surfaces with conical/barrel tools (envelope surface math, Bedi/Mann series, Lartigue CIRP); (2) C-space medial-axis obstacle representation for global collision-free toolpath (Minkowski sum + MAT, Yang/Abdel-Malek CAD 2006); (3) higher-order feedrate scheduling under kinematic+dynamic constraints (quintic/septic profiles, Altintas/Erkorkmaz CIRP 2003, Sencer/Altintas ASME 2011); (4) analytic trochoidal toolpath for arbitrary pockets via Minkowski-sum + bisector geometry (Held CAD 2011). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.504Z
aliases: reference_cam_phase4_deep_2026_06_13
---


**Context:** Phase-4 anchor for the CAM galaxy (kilo). Deepens
[[reference_cam_phase3_global_gougefree_5axis_2026_06_13]] (Phase-3 — C-space feasibility regions,
smooth tool-axis fields, vendor kernel synthesis) and
[[reference_cam_adaptive_collision_vendorapi_2026_06_13]] (Phase-2 — adaptive roughing, taxonomy,
gouge/collision fundamentals, vendor APIs). Planned by the **Hermes bridge** (xAI Grok, :8645),
R12-tempered for source verifiability.

---

## 1. Exact 5-axis flank milling of ruled/developable surfaces (conical/barrel tools)

**The gap in Phase-2/3:** Both earlier anchors cover POINT-contact (ball/end mill, tip at contact
point). Flank milling is the complementary LINE-contact paradigm: the SIDE of a conical or barrel
tool is tangent to the surface along a ruling — the entire flute length cuts simultaneously.

**Mathematical model:** The tool is modeled as a moving conical frustum (or toroidal barrel). At
each position along the toolpath, the tangency condition requires:
- The tool surface normal = design surface normal at every point of the contact ruling.
- The tool axis lies in the osculating plane of the ruling.

This yields a system of polynomial equations (degree 5–7 in the motion parameters), solved to find
the exact 5-axis tool orientation that makes the conical envelope tangent to the ruled surface.
Key concept: the **envelope surface** of the moving tool family — the swept solid boundary — must
match the part surface exactly along the ruling. Deviations from ruling-developability produce
"flank error" (the generatrix is not a straight line on the part), requiring correction via
axis-tilt optimization.

**Canonical sources (R12: real researchers, publication venues confirmed by domain knowledge):**
- Bedi, S., Mann, S., Menzel, C. — series on flank milling with toroidal/conical tools,
  International Journal of Machine Tools and Manufacture (IJMTM), 2003–2005. Bedi is a real
  University of Waterloo CAM researcher; the series is real.
- Lartigue, C., Duc, E., Affouard, A. — "Tool path computation for conical side milling of
  free-form surfaces," CIRP Annals, early 2000s. Lartigue (LURPA, ENS Cachan) is the canonical
  French-school authority on flank milling errors. [Exact year/volume: web-verify target.]
- Chiou, C.J., Lee, Y.S. — "Swept surface determination for five-axis numerical control machining"
  (IJMTM, 2002) — foundational swept-envelope formulation.

**Standard:** ISO 14649-12 covers STEP-NC flank milling operation entities (part of the ISO 14649
STEP-NC family; existence confirmed, specific clause scope: web-verify target).

**What it unlocks for PRISM kilo:**
- One-pass semi-finish/finish of integrally bladed rotors (IBRs), impellers, and ruled turbine
  vanes with conical barrel tools — replacing 30–50 ball-nose finishing passes. The impeller STEP
  files in `H:/PRISM/resources/CAD FILES/` (blisk.stp, Impeller turbine.stp) are the test geometry.
- Enables PRISM's `cam_strategy_recommend` to distinguish flank-milling-eligible features
  (ruled/near-ruled surfaces) vs point-contact-only surfaces, routing to the correct toolpath type.

---

## 2. C-space Medial-Axis Transform (MAT) of the C-obstacle for global collision-free 5-axis planning

**The gap in Phase-3:** Phase-3 introduced C-space feasibility regions (per-point lead/tilt cones).
This sub-domain deepens it to a GLOBAL path planning method: representing the entire collision-free
region in C-space as a geometric object (the complement of the C-obstacle), then extracting its
medial axis as a "skeleton" for path planning — the path follows Voronoi edges in C-space,
maximizing clearance from all obstacles.

**Mathematical model:**
1. Expand each obstacle (workpiece + fixture face) by the Minkowski sum with the tool/holder geometry
   to get the **C-obstacle** in (3T × 2R) configuration space.
2. Compute the **Medial Axis Transform (MAT)** of the FREE C-space (complement of C-obstacle union):
   the locus of C-space points equidistant from 2+ obstacle boundaries.
3. Route the 5-axis toolpath along or near the MAT — guaranteeing maximum collision clearance, with
   smooth tool-axis variation (the skeleton is inherently smooth away from bifurcations).

**Key distinction from Phase-3:** Phase-3's per-point feasibility cones must be "connected" into a
globally smooth path. The MAT approach gives a global path skeleton that is ALREADY guaranteed
collision-free, eliminating the smoothing step as a separate optimization.

**Canonical sources:**
- Yang, J., Abdel-Malek, K. — "Configuration-space based medial axis transform for 5-axis NC
  machining," Computer-Aided Design (Elsevier), cited as ~2006. Abdel-Malek (University of Iowa,
  Virtual Soldier Research Program) published extensively on C-space kinematics. [Exact vol/page:
  web-verify target.]
- Choi, B.K., Ko, K. — C-space clearance methods, CIRP Annals / CAD, early 2000s. Choi is the
  canonical Korean author on sculptured-surface CAM (same Choi as Choi-Jerard).
- Foundational MAT theory: Blum, H. — "A transformation for extracting new descriptors of shape"
  (1967, MIT Symposium on Models for Perception of Speech and Visual Form) — the original MAT paper.
  Practical polygon MAT: Lee, D.T. (1982, IEEE Trans. Computers).

**Standard:** ASME Y14.5.1M-1994 (Mathematical Definition of Dimensioning and Tolerancing) defines
tolerance zone geometry used in C-obstacle boundary construction; also Y14.5-2018 (current GD&T).
[R12 note: Hermes cited Y14.5.1M-1994 — real standard, scope confirmation: web-verify target.]

**What it unlocks:**
- Automatic global-collision-free 5-axis roughing on complex castings/forgings without user-defined
  check surfaces — the "fully automatic" mode hyperMILL advertises in its 5X Automatic strategy.
- PRISM's `collision_check_full` can embed the C-obstacle MAT as its clearance oracle rather than
  discrete point-sample checking.

---

## 3. Higher-order feedrate scheduling under combined kinematic + dynamic constraints (quintic/septic profiles)

**The gap in Phase-2/3:** Phase-2 mentioned feed-rate optimization (IPW → per-move TEA → slow/fast
feeds). This sub-domain is the FORMAL mathematical treatment: given a fixed geometric toolpath (the
path shape is already determined), compute the TIME parameterization (speed profile along the path)
that satisfies ALL of: (a) axis velocity limits, (b) axis acceleration limits, (c) axis jerk limits
(3rd derivative of position), (d) chord error (path deviation from interpolated arcs), (e) force/
chip-thickness from cutting physics.

**Mathematical model:**
- Represent the toolpath as a series of **NURBS spline segments** (positions + tool orientations).
- The feedrate schedule is a scalar function v(s) (speed vs arc-length s).
- For smooth blending at corners/transitions: use **C³ or C⁵ piecewise polynomial feedrate profiles**
  (quintic or septic polynomials) so jerk (3rd derivative of position) is bounded.
- Constraint set is a nonlinear programming problem in v(s) and the spline knots; solved by
  **Sequential Quadratic Programming (SQP)** or interior-point methods.
- The "bang-bang" (trapezoidal velocity) profile is the degenerate C¹ case; quintic gives C² axis
  motion (smooth acceleration), septic gives C³ (smooth jerk).

**Canonical sources (R12: Altintas is unambiguously real; these paper styles are authentic):**
- Altintas, Y., Erkorkmaz, K. — "Feedrate optimization for spline interpolation in high speed
  machine tools," CIRP Annals — Manufacturing Technology, Vol. 52/1 (2003), pp. 297–302. Erkorkmaz
  is a real UBC/Waterloo researcher; the paper exists and is widely cited. [Exact pagination:
  web-verify target.]
- Sencer, B., Altintas, Y., Croft, E. — "Modeling and control of contouring errors for five-axis
  machine tools — Part I: Modeling," ASME Journal of Manufacturing Science and Engineering (2009).
  The Sencer/Altintas 2011 ASME feed-scheduling paper cited by Hermes is plausible but exact
  vol/year flagged: web-verify target.
- Altintas, Y. — *Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations, and
  CNC Design*, 2nd ed. (Cambridge University Press, 2012). Chapter 5 covers spline interpolation
  and feedrate scheduling. This is the canonical textbook. ISBN 978-1-107-00148-0.

**Standard:** ISO 14649-11 covers STEP-NC feedrate optimization data model (part of ISO 14649
family; -11 is a real part covering process data). [Specific clause scope: web-verify target.]

**What it unlocks:**
- Feed profiles that run the machine at maximum capability (no conservative scalar feed override)
  while keeping contour error bounded. Enables PRISM's speed-feed layer (oscar) to output not just
  a scalar feed per operation but a per-move feedrate schedule along the toolpath spline.
- Direct integration with the post-processor (echo): the CNC controller's feedrate mode (G93/G94,
  inverse-time vs feed-per-minute) must match the scheduled profile.
- Physics note: chip-thickness constraint links to Kienzle force model (import from
  `src/physics/constants.ts` — never inline kc1.1 values).

---

## 4. Analytic trochoidal toolpath for arbitrary non-convex pockets via Minkowski sum + bisector geometry

**The gap in Phase-2:** Phase-2 described trochoidal transitions as a concept (circular arcs in
corners for constant engagement). This sub-domain is the FORMAL geometric construction for generating
exact trochoidal paths for arbitrary pocket shapes — not just circular corners but any 2D/3D profile.

**Mathematical model:**
1. Compute the **Minkowski sum** of the pocket boundary with a circle of radius r (tool radius):
   the "offset" boundary — equivalently, the boundary the tool center cannot enter.
2. The **trochoidal generating circle** (radius R_troch, center moves along a spine path) must
   stay inside the offset boundary; its envelope sweeps the trochoidal cut width.
3. The spine path is the **medial axis** (or Voronoi diagram) of the offset region — exactly the
   distance-field skeleton of the pocket minus the tool radius.
4. Self-intersection of the trochoidal envelopes at narrow passages is resolved via **bisector
   curves** (algebraic geometry: resultants of trigonometric polynomials give the exact
   self-intersection locus).
5. Result: a piecewise-smooth toolpath where every trochoidal arc has mathematically guaranteed
   engagement angle ≤ θ_max (user-set, e.g. 15°) with ZERO gouging.

**Canonical sources:**
- Held, M. — "On the Computational Geometry of Pocket Machining," Lecture Notes in Computer
  Science Vol. 500, Springer-Verlag (1991). Held (University of Salzburg) is the foundational
  author on exact pocket machining Voronoi/offset geometry.
- Held, M., Spielberger, C. — "A smooth spiral tool path for high speed machining of 2D pockets,"
  Computer-Aided Design, Vol. 41/7 (2009), pp. 539–550. The Held 2011 CAD paper Hermes cited is
  the follow-on; Held's series is real. [Exact 2011 paper title/volume: web-verify target.]
- Ibaraki, S., Yamaji, I., Matsubara, A. — engagement-angle analysis for trochoidal paths, CIRP
  Annals / Precision Engineering, c. 2010. [Web-verify target.]
- Farouki, R.T. — extensive work on Minkowski sums of parametric curves and Pythagorean-hodograph
  (PH) curves (offsetting with no approximation error). PH curves eliminate offset approximation
  in trochoidal path generation. Canonical reference: Farouki, R.T., *Pythagorean-Hodograph
  Curves*, Springer (2008), ISBN 978-3-540-73397-0.

**Standard:** No ANSI/ISO standard specifically governs trochoidal milling geometry. [R12 note:
Hermes cited ANSI B5.48 — I cannot confirm this number; treat as unverified; do NOT build a
standards-compliance claim on it until confirmed via ANSI catalog.]

**What it unlocks:**
- VoluMill/iMachining-class constant-engagement roughing on **arbitrary** non-convex 3D pockets
  with mathematical proof of engagement bound — not just vendor-implementation heuristics.
- PRISM kilo can implement a pocket-spine generator (Voronoi of the offset polygon) + trochoidal
  path builder as a backend engine, replacing ad-hoc engagement-angle approximations.
- Pairs with the adaptive roughing (Phase-2) by providing the exact spine for arbitrary pockets;
  Phase-2 covered the CONCEPT, this provides the CONSTRUCTION.

---

## Wiring / consumers (R15)

- **GALAXY:** `mcp-server/src/engines/cam/` (kilo). All sub-domains feed into the 3-endpoint
  triad: `cam_strategy_recommend` → `toolpath_generate` → `collision_check_full`.
- **Sub-domain 1 (flank milling):** `cam_strategy_recommend` — feature classification (ruled
  surface → flank-eligible); `toolpath_generate` — flank/swarf toolpath; kilo build target:
  a RuledSurfaceFlankMillingEngine.
- **Sub-domain 2 (C-space MAT):** `collision_check_full` — replace discrete-sample collision
  checking with MAT-based clearance oracle; also feeds delta (AFR geometry) for C-obstacle build.
- **Sub-domain 3 (feedrate scheduling):** `toolpath_generate` output feeds oscar (speed-feed) via
  the per-move feedrate schedule; echo (post-processor) consumes it for G93/G94 output. Physics:
  chip-thickness constraint → `src/physics/constants.ts` for kc1.1 values (never inline).
- **Sub-domain 4 (analytic trochoids):** `toolpath_generate` — pocket spine + trochoidal path
  generation; replaces heuristic trochoidal transitions in the adaptive roughing strategy.
- **Cross-galaxy:** delta (part geometry for C-obstacle); oscar (cutting force / chip-thickness
  for feedrate constraint); echo (RTCP post output for 5-axis flank moves).
- **No MCP dispatcher calls in this anchor** (knowledge file); dispatcher wiring belongs in the
  engine implementation units.

---

## Next (Phase-5, honestly scoped)

1. **Machine tool dynamics + chatter stability (Altintas stability lobe diagrams):** the closed-loop
   from toolpath → cutting forces → machine vibration → chatter → surface error. The Altintas
   textbook (2012) Ch. 3–4 is the entry point. Directly limits the feedrate schedule (Phase-4 sub-3)
   by spindle-speed-dependent stability boundaries.
2. **Post-processor kinematics for non-orthogonal 5-axis heads** (nutating / A-B / B-C head
   machines): the Lie-group SE(3) inverse-kinematics formulation (Murray, Li, Sastry 1994 *A
   Mathematical Introduction to Robotic Manipulation*) applied to machine tool kinematic chains.
   Extends echo (post-processor) beyond the standard table-table / head-table cases.
3. **Validate flank milling and trochoidal path generators on real PRISM geometry:** impeller from
   `H:/PRISM/resources/CAD FILES/blisk.stp` (4.9 MB) and `Impeller turbine.stp` for flank milling;
   a JM Die pocket from `H:/PRISM/JM DIE/` for trochoidal path. These are the ground-truth test
   assets — hypothesis only until a build unit runs against them.

---

## Sources

- Bedi, S., Mann, S., Menzel, C. — flank milling with conical/toroidal tools, IJMTM, 2003–2005
  series. [Exact volumes: web-verify target.]
- Lartigue, C. — conical flank milling envelope, CIRP Annals, early 2000s. [Exact year: web-verify.]
- Chiou, C.J., Lee, Y.S. — swept-surface determination for 5-axis NC, IJMTM (2002).
- Blum, H. — "A transformation for extracting new descriptors of shape" (1967) — MAT foundation.
- Yang, J., Abdel-Malek, K. — C-space MAT for 5-axis NC, Computer-Aided Design (~2006).
  [Exact vol/page: web-verify target.]
- Altintas, Y., Erkorkmaz, K. — feedrate optimization for spline interpolation, CIRP Annals
  Vol. 52/1 (2003). [Pagination: web-verify target.]
- Altintas, Y. — *Manufacturing Automation*, 2nd ed., Cambridge University Press (2012).
  ISBN 978-1-107-00148-0. Canonical machining textbook.
- Sencer, B., Altintas, Y. — 5-axis feedrate scheduling, ASME J. Manuf. Sci. Eng. (~2009–2011).
  [Exact year/vol: web-verify target.]
- Held, M. — *On the Computational Geometry of Pocket Machining*, LNCS 500, Springer (1991).
- Held, M., Spielberger, C. — spiral/trochoidal toolpath, Computer-Aided Design Vol. 41/7 (2009).
- Farouki, R.T. — *Pythagorean-Hodograph Curves*, Springer (2008). ISBN 978-3-540-73397-0.
- ISO 14649-11 (STEP-NC feedrate data model), ISO 14649-12 (STEP-NC flank milling entities).
  [Clause scope: web-verify targets.]
- ASME Y14.5-2018 (GD&T), Y14.5.1M-1994 (mathematical tolerancing) — tolerance zone geometry
  used in C-obstacle construction.
- **Planner: Hermes (xAI Grok, :8645), tempered per R12.** Citations flagged "web-verify target"
  were supplied by Hermes and are plausible but not independently confirmed this session.
  ANSI B5.48 (Hermes-cited trochoidal milling standard) is UNVERIFIED — do not rely on it.
