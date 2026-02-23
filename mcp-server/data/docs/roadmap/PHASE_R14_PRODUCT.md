# PHASE R14: PRODUCT FEATURES
## Status: in-progress | MS0 COMPLETE

### Product Architecture

R14 delivers 4 commercial products composing R13 intelligence + R1-R12 infrastructure:

| Product | Engine | Safety | MCP Actions | REST Endpoint |
|---------|--------|--------|-------------|---------------|
| Post Processor Framework | PostProcessorFramework.ts | CRITICAL | pp_post, pp_validate, pp_translate, pp_uir, pp_controllers, pp_safety | POST /api/v1/post-process |
| Cost Estimation / Quoting | QuotingEngine.ts | STANDARD | quote_job, quote_compare, quote_batch, quote_breakdown | POST /api/v1/quote |
| Process Planning | ProcessPlanningEngine.ts (existing, extend) | HIGH | (existing: job_plan, setup_sheet, cycle_time_estimate) | POST /api/v1/process-plan |
| Intelligent Troubleshooter | IntelligentTroubleshooterEngine.ts | STANDARD | diagnose, diagnose_alarm, diagnose_tool, diagnose_surface | POST /api/v1/troubleshoot |

### Composition DAGs

```
POST PROCESSOR (CRITICAL):
  UIR operations
    → ConstraintEngine.applyConstraints (validate parameters)
    → GCodeTemplateEngine.generateGCode (controller dialect)
    → GCodeGeneratorEngine.validateGCode (modal state + arc checks)
    → SafetyValidator (spindle/feed/travel limits)
    → PostProcessResult { gcode, summary, warnings, safety }

QUOTING (STANDARD):
  Material + operations + batch size
    → OperationSequencerEngine (optimize sequence)
    → ToolSelectorEngine (select tools per operation)
    → SpeedFeedCalc (cutting parameters)
    → TaylorToolLife (tool cost per edge)
    → CostRollup { machine + tool + material + setup + overhead }
    → QuoteResult { perPart, perBatch, breakdown, alternatives }

PROCESS PLANNING (HIGH):
  Features + material + machine
    → FeatureRecognition (features → operations)
    → OperationSequencerEngine (ACO/job-shop)
    → ToolSelectorEngine (multi-factor scoring)
    → ConstraintEngine (feasibility check)
    → RulesEngine (machining rules)
    → ProcessPlan { operations, tooling, time, cost }

INTELLIGENT TROUBLESHOOTER (STANDARD):
  Symptoms + alarm codes + context
    → BestPracticesEngine.troubleshoot (decision trees)
    → AlarmRegistry (alarm lookup + severity)
    → BayesianInference (posterior probabilities)
    → KnowledgeGraphEngine (relationship traversal)
    → DiagnosisResult { diagnoses, confidence, actions, questions }
```

### Shared Engine Dependencies

```
ConstraintEngine ─── used by: PostProcessor, ProcessPlanning, Quoting
ToolSelectorEngine ── used by: Quoting, ProcessPlanning
OperationSequencerEngine ── used by: Quoting, ProcessPlanning
RulesEngine ── used by: ProcessPlanning, Troubleshooter
BestPracticesEngine ── used by: Troubleshooter
GCodeGeneratorEngine ── used by: PostProcessor
GCodeTemplateEngine ── used by: PostProcessor
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Product Architecture + API Design | S (15) | R13 COMPLETE |
| MS1 | Post Processor Framework | XL (35) | MS0 COMPLETE |
| MS2 | Cost Estimation / Quoting Engine | M (25) | MS0 COMPLETE (parallel OK) |
| MS3 | Process Planning Engine | L (30) | MS1 COMPLETE |
| MS4 | Intelligent Troubleshooter | M (20) | MS0 COMPLETE (parallel OK) |
| MS5 | Manufacturer Catalog Parsing | M (20) | MS1 COMPLETE |
| MS6 | Tool Holder Schema v2 | S (15) | MS1 COMPLETE (parallel) |
| MS7 | REST API Expansion + Docs | S (12) | MS4 COMPLETE |
| MS8 | Phase Gate | S (10) | MS0-MS7 COMPLETE |

### MS0 Deliverables (COMPLETE)
1. API contracts defined for all 4 products (input/output/error schemas)
2. Composition DAGs drawn (engine dependencies mapped)
3. Safety classification per product (CRITICAL/HIGH/STANDARD)
4. 3 new scaffold engines created:
   - PostProcessorFramework.ts (162 lines, 6 actions)
   - QuotingEngine.ts (136 lines, 4 actions)
   - IntelligentTroubleshooterEngine.ts (128 lines, 4 actions)
5. All 14 new actions wired to intelligenceDispatcher.ts
6. REST endpoint plan: 4 new endpoints (MS7)
7. Build: 5.7MB, 5/5 pass

### Action Count
- R14-MS0 adds: 14 new actions (6 + 4 + 4)
- Total intelligence dispatcher: 413 actions (399 + 14)
- Total engines: 82 (79 + 3 new)
