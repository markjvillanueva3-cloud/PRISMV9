# PRISM ROADMAP v18.1 — BOTTOM-UP LAYER ARCHITECTURE
## Build from primitives upward: data → engines → calibration → features → platform → intelligence → product
## Date: 2026-02-20 | Status: DRAFT FOR APPROVAL
## Supersedes: v18.0, v17.0, PRIORITY_ROADMAP, PHASE_R3_CAMPAIGNS
## Build: 3.87MB | Ω=0.77

---

## TABLE OF CONTENTS

1. Layer Architecture (Bottom-Up Dependency Model)
2. Philosophy & Execution Split
3. Three-Archetype Subagent System
4. Claude Code Hooks (Safety Enforcement)
5. Model & Effort Routing Matrix
6. Task DAG Architecture + File Dependency Format
7. Human-in-Loop & Handoff Protocol
8. **R2: Engine Calibration** (Layer 2 — Physics Foundation)
9. **R3: Intelligence Extraction + Features + Campaigns** (Layers 3-5)
10. **R4: Enterprise Hardening** (Layer 6 — Isolation + Compliance)
11. **R5: Post Processors + G-code Generation** (Layer 7 — Machine Output)
12. **R6: Production Deployment** (Layer 8 — Infrastructure)
13. **R7: Data Pipeline + External Integrations** (Layer 9 — Real-World Data)
14. **R8: Plugin Runtime** (Layer 10 — Extensibility)
15. **R9: PRISM DSL** (Layer 11 — Compression)
16. **R10: ML + Adaptive Intelligence** (Layer 12 — Learning)
17. **R11: UI/UX** (Layer 13 — Presentation)
18. **R12: Digital Twin + Adaptive Control** (Layer 14 — Simulation)
19. **R13: SaaS Platform** (Layer 15 — Product)
20. Recovery & Continuity Protocol
21. Appendix: File Locations & Setup Commands
22. **Appendix: File Path Resolution** (CRITICAL — read before any task)
23. Master Summary

---

## 0. FILE PATH RESOLUTION (READ FIRST)

### ⚠️ MANDATORY: All file paths in this roadmap use shorthand names.
### Resolve via `data/docs/roadmap/FILE_MAP.json` before touching any file.

### Existing Engine Files (roadmap shorthand → actual disk path)
| Roadmap Shorthand | Actual File on Disk |
|---|---|
| `manufacturingCalcEngine.ts` | `src/engines/ManufacturingCalculations.ts` |
| `advancedCalcEngine.ts` | `src/engines/AdvancedCalculations.ts` |
| `toolpathCalcEngine.ts` | `src/engines/ToolpathCalculations.ts` |
| `threadCalcEngine.ts` | `src/engines/ThreadCalculationEngine.ts` |
| `collisionEngine.ts` | `src/engines/CollisionEngine.ts` |
| `workholdingEngine.ts` | `src/engines/WorkholdingEngine.ts` |
| `toolBreakageEngine.ts` | `src/engines/ToolBreakageEngine.ts` |
| `spindleProtectionEngine.ts` | `src/engines/SpindleProtectionEngine.ts` |
| `coolantValidationEngine.ts` | `src/engines/CoolantValidationEngine.ts` |

### ⚠️ Special Case: safetyEngine.ts
The roadmap references `safetyEngine.ts` but safety is SPLIT across 5 specialized engines:
- `src/engines/CollisionEngine.ts` — toolpath collision, rapid move, fixture clearance
- `src/engines/SpindleProtectionEngine.ts` — torque, power, speed, thermal limits
- `src/engines/ToolBreakageEngine.ts` — stress, chip load, fatigue, breakage prediction
- `src/engines/WorkholdingEngine.ts` — clamp force, pullout, liftoff, deflection
- `src/engines/CoolantValidationEngine.ts` — flow, pressure, chip evacuation, MQL

All accessed through `src/tools/dispatchers/safetyDispatcher.ts` (29 actions).
When roadmap says `safetyEngine.ts`, route to the SPECIFIC engine based on context:
- "constraint boundaries" → SpindleProtectionEngine (machine limits)
- "collision" → CollisionEngine
- "tool stress" → ToolBreakageEngine
- "workholding" → WorkholdingEngine
- "coolant" → CoolantValidationEngine
- "safety check" (generic) → safetyDispatcher (routes to correct engine)
| `hookEngine.ts` | `src/engines/HookEngine.ts` |
| `agentExecutor.ts` | `src/engines/AgentExecutor.ts` |
| `swarmExecutor.ts` | `src/engines/SwarmExecutor.ts` |
| `tenantEngine.ts` | `src/engines/MultiTenantEngine.ts` |
| `bridgeEngine.ts` | `src/engines/ProtocolBridgeEngine.ts` |
| `complianceEngine.ts` | `src/engines/ComplianceEngine.ts` |
| `pfpEngine.ts` | `src/engines/PFPEngine.ts` |
| `memoryGraphEngine.ts` | `src/engines/MemoryGraphEngine.ts` |
| `telemetryEngine.ts` | `src/engines/TelemetryEngine.ts` |
| `nlHookEngine.ts` | `src/engines/NLHookEngine.ts` |
| `sessionLifecycleEngine.ts` | `src/engines/SessionLifecycleEngine.ts` |
| `knowledgeQueryEngine.ts` | `src/engines/KnowledgeQueryEngine.ts` |

### State Files (roadmap shorthand → actual location)
| Roadmap Shorthand | Actual Path |
|---|---|
| `CURRENT_POSITION.md` | `data/docs/roadmap/CURRENT_POSITION.md` |
| `ACTION_TRACKER.md` | `data/docs/roadmap/ACTION_TRACKER.md` |
| `SWITCH_SIGNAL.md` | `data/docs/roadmap/SWITCH_SIGNAL.md` |
| `CHAT_RESOLUTION.md` | `data/docs/roadmap/CHAT_RESOLUTION.md` |
| `VERIFICATION_REPORT.json` | `data/docs/roadmap/VERIFICATION_REPORT.json` |

### NEW Engines to Create (PascalCase convention)
When a task says WRITES_TO a file that doesn't exist, use PascalCase:
| Roadmap Shorthand | Create As |
|---|---|
| `intelligenceEngine.ts` | `src/engines/IntelligenceEngine.ts` |
| `campaignEngine.ts` | `src/engines/CampaignEngine.ts` |
| `postProcessorEngine.ts` | `src/engines/PostProcessorEngine.ts` |
| `visualizationEngine.ts` | `src/engines/VisualizationEngine.ts` |
| `cycleTimeEngine.ts` | `src/engines/CycleTimeEngine.ts` |
| `integrationEngine.ts` | `src/engines/IntegrationEngine.ts` |
| `obsidianEngine.ts` | `src/engines/ObsidianEngine.ts` |
| `excelEngine.ts` | `src/engines/ExcelEngine.ts` |
| `shopfloorEngine.ts` | `src/engines/ShopfloorEngine.ts` |
| `pluginEngine.ts` | `src/engines/PluginEngine.ts` |
| `dslEngine.ts` | `src/engines/DSLEngine.ts` |
| `mlEngine.ts` | `src/engines/MLEngine.ts` |
| `optimizerEngine.ts` | `src/engines/OptimizerEngine.ts` |
| `anomalyEngine.ts` | `src/engines/AnomalyEngine.ts` |
| `ilpEngine.ts` | `src/engines/ILPEngine.ts` |
| `twinEngine.ts` | `src/engines/TwinEngine.ts` |
| `controllerEngine.ts` | `src/engines/ControllerEngine.ts` |
| `metricsEngine.ts` | `src/monitoring/MetricsEngine.ts` |
| `authEngine.ts` | `src/platform/AuthEngine.ts` |
| `billingEngine.ts` | `src/platform/BillingEngine.ts` |
| `onboardEngine.ts` | `src/platform/OnboardEngine.ts` |
| `docsEngine.ts` | `src/platform/DocsEngine.ts` |
| `gatingEngine.ts` | `src/platform/GatingEngine.ts` |

### Task Runner Resolution Rule
Before executing ANY task:
1. Read FILE_MAP.json
2. For each READS_FROM path: resolve shorthand → verify file EXISTS on disk
3. For each WRITES_TO path: resolve shorthand → verify parent directory exists
4. If READS_FROM file doesn't exist → HARD STOP, trace dependency
5. If parent directory doesn't exist → create it

## 1. LAYER ARCHITECTURE (BOTTOM-UP DEPENDENCY MODEL)

### 1.1 Why Bottom-Up Matters
Every higher layer depends on every lower layer being correct. Calibrating an engine (L2)
before its data foundation (L0) exists produces garbage. Building ML models (L12) before
shop floor data pipelines (L9) exist means no training data. Building UI (L13) before
features exist (L4-L5) means empty screens.

v18.0 had External Integrations at R11 but ML at R9 — ML couldn't train on shop floor data
that didn't exist yet. v18.1 fixes all such inversions.

### 1.2 The 16-Layer Stack

```
LAYER 15 ─ PRODUCT ──────────── R13: SaaS (auth, billing, onboarding)
    │ depends on: everything below
LAYER 14 ─ SIMULATION ────────── R12: Digital Twin + Adaptive Control
    │ depends on: L12 ML models, L9 real-time data, L7 G-code
LAYER 13 ─ PRESENTATION ──────── R11: UI/UX (dashboard, calculator, planner)
    │ depends on: L12 ML insights, L4-L5 features, L7 post-proc output
LAYER 12 ─ LEARNING ──────────── R10: ML + Adaptive Intelligence
    │ depends on: L9 shop floor data, L5 campaign data, L2 calibrated engines
LAYER 11 ─ COMPRESSION ────────── R9: PRISM DSL (symbol vocabulary)
    │ depends on: L10 plugins indexed, L8 action surface frozen
LAYER 10 ─ EXTENSIBILITY ──────── R8: Plugin Runtime
    │ depends on: L8 production-stable platform
LAYER 9 ── DATA PIPELINE ──────── R7: MTConnect, OPC-UA, Obsidian, Excel, Shop Floor
    │ depends on: L8 production infrastructure, L6 enterprise security
LAYER 8 ── INFRASTRUCTURE ──────── R6: Docker, CI/CD, Monitoring
    │ depends on: L7 post-processors built, L6 enterprise ready
LAYER 7 ── MACHINE OUTPUT ──────── R5: Post Processors, G-code, Visualization
    │ depends on: L2 calibrated engines, L6 enterprise (safety audit scope)
LAYER 6 ── HARDENING ──────────── R4: Enterprise (tenant, compliance, bridge)
    │ depends on: L4-L5 features to harden
LAYER 5 ── SCALE VALIDATION ───── R3-MS2-MS5: Batch Campaigns
    │ depends on: L4 intelligence features
LAYER 4 ── COMPOSED FEATURES ──── R3-MS1: 11 Intelligence Actions
    │ depends on: L3 extracted rules, L2 calibrated engines
LAYER 3 ── DOMAIN RULES ────────── R3-MS0: Monolith Extraction (15,300 lines)
    │ depends on: L2 calibrated engines (rules reference engine outputs)
LAYER 2 ── CALIBRATION ─────────── R2: Physics Engine Accuracy
    │ depends on: L1 engines exist (they do), L0 data exists (it does)
LAYER 1 ── ENGINES (EXIST) ─────── manufacturingCalc, advancedCalc, toolpath, safety, thread
    │ depends on: L0 data
LAYER 0 ── DATA (COMPLETE) ─────── Materials(3518), Machines(1016), Tools(1944), Alarms(9200+)
```

### 1.3 Phase-to-Layer Mapping with Reorder Justification

| Phase | Layer | Name | Why This Position |
|-------|-------|------|-------------------|
| **R2** | L2 | Engine Calibration | Foundation — everything builds on accurate physics |
| **R3** | L3-L5 | Intelligence + Campaigns | Composed features need calibrated engines |
| **R4** | L6 | Enterprise Hardening | Security wraps around features before exposure |
| **R5** | L7 | Post Processors + G-code | G-code gen needs calibrated engines + enterprise safety audit |
| **R6** | L8 | Production Deploy | Containerize what's built, enable monitoring |
| **R7** | L9 | Data Pipeline + Integrations | **MOVED UP from R11** — MTConnect/shop floor feeds ML training |
| **R8** | L10 | Plugin Runtime | **MOVED from R7** — needs stable production platform first |
| **R9** | L11 | PRISM DSL | **MOVED from R8** — compress after plugin surface indexed |
| **R10** | L12 | ML + Adaptive | **MOVED from R9** — NOW has R7 shop floor data for training |
| **R11** | L13 | UI/UX | **MOVED from R10** — NOW has ML insights to display |
| **R12** | L14 | Digital Twin | Needs ML models + real-time data + G-code |
| **R13** | L15 | SaaS Platform | Product wrapper around everything |

### 1.4 What Changed from v18.0
| v18.0 Phase | v18.1 Phase | Change | Reason |
|-------------|-------------|--------|--------|
| R7 Plugin Runtime | R8 | Moved down 1 | Needs production-stable platform (R6) first |
| R8 PRISM DSL | R9 | Moved down 1 | Needs plugins indexed (R8) for full compression |
| R9 ML + Adaptive | R10 | Moved down 1 | NOW has shop floor training data from R7 |
| R10 UI/UX | R11 | Moved down 1 | NOW has ML insights from R10 to display |
| R11 Integrations | **R7** | **Moved UP 4** | MTConnect/shop floor data is a PRIMITIVE that ML depends on |

### 1.5 Dependency Violation Detection
Before starting any phase, verify ALL lower-layer dependencies exist:
```
CHECK: For each READS_FROM in task spec:
  - Does the file exist?
  - Was it produced by a completed lower-layer task?
  - If NO → BLOCK until dependency is met
  
CHECK: For each DATA_DEPS in task spec:
  - Is the registry populated?
  - Was it validated by a completed lower-layer task?
  - If NO → BLOCK until dependency is met
```

---

## 2. PHILOSOPHY & EXECUTION SPLIT

### 2.1 The v18.1 Paradigm
Build from the lowest primitive upward. Never build a feature whose dependencies
don't exist yet. Route by executor strength: physics to Chat, implementation to Code.

### 2.2 Execution Distribution
| Executor | % | Handles |
|----------|---|---------|
| Chat (Opus) | 45% | Physics calibration, safety validation, architecture, edge cases |
| Code Lead + Subagents | 40% | Implementation, wiring, testing, builds, git, CI/CD |
| Code Agent Teams | 10% | Parallel module work (adapters, templates, post processors) |
| Human judgment | 5% | Ambiguity resolution, product decisions |

### 2.3 Code/Chat Split By Phase (Reordered)
| Phase | Name | Chat% | Code% | Primary Reason for Split |
|-------|------|-------|-------|-------------------------|
| **R2** | Engine Calibration | **60%** | 40% | Physics calibration is iterative MCP reasoning |
| **R3** | Intelligence + Campaigns | 35% | **65%** | Campaign engine is implementation; validation is physics |
| **R4** | Enterprise | 25% | **75%** | Tenant/compliance/bridge are implementation-heavy |
| **R5** | Post Processors | 30% | **70%** | G-code safety is physics; implementation is Code |
| **R6** | Production Deploy | 10% | **90%** | Docker/CI/CD/monitoring is entirely Code work |
| **R7** | Data Pipeline + Integrations | 30% | **70%** | Protocol design is Chat; adapters are Code |
| **R8** | Plugin Runtime | 20% | **80%** | Architecture is Chat; parser/registration is Code |
| **R9** | PRISM DSL | 20% | **80%** | Symbol design is Chat; parser/transpiler is Code |
| **R10** | ML + Adaptive | **55%** | 45% | Model design needs reasoning; pipeline is Code |
| **R11** | UI/UX | 15% | **85%** | UX review is Chat; React/UI is Code |
| **R12** | Digital Twin | **60%** | 40% | Control theory + physics simulation is deep reasoning |
| **R13** | SaaS Platform | 15% | **85%** | Billing/auth/onboarding is entirely Code |

### 2.4 What Each Executor Does Best

**Chat (Opus in claude.ai) excels at:**
- Interactive MCP dispatcher queries (31 dispatchers, 368 actions)
- Iterative calibration loops: calc → compare → reason → adjust → re-calc
- Physics reasoning with uncertainty quantification
- Cross-referencing material properties across registries
- Kienzle/Taylor/thermal coefficient tuning per ISO group
- Edge case analysis (exotic materials, boundary conditions)
- Architecture decisions requiring multi-domain coupling
- Safety validation with full context + human in the loop

**Code (Sonnet subagents) excels at:**
- TypeScript implementation, refactoring, wiring
- Test runner creation, adapter fixes, field mapping
- Parallel agent teams for independent modules
- Git operations, builds, CI/CD pipelines
- Data processing (batch CSV/JSON transforms)
- Scaffolding, boilerplate, pattern replication
- Docker, monitoring, deployment infrastructure
- Regression test execution and reporting

**Code (Opus subagent: safety-physics) excels at:**
- Pre-commit safety gate validation
- G-code safety review (wrong G-code = machine crash)
- Spot-check physics plausibility on Code's implementations
- Final sign-off on CRITICAL file edits

### 2.5 Split Decision Framework
1. **Does it require iterative MCP queries with physics reasoning?** → Chat
2. **Does it require writing >50 lines of TypeScript?** → Code
3. **Does it require calibrating coefficients against known values?** → Chat
4. **Does it require parallel work across independent modules?** → Code (agent team)
5. **Does it require safety validation of a complex calculation?** → Chat
6. **Does it require build/test/deploy operations?** → Code
7. **Ambiguous?** → Start with Code; escalate to Chat if confidence < 85%


---

## 3. THREE-ARCHETYPE SUBAGENT SYSTEM (CODE-SIDE)

| Archetype | Agent Name | Model | Color | Tools | Scope |
|-----------|-----------|-------|-------|-------|-------|
| **Safety-Physics** | `safety-physics` | opus | red | Read, Grep, Glob, Bash | Physics validation, CRITICAL file gate |
| **Implementation** | `implementer` | sonnet | blue | Read, Write, Edit, Bash, Grep, Glob | Code changes, wiring, data processing |
| **Verification** | `verifier` | haiku | green | Read, Grep, Glob, Bash | Tests, audits, regression checks |

Agent definition files: `.claude/agents/{safety-physics,implementer,verifier}.md`

---

## 4. CLAUDE CODE HOOKS (SAFETY ENFORCEMENT)

| Hook | Event | Action | Blocking? |
|------|-------|--------|-----------|
| Pre-Edit Safety Gate | PreToolUse: Write/Edit on CRITICAL files | Block until safety-physics approves | YES |
| Post-Build Verification | PostToolUse: Bash with npm run build | Auto-run verify-build.ps1 | NO |
| Anti-Regression Gate | PreToolUse: Write with >60% content change | Block if >30% line reduction | YES |
| Teammate Quality Gate | TaskCompleted | Invoke verifier on teammate output | NO |
| Idle Teammate Reassign | TeammateIdle | Check DAG for next unblocked task | NO |

Scripts: `scripts/hooks/{pre-edit-safety-gate,post-build-verify,anti-regression-gate,teammate-quality-gate,teammate-reassign}.ps1`

---

## 5. MODEL & EFFORT ROUTING MATRIX

### 5.1 Model Version Mapping
| Alias | Resolves To | Strengths | Cost |
|-------|-------------|-----------|------|
| `opus` | Claude Opus 4.6 | Physics reasoning, safety-critical, architecture | $$$$$ |
| `sonnet` | Claude Sonnet 4.5 | Implementation, code gen, known patterns | $$$ |
| `haiku` | Claude Haiku 4.5 | Fast verification, reporting, simple checks | $ |

### 5.2 Ternary Effort Model
| Level | Name | Model | When | Max Time | Token Budget |
|-------|------|-------|------|----------|-------------|
| **LIGHT** | Verification & reporting | haiku | Tests, audits, checks, simple lookups | 5 min | 10K tokens |
| **STANDARD** | Implementation & known patterns | sonnet | Code changes, wiring, data processing | 30 min | 50K tokens |
| **NOVEL** | Safety-critical & architecture | opus | Physics calibration, multi-domain, edge cases | 2 hr | 200K tokens |

### 5.3 Task-to-Executor Routing
| Task Type | Executor | Model | Effort | Rationale |
|-----------|----------|-------|--------|-----------|
| Kienzle/Taylor/thermal calibration | **Chat** | opus | NOVEL | Iterative MCP reasoning |
| Safety scoring (S(x), Ω) | **Chat** | opus | NOVEL | Full context awareness |
| Architecture decisions | **Chat** | opus | NOVEL | Multi-domain trade-offs |
| ML model design | **Chat** | opus | NOVEL | Feature eng + physics constraints |
| Control theory design | **Chat** | opus | NOVEL | PID/MPC requires math reasoning |
| Adapter/wiring/field fixes | **Code** | sonnet | STANDARD | Mechanical edits |
| Engine TypeScript implementation | **Code** | sonnet | STANDARD | Code gen from spec |
| Parallel module work | **Code team** | sonnet x3-5 | STANDARD | Independent scopes |
| Git, builds, CI/CD, Docker | **Code** | sonnet | STANDARD | Operational tasks |
| Pre-commit safety gate | **Code** | opus (subagent) | NOVEL | CRITICAL file edits |
| G-code safety validation | **Code** | opus (subagent) | NOVEL | Wrong G-code = crash |
| Regression test execution | **Code** | haiku | LIGHT | Run & report |
| Build verification | **Code** | haiku | LIGHT | Script execution |
| Anti-regression audit | **Code** | haiku | LIGHT | Line counting |

### 5.4 Agent Team Composition
| Teammate Role | Model | Why |
|--------------|-------|-----|
| Team Lead | opus | Orchestration needs reasoning |
| Safety Reviewer | opus | Physics, no compromises |
| Implementer (per module) | sonnet | Code writing |
| Test Writer | sonnet | Test gen needs creativity |
| Doc Writer | haiku | Lowest stakes, highest speed |

---

## 6. TASK DAG ARCHITECTURE + FILE DEPENDENCY FORMAT

### 6.1 Task Node Schema
Every task in this roadmap contains:
```
TASK: {id}
  DEPENDS_ON: [task_ids]
  EXECUTOR: Chat | Code | Code-team
  ARCHETYPE: safety-physics | implementer | verifier (Code only)
  MODEL: opus | sonnet | haiku
  EFFORT: LIGHT | STANDARD | NOVEL
  PARALLEL: true | false
  SCOPE: [files/directories]
  GATE: GATED | YOLO
  SUCCESS: [criteria]
  ESCALATION: [conditions]
  ESTIMATED_CALLS: N
  
  # v18.1 ADDITIONS — Bottom-Up Dependency Tree:
  LAYER: N (which layer this task lives in)
  READS_FROM: [source files this task reads]
  WRITES_TO: [source files this task creates/modifies]
  DATA_DEPS: [registry data required — must exist before task starts]
  TASK_DEPS: [specific outputs from other tasks consumed]
  PROVIDES: [outputs this task produces for downstream tasks]
```

### 6.2 Dependency Validation Rule
**HARD BLOCK:** A task cannot start if ANY item in its READS_FROM, DATA_DEPS, or
TASK_DEPS does not exist or was not produced by a completed task. This is enforced
by the session boot protocol — check CURRENT_POSITION.md against this roadmap's DAG.

### 6.3 File Dependency Notation
```
←  = reads from (input)
→  = writes to (output)
⇐  = depends on registry data
⇒  = provides to downstream
⊗  = SAFETY CRITICAL (wrong output = danger)
```

---

## 7. HUMAN-IN-LOOP & HANDOFF PROTOCOL

### 7.1 Code → Chat Handoff (SWITCH_SIGNAL.md)
| Trigger | Threshold | Action |
|---------|-----------|--------|
| Physics calibration needed | Benchmark failure = coefficient error | Write SWITCH_SIGNAL.md |
| Safety confidence drop | safety-physics confidence < 85% | Write SWITCH_SIGNAL.md |
| Out-of-distribution input | Material/geometry not in registry | Write SWITCH_SIGNAL.md |
| Architecture decision | Multiple valid approaches | Write SWITCH_SIGNAL.md |
| Gate failure after 2 retries | Task fails gate twice | Write SWITCH_SIGNAL.md |

### 7.2 Chat → Code Handoff (CHAT_RESOLUTION.md)
| Trigger | Action |
|---------|--------|
| Calibration complete | Write corrected coefficients + CHAT_RESOLUTION.md |
| Architecture decided | Write decision + rationale to CHAT_RESOLUTION.md |
| Edge case resolved | Write fix + new benchmark scores to CHAT_RESOLUTION.md |

### 7.3 Parallel Operation
Code and Chat work simultaneously on different milestones when file scopes don't overlap.
Merge point: phase gate runs full suite on combined changes.

### 7.4 Switch Protocol
1. Initiator writes signal file with reason + context
2. Initiator writes current state to CURRENT_POSITION.md
3. User switches interface
4. Receiver reads signal + CURRENT_POSITION.md
5. Receiver resolves, writes resolution file
6. Original executor reads resolution and continues


---

## 8. R2: ENGINE CALIBRATION (Layer 2 — Physics Foundation)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L2 — Calibration |
| **Goal** | Calibrate all physics engines against golden benchmarks, validate safety |
| **Mode Split** | Chat 60% / Code 40% |
| **Estimated Sessions** | 3-4 (1 Code, 2-3 Chat) |
| **Entry Criteria** | Build passes, Ω ≥ 0.70, git clean |
| **Current Status** | MS0-T3 COMPLETE. Baseline: 7/50 (14%). 8 failure categories identified. |

### R2 Layer Dependencies
```
LAYER 2 (this phase) DEPENDS ON:
  L1 — Engines:
    ← src/engines/ManufacturingCalculations.ts    (EXISTS — Kienzle, Taylor, MRR)
    ← src/engines/AdvancedCalculations.ts         (EXISTS — thermal, deflection, stability)
    ← src/engines/ToolpathCalculations.ts         (EXISTS — trochoidal, HSM, scallop)
    ← src/engines/{Safety}*.ts               (EXISTS — S(x) scoring)
    ← src/engines/ThreadCalculationEngine.ts           (EXISTS — thread calcs)
  L0 — Data:
    ⇐ MaterialRegistry (3,518 materials with kc1.1, mc, Taylor C/n)
    ⇐ MachineRegistry (1,016 machines with specs)
    ⇐ ToolRegistry (1,944 tools with geometry)
    ⇐ AlarmRegistry (9,200+ codes)

LAYER 2 PROVIDES TO UPPER LAYERS:
  ⇒ Calibrated kc1.1/mc per ISO group       → L3 (rules reference correct forces)
  ⇒ Calibrated Taylor C/n per ISO group     → L4 (job_plan needs accurate tool life)
  ⇒ Calibrated thermal T_tool model         → L4 (wear_prediction), L12 (ML features)
  ⇒ Verified benchmark suite (≥40/50)       → L5 (campaigns), L12 (ML training data)
  ⇒ Safety validation patterns              → L6 (enterprise safety scope)
```

### R2 Task DAG
```
[MS0] ✅ COMPLETE
  │
  ├──→ [MS1-T1]──→[MS1-T2]──→[MS1-T3]──→[MS1-T4]──→[MS1-GATE]
  │    (Code)      (Code)      (Code)      (Code)      (Code)
  │
  ├──→ [MS2-T1]──→[MS2-T2]──→[MS2-T3]──→[MS2-T4]──→[MS2-T5]──→[MS2-GATE]
  │    (Chat)      (Chat)      (Chat)      (Chat)      (Chat)      (Chat)
  │
  │    ← MS1 and MS2 run in PARALLEL (different file scopes) →
  │
  ├──→ [MS3-T1]──→[MS3-T2]
  │    (Chat)      (Chat)
  │         ↓
  └──→ [MS4-T1]──→[MS4-T2]──→[MS4-T3]
       (Code)      (Chat)      (Code)
```

### R2 File Dependency Map
```
MS1 (Quick Wins — Code):
  ← tests/r2/T3-failure-analysis.md          READ: failure categories
  ← tests/r2/golden-benchmarks.json          READ: expected values
  ← tests/r2/run-benchmarks.ts               READ+WRITE: adapter fixes (CAT-F)
  → src/engines/ManufacturingCalculations.ts  WRITE: MRR unit fix (CAT-B)
  → tests/r2/benchmark-results.json           WRITE: updated results

MS2 (Physics Calibration — Chat):
  ← tests/r2/T3-failure-analysis.md          READ: which coefficients wrong
  ← tests/r2/golden-benchmarks.json          READ: expected values
  ⇐ MaterialRegistry                         READ: current kc1.1, mc, Taylor C/n
  → src/engines/ManufacturingCalculations.ts  WRITE: corrected Kienzle + Taylor ⊗
  → src/engines/AdvancedCalculations.ts       WRITE: corrected thermal model ⊗
  → src/engines/ToolpathCalculations.ts       WRITE: corrected trochoidal/HSM
  → tests/r2/benchmark-results.json           WRITE: updated results

MS3 (Edge Cases — Chat):
  ← tests/r2/benchmark-results.json          READ: current pass rate
  ⇐ MaterialRegistry, MachineRegistry        READ: exotic materials, boundary specs
  → tests/r2/edge-cases.json                 WRITE: 20 edge case definitions
  → tests/r2/edge-case-results.json          WRITE: edge case results
  → src/engines/* (as needed)                WRITE: fixes for edge case failures ⊗

MS4 (Gate — Both):
  ← ALL outputs from MS1-MS3                 READ: verify everything passes
  → git tag r2-complete                      WRITE: version marker
  → data/docs/roadmap/CURRENT_POSITION.md               WRITE: advance to R3
```

---

### MS0: 50-Calc Test Matrix ✅ COMPLETE
- T1: Created golden-benchmarks.json (50 benchmarks) ✅
- T2: Wired runner with 20 calc adapters ✅
- T3: Failure analysis: 8 root cause categories ✅
- Baseline: 7 PASS / 43 FAIL / 0 ERROR (14%)
- See: tests/r2/T3-failure-analysis.md

---

### MS1: Quick Wins (CODE — Parallel with MS2)
**Target: +7 passes → 14/50 (28%)**

#### MS1-T1: Fix MRR Unit Conversion (CAT-B)
```
TASK: MS1-T1
  DEPENDS_ON: [MS0]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true (with MS2) | GATE: YOLO
  SUCCESS: B004, B018, B022 pass (MRR within 5% of expected)
  ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [
    tests/r2/T3-failure-analysis.md,
    tests/r2/golden-benchmarks.json,
    src/engines/ManufacturingCalculations.ts
  ]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts (MRR section only)]
  DATA_DEPS: [none — unit conversion is code-only]
  TASK_DEPS: [MS0-T3 failure analysis identifying CAT-B]
  PROVIDES: [Fixed MRR calculation → MS1-T4 full benchmark re-run]
```
**Step-by-step:**
1. Read manufacturingCalcEngine.ts — find MRR calculation function
2. Identify unit issue: B004 ratio=3.33, B018 ratio=2.0, B022 ratio=3.33
3. Trace MRR formula: MRR = ae × ap × vf (where vf = fz × z × n)
4. Fix unit conversion — ensure consistent mm→cm³/min output
5. Run: `npx tsx tests/r2/run-benchmarks.ts --filter B004,B018,B022`
6. Confirm all 3 pass within 5% tolerance

#### MS1-T2: Fix Null Adapter Returns (CAT-F)
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO
  SUCCESS: B002, B041, B043, B044 no longer return null
  ESTIMATED_CALLS: 8
  LAYER: 2
  READS_FROM: [tests/r2/run-benchmarks.ts, tests/r2/golden-benchmarks.json]
  WRITES_TO: [tests/r2/run-benchmarks.ts (adapter section)]
  DATA_DEPS: [none]
  TASK_DEPS: [MS1-T1 (sequential dependency for clean test state)]
  PROVIDES: [Non-null adapter outputs → MS1-T3 enum fixes can proceed]
```
**Step-by-step:**
1. Read run-benchmarks.ts — find adapters for surface_finish, thread_mill, multi_pass, coolant_strategy
2. B002: engine returns `Ra` but adapter looks for `Ra_um` → fix field mapping
3. B041: trace tap drill field name → fix mapping
4. B043: check multi_pass total_time field → fix mapping
5. B044: coolant flow field name → fix mapping
6. Run filtered benchmarks to verify nulls resolved

#### MS1-T3: Fix Enum/Lookup Mismatches (CAT-H)
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO
  SUCCESS: B044 coolant enum matches, B049 Vc within 20%
  ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [
    src/engines/ManufacturingCalculations.ts,
    src/engines/AdvancedCalculations.ts,
    tests/r2/golden-benchmarks.json
  ]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts, src/engines/AdvancedCalculations.ts]
  DATA_DEPS: [MaterialRegistry (lookup tables for 316L stainless)]
  TASK_DEPS: [MS1-T2 (null fixes complete)]
  PROVIDES: [Correct enum/lookup values → MS1-T4 full re-run]
```
**Step-by-step:**
1. B044: Check coolant strategy enum — "high_pressure" vs "through_spindle_coolant"
2. B049: Check speed_feed lookup for 316L — may be roughing vs semi-finish value
3. If B049 is physics-based → defer to MS2-T1
4. Run filtered benchmarks to verify

#### MS1-T4: Full Benchmark Re-run
```
TASK: MS1-T4
  DEPENDS_ON: [MS1-T3]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  LAYER: 2
  READS_FROM: [tests/r2/run-benchmarks.ts, tests/r2/golden-benchmarks.json]
  WRITES_TO: [tests/r2/benchmark-results.json]
  TASK_DEPS: [MS1-T1, MS1-T2, MS1-T3 all complete]
  PROVIDES: [Updated benchmark-results.json → MS1-GATE verification]
```

#### MS1-GATE: Verify Quick Win Gains
```
TASK: MS1-GATE
  DEPENDS_ON: [MS1-T4]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | ESTIMATED_CALLS: 2
  SUCCESS: ≥14/50 pass (28%), all 7 original passes retained
  ESCALATION: If <14 → retry failed fixes
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  WRITES_TO: [git commit "R2-MS1: Quick wins (+N passes)"]
  PROVIDES: [Verified quick-win baseline → MS4 gate input]
```

---

### MS2: Physics Calibration (CHAT — Parallel with MS1)
**Target: +20-25 passes → 30-35/50 (60-70%)**

#### MS2-T1: Calibrate Kienzle kc1.1/mc Per ISO Group (CAT-A)
```
TASK: MS2-T1
  DEPENDS_ON: [MS0]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  PARALLEL: true (with MS1) | GATE: GATED
  SUCCESS: ≥12/17 CAT-A benchmarks pass (70% of force calcs within tolerance)
  ESCALATION: If material data missing → web_search for published values
  ESTIMATED_CALLS: 40-60
  LAYER: 2
  READS_FROM: [
    src/engines/ManufacturingCalculations.ts (Kienzle section),
    tests/r2/T3-failure-analysis.md,
    tests/r2/golden-benchmarks.json
  ]
  WRITES_TO: [
    src/engines/ManufacturingCalculations.ts (kc1.1/mc lookup or defaults) ⊗,
    data/materials/*.json (if per-material kc1.1 stored there)
  ]
  DATA_DEPS: [MaterialRegistry (current kc1.1, mc per material)]
  TASK_DEPS: [MS0-T3 identifying CAT-A as 17 benchmarks]
  PROVIDES: [
    Calibrated kc1.1/mc → MS2-T5 (cost_optimize depends on Fc),
    Calibrated Fc → L4 job_plan force checks,
    Calibrated Fc → L12 ML training features
  ]
```
**Step-by-step:**
1. **Audit current coefficients** — for each of 17 failing benchmarks:
   - `prism_data→material_get` for benchmark material
   - Extract current kc1.1, mc → record delta% vs expected
2. **Group by ISO class and diagnose direction:**
   - ISO P (Steel): B001(+54%), B003(-41%), B007(-43%), B008(-55%)
   - ISO M (Stainless): B009(+24%), B010(-46%)
   - ISO K (Cast Iron): B015(+35%), B016(-53%), B019(+35%)
   - ISO N (Nonferrous): B020(+90%), B021(-19%), B024(+31%)
   - ISO S (Superalloy): B025(-25%), B026(-71%), B029(-22%), B030(-64%)
   - ISO H (Hardened): B031(-47%), B032(-73%)
3. **Research correct values** — reference ranges:
   - P: kc1.1=1500-2100 MPa, mc=0.17-0.25
   - M: kc1.1=1800-2500 MPa, mc=0.20-0.27
   - K: kc1.1=1000-1500 MPa, mc=0.20-0.28
   - N: kc1.1=500-900 MPa, mc=0.23-0.30
   - S: kc1.1=2400-3500 MPa, mc=0.22-0.28
   - H: kc1.1=2800-4500 MPa, mc=0.18-0.25
4. **Identify root cause** — Fc too HIGH=kc1.1 too large; too LOW=kc1.1 too small
5. **Apply corrections** via edit_block on engine source
6. **Verify each** via `prism_calc→cutting_force` + benchmark re-run
7. **Regression check** — full 50-benchmark suite after all corrections

#### MS2-T2: Calibrate Taylor C/n Per ISO Group (CAT-C)
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15-20
  SUCCESS: ≥4/5 CAT-C benchmarks pass (tool life within 20-25%)
  LAYER: 2
  READS_FROM: [src/engines/ManufacturingCalculations.ts (Taylor section)]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts (Taylor C/n) ⊗]
  DATA_DEPS: [MaterialRegistry (Taylor constants per material)]
  TASK_DEPS: [MS2-T1 (Kienzle done → force inputs to Taylor correct)]
  PROVIDES: [
    Calibrated Taylor C/n → MS2-T5 (cost_optimize depends on tool_life),
    Calibrated tool life → L4 job_plan wear budgets,
    Calibrated tool life → L12 ML wear prediction training
  ]
```
**Step-by-step:**
1. Audit: B005(85% LOW), B011(80% LOW), B017(82% LOW), B028(224% HIGH), B033(18909% HIGH)
2. Pattern: Steels too aggressive (low C), Exotics too conservative
3. Reference: P: C=200-350/n=0.20-0.35, S: C=80-150/n=0.15-0.25, H: C=100-200/n=0.15-0.25
4. Fix per-material or per-ISO-group C and n values
5. Verify each produces tool life in 1-120 min range for typical speeds

#### MS2-T3: Fix Thermal T_tool Model (CAT-D)
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15-20
  SUCCESS: ≥2/3 CAT-D benchmarks pass (T_tool within 20%)
  LAYER: 2
  READS_FROM: [src/engines/AdvancedCalculations.ts (thermal section)]
  WRITES_TO: [src/engines/AdvancedCalculations.ts (T_tool calc) ⊗]
  DATA_DEPS: [MaterialRegistry (thermal conductivity, specific heat)]
  TASK_DEPS: [MS2-T1 (force values correct → heat generation correct)]
  PROVIDES: [
    Calibrated T_tool → L4 wear_prediction thermal factor,
    Calibrated T_tool → L12 ML thermal features,
    Calibrated T_tool → L14 digital twin thermal state
  ]
```
**Step-by-step:**
1. B014: T_tool=120°C expected=780°C, B027: 73°C/950°C, B035: 61°C/1050°C
2. All near-ambient — model computes friction only, not cutting zone temp
3. Note: T_chip works (B014: 660°C vs 650°C) — chip model correct
4. Fix: T_tool = T_chip × partition_ratio, or empirical Trigger equation
5. Verify outputs in 600-1100°C range for high-speed difficult materials

#### MS2-T4: Fix Trochoidal/HSM Logic (CAT-E)
```
TASK: MS2-T4
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 8-10
  SUCCESS: B036 MRR within 15%, B037 MRR within 10%
  LAYER: 2
  READS_FROM: [src/engines/ToolpathCalculations.ts]
  WRITES_TO: [src/engines/ToolpathCalculations.ts (trochoidal + HSM sections)]
  TASK_DEPS: [MS2-T1 (force calcs correct)]
  PROVIDES: [Calibrated trochoidal/HSM → L4 strategy_for_job, L7 post-proc toolpath gen]
```
**Step-by-step:**
1. B036: MRR=0.23 vs 34.2 (99.3% LOW) — likely using slot width instead of trochoidal channel
2. B037: MRR=114.6 vs 45.8 (150% HIGH) — HSM radial engagement reduction not applied
3. Fix trochoidal: MRR = stepover × ap × vf
4. Fix HSM: apply ae_reduced factor

#### MS2-T5: Fix Advanced Calc Logic (CAT-G)
```
TASK: MS2-T5
  DEPENDS_ON: [MS2-T1, MS2-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15-20
  SUCCESS: ≥3/5 CAT-G benchmarks pass
  LAYER: 2
  READS_FROM: [
    src/engines/AdvancedCalculations.ts (stability, deflection, flow_stress),
    src/engines/ToolpathCalculations.ts (cost_optimize)
  ]
  WRITES_TO: [
    src/engines/AdvancedCalculations.ts ⊗,
    src/engines/ToolpathCalculations.ts
  ]
  TASK_DEPS: [MS2-T1 (Fc correct → stability uses Fc), MS2-T2 (tool_life correct → cost uses T)]
  PROVIDES: [
    Calibrated stability → L4 job_plan chatter check, L14 digital twin vibration,
    Calibrated deflection → L4 setup_sheet tolerance validation,
    Calibrated cost_optimize → L4 process_cost,
    Calibrated flow_stress → L12 ML flow stress features
  ]
```
**Step-by-step:**
1. B039 stability: reports stable=true, expected=false → fix ap_limit comparison
2. B040 deflection: 0.253mm vs 0.042mm → verify L, E, I in cantilever formula
3. B045 cost_optimize: 664 vs 240 m/min → re-run after Taylor fix (may self-correct)
4. B048 chip_load: 0.013 vs 0.008 → verify edge radius and chip thickness formula
5. B050 flow_stress: 2075 vs 820 MPa → check Johnson-Cook constants + strain rate

#### MS2-GATE: Verify Physics Calibration Gains
```
TASK: MS2-GATE
  DEPENDS_ON: [MS2-T1, MS2-T2, MS2-T3, MS2-T4, MS2-T5]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 3
  SUCCESS: ≥30/50 pass (60%), all original 7 retained
  ESCALATION: If <25/50 → identify remaining blockers, plan MS2 extension
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  PROVIDES: [Calibrated engine baseline → MS3 edge cases, MS4 final gate]
```

---

### MS3: Edge Cases (CHAT)
**Target: +5-10 additional passes from edge case hardening**

#### MS3-T1: Generate + Execute 20 Edge Case Scenarios
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-GATE]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 25
  SUCCESS: All 20 scenarios produce expected behavior (pass/warn/reject), NO crashes
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  WRITES_TO: [tests/r2/edge-cases.json, tests/r2/edge-case-results.json]
  DATA_DEPS: [MaterialRegistry (exotic materials), MachineRegistry (boundary specs)]
  PROVIDES: [Edge case patterns → L6 enterprise safety scope, L12 anomaly detection training]
```
**Scenarios:** Exotic materials (4), extreme parameters (4), boundary conditions (4),
material-machine mismatches (4), multi-physics coupling (4)

#### MS3-T2: Fix Edge Case Failures
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  SUCCESS: ≥16/20 edge cases correct (80%)
  LAYER: 2
  READS_FROM: [tests/r2/edge-case-results.json]
  WRITES_TO: [src/engines/* (targeted safety fixes) ⊗]
  PROVIDES: [Safety boundary definitions → L6 compliance, L14 digital twin limits]
```

---

### MS4: Build Gate + Phase Completion

#### MS4-T1: Final Build + Full Test Suite (CODE)
```
TASK: MS4-T1
  DEPENDS_ON: [MS1-GATE, MS2-GATE, MS3-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [entire codebase]
  WRITES_TO: [dist/ (build output)]
  PROVIDES: [Clean build → MS4-T2 quality scoring]
```

#### MS4-T2: Quality Scoring (CHAT)
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70, benchmarks ≥40/50)
  ESTIMATED_CALLS: 5
  LAYER: 2
  PROVIDES: [Quality scores → R3 entry criteria]
```

#### MS4-T3: Tag + Position Update (CODE)
```
TASK: MS4-T3
  DEPENDS_ON: [MS4-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  WRITES_TO: [git tag r2-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R2 Summary
| Task | Executor | Model | Effort | Parallel | Gate | Calls | Layer |
|------|----------|-------|--------|----------|------|-------|-------|
| MS1-T1 | Code | sonnet | STD | yes(w/MS2) | YOLO | 5 | L2 |
| MS1-T2 | Code | sonnet | STD | yes | YOLO | 8 | L2 |
| MS1-T3 | Code | sonnet | STD | yes | YOLO | 5 | L2 |
| MS1-T4 | Code | haiku | LIGHT | yes | YOLO | 3 | L2 |
| MS1-GATE | Code | haiku | LIGHT | yes | GATED | 2 | L2 |
| MS2-T1 | **Chat** | opus | NOVEL | yes(w/MS1) | GATED | 40-60 | L2 |
| MS2-T2 | **Chat** | opus | NOVEL | no | GATED | 15-20 | L2 |
| MS2-T3 | **Chat** | opus | NOVEL | no | GATED | 15-20 | L2 |
| MS2-T4 | **Chat** | opus | STD | no | YOLO | 8-10 | L2 |
| MS2-T5 | **Chat** | opus | NOVEL | no | GATED | 15-20 | L2 |
| MS2-GATE | **Chat** | opus | STD | no | GATED | 3 | L2 |
| MS3-T1 | **Chat** | opus | NOVEL | no | GATED | 25 | L2 |
| MS3-T2 | **Chat** | opus | NOVEL | no | GATED | 15 | L2 |
| MS4-T1 | Code | sonnet | STD | no | GATED | 5 | L2 |
| MS4-T2 | **Chat** | opus | NOVEL | no | GATED | 5 | L2 |
| MS4-T3 | Code | haiku | LIGHT | no | YOLO | 3 | L2 |
| **TOTAL** | Chat 60% / Code 40% | | | | | **175-210** | |


---

## 9. R3: INTELLIGENCE EXTRACTION + FEATURES + CAMPAIGNS (Layers 3-5)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layers** | L3 (Domain Rules), L4 (Composed Features), L5 (Scale Validation) |
| **Goal** | Extract monolith intelligence, build composed features, validate at scale |
| **Mode Split** | Code 65% / Chat 35% |
| **Estimated Sessions** | 3-4 (2-3 Code, 1-2 Chat) |
| **Entry Criteria** | R2 complete, Ω ≥ 0.70, benchmarks ≥80% |

### R3 Layer Dependencies
```
LAYER 3 (Domain Rules) DEPENDS ON:
  L2 — Calibrated Engines:
    ← src/engines/ManufacturingCalculations.ts  (calibrated kc1.1/mc/Taylor from R2)
    ← src/engines/AdvancedCalculations.ts       (calibrated thermal from R2)
    ← src/engines/ToolpathCalculations.ts       (calibrated trochoidal/HSM from R2)
  L0 — Monolith Source (read-only):
    ← rules_engine.js                        (5,500 lines domain logic)
    ← machining_rules.js                     (4,200 lines machining heuristics)
    ← constraint_engine.js                   (2,400 lines validation)
    ← operation_sequencer.js                 (3,200 lines workflow)

LAYER 4 (Composed Features) DEPENDS ON:
  L3 — Extracted Rules:
    ← src/engines/intelligenceEngine.ts       (extracted + typed rules)
  L2 — Calibrated Engines:
    ← All calibrated engines from R2

LAYER 5 (Scale Validation) DEPENDS ON:
  L4 — Intelligence Features:
    ← src/engines/intelligenceEngine.ts       (11 actions)
    ← src/engines/campaignEngine.ts           (campaign workflow)
  L0 — Full Data:
    ⇐ MaterialRegistry (3,518 materials for batch validation)

R3 PROVIDES TO UPPER LAYERS:
  ⇒ 11 intelligence actions          → L6 (enterprise wraps these), L13 (UI calls these)
  ⇒ Campaign engine                  → L5 batch validation, L12 ML training data
  ⇒ Enriched material data           → L9 data pipeline quality, L12 ML features
  ⇒ Domain rules in TypeScript       → L7 post-proc rule-based optimization
  ⇒ Batch campaign results           → L12 ML training (17K+ datapoints)
```

### R3 Task DAG
```
LAYER 3 — Domain Rules:
[MS0-T1]──→[MS0-T2]──→[MS0-T3]
 (Chat)      (Code)      (Code)

LAYER 4 — Composed Features:
            [MS1-T1]──→[MS1-T2]──→[MS1-T3]──→[MS1-T4]
             (Chat)      (Code)      (Code)      (Chat)

LAYER 4 — Material Enrichment (parallel with MS1):
[MS2-T1a]──→[MS2-T2a]
[MS2-T1b]──→[MS2-T2b]     (Code agent team, 4 parallel)
[MS2-T1c]──→[MS2-T2c]
[MS2-T1d]──→[MS2-T2d]

LAYER 5 — Campaign Engine + Scale Validation:
[MS3-T1]──→[MS3-T2]──→[MS4-T1]──→[MS4-T2]──→[MS4-T3]
 (Code)      (Chat)      (Code)      (Code)      (Chat)

Gate:
[MS5-T1]──→[MS5-T2]──→[MS5-T3]
 (Code)      (Chat)      (Code)
```

### R3 File Dependency Map
```
MS0 (Monolith Extraction — L3):
  ← rules_engine.js (5,500 lines)            READ: domain decision logic
  ← machining_rules.js (4,200 lines)         READ: 25yr machining heuristics
  ← constraint_engine.js (2,400 lines)       READ: validation rules
  ← operation_sequencer.js (3,200 lines)     READ: workflow optimization
  → src/engines/intelligenceEngine.ts         WRITE: new engine with extracted rules
  → src/engines/{Safety}*.ts               WRITE: safety rules extracted ⊗
  → data/docs/roadmap/EXTRACTION_PLAN.md      WRITE: categorized extraction plan

MS1 (Intelligence Features — L4):
  ← src/engines/intelligenceEngine.ts         READ: extracted rules
  ← src/engines/ManufacturingCalculations.ts    READ: calibrated Kienzle/Taylor
  ← src/engines/AdvancedCalculations.ts         READ: calibrated thermal
  ← src/engines/ToolpathCalculations.ts         READ: calibrated toolpath
  → src/engines/intelligenceEngine.ts         WRITE: 11 action methods
  → src/tools/dispatchers/calcDispatcher.ts   WRITE: wire new MCP actions
  → tests/r3/intelligence-tests.ts            WRITE: test suite
  → data/docs/roadmap/INTELLIGENCE_ACTIONS_SPEC.md  WRITE: action specs

MS2 (Material Enrichment — L4):
  ← data/materials/{family}/*.json            READ: current material data
  ⇐ MaterialRegistry                         READ: missing field audit
  → data/materials/{family}/*.json            WRITE: enriched fields

MS3 (Campaign Engine — L5):
  ← src/engines/intelligenceEngine.ts         READ: intelligence actions
  ← src/engines/{Safety}*.ts               READ: safety validation
  → src/engines/campaignEngine.ts             WRITE: new campaign engine
  → src/tools/dispatchers/calcDispatcher.ts   WRITE: campaign MCP actions

MS4 (Batch Campaigns — L5):
  ← src/engines/campaignEngine.ts             READ: campaign methods
  ⇐ MaterialRegistry (3,518 materials)        READ: full library
  → tests/r3/batch-campaign-runner.ts         WRITE: runner
  → tests/r3/CAMPAIGN_STATE.json              WRITE: batch state tracking
  → tests/r3/campaign-results/                WRITE: per-batch results
```

---

### MS0: Intelligence Extraction from Monolith (LAYER 3)
**Purpose:** Extract 15,300 lines of domain logic from JavaScript monolith.

#### MS0-T1: Audit + Categorize Monolith Rules
```
TASK: MS0-T1
  DEPENDS_ON: [R2-MS4 complete]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 3
  READS_FROM: [
    rules_engine.js (5,500 lines),
    machining_rules.js (4,200 lines),
    constraint_engine.js (2,400 lines),
    operation_sequencer.js (3,200 lines)
  ]
  WRITES_TO: [data/docs/roadmap/EXTRACTION_PLAN.md]
  DATA_DEPS: [none — read-only analysis]
  TASK_DEPS: [R2 complete (need calibrated engines to know which rules feed which engine)]
  PROVIDES: [Categorized extraction plan → MS0-T2 knows what to extract where]
```
**Step-by-step:**
1. Read 4 monolith source files via Desktop Commander
2. Categorize each rule block:
   - **Safety rules** → safetyEngine.ts
   - **Cutting parameter rules** → manufacturingCalcEngine.ts
   - **Material selection rules** → intelligenceEngine.ts (new)
   - **Machine capability rules** → intelligenceEngine.ts (new)
   - **Workflow/sequencing rules** → campaignEngine.ts (new)
   - **Constraint validation** → safetyEngine.ts (validation section)
3. Priority-rank by: which rules unlock which L4 intelligence features
4. Write EXTRACTION_PLAN.md with per-rule-block categorization

#### MS0-T2: Extract Rules into TypeScript
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics reviews safety rule extractions)
  ESTIMATED_CALLS: 30-40
  LAYER: 3
  READS_FROM: [
    data/docs/roadmap/EXTRACTION_PLAN.md,
    rules_engine.js, machining_rules.js, constraint_engine.js, operation_sequencer.js
  ]
  WRITES_TO: [
    src/engines/intelligenceEngine.ts (NEW — create with rule categories) ⊗,
    src/engines/{Safety}*.ts (safety rules extracted) ⊗,
    src/engines/ManufacturingCalculations.ts (cutting param rules)
  ]
  TASK_DEPS: [MS0-T1 extraction plan]
  PROVIDES: [TypeScript-typed rules → MS0-T3 validation, MS1-T1 action design]
```
**Step-by-step:**
1. Create `src/engines/intelligenceEngine.ts` with rule categories as methods
2. For each rule block: translate JS → TypeScript with proper typing
3. Preserve original logic — exact translation, no optimization
4. Build after every 500 lines extracted
5. CRITICAL: safety rules → invoke safety-physics subagent for review

#### MS0-T3: Validate Extracted Rules
```
TASK: MS0-T3
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | ESTIMATED_CALLS: 8
  LAYER: 3
  READS_FROM: [
    src/engines/intelligenceEngine.ts,
    rules_engine.js (original for comparison)
  ]
  WRITES_TO: [tests/r3/extraction-tests.ts, tests/r3/extraction-results.json]
  TASK_DEPS: [MS0-T2 extracted rules]
  PROVIDES: [Validated extraction → MS1-T1 can design actions on trusted rules]
```
**Step-by-step:** Create test harness, 20 test cases, compare monolith vs extracted output

---

### MS1: Intelligence Feature Implementation (LAYER 4)
**Purpose:** Build 11 composed features answering machinist questions.

#### MS1-T1: Design Intelligence Actions
```
TASK: MS1-T1
  DEPENDS_ON: [MS0-T3]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 4
  READS_FROM: [
    src/engines/intelligenceEngine.ts (extracted rules),
    src/engines/ManufacturingCalculations.ts (calibrated — available actions),
    src/engines/AdvancedCalculations.ts (calibrated — available actions),
    src/engines/ToolpathCalculations.ts (calibrated — available actions)
  ]
  WRITES_TO: [data/docs/roadmap/INTELLIGENCE_ACTIONS_SPEC.md]
  TASK_DEPS: [MS0-T3 (validated rules exist)]
  PROVIDES: [Action specs → MS1-T2 implementation blueprint]
```
**11 Actions to design:**
1. `job_plan` — complete machining plan for part+material+machine
   - COMPOSES: speed_feed + cutting_force + tool_life + safety_check
   - USES RULES: operation sequencing, tool selection, machine capability matching
2. `setup_sheet` — workholding, tool list, datum, sequence
   - COMPOSES: machine_capabilities + tool geometry + workholding rules
3. `wear_prediction` — tool wear forecast over campaign
   - COMPOSES: Taylor tool_life + thermal + force accumulation
4. `process_cost` — cost breakdown (machine time + tool cost + overhead)
   - COMPOSES: cycle_time + cost_optimize + tool_life (amortized)
5. `uncertainty_chain` — propagate uncertainty through calc chain
   - COMPOSES: all calcs with AtomicValue uncertainty propagation
6. `material_substitute` — find alternatives with similar machinability
   - USES RULES: material grouping, machinability rating, property matching
7. `machine_recommend` — match part to machine capabilities
   - USES RULES: envelope checking, spindle capability, axis count
8. `controller_optimize` — controller-specific parameter tuning
   - USES RULES: controller-specific canned cycles, format optimization
9. `what_if` — "what happens if I change X by Y%?"
   - COMPOSES: re-runs full calc chain with modified parameter
10. `strategy_for_job` — optimal toolpath strategy for job
    - COMPOSES: toolpath selection + material strategy matching
11. `strategy_compare` — head-to-head strategy comparison
    - COMPOSES: two strategy evaluations + delta report

For each: input schema, output schema, validation chain, error handling

#### MS1-T2: Implement Intelligence Actions
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics reviews safety-coupled actions)
  ESTIMATED_CALLS: 25-35
  LAYER: 4
  READS_FROM: [
    data/docs/roadmap/INTELLIGENCE_ACTIONS_SPEC.md,
    src/engines/intelligenceEngine.ts (extracted rules),
    src/engines/ManufacturingCalculations.ts,
    src/engines/AdvancedCalculations.ts,
    src/engines/ToolpathCalculations.ts
  ]
  WRITES_TO: [
    src/engines/intelligenceEngine.ts (11 action methods),
    src/tools/dispatchers/calcDispatcher.ts (wire new MCP actions)
  ]
  TASK_DEPS: [MS1-T1 action specs]
  PROVIDES: [11 wired MCP actions → MS1-T3 testing, MS3 campaign engine]
```

#### MS1-T3: Intelligence Feature Tests
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 4
  READS_FROM: [src/engines/intelligenceEngine.ts]
  WRITES_TO: [tests/r3/intelligence-tests.ts]
  DATA_DEPS: [MaterialRegistry, MachineRegistry, ToolRegistry (test scenarios)]
  PROVIDES: [Test results → MS1-T4 physics validation]
```

#### MS1-T4: Intelligence Feature Validation
```
TASK: MS1-T4
  DEPENDS_ON: [MS1-T3]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  SUCCESS: All 11 actions produce physically plausible results for 3 test scenarios
  LAYER: 4
  READS_FROM: [tests/r3/intelligence-tests.ts results]
  DATA_DEPS: [MaterialRegistry, MachineRegistry (for real-world scenario validation)]
  PROVIDES: [Validated intelligence features → MS3 campaign engine, L6 enterprise, L13 UI]
```
**3 Validation Scenarios:**
1. Mill 4140 steel pocket on Haas VF-2 (common case)
2. Turn Ti-6Al-4V shaft on Mazak QTN-200 (difficult material)
3. Drill + tap 316L flange on DMG DMU 50 (multi-op)

---

### MS2: Material Enrichment Pipeline (LAYER 4 — CODE Agent Team)
**4 teammates processing material families in parallel.**

```
TEAM: r3-material-enrichment
LEAD: opus (validates physics plausibility)
TEAMMATES:
  - steel-enricher      | sonnet | carbon/alloy/tool steels
  - stainless-enricher  | sonnet | stainless + nickel alloys
  - nonferrous-enricher | sonnet | aluminum, copper, brass, titanium
  - other-enricher      | sonnet | cast iron, polymers, composites, exotics
```

#### MS2-T1a-d: Audit Missing Fields (PARALLEL)
```
TASK: MS2-T1{a-d}
  DEPENDS_ON: [MS1-T4]
  EXECUTOR: Code (agent team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO
  ESTIMATED_CALLS: 5 per teammate (20 total)
  LAYER: 4
  READS_FROM: [data/materials/{family}/*.json]
  WRITES_TO: [tests/r3/material-audit-{family}.json]
  DATA_DEPS: [MaterialRegistry (required fields list: kc1.1, mc, Taylor C/n, thermal_k, hardness)]
  PROVIDES: [Audit reports → MS2-T2 enrichment targets]
```

#### MS2-T2a-d: Enrich Materials (PARALLEL)
```
TASK: MS2-T2{a-d}
  DEPENDS_ON: [MS2-T1{same}]
  EXECUTOR: Code (agent team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: GATED (Chat spot-checks)
  ESTIMATED_CALLS: 15 per teammate (60 total)
  LAYER: 4
  READS_FROM: [tests/r3/material-audit-{family}.json, data/materials/{family}/*.json]
  WRITES_TO: [data/materials/{family}/*.json (enriched fields)]
  PROVIDES: [Enriched materials → MS4 batch campaigns, L12 ML training completeness]
```

---

### MS3: Campaign Engine (LAYER 5)

#### MS3-T1: Implement Campaign Engine
```
TASK: MS3-T1
  DEPENDS_ON: [MS1-T4, MS2-T2a-d]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics reviews) | ESTIMATED_CALLS: 20
  LAYER: 5
  READS_FROM: [
    src/engines/intelligenceEngine.ts (11 actions to compose),
    src/engines/{Safety}*.ts (validation methods)
  ]
  WRITES_TO: [
    src/engines/campaignEngine.ts (NEW),
    src/tools/dispatchers/calcDispatcher.ts (wire campaign actions)
  ]
  TASK_DEPS: [MS1-T4 (validated intelligence actions), MS2-T2 (enriched materials)]
  PROVIDES: [Campaign engine → MS4 batch campaigns, L13 campaign dashboard UI]
```
**Methods:** createCampaign, validateCampaign (cumulative safety), optimizeCampaign,
estimateCycleTime. Wire as: campaign_create, campaign_validate, campaign_optimize, campaign_cycle_time

#### MS3-T2: Campaign Safety Validation
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 5
  READS_FROM: [src/engines/campaignEngine.ts]
  DATA_DEPS: [MaterialRegistry, MachineRegistry (test campaign materials)]
  PROVIDES: [Validated campaign safety → MS4 batch runs safe]
```
**Verify:** Cumulative wear tracked, thermal accumulation, workholding per-op, S(x) on output

---

### MS4: Batch Data Campaigns (LAYER 5)

#### MS4-T1: Campaign Runner Infrastructure
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 5
  READS_FROM: [src/engines/campaignEngine.ts]
  WRITES_TO: [
    tests/r3/batch-campaign-runner.ts,
    tests/r3/CAMPAIGN_STATE.json
  ]
  PROVIDES: [Runner infrastructure → MS4-T2 batch execution]
```
**Config:** 10 materials/batch, completed_batch_ids array (concurrent-safe),
quarantine protocol for materials failing >2 categories

#### MS4-T2: Execute Material Campaigns
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 40-60
  LAYER: 5
  READS_FROM: [tests/r3/batch-campaign-runner.ts]
  WRITES_TO: [
    tests/r3/CAMPAIGN_STATE.json (updated per batch),
    tests/r3/campaign-results/*.json (per-batch results)
  ]
  DATA_DEPS: [MaterialRegistry (full 3,518 materials)]
  PROVIDES: [Campaign results → MS4-T3 validation, L12 ML training data (17K+ datapoints)]
```

#### MS4-T3: Campaign Results Validation
```
TASK: MS4-T3
  DEPENDS_ON: [MS4-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  SUCCESS: ≥80% material coverage, quarantine list reviewed
  LAYER: 5
  READS_FROM: [tests/r3/campaign-results/*.json, tests/r3/CAMPAIGN_STATE.json]
  PROVIDES: [Validated campaign data → L12 ML training, R3 gate]
```

---

### MS5: Phase Gate

#### MS5-T1: Build + Test (CODE)
```
TASK: MS5-T1
  EXECUTOR: Code | MODEL: sonnet | EFFORT: STD | GATE: GATED | CALLS: 5
  READS_FROM: [entire codebase]
  PROVIDES: [Clean build → MS5-T2]
```

#### MS5-T2: Quality Scoring (CHAT)
```
TASK: MS5-T2
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL | GATE: GATED (Ω ≥ 0.70) | CALLS: 5
  SUCCESS: Ω ≥ 0.70, S(x) ≥ 0.70, 11 intelligence actions operational, ≥80% material coverage
  PROVIDES: [Quality scores → R4 entry criteria]
```

#### MS5-T3: Tag (CODE)
```
TASK: MS5-T3
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r3-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R3 Summary
| Task | Executor | Model | Effort | Layer | Parallel | Gate | Calls |
|------|----------|-------|--------|-------|----------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L3 | no | GATED | 12 |
| MS0-T2 | Code | sonnet | STD | L3 | no | GATED | 30-40 |
| MS0-T3 | Code | haiku | LIGHT | L3 | no | GATED | 8 |
| MS1-T1 | **Chat** | opus | NOVEL | L4 | no | GATED | 15 |
| MS1-T2 | Code | sonnet | STD | L4 | no | GATED | 25-35 |
| MS1-T3 | Code | sonnet | STD | L4 | no | YOLO | 12 |
| MS1-T4 | **Chat** | opus | NOVEL | L4 | no | GATED | 15 |
| MS2-T1a-d | Code team | sonnet x4 | STD | L4 | **TEAM** | YOLO | 20 |
| MS2-T2a-d | Code team | sonnet x4 | STD | L4 | **TEAM** | GATED | 60 |
| MS3-T1 | Code | sonnet | STD | L5 | no | GATED | 20 |
| MS3-T2 | **Chat** | opus | NOVEL | L5 | no | GATED | 12 |
| MS4-T1 | Code | sonnet | STD | L5 | no | YOLO | 10 |
| MS4-T2 | Code | sonnet | STD | L5 | no | YOLO | 40-60 |
| MS4-T3 | **Chat** | opus | NOVEL | L5 | no | GATED | 10 |
| MS5 | Both | mixed | mixed | L5 | no | GATED | 13 |
| **TOTAL** | Chat 35% / Code 65% | | | L3-L5 | | | **305-340** |


---

## 10. R4: ENTERPRISE HARDENING (Layer 6 — Isolation + Compliance)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L6 — Hardening |
| **Goal** | Multi-tenant isolation, compliance templates, API gateway security |
| **Mode Split** | Code 75% / Chat 25% |
| **Estimated Sessions** | 2 |
| **Entry Criteria** | R3 complete, Ω ≥ 0.70 |

### R4 Layer Dependencies
```
L6 DEPENDS ON:
  L4-L5 — Intelligence Features + Campaigns:
    ← src/engines/intelligenceEngine.ts       (features to wrap with isolation)
    ← src/engines/campaignEngine.ts           (campaigns to scope per tenant)
  L2 — Calibrated Engines:
    ← All engines (tenant isolation applies to ALL dispatcher calls)
  L0 — Existing Enterprise Infrastructure:
    ← src/engines/MultiTenantEngine.ts             (EXISTS — basic tenant support)
    ← src/engines/ComplianceEngine.ts         (EXISTS — 6 frameworks)
    ← src/engines/ProtocolBridgeEngine.ts             (EXISTS — API gateway)

L6 PROVIDES TO UPPER LAYERS:
  ⇒ Hardened tenant isolation        → L8 production (deploy securely)
  ⇒ Expanded compliance templates    → L9 data pipeline (audit trail)
  ⇒ Secured API gateway              → L9 external integrations (safe endpoints)
  ⇒ Audit logging                    → L13 dashboard (compliance dashboard)
```

### R4 File Dependency Map
```
MS0 (Tenant Hardening):
  ← src/engines/MultiTenantEngine.ts               READ: current isolation
  ← src/tools/dispatchers/tenantDispatcher.ts  READ: data flow audit
  → src/engines/MultiTenantEngine.ts               WRITE: isolation fixes ⊗
  → tests/r4/tenant-security-audit.md         WRITE: audit report
  → tests/r4/tenant-isolation-tests.ts        WRITE: 10 isolation tests

MS1 (Compliance — Agent Team):
  ← src/engines/ComplianceEngine.ts           READ: existing 6 templates
  → src/engines/ComplianceEngine.ts           WRITE: ISO 9001, NADCAP, custom framework

MS2 (Bridge Security):
  ← src/engines/ProtocolBridgeEngine.ts               READ: current auth/rate limiting
  → src/engines/ProtocolBridgeEngine.ts               WRITE: 3-tier rate limiting, mTLS, scope auth ⊗
```

### MS0: Tenant Isolation Hardening

#### MS0-T1: Tenant Security Audit
```
TASK: MS0-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL | GATE: GATED | CALLS: 10
  LAYER: 6
  READS_FROM: [src/engines/MultiTenantEngine.ts, src/tools/dispatchers/tenantDispatcher.ts]
  WRITES_TO: [tests/r4/tenant-security-audit.md]
  PROVIDES: [Audit findings → MS0-T2 fix list]
```
Trace data flows: tenant_id propagation, shared learning bus leaks, file path scoping, memory isolation

#### MS0-T2: Fix Isolation Gaps
```
TASK: MS0-T2
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STD
  GATE: GATED (Chat re-audits) | CALLS: 12
  LAYER: 6
  READS_FROM: [tests/r4/tenant-security-audit.md]
  WRITES_TO: [src/engines/MultiTenantEngine.ts ⊗]
  PROVIDES: [Zero-leak isolation → MS0-T3 tests]
```

#### MS0-T3: Tenant Integration Tests
```
TASK: MS0-T3
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | CALLS: 6
  LAYER: 6
  WRITES_TO: [tests/r4/tenant-isolation-tests.ts]
  PROVIDES: [Verified isolation → MS1 can build on secure foundation]
```

### MS1: Compliance Template Expansion (Agent Team)
```
TEAM: r4-compliance | 3 teammates: iso9001-writer, nadcap-writer, custom-writer
Each: sonnet | STANDARD | 8+10 calls = ~54 total
LAYER: 6
READS_FROM: [src/engines/ComplianceEngine.ts (existing templates)]
WRITES_TO: [src/engines/ComplianceEngine.ts (3 new templates)]
PROVIDES: [Expanded compliance → L9 audit trail for data pipelines]
```

### MS2: Bridge/API Gateway Hardening

#### MS2-T1: API Security Audit (Chat) + MS2-T2: Implement (Code)
```
LAYER: 6 | CALLS: 8+15=23
READS_FROM: [src/engines/ProtocolBridgeEngine.ts, src/tools/dispatchers/bridgeDispatcher.ts]
WRITES_TO: [src/engines/ProtocolBridgeEngine.ts (3-tier rate limiting, mTLS, scope auth) ⊗]
PROVIDES: [Secured API → L9 safe external integration endpoints]
```

### MS3: Fix Cycle + Regression (CODE)

#### MS3-T1: Fix Issues from Audits
```
TASK: MS3-T1
  DEPENDS_ON: [MS0-T3, MS1, MS2-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 6
  READS_FROM: [
    tests/r4/tenant-security-audit.md (remaining issues),
    tests/r4/tenant-isolation-tests.ts (failures)
  ]
  WRITES_TO: [
    src/engines/MultiTenantEngine.ts,
    src/engines/ComplianceEngine.ts,
    src/engines/ProtocolBridgeEngine.ts
  ]
  PROVIDES: [All audit findings resolved → MS3-T2 regression check]
```

#### MS3-T2: Full Regression Suite
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | ESTIMATED_CALLS: 5
  LAYER: 6
  READS_FROM: [tests/r4/*, tests/r2/run-benchmarks.ts, tests/r3/intelligence-tests.ts]
  PROVIDES: [Zero regression → MS4 gate]
```
**Step-by-step:**
1. Run full R2 benchmark suite — all 50 must still pass at prior rate
2. Run R3 intelligence tests — all 11 actions pass
3. Run R4 tenant isolation tests — all 10 pass
4. Run R4 compliance gap analysis — 0 critical gaps per template
5. Verify build clean

### MS4: Quality Gate

#### MS4-T1: Quality Scoring
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70)
  ESTIMATED_CALLS: 5
  LAYER: 6
  READS_FROM: [all test results from MS3-T2]
  PROVIDES: [Quality scores → R5 entry criteria]
```

#### MS4-T2: Tag + Position
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  WRITES_TO: [git tag r4-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R4 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L6 | GATED | 10 |
| MS0-T2 | Code | sonnet | STD | L6 | GATED | 12 |
| MS0-T3 | Code | haiku | LIGHT | L6 | GATED | 6 |
| MS1 Team | Code x3 | sonnet | STD | L6 | GATED | 54 |
| MS2-T1 | **Chat** | opus | NOVEL | L6 | GATED | 8 |
| MS2-T2 | Code | sonnet | STD | L6 | GATED | 15 |
| MS3-T1 | Code | sonnet | STD | L6 | YOLO | 12 |
| MS3-T2 | Code | haiku | LIGHT | L6 | GATED | 5 |
| MS4-T1 | **Chat** | opus | NOVEL | L6 | GATED | 5 |
| MS4-T2 | Code | haiku | LIGHT | L6 | YOLO | 3 |
| **TOTAL** | Chat 25% / Code 75% | | | L6 | | **~135** |


---

## 11. R5: POST PROCESSORS + G-CODE GENERATION (Layer 7 — Machine Output)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L7 — Machine Output |
| **Goal** | G-code generation per controller, toolpath visualization, cycle time |
| **Mode Split** | Code 70% / Chat 30% |
| **Estimated Sessions** | 3-4 |
| **Entry Criteria** | R4 complete, Ω ≥ 0.70 |

### R5 Layer Dependencies
```
L7 DEPENDS ON:
  L2 — Calibrated Engines:
    ← src/engines/ManufacturingCalculations.ts   (speed/feed for G-code params)
    ← src/engines/ToolpathCalculations.ts        (680 strategies → G-code patterns)
    ← src/engines/AdvancedCalculations.ts        (cycle_time estimation)
  L4 — Intelligence Features:
    ← src/engines/intelligenceEngine.ts        (job_plan → operation sequence)
  L6 — Enterprise:
    ← src/engines/{Safety}*.ts              (G-code safety validation scope) ⊗

  L0 — Controller Data:
    ⇐ MachineRegistry (controller types: Fanuc, Siemens, Haas, Mazak, DMG, Okuma)
    ⇐ AlarmRegistry (controller-specific alarm codes for error handling)

L7 PROVIDES TO UPPER LAYERS:
  ⇒ 6 post processors          → L8 production (deployable G-code gen)
  ⇒ G-code safety validation    → L14 digital twin (safe machine commands) ⊗
  ⇒ Toolpath visualization      → L13 UI (SVG toolpath display)
  ⇒ Cycle time estimation       → L4 process_cost (already exists, validated here)
  ⇒ 680 strategy→G-code maps   → L11 DSL (compressible G-code patterns)
```

### R5 File Dependency Map
```
MS0 (Post Processor Architecture — Chat + Agent Team):
  ← src/engines/ToolpathCalculations.ts         READ: 680 strategies
  ⇐ MachineRegistry (controller specs)         READ: per-controller G-code format
  → src/engines/postProcessorEngine.ts         WRITE: interface + base class
  → src/engines/postProcessors/fanuc.ts        WRITE: Fanuc post proc ⊗
  → src/engines/postProcessors/siemens.ts      WRITE: Siemens post proc ⊗
  → src/engines/postProcessors/haas.ts         WRITE: Haas post proc ⊗
  → src/engines/postProcessors/mazak.ts        WRITE: Mazak post proc ⊗
  → src/engines/postProcessors/dmg.ts          WRITE: DMG MORI post proc ⊗
  → src/engines/postProcessors/okuma.ts        WRITE: Okuma post proc ⊗

MS1 (G-code Gen + Safety):
  ← src/engines/postProcessors/*.ts            READ: all 6 post processors
  ← src/engines/ToolpathCalculations.ts          READ: 680 strategies
  → G-code output samples                      WRITE: for safety validation ⊗

MS2 (Visualization):
  ← src/engines/ToolpathCalculations.ts          READ: toolpath geometry
  → src/engines/visualizationEngine.ts         WRITE: SVG 2D toolpath renderer

MS3 (Cycle Time):
  ← src/engines/postProcessors/*.ts            READ: per-controller timing
  → src/engines/cycleTimeEngine.ts             WRITE: estimation engine
```

### MS0: Post Processor Engine

#### MS0-T1: Architecture Design
```
TASK: MS0-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL | GATE: GATED | CALLS: 12
  LAYER: 7
  READS_FROM: [src/engines/ToolpathCalculations.ts]
  WRITES_TO: [design doc, src/engines/postProcessorEngine.ts (interface)]
  DATA_DEPS: [MachineRegistry (controller format differences)]
  PROVIDES: [PostProcessor interface → MS0-T2 team implementation]
```
**Map controller differences:** Fanuc G28/G43, Siemens G500/CYCLE800, Haas canned cycles,
Mazak Mazatrol compat, DMG proprietary cycles, Okuma OSP format.
**Safety checks:** No G00 into workpiece, M05 before tool change, safe Z retract ⊗

#### MS0-T2a-c: Implement 6 Post Processors (Agent Team)
```
TEAM: r5-post-processors
  fanuc-haas:    sonnet | Fanuc + Haas
  siemens-dmg:   sonnet | Siemens + DMG MORI
  mazak-okuma:   sonnet | Mazak + Okuma
PARALLEL: true | CALLS: 20 per teammate (60 total)
LAYER: 7
GATE: GATED (Chat validates G-code safety) ⊗
PROVIDES: [6 controller post processors → MS1 strategy wiring]
```

### MS1: G-code for 680 Strategies + Safety
```
MS1-T1: Wire strategies to post processors
  EXECUTOR: Code | sonnet | STD | CALLS: 30
  LAYER: 7
  READS_FROM: [src/engines/ToolpathCalculations.ts (680 strategies), postProcessors/*.ts]
  WRITES_TO: [src/engines/postProcessorEngine.ts (strategy→G-code map)]
  PROVIDES: [All strategies produce G-code → MS1-T2 safety check]

MS1-T2: G-code safety validation
  EXECUTOR: Chat | opus | NOVEL | GATE: GATED | CALLS: 15
  LAYER: 7
  READS_FROM: [G-code samples from 20 strategies]
  PROVIDES: [Safety-validated G-code patterns → L8 production, L14 digital twin] ⊗
```

### MS2: Toolpath Visualization

#### MS2-T1: SVG Renderer Design
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 7
  READS_FROM: [src/engines/ToolpathCalculations.ts (toolpath geometry data)]
  WRITES_TO: [src/engines/visualizationEngine.ts (NEW)]
  PROVIDES: [SVG 2D toolpath renderer → L13 UI toolpath display]
```
**Step-by-step:**
1. Create `src/engines/visualizationEngine.ts`
2. Implement: `renderToolpath(strategy, params) → SVG string`
3. Support: milling XY plane, turning ZX profile, drilling Z depth
4. Color-code: rapid=red, cutting=blue, retract=green
5. Scale to workpiece envelope, add axis labels + dimension annotations

#### MS2-T2: Visualization Tests
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 5
  LAYER: 7
  READS_FROM: [src/engines/visualizationEngine.ts]
  WRITES_TO: [tests/r5/visualization-tests.ts]
  PROVIDES: [Tested renderer → L13 UI integration]
```

#### MS2-T3: Wire MCP Action
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 5
  LAYER: 7
  WRITES_TO: [src/tools/dispatchers/calcDispatcher.ts (toolpath_visualize action)]
  PROVIDES: [prism_calc→toolpath_visualize MCP action → L13 UI]
```

### MS3: Cycle Time Estimation

#### MS3-T1: Cycle Time Engine
```
TASK: MS3-T1
  DEPENDS_ON: [MS0-T2a-c, MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 7
  READS_FROM: [
    src/engines/postProcessors/*.ts (per-controller timing: rapid traverse, tool change, indexing),
    src/engines/ToolpathCalculations.ts (cutting path length),
    src/engines/ManufacturingCalculations.ts (feed rate → time)
  ]
  WRITES_TO: [src/engines/cycleTimeEngine.ts (NEW)]
  DATA_DEPS: [MachineRegistry (rapid rates, tool change time per machine)]
  PROVIDES: [Cycle time estimation → L4 process_cost validation, L13 UI display]
```
**Step-by-step:**
1. Create `src/engines/cycleTimeEngine.ts`
2. Components: cutting_time + rapid_time + tool_change_time + indexing_time + dwell_time
3. Per-controller: Fanuc G00 rate differs from Siemens, tool change varies by ATC type
4. Wire as `prism_calc→estimate_cycle_time`

#### MS3-T2: Validate Against prism_calc→cycle_time
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 5
  LAYER: 7
  READS_FROM: [src/engines/cycleTimeEngine.ts output vs prism_calc→cycle_time output]
  PROVIDES: [Validated cycle time within ±10% → MS4 gate]
```

### MS4: Integration Test

#### MS4-T1: Post Processor E2E Test
```
TASK: MS4-T1
  DEPENDS_ON: [MS1-T2, MS2-T3, MS3-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 8
  LAYER: 7
  READS_FROM: [all R5 outputs]
  WRITES_TO: [tests/r5/postproc-e2e.ts]
  PROVIDES: [E2E verified → MS5 gate]
```
**E2E flow:** Select material+tool+machine → calculate params → select strategy → generate G-code → validate safety → render toolpath SVG → estimate cycle time

### MS5: Quality Gate

#### MS5-T1: Quality Scoring
```
TASK: MS5-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70) | CALLS: 5
  LAYER: 7
  PROVIDES: [Quality scores → R6 entry criteria]
```

#### MS5-T2: Tag
```
TASK: MS5-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r5-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R5 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L7 | GATED | 12 |
| MS0-T2a-c | Code x3 | sonnet | STD | L7 | GATED | 60 |
| MS1-T1 | Code | sonnet | STD | L7 | YOLO | 30 |
| MS1-T2 | **Chat** | opus | NOVEL | L7 | GATED | 15 |
| MS2-T1 | Code | sonnet | STD | L7 | YOLO | 15 |
| MS2-T2 | Code | haiku | LIGHT | L7 | YOLO | 5 |
| MS2-T3 | Code | sonnet | LIGHT | L7 | YOLO | 5 |
| MS3-T1 | Code | sonnet | STD | L7 | YOLO | 10 |
| MS3-T2 | **Chat** | opus | STD | L7 | GATED | 5 |
| MS4-T1 | Code | sonnet | STD | L7 | GATED | 8 |
| MS5 | Both | mixed | | L7 | GATED | 8 |
| **TOTAL** | Chat 30% / Code 70% | | | L7 | | **~173** |


---

## 12. R6: PRODUCTION DEPLOYMENT (Layer 8 — Infrastructure)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L8 — Infrastructure |
| **Goal** | Docker, CI/CD, monitoring, load testing |
| **Mode Split** | Code 90% / Chat 10% |
| **Estimated Sessions** | 2 |
| **Entry Criteria** | R5 complete, Ω ≥ 0.70 |

### R6 Layer Dependencies
```
L8 DEPENDS ON:
  L7 — Post Processors (containerize G-code gen)
  L6 — Enterprise (deploy with tenant isolation)
  L4-L5 — Features (deploy intelligence actions)
  L2 — Calibrated Engines (deploy calibrated calcs)

L8 PROVIDES TO UPPER LAYERS:
  ⇒ Docker container          → L9 data pipeline (runs in container)
  ⇒ CI/CD pipeline            → L10 plugins (test on commit)
  ⇒ Monitoring + alerting     → L9 real-time data monitoring
  ⇒ Load testing baseline     → L14 digital twin (performance envelope)
  ⇒ Health check endpoint     → L15 SaaS (uptime monitoring)
```

### R6 File Dependency Map
```
MS0: ← entire src/ → Dockerfile, docker-compose.yml, scripts/health-check.ts
MS1: → .github/workflows/ci.yml (lint → build → test → verify)
MS2: → scripts/monitoring/ (Prometheus metrics + Grafana template)
MS3: ← all dispatchers → tests/r6/load-test.ts (100 concurrent MCP requests)
```

### MS0: Docker Containerization

#### MS0-T1: Dockerfile + Compose
```
TASK: MS0-T1
  DEPENDS_ON: [R5 complete]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 8
  READS_FROM: [
    package.json (dependencies),
    tsconfig.json (build config),
    src/ (entire source tree)
  ]
  WRITES_TO: [
    Dockerfile (multi-stage: build + runtime),
    docker-compose.yml (service definition + volumes),
    .dockerignore
  ]
  PROVIDES: [Container image → MS0-T2 health check, MS1 CI/CD, MS3 load test]
```
**Step-by-step:**
1. Multi-stage Dockerfile: `node:20-slim` base, build stage with `npm run build`, runtime stage with dist/ only
2. docker-compose: PRISM service, volume mounts for state/ and data/, port mapping
3. Environment variable injection for API keys, tenant config
4. Image size target: <200MB

#### MS0-T2: Health Check Endpoint
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 5
  LAYER: 8
  READS_FROM: [src/tools/dispatchers/ (all 31 dispatchers)]
  WRITES_TO: [scripts/health-check.ts]
  PROVIDES: [Health check → MS2 monitoring, L15 SaaS uptime]
```
**Step-by-step:**
1. Ping each of 31 dispatchers with a lightweight action
2. Report: dispatcher_name, status (ok/error), response_time_ms
3. Aggregate: overall health score, any degraded dispatchers
4. Expose as HTTP endpoint for Docker HEALTHCHECK

### MS1: CI/CD Pipeline

#### MS1-T1: GitHub Actions Workflow
```
TASK: MS1-T1
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 8
  LAYER: 8
  READS_FROM: [package.json (scripts), tests/ (test structure)]
  WRITES_TO: [.github/workflows/ci.yml]
  PROVIDES: [CI pipeline → all future PRs validated automatically]
```
**Pipeline stages:** lint → build → test:critical → test:regression → verify-build → docker-build

#### MS1-T2: Pre-commit Hooks
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 2
  LAYER: 8
  WRITES_TO: [.husky/pre-commit (lint-staged)]
  PROVIDES: [Pre-commit lint → code quality gate]
```

### MS2: Monitoring + Alerting

#### MS2-T1: Prometheus Metrics Export
```
TASK: MS2-T1
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 8
  READS_FROM: [src/tools/dispatchers/ (instrument each dispatcher)]
  WRITES_TO: [
    src/monitoring/metricsEngine.ts (NEW — Prometheus counter/histogram),
    scripts/monitoring/prometheus.yml (scrape config)
  ]
  PROVIDES: [Metrics endpoint → MS2-T2 Grafana, L9 stream health monitoring]
```
**Metrics:** request_count, request_duration_ms, error_count, safety_gate_blocks, dispatcher_health per dispatcher

#### MS2-T2: Grafana Dashboard Template
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 5
  LAYER: 8
  READS_FROM: [src/monitoring/metricsEngine.ts (metric names)]
  WRITES_TO: [scripts/monitoring/grafana-dashboard.json]
  PROVIDES: [Dashboard template → L13 UI monitoring panel, L15 SaaS ops]
```
**Panels:** Request rate, error rate, P50/P95/P99 latency, safety gate blocks, dispatcher health grid

### MS3: Load Testing

#### MS3-T1: Load Test Infrastructure
```
TASK: MS3-T1
  DEPENDS_ON: [MS0-T2, MS2-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 8
  READS_FROM: [src/tools/dispatchers/ (action signatures for test payloads)]
  WRITES_TO: [tests/r6/load-test.ts]
  DATA_DEPS: [MaterialRegistry (sample materials for test payloads)]
  PROVIDES: [Load test runner → MS3-T2 execution]
```
**Step-by-step:**
1. Create concurrent request generator: N workers × M requests each
2. Payload: realistic MCP calls (speed_feed, cutting_force, alarm_decode, tool_search)
3. Measure: throughput (req/s), latency (P50/P95/P99), error rate, memory usage

#### MS3-T2: Load Test Execution + Analysis
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 8
  READS_FROM: [tests/r6/load-test.ts output]
  PROVIDES: [Performance baseline → L14 digital twin performance envelope]
```
**SUCCESS:** 100 concurrent MCP requests, P99 < 5s, error rate < 1%, no safety degradation ⊗
**ESCALATION:** If P99 > 5s → identify bottleneck dispatcher, optimize or add caching

### MS4: Quality Gate

#### MS4-T1: Quality Scoring
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70) | CALLS: 5
  LAYER: 8
  PROVIDES: [Production-ready certification → R7 entry criteria]
```

#### MS4-T2: Tag
```
TASK: MS4-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r6-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R6 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | Code | sonnet | STD | L8 | YOLO | 10 |
| MS0-T2 | Code | sonnet | LIGHT | L8 | YOLO | 5 |
| MS1-T1 | Code | sonnet | STD | L8 | YOLO | 8 |
| MS1-T2 | Code | sonnet | LIGHT | L8 | YOLO | 2 |
| MS2-T1 | Code | sonnet | STD | L8 | YOLO | 10 |
| MS2-T2 | Code | sonnet | LIGHT | L8 | YOLO | 5 |
| MS3-T1 | Code | sonnet | STD | L8 | YOLO | 10 |
| MS3-T2 | **Chat** | opus | NOVEL | L8 | GATED | 10 |
| MS4-T1 | **Chat** | opus | NOVEL | L8 | GATED | 5 |
| MS4-T2 | Code | haiku | LIGHT | L8 | YOLO | 3 |
| **TOTAL** | Chat 10% / Code 90% | | | L8 | | **~68** |


---

## 13. R7: DATA PIPELINE + EXTERNAL INTEGRATIONS (Layer 9 — Real-World Data)

### **⚠ MOVED UP FROM v18.0 R11 — ML (R10) DEPENDS ON THIS DATA**

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L9 — Data Pipeline |
| **Goal** | MTConnect, OPC-UA, Obsidian, Excel/DuckDB, shop floor data ingestion |
| **Mode Split** | Code 70% / Chat 30% |
| **Estimated Sessions** | 3 |
| **Entry Criteria** | R6 complete (production infrastructure for monitoring) |

### Why Moved Up
v18.0 had this at R11, after ML (R9). But:
- ML needs shop floor training data → this phase produces it
- Anomaly detection needs real machine data patterns → this phase provides them
- PFP feedback path (SK-7 from R3) requires ingestion pipeline → built here
- Digital Twin (R12) needs real-time MTConnect/OPC-UA → built here

Without R7, R10 (ML) trains on synthetic data only. With R7, ML trains on real
manufacturing data from shop floor + MTConnect streams = dramatically better models.

### R7 Layer Dependencies
```
L9 DEPENDS ON:
  L8 — Production Infrastructure:
    ← Dockerfile (integrations run in container)
    ← Monitoring (stream health metrics)
    ← CI/CD (test integrations on commit)
  L6 — Enterprise:
    ← src/engines/MultiTenantEngine.ts     (scope data per tenant)
    ← src/engines/ProtocolBridgeEngine.ts     (secure external endpoints)
    ← src/engines/ComplianceEngine.ts (audit trail for ingested data)
  L2 — Calibrated Engines:
    ← src/engines/{Safety}*.ts     (safety checks on incoming data) ⊗

L9 PROVIDES TO UPPER LAYERS:
  ⇒ MTConnect adapter              → L12 ML training data (real machine signals)
  ⇒ OPC-UA adapter                 → L12 ML training data (PLC-level data)
  ⇒ Shop floor ingestion pipeline  → L12 ML wear/anomaly training data
  ⇒ PFP feedback path              → L12 failure pattern → training signal
  ⇒ Obsidian sync                  → L13 UI (knowledge vault display)
  ⇒ Excel/DuckDB integration       → L13 UI (data export/import)
  ⇒ Real-time data stream          → L14 digital twin (live machine state)
```

### R7 File Dependency Map
```
MS0 (Machine Communication — Chat + Code):
  ← src/engines/{Safety}*.ts               READ: safety interlock rules ⊗
  ⇐ MachineRegistry (controller types)         READ: protocol per machine
  ⇐ AlarmRegistry (alarm event mapping)        READ: decode incoming alarms
  → src/engines/integrationEngine.ts           WRITE: MTConnect + OPC-UA adapters
  → src/engines/integrationEngine.ts           WRITE: safety interlock logic ⊗

MS1 (External Tools — Agent Team):
  → src/engines/obsidianEngine.ts              WRITE: vault sync/create/search
  → src/engines/excelEngine.ts                 WRITE: read/write/sync
  → src/engines/duckdbEngine.ts                WRITE: analytical queries
  → src/engines/shopfloorEngine.ts             WRITE: log/failure/tool-usage ingestion

MS2 (Safety Under Real-Time — Chat + Code):
  ← src/engines/integrationEngine.ts           READ: streaming data
  ← src/engines/{Safety}*.ts                READ: safety checks
  → src/engines/integrationEngine.ts           WRITE: real-time safety wiring ⊗
```

### R7 Task DAG
```
[MS0-T1]──→[MS0-T2]
 (Chat)      (Code)     Protocol Architecture + Implementation
                │
[MS1-T1a]──→[MS1-T2a]
[MS1-T1b]──→[MS1-T2b]   External Tools (Agent Team, parallel)
[MS1-T1c]──→[MS1-T2c]
 (Code team)
                │
[MS2-T1]──→[MS2-T2]──→[MS3-T1]──→[MS4-T1]──→[MS5]
 (Chat)      (Code)      (Code)      (Chat)     (Both)
```

### MS0: Machine Communication Protocol

#### MS0-T1: Protocol Architecture
```
TASK: MS0-T1
  DEPENDS_ON: [R6 complete]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL | GATE: GATED | CALLS: 12
  LAYER: 9
  READS_FROM: [src/engines/{Safety}*.ts (interlock rules)]
  WRITES_TO: [design doc]
  DATA_DEPS: [MachineRegistry (controller protocol mapping), AlarmRegistry (event codes)]
  PROVIDES: [Protocol spec → MS0-T2 implementation]
```
**Step-by-step:**
1. MTConnect adapter: XML stream parsing (position, spindle, feeds, alarms), sample vs event, reconnect
2. OPC-UA adapter: node browsing, subscription management, certificate security
3. Map incoming → PRISM actions:
   - Spindle load → `prism_safety→check_spindle_power` ⊗
   - Alarm event → `prism_data→alarm_decode`
   - Position data → collision proximity check ⊗
4. Safety interlock: dangerous data handling (spindle overload during cut) ⊗

#### MS0-T2: Protocol Implementation
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STD
  GATE: GATED (safety-physics reviews interlock) | CALLS: 25
  LAYER: 9
  READS_FROM: [design doc]
  WRITES_TO: [src/engines/integrationEngine.ts ⊗]
  PROVIDES: [MTConnect + OPC-UA adapters → MS2 real-time safety, L14 digital twin]
```

### MS1: External Tool Integrations (Agent Team)
```
TEAM: r7-integrations
  obsidian-writer:   sonnet | Obsidian vault sync/create/search
  excel-writer:      sonnet | Excel read/write, DuckDB queries
  shopfloor-writer:  sonnet | Machine logs, tool usage, failure events → PFP feedback
PARALLEL: true | CALLS: 15+8 per teammate = ~69 total
LAYER: 9
```

#### MS1-T1a: Obsidian Integration
```
TASK: MS1-T1a
  LAYER: 9
  READS_FROM: [none — new engine]
  WRITES_TO: [src/engines/obsidianEngine.ts]
  PROVIDES: [prism_obsidian→sync/create/search → L13 UI knowledge display]
```

#### MS1-T1b: Excel/DuckDB Integration
```
TASK: MS1-T1b
  LAYER: 9
  READS_FROM: [none — new engines]
  WRITES_TO: [src/engines/excelEngine.ts, src/engines/duckdbEngine.ts]
  PROVIDES: [prism_excel→read/write, prism_db→query → L13 UI data export]
```

#### MS1-T1c: Shop Floor Data Pipeline
```
TASK: MS1-T1c
  LAYER: 9
  READS_FROM: [none — new engine]
  WRITES_TO: [src/engines/shopfloorEngine.ts]
  PROVIDES: [
    Machine log ingestion → L12 ML training data,
    Tool usage tracking → L12 wear prediction training,
    Failure events → L12 anomaly detection training,
    PFP feedback path (SK-7) → L12 predictive failure patterns
  ]
```

### MS2: Safety Under Real-Time Data

#### MS2-T1: Real-Time Safety Architecture
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T1a-c]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 9
  READS_FROM: [
    src/engines/integrationEngine.ts (streaming data paths),
    src/engines/{Safety}*.ts (existing safety checks)
  ]
  WRITES_TO: [data/docs/roadmap/REALTIME_SAFETY_SPEC.md]
  PROVIDES: [Real-time safety spec → MS2-T2 wire-up]
```
**Step-by-step:**
1. Map each streaming data type to safety checks:
   - Spindle load stream → `check_spindle_power` + `check_spindle_torque` ⊗
   - Position stream → `check_toolpath_collision` (proximity) ⊗
   - Temperature stream → `monitor_spindle_thermal`
   - Alarm event → `alarm_decode` + `alarm_fix`
2. Define latency budget: raw data → safety decision < 100ms ⊗
3. Define false positive mitigation: debounce, hysteresis, moving average filters
4. Define escalation: warning → pause → emergency stop hierarchy

#### MS2-T2: Real-Time Safety Wire-Up
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics reviews all safety wiring) ⊗
  ESTIMATED_CALLS: 15
  LAYER: 9
  READS_FROM: [data/docs/roadmap/REALTIME_SAFETY_SPEC.md]
  WRITES_TO: [src/engines/integrationEngine.ts (real-time safety wiring section) ⊗]
  PROVIDES: [Safe real-time pipeline → L14 digital twin safe operation]
```
**SUCCESS:** Safety checks <100ms latency, no false positive flooding ⊗

### MS3: E2E Integration Test

#### MS3-T1: Full Pipeline Test
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 9
  READS_FROM: [
    src/engines/integrationEngine.ts,
    src/engines/obsidianEngine.ts,
    src/engines/excelEngine.ts,
    src/engines/shopfloorEngine.ts,
    src/engines/{Safety}*.ts
  ]
  WRITES_TO: [tests/r7/integration-e2e.ts]
  PROVIDES: [E2E verified pipeline → MS4 review]
```
**E2E flow:** MTConnect stream → parse data → safety check → alarm decode → log to shop floor → export to Excel → sync to Obsidian

### MS4: Architecture Review

#### MS4-T1: Security + Safety Review
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 9
  READS_FROM: [
    src/engines/integrationEngine.ts (data flow paths),
    src/engines/shopfloorEngine.ts (ingestion paths),
    tests/r7/integration-e2e.ts (test results)
  ]
  PROVIDES: [Security-validated integration → MS5 gate]
```
**Review:** No data leak vectors, safety interlocks verified for all stream types,
failure modes handled (connection drop, corrupt data, alarm flood), tenant isolation
maintained under streaming data

### MS5: Quality Gate

#### MS5-T1: Quality Scoring
```
TASK: MS5-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70) | CALLS: 5
  LAYER: 9
  PROVIDES: [Quality scores → R8 entry criteria]
```

#### MS5-T2: Tag
```
TASK: MS5-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r7-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R7 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L9 | GATED | 12 |
| MS0-T2 | Code | sonnet | STD | L9 | GATED | 25 |
| MS1 Team | Code x3 | sonnet | STD | L9 | YOLO | 69 |
| MS2-T1 | **Chat** | opus | NOVEL | L9 | GATED | 10 |
| MS2-T2 | Code+opus | mixed | STD+NOVEL | L9 | GATED | 15 |
| MS3-T1 | Code | sonnet | STD | L9 | GATED | 15 |
| MS4-T1 | **Chat** | opus | NOVEL | L9 | GATED | 10 |
| MS5 | Both | mixed | | L9 | GATED | 8 |
| **TOTAL** | Chat 30% / Code 70% | | | L9 | | **~164** |


---

## 14. R8: PLUGIN RUNTIME (Layer 10 — Extensibility)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L10 — Extensibility |
| **Goal** | Ingest Claude Code plugins, register into PRISM, portable across Code+Chat |
| **Mode Split** | Code 80% / Chat 20% |
| **Estimated Sessions** | 2 |
| **Entry Criteria** | R6 complete (stable production platform) |

### R8 Layer Dependencies
```
L10 DEPENDS ON:
  L8 — Production: Stable platform for plugin runtime
  L6 — Enterprise: Tenant-scoped plugin registration
  Existing PRISM infrastructure:
    ← prism_skill_script dispatcher (skill_load already works)
    ← prism_hook dispatcher (hook registration exists)
    ← prism_bridge dispatcher (MCP proxy exists)
    ← prism_nl_hook dispatcher (natural language hooks)

L10 PROVIDES TO UPPER LAYERS:
  ⇒ Community plugin catalog       → L11 DSL (more actions to compress)
  ⇒ Plugin-delivered tools          → L12 ML (community ML tools)
  ⇒ Plugin-delivered UI components  → L13 UI (community widgets)
  ⇒ Plugin ecosystem                → L15 SaaS (marketplace feature)
```

### R8 File Dependency Map
```
MS0: → src/engines/pluginEngine.ts (NEW — parser + registration)
     → src/tools/dispatchers/pluginDispatcher.ts (NEW — 5 actions)
     → data/docs/roadmap/PLUGIN_ADAPTER_SPEC.md

MS1: ← src/engines/pluginEngine.ts
     → prism_skill_script registrations (skills loaded)
     → prism_hook registrations (hooks mapped)
     → prism_bridge registrations (MCP servers proxied)

MS2: ← 5 community plugins (downloaded)
     → tests/r8/plugin-tests.ts
```

### MS0: Plugin Adapter Design + Parser

#### MS0-T1: Format Analysis + Architecture (Chat)
```
TASK: MS0-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL | GATE: GATED | CALLS: 10
  LAYER: 10
  READS_FROM: [Claude Code plugin documentation (web_search)]
  WRITES_TO: [data/docs/roadmap/PLUGIN_ADAPTER_SPEC.md]
  PROVIDES: [Adapter spec → MS0-T2 parser implementation]
```
**Design:** plugin dispatcher with: ingest, list, info, execute, remove.
**Map:** plugin.json.skills→skill_load, commands→MCP tools, hooks→hook registration, mcp_servers→bridge proxy

#### MS0-T2: Parser Implementation (Code)
```
TASK: MS0-T2
  EXECUTOR: Code | sonnet | STD | GATE: GATED | CALLS: 15
  LAYER: 10
  READS_FROM: [PLUGIN_ADAPTER_SPEC.md]
  WRITES_TO: [src/engines/pluginEngine.ts, src/tools/dispatchers/pluginDispatcher.ts]
  PROVIDES: [Plugin parser → MS1 registration]
```

### MS1: Component Registration

#### MS1-T1: Skill + Command Registration
```
TASK: MS1-T1
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 10
  READS_FROM: [src/engines/pluginEngine.ts (parser output)]
  WRITES_TO: [
    src/engines/pluginEngine.ts (registerSkills, registerCommands, registerMCPServers methods)
  ]
  PROVIDES: [Skills searchable + commands callable → MS1-T2 hook wiring]
```
**Step-by-step:**
1. `registerSkills()` → load SKILL.md files into prism_skill_script index
2. `registerCommands()` → map command schemas to MCP tool definitions
3. `registerMCPServers()` → proxy nested MCP servers through prism_bridge
4. Test: ingest sample plugin → verify skills appear in skill_search, commands callable

#### MS1-T2: Hook Lifecycle Mapping
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics — hooks can be blocking gates)
  ESTIMATED_CALLS: 10
  LAYER: 10
  READS_FROM: [
    src/engines/pluginEngine.ts,
    src/tools/dispatchers/hookDispatcher.ts (existing hook registration API)
  ]
  WRITES_TO: [src/engines/pluginEngine.ts (registerHooks method)]
  PROVIDES: [Hook mapping → MS2 community testing]
```
**Step-by-step:**
1. Map Claude Code events → PRISM hooks:
   - `PreToolUse` → pre-output hooks (blocking)
   - `PostToolUse` → post-calculation hooks (non-blocking)
   - `Notification` → event emission via prism_hook→emit
2. Safety review: plugin hooks CANNOT bypass S(x) ≥ 0.70 gate ⊗
3. Test: register a hook from plugin → verify it fires on appropriate event

### MS2: Community Plugin Testing + Safety

#### MS2-T1: Test with 5 Community Plugins
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 10
  READS_FROM: [5 community plugin directories (downloaded)]
  WRITES_TO: [tests/r8/plugin-ingest-tests.ts, tests/r8/plugin-results.json]
  PROVIDES: [Plugin compatibility report → MS2-T2 security review]
```
**Step-by-step:**
1. Download 5 popular Claude Code community plugins
2. Run `prism_plugin→ingest` on each
3. For each: verify skills loaded, commands callable, hooks registered
4. Report: pass/fail per plugin, failure reasons, coverage percentage
5. SUCCESS: ≥4/5 ingest successfully

#### MS2-T2: Plugin Safety Validation
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 8
  LAYER: 10
  READS_FROM: [
    tests/r8/plugin-results.json,
    src/engines/pluginEngine.ts (registration logic)
  ]
  PROVIDES: [Security-validated plugin system → MS3 integration test]
```
**Review checklist:** ⊗
1. Can a malicious plugin.json inject unsafe blocking hooks? → Must not
2. Can plugin commands access files outside allowed scope? → Must not
3. Can nested MCP servers proxy to unauthorized endpoints? → Must not
4. Can a plugin corrupt registry data? → Must not
5. If ANY gap found → implement sandboxing before proceeding

### MS3: Integration Test

#### MS3-T1: Plugin Lifecycle E2E
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | ESTIMATED_CALLS: 6
  LAYER: 10
  READS_FROM: [src/engines/pluginEngine.ts, src/tools/dispatchers/pluginDispatcher.ts]
  WRITES_TO: [tests/r8/plugin-lifecycle.ts]
  PROVIDES: [E2E verified → MS4 gate]
```
**E2E:** ingest plugin → list (appears) → info (correct) → execute command → use skill → remove → list (gone)

### MS4: Quality Gate

#### MS4-T1: Quality Scoring
```
TASK: MS4-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70) | CALLS: 5
  LAYER: 10
  PROVIDES: [Quality scores → R9 entry criteria]
```

#### MS4-T2: Tag
```
TASK: MS4-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r8-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R8 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L10 | GATED | 10 |
| MS0-T2 | Code | sonnet | STD | L10 | GATED | 15 |
| MS1-T1 | Code | sonnet | STD | L10 | YOLO | 12 |
| MS1-T2 | Code | sonnet | STD | L10 | GATED | 10 |
| MS2-T1 | Code | sonnet | STD | L10 | YOLO | 15 |
| MS2-T2 | **Chat** | opus | NOVEL | L10 | GATED | 8 |
| MS3-T1 | Code | haiku | LIGHT | L10 | GATED | 6 |
| MS4 | Both | mixed | | L10 | GATED | 8 |
| **TOTAL** | Chat 20% / Code 80% | | | L10 | | **~84** |


---

## 15. R9: PRISM DSL — SYMBOLIC COMPRESSION (Layer 11)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L11 — Compression |
| **Goal** | Map dispatchers/actions to symbol vocabulary, 60%+ token savings |
| **Mode Split** | Code 80% / Chat 20% |
| **Estimated Sessions** | 2-3 |
| **Entry Criteria** | R8 complete (plugin surface indexed), action surface frozen |

### R9 Layer Dependencies
```
L11 DEPENDS ON:
  L10 — Plugins: Community tools indexed → more symbols to compress
  L8 — Production: No more renames/refactors to break symbol mappings
  All dispatchers frozen:
    ← 31 dispatchers, 368+ actions (stable after R8 plugin registration)
    ← Plugin-delivered actions (registered in R8)

L11 PROVIDES TO UPPER LAYERS:
  ⇒ DSL execute action            → L12 ML (compress ML pipeline calls)
  ⇒ Token savings                 → L12-L14 (more context for complex reasoning)
  ⇒ Compact notation              → L13 UI (display compact call signatures)
  ⇒ Agent-to-tool compression     → L14 digital twin (fast adaptive loop)
```

### R9 File Dependency Map
```
MS0: ← prism_knowledge→stats (enumerate all dispatchers + actions)
     → data/dsl/SYMBOL_INDEX.json (complete mapping)
     → data/dsl/DSL_SPEC.md

MS1: ← data/dsl/SYMBOL_INDEX.json
     → src/engines/dslEngine.ts (forward parser + reverse transpiler)

MS2: ← src/engines/dslEngine.ts
     → src/tools/dispatchers/dslDispatcher.ts (prism_dsl→execute)

MS3: ← tests/r2/golden-benchmarks.json (50 queries for benchmark)
     → tests/r9/token-benchmark.ts (measured compression ratios)
```

### Symbol Budget
| Range | Count | Maps To |
|-------|-------|---------|
| A-Z | 26 | Dispatchers |
| a-z | 26 | Frequent actions |
| 0-9 | 10 | Modifiers |
| Symbols | ~32 | Operators |
| Two-char | 8,836 | Full action space |

### MS0: Symbol Index Design

#### MS0-T1: Enumerate + Assign Symbols
```
TASK: MS0-T1
  DEPENDS_ON: [R8 complete]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 11
  READS_FROM: [prism_knowledge→stats output (31 dispatchers, 368+ actions)]
  WRITES_TO: [
    data/dsl/SYMBOL_INDEX.json (complete mapping, zero collisions),
    data/dsl/DSL_SPEC.md (syntax rules, operator definitions, examples)
  ]
  DATA_DEPS: [All dispatcher action registrations frozen after R8]
  PROVIDES: [Symbol index → MS1 parser, MS2 pipeline, MS4 agent optimization]
```
**Step-by-step:**
1. Enumerate all 31 dispatchers + every action via `prism_knowledge→stats`
2. Rank by usage frequency (from telemetry or estimated)
3. Assign single-char symbols to top-31 dispatchers (Σ=calc, Δ=data, Θ=thread, Ψ=safety, etc.)
4. Assign a-z to top-26 most-used actions (s=speed_feed, f=cutting_force, t=tool_life, etc.)
5. Map remaining to two-char combos: dispatcher_char + action_char (Σf=calc.cutting_force)
6. Define operators: `|`=pipe, `>`=gate, `≥`=threshold, `→`=chain, `‖`=parallel
7. Define modifiers: 0=roughing, 1=finishing, 2=semi-finish
8. Collision check: zero symbols map to two things
9. Write SYMBOL_INDEX.json + DSL_SPEC.md

### MS1: Parser + Transpiler

#### MS1-T1: Forward Parser (DSL → Dispatcher Calls)
```
TASK: MS1-T1
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 20
  LAYER: 11
  READS_FROM: [data/dsl/SYMBOL_INDEX.json, data/dsl/DSL_SPEC.md]
  WRITES_TO: [src/engines/dslEngine.ts (NEW — tokenizer, parser, AST, evaluator)]
  PROVIDES: [Forward parser → MS2 pipeline integration]
```
**Step-by-step:**
1. Tokenizer: split DSL string into symbol tokens + parameter blocks
2. Parser: tokens → AST (Abstract Syntax Tree) with operator precedence
3. Evaluator: AST → sequence of dispatcher call objects {action, params}
4. Handle: pipes (chain output→input), gates (conditional execution), parallel
5. Error handling: unknown symbol → clear error message with closest match
6. Test: `Σs{"Ti-6Al-4V","EM-12-4F",ρ}` → `prism_calc→speed_feed({material:"Ti-6Al-4V", tool:"EM-12-4F", operation:"roughing"})`

#### MS1-T2: Reverse Transpiler (Verbose → Compact)
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 11
  READS_FROM: [data/dsl/SYMBOL_INDEX.json, src/engines/dslEngine.ts]
  WRITES_TO: [src/engines/dslEngine.ts (transpile method added)]
  PROVIDES: [Reverse transpiler → MS3 benchmark (need both directions to measure)]
```
**Step-by-step:**
1. Input: verbose MCP call sequence (dispatcher, action, params)
2. Lookup: map each to shortest symbol
3. Output: compact DSL string
4. Optimize: detect pipe-able sequences and chain with `|`

### MS2: Pipeline Integration

#### MS2-T1: Wire DSL Dispatcher
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 11
  READS_FROM: [src/engines/dslEngine.ts]
  WRITES_TO: [src/tools/dispatchers/dslDispatcher.ts (NEW — prism_dsl→execute, transpile, explain)]
  PROVIDES: [prism_dsl MCP actions → MS3 benchmark, MS4 agent optimization]
```
**Actions:** `execute` (run DSL string), `transpile` (verbose→compact), `explain` (DSL→human-readable)

### MS3: Token Benchmark

#### MS3-T1: Measure Token Reduction
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 11
  READS_FROM: [
    tests/r2/golden-benchmarks.json (50 queries for real-world test),
    src/engines/dslEngine.ts (transpile method)
  ]
  WRITES_TO: [tests/r9/token-benchmark-results.json]
  PROVIDES: [Compression metrics → MS4 optimization targets]
```
**Step-by-step:**
1. Take 50 manufacturing queries from R2 benchmark suite
2. Express each as: verbose MCP call sequence + compact DSL
3. Count tokens for both (using tiktoken or approximation)
4. Compute: compression_ratio = DSL_tokens / verbose_tokens per query
5. Aggregate: mean, median, P10, P90 compression ratios
6. **SUCCESS:** median ≤ 0.40 (i.e., ≥60% token reduction)
7. **ESCALATION:** If <50% reduction → revise symbol assignments for high-frequency patterns

### MS4: Agent Pipeline Optimization

#### MS4-T1: Internal Agent DSL Adoption
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 11
  READS_FROM: [
    src/tools/dispatchers/dslDispatcher.ts,
    GSD protocol files (data/docs/gsd/),
    AutoPilot orchestration (src/engines/autopilotEngine.ts),
    ATCS state machine (src/engines/atcsEngine.ts)
  ]
  WRITES_TO: [GSD, autopilot, ATCS files where DSL saves tokens]
  PROVIDES: [Agent-level token savings → L12 ML pipeline compression, L14 adaptive loop speed]
```
**Step-by-step:**
1. Identify internal agent-to-tool communication patterns (GSD, autopilot, ATCS)
2. Where multi-tool sequences are common → replace with DSL pipe chains
3. Benchmark: before/after token usage for 10 representative agent workflows
4. Only adopt where savings > 40% AND readability maintained

### MS5: Round-Trip Fidelity Test

#### MS5-T1: Fidelity Verification
```
TASK: MS5-T1
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | ESTIMATED_CALLS: 8
  LAYER: 11
  READS_FROM: [src/engines/dslEngine.ts, tests/r2/golden-benchmarks.json]
  WRITES_TO: [tests/r9/fidelity-tests.ts]
  PROVIDES: [Fidelity verified → MS6 gate]
```
**Test:** For 50 benchmarks: verbose → DSL → verbose → execute → compare result. 100% match required.

### MS6: Quality Gate

#### MS6-T1: Quality Scoring
```
TASK: MS6-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70) | CALLS: 5
  LAYER: 11
  PROVIDES: [Quality scores → R10 entry criteria]
```

#### MS6-T2: Tag
```
TASK: MS6-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r9-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R9 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L11 | GATED | 12 |
| MS1-T1 | Code | sonnet | STD | L11 | GATED | 20 |
| MS1-T2 | Code | sonnet | STD | L11 | YOLO | 12 |
| MS2-T1 | Code | sonnet | STD | L11 | GATED | 10 |
| MS3-T1 | **Chat** | opus | NOVEL | L11 | GATED | 15 |
| MS4-T1 | Code | sonnet | STD | L11 | YOLO | 15 |
| MS5-T1 | Code | haiku | LIGHT | L11 | GATED | 8 |
| MS6 | Both | mixed | | L11 | GATED | 8 |
| **TOTAL** | Chat 20% / Code 80% | | | L11 | | **~100** |


---

## 16. R10: ML + ADAPTIVE INTELLIGENCE (Layer 12 — Learning)

### **⚠ NOW HAS REAL TRAINING DATA FROM R7 (Shop Floor + MTConnect)**

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L12 — Learning |
| **Goal** | ML wear prediction, adaptive optimizer, anomaly detection, ILP |
| **Mode Split** | Chat 55% / Code 45% |
| **Estimated Sessions** | 3 |
| **Entry Criteria** | R7 complete (real data), R3 campaigns (batch data), R9 DSL (compressed calls) |

### R10 Layer Dependencies
```
L12 DEPENDS ON:
  L9 — Data Pipeline (CRITICAL — this is why R7 moved up):
    ← src/engines/shopfloorEngine.ts      (real failure events → training labels)
    ← src/engines/integrationEngine.ts    (MTConnect → real machine signals)
    ← PFP feedback path                   (failure patterns → anomaly training)
  L5 — Campaign Data:
    ← tests/r3/campaign-results/          (17K+ validated datapoints)
  L2 — Calibrated Engines:
    ← All calibrated engines              (physics constraints for models)
  L11 — DSL:
    ← src/engines/dslEngine.ts            (compress ML pipeline calls)

L12 PROVIDES TO UPPER LAYERS:
  ⇒ Wear prediction model          → L13 UI (tool life display)
  ⇒ Adaptive parameter optimizer   → L13 UI (optimization panel)
  ⇒ Anomaly detection engine       → L13 UI (alerts dashboard)
  ⇒ ILP combination optimizer      → L13 UI (resource recommendation)
  ⇒ All ML models                  → L14 digital twin (prediction engine)
  ⇒ Trained weights                → L15 SaaS (model serving)
```

### R10 File Dependency Map
```
MS0 (Feature Engineering + Data):
  ← tests/r3/campaign-results/*.json        READ: 17K+ batch datapoints
  ← src/engines/shopfloorEngine.ts           READ: real failure/usage data from R7
  ← src/engines/integrationEngine.ts         READ: MTConnect signal data from R7
  → data/ml/training/{train,val,test}.json   WRITE: curated training data
  → data/docs/roadmap/ML_FEATURE_SPEC.md     WRITE: feature definitions

MS1 (Wear Prediction Model):
  ← data/ml/training/                        READ: training data
  ← src/engines/ManufacturingCalculations.ts   READ: Taylor equation as physics prior
  → src/engines/mlEngine.ts                  WRITE: model architecture + training pipeline
  → data/ml/models/wear-model.json           WRITE: trained weights

MS2 (Adaptive Optimizer):
  ← data/ml/training/                        READ: training data
  ← src/engines/{Safety}*.ts              READ: constraint boundaries ⊗
  → src/engines/optimizerEngine.ts           WRITE: NSGA-II/Bayesian optimizer

MS3 (Anomaly Detection):
  ← data/ml/training/                        READ: normal operating envelopes
  ← src/engines/shopfloorEngine.ts           READ: failure patterns from R7
  → src/engines/anomalyEngine.ts             WRITE: deviation scoring engine

MS4 (ILP Combination Engine):
  → src/engines/ilpEngine.ts                 WRITE: Ψ(T,R) optimizer
```

### MS0: Feature Engineering (Chat+Code, 42 calls)

#### MS0-T1: Feature Design
```
TASK: MS0-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL | GATE: GATED | CALLS: 15
  LAYER: 12
  READS_FROM: [
    tests/r3/campaign-results/*.json (batch data from R3-L5),
    src/engines/shopfloorEngine.ts (real data from R7-L9)
  ]
  WRITES_TO: [data/docs/roadmap/ML_FEATURE_SPEC.md]
  PROVIDES: [Feature matrix → MS0-T2 data curation]
```
**Features per model:**
- Wear: hardness, Vc, fz, DOC, tool geometry, coolant, accumulated time, vibration proxy
- Optimizer: target=max MRR, subject to Ra≤threshold, tool_life≥min, force≤machine_limit
- Anomaly: deviation from expected force/temp/vibration vs actual (>3σ=flag, >5σ=stop)

**Data sources (NOW AVAILABLE thanks to R7 reorder):**
- R2 benchmarks (50 validated points)
- R3 campaigns (17K+ points)
- **R7 shop floor logs** (real failure events, tool usage, machine signals)
- **R7 MTConnect streams** (real spindle load, position, temperature)
- Published handbook augmentation

#### MS0-T2: Training Data Curation
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 12
  READS_FROM: [
    tests/r3/campaign-results/*.json (R3 batch data),
    src/engines/shopfloorEngine.ts (R7 real data via API),
    src/engines/integrationEngine.ts (R7 MTConnect data via API)
  ]
  WRITES_TO: [data/ml/training/{train,val,test}.json]
  TASK_DEPS: [MS0-T1 feature spec defines what to extract]
  PROVIDES: [Curated training data → MS0-T3 pipeline, MS1-MS3 model training]
```
**Step-by-step:**
1. Extract features from R3 campaign results (17K+ datapoints)
2. Extract features from R7 shop floor logs (real failure events, tool usage)
3. Extract features from R7 MTConnect streams (spindle load, temperature)
4. Validate each datapoint: physics-consistent? Within known bounds?
5. Augment gaps with synthetic interpolation between known materials
6. Split: 70% train / 15% validate / 15% test
7. **SUCCESS:** ≥5000 validated training examples with physics-consistent labels
8. **ESCALATION:** If <2000 real datapoints → design synthetic augmentation strategy

#### MS0-T3: Data Pipeline Implementation
```
TASK: MS0-T3
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 12
  READS_FROM: [data/ml/training/*.json]
  WRITES_TO: [src/engines/mlEngine.ts (NEW — data pipeline section)]
  PROVIDES: [Programmatic data loading → MS1-MS3 model training]
```
**Step-by-step:**
1. Create `src/engines/mlEngine.ts` — data loading, normalization, validation, splitting
2. Feature normalization: min-max or z-score per feature column
3. Validation: reject datapoints with physics violations (negative force, temp > melting)
4. Test: load pipeline produces correct shapes and distributions

### MS1: Tool Wear Prediction Model

#### MS1-T1: Model Architecture Design
```
TASK: MS1-T1
  DEPENDS_ON: [MS0-T3]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 12
  READS_FROM: [
    data/docs/roadmap/ML_FEATURE_SPEC.md,
    src/engines/ManufacturingCalculations.ts (Taylor equation as physics prior)
  ]
  WRITES_TO: [data/docs/roadmap/WEAR_MODEL_SPEC.md]
  PROVIDES: [Model architecture → MS1-T2 implementation]
```
**Step-by-step:**
1. Evaluate candidates: PINN (physics-informed NN), XGBoost/LightGBM, Hybrid
2. Select based on: data size, interpretability (machinists must trust it), deployment (Node.js?)
3. Define loss: MSE + physics penalty (wear monotonically increases, T < melting)
4. Define physics prior: Taylor equation as baseline, model learns residuals

#### MS1-T2: Model Training Pipeline
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 12
  READS_FROM: [data/docs/roadmap/WEAR_MODEL_SPEC.md, data/ml/training/]
  WRITES_TO: [
    src/engines/mlEngine.ts (training section),
    data/ml/models/wear-model.json (trained weights)
  ]
  PROVIDES: [Trained model → MS1-T3 validation]
```

#### MS1-T3: Model Validation
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 12
  READS_FROM: [data/ml/training/test.json, data/ml/models/wear-model.json]
  PROVIDES: [Validated wear model → MS2 optimizer can use wear predictions]
```
**SUCCESS:** Test set MAPE ≤ 20%, zero physics violations in predictions
**ESCALATION:** If MAPE > 35% → re-examine features, augment data, try different model

### MS2: Adaptive Parameter Optimizer

#### MS2-T1: Optimizer Design
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T3]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 12
  READS_FROM: [
    src/engines/mlEngine.ts (wear model for objective),
    src/engines/{Safety}*.ts (constraint boundaries) ⊗
  ]
  WRITES_TO: [data/docs/roadmap/OPTIMIZER_SPEC.md]
  PROVIDES: [Optimizer design → MS2-T2 implementation]
```
**Problem definition:**
- Maximize: MRR (productivity)
- Subject to: Ra ≤ target, tool_life ≥ min, force ≤ machine_limit, power ≤ spindle_max
- Variables: Vc, fz, ap, ae
- Algorithm: NSGA-II for Pareto front, or Bayesian for single-objective

#### MS2-T2: Optimizer Implementation
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics validates constraint handling) ⊗
  ESTIMATED_CALLS: 18
  LAYER: 12
  READS_FROM: [data/docs/roadmap/OPTIMIZER_SPEC.md]
  WRITES_TO: [src/engines/optimizerEngine.ts (NEW)]
  PROVIDES: [Optimizer engine → MS2-T3 validation]
```

#### MS2-T3: Optimizer Validation
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 12
  READS_FROM: [src/engines/optimizerEngine.ts output for 5 test scenarios]
  PROVIDES: [Safe optimizer → L13 UI optimization panel, L14 adaptive control]
```
**SUCCESS:** All recommended parameters pass safety validation, no physics violations ⊗

### MS3: Anomaly Detection

#### MS3-T1: Anomaly Model Design
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T3]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 8
  LAYER: 12
  READS_FROM: [
    data/ml/training/ (normal operating envelopes),
    src/engines/shopfloorEngine.ts (R7 failure patterns)
  ]
  WRITES_TO: [data/docs/roadmap/ANOMALY_SPEC.md]
  PROVIDES: [Anomaly model design → MS3-T2 implementation]
```
**Step-by-step:**
1. Define normal operating envelopes per material class (from campaign data)
2. Deviation scoring: (actual - expected) / σ for force, temp, tool wear
3. Threshold: >3σ = anomaly flag, >5σ = emergency stop recommendation ⊗
4. Integration with PFP dispatcher for historical pattern matching

#### MS3-T2: Anomaly Engine Implementation
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics — anomaly detection is safety-critical) ⊗
  ESTIMATED_CALLS: 12
  LAYER: 12
  READS_FROM: [data/docs/roadmap/ANOMALY_SPEC.md]
  WRITES_TO: [src/engines/anomalyEngine.ts (NEW)]
  PROVIDES: [Anomaly engine → L13 UI alerts, L14 digital twin control response]
```

### MS4: ILP Combination Engine

#### MS4-T1: ILP Resource Optimizer
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 12
  READS_FROM: [
    src/engines/ManufacturingCalculations.ts (capability scoring),
    src/engines/{Safety}*.ts (safety scoring)
  ]
  WRITES_TO: [src/engines/ilpEngine.ts (NEW)]
  PROVIDES: [ILP optimizer → L13 UI resource recommendation]
```
**Formula:** `Ψ(T,R) = argmax[Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) × K(R) / Cost(R)]`
**Deliverables:** prism_combination_optimize, capability scoring, synergy calc, optimality proof certificates

#### MS4-T2: ILP Integration Tests
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | ESTIMATED_CALLS: 6
  LAYER: 12
  WRITES_TO: [tests/r10/ilp-tests.ts]
  PROVIDES: [Valid ILP selections for 10 manufacturing scenarios → MS5 gate]
```

### MS5: Quality Gate

#### MS5-T1: Quality Scoring
```
TASK: MS5-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70) | CALLS: 5
  LAYER: 12
  PROVIDES: [Quality scores → R11 entry criteria]
```

#### MS5-T2: Tag
```
TASK: MS5-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r10-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R10 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L12 | GATED | 15 |
| MS0-T2 | **Chat** | opus | NOVEL | L12 | GATED | 15 |
| MS0-T3 | Code | sonnet | STD | L12 | YOLO | 12 |
| MS1-T1 | **Chat** | opus | NOVEL | L12 | GATED | 12 |
| MS1-T2 | Code | sonnet | STD | L12 | YOLO | 15 |
| MS1-T3 | **Chat** | opus | NOVEL | L12 | GATED | 10 |
| MS2-T1 | **Chat** | opus | NOVEL | L12 | GATED | 12 |
| MS2-T2 | Code | sonnet | STD | L12 | GATED | 18 |
| MS2-T3 | **Chat** | opus | NOVEL | L12 | GATED | 10 |
| MS3-T1 | **Chat** | opus | NOVEL | L12 | GATED | 8 |
| MS3-T2 | Code | sonnet | STD | L12 | GATED | 12 |
| MS4-T1 | Code | sonnet | STD | L12 | YOLO | 15 |
| MS4-T2 | Code | haiku | LIGHT | L12 | GATED | 6 |
| MS5 | Both | mixed | | L12 | GATED | 8 |
| **TOTAL** | Chat 55% / Code 45% | | | L12 | | **~168** |


---

## 17. R11: UI/UX (Layer 13 — Presentation)

### **⚠ NOW HAS ML INSIGHTS FROM R10 TO DISPLAY**

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L13 — Presentation |
| **Goal** | Web dashboard: calculator, job planner, alarm decoder, ML insights, campaign monitor |
| **Mode Split** | Code 85% / Chat 15% |
| **Estimated Sessions** | 3-4 |
| **Entry Criteria** | R10 complete (ML models available for display) |

### R11 Layer Dependencies
```
L13 DEPENDS ON:
  L12 — ML Models (NOW available thanks to reorder):
    ← src/engines/mlEngine.ts              (wear prediction display)
    ← src/engines/optimizerEngine.ts       (optimization panel)
    ← src/engines/anomalyEngine.ts         (alerts dashboard)
  L9 — Data Pipeline:
    ← src/engines/obsidianEngine.ts        (knowledge vault display)
    ← src/engines/excelEngine.ts           (data export/import)
  L7 — Post Processors:
    ← src/engines/visualizationEngine.ts   (SVG toolpath display)
    ← src/engines/postProcessorEngine.ts   (G-code preview)
  L4 — Intelligence Features:
    ← src/engines/intelligenceEngine.ts    (11 actions → UI panels)
  L5 — Campaign Engine:
    ← src/engines/campaignEngine.ts        (campaign monitor)
  L0 — Data:
    ⇐ All registries (material/machine/tool selectors)

L13 PROVIDES TO UPPER LAYERS:
  ⇒ React UI components      → L14 digital twin (visualization)
  ⇒ Dashboard framework      → L15 SaaS (multi-tenant UI)
  ⇒ MCP API hooks layer      → L15 SaaS (API documentation UI)
```

### R11 File Dependency Map
```
MS0: → src/ui/ (NEW directory)
     → src/ui/components/ (design system)
     → src/ui/api/ (MCP API integration hooks)

MS1 (Calculator — Agent Team):
  ← src/engines/ManufacturingCalculations.ts    (speed/feed calcs)
  ← src/engines/{Safety}*.ts               (safety indicators)
  → src/ui/pages/calculator/ (input, results, charts panels)

MS2 (Feature Pages — Agent Team):
  ← src/engines/intelligenceEngine.ts         (job_plan, what_if)
  ← src/engines/mlEngine.ts                   (wear prediction, optimizer)
  ← src/engines/anomalyEngine.ts              (anomaly alerts)
  → src/ui/pages/{job-planner,alarm-decoder,what-if}/

MS3 (Dashboard):
  ← src/engines/campaignEngine.ts             (campaign status)
  ← src/engines/integrationEngine.ts          (MTConnect health)
  → src/ui/pages/dashboard/
```

### MS0: Design System + Scaffold

#### MS0-T1: Technology Selection + Architecture
```
TASK: MS0-T1
  DEPENDS_ON: [R10 complete]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 13
  READS_FROM: [
    src/tools/dispatchers/ (all 31 dispatchers — enumerate callable actions for UI),
    src/engines/intelligenceEngine.ts (11 actions → page requirements),
    src/engines/mlEngine.ts (wear prediction → display format),
    src/engines/anomalyEngine.ts (alert format)
  ]
  WRITES_TO: [data/docs/roadmap/UI_ARCHITECTURE.md]
  PROVIDES: [UI architecture → MS0-T2 scaffold, all MS1-MS3 page implementation]
```
**Step-by-step:**
1. Stack: React 18 + Tailwind CSS + shadcn/ui (matches Claude artifacts)
2. State: React Query for MCP API calls, zustand for client state
3. Routing: React Router — /calculator, /job-planner, /alarm-decoder, /dashboard, /what-if
4. Design tokens: manufacturing color palette, data-dense information hierarchy
5. MCP API layer: typed hooks for every dispatcher action used by UI
6. Responsive: desktop-first (shop floor monitors), tablet-compatible

#### MS0-T2: Scaffold + Design System Implementation
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 20
  LAYER: 13
  READS_FROM: [data/docs/roadmap/UI_ARCHITECTURE.md]
  WRITES_TO: [
    src/ui/package.json (NEW — React project),
    src/ui/src/App.tsx (router + layout),
    src/ui/src/components/ui/ (shadcn primitives: Button, Card, Input, Select, Table, Alert),
    src/ui/src/components/layout/ (Header, Sidebar, PageContainer),
    src/ui/src/hooks/usePrism.ts (MCP API integration hooks),
    src/ui/src/lib/api.ts (typed MCP call wrapper)
  ]
  PROVIDES: [Scaffold + design system → MS1-MS3 page construction]
```
**Step-by-step:**
1. `npx create-react-app` or Vite scaffold in `src/ui/`
2. Install: tailwindcss, shadcn/ui, react-query, zustand, recharts, react-router
3. Create design system: 8 shadcn primitives + 3 layout components
4. Create `usePrism` hook: generic MCP dispatcher call with loading/error/data states
5. Create typed wrappers: `useSpeedFeed()`, `useCuttingForce()`, `useAlarmDecode()`, etc.
6. Stub all 5 pages with placeholder content

#### MS0-T3: MCP API Hook Layer
```
TASK: MS0-T3
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 13
  READS_FROM: [
    src/tools/dispatchers/calcDispatcher.ts (action schemas),
    src/tools/dispatchers/dataDispatcher.ts (material/machine/tool search schemas),
    src/engines/mlEngine.ts (prediction input/output schemas),
    src/engines/anomalyEngine.ts (alert schema)
  ]
  WRITES_TO: [
    src/ui/src/hooks/useCalc.ts (speed_feed, cutting_force, tool_life, etc.),
    src/ui/src/hooks/useData.ts (material_search, machine_search, tool_search),
    src/ui/src/hooks/useML.ts (wear_predict, optimize, anomaly_check),
    src/ui/src/hooks/useSafety.ts (safety_check, alarm_decode)
  ]
  PROVIDES: [Typed API hooks → MS1-MS3 data binding]
```

### MS1: Calculator Page (Agent Team)

```
TEAM: r11-calculator
  input-panel:   sonnet | Material/tool/machine selectors + parameter inputs
  results-panel: sonnet | Calculated values display with safety indicators
  chart-panel:   sonnet | Recharts visualizations (force vs speed, tool life curves)
```

#### MS1-T1a: Input Panel
```
TASK: MS1-T1a
  DEPENDS_ON: [MS0-T3]
  EXECUTOR: Code (team) | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 13
  READS_FROM: [src/ui/src/hooks/useData.ts (material/machine/tool search)]
  WRITES_TO: [src/ui/src/pages/calculator/InputPanel.tsx]
  PROVIDES: [Material+tool+machine selection → results-panel + chart-panel]
```
**Components:** MaterialSelector (search+autocomplete from 3518 materials), ToolSelector (geometry params),
MachineSelector (spindle specs), OperationSelector (roughing/finishing/semi), ParameterOverrides (manual Vc/fz)

#### MS1-T1b: Results Panel
```
TASK: MS1-T1b
  DEPENDS_ON: [MS0-T3]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 13
  READS_FROM: [src/ui/src/hooks/useCalc.ts (all calculation results)]
  WRITES_TO: [src/ui/src/pages/calculator/ResultsPanel.tsx]
  PROVIDES: [Formatted results display → E2E test]
```
**Displays:** Speed/Feed (Vc, n, fz, vf), Forces (Fc, Ft, P), Tool Life (T min, wear curve),
MRR (cm³/min), Surface Finish (Ra µm), Safety Score with color indicator (🟢🟡🔴)

#### MS1-T1c: Chart Panel
```
TASK: MS1-T1c
  DEPENDS_ON: [MS0-T3]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 13
  READS_FROM: [src/ui/src/hooks/useCalc.ts]
  WRITES_TO: [src/ui/src/pages/calculator/ChartPanel.tsx]
  PROVIDES: [Interactive charts → E2E test]
```
**Charts (Recharts):** Force vs Speed curve, Tool Life vs Speed (Taylor), Power envelope vs machine limit,
What-if slider (±20% parameter sweep with live recalculation)

### MS2: Feature Pages (Agent Team)

```
TEAM: r11-features
  job-planner:    sonnet | Job plan creation + setup sheet display
  alarm-decoder:  sonnet | Alarm code input + fix procedure display
  what-if:        sonnet | Parameter sweep with live diff display
```

#### MS2-T1a: Job Planner Page
```
TASK: MS2-T1a
  DEPENDS_ON: [MS1-T1a-c]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 20
  LAYER: 13
  READS_FROM: [
    src/ui/src/hooks/useCalc.ts (intelligence actions: job_plan, setup_sheet, process_cost),
    src/ui/src/hooks/useData.ts (material/machine/tool search)
  ]
  WRITES_TO: [src/ui/src/pages/job-planner/]
  PROVIDES: [Job planner UI → E2E test]
```
**Pages:** PartInput (geometry, material, tolerances) → OperationSequence (auto-generated) →
SetupSheet (workholding, tools, datums) → CostBreakdown (machine time, tool cost, overhead)

#### MS2-T1b: Alarm Decoder Page
```
TASK: MS2-T1b
  DEPENDS_ON: [MS1-T1a-c]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 20
  LAYER: 13
  READS_FROM: [src/ui/src/hooks/useSafety.ts (alarm_decode, alarm_search, alarm_fix)]
  WRITES_TO: [src/ui/src/pages/alarm-decoder/]
  DATA_DEPS: [AlarmRegistry (9200+ codes across 12 controller families)]
  PROVIDES: [Alarm decoder UI → E2E test]
```
**Flow:** Select controller family → Enter alarm code → Display: description, severity, root causes,
fix procedure (step-by-step), related alarms, machine-specific notes

#### MS2-T1c: What-If Analysis Page
```
TASK: MS2-T1c
  DEPENDS_ON: [MS1-T1a-c]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 20
  LAYER: 13
  READS_FROM: [src/ui/src/hooks/useCalc.ts (what_if action)]
  WRITES_TO: [src/ui/src/pages/what-if/]
  PROVIDES: [What-if UI → E2E test]
```
**Flow:** Load current params → Slider: "What if I increase Vc by X%?" → Live diff: Δforce, Δtool_life,
Δsurface_finish, Δsafety_score. Side-by-side comparison table.

### MS3: Dashboard

#### MS3-T1: Dashboard Layout + Widgets
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T1a-c]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 20
  LAYER: 13
  READS_FROM: [
    src/ui/src/hooks/useML.ts (wear prediction, optimizer, anomaly),
    src/ui/src/hooks/useCalc.ts (campaign status),
    src/engines/integrationEngine.ts (MTConnect health via API)
  ]
  WRITES_TO: [src/ui/src/pages/dashboard/]
  PROVIDES: [Dashboard → MS3-T2 review]
```
**Widgets:** System Health (31 dispatchers), Campaign Monitor (batch progress), Material Coverage (% enriched),
ML Insights (wear predictions, optimization suggestions), Anomaly Alerts (live feed with severity),
MTConnect Status (connected machines, data freshness)

#### MS3-T2: Dashboard Review
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 13
  READS_FROM: [src/ui/src/pages/dashboard/ (component review)]
  PROVIDES: [Reviewed dashboard → MS4 E2E test]
```
**Review:** Information hierarchy, data density, actionable insights visible, alert prominence, no clutter

### MS4: E2E Test

#### MS4-T1: Full User Flow Test
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 13
  READS_FROM: [entire src/ui/ directory]
  WRITES_TO: [tests/r11/ui-e2e.ts]
  PROVIDES: [E2E verified → MS5 gate]
```
**E2E flow:** Open calculator → select 4140 steel → select endmill → select Haas VF-2 →
calculate → view results + charts → check safety score → switch to job planner →
generate plan → view setup sheet → check cost → switch to dashboard → view alerts →
decode alarm → run what-if → export results

### MS5: Quality Gate

#### MS5-T1: Quality Scoring
```
TASK: MS5-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70) | CALLS: 5
  LAYER: 13
  PROVIDES: [Quality scores → R12 entry criteria]
```

#### MS5-T2: Tag
```
TASK: MS5-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r11-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R11 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L13 | GATED | 10 |
| MS0-T2 | Code | sonnet | STD | L13 | YOLO | 20 |
| MS0-T3 | Code | sonnet | STD | L13 | YOLO | 15 |
| MS1-T1a | Code team | sonnet | STD | L13 | YOLO | 15 |
| MS1-T1b | Code team | sonnet | STD | L13 | YOLO | 15 |
| MS1-T1c | Code team | sonnet | STD | L13 | YOLO | 15 |
| MS2-T1a | Code team | sonnet | STD | L13 | YOLO | 20 |
| MS2-T1b | Code team | sonnet | STD | L13 | YOLO | 20 |
| MS2-T1c | Code team | sonnet | STD | L13 | YOLO | 20 |
| MS3-T1 | Code | sonnet | STD | L13 | YOLO | 20 |
| MS3-T2 | **Chat** | opus | STD | L13 | GATED | 10 |
| MS4-T1 | Code | sonnet | STD | L13 | GATED | 12 |
| MS5 | Both | mixed | | L13 | GATED | 8 |
| **TOTAL** | Chat 15% / Code 85% | | | L13 | | **~200** |


---

## 18. R12: DIGITAL TWIN + ADAPTIVE CONTROL (Layer 14 — Simulation)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L14 — Simulation |
| **Goal** | Digital twin, real-time adaptive control, closed-loop optimization |
| **Mode Split** | Chat 60% / Code 40% |
| **Estimated Sessions** | 4-5 |
| **Entry Criteria** | R7 (real-time data), R10 (ML models), R5 (G-code gen) |

### R12 Layer Dependencies
```
L14 DEPENDS ON:
  L12 — ML Models:
    ← src/engines/mlEngine.ts              (wear prediction → twin state)
    ← src/engines/optimizerEngine.ts       (parameter optimization loop)
    ← src/engines/anomalyEngine.ts         (anomaly trigger → control response)
  L9 — Real-Time Data:
    ← src/engines/integrationEngine.ts     (MTConnect live stream) ⊗
    ← src/engines/shopfloorEngine.ts       (failure events)
  L7 — G-code:
    ← src/engines/postProcessorEngine.ts   (generate adapted G-code) ⊗
  L2 — Calibrated Physics:
    ← All calibrated engines               (twin simulation models)

L14 PROVIDES TO UPPER LAYERS:
  ⇒ Digital twin engine          → L15 SaaS (premium feature)
  ⇒ Adaptive control loop        → L15 SaaS (premium feature)
  ⇒ Real-time visualization      → L13 UI (twin display panel)
```

### R12 File Dependency Map
```
MS0: → design doc (twin state model, physics resolution, update frequency)
MS1: → src/engines/twinEngine.ts (state simulation: position, spindle, wear, thermal)
     ← src/engines/ManufacturingCalculations.ts (force model)
     ← src/engines/AdvancedCalculations.ts (thermal model)
MS2: → src/engines/controllerEngine.ts (PID/MPC feed rate adaptation) ⊗
     ← src/engines/{Safety}*.ts (constraint boundaries) ⊗
MS3: ← src/engines/integrationEngine.ts (MTConnect live data)
     → integration pipeline (twin + controller + MTConnect + safety)
```

### MS0: Twin Architecture Design

#### MS0-T1: State Model Design
```
TASK: MS0-T1
  DEPENDS_ON: [R11 complete]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 14
  READS_FROM: [
    src/engines/ManufacturingCalculations.ts (force model for simulation),
    src/engines/AdvancedCalculations.ts (thermal model for simulation),
    src/engines/mlEngine.ts (wear prediction for simulation),
    src/engines/integrationEngine.ts (MTConnect data format → state mapping)
  ]
  WRITES_TO: [data/docs/roadmap/TWIN_ARCHITECTURE.md]
  PROVIDES: [Twin state model → MS0-T2 resolution + MS1 simulation]
```
**Step-by-step:**
1. Define twin state vector: [position(xyz), spindle_load, tool_wear, T_tool, T_workpiece, coolant_flow, vibration]
2. Map each state variable to physics engine: force→manufacturingCalc, thermal→advancedCalc, wear→mlEngine
3. Define update equations: state(t+dt) = f(state(t), G-code_command(t), material, tool)
4. Specify accuracy targets: force ±10%, temp ±15%, wear ±20%
5. Define MTConnect → twin state mapping (which signals update which states)

#### MS0-T2: Resolution + Timing Architecture
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 8
  LAYER: 14
  READS_FROM: [data/docs/roadmap/TWIN_ARCHITECTURE.md]
  WRITES_TO: [data/docs/roadmap/TWIN_ARCHITECTURE.md (timing section appended)]
  PROVIDES: [Timing spec → MS1 simulation loop, MS3 closed-loop integration]
```
**Decisions:**
1. Physics resolution: lumped-parameter (not FEA — too slow for real-time)
2. Update frequency: 10Hz minimum (match MTConnect ~100ms sample rate)
3. Prediction horizon: 5 seconds ahead (warn before problems)
4. Fallback: if MTConnect disconnects → switch to pure simulation using G-code replay

### MS1: Twin Simulation Engine

#### MS1-T1: Core State Simulation
```
TASK: MS1-T1
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics reviews physics coupling) ⊗
  ESTIMATED_CALLS: 25
  LAYER: 14
  READS_FROM: [
    data/docs/roadmap/TWIN_ARCHITECTURE.md,
    src/engines/ManufacturingCalculations.ts (Fc(Vc, fz, ap, ae, material)),
    src/engines/AdvancedCalculations.ts (T_tool(Fc, Vc, coolant)),
    src/engines/mlEngine.ts (wear(time, Fc, T, material, tool))
  ]
  WRITES_TO: [src/engines/twinEngine.ts (NEW — core simulation)]
  PROVIDES: [State simulator → MS1-T2 MTConnect sync, MS2 controller]
```
**Step-by-step:**
1. Create `src/engines/twinEngine.ts`
2. `initTwin(machine, tool, material, workpiece)` → initial state vector
3. `stepTwin(state, gcode_block, dt)` → next state (from G-code prediction)
4. `updateTwin(state, mtconnect_data)` → corrected state (from real data)
5. State variables: position_xyz, spindle_rpm, feed_rate, cutting_force, tool_temp, workpiece_temp, wear_vb
6. Each step: re-run relevant physics engine for current conditions
7. Build + test: 10 cutting scenario simulations vs known reference data

#### MS1-T2: MTConnect State Synchronization
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 14
  READS_FROM: [
    src/engines/twinEngine.ts,
    src/engines/integrationEngine.ts (MTConnect adapter from R7)
  ]
  WRITES_TO: [src/engines/twinEngine.ts (sync section added)]
  PROVIDES: [Synced twin → MS2 controller has accurate state for adaptation]
```
**Step-by-step:**
1. Subscribe to MTConnect stream (spindle_load, position, temperature, alarm events)
2. On each sample: `updateTwin(predicted_state, actual_data)` with Kalman-like correction
3. Deviation tracking: |predicted - actual| per state variable
4. If deviation > threshold → flag model drift, log for ML retraining

#### MS1-T3: Twin Validation Against Reference Data
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 20
  LAYER: 14
  READS_FROM: [src/engines/twinEngine.ts output vs reference cutting data]
  DATA_DEPS: [MaterialRegistry (5 test materials), MachineRegistry (3 test machines)]
  PROVIDES: [Validated twin simulation → MS2 controller design can trust state]
```
**SUCCESS:** ≥80% of state variables within accuracy targets for 15 test scenarios
**ESCALATION:** If <60% → re-examine physics coupling, check MTConnect mapping

### MS2: Adaptive Control Engine

#### MS2-T1: Control Strategy Design
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T3]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 14
  READS_FROM: [
    src/engines/twinEngine.ts (state available for control),
    src/engines/{Safety}*.ts (constraint boundaries) ⊗,
    src/engines/optimizerEngine.ts (objective functions from R10)
  ]
  WRITES_TO: [data/docs/roadmap/CONTROLLER_SPEC.md]
  PROVIDES: [Control spec → MS2-T2 implementation]
```
**Step-by-step:** ⊗ SAFETY CRITICAL
1. Control variable: feed rate override (0-150%)
2. Measured: force deviation, temperature deviation, vibration proxy
3. Control law: PID for single-objective (force regulation) OR
   MPC for multi-objective (force + temp + wear → feed rate + speed override)
4. Safety limits: HARD STOP if force > 120% machine limit, temp > material melting
5. Ramp rates: no more than 10% feed change per 100ms (prevent shock loads)
6. Fallback: if controller diverges → revert to original G-code parameters immediately

#### MS2-T2: Controller Implementation
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics reviews every control law) ⊗
  ESTIMATED_CALLS: 20
  LAYER: 14
  READS_FROM: [data/docs/roadmap/CONTROLLER_SPEC.md]
  WRITES_TO: [src/engines/controllerEngine.ts (NEW) ⊗]
  PROVIDES: [Controller engine → MS2-T3 safety validation]
```

#### MS2-T3: Controller Safety Validation
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 10
  LAYER: 14
  READS_FROM: [src/engines/controllerEngine.ts]
  PROVIDES: [Safety-validated controller → MS3 closed-loop integration]
```
**Test scenarios:** ⊗
1. Sudden hard spot in material → controller reduces feed → no tool break
2. Coolant failure → temperature spike → controller reduces speed → safe stop
3. Tool wear approaching limit → controller reduces aggressiveness → extend life
4. Vibration onset → controller adjusts → chatter suppressed
5. Controller failure → fallback to original params → safe operation

### MS3: Closed-Loop Integration

#### MS3-T1: Pipeline Wiring
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T3]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-physics reviews full loop) ⊗
  ESTIMATED_CALLS: 15
  LAYER: 14
  READS_FROM: [
    src/engines/twinEngine.ts,
    src/engines/controllerEngine.ts,
    src/engines/integrationEngine.ts,
    src/engines/{Safety}*.ts
  ]
  WRITES_TO: [src/engines/twinEngine.ts (closed-loop wiring)]
  PROVIDES: [Closed loop → MS3-T2 integration test]
```
**Pipeline:** MTConnect → twin state update → anomaly check → controller decision → feed override command → safety gate → execute (or block)

#### MS3-T2: Integration Test
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 14
  WRITES_TO: [tests/r12/closed-loop-test.ts]
  PROVIDES: [Verified closed loop → MS4 stress test]
```

### MS4: Stress Test

#### MS4-T1: Long Duration + Edge Case Stress
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 14
  WRITES_TO: [tests/r12/stress-test.ts, tests/r12/stress-results.json]
  PROVIDES: [Stress tested → MS4-T2 review]
```
**Tests:** 1-hour simulated machining run, 100 simulated alarm events, MTConnect disconnect/reconnect,
controller oscillation detection, memory leak check over extended operation

#### MS4-T2: Stress Results Review
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 5
  LAYER: 14
  READS_FROM: [tests/r12/stress-results.json]
  PROVIDES: [Reviewed stress results → MS5 gate]
```

### MS5: Quality Gate

#### MS5-T1: Quality Scoring
```
TASK: MS5-T1
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70) | CALLS: 5
  LAYER: 14
  PROVIDES: [Quality scores → R13 entry criteria]
```

#### MS5-T2: Tag
```
TASK: MS5-T2
  EXECUTOR: Code | MODEL: haiku | EFFORT: LIGHT | CALLS: 3
  WRITES_TO: [git tag r12-complete, data/docs/roadmap/CURRENT_POSITION.md]
```

### R12 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L14 | GATED | 12 |
| MS0-T2 | **Chat** | opus | NOVEL | L14 | GATED | 8 |
| MS1-T1 | Code | sonnet | STD | L14 | GATED | 25 |
| MS1-T2 | Code | sonnet | STD | L14 | GATED | 15 |
| MS1-T3 | **Chat** | opus | NOVEL | L14 | GATED | 20 |
| MS2-T1 | **Chat** | opus | NOVEL | L14 | GATED | 15 |
| MS2-T2 | Code | sonnet | STD | L14 | GATED | 20 |
| MS2-T3 | **Chat** | opus | NOVEL | L14 | GATED | 10 |
| MS3-T1 | Code | sonnet | STD | L14 | GATED | 15 |
| MS3-T2 | Code | sonnet | STD | L14 | GATED | 15 |
| MS4-T1 | Code | sonnet | STD | L14 | GATED | 15 |
| MS4-T2 | **Chat** | opus | NOVEL | L14 | GATED | 5 |
| MS5 | Both | mixed | | L14 | GATED | 8 |
| **TOTAL** | Chat 60% / Code 40% | | | L14 | | **~183** |


---

## 19. R13: SaaS PLATFORM (Layer 15 — Product)

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L15 — Product |
| **Goal** | Multi-tenant SaaS: auth, billing, onboarding, API keys, docs |
| **Mode Split** | Code 85% / Chat 15% |
| **Estimated Sessions** | 2-3 |
| **Entry Criteria** | R12 complete, full platform operational |

### R13 Layer Dependencies
```
L15 DEPENDS ON:
  EVERYTHING below. This is the top of the stack.
  L14 — Digital twin (premium feature tier)
  L13 — UI (user-facing dashboard)
  L12 — ML (intelligent features)
  L11 — DSL (efficient API calls)
  L10 — Plugins (marketplace)
  L9 — Data pipeline (customer data ingestion)
  L8 — Infrastructure (container, CI/CD, monitoring)
  L7 — G-code (post processor product)
  L6 — Enterprise (tenant isolation, compliance)
  L4-L5 — Features (intelligence actions, campaigns)
  L2 — Calibrated engines (calculation accuracy)
  L0 — Data (material/machine/tool registries)

L15 PROVIDES:
  ⇒ Revenue. This is the product.
```

### Product Lines
1. **Speed & Feed Calculator** — R11 UI + R2 calibrated engines
2. **Post Processor Generator** — R5 post processors + R11 UI
3. **Shop Manager / Quoting** — R3 intelligence (job_plan, process_cost) + R11 UI
4. **Auto CNC Programmer** — R5 G-code + R12 adaptive control + R11 UI
5. **PRISM API** — R4 bridge + R6 production for developers

### R13 File Dependency Map
```
MS0: → src/platform/authEngine.ts (JWT, registration, roles, password reset)
MS1 (Agent Team):
  → src/platform/billingEngine.ts (Stripe, plans, usage tracking)
  → src/platform/onboardEngine.ts (workspace setup, sample data)
  → src/platform/docsEngine.ts (API docs, user guides, tutorials)
MS2: → packaging (product tier definitions, feature gating)
```

### MS0: Authentication + Authorization

#### MS0-T1: Auth Architecture Design
```
TASK: MS0-T1
  DEPENDS_ON: [R12 complete]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 8
  LAYER: 15
  READS_FROM: [
    src/engines/MultiTenantEngine.ts (existing tenant isolation from R4),
    src/engines/ProtocolBridgeEngine.ts (existing API gateway from R4)
  ]
  WRITES_TO: [data/docs/roadmap/AUTH_SPEC.md]
  PROVIDES: [Auth architecture → MS0-T2 implementation]
```
**Step-by-step:**
1. JWT-based authentication with refresh tokens
2. Role hierarchy: admin → engineer → operator → viewer
3. Scope-based authorization: which roles can access which dispatchers
4. Registration flow: email verify → workspace creation → tenant provisioning
5. Password reset flow: email token → new password → invalidate old sessions
6. SSO preparation: SAML/OIDC stubs for enterprise customers

#### MS0-T2: Auth Engine Implementation
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (security review) ⊗ | ESTIMATED_CALLS: 12
  LAYER: 15
  READS_FROM: [data/docs/roadmap/AUTH_SPEC.md]
  WRITES_TO: [src/platform/authEngine.ts (NEW — JWT, roles, registration, password reset)]
  PROVIDES: [Auth engine → MS1 billing (user identity), MS2 packaging (role gating)]
```

### MS1: Billing + Onboarding + Docs (Agent Team)

```
TEAM: r13-platform
  billing-writer:  sonnet | Stripe integration, plan management, usage tracking
  onboard-writer:  sonnet | Workspace setup, sample data, guided tour
  docs-writer:     sonnet | API docs, user guides, tutorials
```

#### MS1-T1a: Billing Engine
```
TASK: MS1-T1a
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: GATED | ESTIMATED_CALLS: 20
  LAYER: 15
  READS_FROM: [src/platform/authEngine.ts (user identity for billing)]
  WRITES_TO: [src/platform/billingEngine.ts (NEW)]
  PROVIDES: [Billing engine → MS2 feature gating per plan]
```
**Step-by-step:**
1. Stripe integration: customer creation, subscription management, webhook handlers
2. Plan definitions: Free (10 calcs/day), Pro ($29/mo, unlimited calcs + job plans),
   Enterprise ($199/mo, all features + API + digital twin)
3. Usage tracking: per-tenant calc count, API calls, campaign runs
4. Billing portal: upgrade/downgrade, payment history, invoices
5. Grace period: 7 days past due before suspension

#### MS1-T1b: Onboarding Engine
```
TASK: MS1-T1b
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 20
  LAYER: 15
  READS_FROM: [
    src/platform/authEngine.ts (new user trigger),
    src/engines/intelligenceEngine.ts (sample job_plan for demo)
  ]
  WRITES_TO: [src/platform/onboardEngine.ts (NEW)]
  PROVIDES: [Onboarding flow → user activation + first value]
```
**Step-by-step:**
1. Workspace creation: tenant provisioned, default settings
2. Sample data: 10 common materials, 5 common tools, 2 common machines pre-loaded
3. Guided tour: 5-step walkthrough (calculator → job planner → alarm decoder → dashboard → what-if)
4. First-value moment: auto-run a sample calculation so user sees results immediately
5. Progress tracking: onboarding completion percentage

#### MS1-T1c: Documentation Engine
```
TASK: MS1-T1c
  DEPENDS_ON: [MS0-T2]
  EXECUTOR: Code (team) | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO | ESTIMATED_CALLS: 20
  LAYER: 15
  READS_FROM: [
    src/tools/dispatchers/ (all 31 dispatchers — API schemas),
    src/engines/ (all engines — feature descriptions)
  ]
  WRITES_TO: [src/platform/docsEngine.ts (NEW)]
  PROVIDES: [Documentation → developer adoption, support reduction]
```
**Step-by-step:**
1. API reference: auto-generated from dispatcher action schemas (OpenAPI format)
2. User guides: calculator, job planner, alarm decoder, what-if (markdown + screenshots)
3. Tutorials: "Your first speed/feed calc", "Setting up a machining campaign", "Connecting MTConnect"
4. Developer guide: MCP integration, plugin development, DSL reference
5. FAQ: top 20 questions from beta testing (placeholder → populate from real usage)

### MS2: Product Packaging + Feature Gating

#### MS2-T1: Tier Definition + Gating Implementation
```
TASK: MS2-T1
  DEPENDS_ON: [MS1-T1a]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 15
  READS_FROM: [
    src/platform/billingEngine.ts (plan definitions),
    src/platform/authEngine.ts (role system)
  ]
  WRITES_TO: [
    src/platform/gatingEngine.ts (NEW — feature gates per plan+role),
    src/ui/src/hooks/useGating.ts (UI-side feature visibility)
  ]
  PROVIDES: [Feature gates → MS3 product review]
```
**Product tier matrix:**
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Speed & Feed Calculator | ✅ (10/day) | ✅ unlimited | ✅ unlimited |
| Job Planner | ❌ | ✅ | ✅ |
| Alarm Decoder | ✅ (5/day) | ✅ unlimited | ✅ unlimited |
| Campaigns | ❌ | ✅ (100 materials) | ✅ unlimited |
| ML Predictions | ❌ | ❌ | ✅ |
| Digital Twin | ❌ | ❌ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| Plugin Marketplace | ❌ | ✅ | ✅ |
| MTConnect | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

### MS3: Product Review

#### MS3-T1: Full Product Walkthrough
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 12
  LAYER: 15
  READS_FROM: [entire platform — end-to-end review]
  PROVIDES: [Product review → MS4 gate]
```
**Review checklist:**
1. Registration → onboarding → first calculation (< 3 minutes to value?)
2. Free tier: useful enough to convert? Limited enough to upsell?
3. Pro tier: solves daily machinist workflow? Job planner is killer feature?
4. Enterprise tier: digital twin + ML justifies $199/mo? API access for integration?
5. Billing: upgrade/downgrade works? Invoices correct? Grace period functional?
6. Docs: can a new user self-serve? Can a developer integrate without support?
7. Security: JWT secure? Role escalation impossible? Tenant isolation verified?
8. Performance: SaaS adds < 50ms latency over raw MCP calls?

### MS4: Quality Gate

#### MS4-T1: Final Quality Scoring
```
TASK: MS4-T1
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70, all product tiers functional)
  ESTIMATED_CALLS: 5
  LAYER: 15
  PROVIDES: [PRISM v1.0 release certification]
```

#### MS4-T2: Tag v1.0
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  WRITES_TO: [git tag v1.0.0, data/docs/roadmap/CURRENT_POSITION.md → "RELEASED"]
```

### R13 Summary
| Task | Executor | Model | Effort | Layer | Gate | Calls |
|------|----------|-------|--------|-------|------|-------|
| MS0-T1 | **Chat** | opus | NOVEL | L15 | GATED | 8 |
| MS0-T2 | Code | sonnet | STD | L15 | GATED | 12 |
| MS1-T1a | Code team | sonnet | STD | L15 | GATED | 20 |
| MS1-T1b | Code team | sonnet | STD | L15 | YOLO | 20 |
| MS1-T1c | Code team | sonnet | STD | L15 | YOLO | 20 |
| MS2-T1 | Code | sonnet | STD | L15 | YOLO | 15 |
| MS3-T1 | **Chat** | opus | NOVEL | L15 | GATED | 12 |
| MS4-T1 | **Chat** | opus | NOVEL | L15 | GATED | 5 |
| MS4-T2 | Code | haiku | LIGHT | L15 | YOLO | 3 |
| **TOTAL** | Chat 15% / Code 85% | | | L15 | | **~115** |


---

## 20. RECOVERY & CONTINUITY PROTOCOL

### 20.1 Session Recovery
1. Read `CURRENT_POSITION.md` → current phase/milestone/task
2. Read `ACTION_TRACKER.md` → done/pending
3. Read this roadmap's phase section → task DAG, dependencies, gates
4. **Check READS_FROM/DATA_DEPS** — verify all inputs exist before resuming
5. Resume first incomplete task in DAG

### 20.2 Code → Chat Handoff (SWITCH_SIGNAL.md)
```
REASON: [why Chat needed]
PHASE: R2 | MILESTONE: MS2 | TASK: T1
LAYER: 2
CONTEXT: [what Code tried, what failed]
FILES_MODIFIED: [list]
BENCHMARK_SCORES: [current pass rate]
MISSING_DEPS: [any READS_FROM items that don't exist]
```

### 20.3 Chat → Code Handoff (CHAT_RESOLUTION.md)
```
RESOLVED: [what was fixed/decided]
FILES_MODIFIED: [list]
NEW_BENCHMARK_SCORES: [updated pass rate]
NEXT_TASK: [what Code should do next]
NEW_PROVIDES: [what downstream tasks can now start]
```

### 20.4 Compaction Recovery
Read transcript → CURRENT_POSITION.md → this roadmap → resume

### 20.5 Failed Gate Recovery
1. Identify failed metric
2. Check gate's ESCALATION field
3. If "Chat reviews" → SWITCH_SIGNAL.md
4. If "retry" → fix + re-run (max 3)
5. If 3 retries fail → plan extension

### 20.6 Layer Dependency Violation
If a task's READS_FROM file doesn't exist:
1. STOP — do not proceed
2. Trace: which lower-layer task should have produced this file?
3. Is that task complete? If no → complete it first
4. If yes but file missing → investigate (accidental deletion? wrong path?)


---

## 21. APPENDIX: FILE LOCATIONS & SETUP

### Key Files
| File | Purpose |
|------|---------|
| `data/docs/roadmap/PRISM_ROADMAP_v18.1.md` | THIS FILE — authoritative roadmap |
| `data/docs/roadmap/CURRENT_POSITION.md` | Current phase/milestone/task |
| `data/docs/roadmap/ACTION_TRACKER.md` | Completed/pending actions |
| `data/docs/roadmap/SWITCH_SIGNAL.md` | Code→Chat handoff signal |
| `data/docs/roadmap/CHAT_RESOLUTION.md` | Chat→Code resolution |

### Build Commands
```bash
npm run build          # Full build (tsc --noEmit + esbuild + test:critical)
# NEVER: standalone tsc (OOM)
# After build: gsd_sync auto-fires → restart Claude Desktop for MCP updates
```

### Benchmark Commands
```bash
npx tsx tests/r2/run-benchmarks.ts                    # Full suite
npx tsx tests/r2/run-benchmarks.ts --filter B001,B002 # Specific
```

### Quality Gate Commands (MCP)
```
prism_omega→compute           # Ω ≥ 0.70
prism_validate→safety         # S(x) ≥ 0.70
prism_ralph→loop              # Ralph validation
prism_validate→anti_regression # Before file replacement
```

### Deprecated (merged into v18.1)
| File | Status |
|------|--------|
| PRISM_ROADMAP_v18.0.md | SUPERSEDED by v18.1 (reordered) |
| PRISM_ROADMAP_v17.0.md | SUPERSEDED |
| PRIORITY_ROADMAP.md | MERGED into R3 (P3), R7 (P4) |
| PHASE_R3_CAMPAIGNS.md | MERGED into R3 |


---

## 22. MASTER SUMMARY

### Phase Overview (Bottom-Up Order)
| Phase | Layer | Name | Chat% | Code% | Sessions | Calls | Teams |
|-------|-------|------|-------|-------|----------|-------|-------|
| **R2** | L2 | Engine Calibration | **60%** | 40% | 3-4 | 175-210 | — |
| **R3** | L3-L5 | Intelligence + Campaigns | 35% | **65%** | 3-4 | 305-340 | material(4) |
| **R4** | L6 | Enterprise Hardening | 25% | **75%** | 2 | 135 | compliance(3) |
| **R5** | L7 | Post Processors + G-code | 30% | **70%** | 3-4 | 172 | postproc(3) |
| **R6** | L8 | Production Deploy | 10% | **90%** | 2 | 98 | — |
| **R7** | L9 | **Data Pipeline + Integrations** | 30% | **70%** | 3 | 164 | integrations(3) |
| **R8** | L10 | Plugin Runtime | 20% | **80%** | 2 | 84 | — |
| **R9** | L11 | PRISM DSL | 20% | **80%** | 2-3 | 100 | — |
| **R10** | L12 | ML + Adaptive | **55%** | 45% | 3 | 168 | — |
| **R11** | L13 | UI/UX | 15% | **85%** | 3-4 | 200 | calc(3), features(3) |
| **R12** | L14 | Digital Twin | **60%** | 40% | 4-5 | 183 | — |
| **R13** | L15 | SaaS Platform | 15% | **85%** | 2-3 | 115 | platform(3) |
| | | | | | | | |
| **TOTAL** | L2-L15 | | **32%** | **68%** | **33-41** | **~1,900-2,000** | **7 teams, 22 agents** |

### Effort Distribution
| Level | Model | % of Calls | Typical Tasks |
|-------|-------|------------|---------------|
| NOVEL | opus | ~35% | Physics calibration, architecture, safety, ML design, control theory |
| STANDARD | sonnet | ~50% | Implementation, wiring, testing, data processing, adapters |
| LIGHT | haiku | ~15% | Verification, audits, regression checks, tagging, reporting |

### Bottom-Up Critical Path
```
L0  DATA (done) ──→ L1 ENGINES (exist) ──→ L2 R2 CALIBRATE ──→ L3 R3.MS0 EXTRACT
──→ L4 R3.MS1 FEATURES ──→ L5 R3.MS2-4 CAMPAIGNS ──→ L6 R4 ENTERPRISE
──→ L7 R5 POST PROC ──→ L8 R6 DEPLOY ──→ L9 R7 DATA PIPELINE
──→ L10 R8 PLUGINS ──→ L11 R9 DSL ──→ L12 R10 ML
──→ L13 R11 UI ──→ L14 R12 DIGITAL TWIN ──→ L15 R13 SAAS
```

### v18.0 → v18.1 Reorder Impact
| Change | Benefit |
|--------|---------|
| Integrations R11→R7 | ML now trains on REAL shop floor data instead of synthetic-only |
| Plugins R7→R8 | Runs on stable production platform (R6) instead of pre-deploy |
| DSL R8→R9 | Compresses full action surface including plugin-delivered tools |
| ML R9→R10 | Has 3 additional data sources (MTConnect, shop floor, PFP feedback) |
| UI R10→R11 | Displays ML insights, anomaly alerts, wear predictions |

### Current Status
| Phase | Layer | Status | Progress |
|-------|-------|--------|----------|
| R2 | L2 | **IN PROGRESS** | MS0 ✅ (7/50 baseline), MS1+MS2 NEXT |
| R3-R13 | L3-L15 | NOT STARTED | — |

---

**END OF ROADMAP v18.1**
**Last Updated:** 2026-02-20
**Supersedes:** v18.0, v17.0, PRIORITY_ROADMAP, PHASE_R3_CAMPAIGNS
**Build from the bottom up. Every layer depends on every layer below it.**
