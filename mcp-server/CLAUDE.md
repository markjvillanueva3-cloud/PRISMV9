# PRISM MCP Server — Development Context

## What This Is
Safety-critical CNC manufacturing MCP server. 77 dispatchers, 2,700+ actions, 1,245 engines.
Mathematical errors cause tool breakage, part scrap, and machine crashes.
Physics constants MUST come from src/physics/constants.ts — never inline.

## Structure
```
src/engines/           — 1,245 engines. CHECK ENGINE_DIGEST.md BEFORE creating new ones.
src/tools/dispatchers/ — 77 dispatchers routing to engines. Each has z.enum action list.
src/registries/        — 24 registries (materials, tools, machines, strategies, formulas)
src/physics/           — constants.ts = canonical Kienzle/Taylor/material DB. IMPORT from here.
src/algorithms/        — 51 algorithms (Kienzle, SLD, MonteCarlo, Bayesian, etc.)
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

## Safety Rules
- NEVER inline Kienzle/Taylor constants — import from constants.ts
- NEVER create stub engines — enforcement hook blocks placeholder returns
- ALWAYS run tests after modifying engines — hook suggests affected test files
- ALWAYS check ENGINE_DIGEST.md before creating new engines — prevent duplicates
- Canonical constants: kc1.1 per ISO group (P=1800, M=2100, K=1100, N=700, S=2800, H=3200)
