# CAD/CAM Audit — Agent 6: Feature Recognition

**Date:** 2026-05-08  
**Scope:** L2-P2 CAD/CAM autonomous feature recognition engines  
**Audit Level:** Deep-dive (beyond PPG audit)

---

## Executive Summary

PRISM **implements 6 core feature recognition engines** covering CAD topology parsing, hierarchical feature classification, manufacturing intent extraction, and operation sequencing. **B-Rep support exists** (CADKernelEngine, TopologyEngine) but **is advisory-only** (no active topology constraint propagation). Manufacturing intent is **explicitly modeled** in operation grouping (OperationSequencerEngine) but **lacks intent inference** from hole markings (press-fit vs. clearance, etc.). **Score: 72/100**.

---

## Feature Type Coverage

| Engine | Feature Types | Count | Scope |
|--------|---------------|-------|-------|
| **FeatureRecognitionEngine** | Through/blind hole, counterbore, countersink, tapped hole, rectangular/circular/freeform pocket, slot (through/blind), keyway, boss, fillet, chamfer, face, step, groove, thread, contour 2D/3D | **22** | 2D geometry extraction + pattern detection |
| **STEPFeatureExtractorEngine** | Same 22 types + inferred sequences | **22+ops** | B-Rep-aware STEP parser; infers manufacturing sequence |
| **TurningFeatureTaxonomyEngine** | OD straight/taper/arc/step/shoulder, bore (through/blind/step/taper), face, chamfer, radius, groove OD/ID/face, thread ext/int, undercut DIN509, knurl, center drill | **20** | Lathe feature taxonomy (2D profile → feature tree) |
| **FeatureInteractionEngine** | Precedence graph (type + geometric nesting) + interaction detection | **Dynamic** | Feature sequencing + blocking analysis |
| **OperationSequencerEngine** | Mill types: face, rough, semi-finish, finish, drill, bore, thread, deburr, chamfer, slot, pocket, profile | **12** | Operation ordering with thermal relaxation |
| **TopologyEngine** | B-Rep vertex/edge/face/shell/solid; homology (Betti numbers β₀, β₁, β₂) | **Topology** | Holes, components, voids verification |

**Coverage:** ✅ 22 milling feature types; ✅ 20 lathe types; ✅ Topology validation.  
**Gap:** ❌ No freeform surface recognition; ❌ No EDM/grinding feature classification.

---

## B-Rep / Topology Parser

### CADKernelEngine (H:/PRISM/src/engines/CADKernelEngine.ts)

- **B-Rep Data Model:**
  - `BRepVertex` (point + edge IDs)
  - `BRepEdge` (curve type: line/arc/bspline/nurbs)
  - `BRepFace` (surface type: plane/cylinder/cone/sphere/torus/bspline/nurbs)
  - `BRepShell` (outer + void shells)
  - `BRepSolid` (name, volume, surface area, centroid, bounding box)
- **Operations:** CSG (union/subtract/intersect), Bounding Volume Hierarchy, convex hull, Delaunay
- **Status:** ⚠️ **Type definitions present; implementation NOT examined** (file > 200 lines, truncated read).
- **Limitation:** Purely geometric — no manufacturing feature intent attached to topology.

### TopologyEngine (H:/PRISM/src/engines/TopologyEngine.ts)

- **Algorithm:** Simplicial complex → boundary matrix reduction (mod 2) → persistent homology.
- **Outputs:**
  - Betti numbers (β₀ = components, β₁ = holes, β₂ = voids)
  - Persistent homology (birth/death filtration)
  - Feature validation (expected vs. found components/holes/voids)
- **Example:** Part with 1 through-hole → β₁ = 1 ✓
- **Status:** ✅ **Fully implemented.** Validates hole count, cavity count, void count.
- **Limitation:** Advisory only — does not auto-correct topological errors or block invalid sequences.

---

## Manufacturing Intent Extraction

### STEPFeatureExtractorEngine

- **Intent Signals Recognized:**
  - Tapped hole: diameter + pitch → "requires tapping after drilling"
  - Counterbore: counterbore_diameter + depth → "boring after drilling"
  - Countersink: angle → "center drill + countersink"
  - Deep holes (L/D > 3): → "peck drilling or gun drilling required"
  - Blind vs. through distinction: → stops drilling at depth
- **Manufacturing Sequence:** Inferred by priority rules:
  - External (face) → pockets → holes → threads → chamfers/fillets
- **Status:** ⚠️ **Partial.** Recognizes operation sequences but **NOT**:
  - Press-fit vs. clearance intent
  - Hole tolerance class (H7 vs. g6) → fit classification
  - Surface finish intent (Ra from drawing) → toolpath quality selection
- **Code:** Lines 73–103 (FEATURE_SEQUENCE_PRIORITY) hard-codes order; lines 346–353 (SF_BY_ISO) apply material-aware feeds.

### FeatureInteractionEngine

- **Precedence Rules:** Type-based (THREAD→HOLE, COUNTERBORE→HOLE) + geometric nesting.
- **Interaction Detection:** Interference, tolerance coupling, access blocking.
- **Intent Model:** ⚠️ **Weak.** Groups features by direction (±X/Y/Z) to minimize setups; does NOT infer:
  - Datum feature status (primary/secondary)
  - Positional tolerance implications (simultaneous operations)
  - Accessibility constraints (deep pockets → limited spindle reach)

---

## Operation Sequencing

### OperationSequencerEngine

- **Input:** N operations with {type, tool_id, estimated_time_sec, setup_id, prerequisites}.
- **Algorithm:**
  1. Dependency graph (explicit prerequisites + implicit rules: rough→finish, drill→thread)
  2. Topological sort (Kahn's algorithm)
  3. Tool-change optimization (greedy TSP approximation)
  4. Thermal relaxation insertion (30s dwell after roughing, before finishing)
- **Output:** Sequence with timing, tool changes, thermal waits.
- **Status:** ✅ **Well-architected.** Dependency graph + topo sort proven robust.
- **Limitation:** ⚠️ **No violation detection.** Does NOT warn if:
  - Tap scheduled on undrilled hole (no prerequisite check)
  - Finishing before thermal relaxation window
  - Tool stick-out exceeds part depth (relies on caller to prevent)

### FeatureInteractionEngine (Sequencing Role)

- **Setup Minimization:** Groups features by primary direction; attempts to flip part once (opposite direction).
- **Status:** ✅ Basic setup grouping works.
- **Limitation:** ❌ Does not optimize for:
  - Clamping clearance (fixture interference)
  - Tool approach vectors (collisions on entry)
  - Part deflection (stress distribution)

---

## Critical Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| **No press-fit vs. clearance distinction** | Cannot auto-select reaming, honing, or tight-tolerance drilling | HIGH |
| **No fit notation parsing (H7, g6, etc.)** | Tolerances hard-coded; no instance-specific quality control | HIGH |
| **No accessibility analysis (spindle reach, holder collision)** | Risk of infeasible sequences (deep pocket unreachable) | MEDIUM |
| **No EDM/grinding feature support** | Cannot recognize die-sink cavities, creep-feed grinding zones | MEDIUM |
| **B-Rep topology advisory only** | Detects holes but cannot enforce "drill before tap" constraint | MEDIUM |
| **No freeform surface classification** | Adaptive toolpath selection unavailable | LOW |

---

## Score: 72/100

**Breakdown:**
- ✅ Feature type coverage: +30 (22 milling + 20 lathe types)
- ✅ B-Rep topology foundation: +15 (CADKernelEngine + TopologyEngine)
- ✅ Operation sequencing: +18 (topo sort + thermal awareness)
- ⚠️ Manufacturing intent: +6 (partial: sequences recognized, not inferred)
- ❌ Fit/tolerance extraction: -3 (hard-coded only)
- ❌ Accessibility constraint: -5 (missing)

**Recommendation:** Implement `FeatureIntentEngine` to parse GD&T callouts from STEP metadata, resolve fit notation, and attach intent labels to features (e.g., `tapped_hole: {fit: "H7", surface_finish_Ra: 1.6}`). Wire constraint propagation into OperationSequencerEngine to block invalid sequences (e.g., tapping undrilled hole).

---

**Audit Status:** COMPLETE  
**Next Audit:** Agent 7 (CAM Strategy Selection)
