# PHASE R13: MONOLITH INTELLIGENCE EXTRACTION
### RECOMMENDED_SKILLS: prism-master-equation, prism-cutting-mechanics, prism-material-physics, prism-process-optimizer
### HOOKS_EXPECTED: ALL
### DATA_PATHS: C:\PRISM\extracted\engines, C:\PRISM\extracted\algorithms, C:\PRISM\extracted\knowledge_bases

<!-- ANCHOR: r13_extract_transform_wire_monolith_manufacturing_intelligence -->
## Extract, Transform & Wire Monolith Manufacturing Intelligence Into Live MCP Actions
<!-- ANCHOR: r13_v20_0_prerequisites_r12_complete_clean_codebase -->
## v20.0 | Prerequisites: R12 complete (clean codebase, test infra, decomposed engines)
# DEPENDS ON: R12 complete (test infra, engine decomposition, CC hooks active)
# PRIORITY: Recovers decades of machining expertise as live, queryable intelligence

---

<!-- ANCHOR: r13_quick_reference -->
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
ENV:        R13 = CC 80% + MCP 20%. Intelligence Architect → Safety Engineer.
```

---

<!-- ANCHOR: r13_knowledge_contributions -->
## KNOWLEDGE CONTRIBUTIONS
```
BRANCH 1 (Execution Chain): 7+ new engines added to chain.
  RulesEngine, BestPracticesEngine, TroubleshootingEngine, OperationSequencer,
  ToolSelectorEngine, ConstraintEngine, CostOptimizerEngine, GCodeLogicEngine.
BRANCH 2 (Data Taxonomy): Machining rules, best practices, troubleshooting trees
  become queryable data alongside materials/machines/tools.
BRANCH 3 (Relationships): Rules create constraint edges: "material X + operation Y requires tool type Z."
  Troubleshooting trees create diagnostic edges: "symptom A → cause B (87% probability)."
BRANCH 4 (Session Knowledge): Extraction patterns, monolith archaeology decisions,
  physics model selections, cross-reference findings.
AT PHASE GATE: EXTRACTION_MANIFEST.md finalized. 257 extracted engines fully classified.
```

---

<!-- ANCHOR: r13_execution_model -->
### EXECUTION MODEL
```
Environment: Claude Code 80% / Claude.ai MCP 20%
Model: Haiku (scanning, classification) → Sonnet (extraction, transformation) → Opus (physics validation, safety)

CC TASKS: MS0 (scan 257 files), MS1-MS4 (extraction + transformation), MS5 (audit)
MCP TASKS: MS1-MS4 (wiring to dispatchers, safety validation), MS6 (gate)

PARALLEL EXECUTION:
  MS1 and MS2 can run in parallel (rules vs practices — different source files)
  MS3 and MS4 are sequential (MS4 G-code depends on MS3 constraint engine)
  MS5 is independent (can start after MS0)

SAFETY: Every engine producing machining recommendations MUST be reviewed by
  safety-physics subagent before wiring. G-code generation (MS4) requires
  MANDATORY safety review with S(x) ≥ 0.70 hard block.
```

---

<!-- ANCHOR: r13_phase_objective -->
## PHASE OBJECTIVE

The monolith at C:\PRISM\extracted\ contains 257 engine files, 52 algorithm files, and 12
knowledge base files. 73 engines are wired into the MCP server. The remaining include 7
high-value modules totaling ~27,000 lines of executable machining knowledge that have NEVER
been extracted or wired:

| Module | Lines | Content | Value |
|--------|-------|---------|-------|
| rules_engine.js | ~5,500 | Executable machining rule framework | Framework for all rules |
| machining_rules.js | ~4,200 | Material/operation/tool specific rules | Domain expertise |
| best_practices.js | ~3,000 | Setup, cutting, tool care, quality control | Tribal knowledge |
| troubleshooting.js | ~2,800 | Symptom→cause→fix decision trees | Diagnostic intelligence |
| operation_sequencer.js | ~3,200 | Optimal operation ordering | Process planning core |
| tool_selector.js | ~3,500 | Multi-objective tool selection | Tool intelligence |
| constraint_engine.js | ~2,400 | Machine envelope, power, reach validation | Safety validation |
| cost_optimizer.js | ~3,200 | Minimum-cost parameter finding | Economics intelligence |
| gcode_generator.js | ~5,500 | Block formatting, modal tracking, cycle gen | Post processor core |

These modules represent decades of machining expertise in executable form. Extracting them
transforms PRISM from a calculation engine into a true manufacturing intelligence platform.

**Extraction Principle:** We extract the LOGIC, not the JavaScript. Source files contain
ES5-era code mixed with jQuery, DOM manipulation, and UI boilerplate. The useful content
is the rules, formulas, decision trees, lookup tables, and algorithms — which get
transformed into typed TypeScript engines with proper validation and error handling.

---

<!-- ANCHOR: r13_dependency_map -->
## DEPENDENCY MAP
```
[R12] ──(clean codebase, test infra)──→ [R13]
                                           │
                                           ├──→ [R14-MS1: Post Processor] (needs GCodeLogicEngine)
                                           ├──→ [R14-MS2: Quoting] (needs CostOptimizerEngine)
                                           ├──→ [R14-MS3: Process Planning] (needs OperationSequencer + ToolSelector + ConstraintEngine)
                                           └──→ [R14-MS4: Troubleshooter] (needs TroubleshootingEngine + BestPracticesEngine)
```

R13 extractions are DIRECT PREREQUISITES for every R14 product feature.

---

<!-- ANCHOR: r13_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: R12 hardened the codebase — decomposed oversized engines, unified test
infrastructure, activated CC hooks and slash commands, wired skill triggers. The foundation
is clean and well-tested.

WHAT THIS PHASE DOES: Extract, transform, and wire the 7 highest-value monolith modules
plus the G-code generator into production TypeScript engines. Each becomes a live MCP action.
Also classifies all 257 extracted engine files for future reference.

WHAT COMES AFTER: R14 (Product Features) composes these engines into 4 flagship products:
Post Processor Framework, Cost Estimation/Quoting, Process Planning Engine, and Intelligent
Troubleshooter. Every R14 product directly depends on R13 engines.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: C:\PRISM\extracted\engines\*, C:\PRISM\extracted\algorithms\*,
    C:\PRISM\extracted\knowledge_bases\*, EXTRACTION_PRIORITY_INTELLIGENCE.md,
    R12 test infrastructure (test:all, CI pipeline)
  PRODUCES: 7-9 new TypeScript engines, 10-15 new dispatcher actions,
    30-40 new tests, EXTRACTION_MANIFEST.md, EXTRACTED_ENGINE_CLASSIFICATION.md

TEST LEVELS: L1-L4 required. L5 (physics plausibility) for safety-critical engines.

---

<!-- ANCHOR: r13_fault_injection_test -->
## FAULT INJECTION TEST (XA-13)

R13 FAULT TEST: Feed the RulesEngine a material NOT in the database → verify graceful fallback.
  WHEN: After MS1 (RulesEngine wired).
  HOW: Call prism_intelligence:evaluate_rules with material_id="FICTIONAL_UNOBTANIUM"
  EXPECTED: Returns default conservative rules with WARNING: "Unknown material — using safe defaults."
    Safe defaults: reduce speed 50%, reduce depth 50%, increase safety factor 2x.
  PASS: No crash, conservative defaults applied, safety score ≥ 0.70 on defaults.
  FAIL: Crash, null reference, or unsafe defaults (speed/depth not reduced).
  EFFORT: ~3 calls.

---

<!-- ANCHOR: r13_ralph_validator_map -->
## R13 Ralph Validator Map
```
MS0-*     -> data_integrity    (monolith scan, classification)
MS1-T1/2  -> physics           (rule extraction — domain expertise)
MS1-T3/4  -> safety            (rule evaluation must produce safe recommendations)
MS2-T1    -> physics           (best practices — domain expertise)
MS2-T2    -> safety            (troubleshooting — diagnostic accuracy)
MS3-T1    -> physics           (operation sequencing — process correctness)
MS3-T2    -> physics           (tool selection — physical compatibility)
MS3-T3    -> safety            (constraint validation — safety-critical)
MS3-T4    -> physics           (cost optimization — parameter correctness)
MS4-*     -> safety            (G-code generation — CRITICAL, lives at stake)
MS5-*     -> data_integrity    (extracted engine classification)
MS6-*     -> [full panel]      (phase gate)
```

---

<!-- ANCHOR: r13_extraction_priority_dag -->
## EXTRACTION PRIORITY DAG
```
[rules_engine.js] ──→ [best_practices.js] ──→ [troubleshooting.js]
        │                                              │
        ▼                                              ▼
[machining_rules.js] ──→ [operation_sequencer.js] ──→ [tool_selector.js]
                                    │
                                    ▼
                          [constraint_engine.js]
                                    │
                                    ▼
                          [cost_optimizer.js]
                                    │
                                    ▼
                          [gcode_generator.js] ←── feeds R14 Post Processor
```

---

<!-- ANCHOR: r13_task_dag -->
## R13 Task DAG
```
[MS0: Scan+Classify] ──→ [MS1: Rules] ──→ [MS3: Optimization Suite] ──→ [MS4: G-Code] ──→ [MS6: GATE]
                     └──→ [MS2: Practices] ──↗                                               ↑
                     └──→ [MS5: 257-file Audit] ─────────────────────────────────────────────→
```

---

<!-- ANCHOR: r13_ms0_monolith_intelligence_scan -->
## MS0: MONOLITH INTELLIGENCE SCAN + CLASSIFICATION
### Role: Intelligence Architect | Model: Haiku (scanning) → Opus (classification) | Effort: L (~20 calls) | Sessions: 1-2

### Objective
Locate all 7+ target modules in the monolith. Classify content types. Estimate extraction
complexity. Check for overlap with existing engines. Produce EXTRACTION_PLAN.json.

### MS0 Task DAG
```
[T1: Locate modules] ──→ [T2: Classify content] ──→ [T3: Estimate complexity] ──→ [T4: Check overlap] ──→ [T5: Verify readable] ──→ [T6: Write manifest]
```

#### MS0-T1: Locate All 7+ Target Modules (~4 calls)
```
TASK: MS0-T1
  DEPENDS_ON: [R12 COMPLETE]
  ARCHETYPE: verifier
  MODEL: haiku (file scanning)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: C:\PRISM\extracted\
  GATE: YOLO
  SUCCESS: All target modules located with file paths and line counts
  ESTIMATED_CALLS: 4
```
1. Search C:\PRISM\extracted\ recursively for each target module:
   - rules_engine, machining_rules, best_practices, troubleshooting,
     operation_sequencer, tool_selector, constraint_engine, cost_optimizer, gcode_generator
   - Search by filename match AND by function name patterns (e.g., `evaluateRule`, `selectTool`)
2. If not found in extracted/: search monolith HTML file at C:\PRISM\ by function patterns.
3. Record for each: file path, total lines, file size, encoding, key function names.
4. Output: `data/docs/r13/MODULE_LOCATIONS.json`

#### MS0-T2: Classify Content Types per Module (~4 calls)
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  ARCHETYPE: implementer
  MODEL: opus (classification requires domain expertise)
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: Located source files
  GATE: YOLO
  SUCCESS: Each module has content breakdown: RULES/FORMULAS/TREES/TABLES/BOILERPLATE
  ESTIMATED_CALLS: 4
```
For each module, read first 200 lines + last 100 lines + scan for patterns:
- **RULES**: Count if/then/else chains, threshold checks → extract as rule objects
- **FORMULAS**: Count mathematical expressions → extract as typed functions
- **DECISION_TREES**: Count nested conditionals, scoring matrices → extract as tree structures
- **LOOKUP_TABLES**: Count static arrays, material-operation mappings → extract as JSON data
- **UI_BOILERPLATE**: Count jQuery, DOM manipulation, event handlers → DISCARD
Output: content classification per module in MODULE_LOCATIONS.json.

#### MS0-T3: Estimate Extraction Complexity (~3 calls)
```
TASK: MS0-T3
  DEPENDS_ON: [MS0-T2]
  ARCHETYPE: implementer
  MODEL: opus
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: Module classification data
  GATE: YOLO
  SUCCESS: EXTRACTION_PLAN.json with dependency graph + estimates
  ESTIMATED_CALLS: 3
```
1. For each module: useful_lines = total - UI_BOILERPLATE.
2. Map cross-module dependencies (which modules call which).
3. Estimate calls per module: (useful_lines / 200) × complexity_factor.
   - Complexity 1.0 for TABLES/RULES, 1.5 for FORMULAS, 2.0 for TREES.
4. Output: `data/docs/r13/EXTRACTION_PLAN.json`
   ```json
   { "modules": [
     { "name": "rules_engine", "path": "...", "total_lines": 5500,
       "useful_lines": 3200, "complexity": 1.5, "estimated_calls": 24,
       "depends_on": [], "content_types": { "RULES": 2100, "TABLES": 800, "BOILERPLATE": 2300 }
     }, ...
   ]}
   ```

#### MS0-T4: Check Overlap with Existing Engines (~4 calls)
```
TASK: MS0-T4
  DEPENDS_ON: [MS0-T3]
  ARCHETYPE: verifier
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: src/engines/*.ts, extracted modules
  GATE: YOLO
  SUCCESS: Overlap matrix documented — no duplicate extraction
  ESTIMATED_CALLS: 4
```
1. For each module function, grep existing src/engines/ for similar function names.
2. Key overlaps to check:
   - rules_engine ↔ RulesEngine? (unlikely — no RulesEngine exists yet)
   - machining_rules ↔ ManufacturingCalculations.ts? (possible speed/feed overlap)
   - tool_selector ↔ existing tool_recommend? (R3 has basic version)
   - cost_optimizer ↔ existing process_cost_calc? (R3 has basic version)
   - gcode_generator ↔ GCodeTemplateEngine.ts? (template-based, different approach)
3. Document overlaps: "Module X function Y overlaps with Engine Z method W — strategy: MERGE/REPLACE/COEXIST"

#### MS0-T5: Verify Readability + Write Manifest (~5 calls)
```
TASK: MS0-T5
  DEPENDS_ON: [MS0-T4]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: All target modules
  GATE: GATED
  SUCCESS: All modules confirmed readable, EXTRACTION_MANIFEST.md written
  ESTIMATED_CALLS: 5
```
1. For each module: verify file encoding (UTF-8/ASCII), parseable JavaScript.
2. Flag any obfuscated or minified sections.
3. Write `data/docs/r13/EXTRACTION_MANIFEST.md`:
   - Table: module, source path, useful_lines, discard_lines, dependencies, overlap, status
   - Status: READY / NEEDS_PREPROCESSING / BLOCKED
4. `git commit -m "R13-MS0: Monolith intelligence scan — 9 modules classified"`

**Rollback:** N/A (read-only audit + documentation)
**Exit:** EXTRACTION_PLAN.json + EXTRACTION_MANIFEST.md. All modules classified and ready.

---

<!-- ANCHOR: r13_ms1_rules_engine_extraction -->
## MS1: RULES ENGINE + MACHINING RULES EXTRACTION
### Role: Intelligence Architect → Safety Engineer | Model: Sonnet (extraction) → Opus (validation) | Effort: L (~25 calls) | Sessions: 2

### Objective
Extract rules_engine.js framework + machining_rules.js domain rules → RulesEngine.ts with
evaluate_rules and rule_search MCP actions.

### Source Assets
| File | Size | Useful Content |
|------|------|----------------|
| rules_engine.js | ~5,500L | Rule evaluation framework, condition/action pattern, severity levels |
| machining_rules.js | ~4,200L | Material→operation compat matrix, tool→material recs, speed/feed limit overrides |

### MS1 Task DAG
```
[T1: Extract framework] ──→ [T2: Extract rules] ──→ [T3: Create engine] ──→ [T4: Wire MCP] ──→ [T5: Validate]
```

#### MS1-T1: Extract rules_engine.js Framework (~6 calls)
```
TASK: MS1-T1
  DEPENDS_ON: [MS0 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet (CC extraction)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: extracted module → src/engines/rules/
  GATE: YOLO
  SUCCESS: Rule framework interfaces defined in TypeScript
  ESTIMATED_CALLS: 6
```
1. Read rules_engine.js source. Identify:
   - Rule structure: how rules are defined (condition + action + metadata)
   - Evaluation order: priority, category grouping, short-circuit logic
   - Severity levels: how severity affects evaluation (info vs warning vs critical)
2. Define TypeScript interfaces:
   ```typescript
   interface MachiningRule {
     id: string;
     category: 'material' | 'tool' | 'machine' | 'safety' | 'process' | 'quality';
     condition: (ctx: CuttingContext) => boolean;
     action: (ctx: CuttingContext) => RuleResult;
     severity: 'info' | 'warning' | 'critical';
     source: 'handbook' | 'empirical' | 'heuristic' | 'monolith';
     confidence: number; // 0.0-1.0
     description: string;
     applicableMaterials?: string[]; // ISO groups or specific material IDs
     applicableOperations?: string[];
   }
   
   interface RuleResult {
     recommendation: string;
     parameter_overrides?: Record<string, number>;
     warnings?: string[];
     rationale: string;
   }
   
   interface CuttingContext {
     material_id: string;
     material_group: string; // ISO P/M/K/N/S/H
     operation: string;
     tool_type: string;
     machine_id?: string;
     cutting_speed?: number;
     feed_rate?: number;
     depth_of_cut?: number;
     width_of_cut?: number;
   }
   ```
3. Discard: jQuery event handlers, DOM rendering, UI state management.

#### MS1-T2: Extract machining_rules.js Domain Rules (~6 calls)
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  ARCHETYPE: implementer
  MODEL: sonnet (CC extraction)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: extracted module
  GATE: YOLO
  SUCCESS: All domain rules extracted as MachiningRule[] definitions
  ESTIMATED_CALLS: 6
```
1. Read machining_rules.js. Extract rule categories:
   - **Material rules**: "Ti-6Al-4V requires flood coolant at depths >1mm"
   - **Tool rules**: "Carbide inserts not recommended for >50 HRC without coating"
   - **Machine rules**: "Horizontal mills prefer climbing milling for rigidity"
   - **Safety rules**: "Interrupted cuts reduce max DOC by 30%"
   - **Process rules**: "Thin walls (<2mm) require reduced feed rate"
   - **Quality rules**: "Ra < 0.8μm requires finishing pass with f < 0.05mm/rev"
2. Transform each to MachiningRule object with typed condition functions.
3. Preserve: lookup tables (material→operation compat), threshold values, override matrices.
4. Tag each rule with confidence: handbook=1.0, empirical=0.8, heuristic=0.6, estimated=0.4.

#### MS1-T3: Create RulesEngine.ts (~6 calls)
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T1, MS1-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: src/engines/rules/RulesEngine.ts
  GATE: GATED (safety review before wiring)
  SUCCESS: Engine compiles, loads rules, evaluates correctly
  ESTIMATED_CALLS: 6
```
1. Create `src/engines/rules/` directory.
2. Create `src/engines/rules/RulesEngine.ts`:
   ```typescript
   export class RulesEngine {
     private rules: MachiningRule[] = [];
     
     loadRules(): void { /* load from extracted rules */ }
     
     evaluateRules(context: CuttingContext): RuleEvaluation {
       const applicable = this.rules
         .filter(r => r.condition(context))
         .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
       return {
         rules: applicable.map(r => r.action(context)),
         critical_count: applicable.filter(r => r.severity === 'critical').length,
         safety_score: this.calculateSafetyScore(applicable),
       };
     }
     
     searchRules(keyword: string, category?: string): MachiningRule[] { ... }
     
     getRulesByMaterial(materialGroup: string): MachiningRule[] { ... }
     
     getRulesByOperation(operation: string): MachiningRule[] { ... }
   }
   ```
3. Add default conservative rules for unknown materials:
   - Reduce speed 50%, reduce depth 50%, increase safety factor 2x
   - Tagged as confidence=0.4 (estimated)
4. Add barrel export to src/engines/index.ts.

#### MS1-T4: Wire to MCP (~4 calls)
```
TASK: MS1-T4
  DEPENDS_ON: [MS1-T3]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: src/tools/dispatchers/intelligenceDispatcher.ts, src/tools/dispatchers/dataDispatcher.ts
  GATE: YOLO
  SUCCESS: evaluate_rules + rule_search actions live in MCP
  ESTIMATED_CALLS: 4
```
1. Add `evaluate_rules` action to intelligenceDispatcher:
   - Input: material, operation, tool_type, machine (optional), cutting params (optional)
   - Output: applicable rules, critical count, safety score, recommendations
2. Add `rule_search` action to dataDispatcher:
   - Input: keyword, category (optional)
   - Output: matching rules with descriptions
3. Register both in all 7 indexing systems.
4. Build + verify action schemas appear in dist/index.js.

#### MS1-T5: Validate (~3 calls)
```
TASK: MS1-T5
  DEPENDS_ON: [MS1-T4]
  ARCHETYPE: safety-physics
  MODEL: opus (physics validation)
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: RulesEngine evaluation results
  GATE: GATED (safety-physics MUST approve)
  SUCCESS: 10 material/operation combos return physically plausible rules
  ESTIMATED_CALLS: 3
```
1. Test 10 material/operation combinations against known machining handbooks:
   - 4140 steel + milling → expect rules about speed limits, coolant, depth
   - Ti-6Al-4V + drilling → expect rules about reduced speed, peck cycles, coolant pressure
   - 7075-T6 + milling → expect rules about high speed, light depths, chip evacuation
   - Inconel 718 + turning → expect rules about ceramic/CBN tooling, low speed
   - Cast Iron + boring → expect rules about dry cutting, reduced feed
   - (5 more covering all ISO groups)
2. Safety-physics subagent reviews: no rule produces physically impossible recommendations.
3. GATE: S(x) ≥ 0.70 on all 10 test cases (using conservative defaults where rules aren't specific).
4. `git commit -m "R13-MS1: RulesEngine — framework + domain rules extracted and wired"`

**Rollback:** Remove src/engines/rules/, revert dispatcher changes
**Exit:** RulesEngine.ts wired, evaluate_rules + rule_search live, 10 validation cases pass.

---

<!-- ANCHOR: r13_ms2_best_practices_troubleshooting -->
## MS2: BEST PRACTICES + TROUBLESHOOTING EXTRACTION
### Role: Intelligence Architect | Model: Sonnet (extraction) → Opus (validation) | Effort: L (~20 calls) | Sessions: 1-2

### Objective
Extract best_practices.js and troubleshooting.js into BestPracticesEngine.ts and
TroubleshootingEngine.ts. Wire best_practice_lookup and troubleshoot MCP actions.

### Source Assets
| File | Size | Useful Content |
|------|------|----------------|
| best_practices.js | ~3,000L | Setup, cutting, tool care, quality, safety protocols |
| troubleshooting.js | ~2,800L | Symptom→cause→fix decision trees with probability weights |

### MS2 Task DAG
```
[T1: Extract practices] ──→ [T3: Create engines] ──→ [T4: Wire MCP] ──→ [T5: Validate]
[T2: Extract troubleshoot] ↗
```

#### MS2-T1: Extract best_practices.js (~4 calls)
1. Read source. Identify practice categories: setup, cutting, tool care, maintenance, QC, safety.
2. Transform to typed interface:
   ```typescript
   interface BestPractice {
     id: string;
     category: 'setup' | 'cutting' | 'tool_care' | 'maintenance' | 'quality_control' | 'safety';
     applicability: { materials?: string[]; operations?: string[]; machines?: string[] };
     recommendation: string;
     rationale: string;
     source: string;
     evidence_level: 1 | 2 | 3 | 4 | 5; // 5=handbook, 4=validated, 3=empirical, 2=anecdotal, 1=heuristic
   }
   ```
3. Discard UI rendering. Preserve all practice data.

#### MS2-T2: Extract troubleshooting.js (~4 calls)
1. Read source. Identify symptom→cause→fix decision trees.
2. Transform to typed interface:
   ```typescript
   interface TroubleshootingTree {
     symptom: string;
     symptom_keywords: string[]; // for matching user descriptions
     possibleCauses: Array<{
       cause: string;
       prior_probability: number; // 0.0-1.0, base rate
       diagnostic_steps: string[];
       fix: string;
       prevention: string;
       related_alarms?: string[]; // alarm codes that correlate
     }>;
   }
   ```
3. Key trees to extract: chatter, tool breakage, poor surface finish, dimensional inaccuracy,
   chip evacuation problems, spindle vibration, thermal drift, tool wear patterns.

#### MS2-T3: Create BestPracticesEngine.ts + TroubleshootingEngine.ts (~5 calls)
1. `src/engines/practices/BestPracticesEngine.ts`:
   - `getRecommendations(context)` → ranked practices by relevance
   - `searchPractices(keyword, category?)` → keyword search
   - Integrates with existing FailureForensicsEngine for cross-referencing
2. `src/engines/practices/TroubleshootingEngine.ts`:
   - `diagnose(symptoms: string[])` → ranked causes with posterior probabilities
   - `diagnoseWithAlarm(alarm_code, controller?)` → alarm-enriched diagnosis
   - Uses Bayesian updating: P(cause|symptom) = P(symptom|cause)×P(cause) / P(symptom)
   - Integrates with AlarmRegistry for alarm correlation
3. Add barrel exports.

#### MS2-T4: Wire to MCP (~3 calls)
1. Add `best_practice_lookup` to intelligenceDispatcher:
   - Input: material, operation, context keywords
   - Output: ranked practices with evidence levels
2. Add `troubleshoot` to intelligenceDispatcher:
   - Input: symptoms[], alarm_code?, controller?, recent_operations?
   - Output: ranked diagnoses with probabilities, fixes, prevention
3. These ENHANCE existing `failure_diagnose` (R3) with structured decision trees.
4. Register in all indexing systems.

#### MS2-T5: Validate (~4 calls)
1. Test troubleshooter with 5 common CNC problems:
   - Chatter → expect "tool overhang too long" or "spindle speed near lobe"
   - Tool breakage → expect "excessive feed" or "chip load exceeded"
   - Poor surface finish → expect "worn tool" or "improper feed/speed ratio"
   - Dimensional inaccuracy → expect "thermal drift" or "tool wear compensation"
   - Chip evacuation → expect "peck depth too deep" or "coolant pressure insufficient"
2. Each should return top 3 causes with probabilities summing close to 1.0.
3. Test best practices: "setup for titanium milling" → expect flood coolant, climb milling, rigid setup.
4. `git commit -m "R13-MS2: BestPractices + Troubleshooting engines extracted and wired"`

**Rollback:** Remove src/engines/practices/, revert dispatchers
**Exit:** Both engines wired, 5 diagnostic scenarios pass, best practice search works.

---

<!-- ANCHOR: r13_ms3_optimization_suite -->
## MS3: OPTIMIZATION SUITE EXTRACTION (4 Engines)
### Role: Intelligence Architect → Systems Architect | Model: Sonnet (extraction) → Opus (architecture + safety) | Effort: XL (~30 calls) | Sessions: 2-3

### Objective
Extract operation_sequencer, tool_selector, constraint_engine, cost_optimizer into 4 focused
engines. Wire operation_sequence, tool_select_advanced, constraint_validate, cost_optimize actions.

### Source Assets
| File | Size | Useful Content |
|------|------|----------------|
| operation_sequencer.js | ~3,200L | Setup minimization, tool change ordering, rigidity sequence |
| tool_selector.js | ~3,500L | Multi-objective: cost, tool life, MRR, quality balance |
| constraint_engine.js | ~2,400L | Machine envelope, spindle power, tool reach, fixture clearance |
| cost_optimizer.js | ~3,200L | Minimum-cost params using Taylor + machine rate + operator rate |

### MS3 Task DAG
```
[T1: Operation Sequencer] ──→ [T5: Integration test]
[T2: Tool Selector]       ──↗          ↓
[T3: Constraint Engine]   ──↗     [T6: Wire MCP]
[T4: Cost Optimizer]      ──↗
(T1-T4 can run as agent team)
```

#### MS3-T1: Extract OperationSequencer (~6 calls)
1. Read operation_sequencer.js. Extract:
   - Operation ordering heuristics (heavy→light, rough→finish, same-tool-group)
   - Setup minimization algorithm (minimize fixture changes)
   - Tool change minimization (group operations by tool)
2. Create `src/engines/optimization/OperationSequencer.ts`:
   ```typescript
   export class OperationSequencer {
     optimize(operations: Operation[]): SequenceResult {
       // Multi-objective: minimize setup_changes, tool_changes, total_time
       // Constraints: rough before finish, facing before profiling, drilling before tapping
     }
   }
   ```
3. Integrate with existing IntelligenceEngine job_plan action (enhance, don't replace).

#### MS3-T2: Extract ToolSelectorEngine (~6 calls)
1. Read tool_selector.js. Extract:
   - Multi-objective scoring: cost (Taylor tool life), MRR, surface quality, tool availability
   - Material→tool compatibility matrices
   - Coating recommendations by material and operation
2. Create `src/engines/optimization/ToolSelectorEngine.ts`:
   - `selectTool(context)` → ranked tools with scores per objective
   - Enhances existing `tool_recommend` (R3) with deeper multi-objective logic.

#### MS3-T3: Extract ConstraintEngine (~5 calls)
1. Read constraint_engine.js. Extract:
   - Machine envelope checks (axis travel, table size, swing)
   - Spindle power validation (required vs available kW)
   - Tool reach validation (tool length vs feature depth)
   - Fixture clearance validation (tool holder vs clamp interference)
2. Create `src/engines/optimization/ConstraintEngine.ts`:
   - `validate(plan)` → { valid: boolean, violations: Violation[] }
   - Each violation: type, severity, affected_operation, recommendation
3. Wire to safetyDispatcher as `constraint_validate` — this is SAFETY-CRITICAL.

#### MS3-T4: Extract CostOptimizerEngine (~6 calls)
1. Read cost_optimizer.js. Extract:
   - Cost function: material_cost + machining_time × rate + tooling_cost + setup_cost
   - Optimization: find cutting parameters minimizing cost subject to quality constraints
   - Uses Taylor tool life for tooling cost component
2. Create `src/engines/optimization/CostOptimizerEngine.ts`:
   - `optimize(context)` → optimal_params + cost_breakdown
   - Enhances existing `process_cost_calc` (R3) with optimization loop.

#### MS3-T5: Integration Test — Full Pipeline (~4 calls)
1. Test the full pipeline: material + part features → OperationSequencer → ToolSelector
   → ConstraintEngine → CostOptimizer → enhanced job_plan.
2. Test with 3 scenarios:
   - Simple: 1 operation, 1 tool (basic bracket)
   - Medium: 3 operations, 2 setups (gear blank)
   - Complex: 6+ operations, 3 setups (aerospace fitting)
3. Verify: sequence is logical, tools are compatible, constraints satisfied, cost is reasonable.

#### MS3-T6: Wire All 4 to MCP (~3 calls)
1. `operation_sequence` → intelligenceDispatcher
2. `tool_select_advanced` → intelligenceDispatcher
3. `constraint_validate` → safetyDispatcher
4. `cost_optimize` → calcDispatcher
5. Register all in 7 indexing systems.
6. `git commit -m "R13-MS3: Optimization suite — 4 engines extracted and wired"`

**Rollback:** Remove src/engines/optimization/, revert dispatchers
**Exit:** 4 engines wired, 3 integration scenarios pass, job_plan enhanced.

---

<!-- ANCHOR: r13_ms4_gcode_generator -->
## MS4: G-CODE GENERATOR EXTRACTION (Safety-Critical)
### Role: Safety Engineer → Intelligence Architect | Model: Sonnet (extraction) → Opus (MANDATORY safety review) | Effort: L (~20 calls) | Sessions: 1-2

### ⚠️ SAFETY NOTICE: G-code generation is SAFETY-CRITICAL. Generated code controls CNC machines.
### Errors can cause tool explosions, machine crashes, and operator injuries.
### Safety-physics subagent review is MANDATORY before ANY G-code action is wired.

### Objective
Extract gcode_generator.js logic → GCodeLogicEngine.ts. Wire gcode_generate and modal_check
actions. This engine feeds directly into R14-MS1 (Post Processor Framework).

### Source Assets
| File | Size | Useful Content |
|------|------|----------------|
| gcode_generator.js | ~5,500L | Block formatting, modal tracking, canned cycles, safe start blocks |
| Existing: GCodeTemplateEngine.ts | 49.6KB | Template-based generation (COMPLEMENT, not replace) |

### MS4 Task DAG
```
[T1: Extract logic] ──→ [T2: Create engine] ──→ [T3: Wire MCP] ──→ [T4: Validate programs] ──→ [T5: Safety review (MANDATORY)]
```

#### MS4-T1: Extract G-Code Generation Logic (~5 calls)
1. Read gcode_generator.js. Extract (NOT the templates — the LOGIC):
   - **ModalGroupTracker**: tracks active G-codes per modal group, prevents conflicts
     (Group 1: G00/G01/G02/G03, Group 3: G90/G91, Group 6: G20/G21, etc.)
   - **BlockFormatter**: N-numbering, coordinate format (fixed/floating), feed format (F/E)
   - **CycleGenerator**: canned cycle output (G81 drill, G83 peck, G84 tap, G85 bore, G86-G89)
     with proper R-plane, Z-depth, retract logic
   - **SafeStartGenerator**: per-controller safe start block
     (FANUC: G90 G94 G17 G40 G49 G80 G54; HAAS: similar + M05 M09)
   - **ToolChangeSequence**: T→M6→G43→S→M3→position→engage logic
2. Discard: HTML output formatting, print layout, UI event handlers.
3. Preserve: ALL safety-related logic (retract heights, rapid move guards, coolant sequencing).

#### MS4-T2: Create GCodeLogicEngine.ts (~5 calls)
1. Create `src/engines/gcode/GCodeLogicEngine.ts`:
   ```typescript
   export class GCodeLogicEngine {
     private modalTracker = new ModalGroupTracker();
     
     generateBlock(move: UIRMove): string { /* format one G-code block */ }
     generateSafeStart(controller: string): string[] { /* controller-specific safe start */ }
     generateToolChange(toolNum: number, offset: number): string[] { /* T→M6→G43 sequence */ }
     generateCannedCycle(cycle: CannedCycleSpec): string[] { /* G81-G89 with retract */ }
     
     checkModalConflicts(): ModalConflict[] { /* verify no conflicting active modals */ }
     validateBlockSequence(blocks: string[]): ValidationResult { /* verify safe sequencing */ }
   }
   ```
2. Interface with existing GCodeTemplateEngine.ts: GCodeLogicEngine provides the LOGIC,
   GCodeTemplateEngine provides the TEMPLATES. They compose, not compete.
3. Add barrel export.

#### MS4-T3: Wire to MCP (~3 calls)
1. Add `gcode_generate` to calcDispatcher:
   - Input: operations[], controller, machine (optional)
   - Output: G-code string + program summary
   - SAFETY: calls validateBlockSequence() before returning ANY output
2. Add `modal_check` to safetyDispatcher:
   - Input: G-code program string
   - Output: modal conflict report (conflicts found or CLEAR)
3. SAFETY: If validateBlockSequence() or modal_check finds ANY issue → BLOCK output.
   Return error with specific issue, not G-code.

#### MS4-T4: Validate with Known Programs (~4 calls)
1. Generate G-code for 3 simple operations (face mill, pocket, drill pattern) on FANUC:
   - Each: safe start + tool change + operation + retract + M30
2. Compare output structure against known good programs (user's Hurco/FANUC programs).
3. Verify per program:
   - Safe start block present and complete
   - No conflicting modals
   - Proper retract before rapid moves
   - Coolant on before cutting (M08 before G01)
   - Spindle on before cutting (M03/M04 before G01)
   - Program end clean (M05 M09 M30)

#### MS4-T5: Safety-Physics Review (MANDATORY) (~3 calls)
```
TASK: MS4-T5
  DEPENDS_ON: [MS4-T4]
  ARCHETYPE: safety-physics
  MODEL: opus (MANDATORY for G-code)
  EFFORT: NOVEL
  PARALLEL: false
  SCOPE: GCodeLogicEngine output
  GATE: GATED — HARD BLOCK if S(x) < 0.70
  SUCCESS: All 3 test programs pass safety review
  ESTIMATED_CALLS: 3
```
1. Safety-physics reviews ALL generated G-code:
   - No rapid moves into material (G00 only when above safe Z)
   - Retract heights always above highest workpiece point
   - Spindle speed within machine limits
   - Feed rate within machine limits
   - Coolant sequencing correct (on before cut, off after retract)
   - No conflicting modal groups
2. S(x) calculation on each program.
3. GATE: S(x) ≥ 0.70 on ALL 3 programs. If ANY fails → BLOCK. Do not wire until fixed.
4. `git commit -m "R13-MS4: GCodeLogicEngine — SAFETY REVIEWED and wired"`

**Rollback:** Remove src/engines/gcode/, revert dispatchers
**Exit:** GCodeLogicEngine wired, 3 test programs pass, safety-physics PASS (S(x) ≥ 0.70).

---

<!-- ANCHOR: r13_ms5_extracted_engine_audit -->
## MS5: EXTRACTED ENGINE AUDIT (257 → Classified)
### Role: Intelligence Architect | Model: Haiku (scanning) → Sonnet (classification) | Effort: M (~15 calls) | Sessions: 1

### Objective
Classify all 257 files in C:\PRISM\extracted\engines\ as WIRED/DUPLICATE/CANDIDATE/ARCHIVE.
Identify top 20 unwired candidates for future development.

### MS5 Task DAG
```
[T1: Scan 257 files] ──→ [T2: Cross-reference] ──→ [T3: Classify] ──→ [T4: Update indexes]
```

#### MS5-T1: Scan All 257 Engine Files (~4 calls)
1. List C:\PRISM\extracted\engines\ — record name, size, top exports/functions.
2. Quick-read first 20 lines of each for description/purpose.
3. Output: `data/docs/r13/EXTRACTED_ENGINE_INVENTORY.json`

#### MS5-T2: Cross-Reference with 73+ Wired Engines (~4 calls)
1. For each extracted engine: grep src/engines/ for matching function/class names.
2. Classify matches:
   - **WIRED**: Direct correspondence exists in MCP server
   - **PARTIAL**: Some functions wired, others not
   - **UNWIRED**: No match in MCP server

#### MS5-T3: Full Classification (~4 calls)
1. For each unwired engine:
   - **CANDIDATE**: Contains unique, valuable logic → flag for future wiring
   - **DUPLICATE**: Overlaps significantly with existing wired engine → ARCHIVE
   - **ARCHIVE**: UI boilerplate, outdated, or superseded → archive
2. Rank CANDIDATE engines by: uniqueness × size × domain relevance.
3. Output: `data/docs/r13/EXTRACTED_ENGINE_CLASSIFICATION.md`
   - Table: name, size, classification, reason, priority (if CANDIDATE)

#### MS5-T4: Update Indexes (~3 calls)
1. Update MASTER_INDEX counts with new wired engines from MS1-MS4.
2. Update EXECUTION_CHAIN.json with new engine→dispatcher mappings.
3. Update DATA_TAXONOMY.json with rules/practices/troubleshooting data types.
4. `git commit -m "R13-MS5: 257 extracted engines classified"`

**Rollback:** N/A (documentation only)
**Exit:** All 257 engines classified, top 20 candidates identified, indexes updated.

---

<!-- ANCHOR: r13_ms6_phase_gate -->
## MS6: PHASE GATE
### Role: Systems Architect | Model: Opus | Effort: S (~8 calls) | Sessions: 0.5

### Gate Criteria

| # | Criterion | Source MS | Type | Required? |
|---|-----------|-----------|------|-----------|
| 1 | RulesEngine: evaluate_rules returns valid rules for 10 test cases | MS1 | physics | ✅ |
| 2 | BestPracticesEngine: searchPractices returns relevant practices | MS2 | data_integrity | ✅ |
| 3 | TroubleshootingEngine: diagnose returns ranked causes for 5 problems | MS2 | physics | ✅ |
| 4 | OperationSequencer: optimize returns valid sequence for 3 scenarios | MS3 | physics | ✅ |
| 5 | ToolSelectorEngine: selectTool returns physically valid recommendations | MS3 | physics | ✅ |
| 6 | ConstraintEngine: validate catches known violations | MS3 | safety | ✅ |
| 7 | CostOptimizerEngine: optimize returns cost < 10x naive calculation | MS3 | physics | ✅ |
| 8 | GCodeLogicEngine: 3 programs pass safety-physics (S(x) ≥ 0.70) | MS4 | safety | 🔴 HARD BLOCK |
| 9 | 257 engines classified with dispositions | MS5 | data_integrity | ✅ |
| 10 | Regression: all existing tests pass (benchmarks, enterprise, intel) | ALL | safety | 🔴 HARD BLOCK |

**PASS:** 8/10 met. Criteria 8 and 10 are HARD BLOCKS — no exceptions.
**FAIL:** Any safety failure or regression.

### Gate Steps
1. Run `npm run ci` → full test + build + coverage.
2. Run benchmark regression: 150/150 expected.
3. Run each criterion check against deliverables.
4. Write R13_QUALITY_REPORT.json.
5. If PASS: `git tag r13-complete`
6. Update CURRENT_POSITION.md and ROADMAP_TRACKER.md.

**Exit:** R13 COMPLETE. 7-9 new engines wired. Manufacturing intelligence is live and queryable.

---

<!-- ANCHOR: r13_session_management -->
## SESSION MANAGEMENT

| MS | Risk | Calls | Strategy |
|----|------|-------|----------|
| MS0 | LOW | ~20 | Read-only scanning, flush classification after each module |
| MS1 | HIGH | ~25 | Flush after each task: T1→framework, T2→rules, T3→engine, T4→wiring |
| MS2 | MEDIUM | ~20 | Flush after T1 (practices), T2 (troubleshooting), T3 (engines) |
| MS3 | HIGH | ~30 | Flush after EACH of 4 engine extractions. Integration test last. |
| MS4 | HIGH | ~20 | SAFETY-CRITICAL: flush after each step. Safety review is blocking. |
| MS5 | LOW | ~15 | Read-only audit + docs |
| MS6 | LOW | ~8 | Gate only |

---

<!-- ANCHOR: r13_effort_summary -->
## EFFORT SUMMARY

| MS | Title | Calls | Model Split | Sessions |
|----|-------|-------|-------------|----------|
| MS0 | Scan + Classify | ~20 | Haiku 40% / Opus 60% | 1-2 |
| MS1 | Rules Engine | ~25 | Sonnet 75% / Opus 25% | 2 |
| MS2 | Best Practices + Troubleshooting | ~20 | Sonnet 75% / Opus 25% | 1-2 |
| MS3 | Optimization Suite (4 engines) | ~30 | Sonnet 80% / Opus 20% | 2-3 |
| MS4 | G-Code Generator (SAFETY) | ~20 | Sonnet 60% / Opus 40% | 1-2 |
| MS5 | 257-file Audit | ~15 | Haiku 60% / Sonnet 40% | 1 |
| MS6 | Phase Gate | ~8 | Opus 100% | 0.5 |
| **TOTAL** | | **~138** | **Haiku 15% / Sonnet 60% / Opus 25%** | **8-12** |
