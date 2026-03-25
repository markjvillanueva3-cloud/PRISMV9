# PRISM System Context — Auto-loaded every session

## What PRISM Is
CNC manufacturing intelligence platform that takes engineering drawings and produces
physics-optimized CNC programs with per-block variable speeds/feeds. The system matches
AND improves upon human-programmed results.

## Architecture
```
MCP Server (TypeScript):  C:/PRISM/mcp-server/ — 1,245 engines, 77 dispatchers, 2,700+ actions
Web App (React/Vite):     C:/PRISM/mcp-server/web/src/ — 45 pages, partially wired to backend
CAD Engine (Python):      C:/PRISM/cad-engine/ — CadQuery 2.x + OpenCascade, 176 Python files
Physics Constants:        C:/PRISM/mcp-server/src/physics/constants.ts — canonical Kienzle/Taylor
Registries:               C:/PRISM/mcp-server/src/registries/ — 24 registries, 23K LOC
Data:                     95,608 tools, 910 machines, 2,957 materials, 3,700+ tribal tips
```

## What's Built — Use These Instead of Building New
### 9 Manufacturing Pipelines (DON'T rebuild, wire to them):
- `PrintToProgramPipelineEngine` — milling (has X0 Y0 bug, planned fix)
- `TurningPrintToProgramEngine` — turning (G96/G97, TNRC, 24 gaps)
- `MultiAxisPrintToProgramEngine` — 5-axis
- `MillTurnSwissPipelineEngine` — mill-turn/swiss (multi-channel)
- `EDMProgramAssemblerEngine` — wire/sinker/micro EDM (6 dialects, production-ready)
- `GrindingProgramAssemblerEngine` — 5 types, 6 dialects (ONLY engine using canonical enrichment)
- `LaserProgramAssemblerEngine` — cut/mark/weld/drill + nesting (7 dialects)
- `WaterjetProgramAssemblerEngine` — AWJ/pure/taper/depth + nesting (6 dialects)
- `QuoteToShipOrchestratorEngine` — 21-stage business pipeline (NOT exported from index.ts yet)

### PostProcessor (38 stages, production-grade):
- `PostProcessorPipelineEngine` — per-block S/F variability, 20 controller dialects
- 7 phases: input normalization → physics → block-by-block → motion → stochastic → safety → output

### Central Physics Hub:
- `SpeedFeedOrchestratorEngine` — 8 resolvers, 2,851 lines, Monte Carlo UQ
- `KienzleForceModelEngine` — Kienzle with corrections (rake, wear, speed, size effect)
- `ChatterStabilityLobeEngine` — SLD generation
- `ThermalWearCouplingEngine` — coupled ODE (RK4), Usui wear

### Key Registries (USE these, don't hardcode data):
- `MaterialRegistry` — 2,957 materials with physics properties
- `ToolRegistry` — 95,608 tools with geometry
- `MachineRegistry` — 910 machines with kinematics
- `ToolpathStrategyRegistry` — 762 strategies across 18 CAM systems
- `FormulaRegistry` — 499 formulas
- `AlgorithmRegistry` — 51 algorithms

### Quality/Compliance (exist, need wiring):
- `SPCProcessCapabilityEngine` — Cp/Cpk/Pp/Ppk + Nelson rules
- `FirstArticleInspectionPipelineEngine` — AS9102 FAI
- `MaterialCertTraceabilityEngine` — full chain-of-custody (UNWIRED)
- `MetrologyUncertaintyEngine` — GUM-compliant uncertainty

### Business/ERP (42 wired to businessDispatcher):
- `QuoteEstimatorEngine`, `ActualCostEngine`, `CapacityPlanningEngine`
- `JobLifecycleEngine` (13-state), `OEECalculatorEngine`
- `GeneralLedgerEngine`, `InvoicingEngine`, `PayrollEngine` (exist, Phase 14)

### Learning/Knowledge:
- `OnboardingEngine` — 5 disclosure levels (NOT wired to frontend)
- `ApprenticeEngine` — 20 lessons, 5 challenges (NOT wired to frontend)
- `MachiningPlaybookEngine` — 296 rules
- `TribalKnowledgeEngine` — 3,700+ tips across 20 CAM systems

### Memory/Persistence (USE these for session continuity):
- `MemoryGraphEngine` — WAL-backed JSONL decision graph (state/memory_graph/)
- `SessionEventLogEngine` — tracks file changes, decisions, errors
- `TelemetryEngine` — records all tool invocations
- `ContextSnapshotEngine` — save/restore context snapshots

## Token-Efficient Navigation (use INSTEAD of Glob/Grep):
- `ENGINE_DIGEST.md` — ALL 1,245 engines with 1-line descriptions
- `DISPATCHER_DIGEST.md` — ALL 77 dispatchers with action counts
- `MASTER_INDEX_COMPACT.md` — full system map (~735 tokens)
- `/navigate <topic>` — zero-IO file routing
- `/code-index <shortcode>` — resolve E0001→path instantly

## Roadmap (what we're building, in order):
Master file: `C:/PRISM/CAMX-RESTRUCTURED-ROADMAP-v24.md` (~5,567 lines)
Current phase: check HANDOFF.md for exact position
```
Phase 0-A: Print Reading        ← EXECUTING NOW
Phase 0-B: Bug Fixes + Security
Phase 0-C: Test Infra + Real-World Validation (42+ parts)
Phase 0-D: Registry Wiring + Fusion Infrastructure + CAD Engine
Phase 1:   Knowledge + Decisions + UX/Onboarding
Phase 2:   Business Logic + ERP + Lean Manufacturing
Phase 3:   Physics Fusion (24 plugins, 4 tiers, 3 convergence loops)
Phase 4:   Simulation + Performance + Lights-Out
Phase 5-11: Per-machine pipelines
Phase 12:  Match-then-improve validation (42+ real parts)
Phase 13:  Web UI + Deployment
Phase 14:  Future (embeddings, multi-agent, additive, plasma)
```

## Critical Rules
- **Effort: MAX always** (`/effort max` every session)
- **Compact every 2-3 units** (never exceed 3 without compacting)
- **Real-world validation** — all tests compare to manufacturer data
- **Multi-role scrutiny** at session exits (/prism-review with domain-adaptive agents)
- **Don't rebuild what exists** — check ENGINE_DIGEST.md first
- **Canonical constants** — import from src/physics/constants.ts, never inline
- **Desktop Claude coordination** — read/write C:/PRISM/state/shared/ for sync
