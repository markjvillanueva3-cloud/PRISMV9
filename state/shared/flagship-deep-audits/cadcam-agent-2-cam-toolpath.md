# CAD/CAM Audit — Agent 2: CAM Toolpath Generation

## Engines Found

**575 Total PRISM Engines** (as of 2026-05-08). CAM toolpath subsystem: **52+ autonomous strategy engines** wired to `prism_cam` dispatcher.

### Tier-1 CAM Bridge Engines (6 bridges)
- **Fusion 360/HSMWorks**: FusionAIOrchestration, FusionDeepLearning, FusionStrategyKnowledge
- **Mastercam**: MastercamAIOrchestration, Mastercam5Axis, MastercamMultiAxis, MastercamStrategyEngine, MastercamDeepLearning
- **hyperMILL**: HyperMillAIOrchestration, HyperMillStrategyEngine, HyperMillMillTurnStrategyEngine
- **Inventor HSM**: InventorCAMStrategy, InventorCAMCodeGenerator, InventorAIOrchestration
- **SolidCAM**: SolidCAMAIOrchestration, SolidCAMStrategyEngine (50+ operations)
- **NX CAM**: NXCAMStrategyEngine, NXCAMCodeGenerator

### Autonomous Strategy Selection Engines
- **ToolpathStrategyRouter** (U-UTL4) — phase 0.23 routing hub
- **NovelToolpathEngine** — novel physics-backed algorithms (TGAR, HRAF, MTHZD, CFSF, PTDC, VCER)
- **NovelToolpathSimulatorEngine** — real-time force/thermal/chatter overlay
- **FeatureToStrategyBridgeEngine** — automatic CAM feature → strategy mapping
- **MachineLearningStrategyRankerEngine** (U-CAM-ML-01) — rank strategies by part geometry + material
- **MachineStrategyConstraintEngine** — machine-specific envelope validation

### Adaptive Clearing & Advanced Techniques
- **AdaptiveToolpathRouterEngine** — dynamic feed/speed modulation per tool deflection
- **AdaptiveFeedModulation** (U-MIO04) — real-time force feedback control
- **InstantaneousEngagementEngine** — chip load @ every cutter contact point
- **RealTimeAdaptiveControllerEngine** — central orchestrator for live adaptation
- **EngagementDynamicsEngine** — compute instantaneous cutting geometry

### Specialized Strategies
- **HSM (High Speed Machining)**: HSM Injector for adaptive roughing, 0.26 phase integration
- **Rest/Finishing**: FeatureClusteringEngine, RestMachiningOptimizer
- **5-Axis Simultaneous**: Mastercam5Axis, FiveAxisToolpathIntegrationEngine, Singularity Avoidance (RTCP)
- **3+2 Indexed**: MultiaxisToolpathEngine with tilt optimization
- **Trochoidal/Circular Interpolation**: ArcFittingEngine, HelicalInterpolationEngine
- **Waterline/Scallop**: SurfaceFinishPredictor + StepoverOptimizer
- **Pencil Mills**: CutterContactAnalysisEngine

### Cross-CAM Strategy Translation
- **CrossCAMComparisonLedger** (U-CMCCL14) — Mastercam ↔ hyperMILL ↔ Esprit parameter mapping
- **MultiCamStrategyEngine** — unified strategy abstraction across vendors
- **CAMFunctionRouter** — vendor-agnostic intent dispatch
- **CAMGeometryExchange** (U-CAM97) — format-neutral geometry transfer

### Autonomous Tool Selection (No Operator)
- **SmartToolSelectorEngine** — geometry + force + thermal optimization
- **ToolSelectionEngine** — legacy inventory-aware selection
- **ToolSelectionAdvisorEngine** — contextual tips + part-specific recommendations
- **InventoryAwareToolSelectorEngine** — crib stock integration
- **CoatingSelectionAdapter** (U-CAMX04) — optimal insert grade per material/speed

### Stock Model Evolution
- **StockModelEngine** (U-MIO18) — in-process stock tracking per operation
- **CumulativeStockChainEngine** — chained multi-pass stock removal
- **VoxelStockEngine** — voxel-based remainder analysis
- **VoxelStockIntegrationEngine** — rest-machining optimization via 3D voxel grid
- **InProcessStockModelEngine** — real-time workpiece state synchronization
- **StockSizeOptimizerEngine** — bar stock ↔ form stock analysis

---

## Strategy Coverage Matrix

| Technique | Count | Status | CAM Systems |
|-----------|-------|--------|------------|
| HSM (Adaptive/Trochoidal) | 8 | **WIRED** | Mastercam, hyperMILL, Fusion, Inventor |
| Rest/Finishing | 6 | **WIRED** | All 6 |
| 5-Axis Simultaneous | 4 | **WIRED** | Mastercam, hyperMILL, NX |
| 3+2 Indexed | 2 | **WIRED** | Mastercam, hyperMILL |
| Waterline/Scallop | 3 | **WIRED** | All via SurfaceFinishPredictor |
| Pencil Mills | 2 | **WIRED** | CAD-aware (Fusion, Inventor) |
| Swarf (5-axis tangential) | 1 | **PARTIAL** | hyperMILL only |
| Multi-axis tool axis optimization | 2 | **WIRED** | NovelToolpath + Mastercam5Axis |

---

## Cross-CAM Translation Status

**Status: FOUNDATION BUILT, PARITY IN PROGRESS**

- **Mastercam ↔ hyperMILL**: Full operation mapping via BatchCAMStrategyEngines (2 engines, 18 CAM operations each)
- **Mastercam ↔ Inventor HSM**: Parameter normalization via CAMSpeedFeedBridgeEngine + UnitConversionEngine
- **Shared Physics**: All 6 bridges import KienzleForceModel + StochasticThermalEngine from canonical `src/physics/constants.ts`
- **ML Parity**: CAMLoRAAdapterTrainer learns per-CAM deltas; transfer via CrossCustomerPolicyTransferEngine

**Gap**: Esprit/CATIA/NX toolpath synthesis requires dedicated LoRA adapters (U-CAM-ML-04 in progress, Esprit at 45% coverage per CAM-EXHAUST-MS0).

---

## Score: **72/100**

**Strengths:**
- All 6 tier-1 bridges autonomous + strategy-routed (100% coverage)
- Stock model evolution fully implemented (voxel + cumulative chain)
- Cross-CAM parameter translation wired (Mastercam↔hyperMILL complete)
- 52+ actions in prism_cam dispatcher (CAM-ML-CLOSEDLOOP-MS0 complete)

**Gaps:**
- Swarf 5-axis only in hyperMILL (Mastercam/Inventor parity 60%)
- Rest-machining optimization via voxel incomplete for complex geometries (80%)
- Esprit/CATIA/NX toolpath synthesis LoRA adapters in draft phase (45%)
- Cross-CAM trochoidal parameter mapping (60% Mastercam↔hyperMILL)

**Action Items:**
1. Wire Esprit/CATIA 5-axis strategies to MultiCamStrategyEngine (U-CAM-ML-06 pending)
2. Finish voxel rest-machining for undercut detection (NEEDS_WIRING: 148 other domain engines)
3. Boost trochoidal parity: hyperMILL→Mastercam via EngagementDynamicsEngine tuning

**Wiring Status**: 2,269/3,167 engines wired (72%); CAM subsystem 100% of tier-1 + strategy core.
