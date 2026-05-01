# PRISM PROTOCOLS — REFERENCE v13.7
# NEVER load in full. Load ONLY the section you need using prism_doc action=read with line range.
# Cost: ~250 tokens per section. Total if fully loaded: ~1.5K tokens.
# v13.7: Phase gate automation level reference added to §Quality Tiers (IA2-9.2).
#         Action lookup table added as §Action Lookup (IA2-11.2).
#         Bounded read rule added to §Role Protocol guidance (IA2-10.1).
# v13.6: Chain failure propagation added to §Sequencing Guides (IA-7.3).
#         Dispatcher API versioning note added to §Token Budget Quick Reference (IA-11.2).
# v13.5: Updated Quality Tiers with cross-field physics validation requirement.
#         Updated Role Protocol with materialSanity skill for R1.
#         Added LIMITATION handling in Safety Test Engineer role.

---

<!-- ANCHOR: pr_quality_tiers_load_at_phase_gates_250_tokens -->
## §Quality Tiers (load at phase gates — ~250 tokens)

```
RELEASE (gates, integration, final validation):
  Effort: HIGH-MAX (safety-relevant gates use MAX)
  Error tolerance: 0 known failures.
  Evidence: Recorded in ROADMAP_TRACKER + PHASE_FINDINGS.
  Ralph: >= A- for safety phases (R2+), >= B+ for infrastructure phases (P0, R1).
  Omega: >= 0.70 (hard block). >= 0.85 for R6 production.
  Structured outputs: ALL safety-relevant returns schema-validated.

DEEP (debugging, data loading, formula validation):
  Effort: HIGH (data retrieval, reasoning-heavy debugging)
  Error tolerance: 1-2 known non-blocking issues OK if documented.
  Evidence: Recorded in ROADMAP_TRACKER + ACTION_TRACKER for high-effort MS.
  Structured outputs: Safety calc returns schema-validated. Others optional.

STANDARD (operational, wiring, administrative):
  Effort: MEDIUM-LOW (operational tasks, reads, writes)
  Error tolerance: 3-5 known non-blocking issues OK.
  Evidence: Recorded in ROADMAP_TRACKER only.
```

---

<!-- ANCHOR: pr_role_protocol_load_1_of_7_at_boot_80_tokens_each -->
## §Role Protocol (load 1 of 7 at boot — ~80 tokens each)

```
ROLE ASSIGNMENTS BY PHASE:

P0: Systems Integration Architect — "I verify every connection. No subsystem untested."
  WATCH FOR: Broken imports, missing registrations, dead code paths, stale references,
    circular deps, unregistered tools, silent init failures, placeholder returns.
  SKILLS: prism-system-architecture, prism-hook-system, prism-dev-utilities
  HOOKS: Enable on_failure (structured diagnosis on dispatcher errors)

R1: Data Quality Analyst — "I ensure data completeness, consistency, validity."
  WATCH FOR: Schema mismatches between JSON and TS parsers, lazy-init that never triggers,
    glob patterns missing subdirs, silent parse errors swallowed by catch, off-by-one in scans.
  SKILLS: prism-material-science, prism-formula-registry, prism-data-loading
  HOOKS: Enable on_failure (loading errors are common)

R2: Safety Test Engineer — "I find the inputs that break the system before operators do."
  WATCH FOR: Tests that pass on garbage data (false-pass), missing boundary conditions,
    tolerance ranges too wide, hardcoded expected values, tautological tests.
  SKILLS: prism-speed-feed-calc, prism-kienzle-force, prism-taylor-tool-life, prism-thread-calcs
  HOOKS: Enable smart_reflection (auto-compare actual vs expected metallurgical range)

R3: Data Campaign Manager — "I scale proven patterns to full coverage."
  WATCH FOR: Systematic bias in batches, materials that consistently fail one category,
    error patterns indicating source data problems vs calc problems, averaging away failures.
  SKILLS: prism-data-campaigns, prism-quality-validation, prism-pfp-engine
  HOOKS: Enable batch_quality (cumulative error rate tracking + budget alerts)

R4: Enterprise Architect — "I build infrastructure that isolates, complies, and audits."
  WATCH FOR: Missing error handling in API endpoints, unvalidated input, missing auth,
    WAL corruption on crash, N+1 queries, missing rate limiting, unbounded responses.
  SKILLS: prism-api-contracts, prism-dev-utilities, prism-system-architecture
  HOOKS: Enable on_failure + smart_reflection (API reliability needs both)

R5: Platform Engineer — "I make safety data visible and actionable for operators."
  WATCH FOR: Bundle bloat, unoptimized re-renders, missing loading/error states,
    color-only indicators (colorblind operators), prop drilling >3 levels, fetch-in-render.
  SKILLS: prism-system-architecture (for dashboard data models)
  HOOKS: None — frontend work doesn't benefit from auto-diagnosis hooks

R6: Production Safety Officer — "I certify this system is safe for human use."
  WATCH FOR: Missing health checks, missing graceful shutdown, unbounded memory growth,
    log rotation, cascading failures, single points of failure, untested restore procedures.
  SKILLS: prism-system-architecture, prism-dev-utilities
  HOOKS: Enable on_failure (SRE needs immediate structured diagnosis during load testing)

STATE ROLE at session start in first response. Role guides response framing only.
Load skills: prism_skill_script action=skill_load skill="[name]"
```

---

<!-- ANCHOR: pr_standard_rollback_protocol_200_tokens -->
## §Standard Rollback Protocol (~200 tokens)

```
IF A FIX BREAKS SOMETHING:
  1. git diff HEAD~1 → identify what changed
  2. git stash → save current changes
  3. git checkout HEAD~1 -- [file] → revert specific file
  4. npm run build → verify revert fixed the issue
  5. If build fails after revert → git stash pop → debug differently
  6. If build passes → investigate original fix. Apply smaller change.
  7. Document in ROADMAP_TRACKER: "[MS-ID] ROLLBACK: [what] [why]"

IF SESSION DIES MID-MS:
  1. Next session: load CURRENT_POSITION.md → resume at last recorded position
  2. If CURRENT_POSITION.md is stale: load ROADMAP_TRACKER.md last 5 entries
  3. If ACTION_TRACKER.md exists for this MS: resume at last recorded step-group
  4. Re-run current step (safe due to idempotency classification)
  5. NOTE: With Compaction API, session death from context overflow is eliminated.
     Remaining causes: network timeout, manual session close, application crash.
```

---

<!-- ANCHOR: pr_sequencing_guides_load_before_chain_execution_250_tokens -->
## §Sequencing Guides (load before chain execution — ~250 tokens)

```
MANUFACTURING CHAIN (S3.5):
  material_get → speed_feed → spindle_speed → cutting_force → tool_life → safety
  ALL steps: effort=max, structured output enforced
  If ANY step fails: STOP chain. Do not proceed with partial data.

THREAD CHAIN (S3.6):
  thread_specs → tap_drill → gcode
  effort=high for all steps

TOOLPATH CHAIN (S3.7):
  material_get → strategy_select → speed_feed → toolpath_generate
  effort=max for speed_feed, high for strategy_select

ALARM CHAIN (S3.8):
  alarm_decode → knowledge_search → resolution_steps
  effort=high, structured output on alarm_decode

QUALITY CHAIN (S3.10):
  validate→safety → ralph→loop → omega→compute
  ALL steps: effort=max

CHAIN FAILURE PROPAGATION (IA-7.3):
  All chains above are sequential-dependent. IF step N fails → ALL subsequent steps SKIPPED.
  The chain returns: { status: "CHAIN-FAIL", failed_at: N, reason: "[error]", skipped: [N+1...] }
  
  DO NOT attempt downstream steps after a chain failure:
    material_get fails   → skip speed_feed (no material data to calculate against)
    speed_feed fails     → skip safety (no Vc/fz to evaluate safety of)
    thread_specs fails   → skip tap_drill (no thread dimensions to derive from)
    alarm_decode fails   → skip knowledge_search (no alarm context to search)
  
  DIAGNOSIS: Fix the FIRST failure in the chain. Downstream failures are symptoms.
  IN PARALLEL EXECUTION: Chain failure in one task does NOT stop other parallel tasks.
```

---

<!-- ANCHOR: pr_wiring_chains_p0_ms8_r6_load_for_integration_gates_250_tokens -->
## §Wiring Chains — P0-MS8 + R6 (load for integration gates — ~250 tokens)

```
14 INTEGRATION CHAINS (v13.0: reorganized for parallel execution)

PARALLEL GROUP (10 chains — no shared mutable state):
  Chain 1 — Manufacturing (S3.5): material_get("4140") → speed_feed → spindle → safety → S(x)>=0.70
  Chain 2 — Thread (S3.6): thread_specs("M10x1.5") → tap_drill → gcode
  Chain 3 — Toolpath (S3.7): material_get("Ti-6Al-4V") → strategy_select → speed_feed
  Chain 4 — Alarm (S3.8): alarm_decode("FANUC","414") → knowledge_search
  Chain 6 — Autonomous: atcs task_list
  Chain 7 — Ship: sp brainstorm "verify integration"
  Chain 8 — NL Hook: nl_hook list
  Chain 9 — Compliance: list_templates
  Chain 10 — API Bridge: bridge health
  Chain 12 — PFP→Telemetry: pfp analyze → telemetry anomalies

DEPENDENT GROUP (4 chains — execute sequentially after parallel group):
  Chain 5 — Quality (S3.10): validate→safety → ralph→loop → omega→compute
    DEPENDS ON: Chain 1 (needs S(x) baseline)
  Chain 11 — Thread→Safety: tap_drill("M8x1.25") → safety
    DEPENDS ON: Chain 2 (needs thread mechanics)
  Chain 13 — Hook Lifecycle: hook list → coverage (verify >= MS2 count)
    DEPENDS ON: Chain 8 (needs NL hook baseline)
  Chain 14 — Memory→Session: memory recall("p0_test") → session state_load
    DEPENDS ON: P0-MS6 (not another chain — can run first in dependent phase)

EXECUTION: Use prism_orchestrate action=swarm_execute pattern="parallel_batch" for parallel group.
Execute dependent group sequentially after ALL parallel chains complete.
```

---

<!-- ANCHOR: pr_token_budget_quick_reference_100_tokens -->
## §Token Budget Quick Reference (~100 tokens)

```
STANDARD (200K window):
  System: ~37K | Working: ~163K | Reserve: 0% (Compaction API)
  Framework load: ~11-14K | Remaining: ~149-152K

1M BETA (optional):
  System: ~40K | Working: ~960K | Reserve: 0% (Compaction API)
  Framework load: ~11-14K | Remaining: ~946-949K

EFFORT COST MULTIPLIERS (approximate):
  MAX: 1.0x (baseline) | HIGH: 0.7x | MEDIUM: 0.4x | LOW: 0.2x
  These are reasoning token costs, not API pricing. MAX uses more thinking tokens.
```

---

<!-- ANCHOR: pr_manus_law_integration_100_tokens -->
## §Manus Law Integration (~100 tokens)

```
The 6 Manus Laws are META-COGNITIVE guardrails applied during PLANNING.
The 8 Roadmap Laws are EXECUTION constraints applied during CODING.

MAPPING:
  Manus 1 (Goal Clarity)    → Role Protocol (adopt right mindset per phase)
  Manus 2 (Evidence First)  → Law 2 (NO PLACEHOLDERS) + cross-validation
  Manus 3 (Context Efficiency) → Token Budget + NEVER reload MASTER_INDEX mid-session
  Manus 4 (Tool Mastery)    → Law 4 (MCP FIRST) + Law 6 (100% UTILIZATION)
  Manus 5 (Anti-Regression) → Law 3 (NEW >= OLD) + BACKUP before destructive ops
  Manus 6 (Knowledge Sharing) → PHASE_FINDINGS.md + ROADMAP_TRACKER.md

WHEN TO INVOKE:
  SESSION START:  Law 1 — "What's this session's goal? Which phase? Which MS?"
  BEFORE EACH STEP: Law 3 — "Is this call worth the context cost?"
  AFTER EACH FIX: Law 5 — "Did I break anything? NEW >= OLD?"
  BEFORE COMMIT:  Law 2 — "Do I have evidence, not just 'it compiled'?"
  SESSION END:    Law 6 — "Did I record everything the next session needs?"
```

---

<!-- ANCHOR: pr_action_lookup_table_load_when_searching_for_a_specific_capability_300_tokens -->
## §Action Lookup Table (load when searching for a specific capability — ~300 tokens)

```
ACTION → DISPATCHER MAPPING (most frequently needed actions):
  speed_feed       → prism_calc action=speed_feed
  cutting_force    → prism_calc action=cutting_force
  tool_life        → prism_calc action=tool_life
  spindle_speed    → prism_calc action=spindle_speed
  material_get     → prism_data action=material_get
  material_search  → prism_data action=material_search
  alarm_decode     → prism_data action=alarm_decode
  thread_specs     → prism_thread action=thread_specs
  tap_drill        → prism_thread action=tap_drill
  gcode            → prism_thread action=gcode
  strategy_select  → prism_toolpath action=strategy_select
  safety           → prism_validate action=safety
  health           → prism_dev action=health
  build            → prism_dev action=build
  code_search      → prism_dev action=code_search
  file_read        → prism_dev action=file_read
  file_write       → prism_dev action=file_write
  state_save       → prism_session action=state_save
  state_load       → prism_session action=state_load
  todo_update      → prism_context action=todo_update
  context_compress → prism_context action=context_compress
  context_monitor  → prism_context action=context_monitor_check
  skill_load       → prism_skill_script action=skill_load
  hook_list        → prism_hook action=list
  hook_coverage    → prism_hook action=coverage
  swarm_execute    → prism_orchestrate action=swarm_execute
  agent_execute    → prism_orchestrate action=agent_execute
  task_list        → prism_atcs action=task_list
  ralph_assess     → prism_ralph action=assess
  omega_compute    → prism_omega action=compute
  search           → prism_knowledge action=search
  doc_read         → prism_doc action=read
  doc_write        → prism_doc action=write
  doc_append       → prism_doc action=append

Load this table ONLY when searching for a specific action and unsure which dispatcher owns it.
For full action inventory: see MASTER_INDEX.md S1 at phase gates.
```

---

<!-- ANCHOR: pr_bounded_read_rule_100_tokens -->
## §Bounded Read Rule (~100 tokens)

```
When reading source code files, use these line-count bounds:
  Dispatcher action handler: ~50 lines
  Config file:               ~30 lines
  Full dispatcher:           ~100-150 lines (read section-by-section)
  Test file per test:        ~50 lines
  Registry/data JSON:        NEVER unbounded — use code_search to find specific entries

NEVER read a file >200 lines without a start_line/end_line range.
WHEN UNSURE: Read 50 lines, assess, then read more if needed.
  Better to read twice than to load 200 lines and shed 150 of them.
```
