# PRISM ROADMAP v13.2 — TOOL & FEATURE UTILIZATION COVERAGE AUDIT
# Auditor: Claude Opus 4.6 | Senior MCP Architecture & Anthropic AI Development Specialist
# Date: 2026-02-14
# Scope: Is every step tool-deterministic? Where would an executor hesitate?

---

## EXECUTIVE VERDICT

The v13.2 roadmap is **approximately 82% tool-deterministic** — meaning for 82% of steps, an executor knows exactly which dispatcher, action, effort level, schema, and pattern to use. This is strong for phases P0, R1, and R2. However, there are **23 specific gaps** where tool selection is ambiguous, undocumented, or missing entirely, clustered in four categories:

1. **DISPATCHER/ACTION GAP** (8 findings) — Steps name a subsystem but not the exact dispatcher.action syntax
2. **EFFORT TIER GAP** (4 findings) — Steps missing explicit effort assignment despite the tier system being defined
3. **HOOK/SKILL/CADENCE GAP** (5 findings) — The hook, skill, and cadence systems are verified to exist but never prescribed for USE during execution
4. **STUB PHASE GAP** (6 findings) — R3-R6 stubs reference patterns but lack the step-level tool prescription that P0-R2 have

**To make it bulletproof: 23 specific fixes needed, totaling ~2-3 hours of documentation work.**

---

## CATEGORY 1: DISPATCHER/ACTION GAPS (Exact Call Missing)

### FINDING 1.1 — P0-MS1 Guard Wiring: No Dispatcher Specified for Pattern Scan
**Location:** PHASE_P0_ACTIVATION.md, lines 258-260
**Problem:** Steps 8-9 say "Read guardDispatcher.ts" and "Wire pattern_scan to TelemetryEngine anomalies" — but never specify the actual prism_ call to TEST the wired result. Step 11 says "pattern_scan returns real data" but the AUDIT section (step 1-2) only called `prism_skill_script` and `prism_skill_script`, not `prism_guard`.
**Ambiguity:** An executor doesn't know whether to call `prism_guard action=pattern_scan` or `prism_guard action=lkg_status` or both, with what parameters, at what effort level.
**Fix:** Add explicit verify steps:
```
11a. prism_guard action=pattern_scan → must return structured data (not empty/placeholder)  [effort=medium]
11b. prism_guard action=lkg_status → must return valid state JSON  [effort=low]
```

### FINDING 1.2 — P0-MS2 Cadence Verification: No Runtime Test
**Location:** PHASE_P0_ACTIVATION.md, lines 288-290
**Problem:** Steps 6-7 search source code for cadence registrations (code_search), but never actually FIRE a cadence function to verify it works at runtime. The 30+ cadence functions are verified to be *registered* but never verified to *execute*.
**Ambiguity:** Are cadence functions tested by triggering a build (which fires gsd_sync)? By waiting for a timer? By explicit invocation? No tool call specified.
**Fix:** Add:
```
7b. Trigger one cadence function manually:
    prism_dev action=build target=mcp-server → verify gsd_sync fires (check gsd_quick output timestamp)
    This proves the cadence executor is wired AND at least one function fires.
```

### FINDING 1.3 — P0-MS4 AutoPilot Verification: Incomplete Test
**Location:** PHASE_P0_ACTIVATION.md, lines 340-344
**Problem:** Step 4 says "Fix if broken. Build. Verify gsd_quick returns current version." But the SEQUENCING GUIDES reference (line 218) says "P0-MS4: AutoPilot wiring (needs S3.5, S3.8 guide sequences)" — yet no step loads or tests these guide sequences.
**Ambiguity:** Does MS4 need to verify S3.5 and S3.8 guide sequences work? Or just that AutoPilot parses the GSD file?
**Fix:** Add explicit scope note:
```
4b. SCOPE: This MS verifies AutoPilot PARSING and gsd_sync CADENCE.
    Integration chain testing (S3.5, S3.8) happens in MS8.
    Do NOT load §Sequencing Guides here — save tokens for MS8.
```

### FINDING 1.4 — P0-MS5 Generator: Minimal Test, No Output Verification
**Location:** PHASE_P0_ACTIVATION.md, lines 361-363
**Problem:** Step 3 says `prism_generator action=generate_hook template="test_hook"` but doesn't specify what a VALID output looks like. "Verify generator works" — by what criteria?
**Ambiguity:** Does the generator output get registered? Inspected? Compared against a schema? Deleted after test?
**Fix:**
```
3. prism_generator action=generate_hook template="test_hook" → output must contain:
   - Valid hook name (string, non-empty)
   - Valid trigger definition (object with event + condition)
   - Valid action definition (object with dispatcher + action)
   If output is a placeholder/template-only → KNOWN-WILL-FIX. If real hook → PASS.
3b. Do NOT register the generated test hook (avoid polluting hook list before MS8).
```

### FINDING 1.5 — P0-MS7 Manus: "status" Is Not a Known Action
**Location:** PHASE_P0_ACTIVATION.md, line 415
**Problem:** Step 9 says `Manus: status → responsive` but the dispatcher is `prism_manus` and the action surface isn't documented. Is it `prism_manus action=status`? The Manus dispatcher provides context engineering and TeammateTools — "status" may not be a real action.
**Ambiguity:** What's the actual call? What does "responsive" mean — HTTP 200? Non-error? Specific response shape?
**Fix:** Verify against MASTER_INDEX.md action list. Replace with actual action:
```
9. prism_manus action=status → response must not be error/timeout  [effort=low]
   IF action=status does not exist → use prism_manus action=list or action=help
   PASS criteria: dispatcher responds with valid JSON, not error.
```

### FINDING 1.6 — R1-MS3 Pipeline: No Explicit Effort per Sub-Call
**Location:** PHASE_R1_REGISTRY.md, lines 206-213
**Problem:** Pipeline tests chain multiple calls (material_get → speed_feed → safety_score) but don't specify effort per sub-call. material_get is HIGH, speed_feed is MAX, safety is MAX per the tier classification. But the pipeline test doesn't state this.
**Ambiguity:** Does the pipeline test use the effort tiers from Protocols Core, or does it run all at HIGH since this is a pipeline test rather than a production calc?
**Fix:** Add inline effort annotations:
```
2. Pipeline: material_get("4140") [effort=high] → speed_feed(material, operation="turning") [effort=max]
   → safety_score [effort=max, structured output]
   Effort tiers from §Effort Tier Classification apply to pipeline tests identically to production.
```

### FINDING 1.7 — R2-MS1.5 AI Edge Case Generation: Which Dispatcher?
**Location:** PHASE_R2_SAFETY.md, lines 164-177
**Problem:** Step 1 says "Feed formula definitions + material schema + the 6 manual edge cases. PROMPT: ..." — but doesn't specify WHICH tool makes this call. Is this `prism_orchestrate action=agent_execute agent=opus task="..."`? Is it `prism_ralph action=scrutinize`? A raw API call? The prompt is written in natural language but the dispatcher is unspecified.
**Ambiguity:** This is the ONLY step in the entire roadmap that prescribes a free-form prompt without naming the tool. Every other step names the dispatcher.action explicitly.
**Fix:**
```
1. prism_orchestrate action=agent_execute agent=opus [effort=max]
   task="Given these formulas and schemas: [attach formula defs + material schema + 6 edge cases]
   Identify 10-15 input combinations that are mathematically valid but would produce..."
   
   WHY agent_execute: This is a novel reasoning task, not a structured calculation.
   The agent has full Opus 4.6 adaptive thinking at effort=max.
   Output: unstructured analysis (classify results in step 2).
```

### FINDING 1.8 — R2-MS2 Fix Cycle: "Read calc function (BOUNDED)" — Which File?
**Location:** PHASE_R2_SAFETY.md, lines 206-208
**Problem:** "Read calc function (BOUNDED)" doesn't specify which file or dispatcher to use for reading. Is it `prism_dev action=file_read path="src/dispatchers/calcDispatcher.ts"`? `prism_dev action=code_search`? The (BOUNDED) hint helps but the tool call is incomplete.
**Ambiguity:** An executor would need to search for the calc function location first, adding an unbudgeted call.
**Fix:**
```
For each FORMULA and VALIDATION fix:
  a. prism_dev action=code_search pattern="[formula_name]" path="src/" → locate function [effort=high]
  b. prism_dev action=file_read path="[result from a]" start_line=X end_line=Y → read BOUNDED [effort=low]
  c. str_replace → fix → build → re-run failing test [effort=max on re-run]
```

---

## CATEGORY 2: EFFORT TIER GAPS (Tier Not Specified)

### FINDING 2.1 — P0-MS0 Dispatcher Verification Batches: No Effort on Test Calls
**Location:** PHASE_P0_ACTIVATION.md, lines 192-208
**Problem:** Batch 1-4 test all 31 dispatchers but don't specify effort levels for the test calls. prism_calc should be MAX. prism_data should be HIGH. prism_session should be LOW. The effort tier classification exists in Protocols Core but the MS steps don't reference it.
**Ambiguity:** Does "test each dispatcher" mean call it at its classified effort? Or at LOW since these are diagnostic?
**Fix:** Add to the batch instruction header:
```
Use CLASSIFIED EFFORT per §Effort Tier Classification for each dispatcher test.
Exception: BASELINE-INVALID dispatchers use effort=high (need reasoning to diagnose failures).
WHY: Testing at production effort validates the effort tier wiring itself.
```

### FINDING 2.2 — P0-MS0 Steps 1-5 (Audit Phase): No Effort Specified
**Location:** PHASE_P0_ACTIVATION.md, lines 63-80
**Problem:** The code_search and file_read calls in the audit phase have no effort annotation. code_search is classified as HIGH in the tier table, but file_read is LOW. These 10+ calls have no explicit effort.
**Ambiguity:** Minor — an executor would likely use the tier table — but every OTHER section annotates effort. This one doesn't.
**Fix:** Add `[effort=high]` to code_search calls and `[effort=low]` to file_read calls in the audit section.

### FINDING 2.3 — R1-MS4 Coverage Audit: Missing Effort on All Steps
**Location:** PHASE_R1_REGISTRY.md, lines 234-245
**Problem:** None of the 6 steps in MS4 have effort annotations. Steps 1-2 are analytical (should be high), steps 3 are conditional fixes (high), steps 4-6 are documentation (low).
**Fix:** Annotate each step.

### FINDING 2.4 — R2-MS2 Fix Cycle: Missing Effort on Triage Step
**Location:** PHASE_R2_SAFETY.md, lines 203-204
**Problem:** "TRIAGE all failures from MS0 + MS1 + MS1.5" — this is a reasoning task that should be HIGH or MAX but has no annotation.
**Fix:** `=== TRIAGE all failures [effort=high — reasoning over failure patterns] ===`

---

## CATEGORY 3: HOOK/SKILL/CADENCE UTILIZATION GAPS

### FINDING 3.1 — Skills Are Verified But Never INVOKED During Execution
**Location:** Entire roadmap
**Problem:** P0-MS1 verifies 119 skills are registered. The Role Protocol (PROTOCOLS_REFERENCE §Role Protocol) lists specific skills per phase:
  - P0: prism-system-architecture, prism-hook-system, prism-dev-utilities
  - R1: prism-material-science, prism-formula-registry, prism-data-loading
  - R2: prism-speed-feed-calc, prism-kienzle-force, prism-taylor-tool-life, prism-thread-calcs

But NO milestone step anywhere says `prism_skill_script action=skill_load skill="prism-speed-feed-calc"`. The skills exist, are verified, but are never actually LOADED for use.
**Ambiguity:** When should skills be loaded? At session boot (Step 1.5)? Before the first calc in each phase? Before each MS? The Role Protocol says "Load skills:" but the Boot Protocol doesn't include a skill_load step.
**Impact:** Law 6 (100% UTILIZATION) — "If it exists, it must work and be used." Skills exist but are never used.
**Fix:** Add to Boot Protocol Step 1.5:
```
STEP 1.5: ADOPT PHASE ROLE
  Read current phase role from §Role Protocol.
  prism_skill_script action=skill_load skill="[role-specific-skill-1]"  [effort=low]
  prism_skill_script action=skill_load skill="[role-specific-skill-2]"  [effort=low]
  State the role in first response.
  
  NOTE: skill_load primes the skill context. Cost: ~1-2 calls, ~0.5KB each.
  Loaded skills inform responses for the entire session.
```

### FINDING 3.2 — Hooks Are Verified But Never ENABLED for Phase Execution
**Location:** PROTOCOLS_REFERENCE §Role Protocol vs. phase docs
**Problem:** The Role Protocol specifies hooks per phase:
  - P0: Enable on_failure
  - R1: Enable on_failure
  - R2: Enable smart_reflection
  - R3: Enable batch_quality
  - R4: Enable on_failure + smart_reflection
  - R6: Enable on_failure

But NO milestone step says `prism_hook action=enable hook="on_failure"` or equivalent. Hooks are registered in P0-MS2 (62+) and their coverage is verified, but they are never ACTIVATED for the phase they're supposed to protect.
**Ambiguity:** Are hooks auto-firing (cadence-based) or do they need explicit enabling? If auto-firing, how does the executor verify they're active? If manual, where's the enable call?
**Impact:** Hooks are the zero-token-cost enforcement layer. If they're not activated, safety assertions during R2 calcs have no automatic backstop.
**Fix:** Add to Boot Protocol Step 1.5 (alongside skill_load):
```
  ENABLE PHASE HOOKS (from §Role Protocol):
  prism_hook action=enable hook="[role-specified-hook]"  [effort=low]
  Verify: prism_hook action=coverage → phase hooks show ACTIVE.
```

### FINDING 3.3 — Cadence Functions: No Prescription for WHEN They Should Fire
**Location:** PRISM_PROTOCOLS_CORE.md, Boot Protocol; memory mentions 30+ cadence functions
**Problem:** Memory states "30+ cadence fns: todo@5, pressure+attention@8, checkpoint@10, compact@12, survival@15, vary@20, compliance@25, crossHealth@15, gsd_sync@build, docAntiRegression@file-write." But the roadmap never specifies:
  - At which call count should the executor expect todo_update to auto-fire?
  - When pressure@8 fires, should the executor pause for its result?
  - Does gsd_sync firing after build affect the next step's expectations?
**Ambiguity:** The cadence system is background infrastructure. The roadmap treats it as invisible. But when a cadence function fires mid-MS and produces output, an executor might be confused about whether to handle it, wait for it, or ignore it.
**Fix:** Add a cadence awareness note to PROTOCOLS_CORE:
```
CADENCE FUNCTION AWARENESS:
  Cadence functions fire automatically at call-count thresholds.
  They are TRANSPARENT — their output does not require executor action.
  IF a cadence function output conflicts with your current step → ignore the cadence output.
  IF a cadence function triggers context_compress → it will shed completed work, not current step.
  The executor's job is to follow MS steps. Cadence handles hygiene.
  
  EXCEPTION: gsd_sync fires after build. If your next step depends on GSD data,
  wait for gsd_sync to complete before proceeding. Verify: prism_gsd action=quick.
```

### FINDING 3.4 — Manus Laws: Invocation Points Named But No Tool Calls
**Location:** PROTOCOLS_REFERENCE §Manus Law Integration
**Problem:** The Manus Laws section maps 6 laws to invocation points (SESSION START → Law 1, BEFORE EACH STEP → Law 3, etc.) but these are cognitive directives, not tool calls. There's no `prism_context action=manus_check law=3` or equivalent. The mapping is:
  - Manus 4 (Tool Mastery) → Law 4 (MCP FIRST) + Law 6 (100% UTILIZATION)
  - But the roadmap steps never say "Apply Manus Law 4 here"
**Ambiguity:** Are Manus Laws purely for the executor's internal reasoning? Or should they manifest as specific tool calls (e.g., prism_guard action=pattern_scan for anti-regression)?
**Fix:** Clarify that Manus Laws are COGNITIVE GUARDS, not tool calls:
```
Manus Laws are META-COGNITIVE. They do not produce tool calls.
They are INTERNAL CHECKS the executor runs silently before each decision.
The executor does NOT need to invoke a tool for Manus compliance.
The executor DOES need to apply them:
  - Before choosing a tool: "Is there a prism_ dispatcher for this?" (Law 4/Manus 4)
  - After each fix: "Did counts stay >= prior?" (Law 3/Manus 5)
  - At session end: "Did I record what the next session needs?" (Manus 6)
```

### FINDING 3.5 — Agent Teams vs. Direct Swarm: Ambiguous Pattern Selection
**Location:** Multiple phases reference "Agent Teams" and "swarm_execute"
**Problem:** P0-MS8 and R2-MS0 both say `prism_orchestrate action=swarm_execute pattern="parallel_batch"`. But prism_orchestrate has 14 actions and 8 swarm patterns (parallel_batch, sequential_chain, map_reduce, etc.). The roadmap only prescribes `parallel_batch`. When should `sequential_chain` be used? `map_reduce`?
  - R3 batch campaigns: parallel_batch (stated)
  - R4 compliance checks: unstated — parallel or sequential?
  - R6 load testing: unstated — what pattern for 1000+ concurrent requests?
**Fix:** Add pattern selection guide to PROTOCOLS_CORE or PROTOCOLS_REFERENCE:
```
SWARM PATTERN SELECTION:
  parallel_batch:     Independent operations, same structure. (R2 calcs, R3 batches, P0 chains)
  sequential_chain:   Operations where output N feeds input N+1. (Manufacturing chain S3.5)
  map_reduce:         Large dataset → parallel map → single reduce. (R3 full-library validation)
  
  DEFAULT: parallel_batch for anything not explicitly sequential.
  RULE: If operations share mutable state → sequential_chain. Otherwise → parallel_batch.
```

---

## CATEGORY 4: STUB PHASE GAPS (R3-R6 Tool Prescription)

### FINDING 4.1 — R3: No MS-Level Tool Steps
**Location:** PHASE_R3_CAMPAIGNS.md
**Problem:** R3 has 10 mandatory requirements and 5 stub objectives but zero numbered steps with tool calls. The "OPUS 4.6 PATTERNS FOR R3" section names tools (parallel_batch, p-queue, prism_pfp, speed: "fast") but doesn't assign them to specific milestones.
**Ambiguity:** When R3 is expanded via Brainstorm-to-Ship, the expander must invent ALL tool selections from scratch. No anchor exists.
**Fix:** This is by design (stubs expand later), but add to each stub:
```
TOOL ANCHORS (use during Brainstorm-to-Ship expansion):
  MS0: prism_orchestrate action=swarm_execute pattern="parallel_batch" [effort=max] per 50-material batch
  MS1: prism_pfp action=analyze [effort=max] for each PFP calibration run
  MS2: prism_data action=material_search + prism_calc action=speed_feed per gap-fill material
  Between batches: prism_context action=context_compress + context editing (clear completed batch results)
  Quality gate: prism_ralph action=assess + prism_omega action=compute [effort=max]
```

### FINDING 4.2 — R3: ATCS Task Tracking — No Create/Update Calls
**Location:** PHASE_R3_CAMPAIGNS.md, Mandatory Requirement #9
**Problem:** Says "ATCS tracks batch progress: task_init per campaign, batch = subtask." But doesn't provide the exact calls. There are 10 ATCS actions — which ones? task_init, but also task_update? auto_plan? task_complete?
**Fix:** 
```
ATCS CALLS FOR R3:
  Campaign start: prism_atcs action=task_init title="R3 Campaign [N]" priority="high"
  Batch complete: prism_atcs action=task_update task_id=[id] status="batch_[N]_complete"
  Campaign end:   prism_atcs action=task_complete task_id=[id]
  Resume:         prism_atcs action=task_list → find incomplete → continue
```

### FINDING 4.3 — R4: Compliance Templates — Unspecified Actions
**Location:** PHASE_R4_ENTERPRISE.md
**Problem:** Says "Compliance templates: prism_compliance templates for ISO 9001, AS9100, ITAR" but doesn't specify whether this is `action=list_templates`, `action=create_template`, `action=check`, or something else.
**Fix:** Add to stub:
```
COMPLIANCE TOOL ANCHORS:
  Audit existing: prism_compliance action=list_templates [effort=medium]
  Create new:     prism_compliance action=create_template template="ISO_9001" [effort=medium]
  Validate:       prism_compliance action=check target="[material_calc]" template="AS9100" [effort=medium]
```

### FINDING 4.4 — R4: Tenant Isolation — Unspecified Dispatcher Actions
**Location:** PHASE_R4_ENTERPRISE.md
**Problem:** "Multi-tenant isolation: prism_tenant with per-tenant data boundaries" — but prism_tenant's available actions aren't specified. Is it `action=create_tenant`? `action=isolate`? `action=list`?
**Fix:** Add action inventory to stub:
```
TENANT TOOL ANCHORS:
  List tenants:     prism_tenant action=list [effort=low]
  Create tenant:    prism_tenant action=create name="[tenant]" [effort=medium]
  Verify isolation: prism_tenant action=verify tenant_id="[id]" [effort=high]
  Configure compaction: Per-tenant COMPACTION_INSTRUCTIONS with tenant-scoped preservation
```

### FINDING 4.5 — R5: Dashboard — No prism_ Calls at All
**Location:** PHASE_R5_VISUAL.md
**Problem:** R5 is about building visual interfaces. The stub mentions "128K output for reports" and "fine-grained streaming for dashboards" but contains zero prism_ tool calls. This is the ONLY phase with no dispatcher references.
**Ambiguity:** R5 may involve more code-writing than prism_ calls, but the data flowing INTO dashboards must come from dispatchers. Which ones? How are they composed?
**Fix:** Add data source mapping:
```
DASHBOARD DATA SOURCES (dispatcher calls powering each view):
  Safety Dashboard:    prism_validate action=safety → S(x) scores [effort=max]
  Alarm Resolution:    prism_data action=alarm_decode [effort=high, structured output]
  Report Generation:   prism_ralph action=assess [effort=max] + prism_omega action=compute [effort=max]
  Tool Life Tracking:  prism_calc action=tool_life [effort=max] + prism_pfp action=analyze [effort=max]
  Parameter Recommend: prism_calc action=speed_feed [effort=max, structured output]
```

### FINDING 4.6 — R6: npm test as Gate — But Test Content Undefined
**Location:** PHASE_R6_PRODUCTION.md gate requirements
**Problem:** R6 gate says "npm test passes (full regression suite from R2)" — but the test suite is created in R2-MS3 step 3b. If R3/R4/R5 add new calcs or validations, do they extend the test suite? R3 adds 250+ material calcs — are those in npm test by R6?
**Ambiguity:** The test suite growth path from R2 → R6 is undefined. R2-MS3 creates it. R3-R5 presumably extend it. R6 runs it. But no phase between R2 and R6 says "add tests to vitest suite."
**Fix:** Add to PHASE_TEMPLATE.md §Brainstorm Quality Checklist:
```
□ New calculations added to src/__tests__/ vitest suite (regression grows with each phase)
□ Test count documented: R2 baseline N → this phase N+M → cumulative total
```

---

## CATEGORY 5: CROSS-CUTTING CONCERNS (Not Gaps, But Hardening Opportunities)

### FINDING 5.1 — 368 Actions vs. 36 Mapped in EFFORT_MAP
**Status:** DOCUMENTED BUT INCOMPLETE
**Problem:** EFFORT_MAP in PROTOCOLS_CORE maps ~36 actions explicitly. PRISM has 368 actions. The `getEffort()` fallback handles the other 332 by defaulting to 'high'. This is safe (defensive default) but means 90% of actions run at HIGH effort when some should be LOW (reads, lists) or MAX (domain-specific safety calcs added in later phases).
**Recommendation:** The current design is correct for P0 bootstrapping. Add a roadmap step (R1-MS5 or R3 gate) to audit and extend EFFORT_MAP to cover all frequently-used actions. The ActionName type should eventually be derived from the dispatcher registry, not manually maintained.

### FINDING 5.2 — Structured Output Schemas Cover 3 Types — System Has 12+ Return Types
**Status:** INTENTIONAL BUT WORTH NOTING  
**Problem:** Schemas exist for safety calcs, alarm decode, and health. But material_get returns 127 params with no schema. thread_specs returns thread data with no schema. PFP returns predictions with no schema. Only safety-critical returns are schema-enforced.
**Recommendation:** Correct prioritization. Safety calcs MUST have schemas. Others SHOULD get schemas in R4 (API gateway) or R6 (production hardening). Add to R4 stub:
```
STRUCTURED OUTPUT EXPANSION: Extend schemas to material_get, thread_specs, pfp_analyze returns.
```

### FINDING 5.3 — Context Editing (Tool Result Clearing) — Never Actually Called
**Status:** DEFINED BUT NEVER PRESCRIBED
**Problem:** PROTOCOLS_CORE §Additional Opus 4.6 Features defines Context Editing (clear old tool results, clear thinking blocks). PHASE_TEMPLATE §Opus 4.6 Patterns says "CONTEXT EDITING: Clear tool results after consumption?" for each step. But NO milestone step in P0-R2 actually calls context editing.
**Recommendation:** Context editing is supplementary to flush-to-file. Add specific calls to high-throughput MS:
```
R2-MS0 after Group A flush: context_edit → clear Group A tool results (keep flush file reference)
R3 between batches: context_edit → clear completed batch tool results
```

### FINDING 5.4 — Bridge Dispatcher: Health-Only Testing
**Status:** SHALLOW COVERAGE  
**Problem:** prism_bridge is tested only via `action=health` in P0-MS7 and P0-MS8. The bridge is a "multi-protocol API gateway for external system integration" with presumably multiple actions. Only health is ever called.
**Recommendation:** R4 should include bridge hardening:
```
R4 bridge actions: health + rate_limit_test + auth_test + external_api_test
```

---

## CATEGORY 6: WHAT'S ALREADY BULLETPROOF (No Action Needed)

These areas are fully tool-deterministic with zero ambiguity:

1. **Boot Protocol** — Every step has exact dispatcher.action + effort. Recovery cascade has call budgets. Health validation has schema. Position recovery has fallback chain. (10/10)

2. **P0-MS0 Opus 4.6 Configuration** — 25 numbered steps, each with exact file paths, code patterns, verification calls. The most detailed MS in the entire roadmap. (10/10)

3. **P0-MS8 Parallel Chain Execution** — 14 chains with exact dispatcher.action per chain, parallel/dependent classification, flush protocol, gate check, and release validation. (10/10)

4. **R1-MS1 Material Registry Loading** — Diagnosis, fix, verify, count gate pattern with exact prism_ calls, effort tiers, structured output enforcement, and threshold (>=3342). (9/10 — missing effort on some sub-steps)

5. **R2-MS0 50-Calc Test Matrix** — Parallel groups, sorted flush, content verification, micro-checkpoints, dual-gate validation (S(x) + tolerance). Extremely well-specified. (9/10 — AI edge case tool call per Finding 1.7)

6. **Compaction API Configuration** — Hardcoded instructions, exact trigger threshold, explicit fallback cascade with 3 layers and 12-call ceiling. (10/10)

7. **Structured Output Schemas** — Physical bounds, exclusiveMinimum, additionalProperties:false, all params required. Engineering-grade schema design. (10/10)

8. **Effort Tier System** — Type-safe EFFORT_MAP with getEffort() fallback, compile-time exhaustiveness, defensive default. (9/10 — 332 unmapped actions per Finding 5.1)

9. **Error Taxonomy** — PrismError with category + severity, SafetyBlockError, handling rules per severity. Clear and actionable. (10/10)

10. **Flush/Checkpoint Protocol** — Mandatory vs. optional classification, content verification, read-back last 100 chars, retry protocol. Battle-tested. (10/10)

---

## PRIORITY-RANKED FIX LIST

| # | Finding | Severity | Phase | Fix Effort |
|---|---------|----------|-------|------------|
| 1 | 3.1 Skills never loaded for use | HIGH | All | 15 min — add skill_load to Boot |
| 2 | 3.2 Hooks never enabled for phase | HIGH | All | 15 min — add hook enable to Boot |
| 3 | 1.7 AI edge case generator: no dispatcher | HIGH | R2 | 5 min — specify agent_execute |
| 4 | 4.1 R3 has zero tool steps | MEDIUM | R3 | 20 min — add tool anchors |
| 5 | 3.5 Swarm pattern selection undocumented | MEDIUM | All | 10 min — add selection guide |
| 6 | 4.6 Test suite growth path undefined | MEDIUM | R3-R6 | 10 min — add to template checklist |
| 7 | 1.1 Guard wiring: no verify calls | MEDIUM | P0 | 5 min — add prism_guard calls |
| 8 | 1.2 Cadence: no runtime test | MEDIUM | P0 | 5 min — add build→gsd_sync verify |
| 9 | 1.5 Manus: "status" may not be real action | MEDIUM | P0 | 5 min — verify against action list |
| 10 | 2.1 Dispatcher test batches: no effort | LOW | P0 | 5 min — add effort note |
| 11 | 1.6 Pipeline effort not annotated | LOW | R1 | 5 min — add inline effort |
| 12 | 4.2 R3 ATCS calls unspecified | LOW | R3 | 5 min — add call sequence |
| 13 | 4.3 R4 compliance actions unspecified | LOW | R4 | 5 min — add action inventory |
| 14 | 4.4 R4 tenant actions unspecified | LOW | R4 | 5 min — add action inventory |
| 15 | 4.5 R5 has zero dispatcher calls | LOW | R5 | 10 min — add data source map |
| 16 | 3.3 Cadence fire expectations | LOW | Core | 10 min — add awareness note |
| 17 | 3.4 Manus Laws: clarify they're cognitive | LOW | Ref | 5 min — add clarification |
| 18 | 5.3 Context editing never actually called | LOW | R2-R3 | 5 min — add specific calls |
| 19 | 2.2 P0-MS0 audit: missing effort | LOW | P0 | 3 min — annotate |
| 20 | 2.3 R1-MS4: missing effort | LOW | R1 | 3 min — annotate |
| 21 | 2.4 R2-MS2 triage: missing effort | LOW | R2 | 2 min — annotate |
| 22 | 1.3 MS4 scope clarification | LOW | P0 | 3 min — add scope note |
| 23 | 1.4 Generator output criteria | LOW | P0 | 3 min — add criteria |

**Total fix effort: ~2.5 hours**
**Result after fixes: ~96% tool-deterministic (up from ~82%)**
**Remaining 4%: R3-R6 stubs that are expanded at phase start by design**

---

## VERDICT: HOW TO MAKE IT BULLETPROOF

The roadmap v13.2 is architecturally sound and the most detailed manufacturing MCP roadmap I've assessed. The tool utilization coverage is strong where it matters most — safety calculations, boot protocol, integration testing, and error handling are all fully prescribed.

The gaps cluster in two patterns:

**Pattern A: "Verify it exists" ≠ "Use it during execution."** Skills, hooks, and cadence functions are all verified to work in P0 but never prescribed for use during R1-R6. This violates Law 6 (100% UTILIZATION). The fix is surgical: add skill_load and hook_enable to the Boot Protocol, add cadence awareness to Protocols Core.

**Pattern B: Stub phases defer everything.** R3-R6 are intentionally stubs that expand via Brainstorm-to-Ship. This is correct architecture — but the stubs should contain TOOL ANCHORS (the 3-5 most important dispatcher calls per phase) so the brainstorm has concrete starting points, not just abstract objectives.

After applying the 23 fixes above, an executor will know — at every single step — exactly which dispatcher to call, at which effort level, with which schema, using which parallel pattern, flushing to which file, and verifying with which criteria. That's bulletproof.
