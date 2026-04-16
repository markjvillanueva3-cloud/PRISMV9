# PRISM Complete Asset Inventory
**Generated:** 2026-04-15
**Source:** BASELINE_INVENTORY.json + live scans

## Summary

| Category | Count | Notes |
|----------|-------|-------|
| **Engines** | 1,869 | TypeScript engine classes |
| **Dispatchers** | 85 | MCP tool dispatchers |
| **Actions** | 2,720+ | Dispatcher actions |
| **Formulas** | 509 | Registered mathematical formulas |
| **Algorithms** | 53 | Algorithm modules (FFT, Kalman, GA, etc.) |
| **Registries** | 24 | Data registries |
| **Registry Entries** | 29,569 | Total records across all registries |
| **Toolpath Strategies** | 698 | CAM toolpath strategies |
| **Post Processors** | 20 | CNC post processor modules |
| **Materials** | 6,372 | Material database entries |
| **Tools** | 95,608 | Cutting tool database entries |
| **Machines** | 910 | Machine database entries |
| **Tribal Tips** | 4,493 | Shop floor knowledge tips |
| **MIT Courses** | 225 | Ingested MIT OCW content |
| **Video Transcripts** | 69 | Processed video knowledge |
| **JM DIE Programs** | 36,929 | CNC program archive |
| **Skills** | 66 | Slash command skills |
| **Scripts** | 52 | Automation scripts |
| **Hooks** | 227 | Validation/lifecycle hooks |
| **Cadences** | 40 | Scheduled cadence functions |
| **Decision Trees** | 6 | Decision tree models |
| **Knowledge Bundles** | 6 | Packaged knowledge sets |
| **Report Templates** | 7 | Report generation templates |
| **Tests** | 1,255 | Vitest test cases |

**TOTAL ASSETS: ~175,000+**

---

## Detailed Breakdown

### Engines (1,869)

Located in: `mcp-server/src/engines/`

**By Category:**
| Category | Count | Examples |
|----------|-------|----------|
| Force/Physics | 17 | KienzleForceModel, CuttingForce, StochasticCuttingForce |
| Speed/Feed | 6 | UltimateSpeedFeed, AutoSpeedFeed, SpeedFeedOrchestrator |
| Chatter/Stability | 13 | ChatterStabilityLobe, RegenerativeChatter, DampingOptimization |
| Deflection | 17 | ToolDeflection, PartDeflection, BoringBarDeflection |
| Thermal | 24 | CuttingTemperature, ThermalWearCoupling, CryogenicCutting |
| Wear/Life | 9 | ToolWearProgression, AdvancedWearPhysics, StochasticToolLife |
| Surface | 17 | SurfaceFinishPredictor, SurfaceIntegrity, ResidualStress |
| CAM Bridges | 40 | MastercamBridge, HypermillBridge, FusionBridge |
| Post-Processing | 20 | PostProcessorPipeline, LathePostProcessor, FiveAxisPost |
| Quality/SPC | 10 | SPCProcessCapability, NelsonSPCRules, MetrologyUncertainty |
| Business/ERP | 42 | QuoteEstimator, ActualCost, CapacityPlanning, JobLifecycle |
| Pipelines | 9 | PrintToProgram, Turning, MultiAxis, MillTurn, EDM |
| AI/Intelligence | 150+ | DeepAIIntelligence, CreativeReasoning, NeuralKnowledgeSynthesis |
| Self-Awareness | 20+ | PRISMSelfAwareness, AgentSelfAwareness, AwarenessQuery |
| Knowledge | 30+ | TribalKnowledge, ControllerKnowledge, MachiningKnowledge |
| Learning | 25+ | PDFLearning, VideoLearning, ProgramLearning |
| Optimization | 35+ | GeneticAlgorithm, ParticleSwarm, BayesianOptimizer |
| Validation | 40+ | PhysicsValidator, SafetyValidator, ComplianceValidator |
| Other | 1,400+ | Various domain-specific engines |

### Formulas (509)

Located in: `mcp-server/src/registries/FormulaRegistry.ts` + source files

**By Domain:**
| Domain | Count | Examples |
|--------|-------|----------|
| Cutting Force | 23 | Kienzle, Merchant, Lee-Shaffer |
| Tool Life | 18 | Taylor, Extended Taylor, Colding |
| Thermal | 31 | Jaeger, Loewen-Shaw, FEM thermal |
| Deflection | 24 | Beam deflection, cantilever, Timoshenko |
| Surface Finish | 19 | Geometric, Brammertz, stochastic |
| Chatter/Stability | 27 | Stability lobe, regenerative, mode coupling |
| Material Properties | 42 | Johnson-Cook, Voce, Zerilli-Armstrong |
| Cost/Quoting | 42 | Setup time, cycle time, machine rate |
| AI/ML | 89 | Loss functions, activations, regularization |
| Optimization | 67 | Objective functions, constraints, Pareto |
| Quality/SPC | 34 | Cp, Cpk, control limits, capability |
| Geometry | 45 | NURBS, Bezier, surface area, volume |
| Physics General | 78 | Stress, strain, fatigue, fracture |

### Algorithms (53)

Located in: `mcp-server/src/algorithms/`

| Algorithm | Type | Safety | Purpose |
|-----------|------|--------|---------|
| FFTAnalyzer | Signal | CRITICAL | Vibration analysis, chatter detection |
| KalmanFilter | Control | CRITICAL | State estimation, sensor fusion |
| PIDController | Control | CRITICAL | Servo control, adaptive feed |
| KienzleForceModel | Manufacturing | CRITICAL | Cutting force prediction |
| StabilityLobeDiagram | Manufacturing | CRITICAL | Chatter avoidance |
| BayesianOptimizer | Optimization | HIGH | Parameter optimization |
| GeneticOptimizer | Optimization | HIGH | Multi-objective optimization |
| ParticleSwarm | Optimization | HIGH | Global search |
| SimulatedAnnealing | Optimization | MEDIUM | Combinatorial optimization |
| AntColonyTSP | Optimization | HIGH | Hole sequencing |
| MonteCarlo | Numerical | HIGH | Uncertainty quantification |
| NeuralInference | ML | MEDIUM | Prediction |
| DecisionTreeClassifier | ML | MEDIUM | Classification |
| ClusteringEngine | ML | LOW | Pattern discovery |
| NURBS | Geometry | HIGH | Surface evaluation |
| MinkowskiSum | Geometry | HIGH | Collision detection |
| JohnsonCookModel | Materials | CRITICAL | Constitutive model |
| ExtendedTaylorModel | Manufacturing | CRITICAL | Tool life prediction |
| ThermalFEAModel | Physics | HIGH | Temperature prediction |
| ToolDeflectionModel | Physics | HIGH | Deflection prediction |
| (33 more...) | Various | Various | Various |

### Registries (24)

| Registry | Entries | Purpose |
|----------|---------|---------|
| MaterialRegistry | 6,372 | Material properties |
| ToolRegistry | 95,608 | Cutting tools |
| MachineRegistry | 910 | CNC machines |
| FormulaRegistry | 509 | Mathematical formulas |
| AlgorithmRegistry | 53 | Algorithm modules |
| StrategyRegistry | 698 | Toolpath strategies |
| TribalKnowledgeRegistry | 4,493 | Shop floor tips |
| PostProcessorRegistry | 20 | Post processors |
| SkillRegistry | 66 | Slash commands |
| HookRegistry | 227 | Validation hooks |
| CustomerRegistry | 100+ | JM DIE customers |
| PhysicsMappingRegistry | 500+ | Physics mappings |
| CAMSystemRegistry | 18 | CAM systems |
| ControllerRegistry | 50+ | CNC controllers |
| KnowledgeBaseRegistry | 6 | Knowledge bundles |
| DecisionTreeRegistry | 6 | Decision trees |
| CadenceRegistry | 40 | Scheduled tasks |
| ReportTemplateRegistry | 7 | Reports |
| (6 more...) | Various | Various |

### Databases

| Database | Records | Location |
|----------|---------|----------|
| Materials | 6,372 | `data/materials/` |
| Tools | 95,608 | `data/tools/` |
| Machines | 910 | `data/machines/` |
| Strategies | 698 | `data/strategies/` |
| Tribal Tips | 4,493 | `data/tribal-knowledge/` |
| MIT Courses | 225 | `data/mit_ocw/` |
| Video Knowledge | 69 | `data/video-knowledge/` |

### JM DIE Program Archive

Located in: `H:/PRISM/JM DIE/`

| Machine Type | Programs | Format |
|--------------|----------|--------|
| CNC Lathe (Okuma) | 5,297 | .MIN |
| CNC Mill (Mastercam) | 3,713 | .mcx-8 |
| Legacy Mill | 1,825 | .MCX |
| Wire EDM | 2,500+ | Various |
| Other | 23,594 | Various |
| **Total** | **36,929** | |

### Knowledge Sources

| Source | Count | Status |
|--------|-------|--------|
| MIT OCW Courses | 225 | 9 integrated, 216 pending |
| Video Transcripts | 69 | Haas, Okuma, Mitsubishi, Fanuc, Mazak, Siemens |
| PDF Manuals | 100+ | Partially extracted |
| Tribal Knowledge | 4,493 | From 18 CAM systems |
| Playbook Rules | 296 | Experiential rules |
| Cross-Disciplinary | 32 | 8 scientific domains |

---

## Integration Status

### Currently Wired
- ~30% of engines to dispatchers
- ~50% of formulas to engines
- ~40% of algorithms to engines
- ~20% of tribal tips actively used
- 9 of 225 MIT courses integrated

### Phase 0.23-0.24 Target
- 100% of engines wired or flagged orphan
- 100% of formulas with verification coverage
- 100% of algorithms via unified API
- 100% of tips in abstraction hierarchy
- 100% of MIT courses mapped
- 100% of databases in Qdrant/search

---

## File Locations

```
H:/prism/
├── mcp-server/
│   ├── src/
│   │   ├── engines/           # 1,869 engines
│   │   ├── algorithms/        # 53 algorithms
│   │   ├── tools/dispatchers/ # 85 dispatchers
│   │   ├── registries/        # 24 registries
│   │   ├── physics/           # Physics constants
│   │   ├── hooks/             # 227 hooks
│   │   └── data/              # Knowledge data
│   └── data/
│       ├── materials/         # 6,372 materials
│       ├── tools/             # 95,608 tools
│       ├── machines/          # 910 machines
│       ├── strategies/        # 698 strategies
│       └── state/             # State files
├── JM DIE/                    # 36,929 programs
├── state/shared/              # Cross-session state
└── PRISM-INVENTORY-2026-04-15.md  # This file
```

---

## Quick Reference Commands

```bash
# Count engines
find mcp-server/src/engines -name "*.ts" | wc -l

# Count algorithms  
find mcp-server/src/algorithms -name "*.ts" | wc -l

# Count dispatchers
ls mcp-server/src/tools/dispatchers/*.ts | wc -l

# Check baseline
cat mcp-server/data/state/BASELINE_INVENTORY.json
```

---

**Last Updated:** 2026-04-15
**Next Update:** After Phase 0.24 completion
