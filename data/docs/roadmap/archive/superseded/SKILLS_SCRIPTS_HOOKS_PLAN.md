# SKILLS, SCRIPTS & HOOKS CREATION PLAN
## What Gets Built Alongside Each Roadmap Phase
## v14.3 Companion Document — Updated with DA phase, all gaps, 22 app skills, dev skills, audit fixes

---

## THE GAP

The roadmap plans engines, actions, and registries — but never plans the **skills** that
teach Claude how to use them, the **scripts** that automate common workflows, or the **hooks**
that protect new features from misuse. Every new action needs all three or it's a feature
that exists but nobody uses correctly.

### Current Inventory (reconciled 2026-02-16)
| Asset | Registered | Active/Implemented | Note |
|-------|-----------|-------------------|------|
| Hooks | 62 registered | 53 active (9 disabled) | Per MASTER_INDEX.md |
| Scripts | 1,320 registered (SCRIPT_REGISTRY.json) | ~161 with implementations | 1,159 are registry stubs only |
| Skills | 126 skill directories | ~99 with content | 27 are empty/placeholder dirs |

**IMPORTANT:** MASTER_INDEX.md uses ACTIVE counts (implemented + firing).
SKILLS_SCRIPTS_HOOKS_PLAN.md uses REGISTERED counts (includes stubs).
When referencing counts, always specify: "X registered / Y active"

### What's Missing
- **Zero hooks** for R3/R7/R8 actions (job_plan, surface_integrity, optimize_parameters, etc.)
- **Zero skills** that teach Claude how to orchestrate multi-action workflows for end users
- **Zero scripts** that automate common manufacturing scenarios (job quoting, tool selection, etc.)
- **No user-facing skill** that helps Claude decompose "help me machine this part" into the right actions

---

## PHASE R1: REGISTRY LOADING — Skills & Hooks to Create

### New Hooks (add to existing hook files)

#### ManufacturingHooks.ts additions
```
HOOK: material_enrichment_validate
  TRIGGER: post-merge during MS6 enrichment
  PURPOSE: Verify merged data doesn't corrupt canonical entries
  LOGIC: If enrichment changes hardness by >20% or density by >5% → BLOCK + log anomaly
  MODE: blocking
  PRIORITY: critical

HOOK: tool_schema_validate
  TRIGGER: post-load during MS5 tool normalization
  PURPOSE: Validate tool entries against 14 canonical category schemas
  LOGIC: Check required fields per category (end_mill needs flutes, diameter, helix_angle, etc.)
  MODE: warning (log incomplete entries, don't block load)
  PRIORITY: high

HOOK: machine_capability_validate
  TRIGGER: post-load during MS7 machine enrichment
  PURPOSE: Verify physical constraints are sane
  LOGIC: RPM max > RPM min, power > 0, travels > 0, spindle taper is valid enum
  MODE: blocking
  PRIORITY: critical
```

### New Scripts (add to ScriptExecutor or standalone)

```
SCRIPT: registry_health_check
  PURPOSE: Run post-R1 to verify all registries loaded correctly
  INPUT: none
  OUTPUT: { materials: { total, with_tribology, with_composition, pct_complete },
            machines: { total, with_power, with_envelope, pct_complete },
            tools: { total, by_category, pct_complete },
            alarms: { total, by_controller } }
  USE CASE: Run after every build to catch registry regressions

SCRIPT: material_search_diagnostic
  PURPOSE: When a user searches for a material and gets no results
  INPUT: search_term
  OUTPUT: Shows what MaterialRegistry tried, what almost matched, suggests alternatives
  USE CASE: Debug "why can't PRISM find 17-4 PH?" — probably indexed as "17-4PH" or "S17400"

SCRIPT: tool_coverage_report
  PURPOSE: Show which tool categories have good data vs gaps
  INPUT: none
  OUTPUT: Per-category counts + gaps (e.g., "thread_mills: 0 entries — no data loaded")
  USE CASE: Identify which manufacturer catalogs to prioritize in R7-MS6
```

### New Skills

```
SKILL: prism-registry-diagnostics
  LOCATION: skills-consolidated/prism-registry-diagnostics/SKILL.md
  PURPOSE: Teach Claude how to diagnose registry loading issues
  TRIGGERS: "why can't PRISM find [material/tool/machine]", "registry not loading",
            "material shows null for tribology"
  CONTENT:
    - How MaterialRegistry loads (file scan → parse → normalize → index)
    - Common failure modes (file encoding, malformed JSON, missing required fields)
    - Diagnostic steps (check file exists, check parse, check index, check query)
    - How enrichment merge works (canonical + merged_from_complete)
    - Designation index lookup chain (exact → AISI → UNS → DIN → fuzzy)
```

---

## PHASE R3: CAMPAIGN ACTIONS — Skills, Scripts & Hooks to Create

### New Hook File: IntelligenceHooks.ts

This is a **new hook category** (category #14) for all R3+ intelligence actions.

```typescript
// src/hooks/IntelligenceHooks.ts

HOOK: job_plan_safety_gate
  TRIGGER: pre-output on job_plan action
  PURPOSE: Block any job_plan that produces unsafe parameters
  LOGIC:
    - Verify S(x) ≥ 0.70 on all cutting parameters
    - Verify force doesn't exceed machine power capacity
    - Verify DOC doesn't exceed tool max depth rating
    - Verify RPM doesn't exceed machine max RPM
  MODE: blocking
  PRIORITY: critical
  TAGS: [safety, job_plan, pre-output]

HOOK: job_plan_completeness_check
  TRIGGER: post-calc on job_plan action
  PURPOSE: Warn if job_plan output is missing recommended fields
  LOGIC:
    - Check tool_recommendation exists
    - Check strategy_selection exists
    - Check at least one safety validation ran
    - Check cost estimate included (if process_cost available)
  MODE: warning
  PRIORITY: high

HOOK: what_if_bounds_check
  TRIGGER: pre-calc on what_if action
  PURPOSE: Prevent nonsensical what-if comparisons
  LOGIC:
    - Reject if both scenarios are identical
    - Reject if parameter difference > 10x (likely unit error)
    - Warn if comparing different materials (might be intentional but unusual)
  MODE: warning
  PRIORITY: normal

HOOK: uncertainty_chain_propagation_validate
  TRIGGER: post-calc on uncertainty_chain action
  PURPOSE: Verify uncertainty propagation is mathematically valid
  LOGIC:
    - Output uncertainty must be ≥ max input uncertainty (can't reduce uncertainty by chaining)
    - Confidence interval must be symmetric or explicitly flagged as asymmetric
    - Total propagated uncertainty must be < 100% (meaningless if uncertainty exceeds value)
  MODE: blocking
  PRIORITY: critical
  TAGS: [safety, mathematics, uncertainty]

HOOK: wear_prediction_material_coverage
  TRIGGER: pre-calc on wear_prediction action
  PURPOSE: Check if material has sufficient data for reliable wear prediction
  LOGIC:
    - Check material has tool_wear coefficients (Taylor constants)
    - Check material has hardness data
    - If missing → degrade to empirical estimate + flag confidence as LOW
  MODE: warning
  PRIORITY: high

HOOK: controller_optimize_alarm_cross_ref
  TRIGGER: post-calc on controller_optimize action
  PURPOSE: Cross-reference optimized G-code against alarm database
  LOGIC:
    - Parse generated G-code for modal groups
    - Check for common alarm triggers (e.g., G43 without prior T/M06)
    - Verify axis travel limits against machine envelope
  MODE: warning
  PRIORITY: high
  TAGS: [safety, controller, g-code]

HOOK: material_substitute_safety
  TRIGGER: post-calc on material_substitute action
  PURPOSE: Ensure material substitutes are safe
  LOGIC:
    - Substitute must have equal or higher tensile strength
    - Substitute must have compatible machinability (within 30% of original)
    - Flag if substitute changes ISO material group (e.g., P → M)
    - Block if substitute is a different material class entirely (steel → aluminum)
      without explicit confirmation
  MODE: blocking
  PRIORITY: critical
  TAGS: [safety, material]
```

**Estimated: 7 new hooks, all in IntelligenceHooks.ts**

### New Scripts for R3

```
SCRIPT: job_plan_template_generator
  PURPOSE: Pre-populate job_plan input from common scenarios
  INPUT: scenario ('pocket_roughing', 'finishing_pass', 'drilling_pattern', 'thread_milling')
  OUTPUT: Partially filled JobPlanInput with sensible defaults
  USE CASE: User says "plan a roughing operation" — script fills material=unknown, prompts user

SCRIPT: setup_sheet_formatter
  PURPOSE: Format job_plan output as a printable shop-floor setup sheet
  INPUT: job_plan result
  OUTPUT: Formatted markdown/HTML with tool list, parameters, fixture notes, safety warnings
  USE CASE: Machinist prints and tapes to machine

SCRIPT: parameter_comparison_table
  PURPOSE: Format what_if output as side-by-side comparison
  INPUT: what_if result (scenario_a, scenario_b)
  OUTPUT: Table with deltas, % changes, recommendation
  USE CASE: Programmer comparing trochoidal vs conventional

SCRIPT: batch_job_plan
  PURPOSE: Run job_plan for multiple operations on the same part
  INPUT: Array of features + shared material/machine context
  OUTPUT: Combined setup sheet with all operations sequenced
  USE CASE: "Plan all 6 operations for this bracket"
```

### New Skills for R3

```
SKILL: prism-job-planning
  LOCATION: skills-consolidated/prism-job-planning/SKILL.md
  PURPOSE: Teach Claude how to orchestrate the full job planning workflow
  TRIGGERS: "plan this job", "what parameters should I use", "set up this operation",
            "how should I machine this", "help me program this part"
  CONTENT:
    - When to call job_plan vs individual calcs (complexity threshold)
    - How to extract material, machine, tool from natural language
    - How to handle ambiguous requests ("rough this pocket" — what material? what machine?)
    - How to present results (setup sheet format, parameter table, safety callouts)
    - When to suggest what_if for comparison
    - How to chain uncertainty_chain after job_plan for confidence assessment
    - Common pitfalls (units confusion, wrong tool type for operation, etc.)

SKILL: prism-manufacturing-advisor
  LOCATION: skills-consolidated/prism-manufacturing-advisor/SKILL.md
  PURPOSE: Teach Claude to act as an experienced manufacturing engineer
  TRIGGERS: "what do you recommend", "best approach for", "how would you machine",
            "what's the best strategy", "I'm having trouble with"
  CONTENT:
    - Decision framework for strategy selection (when trochoidal vs conventional vs HSM)
    - Material-specific advice patterns (Inconel = slow/rigid, aluminum = fast/light cuts)
    - Machine capability awareness (don't recommend 5-axis strategy on 3-axis machine)
    - Tool selection logic (when carbide vs ceramic vs CBN)
    - Troubleshooting framework (chatter → check overhang/RPM, poor finish → check feed/nose radius)
    - Cost vs quality tradeoffs (production vs prototype mindset)
    - Safety awareness (always check tool breakage risk, never exceed machine limits)

SKILL: prism-setup-sheet
  LOCATION: skills-consolidated/prism-setup-sheet/SKILL.md
  PURPOSE: Teach Claude how to generate professional setup sheets
  TRIGGERS: "setup sheet", "tool list", "operation sheet", "machining instructions"
  CONTENT:
    - Standard setup sheet format (header, tool list, operation sequence, parameters, notes)
    - What information is critical for shop floor (tool numbers, offsets, speeds, feeds)
    - How to include safety warnings (max force, chatter risk zones, thermal limits)
    - How to format for printing (clean layout, no unnecessary decoration)
    - How to include fixture/workholding instructions
    - QC checkpoint callouts (measure after roughing, check surface finish before final pass)
```

---

## PHASE R7: INTELLIGENCE EVOLUTION — Skills, Scripts & Hooks to Create

### New Hook File: PhysicsValidationHooks.ts

```typescript
// src/hooks/PhysicsValidationHooks.ts — category #15

HOOK: surface_integrity_bounds_check
  TRIGGER: post-calc on surface_integrity_predict
  PURPOSE: Verify physics predictions are within realistic bounds
  LOGIC:
    - Ra must be > 0 and < 50 μm (impossible outside this range)
    - Residual stress must be < material tensile strength
    - Temperature must be < material melting point
    - White layer thickness must be < DOC
  MODE: blocking
  PRIORITY: critical

HOOK: chatter_stability_sanity
  TRIGGER: post-calc on chatter_predict
  PURPOSE: Verify stability lobe diagram is physically valid
  LOGIC:
    - Critical depth must be > 0
    - Recommended RPMs must be within machine range
    - Dominant frequency must be > 0 and < Nyquist limit
    - Stability margin must be 0-1
  MODE: blocking
  PRIORITY: critical

HOOK: optimization_constraint_enforcer
  TRIGGER: pre-output on optimize_parameters
  PURPOSE: Verify optimized parameters don't violate safety constraints
  LOGIC:
    - ALL solutions in Pareto front must have S(x) ≥ 0.70
    - No solution can exceed machine power/torque/RPM limits
    - No solution can produce force > tool breakage threshold
    - Remove unsafe solutions from output before presenting to user
  MODE: blocking
  PRIORITY: critical
  TAGS: [safety, optimization, pre-output]

HOOK: fixture_clamp_force_safety
  TRIGGER: post-calc on fixture_recommend
  PURPOSE: Verify clamping force recommendation is safe
  LOGIC:
    - Safety factor must be ≥ 2.0 (clamp force / max cutting force)
    - Clamp force must not exceed part material yield (would deform part)
    - Deflection must be < tightest tolerance on part
  MODE: blocking
  PRIORITY: critical
  TAGS: [safety, workholding]

HOOK: job_learning_data_quality
  TRIGGER: pre-write on job_record
  PURPOSE: Validate recorded job data before storing
  LOGIC:
    - Cutting speed must be > 0 and within 5x of formula recommendation
    - Tool life must be > 0 minutes
    - Surface finish must be > 0 μm
    - Reject entries where all outcomes are suspiciously identical (copy-paste)
  MODE: warning (store but flag for review)
  PRIORITY: high

HOOK: schedule_feasibility_check
  TRIGGER: post-calc on shop_schedule
  PURPOSE: Verify schedule is physically feasible
  LOGIC:
    - No machine has overlapping jobs
    - All jobs assigned to capable machines
    - Total makespan is finite
    - Rush jobs are actually scheduled before their due dates
  MODE: blocking
  PRIORITY: high
```

**Estimated: 6 new hooks in PhysicsValidationHooks.ts**

### New Scripts for R7

```
SCRIPT: physics_benchmark
  PURPOSE: Validate physics engines against known published data
  INPUT: benchmark_set ('tool_life_taylor', 'surface_finish_ra', 'chatter_altintas')
  OUTPUT: Prediction vs published value, % error, pass/fail
  USE CASE: Run after any physics engine modification to catch regressions

SCRIPT: learning_report
  PURPOSE: Generate report from accumulated job data
  INPUT: filters (material, machine, date_range)
  OUTPUT: Trends, anomalies, parameter adjustments, sample sizes
  USE CASE: Weekly/monthly review of PRISM's learning accuracy

SCRIPT: optimization_sensitivity_report
  PURPOSE: Generate sensitivity analysis for optimized parameters
  INPUT: optimize_parameters result
  OUTPUT: Tornado chart data showing which variables have most impact
  USE CASE: Help user understand "what matters most for this cut"

SCRIPT: fixture_load_calculator
  PURPOSE: Quick standalone fixture force calculation
  INPUT: cutting_force_n, friction_coefficient, safety_factor
  OUTPUT: Required clamp force, contact pressure, recommended fixture type
  USE CASE: Quick sanity check without full fixture_recommend workflow

SCRIPT: catalog_extraction_report
  PURPOSE: Report on catalog extraction progress and quality
  INPUT: catalog_name or 'all'
  OUTPUT: Pages processed, tools extracted, validation pass rate, gaps
  USE CASE: Track MS6 catalog extraction progress
```

### New Skills for R7

```
SKILL: prism-physics-advisor
  LOCATION: skills-consolidated/prism-physics-advisor/SKILL.md
  PURPOSE: Teach Claude to explain physics predictions to users
  TRIGGERS: "why is the surface finish predicted at X", "explain the chatter risk",
            "what causes white layer", "how does thermal growth work"
  CONTENT:
    - How to explain surface integrity results in plain language
    - When to recommend cryogenic vs flood vs MQL (based on physics)
    - How to interpret stability lobe diagrams for a machinist
    - Thermal compensation workflow (warm up → measure → offset → verify)
    - When physics predictions should override handbook values (and when not to)

SKILL: prism-optimization-guide
  LOCATION: skills-consolidated/prism-optimization-guide/SKILL.md
  PURPOSE: Teach Claude how to present and explain optimization results
  TRIGGERS: "optimize my parameters", "what's the cheapest way", "minimize cycle time",
            "best balance of cost and quality"
  CONTENT:
    - How to present Pareto fronts in plain language ("you can save $2 per part
      by accepting 0.3μm worse surface finish")
    - When to recommend min_cost vs min_time vs balanced
    - How to explain sensitivity analysis
    - How to handle infeasible constraints ("your tolerance requires grinding,
      milling can't achieve Ra 0.2")
    - Production vs prototype optimization differences

SKILL: prism-shop-scheduler
  LOCATION: skills-consolidated/prism-shop-scheduler/SKILL.md
  PURPOSE: Teach Claude how to help with shop floor scheduling
  TRIGGERS: "schedule these jobs", "which machine should run", "we're behind schedule",
            "machine utilization", "bottleneck"
  CONTENT:
    - How to gather job info from natural language
    - How to present schedule results (timeline view, machine assignments)
    - How to explain bottlenecks and suggest solutions
    - When to recommend outsourcing vs overtime vs rescheduling
    - How to handle rush order insertion into existing schedule

SKILL: prism-workholding-advisor
  LOCATION: skills-consolidated/prism-workholding-advisor/SKILL.md
  PURPOSE: Teach Claude to recommend and explain workholding
  TRIGGERS: "how should I hold this part", "fixture recommendation", "clamping force",
            "part is deflecting", "vibration during cutting"
  CONTENT:
    - Decision tree: vise vs fixture plate vs chuck vs vacuum vs magnetic
    - How to explain deflection analysis results
    - Soft jaw design guidance
    - When to recommend custom fixtures vs standard workholding
    - How to handle thin-wall and flexible parts
```

---

## PHASE R8: USER EXPERIENCE — Skills, Scripts & Hooks to Create

### New Hook File: ExperienceHooks.ts

```typescript
// src/hooks/ExperienceHooks.ts — category #16

HOOK: intent_decomposition_validate
  TRIGGER: post-decomposition in IntentDecompositionEngine
  PURPOSE: Verify decomposed intent chain is valid before execution
  LOGIC:
    - All referenced actions exist in dispatcher registry
    - Data dependencies are satisfied (can't call speed_feed before material_get)
    - Chain length is reasonable (< 15 actions — if more, something is wrong)
    - No circular dependencies
  MODE: blocking
  PRIORITY: critical

HOOK: response_complexity_adapter
  TRIGGER: pre-output on all intelligence actions
  PURPOSE: Adapt response detail to user's detected expertise level
  LOGIC:
    - If user appears to be machinist (uses shop floor language) → practical format
    - If user appears to be programmer (uses CAM terminology) → technical format
    - If user appears to be manager (asks about cost/schedule) → business format
    - Detection based on vocabulary analysis of user query
  MODE: advisory (sets context flag, doesn't block)
  PRIORITY: normal

HOOK: workflow_chain_monitor
  TRIGGER: per-step during workflow execution
  PURPOSE: Track workflow chain progress and handle partial failures
  LOGIC:
    - Log each step completion with timing
    - If step fails, determine if chain can continue (degraded) or must stop
    - Accumulate partial results for best-effort response
  MODE: logging
  PRIORITY: high

HOOK: first_interaction_detector
  TRIGGER: pre-calc on any intelligence action
  PURPOSE: Detect new users and add onboarding context
  LOGIC:
    - Check if user has any job history (job_record entries)
    - If zero history → set flag for simplified explanations and guided workflow
    - Suggest calibration: "What machine do you primarily use?" / "What materials?"
  MODE: advisory
  PRIORITY: normal
```

### New Skills for R8

```
SKILL: prism-conversational-manufacturing
  LOCATION: skills-consolidated/prism-conversational-manufacturing/SKILL.md
  PURPOSE: THE core skill — teaches Claude how to be a manufacturing intelligence partner
  TRIGGERS: Any manufacturing-related query from any user
  CONTENT:
    - How to detect user intent from natural language
    - How to ask the RIGHT clarifying questions (not 10 questions, just the critical ones)
    - How to present results at the right level (machinist vs programmer vs manager)
    - How to chain actions invisibly (user says one thing, Claude calls 9 actions)
    - How to handle "I don't know" (user doesn't know their material → guide them)
    - How to build trust (show your work, explain safety flags, admit uncertainty)
    - How to remember context across a conversation (part geometry carries forward)
    - Common manufacturing conversations and optimal response patterns
    - When to suggest alternatives the user didn't ask for
    - How to handle imperial vs metric gracefully

SKILL: prism-onboarding
  LOCATION: skills-consolidated/prism-onboarding/SKILL.md
  PURPOSE: Guide new users through first interaction
  TRIGGERS: First message from user with no history, "how do I use PRISM",
            "what can you do", "help me get started"
  CONTENT:
    - 60-second first-value script (ask machine + material → give one useful parameter)
    - Progressive capability discovery (don't dump 50 features, reveal as needed)
    - Calibration questions (machine type, typical materials, operation types)
    - "Try this" examples for each user persona
    - How to handle "I'm just browsing" vs "I need help NOW"
```

---

## PHASE R9: REAL-WORLD INTEGRATION — Hooks to Create

### New Hook File: IntegrationHooks.ts

```typescript
// src/hooks/IntegrationHooks.ts — category #17

HOOK: mtconnect_data_validate
  TRIGGER: on-receive from MTConnect data stream
  PURPOSE: Validate incoming machine data before processing
  LOGIC:
    - Spindle load must be 0-150% (sensor error if outside)
    - Temperature must be -10°C to 200°C (sensor error if outside)
    - Position values must be within machine travel limits
    - Reject stale data (timestamp > 30 seconds old)
  MODE: blocking
  PRIORITY: critical

HOOK: cam_plugin_parameter_sync
  TRIGGER: on-send to CAM plugin
  PURPOSE: Verify parameters sent to CAM system are safe
  LOGIC:
    - Re-validate S(x) ≥ 0.70 before pushing to CAM
    - Verify units match CAM system expectations (inch vs mm)
    - Log all parameter pushes for audit trail
  MODE: blocking
  PRIORITY: critical
  TAGS: [safety, integration, cam]

HOOK: dnc_transfer_safety
  TRIGGER: pre-transfer on DNC send
  PURPOSE: Final safety gate before sending program to machine
  LOGIC:
    - Parse G-code for rapid moves near workpiece
    - Check for missing tool length compensation (G43)
    - Verify program number doesn't conflict with existing programs
    - Require explicit user confirmation for first-time programs
  MODE: blocking
  PRIORITY: critical
  TAGS: [safety, dnc, life-critical]
```

---

## SUMMARY: WHAT GETS CREATED PER PHASE

| Phase | New Hooks | New Scripts | New Skills | New Hook File |
|-------|-----------|-------------|------------|---------------|
| R1 | 3 | 3 | 1 | — (add to ManufacturingHooks.ts) |
| R3 | 7 | 4 | 3 | IntelligenceHooks.ts |
| R7 | 6 | 5 | 4 | PhysicsValidationHooks.ts |
| R8 | 4 | 0 | 2 | ExperienceHooks.ts |
| R9 | 3 | 0 | 0 | IntegrationHooks.ts |
| **TOTAL** | **23** | **12** | **10** | **4 new files** |

### Post-Creation Totals (base plan R1+R3+R7+R8+R9 only — see v14.3 Additions for full totals)
| Asset | Before | After Base Plan | Growth |
|-------|--------|-----------------|--------|
| Hooks (registered) | 62 | 85 (62+23) | +37% |
| Hook categories | 13 | 17 | +4 new categories |
| Skills (relevant) | ~20 active | ~30 active | +10 purpose-built |
| Scripts | 1,320 (registered) | 1,332 | +12 with actual implementations |

### Integration Requirements
After creating each hook file:
1. Import in `src/hooks/index.ts` → add to `allHooks` array
2. Update `hookCounts` object with new category
3. Add category description to `categoryDescriptions`
4. Run `npm run build` to verify compilation
5. Restart Claude Desktop to pick up new hooks

After creating each skill:
1. Create directory in `skills-consolidated/[skill-name]/`
2. Write `SKILL.md` with triggers, content, examples
3. SkillAutoLoader picks it up automatically at next boot

After creating each script:
1. Register in SCRIPT_REGISTRY.json with category, input/output schema
2. Implement in ScriptExecutor or as standalone .ts
3. Add to ScriptRegistry for discoverability

---

## DEVELOPMENT-ACCELERATION SKILLS (Create Immediately)

These skills help Claude build PRISM better during development sessions:

```
SKILL: prism-phase-executor
  PURPOSE: Teach Claude how to execute a roadmap phase milestone correctly
  CONTENT:
    - Read phase doc → identify current MS → read MS steps → execute in order
    - When to use str_replace vs file rewrite
    - How to verify after each change (build, test, check line counts)
    - Anti-regression protocol (read existing → plan changes → verify no loss)
    - How to handle "MS blocked by dependency" situations
    - How to update CURRENT_POSITION.md after completing a MS

SKILL: prism-engine-builder
  PURPOSE: Teach Claude how to create new engine files correctly
  CONTENT:
    - Standard engine file structure (imports, class, constructor, methods, export)
    - How to integrate with existing engines (import, call, handle errors)
    - Safety validation requirements (S(x) checks, bounds checking)
    - How to wire engine to dispatcher (add action handler, register types)
    - Testing requirements (unit test, integration test, hand-calc verification)
    - How to create companion hook for the engine

SKILL: prism-hook-builder
  PURPOSE: Teach Claude how to create new hooks correctly
  CONTENT:
    - Hook definition structure (id, trigger, mode, priority, category, tags)
    - When to use blocking vs warning vs logging
    - How to register in index.ts
    - How to test hooks (mock trigger, verify behavior)
    - Priority guidelines (critical = life safety, high = data quality, normal = UX)
```

---

## EXECUTION ORDER

The skills/scripts/hooks for each phase should be created **during** that phase's
implementation, not as a separate pass. Specifically:

1. **Before implementing an action**: Create the skill that teaches Claude how to use it
2. **While implementing an action**: Create the hook that validates its output
3. **After implementing an action**: Create the script that automates common uses

This ensures every new feature ships with its safety net (hooks), its documentation
(skills), and its automation layer (scripts) — not just its engine code.

---

*Every action without a hook is a safety gap. Every action without a skill is a usability gap.
Every workflow without a script is an efficiency gap. Build all three together or don't ship.*

---

## v14.3 ADDITIONS — NEW COMPANION ASSETS BY PHASE

### PHASE DA: Development Acceleration
```
HOOKS (5): context_pressure_flush, pre_phase_gate_check, post_compaction_recovery,
           session_handoff_reminder, build_size_monitor
SCRIPTS (7): session_startup, session_shutdown, context_audit,
             skill_utilization_report, parallel_readiness_check,
             new_action_scaffold, new_engine_scaffold
  new_action_scaffold: Input: dispatcher name, action name, effort tier.
    Output: Stub action handler, EFFORT_MAP entry, ActionName union addition,
    JSON Schema enum update, test file template. Eliminates 6-file manual wiring.
  new_engine_scaffold: Input: engine name, calculation type, safety-critical (bool).
    Output: Stub engine class, dispatcher wiring, companion hook template, unit test
    template, cross-field validation stub (if safety-critical). Eliminates 8-file wiring.
SKILLS (11): prism-session-management, prism-context-engineering,
             prism-parallel-execution, prism-ralph-validation,
             prism-mcp-development, prism-app-development, prism-claude-code-mastery,
             prism-dispatcher-development, prism-engine-development,
             prism-registry-development, prism-testing-patterns
  prism-mcp-development: How to develop the PRISM MCP server itself — TypeScript patterns,
    project structure, import conventions, build system, debugging workflow.
  prism-dispatcher-development: Step-by-step for adding a new dispatcher action — which files
    to modify (action handler, EFFORT_MAP, ActionName, JSON Schema enum, test), verification
    sequence, common pitfalls (forgetting EFFORT_MAP → defaults to max, forgetting enum → 400 error).
  prism-engine-development: How to create a new calculation engine — file structure, registry
    integration, AtomicValue returns, uncertainty propagation, wiring to dispatcher, companion
    hook creation, unit test requirements.
  prism-registry-development: How to add/extend registries — BaseRegistry extension, JSON schema
    with SCHEMA_VERSION, loader normalization, data dispatcher wiring, health endpoint addition,
    DataValidationEngine rules, MASTER_INDEX count updates.
  prism-testing-patterns: Test patterns for PRISM — unit tests (isolated function), integration
    tests (dispatcher round-trip), safety tests (S(x) gate verification), regression tests
    (golden dataset comparison), benchmark tests (50-calc matrix), how to add to R2 matrix.
  prism-app-development: How to build PRISM frontend — app architecture, component structure,
    MCP server communication, design system patterns, safety-critical display rules.
  prism-claude-code-mastery: Optimal Claude Code usage for PRISM development — parallel subagent
    patterns (when to fan out, how to merge), /compact timing (after MS completion, after large
    file reads), background agent strategies (batch loads, catalog extraction), model switching
    decision tree (Haiku for grep/exploration, Sonnet for implementation, Opus for safety).
CHAINS (4): boot_and_resume, calc_and_validate, registry_query, debug_and_fix
```

### PHASE R1: Registry (expanded)
```
HOOKS (3): data_validation_gate, tool_schema_completeness, material_enrichment_validate
SCRIPTS (3): registry_health_check, material_search_diagnostic, tool_coverage_report
SKILLS (1): prism-data-diagnostics
```

### PHASE R2: Safety (expanded)
```
HOOKS (5): calc_regression_gate (MS1.5), calc_benchmark_drift,
           test_result_integrity, benchmark_expected_freeze, calc_matrix_completion_gate
  test_result_integrity: post-write on R2 result files — verify recorded results match
    actual calc output (prevents transcription errors in the 50-calc matrix)
  benchmark_expected_freeze: pre-modify on CALC_BENCHMARKS.json — block silent changes to
    expected values without explicit rationale logged to PHASE_FINDINGS.md
  calc_matrix_completion_gate: pre-gate at R2 exit — verify all 50 calcs have results,
    no placeholders, no SKIP entries without documented justification
SCRIPTS (1): calc_benchmark_runner
```

### PHASE R3: Intelligence (expanded)
```
HOOKS (3): unit_consistency_check, formula_registry_consistency, wiring_registry_check
SCRIPTS (2): job_plan_demo, formula_coverage_audit
SKILLS (3): prism-tolerance-advisor, prism-controller-expert, prism-formula-navigator
```

### PHASE R4: Enterprise (expanded)
```
HOOKS (4): api_rate_limit, api_auth_validate, schema_backward_compat, api_versioning_check
  schema_backward_compat: pre-deploy — verify new schema is superset of old schema
    (no removed/renamed fields, new required fields have defaults)
  api_versioning_check: pre-deploy — verify action enum updated, EFFORT_MAP entry added,
    ActionName union updated for any new action
```

### PHASE R5: Frontend (NEW)
```
HOOKS (3): accessibility_audit, performance_budget, component_safety_gate
  accessibility_audit: post-build on frontend — verify ARIA labels, keyboard nav, color contrast
  performance_budget: post-build on frontend — bundle size < 500KB, LCP < 2.5s, no blocking scripts
  component_safety_gate: pre-render on safety-critical display — verify S(x) score displayed
    with correct color coding (red < 0.70, yellow 0.70-0.85, green > 0.85), no rounding errors
```

### PHASE R7: Intelligence Evolution (expanded)
```
HOOKS (5): coupled_physics_convergence, coupled_physics_divergence_alert,
           sustainability_bounds, optimization_convergence, learning_data_quality
SCRIPTS (2): coupled_physics_demo, sustainability_comparison
SKILLS (2): prism-sustainability-advisor, prism-coupled-physics
```

### PHASE R8: User Experience (expanded)
```
HOOKS (2): skill_routing_fallback, workflow_completion_rate
SKILLS (22): 12 user workflow skills + 10 user assistance skills (see PHASE_R8)
```

### PHASE R11: Product Packaging (NEW)
```
HOOKS (2): product_safety_gate, product_api_versioning
SKILLS (4): prism-sfc-guide, prism-ppg-guide, prism-shop-manager-guide, prism-acnc-guide
```

---

## v14.3 TOTALS SUMMARY

```
                     v14.1    v14.3    Delta    Notes
HOOKS:               23       55       +32      +3 R2, +2 R4, +3 R5 (new), +8 vs v14.2
SCRIPTS:             12       27       +15      +2 scaffolding scripts in DA
SKILLS:              10       53       +43      +7 dev skills in DA (includes 22 app skills)
CHAINS:              0        4        +4
NEW ACTIONS:         14       25       +11

Total new assets:    59       164      +105

GRAND TOTALS (existing system + all new assets):
  Hooks:    62 existing + 23 base + 32 additions = 117 registered
  Scripts:  1,320 existing + 12 base + 15 additions = 1,347 registered (174 implemented)
  Skills:   126 existing + 10 base + 43 additions = 179 directories (~152 with content)
```

