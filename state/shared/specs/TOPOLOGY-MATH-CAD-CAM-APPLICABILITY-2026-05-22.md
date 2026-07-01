# Topology Math → CAD / CAM / CNC Engine Applicability Assessment

> **Provenance** — Deep-research deliverable, slot `november`, 2026-05-22, session `b4c5e890`.
> Work order: *"deep research on topology math … can we use it to improve cad, cam, cnc
> programming, simulation, collision avoidance, tool paths, rapid repositioning, post processors,
> then combine it with other advanced math to improve our engines?"*
> **Advisory.** Research + feasibility assessment. Recommended units in §7 are operator-decides —
> nothing injected into `atomic-roadmap.json`.

---

## 1. The question, answered up front

**Yes — substantially.** Topology is not exotic here: a CAD solid model *is* a topological object
(B-rep), a toolpath *is* a path in a configuration space, chatter *is* a change in the topology of
a phase-space attractor. PRISM already ships the **low-level primitives** (`topology_homology`,
`topology_persistence`, `geodesic_*`, `mesh_curvature_*`, `voronoi_*`, `bvh_*`, `jacobian_5axis`).
The gap — exactly as the CALResCo F1 finding showed for Pareto optimization — is that the
primitives are **not assembled into the high-level topological methods** (Morse–Reeb decomposition,
C-space homotopy planning, persistent-homology chatter detection, Euler–Poincaré validity gate).
This is an *integration* opportunity, not a greenfield build.

## 2. MIT course database — audit (answers "we should have mit courses")

**We do — partially.** `prism_dev:mit_courses_audit` + `mcfi_stats` + `mcdl_get_category_stats`:

- **199 MIT courses harvested**, 847 files. **Only 18 are text-extracted — 181 are zip-only**
  (raw, not parsed). Harvest by department: EECS(6)=48, **Math(18)=33**, MechE(2)=25, Sloan(15)=20,
  AeroAstro(16)=14, MatSci(3)=11. Year range 1999–2024.
- **Function-indexed (`mcfi`): 26 courses, 20 integrated.** The indexed Math (dept-18) courses are
  **18.06** (Linear Algebra), **18.085** (Computational Science & Engineering — Strang),
  **18.065** (Matrix Methods / data analysis — Strang), **18.650** (Statistics).
- **Deep-learning-integrated set (`mcdl`): 15 courses, 6 categories** — manufacturing, materials,
  controls, optimization, machine-learning, systems-engineering. **There is no "mathematics" or
  "geometry/topology" category at all.**

**Finding M1 — PRISM has NO topology, differential-geometry, or computational-geometry course
indexed.** The integrated math is linear-algebra + numerical-methods + statistics. 33 dept-18
courses sit in the harvest but are almost all zip-only/unextracted. The canonical courses for this
work — **18.901** (Intro to Topology), **18.905** (Algebraic Topology), **18.950** (Differential
Geometry), a computational-geometry course (MIT **6.850**), and **16.410** (Autonomy / motion
planning) — must be confirmed-or-harvested and **extracted** before PRISM can mine them. See §7
unit `U-MIT-TOPOLOGY-EXTRACT`.

## 3. Topology in 90 seconds — what it buys manufacturing

| Branch | What it gives | Manufacturing payoff |
|--------|---------------|----------------------|
| Algebraic topology (homology, Betti numbers) | Counts holes/voids/components — invariants robust to noise & deformation | Rigorous feature recognition, part-family signatures, B-rep validity |
| Homotopy / fundamental group | Classifies paths into equivalence classes ("which way round the obstacle") | Collision-free path planning, rapid-move routing |
| Persistent homology / TDA | Multi-scale topological signature of point clouds & signals | Model-free chatter / wear / surface-defect detection |
| Morse theory + Reeb graphs | Where the topology of level sets changes (critical points) | Provably-complete toolpath / Z-level / region decomposition |
| Differential topology / geometry | Smooth structure: curvature, geodesics, singular loci | 5-axis toolpaths, curvature-adaptive stepover, singularity routing |
| Computational geometry (Voronoi → medial axis, Minkowski sums) | Discrete algorithms for offsets & skeletons | Pocket spines, tool-radius offset, C-space obstacle inflation |

## 4. Per-area applicability findings

### T1 — CAD: Euler–Poincaré validity + homology feature signatures · HIGH
**Topology:** A B-rep solid satisfies the **Euler–Poincaré formula** `V − E + F = 2(S − G) + R`
(vertices, edges, faces, shells, genus, ring-faces); a closed orientable surface has
`χ = V − E + F = 2 − 2g`. Betti numbers β0/β1/β2 count connected bodies / through-holes & handles /
enclosed voids.
**PRISM today:** `prism_cad` has `step_brep_summary`, `step_analyze`, `cad_validate`,
`feature_recognize`, `topology_validate_features`; `prism_calc` has `topology_homology`.
**Gap & application:** (a) Add an **Euler–Poincaré characteristic gate** on STEP/IGES import — a χ
mismatch is a watertight test for non-manifold edges, missing/duplicate faces, inconsistent
orientation (confirm whether `topology_validate_features` already does this; if not, it is a small,
high-value add). (b) Compute **genus** as a part-complexity score (g handles ⇒ roughly g+1 setups).
(c) Use β0/β1/β2 as a **topological feature signature** — a noise-robust complement to geometric
`feature_recognize` and an excellent key for the existing part-family / part-similarity engines.

### T2 — CAM toolpaths: Morse–Reeb decomposition · HIGH · genuine gap
**Topology:** Pick a Morse function `f` on the part (height `z` for 2.5-D; signed distance for
waterline). The topology of the level set `{f = c}` changes **only** at critical values of `f`
(minima/saddles/maxima). The **Reeb graph** of `f` records this: nodes = critical points, edges =
topologically-constant strips. At a saddle a pocket splits in two, or an island appears.
**PRISM today:** `prism_toolpath`/`prism_cam` do this **heuristically** — `z_level_optimize`,
`rest_machining_levels`, `island_approach`, `moat_calculate`, `feature_to_zone`. No `reeb_graph` /
`morse_decomposition` action exists in any `prism_*` dispatcher.
**Gap & application:** A Morse–Reeb decomposition gives **provably-complete coverage** (no missed
cusp, no missed newly-appearing island) and the **exact heights** where toolpath strategy must
change — replacing height-sampling heuristics that can skip a thin feature between sample planes.
Highest-value new capability in this assessment.

### T3 — Toolpaths: medial axis (topological skeleton) for pocket spines · MEDIUM
**Topology:** The **medial axis** is the topological skeleton of a region — the locus of centers of
maximal inscribed disks; it is the dual of the boundary's **Voronoi diagram**. It carries the
maximal-tool-radius field everywhere in a pocket.
**PRISM today:** `prism_calc` has `voronoi_diagram`, `voronoi_nearest`, `geometry_polygon_offset`
(2-D Minkowski-with-disk). No `medial_axis` toolpath primitive.
**Application:** The medial axis is the natural spine for spiral / offset pocket toolpaths, and its
radius field directly answers "largest tool that reaches here" → optimal multi-tool selection and
exact **rest-material** boundaries (where the roughing tool could not fit). Derivable from the
existing Voronoi engine — wiring, not new math.

### T4 — Collision avoidance: configuration-space topology · HIGH · genuine gap
**Topology:** The machine's **configuration space** (C-space) is a manifold — 3-axis ≈ R³, 5-axis ≈
R³ × T². Inflate each obstacle (fixture, part, holder) by the **Minkowski sum** with the tool/holder
to get C-space obstacles. The **collision-free** space `Cfree` then has its own topology; its
connected components and fundamental group `π₁(Cfree)` enumerate the **homotopy classes** of
collision-free motion ("over the top" vs. "around the left").
**PRISM today:** `bvh_raycast`, `collision_check_full`, `collision_prevent_{full,certify,zones}` —
strong collision *checking*, but transition/link path *planning* (`toolpath_link_optimize`,
`transition_path`, `linking_move`) is heuristic.
**Gap & application:** (a) A candidate move that stays within one `Cfree` component is
**guaranteed** collision-free — a correctness certificate, not a sampled check. (b) Enumerating
homotopy classes finds genuinely-different routes around an obstacle. (c) A homotopy-class-aware
sampling planner (PRM/RRT) becomes complete and optimal-within-class. This is the rigorous
foundation under both collision avoidance and T5.

### T5 — Rapid repositioning: geodesic shortest path in the right homotopy class · HIGH
**Topology:** The optimal rapid/retract between operations is the **shortest collision-free path =
a geodesic in `Cfree`, restricted to a collision-safe homotopy class.** The classic
retract-to-clearance-plane-then-traverse is topologically lazy — it always takes the "over the top"
class even when a far shorter safe class exists.
**PRISM today:** Real machinery already — `toolpath_link_optimize`, `toolpath_link_time`,
`clearance_plane`, `post_optimize_rapids`, `post_calculate_budget`, `post_full_rapid_optimize`.
**Application:** Replace the clearance-plane heuristic with **homotopy-class-constrained geodesic
linking** (built on T4's C-space). Direct, measurable **cycle-time reduction** on every
operation-to-operation and tool-change move — the highest *immediate ROI* item, because the rapid
budget is paid on every part, every cycle.

### T6 — Simulation: persistent homology / TDA for model-free instability detection · HIGH
**Topology:** Take a sensor time-series (spindle load, acoustic, force, temperature). A
**time-delay (Takens) embedding** lifts it to a point cloud in phase space. **Persistent homology**
of that cloud yields a persistence diagram: a clean periodic cut shows one persistent H₁ loop;
**chatter onset changes the diagram's topology** (the limit cycle destabilizes into a strange
attractor — extra/te shorter-lived cycles). This is **model-free** — no process model required.
**PRISM today:** `prism_calc` already has `topology_persistence` + `topology_homology`; chatter
lives separately in `chatter_detect`, `chatter_multi_frequency`, `chatter_stability_lobes`.
**Gap & application:** **Bridge** persistent homology onto the chatter/sensor pipeline — this is
the rigorous realization of the CALResCo F5 finding (universal edge-of-chaos signature detector,
one detector for chatter + thermal runaway + wear-acceleration). Also: in voxel material-removal
sim (`voxelize_mesh`, `voxel_remove_path`), tracking **β0 (connected components)** detects parting
completion and thin-web breakage automatically.

### T7 — CNC programming + 5-axis: singular loci as topological obstructions · MEDIUM
**Topology:** A 5-axis machine's rotary C-space is a torus `T²`; the **singular locus** (where the
`jacobian_5axis` drops rank) is a topological subset that partitions `T²` into **chambers**. A
continuous tool motion that must move between chambers is *forced* to pass through (or near) a
singularity — an unavoidable hard limit, not a tuning failure.
**PRISM today:** `config_singularity_check`, `singularity_detect`, `jacobian_5axis`,
`five_axis_singularity`, `kinematic_singularity`, `five_axis_linearize`.
**Application:** Classify which chamber each toolpath segment occupies; flag chamber-crossing
segments early (in CAM, not at post time) so the strategy can be re-tilted to stay single-chamber,
or a controlled reconfiguration is planned deliberately. Topology turns "singularity surprise at
post" into "predictable chamber map at strategy time."

### T8 — Post-processors: graph-topological verification of the modal FSM · MEDIUM
**Topology:** A post-processor **is a finite-state machine** over modal G/M-code state; its state
graph has a topology. **Reachability** + **strongly-connected-component** analysis verifies that
every modal combination the post can emit is reachable *and legal*, and that no cycle deadlocks.
**PRISM today:** `prism_calc` has `graph_scc`, `graph_topo_sort`, `graph_bellman_ford`; post
machinery is extensive (`post_*`, `master_post_*`, `cps_*`, `gcode_transpile`).
**Application:** A formal FSM-verification pass over a generated post that **proves no illegal
modal sequence is reachable** — the exact post-processor pitfalls (G93/G94/G95 feed-mode mismatch,
coolant M-code before spindle-at-speed, missing safe retract between ops) are reachability /
invariant properties on the modal graph. This is "DNC-proven without a machine" as a topological
theorem, not a test suite that hopes to hit the bad path.

## 5. Combine with other advanced math — the coherent "geometric foundations" stack

Topology is not a standalone bolt-on. It is the **invariant layer** of a three-tier stack PRISM
should treat as one subsystem:

1. **Algebraic topology** (homology, homotopy, persistent homology) — gives the *invariants*: what
   must be true (β-numbers, homotopy class, persistence signature). → T1, T4, T6.
2. **Differential geometry** (curvature, geodesics, the Gauss map, fiber bundles) — gives the
   *smooth optimization*: the best path/field given the invariants. PRISM partly has this
   (`geodesic_*`, `mesh_curvature_*`, `nurbs_*`, `parametric_surface_curvature`). → T2, T5, T7.
3. **Computational geometry** (Voronoi/medial axis, Delaunay, convex hull, **Minkowski sums**,
   arrangements) — gives the *discrete algorithms* that make 1+2 runnable. PRISM partly has this
   (`voronoi_*`, `convex_hull`, `delaunay`, `geometry_polygon_offset`). → T3, T4.

Bridging math already in PRISM's corpus, to be combined:
- **Morse theory** bridges differential ↔ algebraic topology → T2 (the single highest-value gap).
- **Graph theory** (PRISM-heavy: `graph_*`, `cpm`, `mst`) → T8 + setup sequencing.
- **Spectral geometry** — Laplace–Beltrami eigenfunctions for mesh segmentation & intrinsic
  symmetry detection (useful for fixturing/setup planning). PRISM *has the linear-algebra base*
  via the indexed Strang courses 18.06 / 18.085 / 18.065 — this is the most "free" combination.
- **Optimal transport** (Wasserstein distance) — compare toolpath strategies, morph a proven
  program between geometrically-similar part-family members. Niche but real.

**Synthesis:** PRISM has scattered tier-2 and tier-3 primitives and two tier-1 primitives
(`topology_homology`, `topology_persistence`). It has **no assembled tier-1 methods** (Morse–Reeb,
C-space homotopy, TDA-chatter, Euler–Poincaré gate). Building the tier-1 assembly layer — and
wiring it down onto the existing tier-2/3 primitives — is the whole opportunity.

## 6. What PRISM already has vs. genuine gaps

| Capability | PRISM today | Status |
|------------|-------------|--------|
| Persistent homology / homology primitive | `topology_homology`, `topology_persistence`, `topology_validate_features` | ✅ have primitive |
| Geodesics on surfaces | `geodesic_dijkstra/fast_marching/path/iso_curves` | ✅ have |
| Discrete differential geometry | `mesh_curvature_all/classify`, `nurbs_*`, `parametric_surface_curvature` | ✅ have |
| Computational geometry base | `voronoi_*`, `convex_hull`, `delaunay`, `bvh_*`, `kdtree_*` | ✅ have |
| Graph topology | `graph_scc/topo_sort/bellman_ford/cpm/mst` | ✅ have |
| 5-axis singularity detection | `jacobian_5axis`, `config_singularity_check`, `five_axis_singularity` | ✅ have |
| **Morse–Reeb toolpath decomposition** | — heuristic only (`z_level_optimize`, `island_approach`) | ❌ **gap (T2)** |
| **C-space homotopy path planning** | — heuristic linking only | ❌ **gap (T4/T5)** |
| **Persistent-homology ↔ chatter bridge** | primitive + chatter exist, not wired together | ❌ **gap (T6)** |
| **Euler–Poincaré B-rep validity gate** | possibly inside `topology_validate_features` — unconfirmed | ⚠ **verify (T1)** |
| **Medial-axis toolpath primitive** | Voronoi exists; no `medial_axis` action | ❌ **gap (T3)** |
| **Minkowski-sum C-space obstacle** | `geometry_polygon_offset` (2-D only) | ❌ **gap (T4)** |
| **Topology course knowledge** | 33 dept-18 courses harvested, ~all zip-only; none indexed | ❌ **gap (M1)** |

## 7. Recommended roadmap units (advisory — operator decides)

| Pri | Unit | Finding | Effort | Why now |
|-----|------|---------|--------|---------|
| P0 | `U-MIT-TOPOLOGY-EXTRACT` — extract the zip-only dept-18 courses; confirm/harvest 18.901, 18.905, 18.950, 6.850, 16.410; index into `mcfi` + add a `geometry/topology` `mcdl` category | M1 | S–M | Unblocks every item below — PRISM can't mine knowledge it hasn't parsed |
| P0 | `U-TOPO-RAPID-LINK` — homotopy-class-constrained geodesic rapid/retract linking on a real C-space; replace the clearance-plane heuristic | T4,T5 | M–L | Cycle-time paid on every part, every cycle — highest immediate ROI |
| P1 | `U-MORSE-REEB-DECOMP` — Morse-function + Reeb-graph engine for provably-complete Z-level / waterline / region decomposition; feed `z_level_optimize` & `rest_machining_levels` | T2 | M–L | Closes the missed-cusp / missed-island completeness gap |
| P1 | `U-TDA-CHATTER-BRIDGE` — Takens embedding + `topology_persistence` wired onto the chatter/sensor pipeline; one model-free instability detector | T6 | M | Realizes CALResCo F5 with machinery PRISM already owns |
| P2 | `U-BREP-EULER-GATE` — Euler–Poincaré χ + genus validity gate on CAD import; β-number topological feature signature for part-family keys | T1 | S–M | Watertight import validation; strengthens part-similarity |
| P2 | `U-POST-FSM-VERIFY` — graph-reachability/SCC verification of the post-processor modal FSM (G93/G94/G95, coolant-before-spindle, safe-retract invariants) | T8 | M | "DNC-proven without a machine" as a theorem |
| P3 | `U-MEDIAL-AXIS-SPINE` — expose a `medial_axis` toolpath primitive from the existing Voronoi engine for pocket spines + rest-material bounds | T3 | S | Low effort — wiring an existing engine |

## 8. Bottom line

Topology is a precise, high-leverage fit for PRISM's CAD/CAM/CNC stack — and the work is mostly
*assembly*, not invention: PRISM already owns persistent-homology, geodesic, curvature, Voronoi,
BVH, and graph primitives. The two genuine new builds are **Morse–Reeb decomposition** (T2) and a
**C-space homotopy planner** (T4/T5); everything else is wiring existing primitives into tier-1
methods. The prerequisite is **extracting PRISM's own already-harvested MIT math corpus** (M1) —
33 dept-18 courses sit unparsed today. Combined with the differential-geometry and
computational-geometry primitives already present, this forms one coherent "geometric foundations"
subsystem rather than seven scattered features.
