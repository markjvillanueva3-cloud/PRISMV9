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

### Also exist (check ENGINE_DIGEST.md for full list):
- Quality: SPC, FAI (AS9102), MaterialCert, Metrology — need wiring
- Business: 42 engines wired to businessDispatcher (Quote, Cost, Capacity, OEE, etc.)
- Learning: Onboarding, Apprentice, Playbook (296 rules), TribalKnowledge (3,700+ tips)
- Memory: MemoryGraph, SessionEventLog, Telemetry, ContextSnapshot

## Token-Efficient Navigation (use INSTEAD of Glob/Grep):
- `ENGINE_DIGEST.md` — ALL 1,245 engines with 1-line descriptions
- `DISPATCHER_DIGEST.md` — ALL 77 dispatchers with action counts
- `MASTER_INDEX_COMPACT.md` — full system map (~735 tokens)
- `/navigate <topic>` — zero-IO file routing
- `/code-index <shortcode>` — resolve E0001→path instantly

## Roadmap:
`C:/PRISM/CAMX-RESTRUCTURED-ROADMAP-v24.md` | Current position: HANDOFF.md
```
0-A/B/C: COMPLETE | 0-D: IN PROGRESS (registry wiring + CAD engine)
Phase 1-4: Knowledge → Business → Physics Fusion → Simulation
Phase 5-14: Per-machine pipelines → Validation → Web UI → Future
```

## Compact Instructions
When compacting this conversation, PRESERVE these critical facts:
- Current roadmap position (read from HANDOFF.md)
- Any physics constants or formulas being worked on (exact values, not approximations)
- Engine wiring state: which engines were modified and whether tests/review passed
- Incomplete work: what was started but not finished, with exact file paths
- Build state: last known build pass/fail and test counts
- Active bugs or regressions discovered during this session

After compaction, IMMEDIATELY:
1. Read C:/PRISM/state/HANDOFF.md for the RESUME section
2. Execute the resume instruction without asking the user
3. Do NOT summarize what happened — just continue working

## Critical Rules
- **Effort: MAX always** (`/effort max` every session)
- **Compact every 2-3 units** (never exceed 3 without compacting)
- **Real-world validation** — all tests compare to manufacturer data
- **Multi-role scrutiny** at session exits (/prism-review with domain-adaptive agents)
- **Don't rebuild what exists** — check ENGINE_DIGEST.md first
- **Canonical constants** — import from src/physics/constants.ts, never inline
- **Desktop Claude coordination** — read/write C:/PRISM/state/shared/ for sync
