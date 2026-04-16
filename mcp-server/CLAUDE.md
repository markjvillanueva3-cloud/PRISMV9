# PRISM MCP Server — Development Context

## CRITICAL SLASH COMMANDS — USE THESE PROACTIVELY
```
/pdf-learn      — Extract knowledge from PDFs → tribal tips/formulas (MUST USE for PDFs)
/video-learn    — Extract knowledge from videos → procedures/tips (MUST USE for videos)
/forge-triple   — Create engines + skills + hooks with EXHAUSTIVE extraction (MUST USE for new assets)
/dedup          — Check for duplicates BEFORE creating anything (MANDATORY)
/shop-knowledge — Extract tribal/shop floor knowledge
/wire-edm-studio — Full Wire EDM programming with AI
/lathe-studio   — Full lathe programming studio
/machine-harden — Harden AI for specific machine types
/auto-speed-feed — Calculate optimal speed/feed parameters
/quote-to-ship  — Full quote-to-ship pipeline
/scrutinize     — Deep code review and quality audit
/smart          — AI-powered intelligent task routing
```

## AUTO-INVOKE RULES (suggest these when triggered)
- "pdf" or "document" or "manual" mentioned → suggest /pdf-learn
- "video" or "youtube" or "tutorial" mentioned → suggest /video-learn
- "create engine" or "new engine" or "build" mentioned → suggest /forge-triple (after /dedup)
- "wire edm" or "wedm" mentioned → suggest /wire-edm-studio
- "lathe" or "turning" or "okuma" mentioned → suggest /lathe-studio
- "optimize" or "speed" or "feed" mentioned → suggest /auto-speed-feed
- "quote" or "estimate" or "cost" mentioned → suggest /quote-to-ship

## What This Is
Safety-critical CNC manufacturing MCP server. 82 dispatchers, 4,296 actions, 1,660+ engines.
Mathematical errors cause tool breakage, part scrap, and machine crashes.
Physics constants MUST come from src/physics/constants.ts — never inline.

## Self-Awareness Engine (H: Drive Access)
```typescript
import { prismSelfAwarenessEngine } from "./engines/PRISMSelfAwarenessEngine.js";

// JM DIE direct access (24,545 programs, 100+ customers)
engine.getJMDieCustomerPath("ALCOA")     // → "H:/PRISM/JM DIE/CNC LATHE/ALCOA"
engine.getJMDieProgramPaths("lathe")     // → all lathe folder paths
engine.searchJMDieCustomer("fast")       // → [{ name: "FASTENAL", path, machineTypes }]

// Tribal knowledge (3,700+ tips, 18 CAM systems)
engine.searchTribalKnowledge("thin wall milling")

// Playbook rules (296 experiential rules)
engine.searchPlaybookRules("roughing depth")

// Web search with trusted sources (Sandvik, Kennametal, Machinery's Handbook)
engine.generateWebSearch("carbide insert selection")

// Full drive awareness for context injection
engine.getFullDriveAwareness()

// AI FEATURES (150+ engines)
engine.recommendAIFeatures("build a new engine")
// → { primaryFeature, supportingFeatures, multiAgentStrategy, advisorApproach }

engine.searchAIFeatures("reasoning")
// → [ManufacturingReasoningEngine, MultiPathReasoningEngine, ...]

// MULTI-AGENT PATTERN
// For building tasks: BUILDER-SUPERVISOR pattern
// Spawn builder agent + physics-reviewer + test-reviewer + code-reviewer
// Use MultiAgentCoordinatorEngine for coordination
```
Full directive: `H:/prism/state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md`

## Test Shop: JM Die Company
JM Die is the canonical test shop for ALL PRISM development. Every feature, quote,
machine selection, and costing calculation must work against JM Die's real data.
- **Industry**: Cold heading die & tooling (fastener industry)
- **Machines**: 21 machines — 7 Okuma lathes, 5 mills (Hurco/Okuma/Haas/Roku-Roku), 2 Mitsubishi sinker EDMs, 1 Mitsubishi wire EDM, 6 support
- **Programs**: 20,157 files — 5,297 lathe .MIN, 3,713 Mastercam .mcx-8, 1,825 legacy .MCX
- **Programs root**: `H:/PRISM/JM DIE/`
- **Profile data**: `src/data/jm-die-profile.ts` (company metadata, controller map, customers)
- **Shop config engine**: `src/engines/ShopConfigurationEngine.ts` (rates, machines, profile)
- **Default profile ID**: `"jm-die"` (ShopConfigurationEngine.DEFAULT_PROFILE_ID)
- **Primary materials**: M2, D2, S7, A2 tool steels; tungsten/cobalt carbide; H13; graphite (EDM electrodes)
- **Customers**: 100+ fastener manufacturers (ITW, Alcoa, Optimas, SFS, Holo-Krome, etc.)
- **Upcoming data**: Employee database, tool holders, tooling inventory, material stock, prints

## Structure
```
src/engines/           — 1,559 engines. CHECK ENGINE_DIGEST.md BEFORE creating new ones.
src/tools/dispatchers/ — 82 dispatchers routing to engines. Each has z.enum action list.
src/registries/        — 24 registries (materials, tools, machines, strategies, formulas)
src/physics/           — constants.ts = canonical Kienzle/Taylor/material DB. IMPORT from here.
src/algorithms/        — 52 algorithms (Kienzle, SLD, MonteCarlo, Bayesian, etc.)
src/mcp/               — MCP protocol (auth, elicitation, health probes, sampling, tasks)
src/schemas/           — Zod schemas per dispatcher action
src/hooks/             — Safety hooks (crossFieldPhysics, materialSanity, machineLimitGuard)
src/middleware/        — Auth middleware, rate limiting, validation
src/db/                — PostgreSQL schema + connection pooling (20 connections)
src/routes/            — Express API routes (51 files including /learning/*)
src/utils/             — Logger (Winston), atomicWrite, pipelineCheckpoint
src/__tests__/         — 808 test files (vitest 4.0)
web/src/               — React/Vite frontend (45 pages, 8 learning components)
dist/                  — 61MB esbuild bundle
```

## Key Engine Categories (don't rebuild — USE these)
- **Force/Physics** (17): KienzleForceModel, CuttingForce, StochasticCuttingForce, ConstitutiveModel...
- **Speed/Feed** (6): UltimateSpeedFeed, AutoSpeedFeed, SpeedFeedOrchestrator (central hub, 2,851 LOC)
- **Chatter/Stability** (13): ChatterStabilityLobe, RegenerativeChatter, DampingOptimization, StochasticChatter...
- **Deflection** (17): ToolDeflection, PartDeflection, BoringBarDeflection, StochasticDeflection...
- **Thermal** (24): CuttingTemperature, ThermalWearCoupling (RK4 ODE), CryogenicCutting, ThermalExpansion...
- **Wear/Life** (9): ToolWearProgression, AdvancedWearPhysics, StochasticToolLife (Weibull)...
- **Surface** (17): SurfaceFinishPredictor, SurfaceIntegrity, ResidualStress, StochasticSurfaceFinish...
- **CAM Bridges** (40): per-CAM strategy engines for 18 CAM systems
- **Post-Processing** (20): PostProcessorPipeline (38 stages!), LathePostProcessor, FiveAxisPost...
- **Quality/SPC** (10): SPCProcessCapability, NelsonSPCRules, MetrologyUncertainty, FAI...
- **Business/ERP** (42): QuoteEstimator, ActualCost, CapacityPlanning, JobLifecycle, OEE, GL, Invoicing...
- **Pipelines** (9): PrintToProgram, Turning, MultiAxis, MillTurn, EDM, Grinding, Laser, Waterjet, QuoteToShip

## Key Patterns
- Engines export singletons: `export const fooEngine = new FooEngine();`
- Dispatchers lazy-load: `const engine = await import("../engines/Foo.js");`
- Physics outputs: `AtomicValue<T> = { value, confidence, source, unit? }`
- Tests: vitest `describe/it/expect`, run with `npx vitest run [file]`
- Build: `npx tsc --noEmit` (type check) or `npm run build` (full)

## Build Commands
```bash
npm run build:fast        # esbuild only (~3s) — rapid iteration
npm run build:incremental # tsc incremental + esbuild (~10s) — faster rebuild
npm run build:verify      # full tsc + esbuild (~30s) — pre-commit validation
npm run build             # alias for build:verify
```

## Test Commands
```bash
npx vitest run              # run all tests
npx vitest run [file]       # run specific test file
npx vitest run --coverage   # run with coverage report
npx vitest --watch          # watch mode for development
```

## Schema Versioning
All JSON state files in `data/state/` require schema versioning:
- Every state JSON must have a `schemaVersion` field
- Migrations live in `src/migrations/` for version upgrades
- Backward compatibility maintained for N-1 versions
- Schema definitions in `src/schemas/` with Zod validation

## Distributed Locking (Orchestration)
For multi-agent orchestration, use distributed locks:
- Lock manager: `src/orchestration/DistributedLockManager.ts`
- Acquire locks before modifying shared state
- Use `withLock(resource, fn)` pattern for automatic release
- Lock timeout: 30s default, configurable per resource
- Conflict resolution: first-writer-wins with retry backoff

## Safety Rules
- NEVER inline Kienzle/Taylor constants — import from constants.ts
- NEVER create stub engines — enforcement hook blocks placeholder returns
- ALWAYS run tests after modifying engines — hook suggests affected test files
- ALWAYS check ENGINE_DIGEST.md before creating new engines — prevent duplicates
- Canonical constants: kc1.1 per ISO group (P=1800, M=2100, K=1100, N=700, S=2800, H=3200)

## Duplication Guard Protocol (MANDATORY)
Before creating ANY new engine, algorithm, formula, hook, or MCP action:
```typescript
import { duplicationGuardEngine } from "./engines/DuplicationGuardEngine.js";

// MANDATORY CHECK — blocks duplicate work across ALL chat sessions
const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine",  // "engine" | "algorithm" | "formula" | "action" | "hook"
  proposedName: "MyNewEngine",
  keywords: ["cutting", "force", "prediction"],
  description: "Predicts cutting forces using XYZ model"
});

if (check.shouldProceed === false) {
  // USE existing asset instead: check.matches[0]
  // DO NOT create duplicate
}
```
**Current inventory**: 1,559 engines, 499 formulas, 60+ algorithms, 4,296 actions
**Fuzzy matching**: catches renamed/similar assets (85% threshold)
**Cross-session sync**: registered assets visible to ALL Claude/Codex sessions

## Creative Reasoning & AI Optimization
For complex problems, use hybrid approaches and cross-domain synthesis:
```typescript
import { prismCreativeReasoningEngine } from "./engines/PRISMCreativeReasoningEngine.js";

// Explore all solution paths: conventional → exploratory → hybrid → innovative → optimal
const exploration = prismCreativeReasoningEngine.explore({
  domain: "cutting_parameters",  // or toolpath, material, fixture, process, etc.
  objective: "Optimize roughing strategy for titanium",
  constraints: ["Tool life > 60 min", "Ra < 3.2"],
  desiredOutcome: "Maximum MRR with acceptable wear",
  flexibility: "flexible"  // "strict" | "moderate" | "flexible" | "maximum"
}, "optimal");  // mode: conventional | exploratory | hybrid | innovative | optimal

// Returns: solutions[], hybridCombinations[], novelInsights[], recommendedSolution
```

**Cross-domain synthesis**: 15 scientific disciplines (control theory, materials science, robotics, ML, precision)
**120+ formulas/algorithms**: PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, etc.
**Think outside the box**: Don't fall into norms — hybrid approaches and novel solutions are encouraged
