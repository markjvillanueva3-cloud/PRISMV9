# PHASE R14: PRODUCT FEATURES
### RECOMMENDED_SKILLS: prism-post-processor-reference, prism-fanuc-programming, prism-siemens-programming, prism-cutting-mechanics, prism-process-optimizer
### HOOKS_EXPECTED: ALL
### DATA_PATHS: C:\PRISM\mcp-server\src\engines, C:\PRISM\MANUFACTURER_CATALOGS, C:\PRISM\data\tool_holders

<!-- ANCHOR: r14_build_four_flagship_product_features -->
## Build Four Flagship Product Features on Extracted Manufacturing Intelligence
<!-- ANCHOR: r14_v20_0_prerequisites_r13_complete -->
## v20.0 | Prerequisites: R13 complete (7+ extracted engines wired)
# DEPENDS ON: R13 complete (RulesEngine, BestPracticesEngine, TroubleshootingEngine,
#   OperationSequencer, ToolSelectorEngine, ConstraintEngine, CostOptimizerEngine, GCodeLogicEngine)
# PRIORITY: Product-visible features that compose extracted intelligence into user-facing capabilities

---

<!-- ANCHOR: r14_quick_reference -->
## QUICK REFERENCE (standalone after compaction — no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R14 = CC 60% + MCP 40%. Product Manager → Intelligence Architect → Safety Engineer.
```

---

<!-- ANCHOR: r14_knowledge_contributions -->
## KNOWLEDGE CONTRIBUTIONS
```
BRANCH 1 (Execution Chain): 4 flagship product orchestrators compose 7+ R13 engines.
  PostProcessorFramework, QuotingEngine, ProcessPlanningEngine, IntelligentTroubleshooter.
  Each product is a multi-engine composition — chains validated end-to-end.
BRANCH 2 (Data Taxonomy): Manufacturer catalog data (116 PDFs → structured JSON).
  Tool holder schema v2 (85 parameters). OpenAPI spec for 13 REST endpoints.
BRANCH 3 (Relationships): Product composition graphs: which engines feed which products.
  Constraint propagation: machine limits → operation limits → tool limits → safety checks.
BRANCH 4 (Session Knowledge): UIR design decisions, dialect translation patterns,
  Bayesian diagnosis tuning, cost model calibration, process planning heuristics.
AT PHASE GATE: 4 products live. 13 REST endpoints documented. Ω ≥ 0.75 target.
```

---

<!-- ANCHOR: r14_execution_model -->
### EXECUTION MODEL
```
Environment: Claude Code 60% / Claude.ai MCP 40%
Model: Sonnet (implementation) → Opus (architecture, safety, gate)

CC TASKS: MS0 (scaffolds), MS1 steps 1-3, MS2 steps 1-3, MS3 steps 1-3,
  MS4 steps 1-2, MS5 (catalog parsing), MS6 (holder data), MS7 (API docs)
MCP TASKS: MS1 steps 4-6 (safety), MS2 steps 4-5 (validation), MS3 steps 4-6 (safety),
  MS4 steps 3-5 (wiring/testing), MS8 (gate)

PARALLEL EXECUTION:
  MS1 (Post Processor) and MS2 (Quoting) can run in parallel after MS0
  MS4 (Troubleshooter) can run parallel with MS2/MS3
  MS5 (Catalogs) and MS6 (Holders) can run parallel with MS3/MS4
  MS3 (Process Planning) needs MS1 complete (G-code output option)
  MS7 (REST API) needs MS1-MS4 complete
  MS8 (Gate) is final

SAFETY CLASSIFICATION:
  CRITICAL: MS1 (Post Processor — generates machine instructions)
  HIGH: MS3 (Process Planning — recommends operations + tooling)
  STANDARD: MS2 (Quoting — financial), MS4 (Troubleshooter — advisory)
```

---

<!-- ANCHOR: r14_phase_objective -->
## PHASE OBJECTIVE

R13 extracted the manufacturing intelligence. R14 composes it into 4 flagship products
that represent PRISM's core user-facing value proposition:

| Product | R13 Engines Used | Safety Class | Value Proposition |
|---------|-----------------|--------------|-------------------|
| **Post Processor** | GCodeLogicEngine, ConstraintEngine, RulesEngine | CRITICAL | Universal G-code for 6+ controllers |
| **Cost Estimation / Quoting** | CostOptimizerEngine, ToolSelectorEngine, OperationSequencer | STANDARD | Full job costing → competitive quote |
| **Process Planning** | OperationSequencer, ToolSelectorEngine, ConstraintEngine, RulesEngine | HIGH | Features → optimized operation sequence |
| **Intelligent Troubleshooter** | TroubleshootingEngine, BestPracticesEngine, AlarmRegistry | STANDARD | Bayesian diagnosis with 10,033 alarm codes |

Additionally: manufacturer catalog parsing (116 PDFs), tool holder schema v2 (85 params),
REST API expansion (5 → 13 endpoints), and OpenAPI documentation.

**Composition Principle:** Products COMPOSE R13 engines — they don't duplicate logic.
PostProcessorFramework calls GCodeLogicEngine.generateBlock(), not reimplements it.
ProcessPlanningEngine calls OperationSequencer.optimize(), not copies the algorithm.

---

<!-- ANCHOR: r14_dependency_map -->
## DEPENDENCY MAP
```
[R13] ──(7+ extracted engines)──→ [R14]
                                    │
                                    ├── MS0: Architecture (all products)
                                    ├── MS1: Post Processor ─────────────→ MS3: Process Planning
                                    ├── MS2: Quoting (parallel with MS1) ↗
                                    ├── MS4: Troubleshooter (parallel with MS2/MS3)
                                    ├── MS5: Catalog Parsing (parallel with MS3/MS4)
                                    ├── MS6: Tool Holders (parallel with MS5)
                                    ├── MS7: REST API (needs MS1-MS4)
                                    └── MS8: Phase Gate
```

---

<!-- ANCHOR: r14_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: R13 extracted 7+ monolith intelligence engines (~27,000 lines of machining
expertise) into typed TypeScript engines with MCP actions. RulesEngine, BestPracticesEngine,
TroubleshootingEngine, OperationSequencer, ToolSelectorEngine, ConstraintEngine,
CostOptimizerEngine, GCodeLogicEngine — all wired, tested, and safety-reviewed.

WHAT THIS PHASE DOES: Compose those engines into 4 flagship products. Add manufacturer
catalog data, enhanced tool holder schema, expanded REST API, and OpenAPI documentation.

WHAT COMES AFTER: System is feature-complete for manufacturing intelligence. Future phases
(R15+) would focus on: ML training on accumulated data, multi-machine optimization,
digital twin integration, real-time sensor feedback, shop floor scheduling, ERP integration.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: All R13 engines, existing GCodeTemplateEngine, AlarmRegistry, MaterialRegistry,
    MachineRegistry, ToolRegistry, C:\PRISM\MANUFACTURER_CATALOGS\, data\tool_holders\
  PRODUCES: 4 product engines, 8+ new REST endpoints, OpenAPI spec, parsed catalog data,
    upgraded holder schema, comprehensive test suite (50-60 new tests)

TEST LEVELS: L1-L5 required for CRITICAL products (Post Processor, Process Planning).
  L1-L3 for STANDARD products (Quoting, Troubleshooter).

---

<!-- ANCHOR: r14_fault_injection_test -->
## FAULT INJECTION TEST (XA-13)

R14 FAULT TEST: Post processor with spindle speed exceeding machine max RPM → verify BLOCK.
  WHEN: After MS1 (Post Processor Framework) is complete.
  HOW: Call prism_product:post_process with controller="FANUC", spindle_speed=50000 on a
    machine rated for 12000 RPM max.
  EXPECTED: Returns error "⚠️ SAFETY BLOCK: Spindle speed 50000 RPM exceeds machine max 12000 RPM"
    with NO G-code output. Safety score S(x) < 0.70 logged.
  PASS: Error returned, no G-code emitted, safety block triggered.
  FAIL: G-code generated with unsafe spindle speed, or silent parameter clamping without warning.
  EFFORT: ~3 calls.

---

<!-- ANCHOR: r14_ralph_validator_map -->
## R14 Ralph Validator Map
```
MS0-*     -> architecture       (API contracts, composition DAGs)
MS1-T1/2  -> physics            (UIR, dialect translation correctness)
MS1-T3    -> code_quality       (PostProcessorFramework composition)
MS1-T4/5  -> safety             (G-code safety — MANDATORY Opus)
MS2-*     -> physics + finance  (cost model correctness)
MS3-T1/2  -> physics            (feature mapping, operation sequencing)
MS3-T3    -> physics            (machine selection intelligence)
MS3-T4/5  -> safety             (process plan safety review)
MS4-*     -> physics            (Bayesian diagnosis correctness)
MS5-*     -> data_integrity     (catalog extraction accuracy)
MS6-*     -> data_integrity     (holder schema completeness)
MS7-*     -> infrastructure     (API correctness, docs)
MS8-*     -> [full panel]       (phase gate)
```

---

<!-- ANCHOR: r14_task_dag -->
## R14 Task DAG
```
                 ┌── [MS1: Post Processor] ──────────→ [MS3: Process Planning] ──┐
[MS0: Arch] ─────┤                                                                ├── [MS7: REST] ── [MS8: GATE]
                 ├── [MS2: Quoting] ──────────────────────────────────────────────┤
                 ├── [MS4: Troubleshooter] ───────────────────────────────────────┤
                 └── [MS5: Catalogs] ─── [MS6: Holders] ─────────────────────────┘
```

---

<!-- ANCHOR: r14_ms0_product_architecture -->
## MS0: PRODUCT ARCHITECTURE + API DESIGN
### Role: Product Manager → Systems Architect | Model: Opus | Effort: M (~15 calls) | Sessions: 1

### Objective
Define API contracts for all 4 products. Draw composition DAGs. Classify safety levels.
Create typed scaffolds. Design REST endpoints.

### MS0 Task DAG
```
[T1: API contracts] ──→ [T2: Composition DAGs] ──→ [T3: REST design] ──→ [T4: Scaffolds] ──→ [T5: Verify]
```

#### MS0-T1: Define Product API Contracts (~4 calls)
```
TASK: MS0-T1
  DEPENDS_ON: [R13 COMPLETE]
  ARCHETYPE: implementer
  MODEL: opus (architecture)
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: data/docs/r14/
  GATE: YOLO
  SUCCESS: All 4 product APIs defined with input/output/error schemas
  ESTIMATED_CALLS: 4
```
1. Define TypeScript interfaces for each product:

**POST PROCESSOR:**
```typescript
interface PostProcessInput {
  controller: 'FANUC' | 'HAAS' | 'SIEMENS' | 'MAZAK' | 'OKUMA' | 'HURCO';
  operations: UIROperation[];
  machine?: string; // machine_id for limit checking
  options?: { line_numbers?: boolean; comments?: boolean; metric?: boolean };
}
interface PostProcessOutput {
  gcode: string;
  summary: { tool_count: number; estimated_time_min: number; axis_ranges: AxisRanges };
  warnings: Warning[];
  safety: { score: number; passed: boolean; issues: string[] };
}
```

**QUOTING:**
```typescript
interface QuoteInput {
  material: string; // material_id
  operations: Operation[];
  batch_size: number;
  shop_config?: { machine_rate: number; operator_rate: number; overhead_factor: number; margin_pct: number };
}
interface QuoteOutput {
  total_cost: number;
  unit_cost: number;
  breakdown: { material: number; machining: number; tooling: number; setup: number; overhead: number; profit: number };
  alternatives?: AlternativeQuote[];
  break_even_quantity?: number;
}
```

**PROCESS PLANNING:**
```typescript
interface ProcessPlanInput {
  features: Feature[];
  material: string;
  machines?: string[]; // available machine_ids
  constraints?: Constraint[];
}
interface ProcessPlanOutput {
  plan: ProcessPlan;
  operations: SequencedOperation[];
  tooling: ToolAssignment[];
  estimated_time: { setup_min: number; machining_min: number; total_min: number };
  cost_estimate?: QuoteOutput;
}
```

**INTELLIGENT TROUBLESHOOTER:**
```typescript
interface TroubleshootInput {
  symptoms: string[];
  alarm_code?: string;
  controller?: string;
  recent_operations?: string[];
  machine_context?: { spindle_hours: number; last_maintenance: string };
}
interface TroubleshootOutput {
  diagnoses: Array<{ cause: string; probability: number; evidence: string[]; fix: string; prevention: string }>;
  confidence: number;
  recommended_actions: string[];
  related_alarms?: string[];
  best_practices?: string[];
}
```

2. Document in `data/docs/r14/API_CONTRACTS.md`.

#### MS0-T2: Composition DAGs (~3 calls)
1. For each product, document which R13 engines compose and in what order:
   ```
   POST PROCESSOR:
     UIR → GCodeLogicEngine.generateBlock() → GCodeTemplateEngine.format()
       → ConstraintEngine.validate() → SafetyValidator.check()
   
   QUOTING:
     OperationSequencer.optimize() → ToolSelectorEngine.selectTool()
       → CostOptimizerEngine.optimize() → QuotingEngine.calculate()
   
   PROCESS PLANNING:
     FeatureMapper.map() → OperationSequencer.optimize()
       → ToolSelectorEngine.selectTool() → ConstraintEngine.validate()
       → CostOptimizerEngine.optimize() → (optional) PostProcessor.generate()
   
   TROUBLESHOOTER:
     TroubleshootingEngine.diagnose() + AlarmRegistry.decode()
       → BayesianUpdater.update() → BestPracticesEngine.getRecommendations()
       → KnowledgeGraphEngine.findRelated()
   ```
2. Identify shared engines: ConstraintEngine used by 3 products, OperationSequencer by 2.

#### MS0-T3: REST Endpoint Design (~3 calls)
1. Design 8 new REST endpoints (adding to 5 existing from R4):
   - `POST /api/v1/post-process` → PostProcessorFramework
   - `POST /api/v1/quote` → QuotingEngine
   - `POST /api/v1/process-plan` → ProcessPlanningEngine
   - `POST /api/v1/troubleshoot` → IntelligentTroubleshooter
   - `POST /api/v1/toolpath-strategy` → ToolpathEngine
   - `POST /api/v1/wear-predict` → WearPredictionEngine
   - `POST /api/v1/what-if` → WhatIfEngine
   - `POST /api/v1/material-substitute` → MaterialSubstitutionEngine
2. All endpoints: auth via F7 Bridge, audit logging, correlation IDs, rate limiting.

#### MS0-T4: Scaffold Files (~3 calls)
1. Create typed shells:
   - `src/engines/product/PostProcessorFramework.ts`
   - `src/engines/product/QuotingEngine.ts`
   - `src/engines/product/ProcessPlanningEngine.ts`
   - `src/engines/product/IntelligentTroubleshooterEngine.ts`
2. Each: imports, typed interfaces, method stubs with `// TODO: MS{N}` markers.
3. Create test scaffolds: `tests/r14/{product}-tests.ts` (empty, with describe blocks).

#### MS0-T5: Verify + Commit (~2 calls)
1. `npm run build` → scaffolds compile (stubs return placeholder data).
2. `git commit -m "R14-MS0: Product architecture — API contracts, DAGs, scaffolds"`

**Rollback:** Remove data/docs/r14/, scaffolds
**Exit:** 4 product APIs defined, composition DAGs documented, scaffolds compiling.

---

<!-- ANCHOR: r14_ms1_post_processor_framework -->
## MS1: POST PROCESSOR FRAMEWORK
### Role: Safety Engineer → Intelligence Architect | Model: Sonnet (implementation) → Opus (MANDATORY safety) | Effort: XL (~35 calls) | Sessions: 2-3

### ⚠️ SAFETY NOTICE: Post processor generates G-code that controls CNC machines.
### Errors can cause tool explosions, machine crashes, and operator injuries.
### safety-physics Opus review is MANDATORY before wiring.

### Objective
Build Universal Intermediate Representation (UIR), 6 controller dialect translators, and
PostProcessorFramework orchestrator. Wire to MCP + REST.

### Source: R13 GCodeLogicEngine, existing GCodeTemplateEngine, prism-fanuc-programming skill,
  prism-siemens-programming skill, prism-post-processor-reference skill

### MS1 Task DAG
```
[T1: UIR schema] ──→ [T2: Dialect translators] ──→ [T3: Framework] ──→ [T4: Safety review] ──→ [T5: Test programs] ──→ [T6: Wire MCP+REST]
```

#### MS1-T1: Universal Intermediate Representation (UIR) (~6 calls)
```
TASK: MS1-T1
  DEPENDS_ON: [MS0 COMPLETE]
  ARCHETYPE: implementer
  MODEL: opus (architecture) → sonnet (implementation)
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: src/engines/product/uir/
  GATE: GATED (UIR design review)
  SUCCESS: UIR schema defined, validated against 3 controller dialects
  ESTIMATED_CALLS: 6
```
1. Create `src/engines/product/uir/` directory.
2. Define UIR schema — controller-agnostic representation of machining intent:
   ```typescript
   type UIRNode =
     | { type: 'rapid_move'; target: Position3D; }
     | { type: 'linear_move'; target: Position3D; feed: number; }
     | { type: 'arc_move'; target: Position3D; center: Position3D; direction: 'CW' | 'CCW'; feed: number; }
     | { type: 'tool_change'; tool_number: number; offset: number; }
     | { type: 'spindle'; speed: number; direction: 'CW' | 'CCW' | 'STOP'; }
     | { type: 'coolant'; mode: 'flood' | 'mist' | 'through_spindle' | 'off'; }
     | { type: 'canned_cycle'; cycle: CannedCycleType; params: CycleParams; }
     | { type: 'dwell'; seconds: number; }
     | { type: 'comment'; text: string; }
     | { type: 'program_start'; number?: number; comment?: string; }
     | { type: 'program_end'; }
     | { type: 'safe_start'; }; // controller-specific safe initialization
   ```
3. UIR validation rules:
   - No `linear_move` without prior `spindle` CW/CCW
   - No `rapid_move` below last safe Z (must have retract first)
   - No `tool_change` without prior spindle STOP
   - No `canned_cycle` without prior spindle and feed
4. Create `UIRValidator.validate(nodes: UIRNode[]): ValidationResult`

#### MS1-T2: Controller Dialect Translators (~12 calls)
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  ARCHETYPE: implementer
  MODEL: sonnet (CC — bulk implementation)
  EFFORT: STANDARD
  PARALLEL: false (sequential for interface consistency)
  SCOPE: src/engines/product/dialects/
  GATE: YOLO per dialect, GATED on final set
  SUCCESS: 6 dialect translators compile and produce syntactically valid output
  ESTIMATED_CALLS: 12 (2 per dialect)
```
Create `src/engines/product/dialects/` with one translator per controller:

1. **FanucDialect.ts** (reference implementation):
   - Safe start: `G90 G94 G17 G40 G49 G80 G54`
   - Tool change: `T{n} M06 / G43 H{n} / S{rpm} M03`
   - Coordinates: `X{f} Y{f} Z{f}` (fixed decimal)
   - Canned cycles: G81-G89 with R-plane
   - Program end: `M05 M09 G91 G28 Z0 / M30`

2. **HaasDialect.ts** (Fanuc-compatible + extensions):
   - Same G-code base as Fanuc
   - Additions: macro variables, M10/M11 for 4th axis
   - Setting references: Setting 7 (canned cycle return)

3. **SiemensDialect.ts** (fundamentally different):
   - Addresses: `X=... Y=... Z=...` (assignment syntax)
   - Tool change: `T{n} D{n} / M6`
   - Cycles: CYCLE81-CYCLE89 (parameterized)
   - Modal groups differ from Fanuc
   - Program structure: `%_N_PROG_MPF` wrapper

4. **MazakDialect.ts** (Mazatrol + EIA dual-mode):
   - EIA mode: Fanuc-compatible
   - Mazatrol mode: conversational format (future — EIA first)

5. **OkumaDialect.ts** (OSP):
   - Different modal groups, G-code numbers
   - `CALL OPN` for subprogram calls
   - Unique canned cycle syntax

6. **HurcoDialect.ts** (WinMax + EIA):
   - EIA mode: similar to Fanuc
   - NC block format differences
   - Specific M-codes for probing

Each translator implements:
```typescript
interface DialectTranslator {
  translate(nodes: UIRNode[]): string;
  getSafeStart(): string[];
  getToolChange(tool: number, offset: number): string[];
  getProgramEnd(): string[];
  getModalGroups(): ModalGroupDefinition[];
}
```

#### MS1-T3: PostProcessorFramework.ts (~5 calls)
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: src/engines/product/PostProcessorFramework.ts
  GATE: GATED (architecture review)
  SUCCESS: Framework compiles, generates G-code for simple test
  ESTIMATED_CALLS: 5
```
1. Implement orchestrator:
   ```typescript
   export class PostProcessorFramework {
     generate(input: PostProcessInput): PostProcessOutput {
       // 1. Validate UIR nodes
       const validation = UIRValidator.validate(input.operations);
       if (!validation.valid) return errorResult(validation);
       
       // 2. Select dialect
       const dialect = this.getDialect(input.controller);
       
       // 3. Apply machine limits (if machine specified)
       if (input.machine) this.applyMachineLimits(input);
       
       // 4. Generate G-code via dialect translator
       const gcode = dialect.translate(input.operations);
       
       // 5. SAFETY CHECK (mandatory, blocking)
       const safety = this.safetyCheck(gcode, input);
       if (!safety.passed) return safetyBlockResult(safety);
       
       // 6. Return with summary
       return { gcode, summary: this.generateSummary(input), warnings: [], safety };
     }
   }
   ```
2. Wire to R13 GCodeLogicEngine for modal tracking.
3. Wire to ConstraintEngine for machine limit validation.

#### MS1-T4: Safety Validation (MANDATORY) (~5 calls)
```
TASK: MS1-T4
  DEPENDS_ON: [MS1-T3]
  ARCHETYPE: safety-physics
  MODEL: opus (MANDATORY)
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: PostProcessorFramework safety logic
  GATE: GATED — HARD BLOCK if safety review fails
  SUCCESS: Safety-physics approves all safety checks in framework
  ESTIMATED_CALLS: 5
```
1. Safety-physics reviews PostProcessorFramework.safetyCheck():
   - Verify: rapid moves ALWAYS above safe retract height
   - Verify: spindle speed NEVER exceeds machine max RPM
   - Verify: feed rate NEVER exceeds machine max feed
   - Verify: no cutting without coolant (when coolant is specified)
   - Verify: tool change sequence includes spindle stop + retract
   - Verify: no modal conflicts in generated output
2. Review each dialect translator's safe start block for completeness.
3. Attempt to craft adversarial inputs that bypass safety:
   - Spindle speed = MAX_INT → must be caught
   - Rapid move to Z-100 (into table) → must be caught
   - Tool change at Z-50 (in pocket) → must be caught
4. S(x) ≥ 0.70 on framework design. HARD BLOCK if fails.

#### MS1-T5: Test with Known Programs (~4 calls)
```
TASK: MS1-T5
  DEPENDS_ON: [MS1-T4]
  ARCHETYPE: implementer → verifier
  MODEL: sonnet (generation) → opus (review)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: tests/r14/post-processor-tests.ts
  GATE: GATED (15 test programs must pass)
  SUCCESS: 15 test programs (5 ops × 3 controllers) syntactically valid
  ESTIMATED_CALLS: 4
```
1. Generate G-code for 5 standard operations × 3 controllers (FANUC, HAAS, SIEMENS):
   - Face mill: safe start → tool change → face at Z0 → retract → end
   - Pocket: safe start → tool change → pocket cycle → retract → end
   - Drill pattern: safe start → tool change → G81 canned cycle × 5 holes → retract → end
   - Contour: safe start → tool change → G41 comp → profile → G40 → retract → end
   - Thread mill: safe start → tool change → helical interpolation → retract → end
2. Verify each program: proper structure, valid syntax for controller, no safety violations.
3. Write tests in `tests/r14/post-processor-tests.ts`.

#### MS1-T6: Wire to MCP + REST (~3 calls)
```
TASK: MS1-T6
  DEPENDS_ON: [MS1-T5]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: productDispatcher.ts, bridgeDispatcher.ts
  GATE: YOLO
  SUCCESS: post_process action + REST endpoint live
  ESTIMATED_CALLS: 3
```
1. Add `post_process` to productDispatcher.
2. Add `POST /api/v1/post-process` to bridge with auth + audit logging.
3. Register in all indexing systems.
4. `git commit -m "R14-MS1: Post Processor Framework — 6 dialects, 15 test programs, SAFETY PASS"`

**Rollback:** Remove uir/, dialects/, PostProcessorFramework.ts
**Exit:** 6 controller dialects, 15 test programs pass, safety-physics PASS, REST endpoint live.

---

<!-- ANCHOR: r14_ms2_quoting_engine -->
## MS2: COST ESTIMATION / QUOTING ENGINE
### Role: Intelligence Architect → Product Manager | Model: Sonnet (impl) → Opus (review) | Effort: L (~25 calls) | Sessions: 1-2

### Objective
Build full job costing → competitive quote engine using R13 extracted intelligence.

### Source: R3 process_cost_calc, R13 CostOptimizerEngine, R13 OperationSequencer, R13 ToolSelectorEngine

### MS2 Task DAG
```
[T1: Cost model] ──→ [T2: QuotingEngine] ──→ [T3: Batch economics] ──→ [T4: Validate] ──→ [T5: Wire]
```

#### MS2-T1: Cost Model Architecture (~5 calls)
```
TASK: MS2-T1
  DEPENDS_ON: [MS0 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  SCOPE: src/engines/product/QuotingEngine.ts
  GATE: YOLO
  ESTIMATED_CALLS: 5
```
1. Build comprehensive cost model:
   ```
   TOTAL COST = MATERIAL + MACHINING + TOOLING + SETUP + OVERHEAD + PROFIT
   
   MATERIAL = part_weight_kg × cost_per_kg × (1 + waste_factor)
     waste_factor: bar stock = 0.15, plate = 0.25, near-net = 0.05
   
   MACHINING = Σ(operation_time_min × machine_rate_per_min) for each operation
     operation_time = volume_removed / MRR (from speed/feed calcs)
   
   TOOLING = Σ(tool_cost / parts_per_edge) for each tool used
     parts_per_edge = taylor_tool_life / operation_time_per_part
   
   SETUP = setup_time_min × operator_rate_per_min × number_of_setups
     setup_time: simple fixture = 15min, complex = 45min, 5-axis = 60min
   
   OVERHEAD = (material + machining + tooling + setup) × overhead_factor
     typical: 1.3-1.8x depending on shop
   
   PROFIT = subtotal × margin_percentage
     typical: 15-35% depending on complexity and competition
   ```
2. Use R13 engines for intelligent estimation:
   - CostOptimizerEngine: optimal parameters for minimum cost
   - ToolSelectorEngine: best tool for cost/performance balance
   - OperationSequencer: minimize setups to reduce setup cost

#### MS2-T2: QuotingEngine.ts Implementation (~6 calls)
1. Implement `QuotingEngine.generateQuote(input: QuoteInput): QuoteOutput`
2. Include shop_config defaults for shops that don't provide rates:
   - machine_rate: $85/hr (3-axis), $125/hr (5-axis), $150/hr (mill-turn)
   - operator_rate: $35/hr
   - overhead_factor: 1.5
   - margin: 25%
3. Include confidence level on each cost component:
   - HIGH: material cost (from registry), machining time (from calcs)
   - MEDIUM: tooling cost (depends on tool life assumptions)
   - LOW: setup time (highly variable), overhead (shop-dependent)

#### MS2-T3: Batch Economics (~5 calls)
1. Calculate setup cost amortization: `unit_setup_cost = total_setup_cost / batch_size`
2. Break-even analysis: `break_even_qty = fixed_costs / (price_per_unit - variable_cost_per_unit)`
3. Alternative scenarios:
   - Different machines: quote same part on 3-axis vs 5-axis
   - Different tooling: indexable vs solid carbide
   - Different materials: user's material vs substitutes
4. Volume discount modeling: tool life amortization improves at scale.

#### MS2-T4: Validate with Real Jobs (~5 calls)
```
TASK: MS2-T4
  DEPENDS_ON: [MS2-T3]
  ARCHETYPE: verifier
  MODEL: opus (plausibility review)
  EFFORT: NOVEL
  GATE: GATED (quotes must be within 2x of industry benchmarks)
  ESTIMATED_CALLS: 5
```
1. Quote 3 realistic jobs:
   - **Simple**: 6061-T6 aluminum bracket. 1 setup, 3 ops (face, pocket, drill). 100pc batch.
     Expected range: $5-15 per unit.
   - **Medium**: 4140 steel gear blank. 2 setups, 6 ops (face, turn OD, bore ID, groove, thread, inspect).
     25pc batch. Expected range: $40-120 per unit.
   - **Complex**: Ti-6Al-4V aerospace fitting. 4 setups, 12 ops. 5pc batch.
     Expected range: $500-2000 per unit.
2. Verify: quotes fall within expected ranges. If >2x off → investigate and fix.
3. Verify: breakdown percentages are reasonable (material shouldn't be 90% of total).

#### MS2-T5: Wire to MCP + REST (~4 calls)
1. Add `generate_quote` to productDispatcher.
2. Add `quote_compare` to productDispatcher (compare 2 approaches).
3. Add `POST /api/v1/quote` to bridge.
4. `git commit -m "R14-MS2: Quoting Engine — 3 validated jobs, batch economics"`

**Rollback:** Remove QuotingEngine, revert dispatchers
**Exit:** 3 realistic quotes within range, batch economics working, REST endpoint live.

---

<!-- ANCHOR: r14_ms3_process_planning_engine -->
## MS3: PROCESS PLANNING ENGINE
### Role: Intelligence Architect → Safety Engineer | Model: Sonnet (impl) → Opus (safety) | Effort: XL (~30 calls) | Sessions: 2-3

### Objective
Build feature-to-operation mapping, machine selection, and complete process planning
pipeline using R13 extracted intelligence. Wire to MCP + REST.

### Source: R13 OperationSequencer, ToolSelectorEngine, ConstraintEngine, RulesEngine

### MS3 Task DAG
```
[T1: Feature mapping] ──→ [T2: Planning engine] ──→ [T3: Machine selection] ──→ [T4: Validate] ──→ [T5: Safety review] ──→ [T6: Wire]
```

#### MS3-T1: Feature-to-Operation Mapping (~6 calls)
1. Define feature library:
   ```typescript
   type Feature =
     | { type: 'hole'; diameter: number; depth: number; tolerance?: number; finish?: number }
     | { type: 'pocket'; length: number; width: number; depth: number; corners?: 'sharp' | 'radius' }
     | { type: 'slot'; width: number; depth: number; length: number }
     | { type: 'face'; length: number; width: number; finish?: number }
     | { type: 'contour'; profile: Point2D[]; depth: number; draft_angle?: number }
     | { type: 'thread'; type: 'internal' | 'external'; size: string; pitch: number }
     | { type: 'chamfer'; width: number; angle: number }
     | { type: 'radius'; size: number; type: 'fillet' | 'round' };
   ```
2. Map each feature to operations using RulesEngine:
   - Hole Ø<6mm → center drill + drill
   - Hole Ø6-25mm + H7 → drill + ream
   - Hole Ø>25mm → drill + bore
   - Pocket rough → finish (2 ops)
   - Thread → drill + tap (or thread mill for >M10)
3. Use material properties to select operation variants:
   - Hardened steel: grinding instead of finish milling
   - Aluminum: high-speed strategies available

#### MS3-T2: ProcessPlanningEngine.ts (~8 calls)
1. Implement the full pipeline:
   ```typescript
   export class ProcessPlanningEngine {
     generatePlan(input: ProcessPlanInput): ProcessPlanOutput {
       // 1. Map features → operations
       const operations = this.featureMapper.map(input.features, input.material);
       
       // 2. Optimize sequence (R13 OperationSequencer)
       const sequenced = this.sequencer.optimize(operations);
       
       // 3. Select tools (R13 ToolSelectorEngine)
       const tooled = this.toolSelector.assignTools(sequenced, input.material);
       
       // 4. Validate constraints (R13 ConstraintEngine)
       const validated = this.constraintEngine.validate(tooled, input.machines);
       
       // 5. Select best machine (if multiple available)
       const machineSelection = this.selectMachine(validated, input.machines);
       
       // 6. Estimate cost (R14-MS2 QuotingEngine)
       const cost = this.quotingEngine.generateQuote({ ... });
       
       // 7. Optional: generate G-code (R14-MS1 PostProcessor)
       const gcode = input.generateGcode ? this.postProcessor.generate({ ... }) : null;
       
       return { plan, operations: sequenced, tooling: tooled, estimated_time, cost, gcode };
     }
   }
   ```

#### MS3-T3: Machine Selection Intelligence (~4 calls)
1. Given multiple available machines, score each by:
   - **Capability** (0-1): Can it physically do the operations? (axis count, travel, spindle type)
   - **Quality** (0-1): Can it achieve required tolerances? (positioning accuracy vs spec)
   - **Efficiency** (0-1): How fast? (spindle speed, rapid traverse, tool changer speed)
   - **Cost** (0-1): Hourly rate (inverse — cheaper is better)
2. Composite score: `0.3×capability + 0.2×quality + 0.3×efficiency + 0.2×cost`
3. Return ranked machines with scores and reasoning.

#### MS3-T4: Validate with Real Parts (~5 calls)
1. Plan 3 test parts:
   - **Prismatic**: Aluminum bracket — 4 holes, 1 pocket, 2 faces. 1 setup.
   - **Rotational**: Steel shaft — 3 diameters, 1 thread, 1 keyway. 2 setups (lathe + mill).
   - **Complex**: Titanium aerospace fitting — 6 holes, 2 pockets, 3 contours, 1 thread. 3 setups.
2. Verify each: sequence is logical, tools are appropriate, constraints met, time reasonable.

#### MS3-T5: Safety Review (~4 calls)
```
TASK: MS3-T5
  ARCHETYPE: safety-physics
  MODEL: opus
  EFFORT: NOVEL
  GATE: GATED — HARD BLOCK for safety issues
```
1. Safety-physics reviews all 3 test plans:
   - Roughing before finishing (proper sequence)
   - Adequate clamping force for cutting forces (R13 ConstraintEngine)
   - Tool reach sufficient (no collisions with fixtures)
   - Proper work-holding for each setup
2. S(x) ≥ 0.70 on each plan.

#### MS3-T6: Wire to MCP + REST (~3 calls)
1. Add `process_plan` to productDispatcher.
2. Add `plan_compare` to productDispatcher (compare plans for different machines).
3. Add `POST /api/v1/process-plan` to bridge.
4. `git commit -m "R14-MS3: Process Planning Engine — 3 test parts, safety PASS"`

**Rollback:** Remove ProcessPlanningEngine, revert dispatchers
**Exit:** 3 test parts planned, safety PASS, REST endpoint live.

---

<!-- ANCHOR: r14_ms4_intelligent_troubleshooter -->
## MS4: INTELLIGENT TROUBLESHOOTER
### Role: Intelligence Architect | Model: Sonnet (impl) → Opus (knowledge validation) | Effort: L (~20 calls) | Sessions: 1-2

### Objective
Build Bayesian diagnosis engine using R13 TroubleshootingEngine + AlarmRegistry for
probabilistic fault diagnosis across 12 controller families.

### Source: R13 TroubleshootingEngine, R13 BestPracticesEngine, AlarmRegistry (10,033 codes)

### MS4 Task DAG
```
[T1: Bayesian engine] ──→ [T2: Troubleshooter] ──→ [T3: Knowledge links] ──→ [T4: Test 10 scenarios] ──→ [T5: Wire]
```

#### MS4-T1: Bayesian Diagnosis Engine (~5 calls)
1. Implement Bayesian updating:
   ```typescript
   class BayesianDiagnoser {
     diagnose(evidence: Evidence[]): Diagnosis[] {
       let posteriors = this.priors; // from R13 TroubleshootingEngine
       for (const e of evidence) {
         posteriors = this.bayesUpdate(posteriors, e);
       }
       return posteriors
         .sort((a, b) => b.probability - a.probability)
         .slice(0, 5); // top 5 causes
     }
     
     private bayesUpdate(priors: Map<string, number>, evidence: Evidence): Map<string, number> {
       // P(cause|evidence) ∝ P(evidence|cause) × P(cause)
       const likelihoods = this.getLikelihoods(evidence);
       // ... normalize
     }
   }
   ```
2. Evidence types: alarm_code, symptom_keyword, machine_context, recent_operations.
3. Prior probabilities from R13 troubleshooting decision trees.

#### MS4-T2: IntelligentTroubleshooterEngine.ts (~5 calls)
1. Implement orchestrator:
   - Combine symptoms → TroubleshootingEngine.diagnose()
   - Combine alarm → AlarmRegistry.decode() → related failure modes
   - Bayesian update with all evidence
   - Enrich with best practices (prevention) and rules (what was violated)
2. Output: ranked diagnoses with probability, fix, prevention, related alarms.

#### MS4-T3: Knowledge Graph Integration (~3 calls)
1. Link diagnoses to BestPracticesEngine: after diagnosis, recommend prevention.
2. Link to RulesEngine: check if any machining rules were violated.
3. Link to FailureForensicsEngine: cross-reference historical patterns.

#### MS4-T4: Test with 10 Scenarios (~4 calls)
1. 5 alarm-based scenarios:
   - FANUC Alarm 401 (servo overload) → expect: excessive cutting force, tool dull, axis binding
   - HAAS Alarm 108 (axis overtravel) → expect: program error, offset wrong, reference lost
   - HURCO 2006 (spindle fault) → expect: belt broken, bearing failure, overload
   - OKUMA 1015 (turret) → expect: turret lock, index error, mechanical jam
   - Generic E-stop → expect: operator triggered, safety interlock, sensor fault
2. 5 symptom-based scenarios:
   - "chatter marks on surface" → expect: tool overhang, spindle speed near lobe, low rigidity
   - "tool broke during cut" → expect: chip load exceeded, hard spot, worn tool
   - "dimensions are off by 0.1mm" → expect: thermal drift, tool wear, offset error
   - "poor surface finish on aluminum" → expect: BUE, wrong speed, dull tool
   - "chips wrapping around tool" → expect: wrong chipbreaker, speed too low, depth too shallow
3. Each: top 3 causes, probabilities sum ~1.0, fix is actionable, prevention is specific.

#### MS4-T5: Wire to MCP + REST (~3 calls)
1. Add `troubleshoot` to productDispatcher.
2. Add `POST /api/v1/troubleshoot` to bridge.
3. Enhance existing `alarm_decode` → add link to troubleshooter for deeper diagnosis.
4. `git commit -m "R14-MS4: Intelligent Troubleshooter — Bayesian, 10 scenarios pass"`

**Rollback:** Remove IntelligentTroubleshooterEngine, revert dispatchers
**Exit:** 10 scenarios pass, probabilities plausible, REST endpoint live.

---

<!-- ANCHOR: r14_ms5_catalog_parsing -->
## MS5: MANUFACTURER CATALOG PARSING PIPELINE
### Role: Data Architect → Integration Engineer | Model: Sonnet (scripts) → Haiku (validation) | Effort: L (~20 calls) | Sessions: 1-2

### Objective
Parse 116 manufacturer PDF catalogs into structured tool data. Load into ToolRegistry.

### MS5 Task DAG
```
[T1: Inventory] ──→ [T2: Parsing pipeline] ──→ [T3: Normalize] ──→ [T4: Validate] ──→ [T5: Load]
```

#### MS5-T1: Catalog Inventory (~3 calls)
1. Scan C:\PRISM\MANUFACTURER_CATALOGS\ — list all 116 PDFs.
2. Classify by manufacturer and tool type.
3. Prioritize top 3 manufacturers by catalog count: likely Sandvik, Kennametal, Iscar.

#### MS5-T2: PDF Parsing Pipeline (~6 calls)
1. Python script using pdfplumber + camelot for table extraction.
2. Target per tool: ID, diameter, flute count, coating, material compatibility,
   recommended speed/feed ranges, tool life estimates.
3. Output: JSON per manufacturer in PRISM ToolRegistry schema.

#### MS5-T3: Schema Normalization (~4 calls)
1. Map manufacturer fields to PRISM schema.
2. Handle: imperial↔metric, naming variations (TiAlN vs PVD-TiAlN), missing fields.

#### MS5-T4: Validate (~4 calls)
1. Spot-check 10 tools per manufacturer against paper catalog.
2. Flag physically implausible values (diameter=0, flutes=99, speed=0).
3. Quality score: % of records with complete key fields (target: >80%).

#### MS5-T5: Load into ToolRegistry (~3 calls)
1. Run integration pipeline.
2. Verify: tool_facets shows new manufacturers.
3. `git commit -m "R14-MS5: Manufacturer catalogs — top 3 parsed and loaded"`

**Rollback:** New data loaded separately — don't modify existing tools
**Exit:** 116 catalogs inventoried, top 3 parsed, data loaded and searchable.

---

<!-- ANCHOR: r14_ms6_tool_holder_schema -->
## MS6: TOOL HOLDER SCHEMA V2 UPGRADE
### Role: Data Architect | Model: Sonnet | Effort: M (~15 calls) | Sessions: 1

### Objective
Expand tool holder schema from current parameters to 85-parameter target.
Wire derating factors into speed/feed calculator.

### Source: TOOL_HOLDER_DATABASE_ROADMAP_v4.md, data/tool_holders/

### MS6 Task DAG
```
[T1: Audit current] ──→ [T2: Add 20 params] ──→ [T3: Populate] ──→ [T4: Wire derating] ──→ [T5: Test]
```

#### MS6-T1: Audit Current Holder Data (~2 calls)
1. Count holders, current parameter count per holder, missing fields.
2. Reference 85-param target from TOOL_HOLDER_DATABASE_ROADMAP_v4.md.

#### MS6-T2: Add Missing Parameters to Schema (~4 calls)
1. Collision envelope: OD, total length, clearance profile.
2. Chatter characteristics: overhang ratio, damping coefficient.
3. Speed/feed derating factors by overhang and holder type.
4. Simulation geometry: 3D bounding box, interference zones.

#### MS6-T3: Populate for Existing Holders (~4 calls)
1. Use manufacturer data where available.
2. Engineering estimates where not (flagged with confidence: "estimated").
3. Physics plausibility checks on all values.

#### MS6-T4: Wire Derating into Speed/Feed (~3 calls)
1. When tool holder is specified in speed/feed calculation:
   - Overhang > 4:1 → reduce depth of cut 25%, reduce speed 15%
   - ER collet → reduce aggressive cuts (less rigidity than shrink fit)
   - Hydraulic → moderate derating (good damping, moderate grip)
   - Shrink fit → minimal derating (best rigidity)
2. Wire into calcDispatcher speed_feed action.

#### MS6-T5: Test Derating (~2 calls)
1. Same tool, same material, 3 holders: shrink fit, ER collet, Weldon.
2. Verify: shrink fit gets most aggressive params, ER most conservative.
3. `git commit -m "R14-MS6: Tool holder schema v2 — 85 params, derating wired"`

**Rollback:** Revert schema + derating changes
**Exit:** 85-param schema active, derating wired, holder comparison passes.

---

<!-- ANCHOR: r14_ms7_rest_api_expansion -->
## MS7: REST API EXPANSION + DOCUMENTATION
### Role: Platform Engineer | Model: Sonnet | Effort: S (~6 calls) | Sessions: 0.5

### Objective
Add remaining high-value REST endpoints. Generate OpenAPI spec. Write API documentation.
**NOTE (2026-02-22 audit):** 9 of 13 planned REST endpoints already live (speed-feed, job-plan, material get/search, tool get, alarm-decode, toolpath strategy, safety validate, knowledge search). Effort reduced from ~12 to ~6 calls.

### Source: IMP-R4-1 (only 5/382 REST endpoints), R14 product endpoints

### MS7 Task DAG
```
[T1: Add endpoints] ──→ [T2: OpenAPI spec] ──→ [T3: Documentation] ──→ [T4: Integration tests]
```

#### MS7-T1: Add Remaining Endpoints (~4 calls)
1. Add 4 more high-value endpoints (beyond 4 product endpoints already added):
   - `POST /api/v1/toolpath-strategy` — recommend toolpath strategy
   - `POST /api/v1/wear-predict` — predict tool wear
   - `POST /api/v1/what-if` — what-if parameter analysis
   - `POST /api/v1/material-substitute` — suggest material alternatives
2. Total API: 13 endpoints (5 R4 + 4 R14 products + 4 new).

#### MS7-T2: Generate OpenAPI Spec (~3 calls)
1. Create `data/docs/openapi.yaml` (OpenAPI 3.0):
   - All 13 endpoints with full request/response schemas
   - Error codes: 400 (bad input), 401 (unauth), 403 (forbidden), 422 (safety block), 500 (error)
   - Auth: Bearer token via F7 Bridge
   - Rate limiting: documented per endpoint

#### MS7-T3: API Documentation (~3 calls)
1. Create `data/docs/API_GUIDE.md`:
   - Quick start: auth setup, first request, example response
   - Endpoint reference: one section per endpoint with examples
   - Error handling guide
   - Safety classification per endpoint (CRITICAL/HIGH/STANDARD)

#### MS7-T4: Integration Tests (~2 calls)
1. Test each new endpoint via curl/fetch.
2. Verify: correct responses, proper error codes, audit log entries.
3. `git commit -m "R14-MS7: REST API expansion — 13 endpoints + OpenAPI spec"`

**Rollback:** Remove new endpoints, revert bridge
**Exit:** 13 REST endpoints live, OpenAPI spec generated, API docs written.

---

<!-- ANCHOR: r14_ms8_phase_gate -->
## MS8: PHASE GATE
### Role: Systems Architect | Model: Opus | Effort: M (~10 calls) | Sessions: 0.5

### Gate Criteria

| # | Criterion | Source MS | Type | Required? |
|---|-----------|-----------|------|-----------|
| 1 | Post Processor: 15 test programs across 3 controllers pass | MS1 | safety | 🔴 HARD BLOCK |
| 2 | Post Processor: safety-physics PASS (S(x) ≥ 0.70) | MS1 | safety | 🔴 HARD BLOCK |
| 3 | Quoting: 3 realistic jobs within expected ranges | MS2 | physics | ✅ |
| 4 | Process Planning: 3 test parts planned + safety PASS | MS3 | safety | ✅ |
| 5 | Troubleshooter: 10 scenarios return plausible diagnoses | MS4 | physics | ✅ |
| 6 | Catalog parsing: top 3 manufacturers loaded | MS5 | data_integrity | ⚠️ WARN OK |
| 7 | Tool holder: derating wired and tested | MS6 | physics | ⚠️ WARN OK |
| 8 | REST API: 13 endpoints + OpenAPI spec | MS7 | infrastructure | ✅ |
| 9 | Regression: all existing tests pass | ALL | safety | 🔴 HARD BLOCK |
| 10 | Omega: Ω ≥ 0.75 (elevated target for product release) | ALL | quality | ✅ |

**PASS:** 8/10 met. Criteria 1, 2, 9 are HARD BLOCKS — no exceptions.
**FAIL:** Any safety failure, any regression, or <7 criteria met.

### Gate Steps
1. Run `npm run ci` → full test + build + coverage.
2. Run R14-specific tests: 15 post-processor + 3 quoting + 3 planning + 10 troubleshoot.
3. Run benchmark regression: 150/150 expected.
4. Check each criterion.
5. Compute Ω (target ≥ 0.75).
6. Write R14_QUALITY_REPORT.json.
7. If PASS: `git tag r14-complete`
8. Update CURRENT_POSITION.md and ROADMAP_TRACKER.md.

**Exit:** R14 COMPLETE. 4 flagship products live. 13 REST endpoints. Manufacturing intelligence platform operational.

---

<!-- ANCHOR: r14_session_management -->
## SESSION MANAGEMENT

| MS | Risk | Calls | Strategy |
|----|------|-------|----------|
| MS0 | LOW | ~15 | Architecture only — flush scaffolds at end |
| MS1 | HIGH | ~35 | SAFETY-CRITICAL: flush after each task. T4 safety review is blocking. |
| MS2 | MEDIUM | ~25 | Flush after cost model, after engine, after validation |
| MS3 | HIGH | ~30 | Multiple engine compositions — flush after each. T5 safety is blocking. |
| MS4 | MEDIUM | ~20 | Flush after Bayesian engine, after troubleshooter, after tests |
| MS5 | MEDIUM | ~20 | Flush after each manufacturer parsed |
| MS6 | LOW | ~15 | Data schema work — low risk |
| MS7 | LOW | ~12 | API endpoints + docs — low risk |
| MS8 | LOW | ~10 | Gate only |

---

<!-- ANCHOR: r14_effort_summary -->
## EFFORT SUMMARY

| MS | Title | Calls | Model Split | Sessions |
|----|-------|-------|-------------|----------|
| MS0 | Product Architecture | ~15 | Opus 80% / Sonnet 20% | 1 |
| MS1 | Post Processor (SAFETY) | ~35 | Sonnet 60% / Opus 40% | 2-3 |
| MS2 | Quoting Engine | ~25 | Sonnet 80% / Opus 20% | 1-2 |
| MS3 | Process Planning (SAFETY) | ~30 | Sonnet 65% / Opus 35% | 2-3 |
| MS4 | Intelligent Troubleshooter | ~20 | Sonnet 75% / Opus 25% | 1-2 |
| MS5 | Catalog Parsing | ~20 | Sonnet 85% / Haiku 15% | 1-2 |
| MS6 | Tool Holder Schema v2 | ~15 | Sonnet 100% | 1 |
| MS7 | REST API + Docs | ~6 | Sonnet 100% | 0.5 |
| MS8 | Phase Gate | ~10 | Opus 100% | 0.5 |
| **TOTAL** | | **~176** | **Sonnet 68% / Opus 27% / Haiku 5%** | **11-15** |
