# PHASE P0: FULL SYSTEM ACTIVATION — v13.9
# Status: not-started | Sessions: 2 | MS: 10 (MS0a, MS0b, MS1-MS8) | Role: Systems Integration Architect
# Pattern: Every MS follows AUDIT → FIX → VERIFY → DOCUMENT
# v13.9: Cross-Audit Governance Hardening — 3 P0-specific improvements.
#         SECURITY FOUNDATION in MS0b: local-only transport, read-only registry, input validation (XA-6).
#         QUANTIFIED ACCEPTANCE on all milestones: measurable pass/fail criteria (XA-2).
#         ARTIFACT MANIFEST: REQUIRES/PRODUCES declared in context bridge (XA-1).
# v13.8: Third Infrastructure Audit — 2 P0-specific fixes from IA3 assessment.
#         getEffort test corrected 'high'→'max' for unknown actions (IA3-10.1).
#         Effort tier verification added to MS0b (IA3-8.1).
#         Action enum hardening in MS0b schema wiring (IA2-1.2).
#         Bootstrap response safety in MS0b before responseGuard wired (IA2-2.2).
#         Namespace audit across MCP servers in MS0b (IA2-11.1).
#         Skill size audit during MS1 (IA2-5.1).
#         Result access test in MS8 Chain 5 (IA2-6.2).
# v13.6: Infrastructure Audit Hardening — Recovery drill in MS8 prerequisites (IA-4.1).
#         Parallel result contract (JSON schema for chain results — IA-6.1).
#         Response capping in MS0b dispatcher wiring (IA-2.2).
# v13.5: Gap Analysis & Pitfall Hardening — MS0 split into MS0a (create) + MS0b (wire + verify).
#         strictNullChecks from P0 (SL-4). Cross-field physics validation (SK-1).
#         Reference values file (SK-3). Material sanity checks (SK-5). Calc versioning (AG-2).
#         getEffort fallback→max (SK-2). Unit tests for utilities (AG-4). Health registry_status (AG-3).
#         SKILL_NAME_MAP.md output from MS1 (OB-2). material_search API contract check (DC-5).
#         Two-phase commit for P0-MS3 registry merge (SD-2).
# v13.4: Instruction completeness hardening — failure-path instructions added throughout.
#         MS0: refactor workflow (file ordering, batch build), utility integration check,
#         effort tier integration point (where getEffort plugs into API wrapper).
#         MS1: skill diagnostic tree (glob→ls→compare→fix). Guard verify criteria enhanced.
#         MS3: registry merge strategy (format detection, primary keys, dedup, verify).
#         MS8: BASELINE-INVALID re-validation prerequisite added before chains.
# v13.3: Tool utilization hardening — all dispatcher calls have effort + pass/fail criteria.
# v13.2: MS0 expanded for coding hardening: type-safe effort tiers, physically-bounded schemas,
#         shared utilities (atomicWrite, env, apiTimeout, logger), PrismError taxonomy,
#         tolerances.ts source file, health schema, vitest foundation, hardcoded compaction.
#         MS0 grows from ~45 to ~55 calls. All v13.0 patterns retained.
# v13.0: MS0 wires Opus 4.6 config (effort tiers, compaction API, structured outputs, streaming,
#         prefilling removal). MS8 restructured for parallel chain execution via Agent Teams.
#         Session estimate reduced from 2-3 to 1-2 (Compaction API + Agent Teams + optional 1M).

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: PRISM MCP server exists with 31 dispatchers, 37 engines, 368 actions — all compiled and running. ROOT PROBLEM: 4 duplicate registry pairs (Material, Machine, Alarm, Tool) cause subsystems to read different data. warm_start sees 707 materials/2 machines/0 alarms/8 tools. knowledge sees 521 materials/402 machines/10033 alarms/0 tools. Neither gets complete data.

WHAT THIS PHASE DOES: Audit AND activate every subsystem. Fix wiring, not data quality. Wire Opus 4.6 capabilities (Compaction API, Adaptive Thinking, Structured Outputs, Agent Teams, Fast Mode, Fine-grained Streaming). By completion: every dispatcher, skill, script, hook, cadence function, engine, agent, swarm, protocol, and guide is VERIFIED OPERATIONAL at full potential WITH Opus 4.6 features configured.

WHAT COMES AFTER: R1 (Registry Resurrection) loads DATA into the wiring P0 fixed. R1 expects: PHASE_FINDINGS.md with P0 findings, P0_DISPATCHER_BASELINE.md, SYSTEM_ACTIVATION_REPORT.md, OPUS_CONFIG_BASELINE.md, all 4 registry pairs resolved to single files.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: (none — first phase)
  PRODUCES: PHASE_FINDINGS.md (P0 section), P0_DISPATCHER_BASELINE.md,
            SYSTEM_ACTIVATION_REPORT.md, OPUS_CONFIG_BASELINE.md, SKILL_NAME_MAP.md

---

## OBJECTIVES

1. All 31 dispatchers respond with valid data (or tagged BASELINE-INVALID for data-dependent ones)
2. All 119 skills registered. Guard returns real data. All cadence functions firing.
3. 4 duplicate registry pairs resolved to single source per type.
4. 14 integration chains pass (10 parallel + 4 sequential). Omega baseline established.
5. MASTER_INDEX S1 counts match live system.
6. Opus 4.6 fully configured: Compaction API, Adaptive Thinking, effort tiers, structured outputs, streaming, prefilling removed, context editing wired.

## QUANTIFIED ACCEPTANCE CRITERIA (XA-2)

```
Every P0 milestone has measurable pass/fail criteria. "Valid data" means:
  - Non-error HTTP response (no timeout, no 4xx/5xx, no exception)
  - Response matches expected shape (has required fields per dispatcher schema)
  - BASELINE-INVALID is acceptable for data-dependent dispatchers; ERROR is not

MS-LEVEL ACCEPTANCE:
  MS0a: All utility files created + tsc --noEmit passes (0 type errors in new files)
  MS0b: 31/31 dispatchers respond (non-error, non-timeout, < 30s each)
        Health endpoint matches HEALTH_SCHEMA. Build passes (exit code 0).
  MS1:  119/119 skills registered. Guard pattern_scan returns structured data.
        Skill size audit recorded in OPUS_CONFIG_BASELINE.md.
  MS2:  62+ hooks registered. At least 1 cadence function fires (gsd_sync on build).
  MS3:  4/4 registry pairs resolved to single file. Merge verification passes.
  MS4:  AutoPilot parses GSD. gsd_quick returns current version string.
  MS5:  Generator produces valid hook structure (name + trigger + action fields present).
  MS6:  At least 1 agent responds. At least 1 swarm pattern executes.
  MS7:  All F-series dispatchers respond (non-error).
  MS8:  14/14 integration chains pass. Omega >= 0.70. Recovery drill completes.
        TEST LEVELS: L1-L2 required (unit + contract tests pass).
```

---

## PARALLELISM MAP

```
MS0 → MS1 (needs dispatcher baseline)
MS0 → MS2 (needs hook baseline)
MS1 + MS2 → MS3 (needs skills + cadence verified before dedup)
MS3 → {MS4, MS5, MS6, MS7} (ANY ORDER after MS3)
MS4+MS5+MS6+MS7 → MS8 (all before integration gate)

OPTIMAL 2-SESSION PATH (with Opus 4.6):
  Session A: MS0a + MS0b + MS1 + MS2 (~28 + ~30 + ~12 + ~12 = ~82 calls)
    NOTE: MS0a and MS0b are sequential (MS0b depends on MS0a files).
    With Compaction API, 82 calls is safe. No manual pressure management needed.
    If using 200K context: may need to split MS2 to Session B start.
    If using 1M context: fits comfortably.
  Session B: MS3 + {MS4+MS5+MS6+MS7} any order → MS8 parallel chains (~15 + ~32 + ~20 = ~67 calls)
    MS8 uses Agent Teams: 10 parallel chains + 4 dependent = ~20 effective calls (down from 45)
```

---

## P0-MS0a: Create Files — Utilities, Schemas, Validations, Tests

**Effort:** ~28 calls | **Tier:** STANDARD | **Context:** ~10KB
**Response Budget:** ~20KB throughput, ~8KB peak (between flushes)
**Entry:** Session booted. Health check passed.
**WHY SPLIT (SD-1):** The old 55-call MS0 mixed file creation with code modification with verification.
Session death at call 40 left half-wired Opus 4.6 config. MS0a creates NEW files (idempotent).
MS0b modifies EXISTING code (depends on MS0a). Recovery boundary: if MS0a dies, no existing code was touched.

```
=== TSCONFIG: ENABLE strictNullChecks (SL-4) ===
0. Read tsconfig.json. Add "strictNullChecks": true to compilerOptions.
   WHY NOW: Enabling in R6 on a 3.9MB codebase produces 300+ errors. Enabling now means all
   code written from P0 forward is null-safe. Existing code errors are fixed as files are touched.
   If existing errors are overwhelming (>50): add "// @ts-expect-error — pre-P0 null, fix in R1"
   comments and create a todo list. Fix them incrementally, not all at once.

=== AUDIT: Model Strings + Prefilling ===
1. prism_dev action=code_search pattern="claude-haiku-4-5-20241022" path="src/"  [effort=high]
   prism_dev action=code_search pattern="claude-sonnet" path="src/"              [effort=high]
   prism_dev action=code_search pattern="claude-opus" path="src/"                [effort=high]
   → List every file with hardcoded model strings.

2. prism_dev action=code_search pattern="prefill" path="src/"                    [effort=high]
   prism_dev action=code_search pattern="assistant.*content" path="src/"          [effort=high]
   → Find any assistant message prefilling. Opus 4.6 returns 400 on prefills.

3. prism_dev action=code_search pattern="output_format" path="src/"              [effort=high]
   → Find deprecated output_format usage. Must migrate to output_config.format.

4. prism_dev action=code_search pattern="budget_tokens" path="src/"              [effort=high]
   prism_dev action=code_search pattern="interleaved-thinking" path="src/"       [effort=high]
   → Find deprecated thinking config. Must migrate to adaptive thinking.

5. prism_dev action=file_read path=".env"                                        [effort=low]
   → Check: ANTHROPIC_API_KEY set? Model env vars exist?

=== CREATE: Shared Utility Files (src/utils/) ===
NOTE: Steps 6-7 (model string fixes, API wiring) are in MS0b. MS0a creates files only.
  Step numbering intentionally preserved across MS0a/MS0b for cross-reference continuity.
8a. src/utils/atomicWrite.ts — atomic write .tmp → rename with queue + cleanup.
8b. src/utils/env.ts — envBool(), envString(), envInt() centralized parsers.
8c. src/utils/apiTimeout.ts — apiCallWithTimeout<T>() with AbortController + cleanup.
8d. src/utils/logger.ts — minimal structured JSON logger to stdout.

=== CREATE: Error Taxonomy ===
9. src/errors/PrismError.ts — PrismError + SafetyBlockError per §Code Standards.

=== CREATE: Effort Tier Mapping ===
10. src/config/effortTiers.ts — TYPE-SAFE EFFORT_MAP + getEffort() fallback to 'max'.
    Include auditEffortMap() for boot-time validation.

=== CREATE: Compaction Config ===
11. src/config/compaction.ts — HARDCODED COMPACTION_INSTRUCTIONS as const.

=== CREATE: Schemas + Validations ===
12a. src/schemas/safetyCalcSchema.ts — PHYSICALLY-BOUNDED schemas per §Structured Outputs.
     Include calc result versioning meta block: { model, formula_version, data_version, timestamp }.
12b. src/schemas/alarmDecodeSchema.ts with minLength:1 + additionalProperties:false.
12c. src/schemas/healthSchema.ts — HEALTH_SCHEMA with registry_status (AG-3).
12d. src/schemas/tolerances.ts — R2_TOLERANCES + ToleranceCategory type.
12e. src/data/referenceValues.ts — Pinned reference values for R2 tolerance validation (SK-3).
     Minimum: 10 materials × 5 operations = 50 reference points.
     Each entry: { material, operation, ref_Vc, ref_fz, ref_Fc, source_citation }.
     Sources: Sandvik Coromant Guide, Machining Data Handbook, ASM references.
12f. src/validation/crossFieldPhysics.ts — Post-schema physics validation (SK-1).
     Validates: RPM consistency, force plausibility, tool life vs speed inverse, feed limits.
12g. src/validation/materialSanity.ts — Cross-parameter material class validation (SK-5).
     Validates: density vs material class, hardness vs material class.

=== CREATE: Test Framework ===
16a. npm install vitest --save-dev
16b. Create vitest.config.ts (include src/__tests__/)
16c. Create src/__tests__/health.test.ts — health endpoint smoke test.
16d. Create unit tests (AG-4):
     src/__tests__/unit/atomicWrite.test.ts
     src/__tests__/unit/envParsing.test.ts
     src/__tests__/unit/apiTimeout.test.ts
     src/__tests__/unit/getEffort.test.ts — verify mapped→correct tier, unknown→max
16e. Add "test": "vitest run" to package.json scripts.

=== BUILD + VERIFY CREATED FILES ===
17. prism_dev action=build target=mcp-server  [effort=medium]
18. npm test → health smoke test + all unit tests pass.
    Verify: all created files importable (no syntax errors, no missing dependencies).
    npm install p-queue --save (required by atomicWrite.ts)

=== DOCUMENT ===
19. prism_doc action=append name=ACTION_TRACKER.md content="P0-MS0a COMPLETE [date]"
```

**Rollback:** Delete created files. No existing code was modified.
**Exit:** All utility files, schemas, validations, and tests created. Unit tests pass. strictNullChecks active.

---

## P0-MS0b: Wire Opus 4.6 + Verify All Dispatchers

**Effort:** ~30 calls | **Tier:** STANDARD | **Context:** ~12KB
**Response Budget:** ~25KB throughput, ~10KB peak (between flushes)
**Entry:** P0-MS0a COMPLETE. All utility files exist.

```
=== FIX: Model Strings + Opus 4.6 Config ===
6. Refactor each file with model strings to env + fallback:
   const HAIKU_MODEL = process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001';
   const SONNET_MODEL = process.env.SONNET_MODEL || 'claude-sonnet-4-5-20250929';
   const OPUS_MODEL = process.env.OPUS_MODEL || 'claude-opus-4-6';

   REFACTOR WORKFLOW (file ordering matters):
     a. Start with config/constants files (define model string vars + export).
     b. Then API wrapper/client files (import model strings from config, consume them).
     c. Then individual dispatchers (import from wrapper, not raw strings).
     d. Build ONCE after all refactors, not per-file.

7. Wire Adaptive Thinking (replace all budget_tokens usage):
   const THINKING_CONFIG = { type: "adaptive" };
   Remove any interleaved-thinking-2025-05-14 beta headers.

   INTEGRATION — Wire getEffort into API client wrapper:
     code_search pattern="anthropic\|createMessage\|apiClient\|callAnthropic" path="src/"
     In that wrapper: import { getEffort } from '../config/effortTiers';
     Add: effort: getEffort(action) to the API call body.
     VERIFY: prism_calc action=speed_feed → logs show effort="max".
             prism_dev action=health → logs show effort="low".

   INTEGRATION — Wire auditEffortMap at server startup:
     In the server boot sequence, call auditEffortMap(registeredActions).
     Any unmapped actions logged as WARN at boot (visible, not buried in per-call noise).

   EFFORT TIER VERIFICATION (one-time in P0, confirm API honors effort — IA3-8.1):
     1. Call prism_calc action=speed_feed material="4140" operation="turning" [effort=max]
        → Record response time and output quality (safety_score precision, warning detail).
     2. Call same input with [effort=low] (temporarily override for test only).
        → Record response time and output quality.
     3. EXPECTED: effort=max has longer response time (30-90s) and more detailed reasoning.
        effort=low has shorter response time (3-5s) and less detailed output.
     4. If both produce identical response times → effort parameter may not be effective.
        Check API client code: is effort being passed in the correct field?
     5. Restore normal effort routing after test.
     Cost: 2 extra calls. Value: proves the effort system works, not just that it's wired.

8e. INTEGRATION CHECK (verify utilities are imported, not just created):
     code_search pattern="atomicWrite\|apiCallWithTimeout\|envBool\|logger" path="src/"
     Must find imports OUTSIDE the utility files themselves.
     At minimum: calcDispatcher → PrismError, API wrapper → apiCallWithTimeout + getEffort,
     health → envBool, file writes → atomicWrite.

=== WIRE: Schemas into Dispatchers ===
12-import. Import schemas in calcDispatcher, toolpathDispatcher, safetyDispatcher, devDispatcher.
     Import crossFieldPhysics in calcDispatcher (runs AFTER schema validation).
     Import materialSanity in dataDispatcher (runs on material_get responses).

13. Remove all assistant message prefilling. Replace with structured outputs.
14. Migrate output_format → output_config.format in all API call paths.
15. Wire fine-grained tool streaming: eager_input_streaming: true on large output tools.

=== WIRE: Health Check Endpoint ===
19. Read devDispatcher.ts (BOUNDED: action handlers, ~50 lines).
    ADD case 'health' with DYNAMIC dispatcher count + Opus 4.6 config status.
    Response MUST conform to expanded HEALTH_SCHEMA (includes registry_status).

17. Update .env with Opus 4.6 variables.
18. prism_dev action=build target=mcp-server  [effort=medium]

=== VERIFY: Agents ===
20. prism_orchestrate action=agent_execute agent=haiku task="Calculate 2+2"  [effort=medium]
21. prism_ralph action=scrutinize target="Opus 4.6 configuration verification"  [effort=max]

=== VERIFY: API Contract (DC-5) ===
21b. prism_data action=material_search query="*" limit=1  [effort=high]
     → VERIFY: response includes total_count in metadata (not just 1 result).
     If NO total_count → use prism_knowledge action=stats as primary count source.
     Document which count method works in ACTION_TRACKER for R1 to use.

=== VERIFY: All 31 Dispatchers (4 batches) ===
22. Each batch is 5-8 calls.

   BOOTSTRAP RESPONSE SAFETY (IA2-2.2 — responseGuard not yet wired):
     During MS0b verification, manually apply response budgets to prevent context blow:
       For prism_hook action=list → add limit=20 parameter.
       For prism_knowledge action=search → add max_results=5 parameter.
       For any response that appears >5KB → extract needed data, shed the rest immediately.
     responseGuard() automates this AFTER MS0b wires it. Until then, manual discipline.

   EFFORT RULE: Use CLASSIFIED EFFORT per §Effort Tier Classification for each dispatcher test.
   Exception: BASELINE-INVALID dispatchers use effort=high (need reasoning to diagnose failures).
   WHY: Testing at production effort validates the effort tier wiring ITSELF.
   If unsure of a dispatcher's effort → call getEffort('[action]') mentally or check §Effort Tiers.

   BATCH 1 — Core (8 calls):
     prism_calc action=speed_feed material="4140" operation="turning"          [effort=max — safety calc]
     prism_data action=material_get material="4140"                            [effort=high — data retrieval]
     prism_validate action=safety                                              [effort=max — safety validation]
     prism_thread action=thread_specs thread="M10x1.5"                         [effort=high — data retrieval]
     prism_toolpath action=strategy_select material="4140" operation="milling"  [effort=max — toolpath calc]
     prism_safety action=check                                                 [effort=max — safety check]
     prism_session action=state_load                                           [effort=low — pure read]
     prism_context action=context_monitor_check                                [effort=low — pure read]

   BATCH 2 — Infrastructure (8 calls):
     prism_doc action=read name="MASTER_INDEX.md"                              [effort=low — file read]
     prism_skill_script action=skill_stats_v2                                  [effort=low — stats]
     prism_hook action=list                                                    [effort=low — list]
     prism_gsd action=quick                                                    [effort=low — quick read]
     prism_dev action=health                                                   [effort=low — health check]
     prism_sp action=brainstorm topic="P0 system test"                         [effort=high — reasoning]
     prism_knowledge action=search query="4140 steel"                          [effort=high — search]
     prism_telemetry action=get_anomalies                                      [effort=low — read]

   BATCH 3 — Guard + Autonomy (7 calls):
     prism_guard action=pattern_scan                                           [effort=medium — operational]
     prism_guard action=lkg_status                                             [effort=low — state read]
     prism_atcs action=task_list                                               [effort=low — list]
     prism_autonomous action=status                                            [effort=low — status]
     prism_orchestrate action=swarm_status                                     [effort=low — status]
     prism_pfp action=analyze target="spindle bearing test"                    [effort=max — PFP analysis]
     prism_memory action=recall query="system_test"                            [effort=low — recall]

   BATCH 4 — F-Series + Quality (6 calls):
     prism_manus action=status                                                 [effort=low — status check]
       IF action=status does not exist → try prism_manus action=list or action=help
       PASS criteria: dispatcher responds with valid JSON, not error/timeout.
     prism_generator action=list                                               [effort=low — list]
     prism_nl_hook action=list                                                 [effort=low — list]
     prism_compliance action=list_templates                                    [effort=medium — compliance]
     prism_tenant action=list                                                  [effort=low — list]
     prism_bridge action=health                                                [effort=low — health]
     prism_omega action=compute target="P0 baseline"                           [effort=max — quality]

   Mark each: PASS / KNOWN-WILL-FIX / UNEXPECTED-FAIL
   Tag data-dependent as BASELINE-INVALID-UNTIL-MS3: prism_calc, prism_data,
   prism_knowledge, prism_toolpath, prism_safety

   → FLUSH results to file after each batch:
   prism_doc action=append name=P0_DISPATCHER_BASELINE.md content="BATCH [N]: [results]"

=== VERIFY: Utilities + Schemas ===
23. Run vitest: npm test → health smoke test passes.
    Verify: src/utils/atomicWrite.ts, env.ts, apiTimeout.ts, logger.ts all importable.
    Verify: src/schemas/safetyCalcSchema.ts, tolerances.ts, healthSchema.ts all importable.
    Verify: src/errors/PrismError.ts importable, SafetyBlockError constructable.
    Verify: getEffort('safety') returns 'max', getEffort('unknown_action') returns 'max'.

=== NAMESPACE AUDIT (IA2-11.1 — verify no tool name collisions) ===
23b. List all tools from all connected MCP servers:
     PRISM: 31 dispatchers (prism_*) — already verified above.
     Desktop Commander: list available tools.
     PDF Tools: list available tools (if connected).
     Other servers: list available tools.
     VERIFY: No two tools across ANY server share the same name.
     If collision found → rename the PRISM tool (PRISM is the system under control).
     Cost: 1-2 calls. Prevents ambiguous tool invocation for entire project lifecycle.

=== ACTION ENUM HARDENING (IA2-1.2 — add during schema wiring) ===
23c. For EACH dispatcher schema definition in src/dispatchers/:
     Add JSON Schema enum to the 'action' parameter listing ALL valid actions.
     Example for prism_calc: action: { type: "string", enum: ["speed_feed", "cutting_force", 
       "tool_life", "spindle_speed"] }
     This prevents hallucinated action names. Cost: ~5 tokens/dispatcher.
     Build → verify no schema validation errors.

=== SECURITY FOUNDATION (XA-6 — proportional early security) ===
23d. Verify MCP transport is local-only during development:
     prism_dev action=code_search pattern="listen\|port\|host\|0\.0\.0\.0" path="src/"  [effort=high]
     If server binds to 0.0.0.0 or any non-localhost address → change to 127.0.0.1 or localhost.
     WHY: During P0-R5, the MCP server should only accept local connections.
     Remote access is an R4 enterprise feature with proper authentication.

23e. Add read-only mode flag for registry data files:
     In .env, add: REGISTRY_READONLY=true
     In registry loader code, check this flag before any write operation.
     WHY: Prevents accidental registry corruption during development.
     Registry writes only happen during R1 merge (where REGISTRY_READONLY is temporarily false).

23f. Add basic input validation to material name parameters:
     prism_dev action=code_search pattern="material.*param\|req.*material\|args.*material" path="src/"
     Add validation: material name must match /^[a-zA-Z0-9\-_.\/\s]+$/ (alphanumeric + common chars).
     Reject path traversal attempts (../, /, \) and injection patterns.
     WHY: Even local-only servers should validate input. Builds the habit for R4 enterprise security.
     Cost: ~3 calls. Prevents accidents, not attacks — full security is in R4.

=== DOCUMENT ===
24. Write P0_DISPATCHER_BASELINE.md (31 rows: Dispatcher|Action|Result|Validity|Fix MS)
25. Write OPUS_CONFIG_BASELINE.md documenting all Opus 4.6 features wired:
    Adaptive Thinking: ✅ | Effort Tiers: ✅ (type-safe) | Compaction API: ✅ (hardcoded)
    Structured Outputs: ✅ (physically bounded) | Prefilling Removed: ✅
    Streaming: ✅ | Context Editing: ✅ | Fast Mode: DEFERRED
    Data Residency: DEFERRED (R4) | 1M Context: OPTIONAL
    Utilities: atomicWrite ✅ | env ✅ | apiTimeout ✅ | logger ✅
    Schemas: safetyCalc ✅ | alarmDecode ✅ | health ✅ | tolerances ✅
    Errors: PrismError ✅ | SafetyBlockError ✅
    Tests: vitest ✅ | health smoke ✅
```

**Rollback:** Revert .env + model string + API wrapper + utility + schema changes. Rebuild.
**Exit:** All model strings current. Opus 4.6 fully configured. Ralph works. All 31 dispatchers called. Type-safe effort tiers. Physically-bounded schemas. Shared utilities. Error taxonomy. Test harness. Baseline documented.

---

## P0-MS1: Skills Registration + Guard Activation

**Effort:** ~12 calls | **Tier:** STANDARD | **Context:** ~6KB
**Response Budget:** ~10KB throughput, ~5KB peak
**Entry:** P0-MS0 COMPLETE.

```
=== AUDIT ===
1. prism_skill_script action=skill_stats_v2 → record registered vs on-disk (expect 85/119)
2. prism_skill_script action=skill_find_for_task task="calculate titanium cutting parameters"
   prism_skill_script action=skill_find_for_task task="decode FANUC alarm"

=== FIX: Skills ===
3. Read SkillRegistry.ts (BOUNDED: first 50 lines for glob pattern).
   DIAGNOSTIC TREE (systematic, not guesswork):
     a. code_search pattern="glob\|readdir\|skills" path="src/" → find the glob pattern used.
     b. Inspect the skills directory on disk:
        prism_dev action=file_read path="data/skills" start_line=1 end_line=20  [effort=low]
        Or: prism_dev action=code_search pattern="skills" path="data/" → find actual skill files.
     c. COMPARE pattern vs reality:
        Pattern says *.yaml but files are *.yml → fix glob or rename files
        Pattern says skills/ but files are in skills/category/ → add **/ recursive glob
        Pattern is correct but count < 119 → some skills have malformed YAML → find parse errors
     d. Apply LEAST invasive fix via str_replace (prefer changing glob over restructuring files).
4. If skills need metadata: fix registry to accept without (preferred).

=== VERIFY: Skills ===
5. Build → skill_stats_v2 must show 119 → skill_find_for_task returns relevant results.

=== SKILL SIZE AUDIT (IA2-5.1 — validate the ~0.5K/skill estimate) ===
5b. prism_context action=context_monitor_check → record BEFORE loading skills.
    Load 3 representative skills from P0 skill set:
      prism_skill_script action=skill_load skill="prism-system-architecture"
      prism_skill_script action=skill_load skill="prism-hook-system"
      prism_skill_script action=skill_load skill="prism-dev-utilities"
    prism_context action=context_monitor_check → record AFTER loading skills.
    DELTA = actual skill cost for P0 phase.
    Record in OPUS_CONFIG_BASELINE.md: "P0 skills: 3 skills, [M]K tokens actual"
    If any phase's skills exceed 3K tokens → flag for skill splitting or summarization.
    Cost: 2 extra calls. Value: validated skill budget for all future sessions.

=== FIX + VERIFY: Guard ===
8. Read guardDispatcher.ts (BOUNDED: pattern_scan handler section, ~50 lines).
   prism_dev action=file_read path="src/dispatchers/guardDispatcher.ts" start_line=1 end_line=50  [effort=low]
9. Wire pattern_scan to TelemetryEngine anomalies or decision_log.
   Use str_replace to connect pattern_scan handler to real data source.
10. Wire lkg_status to state/CURRENT_STATE.json (use path.resolve, atomicWrite from src/utils/).
    Use str_replace to connect lkg_status handler to state file.
11. prism_dev action=build target=mcp-server  [effort=medium]
11a. VERIFY: prism_guard action=pattern_scan  [effort=medium]
     → MUST return structured data object (not empty {}, not placeholder string, not error).
     PASS criteria: response has at least 1 field with real data (e.g., patterns: [...], or anomalies: [...]).
     If empty/placeholder → KNOWN-WILL-FIX (note in ACTION_TRACKER for MS8 chain 13).
11b. VERIFY: prism_guard action=lkg_status  [effort=low]
     → MUST return valid state JSON with at least: { status: string, timestamp: string|number }.
     PASS criteria: status is not undefined/null, timestamp is recent (within 24h of now).
     If missing fields → fix the lkg_status handler → rebuild → retest.

=== DOCUMENT ===
14. Append ROADMAP_TRACKER. Update baseline: mark guard [FIXED].
15. Write SKILL_NAME_MAP.md (OB-2):
    Map each canonical name from §Skill→Phase Quick Reference to actual on-disk skill name.
    Format: | Canonical Name | On-Disk Name | Status |
    e.g.:   | prism-speed-feed-calc | speed-feed-calculation.yaml | OK |
    WHY: Boot Protocol Step 1.5 loads skills by canonical names. If on-disk names differ,
    skill_load fails silently. This map is the translation layer for all future sessions.
```

**Rollback:** Revert SkillRegistry.ts + guardDispatcher.ts. Rebuild.
**Exit:** 119 skills registered. Guard returns real data. Build passes.

---

## P0-MS2: Hooks + Cadence + Session Prep Wiring

**Effort:** ~12 calls | **Tier:** STANDARD | **Context:** ~6KB
**Response Budget:** ~8KB throughput, ~4KB peak
**Entry:** P0-MS1 COMPLETE.

```
=== AUDIT: Hooks ===
1. prism_hook action=list → record all hooks
2. prism_hook action=coverage → record coverage %
3. Read phase0_hooks.py. Compare 41 hooks against step 1: DUPLICATE→skip, NEW→register.

=== FIX ===
4. Register COMPATIBLE+NEW hooks (idempotent: check list first).
5. prism_hook action=coverage → must be >= 62.

=== AUDIT + VERIFY: Cadence ===
6. prism_dev action=code_search pattern="cadenceExecutor" path="src/"  [effort=high]
   → Verify executor exists. If missing → this is a CRITICAL gap. Must be wired before MS3.
7. prism_dev action=code_search pattern="registerCadence\|addCadence" path="src/"  [effort=high]
   → Verify 30+ registrations. Count the matches.
   If <30: diagnose missing registrations. Fix. Rebuild. Recount.
7b. RUNTIME CADENCE TEST (prove cadence executor actually fires, not just registered):
   prism_dev action=build target=mcp-server  [effort=medium]
   → WAIT for build to complete. gsd_sync should fire automatically after build.
   prism_gsd action=quick  [effort=low]
   → Check: version timestamp is RECENT (within seconds of build completion).
   If timestamp is stale → gsd_sync cadence did NOT fire. Debug cadenceExecutor.
   If timestamp is fresh → PASS: proves cadence executor is wired AND gsd_sync fires.
   WHY: This is the cheapest way to prove runtime cadence. gsd_sync is the most visible
   cadence function because it updates a verifiable timestamp.

=== SESSION PREP ===
8. Verify session_boot loads state correctly: prism_session action=state_load → valid JSON.
9. Verify context operations: prism_context action=context_monitor_check → returns pressure %.
10. Append ROADMAP_TRACKER.
```

**Rollback:** Revert hook registrations + cadence fixes. Rebuild.
**Exit:** 62+ hooks. 30+ cadence functions. Session prep verified. Build passes.

---

## P0-MS3: Registry Deduplication (4 Pairs → 4 Singles)

**Effort:** ~15 calls | **Tier:** DEEP | **Context:** ~7KB
**Response Budget:** ~12KB throughput, ~5KB peak
**Entry:** P0-MS2 COMPLETE.

```
=== AUDIT ===
1. For EACH of {Material, Machine, Alarm, Tool}:
   prism_dev action=code_search pattern="[Registry]" path="src/" → find all registry file references.
   List: which files reference which registry path?

=== FIX: Pick winners ===
2. For each pair: choose the file with MORE data (warm_start side or knowledge side).
3. TWO-PHASE COMMIT FOR MERGES (SD-2):
   PHASE A — Merge Data Files:
     If merged data needed: merge loser INTO winner (additive, never destructive — Law 3).
     git add -A && git commit -m "P0-MS3 Phase A: data merge complete"

   PHASE B — Update Importers:
     Update ALL importers to point to winner. Remove loser reference.
     git add -A && git commit -m "P0-MS3 Phase B: importers updated"

   PHASE C — Delete Losers (only after Phase B build passes):
     Remove loser files. git add -A && git commit -m "P0-MS3 Phase C: loser files removed"

   ROLLBACK: If Phase B fails → git checkout [Phase A commit] (merged data preserved,
   importers revert to old state which still works because old files still exist).
   If Phase C is skipped, system works with orphan files — ugly but safe.

   MERGE STRATEGY (per registry type):
     a. COMPARE: Read first 10-20 lines of each file. Same format? Same schema?
        If YES → merge is additive (combine entries, deduplicate by primary key).
        If NO → pick winner by format quality. Copy unique entries from loser manually.
     b. PRIMARY KEYS for deduplication:
        Materials: material name string (e.g., "4140", "Ti-6Al-4V")
        Machines: manufacturer + model (e.g., "HAAS VF-2", "DMG MORI DMU 50")
        Alarms: controller + alarm_code (e.g., "FANUC:414", "HAAS:108")
        Tools: tool_type + diameter + material (e.g., "endmill:12mm:carbide")
     c. DEDUP PROCEDURE:
        Load both files → build Map keyed by primary key → loser entries fill gaps in winner.
        If same key exists in both: keep winner's version (it has more data by selection).
     d. VERIFY MERGE: count unique entries before (winner_unique + loser_only) and after (merged).
        After count MUST be >= sum of unique entries from both sources. If less → data lost → REVERT.
     e. BACKUP: git add -A && git commit BEFORE any merge operation. This is Law 3 mandatory.

=== VERIFY ===
5. Build.
6. session_boot → warm_start counts (must be >= prior for ALL 4 types — Law 3).
7. prism_knowledge action=stats → knowledge counts (must agree with warm_start within 2%).

8. Append ROADMAP_TRACKER.
```

**Rollback:** Revert import changes. Rebuild.
**Exit:** 4 single registries. Counts >= prior. warm_start ≈ knowledge. Build passes.

---

## P0-MS4: AutoPilot + GSD Sync Wiring

**Effort:** ~10 calls | **Tier:** STANDARD | **Context:** ~5KB
**Response Budget:** ~6KB throughput, ~3KB peak
**Entry:** P0-MS3 COMPLETE.

```
SCOPE: This MS verifies AutoPilot PARSING and gsd_sync CADENCE only.
Integration chain testing (S3.5, S3.8 guide sequences) happens in MS8.
Do NOT load §Sequencing Guides here — save those tokens for MS8.

1. prism_gsd action=quick  [effort=low]
   → Verify GSD loads. PASS criteria: returns version string and non-empty content.
2. Read AutoPilot.ts (BOUNDED: parser section only)
   prism_dev action=code_search pattern="parse\|parseGSD" path="src/autopilot"  [effort=high]
   → Then: prism_dev action=file_read path="[result]" start_line=X end_line=X+50  [effort=low]
   → Verify dynamic parsing logic exists (not hardcoded GSD content).
3. Read gsd_sync cadence registration:
   prism_dev action=code_search pattern="gsd_sync\|gsdSync" path="src/"  [effort=high]
   → Verify it fires on build event (look for build/post-build trigger).
4. Fix if broken. prism_dev action=build target=mcp-server  [effort=medium]
   Verify: prism_gsd action=quick  [effort=low] → returns current version.
5. prism_doc action=append name=ROADMAP_TRACKER.md content="P0-MS4 COMPLETE [date]"  [effort=low]
```

**Rollback:** Revert AutoPilot/gsd_sync changes. Rebuild.
**Exit:** GSD syncs on build. AutoPilot parses dynamically. Build passes.

---

## P0-MS5: Scripts + NL Hooks + Generator

**Effort:** ~10 calls | **Tier:** STANDARD | **Context:** ~5KB
**Response Budget:** ~6KB throughput, ~3KB peak
**Entry:** P0-MS4 COMPLETE.

```
1. prism_skill_script action=script_list  [effort=low]
   → Record all scripts. PASS criteria: returns array with at least 1 script name.
2. prism_nl_hook action=list  [effort=low]
   → Record NL hooks. PASS criteria: returns array (may be empty if none created yet).
3. prism_generator action=generate_hook template="test_hook"  [effort=medium]
   → Output MUST contain ALL of:
     - Valid hook name (string, non-empty, e.g., "test_hook_001")
     - Valid trigger definition (object with at least: { event: string })
     - Valid action definition (object with at least: { dispatcher: string, action: string })
   PASS: Output has all 3 fields with real values (not placeholder "TODO" strings).
   KNOWN-WILL-FIX: Output is a template skeleton without real values — note for MS8 chain 8.
   FAIL: Generator errors, crashes, or returns nothing.
   IMPORTANT: Do NOT register the generated test hook. This is a generation test, not a deployment.
   Registering test hooks pollutes the hook list before MS8 integration gate.
4-6. Fix any failures:
   If script_list fails → prism_dev action=code_search pattern="scriptRegistry" path="src/"  [effort=high]
     Read result → diagnose → str_replace fix → build → retest.
   If generator fails → prism_dev action=code_search pattern="generateHook\|generate_hook" path="src/"  [effort=high]
     Read result → diagnose → str_replace fix → build → retest.
   prism_dev action=build target=mcp-server  [effort=medium]
7. prism_doc action=append name=ROADMAP_TRACKER.md content="P0-MS5 COMPLETE [date]"  [effort=low]
```

**Rollback:** Revert dispatcher fixes. Rebuild.
**Exit:** Scripts listed. NL hooks operational. Generator produces valid hooks. Build passes.

---

## P0-MS6: Agents + Swarms + ATCS

**Effort:** ~10 calls | **Tier:** STANDARD | **Context:** ~5KB
**Response Budget:** ~6KB throughput, ~3KB peak
**Entry:** P0-MS5 COMPLETE.

```
=== AGENTS (with AbortController 30s timeout via apiCallWithTimeout) ===
1. prism_orchestrate action=agent_execute agent=haiku task="Calculate 150 * 3.14159"  [effort=medium]
   → Expected result: ~471.24 (within ±0.01). Proves Haiku API connectivity.
   FAIL: timeout (API key missing?), error (model string wrong?), wrong answer (agent broken).
2. prism_orchestrate action=agent_execute agent=sonnet task="List 3 properties of titanium alloys"  [effort=medium]
   → Expected: 3 real metallurgical properties (e.g., high strength-to-weight, corrosion resistant, biocompatible).
   FAIL: generic/hallucinated properties, timeout, error.
3. prism_orchestrate action=list_agents  [effort=low]
   → Record all agent types. PASS criteria: includes at least haiku, sonnet, opus.

=== SWARMS ===
4. prism_orchestrate action=swarm_status  [effort=low]
   → Record status. PASS criteria: returns valid JSON with pattern list.
5. prism_orchestrate action=swarm_patterns  [effort=low]
   → List all patterns. MUST include at minimum: parallel_batch, sequential_chain, map_reduce.
   VERIFY: parallel_batch exists — REQUIRED for P0-MS8 Agent Teams pattern.
   If parallel_batch missing → CRITICAL. Cannot proceed to MS8 without it.

=== ATCS (idempotent: check task_list first to avoid duplicate tasks) ===
6. prism_atcs action=task_list  [effort=low]
   → Check if "P0 system verification" task already exists. If yes → skip to step 8.
7. prism_atcs action=task_init title="P0 system verification" priority="high"  [effort=medium]
   → Returns task_id. Record it. PASS criteria: valid task_id string returned.
7b. prism_atcs action=auto_plan task_id="[task_id from step 7]"  [effort=high]
    → Returns plan. PASS criteria: plan has at least 1 step defined.
8. prism_atcs action=task_list  [effort=low]
   → Verify task appears in list with correct title and status.

9. Fix failures if any:
   Agent failures → check .env for ANTHROPIC_API_KEY, check model strings from MS0.
   Swarm failures → prism_dev action=code_search pattern="swarmPatterns\|SwarmPattern" path="src/"  [effort=high]
   ATCS failures → prism_dev action=code_search pattern="atcsDispatcher\|ATCSDispatcher" path="src/"  [effort=high]
   prism_dev action=build target=mcp-server  [effort=medium]
10. prism_doc action=append name=ROADMAP_TRACKER.md content="P0-MS6 COMPLETE [date]"  [effort=low]
```

**Rollback:** Revert dispatcher fixes. Clean test task.
**Exit:** All 3 agent tiers execute. 8 swarm patterns (including parallel_batch). ATCS operational. Build passes.

---

## P0-MS7: Memory + Manus + PFP + Telemetry + Compliance + Tenant + Bridge

**Effort:** ~12 calls | **Tier:** STANDARD | **Context:** ~6KB
**Response Budget:** ~8KB throughput, ~4KB peak
**Entry:** P0-MS6 COMPLETE.

```
1. prism_memory action=store key="p0_test" value="verification"  [effort=low]
   → PASS criteria: returns success/confirmation. If error → memory dispatcher broken.
2. prism_memory action=recall query="p0_test"  [effort=low]
   → MUST return "verification". If empty/wrong → store or recall is broken.
3. prism_pfp action=analyze target="spindle bearing wear HAAS VF-2 5000 hours"  [effort=max]
   → PASS criteria: returns prediction object with at least: { risk_level, confidence, recommendation }.
   Risk_level should be a string/enum. Confidence should be 0-1. Recommendation non-empty.
   If placeholder → KNOWN-WILL-FIX (PFP needs R2 data to calibrate — note for R3).
4. prism_telemetry action=record_event event="p0_activation"  [effort=low]
   → PASS criteria: returns success. Event ID or timestamp returned.
5. prism_telemetry action=get_anomalies  [effort=low]
   → Returns data (may be empty array — that's OK, no anomalies yet is valid).
   FAIL: error, timeout, or non-array response.
6. prism_compliance action=list_templates  [effort=medium]
   → PASS criteria: returns array of template objects with at least: { name, standard }.
   Expected standards: ISO 9001, AS9100, ITAR (may have more).
   If empty array → templates not loaded yet. KNOWN-WILL-FIX (R4 creates templates).
7. prism_tenant action=list  [effort=low]
   → Returns tenant list (may be single default tenant — that's OK for P0).
   FAIL: error or non-array response.
8. prism_bridge action=health  [effort=low]
   → PASS criteria: returns { status: "ok" } or equivalent healthy response.
   FAIL: timeout, error, or status != ok.
9. prism_manus action=status  [effort=low]
   → PASS criteria: dispatcher responds with valid JSON (not error, not timeout).
   IF action=status returns "unknown action" error:
     Try: prism_manus action=list  [effort=low]
     OR: prism_manus action=help  [effort=low]
     Whichever responds without error → record the valid action → update P0_DISPATCHER_BASELINE.md.
   WHY: The Manus dispatcher's exact action surface may differ from documentation.
   The goal is to verify the dispatcher RESPONDS, not to test a specific action.
10-11. Fix failures:
   For each FAIL: prism_dev action=code_search pattern="[dispatcher_name]Dispatcher" path="src/"  [effort=high]
   Read handler → diagnose → str_replace fix → build → retest.
   prism_dev action=build target=mcp-server  [effort=medium]
12. prism_doc action=append name=ROADMAP_TRACKER.md content="P0-MS7 COMPLETE [date]"  [effort=low]
```

**Rollback:** Revert any dispatcher fixes. Rebuild.
**Exit:** All F-series subsystems respond with real data. Build passes.

---

## P0-MS8: Integration Gate (14 Chains — PARALLEL EXECUTION)

**Effort:** ~20 effective calls (was ~45 sequential in v12.2) | **Tier:** RELEASE | **Context:** ~12KB
**Response Budget:** ~30KB throughput, ~10KB peak
**Entry:** P0-MS7 COMPLETE.
**v13.0: Restructured for Agent Teams. 10 independent chains run in parallel, 4 dependent run after.**

```
=== PREREQUISITE: Load §Wiring Chains from PRISM_PROTOCOLS_REFERENCE.md ===

=== PREREQUISITE: RE-VALIDATE BASELINE-INVALID DISPATCHERS ===
Before running integration chains, re-validate dispatchers tagged BASELINE-INVALID in P0-MS0:
  1. prism_doc action=read name=P0_DISPATCHER_BASELINE.md  [effort=low]
     → Find all entries marked BASELINE-INVALID-UNTIL-MS3.
  2. For EACH: re-run the exact same prism_ call from MS0 step 22 with same parameters.
     prism_calc, prism_data, prism_knowledge, prism_toolpath, prism_safety — all should now work
     because MS3 resolved the 4 duplicate registry pairs.
  3. Mark each: PROMOTED-TO-VALID (real data returned) / STILL-INVALID (with diagnosis).
  4. Append results to P0_DISPATCHER_BASELINE.md.
  5. STILL-INVALID entries: diagnose root cause before chains. Integration chains WILL fail
     on broken dispatchers. Fix them now, not during chain debugging.

=== PREREQUISITE: RECOVERY DRILL (verify recovery path works — IA-4.1) ===
Run once before integration chains to prove the recovery path works:
  1. Complete 3 steps of any current MS (or use MS7 completion as the starting point).
  2. Simulate session death: close session WITHOUT running state_save.
  3. New session: follow boot protocol → verify CURRENT_POSITION.md has step-level position.
  4. Verify ACTION_TRACKER has sub-checkpoint from step 2.
  5. Resume from recorded position. Verify no data duplication or loss.
  Cost: ~5 extra calls. Proves recovery works before the 14-chain integration gate depends on it.
  If recovery fails → fix the position tracking/checkpoint system before running MS8.
  If recovery succeeds → proceed to chains with confidence.

=== PHASE 1: PARALLEL CHAINS (10 independent chains via Agent Teams) ===

Execute ALL of these concurrently via prism_orchestrate action=swarm_execute pattern="parallel_batch":

  Chain 1 — Manufacturing (S3.5): material_get("4140") → speed_feed → spindle_speed → safety → S(x) >= 0.70
  Chain 2 — Thread (S3.6): thread_specs("M10x1.5") → tap_drill → gcode
  Chain 3 — Toolpath (S3.7): material_get("Ti-6Al-4V") → strategy_select → speed_feed
  Chain 4 — Alarm (S3.8): alarm_decode("FANUC","414") → knowledge search
  Chain 6 — Autonomous: atcs task_list (verify P0-MS6 task exists)
  Chain 7 — Ship: sp brainstorm "verify P0 integration"
  Chain 8 — NL Hook: nl_hook list
  Chain 9 — Compliance: list_templates
  Chain 10 — API: bridge health
  Chain 12 — PFP→Telemetry: pfp analyze → telemetry anomalies

WHY PARALLEL: These 10 chains share NO mutable state. Each operates on independent
data through independent dispatchers. Parallel execution changes timing, not results.

→ COLLECT all parallel results.
→ If ANY chain FAILED → trace to source MS → go back and fix → re-complete.
→ FLUSH parallel results: prism_doc action=append name=P0_CHAIN_RESULTS.md content="PARALLEL PHASE: [results]"

CHAIN OUTPUT FORMAT (IA-6.1 — JSON contract replaces string parsing):
  Each parallel chain result MUST use the JSON contract from §Parallel Result Contract:
    { chain_id: N, status: "PASS"|"FAIL"|"TIMEOUT"|"ERROR",
      outputs: { safety_score: 0.82, material: "4140", operation: "turning" },
      errors?: ["error message if applicable"],
      duration_ms: N }
  Dependent chains consume results via outputs.field_name, not string parsing.
  WHY: The old "[Chain N] status=PASS key=value" format breaks on edge cases.
  JSON contract is unambiguous, schema-validated, and order-independent.

=== PHASE 2: DEPENDENT CHAINS (4 sequential chains) ===

Execute these in order AFTER Phase 1 completes:

  Chain 5 — Quality (S3.10): validate→safety → ralph→loop → omega→compute
    (Depends on Chain 1 manufacturing output for S(x) baseline)
    RESULT ACCESS TEST (IA2-6.2): Chain 5 MUST read Chain 1's safety_score via
      orchestrator.getResult(1).outputs.safety_score.
      If accessor returns null → parallel result contract is BROKEN. Fix orchestrator.
      If accessor returns correct value → contract works end-to-end.
      This is a ONE-TIME verification. If it works here, it works for R2/R3.

  Chain 11 — Thread→Safety: tap_drill("M8x1.25") → safety
    (Depends on thread chain mechanics from Chain 2)

  Chain 13 — Hook Lifecycle: hook list → verify count >= MS2 recorded count → coverage
    (Depends on Chain 8 NL Hook output for hook count baseline)

  Chain 14 — Memory→Session: memory recall("p0_test") → session state_load
    (Depends on P0-MS6 task, not another chain — can run first in dependent phase)

→ FLUSH dependent results: prism_doc action=append name=P0_CHAIN_RESULTS.md content="DEPENDENT PHASE: [results]"

=== GATE CHECK ===
ALL 14 chains pass. Chain 1 S(x) >= 0.70. Chain 5 produces Omega.
If chain fails → trace to source MS → go back and fix → re-complete.

=== RELEASE VALIDATION ===
prism_ralph action=assess target="P0 Full System Activation"
prism_omega action=compute target="P0 complete"
→ Record baseline Omega (no minimum required for P0 — data not loaded yet).

=== MASTER_INDEX COHERENCE GATE (Law 8) ===
Read MASTER_INDEX.md → verify dispatcher/engine/guide counts match live.
Update if P0 changed structure (e.g., registry count 19→15 from MS3).

=== CREATE PHASE_FINDINGS.md ===
Guard: check if exists → append if yes, write if no.
Include findings from MS0-MS7 + Opus 4.6 config status.
Include: registry winners, cadence gaps, script inventory, swarm patterns,
         Opus 4.6 features wired, any prefilling sites found and fixed.
Use PRIORITY column: CRITICAL/IMPORTANT/NOTE.

=== SYSTEM_ACTIVATION_REPORT.md ===
Full status table: 20 subsystems × (Status, Evidence).
Integration chains: 14/14 pass (10 parallel + 4 dependent). Baseline Omega.
Opus 4.6 configuration: all features verified.

Append ROADMAP_TRACKER: "P0-MS8 COMPLETE [date] — PHASE P0 COMPLETE"
Update PRISM_MASTER_INDEX.md: P0 status → "complete"
prism_session action=state_save
```

**Rollback:** Standard. Re-run failed chains after fixing source MS.
**Exit:** All 14 chains pass (10 parallel + 4 dependent). All subsystems OPERATIONAL. Opus 4.6 fully configured. Activation report created. Omega baseline. P0 COMPLETE.
