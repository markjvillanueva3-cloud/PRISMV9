# R13: MONOLITH INTELLIGENCE EXTRACTION — MANIFEST
# Generated 2026-02-22 by R13-MS0 Scan + Classification

---

## SOURCE SUMMARY

| Metric | Value |
|--------|-------|
| Monolith | PRISM_v8_89_002_TRUE_100_PERCENT.html (986,622 lines) |
| Extracted directory | C:\PRISM\extracted\ (821 files, 28 subdirectories) |
| Target modules | 7 conceptual → 28 actual source files |
| Total source lines | 29,347 |
| Estimated useful lines | 18,950 (65%) |
| Estimated discard lines | 10,397 (35%) — UI, jQuery, boilerplate |
| Existing MCP overlap | ~35% (engines already have real logic) |
| Net new intelligence | ~12,300 lines to extract and transform |
| File encoding | All UTF-8/ASCII, avg 33 chars/line, no obfuscation |

---

## MODULE INVENTORY

### MS1: Rules Engine + Machining Rules → RulesEngine.ts

| Source File | Lines | Type | Useful% | Notes |
|-------------|-------|------|---------|-------|
| PRISM_INTELLIGENT_DECISION_ENGINE.js | 1,612 | DECISION_TREES | 85% | Confidence scoring, weighted decision framework |
| PRISM_DECISION_TREE_ENGINE.js | 3,172 | DECISION_TREES | 90% | ID3/C4.5 generic tree builder, entropy/info gain |
| PRISM_KNOWLEDGE_BASE.js | 620 | FORMULAS | 95% | Metal cutting physics, thermodynamics, tool temp limits |
| PRISM_CSP_ENHANCED_ENGINE.js | 361 | RULES | 80% | Constraint satisfaction problem solver |
| PRISM_CALCULATOR_CONSTRAINT_ENGINE.js | 215 | RULES | 95% | RPM/feed/DOC/WOC from machine+tool+holder+workholding |
| PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE.js | 705 | RULES | 80% | Cutting parameter recommendation logic |
| PRISM_TOOL_PERFORMANCE_ENGINE.js | 1,236 | LOOKUP_TABLES | 70% | Tool performance data, life predictions |
| PRISM_SURFACE_FINISH_ENGINE.js | 299 | FORMULAS | 85% | Surface finish rules beyond ManufacturingCalculations |
| **Subtotal** | **8,220** | | | **~7,450 useful** |

**Overlap check:**
- DecisionTreeEngine.ts: Has 7 hardcoded trees — PRISM_DECISION_TREE_ENGINE adds GENERIC tree builder (complementary)
- ManufacturingCalculations.ts: Has Kienzle/Taylor/Johnson-Cook — PRISM_KNOWLEDGE_BASE adds Merchant model, Lee-Shaffer, heat zones (complementary)
- ManufacturingCalculations.ts: Has surface finish — PRISM_SURFACE_FINISH_ENGINE may have additional models (check during extraction)

**Action:** Extract rules framework (evaluation pipeline, confidence scoring, constraint application) + machining-specific rules. Merge into single RulesEngine.ts.

---

### MS2: Best Practices + Troubleshooting → BestPracticesEngine.ts

| Source File | Lines | Type | Useful% | Notes |
|-------------|-------|------|---------|-------|
| PRISM_LEAN_SIX_SIGMA_KAIZEN.js | 1,471 | FORMULAS | 90% | Cp, Cpk, SPC, control charts, Lean metrics |
| PRISM_PHASE2_QUALITY_SYSTEM.js | 404 | RULES | 75% | Quality system rules |
| PRISM_QUALITY_MANAGER.js | 378 | RULES | 70% | Quality management workflow |
| PRISM_INSPECTION_ENGINE.js | 206 | DECISION_TREES | 80% | Inspection decision logic |
| PRISM_ERROR_LOOKUP.js | 300 | LOOKUP_TABLES | 85% | Error code lookup tables |
| PRISM_ERROR_HANDLER.js | 250 | RULES | 60% | Error handling (partial UI_BOILERPLATE) |
| PRISM_MASTER_ORCHESTRATOR.js (partial) | 500 | DECISION_TREES | 30% | Troubleshooting section only |
| **Subtotal** | **3,509** | | | **~2,650 useful** |

**Overlap check:**
- DiagnosticsEngine.ts: Has 7 failure modes with symptoms/causes/remedies — troubleshooting sources mostly ADD alarm databases and error lookup (complementary)
- ComplianceEngine.ts: Regulatory compliance, not SPC — minimal overlap
- ToleranceEngine.ts: Tolerance analysis — may overlap with inspection logic

**Action:** Extract SPC/Lean formulas + quality rules + troubleshooting logic. Alarm database (9,200+ codes) is already wired to AlarmRegistry — reference rather than duplicate.

---

### MS3: Operation Sequencer → OperationSequencerEngine.ts

| Source File | Lines | Type | Useful% | Notes |
|-------------|-------|------|---------|-------|
| PRISM_ACO_SEQUENCER.js | 5,383 | FORMULAS | 75% | Full ACO algorithm with pheromone matrix, elitist strategy, convergence control |
| PRISM_COMBINATORIAL_OPTIMIZER.js | 3,938 | FORMULAS | 60% | Combinatorial optimization (some overlap with ACO) |
| PRISM_JOB_SHOP_SCHEDULING_ENGINE.js | 926 | DECISION_TREES | 70% | Job shop scheduling rules |
| **Subtotal** | **10,247** | | | **~5,800 useful** |

**Overlap check:**
- OptimizationEngine.ts: Already has ACO sequencing (`optimize_sequence`) with 7-material cost model — PRISM_ACO_SEQUENCER has MORE DETAILED parameters (elitist weight, convergence threshold, stagnation limit, tool change time penalties). Extract as EXTENSION.
- ProcessPlanningEngine.ts: Job planning with cycle time — some scheduling overlap
- ShopSchedulerEngine.ts: Job scheduling — may overlap with JOB_SHOP_SCHEDULING_ENGINE

**Action:** Extract advanced ACO with full configuration, plus job shop scheduling logic. Wire as enhanced versions of existing optimize_sequence.

---

### MS4: Tool Selector → ToolSelectorEngine.ts

| Source File | Lines | Type | Useful% | Notes |
|-------------|-------|------|---------|-------|
| PRISM_AI_AUTO_CAM.js | 560 | DECISION_TREES | 70% | Operation→tool suitability map, scoring system |
| PRISM_CALCULATOR_RECOMMENDATION_ENGINE.js | 155 | DECISION_TREES | 85% | Recommendation logic |
| PRISM_CUTTING_TOOL_DATABASE_V2.js | 1,040 | LOOKUP_TABLES | 50% | Tool database (partial UI_BOILERPLATE) |
| PRISM_INTELLIGENT_DECISION_ENGINE.js (partial) | 320 | DECISION_TREES | 80% | Tool selection section only |
| **Subtotal** | **2,075** | | | **~1,750 useful** |

**Overlap check:**
- DecisionTreeEngine.ts: Has selectToolType() and selectInsertGrade() — PRISM_AI_AUTO_CAM adds operation-specific suitability map (face→face_mill, rough→roughing_endmill, etc.) with multi-factor scoring (complementary)
- RecommendationEngine.ts: Material/tool/machine scoring — SIGNIFICANT overlap with PRISM_CALCULATOR_RECOMMENDATION_ENGINE. Extract only the delta.

**Action:** Extract operation→tool suitability map and scoring system. Merge with existing DecisionTreeEngine or create standalone ToolSelectorEngine.

---

### MS5: Constraint Engine → ConstraintEngine.ts

| Source File | Lines | Type | Useful% | Notes |
|-------------|-------|------|---------|-------|
| PRISM_CALCULATOR_CONSTRAINT_ENGINE.js | 215 | RULES | 95% | Parameter constraints from 7 sources (machine, controller, tool, holder, workholding, material, toolpath) |
| PRISM_PARAMETRIC_CONSTRAINT_SOLVER.js | 636 | FORMULAS | 80% | Parametric constraint solving |
| PRISM_CONTACT_CONSTRAINT_ENGINE.js | 448 | FORMULAS | 50% | Physics contact constraints (less relevant) |
| PRISM_CSP_ENHANCED_ENGINE.js | 361 | FORMULAS | 75% | Shared with rules_engine |
| **Subtotal** | **1,660** | | | **~1,100 useful** |

**Overlap check:**
- ManufacturingCalculations.ts: Physics models but NO parameter constraint API — no overlap
- CollisionEngine.ts: Geometric collision, not parameter constraints — no overlap
- OptimizationEngine.ts: Uses constraints internally but doesn't expose API — complementary

**Action:** Extract parameter constraint system (applyAllConstraints with 7 constraint sources). This is the MOST NOVEL extracted module — nothing in the MCP server currently exposes this.

---

### MS6: G-Code Generator → GCodeGeneratorEngine.ts

| Source File | Lines | Type | Useful% | Notes |
|-------------|-------|------|---------|-------|
| POST_PROCESSOR_100_PERCENT.js | 1,204 | FORMULAS | 80% | G-code validator with modal state tracking, arc validation |
| PRISM_GCODE_BACKPLOT_ENGINE.js | 863 | FORMULAS | 70% | G-code backplot/visualization data |
| PRISM_POST_PROCESSOR_DATABASE_V2.js | 2,717 | LOOKUP_TABLES | 65% | Extensive controller-specific post data |
| POST_PROCESSOR_ENGINE_V2.js | 296 | FORMULAS | 75% | Post processor core |
| PRISM_GCODE_PROGRAMMING_ENGINE.js | 128 | FORMULAS | 85% | G-code programming primitives |
| PRISM_INTERNAL_POST_ENGINE.js | 930 | FORMULAS | 60% | Internal post engine (some UI_BOILERPLATE) |
| **Subtotal** | **6,138** | | | **~4,500 useful** |

**Overlap check:**
- GCodeTemplateEngine.ts: Has 6 controllers + 11 operations + parametric generation. POST_PROCESSOR_100_PERCENT adds VALIDATION (modal state, arc checks, statistics). POST_PROCESSOR_DATABASE_V2 adds controller data. BACKPLOT adds visualization. All COMPLEMENTARY.

**Action:** Extract G-code validator, backplot data generator, and enhanced controller database. Wire as companion to existing GCodeTemplateEngine.

---

## CONTENT CLASSIFICATION SUMMARY

| Type | Lines | % of Total | Description |
|------|-------|-----------|-------------|
| FORMULAS | 11,200 | 38% | Mathematical models, physics equations, SPC formulas |
| DECISION_TREES | 8,400 | 29% | If/then/else chains, scoring matrices, tree builders |
| RULES | 4,700 | 16% | Constraint checks, safety limits, parameter boundaries |
| LOOKUP_TABLES | 4,200 | 14% | Tool data, material data, controller configs |
| UI_BOILERPLATE | 847 | 3% | DOM, jQuery, event handlers → DISCARD |

---

## DEPENDENCY GRAPH

```
Level 0 (no deps):    [rules_engine]  [best_practices]
                           │                │
Level 1:          [machining_rules]  [troubleshooting]
                     │        │
Level 2:    [operation_seq] [tool_sel] [constraint_eng]
                                           │
Level 3:                         [gcode_generator]
```

---

## EXTRACTION SCHEDULE

| MS | Modules | New Lines | Complexity | Output Engine | New Actions |
|----|---------|-----------|-----------|---------------|-------------|
| MS1 | rules_engine + machining_rules | ~7,450 | MEDIUM | RulesEngine.ts | evaluate_rules, rule_search, evaluate_machining_rules, get_parameter_constraints |
| MS2 | best_practices + troubleshooting | ~2,650 | LOW | BestPracticesEngine.ts | get_best_practices, spc_analysis, troubleshoot, alarm_lookup_enhanced |
| MS3 | operation_sequencer | ~5,800 | HIGH | OperationSequencerEngine.ts | optimize_sequence_advanced, schedule_operations |
| MS4 | tool_selector | ~1,750 | MEDIUM | ToolSelectorEngine.ts | select_optimal_tool, score_tool_candidates |
| MS5 | constraint_engine | ~1,100 | MEDIUM | ConstraintEngine.ts | apply_constraints, check_feasibility |
| MS6 | gcode_generator | ~4,500 | HIGH | GCodeGeneratorEngine.ts | generate_gcode, validate_gcode, backplot_gcode |

**Total: 6 new TypeScript engines, 16 new MCP actions, ~23,250 lines of extracted intelligence**

---

## EXISTING MCP ENGINE SUMMARY (for overlap reference)

| Engine | Lines | Status | Key Content |
|--------|-------|--------|-------------|
| ManufacturingCalculations.ts | 898 | REAL | Kienzle, Taylor, Johnson-Cook, surface finish, MRR, power |
| ProcessPlanningEngine.ts | 837 | REAL | Job planning, setup sheets, cycle time, multi-pass |
| RecommendationEngine.ts | 481 | REAL | Material/tool/machine scoring with registry lookups |
| DecisionTreeEngine.ts | 1,467 | REAL | 7 decision trees (tool, insert, coolant, workholding, strategy, approach, material) |
| GCodeTemplateEngine.ts | 1,435 | REAL | 6 controllers, 11+ operations, parametric G-code |
| DiagnosticsEngine.ts | 338 | REAL | 7 failure modes, 30+ remedies, alarm integration |
| CollisionEngine.ts | 1,235 | REAL | AABB/OBB/SAT, swept volume, near-miss, 5-axis safety |
| OptimizationEngine.ts | 779 | REAL | Pareto, ACO sequencing, sustainability (ISO 14955) |

All 8 engines are **PRODUCTION-READY with real logic** — not stubs.
R13 extraction targets are **COMPLEMENTARY** to these engines, not duplicative.
