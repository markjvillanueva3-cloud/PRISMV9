# PRISM MODULAR ROADMAP — MASTER INDEX v13.9
# Safety-Critical CNC Manufacturing Intelligence | Lives Depend on Correctness
# THIS FILE REPLACES v13.8. Load THIS first, then load only what you need.
# v13.9: Cross-Audit Hardening — 13 improvements from external governance audit synthesis.
#         8 of 15 external findings accepted, all improved beyond original recommendations.
#         SYSTEM_CONTRACT.md: New document — all safety/correctness/operational invariants
#           with enforcement mechanisms, violation responses, and test locations (XA-5, XA-11).
#         ARTIFACT DEPENDENCY TABLE: Phase REQUIRES/PRODUCES manifests with entry validation (XA-1).
#         SECURITY FOUNDATION: P0-MS0b gets local-only transport, read-only registry flags,
#           and basic input validation — proportional early security (XA-6).
#         QUANTIFIED ACCEPTANCE: P0 milestones get measurable pass/fail criteria (XA-2).
#         TEST TAXONOMY: L1-L7 model mapped to phases with per-MS level requirements (XA-7).
#         FAULT INJECTION SCHEDULE: One fault test per phase starting R1, not just R6 (XA-13).
#         OBSERVABILITY: Log schema, correlationId propagation, safety decision records (XA-8).
#         SCHEMA VERSIONING: Semver protocol for post-R6 production changes (XA-4).
#         CHANGE CONTROL: 3-tier classification (safety-critical/operational/cosmetic) (XA-10).
#         HUMAN REVIEW: Reviewer qualification, checklists, override audit trail (XA-9).
#         DRY-RUN MODE: DRY_RUN=true for pre-flight validation without side effects (XA-14).
#         COMPLEXITY BUDGET: Dispatcher/action/schema/token limits with growth rules (XA-12).
#         PERFORMANCE THRESHOLDS: Baseline expectations from P0 through production (XA-15).
#         Total: 13 improvements across 4 new sections + 9 existing document updates.
#         Source: External governance audit (ChatGPT) cross-referenced against IA1-IA3.
# v13.8: Third Infrastructure Audit (IA3) — 11 findings from independent 12-point reassessment (9.5→9.6/10).
#         STUCK PROTOCOL: 3-attempt ceiling before escalating to human (IA3-9.1).
#         SUSPECT DATA QUARANTINE: Tier 2.1 degradation for corrupt-but-plausible data (IA3-7.1).
#         GETEFFORT TEST FIX: MS0b step 23 corrected 'high'→'max' for unknown actions (IA3-10.1).
#         DISPATCHER PROBE: Tier 2.5 diagnosis fallback for dispatchers without health action (IA3-1.1).
#         RESPONSE BUDGET VALIDATION: Track estimated vs actual throughput per MS (IA3-2.1).
#         HOOK OUTPUT STABILITY: Additive-only versioning for hook output schemas (IA3-5.1).
#         BOUNDED RECOVERY LOAD: Phase doc bounded read during compaction recovery (IA3-3.1).
#         MULTI-SESSION MS: Cumulative state in CURRENT_POSITION.md for batch work (IA3-4.1).
#         EFFORT TIER VERIFICATION: One-time check that API honors effort parameter (IA3-8.1).
#         PARALLEL PROGRESS: swarm_status polling during long R3+ batches (IA3-6.1).
#         DEPRECATION LIFECYCLE: 3-phase removal protocol for dispatchers/actions (IA3-12.1).
#         Total: 11 findings from third 12-assessment infrastructure audit. Overall: 9.5→9.6/10.
#         ACTION ENUM HARDENING: Dispatcher schemas use JSON Schema enum for action parameter (IA2-1.2).
#         OVERHEAD VALIDATION: Schema token audit runs every P0 session, not just once (IA2-2.1).
#         BOOTSTRAP RESPONSE SAFETY: Manual response limits during MS0b before responseGuard wired (IA2-2.2).
#         COMPACTION TELEMETRY: Append COMPACTION-RECOVERY entries to ROADMAP_TRACKER (IA2-3.1).
#         BLOCKED PRIORITY: Autonomous continue resolves blocks before advancing (IA2-4.1).
#         SKILL SIZE AUDIT: Measure actual skill token cost during P0-MS1 (IA2-5.1).
#         PARALLEL TASK LIMIT: Max 10 concurrent tasks per parallel_batch (IA2-6.1).
#         RESULT ACCESS TEST: P0-MS8 Chain 5 verifies orchestrator.getResult() contract (IA2-6.2).
#         NAMESPACE AUDIT: Verify no tool name collisions across MCP servers at boot (IA2-11.1).
#         SESSION PLANNING STEP: Boot Step 3.5 — Opus-optimized session planning (IA2-8.1).
#         PARTIAL DISPATCHER FAILURE: Tier 2.5 degradation for broken individual dispatchers (IA2-7.1).
#         PHASE GATE AUTOMATION: Distinguish automated vs human-review gates (IA2-9.2).
#         INDEX INTEGRATION: MASTER_INDEX.md (MCP counts) + ROADMAP_INDEX.md (legacy v10 lookup)
#           formally linked to modular roadmap document hierarchy (IA2-STRUCT).
#         STATE FILE FORMAT STABILITY: Backward-compatible field additions (IA2-12.1).
#         Total: 14 findings from second 12-assessment infrastructure audit. Overall: 9.4→9.5/10.
# v13.6: Infrastructure Audit Hardening — 23 findings from 12-point MCP architecture audit.
#         Cross-field physics validation for structured outputs (schema validates fields,
#         imperative code validates physics — the single most critical safety addition).
#         P0-MS0 split into MS0a (create files) + MS0b (wire + verify) for recovery.
#         getEffort() fallback changed high→max (under-reasoning on safety calcs is dangerous).
#         Reference values file for R2 tolerance validation (sourced, pinned, deterministic).
#         S(x) formula derivation documented (0.70 threshold justified for auditors).
#         Material sanity checks (cross-parameter validation catches data swaps).
#         Alarm tolerance changed from exact string match to structured-field match.
#         Calc result versioning (model + formula + data version for audit reproducibility).
#         Adaptive rate limiting (429 response → backoff, not thundering herd).
#         Per-task timeout in parallel batches (one hung task can't block the batch).
#         Health schema expanded with registry_status (detects partial startup).
#         Unit test mandate from P0 (diagnose failures, not just detect them).
#         strictNullChecks enabled from P0, not deferred to R6 (SL-4).
#         R3 batch size corrected to 10 materials (250 concurrent max-effort Opus = impossible).
#         R4 one-session-per-tenant architecture (prevents compaction data leakage).
#         R5 authentication requirement + dual build pipeline.
#         R6 safety-score-under-load validation + monitoring/alerting architecture.
#         Orphaned .tmp cleanup at boot. Atomic ROADMAP_TRACKER writes.
#         Claude Desktop restart process verification. PHASE_FINDINGS size cap.
#         Total: 42 findings addressed across all documents.
#         Result: Production-safe (up from ~99% instruction-complete in v13.4).
#         Every step now has failure-path instructions, not just happy-path.
#         Build failure triage. MCP server restart awareness. Structured output invocation guide.
#         Sub-MS position tracking lowered to >8 calls. Intermediate variable persistence.
#         Registry merge strategy (format detection, primary keys, dedup, verify).
#         Ralph/Omega assessment criteria explained. BASELINE-INVALID re-validation in MS8.
#         Loader fix patterns, formula fix diagnostics, prompt size budgets for AI edge cases.
#         Phase gate smoke test expanded (state file integrity, not just dispatcher health).
#         Stub session estimates corrected (+1 brainstorm session). R5 tech stack decision gate.
#         First-time setup prerequisites. Crash recovery. Wall-clock time estimates.
#         Result: ~99% instruction-complete (up from ~96% tool-deterministic in v13.3).
# v13.3: Tool Utilization Hardening — 23 gaps closed from audit. Every step now specifies
#         exact dispatcher.action, effort tier, structured output schema, and pass/fail criteria.
# v13.2: Coding best practices hardening — type-safe effort tiers, physically-bounded schemas,
#         shared utilities (atomicWrite, env, apiTimeout, logger), PrismError taxonomy,
#         tolerances.ts source file, health schema validation, vitest foundation,
#         hardcoded compaction instructions, parallel result ordering, content-verified flushes,
#         API rate limiting for batches, structured JSON logging from P0 onward.
# v13.1: Gap restoration — Canonical Tolerance Table, claude.ai recovery cascade,
#         verified flush detail, session management. All Opus 4.6 additions retained.
# v13.0: Full Opus 4.6 capability integration — Compaction API, Adaptive Thinking,
#         Agent Teams, Structured Outputs, 1M context beta, Fast Mode, Data Residency.

---

## HOW TO USE THIS INDEX

```
1. EVERY session starts by loading THIS document (costs ~2.5K tokens)
2. Read CURRENT POSITION from CURRENT_POSITION.md (fallback: ROADMAP_TRACKER.md last 5 entries)
3. Load PRISM_PROTOCOLS_CORE.md (boot/opus config/laws/standards/response budgets — ~3.1K tokens)
4. Load ONLY the active phase document (4-8K tokens each)
5. Execute. Never load more than 1 phase doc unless crossing a phase boundary.
6. Total typical session cost: ~10-12K tokens vs ~13-15K for v12.2, ~32K for the old monolith

NEVER load the full monolith (PRISM_MASTER_ROADMAP_v11_6.md). It exists as archive only.
NEVER load PRISM_PROTOCOLS_REFERENCE.md in full — load only the section you need.
NEVER load a phase doc without checking its dependencies below.
NEVER load more than 2 phase docs in a single session.

RELATED INDEX FILES (distinct from THIS document):

  MASTER_INDEX.md — The MCP SERVER's canonical truth source for live system counts.
    Located at: C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md
    Contains: S1 (dispatcher/action/engine counts), S2 (registries), S3 (sequencing guides).
    Law 8: Live system counts must match MASTER_INDEX.md S1.
    Read via: prism_doc action=read name=MASTER_INDEX.md
    Load at: Phase gates ONLY (coherence check), P0-MS5 (stub scaffolding), P0-MS8 (gate).
    DO NOT load every session — costs ~1.5K tokens, only needed at gates.

  ROADMAP_INDEX.md — The LEGACY v10 monolith's indexed line-range lookup table.
    Located at: C:\PRISM\mcp-server\data\docs\ROADMAP_INDEX.md
    Contains: Line ranges for every MS, protocol, SAU stop in PRISM_ROADMAP_v10_NUMBERED.md.
    Status: SUPERSEDED by this modular system. The v10 monolith is archived.
    Use ONLY if: (a) referencing historical MS definitions from v10, or (b) a protocol from
    the v10 era needs to be imported into a modular phase doc during stub expansion.
    DO NOT load during normal execution — the modular phase docs ARE the current roadmap.

  THIS FILE (PRISM_MASTER_INDEX.md) is the modular roadmap's session-level index.
    It replaces the role ROADMAP_INDEX.md played for the v10 monolith.
    THIS is what you load every session. Not MASTER_INDEX.md. Not ROADMAP_INDEX.md.
```

---

## SESSION WORKFLOW (execute every session, no exceptions)

```
STEP 1: LOAD    → This index (already done if you're reading this)
STEP 2: POSITION → prism_doc action=read name=CURRENT_POSITION.md
                    If missing → prism_doc action=read name=ROADMAP_TRACKER.md (last 5 entries)
                    If both missing → you are at P0-MS0
STEP 3: PROTOCOLS → Load PRISM_PROTOCOLS_CORE.md (boot, Opus 4.6 config, laws, code standards)
STEP 4: BOOT     → Execute Boot Protocol from PRISM_PROTOCOLS_CORE.md
STEP 5: PHASE    → Load the ONE phase doc matching your current position
STEP 6: EXECUTE  → Follow the MS steps in the loaded phase doc
                    Compaction: API handles automatically. Claude.ai fallback: see §FALLBACK in PROTOCOLS_CORE.
                    Flush non-regenerable results to disk for cross-session persistence (not compaction).
                    Apply effort tiers per §Adaptive Thinking Configuration in PRISM_PROTOCOLS_CORE.md.
STEP 7: RECORD   → prism_doc action=append name=ROADMAP_TRACKER.md content="[MS-ID] COMPLETE [date]"
                    prism_doc action=write name=CURRENT_POSITION.md content="CURRENT: [next-MS] | LAST_COMPLETE: [MS-ID] [date] | PHASE: [ID] [status]"
STEP 8: SHED     → prism_context action=context_compress (between MS transitions)
STEP 9: SAVE     → prism_session action=state_save | prism_context action=todo_update
```

---

## OPUS 4.6 CAPABILITIES IN USE (quick reference — details in PRISM_PROTOCOLS_CORE.md)

```
CAPABILITY                  WHERE USED                     STATUS
Compaction API              All API calls via MCP server   Replaces CMS v2.0
Adaptive Thinking           All API calls, effort-tiered   Replaces uniform reasoning
  effort=max                Safety calcs, ralph, omega     NEW — deepest reasoning
  effort=high               Data retrieval, code search    DEFAULT
  effort=medium             Build, swarm, operational      Balanced
  effort=low                Health, list, stats, state     Fastest
Structured Outputs          Safety-critical calc returns   NEW — schema-guaranteed
1M Context Beta             Optional for heavy sessions    Eliminates session splitting
128K Max Output             Report generation              Enables single-pass reports
Agent Teams                 P0-MS8, R2-MS0, R3 batches    Parallel chain execution
Fast Mode                   Diagnostic/admin operations    2.5x faster, premium cost
Fine-grained Tool Stream    Large write operations         GA, no beta header
Data Residency              R4 enterprise compliance       inference_geo parameter
Context Editing             Tool result clearing           Supplements flush-to-file
Interleaved Thinking        Automatic with adaptive        No beta header needed
```

---

## PHASE REGISTRY

| ID | Title | Doc | Status | Depends On | Sessions | Tokens |
|----|-------|-----|--------|------------|----------|--------|
| P0 | Full System Activation | PHASE_P0_ACTIVATION.md | not-started | none | 2 | ~8K |
| R1 | Registry Resurrection | PHASE_R1_REGISTRY.md | not-started | P0 complete | 1-2 | ~6K |
| R2 | Safety Test Matrix | PHASE_R2_SAFETY.md | not-started | R1 complete | 1 | ~5K |
| R3 | Data Campaigns | PHASE_R3_CAMPAIGNS.md | not-started | R2 complete | 3-4 | ~1K stub |
| R4 | Enterprise Foundation | PHASE_R4_ENTERPRISE.md | not-started | R2 complete | 3-4 | ~1K stub |
| R5 | Visual Platform | PHASE_R5_VISUAL.md | not-started | R4 complete | 4-5 | ~1K stub |
| R6 | Production Hardening | PHASE_R6_PRODUCTION.md | not-started | R3+R4+R5 | 2-3 | ~1K stub |

```
STATUS VALUES: not-started | in-progress | complete | blocked
UPDATE: Change status HERE when a phase gate passes. This index is truth for phase status.
STUBS: R3-R6 are stubs. Expand via Brainstorm-to-Ship (S3.22) at phase start using
       PHASE_TEMPLATE.md + PHASE_FINDINGS.md as inputs.
       Session estimates for stubs include 1 brainstorm session for stub expansion.
NOTE: Session estimates reduced from v12.2 due to Compaction API (no dead sessions),
      Agent Teams (parallel execution), and 1M context option (no forced session splits).
```

---

## DEPENDENCY RESOLUTION

```
BEFORE loading any phase doc:
  1. Check its "Depends On" column above
  2. Verify ALL dependencies show status=complete in this index
  3. If a dependency is NOT complete → STOP. Execute the dependency phase first.
  4. If a dependency is blocked → Read ROADMAP_TRACKER.md for the block reason. Fix it.

CROSS-PHASE DATA FLOW (with artifact manifests — XA-1):
  P0 → R1: P0 fixes WIRING + Opus 4.6 config. R1 loads DATA.
    P0 REQUIRES: (none — first phase)
    P0 PRODUCES: PHASE_FINDINGS.md (P0 section), P0_DISPATCHER_BASELINE.md,
                 SYSTEM_ACTIVATION_REPORT.md, OPUS_CONFIG_BASELINE.md, SKILL_NAME_MAP.md
  R1 → R2: R1 loads registries >95%.
    R1 REQUIRES: PHASE_FINDINGS.md (P0 section), P0_DISPATCHER_BASELINE.md, OPUS_CONFIG_BASELINE.md
    R1 PRODUCES: REGISTRY_AUDIT.md, PHASE_FINDINGS.md (R1 section)
  R2 → R3: R2 builds 50-calc test matrix + AI-generated edge cases.
    R2 REQUIRES: REGISTRY_AUDIT.md, PHASE_FINDINGS.md (R1 section)
    R2 PRODUCES: R2_CALC_RESULTS.md, PHASE_FINDINGS.md (R2 section), test files in src/__tests__/
  R3/R4/R5 → R6: All three feed into production hardening. R6 requires Omega >= 0.85.
    R6 REQUIRES: PHASE_FINDINGS.md (R3+R4+R5), R2_CALC_RESULTS.md, all src/__tests__/,
                 SYSTEM_CONTRACT.md
    R6 PRODUCES: PRODUCTION_READINESS_REPORT.md, SECURITY_AUDIT_REPORT.md, PERFORMANCE_BASELINE.md

ARTIFACT VALIDATION (at phase entry — Boot Step 2.5):
  Check ALL REQUIRES artifacts exist + are non-empty.
  If ANY missing → STOP. Prior phase did not complete correctly.
  See SYSTEM_CONTRACT.md §Artifact Dependency Table for full mapping.

IF MODIFYING A PHASE DOC:
  → Check: does the change affect any output listed above?
  → If yes: add a NOTE to PHASE_FINDINGS.md flagging the downstream impact
  → If structural (new dispatcher, changed registry): update this index + PRISM_PROTOCOLS_CORE.md
```

---

## CRITICAL PATH (zero-float sequence)

```
P0-MS0a (create) → P0-MS0b (wire) → P0-MS3 (dedup) → R1-MS1 (materials) → R1-MS1.5 (formulas)
  → R1-MS2 (registries) → R1-MS3 (pipelines) → R2-MS0 (calcs) → R2-MS3 (build gate)
  → R3 → R4 → R5 → R6
```

---

## DEFINITION OF DONE (entire roadmap)

```
The roadmap is COMPLETE when ALL of these are true:
  1. All 6 phases show status=complete in §Phase Registry above
  2. All 14 integration chains pass under load (R6 stress test)
  3. Omega >= 0.85 at R6 gate
  4. npm test passes with full regression suite (50 R2 + R3 batches + edge cases)
  5. Safety: S(x) delta < 0.02 between isolated and loaded execution (SL-5)
  6. All security audit findings from R6-MS2 resolved
  7. Runbooks exist for: boot, restart, recovery, backup, monitoring, rollback
  8. PRISM serves accurate, safety-validated cutting parameters for >90% of 3518+ materials
  9. Operators can query material → get safe params → decode alarms → predict failures

When these criteria are met: PRISM is production-ready.
Each phase gate measures progress toward these criteria. R6 gate IS this checklist.
```

---

## WHAT IS PRISM (for new sessions)

PRISM is a safety-critical CNC manufacturing intelligence MCP server (31 dispatchers, 368 actions, 37 engines). It recommends cutting parameters, predicts tool life, validates safety limits, decodes machine alarms. Mathematical errors cause tool explosions and operator injuries. S(x)>=0.70 and Omega>=0.70 are hard blocks. The system manages 3,518+ materials (127 params each), 824+ machines, 1,944+ tools, 9,200+ alarm codes.

ROOT PROBLEM: 4 duplicate registry pairs cause subsystems to read different data files. P0 fixes wiring + configures Opus 4.6, R1 loads data, R2 tests calculations, R3-R6 hardens for production.

---

## CONTEXT BUDGET MODEL

```
STANDARD WINDOW (default):
  TOTAL WINDOW:        200K tokens (~600KB)
  SYSTEM OVERHEAD:     ~37K tokens (system prompt, tool schemas, memory — reduced from 40K)
  USABLE PER SESSION:  ~163K tokens (~490KB)
  COMPACTION RESERVE:  0% — Compaction API handles context overflow automatically
  WORKING BUDGET:      ~163K tokens (~490KB)

  WHY 0% RESERVE (changed from 15% in v12.2):
    The Compaction API (compact_20260112) provides server-side context summarization.
    When context approaches the configured trigger (150K tokens), the API automatically
    generates a summary preserving PRISM state, positions, and calc results.
    Manual pressure gating, 4-mode degradation, and recovery cascades are eliminated.
    The 15% reserve (24K tokens) is returned to working budget.

1M CONTEXT BETA (optional — requires Usage Tier 4+):
  TOTAL WINDOW:        1M tokens (~3MB)
  SYSTEM OVERHEAD:     ~40K tokens
  USABLE PER SESSION:  ~960K tokens (~2.9MB)
  NOTE: Premium pricing above 200K tokens ($10/$37.50 per MTok vs $5/$25)
  USE WHEN: P0-MS8 integration gate, R2-MS0 full calc sweep, R3 batch campaigns
  BENEFIT: Eliminates ALL session splitting. P0 completes in 1-2 sessions instead of 2-3.

TYPICAL SESSION LOAD (v13.4):
  Master Index:         ~3.0K tokens (this file — grew from 2.5K for v13.4 completeness)
  Protocols CORE:       ~5.0K tokens (grew from 3.1K for build triage, crash recovery, ralph/omega)
  1 Phase Doc:          ~5-8K tokens
  Boot overhead:        ~0.7K tokens
  Phase skills:         ~1-2K tokens (2-4 skills × ~0.5K each — loaded at Step 1.5)
  TOTAL FRAMEWORK:      ~15-19K tokens (~50KB)
  REMAINING FOR WORK:   ~144-148K tokens (~430KB)

  vs v13.5: ~14-17K framework → ~15-19K framework = ~1-2K tokens for phase skill loading.
  Skills are genuinely on-demand (loaded per-phase, not every session with max skills).

  GROWTH PROJECTION:
    v13.0: ~11-14K framework | v13.5: ~14-17K framework | v13.6: ~15-19K framework
    Growth rate: ~2-3K per major version cycle (~1K per hardening pass)
    Projected by R6: ~20-24K framework load (acceptable — well within 200K budget)
    
    IF framework exceeds 25K: Split PROTOCOLS_CORE into PROTOCOLS_CORE (boot + laws + effort)
    and PROTOCOLS_SAFETY (structured outputs + tolerances + physics validation).
    Load PROTOCOLS_SAFETY only during R2+ phases that run calcs.
    
    MONITORING: At each phase gate, measure actual framework load:
      prism_context action=context_monitor_check after loading index + protocols + phase doc.
      Record in PHASE_FINDINGS.md: "Framework load at [phase] gate: [N]K tokens."

  vs v13.3: ~11-14K framework → ~14-17K framework = ~3K tokens invested in:
    - Build failure triage (prevents every session from stalling on first build error)
    - MCP server restart (prevents every code change from appearing to not work)
    - Ralph/Omega guide (prevents every phase gate from being a black box)
    - Sub-MS position tracking (prevents full-MS restarts on session death)
    - Wall-clock time estimates, crash recovery, 1M context decision rule
  This is the difference between "tool-deterministic" and "failure-proof."

ON-DEMAND LOADS (from PRISM_PROTOCOLS_REFERENCE.md — load ONLY what you need):
  Quality Tiers:       ~250 tokens  (load at phase gates)
  Active Role:         ~80 tokens   (load 1 of 7 at boot)
  Standard Rollback:   ~200 tokens  (load on failure)
  Sequencing Guides:   ~250 tokens  (load before chain execution)
  Wiring Chains:       ~250 tokens  (load for P0-MS8, R6)
```

---

## DOCUMENT MANIFEST

| Document | Purpose | When to Load |
|----------|---------|--------------|
| PRISM_MASTER_INDEX.md | This file — workflow + budget + dependencies | Every session |
| PRISM_PROTOCOLS_CORE.md | Boot, Opus 4.6 config, 8 laws, code standards, response budgets | Every session |
| SYSTEM_CONTRACT.md | Safety/correctness/operational invariants + violation responses | At phase gates only |
| PRISM_PROTOCOLS_REFERENCE.md | Quality tiers, roles, rollback, guides, chains | On demand (see §headers) |
| PHASE_P0_ACTIVATION.md | 9 MS: wire all subsystems + Opus 4.6 config | During P0 |
| PHASE_R1_REGISTRY.md | 7 MS: load all registry data >95% | During R1 |
| PHASE_R2_SAFETY.md | 5 MS: 50-calc test matrix + AI edge cases | During R2 |
| PHASE_R3_CAMPAIGNS.md | Stub → expand at R3 start | During R3 |
| PHASE_R4_ENTERPRISE.md | Stub → expand at R4 start | During R4 |
| PHASE_R5_VISUAL.md | Stub → expand at R5 start | During R5 |
| PHASE_R6_PRODUCTION.md | Stub → expand at R6 start | During R6 |
| PHASE_TEMPLATE.md | Template for expanding R3-R6 stubs | At R3+ phase start |
| CURRENT_POSITION.md | Single-line position (overwritten each MS) | Every session (fast read) |
| ROADMAP_TRACKER.md | Append-only MS completion log (audit trail) | Fallback if CURRENT_POSITION missing |
| ACTION_TRACKER.md | Step-group + sub-checkpoint log | During MS with >8 calls per group |
| PHASE_FINDINGS.md | Inter-phase knowledge transfer | At phase gates + R3+ brainstorm (tiered) |
| MASTER_INDEX.md | MCP server canonical counts (S1-S3) — Law 8 truth | At phase gates only |
| OPUS_CONFIG_BASELINE.md | Opus 4.6 API configuration audit | P0-MS0 output, phase gates |
| ROADMAP_INDEX.md | Legacy v10 monolith line-range lookup (archived) | Only for v10 protocol import |
| PRISM_Cross_Audit_Assessment.md | External audit synthesis — reasoning trail for v13.9 | Reference only |

```
NAME DISAMBIGUATION (v13.7):
  PRISM_MASTER_INDEX.md = THIS file. The modular roadmap's session-level index.
  MASTER_INDEX.md       = The MCP server's canonical counts file (S1 dispatchers/actions/engines,
                          S2 registries, S3 sequencing guides). Referenced by Law 8.
  ROADMAP_INDEX.md      = The legacy v10 monolith's line-range lookup. SUPERSEDED by this
                          modular system. Archived at C:\PRISM\mcp-server\data\docs\.

  These are THREE DIFFERENT FILES. Do not confuse them.
  Load THIS file every session. Load MASTER_INDEX.md at gates. Load ROADMAP_INDEX.md never
  (unless importing a v10-era protocol into a stub expansion).
```

---

## SEQUENCING GUIDES & WIRING CHAINS

```
Load from PRISM_PROTOCOLS_REFERENCE.md ONLY when needed:
  → P0-MS4: AutoPilot wiring (needs S3.5, S3.8 guide sequences)
  → P0-MS8: Integration gate (needs all 14 wiring chains)
  → R6: Final chain check (needs all 14 wiring chains)
  → Any MS explicitly referencing a S3.X guide
Do NOT load these into every session — ~500 tokens used in only 3-4 of 10-15 sessions.
```

---

## PHASE_FINDINGS TIERED LOADING

```
PHASE_FINDINGS.md grows with each phase. By R6 it may be 4-6KB. NEVER load in full.

AT BRAINSTORM (R3+ stub expansion):
  1. prism_doc action=read name=PHASE_FINDINGS.md
  2. Extract ONLY rows tagged "CRITICAL" for target phase + 1 prior phase
     SIZE CAP: Maximum 10 CRITICAL findings per phase (most recent first).
     If more than 10 exist for a phase, summarize the remainder in a single line:
       "CRITICAL: [N] additional findings — see PHASE_FINDINGS.md for full list."
  3. If pressure <30%: also extract "IMPORTANT" for target phase only (max 5)
  4. DISCARD all "NOTE" findings and findings from phases >1 prior

AT PHASE GATE:
  Read CRITICAL findings for current phase only (max 10).
  Append this phase's findings using priority tags: CRITICAL / IMPORTANT / NOTE.

NEVER hold full PHASE_FINDINGS.md in context during brainstorm or execution.
```

---

## VERSION CONTROL

```
INDEX VERSION: 13.9 (2026-02-14)
DERIVED FROM: v13.8 + PRISM_Cross_Audit_Assessment.md (13 improvements from external governance audit)
PROTOCOLS CORE VERSION: 13.9
PROTOCOLS REFERENCE VERSION: 13.7
SYSTEM CONTRACT VERSION: 13.9 (NEW)
PHASE DOC VERSIONS:
  P0: 13.9 | R1: 13.9 | R2: 13.9 | R3: 13.9 | R4: 13.9 | R5: 13.9 | R6: 13.9
TEMPLATE VERSION: 13.9
DEPLOYMENT GUIDE VERSION: 13.9

WHAT CHANGED IN v13.9 (from v13.8 — Cross-Audit Governance Hardening, 13 improvements):
  NEW DOCUMENT:
  - SYSTEM_CONTRACT.md: All safety/correctness/operational invariants consolidated into one
    auditable artifact. Enforcement mechanisms, violation responses, test locations for each.
    Includes: Artifact Dependency Table, Complexity Budget, Change Control Tiers, Human Review
    Protocol, Test Taxonomy (L1-L7), Log Schema, Schema Versioning, Dry-Run Mode, Performance
    Thresholds. Source: XA-1,2,4,5,7,8,9,10,11,12,13,14,15.
  PHASE DOC UPDATES:
  - P0: Security foundation added to MS0b (local-only transport, read-only registry, input
    validation). Quantified acceptance criteria on all milestones. (XA-2, XA-6)
  - R1: Fault injection test added — kill registry mid-load → verify Tier 2 degradation. (XA-13)
  - R2: Fault injection test added — feed NaN → verify S(x) blocks. Test levels declared. (XA-13)
  - R3: Fault injection test added — timeout batch task → verify partial results. (XA-13)
  - R4: Fault injection test added — disconnect tenant → verify no data leakage. (XA-13)
  - R5: Fault injection test added — malformed API data → verify error display. (XA-13)
  - R6: Full fault injection suite. SYSTEM_CONTRACT.md as gate artifact. (XA-13)
  PROTOCOLS CORE UPDATES:
  - Log schema + correlationId propagation added to §Code Standards. (XA-8)
  - Phase gate now validates REQUIRES artifacts from SYSTEM_CONTRACT.md. (XA-1)
  - Boot Step 2.5 artifact validation enhanced. (XA-1)
  TEMPLATE UPDATE:
  - Artifact manifest (REQUIRES/PRODUCES) section added. (XA-1)
  - Test level declaration requirement added. (XA-7)
  - Fault injection slot added per phase. (XA-13)
  DEPLOYMENT GUIDE UPDATE:
  - Human review protocol added. (XA-9)
  - SYSTEM_CONTRACT.md listed in deployment artifacts. (XA-5)
  SOURCE: External governance audit (ChatGPT) cross-referenced against IA1-IA3.
  8 of 15 external findings accepted, all improved beyond original recommendations.

WHAT CHANGED IN v13.8 (from v13.7 — Third Infrastructure Audit, 11 findings):
  TIER 1 (3 fixes — highest impact-to-effort):
  - GETEFFORT FIX: P0-MS0b step 23 expected 'high' for unknown actions, should be 'max'. (IA3-10.1)
  - STUCK PROTOCOL: After 3 failed fix attempts, STOP + preserve state + escalate. (IA3-9.1)
  - SUSPECT DATA QUARANTINE: Tier 2.1 for corrupt-but-plausible registry data. (IA3-7.1)
  TIER 2 (3 fixes — apply in P0):
  - DISPATCHER PROBE: Tier 2.5 fallback for dispatchers without health action. (IA3-1.1)
  - RESPONSE BUDGET VALIDATION: Record estimated vs actual throughput per MS. (IA3-2.1)
  - HOOK OUTPUT STABILITY: Additive-only schema versioning for hooks. (IA3-5.1)
  TIER 3 (5 fixes — apply during R1-R3):
  - BOUNDED RECOVERY LOAD: Load only active MS section during compaction recovery. (IA3-3.1)
  - MULTI-SESSION MS: Cumulative batch state in CURRENT_POSITION.md. (IA3-4.1)
  - EFFORT TIER VERIFICATION: One-time effort parameter effectiveness check. (IA3-8.1)
  - PARALLEL PROGRESS: swarm_status polling for long R3+ batches. (IA3-6.1)
  - DEPRECATION LIFECYCLE: 3-phase protocol for removing dispatchers/actions. (IA3-12.1)

WHAT CHANGED IN v13.7 (from v13.6 — Second Infrastructure Audit, 14 findings):
  CRITICAL (5 fixes — Tier 1, highest impact-to-effort):
  - ACTION ENUM HARDENING: Dispatcher 'action' parameter uses JSON Schema enum for all valid
    actions. Prevents hallucinated action names. Cost: ~5 tokens/dispatcher. (IA2-1.2)
  - OVERHEAD VALIDATION: Schema token audit (Boot Step 3.1) runs every P0 session, not once.
    Validates the ~37K estimate with live data before framework decisions depend on it. (IA2-2.1)
  - BOOTSTRAP RESPONSE SAFETY: Manual response limits during MS0b dispatcher verification
    (before responseGuard is wired). Prevents context blow during the bootstrap session. (IA2-2.2)
  - COMPACTION TELEMETRY: When recovery cascade fires, append COMPACTION-RECOVERY entry to
    ROADMAP_TRACKER. Zero extra calls — piggybacks on existing append. (IA2-3.1)
  - BLOCKED PRIORITY: Autonomous continue (human says "continue") resolves BLOCKED status
    before advancing to next MS. Blocks compound if skipped. (IA2-4.1)
  HIGH (5 fixes — Tier 2, apply in P0):
  - SKILL SIZE AUDIT: Measure actual skill token cost during P0-MS1 via context_monitor before/after.
    Validates the ~0.5K/skill estimate. Record in OPUS_CONFIG_BASELINE.md. (IA2-5.1)
  - PARALLEL TASK LIMIT: Maximum 10 concurrent tasks per parallel_batch. R3 batch size already
    calibrated to this. Queue remainder in batches of 10. (IA2-6.1)
  - RESULT ACCESS TEST: P0-MS8 Chain 5 explicitly verifies orchestrator.getResult(1) returns
    Chain 1's safety_score. One-time contract validation. (IA2-6.2)
  - NAMESPACE AUDIT: At P0-MS0b, verify no tool name collisions across all connected MCP servers
    (PRISM, Desktop Commander, PDF Tools, etc.). 1-2 calls. (IA2-11.1)
  - SESSION PLANNING STEP: Boot Step 3.5 — plan session execution order in reasoning (0 calls)
    before starting work. Leverages Opus 4.6 planning over reactive step-by-step. (IA2-8.1)
  MEDIUM (4 fixes — Tier 3, apply during R1-R2):
  - PARTIAL DISPATCHER FAILURE: Tier 2.5 degradation hierarchy for individual dispatcher errors
    while MCP server is running. Diagnosis and recovery protocol. (IA2-7.1)
  - PHASE GATE AUTOMATION: Distinguish automated gates (P0, R1), human-review-recommended gates
    (R2, R6), and automated-with-override (R3, R4, R5). (IA2-9.2)
  - INDEX INTEGRATION: MASTER_INDEX.md (MCP server counts) and ROADMAP_INDEX.md (legacy v10 lookup)
    formally linked in document hierarchy with load rules. (IA2-STRUCT)
  - STATE FILE FORMAT STABILITY: Backward-compatible field additions — parsers tolerate missing
    trailing fields. No version header needed for plain-text state files. (IA2-12.1)

WHAT CHANGED IN v13.5 (from v13.4 — Gap Analysis & Pitfall Hardening, 42 findings):
  CRITICAL (5 fixes):
  - BUILD FAILURE TRIAGE: Added to Protocols Core §Code Standards. Every MS runs builds but
    v13.3 never documented what to do when builds fail. Now: type error/import error/OOM/syntax
    error classification with fix procedures. First error only → classify → fix one → rebuild.
  - MCP SERVER RESTART: Added to Boot Protocol. Code changes take effect only after restart.
    Without this, executor builds new code but server serves old dist/. Now: explicit restart
    instruction after every build that modifies runtime behavior.
  - STRUCTURED OUTPUT INVOCATION: Added to §Structured Outputs. Referenced 30+ times in phases
    but v13.3 never explained HOW a prism_ call uses structured outputs. Now: explained as
    server-level enforcement after P0-MS0 wiring — executor does NOT pass schema per-call.
  - SUB-MS POSITION TRACKING: ACTION_TRACKER threshold lowered from >12 to >8 calls.
    v13.3 left 5 of 9 P0 milestones (10-12 calls each) with zero sub-MS tracking.
    Now: lightweight position update every 5 calls + ACTION_TRACKER at >8 calls.
  - REGISTRY MERGE STRATEGY: Added to P0-MS3. This is the ROOT PROBLEM the roadmap solves.
    v13.3 said "merge loser INTO winner (additive)" with no format/schema/dedup guidance.
    Now: format detection, primary keys per registry type, dedup, merge verification.
  HIGH (8 fixes):
  - P0-MS0 refactor workflow: file edit ordering (config→wrapper→dispatchers) + batch build.
  - P0-MS0 utility integration check: verify utilities are imported, not just created (Law 6).
  - P0-MS0 effort tier integration point: where getEffort() plugs into API client wrapper.
  - P0-MS1 skill diagnostic tree: glob pattern → directory listing → compare → fix.
  - R1-MS1 loader fix patterns: concrete patterns for type coercion, null-fill, encoding, schema.
  - R2-MS1.5 prompt size budget: formula defs ~50 lines, schema ~30 lines, edges ~20 lines.
  - R2-MS2 formula fix diagnostic: hand-calculate → compare → classify (formula vs data bug).
  - RALPH/OMEGA ASSESSMENT: Explained what these tools evaluate and how to improve scores.
  MEDIUM (10 fixes):
  - BASELINE-INVALID re-validation added to P0-MS8 prerequisites.
  - Intermediate variable persistence pattern (task_ids, file paths survive compaction).
  - Phase gate smoke test expanded (state file integrity, not just dispatcher health).
  - Compaction instructions enhanced (preserve current step number within MS).
  - Layer 2 recovery prerequisite documented (requires 15+ calls in session).
  - R3 ATCS orphaned task handling for session crashes.
  - R1-MS2 per-registry normalizer complexity guidance (machines easy, alarms hard).
  - R2-MS1.5 minimum VALID-DANGEROUS count (≥5 required).
  - R2-MS2 regression sample selection guidance (common + exotic + edge).
  - Parallel vs sequential shared-state quick check for novice executors.
  LOW (5 fixes):
  - 1M context decision rule added (when, how to enable, cost warning).
  - Wall-clock time estimates per MS tier added to Protocols Core.
  - First-time setup prerequisites added to Deployment Guide.
  - R5 technology stack decision gate added to stub.
  - R6 stress test clarified (sustained load, not DDoS — p-queue controlled).
  CROSS-CUTTING:
  - CRASH RECOVERY: New section in Protocols Core for MCP server crash handling.
  - Git .gitignore creation procedure clarified (append, not overwrite).

WHAT CHANGED IN v13.3 (from v13.2 — Tool Utilization Hardening, 23 findings):
  CRITICAL (3 fixes):
  - BOOT PROTOCOL Step 1.5: Added skill_load + hook_enable for phase-specific skills/hooks.
    Without this, 119 skills and 62+ hooks EXIST but were never USED (Law 6 violation).
  - R2-MS1.5: AI edge case generator now specifies prism_orchestrate action=agent_execute agent=opus.
    Was the ONLY step in entire roadmap without a named dispatcher.
  - SWARM PATTERN SELECTION: Added decision guide for parallel_batch vs sequential_chain vs map_reduce.
  HIGH (5 fixes):
  - P0-MS0 dispatcher batches: All 31 calls now have explicit effort levels + pass/fail criteria.
  - P0-MS1 guard wiring: Added prism_guard action=pattern_scan verify call with criteria.
  - P0-MS2 cadence: Added runtime cadence test via build→gsd_sync→verify.
  - R3-R6 tool anchors: All stub phases now have concrete dispatcher calls per future MS.
  - R6 test suite growth: Documented npm test evolution path R2→R3→R4→R5→R6.
  MEDIUM (8 fixes):
  - P0-MS4 scope clarification (AutoPilot only, not guide sequences).
  - P0-MS5 generator output criteria (3 required fields, do NOT register test hook).
  - P0-MS6 agents/swarms/ATCS with exact calls and pass criteria.
  - P0-MS7 all F-series with exact calls, effort, and fallback for prism_manus.
  - R1-MS3 pipeline effort annotations per sub-call.
  - R1-MS4 coverage audit effort annotations.
  - R2-MS2 fix cycle with explicit code_search→file_read→str_replace→build→verify flow.
  - CADENCE AWARENESS section added to Protocols Core.
  LOW (7 fixes):
  - Effort annotations added to: P0-MS0 audit (steps 1-5), R2-MS2 triage.
  - Context editing prescription added to parallel execution section.
  - Manus Law cognitive guard clarification added to Phase Template.
  - R3 ATCS tracking calls specified (task_init, task_update, task_complete, task_list).
  - R4 compliance + tenant action inventories specified.
  - R5 dashboard data source mapping with full dispatcher→UI component flow.
  - Phase Template checklist: test count tracking across phases.

WHAT CHANGED IN v13.2 (from v13.1 — Coding Best Practices Hardening, 14 findings):
  CRITICAL:
  - EFFORT_MAP: Record<string,string> → Record<ActionName,EffortLevel> with compile-time
    exhaustiveness + getEffort() runtime fallback defaulting to 'high' (defensive)
  - STRUCTURED OUTPUTS: All cutting params now required (not just safety_score).
    exclusiveMinimum:0 (rejects Vc=0), physical upper bounds (Vc<=2000, Fc<=100000),
    additionalProperties:false. Prevents safety-approved empty recommendations.
  HIGH:
  - COMPACTION INSTRUCTIONS: Hardcoded `as const`, not env-configurable (safety invariant)
  - SHARED UTILITIES: P0-MS0 creates src/utils/atomicWrite.ts, env.ts, apiTimeout.ts, logger.ts
  - API TIMEOUT: apiCallWithTimeout<T>() wrapper distinguishes AbortError, cleans up timer
  MEDIUM:
  - ENV PARSING: Centralized envBool/envString/envInt replaces inline patterns
  - SCHEMA MIGRATION: Version mismatch triggers migration chain, not rejection (R1-MS1)
  - PARALLEL ORDERING: Sort by stable key before flush (deterministic diffs)
  - .GITIGNORE: Excludes transient state files, keeps audit trail tracked
  - LOADER ARCHITECTURE: Normalizer separated from loader (extractable by R3)
  - ERROR TAXONOMY: PrismError base + SafetyBlockError with category/severity classification
  - TOLERANCE SOURCE: src/schemas/tolerances.ts code file alongside protocol doc reference
  LOW:
  - HEALTH SCHEMA: Added to structured outputs (prevents undefined < 31 silent pass)
  - CONTENT VERIFICATION: MANDATORY flushes read back last 100 chars
  CROSS-CUTTING:
  - TEST FRAMEWORK: Vitest established in P0, matrix automated in R2, gate in R6
  - RATE LIMITING: p-queue with intervalCap for batch API calls (R2 50-calc, R3 250-calc)
  - STRUCTURED LOGGING: JSON logger from P0 onward (not just post-R4)

WHAT CHANGED IN v13.0 (from v12.2):
  - FULL Opus 4.6 capability integration across all documents
  - PRISM_PROTOCOLS_CORE.md: CMS v2.0 (636 lines) REPLACED by Compaction API config (~50 lines)
    + Adaptive Thinking effort tiers + Structured Output schemas + Agent Teams config
    + Fast Mode routing + Data Residency + Fine-grained Tool Streaming + Context Editing
  - PRISM_MASTER_INDEX.md: Updated context budget (0% reserve), session estimates reduced,
    Opus 4.6 capability quick-reference table added
  - PHASE_P0_ACTIVATION.md: MS0 wires Opus 4.6 config (model strings + effort + compaction
    + structured outputs + streaming). MS8 restructured for parallel chain execution via
    Agent Teams. Prefilling removal check added.
  - PHASE_R1_REGISTRY.md: Structured outputs on formula validation. Effort tiers on material_get.
  - PHASE_R2_SAFETY.md: NEW MS1.5 for AI-generated edge cases (Opus 4.6 novel reasoning).
    Parallel material groups. Structured outputs on all safety calcs.
  - PHASE_R3_CAMPAIGNS.md: Stub updated with parallel batch via Agent Teams, PFP at max effort.
  - PHASE_R4_ENTERPRISE.md: Stub updated with Data Residency, Compaction API integration,
    structured logging + fine-grained streaming.
  - PHASE_R5_VISUAL.md: Stub updated for 128K output report generation.
  - PHASE_R6_PRODUCTION.md: Stub updated for 1M context load testing, Fast Mode benchmarking.
  - PHASE_TEMPLATE.md: Updated with Opus 4.6 patterns (effort tiers, parallel execution,
    structured outputs, context editing).
  - DEPLOYMENT_GUIDE.md: v13.0 migration guide from v12.2.

BREAKING CHANGES FROM OPUS 4.5 → 4.6 (checked in P0-MS0):
  - Assistant message prefilling returns 400 error — migrate to structured outputs
  - output_format → output_config.format (old still works, deprecated)
  - thinking: {type:"enabled", budget_tokens:N} deprecated → thinking: {type:"adaptive"}
  - interleaved-thinking-2025-05-14 beta header ignored — remove it
  - JSON string escaping differences in tool call arguments — use JSON.parse(), not raw strings

UPDATE RULE: When modifying any phase doc, bump its version here.
             When modifying protocols, bump protocols version here.
             This index is the SINGLE source of truth for document versions.
```
