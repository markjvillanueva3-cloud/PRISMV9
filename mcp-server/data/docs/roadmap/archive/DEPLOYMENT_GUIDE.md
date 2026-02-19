# PRISM MODULAR ROADMAP — DEPLOYMENT GUIDE v13.9
# Migration guide: v12.2 → v13.0 → ... → v13.8 → v13.9 (Cross-Audit Governance Hardening)

---

## FIRST-TIME SETUP PREREQUISITES (for new executors starting from scratch)

```
If the PRISM MCP server has never been run on this machine:

1. Install Node.js >= 20 (verify: node --version → should show v20.x.x or higher)
2. cd C:\PRISM\mcp-server
3. npm install (installs all dependencies from package.json)
4. Create .env from .env.example (or create manually):
     ANTHROPIC_API_KEY=sk-ant-api03-...  (your Anthropic API key)
     OPUS_MODEL=claude-opus-4-6
     HAIKU_MODEL=claude-haiku-4-5-20251001
     SONNET_MODEL=claude-sonnet-4-5-20250929
     DEFAULT_EFFORT=high
     COMPACTION_TRIGGER=150000
     FAST_MODE_ENABLED=false
   NOTE: COMPACTION_INSTRUCTIONS intentionally NOT in .env (hardcoded safety invariant).
5. npm run build (should complete without errors — if OOM, see §Build Failure Triage)
6. Connect to MCP server:
   If Claude Desktop: add server config to claude_desktop_config.json with correct path.
   If standalone: npm start → server should show listening message.
   If MCP Inspector: connect to the server URL shown at startup.
7. Test: prism_dev action=health → should return { status: "ok", dispatchers: N, ... }
   If "tool not found" → MCP connection is not established. Check config.
   If error response → server started but has issues. Read the error message.
8. You are now ready to begin at P0-MS0. Load PRISM_MASTER_INDEX.md to start.
```

---

## VERSION HISTORY

```
v12.0 (2025-12-XX): Initial modular decomposition from monolith (74-84% framework reduction)
v12.1 (2025-12-XX): Token optimization audit — 7 bleeds fixed, response budgets, code_search pattern
v12.2 (2026-01-XX): Compaction protocol assessment — 6 vulnerabilities addressed, CMS v2.0 (468 lines)
v13.0 (2026-02-13): Full Opus 4.6 capability integration — Compaction API, Adaptive Thinking, Agent Teams
v13.1 (2026-02-13): Gap restoration audit — tolerance table, claude.ai recovery, flush detail, session mgmt
v13.2 (2026-02-13): Coding best practices hardening — 14 findings, type safety, schemas, utilities, tests
v13.3 (2026-02-14): Tool utilization hardening — 23 gaps closed, every step tool-deterministic
v13.4 (2026-02-14): Instruction completeness hardening — 34 gaps closed, failure paths documented
v13.5 (2026-02-13): Gap analysis & pitfall hardening — 42 findings from comprehensive safety review
v13.6 (2026-02-13): Infrastructure audit hardening — 23 findings from 12-point MCP architecture audit
v13.7 (2026-02-14): Second infrastructure audit — 14 findings from independent 12-point reassessment
v13.8 (2026-02-14): Third infrastructure audit — 11 findings from third 12-point reassessment
v13.9 (2026-02-14): Cross-audit governance hardening — 13 improvements from external audit synthesis
```

### v13.6 → v13.7 WHAT CHANGED (second infrastructure audit)

**TIER 1 — CRITICAL (5 fixes, highest impact-to-effort):**
- Action enum hardening: Dispatcher schemas use JSON Schema enum for 'action' parameter. Prevents hallucinated action names (~5 tokens/dispatcher).
- Overhead validation: Schema token audit runs every P0 session, not just once. Validates ~37K estimate with live data.
- Bootstrap response safety: Manual response limits during MS0b before responseGuard is wired. Prevents context blow during bootstrap.
- Compaction telemetry: COMPACTION-RECOVERY entries appended to ROADMAP_TRACKER when recovery fires. Zero extra calls.
- Blocked priority: Autonomous continue resolves BLOCKED status before advancing to next MS.

**TIER 2 — HIGH (5 fixes, apply in P0):**
- Skill size audit: Measure actual skill token cost during P0-MS1 via context_monitor before/after.
- Parallel task limit: Maximum 10 concurrent tasks per parallel_batch. Queue remainder.
- Result access test: P0-MS8 Chain 5 verifies orchestrator.getResult() contract.
- Namespace audit: Verify no tool name collisions across MCP servers at P0-MS0b.
- Session planning step: Boot Step 3.5 — plan execution in reasoning before starting work.

**TIER 3 — MEDIUM (4 fixes):**
- Partial dispatcher failure (Tier 2.5): Individual dispatcher error handling while server runs.
- Phase gate automation levels: Automated vs human-review distinction per phase.
- Index integration: MASTER_INDEX.md (MCP counts) and ROADMAP_INDEX.md (legacy v10) formally linked.
- State file format stability: Backward-compatible field additions for state files.

**STRUCTURAL: Index Disambiguation**
- PRISM_MASTER_INDEX.md, MASTER_INDEX.md, and ROADMAP_INDEX.md are three distinct files with different purposes. Document manifest updated with disambiguation note and load rules for each.

**TIER 1 — CRITICAL (5 fixes, highest impact-to-effort):**
- Schema token audit: Boot Step 3.1 measures actual system overhead. Budget rule: <1000 tokens/dispatcher, <25K total.
- Graceful degradation hierarchy: 5-tier operational mode when subsystems are down (full → reduced data → no API → MCP down → DC down).
- Position validation: Boot Step 2.1 cross-references CURRENT_POSITION vs ROADMAP_TRACKER vs expected output files.
- Cascading failure detection: Chain failure propagation — skip dependent steps after failure.
- Error context preservation: Block-severity errors write context to ACTION_TRACKER and CURRENT_POSITION.

**TIER 2 — HIGH (5 fixes, apply in P0):**
- Parallel result contract: JSON schema { chain_id, status, outputs, errors?, duration_ms }.
- Claude.ai compaction recovery: Full 3-layer cascade with Layer 2 deep recovery specifics.
- Hook output response protocol: Per-hook actions for on_failure, smart_reflection, batch_quality, docAntiRegression.
- Orchestrator failure handling: Fallback to sequential when swarm_execute fails.
- Response capping: Dispatcher-level limits, responseGuard() truncates at 20KB with _truncated flag.

**TIER 3 — MEDIUM (7 fixes):**
- Subagent result budget (500B summary cap), file access deconfliction (PRISM files via prism_ only),
  dispatcher API versioning (additive-only), skill loading in token budget (~1-2K), framework growth
  monitoring (measure at phase gates), Definition of Done (top-level acceptance), compaction during
  parallel execution (re-run protocol).

**TIER 4 — LOW/DEFERRED (6 fixes, R4+):**
- Sonnet delegation design, subagent schema scoping, recovery drill in P0-MS8, brainstorm at max effort,
  autonomous goal discovery, new action documentation.

### v13.4 → v13.5 WHAT CHANGED (gap analysis & pitfall hardening)

**SILENT KILLER FIXES (system appeared to work but could produce dangerous results):**
- Cross-field physics validation added to structured outputs (SK-1). Schema validates field bounds;
  new imperative code validates cross-field physical relationships (e.g., Fc must scale with Vc and
  material hardness). Without this, a result like Fc=500N for Inconel at Vc=300 passes schema but
  is off by 10-20x — operator gets a "safe" recommendation that snaps the tool.
- getEffort() fallback changed from 'high' to 'max' (SK-2). A typo like 'speed_feeed' silently
  got reduced reasoning. Boot-time action audit added to catch unmapped actions at startup.
- Reference values file for R2 tolerance validation (SK-3). Sourced, pinned, deterministic.
- Alarm decode tolerance changed from exact string match to structured-field match (SK-4).
- Material sanity checks validate cross-parameter consistency per material class (SK-5).
- S(x) >= 0.70 derivation documented with formula, weights, and 0.70 justification (SK-6).
- PFP feedback loop architecture designed for real failure data ingestion (SK-7).

**SESSION DESTROYER FIXES (entire sessions wasted):**
- P0-MS0 split into MS0a (create files, idempotent) + MS0b (wire code, depends on MS0a) (SD-1).
  Recovery boundary: session death during MS0a doesn't corrupt existing code.
- Two-phase commit for P0-MS3 registry merges (SD-2). Phase A=data merge, Phase B=importers,
  Phase C=cleanup. If B fails, revert to A (merged data preserved).
- Ralph/Omega sanity check before phase gates (SD-5). Validate the validator.

**DATA CORRUPTION FIXES:**
- Orphaned .tmp cleanup added to boot protocol (DC-1). Atomic writes survive crashes; temps don't.
- ROADMAP_TRACKER verified after append for truncation detection (DC-2).
- R3 campaign state uses batch ID array, not count (DC-3). Concurrent writes are union-safe.
- Schema migration requires pre-bump git commit (DC-4). Enables rollback on bad migrations.
- material_search API contract verification for total_count (DC-5).

**CONCURRENCY FIXES:**
- Per-task timeout in parallel batches (CB-1). One hung calc can't block the entire batch.
- Context editing prohibited during active parallel tasks (CB-2). Clear only between rounds.
- Adaptive rate limiting responds to 429 with backoff (CB-4). Prevents thundering herd.
- Parallel equivalence uses tolerance-based comparison for floating point (CB-5).

**ARCHITECTURAL ADDITIONS:**
- Health schema expanded with registry_status for partial startup detection (AG-3).
- Unit test mandate from P0 alongside integration tests (AG-4).
- Calc result versioning meta block for audit reproducibility (AG-2).
- Monitoring/alerting foundations in R4, deployment in R6 (AG-5).
- Multi-user concurrency model: dev state vs production state separation (AG-6).
- Cross-platform path audit for Linux deployment (AG-7).
- API versioning strategy (/v1/) established in R4 (AG-8).

**STUB PHASE CORRECTIONS:**
- strictNullChecks moved from R6 to P0 (SL-4). Prevents 300+ error surprise at end.
- R3 batch size corrected: 10 materials/batch, not 50 (SL-1). 250 concurrent max-effort = impossible.
- R4 one-session-per-tenant architecture mandated (SL-2). Prevents compaction data leakage.
- R5 authentication required on dashboard (SL-3). Dual build pipeline for server + frontend (OB-5).
- R6 safety-score-under-load validation (SL-5). Offline cache and monitoring deployment.

**OPERATIONAL ADDITIONS:**
- Claude Desktop restart process verification (OB-3). Check for duplicate server processes.
- PHASE_FINDINGS size cap: max 10 CRITICAL per phase (OB-4).
- Wall-clock time estimates split into compute + human time with latency awareness (OB-6).
- SKILL_NAME_MAP.md output from P0-MS1 (OB-2).
- LIMITATION category in R2 fix cycle for formula boundaries (OB-1).

### v13.3 → v13.4 WHAT CHANGED (instruction completeness hardening)

**CRITICAL FIXES (executor would have been stuck without these):**
- Build failure triage added to Protocols Core. Every MS runs builds (~30+ across all phases)
  but v13.3 never documented what to do when builds fail. Now: 4 error categories (type error,
  import error, OOM, syntax error) with specific fix procedures. First error only → fix → rebuild.
- MCP server restart instruction added to Boot Protocol Step 4. After building new code, the
  running server still serves OLD code. Without explicit restart, executor thinks changes didn't work.
- Structured output invocation guide added. Referenced 30+ times as "[effort=max, structured output]"
  but never explained that this is server-level enforcement, not a per-call parameter.
- Sub-MS position tracking: ACTION_TRACKER threshold lowered from >12 to >8 calls. Added
  lightweight position update every 5 calls. Previously, 5 of 9 P0 milestones had zero sub-MS tracking.
- Registry merge strategy added to P0-MS3: format detection, primary keys per registry type,
  dedup procedure, merge verification. This is the ROOT PROBLEM the roadmap solves — cannot be vague.

**HIGH IMPACT FIXES:**
- P0-MS0: refactor workflow (config→wrapper→dispatchers ordering), utility integration check,
  effort tier API integration point (where getEffort plugs into the API client wrapper).
- P0-MS1: skill diagnostic tree (glob→directory listing→compare→apply least invasive fix).
- P0-MS8: BASELINE-INVALID re-validation prerequisite before integration chains.
- R1-MS1: concrete loader fix patterns (type coercion, null-fill, encoding, schema migration).
- R1-MS1: 127-parameter verification method (count keys, spot-check kc1_1/density/hardness).
- R2-MS1.5: prompt size budget (~100 lines), response handling, timeout guidance (120s).
- R2-MS2: formula fix diagnostics (hand-calculate → compare → classify formula vs data bug).
- Ralph/Omega assessment guide: what they evaluate, how to interpret scores, how to improve.

**MEDIUM FIXES:** Intermediate variable persistence, phase gate state file integrity checks,
  enhanced compaction instructions (step number + intermediate vars), Layer 2 recovery prerequisite,
  R3 orphaned task handling, R1-MS2 per-registry normalizer complexity, R2-MS1.5 minimum ≥5
  VALID-DANGEROUS, R2-MS2 regression sample selection, shared state quick check.

**LOW FIXES:** 1M context decision rule, wall-clock time estimates, first-time setup prerequisites,
  R5 technology stack decision gate, R6 stress test clarification, brainstorm session procedure.

### v13.2 → v13.3 WHAT CHANGED (tool utilization hardening)

**CRITICAL FIXES (executor would have gotten stuck without these):**
- Boot Protocol Step 1.5 now includes skill_load and hook_enable. Before: 119 skills and 62+
  hooks were verified to EXIST in P0 but never LOADED or ACTIVATED during R1-R6 execution.
  This violated Law 6 (100% UTILIZATION). Now: exact calls with phase→skill and phase→hook
  quick reference tables.
- R2-MS1.5 AI edge case generator was the ONLY step in the entire roadmap without a named
  dispatcher. Now specifies: prism_orchestrate action=agent_execute agent=opus [effort=max]
  with explicit input collection steps (file_read formulas, schemas, prior edge cases).
- Swarm pattern selection guide added to Protocols Core. Before: only parallel_batch was ever
  prescribed. Now: decision tree for parallel_batch vs sequential_chain vs map_reduce with
  examples and default selection rule.

**HIGH IMPACT FIXES:**
- P0-MS0 dispatcher batches: Expanded from 4 bullet-point lists to 29 fully specified calls
  with [effort=level], exact action names, and PASS/FAIL criteria per call.
- P0-MS1 guard wiring: Added prism_guard action=pattern_scan and action=lkg_status verify steps
  with specific response shape expectations.
- P0-MS2 cadence: Added runtime test (build→wait for gsd_sync→verify timestamp).
- All stub phases (R3-R6) now have TOOL ANCHORS sections with concrete dispatcher calls per
  future MS. Brainstorm expanders now have starting points, not just abstract objectives.
- R6 test suite growth path: Documents exactly what each phase adds to npm test, from R2
  baseline through R6 production gate.

**MEDIUM FIXES:** P0-MS4 scope note, P0-MS5 generator criteria, P0-MS6/MS7 full call specs,
R1-MS3/MS4 effort annotations, R2-MS2 triage+fix cycle explicit flow, R3 ATCS tracking calls.

**NEW SECTIONS:**
- §Cadence Function Awareness in Protocols Core (30+ auto-fire functions: what fires when,
  executor rules, exceptions for gsd_sync and docAntiRegression).
- §Swarm Pattern Selection in Protocols Core (5 patterns with use cases and decision rule).
- §Context Editing Prescription in Protocols Core (when/where to clear tool results).
- §Manus Laws — Cognitive Guards in Phase Template (clarification that Manus Laws are internal
  checks, not tool calls, with specific invocation moments).
- §Test Suite Growth Path in R6 (cumulative test evolution across all phases).
- §Tool Anchors in R3, R4, R5, R6 (concrete dispatcher calls for brainstorm expansion).
- §ATCS Tracking in R3 (task_init/update/complete/list calls for cross-session continuity).
- §Dashboard Data Sources in R5 (UI component → dispatcher call mapping).

### v13.1 → v13.2 WHAT CHANGED (coding best practices hardening)

**CRITICAL FIXES (must understand before P0-MS0):**
- EFFORT_MAP is now type-safe: Record<ActionName, EffortLevel> with compile-time exhaustiveness.
  Unknown actions default to 'high' (defensive), never 'low' or undefined.
  WHY: Record<string,string> silently returned undefined for unmapped actions.
- Structured output schemas now require ALL cutting parameters (not just safety_score),
  use exclusiveMinimum:0 (rejects Vc=0), add physical upper bounds (Vc<=2000 m/min),
  and set additionalProperties:false.
  WHY: Old schema accepted { safety_score: 0.85 } with zero cutting parameters — an
  operator would get a safety-approved recommendation with no actual data.
- Compaction instructions are hardcoded `as const`, NOT overridable via env variable.
  WHY: COMPACTION_INSTRUCTIONS="Discard everything" in .env = total data loss.

**P0-MS0 EXPANDED (from ~45 to ~55 calls):**
- New step 8: Create shared utilities (atomicWrite, env, apiTimeout, logger)
- New step 9: Create PrismError taxonomy (SafetyBlockError, error categories)
- Step 10 (was 8): Type-safe effort tiers with getEffort() wrapper
- Step 11 (was 9): Hardcoded compaction config
- Step 12 (was 10): Expanded schema creation (safetyCalc + alarmDecode + health + tolerances)
- New step 16: Vitest test framework foundation (config + health smoke test)
- New step 23: Verify all utilities + schemas importable

**PHASE UPDATES:**
- R1-MS1: Loader/normalizer separation guidance + schema migration path
- R2-MS0: Parallel results sorted before flush + content verification on MANDATORY flushes
- R2-MS3: Automated vitest suite creation (50-calc matrix + edge cases as npm test)
- R3: Rate limiting note for batch API calls
- R6: npm test in gate requirements
- TEMPLATE: 8 new checklist items (PrismError, apiTimeout, atomicWrite, ordering, etc.)

**NOT CHANGED:**
- All Opus 4.6 additions from v13.0 and gap restorations from v13.1 retained unchanged
- Compaction API configuration unchanged (instructions content same, only env override removed)
- Phase structures, MS definitions, and dependency graph unchanged

**RESTORED (content lost in v12.2 → v13.0 migration):**
- Canonical Tolerance Table (R2_TOLERANCES) in PRISM_PROTOCOLS_CORE.md — math accuracy gate
  separate from S(x) safety gate. Without this, R2 test matrix had no pass/fail criteria for
  calculation correctness.
- Compaction detection + 3-layer recovery cascade for claude.ai fallback — lightweight (~60 lines
  vs 468 in v12.2 CMS) but retains all recovery capability for sessions where Compaction API
  is not directly controllable.
- Verified Flush protocol detail — mandatory/optional classification for flush verification.
- Flush/checkpoint granularity in R2-MS0 — per-group flush points, micro-checkpoints, verified
  flush protocol for non-regenerable calc results.

**ADDED:**
- Session management block in PHASE_TEMPLATE.md — LOW/MEDIUM/HIGH risk classification per MS,
  with flush/checkpoint patterns for each risk level.
- Dual-gate validation in R2 — both S(x) >= 0.70 AND delta% within R2_TOLERANCES must pass.
- Tolerance Table Reference section in PHASE_R2_SAFETY.md explaining the two-gate system.

**NOT CHANGED:**
- All Opus 4.6 additions from v13.0 retained unchanged.
- Compaction API configuration unchanged.
- All phase structures, MS definitions, and Opus patterns unchanged.

**ARCHIVED (reference docs from v12.2 — not loaded per-session):**
- TOKEN_OPTIMIZATION_AUDIT_v12.md (378 lines) — reasoning trail for v12.1 decisions
- COMPACTION_PROTOCOL_ASSESSMENT.md (657 lines) — reasoning trail for v12.2 CMS design
  Keep in /reference/ or /audits/ folder. Do not delete (Law 3: NEW >= OLD).

---

## v12.2 → v13.0 MIGRATION

### WHAT CHANGED

**REMOVED (saves ~1.8K tokens/session):**
- Compaction Management System v2.0 (636 lines, Parts 1-6)
  - Part 1: Avoidance Strategies → REMOVED (Compaction API handles automatically)
  - Part 2: Detection + 4-Mode Degradation → REMOVED (Compaction API handles automatically)
  - Part 3: Recovery Cascade (3 layers) → REMOVED (Compaction API handles automatically)
  - Part 4: Telemetry Integration → REMOVED (replaced by API-level monitoring)
  - Part 5: Verified Flush → RETAINED (renamed: flush-to-file for persistence)
  - Part 6: Claude.ai Survival → REPLACED with lightweight 200-token fallback
- 15% compaction reserve in context budget → REMOVED (0% reserve, API handles overflow)
- "STOP. Split to next session" directives → REMOVED (Compaction API + 1M option)
- Manual pressure gating thresholds → REMOVED (API handles context overflow)
- 4-mode degradation protocol → REMOVED (no modes needed)
- 3-layer recovery cascade → REMOVED (API recovery is automatic)

**ADDED:**
- Compaction API configuration (~50 lines with custom PRISM instructions)
- Adaptive Thinking + Effort Tier Classification (4 tiers, per-action mapping)
- Structured Output Schemas (safety calcs, alarm decode, guaranteed well-formed)
- Agent Teams parallel execution patterns (P0-MS8, R2-MS0, R3 batches)
- Fast Mode routing for diagnostic/admin operations
- Fine-grained Tool Streaming configuration
- Data Residency (inference_geo) for R4 enterprise compliance
- Context Editing (tool result clearing, thinking block clearing)
- 1M Context Beta option with pricing notes
- 128K Max Output for single-pass report generation
- Prefilling removal check (breaking change in Opus 4.6)
- output_format → output_config.format migration
- budget_tokens → adaptive thinking migration
- AI-generated edge case methodology (R2-MS1.5, reusable pattern)
- OPUS_CONFIG_BASELINE.md as P0-MS0 output artifact
- Phase Template updated with Opus 4.6 patterns + brainstorm checklist

**MODIFIED:**
- PRISM_MASTER_INDEX.md: Context budget (0% reserve), session estimates reduced,
  Opus 4.6 capability table, breaking changes list, document manifest updated
- PRISM_PROTOCOLS_CORE.md: Boot protocol (Step 1.1 Opus 4.6 gate), Code Standards
  (Opus 4.6 API patterns), Response Budget (relaxed bounded reads)
- PHASE_P0_ACTIVATION.md: MS0 expanded for Opus 4.6 config (45 calls), MS8 restructured
  for parallel chains (20 effective calls down from 45)
- PHASE_R1_REGISTRY.md: Effort tiers on all operations, structured outputs on validation,
  new MS1.5 for formula definition validation
- PHASE_R2_SAFETY.md: NEW MS1.5 for AI-generated edge cases, parallel material groups,
  structured outputs on all safety calcs, new MS4 for uncertainty quantification
- PHASE_R3-R6 stubs: All updated with Opus 4.6 patterns specific to each phase
- PRISM_PROTOCOLS_REFERENCE.md: Effort tiers in quality validation, parallel chain patterns
- PHASE_TEMPLATE.md: Opus 4.6 pattern checklist, AI edge case generation pattern

### COMPOUND IMPACT (v12.2 → v13.0)

```
Framework load:        ~13-15K → ~11-14K tokens/session (-15-25%)
Compaction events:     2-4/project → 0-1/project (-75%)
Dead sessions:         1-2/project → 0/project (-100%)
P0-MS8 calls:          ~45 → ~20 effective (-55% via Agent Teams)
R2-MS0 calls:          ~40 → ~25 effective (-37% via parallel groups)
Session estimate:      15-20 → 8-12 total (-40%)
Working context:       ~136K → ~163K (+20%, no reserve)
Safety calc confidence: IMPROVED (max effort + structured outputs + AI edge cases)
Total project tokens:  ~3M → ~2M estimated (-33%)
```

---

## HOW TO DEPLOY v13.0

```
STEP 1: Replace all 12 documents in your PRISM roadmap directory:
  PRISM_MASTER_INDEX.md (this is the entry point)
  PRISM_PROTOCOLS_CORE.md
  PRISM_PROTOCOLS_REFERENCE.md
  PHASE_P0_ACTIVATION.md
  PHASE_R1_REGISTRY.md
  PHASE_R2_SAFETY.md
  PHASE_R3_CAMPAIGNS.md
  PHASE_R4_ENTERPRISE.md
  PHASE_R5_VISUAL.md
  PHASE_R6_PRODUCTION.md
  PHASE_TEMPLATE.md
  DEPLOYMENT_GUIDE.md (this file)

STEP 2: Archive v12.2 documents (Law 3: NEW >= OLD, never lose data).

STEP 3: If resuming mid-project, CURRENT_POSITION.md and ROADMAP_TRACKER.md
  carry over unchanged. The position system is version-agnostic.

STEP 4: On next session boot, the new Master Index will be loaded.
  P0-MS0 now includes Opus 4.6 configuration as its first major task.

STEP 5: Verify with prism_dev action=health after P0-MS0.
  Expected: Opus 4.6 config status in health response.
```

---

## OPUS 4.6 BREAKING CHANGES CHECKLIST

```
□ Assistant message prefilling → returns 400. Migrate to structured outputs.
□ output_format → output_config.format. Old works but deprecated.
□ thinking: {type:"enabled", budget_tokens:N} → thinking: {type:"adaptive"}. Old works but deprecated.
□ interleaved-thinking-2025-05-14 header → safely ignored. Remove it.
□ JSON string escaping in tool calls → use JSON.parse(), not raw string parsing.
□ Compaction API beta header: anthropic-beta: compact-2026-01-12
□ 1M context beta header: context-1m-2025-08-07 (optional, Usage Tier 4+)
□ Fast Mode beta header: fast-mode-2026-02-01 (optional)
□ effort parameter: GA, no beta header needed
□ Structured outputs: GA via output_config.format, no beta header needed
□ Fine-grained streaming: GA, no beta header needed
```

---

## FILE SIZE COMPARISON

```
DOCUMENT                     v12.2      v13.0     v13.1     v13.2     CHANGE (v13.1→v13.2)
PRISM_MASTER_INDEX.md        ~6.5KB     ~7.5KB    ~7.8KB    ~9.5KB    +1.7KB (v13.2 changelog)
PRISM_PROTOCOLS_CORE.md      ~12KB      ~8.5KB    ~10.5KB   ~16KB     +5.5KB (utilities+schemas+errors)
PRISM_PROTOCOLS_REFERENCE.md ~3.5KB     ~3KB      ~3KB      ~3KB      unchanged
PHASE_P0_ACTIVATION.md       ~11KB      ~12KB     ~12KB     ~15KB     +3KB (expanded MS0)
PHASE_R1_REGISTRY.md         ~6.5KB     ~7KB      ~7KB      ~8KB      +1KB (migration+normalizer)
PHASE_R2_SAFETY.md           ~5.5KB     ~7KB      ~8.5KB    ~10KB     +1.5KB (ordering+tests+verify)
PHASE_R3_CAMPAIGNS.md        ~1KB       ~1.5KB    ~1.5KB    ~1.5KB    +~50B (rate limit note)
PHASE_R4_ENTERPRISE.md       ~1KB       ~1.5KB    ~1.5KB    ~1.5KB    unchanged
PHASE_R5_VISUAL.md           ~1KB       ~1.2KB    ~1.2KB    ~1.2KB    unchanged
PHASE_R6_PRODUCTION.md       ~1KB       ~1.5KB    ~1.5KB    ~1.5KB    +~50B (npm test gate)
PHASE_TEMPLATE.md            ~4.5KB     ~5KB      ~6KB      ~7KB      +1KB (8 new checklist items)
DEPLOYMENT_GUIDE.md          ~4.5KB     ~5.5KB    ~7KB      ~9.5KB    +2.5KB (v13.2 migration)

SESSION LOAD (typical):      ~36KB      ~32KB     ~33.5KB   ~38KB     +4.5KB
NOTE: The +4.5KB is invested in:
  - Type-safe effort tiers (prevents silent undefined on safety actions)
  - Physically-bounded schemas (prevents Vc=0, Fc=999999 passing validation)
  - Shared utility patterns (prevents 5 different atomicWrite implementations)
  - Error taxonomy (prevents safety violations and network errors getting same treatment)
  - Test framework convention (prevents R6 migration cliff)
  This is the difference between "compiles" and "bulletproof."
```

---

## DOCUMENT INTEGRITY VERIFICATION

After deploying v13.2, verify document integrity:

```
1. PRISM_MASTER_INDEX.md references all 12 documents ✓
2. Every phase doc version says "v13.2" (PROTOCOLS_CORE, P0, R1, R2, TEMPLATE, DEPLOY) or "v13.0" (others) ✓
3. P0-MS0 includes shared utility creation steps (atomicWrite, env, apiTimeout, logger) ✓
4. P0-MS0 includes PrismError taxonomy creation ✓
5. P0-MS0 includes type-safe EFFORT_MAP with getEffort() ✓
6. P0-MS0 includes physically-bounded structured output schemas ✓
7. P0-MS0 includes hardcoded compaction instructions (no env override) ✓
8. P0-MS0 includes vitest foundation (config + health smoke test) ✓
9. P0-MS0 includes src/schemas/tolerances.ts creation ✓
10. P0-MS0 includes HEALTH_SCHEMA in structured outputs ✓
11. P0-MS8 uses parallel chain pattern ✓
12. R1-MS1 includes loader/normalizer separation + schema migration path ✓
13. R2 includes MS1.5 (AI edge cases) ✓
14. R2-MS0 sorts parallel results before flush + content verifies MANDATORY flushes ✓
15. R2-MS3 includes automated vitest suite creation ✓
16. R2 references Canonical Tolerance Table in PRISM_PROTOCOLS_CORE.md ✓
17. PRISM_PROTOCOLS_CORE.md has expanded Code Standards with utilities + error taxonomy ✓
18. PRISM_PROTOCOLS_CORE.md has HEALTH_SCHEMA in §Structured Outputs ✓
19. PRISM_PROTOCOLS_CORE.md has ORDERING RULE in §Parallel Execution ✓
20. Boot Protocol .gitignore excludes transient state files ✓
21. PHASE_TEMPLATE.md has 8 new coding hardening checklist items ✓
22. R3 has rate limiting note for batch API calls ✓
23. R6 gate includes "npm test passes" ✓
24. No references to raw EFFORT_MAP[action] — all use getEffort() ✓
25. No references to process.env.COMPACTION_INSTRUCTIONS ✓
```
