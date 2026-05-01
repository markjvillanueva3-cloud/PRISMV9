# Machining Feasibility Intelligence Stack — Design Specification

**Date**: 2026-03-14
**Track**: MF (Machining Feasibility)
**Milestones**: MF-MS0 through MF-MS5 (6 milestones)
**New Engines**: 8-10
**Existing Engines Enhanced**: 5+
**Target**: 150+ tests, 40+ failure mode coverage

---

## Vision

Build a forward-simulation feasibility system that executes the operation sequence virtually, tracking workpiece geometry evolution at every step, and catches dead-ends — unmachineable states, unreachable features, lost workholding, excessive flexibility — BEFORE the first chip is cut. No other system does this.

Integrates across: PP pipeline, CNC simulation, CAM programming, Fusion 360 live bridge, and standalone MCP actions.

---

## Problem Statement

Machining a complex part involves a sequence of operations that progressively remove material. Each operation changes the part geometry, which affects:
- What surfaces are available for clamping
- What features are reachable by tools
- How stiff the remaining structure is
- Whether the machine can physically deliver required force/power

If any operation creates a state where a future operation becomes impossible, the entire job fails — potentially after hours of machine time and thousands of dollars of material/tooling cost.

Current state: PRISM has OperationSequencerEngine (ordering), MultiSetupPlannerEngine (setup planning), FixtureClampingEngine (force checks), RestMachiningEngine (rest detection), CollisionDetectionEngine (collision), PartDeflectionEngine (deflection), ThinFloorVibrationEngine (vibration). But **none of these track how the workpiece evolves through the sequence** and **none detect dead-ends**.

---

## Architecture: 6-Layer Feasibility Stack

```
LAYER 6: INTEGRATION (hooks into PP pipeline, simulation, CAM, Fusion 360)
LAYER 5: ORCHESTRATION (forward simulation, dead-end detection, auto-resequencing)
LAYER 4: SEQUENCE INTELLIGENCE (dependency graph, critical path, setup transitions)
LAYER 3: PHYSICAL FEASIBILITY (accessibility, workholding, rigidity, force/power)
LAYER 2: WORKPIECE STATE (geometry evolution, surface catalog, IPW tracking)
LAYER 1: GEOMETRY INPUT (Fusion B-rep, feature-based, G-code reconstruction)
```

---

## Engine Inventory

### New Engines (8)

#### 1. WorkpieceStateEngine (~800L)
**Purpose**: Track workpiece geometry evolution through operation sequence.
**Key Methods**:
- `initialize(stock, features)` — Set initial stock geometry
- `applyOperation(op)` — Subtract material for one operation, update IPW
- `getState(afterOp)` — Return IPW geometry at any point in sequence
- `getSurfaces()` — Catalog all remaining surfaces (for clamping analysis)
- `getMinWallThickness()` — Find thinnest wall section in current IPW
- `getFeatureAccessibility(feature, tool)` — Can this tool reach this feature in current IPW?
- `rollback(toOp)` — Undo operations to test alternate sequences

**Geometry Fidelity Levels**:
- Level 3 (highest): Fusion 360 B-rep via LiveBridge (port 18360)
- Level 2: Feature-based AABB with constructive subtraction
- Level 1: G-code reconstructed stock removal (SweptVolumeEngine)

**Data Model**:
```
WorkpieceState {
  stock: BoundingBox | FeatureSet | BRepRef
  operations_applied: Operation[]
  current_ipw: IPWGeometry
  surfaces: Surface[] // remaining surfaces with area, normal, position
  features_remaining: Feature[] // features not yet machined
  wall_sections: WallSection[] // tracked thin walls
  volume_removed_pct: number
}
```

#### 2. AccessibilityAnalysisEngine (~700L)
**Purpose**: Verify tool+holder can physically reach every feature at every stage.
**Checks**:
- Tool length vs feature depth + clearance
- Holder OBB collision against IPW walls (uses CollisionDetectionEngine)
- Internal corner radius vs minimum tool radius available
- Feature approach angle vs tool axis options
- Chip evacuation path (pocket aspect ratio, exit direction)
- 5-axis orientation reachability (singularity check via FiveAxisPostEngine)
- Undercut features requiring special tool geometry (lollipop, keyway)

**Key Methods**:
- `checkAccess(feature, tool, holder, ipw)` → { reachable, issues[], suggestions[] }
- `findReachableTools(feature, ipw, toolCatalog)` → ranked tool list
- `checkAllFeatures(ipw, toolAssignments)` → full accessibility report

#### 3. WorkholdingViabilityEngine (~600L)
**Purpose**: Track clamping surface availability as material is removed.
**Models**:
- Surface catalog: track area, flatness, position of all machinable surfaces
- Clamping zone tracking: top/bottom/side1/side2/bore surfaces
- Grip force degradation: F_grip = μ × P × A_remaining
- Vacuum seal integrity: through-holes break vacuum fixture seal
- Magnetic holding: surface area × flux density threshold
- Soft jaw contact: jaw profile vs remaining geometry
- Datum surface integrity: is the datum surface still intact for probing?

**Key Methods**:
- `checkViability(ipw, nextOp, fixtureType)` → { viable, grip_margin, issues[] }
- `trackSurfaces(ipw)` → { clamp_surfaces[], datum_surfaces[], grip_areas }
- `suggestFixturing(ipw, remainingOps)` → { fixture_type, clamp_positions[], warnings[] }

#### 4. RigidityDegradationEngine (~600L)
**Purpose**: Predict workpiece stiffness at every stage, flag features that become too flexible.
**Models**:
- Thin wall: cantilever δ = F×H³/(3×E×I), I = L×t³/12
- Thin floor: clamped plate δ = α×F×a²/(E×t³)
- Unsupported web: simply-supported beam
- Natural frequency degradation: fn = (1/2π)×√(k/m), k decreases as material removed
- Chatter onset at reduced stiffness (stability lobes shift)
- Residual stress redistribution after material removal

**Key Methods**:
- `checkRigidity(ipw, nextOp, cuttingForce)` → { stiff_enough, deflection_mm, fn_Hz, issues[] }
- `findCriticalFeatures(ipw)` → features ranked by stiffness (weakest first)
- `suggestMachiningOrder(features)` → "machine thin walls LAST, thick features FIRST"
- `recommendSupport(thinFeature)` → { spring_passes, backing_support, reduced_DOC, fill_strategy }

#### 5. SequenceFeasibilityEngine (~1000L)
**Purpose**: Forward simulation — execute ops 1→N virtually, check all constraints at each step.
**Algorithm**:
```
for each operation in sequence:
  1. WorkpieceStateEngine.applyOperation(op)
  2. For EVERY remaining operation:
     a. AccessibilityAnalysis.checkAccess(remaining_op, tool, holder, ipw)
     b. WorkholdingViability.checkViability(ipw, remaining_op, fixture)
     c. RigidityDegradation.checkRigidity(ipw, remaining_op, force)
  3. If ANY remaining op becomes infeasible → DEAD-END DETECTED
  4. Report: "After op N, op M becomes impossible because [reason]"
  5. Try alternate orderings (backtracking with constraint propagation)
```

**Key Methods**:
- `simulate(operations, stock, tools, fixtures)` → FeasibilityReport
- `findDeadEnds(operations)` → DeadEnd[]
- `suggestReordering(operations, deadEnds)` → ValidSequence | null
- `riskScore(operations)` → per-operation risk percentages

**Backtracking Search**:
- Constraint propagation: prune impossible orderings early
- Heuristic: try "roughing before finishing", "outside before inside", "thick before thin"
- Limit: max 1000 sequence permutations explored (practical for ≤15 operations)

#### 6. SetupTransitionEngine (~500L)
**Purpose**: Verify each setup change (flip/re-fixture) is mechanically feasible.
**Checks**:
- Can the part be physically re-clamped after this setup?
- Are there parallel datum surfaces for the flip?
- Tolerance stack through datum chain (RSS + Monte Carlo)
- Pallet/tombstone layout collision (multi-part)
- Fixture changeover type compatibility (vise→chuck→plate)

#### 7. FeasibilityOrchestratorEngine (~600L)
**Purpose**: Master orchestrator that chains all layers and produces the complete report.
**Methods**:
- `fullAnalysis(job)` → CompleteFeasibilityReport
- `quickCheck(job)` → pass/fail with top 3 issues
- `whatIf(job, changeOp)` → impact of reordering one operation

#### 8. PredictiveFailureEngine (~500L)
**Purpose**: Monte Carlo risk assessment — probability of sequence success.
**Models**:
- Material property variation → force variation → deflection variation → tolerance compliance
- Tool wear uncertainty → remaining life probability
- Thermal drift uncertainty → dimensional accuracy probability
- Combined P(success) across all operations

---

## Existing Engine Enhancements

| Engine | Enhancement |
|---|---|
| OperationSequencerEngine | Add feasibility pre-check hook — call SequenceFeasibility before finalizing sequence |
| MultiSetupPlannerEngine | Wire WorkholdingViability for per-setup clamping verification |
| RestMachiningEngine | Feed IPW state from WorkpieceStateEngine for accurate rest detection |
| PostProcessorPipelineEngine | Add Stage 0.8 (feasibility pre-check) before physics stages |
| CNCSimulationPipelineEngine | Feed IPW state for progressive simulation |

---

## 40+ Failure Modes Covered

### Geometry/Access (7)
1. Tool too short for feature depth
2. Holder collides with IPW walls
3. Internal corner radius < smallest tool radius
4. Feature approach blocked by previous cut
5. Chip evacuation blocked in deep pocket
6. 5-axis singularity blocks orientation
7. Undercut feature unreachable

### Workholding (9)
8. Clamping surface removed by previous op
9. Grip force insufficient after material removal
10. Part lifts off fixture during heavy cut
11. Part rotates in fixture (moment imbalance)
12. Vacuum seal broken by through-hole
13. Soft jaw deformed by machining
14. Datum surface destroyed before final feature
15. No parallel surfaces for re-fixturing after flip
16. Tombstone part-to-part collision

### Rigidity (7)
17. Thin wall deflects beyond tolerance
18. Thin floor resonates at tooth-passing frequency
19. Unsupported cantilever chatters
20. Part flexes during measurement
21. Residual stress warping after unclamp
22. Web between pockets too thin
23. Tall thin wall oscillates during HSM

### Force/Power (5)
24. Cutting force exceeds machine capacity
25. Spindle power exceeded
26. Torque limit at low RPM
27. Tool deflection exceeds tolerance
28. Thermal growth exceeds positioning accuracy

### Sequence/Logic (7)
29. Circular dependency in operation order
30. Dead-end: op N makes op M impossible
31. No valid ordering exists
32. Setup flip destroys datum chain accuracy
33. Feature precedence violated
34. Tool magazine overflow
35. Coolant type conflict between ops

### Simulation (5)
36. Mid-program force spike exceeds threshold
37. Thermal damage predicted at block range
38. Tool breakage predicted before completion
39. Surface finish degrades below spec
40. Dimensional accuracy lost to thermal drift

### Stock/Material (3)
41. Stock geometry prevents initial fixturing
42. Material variation exceeds force safety margin
43. Hardness gradient causes unexpected tool wear

---

## Integration Points

### PP Pipeline Stage
- Stage 0.8: `feasibility_precheck` — runs before physics stages
- Quick mode: check top 5 risks in <100ms
- Full mode: forward simulation of all operations

### CNC Simulation
- SimulationFeasibilityBridge: feed IPW state to PhysicsAwareSimulationEngine
- Block-by-block force/thermal verification against evolving geometry

### CAM Programming
- CNCProgramAssemblerEngine pre-hook: validate sequence before assembly
- AutoResequence: if dead-end found, suggest valid ordering

### Fusion 360
- LiveGeometryExtractor: pull B-rep from Fusion for Level 3 geometry
- FusionCAMValidator: check operation tree before "Generate" click
- Visual feedback: highlight risky features in viewport

### Standalone Actions (12)
- `feasibility_full_analysis` — complete forward simulation
- `feasibility_quick_check` — fast pass/fail
- `feasibility_what_if` — test reordering impact
- `feasibility_risk_score` — per-operation risk percentages
- `accessibility_check` — single feature tool reach
- `workholding_check` — clamping viability at stage
- `rigidity_check` — stiffness at stage
- `sequence_validate` — dead-end detection
- `setup_transition_check` — flip feasibility
- `auto_resequence` — find valid ordering
- `predictive_failure` — Monte Carlo success probability
- `critical_path` — identify bottleneck operations

### Skills
- `/feasibility-check` — interactive analysis via MCP chat
- `/sequence-validate` — validate operation order
- `/what-if` — explore alternate sequences

---

## Dependency Chain (Milestones)

```
MF-MS0 (WorkpieceState + Geometry Input)
  └→ MF-MS1 (Accessibility + Workholding + Rigidity)
       └→ MF-MS2 (SequenceFeasibility + Dead-End Detection)
            └→ MF-MS3 (SetupTransition + PredictiveFailure)
                 └→ MF-MS4 (Integration: PP + Simulation + CAM + Fusion)
                      └→ MF-MS5 (Tests + Benchmarks + Skills + Hooks)
```

---

## Deliverables

- **8 new engines** (~5,300 lines)
- **5 existing engines enhanced**
- **43 failure modes** detected
- **12 dispatcher actions**
- **3 slash commands**
- **150+ tests**
- **3 geometry fidelity levels** (B-rep / Feature / G-code)
- **Integration**: PP pipeline stage, simulation bridge, CAM pre-check, Fusion visual feedback
