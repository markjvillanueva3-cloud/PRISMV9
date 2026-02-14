# PRISM MCP FRAMEWORK — MASTER DEVELOPMENT ROADMAP v10.0

**Self-Executing • Upload-and-Go • Zero-Touch Extensibility • Build-Pipeline-Hardened • Auto-Discovery • Drop-In Architecture • Audit-Hardened • Risk-Mitigated**

February 2026 | CONFIDENTIAL

---

### v10.0 CHANGELOG (50 enhancements from extensibility friction analysis + build safety audit + external review integration)

**ZERO-TOUCH EXTENSIBILITY (8) — The Core Theme:**
- ZT-1: Added Zero-Touch Extensibility Protocol (Section 3.17) — defines the "drop-in" contract for skills, scripts, hooks, plugins, calc models, and controllers. Adding any of these now requires 1 action (create the file/register the component) instead of 4-5 manual coordination steps.
- ZT-2: Skill Auto-Discovery — SkillRegistry scans skills directory on boot, auto-registers valid skill files. PLATFORM-SKILL-AUTO-LOAD upgraded from suggestion to auto-registration. New skills = drop file → available. MASTER_INDEX skill count becomes "≥137" validation, not hard count.
- ZT-3: Script Self-Description — Python scripts include PRISM_MANIFEST header comments declaring name, trigger, priority, and dependencies. ScriptRegistry reads manifests on boot. New scripts = drop file with manifest → auto-wired.
- ZT-4: Atomic Hook Registration — `prism_hook→register_with_manifest` action atomically registers hook AND updates HOOK_MANIFEST.json. Post-M-FINAL, HOOK_MANIFEST.json is sole source of truth (Section 8 becomes historical). Three-way reconciliation → two-way.
- ZT-5: Plugin Dependency Resolution — Plugin manifests include `dependencies` and `provides` fields. PluginRegistry enforces load order and blocks uninstall of active dependencies. Critical for E3-MS21 Plugin SDK.
- ZT-6: Hook Priority Bands — Systematic namespace allocation (0-9 critical, 10-29 system, 30-49 platform, 50-69 manufacturing, 70-89 enterprise, 90-99 telemetry). Collision detection at registration time. Added to P1-MS3 hook triage.
- ZT-7: Extension Validation at SAU-Light — EXTENSION_REGISTRY.json validated at SAU-Light (not just SAU-Full), preventing orphaned extensions between 8-15 week gaps.
- ZT-8: Count Validation Shift — MASTER_INDEX counts become floor validators ("≥ N") rather than exact counts. Auto-discovery means counts grow without manual updates. Exact counts verified at SAU-Full via live system query.

**BUILD PIPELINE HARDENING (5):**
- BP-1: Added Type Checking to Build Pipeline — `tsc --noEmit --incremental` runs as validation step before esbuild compilation. Catches type mismatches in safety-critical calculation parameters at build time. If tsc --noEmit OOMs, fallback to project references splitting.
- BP-2: Added `test:critical` npm Script — Runs after EVERY build: type check, 50 safety calculations, hook chain smoke test, registry loading check. Safety calculations are pure math with zero API calls — no reason not to run constantly.
- BP-3: Added Dependency Lockfile Strategy — package-lock.json committed/archived, `npm ci` replaces `npm install` for reproducible builds, dependency audit at SAU-Full, @anthropic-ai/sdk pinned to specific version.
- BP-4: Added esbuild Incremental Mode — `esbuild.context()` with `rebuild()` for ~10x faster subsequent builds. Build time drops from ~2s to ~200ms during microsession iteration.
- BP-5: Added JSON Schema Validation at Python/TypeScript Boundary — Safety-critical Python scripts (safety_calc_test_matrix.py, mfg_batch_validator.py) validate results against shared JSON schemas. Catches serialization mismatches at the language seam.

**CODING METHODOLOGY (4):**
- CM-1: Added PrismError Class Hierarchy — Typed error classes (PrismError, CalcError, SafetyError, RegistryError) replace string-based error matching. Error pattern DB and CalcHookMiddleware use typed dispatch. Added to P0-MS5 type definitions.
- CM-2: Added Structured Logging with Correlation IDs — Every dispatcher call generates a correlationId that flows through hooks, engines, and scripts. TelemetryEngine captures structured log entries: {timestamp, correlationId, source, level, message, context}. Added to P0-MS4.
- CM-3: Added Async/Await Migration Strategy — JsonFileProvider uses synchronous reads wrapped in Promise.resolve() (zero behavior change). Async transition happens ONLY when swapping to truly async backend (SQLite/PostgreSQL). Prevents accidental async bugs during P0-MS6 DataProvider refactor.
- CM-4: Added E3 State Management Pre-Decision — Zustand selected over Redux with documented rationale. Decision made NOW, not deferred to E3-MS1 execution. Removes highest-risk single decision from enterprise track.

**SAFETY & RELIABILITY (5):**
- SR-1: External Backup Elevated to BLOCK — Before M-M2 batch 1: verified external backup destination required (BLOCK, not advisory). During M-M2: automated backup after every batch completion (not just SAU stops). Irreplaceable validated manufacturing data cannot rely on WARN-level protection.
- SR-2: Long-Tail Migration Validation — During 14-day warm standby, every unique calculation request through prism-platform is replayed against mcp-server nightly. Real production traffic as test corpus catches edge cases the predefined 50-calc matrix doesn't cover.
- SR-3: Added Microsession Resource Profiling — Microsessions classified by resource profile (I/O-bound, context-bound, compute-bound) with profile-appropriate tool call budgets. Extends E3 complexity classification to all phases.
- SR-4: Safety Fuzz Testing — Randomized boundary testing around safety thresholds added to safety_calc_test_matrix.py. Tests parameter combinations at ±5% of S(x)=0.70 boundary to verify safety gates activate correctly at edges, not just at predetermined test points.
- SR-5: Runtime Safety Trace Proof — Every safety-critical dispatcher action must produce a correlationId trace proving the safety engine was actually called (not just registered). Verified via TelemetryEngine SAFETY log entries. Prevents refactoring or hook changes from silently bypassing safety engines.

**EXTERNAL REVIEW INTEGRATION (12 — from independent assessments by three reviewers):**
- ER-1: Fast-Path Execution Protocol — After 3 consecutive clean MS completions with no flags, reduce ceremony: skip detailed plan approval, allow 2 extra tool calls. Resets on any flag or failure. Addresses governance overhead concern.
- ER-2: Temporal HITL Heartbeat — Added mandatory human review every 10 sessions regardless of batch count. Catches style drift and pattern erosion between the batch-triggered H-1 through H-4 gates. Review uses structured questionnaire.
- ER-3: Rollback Fire Drill — Mandatory rollback rehearsal at SU-3 (mid-project). Verify mcp-server warm standby activates in <30s, data reconciliation runs correctly, and procedure documentation is still accurate. Prevents rollback procedure rot.
- ER-4: Multi-Axis Extension Conflict Testing — When multiple extension axes are active simultaneously (plugin + hook + calc model + schema extension), require composite interaction safety test. Prevents combined effects from bypassing safety assumptions.
- ER-5: DataProvider Interface Provisional — DataProvider interface explicitly marked PROVISIONAL until post-M-M2 completion. Interface may be revised based on real query patterns observed during data campaigns. Frozen to v1.0 after SU-5.
- ER-6: Schema Migration v1 Limits — v1 schema migrations limited to ADDITIVE and RENAME operations only. Structural transforms (field removal, type changes) deferred to v2 migration framework. Prevents scope creep.
- ER-7: Metadata Auto-Repair — When code reality is clear but state files disagree, system proposes corrections instead of just failing. auto_repair_mode in system_self_test.py suggests fixes for common discrepancies (count mismatches, stale positions, missing entries).
- ER-8: SAU-Full Duration Cap — SAU-Full capped at 20 tool calls maximum. If checklist exceeds budget, overflow items automatically deferred to next SAU-Light with [SAU_OVERFLOW] flag. Prevents SAU stops from becoming multi-session blockers.
- ER-9: HITL Structured Questionnaires — Human review gates H-1 through H-4 use fixed questionnaires with recorded answers. Prevents reviews from becoming superficial rubber-stamps as project progresses.
- ER-10: Test Harness Trailing Policy — Non-safety test infrastructure may trail feature development by one layer/phase. Safety test infrastructure (safety_calc_test_matrix.py, mfg_batch_validator.py) must NEVER trail. Prevents test harness from blocking feature progress.
- ER-11: Amendment Frequency Tracking — Track roadmap amendment frequency per phase. If amendments exceed 5 per phase, trigger roadmap simplification review. Prevents specification overhead from becoming a parallel maintenance project.
- ER-12: Plugin Runtime Resource Limits — CALC_MODIFY tier plugins execute within CPU/memory resource limits (configurable per-plugin). Prevents a faulty calculation extension from crashing the primary manufacturing safety engine.

**COUNTS UPDATED (4):**
- CU-1: Type definitions 7→8 (added error-types.ts for PrismError hierarchy)
- CU-2: System self-test checks 7→9 (added build pipeline verification, safety trace proof)
- CU-3: Decision protocol rules 13→15 categories (added Zero-Touch Extensibility, Build Pipeline Protocol)
- CU-4: SAU-Light checks 7→10 (added extension validation, floor check, amendment frequency)

**CONFIDENCE IMPACT:**
- Compound confidence raised from ~85% to ~88% (type checking + test-on-build + backup enforcement + safety fuzz testing close the four largest remaining risk windows)
- Schedule confidence raised from ~74% to ~76% (fast-path execution reduces ceremony overhead; resource profiling prevents budget waste; test harness trailing prevents testing drag)
- Post-deployment sustainability confidence raised from ~92% to ~96% (zero-touch extensibility eliminates manual coordination; auto-discovery means components grow without friction; plugin dependency resolution prevents load-order bugs)

---

### v9.0 CHANGELOG (31 enhancements from extensibility and lifecycle audit)

**ARCHITECTURAL ENHANCEMENTS (4):**
- AE-1: Added DataProvider Abstraction Layer — all registry access routed through DataProvider interface (P0-MS5), enabling future storage backend swaps (JSON→SQLite→PostgreSQL) without engine modification. DataProvider contract: get(), query(), put(), delete(), subscribe() with typed generics per registry category.
- AE-2: Added Data Model Extension Protocol — material/machine/tool schemas support typed extension fields via `extensions: Record<string, ExtensionField>` with category grouping, enabling new material families (composites, plastics, additive) without engine code changes. Extension schema registry tracks custom fields per tenant.
- AE-3: Added API Version Management Protocol (Section 3.12) — semantic versioning on all 324 dispatcher action signatures, deprecation protocol (N+2 version support), BREAKING_CHANGES.md tracked at SAU stops, plugin manifest declares minimum API version. Prevents silent breakage when dispatcher schemas evolve.
- AE-4: Added Plugin Security Framework — 4 permission tiers (READ_ONLY, UI_EXTEND, HOOK_INSTALL, CALC_MODIFY) with CALC_MODIFY requiring admin approval + safety matrix re-run. Plugin sandboxing prevents unauthorized access to safety-critical calculation hooks. Dependency graph validation on uninstall.

**LIFECYCLE PROTOCOLS (3):**
- LP-1: Added Post-Deployment Data Maintenance Protocol (Section 6.5) — covers new material ingestion, parameter updates from handbook revisions, tooling catalog updates, controller firmware alarm changes, and safety recommendation propagation. Defines quarterly review cadence, change propagation through knowledge graph and formula accuracy tracker, and triggered safety recalculation.
- LP-2: Added Post-Migration Rollback Procedure (Section 7.5) — 14-day rollback window with mcp-server warm standby, defined trigger conditions, data reconciliation procedure for entries written to prism-platform during live period, and explicit decommission criteria (30-day clean operation).
- LP-3: Added User Documentation Generation microsession (M-FINAL-MS7) — auto-generates operator-facing documentation from system knowledge base: getting started guide, common workflow tutorials, alarm decode quick reference, uncertainty band explanations. Validates with H-4 engineer during review.

**TESTING ENHANCEMENTS (2):**
- TE-1: Added E3 Progressive Testing Gates — component-level test coverage requirements at every E3 layer boundary (MS5: ≥40% foundation components, MS12: ≥60% dashboard components, MS20: ≥70% interactive tools, MS30: ≥80% full UI). Catches state wiring issues at layer transitions instead of MS28.
- TE-2: Added Integration Smoke Test at E4 layer boundaries — tenant isolation verified at MS6, replication verified at MS12, governance verified at MS18, full system at MS24. Prevents compound failures from late discovery.

**EXTENSIBILITY SPECIFICATIONS (4):**
- ES-1: Added Calculation Engine Plugin Architecture — new calculation models (beyond Kienzle/Taylor) register through CalcModelRegistry with typed input/output contracts, enabling domain extensions (EDM, additive, laser) without modifying ManufacturingCalcEngine.ts core.
- ES-2: Added Controller Extension Protocol — new controller families (#13+) register through ControllerRegistry with alarm schema, decode logic, and fix procedure templates. Pattern established by existing 12 families, now formalized as extension point.
- ES-3: Added External Integration API Contract — RESTful API surface for CAM/ERP/MES integration with versioned endpoints, rate limiting, and tenant-scoped access. Specified as E4-MS19b addition.
- ES-4: Added Schema Migration Framework — forward-compatible schema evolution with version tags on all data files, automated migration scripts at SAU-Full stops, and backward-compatible reads (new code reads old schema).

**COUNTS UPDATED (3):**
- CU-1: State files 17→19 (added API_VERSION.json, EXTENSION_REGISTRY.json)
- CU-2: Migration gates 15→17 (added API version parity gate, data abstraction verification gate)
- CU-3: Decision protocol rules 11→13 categories (added API Version Management, Data Access Abstraction)

**CONFIDENCE IMPACT:**
- Compound confidence unchanged at ~85% (new protocols reduce risk of post-deployment rework but don't affect build-phase risk)
- Schedule confidence raised from ~72% to ~74% (progressive testing catches E3 issues earlier, reducing rework probability)
- Post-deployment sustainability confidence: NEW metric — ~92% (system can accept new materials, calculations, and integrations without architectural rework for 3+ years)

---

### v8.5 CHANGELOG (22 fixes from external structural risk analysis)

**BLOCKERS FIXED (4):**
- B-1: Added Off-Machine Backup Protocol — all backups were on same C: drive as source; added external backup at every SAU-Full, robocopy or cloud sync mandatory before E4 replication arrives (~week 35)
- B-2: Added Human-in-the-Loop Validation Gates — safety-critical system had only 1 human checkpoint (gate #5 at M-FINAL); added 4 distributed domain expert spot-checks at M-M2 batch 10, batch 20, batch 30, and pre-M-FINAL
- B-3: Added Architectural Coherence Audit to SAU-Full — Claude's episodic memory creates style/pattern drift across 75 weeks; added code consistency sampling + architectural decision replay at every SAU-Full
- B-4: Hook Count Source-of-Truth formalized — expected hook count was ambiguous in system_self_test.py; specified HOOK_MANIFEST.json as authoritative source, updated at every hook-installing MS

**DEFECTS FIXED (4):**
- D-1: System self-test check count corrected 5→6 in SU-1 verification table (disk space check added in v8.4 but SU-1 still said "All 5 checks")
- D-2: Confidence assessment methodology changed from per-phase independent to compound probability with honest joint estimate (~85% joint, not 99.85%)
- D-3: Dual-run workload coverage rebalanced — 1,200 representative queries across 324 actions was ~3.7 per action; rebalanced to weighted distribution with warm scenario journeys (~7,200 total)
- D-4: ATCS throughput model updated — lower-bound scenario (3 batches/session with sustained quarantine) required 23+ M-M2 chats; schedule buffer added (15-25, was 15-20)

**GAPS FILLED (8):**
- G-1: Added Warm Scenario Workload to 72-hour dual-run — stateless queries miss interaction bugs between ATCS, context pressure, and calculations; added 6 multi-step journey test types
- G-2: Added Style Consistency Audit protocol — code naming, error handling, import patterns drift between model versions; added sampling + comparison at SAU-Full
- G-3: Added Enterprise Phase Margin Protocol — 82 MS in ~22 chats (3.7 MS/chat) leaves near-zero margin; added flex expansion triggers, early-warning metrics, and E3 complexity classification
- G-4: Added M-M3 Compliance Domain Expert Protocol — ISO compliance at 92% confidence needs real auditor input, not just code generation; enhanced M-M3 MS with standards research and sample artifact generation
- G-5: Added ATCS Quarantine Budget Protocol — sustained quarantine rates >5% consume entire sessions in resolution with zero batch throughput; added time-boxing and deferred resolution sessions
- G-6: Added Interleaving Overhead Budget — track switching between M-M2 and Enterprise adds ~2-3 tool calls per session; effective budget during interleaving is 13 (not 15)
- G-7: Added E3 Architectural Decision Replay — front-loading at layer boundaries reads E3_ARCHITECTURE.md but doesn't verify consistency with BINDING decisions; added automated spot-checks at each layer boundary
- G-8: Added Emergency Off-Ramp Protocol — 75-week plan had no defined criteria for when to stop, restructure, or seek help; added 6 trigger conditions with reassessment procedure

**ADVISORIES ADDRESSED (6):**
- A-1: Confidence assessment updated with v8.5 column reflecting compound probability (~85% joint confidence)
- A-2: M-M2 chat estimate widened from "~15-20" to "15-25" with schedule impact documented
- A-3: Section 7.4 backup destinations diversified beyond C:\PRISM\archive\ — external backup mandatory at SAU-Full
- A-4: E3 MS annotated with complexity class (UI-RENDER / STATE-INTEGRATION / TOOL-BUILD / PLATFORM-BUILD) affecting chat loading
- A-5: Migration gate #5 (UAT sign-off) enhanced from single checkpoint to progressive validation (H-1 through H-4)
- A-6: Section 14 system self-test count corrected from 5 to 6; state file count updated to 17

---

### v8.4 CHANGELOG (13 fixes from structural risk analysis)

**BLOCKERS FIXED (3):**
- B-1: Added 1-line purpose + deliverable + entry/exit for ALL 82 enterprise MS (E3-MS1 through E3-MS30, E4-MS1 through E4-MS24) — front-loading protocol now augments existing specs rather than generating them from nothing
- B-2: Clarified ATCS "autonomous" execution model — ATCS queues work that executes on next session start, NOT a background daemon; throughput estimates adjusted, M-M2 interleaving protocol updated accordingly
- B-3: Specified 72-hour dual-run workload generator (dual_run_workload.py as Windows Scheduled Task, not manual operator) with continuous divergence logging and ~5,400 automated test queries

**DEFECTS FIXED (3):**
- D-1: Hook count reconciled — 27 named new hooks (not 28); total corrected 145→144 (117 inherited + 23 platform/system + 4 MFG); full categorization by prefix (SYS/PLATFORM/MFG) added to Section 8
- D-2: Knowledge graph edge rollback mechanism added to campaign data rollback protocol (Section 6.4) — MemoryGraphEngine.removeEdgesBySource() plus downstream consumer cleanup checklist
- D-3: P-DM microsession fully specified with entry/exit conditions, assessment→scope→migrate→verify→document steps, and schema_migrator.py capabilities (was trigger table only)

**GAPS FILLED (5):**
- G-1: Added Model Upgrade Protocol — upgrade at SAU-Full boundaries only, re-run safety matrix + benchmarks, never mid-campaign, cost impact assessment
- G-2: Added Disk Space and Archive Management Protocol — estimated ~10-15GB growth, disk_space_check added to system_self_test.py, cleanup priority chain
- G-3: Added Context Window Change Contingency — pressure threshold recalibration procedure, microsession limit scaling, detection via benchmark drift
- G-4: Added junction point edge cases for WSL2 and cross-drive scenarios with explicit 3-tier fallback chain (junction → config → copy) and validation requirements
- G-5: Added downstream consumer notification protocol for campaign data rollback — knowledge graph, formula accuracy, computation cache, E2 cost, E3 telemetry each handled with specific cleanup steps

**ADVISORIES ADDRESSED (2):**
- A-1: E3 Chat Loading Guide enhanced with per-MS deliverable descriptions (not just load indicators); E4 Chat Loading Guide similarly enhanced
- A-2: Confidence assessment updated with v8.4 column reflecting all changes; enterprise confidence raised 97%→99%

---

### v8.3 CHANGELOG (21 fixes from independent gap analysis)

**BLOCKERS FIXED (2):**
- B-1: Moved SessionLifecycleEngine (351L), ComputationCache (420L), DiffEngine (196L) imports from P0-MS7 to P0-MS6 — MS6 exit conditions were verifying engines that didn't exist yet
- B-2: Removed CalcHookMiddleware from P0-MS9 Tier 2 import list (already imported at P0-MS7 with autoHookWrapper); noted early import in Section 17.1 Tier 2 table

**DEFECTS FIXED (5):**
- D-1: UAT scenario count in Section 14 corrected from "5+" to "8" (matching enumerated scenarios)
- D-2: SU-5 engine count corrected to "0 engines" — WAL/cost are infrastructure, not in 29-engine list
- D-3: Added index.ts (300L) to Section 18.1 consumer chain map — 29/29 claim now verified
- D-4: Standardized hook categorization to provenance split: "145 total (117 inherited + 25 new platform + 3 new manufacturing)"
- D-5: Added M-M3 chat assignments (chats 38, 41) interleaved with E4 in Section 9

**GAPS FILLED (8):**
- G-1: Added uat_session_runner.py (~200L) creation to P-P3-MS5
- G-2: Added boot_efficiency_tracker.py (~120L) creation to P-P1-MS7 Step 4
- G-3: Enumerated all 15 session memory categories with consumers in P-P1-MS7
- G-4: Created M-FINAL-MS1 through MS6 microsession breakdown with entry/exit conditions and 72-hour scheduling notes
- G-5: Added UAT Critical Issue Resolution Protocol (classify → fix MS → timing rules → escalation)
- G-6: Changed Windows symlink to junction points (`mklink /J`, no admin required) with config-based fallback
- G-7: Added full P-PERF-MS3 and P-PERF-MS4 specifications with entry/exit conditions
- G-8: Added E3/E4 MS-per-chat loading guides with 🔴/🟡/🟢 load indicators

**ADVISORIES ADDRESSED (6):**
- A-1: Microsession count updated from ~124 to ~190 (accurate count across all tracks)
- A-2: Enhanced P-P3P4-MS-FINAL with 7-point SU-4 pre-flight checklist
- A-3: Added KNOWN_RENAMES spot-check (3 random names) to SU-2 verification table
- A-4: Marked PLATFORM-ATCS-CHECKPOINT-SYNC as PENDING at P0-MS3, activates at P0-MS8
- A-5: Added Campaign Plateau Contingency ([CAMPAIGN_CEILING] flag with analysis and decision protocol)
- A-6: Added batch composition enumeration to Section 18.3 (cross-ref to SU-3 definitions)

---

---

# ⚡ START HERE — READ THIS FIRST

## What Is PRISM?

PRISM is a safety-critical CNC manufacturing intelligence system. It recommends cutting parameters, predicts tool life, validates safety limits, and decodes machine alarms. **Mathematical errors in this system can cause tool explosions and operator injuries.** The system enforces S(x) ≥ 0.70 (mathematical certainty) and Ω ≥ 0.70 (quality score) as hard blocks — no shortcuts, no placeholders, lives depend on correctness.

## What Already Exists?

An MCP server (`C:\PRISM\mcp-server\`) with **27 dispatchers** exposing **324 verified actions**, **29 engines** (19,930 lines), **19 registries** (13,879 lines), **34 auto-firing cadence functions**, **117 pre-existing hooks** (roadmap adds 27 new → **144 total at completion**), and **215 JSON data files** across 6 directories. The structural inventory of everything in the MCP server is documented in **MASTER_INDEX.md** (`C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md`, 302 lines) — this is the truth source for all counts and file locations.

## What Are You Building?

A new platform (`C:\PRISM\prism-platform\`) that replaces the monolithic MCP server with a plugin-based architecture. You'll scaffold it, import systems piece by piece, populate it with validated manufacturing data, build enterprise features (WAL, cost tracking, visual dashboard, replication), then migrate everything over and retire the old server. The project spans ~75-85 weeks across ~74-79 chats.

## How to Start

**EVERY session — no exceptions — begins with:**

```
STEP 1: Run boot sequence
  → prism_dev action=session_boot
  → prism_context action=todo_update

STEP 2: Find your position
  → prism_doc action=read name=ROADMAP_TRACKER.md
  → Find the last entry marked COMPLETE
  → Your current MS is the one immediately after it

STEP 3: If ROADMAP_TRACKER.md doesn't exist or is empty
  → prism_session action=state_load          (reads HANDOFF.json)
  → prism_doc action=read name=ACTION_TRACKER.md   (check pending items)
  → If ALL state files missing → you're at P-P0-MS0 (the very beginning)

STEP 4: Find your MS in this document
  → Platform phases: Section 5
  → Manufacturing phases: Section 5 (after platform)
  → Enterprise phases: Section 5 (after manufacturing)
  → Read ENTRY CONDITIONS → execute STEPS → verify EXIT CONDITIONS

STEP 5: When you finish a MS
  → prism_session action=state_save          (writes HANDOFF.json)
  → prism_doc action=append name=ROADMAP_TRACKER.md content="[MS-ID] COMPLETE [date]"
  → prism_context action=todo_update
  → If this MS changed dispatcher/action/engine/hook counts → update MASTER_INDEX.md Section 1 summary
  → If this MS is an SAU boundary → run SAU protocol (Section 4)
```

## If You're Lost

Read **Section 16: Operator Quick Reference** — it's a one-page decision card that tells you exactly what to do in every situation.

## If Context Compacts Mid-Session

The MCP server's L3 auto-recovery will fire. Trust it. When you resume:
1. Run `prism_session action=quick_resume`
2. Run `prism_context action=todo_read`
3. Continue from where the recovery payload says you left off

## Key Rules

- **Build command:** `npm run build` (runs tsc --noEmit type check + esbuild compile + test:critical). Use `npm run build:fast` for non-safety prototyping only.
- **Edit pattern:** READ → edit_block/str_replace → verify. Never retype entire files.
- **Safety:** S(x) ≥ 0.70 is a HARD BLOCK. Ω ≥ 0.70 required for release. No exceptions.
- **Anti-regression:** Run `prism_validate action=anti_regression` before any file replacement.
- **MCP-native first:** Use PRISM's own tools before Desktop Commander or bash.
- **Plan first:** Before writing >50 lines, state the plan and get approval.
- **Microsessions:** 15-25 items max, 15 tool calls max per MS to prevent context overflow.
- **MASTER_INDEX.md** is the structural truth source — read it when scaffolding, verify at every SAU.

## Quality Tiers — Which Validation To Use

Every MS exit uses ONE of these. The tier is specified in each MS.

```
QUICK:    prism_validate action=safety                              (0 API calls, <1s)
STANDARD: prism_ralph action=scrutinize                             (1 API call, ~5s)  
DEEP:     prism_ralph action=loop                                   (4-7 API calls, ~30s)
RELEASE:  prism_ralph action=assess THEN prism_omega action=compute (Opus-grade, ~45s)
```

---


# SECTION 1: WHAT CHANGED (v6 → v7 → v8 → v8.1 → v8.2 → v8.3 → v8.4 → v8.5 → v9.0 → v10.0)

v7 was the gap-closed, fully-specified revision. v8 was the self-executing, fully-wired revision. v8.1 was the audit-hardened revision (28 gaps). v8.2 was the **cross-reference reconciliation** (19 fixes). v8.3 was the **execution-readiness pass** (21 issues). v8.4 was the **structural risk pass** (13 fixes). v8.5 was the **external risk analysis pass** (22 fixes). v9.0 was the **extensibility and lifecycle pass** (31 enhancements). v10.0 is the **zero-touch extensibility and build hardening pass** — 50 enhancements adding auto-discovery for skills/scripts/hooks, hardened build pipeline with type checking and safety tests on every build, typed error hierarchy, correlation ID logging, external review integration (12 items from three independent assessments), and the principle that adding or upgrading any component should require exactly one action.

### v8.1 → v8.2 Changes (19 fixes)

| # | Severity | Issue | v8.1 State | v8.2 Fix |
|---|----------|-------|-----------|----------|
| 1 | 🔴 BLOCKER | Section 9 vs 11 M4/M-FINAL chat numbers contradict | S9: T1+T2 in chats 45-52, M-FINAL 53-58. S11: T1 45-52, T2 53-60, M-FINAL 61-66 | Section 9 updated to match Section 11 allocation |
| 2 | 🔴 BLOCKER | 3/5 Tier 3 engines import earlier than Tier 3 says | TelemetryEngine, MemoryGraphEngine, CertificateEngine listed as "E3/post-launch" | Tier 3 split into Tier 3a (early import) and Tier 3b (E3 import), totals corrected |
| 3 | 🟡 DEFECT | Flex chat count: Section 14 says 3, Section 9 lists 4 | FLEX-E3 added in v8.1, count not updated | Corrected to 4 in Section 14 |
| 4 | 🟡 DEFECT | P-UAT-MS2 has no slot in any chat map | Floating — "Chat ~8" but not in Chat 8 execution order | Explicitly placed in Chat 9 after main-track MS |
| 5 | 🟡 DEFECT | autoDocAntiRegression import unwired in P0-MS3 | Section 17.3 says import at P0-MS3, but P0-MS3 steps omit it | Steps, tools, exit conditions updated in P0-MS3 |
| 6 | 🟡 DEFECT | M4-T1/T2 chat range overlap at Chat 49 | Both T1 and T2 claim Chat 49 | Corrected: T1 chats 45-52, T2 chats 53-60 per Section 11 |
| 7 | 🟡 DEFECT | SU-1 has no quality tier | Every other SU has a tier, SU-1 omitted | Added STANDARD tier to SU-1 |
| 8 | 🔵 GAP | E3 Layer→MS mapping buried in protocol text | No table, only inline references | Explicit mapping table added to E3 section header |
| 9 | 🔵 GAP | ROADMAP_TRACKER.md format never specified | Used hundreds of times, format undefined | Format spec with examples added to Section 2.12 |
| 10 | 🔵 GAP | DEMO 2 vs P-UAT-MS1 ordering undefined | Both trigger at M-M2 batch 20, relationship unspecified | Ordering defined: P-UAT-MS1 → resolve criticals → DEMO 2 |
| 11 | 🔵 GAP | UAT scenario content unspecified | "5+ scenarios" referenced, never enumerated | 8 core scenarios enumerated in P-UAT section |
| 12 | 🔵 GAP | M-M2 interleaving mechanics undefined | "Interleaved with Enterprise" with no mechanics | Interleaving protocol added to Section 9 |
| 13 | 🔵 GAP | P-DM schema mismatch detection mechanism unspecified | Hook installed, detection logic undefined | Detection mechanism specified in P-DM section |
| 14 | 🔵 GAP | CAMPAIGN_DASHBOARD.json has no schema version | Schema will evolve, no migration path | schema_version field added to initial schema |
| 15 | ⚪ ADVISORY | Registry line count estimates overshoot total | ~15,150 vs 13,879 total | Note added: MASTER_INDEX total is authoritative |
| 16 | ⚪ ADVISORY | "Machines likely complete" at batch 30 is optimistic | 750/824 at batch 30 | Corrected to "approaching RAW_AVAILABLE (~750/824)" |
| 17 | ⚪ ADVISORY | Hook categorization "142 platform + 3 MFG" misleading | Mixes inherited and new | Changed to "117 inherited + 28 new" |
| 18 | ⚪ ADVISORY | State file count may exceed 15 | Docs vs state boundary unclear | Classification note added distinguishing state files from audit docs |
| 19 | ⚪ ADVISORY | P-UAT-MS1 trigger "1,000+" wording imprecise | 1,000 processed ≠ 1,000 validated | Corrected to "≥900 validated (1,000 processed)" |

### v8.0 → v8.1 Changes (28 gap fixes)

| Issue | v8.0 State | v8.1 Fix |
|-------|-----------|----------|
| SU-3 guide count contradicts (8 vs 22) | Sections 13/14 say 8, body says 22 | All references corrected to 22 |
| Duplicate Section 2.6 numbering | Two sections both numbered 2.6 | Self-test renumbered to 2.13 |
| M4 chat numbers overlap enterprise | M4 body says Chats 25-35 | Corrected to Chats 45-52 per Section 9 |
| P0-MS7 duplicate step 7 | Two steps numbered 7 | Renumbered 7-11 |
| P0-MS9 duplicate step 5 | Two steps numbered 5 | Renumbered 5-10 |
| P0-MS6 exit conditions incomplete | 5 components imported, 2 verified | All 5 components have exit verification |
| Duplicate swarm pattern section | Same info in table + code block | Consolidated to single detailed version |
| 96 enterprise MS unspecified | Generic template only | Entry/exit minimums for E1-MS5+ and E2; architectural constraint + front-loading for E3/E4; claim qualified |
| 10 benchmarks undefined | Referenced everywhere, never enumerated | Section 12.1 benchmark specification with all 10 |
| No campaign data rollback | Quarantine catches individuals, not systematic errors | Section 6.4 registry snapshot + rollback protocol |
| No backup/DR spec | Only compaction and replication covered | Section 7.4 backup schedule + recovery procedure |
| No E3 security spec | Auth mentioned, no constraints | E3 Security Constraints (BINDING): auth, RBAC, sanitization, API security |
| OPUS not tested in P0-MS2 | Only HAIKU + SONNET tested | All 3 tiers tested including OPUS |
| v6 dead cross-references | 3 sections say "identical to v6" | Content inlined: 18 skills table, toolkit descriptions, hook installation context |
| UAT MS not placed in chats | Floating with no chat assignment | Specific chat numbers assigned |
| M4-T3 retirement ambiguity | 750+ functions undefined at retirement | Explicit: T3 functions work via bulk import; extraction is refactoring post-retirement |
| No roadmap amendment protocol | No process for mid-project changes | Amendment protocol added to Section 1 |
| MASTER_INDEX update timing unclear | Updated only at SAU stops | MS completion step updated: if counts change → update MASTER_INDEX immediately |
| P0-MS6 scope exceeds budget | 5 components in 18 tool calls | Budget increased to 22, title updated |
| No flex buffer within E3 | FLEX-3 after E4, nothing for 30-MS E3 | FLEX-E3 added between Layer 3→Layer 4 (MS20→MS21) |
| Hook count reconciliation unclear | 28 new vs 145 total unexplained | Clarifying note: 117 pre-existing + 28 new = 145 |
| index.ts counted as engine | Inflates computation engine count | Clarified as infrastructure in engine table |
| No GSD file integrity handling | fs.readFileSync with no fallback | Integrity check: cache fallback, degraded flag, boot block if GSD_QUICK missing |
| 68-week stale reference | Section 3.10 says 68 weeks | Corrected to ~75 weeks |
| Quarantine boundary condition | 5/50 = 10% fails "< 10%" | Changed to "≤ 10%" |
| SAU artifact count unclear | "9 per stop" but 12 protocol steps | Clarified: "9 artifacts updated (12 total protocol steps)" |

### v7 → v8 Changes

| Issue | v7.1 State | v8 Fix |
|-------|-----------|--------|
| No START HERE block | Document assumes reader knows PRISM | 30-line orientation + boot sequence on page 1 |
| Addendum A patches external | 15 patches say "see Addendum A.3" | All patches folded INTO their target sections |
| No exact MCP commands | MS steps say "verify registries" not which tool to call | P0-MS0 through MS4 have exact `prism_X action=Y` commands |
| No quality tier per MS | Steps say "validate" without specifying which tier | Every MS lists its quality tier (Quick/Standard/Deep/Release) |
| MASTER_INDEX not integrated | Not in SAU, not in scaffold, not in migration | SAU verifies it, P0-MS5 reads it as blueprint, M4 checks parity |
| Skill count wrong | 171+ | **137** (119 existing + 18 new) per MASTER_INDEX §11 |
| Script count wrong | 342+ | **75** core (73 existing + 2 new) per MASTER_INDEX §7 |
| Infrastructure files invisible | autoHookWrapper, cadenceExecutor, responseSlimmer not mentioned | Section 17 maps all infrastructure with line counts and migration tiers |
| 215 data files unmapped | "registries loading" without directory layout | Data directory inventory with file counts per directory |
| No swarm patterns for M-M2 | "swarm patterns: 8" in counts only | Specific patterns assigned per campaign type with agent counts |
| 9 migration gates | Missing infrastructure, registry, type parity | **13 migration gates** with 4 new infrastructure checks |
| Session resume buried | Boot sequence in Section 5 body text | Boot + resume protocol in START HERE block, visible immediately |
| No engine migration tiers | "29 engines" as flat list | 4 tiers (Infrastructure/Safety/Intelligence/Diagnostics) with import order |
| Engines imported but unwired | 15+ engines had no specified consumer | Section 18: Every engine has named consumer + verification schedule |
| Intelligence subsystems write-only | Error DB, formula accuracy, knowledge graph had no read-back | 7 bidirectional feedback loops with SU-4 consume tests |
| Safety engines consumer gap | M4 extracts but doesn't map call sites | Consumer Chain Mapping Protocol: trace all callers BEFORE extracting |
| Sequencing guides undertested | SU-3 tests 8/22 | SU-3 tests ALL 22 in 4 batches |
| No pre-migration wiring cert | Dual-run checks outputs but not that engines are called | WIRING_CERTIFICATION.md: gate #14 at M-FINAL |

| Issue | v6 State | v7 Fix | Impact |
|-------|----------|--------|--------|
| Manufacturing track unspecified | M0-M3 are one-line summaries | M0 (5 MS), M1 (4 MS), M-M2 first cycle (6 MS) fully specified | Manufacturing track executable from cold start |
| E3 has no architectural constraints | 30 MS with generic template | E3 Component Dependency Graph + state management + API contract constraints | Front-loading produces coherent architecture |
| E4 has no architectural constraints | 24 MS with generic template | E4 Replication Architecture Constraints + ATCS failover requirements | Replication and failover decisions pre-constrained |
| No cross-track dependency map | Mfg and Enterprise run "in parallel" | Explicit dependency table: what needs what, when, fallback if unavailable | No integration surprises from timing misalignment |
| No safety-critical test matrix | "50 calculations cross-validated" undefined | 50 calculations defined across 8 categories with edge cases | Test coverage is representative, not random |
| Agent count drifts silently | ~54 agents referenced everywhere | Agent count verification added to Mini-SAU and full SAU | Agent roster stays accurate across 50+ weeks |
| SAU overhead too uniform | All SAUs cost ~8-10 tool calls | SAU-Light (5 calls) vs SAU-Full (10 calls) formalized | ~20% fewer tool calls at low-risk boundaries |
| Model strings hardcoded in roadmap | MS10 checks against literal strings | Model strings read from config; SAU verifies config accuracy | No roadmap edits needed when Anthropic updates models |
| Cadence count inconsistent | P0-MS9 says 33, Section 14 says 34 | Corrected: 34 total (30 original + 4 new) | Numbers consistent throughout |
| No "tool not imported" handling | Decision Protocol silent on stub returns | Section 3.8: explicit handling for not-yet-imported tool responses | No confusion during early platform MS |
| SESSION_INSIGHTS rotates away early data | 3KB limit purges P0 insights during E4 | Phase Archive protocol preserves compiled insights permanently | Regression debugging has historical context |
| No critical path identification | Flex chats allocated arbitrarily | Critical path analysis with float identification | Flex chats placed where slack is actually needed |
| No operator quick reference | Decision Protocol is dense | Section 16: one-page operator control sheet | Fast execution decisions without reading full protocol |
| No Manufacturing data campaign spec | M-M2 "data campaigns start" with no structure | Batch definition, numbering, checkpoint protocol, UAT trigger defined | P-UAT-MS1 trigger ("batch 20") is unambiguous |

**Net impact:** ~75 chats (up from ~72 — Manufacturing track adds 3-4), ~190 microsessions (up from ~124 — accurate count across all tracks: P0(11) + P1(8) + P2(8) + P3-P4(11) + M-M0(5) + M-M1(4) + M-M2(6) + M-M3(4) + E1(18) + E2(10) + E3(30) + E4(24) + M4-T1(8) + M4-T2(20) + cross-cutting(7) + SU(6) + SAU-Light(~10) + M-FINAL(6)), with dramatically higher cross-track coherence and zero unspecified execution paths. The increase is coverage, not overhead.

### Roadmap Amendment Protocol (NEW in v8.1)

*This document governs ~75-85 weeks of work. It will need amendments.*

```
AMENDMENT PROCESS:
  1. Document the change in the v7→v8 change table above (add rows for v8→v8.1, v8.1→v8.2, etc.)
  2. State: what changed, why, and impact on downstream MS
  3. If the change affects MS entry/exit conditions → update ALL affected MS specs
  4. If the change affects counts (dispatchers, engines, hooks) → update Section 14 and MASTER_INDEX.md
  5. If the change affects timing → update Section 11 timeline and Section 9 chat sequences
  6. Increment version: v8.0 → v8.1 → v8.2 → v8.3, etc. Minor for fixes, major for structural changes.
  7. At next SAU stop: verify all amendments are consistent with current system state

DISCOVERY DURING EXECUTION:
  If an executing session discovers a gap, error, or needed change in this roadmap:
  → Document as [ROADMAP_AMENDMENT] in SESSION_INSIGHTS.md
  → Apply the fix to the roadmap file if possible in the same session
  → If not possible (scope too large): create [PERSISTENT] TODO for next SAU stop
  → At SAU: review all [ROADMAP_AMENDMENT] insights and apply
```

### Model Upgrade Protocol (NEW in v8.4)

*Over 75 weeks, Anthropic will release new model versions. Model changes affect calculation accuracy, agent behavior, and cost estimates. This protocol governs when and how to upgrade.*

```
WHEN TO UPGRADE:
  - ONLY at SAU-Full boundaries (SU-1 through SU-6)
  - NEVER mid-campaign (M-M2 batch operations depend on consistent model behavior)
  - NEVER mid-phase (changing model behavior between MS creates debugging nightmares)
  - Exception: critical security patch → upgrade immediately, run safety matrix before continuing

UPGRADE PROCEDURE (at SAU-Full):
  1. Update model strings in BOTH .env files (mcp-server + prism-platform)
  2. Update known_renames.json if model string format changes
  3. Run safety_calc_test_matrix.py with NEW model → compare against baseline
     → If ANY safety calculation differs by > ±2σ from baseline: STOP
     → Investigate: is new model more accurate (update baseline) or less? 
     → If less accurate: REVERT to previous model strings
  4. Run performance_benchmark.py → compare all 10 benchmarks against baseline
     → If ANY benchmark degrades > 20%: document but proceed (models may be slower but smarter)
     → If calculation throughput (benchmark #4) degrades > 50%: REVERT
  5. Run 3 golden path demos → verify all pass
  6. Update Claude memory with new model strings
  7. Update PRISM_QUICK_REF.md (agent model strings section)
  8. Document in ROADMAP_TRACKER: "MODEL_UPGRADE: [old] → [new] at SU-X, safety matrix [PASS/FAIL]"

COST IMPACT:
  - New model tiers may have different pricing
  - After upgrade: recalibrate E2 cost model within 2 sessions
  - If cost changes > 30%: alert in CAMPAIGN_DASHBOARD.json

MODEL DEPRECATION:
  - If Anthropic deprecates a model mid-project: upgrade at next natural SAU stop
  - If model becomes unavailable before next SAU: emergency upgrade per procedure above
  - Document deprecated model in SESSION_INSIGHTS.md: [DECISION] reason for upgrade
```

### Disk Space and Archive Management Protocol (NEW in v8.4)

*The project generates archives over 75 weeks. Without monitoring, disk fills silently.*

```
ESTIMATED GROWTH:
  - Registry snapshots: ~5MB per snapshot × 3 categories × 10 kept = ~150MB
  - Daily backups: ~50MB per day × 7 kept = ~350MB
  - Weekly backups: ~500MB per week × 4 kept = ~2GB
  - SAU archives: ~200MB per stop × 16 stops = ~3.2GB
  - WAL archives (post-E1): ~100MB/month × 12 months = ~1.2GB
  - Codebase growth: mcp-server + prism-platform + node_modules = ~2GB
  - Total estimated: ~10-15GB over 75 weeks (with rotation)
  - Peak (before rotation kicks in): ~20-25GB

MONITORING:
  - Add disk_space_check to system_self_test.py (check #6):
    → WARN if C:\PRISM\archive\ > 15GB
    → WARN if C: drive < 10GB free
    → RED if C: drive < 5GB free
  - Check fires at every SAU stop (Light or Full)

CLEANUP PROTOCOL (if WARN triggered):
  1. Verify rotation is working: daily (7 kept), weekly (4 kept), SAU (all kept)
  2. If rotation working and still large: archive oldest SAU snapshots to external storage
  3. WAL archives: reduce retention from 30 days to 14 days if space-constrained
  4. Registry snapshots: reduce from 10 to 5 per category
  5. NEVER delete: latest SAU archive, latest daily backup, current WAL files
```

### Context Window Change Contingency (NEW in v8.4)

*The compaction/pressure system is calibrated to current context limits. If these change, thresholds need recalibration.*

```
DETECTION:
  - At every SAU-Full: verify context pressure predictions match actual behavior
  - If PLATFORM-CONTEXT-BUDGET consistently fires too early (>2 false positives per chat): 
    window may have increased
  - If compaction fires without PLATFORM-CONTEXT-BUDGET warning: window may have decreased

RECALIBRATION TRIGGER:
  - Anthropic announces context window change (check at SAU-Full stops)
  - Context pressure accuracy benchmark (#9) fails at P-PERF check
  - 3+ compaction events in 2 consecutive chats (indicates miscalibrated thresholds)

RECALIBRATION PROCEDURE:
  1. Measure actual context capacity: fill context with known-size data, record compaction point
  2. Recalculate pressure thresholds:
     → GREEN ceiling: 60% of NEW capacity
     → YELLOW: 60-84% of NEW capacity
     → RED: 85-94% of NEW capacity
     → BLACK: 95%+ of NEW capacity
  3. Update ContextManager.ts with new thresholds
  4. Update compaction_armor.py trigger threshold (currently 50% — scale proportionally)
  5. Update boot context budget (currently 10KB max — scale proportionally)
  6. Run P-PERF context pressure benchmark → verify ±5% accuracy
  7. Document in ROADMAP_TRACKER: "CONTEXT_RECALIBRATION: [old_cap] → [new_cap], thresholds updated"

  MICROSESSION LIMITS:
  - Current: 15-25 items, 15 tool calls max
  - If window INCREASES > 50%: raise to 20-35 items, 20 tool calls max
  - If window DECREASES > 25%: lower to 10-18 items, 12 tool calls max
  - Recalibrate at SAU stop, never mid-MS
```

---


# SECTION 2: NEW CAPABILITIES (Updated from v10.0)

## 2.1 Skills: ≥137 (119 existing + 18 new, auto-discovered)

MASTER_INDEX §11 confirms 119 existing skill files in C:\PRISM\skills-consolidated\. The roadmap creates 18 new skills. **Post v10.0, skills auto-discover from directory — count is a floor ("≥137"), not exact.**

| # | Skill Name | Created At | Purpose |
|---|-----------|-----------|---------|
| 1 | prism-registry-diagnostics | P0-MS1 | Registry path debugging and health reporting |
| 2 | prism-migration-validator | P2-MS7 | Dual-run validation skill |
| 3 | prism-campaign-operator | M-M0-MS2 | Data campaign execution guidance |
| 4 | prism-batch-troubleshoot | M-M2-MS1 | Batch error diagnosis |
| 5 | prism-material-validation | M-M1-MS2 | Material parameter cross-validation |
| 6 | prism-alarm-enrichment | M-M1-MS3 | Alarm fix procedure improvement |
| 7 | prism-compliance-guide | M-M3-MS1 | ISO compliance workflow guidance |
| 8 | prism-wal-operations | E1-MS1 | WAL management and replay |
| 9 | prism-cost-analysis | E2-MS1 | Cost intelligence queries |
| 10 | prism-dashboard-guide | E3-MS1 | Visual dashboard navigation |
| 11 | prism-plugin-dev | E3-MS21 | Plugin SDK development guide |
| 12 | prism-replication-ops | E4-MS1 | Replication management |
| 13 | prism-failover-guide | E4-MS8 | Failover procedures |
| 14 | prism-perf-tuning | P-PERF-MS1 | Performance optimization guidance |
| 15 | prism-uat-scenarios | P-UAT-MS1 | UAT test scenario execution |
| 16 | prism-formula-debug | P1-MS5 | Formula recommendation debugging |
| 17 | prism-swarm-patterns | P4-MS2 | Swarm deployment guidance |
| 18 | prism-extraction-guide | M4-T1 | Monolith extraction procedures |

**Every new skill MUST include a `## Changelog` section** per W1.4 protocol.

**Auto-Discovery (v10.0):** New skills dropped into C:\PRISM\skills-consolidated\ with valid YAML front matter are registered automatically on next boot or PLATFORM-SKILL-AUTO-LOAD trigger. No manual registry updates needed. See Section 3.17 for skill manifest format.

## 2.2 Scripts: ≥75 core (73 existing + 2 new + build pipeline scripts, self-describing)

MASTER_INDEX §7 confirms 73 core Python scripts (~35,430 lines) in C:\PRISM\scripts\core\. Additions:

| Script | Est. Lines | Purpose | Wired To |
|--------|-----------|---------|----------|
| mfg_batch_validator.py | ~150 | Validates manufacturing data campaign batches | M-M2 batch campaigns, P-UAT-MS1 trigger |
| safety_calc_test_matrix.py | ~200 | Executes 50+ calculation safety test matrix (with fuzz testing v10.0) | test:critical, SU-6, P-PERF-MS4 |
| test_critical_runner.py | ~120 | Orchestrates test:critical build step (v10.0) | npm run build pipeline |
| hook_smoke_test.py | ~80 | Verifies all registered hooks are callable (v10.0) | test:critical build step |

**Self-Description (v10.0):** Scripts with PRISM_MANIFEST headers auto-register and auto-wire to declared triggers. Legacy scripts without manifests remain accessible via manual invocation. See Section 3.17 for manifest format.

## 2.3 Hooks: ≥144 total (117 inherited + 27 new, atomically registered)

Installation sequence follows dependency order defined in Section 8. Each hook installs in the MS that builds its dependencies — never before deps exist. Incremental with dependency checking: hooks whose dependencies are not yet imported enter PENDING state and activate when deps are available.

**Atomic Registration (v10.0):** `prism_hook→register_with_manifest` atomically registers hook + updates HOOK_MANIFEST.json + validates priority bands + checks collisions. Post-M-FINAL, HOOK_MANIFEST.json is sole source of truth. See Section 3.17 for priority bands and collision detection.

## 2.4 Toolkits: 4

| Toolkit | Purpose | Key Components |
|---------|---------|----------------|
| Manufacturing Analysis | Core CNC calculation workflows | speed_feed, cutting_force, tool_life, surface_finish pipelines |
| System Administration | Platform management and monitoring | registry management, hook management, telemetry, diagnostics |
| Data Campaign | Batch data ingestion and validation | ingestion pipeline, batch validator, campaign dashboard |
| Enterprise Operations | WAL, cost, compliance operations | WAL management, cost tracking, compliance reporting |

## 2.5 External Integration API (NEW in v9.0)

RESTful API surface for CAM/ERP/MES system integration, built at E4-MS19b:

| Endpoint | Method | Purpose | Permission |
|----------|--------|---------|------------|
| /api/v1/materials/{id} | GET | Material lookup with full parameters | READ_ONLY |
| /api/v1/materials/search | POST | Query materials by filter | READ_ONLY |
| /api/v1/calculations/speed-feed | POST | Calculate cutting parameters | READ_ONLY |
| /api/v1/calculations/tool-life | POST | Predict tool life | READ_ONLY |
| /api/v1/alarms/{controller}/{code} | GET | Alarm decode + fix procedure | READ_ONLY |
| /api/v1/machines/{id} | GET | Machine specification lookup | READ_ONLY |
| /api/v1/health | GET | System health status | Public |

All endpoints versioned. Rate limited per tenant. OpenAPI spec auto-generated. Authentication via tenant-scoped API tokens. Write operations available only at CALC_MODIFY permission tier.

## 2.6 Infrastructure Files (Critical — from MASTER_INDEX §6)

These are the invisible load-bearing files that make hooks fire, context compress, and cadence execute. They MUST migrate to prism-platform.

| File | Lines | What It Does | What Breaks Without It |
|------|-------|-------------|----------------------|
| autoHookWrapper.ts | 1,559 | Universal hook proxy. Wraps all 27 dispatchers with before/after/error hooks, S(x) hard blocks, cadence enforcement, buffer zone warnings. | ALL hooks stop firing. S(x) blocks inactive. Cadence dead. |
| cadenceExecutor.ts | 2,246 | System heartbeat. 34 auto-fire functions: autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoSurvival, autoAttentionScore, etc. | No auto-todo, no checkpoints, no compaction detection, no context pressure management. |
| responseSlimmer.ts | ~200 | Truncation caps: 20KB normal, 12KB at 60%, 8KB at 70%, 5KB at 85%. | Context overflows at high pressure. |

## 2.7 Engines: 29 (19,930 lines total — from MASTER_INDEX §4)

See Section 17 for full list with line counts and migration tiers.

## 2.8 Registries: 19 (13,879 lines total — from MASTER_INDEX §5)

See Section 17 for full list with line counts and migration tiers.

## 2.9 Type Definitions: 8 files (~1,799 lines total — from MASTER_INDEX §9 + v9.0/v10.0 additions)

| File | Lines | Purpose |
|------|-------|---------|
| prism-schema.ts | 689 | Core dispatcher parameter and result types |
| telemetry-types.ts | 246 | TelemetryEngine types |
| graph-types.ts | 193 | MemoryGraphEngine types |
| pfp-types.ts | 186 | PredictiveFailureEngine types |
| certificate-types.ts | 105 | CertificateEngine types |
| data-provider.ts | ~130 | DataProvider interface, QueryFilter, DataEvent types (v9.0) |
| calc-model-types.ts | ~100 | CalcModel interface, CalcModelRegistry types (v9.0) |
| error-types.ts | ~150 | PrismError hierarchy: CalcError, SafetyError, RegistryError (v10.0) |

These import at P0-MS5 (scaffold) — they define the TypeScript interfaces for all dispatcher params.

## 2.10 Data Files: 215 JSON files across 6 directories (from MASTER_INDEX §8)

```
C:\PRISM\data\materials\        → 64 files
C:\PRISM\data\machines\         → 37 files
C:\PRISM\data\controllers\      → 3 files
C:\PRISM\data\tools\            → 8 files
C:\PRISM\extracted\machines\    → 38 files (alternate source)
C:\PRISM\extracted\controllers\ → 65 files (alternate source)
```

## 2.11 GSD Protocol Files: 16 files (~628 lines total)

```
C:\PRISM\mcp-server\data\docs\gsd\
├── GSD_QUICK.md          (~87L)  — Master quick reference, decision tree
├── DEV_PROTOCOL.md       (~165L) — Development workflow rules
└── sections/
    ├── laws.md, workflow.md, buffer.md, equation.md, tools.md,
    ├── manus.md, evidence.md, gates.md, start.md, end.md,
    └── d1.md, d2.md, d3.md, d4.md
```

gsdDispatcher.ts reads these at runtime (fs.readFileSync). Editing a .md file → changes live immediately (no rebuild). gsd_sync_v2.py auto-updates tools.md and GSD_QUICK.md counts after builds.

**GSD File Integrity (NEW in v8.1):** If fs.readFileSync throws (file missing, corrupted, or malformed markdown), gsdDispatcher must: (1) log error to TelemetryEngine "system" channel, (2) fall back to last cached GSD state (cached at successful boot), (3) set [GSD_DEGRADED] flag that fires at next boot. If GSD_QUICK.md itself is missing, BLOCK boot and require manual recovery — it's the routing decision tree.

## 2.12 KNOWN_RENAMES: 180-190 entries in guardDispatcher.ts

Maps old tool names → new dispatcher+action format. Backward compatibility for scripts, skills, and sequencing guides. prism_guard→pre_call_validate uses these to auto-correct tool calls. Must be preserved as JSON config during migration.

## 2.13 State Files: 19 total (with enhanced coherence checking)

Same 13 files as v6, plus 2 state files from v8.5 (HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json) and 2 state files from v9.0 (API_VERSION.json, EXTENSION_REGISTRY.json). system_self_test.py includes state file coherence validation (Section 2.13).

**New state files (v8.5):**
- `C:\PRISM\state\HOOK_MANIFEST.json` — Machine-readable hook count source-of-truth. Created at P0-MS1, updated by every hook-installing MS. system_self_test.py check #3 reads expected_total from this file.
- `C:\PRISM\state\QUARANTINE_BACKLOG.json` — Deferred quarantine items for batch resolution sessions. Created at M-M2-MS6 steady-state. Read by quarantine-resolution sessions (every 5th M-M2 session).

**New state files (v9.0):**
- `C:\PRISM\state\API_VERSION.json` — Semantic version tracking for all 324 dispatcher action signatures. Created at P0-MS5, bumped by any MS that changes action signatures. Plugin manifests validate against this. system_self_test.py check #7 verifies version consistency.
- `C:\PRISM\state\EXTENSION_REGISTRY.json` — Tracks registered data model extension categories (composite, additive, etc.) with field definitions and consumers. Created at P0-MS5, updated when new extension categories are registered. Validated at SAU-Full for consumer coverage.

**New doc files (v8.5):** Stored in C:\PRISM\docs\, backed up on daily doc schedule:
- `COHERENCE_AUDIT.md` — Architectural consistency tracking, appended at every SAU-Full
- `ENTERPRISE_PACE.md` — Enterprise phase velocity tracking, updated after every enterprise chat
- `HUMAN_REVIEW_LOG.md` — Domain expert validation records (H-1 through H-4 gates)
- `COMPLIANCE_REQUIREMENTS.md` — ISO clause mapping for CNC manufacturing domain
- `ENV_CONFIG.md` — External backup destination + environment configuration
- `BREAKING_CHANGES.md` — API version breaking changes with migration paths (v9.0)
- `USER_GUIDE.md` — Operator-facing documentation auto-generated at M-FINAL-MS7 (v9.0)

**State file classification (NEW in v8.2):** "State files" are machine-read files used for recovery and system operation (HANDOFF.json, COMPACTION_SURVIVAL.json, CAMPAIGN_DASHBOARD.json, session_memory.json, doc_baselines.json, HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json, etc.). Audit/report documents (BENCHMARK_LOG.md, CALC_REFERENCE_LOG.md, VALIDATION_REPORT.md, PROGRESS_REPORT.md, WIRING_CERTIFICATION.md, COHERENCE_AUDIT.md, ENTERPRISE_PACE.md, HUMAN_REVIEW_LOG.md, COMPLIANCE_REQUIREMENTS.md, ENV_CONFIG.md) are classified as **doc files** stored in C:\PRISM\docs\ and backed up on the daily doc schedule. They are NOT state files and are not counted in the 19.

### ROADMAP_TRACKER.md Format (NEW in v8.2)

*This is the PRIMARY position tracking artifact. Referenced by START HERE, Decision Protocol, every MS handoff, every SAU, and system_self_test.py. NEVER free-form prose.*

```
FORMAT: [MS-ID] [STATUS] [DATE] [FLAGS?]

STATUSES:
  COMPLETE            — All exit conditions met
  COMPLETE [flag]     — Completed with documented exception

FLAGS (append after status):
  [DATA_GAP:detail]          — Missing data, documented, non-blocking
  [PARTIAL_ENTRY:detail]     — Entry conditions ≥90% but <100%
  [INCOMPLETE_BLOCKED:detail] — Code bug, budget exhausted, persisted as TODO
  [STUB:detail]              — Used mcp-server fallback for platform stub
  [SYNTHETIC_DATA:detail]    — Cross-track fallback data used
  [DEFERRED:detail]          — Deferred for re-execution at next SAU
  [RALPH_DEGRADED]           — Ralph validation skipped during batch

EXAMPLES:
  P-P0-MS0 COMPLETE 2026-02-15
  P-P0-MS1 COMPLETE 2026-02-20 [DATA_GAP:titanium alloys underrepresented, 2847/3518 raw available]
  P-P0-MS6 COMPLETE 2026-02-25 [PARTIAL_ENTRY:ContextManager export missing 2 utility functions]
  M-M2-MS5 COMPLETE 2026-05-10 [DATA_GAP:titanium alloy family underrepresented]
  E2-MS3 COMPLETE 2026-06-01 [SYNTHETIC_DATA:used P2-P4 agent costs, recalibrate at SU-5]

SAU ENTRIES:
  SU-1 SAU-FULL COMPLETE 2026-02-28
  E1-MS4 SAU-LIGHT COMPLETE 2026-04-15

AUTOPILOT SEQUENCE TEST (at SU-3):
  AUTOPILOT_SEQUENCE_TEST: 21/22 pass [FAIL:3.19 Knowledge Graph — graph empty pre-M-M2]
```

## 2.14 System Self-Test Enhancement

system_self_test.py now runs **9 checks** (updated v10.0):

1. Survival file write-readback
2. Known-material query (4140)
3. Hook count check — **reads expected_total from HOOK_MANIFEST.json** (v8.5), compares against prism_hook→list actual count. Three-way reconciliation at SAU-Full: HOOK_MANIFEST.json == Section 8 table == live system. Discrepancy = FAIL.
4. ROADMAP_TRACKER staleness
5. State coherence — verify ROADMAP_TRACKER.md, HANDOFF.json, and COMPACTION_SURVIVAL.json agree on current MS position. If disagreement → WARN with specific discrepancy. **Auto-repair mode (v10.0 ER-7):** if code reality is clear (e.g., files exist that only a completed MS would produce), propose correction: "ROADMAP_TRACKER says P0-MS4, but P0-MS5 scaffold exists. Suggest updating to P0-MS5 COMPLETE." Operator confirms or rejects.
6. **Disk space check (v8.4)** — verify C:\PRISM\archive\ < 15GB and C: drive has > 10GB free. WARN if exceeded, RED if C: < 5GB free.
7. **API version consistency (v9.0)** — read API_VERSION.json, verify api_major.api_minor matches expected for current MS position. Check for deprecated_actions past their removal_at version. WARN if stale, FAIL if version mismatch.
8. **Build pipeline verification (v10.0)** — verify npm run build completes successfully: tsc --noEmit passes (type check), esbuild compiles, test:critical runner exists and last run was PASS. WARN if last test:critical > 1 build old.
9. **Safety trace proof (v10.0 SR-5)** — verify TelemetryEngine has SAFETY-level log entries for each safety-critical dispatcher action executed since last check. Any safety action WITHOUT a corresponding correlationId trace = FAIL. Proves safety engines are being called, not just registered.

---

# SECTION 3: DECISION PROTOCOL

*When things are ambiguous, this is the law. No interpretation. Follow the tree.*

## 3.1 Position Recovery — "Where Am I?"

```
STEP 1: Read ROADMAP_TRACKER.md
  → Find most recent entry marked COMPLETE
  → Next MS = the one immediately after

STEP 2: If ROADMAP_TRACKER.md is missing or stale:
  → Read HANDOFF.json → last_ms_completed field
  → Read ACTION_TRACKER.md → check pending items for MS context
  → Read COMPACTION_SURVIVAL.json → check last_active_ms field
  → Use the LOWEST (most conservative) MS ID across all sources
  → Document the discrepancy before proceeding

STEP 3: If ALL state files are missing or corrupted:
  → Run env_smoke_test.py first — verify environment is functional
  → Run registry_health_check.py if it exists
    → If reports > 95% of available data files loaded → P0-MS1+ COMPLETE
  → Check for prism-platform/ directory
    → If exists with populated src/ → P0-MS5+ started
    → If doesn't exist → you're in P0-MS0 through P0-MS4
  → npm run build both codebases — which ones compile?
  → Fall back to the earliest MS whose exit conditions are NOT met
  → Create fresh ROADMAP_TRACKER.md documenting recovery

STEP 4: After position recovery, verify system artifacts:
  → Read GSD_QUICK.md — does it reflect current system capabilities?
  → Read PRISM_QUICK_REF.md — are hook counts and paths current?
  → If either is stale → run SAU protocol (Section 4.7) before proceeding
```

## 3.2 Entry Conditions

```
ALL conditions met (100%):
  → Proceed normally

Conditions met at ≥ 90%:
  → PROCEED with [PARTIAL_ENTRY] flag in ROADMAP_TRACKER.md
  → Document which condition is short and by how much

Conditions met at < 90%:
  → STOP. Check if prior MS needs rework.
  → If prior MS exit conditions were met when completed → something regressed
  → If prior MS exit conditions were NOT met → prior MS incorrectly marked complete

Conditions CANNOT be evaluated:
  → Run the verification tools from the prior MS's exit conditions
  → If those tools don't exist yet → you're earlier than you think
  → Fall back to Position Recovery (3.1)
```

## 3.3 Exit Conditions

```
ALL conditions met:
  → Mark COMPLETE in ROADMAP_TRACKER.md
  → Write HANDOFF.json
  → Write SESSION_INSIGHTS.md if non-obvious learnings (use structured format — see 3.7)
  → If this MS is an SAU boundary → execute SAU protocol (Section 4.7)
  → Proceed to next MS

PARTIALLY met — data limitation (e.g., raw files contain only 2,900 materials):
  → Mark COMPLETE with [DATA_GAP] flag
  → Document exact gap: what exists vs what's expected
  → Proceed

PARTIALLY met — code bug (system can't load data that exists):
  → DO NOT mark complete
  → Debug until fixed or tool call budget exhausted
  → If budget exhausted: [INCOMPLETE_BLOCKED] flag, [PERSISTENT] TODO, proceed with WARNING

IMPOSSIBLE (upstream broken):
  → Document what's broken and which upstream MS owns it
  → [PERSISTENT] [BLOCKED_EXIT] TODO
  → Proceed to next MS ONLY if it doesn't depend on this one
```

## 3.4 Multiple Valid Next Steps

```
Multiple MS in same chat:
  → Execute LOWER MS number first
  → Main track before cross-cutting (P-PERF, P-UAT, P-DM)
  → If different tracks at same priority: Platform > Manufacturing > Enterprise

Strategic Update Point in this chat:
  → Complete ALL main-track MS for this chat FIRST
  → Then execute the Strategic Update Point (which includes SAU)
  → SU points are the LAST thing in their chat

P-DM triggered by hook mid-chat:
  → Complete current MS's current STEP
  → Execute P-DM microsession (schema mismatches corrupt data — urgent)
  → Resume interrupted MS from next step
```

## 3.5 State File Conflicts

```
ROADMAP_TRACKER.md says X, HANDOFF.json says Y:
  → Trust ROADMAP_TRACKER.md (updates per-MS, more granular)
  → Update HANDOFF.json to match

HANDOFF.json says X, COMPACTION_SURVIVAL.json says Y:
  → Trust whichever has the MORE RECENT timestamp
  → If equal: trust COMPACTION_SURVIVAL.json (written under pressure = actual crisis state)

ACTION_TRACKER.md has pending items for a "completed" MS:
  → The MS is NOT actually complete. Reopen it.

system_self_test state coherence reports discrepancy:
  → Run Position Recovery (3.1) from STEP 2
  → Reconcile ALL state files before continuing
```

## 3.6 Context Budget Management

```
Context budget at GREEN (< 60%):
  → Continue normally

Context budget at YELLOW (60-84%):
  → Complete current MS
  → Write HANDOFF.json
  → If more MS remain in this chat: evaluate whether to continue or defer
  → If next MS is context-heavy (imports, large code reads): defer to next chat

Context budget at RED (85-94%):
  → Complete current STEP of current MS
  → Write HANDOFF.json + COMPACTION_SURVIVAL.json immediately
  → Defer ALL remaining MS to next chat

Context budget at BLACK (95%+):
  → Compaction armor fires automatically
  → Trust COMPACTION_SURVIVAL.json for recovery
  → Next message: read survival files, resume from last checkpoint
```

## 3.7 SESSION_INSIGHTS.md Structured Format

*Every insight entry uses one of these 4 categories. One line per insight. No free-form prose.*

```
Format: [CATEGORY] Brief description | detail

Categories:
  [PATTERN]    — Reusable approach discovered. E.g.: [PATTERN] Path resolution: data dirs use kebab-case not camelCase | affects all registries
  [GOTCHA]     — Non-obvious trap to avoid. E.g.: [GOTCHA] CompactionManager import requires ContextManager first | circular dep otherwise
  [DECISION]   — Choice made with rationale. E.g.: [DECISION] ATCS as core service not plugin | needs cross-plugin state access
  [REGRESSION] — What broke and root cause. E.g.: [REGRESSION] Hook chain broke after MS7 import | priority collision between SYS-REGISTRY-HEALTH and PLATFORM-IMPORT-VERIFY

Max 3KB active. Rotation: oldest non-[PERSISTENT] entries rotate first.
At phase boundaries: compile phase insights into a single summary line per category.
```

### Phase Archive Protocol (NEW in v7)

```
At every phase boundary (P0→P1, P1→P2, etc.):
  1. Compile active SESSION_INSIGHTS.md into phase summary (max 500 bytes)
  2. Append phase summary to SESSION_INSIGHTS_ARCHIVE.md (persistent, never rotated)
  3. Rotate active file as normal

SESSION_INSIGHTS_ARCHIVE.md format:
  === P0 INSIGHTS (compiled YYYY-MM-DD) ===
  [PATTERN] Registry paths use kebab-case | all registries
  [GOTCHA] CompactionManager requires ContextManager import first
  [DECISION] ATCS as core service not plugin | cross-plugin state
  === P1 INSIGHTS (compiled YYYY-MM-DD) ===
  ...

Max 10KB total. If exceeds: keep only [REGRESSION] and [DECISION] entries from oldest phases.

Purpose: When E4 regression traces to P1 pattern, the archive has it.
```

## 3.8 Tool Not Yet Imported — Stub Handling (NEW in v7)

*During P0-P1, prism-platform has stubs that throw "not yet imported." This is expected, not an error.*

```
A step references a tool/action that returns "not yet imported" or "stub: not implemented":

  IF you are in P0-MS5 through P1-MS8 (platform scaffold + import phase):
    → This is EXPECTED for prism-platform stubs
    → Use the mcp-server equivalent tool if available
    → Document: "[STUB] Used mcp-server fallback for X — platform stub awaiting import"
    → Continue normally

  IF you are in P2+ (platform should be functional):
    → This is NOT expected
    → Check IMPORT_LOG.md — was this action imported?
    → If not imported: wrong MS order, check dependencies
    → If imported but failing: debug as code bug (Section 3.3)

  IF a step requires BOTH codebases and one has stubs:
    → Use the functional codebase for the action
    → Verify the stub codebase at least compiles
    → Note in HANDOFF.json which codebase actually executed the action
```

## 3.9 Cross-Track Dependency Protocol (NEW in v7)

*Manufacturing and Enterprise tracks run in parallel. This table defines explicit timing dependencies and fallbacks.*

```
READING THIS TABLE:
  "A REQUIRES B" means A cannot produce correct output without B's data.
  "FALLBACK" means what to do if B isn't ready when A needs it.
  All fallbacks include a [SYNTHETIC_DATA] or [DEFERRED] flag that triggers re-execution
  at the next SAU stop once the real data is available.
```

| Dependent MS | Requires | What It Needs | Fallback If Unavailable |
|-------------|----------|---------------|------------------------|
| E2-MS3 (cost calibration) | M-M2 batch ≥ 10 complete | Real API costs from batch operations | Use synthetic cost data from P2-P4 agent calls. Flag [SYNTHETIC_DATA]. Recalibrate at SU-5 with real data. |
| E1-MS5+ (WAL replay testing) | M-M2 batch ≥ 5 complete | Meaningful WAL entries to replay | Use P2 demo operations as replay corpus. Flag [THIN_DATA]. Re-test at SU-5 with M-M2 data. |
| E3-MS1 (React telemetry wiring) | M-M2 batch ≥ 20 complete | Live telemetry feed with real data | Wire to telemetry with P2-P4 demo data. Flag [DEMO_DATA]. Switch to live feed when M-M2 data available. |
| P-UAT-MS1 | M-M2 batch 20 complete | ≥900 validated material entries (1,000 processed) | BLOCK. Cannot run UAT without real data. Defer UAT until batch 20 complete. |
| E2-MS7 (finance export) | M-M2 batch ≥ 15 complete | Meaningful cost history for export | Use accumulated P2-E2 costs. Flag [PARTIAL_COST]. Re-export at SU-5. |
| E4-MS1 (replication) | M-M2 substantially complete | Registry data worth replicating | Replicate current registry state. Flag [INCOMPLETE_REPLICA]. Re-sync after M-M2 completes. |
| M-M2 batch campaigns | P3-MS1 (batch resilience) | ATCS batch framework operational | BLOCK. Cannot run data campaigns without batch resilience. |
| M-M2 batch campaigns | P0-MS1 (registries) | Registries loading > 95% | BLOCK. Cannot populate registries that don't load. |
| M4-T1 (extraction) | E1 WAL operational | WAL logging for extracted functions | Extract without WAL logging. Flag [NO_WAL]. Wire WAL after E1 completes. |
| M-FINAL (migration) | E1-E4 complete | All enterprise features operational | BLOCK. Cannot retire mcp-server without enterprise features. |

```
EXECUTION RULE:
  When starting any MS in this table's "Dependent MS" column:
  1. Check if the "Requires" MS is COMPLETE
  2. If YES → proceed normally
  3. If NO → check "Fallback" column
  4. If fallback says BLOCK → skip this MS, document in ROADMAP_TRACKER, proceed to next non-blocked MS
  5. If fallback has a flag → execute with fallback, apply flag to exit conditions
  6. At next SAU stop → check all flagged MS → re-execute with real data if now available
```

## 3.10 Model String Management (NEW in v7)

*Model strings WILL change during a ~75-week project. Never hardcode them in the roadmap.*

```
Model strings are stored in exactly TWO places:
  1. C:\PRISM\mcp-server\.env (HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL)
  2. C:\PRISM\prism-platform\.env (same keys)

NEVER hardcode model strings in source code. Always read from config.

At every SAU stop (Light or Full):
  1. Read current model strings from .env
  2. Test each tier: agent_invoke with echo prompt
  3. If any tier fails → check Anthropic API for current model strings
  4. Update .env files if needed
  5. Update Claude memory with current model strings

If Anthropic deprecates a model string mid-project:
  → SAU will catch it at next boundary
  → Update .env, rebuild, verify
  → No source code changes needed
```

## 3.11 Emergency Off-Ramp Protocol (NEW in v8.5)

*Every complex project needs exit criteria, not just completion criteria. This protocol defines when to STOP and restructure rather than accumulating technical debt.*

```
OFF-RAMP TRIGGERS (any ONE triggers reassessment):

  1. SCHEDULE BREACH > 25%:
     If actual elapsed time exceeds planned elapsed time by > 25% at any
     SAU-Full boundary (e.g., SU-3 should be ~week 18; if it's week 23+,
     trigger).
     → Action: Full schedule reassessment. Options: scope reduction,
       team augmentation (human developers for E3/E4), architecture simplification.

  2. SAFETY VALIDATION FAILURE AT SCALE:
     If H-1 or H-2 human review produces 3+ [REJECTED] entries in the same
     alloy family, indicating systematic source data problems.
     → Action: Pause all data campaigns. Audit source data methodology.
       Consider switching primary data sources. Do NOT continue ingesting
       from a compromised source.

  3. ARCHITECTURAL COHERENCE COLLAPSE:
     If 2 consecutive SAU-Full coherence audits show MAJOR style drift AND
     architectural violations, indicating the codebase is diverging from
     its own design.
     → Action: Dedicate 2-3 full sessions to architectural cleanup before
       ANY new feature work. If cleanup reveals fundamental design problems,
       reassess E3/E4 approach.

  4. ENTERPRISE PHASE RED FOR 5+ CONSECUTIVE CHATS:
     If ENTERPRISE_PACE.md shows RED for 5+ chats with no improvement despite
     mitigation attempts (see Section 5 Enterprise Margin Protocol).
     → Action: Enterprise scope is too large for Claude-only execution.
       Options: simplify E3 to dashboard-only (drop FlowCanvas, HookDesigner,
       Marketplace), defer E4 to post-MVP, or bring in human frontend developer
       for E3 React work.

  5. CAMPAIGN THROUGHPUT DEGRADED FOR 10+ SESSIONS:
     If M-M2 average throughput stays below 2 batches/session for 10+
     consecutive sessions.
     → Action: Data campaign approach is not working at scale. Options:
       reduce target material count, simplify validation pipeline,
       accept lower coverage with higher confidence per entry.

  6. COMPACTION FREQUENCY > 3 PER CHAT SUSTAINED:
     If context compaction fires > 3 times per chat for 5+ consecutive chats,
     indicating the system has outgrown the context window for its operational
     requirements.
     → Action: Architecture cannot fit in context. Options: split into
       smaller sub-projects with independent context, reduce boot payload,
       aggressive microsession scoping.

REASSESSMENT PROCEDURE (when any trigger fires):
  1. Document trigger in SESSION_INSIGHTS: [DECISION] Off-ramp trigger N fired
  2. Complete current MS (don't abandon mid-MS)
  3. Write comprehensive HANDOFF.json + ROADMAP_TRACKER
  4. Create REASSESSMENT.md:
     → What triggered the off-ramp
     → Current system state (what works, what doesn't)
     → Options with tradeoffs
     → Recommended path forward
  5. Present to project stakeholders for decision
  6. Do NOT continue building until reassessment is resolved

KEY PRINCIPLE:
  Stopping early with a working partial system is ALWAYS better than
  completing a broken full system. A PRISM that correctly handles materials,
  calculations, and alarms — without the visual dashboard or marketplace —
  is infinitely more valuable than a PRISM with everything but incorrect
  cutting parameters.
```


## 3.12 API Version Management Protocol (NEW in v9.0)

*Over 75+ weeks and beyond, dispatcher action signatures WILL evolve. Plugins, skills, and sequencing guides that depend on specific parameter shapes break silently when signatures change without versioning.*

```
API VERSION FILE:
  C:\PRISM\state\API_VERSION.json
  {
    "schema_version": 1,
    "api_major": 1,
    "api_minor": 0,
    "api_patch": 0,
    "breaking_changes": [],
    "deprecated_actions": [],
    "last_updated": "YYYY-MM-DDTHH:MM:SSZ"
  }

VERSIONING RULES:
  PATCH (1.0.X): Bug fixes to action behavior, no signature change
  MINOR (1.X.0): New optional parameters added, new actions added
  MAJOR (X.0.0): Parameter removed, parameter type changed, action removed

  On MINOR bump: all existing callers continue working (new params have defaults)
  On MAJOR bump: deprecated callers get warning for N+2 minor versions before removal

DEPRECATION PROTOCOL:
  1. Add action to deprecated_actions[] with: action_name, deprecated_at (version),
     removal_at (version), replacement (new action signature), reason
  2. Deprecated actions log WARNING to TelemetryEngine on every call
  3. KNOWN_RENAMES updated if action name changes
  4. Skills and sequencing guides updated at next SAU stop
  5. After removal_at version: action returns error with migration instructions

BREAKING_CHANGES.md:
  Location: C:\PRISM\docs\BREAKING_CHANGES.md
  Format: "## v[MAJOR].[MINOR].[PATCH] — [DATE]\n- [action]: [what changed] → [migration path]"
  Checked at: Every SAU-Full (verify all breaking changes have migration paths)

PLUGIN MANIFEST INTEGRATION:
  Every plugin manifest.json includes:
    "min_api_version": "1.0.0"
  At plugin load: compare min_api_version against current api_major.api_minor
  If current < required: BLOCK plugin load, log "Plugin X requires API v1.2+, current is v1.1"

WHEN TO BUMP:
  - Any MS that changes a dispatcher's parameter types → MAJOR
  - Any MS that adds new actions or optional params → MINOR
  - Bug fixes → PATCH
  - Document in ROADMAP_TRACKER: "API_VERSION: X.Y.Z → X.Y.Z+1 at [MS-ID]"
  - Update API_VERSION.json immediately (not deferred to SAU)

CREATED AT: P0-MS5 (scaffold — initial v1.0.0)
FIRST CONSUMERS: E3-MS21 (Plugin SDK), all skills, all sequencing guides
```

## 3.13 Data Access Abstraction Protocol (NEW in v9.0)

*Registries currently read JSON files via direct fs.readFileSync. This couples every engine and registry to the file system. A DataProvider interface abstracts storage, enabling future backend swaps (JSON→SQLite→PostgreSQL→API) without touching engine code.*

```
DATAPROVIDER INTERFACE:
  Created at P0-MS5 (scaffold) as src/core/DataProvider.ts (~80 lines):

  interface DataProvider<T> {
    get(id: string): Promise<T | null>;
    query(filter: QueryFilter): Promise<T[]>;
    put(id: string, data: T): Promise<void>;
    delete(id: string): Promise<void>;
    count(filter?: QueryFilter): Promise<number>;
    subscribe(event: DataEvent, callback: (data: T) => void): Unsubscribe;
  }

  interface QueryFilter {
    category?: string;
    conditions?: Record<string, any>;
    limit?: number;
    offset?: number;
  }

  type DataEvent = 'created' | 'updated' | 'deleted' | 'bulk_import';

INITIAL IMPLEMENTATION:
  JsonFileProvider<T> implements DataProvider<T> — wraps current fs.readFileSync
  behavior. Zero behavior change from current system. Pure structural refactor.

  Created at P0-MS5 as src/providers/JsonFileProvider.ts (~150 lines):
  - Reads from data/ directories exactly as current registries do
  - Caches in memory after first read (matching current behavior)
  - subscribe() emits events for hook integration (knowledge graph, formula tracker)

MIGRATION PATH:
  All registry classes (MaterialRegistry, MachineRegistry, AlarmRegistry, etc.)
  refactored to accept DataProvider<T> in constructor instead of hardcoded paths.
  
  P0-MS1: Registry fix uses current direct paths (no change)
  P0-MS5: DataProvider interface created, JsonFileProvider wraps existing behavior
  P0-MS6: Registries refactored to use DataProvider (behavior identical, coupling broken)
  Post-deployment: swap JsonFileProvider for SqliteProvider or PostgresProvider
    → zero engine changes required

EXTENSION FIELDS:
  Material schema supports extension fields for new material categories:
  
  interface MaterialEntry {
    // ... existing 127 parameters ...
    extensions: Record<string, ExtensionField>;
    schema_version: number;
  }
  
  interface ExtensionField {
    category: string;       // e.g., "composite", "additive", "edm"
    field_name: string;
    field_type: "number" | "string" | "boolean" | "range";
    value: any;
    unit?: string;
    uncertainty?: number;
    source?: string;
  }

  New material categories (composites, plastics, additive powders) add fields
  to extensions{} without modifying the core 127-parameter schema.
  Engines that don't understand an extension category ignore it.
  Engines that DO understand it (e.g., a future AdditiveCalcEngine plugin)
  read from extensions where category === "additive".

EXTENSION REGISTRY:
  C:\PRISM\state\EXTENSION_REGISTRY.json tracks all registered extension categories:
  {
    "schema_version": 1,
    "categories": [
      { "name": "composite", "fields": [...], "registered_at": "...", "registered_by": "..." }
    ]
  }
  Created at P0-MS5. Updated when new extension categories are registered.
  Validated at SAU-Full: all extension categories have at least one consumer.

ANTI-REGRESSION:
  DataProvider refactor at P0-MS6 MUST pass validate_anti_regression:
  - All existing registry lookups return identical results before/after
  - Performance benchmark: lookup latency within ±10% of direct-read baseline
  - Zero new dependencies introduced (DataProvider is a local interface)

KEY PRINCIPLE:
  The DataProvider is an INTERNAL abstraction — it does NOT change the MCP
  tool interface. prism_data→material_lookup still works exactly the same.
  The change is HOW the registry satisfies the lookup internally.

**PROVISIONAL STATUS (v10.0 ER-5):**
  DataProvider interface is explicitly marked PROVISIONAL until post-M-M2 completion.
  Real query patterns from data campaigns may reveal interface gaps (e.g., bulk operations,
  cursor-based pagination for large result sets, transactional writes for atomic batch updates).
  Interface revision allowed through SU-5, then FROZEN to v1.0. After freeze, changes require
  MAJOR API version bump and full consumer audit.
```

## 3.14 Calculation Engine Extension Protocol (NEW in v9.0)

*The Kienzle cutting force model and Taylor tool life equation cover conventional CNC machining. Future domains (EDM, additive, laser cutting, waterjet) require different physics models. This protocol defines how new calculation models register without modifying ManufacturingCalcEngine.ts.*

```
CALC MODEL REGISTRY:
  CalcModelRegistry is a typed registry (similar to DataProvider pattern) that maps:
    domain → calculation model → input contract → output contract → safety thresholds

  Built at P0-MS5 (scaffold) as src/core/CalcModelRegistry.ts (~100 lines):
  
  interface CalcModel {
    domain: string;                    // "cnc_milling", "cnc_turning", "edm", "additive"
    name: string;                      // "kienzle_cutting_force", "taylor_tool_life"
    version: string;                   // semantic version
    inputSchema: JSONSchema;           // typed input contract
    outputSchema: JSONSchema;          // typed output contract
    safetyThresholds: SafetyConfig;    // S(x) thresholds per output field
    calculate(input: any): Promise<CalcResult>;
    validate(input: any): ValidationResult;
  }

  ManufacturingCalcEngine.ts becomes a ROUTER:
    1. Receive calculation request with domain + model hint
    2. Look up model in CalcModelRegistry
    3. Validate input against model's inputSchema
    4. Execute model.calculate()
    5. Validate output against model's safetyThresholds
    6. Return result through normal hook chain (CalcHookMiddleware still applies)

REGISTERING A NEW MODEL:
  1. Implement CalcModel interface
  2. Register via CalcModelRegistry.register(model)
  3. Add test calculations to safety matrix (Section 15) — new category
  4. Run safety matrix — all new calculations must achieve S(x) ≥ 0.70
  5. API version: MINOR bump (new capability, no breaking change)
  6. Document in EXTENSION_REGISTRY.json: calculation model entry

BUILT-IN MODELS (registered at P0-MS5):
  - kienzle_cutting_force (domain: cnc_milling, cnc_turning)
  - taylor_tool_life (domain: cnc_milling, cnc_turning)
  - johnson_cook_thermal (domain: cnc_milling, cnc_turning)
  - thread_calculation (domain: cnc_turning, cnc_milling)

FUTURE MODELS (registered post-deployment via plugin or data maintenance):
  - edm_material_removal (domain: edm)
  - additive_melt_pool (domain: additive)
  - laser_kerf_prediction (domain: laser_cutting)
  Each follows the same register → test → validate → deploy cycle.
```

## 3.15 Controller Extension Protocol (NEW in v9.0)

*The system currently supports 12 controller families. New controllers (Mitsubishi, Brother, Doosan, etc.) should be addable without modifying AlarmRegistry core code.*

```
CONTROLLER REGISTRY:
  ControllerRegistry maps:
    controller_family → alarm_schema → decode_logic → fix_templates

  Pattern established by existing 12 families, now formalized:

  interface ControllerDefinition {
    family: string;                    // "FANUC", "HAAS", "SIEMENS", etc.
    version: string;                   // firmware version range
    alarmSchema: {
      code_format: string;             // regex for valid alarm codes
      severity_levels: string[];       // e.g., ["warning", "fault", "emergency"]
      category_prefix?: Record<string, string>;  // e.g., {"4xx": "servo", "9xx": "system"}
    };
    decodeLogic: (code: string) => AlarmDecode;
    fixTemplates: Record<string, FixProcedure>;
  }

ADDING A NEW CONTROLLER FAMILY:
  1. Create controller definition JSON in C:\PRISM\data\controllers\[family].json
  2. Register in ControllerRegistry via DataProvider
  3. Ingest alarm codes using campaign batch format
  4. Validate: prism_data→alarm_lookup returns correct decode for 10 sample alarms
  5. Add 1 test alarm to safety matrix Category 8 (alarm #51+)
  6. API version: MINOR bump
  7. Document in EXTENSION_REGISTRY.json: controller entry
  
  No code changes to AlarmRegistry.ts — it reads from ControllerRegistry.
```


## 3.16 Schema Migration Framework (NEW in v9.0)

*Data files (materials, machines, alarms, tools) will evolve their schemas over 75+ weeks and beyond. Without versioned schemas and migration scripts, old data becomes unreadable after schema changes.*

```
SCHEMA VERSION TAGGING:
  Every JSON data file includes a schema_version field:
    { "schema_version": 1, "data": { ... } }
  
  DataProvider reads schema_version BEFORE parsing data.
  If schema_version < current_expected: run migration.
  If schema_version > current_expected: ERROR (data from future version).

MIGRATION SCRIPTS:
  Location: C:\PRISM\scripts\migrations\
  Naming: migrate_{category}_{from_version}_to_{to_version}.py
  Example: migrate_materials_1_to_2.py

  Script contract:
    - Input: JSON data at version N
    - Output: JSON data at version N+1
    - MUST be idempotent (running twice produces same result)
    - MUST preserve all existing fields (additive changes only for MINOR)
    - MUST NOT change safety-critical parameter values
    - For MAJOR changes (field removal/rename): map old→new explicitly

MIGRATION EXECUTION:
  At SAU-Full stops (SU-1 through SU-6):
    1. Scan all data files for schema_version
    2. If any file < current_expected: run migration chain
       (e.g., v1→v2 then v2→v3 if current is v3)
    3. Verify: migrated file loads correctly via DataProvider
    4. Verify: migrated data passes existing validation (Ω checks)
    5. Backup original before migration (registry snapshot protocol)

BACKWARD-COMPATIBLE READS:
  DataProvider implementations MUST handle reading data at version N-1:
    - Missing fields: use default values (specified per field in schema)
    - Extra fields: ignore (forward-compatible)
    - Changed types: cast if safe, error if not

  This allows gradual rollout: new code can read old data, old data
  migrates in background, no big-bang conversion needed.

CREATED AT: P0-MS5 (scaffold — schema_version field added to all data files)
FIRST MIGRATION: Whenever first schema change occurs (likely M-M2 campaign evolution)

**MIGRATION V1 LIMITS (v10.0 ER-6):**
  v1 schema migrations are restricted to TWO operation types only:
    - ADDITIVE: New fields added with default values (existing data unchanged)
    - RENAME: Field renamed with explicit old→new mapping (data value unchanged)
  
  Operations NOT allowed in v1 migrations:
    - Field removal (breaks backward compatibility)
    - Type changes (requires data transformation)
    - Structural changes (nested object flattening, array restructuring)
  
  These restrictions prevent migration framework scope creep. Structural transforms
  are deferred to v2 migration framework (post-deployment enhancement).
  If a structural change is truly needed pre-deployment: manual migration with
  full rollback manifest and domain expert review (H-gate level scrutiny).
```


---

## 3.17 Zero-Touch Extensibility Protocol (NEW in v10.0)

*The system previously required 4-5 manual updates to add a single skill, script, or hook. Over a 75-week project with 190+ microsessions, this coordination overhead accumulates into a major friction source. Post-deployment, it becomes a barrier to system maintenance. This protocol defines the "drop-in" contract: every extensible component type has a single-action path to registration.*

```
PRINCIPLE: AUTO-DISCOVER > MANUAL REGISTER > HARDCODE

The extensibility hierarchy for every component type:
  1. AUTO-DISCOVER: Component self-describes, system finds and registers it on boot
  2. MANUAL REGISTER: Single atomic action registers component + updates all tracking
  3. HARDCODE: Never. No component should require editing source code to add.

ZERO-TOUCH CONTRACTS BY COMPONENT TYPE:

═══════════════════════════════════════════════════════════════
SKILLS — Auto-Discovery (Level 1)
═══════════════════════════════════════════════════════════════

  TO ADD A NEW SKILL:
    1. Create skill file in C:\PRISM\skills-consolidated\ with valid manifest header
    2. Done.

  HOW IT WORKS:
    SkillRegistry.scanDirectory() runs at boot and on PLATFORM-SKILL-AUTO-LOAD trigger.
    Scans C:\PRISM\skills-consolidated\ for files matching skill manifest format.
    Any file with valid header is registered automatically.

    Skill manifest header format (YAML front matter):
      ---
      name: prism-my-new-skill
      version: 1.0.0
      domain: manufacturing|system|enterprise
      description: One-line purpose
      triggers: [material_query, alarm_decode]  # optional: auto-wire to dispatcher routes
      ---

    VALIDATION (on auto-discover):
      - Has valid YAML front matter → register
      - Missing front matter → SKIP with WARN in TelemetryEngine
      - Duplicate name → SKIP with ERROR (keep existing, reject new)
      - Has ## Changelog section → register (per W1.4 protocol)
      - Missing ## Changelog → register with WARN flag [NEEDS_CHANGELOG]

    MASTER_INDEX IMPACT:
      Section 11 skill count becomes "≥ 137" (floor, not exact).
      Exact count queried live: prism_skill→list | wc -l
      SAU-Full verifies: live count ≥ MASTER_INDEX floor.

═══════════════════════════════════════════════════════════════
SCRIPTS — Self-Description (Level 1.5)
═══════════════════════════════════════════════════════════════

  TO ADD A NEW SCRIPT:
    1. Create Python script in C:\PRISM\scripts\core\ with PRISM_MANIFEST header
    2. Done.

  HOW IT WORKS:
    ScriptRegistry.scanManifests() runs at boot.
    Scans C:\PRISM\scripts\core\ for files with PRISM_MANIFEST comment block.
    Scripts with valid manifests are registered and wired to their declared triggers.

    Script manifest format (Python comment block in first 20 lines):
      # PRISM_MANIFEST
      # name: my_new_validator
      # version: 1.0.0
      # trigger: hook:MFG-CUSTOM-VALIDATE    # or: cadence:every_10_calls, manual, boot
      # priority: 50
      # dependencies: [mfg_batch_validator.py, safety_calc_test_matrix.py]
      # domain: manufacturing|system|enterprise
      # sandbox: true                          # execute through safe_script_runner.py
      # description: Validates custom manufacturing constraints

    TRIGGER TYPES:
      hook:<HOOK_NAME>     — Script executes when named hook fires
      cadence:<FUNCTION>   — Script added to cadence executor with named function
      manual               — Script available for manual invocation only
      boot                 — Script executes during session boot sequence
      build                — Script executes after npm run build (part of test:critical)

═══════════════════════════════════════════════════════════════
HOOKS — Atomic Registration (Level 2)
═══════════════════════════════════════════════════════════════

  TO ADD A NEW HOOK:
    1. prism_hook→register_with_manifest (one action)
    2. Done.

  HOW IT WORKS:
    register_with_manifest is an enhanced register action that atomically:
      a. Validates hook name follows priority band convention
      b. Checks for priority collisions within same trigger
      c. Registers hook in live hook engine
      d. Updates HOOK_MANIFEST.json
      e. Logs to TelemetryEngine
      f. Fires quick_ref_generator.py if count changed

    PRIORITY BANDS (enforced at registration):
      0-9:   CRITICAL  — Blocking safety gates (COMPACTION-ARMOR, S(x) blocks)
      10-19: SYSTEM    — Core infrastructure (API-KEY-VERIFY, REGISTRY-HEALTH)
      20-29: SYSTEM    — System monitoring (PHASE-TODO-RESET, DRIFT-CHECK)
      30-49: PLATFORM  — Platform features (CONTEXT-BUDGET, FORMULA-RECOMMEND, etc.)
      50-69: MFG       — Manufacturing domain (INGESTION-VALIDATE, CAMPAIGN-PROGRESS)
      70-89: ENTERPRISE — Enterprise features (WAL-WRITE, COST-ESTIMATE)
      90-99: TELEMETRY — Logging and telemetry (non-blocking observation hooks)

    COLLISION DETECTION:
      Two hooks with same trigger AND same priority → WARN at registration.
      Resolution: later hook gets priority + 1 (auto-bump within band).
      If auto-bump would cross band boundary → ERROR: manual priority assignment required.

    POST-M-FINAL TRANSITION:
      After migration: HOOK_MANIFEST.json is the SOLE source of truth.
      Section 8 table (in roadmap document) becomes historical documentation.
      Three-way reconciliation (manifest + section 8 + live) →
        two-way reconciliation (manifest + live).

═══════════════════════════════════════════════════════════════
PLUGINS — Dependency-Resolved Loading (Level 2)
═══════════════════════════════════════════════════════════════

  TO ADD A NEW PLUGIN:
    1. Create plugin directory with manifest.json
    2. prism_plugin→install (one action)
    3. Done.

  Plugin manifest.json now includes dependency and provision declarations:
    {
      "name": "advanced-thermal",
      "version": "1.0.0",
      "min_api_version": "1.2.0",
      "dependencies": ["manufacturing-core"],
      "provides": ["thermal_analysis"],
      "permission_tier": "CALC_MODIFY",
      "resource_limits": {                          // v10.0 ER-12
        "max_cpu_ms_per_calc": 5000,
        "max_memory_mb": 256,
        "timeout_ms": 10000
      },
      "dispatchers": { ... },
      "hooks": [ ... ]
    }

  DEPENDENCY RESOLUTION:
    On install: PluginRegistry checks dependencies[] against installed plugins.
    If missing → ERROR: "Plugin X requires Y. Install Y first."
    On uninstall: PluginRegistry checks if any other plugin depends on this one.
    If dependent exists → ERROR: "Cannot uninstall X: plugin Z depends on it."

  LOAD ORDER:
    PluginRegistry sorts plugins by dependency graph (topological sort).
    No circular dependencies allowed (detected at install time).

  RUNTIME RESOURCE LIMITS (v10.0 ER-12):
    CALC_MODIFY plugins execute within configured resource limits.
    If a plugin calculation exceeds timeout_ms: KILL and return SafetyError.
    If a plugin exceeds max_memory_mb: KILL and return RegistryError.
    This prevents a faulty calculation extension from crashing the primary
    manufacturing safety engine or blocking other operations.

═══════════════════════════════════════════════════════════════
CALCULATION MODELS — Registry + Test Matrix Auto-Extend
═══════════════════════════════════════════════════════════════

  TO ADD A NEW CALCULATION MODEL:
    1. Implement CalcModel interface
    2. CalcModelRegistry.register(model)
    3. Add test calculations to safety_calc_test_matrix_extensions.json
    4. Done.

  ENHANCEMENT FROM v9.0:
    v9.0 required adding test calculations to safety_calc_test_matrix.py source code.
    v10.0 adds safety_calc_test_matrix_extensions.json — a JSON file that the test
    matrix script reads on startup. New calculation models add test entries to this
    JSON file instead of modifying the Python script.

═══════════════════════════════════════════════════════════════
MULTI-AXIS EXTENSION CONFLICT TESTING (v10.0 ER-4)
═══════════════════════════════════════════════════════════════

  When multiple extension axes are active simultaneously, combined effects
  may bypass safety assumptions that hold when tested individually:
    - Plugin A modifies hook chain priorities
    - Calc model B changes safety thresholds for a new domain
    - Schema extension C adds fields that plugin A reads
    - Controller extension D uses calc model B for alarm severity

  COMPOSITE SAFETY TEST (required when ≥2 extension axes are active):
    1. Identify all active extension points (plugins, calc models, hooks, schemas)
    2. For each pair of extensions: verify no priority/data/safety conflicts
    3. Run safety_calc_test_matrix.py with ALL extensions loaded
    4. Run safety fuzz test (SR-4) with ALL extensions loaded
    5. If ANY safety calculation result differs from single-extension result:
       INVESTIGATE — the interaction may be valid or may indicate bypass
    6. Document in EXTENSION_REGISTRY.json: interaction_tests[] field

  WHEN: At SU-5 (enterprise midpoint) and SU-6 (pre-migration) when
  extensions are most likely to have accumulated.

═══════════════════════════════════════════════════════════════

SUMMARY — ACTIONS REQUIRED TO EXTEND EACH COMPONENT TYPE:

  | Component      | v9.0 Actions Required | v10.0 Actions Required |
  |----------------|----------------------|------------------------|
  | Skill          | 5 (create + SkillReg + MASTER_INDEX + quick_ref + memory) | 1 (create file) |
  | Script         | 5 (create + ScriptReg + hook wire + MASTER_INDEX + test) | 1 (create file with manifest) |
  | Hook           | 5 (register + HOOK_MANIFEST + Section 8 + Section 14 + quick_ref) | 1 (register_with_manifest) |
  | Plugin         | 3 (create + install + verify deps manually) | 2 (create + install) |
  | Calc Model     | 4 (implement + register + edit test .py + API bump) | 3 (implement + register + add JSON test entry) |
  | Controller     | 4 (create JSON + ingest + edit test .py + API bump) | 3 (create JSON + ingest + add JSON test entry) |
```

## 3.18 Build Pipeline Protocol (NEW in v10.0)

*The existing build approach (esbuild only, no type checking, no automated tests on build) leaves windows where safety-critical regressions go undetected. This protocol defines the hardened build pipeline that runs on EVERY build.*

```
BUILD PIPELINE (replaces bare "npm run build with esbuild"):

  Step 1: TYPE CHECK
    tsc --noEmit --incremental

    PURPOSE: Catch type mismatches at build time, not runtime. A type error in
    a calculation parameter (number vs string) can produce wrong cutting params.

    --noEmit: Does not generate output files (avoids OOM that full tsc causes)
    --incremental: Caches type check results, subsequent runs ~3x faster

    IF tsc --noEmit STILL OOMs:
      Fallback 1: TypeScript project references to split checking
      Fallback 2: tsc on changed files only
      Fallback 3 (last resort): Skip tsc, add runtime type assertions on ALL
        safety-critical calculation inputs. Document as [TYPE_CHECK_DISABLED].

  Step 2: ESBUILD COMPILE
    esbuild (using esbuild.context() with incremental rebuild)
    ~200ms subsequent builds (vs ~2s full builds)

  Step 3: TEST:CRITICAL
    npm run test:critical — 4 fast verification checks (~30-60s total):

    a. SAFETY CALCULATIONS (safety_calc_test_matrix.py + extensions JSON + fuzz tests)
       → Runs all 50+ calculations (pure math, zero API calls)
       → PLUS: randomized boundary fuzz tests (v10.0 SR-4):
         - For each calculation: perturb inputs by ±5% near S(x)=0.70 boundary
         - Verify: safety gate activates when S(x) < 0.70, allows when S(x) ≥ 0.70
         - Generates 10 random perturbations per calculation per run
       → ANY failure = BUILD FAIL (do not proceed)
       → ~20s runtime for 50 calculations + fuzz

    b. HOOK CHAIN SMOKE TEST (hook_smoke_test.py)
       → For each registered hook: verify callable (not just registered)
       → Any uncallable hook = WARN (not BLOCK — hook may be PENDING)
       → ~5s runtime

    c. REGISTRY LOADING CHECK
       → registry_health_check.py --quick
       → Verify > 95% loading for each registry category
       → ANY category < 90% = BUILD FAIL

    d. COUNT FLOOR VALIDATION
       → Read MASTER_INDEX.md floor counts
       → Query live system: dispatcher count, engine count, hook count
       → Verify: live count ≥ MASTER_INDEX floor
       → If live < floor: anti-regression FAIL

  Step 4: ESBUILD OUTPUT
    Standard output to dist/. Source maps enabled.

PIPELINE SUMMARY:
  npm run build =
    tsc --noEmit --incremental     (~5s first, ~2s subsequent)
    esbuild rebuild                 (~200ms with incremental)
    npm run test:critical           (~30s)
    Total: ~35s first build, ~32s subsequent

npm SCRIPTS (add to package.json at P0-MS5):
  "scripts": {
    "typecheck": "tsc --noEmit --incremental",
    "compile": "node esbuild.config.js",
    "test:critical": "python ../scripts/core/test_critical_runner.py",
    "build": "npm run typecheck && npm run compile && npm run test:critical",
    "build:fast": "npm run compile"  // escape hatch for non-safety work only
  }

DEPENDENCY MANAGEMENT:
  - Commit package-lock.json to archive at every SAU-Full
  - Use npm ci (not npm install) for reproducible installs
  - Pin @anthropic-ai/sdk to specific version: update ONLY at SAU-Full
  - At SAU-Full: run npm audit, review vulnerabilities, update non-critical deps
  - NEVER npm update mid-phase or mid-campaign
```

## 3.19 External Review Integration Protocols (NEW in v10.0)

*Three independent reviewers identified risks and improvement opportunities in v9.0. These protocols integrate their valid suggestions that weren't already covered by the zero-touch extensibility or build pipeline enhancements.*

### Fast-Path Execution (v10.0 ER-1)

*Protocol-heavy governance adds value on complex or failure-prone MS but creates unnecessary friction on routine ones. This fast-path reduces ceremony after demonstrated clean execution.*

```
FAST-PATH TRIGGER:
  After 3 consecutive MS completions with:
    - Zero flags ([DATA_GAP], [PARTIAL_ENTRY], etc.)
    - Zero test failures
    - All exit conditions met on first attempt
  → FAST-PATH ACTIVE for next MS

FAST-PATH BENEFITS:
  - Skip detailed plan approval (execute directly, document after)
  - +2 tool calls above resource profile budget
  - Skip SESSION_INSIGHTS.md entry if no non-obvious learnings

FAST-PATH RESET:
  - ANY flag on MS completion → reset counter to 0
  - ANY test failure → reset counter to 0
  - ANY exit condition requiring rework → reset counter to 0
  - Phase boundary (P0→P1, etc.) → reset counter to 0

FAST-PATH NEVER APPLIES TO:
  - Safety-critical MS (any MS with S(x) validation)
  - SAU stops (always full ceremony)
  - Human review gates (H-1 through H-4)
  - First MS of any phase (always full ceremony)
```

### Temporal HITL Heartbeat (v10.0 ER-2)

*Human review gates H-1 through H-4 are batch-triggered. This adds a time-based heartbeat to catch drift between batch milestones.*

```
TEMPORAL REVIEW:
  Every 10 sessions (regardless of batch count or phase):
    1. Human reviews 3 randomly selected outputs from last 10 sessions:
       - 1 calculation result (verify params reasonable for material/operation)
       - 1 alarm decode (verify fix procedure is actionable, not generic)
       - 1 session completion handoff (verify state coherence)
    2. Uses structured questionnaire (see HITL Questionnaire below)
    3. Results logged in HUMAN_REVIEW_LOG.md with [TEMPORAL_REVIEW] tag
    4. Any [REJECTED] finding → pause and investigate before next session

  DOES NOT REPLACE H-1 through H-4. Supplements them with temporal coverage.
  If project pace is 2 sessions/week, this fires roughly every 5 weeks.
```

### HITL Structured Questionnaires (v10.0 ER-9)

*Prevents human review gates from becoming superficial rubber-stamps.*

```
QUESTIONNAIRE FOR H-1/H-2 (M-M2 batch reviews):
  For each sampled entry (5 per review):
  Q1: Is the material correctly identified? (alloy, condition, hardness) [YES/NO/UNCERTAIN]
  Q2: Are cutting parameters in reasonable range for this material? [YES/NO/FLAG]
  Q3: Does uncertainty band reflect real-world variability? [YES/NO/TOO_WIDE/TOO_NARROW]
  Q4: Would you trust these parameters on a production machine? [YES/NO/NEEDS_VERIFICATION]
  Q5: Any red flags not captured by automated validation? [FREE_TEXT]

QUESTIONNAIRE FOR H-3 (Pre-M-FINAL):
  Q1-Q5: Same as H-1/H-2
  Q6: Are alarm fix procedures specific enough for a floor operator? [YES/NO/TOO_VAGUE]
  Q7: Do tool life predictions match your shop experience? [YES/NO/OPTIMISTIC/PESSIMISTIC]
  Q8: Would this system be safe to deploy alongside existing shop processes? [YES/NO/CONCERNS]

QUESTIONNAIRE FOR H-4 (User documentation review):
  Q1: Can a new operator follow the Getting Started guide? [YES/NO]
  Q2: Are workflow tutorials accurate for your shop setup? [YES/NO/NEEDS_EDIT]
  Q3: Is terminology appropriate for shop floor personnel? [YES/NO/TOO_TECHNICAL]

SCORING:
  - All YES → PASS
  - Any NO on Q4 (H-1/H-2) or Q8 (H-3) → BLOCK (safety-critical rejection)
  - 2+ NO on other questions → INVESTIGATE before proceeding
  - Results and free-text recorded verbatim in HUMAN_REVIEW_LOG.md
```

### Rollback Fire Drill (v10.0 ER-3)

```
MANDATORY AT SU-3 (mid-project, ~week 18):
  1. Simulate rollback trigger #1 (safety divergence):
     → Activate mcp-server warm standby
     → Verify responds to calculation request within 30 seconds
     → Verify result matches prism-platform for same request
  2. Simulate data reconciliation:
     → Write 3 test entries to prism-platform during "live" window
     → Execute reconciliation procedure (Section 7.5)
     → Verify entries appear in mcp-server registries
  3. Verify procedure documentation accuracy:
     → Follow Section 7.5 step-by-step as written
     → Note any steps that are outdated, missing, or unclear
     → Update Section 7.5 with corrections
  4. Document: ROADMAP_TRACKER "ROLLBACK_FIRE_DRILL: SU-3 [date] [PASS/FAIL/ISSUES]"

  Total effort: ~5 tool calls. Cheap insurance against procedure rot.
```

### Amendment Frequency Tracking (v10.0 ER-11)

```
AT EVERY SAU-FULL:
  Count amendments applied to roadmap since last SAU-Full.
  Record in ROADMAP_TRACKER: "AMENDMENT_COUNT: SU-X [count] amendments since SU-[X-1]"

THRESHOLDS:
  0-3 amendments per phase: HEALTHY — normal refinement
  4-5 amendments per phase: ADVISORY — document reasons, ensure amendments simplify not complicate
  6+ amendments per phase: TRIGGER SIMPLIFICATION REVIEW
    → Roadmap specification overhead is becoming a parallel maintenance project
    → Options: consolidate related amendments, simplify affected protocols,
      convert detailed specs to principles-based guidance
    → Document decision in SESSION_INSIGHTS: [DECISION] Roadmap simplification at SU-X
```

### Test Harness Trailing Policy (v10.0 ER-10)

```
SAFETY TEST INFRASTRUCTURE — MUST NEVER TRAIL:
  safety_calc_test_matrix.py, mfg_batch_validator.py, hook_smoke_test.py
  These run on every build. They must be current.

NON-SAFETY TEST INFRASTRUCTURE — MAY TRAIL BY 1 LAYER/PHASE:
  uat_session_runner.py, performance_benchmark.py, dual_run_workload.py
  These may be updated in the MS immediately after the feature they test.
  This prevents test harness development from blocking feature progress.

RULE: If a non-safety test script is 2+ layers behind, it becomes a
  [PERSISTENT] TODO with HIGH priority. Test debt > 2 layers is unacceptable.
```

### Microsession Resource Profiles (v10.0 SR-3)

```
RESOURCE PROFILES (assigned per-MS, documented in MS spec):

  I/O-BOUND: Heavy file reads/writes, low context accumulation
    Examples: M-M2 batch processing, data ingestion, registry imports
    Budget: 18 tool calls (extra headroom — each call is small context)
    Context risk: LOW

  CONTEXT-BOUND: Heavy code reading, high context accumulation
    Examples: P1-MS3 hook triage, E3 front-loading, M4 extraction
    Budget: 12 tool calls (each call loads significant context)
    Context risk: HIGH — monitor pressure after each call

  COMPUTE-BOUND: Heavy calculation/validation, moderate context
    Examples: Safety matrix runs, performance benchmarks, UAT execution
    Budget: 15 tool calls (standard)
    Context risk: MEDIUM

  MIXED: Combination of above
    Budget: 15 tool calls (standard, with pressure monitoring)
    Context risk: MEDIUM-HIGH

  DEFAULT: If MS spec does not declare a profile → MIXED (15 tool calls).
  The existing 15-25 item / 15 tool call guidance remains the DEFAULT.
  Resource profiles OVERRIDE the default when specified.
  E3 complexity classes map to: UI-RENDER=CONTEXT-BOUND, STATE-INTEGRATION=MIXED,
    TOOL-BUILD=COMPUTE-BOUND, PLATFORM-BUILD=CONTEXT-BOUND.
```

# SECTION 4: STRATEGIC UPDATE POINTS + SYSTEM ARTIFACT UPDATE PROTOCOL

*Strategic Update Points verify features are WIRED and COMPOUNDING. The System Artifact Update (SAU) protocol ensures GSD, AutoPilot, memories, orchestrators, and quick-ref reflect what was actually built.*

## 4.7 System Artifact Update (SAU) Protocol

**SAU now has two variants: SAU-Full and SAU-Light. Use the appropriate variant based on boundary type.**

### SAU-Full (~15-17 tool calls)

**SAU-Full Duration Cap (v10.0 ER-8):** Maximum 20 tool calls. If checklist exceeds budget, overflow items automatically deferred to next SAU-Light with [SAU_OVERFLOW] flag. This prevents SAU stops from becoming multi-session blockers.

**Fires at: SU-1 through SU-6, major phase transitions (P0→P1, P1→P2, P2→P3, P3→E1), any MS that fundamentally changes routing.**

```
1. GSD_QUICK.md UPDATE
   → Read current GSD_QUICK.md
   → Compare against actual system capabilities built since last SAU
   → ADD: new dispatchers, new actions, new routing paths, new plugins
   → REMOVE: deprecated paths, renamed actions, retired dispatchers
   → VERIFY: AutoPilot.ts reads GSD dynamically — test 3 representative queries route correctly
   → If GSD changed → restart required after build

2. AUTOPILOT / ORCHESTRATOR UPDATE
   → Verify AutoPilot routing table covers ALL current dispatchers
   → Test routing for each NEW capability added since last SAU
   → Verify fallback behavior for unknown query types
   → If new plugin added since last SAU → verify plugin routing works
   → If new swarm patterns added → verify auto-deployment matrix is current

3. PRISM_QUICK_REF.md REGENERATION
   → Run quick_ref_generator.py (auto-reads system state)
   → Verify output < 2KB
   → Diff against previous version — flag unexpected changes
   → This is GENERATED, never hand-edited

4. SESSION MEMORY SEEDING
   → Review session_memory.json categories
   → Seed empty categories with actual data from completed phases
   → Verify retention policy (3KB max, rotation working)
   → Verify [PERSISTENT] entries preserved

5. CLAUDE MEMORY UPDATE (memory_user_edits)
   → Review what Claude's cross-session memory knows about PRISM
   → Update memory with: current phase, current MS, key capabilities built,
     active hook count, registry counts, known gotchas from this phase
   → Remove stale memory entries that reference completed/changed states

6. STATE FILE COHERENCE
   → Run system_self_test.py state coherence check
   → Verify ROADMAP_TRACKER, HANDOFF.json, COMPACTION_SURVIVAL.json agree
   → Fix any discrepancies before proceeding

7. SESSION_INSIGHTS COMPILATION + ARCHIVE
   → Compile phase insights into summary lines
   → If at phase boundary → append compiled summary to SESSION_INSIGHTS_ARCHIVE.md
   → Rotate oldest non-[PERSISTENT] entries if > 3KB
   → Verify file loads at boot within acceptable time

8. COMPACTION ARMOR COVERAGE
   → Verify COMPACTION_SURVIVAL.json captures ALL new state
   → Run write-readback test

9. AGENT COUNT VERIFICATION (NEW in v7)
   → Count all active agent definitions
   → Compare against last SAU count
   → If count changed → document: which agents added/removed and why
   → Update Claude memory with current agent count

10. CROSS-TRACK DEPENDENCY CHECK (NEW in v7)
    → Check Section 3.9 dependency table for any flagged MS
    → If upstream data is now available → schedule re-execution of flagged MS
    → Document any remaining [SYNTHETIC_DATA] or [DEFERRED] flags

11. MASTER_INDEX COHERENCE CHECK (NEW in v8)
    → Read MASTER_INDEX.md → extract dispatcher count, action count, engine count
    → Compare against live system: prism_autopilot_d→working_tools (dispatcher list),
      prism_hook→list (hook count), prism_telemetry→get_dashboard (engine status)
    → If counts disagree → flag [MASTER_INDEX_DRIFT] in ROADMAP_TRACKER
    → If MASTER_INDEX missing → WARN (not BLOCK — system functions without it, but drift accumulates)
    → Update MASTER_INDEX.md if live system has legitimate additions from current phase

12. DEV_PROTOCOL.md UPDATE (NEW in v8)
    → Verify DEV_PROTOCOL.md references current roadmap phase
    → Update if stale

13. ARCHITECTURAL COHERENCE AUDIT (NEW in v8.5)
    PURPOSE: Detect structural drift that accumulates across sessions. NOT about
    correctness (steps 1-12 cover that). About CONSISTENCY — drift that makes
    code progressively harder to maintain.

    a. CODE STYLE SAMPLING (3 tool calls):
       → Sample 3 files: 1 from earliest completed phase, 1 from most recent phase,
         1 from the current phase
       → Compare: naming conventions (camelCase/snake_case), error handling patterns,
         import patterns (relative/absolute, grouping, aliases)
       → If drift detected: document in COHERENCE_AUDIT.md as [STYLE_DRIFT]
       → If severe (>5 inconsistencies in 3 files): create [PERSISTENT] TODO to normalize

    b. ARCHITECTURAL DECISION REPLAY (2 tool calls):
       → Read phase architecture docs (E3_ARCHITECTURE.md after E3 starts, etc.)
       → For each BINDING decision: verify current code honors it
       → Check: state management consistency, data flow patterns, hook registration patterns
       → If violation found: fix immediately if < 5 tool calls, else [PERSISTENT] TODO

    c. NAMING AUDIT (1 tool call):
       → List all new files created since last SAU
       → Verify file names follow established convention
       → Verify new dispatcher actions follow MASTER_INDEX naming pattern

    d. DEPENDENCY DIRECTION CHECK (1 tool call):
       → Verify no circular imports introduced since last SAU
       → Verify dependency direction: plugins depend on core, never core on plugins
       → Verify infrastructure files have no new dependencies on phase-specific code

    OUTPUT: COHERENCE_AUDIT.md section appended:
      === COHERENCE AUDIT SU-X (YYYY-MM-DD) ===
      Style drift: [NONE / MINOR:details / MAJOR:details]
      Architecture violations: [NONE / list]
      Naming deviations: [NONE / list]
      Dependency issues: [NONE / list]
      === END ===

14. EXTERNAL BACKUP (NEW in v8.5)
    → Full codebase snapshot + state files + data files
    → Copy to off-machine destination (configured in ENV_CONFIG.md at P0-MS0):
      Option A: External USB drive (manual, reliable)
      Option B: Network share (if available on LAN)
      Option C: Cloud sync (OneDrive/Google Drive/S3 — encrypted)
    → Verify: read-back test on external copy (not just "copy succeeded")
    → Log: "EXTERNAL_BACKUP: SU-X → [destination] [size] [verified: YES/NO]"
```

**System artifacts updated at SAU-Full stops (COMPLETE LIST):**
```
1. GSD_QUICK.md (routing decisions)
2. AutoPilot routing tables
3. PRISM_QUICK_REF.md (auto-generated)
4. Session memory categories
5. Claude project memory
6. State files (ROADMAP_TRACKER, HANDOFF, COMPACTION_SURVIVAL)
7. Compaction armor payloads
8. MASTER_INDEX.md (structural counts)
9. DEV_PROTOCOL.md (development workflow)
10. COHERENCE_AUDIT.md (architectural consistency — v8.5)
11. External backup to off-machine destination (v8.5)
```

### SAU-Light (~8 tool calls, updated v10.0)

**Fires at: Mini-SAU stops, mid-phase transitions within a track, after any MS that adds hooks or scripts but doesn't change routing.**

```
1. GSD_QUICK.md — Quick check: does GSD mention new capabilities? Add if missing.
2. PRISM_QUICK_REF.md — Run quick_ref_generator.py
3. CLAUDE MEMORY — Update current phase/MS and any new hook or agent counts
4. AGENT COUNT — Verify count matches last known. Document changes.
5. CROSS-TRACK FLAGS — Check for any [SYNTHETIC_DATA] flags that can now be resolved
6. MASTER_INDEX FLOOR CHECK — Read MASTER_INDEX.md floors. Compare against live counts.
   If live < floor for any category → flag for next SAU-Full.
   If live > floor significantly (>10% growth) → update floor at next SAU-Full.
7. EXTENSION REGISTRY CHECK (v10.0 ZT-7) — Read EXTENSION_REGISTRY.json.
   For each registered extension category: verify at least one consumer exists.
   If orphaned extension found AND registered > 2 SAU-Light stops ago → WARN.
8. AMENDMENT FREQUENCY (v10.0 ER-11) — Count amendments since last SAU.
   Log count. If ≥6 since last SAU-Full → flag for simplification review.
9. TEMPORAL HITL CHECK (v10.0 ER-2) — If ≥10 sessions since last human review,
   flag [HITL_DUE] in ROADMAP_TRACKER. Human review before next phase transition.
10. EXTERNAL STATE BACKUP — Copy state files to off-machine destination.
```
### SAU Boundary Map (Updated for v7)

| Boundary | SAU Variant | Trigger |
|----------|-------------|---------|
| SU-1 (end P0) | SAU-Full | Major phase transition |
| SU-2 (end P1) | SAU-Full | Major phase transition |
| SU-3 (end P2) | SAU-Full | Routing fundamentally changes (AutoPilot) |
| SU-4 (end P3/P4) | SAU-Full | Campaign readiness gate |
| SU-5 (end E2) | SAU-Full | Enterprise midpoint |
| SU-6 (pre-migration) | SAU-Full | Final certification |
| E1-MS4, E1-MS9 | SAU-Light | Enterprise sub-phase |
| E2-MS5 | SAU-Light | Enterprise sub-phase |
| E3-MS10, E3-MS20 | SAU-Light | Enterprise sub-phase |
| E4-MS8 | SAU-Light | Enterprise sub-phase |
| M-M0→M-M1 transition | SAU-Light | Manufacturing phase transition |
| M-M2 batch 10, batch 30 | SAU-Light | Data campaign milestones |
| M4-T1 integration MS | SAU-Light | Extraction milestone |
| M4-T2 integration MS | SAU-Full | Major extraction complete |

---

## SU-1: POST-P0 — "Foundation Integrity Gate"
**When:** End of Chat 3, after P-P0-MS10 completes
**Effort:** ~27 tool calls (SAU-Full with coherence audit) | **Quality Tier:** STANDARD
**Chat position:** Last MS of Chat 3

### What to Verify

| Component | Verification Method | Expected Result | If Failing |
|-----------|-------------------|-----------------|------------|
| Registry loading | prism_data→material_lookup("4140"), machine_lookup("HAAS VF-2"), alarm_lookup("FANUC 414") | All return valid data | Reopen P0-MS1 |
| Compaction armor | Trigger pressure ≥ 50% manually | 3 survival files written with valid checksums | Reopen P0-MS3 |
| API key | prism_agent→agent_invoke tier=haiku prompt="echo" | Valid response | Reopen P0-MS2 |
| Context budget hook | Check last 3 PLATFORM-CONTEXT-BUDGET firings | Pressure projections present in telemetry | Rewire in P0-MS3 |
| System self-test | Trigger system_self_test manually | All 7 checks pass (including state coherence, disk space, and API version) | Fix before P1 |
| Hook count | Count active hooks | ≥ 8 hooks active | Identify missing, reinstall |
| Session boot time | Measure cold start | < 3s | Profile and optimize |
| HANDOFF.json freshness | Read timestamp | Updated within last MS | Fix update trigger |
| SESSION_INSIGHTS.md | Read file | Has structured entries from P0 | Start writing insights |
| Environment health | Run env_smoke_test.py | All checks pass | Fix environment |

### SAU-Full Protocol Execution (SU-1)

1. **GSD_QUICK.md** — Verify it reflects P0 state. P0 built: registries, compaction armor, context budget, ATCS import, agent/swarm import, cadence system. GSD must include: all dispatcher routing paths verified working, registry query patterns, agent tier strings. If AutoPilot exists in mcp-server, verify it routes correctly with current GSD.

2. **AutoPilot/Orchestrator** — If AutoPilot is not yet imported (it's imported in P2-MS4), verify the existing mcp-server orchestrator reflects P0 changes. Document current routing behavior for baseline.

3. **PRISM_QUICK_REF.md** — Run quick_ref_generator.py (built in P0-MS4). Create this file if first run.

4. **Session Memory** — Seed categories with P0 data:
   - failure_patterns: calc bug root cause (GAP-002), any registry path issues
   - performance_baselines: P0-MS10 smoke test values
   - config_drift: any .env or config changes made during P0
   - domain_discoveries: material path patterns, registry loading behavior

5. **Claude Memory** — Update memory_user_edits with: P0 complete, registry counts, hook count, key P0 patterns learned, current build commands, current model strings from .env.

6. **State Coherence** — Run system_self_test.py. Verify all 7 checks pass.

7. **Compaction Armor Coverage** — Verify includes: current MS ID, registry counts, hook count, ATCS state (empty for now), platform scaffold status, agent tier baselines.

8. **Agent Count** — Document agent count baseline from P0 imports.

9. **Insights Archive** — Compile P0 insights into SESSION_INSIGHTS_ARCHIVE.md.

10. **Cross-Track Flags** — No cross-track dependencies active yet. Document baseline.

### Synergy Checks

- Is ContextManager feeding pressure data to PLATFORM-CONTEXT-BUDGET?
- Is CompactionManager calling compaction_armor.py?
- Is TelemetryEngine capturing hook firings?
- Is PLATFORM-COST-ESTIMATE running before agent invocations?
- Is SYNC_MANIFEST.json auto-updating on builds?

**EXIT:** All verifications pass OR all failures documented with [PERSISTENT] TODOs. SAU-Full complete. quick_ref_generator.py produces valid output. Boot context < 10KB. Session memory has P0 data. Claude memory updated. Agent count recorded.

---

## SU-2: POST-P1 — "Consolidation Utilization Gate"
**When:** End of Chat 4b, after P-P1-MS8 completes
**Effort:** ~29 tool calls (SAU-Full with coherence audit) | **Quality Tier:** STANDARD
**Chat position:** Last activity of Chat 4b

### What to Verify

| Component | Verification Method | Expected Result | If Failing |
|-----------|-------------------|-----------------|------------|
| Formula recommendations | prism_calc→speed_feed with 4140 steel | PLATFORM-FORMULA-RECOMMEND fires, suggests relevant formulas | Rewire hook, check JSON |
| Session memory (15 cat) | Read session_memory.json | All 15 categories present, entries from P0+P1 | Fix session_memory_expander.py |
| Script sandbox | Execute test script through safe_script_runner.py | Executes in sandbox, output captured, no file writes | Fix PLATFORM-SCRIPT-SANDBOX |
| Drift baseline | Read DRIFT_LOG.md | Baseline entry exists, SYS-DRIFT-CHECK hook active | Run codebase_sync_check.py |
| Active hook count | Count active + pending hooks | ~15 active, ~8 pending | Cross-reference with Section 8 |
| Agent consolidation | List active agents | ~54 agents, no overlap, no downstream orphans | Verify P1-MS2 cross-ref |
| Skill count | Count loaded skills | 137 accessible (119 existing + 18 new) | Check prism_skill registry |
| KNOWN_RENAMES spot-check | Test 3 random old tool names from known_renames.json | All 3 resolve to correct new dispatcher+action | Fix rename chain — 60+ week gap to M-FINAL is too long without early validation |

### SAU-Full Protocol Execution (SU-2)

1. **GSD_QUICK.md** — P1 added: formula recommendations, session memory, drift detection, script sandbox, skill auto-loading. Update routing for any new dispatcher actions.

2. **AutoPilot/Orchestrator** — Verify current orchestrator knows about: formula recommendation hook, skill auto-loading, error pattern matching.

3. **PRISM_QUICK_REF.md** — Regenerate via quick_ref_generator.py.

4. **Session Memory** — Seed with P1 data.

5. **Claude Memory** — Update: P1 complete, ~54 agents, ~15 active hooks, formula system wired, drift baseline established.

6. **Boot Efficiency** — Verify boot context < 10KB.

7. **Telemetry Coverage** — Verify telemetry captures formula recommendations, session memory writes, drift checks, sandbox executions.

8. **Agent Count** — Verify ~54 matches P1-MS2 consolidation. Document exact count.

9. **Insights Archive** — Compile P1 insights to archive.

### Synergy Checks

- Is PLATFORM-FORMULA-RECOMMEND injecting formulas into calculation context, or just logging?
- Is PLATFORM-MEMORY-EXPAND extracting from ALL telemetry sources?
- Is SYS-DRIFT-CHECK firing on weekly cadence?
- Is PLATFORM-SKILL-AUTO-LOAD actually loading skills or just suggesting?
- Are consolidated agents (54) all reachable through prism_agent→agent_invoke?

**EXIT:** SAU-Full complete. GSD reflects P1 capabilities. Formula recommendations verified relevant. Session memory persisting. Drift baseline established. Agent count verified and recorded. Claude memory current.

---

## SU-3: POST-P2 — "Demo 1 Readiness + Migration Foundation"
**When:** End of Chat 7, after P-PERF-MS1 completes
**Effort:** ~32 tool calls (SAU-Full with coherence audit + demo verification)
**Chat position:** Last activity of Chat 7

### What to Verify

| Component | Verification Method | Expected Result | If Failing |
|-----------|-------------------|-----------------|------------|
| Plugin architecture | Load test plugin → register dispatcher → call action | Full round-trip works | Architectural fix needed |
| Golden path demos | Run demo_hardener.py for all 5 demos | 5/5 consecutive passes per demo | Fix demo inputs/paths |
| Performance baselines | Run performance_benchmark.py (3 core metrics) | Material lookup < 50ms, hook chain < 10ms, boot < 3s | Profile and optimize |
| Migration gate criteria | Read P2-MS7 output | dual_run_validator.py exists, criteria documented | Complete P2-MS7 |
| AutoPilot routing | Send mixed manufacturing + task-tracker queries | Routes to correct plugin per query | Fix routing logic |
| Governance layer | Attempt a blocked operation through Manus | Governance intercepts and blocks | Fix governance hooks |

### SAU-Full Protocol Execution (SU-3)

1. **GSD_QUICK.md** — MAJOR UPDATE. P2 fundamentally changed the architecture: plugin-based routing, multi-domain support, AutoPilot as router, governance interception. This is the biggest GSD rewrite.

2. **AutoPilot/Orchestrator** — AutoPilot was imported in P2-MS4. Read MASTER_INDEX.md Section 3 (22 sequencing guides). Test ALL 22 sequences route correctly:

   **Batch 1 — Core Manufacturing (test individually, must all pass):**
   - 3.5  Manufacturing Calculation: material→calc→safety→validate
   - 3.6  Thread Calculation: specs→drill→gcode→safety
   - 3.7  Toolpath Strategy: material→strategy→params→speed→safety
   - 3.8  Alarm Investigation: decode→search→fix→knowledge
   - 3.9  Multi-operation Machining: rough→semi→finish with parameter changes
   
   **Batch 2 — System Operations (test individually):**
   - 3.1  Default Decision Flow: query→classify→route→execute→respond
   - 3.2  Error Handling: error→pattern_match→suggest_fix→retry_or_escalate
   - 3.3  Context Pressure Response: detect→evaluate→truncate_or_compact→continue
   - 3.4  Session Boot: load_state→load_gsd→load_memory→integrity_check→ready
   - 3.10 Quality Validation (full): safety→ralph→omega→assess
   
   **Batch 3 — Autonomous Operations (test individually):**
   - 3.11 Alarm Decode Chain: code→controller→decode→fix→cross_ref→knowledge
   - 3.12 Autonomous Task: atcs→plan→execute→queue→status
   - 3.13 Batch Validation: load→validate→quarantine_or_accept→dashboard_update
   - 3.14 Compaction Recovery: auto→quick_resume→todo→continue
   - 3.16 Swarm Deployment: assess_complexity→select_pattern→deploy→monitor→collect
   
   **Batch 4 — Intelligence + Platform (test individually):**
   - 3.15 Cost Estimation: operation→model→estimate→budget_check→log
   - 3.17 Drift Detection: scan→diff→threshold→auto_todo_or_log
   - 3.18 Learning Pipeline: error→pattern_store→accuracy_update→formula_reweight
   - 3.19 Knowledge Graph Query: node→traverse→rank→return_related
   - 3.20 Script Execution Sandbox: validate→sandbox→execute→capture→return
   - 3.21 Compliance Report: material→cert_chain→iso_template→generate→validate
   - 3.22 Full Pipeline: brainstorm→plan→execute→review→validate→ralph→omega

   Document pass/fail in ROADMAP_TRACKER: "AUTOPILOT_SEQUENCE_TEST: X/22 pass". **≥20/22 required.** Any failure in Batch 1 (manufacturing) is a BLOCK — those are safety-critical routing paths.

3. **PRISM_QUICK_REF.md** — Regenerate.

4. **Session Memory** — Seed with P2 data.

5. **Claude Memory** — Update: P2 complete, plugin architecture working, 5 demos passing, AutoPilot imported and routing, performance baselines recorded, migration gates defined.

6. **Error Pattern DB** — P0-P2 generated errors. Verify PLATFORM-ERROR-PATTERN has entries. If empty, seed with 5 most common errors.

7. **Compaction Armor** — Re-measure boot context. If > 12KB, optimize.

8. **Agent Count** — Verify count stable from SU-2. Document any changes.

9. **Insights Archive** — Compile P2 insights to archive.

10. **Cross-Track Check** — M-M0 should be starting around this time. Verify Manufacturing track prerequisites are met.

### Synergy Checks

- Does PLATFORM-DEMO-VERIFY actually BLOCK a failing demo?
- Is PLATFORM-PERF-GATE integrated with build pipeline?
- Does dual_run_validator.py work against BOTH codebases simultaneously?
- Are golden path demos using the formula recommendation system?
- Is PLATFORM-IMPORT-VERIFY firing on every import?

**EXIT:** Demo 1 passes reliably. SAU-Full complete. GSD reflects plugin architecture. AutoPilot routes all query types correctly. Performance baselines established. Migration gates defined. Error pattern DB ≥ 5 entries. Agent count verified. Claude memory current.

---

## SU-4: POST-P3P4 — "Campaign Readiness Gate"
**When:** Chat 10b, after P-PERF-MS2 completes
**Effort:** ~32 tool calls (SAU-Full with coherence audit)
**Chat position:** Last activity of Chat 10b

### What to Verify

| Component | Verification Method | Expected Result | If Failing |
|-----------|-------------------|-----------------|------------|
| ATCS batch resilience | Create test campaign (10 items), simulate compaction at item 5 | BatchResumeProtocol resumes at item 6, completes 10/10 | Fix checkpoint sync |
| Error pattern auto-resolution | Trigger a known error | PLATFORM-ERROR-PATTERN auto-suggests fix | Seed pattern DB |
| Learning pipeline | Check formula accuracy tracking | Accuracy history has entries from P2 demos | Wire tracking |
| Swarm cost estimation | Run ralph_loop through PLATFORM-COST-ESTIMATE | Cost estimate appears before execution | Wire hook to swarm |
| ATCS campaign templates | Check for template files | Material/Machine/Alarm templates exist | Create from defaults |
| Knowledge graph | Query material-tool-operation relationships | Returns relationship data | Check P4-MS4 output |
| Pipeline automation | Trigger "calculate + validate + recommend" pipeline | Completes end-to-end | Check P4-MS3 output |

### SAU-Full Protocol Execution (SU-4)

1. **GSD_QUICK.md** — P3-P4 added: ATCS campaigns, batch operations, swarm auto-deployment, learning pipeline, knowledge graph, pipeline automation. GSD must include all new command patterns.

2. **AutoPilot/Orchestrator** — Verify routing for: campaign management, complex optimization (auto-deploys swarm), knowledge graph, pipeline invocations.

3. **PRISM_QUICK_REF.md** — Regenerate.

4. **Session Memory** — Seed with P3-P4 data. Target ≥ 15 error patterns.

5. **Claude Memory** — Update: P3-P4 complete, ATCS operational, batch resilience working, campaign templates ready for M-M2.

6. **ATCS Campaign Templates** — Must exist before M-M2 starts:
   - material_batch_template.json: batch_size=50, checkpoint_every=2, omega_threshold=0.70, quarantine_at=10%
   - machine_batch_template.json: batch_size=25, checkpoint_every=1, omega_threshold=0.70
   - alarm_batch_template.json: batch_size=100, checkpoint_every=5, omega_threshold=0.65

7. **Cost Model Calibration** — Compare estimates from P2-P4 against actual billing. Adjust if > 10% off.

8. **Agent Count** — Verify count. Document any P3-P4 agent additions.

9. **Insights Archive** — Compile P3-P4 insights to archive.

10. **Cross-Track Check** — M-M2 is about to start. Verify: ATCS batch framework operational (BLOCK if not), registries loading > 95% (BLOCK if not), campaign templates exist. This is the CRITICAL gate for Manufacturing data campaigns.

### Synergy Checks — CONSUME VERIFICATION (v8 enhancement)

**Each test proves a FULL consumer chain, not just "does X exist?"**

1. **Error Pattern Auto-Resolution Consumer Test:**
   - Trigger a known error that's in error_pattern_db with confidence > 0.9
   - Verify: autoHookWrapper.onError() finds the pattern → injects fix_procedure into response
   - Verify: hit_count incremented → resolution_outcome logged
   - If no auto-resolution: ERROR — P3-MS4 consumer wire is broken

2. **Formula Accuracy Feedback Loop Test:**
   - Seed formula_accuracy.json: Formula A accuracy=0.95 for 4140+turning, Formula B accuracy=0.55
   - Run prism_calc→speed_feed for 4140+turning
   - Verify: PLATFORM-FORMULA-RECOMMEND selects Formula A (not B)
   - Change scores: A=0.40, B=0.98 → re-run → verify Formula B now selected
   - If same formula both times: ERROR — feedback loop is broken

3. **Knowledge Graph Consumer Test:**
   - Query MemoryGraphEngine: "what tools work with Ti-6Al-4V for roughing?"
   - Verify: returns ranked results with edges from P4-MS4 seeding
   - Run prism_calc→speed_feed for Ti-6Al-4V → verify PLATFORM-FORMULA-RECOMMEND
     includes graph-derived tool suggestions in its recommendation
   - If graph results don't appear in formula recommendations: WARN — consumer #1 weak

4. **Session Memory Consumer Test:**
   - Seed session_memory failure_patterns with 15 entries
   - Boot → verify SessionLifecycleEngine pre-loads mitigation context
   - Run a calculation → verify ResponseTemplateEngine adjusts output based on session_memory user_context
   - If boot doesn't change: WARN — consumer may be ambient-only (acceptable but document)

5. **Drift Auto-Correction Test:**
   - Manually add 5 drift items to DRIFT_LOG.md
   - Run SYS-DRIFT-CHECK
   - Verify: prism_todo gets CRITICAL priority item for drift resolution
   - Verify: TelemetryEngine "system" channel fires alert
   - If no TODO created: ERROR — auto-correction threshold is broken

6. **Boot Efficiency Threshold Test:**
   - Simulate slow boot (inject 4s delay)
   - Verify: WARN fires in TelemetryEngine "performance" channel
   - Simulate 6s delay → verify optimization triggers
   - If no alert: ERROR — boot threshold is unwired

7. **ComputationCache Consumer Test:**
   - Run prism_calc→speed_feed for 4140 annealed
   - Run same query again → verify second call is < 5ms (cache hit)
   - Update material registry for 4140 → verify cache invalidated → third call recomputes

**Pre-existing synergy checks (retained):**
- Does BatchResumeProtocol correctly read COMPACTION_SURVIVAL.json format from P0-MS3?
- Does PLATFORM-ERROR-PATTERN feed into session memory's failure_patterns?
- Are swarm cost estimates included in PLATFORM-COST-ESTIMATE?
- Does the learning pipeline update formula accuracy based on UAT feedback?
- Are ATCS campaign templates compatible with batch resilience error policies?

**EXIT:** SAU-Full complete. GSD reflects autonomous capabilities. Campaign templates ready. ATCS tested with compaction survival. Error DB ≥ 15 patterns. Cost model within 10%. Agent count verified. M-M2 prerequisites confirmed. Claude memory current.

---

## SU-5: MID-ENTERPRISE — "Platform Health Under Load"
**When:** After E2 completes (approximately Chat 25), before E3 starts
**Effort:** ~27 tool calls (SAU-Full with coherence audit)

### What to Verify

| Component | Verification Method | Expected Result | If Failing |
|-----------|-------------------|-----------------|------------|
| WAL capture | Check WAL for recent dispatcher calls | All calls logged with CRC32 verification | Fix WAL recording |
| Cost tracking accuracy | Compare E1-E2 estimates vs actual billing | Within ±5% | Recalibrate cost model |
| Performance with WAL overhead | Run performance_benchmark.py full suite | All 10 targets still met | Optimize WAL write path |
| Data campaign progress | Read CampaignDashboard state | Materials: X/target, Machines: Y/target, Alarms: Z/target | Prioritize stalled campaigns |
| Compaction survival with WAL | Simulate compaction with WAL active | WAL state in survival files | Update compaction_armor.py |
| Drift detection | Read DRIFT_LOG.md | < 3 unresolved drift items | Prioritize drift resolution |

### SAU-Full Protocol Execution (SU-5)

1. **GSD_QUICK.md** — E1-E2 added: WAL capture/replay, cost intelligence, budget alerts, finance export. Update GSD with all new command patterns.

2. **AutoPilot/Orchestrator** — Verify routing for: WAL replay, cost analysis, what-if branching, budget queries.

3. **PRISM_QUICK_REF.md** — Regenerate.

4. **Session Memory** — Major enrichment: failure_patterns ≥ 30, cost_history from E1-E2, updated performance_baselines with WAL overhead.

5. **Claude Memory** — Update: E2 complete, WAL operational, cost tracking calibrated, data campaign progress.

6. **compaction_armor.py** — MUST include WAL state: replay position, last CRC32, snapshot index.

7. **Boot Optimization** — Run boot_efficiency_tracker.py. Remove unreferenced boot context.

8. **Agent Count** — Verify. Enterprise phases may have added agents.

9. **Cross-Track Flag Resolution** — Check ALL [SYNTHETIC_DATA] and [DEFERRED] flags from Section 3.9. M-M2 should have meaningful data by now. Re-execute flagged MS with real data.

10. **Safety-Critical Test Matrix** — Run safety_calc_test_matrix.py (Section 15). All 50 calculations must pass on mcp-server. Record prism-platform results for migration comparison.

**EXIT:** SAU-Full complete. GSD reflects E1-E2 capabilities. WAL + cost routing works. Performance acceptable with overhead. Error DB ≥ 30. All cross-track flags resolved or documented. Safety test matrix recorded. Claude memory current.

---

## SU-6: PRE-MIGRATION — "System Integrity Certification"
**When:** Before M-FINAL begins (approximately Chat 53)
**Effort:** ~37 tool calls (most thorough gate, includes coherence audit + external backup)

### What to Verify

This is the final verification before mcp-server retirement. EVERY system is tested.

| Component | Verification Method | Expected Result |
|-----------|-------------------|-----------------|
| Dual-run validation | dual_run_validator.py: 100 representative queries | Discrepancy rate < 1% |
| Full regression suite | All 324 actions tested | Zero regressions |
| Performance parity | All 10 benchmarks | prism-platform meets or exceeds mcp-server |
| Data integrity | Compare all registry entries | prism-platform ≥ mcp-server counts |
| UAT sign-off | H-4 golden-path scenarios with engineer observing (v8.5) | Written sign-off in HUMAN_REVIEW_LOG.md |
| Human review log | H-1 through H-4 complete in HUMAN_REVIEW_LOG.md (v8.5) | Zero unresolved [REJECTED] entries |
| 72-hour dual-run | Both servers parallel for 72 hours (~7,200 queries including warm scenarios) | Zero divergence |
| Hook integrity | All 85+ active hooks verified via HOOK_MANIFEST.json three-way check | Every hook fires on trigger |
| Formula accuracy | safety_calc_test_matrix.py (Section 15) — all 50 calculations | Within ±2σ of reference values |
| Compaction survival | Full stress test with all systems | Complete recovery from any point |
| WAL replay | Replay last 1000 operations | Identical results |
| Error pattern DB | Coverage check | ≥ 50 patterns, auto-resolution working |
| Cost tracking | Audit trail for E1-E4 | ±5% of actual billing |
| Session memory | Quality audit | All 15 categories populated, actionable |
| Architectural coherence | COHERENCE_AUDIT.md review (v8.5) | Zero MAJOR drift items at SU-6 |

### SAU-Full Protocol Execution (SU-6) — FINAL

1. **GSD_QUICK.md** — FINAL comprehensive update. Must reflect the COMPLETE prism-platform capability set. Every dispatcher, every action, every plugin, every routing path.

2. **AutoPilot/Orchestrator** — Final verification: every query type routes correctly through prism-platform. No mcp-server fallbacks. Test 20 representative queries.

3. **PRISM_QUICK_REF.md** — Final regeneration with all system identifiers.

4. **Session Memory** — Final quality audit. All 15 categories populated. Remove garbage entries.

5. **Claude Memory** — Update: pre-migration state, all gates passed/pending, rollback procedure.

6. **Migration Certification** — Write MIGRATION_CERT.md with every test result, every metric, sign-off status.

7. **Rollback Procedures** — Verify rollback to mcp-server is config-change-only. Test. Time. Must be < 30 seconds.

8. **Agent Count** — Final count. Document complete agent roster for post-migration reference.

9. **Cross-Track Flags** — ALL flags must be resolved. Any remaining [SYNTHETIC_DATA] or [DEFERRED] flags are BLOCKERS for migration.

10. **Safety-Critical Test Matrix** — Run against BOTH codebases. All 50 calculations must produce identical results within ±2σ. This is a HARD BLOCK for migration.

**EXIT:** Migration certification complete. SAU-Full complete. GSD is definitive. All 15 gates pass (including human review gate — v8.5). All cross-track flags resolved. Safety test matrix passes on both codebases. HUMAN_REVIEW_LOG.md: H-1 through H-4 complete with zero unresolved [REJECTED] entries. COHERENCE_AUDIT.md: zero MAJOR drift items. Rollback tested. Agent roster finalized. External backup verified. Go/no-go for mcp-server retirement.

---

# SECTION 5: PHASE STRUCTURE — DETAILED MICROSESSION SPECIFICATIONS

*Every MS is executable from cold start. No "Same as v3." Every step names tools. Build only the changed codebase unless both are touched.*

---

## PHASE P0: SHARED FOUNDATION

**Sessions: 4-5 | Microsessions: 11 + SU-1 | Chats: 3**

**PURPOSE:** Validate the development environment, fix the broken foundation (registries, API, calculations), build survival infrastructure (compaction armor, context budget), scaffold prism-platform, and import all core systems. Everything downstream depends on P0.

**CHAT MAP:**
- Chat 1: P-P0-MS0 → MS1 → MS2 → MS3 → MS4
- Chat 2: P-P0-MS5 → MS6 → MS7 → MS8
- Chat 3: P-P0-MS9 → MS10 → **SU-1**

---

### P-P0-MS0: Environment Smoke Test

**Effort:** ~5 tool calls | **Quality Tier:** QUICK

**ENTRY CONDITIONS:**
- This is the TRUE first microsession. No prior state required.
- C:\PRISM\ exists as a directory.

**STEPS (exact commands):**

1. Verify directory structure:
   ```
   prism_dev action=file_read path="C:\PRISM"
   → Expect: mcp-server\, state\, scripts\ (create if missing), docs\ (create if missing), archive\ (create if missing)
   ```
2. Verify toolchain (via bash or Desktop Commander):
   ```
   node --version    → expect ≥ 18
   python --version  → expect ≥ 3.10
   npx esbuild --version → expect available
   If any missing → STOP, document what to install.
   ```
3. Verify .env:
   ```
   prism_dev action=file_read path="C:\PRISM\mcp-server\.env"
   → Expect: ANTHROPIC_API_KEY present, non-empty, starts with "sk-"
   → Also check: HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL keys present
   If missing → STOP, ask user for key.
   ```
4. Verify build:
   ```
   prism_dev action=build target=mcp-server
   → If fails: document errors for MS1
   ```
5. Verify MASTER_INDEX exists and is current:
   ```
   prism_doc action=read name=MASTER_INDEX.md
   → Expect: 302+ lines, "27 dispatchers, 324 verified actions" on line 6
   → Check for these 5 known corrections needed (from v7.1 audit):
     1. Section 12 (GSD) incomplete — lists only 2 files, should list all 16 with line counts
     2. Section 7 has script count but no script names — enumerate 10 most-used
     3. Missing Section 6B for utility files (autoDocAntiRegression, responseSlimmer, etc.)
     4. Section 1 footer missing KNOWN_RENAMES count (180-190)
     5. Section 14 summary counts may not match corrected values (137 skills, 75 scripts)
   → Apply corrections if you have tool access. If not, flag [MASTER_INDEX_CORRECTIONS_NEEDED].
   → If MASTER_INDEX missing entirely → flag [MASTER_INDEX_MISSING], not a blocker for P0 but must create before P0-MS5
   ```
6. Write env_smoke_test.py (~80 lines) to C:\PRISM\scripts\: automates all above checks for future re-runs.
7. **Choose external backup destination (NEW in v8.5):** Document choice in C:\PRISM\docs\ENV_CONFIG.md — Options: external USB drive, network share, cloud sync (OneDrive/Google Drive/S3). If no external storage available, document as [SINGLE_DISK_RISK] and prioritize acquisition. At minimum, identify a non-C: partition if one exists.

**TOOLS:** prism_dev→file_read, prism_dev→build, prism_dev→file_write

**EXIT CONDITIONS:**
- Node ≥ 18, Python ≥ 3.10, esbuild available
- .env exists with API key and model strings
- mcp-server builds (or errors are documented for MS1)
- C:\PRISM\scripts\, C:\PRISM\docs\, C:\PRISM\state\, C:\PRISM\archive\ all exist
- MASTER_INDEX.md verified (or [MASTER_INDEX_MISSING] flagged)
- env_smoke_test.py operational
- ENV_CONFIG.md created with external backup destination (or [SINGLE_DISK_RISK] documented)

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS0 COMPLETE. Environment status documented. External backup destination chosen. Any build errors noted for MS1.

---

### P-P0-MS1: Registry Loading Fix + Diagnostic Skill (CRITICAL PATH)

**Effort:** ~22 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-P0-MS0 COMPLETE (environment verified)
- C:\PRISM\mcp-server\ is the active server
- Materials currently loading 707/3,518. Machines 2/824. Alarms 0/9,200.

**STEPS:**

1. Load prism-registry-diagnostics skill from skills-consolidated/
2. **DATA AVAILABILITY AUDIT:** Before fixing paths, count raw data. prism_dev→file_read: scan ALL data/ directories recursively. Count: total unique material entries across all files, total machine entries, total alarm entries. Record as RAW_AVAILABLE_MATERIALS, RAW_AVAILABLE_MACHINES, RAW_AVAILABLE_ALARMS. These are the REAL ceilings.
3. prism_dev→code_search: find all file discovery paths in MaterialRegistry.ts, MachineRegistry.ts, AlarmRegistry.ts
4. prism_dev→file_read: data/ directory structure. Map actual paths vs expected paths.
5. Run registry_health_check.py (install to C:\PRISM\scripts\): scan all data directories, report exact path mismatches
6. Fix MaterialRegistry loading paths. Verify with prism_data→material_lookup for: 4140 steel, 6061 aluminum, Ti-6Al-4V, Inconel 718
7. Fix MachineRegistry loading paths. Verify with prism_data→machine_lookup for: HAAS VF-2, DMG MORI NLX, Mazak QTN
8. Fix AlarmRegistry loading paths. Verify with prism_data→alarm_lookup for: FANUC 414, SIEMENS 25000, HAAS 108
9. prism_validate→validate_completeness: verify loaded counts against RAW_AVAILABLE totals
10. Install SYS-REGISTRY-HEALTH hook: fires on every session_boot, blocks if any critical registry < 50% of RAW_AVAILABLE
11. **Create HOOK_MANIFEST.json (NEW in v8.5):** Write to C:\PRISM\state\HOOK_MANIFEST.json with schema_version=1, inherited_count=117, first new_hooks entry for SYS-REGISTRY-HEALTH (status=ACTIVE). expected_total = inherited_count + active new hooks. This is the source-of-truth for system_self_test.py check #3.
12. Build mcp-server (npm run build with esbuild), restart, verify all registries loading

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_data (all lookup actions), prism_validate→validate_completeness, prism_hook→execute

**AGENTS/SWARMS:** OPUS debugger + root_cause_analyst via parallel swarm. HAIKU material_lookup + tool_lookup for fast verification.

**HOOKS INSTALLED:** SYS-REGISTRY-HEALTH

**EXIT CONDITIONS:**
- Materials loading > 95% of RAW_AVAILABLE_MATERIALS (document exact count)
- Machines loading > 95% of RAW_AVAILABLE_MACHINES (document exact count)
- Alarms loading > 95% of RAW_AVAILABLE_ALARMS (document exact count)
- If RAW_AVAILABLE < theoretical max → [DATA_GAP] flag with exact gap documented
- SYS-REGISTRY-HEALTH hook installed and passing
- HOOK_MANIFEST.json created with inherited_count=117, SYS-REGISTRY-HEALTH entry (v8.5)
- registry_health_check.py operational

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS1 COMPLETE with exact registry counts AND raw available counts. MFG_STATE.md: registry status, paths fixed. SESSION_INSIGHTS.md: `[PATTERN] Path resolution patterns found | [DATA_GAP] X materials missing from raw files if applicable`.

---

### P-P0-MS2: API Key Verification + Ralph Validation

**Effort:** ~10 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- P-P0-MS1 COMPLETE (registries loading > 95% of available)
- Build passes (npm run build)

**STEPS:**

1. prism_dev→file_read: C:\PRISM\mcp-server\.env — verify ANTHROPIC_API_KEY present. Check claude_desktop_config.json — verify env section contains matching key. If mismatch → fix, document.
2. prism_agent→agent_invoke: run ralph_loop with trivial prompt ("What is 2+2? Verify."). Expected: generate→critique→refine completes.
3. Test each agent tier: HAIKU echo test, SONNET echo test, OPUS echo test. Record response times for baseline. **Read model strings from .env — do NOT hardcode.**
4. prism_hook→register: SYS-API-KEY-VERIFY, trigger=session_boot, priority=5. Verify fires.
5. Build mcp-server only (npm run build with esbuild). Restart. Verify hook passes.

**TOOLS:** prism_dev→file_read, prism_dev→edit_block, prism_agent→agent_invoke, prism_hook→register

**HOOKS INSTALLED:** SYS-API-KEY-VERIFY

**EXIT CONDITIONS:**
- API key in BOTH .env AND claude_desktop_config.json
- ralph_loop completes full cycle
- HAIKU + SONNET + OPUS tiers respond
- SYS-API-KEY-VERIFY installed and passing
- Response time baselines in HANDOFF.json
- Model strings confirmed read from config (not hardcoded in source)

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS2 COMPLETE. HANDOFF.json: agent tier response times, config state, model strings.

---

### P-P0-MS3: Compaction Armor + Triple-Redundant Survival

**Effort:** ~18 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-P0-MS2 COMPLETE (API verified, agents operational)
- C:\PRISM\state\ writable (verified in MS0)

**STEPS:**

1. prism_dev→code_search: "compaction" in src/ — find CompactionManager.ts. prism_dev→file_read: document current survival mechanism.
2. Write compaction_armor.py (~250 lines) to C:\PRISM\scripts\:
   - Writes to THREE locations: COMPACTION_SURVIVAL.json (primary), BACKUP_STATE.json (secondary), EMERGENCY_RESUME.md (human-readable)
   - Each write verified with read-back
   - Manifest with SHA-256 checksums
   - Contents: current MS ID, ATCS position (empty for now), pending items, context snapshot, registry counts
3. Test: execute with mock state, verify all 3 files, verify checksums, verify EMERGENCY_RESUME.md readable.
4. prism_hook→register: PLATFORM-COMPACTION-ARMOR, trigger=pressure>=50%, priority=0 (fires FIRST).
5. prism_hook→register: PLATFORM-ATCS-CHECKPOINT-SYNC, trigger=atcs_checkpoint, priority=5. **NOTE: Registered as PENDING — ATCS is not imported until P0-MS8. Hook will activate automatically when ATCS import wires the checkpoint trigger at MS8. This is correct behavior per hook dependency checking (P0-MS7 Step 8).**
6. prism_hook→register: PLATFORM-CONTEXT-BUDGET, trigger=every_3_calls, priority=35.
7. Integration test: simulate pressure ≥ 50%, verify armor fires, all 3 files written, checksums valid.
8. **Import autoDocAntiRegression.ts (~150L) from mcp-server** (NEW in v8.2):
   - Copy to prism-platform/src/core/autoDocAntiRegression.ts
   - Wire to fire on ALL .md file writes (pre-write hook)
   - Creates doc_baselines.json in C:\PRISM\state\ to track file sizes
   - Test: >30% size reduction on .md write → WARN in TelemetryEngine. >60% → BLOCK write.
   - Verify doc_baselines.json tracks current file sizes for ROADMAP_TRACKER.md, SESSION_INSIGHTS.md
9. Build mcp-server only. Restart. Verify hooks registered.

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_hook→register, prism_hook→execute

**HOOKS INSTALLED:** PLATFORM-COMPACTION-ARMOR, PLATFORM-ATCS-CHECKPOINT-SYNC (PENDING until P0-MS8 ATCS import), PLATFORM-CONTEXT-BUDGET

**EXIT CONDITIONS:**
- compaction_armor.py exists and passes test
- 3 hooks installed and verified
- All 3 survival locations writable and readable
- Checksum validation passes
- Context budget projecting correctly
- autoDocAntiRegression.ts imported, doc_baselines.json created, WARN/BLOCK thresholds verified

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS3 COMPLETE. HANDOFF.json: survival file paths, hook IDs, pressure baseline.

---

### P-P0-MS4: Calc Bug Fix + Telemetry + Todo Reset + Self-Test + Quick-Ref Generator

**Effort:** ~18 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-P0-MS3 COMPLETE (compaction armor operational)
- Known calc bug (GAP-002)
- TelemetryEngine exists

**STEPS:**

1. prism_dev→code_search: GAP-002 calc functions. prism_dev→file_read: affected files. Document: what's wrong, correct behavior, affected formulas.
2. prism_dev→edit_block: fix calculation. State exact lines changed. Verify with:
   - prism_validate→validate_calculation: 4140 steel annealed roughing carbide → known Vc/fz
   - prism_validate→validate_calculation: 6061-T6 aluminum finishing HSS → known values
   - Both must pass S(x) ≥ 0.70
3. prism_dev→file_read: TelemetryEngine.ts (~609 lines). Verify capturing: dispatcher calls, hook firings, errors, timing.
4. Write todo_phase_reset.py (~100 lines) to C:\PRISM\scripts\.
5. prism_hook→register: SYS-PHASE-TODO-RESET, trigger=phase_change, priority=30. Test.
6. Write system_self_test.py (~120 lines) to C:\PRISM\scripts\: 5 checks.
7. Write quick_ref_generator.py (~120 lines) to C:\PRISM\scripts\.
8. Build mcp-server only. Run calcs end-to-end. Verify telemetry captures events.
3b. **Structured Logging with Correlation IDs (v10.0):**
    Enhance TelemetryEngine with correlation ID support:
    - Every dispatcher call generates a unique correlationId (UUID v4)
    - correlationId flows through: autoHookWrapper → hook chain → engine calls → script invocations
    - TelemetryEngine.log() accepts: { correlationId, source, level, message, context }
    - Log levels: DEBUG, INFO, WARN, ERROR, SAFETY (safety is highest — always persisted)
    - SAFETY level auto-triggers: persist to WAL (if E1 complete), increment error counter,
      fire PLATFORM-ERROR-PATTERN with full correlation trace
    - Verify: trigger prism_calc→speed_feed, read TelemetryEngine log, verify correlation trace
      contains all expected nodes (dispatcher → hooks → engine → response)

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→edit_block, prism_dev→file_write, prism_validate→validate_calculation, prism_data→material_lookup, prism_hook→register

**HOOKS INSTALLED:** SYS-PHASE-TODO-RESET


**EXIT CONDITIONS:**
- Calc bug fixed, test calculations correct with S(x) ≥ 0.70
- TelemetryEngine operational with correlation ID support (v10.0)
- SAFETY log level persists correctly (v10.0)
- todo_phase_reset.py + hook wired and tested
- system_self_test.py cadence registered (9 checks including state coherence, disk space, API version, build pipeline, safety trace)
- quick_ref_generator.py operational and produces valid PRISM_QUICK_REF.md
- Build passes
**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS4 COMPLETE. SESSION_INSIGHTS.md: `[REGRESSION] GAP-002 root cause | [PATTERN] calc fix approach`.

---

### P-P0-MS5: Scaffold prism-platform Project

**Effort:** ~18 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- P-P0-MS4 COMPLETE
- C:\PRISM\prism-platform\ does not exist or is empty

**STEPS:**

0. **Read MASTER_INDEX.md as scaffold blueprint (CRITICAL):**
   ```
   prism_doc action=read name=MASTER_INDEX.md
   → Parse Section 1: Extract all 27 dispatcher names and their action lists
   → Parse Section 4: Extract all 29 engine names and line counts
   → Parse Section 5: Extract all 19 registry names and line counts
   → Parse Section 9: Extract all 5 type definition files
   → Use these ACTUAL lists to create stubs — do NOT hardcode counts
   ```
1. Create C:\PRISM\prism-platform\. npm init. Install: typescript, esbuild, @anthropic-ai/sdk (pinned version). Create tsconfig.json (strict, noEmit for type checking), esbuild.config.js with incremental rebuild (v10.0 Section 3.18).
2. Create directory structure: src/{core, core/types, core/errors, plugins, engines, agents, providers}, data/, docs/, tests/
3. **Import type definitions FIRST** (they define all param/result interfaces):
   ```
   prism_dev action=file_read path="C:\PRISM\mcp-server\src\types\prism-schema.ts"
   → Copy to prism-platform/src/core/types/ (689 lines)
   prism_dev action=file_read path="C:\PRISM\mcp-server\src\types\telemetry-types.ts"
   → Copy (246 lines)
   → Repeat for graph-types.ts (193L), pfp-types.ts (186L), certificate-types.ts (105L)
   → Total: 5 files, 1,419 lines — the TypeScript foundation for everything
   ```
4. **Create PrismError class hierarchy (v10.0 CM-1):**
   Write src/core/types/error-types.ts (~150 lines):
   ```typescript
   export class PrismError extends Error {
     code: string; severity: 'warning' | 'fault' | 'safety'; correlationId?: string;
   }
   export class CalcError extends PrismError { material: string; operation: string; }
   export class SafetyError extends CalcError { threshold: number; actual: number; }
   export class RegistryError extends PrismError { registry: string; path: string; }
   ```
   Wire to CalcHookMiddleware for typed error dispatch (not string matching).
5. **Create DataProvider interface + JsonFileProvider + CalcModelRegistry (v9.0):**
   Write src/core/DataProvider.ts, src/providers/JsonFileProvider.ts, src/core/CalcModelRegistry.ts per Section 3.13 and 3.14. **JsonFileProvider uses synchronous reads wrapped in Promise.resolve() (v10.0 CM-3) — zero behavior change. Async only when swapping to truly async backend.** **DataProvider marked PROVISIONAL (v10.0 ER-5) — may be revised after M-M2 campaign query pattern analysis.**
6. Write src/plugins/PluginInterface.ts: definePlugin(manifest), loadPlugin(path), unloadPlugin(id). **Include dependency resolution (v10.0 ZT-5):** manifest.dependencies[], manifest.provides[], topological sort on load, uninstall protection. **Include resource limits (v10.0 ER-12) for CALC_MODIFY tier.**
7. Write src/plugins/manufacturing/manifest.json: For EACH of the 27 dispatchers from MASTER_INDEX Section 1, create a stub with the exact action list. Every stub throws "not yet imported — use mcp-server fallback."
8. **Create build pipeline (v10.0 Section 3.18):**
   - Configure esbuild.config.js with incremental: context() + rebuild()
   - Configure package.json scripts: typecheck, compile, test:critical, build, build:fast
   - Create test_critical_runner.py (~120 lines) — orchestrates test:critical
   - Create hook_smoke_test.py (~80 lines) — verifies hooks callable
   - Create safety_calc_test_matrix_extensions.json (empty, ready for extensions)
   - Commit package-lock.json
   - **NOTE: test:critical will partially skip until safety_calc_test_matrix.py exists (P0-MS4 creates it). Runner gracefully skips missing checks with WARN.**
9. Build prism-platform using full pipeline: tsc --noEmit + esbuild + test:critical. Verify clean.
10. Write docs/PLATFORM_STATE.md + docs/IMPORT_LOG.md. Create SYNC_MANIFEST.json. Create API_VERSION.json (v1.0.0). Create EXTENSION_REGISTRY.json.
11. Create .env with HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL keys matching mcp-server/.env values.
12. **Export KNOWN_RENAMES as JSON config:**
    ```
    prism_dev action=file_read path="C:\PRISM\mcp-server\src\dispatchers\guardDispatcher.ts"
    → Extract the KNOWN_RENAMES map (180-190 entries)
    → Write to C:\PRISM\prism-platform\data\config\known_renames.json
    ```

**TOOLS:** prism_dev→file_write, prism_dev→file_read, prism_doc→read

**EXIT CONDITIONS:**
- prism-platform/ exists, builds clean through FULL pipeline (typecheck + compile + test:critical)
- Plugin interface defined WITH dependency resolution and resource limits
- Manufacturing manifest lists all 27 dispatchers from MASTER_INDEX
- All 5 type definition files imported (1,419 lines) + error-types.ts (v10.0)
- PrismError hierarchy defined and wired to error pattern matching
- DataProvider + JsonFileProvider + CalcModelRegistry created (v9.0), DataProvider marked PROVISIONAL (v10.0)
- KNOWN_RENAMES exported as JSON config (≥180 entries)
- .env created with model strings from config (not hardcoded)
- esbuild incremental mode configured
- package-lock.json committed
- test:critical runner operational (gracefully handles missing checks)
- safety_calc_test_matrix_extensions.json created (empty)

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS5 COMPLETE. IMPORT_LOG.md: "Scaffold created from MASTER_INDEX, 6 type defs imported (5 original + 1 error-types), KNOWN_RENAMES exported, build pipeline configured."

---


### P-P0-MS6: Import Context Management + Compaction Detection + Tier 0 Engines

**Effort:** ~22 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-P0-MS5 COMPLETE (prism-platform scaffolded, builds clean)
- compaction_armor.py from P0-MS3 operational

**STEPS:**

1. prism_dev→code_search + file_read: ContextManager.ts, CompactionManager.ts in mcp-server. Document exports, deps, line counts.
2. Analyze dependencies: internal imports, external packages, types. Map what exists in prism-platform vs needs importing.
3. Copy ContextManager to prism-platform/src/core/. Adapt imports. Verify: pressure calculation, cap enforcement, context tracking.
4. Copy CompactionManager to prism-platform/src/core/. Adapt imports. Wire to compaction_armor.py.
5. **Import AND wire SessionLifecycleEngine (351L):**
   - prism_dev→file_read: SessionLifecycleEngine.ts from mcp-server. Copy to prism-platform/src/engines/.
   - Boot: SessionLifecycleEngine orchestrates prism_dev→session_boot sequence (load state, GSD, memories, integrity check)
   - Shutdown: SessionLifecycleEngine calls state_save, HANDOFF.json write, SESSION_INSIGHTS append
   - Wire cadence function autoSessionLifecycle to fire at session start/end
   - ContextManager reads session state FROM SessionLifecycleEngine (not independently)
6. **Import AND wire ComputationCache (420L):**
   - prism_dev→file_read: ComputationCache.ts from mcp-server. Copy to prism-platform/src/engines/.
   - prism_calc→speed_feed, prism_calc→cutting_force, prism_calc→tool_life ALL check ComputationCache before computing
   - Cache key = material_id + operation + tool + parameters hash
   - Cache invalidation: on registry update, on formula accuracy correction, on data campaign batch completion
   - Wire PLATFORM-CONTEXT-BUDGET to flush ComputationCache when context pressure > 85% (free memory)
7. Integration: verify ContextManager pressure feeds PLATFORM-CONTEXT-BUDGET hook. Verify CompactionManager calls compaction_armor.py at ≥ 50%.
8. **Import AND wire DiffEngine (196L):**
   - prism_dev→file_read: DiffEngine.ts from mcp-server. Copy to prism-platform/src/engines/.
   - drift_detector.py (P1-MS8) calls DiffEngine.diff(previousState, currentState) to detect changes
   - codebase_sync_check.py uses DiffEngine for file comparison
   - SYS-DRIFT-CHECK hook passes results through DiffEngine before logging to DRIFT_LOG.md
9. prism_validate→validate_anti_regression: compare imports against source. No lost exports, no missing types. **Verify imported line counts: SessionLifecycleEngine=351L, ComputationCache=420L, DiffEngine=196L match MASTER_INDEX.**
10. Build prism-platform only. Test: ContextManager tracks size, CompactionManager detects thresholds, armor fires on simulated pressure, ComputationCache caches and invalidates, SessionLifecycleEngine boots and shuts down cleanly.

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_dev→edit_block, prism_validate→validate_anti_regression

**EXIT CONDITIONS:**
- ContextManager and CompactionManager imported and operational
- Compaction armor integration verified
- Context budget hook works with imported ContextManager
- SessionLifecycleEngine imported (351L) and orchestrates boot/shutdown sequence (verified)
- ComputationCache imported (420L) and caches calculation results and invalidates on registry update (verified)
- DiffEngine imported (196L) and detects state changes for drift detection (verified)
- Anti-regression passes, prism-platform builds

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS6 COMPLETE. IMPORT_LOG.md: ContextManager + CompactionManager + SessionLifecycleEngine (351L) + ComputationCache (420L) + DiffEngine (196L) with line counts.

---

### P-P0-MS7: Import Dispatcher Pattern + Hook Engine + CalcHookMiddleware

**Effort:** ~20 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-P0-MS6 COMPLETE (Tier 0 engines imported: SessionLifecycleEngine, ComputationCache, DiffEngine)
- prism-platform PluginInterface operational

**STEPS:**

1. prism_dev→code_search + file_read: DispatcherRegistry/dispatcherMap in mcp-server.
2. prism_dev→code_search + file_read: hookRegistration.ts, autoHookWrapper.ts (1,559 lines — this is the universal hook proxy that MAKES hooks fire).
3. Import dispatcher pattern to src/core/. KEY ADAPTATION: dispatchers register through PluginInterface, not hardcoded.
4. Import hook engine to src/core/. This means importing ALL THREE engine files:
   - HookEngine.ts (802L) — hook registration/execution framework
   - HookExecutor.ts (835L) — hook chain execution
   - EventBus.ts (656L) — event system for hook triggers
   KEY ADAPTATION: system hooks (SYS-*) at boot, plugin hooks on plugin load.
5. Import autoHookWrapper.ts pattern (1,559L). This is the mechanism that wraps all dispatchers with before/after/error hooks. Without it, hooks are registered but never fire.
6. **Import AND wire CalcHookMiddleware (269L):**
   - CalcHookMiddleware wraps ONLY calculation dispatchers (prism_calc, prism_thread, prism_toolpath)
   - BEFORE calc: injects formula recommendations (from PLATFORM-FORMULA-RECOMMEND), checks ComputationCache (imported at P0-MS6), logs input params to TelemetryEngine
   - AFTER calc: writes result to ComputationCache, updates formula accuracy tracker, triggers S(x) validation
   - CalcHookMiddleware is SEPARATE from autoHookWrapper: autoHookWrapper handles all dispatchers generically, CalcHookMiddleware adds calculation-specific pre/post logic
   - Wire: autoHookWrapper calls CalcHookMiddleware.before() and .after() for calc dispatchers only
   - NOTE: CalcHookMiddleware is Tier 2 by classification but imported here early because it must be wired alongside autoHookWrapper for correct calc dispatch behavior.
7. Also import engine infrastructure:
   - index.ts (300L) — engine registration and bootstrapping
   - hookRegistration.ts (~400L) — boot-time hook wiring
8. ADD hook dependency checking: on register, verify script/file deps exist. If missing → PENDING, not ACTIVE.
9. prism_validate→validate_anti_regression: same exports, same signatures. **Verify imported line counts match MASTER_INDEX line counts — if less, content was lost.**
10. Integration test: register test dispatcher through plugin → verify routing. Register test hook → verify firing. Register hook with missing dep → verify PENDING state.
11. Build BOTH codebases (both touched — cross-referencing patterns).

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_dev→edit_block, prism_validate→validate_anti_regression

**EXIT CONDITIONS:**
- Dispatcher pattern imported with plugin registration
- Hook engine imported (HookEngine + HookExecutor + EventBus = 2,293 lines)
- autoHookWrapper pattern imported (1,559 lines)
- CalcHookMiddleware imported (269L) and wired to autoHookWrapper for calc dispatchers
- Engine infrastructure imported (index.ts 300L + hookRegistration.ts ~400L)
- Hook dependency checking implemented (PENDING state)
- Test dispatcher routes, test hook fires, missing-dep hook goes PENDING
- Anti-regression passes, both codebases build
- IMPORT_LOG.md records line counts matching MASTER_INDEX

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS7 COMPLETE. IMPORT_LOG.md: dispatcher + hook engine + CalcHookMiddleware + infrastructure files with line counts.

---

### P-P0-MS8: Import ATCS + Workflow State Machine

**Effort:** ~18 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-P0-MS7 COMPLETE (dispatcher + hooks routing correctly)

**STEPS:**

1. prism_dev→code_search + file_read: ATCS dispatcher (all 10 actions). Document deps and state locations.
2. prism_dev→code_search + file_read: WorkflowState/state_machine. Document states, transitions, persistence.
3. Import ATCS as platform service (src/core/atcs/) — infrastructure, not plugin. State storage: C:\PRISM\autonomous-tasks\. Wire checkpoint to PLATFORM-ATCS-CHECKPOINT-SYNC.
4. Import workflow state machine to src/core/workflow/. Verify transitions match mcp-server.
5. Test: create mock ATCS task → checkpoint → verify COMPACTION_SURVIVAL.json has ATCS position.
6. prism_validate→validate_anti_regression: all 10 actions present.
7. Build prism-platform only. Test queue_next→unit_complete→batch_validate→checkpoint→replan loop.

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_validate→validate_anti_regression, prism_hook→execute

**EXIT CONDITIONS:**
- ATCS imported, all 10 actions operational
- Workflow state machine imported with correct transitions
- ATCS checkpoint → compaction survival sync verified
- Full ATCS loop tested
- Build passes

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS8 COMPLETE. IMPORT_LOG.md: ATCS + workflow files.

---

### P-P0-MS9: Import Agent/Swarm Executors + Cadence System

**Effort:** ~20 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-P0-MS8 COMPLETE (ATCS operational)
- API key verified (P0-MS2)

**STEPS:**

1. prism_dev→code_search + file_read: AgentExecutor.ts (818L) in mcp-server. Document: tiers, invocation, governance, error handling, timeouts.
2. prism_dev→code_search + file_read: SwarmExecutor.ts (953L) — 8 swarm patterns including ralph_loop.
3. prism_dev→code_search + file_read: cadenceExecutor.ts (**2,246 lines** — this is the system heartbeat). Contains 30 auto-fire functions. Also import responseSlimmer.ts (~200L — truncation caps).
4. Import agent executors to src/agents/. **Model strings read from .env, not hardcoded.** Wire PLATFORM-COST-ESTIMATE. Import Tier 2 intelligence engines:
   - AgentExecutor.ts (818L), SwarmExecutor.ts (953L), BatchProcessor.ts (233L)
   - KnowledgeQueryEngine.ts (871L)
   - ResponseTemplateEngine.ts (669L), ScriptExecutor.ts (754L), SkillExecutor.ts (868L)
   - NOTE: CalcHookMiddleware.ts (269L) was already imported at P0-MS7 with autoHookWrapper. Do NOT re-import.
5. **Wire ResponseTemplateEngine (669L):**
   - ALL dispatcher responses pass through ResponseTemplateEngine AFTER computation, BEFORE returning to user
   - Template selection based on: dispatcher type, output complexity, user context (from session memory)
   - Templates enforce: safety warnings on calculations, uncertainty bands on predictions, source citations on material data
   - responseSlimmer.ts calls ResponseTemplateEngine.truncate() — templates know which sections to cut first under pressure
   - Wire: autoHookWrapper post-output hook → ResponseTemplateEngine.format(result, context) → responseSlimmer.truncate(formatted)
6. Import swarm patterns to src/agents/swarms/. Test ralph_loop through platform.
7. Import cadence system to src/core/cadence/. Add 4 new: recovery_manifest, learning_extract, context_budget, agent_health_check. Total: 34.
8. Import responseSlimmer to src/core/. Verify truncation caps: 20KB normal, 12KB at 60%, 8KB at 70%, 5KB at 85%.
9. Test: HAIKU + SONNET + OPUS + ralph_loop through prism-platform. All three tiers must respond. **Read model strings from .env — do NOT hardcode.**
10. prism_validate→validate_anti_regression. Build prism-platform only.

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_agent→agent_invoke, prism_validate→validate_anti_regression

**HOOKS INSTALLED:** PLATFORM-COST-ESTIMATE

**EXIT CONDITIONS:**
- All agent tiers functional through platform (model strings from config)
- 8 swarm patterns imported, ralph_loop verified
- 34 cadence functions registered (30 original + 4 new)
- PLATFORM-COST-ESTIMATE fires pre-invoke
- Build passes

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS9 COMPLETE. IMPORT_LOG.md: agents, swarms, cadence with line counts.

---

### P-P0-MS10: Dead Code + Integration Verify + Perf Smoke Test

**Effort:** ~18 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- P-P0-MS9 COMPLETE
- Both codebases build clean

**STEPS:**

1. **Model string verification:** Read .env files from BOTH codebases. Verify all agent tiers read from config. prism_dev→code_search for any hardcoded model strings in source — if found, replace with config reads. Test each tier responds.
2. Dead code audit: unused imports, unreachable functions, commented blocks in prism-platform/src/. Remove. Track lines removed.
3. Create SYNC_MANIFEST.json in BOTH codebases. First DRIFT_LOG.md entry: "Baseline established."
4. Integration test: dispatcher call → hook fires → calculation runs → telemetry captures. Specific: prism_data→material_lookup("4140") through platform.
5. Performance smoke test (3 metrics): material lookup latency (target < 50ms), hook chain overhead (target < 10ms/call), session boot time (target < 3s).
6. Trigger system_self_test cadence. Verify all 7 checks pass (including state coherence, disk space, and API version).
7. Build BOTH codebases (final P0 integration check).

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→edit_block, prism_data→material_lookup, prism_validate→validate_completeness

**HOOKS INSTALLED:** PLATFORM-SYNC-MANIFEST

**EXIT CONDITIONS:**
- Model strings confirmed config-driven in BOTH codebases (zero hardcoded strings)
- Dead code removed
- SYNC_MANIFEST.json + DRIFT_LOG.md created
- Full integration chain works
- Performance smoke test baselines recorded
- System self-test passes (all 6 checks)
- BOTH codebases build

**HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS10 COMPLETE — **P0 PHASE COMPLETE**. HANDOFF.json: full P0 summary. SESSION_INSIGHTS.md: all P0 patterns compiled. → Proceed to **SU-1** (which includes SAU-Full).

---

## PHASE P1: CONSOLIDATE & WIRE

**Sessions: 4-5 | Microsessions: 8 + SU-2 | Chats: 3 (Chats 3-4b)**

**PURPOSE:** Clean up inherited systems, wire intelligence features, build automation sandbox. After P1, the system is self-aware: recommends formulas, learns across sessions, detects drift.

**CHAT MAP:**
- Chat 3 (continued from P0 after SU-1): P-P1-MS1 → MS2
- Chat 4a: P-P1-MS3 → MS4 → MS5
- Chat 4b: P-P1-MS6 → MS7 → MS8 → **SU-2**

---

### P-P1-MS1: Script Audit, Cull, Sandbox, AND Self-Description

**Effort:** ~18 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P0 COMPLETE (SU-1 passed, SAU-Full complete).

**STEPS:**

1. Scan all scripts → categorize ACTIVE/UNUSED/REDUNDANT → cull ~30% to archive.
2. Write safe_script_runner.py → install PLATFORM-SCRIPT-SANDBOX hook → test BLOCK on write attempts.
3. **Implement ScriptRegistry manifest scanning (v10.0 ZT-3):**
   - Implement ScriptRegistry.scanManifests() — scans scripts/core/ for PRISM_MANIFEST headers
   - Parse manifest fields: name, version, trigger, priority, dependencies, domain, sandbox
   - Auto-wire scripts to declared triggers (hook, cadence, boot, build, manual)
   - Scripts without manifests: register as legacy (manual invocation only)
4. **Add PRISM_MANIFEST headers to key scripts:**
   - safety_calc_test_matrix.py: trigger=build, priority=0, sandbox=false
   - mfg_batch_validator.py: trigger=hook:MFG-CAMPAIGN-PROGRESS, priority=50, sandbox=true
   - registry_health_check.py: trigger=boot, priority=10, sandbox=false
   - system_self_test.py: trigger=cadence:autoSystemSelfTest, priority=10, sandbox=false
   - quick_ref_generator.py: trigger=cadence:autoQuickRefGen, priority=90, sandbox=false
5. Test: verify manifest-described scripts auto-wire. Verify sandbox enforcement.

**HOOKS INSTALLED:** PLATFORM-SCRIPT-SANDBOX

**EXIT:** Script inventory complete, ~30% culled. Sandbox operational. BLOCK verified. ScriptRegistry manifest scanning operational. 5+ key scripts have PRISM_MANIFEST headers and auto-wire. Legacy scripts accessible via manual invocation.

---

### P-P1-MS2: Agent Consolidation with Downstream Cross-Reference

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS1 COMPLETE.

List all agents → **cross-reference against ALL future phases (P2-E4) for KEEP list** → merge overlaps → target ~54 → update swarm references → test 5 representatives → document roster with KEEP flags.

**EXIT:** ~54 agents. No broken swarm references. All KEEP agents preserved. Roster documented.

---

### P-P1-MS3: Hook Triage, Priority Band Assignment, and Activation Wiring

**Effort:** ~20 tool calls | **Resource Profile:** CONTEXT-BOUND | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS2 COMPLETE.

**STEPS:**

1. Enumerate ALL 117 inherited hooks → categorize KEEP/MODIFY/DISABLE.
2. **Assign priority bands to ALL hooks (v10.0 ZT-6):**
   - Map each inherited hook to the appropriate priority band:
     0-9: CRITICAL, 10-29: SYSTEM, 30-49: PLATFORM, 50-69: MFG, 70-89: ENTERPRISE, 90-99: TELEMETRY
   - Document assignments in HOOK_MANIFEST.json (add priority_band field per hook)
   - Identify and resolve any priority collisions within same trigger group
3. **Implement `register_with_manifest` action (v10.0 ZT-4):**
   - Enhance prism_hook→register to also accept `register_with_manifest`
   - Atomic: validates band → checks collisions → registers → updates HOOK_MANIFEST.json → logs
4. **Implement collision detection:**
   - Same trigger AND same priority → WARN, auto-bump +1 within band
   - Auto-bump crosses band boundary → ERROR, require manual priority
5. Disable irrelevant inherited hooks.
6. Install: PLATFORM-IMPORT-VERIFY (priority 35), PLATFORM-ERROR-PATTERN (priority 40), PLATFORM-SKILL-AUTO-LOAD (priority 45), SYS-DRIFT-CHECK (priority 25, PENDING).
7. **Upgrade PLATFORM-SKILL-AUTO-LOAD to auto-register (v10.0 ZT-2):**
   - SkillRegistry.scanDirectory() scans skills-consolidated/, parses YAML front matter, auto-registers valid
   - Test: drop new test skill file → verify auto-discovered on next trigger
8. Test 5 representative hooks → document active/pending/disabled counts.

**HOOKS INSTALLED:** PLATFORM-IMPORT-VERIFY, PLATFORM-ERROR-PATTERN, PLATFORM-SKILL-AUTO-LOAD (auto-register mode), SYS-DRIFT-CHECK (PENDING)

**EXIT:** ~85 active hooks with assigned priority bands. ~8 PENDING. Rest disabled. Error pattern DB seeded. Priority collision detection operational. register_with_manifest action works. Skill auto-discovery verified.

---

### P-P1-MS4: Auto-Recommendation Engines

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS3 COMPLETE.

Verify each recommendation engine → test material + tool recommendations → fix broken logic → wire to platform → verify telemetry captures events.

**EXIT:** All recommendation engines functional and tested. Telemetry capturing.

---

### P-P1-MS5: Platform Config Protocol + Formula Cross-Reference

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS4 COMPLETE.

Standardize config → write formula_cross_ref.py → map 490 formulas → install PLATFORM-FORMULA-RECOMMEND hook → test pre-calculation injection → verify formulas match material+operation.

**HOOKS INSTALLED:** PLATFORM-FORMULA-RECOMMEND

**EXIT:** FORMULA_TASK_MAP.json with 490 formulas. Hook fires and injects relevant formulas.

---

### P-P1-MS6: Skill Packaging + Auto-Discovery Verification

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS5 COMPLETE.

**STEPS:**

1. Package 18 new skills with YAML front matter headers (v10.0 ZT-2).
2. Verify all 18 have valid manifest format and ## Changelog section.
3. **Test auto-discovery end-to-end:**
   - Drop a test skill into skills-consolidated/ (NOT pre-registered)
   - Trigger PLATFORM-SKILL-AUTO-LOAD or reboot
   - Verify: skill appears in SkillRegistry without ANY manual registration
   - Verify: prism_skill→list shows new skill
   - Remove test skill → verify deregistered on next scan
4. Test 5 representative skills through normal workflow.
5. Verify total count: ≥137 (119 existing + 18 new). Count is now a floor check.

**EXIT:** 18 new skills packaged with manifests. Auto-discovery verified end-to-end. Floor count ≥137 verified.

---

### P-P1-MS7: Session Memory Expansion

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS6 COMPLETE.

**STEPS:**
1. Expand session_memory.json to 15 categories → retention policy (3KB, 20/category)
   **All 15 categories (enumerated for downstream consumer verification):**
   ```
   1.  failure_patterns        — Error root causes and fix procedures (consumer: boot context, error pattern DB)
   2.  performance_baselines   — Benchmark history per metric (consumer: boot health check, PERF gate)
   3.  config_drift            — .env and config changes (consumer: drift detector)
   4.  domain_discoveries      — Material/machine behavior patterns (consumer: formula recommend)
   5.  material_preferences    — Frequently queried materials and conditions (consumer: ComputationCache pre-load)
   6.  user_context            — Manufacturing role, expertise level (consumer: ResponseTemplateEngine)
   7.  recent_calculations     — Last N calc results with inputs/outputs (consumer: formula recommend, response template)
   8.  tool_wear_history       — Observed tool life vs predicted (consumer: ToolBreakageEngine post-M4)
   9.  alarm_resolutions       — Alarm→fix mappings from operator feedback (consumer: alarm enrichment)
   10. campaign_state          — Current batch progress summary (consumer: boot context, dashboard)
   11. cost_history            — API cost trends per operation type (consumer: cost estimate hook)
   12. session_patterns        — Query frequency by dispatcher (consumer: AutoPilot routing optimization)
   13. validation_outcomes     — Ω scores and S(x) trends (consumer: formula accuracy tracker)
   14. cross_reference_cache   — Material-tool-machine compatibility results (consumer: knowledge graph)
   15. operator_feedback       — UAT feedback and override history (consumer: formula recommend weighting)
   ```
2. Install PLATFORM-MEMORY-EXPAND hook → fires at session_end, extracts from telemetry
3. **Wire Session Memory Consumers (close the read gap):**
   - **Consumer 1: Boot context optimization.** SessionLifecycleEngine reads session_memory at boot →
     if failure_patterns category has > 10 entries → pre-loads mitigation context for common failures →
     if material_preferences has entries → pre-loads preferred material params into ComputationCache
   - **Consumer 2: ResponseTemplateEngine reads session_memory →**
     if user_context has manufacturing_role → adjusts response detail level (operator vs engineer) →
     if recent_calculations has entries → references previous results in responses
   - **Consumer 3: PLATFORM-FORMULA-RECOMMEND reads session_memory →**
     recent_calculations + material_preferences inform formula weighting (prefer formulas
     that worked in recent sessions for similar materials)
4. **Wire Boot Efficiency Tracker with thresholds:**
   - Write boot_efficiency_tracker.py (~120 lines) to C:\PRISM\scripts\
   - boot_efficiency_tracker.py measures: total boot time, state load time, memory load time, registry load time
   - Add cadence function: autoBootHealthCheck fires at session start
   - Thresholds: boot > 3s → WARN in TelemetryEngine "performance" channel →
     boot > 5s → trigger optimization: prune session_memory (remove lowest-priority categories),
     clear stale ComputationCache entries, compact state files →
     boot > 8s → BLOCK: something is fundamentally wrong, document and investigate
5. Test: verify session_memory data changes ResponseTemplateEngine output. Verify boot threshold triggers.

**HOOKS INSTALLED:** PLATFORM-MEMORY-EXPAND

**EXIT:** 15 categories. Retention enforced. Hook fires at session_end. 3 consumers verified (boot context, response templates, formula recommendations). boot_efficiency_tracker.py operational. Boot thresholds operational (3s/5s/8s).

---

### P-P1-MS8: Drift Detection Baseline + Sync Manifest

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS7 COMPLETE.

**STEPS:**
1. Write codebase_sync_check.py (uses DiffEngine from P0-MS7) + drift_detector.py → generate baseline DRIFT_LOG.md
2. ACTIVATE SYS-DRIFT-CHECK (from PENDING) → wire to weekly cadence
3. **Wire Drift Auto-Correction (close the advisory gap):**
   - drift_detector.py detects drift → writes to DRIFT_LOG.md
   - **Auto-correction thresholds:**
     - 1-2 drift items: ADVISORY. Log only. Review at next SAU.
     - 3-4 drift items: AUTO-TODO. Add "resolve drift items" to prism_todo with priority HIGH.
       Auto-generates specific fix instructions per drift item in TODO entry.
     - 5+ drift items: URGENT. Add TODO with priority CRITICAL. Block next phase transition
       until drift < 3. Fire TelemetryEngine "system" alert channel.
   - **Auto-resolution for common drift types:**
     - File count mismatch → auto-run registry_health_check.py → report what changed
     - Import signature mismatch → auto-run validate_anti_regression → report what broke
     - Config divergence → auto-diff .env files → report differences
4. Test detection → test auto-TODO generation → test threshold escalation → build BOTH.

**HOOKS INSTALLED:** SYS-DRIFT-CHECK (ACTIVATED from PENDING)

**EXIT:** Drift detection operational. Baseline established. Auto-correction thresholds wired (advisory/auto-todo/urgent). Common drift types have auto-resolution. → Proceed to **SU-2** (SAU-Full).

---

## PHASE P2: GENERALIZATION

**Sessions: 4-6 | Microsessions: 8 + SU-3 | Chats: 3 (Chats 5-7)**

**PURPOSE:** Prove platform is domain-agnostic (plugin architecture), establish golden path demos, build migration infrastructure, establish performance baselines. After P2, the system can host any domain plugin with a clear path to mcp-server retirement.

**CHAT MAP:**
- Chat 5: P-P2-MS1 → MS2 → MS3
- Chat 6: P-P2-MS4 → MS5
- Chat 7: P-P2-MS6 → MS7 → MS8 → P-PERF-MS1 → **SU-3**

---

### P-P2-MS1: Plugin Loader Test with Manufacturing Manifest

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P1 COMPLETE (SU-2 + SAU-Full passed).

Load manufacturing plugin → verify 27 dispatchers register as stubs → test unload/reload cycle → verify no orphans.

**EXIT:** Plugin load/unload/reload cycle clean. 27 dispatchers register. No orphans.

---

### P-P2-MS2: Minimal Proof-of-Concept Domain Plugin

**Effort:** ~8 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS1 COMPLETE.

Create task-tracker plugin (2 dispatchers, 1 hook) → test round-trip → prove multi-domain architecture.

**EXIT:** Second plugin loaded alongside manufacturing. Both route correctly. Hook fires.

---

### P-P2-MS3: Manus Governance Interception Layer

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS2 COMPLETE.

Import governance → adapt to hook engine → test BLOCK and ALLOW → verify cross-plugin. Overhead < 5ms.

**EXIT:** Governance intercepts correctly. BLOCK/ALLOW work. < 5ms overhead. Cross-plugin.

---

### P-P2-MS4: Import AutoPilot + Ralph Loops

**Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P2-MS3 COMPLETE.

Import AutoPilot → verify GSD dynamic reading → test routing → verify ralph_loop through AutoPilot → verify PLATFORM-COST-ESTIMATE fires.

**SAU NOTE:** This MS fundamentally changes routing. After completion, verify GSD_QUICK.md reflects AutoPilot routing and test 3 query types.

**EXIT:** AutoPilot imported and routing correctly. Ralph loops through AutoPilot. Cost estimation active. GSD updated.

---

### P-P2-MS5: Golden Path Demos (Manufacturing)

**Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P2-MS4 COMPLETE.

Define 3 manufacturing demos → write demo_hardener.py → install PLATFORM-DEMO-VERIFY hook → execute 5x each → verify formula recommendations fire → write DEMO_READINESS.md.

**EXIT:** 3 demos pass 5/5 each. Demo hardener operational.

---

### P-P2-MS6: Golden Path Demos (Cross-Domain + Governance)

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS5 COMPLETE.

Define 2 cross-domain demos → execute through AutoPilot → run demo_hardener.py 5x each.

**EXIT:** 5 total demos pass reliably. Cross-domain routing correct.

---

### P-P2-MS7: Migration Gate Design

**Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P2-MS6 COMPLETE.

Write dual_run_validator.py → define 6 migration gate criteria → install PLATFORM-MIGRATION-GATE + PLATFORM-REGRESSION-FULL hooks → test with 10 queries.

**EXIT:** dual_run_validator.py works. 6 criteria defined. Both hooks installed.

---

### P-P2-MS8: Performance Baseline

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS7 COMPLETE.

Write/complete performance_benchmark.py → execute full 10-benchmark suite → install PLATFORM-PERF-GATE hook → record baselines.

**EXIT:** All 10 benchmarks recorded. PLATFORM-PERF-GATE installed. → Proceed to P-PERF-MS1 then **SU-3** (SAU-Full).

---

## PHASES P3-P4: AUTONOMY + ORCHESTRATION

**Sessions: 4-6 | Microsessions: 10 + SU-4 | Chats: 4 (Chats 8-10b)**

**PURPOSE:** Make the system autonomous and intelligent. After P3-P4, the system runs multi-session data campaigns surviving compaction, learns from errors, auto-deploys swarms.

**CHAT MAP:**
- Chat 8: P-P3-MS1 → MS2 → MS3
- Chat 9: P-P4-MS1 → P-P4-MS2 → P-P3-MS4
- Chat 10a: P-P4-MS3 → P-P4-MS4 → P-P3-MS5 → P-P3P4-MS-FINAL
- Chat 10b: P-PERF-MS2 → **SU-4**

---

### P-P3-MS1: ATCS as Primary Continuity + Batch Resilience

**Effort:** ~20 tool calls | **Quality Tier:** DEEP | **ENTRY:** P2 COMPLETE (SU-3 + SAU-Full passed).

Deploy Batch Resilience Framework → install 3 hooks (PLATFORM-BATCH-ERROR, PLATFORM-BATCH-PROGRESS, PLATFORM-SCHEMA-VERSION) → create campaign templates → test 10-item campaign with compaction at item 5 → verify resume at item 6 → verify dashboard.

**EXIT:** Batch resilience deployed. Templates created. Compaction recovery passes. Dashboard updating.

---

### P-P3-MS2: Recovery Manifest + ATCS-Aware Resume

**Effort:** ~12 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P3-MS1 COMPLETE.

Enhance ATCS recovery from COMPACTION_SURVIVAL.json → test crash mid-batch → cold restart → verify auto-resume → verify EMERGENCY_RESUME.md has ATCS detail.

**EXIT:** ATCS-aware resume tested with cold restart.

---

### P-P3-MS3: Manus ↔ ATCS Integration

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS2 COMPLETE.

Wire governance to ATCS → test governance intercept in autonomous mode → verify blocked operations → quarantine (not campaign halt).

**EXIT:** Governance active in autonomous mode. ATCS handles blocks through error policy.

---

### P-P4-MS1: AutoPilot as Default Entry Point

**Effort:** ~10 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS3 COMPLETE.

Configure AutoPilot as default → verify all query types route → verify GSD dynamic reading → test fallback for malformed queries.

**SAU NOTE:** AutoPilot is now the DEFAULT entry point. Update GSD_QUICK.md.

**EXIT:** AutoPilot is default entry. All query types route. Fallback works. GSD updated.

---

### P-P4-MS2: Swarm Auto-Deployment with Decision Matrices

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P4-MS1 COMPLETE.

Build decision matrix → wire cost estimates with swarm multipliers → test auto-deployment → verify cost accuracy for 5 tasks.

**EXIT:** Swarm auto-deployment working. Cost estimates include swarm overhead.

---

### P-P3-MS4: Learning Pipeline + Error Pattern Database

**Effort:** ~18 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P4-MS2 COMPLETE.

**STEPS:**

1. **Error Pattern Database — Build + Wire Consumer Chain:**
   - Create error_pattern_db.json schema: { pattern_id, error_signature, root_cause, fix_procedure, confidence, hit_count, last_seen }
   - Wire PLATFORM-ERROR-PATTERN hook: on ANY error from any dispatcher → match error message against known patterns → store new patterns, increment hit_count on matches
   - **CONSUMER (the missing wire):** Wire autoHookWrapper ERROR handler to QUERY error_pattern_db BEFORE returning error to user:
     ```
     Error occurs → PLATFORM-ERROR-PATTERN stores pattern
                  → autoHookWrapper.onError() calls errorPatternDB.findMatch(error)
                  → If match found (confidence > 0.7): inject fix_procedure into error response
                  → If match found (confidence > 0.9 AND hit_count > 5): AUTO-APPLY fix, retry operation
                  → Log resolution outcome back to pattern DB (feedback: did the fix work?)
     ```
   - Seed from SESSION_INSIGHTS.md: extract error patterns from all [REGRESSION] and [PATTERN] entries

2. **Formula Accuracy Tracker — Build + Wire Feedback Loop:**
   - Create formula_accuracy.json: { formula_id, material_class, operation_type, predictions[], actuals[], accuracy_score, last_updated }
   - Wire CalcHookMiddleware AFTER hook to log: predicted value + actual reference value (from published data) when available
   - **FEEDBACK LOOP (the missing wire):** Rewire PLATFORM-FORMULA-RECOMMEND (from P1-MS5) to READ formula_accuracy.json:
     ```
     Calculation requested → PLATFORM-FORMULA-RECOMMEND fires
       → Reads FORMULA_TASK_MAP.json (which formulas apply)
       → Reads formula_accuracy.json (which formulas perform best for this material+operation)
       → Weights recommendation: accuracy_score * relevance_score
       → Recommends highest-weighted formula (not just first match)
     ```
   - Test feedback loop: run same calculation twice with different accuracy histories → verify DIFFERENT formula is recommended

3. **Verification — Prove consumers work:**
   - Test error consumer: trigger a known error → verify fix_procedure appears in response → verify hit_count incremented
   - Test formula feedback: seed formula_accuracy with one formula at 0.95 and another at 0.60 → run calculation → verify high-accuracy formula is selected
   - Test auto-resolution: create pattern with confidence=0.95, hit_count=10, known fix → trigger matching error → verify auto-fix applied and retry succeeds

**EXIT:** Error pattern DB ≥ 15 entries. Auto-suggestion working (verified by consumer test). Auto-resolution working for high-confidence patterns. Formula accuracy feedback loop closed (verified by differential test). Learning pipeline operational with bidirectional data flow.

---

### P-P4-MS3: Pipeline Automation

**Effort:** ~10 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS4 COMPLETE.

Build automated multi-step pipelines → test 3 pipeline patterns end-to-end.

**EXIT:** 3 pipeline patterns operational.

---

### P-P4-MS4: Knowledge Graph Foundation

**Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P4-MS3 COMPLETE.

**STEPS:**

1. **Build Knowledge Graph using MemoryGraphEngine (685L, Tier 3):**
   - MemoryGraphEngine IS the knowledge graph backend — don't build a separate one
   - Import MemoryGraphEngine to src/engines/ NOW (don't wait for Tier 3 E3 import)
   - Graph schema: nodes = {materials, operations, tools, machines, formulas}, edges = {compatible_with, requires, produces, optimized_for}
   - Seed with core relationships: 4140→turning→carbide_insert, Ti-6Al-4V→roughing→ceramic_insert, etc. (≥50 edges from published machining handbooks)

2. **Wire Consumer #1 — PLATFORM-FORMULA-RECOMMEND reads graph:**
   ```
   Calculation for material X, operation Y:
     → PLATFORM-FORMULA-RECOMMEND fires
     → Queries MemoryGraphEngine: "what tools/formulas are connected to (X, Y)?"
     → Graph returns ranked edges by weight (weight = confidence * accuracy_score)
     → Recommendation includes graph-derived tool suggestions alongside formula accuracy data
   ```

3. **Wire Consumer #2 — AutoPilot uses graph for routing enrichment:**
   ```
   User query: "machine 316 stainless"
     → AutoPilot routes to prism_calc
     → BEFORE routing: AutoPilot queries graph for 316_stainless node
     → Graph returns: related operations, compatible tools, known problem areas (BUE risk)
     → AutoPilot enriches routing context with graph data
     → prism_calc receives enriched context → better recommendations
   ```

4. **Wire Consumer #3 — Data campaigns feed graph (M-M2):**
   ```
   M-M2 material batch validates entry for 7075-T6:
     → After Ω validation passes
     → MemoryGraphEngine.addEdges(7075_T6, validated_operations, validated_tools)
     → Graph grows automatically as data campaigns progress
     → By M-M2 batch 50: graph has thousands of edges from validated data
   ```

5. Query interface: prism_knowledge→query_graph(node, relationship_type, depth)
6. Test: query "what tools work with Ti-6Al-4V for roughing?" → verify graph returns ranked results → verify PLATFORM-FORMULA-RECOMMEND uses these results

**EXIT:** Knowledge graph queryable via MemoryGraphEngine. ≥50 core relationships seeded. PLATFORM-FORMULA-RECOMMEND reads graph (verified). AutoPilot routing enrichment working (verified). M-M2 graph-feed wire documented for M-M2-MS1.

---

### P-P3-MS5: Integration Test + UAT Prep

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P4-MS4 COMPLETE.

Full autonomous multi-phase integration test → write uat_session_runner.py (~200 lines) to C:\PRISM\scripts\ implementing all 8 UAT scenarios from P-UAT specification (Section 5) → prepare UAT scenario templates → create test scenario config files.

**HOOKS INSTALLED:** MFG-UAT-FEEDBACK

**EXIT:** Full integration passes. uat_session_runner.py operational and runs all 8 scenarios. UAT scenario templates created.

---

### P-P3P4-MS-FINAL: Phase Completion + Metrics + SU-4 Pre-Flight

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS5 COMPLETE.

Verify all P3-P4 components operational → collect metrics → run SU-4 pre-flight → document. → Proceed to Chat 10b for P-PERF-MS2 then **SU-4** (SAU-Full).

**SU-4 PRE-FLIGHT CHECKLIST (verify before proceeding to SU-4):**
1. ✅ 7 consumer chain tests ready: verify each engine's consumer is wired and callable
2. ✅ ATCS batch resilience: test campaign with checkpoint + simulated compaction
3. ✅ Error pattern DB has ≥ 5 entries from P0-P4 development
4. ✅ Formula accuracy tracker has baseline data from test calculations
5. ✅ uat_session_runner.py operational (created at P-P3-MS5)
6. ✅ ComputationCache (P0-MS6) has cached results from test calculations
7. ✅ All [DEFERRED] flags from P3-P4 resolved or documented with justification

**EXIT:** All P3-P4 components verified. SU-4 pre-flight 7/7 pass. Metrics recorded.

---

## MANUFACTURING TRACK: M-M0 THROUGH M-M3 (NEW in v7)

*This track runs in parallel with Enterprise phases. It populates the system with real manufacturing data and validates that data through production use. Cross-track dependencies are defined in Section 3.9.*

---

### PHASE M-M0: PLUGIN PACKAGING + DATA INFRASTRUCTURE

**Sessions: 2-3 | Microsessions: 5 | Chats: 2 (Chats 11-12)**

**PURPOSE:** Convert the manufacturing domain from hardcoded mcp-server integration to clean prism-platform plugin. Build the data pipeline infrastructure that M-M2 campaigns will use. After M-M0, manufacturing is a proper plugin with data ingestion, validation, and storage pipelines ready for batch operations.

**PREREQUISITES:** P2 COMPLETE (plugin architecture operational, manufacturing manifest exists with 27 dispatcher stubs).

**CHAT MAP:**
- Chat 11: M-M0-MS1 → MS2 → MS3
- Chat 12: M-M0-MS4 → MS5 → SAU-Light

---

#### M-M0-MS1: Manufacturing Plugin Activation

**Effort:** ~15 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P2 COMPLETE (SU-3 passed)
- prism-platform builds with manufacturing manifest (27 dispatcher stubs)
- Plugin loader tested (P2-MS1)

**STEPS:**

1. prism_dev→file_read: manufacturing manifest.json — verify all 27 dispatchers listed as stubs.
2. Identify the 5 CORE dispatchers that ALL other manufacturing operations depend on: prism_data (material/machine/tool/alarm lookup), prism_calc (speed_feed, force, power), prism_validate (calculation validation), prism_hook (manufacturing hooks), prism_context (manufacturing context). These import FIRST.
3. Import prism_data dispatcher from mcp-server to prism-platform manufacturing plugin. Adapt: register through PluginInterface, not hardcoded. Verify: material_lookup("4140"), machine_lookup("HAAS VF-2"), alarm_lookup("FANUC 414") all return data through plugin routing.
4. Import prism_calc dispatcher. Verify: speed_feed calculation routes through plugin and returns valid results.
5. Import prism_validate dispatcher. Verify: validate_calculation works for imported calcs.
6. prism_validate→validate_anti_regression for all 3 imported dispatchers.
7. Build prism-platform. Verify: 5 dispatchers ACTIVE, 22 dispatchers still STUB.

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_data, prism_calc, prism_validate→validate_anti_regression

**EXIT CONDITIONS:**
- 5 core dispatchers imported and functional through plugin routing
- material_lookup, machine_lookup, alarm_lookup, speed_feed all work through plugin
- 22 remaining dispatchers are stubs
- Anti-regression passes
- Build passes

**HANDOFF:** ROADMAP_TRACKER.md: M-M0-MS1 COMPLETE. IMPORT_LOG.md: 5 dispatchers imported with line counts. Stub count: 22.

---

#### M-M0-MS2: Data Ingestion Pipeline

**Effort:** ~18 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- M-M0-MS1 COMPLETE (core dispatchers functional)
- Registry loading > 95% (from P0-MS1)

**STEPS:**

0. **Data directory audit (against MASTER_INDEX §8):**
   ```
   prism_dev action=file_read path="C:\PRISM\data\materials"      → count JSON files (expect 64)
   prism_dev action=file_read path="C:\PRISM\data\machines"       → count JSON files (expect 37)
   prism_dev action=file_read path="C:\PRISM\data\controllers"    → count JSON files (expect 3)
   prism_dev action=file_read path="C:\PRISM\data\tools"          → count JSON files (expect 8)
   prism_dev action=file_read path="C:\PRISM\extracted\machines"  → count JSON files (expect 38)
   prism_dev action=file_read path="C:\PRISM\extracted\controllers" → count JSON files (expect 65)
   → Record actual counts as DATA_AUDIT_BASELINE
   → If counts deviate from MASTER_INDEX by >5% → flag [DATA_DRIFT] before proceeding
   ```
   **Data directory strategy:** Use Windows junction points (`mklink /J prism-platform\data C:\PRISM\data`, no admin privileges required) from prism-platform/data/ to same directories (data is ~3.2MB, copying creates drift risk). Both codebases read from the same files. dual_run_validator.py will later verify file counts, sizes, and JSON structure parity.
   **IMPORTANT:** Do NOT use `mklink` without `/J` — standard symlinks require admin/Developer Mode on Windows. Junction points (`/J`) work without elevation. Fallback if junctions fail: add `DATA_ROOT` config to prism-platform .env pointing to `C:\PRISM\data` and resolve all data paths through config.
   **JUNCTION POINT EDGE CASES (NEW in v8.4):**
   ```
   KNOWN LIMITATIONS:
   - Junction points only work for DIRECTORIES, not individual files (this is fine — we junction data/)
   - Junction points do NOT work across drives (C: → D: fails). Both codebases must be on same drive.
   - Some antivirus software (Symantec, McAfee) may flag junction traversal — add PRISM dirs to exclusions
   - WSL2: Junction points are NOT visible from WSL2 Linux filesystem. If dev moves to WSL2:
     → Use config-based DATA_ROOT fallback (not junctions)
     → Both codebases must resolve data paths through config
     → Test: verify material_lookup("4140") returns data through config path

   FALLBACK CHAIN (in priority order):
   1. Junction point: mklink /J prism-platform\data C:\PRISM\data
   2. DATA_ROOT config: DATA_ROOT=C:\PRISM\data in prism-platform/.env
   3. Data copy: cp -r C:\PRISM\data prism-platform\data (LAST RESORT — creates drift risk)
      → If using copy: add data_sync_check to SAU-Light (compare file counts + sizes)

   VALIDATION AT M-M0-MS2:
   - Whichever method is used: verify BOTH codebases return identical results for:
     material_lookup("4140"), machine_lookup("HAAS VF-2"), alarm_lookup("FANUC 414")
   - Document method in PLATFORM_STATE.md: "Data access: [junction|config|copy]"
   ```
1. Design data ingestion pipeline for batch campaigns:
   - Input: raw data files (JSON, CSV) from data/ directories
   - Validation: schema check → value range check → cross-reference check → Ω scoring
   - Storage: validated entries written to registry with full audit trail
   - Quarantine: entries failing validation go to QUARANTINE_LOG.md with reason
2. Write data_ingestion_pipeline.py (~300 lines) to C:\PRISM\scripts\:
   - Accepts: material|machine|alarm type, input file path, batch_size, omega_threshold
   - Validates each entry against schema + known physical constraints
   - Scores each entry with Ω (omega) — reject if < threshold
   - Writes accepted entries to registry
   - Writes quarantined entries to log with failure reason
   - Returns: accepted_count, quarantined_count, error_count
3. Write mfg_batch_validator.py (~150 lines) to C:\PRISM\scripts\:
   - Post-batch validation: compares loaded registry state against expected counts
   - Cross-references material-machine-tool relationships for consistency
   - Reports: total entries, validated entries, quarantine rate, Ω distribution
4. Test ingestion pipeline with 10 known materials (including edge cases: exotic alloys, extreme hardness values).
5. Test quarantine: feed 2 intentionally invalid entries (impossible cutting speed, negative hardness) — verify quarantine.
6. Build prism-platform.

**TOOLS:** prism_dev→file_write, prism_data, prism_validate

**EXIT CONDITIONS:**
- data_ingestion_pipeline.py operational
- mfg_batch_validator.py operational
- 10 test materials ingested successfully
- 2 invalid entries quarantined correctly
- Pipeline outputs full audit trail
- Build passes

**HANDOFF:** Pipeline paths documented. Test results recorded.

---

#### M-M0-MS3: Campaign Dashboard + Batch Numbering

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- M-M0-MS2 COMPLETE (ingestion pipeline operational)

**STEPS:**

1. Design campaign dashboard state file: C:\PRISM\state\CAMPAIGN_DASHBOARD.json
   ```json
   {
     "schema_version": 1,
     "materials": { "total_batches": 0, "completed_batches": 0, "total_entries": 0, "validated_entries": 0, "quarantined": 0, "current_batch": null },
     "machines": { ... },
     "alarms": { ... },
     "last_updated": "ISO timestamp",
     "campaign_start": null,
     "estimated_completion": null,
     "last_clean_snapshot": { "materials": null, "machines": null, "alarms": null },
     "snapshot_log": [],
     "swarm_config": {}
   }
   ```
   **Schema migration (NEW in v8.2):** On load, if schema_version < current expected → run dashboard_schema_migrator: add missing fields with defaults, bump version. Prevents crashes when dashboard evolves over ~40-batch campaign.
2. **BATCH NUMBERING PROTOCOL:** Each batch is numbered sequentially per category starting at 1. A "batch" = one execution of data_ingestion_pipeline.py with batch_size entries. Batch N for materials means material entries (N-1)*batch_size+1 through N*batch_size have been processed.
   - Material batches: batch_size=50, so batch 1 = entries 1-50, batch 20 = entries 951-1000
   - Machine batches: batch_size=25
   - Alarm batches: batch_size=100
   - **P-UAT-MS1 trigger: "M-M2 batch 20 complete" = 1,000 material entries processed (≥900 validated at ≤10% quarantine)**
3. Write campaign_dashboard_updater.py (~100 lines): reads pipeline output, updates dashboard, calculates progress and ETA.
4. Wire dashboard update to PLATFORM-BATCH-PROGRESS hook (installed in P3-MS1).
5. Test: run test batch → verify dashboard updates → verify batch number increments.

**TOOLS:** prism_dev→file_write, prism_hook→execute

**EXIT CONDITIONS:**
- CAMPAIGN_DASHBOARD.json created with schema
- Batch numbering protocol documented and implemented
- Dashboard updates on batch completion
- Batch 20 = 1,000 materials is explicitly defined (UAT trigger)

**HANDOFF:** Dashboard path. Batch numbering protocol. UAT trigger definition.

---

#### M-M0-MS4: Remaining Dispatcher Import (Batch 1)

**Effort:** ~18 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- M-M0-MS3 COMPLETE
- 5 core dispatchers active, 22 stubs remaining

**STEPS:**

1. Prioritize remaining 22 dispatchers by dependency order and usage frequency.
2. Import next 11 dispatchers (batch 1 of 2): focus on dispatchers that M-M2 campaigns need:
   - prism_tool (tool lookup, tool life prediction)
   - prism_alarm (alarm decode, fix procedure)
   - prism_machine (machine capability, specification lookup)
   - prism_report (calculation reports, parameter summaries)
   - prism_optimize (cutting parameter optimization)
   - prism_thermal (thermal analysis)
   - prism_force (cutting force calculations)
   - prism_surface (surface finish prediction)
   - prism_wear (tool wear modeling)
   - prism_coolant (coolant selection)
   - prism_fixture (fixture recommendations)
3. For each: import → adapt to plugin → anti-regression → test representative action.
4. Build prism-platform. Verify: 16 dispatchers ACTIVE, 11 stubs remaining.

**TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_validate→validate_anti_regression

**EXIT CONDITIONS:**
- 16 dispatchers active through plugin routing
- 11 stubs remaining (non-critical for M-M2)
- Anti-regression passes for all imports
- Build passes

**HANDOFF:** IMPORT_LOG.md updated with 11 new imports. Stub count: 11.

---

#### M-M0-MS5: Remaining Dispatcher Import (Batch 2) + SAU-Light

**Effort:** ~20 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- M-M0-MS4 COMPLETE

**STEPS:**

1. Import remaining 11 dispatchers. Same pattern: import → adapt → anti-regression → test.
2. After all 27 dispatchers active: run full integration test — one representative action per dispatcher.
3. Verify AutoPilot routes manufacturing queries to all 27 dispatchers correctly.
4. **SAU-Light:** Update GSD with full manufacturing plugin routing. Regenerate PRISM_QUICK_REF.md. Update Claude memory: M-M0 complete, 27 dispatchers active through plugin, data pipeline ready.

**EXIT CONDITIONS:**
- All 27 dispatchers active through manufacturing plugin (zero stubs)
- Full integration test passes
- AutoPilot routes all manufacturing query types
- SAU-Light complete
- Build passes

**HANDOFF:** ROADMAP_TRACKER.md: M-M0 COMPLETE. IMPORT_LOG.md: all 27 dispatchers. → M-M0 PHASE COMPLETE.

---

### PHASE M-M1: KNOWLEDGE RECOVERY + VALIDATION

**Sessions: 2-3 | Microsessions: 4 | Chats: 2 (Chats 13-14)**

**PURPOSE:** Recover manufacturing knowledge that was lost or degraded during previous development. Validate that all physics calculations, material parameters, and machine specifications are accurate against published reference data. After M-M1, the calculation foundation is verified correct before mass data ingestion begins.

**PREREQUISITES:** M-M0 COMPLETE.

**CHAT MAP:**
- Chat 13: M-M1-MS1 → MS2
- Chat 14: M-M1-MS3 → MS4 → SAU-Light

---

#### M-M1-MS1: Physics Calculation Audit

**Effort:** ~18 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- M-M0 COMPLETE (all dispatchers active)
- Calc bug (GAP-002) was fixed in P0-MS4

**STEPS:**

1. Systematic audit of ALL calculation engines against published reference data:
   - Kienzle cutting force model: verify kc1.1 and mc coefficients for 10 material groups against Altintas (2012) or equivalent reference
   - Taylor tool life: verify exponents for carbide, HSS, ceramic against Kalpakjian reference values
   - Johnson-Cook: verify A, B, C, n, m parameters for 4140, Ti-6Al-4V, Al 6061, Inconel 718 against published data
   - Surface roughness: verify Ra prediction against theoretical values for given nose radius and feed rate
2. For each calculation engine: run 5 test cases with known answers from published tables. Document: input, expected output, actual output, deviation.
3. Any calculation with deviation > ±5% from published reference: flag [CALC_DEVIATION] with root cause analysis.
4. Fix any deviations. Re-run tests. Verify S(x) ≥ 0.70 for all.
5. Document all reference sources used for validation in CALC_REFERENCE_LOG.md.

**TOOLS:** prism_calc, prism_validate→validate_calculation, prism_data→material_lookup

**EXIT CONDITIONS:**
- All calculation engines audited against published references
- Deviation < ±5% for all engines (or root cause documented)
- S(x) ≥ 0.70 for all test cases
- CALC_REFERENCE_LOG.md created
- Reference sources documented

**HANDOFF:** Calculation audit results. Reference sources. Any [CALC_DEVIATION] flags.

---

#### M-M1-MS2: Material Parameter Validation

**Effort:** ~18 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- M-M1-MS1 COMPLETE (calculations verified)

**STEPS:**

1. For ALL currently loaded materials (from P0-MS1 registry fix):
   - Verify Kienzle coefficients exist and are within published ranges
   - Verify Johnson-Cook parameters exist for materials that have them
   - Verify hardness ranges are physically realistic
   - Verify thermal conductivity, specific heat, density values match published data
2. Cross-reference: for materials with multiple condition states (e.g., 4140 annealed vs Q&T 50 HRC), verify DIFFERENT parameters exist for each condition. Same parameters for different conditions → ERROR.
3. Machine specification validation: for all loaded machines, verify:
   - Max RPM within manufacturer specs
   - Power ratings match published values
   - Axis travel within spec
4. Flag any missing or inconsistent parameters as [PARAM_GAP] with specific fields needed.
5. Generate VALIDATION_REPORT.md: total validated, total gaps, gap categories.

**TOOLS:** prism_data (all lookups), prism_validate

**EXIT CONDITIONS:**
- All loaded materials validated against published data
- Multi-condition materials have distinct parameters per condition
- Machine specifications verified against manufacturer data
- VALIDATION_REPORT.md created
- All [PARAM_GAP] flags documented

**HANDOFF:** Validation report. Gap summary.

---

#### M-M1-MS3: Alarm Code Verification

**Effort:** ~15 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- M-M1-MS2 COMPLETE

**STEPS:**

1. For each controller family (FANUC, HAAS, Siemens, Okuma, Mazak, Heidenhain, and 6 others):
   - Verify alarm code format matches controller documentation
   - Verify fix procedures are actionable (not generic "contact service")
   - Verify severity classifications are consistent
2. Test alarm decode chain: for 5 representative alarms across different controllers:
   - Trigger alarm_lookup → verify decode returns
   - Verify fix procedure is specific to the alarm
   - Verify related alarms are cross-referenced
3. Flag alarms with generic fix procedures as [ALARM_QUALITY] for enrichment during M-M2.
4. Document alarm coverage: loaded vs available per controller family.

**TOOLS:** prism_data→alarm_lookup, prism_validate

**EXIT CONDITIONS:**
- Alarm codes verified for all 12 controller families
- Fix procedures verified actionable for loaded alarms
- [ALARM_QUALITY] flags on generic procedures
- Coverage documented per controller family

**HANDOFF:** Alarm verification results. Coverage by controller family.

---

#### M-M1-MS4: Safety-Critical Test Matrix Seed + SAU-Light

**Effort:** ~15 tool calls | **Quality Tier:** RELEASE

**ENTRY CONDITIONS:**
- M-M1-MS3 COMPLETE

**STEPS:**

1. Write safety_calc_test_matrix.py (~200 lines) implementing the 50-calculation test matrix (Section 15). This script:
   - Runs all 50 calculations against both codebases
   - Compares results within ±2σ tolerance
   - Reports: pass/fail per category, max deviation, overall status
   - HARD BLOCK if any safety-critical calculation fails
2. Execute test matrix against mcp-server. Record baseline results.
3. Execute test matrix against prism-platform. Record results. Compare.
4. Any prism-platform deviation from mcp-server > ±2σ: flag [CALC_PARITY] and debug.
5. **SAU-Light:** Update GSD with validated calculation routing. Update Claude memory: M-M1 complete, physics verified, test matrix operational.

**TOOLS:** prism_calc, prism_validate, prism_dev→file_write

**EXIT CONDITIONS:**
- safety_calc_test_matrix.py operational
- 50 calculations pass on mcp-server
- prism-platform results within ±2σ of mcp-server (or [CALC_PARITY] flags documented)
- SAU-Light complete

**HANDOFF:** ROADMAP_TRACKER.md: M-M1 COMPLETE. Test matrix baselines. → M-M1 PHASE COMPLETE.

---

### PHASE M-M2: DATA CAMPAIGNS

**Sessions: 15-25 | Microsessions: Batch-driven (see below) | Chats: ~15-25 (Chats 15-35+, interleaved with Enterprise)**

**PURPOSE:** Populate the manufacturing knowledge base with validated data through systematic batch campaigns. This is the longest-running phase in the project. It runs in parallel with E1-E3 enterprise phases. After M-M2, the system has production-grade manufacturing data coverage.

**PREREQUISITES:** M-M1 COMPLETE + P3-MS1 COMPLETE (batch resilience operational) + registries loading > 95% (P0-MS1).

**CROSS-TRACK DEPENDENCIES:** See Section 3.9 for timing dependencies with Enterprise phases.

**HUMAN VALIDATION GATES (NEW in v8.5):**
```
WHY THIS EXISTS:
  The validation chain is self-referential: Claude ingests source data, Claude validates
  it against Ω thresholds, Claude runs the test matrix, Claude certifies. If the source
  data has systematic errors (wrong units, misattributed alloy family, incorrect hardness
  ranges), the self-referential chain cannot detect it because it validates against the
  same data it ingested. A human with shop floor experience can catch errors that pass
  mathematical validation but are physically wrong.

GATE H-1: M-M2 Batch 10 (~week 20) — "First Contact"
  TRIGGER: M-M2 SAU-Light at batch 10 (250+ material entries validated)
  PROCEDURE:
    1. Export 10 random material entries as HUMAN_REVIEW_BATCH10.json:
       → 3 common steels (4140, 1045, A2 tool steel or similar)
       → 3 aluminum alloys (6061, 7075, 2024 or similar)
       → 2 stainless steels (304, 316 or similar)
       → 2 specialty (titanium, Inconel, or whatever is available)
    2. For each entry, extract and present in readable format:
       → Kienzle kc1.1 and mc coefficients
       → Recommended cutting speed range (SFM) for roughing and finishing
       → Recommended feed per tooth range for typical endmill diameters
       → Hardness range and condition state
    3. Provide to manufacturing engineer / machinist with the question:
       "Do these numbers match your experience? Would you trust these parameters
       to run a first article on your machine?"
    4. Document feedback in HUMAN_REVIEW_LOG.md:
       → [CONFIRMED] Entry X: parameters within operator's expected range
       → [SUSPICIOUS] Entry X: [parameter] seems [high/low] for [material]
       → [REJECTED] Entry X: [parameter] is physically wrong because [reason]
    5. Any [REJECTED] entry → trace source data → investigate entire alloy family
       → potential campaign rollback per Section 6.4 if systematic
    6. Any [SUSPICIOUS] entry → widen uncertainty band, flag for follow-up at H-2
  EXIT: HUMAN_REVIEW_LOG.md exists for batch 10. Zero [REJECTED] entries OR
  rollback initiated. Results inform remaining campaign execution.
  EFFORT: ~30 min of engineer time. Batch export is automated.

GATE H-2: M-M2 Batch 20 (~week 28) — "Coverage + Calculation Validation"
  TRIGGER: P-UAT-MS1 trigger (≥900 validated materials, 1,000 processed)
  PROCEDURE:
    1. Export 10 entries focusing on EDGE CASES:
       → 3 entries from alloy families with highest quarantine rates
       → 3 entries at extreme hardness ranges (annealed vs Q&T 50+ HRC)
       → 2 entries from the most recently ingested batches
       → 2 entries randomly selected from different alloy families than H-1
    2. Same review format as H-1
    3. Additionally: present 3 CALCULATION OUTPUTS (not just raw data):
       → Run prism_calc→speed_feed for a common roughing scenario
       → Run prism_calc→tool_life for a typical insert
       → Run prism_calc→cutting_force for a slotting operation
       → Ask: "Would you run these parameters on your machine?"
    4. Document in HUMAN_REVIEW_LOG.md (append)
  EXIT: H-2 results documented. Calculation outputs confirmed reasonable.
  BLOCKS: P-UAT-MS1 cannot proceed if ANY calculation output is [REJECTED].

GATE H-3: M-M2 Batch 30 (~week 35) — "Machine + Alarm + Compliance Validation"
  TRIGGER: SAU-Light at batch 30 (machines approaching complete)
  PROCEDURE:
    1. Export 5 machine entries:
       → Verify max RPM, max feed rate, axis travel match published specs
       → Cross-reference: can this machine physically execute the recommended
         cutting parameters for [steel X] from the materials database?
    2. Export 5 alarm entries from the operator's controller family:
       → Ask: "Is this fix procedure what you would actually do?"
       → Alarm fix procedures that say "contact service" are FAILURES —
         operators need actionable steps
    3. If M-M3 has started: present 3 sample compliance artifacts:
       → Material certification record, process validation record, nonconformity record
       → Ask: "Would these records satisfy your quality auditor?"
    4. Document in HUMAN_REVIEW_LOG.md (append)
  EXIT: Machine specs confirmed against published data. Alarm fixes confirmed
  actionable. Any generic "contact service" alarm procedures flagged for enrichment.
```

**QUARANTINE BUDGET PROTOCOL (NEW in v8.5):**
```
PROBLEM:
  A batch with 5 quarantine items consumes the entire session in resolution
  (root cause → fix → re-validate → document = ~3 tool calls per item = 15 calls).
  This produces zero batch throughput for that session.

SOLUTION — QUARANTINE DEFERRED RESOLUTION:
  During steady-state batch execution, quarantine resolution is TIME-BOXED:

  PER SESSION:
    → First 80% of tool call budget: batch processing (pipeline → validate → checkpoint)
    → Last 20% of budget: quarantine triage (classify, not resolve)
    → Quarantine items classified as:
      [Q-IMMEDIATE]: S(x) failure, data corruption, physically impossible values
        → Resolve NOW, consuming remaining budget
      [Q-DEFERRED]: Ω < 0.70 but not safety-critical, source conflict, marginal params
        → Log to QUARANTINE_BACKLOG.json with batch number and failure reason
        → Resolve in dedicated quarantine-resolution sessions (see below)

  QUARANTINE RESOLUTION SESSIONS (every 5th M-M2 session):
    → Dedicate 1 session to quarantine backlog resolution
    → Entry: read QUARANTINE_BACKLOG.json
    → Process [Q-DEFERRED] items: root cause → fix → re-validate → accept or reject
    → Exit: QUARANTINE_BACKLOG.json updated, resolved items removed
    → This prevents quarantine debt from accumulating indefinitely

  QUARANTINE DEBT CEILING:
    → If QUARANTINE_BACKLOG.json exceeds 50 unresolved items: STOP batches
    → Dedicate next 2 sessions to full quarantine resolution
    → Resume batches only when backlog < 25 items

  THROUGHPUT DEGRADATION TRIGGER:
    → If by M-M2 batch 15 (~session 5), average throughput < 3 batches/session:
      1. Analyze root cause: quarantine handling? source data quality? tool call budget?
      2. If quarantine rate > 8% sustained: activate full quarantine triage above
      3. If tool call budget is bottleneck: increase MS limit to 20 for M-M2 batch sessions
      4. If source data quality: pause campaign, focus 2 sessions on source audit
      5. Document in CAMPAIGN_DASHBOARD: [THROUGHPUT_DEGRADED] with cause and plan
    → If average throughput stays below 2 batches/session for 10+ sessions:
      Emergency Off-Ramp trigger #5 (Section 3.11) fires.
```

**INTERLEAVING OVERHEAD BUDGET (NEW in v8.5):**
```
Every session that switches tracks (M-M2 ↔ Enterprise) costs ~2-3 tool calls:
  - Read TASK_QUEUE.json (ATCS state)
  - Read dependency table (Section 3.9)
  - Determine which track to execute
This is NOT free. Budget 2 tool calls at the START of every interleaved session.
Effective tool call budget for MS work: 13 (not 15) during interleaving period.
```

---

#### M-M2 Campaign Structure

Each data campaign follows this cycle:

```
BATCH CYCLE:
1. Load raw data file(s) for this batch
2. Run data_ingestion_pipeline.py with appropriate template:
   - Materials: batch_size=50, omega_threshold=0.70
   - Machines: batch_size=25, omega_threshold=0.70
   - Alarms: batch_size=100, omega_threshold=0.65
3. Review pipeline output: accepted, quarantined, errors
4. If quarantine rate > 10%: STOP, investigate root cause before next batch
5. Update CAMPAIGN_DASHBOARD.json via campaign_dashboard_updater.py
6. ATCS checkpoint (compaction survival)
7. Every 5th batch: run mfg_batch_validator.py for cross-reference validation
8. Every 10th batch: SAU-Light (GSD + quick-ref + Claude memory)

QUALITY TIERS FOR BATCH OPERATIONS:
  - Individual entry validation: QUICK (S(x) only, 0 API calls, <1s per entry)
  - Every 50th entry: DEEP (ralph_loop, 4-7 API calls, ~30s) — spot-check quality
  - Batch-level validation (every 5th batch): STANDARD (scrutinize, 1 call, ~5s)
  - Phase exits (M-M1 COMPLETE, M-M2 COMPLETE): RELEASE (assess+compute, ~45s)
```

#### Swarm Pattern Assignments for M-M2 Campaigns

Each campaign type uses a specific swarm pattern for optimal throughput. Configure all 5 patterns in M-M2-MS1 Step 3. Store config in CAMPAIGN_DASHBOARD.json under `swarm_config`. Test each with 3 sample entries before full campaign.

```
MATERIALS:  map_reduce swarm
  → 5 Haiku agents split material entries by alloy family
  → Each agent validates independently against Kienzle/Johnson-Cook constraints
  → Reducer merges results, resolves conflicts, generates batch summary
  → Throughput: ~10 entries/min

MACHINES:   specialist_team swarm
  → 4 agents specialized by machine type (mill, lathe, multi-axis, EDM)
  → Each validates specs against manufacturer data for their type
  → Team lead agent cross-references tool capacity vs material requirements
  → Throughput: ~8 entries/min

ALARMS:     pipeline swarm
  → 3-stage pipeline: decode → verify_fix_procedure → cross_reference_related
  → Each stage runs independently, entries flow through
  → Highest throughput for high-volume alarm processing
  → Throughput: ~15 entries/min

VALIDATION: redundant_verify swarm
  → 2 independent validators check same batch results
  → Disagreements flagged for manual review
  → Used for every 5th-batch validation gate
  → Throughput: ~5 min/batch

CROSS-BATCH: consensus swarm
  → 3 agents analyze: range distribution, statistical consistency, reference comparison
  → Used for every 10th-batch deep consistency check
  → Detects drift patterns across batch boundaries
  → Throughput: ~10 min/check
```

Configure all 5 swarm patterns at M-M2-MS1 Step 3. Store config in CAMPAIGN_DASHBOARD.json under `swarm_config`. Test each with 3 sample entries before full campaign.

#### M-M2 Milestone Map

| Batch # | Materials | Machines | Alarms | Milestone | Cross-Track |
|---------|-----------|----------|--------|-----------|-------------|
| 1-5 | 250 entries | 125 entries | 500 entries | Campaign stabilization | E1 can use as WAL test data |
| 10 | 500 entries | 250 entries | 1,000 entries | SAU-Light. **H-1 human gate (v8.5).** E2 cost calibration possible. | E2-MS3 unblocked |
| 15 | 750 entries | 375 entries | 1,500 entries | E2 finance export possible | E2-MS7 unblocked |
| 20 | **1,000 entries** | 500 entries | 2,000 entries | **P-UAT-MS1 TRIGGER. H-2 human gate (v8.5).** | UAT with real data |
| 30 | 1,500 entries | ~750/RAW_AVAILABLE | 3,000 entries | SAU-Light. **H-3 human gate (v8.5).** Machines approaching RAW_AVAILABLE (~750/824). | E3 telemetry has real data |
| 40 | 2,000 entries | — | 4,000 entries | Materials campaign past 50% | — |
| 50+ | 2,500+ entries | — | 5,000+ entries | Approaching RAW_AVAILABLE ceiling | — |
| FINAL | RAW_AVAILABLE | RAW_AVAILABLE | RAW_AVAILABLE | Campaign complete | E4 replication has full data |

**Campaign Plateau Contingency (NEW in v8.3):**
```
CAMPAIGN CEILING DETECTION:
  If 3 consecutive batches show < 5% net new validated entries (after quarantine):
  1. FLAG: [CAMPAIGN_CEILING] in CAMPAIGN_LOG.md
  2. ANALYZE: quarantine rate — if > 40%, data quality issue (fix data, not campaign)
  3. ANALYZE: remaining RAW_AVAILABLE — if < 10% unprocessed, campaign is legitimately complete
  4. DECISION:
     a. If systematic invalidity (bad schema, impossible values): fix data source → re-run failed batch
     b. If legitimate ceiling (all valid data processed): mark category COMPLETE at current count
     c. If quarantine-heavy (>40%): triage quarantined entries — some may be recoverable with relaxed constraints
  5. DOCUMENT: "Materials: X/RAW_AVAILABLE (Y% coverage), ceiling reason: [reason]"
  6. DO NOT block downstream consumers (E3, E4, M-FINAL) on theoretical 100% — 
     actual coverage with [CAMPAIGN_CEILING] documented is sufficient for M-FINAL gate #4.
```

#### M-M2 First Cycle Microsessions (Batches 1-5, fully specified)

---

##### M-M2-MS1: Campaign Initialization

**Effort:** ~12 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- M-M1 COMPLETE (knowledge validated)
- P3-MS1 COMPLETE (batch resilience operational)
- Campaign templates exist (created in SU-4)
- CAMPAIGN_DASHBOARD.json exists (from M-M0-MS3)

**STEPS:**

1. Verify all prerequisites: batch resilience, templates, dashboard, registries.
2. Load material_batch_template.json. Configure for first batch: source files, output registry, quarantine log.
3. **Configure swarm patterns:** Set up all 5 patterns from M-M2 Swarm Pattern Assignments section. Write config to CAMPAIGN_DASHBOARD.json `swarm_config`. Test map_reduce with 3 sample materials before running full batch.
4. Run data_ingestion_pipeline.py for material batch 1 (entries 1-50) using map_reduce swarm. Monitor: acceptance rate, quarantine rate, Ω scores.
5. Run mfg_batch_validator.py on batch 1 results using redundant_verify swarm. Verify cross-references.
6. Update CAMPAIGN_DASHBOARD.json. Verify batch 1 recorded.
7. If quarantine rate > 10%: diagnose. Common causes: schema mismatch, unit conversion errors, missing reference data. Fix root cause before batch 2.
8. ATCS checkpoint.

**TOOLS:** prism_data, prism_validate, prism_hook→execute, ATCS checkpoint

**EXIT CONDITIONS:**
- Material batch 1 complete: ≥ 45/50 accepted (quarantine ≤ 10%)
- CAMPAIGN_DASHBOARD updated
- ATCS checkpoint written
- Any quarantine root causes documented

**HANDOFF:** Batch 1 results. Quarantine analysis if applicable.

---

##### M-M2-MS2: Machine + Alarm Campaign Start

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- M-M2-MS1 COMPLETE (material batch 1 successful)

**STEPS:**

1. Load machine_batch_template.json. Run machine batch 1 (entries 1-25).
2. Validate machine entries: verify specs against manufacturer data where available.
3. Load alarm_batch_template.json. Run alarm batch 1 (entries 1-100).
4. Validate alarm entries: verify fix procedures are actionable.
5. Update CAMPAIGN_DASHBOARD for all three categories.
6. ATCS checkpoint.

**EXIT CONDITIONS:**
- Machine batch 1: ≥ 22/25 accepted
- Alarm batch 1: ≥ 90/100 accepted (alarm threshold is 0.65)
- Dashboard updated for all categories
- ATCS checkpoint written

**HANDOFF:** Batch results for all three categories.

---

##### M-M2-MS3: Material Batches 2-3 + Error Pattern Enrichment

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- M-M2-MS2 COMPLETE

**STEPS:**

1. Run material batches 2 and 3 (entries 51-150).
2. After each batch: update dashboard, ATCS checkpoint.
3. Analyze quarantine patterns across batches 1-3. Identify systematic issues.
4. Feed quarantine patterns into PLATFORM-ERROR-PATTERN database — these are REAL manufacturing data errors, not test errors. High value for the learning pipeline.
5. Run mfg_batch_validator.py on cumulative results (150 entries). Check for cross-reference inconsistencies.

**EXIT CONDITIONS:**
- Material batches 2-3 complete with < 10% quarantine each
- Error patterns from quarantine fed to learning pipeline
- Cumulative validation passes
- Dashboard current

**HANDOFF:** Cumulative results. Error patterns discovered.

---

##### M-M2-MS4: Machine Batches 2-3 + Alarm Batches 2-3

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- M-M2-MS3 COMPLETE

**STEPS:**

1. Run machine batches 2-3 (entries 26-75). Validate.
2. Run alarm batches 2-3 (entries 101-300). Validate.
3. Cross-reference: do machine capabilities align with material cutting parameters? (e.g., machine max RPM sufficient for recommended cutting speed at min diameter?)
4. Update dashboard. ATCS checkpoint.

**EXIT CONDITIONS:**
- Machine batches 2-3 complete
- Alarm batches 2-3 complete
- Cross-reference validation passes
- Dashboard current

**HANDOFF:** Results. Cross-reference findings.

---

##### M-M2-MS5: Material Batches 4-5 + First Validation Gate

**Effort:** ~18 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- M-M2-MS4 COMPLETE

**STEPS:**

1. Run material batches 4-5 (entries 151-250).
2. **FIRST VALIDATION GATE (batch 5):** Run mfg_batch_validator.py comprehensive mode:
   - Total entries validated across all categories
   - Quarantine rate trending (improving? worsening?)
   - Ω score distribution (are scores clustered near threshold or well above?)
   - Material coverage by alloy family (steels, aluminums, titaniums, nickel alloys, etc.)
   - Identify coverage gaps: which alloy families are underrepresented?
3. Generate M-M2 PROGRESS_REPORT.md with: entry counts, quarantine analysis, coverage analysis, estimated batches to RAW_AVAILABLE.
4. Update dashboard. ATCS checkpoint.

**EXIT CONDITIONS:**
- 250 material entries, 75 machine entries, 300 alarm entries loaded
- Quarantine rate < 10% for most recent batch
- PROGRESS_REPORT.md generated
- Coverage gaps identified
- Dashboard current

**HANDOFF:** Progress report. Coverage gaps for prioritization.

---

##### M-M2-MS6: Campaign Steady State Protocol

**Effort:** ~10 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- M-M2-MS5 COMPLETE (first validation gate passed)

**STEPS:**

1. Document the steady-state campaign protocol for remaining batches:
   ```
   STEADY STATE (batches 6+):
   Every batch: pipeline → validate → dashboard → ATCS checkpoint
   Every 5th batch: mfg_batch_validator.py comprehensive
   Every 10th batch: SAU-Light + progress report
   At batch 20: P-UAT-MS1 trigger (1,000 materials)
   At batch 30: SAU-Light + machines likely complete
   At RAW_AVAILABLE: campaign complete for that category
   ```
2. Configure ATCS for autonomous batch execution: queue remaining batches as ATCS tasks with checkpoint_every=2.
3. Test autonomous execution: queue batches 6-8, let ATCS execute with checkpoints.
4. Verify: if compaction hits during autonomous execution, ATCS resumes correctly.

**ATCS EXECUTION MODEL — CRITICAL CLARIFICATION (NEW in v8.4):**
```
ATCS is NOT a background daemon. It has no persistent process between Claude sessions.
"Autonomous" means: ATCS maintains a QUEUE of pending work that EXECUTES when a 
Claude session starts and invokes prism_dev→session_boot.

HOW IT WORKS:
  1. M-M2-MS6 queues batches 6+ as ATCS tasks (with checkpoint_every=2)
  2. ATCS writes queued tasks to C:\PRISM\autonomous-tasks\TASK_QUEUE.json
  3. On next session start: SessionLifecycleEngine reads TASK_QUEUE.json
  4. If queued tasks exist AND current chat is an M-M2 chat: ATCS auto-starts next batch
  5. ATCS processes batches WITHIN the active session, checkpointing every 2 batches
  6. On session end or compaction: ATCS writes checkpoint, remaining tasks stay queued
  7. Next session: ATCS resumes from checkpoint

THROUGHPUT IMPLICATIONS:
  - Batches only advance during active Claude sessions (not between sessions)
  - At ~3-5 batches per M-M2 chat, reaching batch 50+ requires ~10-15 M-M2 chats
  - This is accounted for in the interleaving protocol: M-M2 chats alternate with Enterprise
  - Estimated campaign duration: weeks 15-44 (~30 weeks, not continuous)
  - Total M-M2 chats needed: ~15-20 (interleaved with Enterprise chats 18-44)

WHAT "AUTONOMOUS" ACTUALLY MEANS:
  - Zero manual batch configuration after M-M2-MS6 (ATCS handles sequencing)
  - Zero manual checkpoint management (ATCS handles recovery)
  - Zero manual campaign tracking (dashboard auto-updates)
  - The operator just starts sessions — ATCS handles the rest WITHIN sessions
```

**EXIT CONDITIONS:**
- Steady-state protocol documented and tested
- ATCS autonomous execution verified (queue → session start → auto-execute → checkpoint)
- Compaction recovery during batch execution verified
- Campaign can proceed with minimal per-session supervision
- TASK_QUEUE.json format documented in HANDOFF.json

**HANDOFF:** ROADMAP_TRACKER.md: M-M2 steady state established. ATCS managing batch queue. Campaign continues via ATCS queue-and-execute model with checkpoints at defined intervals. → Remaining M-M2 batches execute per steady-state protocol when M-M2 sessions are started, interleaved with Enterprise track chats.

---

### PHASE M-M3: COMPLIANCE + MANUFACTURING PLUGINS

**Sessions: 3-4 | Microsessions: 4 | Chats: 2-3 (interleaved with E3)**

**PURPOSE:** Build compliance and regulatory plugins for manufacturing: ISO certification support, material traceability, process validation documentation. After M-M3, the system can generate compliance documentation for manufacturing audits.

**PREREQUISITES:** M-M2 batch ≥ 30 complete (substantial data coverage).

**COMPLIANCE DOMAIN PROTOCOL (NEW in v8.5):**
```
THE PROBLEM:
  Compliance is a domain expertise problem, not a code generation problem.
  Claude can build the infrastructure (certificate generation, audit trail
  logging, process validation records) but cannot determine whether the
  CONTENT of those artifacts would satisfy an actual auditor.

ENHANCED APPROACH:
  Each M-M3 MS includes a standards research step and generates sample
  artifacts for the H-3 domain expert reviewer at batch 30. Compliance
  infrastructure is built AGAINST specific ISO clause requirements
  (researched in MS1), not generic "compliance features."
```

---

#### M-M3-MS1: ISO Compliance Framework + Standards Research

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M2 batch ≥ 30 complete.

**STEPS:**
0. **Standards research (NEW in v8.5):** Before implementation, research current ISO 9001:2015 / AS9100D requirements relevant to CNC manufacturing process control. Identify specific applicable clauses:
   - Clause 7.1.5: Monitoring and measuring resources (calibration)
   - Clause 8.5.1: Control of production (process parameters)
   - Clause 8.6: Release of products (inspection and test)
   - Clause 10.2: Nonconformity and corrective action (quarantine)
   - Document applicable clauses in C:\PRISM\docs\COMPLIANCE_REQUIREMENTS.md
   - Build compliance infrastructure AGAINST these specific requirements
1. **Import CertificateEngine (757L, Tier 3) NOW** — don't wait for E3. M-M3 IS the consumer.
   - CertificateEngine generates: ISO 9001 compliance documents, material certificates, process validation reports, audit trails
   - Import to prism-platform/src/engines/CertificateEngine.ts
   - Wire certificate-types.ts (105L, already imported at P0-MS5) as the type interface
2. Design compliance data model → implement traceability hooks → create audit trail for material certifications
3. **Wire CertificateEngine consumers:**
   - prism_compliance→generate_cert calls CertificateEngine.generateMaterialCert(material_id, test_results)
   - prism_compliance→audit_trail calls CertificateEngine.getTraceabilityChain(material_id, date_range)
   - prism_compliance→iso_report calls CertificateEngine.generateISOReport(process_id, template)
   - M-M2 campaign data feeds CertificateEngine: every validated material entry creates a cert-ready record
4. Test with sample ISO 9001 workflow: material cert → process validation → audit trail → report generation

**EXIT:** Compliance framework operational. CertificateEngine imported and wired to 3 dispatcher actions. COMPLIANCE_REQUIREMENTS.md documents specific ISO clauses. Material traceability working. Audit trail generating from real M-M2 campaign data.

---

#### M-M3-MS2: Process Validation Documentation

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M3-MS1 COMPLETE.

Build process validation report generator → link calculations to source parameters → generate IQ/OQ/PQ document templates → test with sample machining process.

**Generate 3 sample compliance artifacts for H-3 review (NEW in v8.5):**
- Material certification record (tracing material params to source data)
- Process validation record (tracing cutting params to calculation + safety check)
- Nonconformity record (tracing a quarantined entry through root cause to resolution)
These will be reviewed by the domain expert at H-3 gate.

**EXIT:** Validation reports generating. Calculation traceability complete. 3 sample artifacts generated for H-3 review.

---

#### M-M3-MS3: Material Certification Plugin

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M3-MS2 COMPLETE.

Build material cert lookup → link to material registry entries → verify cert chain for critical materials → test with aerospace-grade materials.

**Verify audit trail immutability (NEW in v8.5):** Confirm audit trail is append-only (no edits, no deletes). Every calculation output traces back to: input material data source, calculation engine version, validation result. This is what auditors actually check.

**EXIT:** Material certification lookup operational. Cert chain verified for critical materials. Audit trail confirmed append-only.

---

#### M-M3-MS4: Compliance Integration + SAU-Light + Domain Review

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M3-MS3 COMPLETE.

Integration test: full compliance workflow (material cert → process validation → audit trail) → verify AutoPilot routes compliance queries → **SAU-Light**.

**Domain expert review (NEW in v8.5):** Present complete compliance package to manufacturing engineer (at H-3 gate if timing aligns, or separately). Specific question: "If your QA auditor asked 'how do you validate your CNC parameters?', would this system's output satisfy them?" Document response in HUMAN_REVIEW_LOG.md under M-M3 section.

**EXIT:** Compliance plugins integrated. AutoPilot routes compliance queries. Domain expert feedback documented. SAU-Light complete. → M-M3 PHASE COMPLETE.

---

## CROSS-CUTTING TRACKS

### P-PERF: Performance Validation (4 microsessions)

| MS ID | When | Scope | Inserted Into |
|-------|------|-------|--------------|
| P-PERF-MS1 | After P2 | Baseline benchmarks with test plugin | Chat 7 (after P2-MS8) |
| P-PERF-MS2 | After P4 | Full benchmarks with all features | Chat 10b (with SU-4) |
| P-PERF-MS3 | After E2 | Benchmarks with WAL + cost overhead | E2 final chat (Chat ~26, after E2-MS10, before SU-5) |
| P-PERF-MS4 | Before DEMO 4 | Final certification. BLOCK if any target missed. Includes safety_calc_test_matrix.py. | Pre-DEMO 4 chat (Chat ~65, after P-UAT-MS3, before SU-6) |

#### P-PERF-MS3: Enterprise Overhead Benchmarks (NEW in v8.3)

**Effort:** ~12 tool calls | **Quality Tier:** STANDARD

**ENTRY CONDITIONS:**
- E2 COMPLETE (WAL, cost tracking, cross-track flags operational)
- P-PERF-MS2 baselines available for comparison

**STEPS:**
1. Run performance_benchmark.py with WAL enabled — measure overhead vs P-PERF-MS2 baselines.
2. Benchmark: material lookup latency, hook chain latency, boot time, calculation time — all WITH WAL + cost tracking active.
3. Measure WAL-specific: write latency, checkpoint flush time, recovery time from simulated crash.
4. Measure cost tracking overhead: per-operation cost logging latency.
5. Compare all metrics against P-PERF-MS2 baselines. Acceptable overhead: ≤15% increase on any metric.
6. If overhead >15%: profile and identify bottleneck. Document in PERF_FINDINGS.md with optimization plan.

**EXIT CONDITIONS:**
- All benchmarks recorded with WAL + cost overhead measured
- Comparison table: P-PERF-MS2 baseline vs MS3 (with enterprise features)
- Any >15% regression documented with optimization plan
- Results recorded in ROADMAP_TRACKER.md

#### P-PERF-MS4: Final Performance Certification (NEW in v8.3)

**Effort:** ~15 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P-UAT-MS3 COMPLETE (all [UAT_CRITICAL] resolved)
- All enterprise features operational (E1-E4 complete)
- P-PERF-MS3 results available

**STEPS:**
1. Run performance_benchmark.py with FULL system load (all plugins, all hooks, all enterprise features).
2. Run safety_calc_test_matrix.py (50 calculations from Section 15) — verify all pass within ±2σ.
3. Run boot_efficiency_tracker.py — verify boot time ≤ 8s (RED threshold).
4. Benchmark all 10 performance targets from P2-MS7:
   - Material lookup < 50ms
   - Hook chain < 10ms
   - Boot < 3s (GREEN) / < 5s (YELLOW) / < 8s (RED)
   - Calculation dispatch < 100ms
   - Registry load < 2s
   - Context pressure response < 50ms
   - Compaction detection < 100ms
   - Agent invocation < 200ms
   - Batch ingestion < 500ms per entry
   - WAL checkpoint < 1s
5. Compare against ALL previous baselines (MS1, MS2, MS3) — trend analysis.
6. Generate PERF_CERTIFICATION.md: pass/fail per target, trend graphs, regression analysis.
7. **BLOCK GATE:** If ANY target missed, document remediation plan. M-FINAL cannot proceed until all targets pass or explicit waiver documented with safety justification.

**EXIT CONDITIONS:**
- PERF_CERTIFICATION.md exists with 10/10 targets assessed
- safety_calc_test_matrix.py: 50/50 pass
- All targets PASS or waiver documented
- Trend analysis across MS1→MS4 recorded
- ROADMAP_TRACKER.md updated: P-PERF-MS4 COMPLETE

### P-UAT: User Acceptance Testing (3 microsessions)

| MS ID | When | Scope | Inserted Into |
|-------|------|-------|--------------|
| P-UAT-MS1 | After M-M2 batch 20 (= 1,000 material entries processed, ≥900 validated) | Early feedback: lookups, basic calcs | M-M2 interleave chat (Chat ~20, whichever chat contains batch 20 completion) |
| P-UAT-MS2 | After DEMO 1 | Full workflows, alarm decode, optimization | Post-SU-3 chat (Chat 9, after main-track P-P4-MS1 → MS2 → P-P3-MS4) |
| P-UAT-MS3 | Before DEMO 4 | Final UAT. BLOCK if critical issues. | Pre-DEMO 4 chat (Chat ~65, before SU-6) |

#### UAT Scenario Enumeration (NEW in v8.2)

*8 core scenarios executed by uat_session_runner.py. Scenarios 1-5 tested at P-UAT-MS1, all 8 at P-UAT-MS2/MS3. Pass criteria: >90% of scenarios pass (Section 12). Templates created at P-P3-MS5.*

| # | Scenario | What It Tests | Pass Criteria |
|---|----------|---------------|---------------|
| 1 | **Material Lookup Workflow** | Query material → get full parameters → verify against handbook | Correct params returned, uncertainty bands present |
| 2 | **Speed/Feed Calculation** | Select material+tool+operation → calculate → validate | S(x) ≥ 0.70, result within ±2σ of reference |
| 3 | **Alarm Decode + Fix** | Enter alarm code → decode → get fix procedure → verify actionable | Fix procedure is specific (not generic "contact service") |
| 4 | **Tool Life Prediction** | Input cutting conditions → predict tool life → compare to experience | Prediction within operator's "reasonable" range |
| 5 | **Batch Campaign Review** | View campaign dashboard → check batch results → review quarantine | Dashboard current, quarantine reasons clear |
| 6 | **Multi-Operation Sequence** | Rough → semi-finish → finish with parameter changes per op | Params change correctly, tool selection appropriate per op |
| 7 | **Report Generation** | Run calculation → generate parameter report → verify traceability | Source data traced, all inputs documented |
| 8 | **Error Recovery** | Trigger intentional error → verify error pattern match → verify fix suggestion | Known error produces actionable fix suggestion |

#### UAT Critical Issue Resolution Protocol (NEW in v8.3)

When P-UAT-MS1, MS2, or MS3 identifies critical issues (any scenario FAIL that blocks DEMO or M-FINAL):

```
UAT CRITICAL ISSUE RESOLUTION:
  1. CLASSIFY: Each failing scenario tagged [UAT_CRITICAL] or [UAT_MINOR]
     - CRITICAL: Safety calc wrong, data corruption, crash, S(x) < 0.70
     - MINOR: UI/UX, performance (not safety), formatting

  2. FIX MICROSESSION: Insert P-UAT-FIX-MS (15-20 tool calls) into the NEXT available chat
     - ENTRY: P-UAT-MS[N] complete with [UAT_CRITICAL] issues documented
     - STEPS:
       a. Read [UAT_CRITICAL] issues from UAT_RESULTS.md
       b. Root-cause each issue (code_search → file_read → identify fix)
       c. Apply fixes with validate_anti_regression
       d. Re-run ONLY failing scenarios via uat_session_runner.py --scenarios=N,N
       e. Document fixes in UAT_FIX_LOG.md with before/after evidence
     - EXIT: All [UAT_CRITICAL] scenarios now PASS. [UAT_MINOR] tracked but not blocking.

  3. TIMING RULES:
     - After P-UAT-MS1: Fix before DEMO 1 (insert between batch chat and DEMO 1 chat)
     - After P-UAT-MS2: Fix before DEMO 2 (insert after Chat 9, before next DEMO)
     - After P-UAT-MS3: Fix before M-FINAL-MS1. BLOCK: M-FINAL cannot start with [UAT_CRITICAL] open.

  4. ESCALATION: If fix requires >20 tool calls or spans multiple systems:
     - Convert to ATCS task with checkpoint_every=2
     - Re-run full UAT scenario suite (not just failing) after ATCS completion
```

### P-DM: Data Migration (triggered, not scheduled)

*P-DM is a reactive microsession that fires mid-chat when schema mismatches are detected. It interrupts the current MS at the step boundary (Section 3.4) because schema mismatches corrupt data if left unfixed. P-DM is NOT a scheduled phase — it triggers 0-N times during the project.*

**Effort:** ~8-12 tool calls per trigger | **Quality Tier:** DEEP (data integrity)

**ENTRY CONDITIONS (any one triggers P-DM):**
- PLATFORM-SCHEMA-VERSION hook fires with schema_version < expected
- Systematic batch error detected (same schema error across 3+ entries in a batch)
- Import at any MS changes a data format that existing registry entries use

**STEPS (execute in order, then return to interrupted MS):**
```
1. ASSESS: What triggered P-DM?
   → Schema version mismatch: which registry? How many entries affected?
   → Systematic batch error: which batch? Which field(s)?
   → Import format change: which import? What changed?

2. SCOPE: How many entries need migration?
   → prism_data→registry_scan: count entries with schema_version < expected
   → If < 50 entries: inline migration (fix in this P-DM session)
   → If 50-500 entries: batch migration via schema_migrator.py
   → If > 500 entries: ATCS-queued migration (queue as ATCS task, handle in next M-M2 chat)

3. MIGRATE:
   → Write migration function in schema_migrator.py (if new migration type)
   → Create rollback manifest BEFORE migration: snapshot affected entries
   → Run migration: transform entries, validate each with S(x) ≥ 0.70
   → If ANY entry fails validation post-migration: ROLLBACK entire migration

4. VERIFY:
   → Run mfg_batch_validator.py on migrated entries
   → Verify downstream consumers still produce correct output:
     - prism_calc→speed_feed with migrated material → same result as pre-migration?
     - MemoryGraphEngine edges for migrated entries → still valid?
   → Update manifest.expected_schema_version if this was a planned schema change

5. DOCUMENT:
   → ROADMAP_TRACKER: "P-DM triggered at [MS-ID] Step [N]: [reason], [count] entries migrated"
   → SESSION_INSIGHTS: [PATTERN] or [GOTCHA] entry for the schema change
   → Return to interrupted MS at next step
```

**EXIT CONDITIONS:**
- All affected entries migrated to current schema version
- Rollback manifest stored (can undo if problems surface later)
- mfg_batch_validator.py passes on migrated entries
- Downstream consumer spot-check passes (at least 1 calc with migrated data)
- ROADMAP_TRACKER updated

**TOOLS:** schema_migrator.py + prism_validate + prism_data + mfg_batch_validator.py + ATCS (if >500 entries)

| Trigger | Action | Tool |
|---------|--------|------|
| Schema version mismatch | schema_migrator.py: forward-migrate, validate, rollback manifest | schema_migrator.py + prism_validate |
| Systematic batch error | Quarantine → re-run corrected → merge verified | batch_error_handler.py + ATCS replan |
| Import changes data format | Migrate platform data to match, dual-run validate | dual_run_validator.py + schema_migrator.py |

#### Schema Mismatch Detection Mechanism (NEW in v8.2)

```
SCHEMA VERSION TRACKING:
  Every registry entry has a schema_version field (integer, starting at 1).
  The manufacturing plugin manifest.json contains expected_schema_version per registry type:
    { "materials": 1, "machines": 1, "alarms": 1, "tools": 1 }

PLATFORM-SCHEMA-VERSION HOOK (installed at P3-MS1):
  Fires: on every registry write (batch ingestion, individual update)
  Logic:
    1. Read entry.schema_version
    2. Compare against manifest.expected_schema_version for that registry type
    3. If entry.schema_version < expected → TRIGGER P-DM protocol
    4. If entry.schema_version > expected → WARN (future schema from newer code?)
    5. If entry.schema_version missing → assign current expected_schema_version, WARN

WHEN SCHEMA CHANGES:
  1. Update expected_schema_version in manifest.json
  2. Write schema_migrator.py migration function for old→new
  3. PLATFORM-SCHEMA-VERSION detects old entries → queues P-DM migration
  4. schema_migrator.py runs: transforms old entries, validates, writes rollback manifest
  5. If migration fails: rollback to pre-migration state using manifest

SCHEMA MIGRATOR SCRIPT (created on first P-DM trigger, ~200 lines):
  schema_migrator.py capabilities:
  - Forward migration: v1→v2, v2→v3, etc. (each version has a transform function)
  - Rollback: reads rollback manifest → restores original entries
  - Dry-run mode: --dry-run flag shows what WOULD change without writing
  - Validation: every migrated entry passes S(x) ≥ 0.70 or migration fails
  - Audit trail: writes SCHEMA_MIGRATION_LOG.md with: timestamp, version change, entry count, success/failure
```

---

## ENTERPRISE TRACK: E1-E4

**~82 microsessions across 4 phases with buffer MS for integration issues.**

### Phase Overview

| Phase | MS Count | Chats | Key Components |
|-------|---------|-------|---------------|
| E1: WAL + Replay | 18 | 5-6 | Binary format, CRC32, snapshots, replay sandbox, what-if, retention+encryption, integration, buffer |
| E2: Cost Intelligence | 10 | 3-4 | Cost model, attribution, value calc, budget alerts, finance export, integration, buffer |
| E3: Visual Platform | 30 | 8-10 | React, FlowCanvas, dashboards, HookDesigner, ReplayViewer, compliance, SDK, marketplace, hot-install, buffer |
| E4: Enterprise Readiness | 24 | 6-8 | Replication, WAL streaming, heartbeat, failover, reconciliation, connectors, multi-tenant, integration, buffer |

### Enterprise MS Spec Template

Each E-phase MS follows this pattern:

```
ENTRY: Prior MS complete + build passes + performance within baselines
STEPS: 1) Read relevant architecture docs  2) Design component  3) Implement  
       4) Unit test  5) Integration test with existing systems  6) Verify 
       performance hasn't degraded  7) Build changed codebase only
EXIT: Component functional + integrated + performance neutral + anti-regression passes
HANDOFF: ROADMAP_TRACKER + PLATFORM_STATE + IMPORT_LOG if applicable
HOOKS: Register relevant hooks when their dependencies are built in this MS
UPDATE: Run quick_ref_generator.py if hooks or scripts added
INSIGHT: Write structured SESSION_INSIGHTS.md entry if non-obvious learning
```

### Enterprise Margin Protocol (NEW in v8.5)

*82 MS in ~22 chats averages 3.7 MS/chat. With SAU overhead, cross-track checks, and debugging, this is tight. This protocol detects pace problems early.*

```
ENTERPRISE_PACE.md TRACKING:
  At the END of every enterprise chat, record:
    - Chat number
    - MS completed this chat (count and IDs)
    - MS planned this chat (from Section 11 loading guide)
    - Delta: completed vs planned
    - Cumulative delta: total MS behind/ahead of schedule

  THRESHOLDS:
    GREEN:  cumulative delta ≥ -2 (up to 2 MS behind schedule)
    YELLOW: cumulative delta -3 to -5 (3-5 MS behind)
    RED:    cumulative delta < -5 (more than 5 MS behind)

  RESPONSE AT YELLOW:
    1. Analyze: which MS took longer than planned? Why?
    2. If pattern: adjust chat loading guide to 2-3 MS/chat (not 3-4)
    3. Consume flex chat if available (FLEX-2, FLEX-E3, FLEX-3)
    4. Document: ROADMAP_TRACKER [ENTERPRISE_PACE:YELLOW] at chat N

  RESPONSE AT RED:
    1. STOP and reassess. Do NOT continue hoping to catch up.
    2. Options (choose one):
       a. SCOPE REDUCTION: Identify 5-10 MS that can be simplified to STUB
       b. SCHEDULE EXTENSION: Add 3-5 chats, push M4 back. Recalculate timeline.
       c. PARALLEL SIMPLIFICATION: Execute 2 independent MS per chat
    3. Document: SESSION_INSIGHTS [DECISION] Enterprise pace RED response
    4. If RED persists 5+ consecutive chats → Emergency Off-Ramp trigger #4 (Section 3.11)
```

### E3 Architectural Decision Replay Protocol (NEW in v8.5)

*E3_ARCHITECTURE.md is a passive document that can't enforce consistency. This protocol actively verifies BINDING decisions at every layer boundary.*

```
WHEN: E3-MS5 (Layer 1), E3-MS12 (Layer 2), E3-MS20 (Layer 3), E3-MS30 (Layer 4)
EFFORT: 4 tool calls per boundary, 16 total over E3

PROCEDURE (runs BEFORE front-loading next layer):

  1. READ E3_ARCHITECTURE.md — extract all BINDING decisions

  2. VERIFY EACH BINDING (automated spot-check):

     BINDING — Single state store:
       → grep for "useState" or "useReducer" in components managing SERVER data
       → Any hit = VIOLATION (local state for UI-only concerns is OK)
       → Fix: refactor to Zustand store (decided in v10.0 CM-4)

     BINDING — Data flows through TelemetryBridge only:
       → grep for "fetch(" or "axios" or direct API calls in React components
       → Any hit = VIOLATION
       → Fix: route through TelemetryBridge.subscribe() or .getLatest()

     BINDING — No event buses, no global mutable state:
       → grep for "EventEmitter" or "window." assignments in React code
       → Any hit = VIOLATION

     BINDING — timeRange prop on all dashboards:
       → For each dashboard: verify timeRange in props interface
       → Missing = VIOLATION

     BINDING — ToolState interface on interactive tools (Layer 3+):
       → For each tool: verify toJSON/fromJSON/isDirty implementation
       → Missing = VIOLATION (ATCS can't checkpoint this tool)

  3. DOCUMENT violations in COHERENCE_AUDIT.md (E3 section)

  4. FIX all violations BEFORE proceeding to next layer
     → Violations at layer boundaries are cheaper to fix now than after
       10 more MS build on top of them
```

### Enterprise Phase Entry/Exit Minimums (NEW in v8.1)

*The template above is generic. These phase-level constraints give each unspecified MS a minimum entry/exit framework so a fresh Claude can verify progress without detailed step specs.*

**E1-MS5 through E1-MS18 (WAL advanced features):**
```
E1-MS5:  What-If Branching Design     | ENTRY: Replay sandbox operational | EXIT: Branch point selection works, comparison renders
E1-MS6:  What-If Branching Impl       | ENTRY: E1-MS5 | EXIT: 3 branch scenarios tested, state divergence visible
E1-MS7:  WAL Retention Policy          | ENTRY: WAL >100 entries | EXIT: Retention fires, old entries pruned, index updated
E1-MS8:  WAL Encryption                | ENTRY: Retention working | EXIT: AES-256 at rest, WAL reader decrypts, CRC32 still valid
E1-MS9:  WAL Integration Test + SAU-L  | ENTRY: E1-MS8 | EXIT: Write→verify→snapshot→replay→branch→retain→encrypt chain passes. SAU-Light.
E1-MS10: WAL Performance Optimization  | ENTRY: E1-MS9 | EXIT: Write overhead < 2ms at 10K entries, seek < 100ms
E1-MS11: WAL Compaction Integration    | ENTRY: E1-MS10 | EXIT: compaction_armor.py includes full WAL state, recovery tested
E1-MS12: WAL API Design               | ENTRY: E1-MS11 | EXIT: WAL_API.md written, REST/WebSocket endpoints defined
E1-MS13: WAL API Implementation        | ENTRY: E1-MS12 | EXIT: All API endpoints functional, auth wired
E1-MS14: WAL Streaming Foundation      | ENTRY: E1-MS13 | EXIT: WAL entries stream to subscriber with < 1s lag
E1-MS15: WAL Multi-Consumer Support    | ENTRY: E1-MS14 | EXIT: 3 concurrent consumers reading WAL without conflict
E1-MS16: WAL Error Recovery            | ENTRY: E1-MS15 | EXIT: Corrupted segment skipped, consumer notified, chain resumes
E1-MS17: WAL Integration Full Suite    | ENTRY: E1-MS16 | EXIT: 50 test scenarios pass, all error paths covered
E1-MS18: E1 Phase Completion + Buffer  | ENTRY: E1-MS17 | EXIT: All E1 components verified, performance baselines updated
```

**E2-MS1 through E2-MS10 (Cost Intelligence):**
```
E2-MS1:  Cost Model Design             | ENTRY: E1 COMPLETE, SU-4 passed | EXIT: COST_MODEL.md with per-tier rates, overhead formula
E2-MS2:  Cost Attribution Engine        | ENTRY: E2-MS1 | EXIT: Every dispatcher call attributed to cost category
E2-MS3:  Cost Calibration              | ENTRY: M-M2 batch ≥10 (or SYNTHETIC_DATA fallback) | EXIT: Estimates within ±10% of actual billing
E2-MS4:  Value Calculation             | ENTRY: E2-MS3 | EXIT: ROI per feature calculated, value/cost ratio per dispatcher
E2-MS5:  Budget Alerts + SAU-Light     | ENTRY: E2-MS4 | EXIT: Budget threshold alerts fire, daily/weekly/monthly projections. SAU-Light.
E2-MS6:  Cost Dashboard                | ENTRY: E2-MS5 | EXIT: Real-time cost display, trend charts, budget burn-down
E2-MS7:  Finance Export                | ENTRY: M-M2 batch ≥15 (or PARTIAL_COST fallback) | EXIT: CSV/JSON export of cost history, audit trail
E2-MS8:  Cost Optimization Recs        | ENTRY: E2-MS7 | EXIT: System recommends cheaper agent tiers where quality allows
E2-MS9:  E2 Integration Test           | ENTRY: E2-MS8 | EXIT: End-to-end cost tracking from dispatch→attribution→alert→export
E2-MS10: E2 Phase Completion + Buffer  | ENTRY: E2-MS9 | EXIT: All E2 components verified. → SU-5 + SAU-Full
```

**E3-MS1 through E3-MS30 (Visual Platform) (NEW in v8.4):**
*Front-loading at layer boundaries AUGMENTS these specs (adds detailed steps), it does not replace them. Every MS has a defined deliverable before front-loading begins.*
```
LAYER 1 — Foundation (E3-MS1 through E3-MS5):
E3-MS1:  React Scaffold + Zustand State Mgmt | ENTRY: E2 COMPLETE, SU-5 passed | EXIT: React app builds, **Zustand** store configured (BINDING — decided in v10.0, see below), TelemetryBridge interface implemented per API contract
E3-MS2:  WebSocket + Channel Defs       | ENTRY: E3-MS1 | EXIT: WebSocket connects to TelemetryEngine, all 8 channels defined and emitting, TelemetryBridge.subscribe() working
E3-MS3:  Component Library Foundation    | ENTRY: E3-MS2 | EXIT: Button, Card, Modal, Table, Chart base components built with Tailwind, documented with props
E3-MS4:  Component Library Extended      | ENTRY: E3-MS3 | EXIT: StatusIndicator, TimeRangeSelector, MetricCard, AlertBanner components, all accept timeRange prop
E3-MS5:  Auth + Session Management       | ENTRY: E3-MS4 | EXIT: JWT auth per E3 Security Constraints, 3 RBAC roles (OPERATOR/ENGINEER/ADMIN), login/logout/timeout working. **TESTING GATE (v9.0): ≥40% component test coverage on Layer 1 foundation components (React Testing Library). Catches state wiring issues before Layer 2.**

LAYER 2 — Core Dashboards (E3-MS6 through E3-MS12):
E3-MS6:  SystemDashboard + Engine Import | ENTRY: E3-MS5 | EXIT: System status display, hook status, registry counts. PredictiveFailureEngine (523L) + PFPEngine (834L) imported and wired to TelemetryBridge "predictions" channel
E3-MS7:  PredictiveAlertPanel           | ENTRY: E3-MS6 | EXIT: Proactive alerts rendering from PFPEngine data, severity color coding, mitigation suggestions displayed
E3-MS8:  CampaignDashboard              | ENTRY: E3-MS7 | EXIT: Batch progress bars, quarantine rates, ETA calculations, all reading from "campaign" channel
E3-MS9:  CalculationDashboard           | ENTRY: E3-MS8 | EXIT: Recent calcs table, accuracy tracking chart, MemoryGraphEngine relationship graph rendering
E3-MS10: AlarmDashboard + SAU-Light     | ENTRY: E3-MS9 | EXIT: Active alarms, fix history, trend visualization, severity filtering. SAU-Light complete.
E3-MS11: Dashboard Cross-Integration    | ENTRY: E3-MS10 | EXIT: Global time-range selector works across ALL dashboards, drill-through from system→campaign→calc works
E3-MS12: Dashboard Polish + Engine Test | ENTRY: E3-MS11 | EXIT: All 4 dashboards render with live data, PredictiveFailure+PFP consumer chains verified (Section 18.1), responsive layout. **TESTING GATE (v9.0): ≥60% component test coverage on Layer 2 dashboard components. All dashboard state management paths tested.**

LAYER 3 — Interactive Tools (E3-MS13 through E3-MS20):
E3-MS13: FlowCanvas Foundation          | ENTRY: E3-MS12 | EXIT: Visual workflow builder canvas renders, ToolState interface implemented per API contract, drag-drop node placement
E3-MS14: FlowCanvas Wiring             | ENTRY: E3-MS13 | EXIT: Nodes connect with typed edges, flow validates against sequencing guides, export to JSON
E3-MS15: HookDesigner                  | ENTRY: E3-MS14 | EXIT: Visual hook creation (trigger type, priority, script), dependency visualization, test-fire from UI
E3-MS16: HookDesigner Advanced         | ENTRY: E3-MS15 | EXIT: Hook chain visualization, priority conflict detection, before/after preview, save/load via ToolState
E3-MS17: ReplayViewer Foundation       | ENTRY: E3-MS16 | EXIT: WAL timeline renders, entry selection shows detail, playback controls (play/pause/step)
E3-MS18: ReplayViewer + WhatIf        | ENTRY: E3-MS17 | EXIT: Branch point selection, side-by-side comparison of divergent states, branch diff highlighting
E3-MS19: Interactive Tool Integration  | ENTRY: E3-MS18 | EXIT: All tools save/load via ToolState, ATCS can checkpoint tool state, cross-tool navigation
E3-MS20: Layer 3 Validation + SAU-L   | ENTRY: E3-MS19 | EXIT: All Layer 3 tools functional with real data, ToolState serialize/deserialize verified, SAU-Light complete. **TESTING GATE (v9.0): ≥70% component test coverage on Layer 3 interactive tools. Drag-drop, timeline, and branching interactions tested.**

LAYER 4 — Platform (E3-MS21 through E3-MS30):
E3-MS21: Plugin SDK Design            | ENTRY: E3-MS20 | EXIT: PLUGIN_SDK.md with TypeScript interfaces, manifest schema, lifecycle hooks, example plugin skeleton, **plugin permission tiers (v9.0)**, min_api_version requirement
E3-MS22: Plugin SDK Implementation     | ENTRY: E3-MS21 | EXIT: createPlugin() helper, manifest validator, hot-reload dev server, 1 example plugin passes end-to-end
E3-MS23: Marketplace Foundation        | ENTRY: E3-MS22 | EXIT: Plugin registry UI, search/filter, install button, version display, dependency graph
E3-MS24: Marketplace Install/Update    | ENTRY: E3-MS23 | EXIT: Plugin install downloads + registers + activates, update preserves config, uninstall cleans up
E3-MS25: Hot-Install Zero-Downtime    | ENTRY: E3-MS24 | EXIT: Plugin install during active workload causes zero dropped requests, verified with load test

**PLUGIN SECURITY FRAMEWORK (NEW in v9.0):**
```
PERMISSION TIERS:
  Every plugin declares its required permission tier in manifest.json:
  
  TIER 1 — READ_ONLY:
    Can: Read registry data, read telemetry, read campaign dashboard
    Cannot: Write data, install hooks, modify calculations, access other tenants
    Review: Automatic approval (manifest validation only)
    Example: Custom report generator, data export plugin
  
  TIER 2 — UI_EXTEND:
    Can: All of Tier 1 + add dashboard panels, add navigation items, render custom UI
    Cannot: Install hooks, modify calculations, access safety-critical engines
    Review: Automatic approval with UI sandbox verification
    Example: Custom visualization, workflow builder extension
  
  TIER 3 — HOOK_INSTALL:
    Can: All of Tier 2 + install pre/post hooks on non-safety dispatchers
    Cannot: Hook into safety-critical calculation chain, modify S(x) thresholds
    Review: Admin approval required. Hook manifest reviewed.
    Blocked hooks: Any hook on prism_calc, prism_validate→safety, S(x) computation
    Example: Custom logging, notification plugins, integration webhooks
  
  TIER 4 — CALC_MODIFY:
    Can: All of Tier 3 + register CalcModel in CalcModelRegistry, hook safety chain
    Cannot: Modify EXISTING calculation models (only ADD new ones)
    Review: Admin approval + safety matrix re-run with new model active
    HARD BLOCK: If safety matrix produces ANY regression, plugin install BLOCKED
    Example: EDM calculation plugin, additive manufacturing plugin

PLUGIN SANDBOXING:
  All plugins execute in isolated context:
    - No direct file system access (use DataProvider through plugin API)
    - No direct engine access (use dispatcher actions through plugin API)
    - Network requests only to declared domains in manifest.json
    - Memory limit per plugin (configurable per tenant)
    - Execution timeout per plugin action (default 30s)

UNINSTALL SAFETY:
  Before uninstalling a plugin:
    1. Check dependency graph: does any OTHER plugin depend on this one?
       → If yes: BLOCK uninstall, show dependent plugins
    2. Check data ownership: did this plugin create extension fields?
       → If yes: WARN — extension data will become orphaned
       → Admin must explicitly confirm data retention or deletion
    3. Check hook ownership: did this plugin install hooks?
       → Auto-remove all hooks installed by this plugin
       → Verify hook chain integrity post-removal
    4. Clean up: remove plugin from manifest, update HOOK_MANIFEST.json

PLUGIN MANIFEST SCHEMA (v9.0 additions):
  {
    "name": "...",
    "version": "...",
    "min_api_version": "1.0.0",        // v9.0: required
    "permission_tier": "READ_ONLY",     // v9.0: required
    "required_permissions": [...],       // v9.0: granular permission list
    "network_domains": [...],            // v9.0: allowed external domains
    "dependencies": [...],               // v9.0: other plugins required
    ...existing manifest fields...
  }
```

E3-MS26: Compliance Dashboard          | ENTRY: E3-MS25 | EXIT: ISO cert status, audit trail visualization, material traceability tree, CertificateEngine data rendering
E3-MS27: Compliance Reporting          | ENTRY: E3-MS26 | EXIT: Generate/export ISO reports from UI, audit log search, date-range filtering, PDF export
E3-MS28: E3 Integration Test Suite    | ENTRY: E3-MS27 | EXIT: Cypress/Playwright INTEGRATION test suite covers all dashboards + tools + marketplace, ≥80% UI code coverage. **Progressive gates (v9.0) mean component coverage already ≥70% — this MS focuses on INTEGRATION and end-to-end tests, not building component tests from scratch.**
E3-MS29: E3 Performance + Polish       | ENTRY: E3-MS28 | EXIT: Initial render < 2s, WebSocket reconnect < 5s, all components accessible (ARIA labels), mobile responsive
E3-MS30: E3 Phase Completion          | ENTRY: E3-MS29 | EXIT: All E3 components verified, all engine consumers from Section 18.1 confirmed, test suite green, E3_ARCHITECTURE.md final
```

**E4-MS1 through E4-MS24 (Enterprise Readiness) (NEW in v8.4):**
*Front-loading at E4-MS1 AUGMENTS these specs with detailed steps. E4 Replication Architecture Constraints and Failover Sequence (above) are BINDING.*
```
TENANT FOUNDATION (E4-MS1 through E4-MS6):
E4-MS1:  Multi-Tenant Data Model       | ENTRY: E3 COMPLETE | EXIT: Tenant schema designed, namespace isolation for WAL/ATCS/registries, TENANT_ARCHITECTURE.md written
E4-MS2:  Tenant Auth + Provisioning     | ENTRY: E4-MS1 | EXIT: Tenant creation API, tenant-scoped JWT claims, login routes per tenant, admin can create/disable tenants
E4-MS3:  Tenant Data Isolation          | ENTRY: E4-MS2 | EXIT: Tenant A cannot read Tenant B's WAL/registries/ATCS state, verified with cross-tenant access test
E4-MS4:  Tenant Config Management       | ENTRY: E4-MS3 | EXIT: Per-tenant .env overrides, hook enablement per tenant, shared plugin code with tenant-specific data
E4-MS5:  Tenant Dashboard Scoping       | ENTRY: E4-MS4 | EXIT: All E3 dashboards filter by tenant context, admin can view cross-tenant, operators see own tenant only
E4-MS6:  Tenant Integration Test        | ENTRY: E4-MS5 | EXIT: 3 test tenants provisioned, each with independent data/WAL/ATCS, zero cross-contamination. **SMOKE TEST GATE (v9.0): Tenant isolation verified — cross-tenant data access returns empty, not error.**

REPLICATION + FAILOVER (E4-MS7 through E4-MS12):
E4-MS7:  Replication Infrastructure     | ENTRY: E4-MS6 | EXIT: Replica node scaffolded, heartbeat protocol implemented (3 missed = failover), health endpoint
E4-MS8:  WAL Streaming Replication + SAU-L | ENTRY: E4-MS7 | EXIT: WAL entries stream to replica < 1s lag, replica WAL position tracked, SAU-Light complete
E4-MS9:  ATCS State Replication         | ENTRY: E4-MS8 | EXIT: ATCS checkpoint files + COMPACTION_SURVIVAL.json replicate per E4 constraint #1, failover resume tested
E4-MS10: Registry Replication           | ENTRY: E4-MS9 | EXIT: Hourly sync per E4 constraint #3, registry delta detection, conflict resolution (last-write-wins)
E4-MS11: Failover Sequence Impl        | ENTRY: E4-MS10 | EXIT: Full failover sequence (E4 Failover Sequence above) tested: promote → WAL replay → ATCS resume → GSD update. RTO < 30s.
E4-MS12: Failover Reconciliation       | ENTRY: E4-MS11 | EXIT: Old primary recovers as replica, WAL divergence reconciled, registry synced, normal replication resumes. **SMOKE TEST GATE (v9.0): Full failover→recovery→reconciliation cycle tested end-to-end with live data.**

GOVERNANCE + COMPLIANCE (E4-MS13 through E4-MS18):
E4-MS13: Audit Logging Framework       | ENTRY: E4-MS12 | EXIT: All state-modifying operations logged with tenant, user, timestamp, action, before/after state
E4-MS14: Compliance Hook Integration   | ENTRY: E4-MS13 | EXIT: CertificateEngine events logged, ISO audit trail complete, compliance dashboard (E3-MS26) shows audit data
E4-MS15: API Governance                | ENTRY: E4-MS14 | EXIT: Rate limiting per tenant, API versioning, deprecation warnings, usage quotas
E4-MS16: Data Retention Policies       | ENTRY: E4-MS15 | EXIT: Per-tenant retention config, automated purge of expired WAL/logs/audit entries, retention compliance report
E4-MS17: Security Audit                | ENTRY: E4-MS16 | EXIT: OWASP Top 10 checklist passed, no plaintext secrets, JWT rotation working, CORS locked down
E4-MS18: Governance Integration Test   | ENTRY: E4-MS17 | EXIT: Audit trail complete for all critical paths, retention fires on schedule, rate limiting blocks excess. **SMOKE TEST GATE (v9.0): Governance chain verified — unauthorized access blocked, audit trail complete, retention executes.**

DEPLOYMENT + OPERATIONS (E4-MS19 through E4-MS24):
E4-MS19: Deployment Configuration      | ENTRY: E4-MS18 | EXIT: Environment configs (dev/staging/prod), feature flags, config validation on startup
E4-MS19b: External Integration API (v9.0) | ENTRY: E4-MS19 | EXIT: RESTful API surface for CAM/ERP/MES integration. Versioned endpoints (/api/v1/materials, /api/v1/calculations, /api/v1/alarms). Rate limiting per tenant. Tenant-scoped access tokens. OpenAPI spec generated. Read-only by default; write requires CALC_MODIFY equivalent permission.
E4-MS20: Health Monitoring             | ENTRY: E4-MS19b | EXIT: /health endpoint with component status, Prometheus-compatible metrics, alert thresholds
E4-MS21: Operational Runbooks          | ENTRY: E4-MS20 | EXIT: RUNBOOK.md with: startup, shutdown, failover, rollback, backup restore, emergency procedures
E4-MS22: Load Testing                  | ENTRY: E4-MS21 | EXIT: 10 concurrent users, 100 req/s sustained, no degradation beyond benchmarks, memory stable
E4-MS23: E4 Integration Full Suite     | ENTRY: E4-MS22 | EXIT: Multi-tenant + replication + failover + governance + monitoring end-to-end test passes
E4-MS24: E4 Phase Completion           | ENTRY: E4-MS23 | EXIT: All E4 components verified, TENANT_ARCHITECTURE.md final, operational runbooks complete, handoff to M4
```

**M4 (Extraction):** Each M4 MS follows the consumer chain mapping protocol (Section M4 body). Entry: prior extraction complete + anti-regression passes. Exit: function extracted + all consumer chains verified in prism-platform + dual_run_validator.py passes for affected dispatchers.

### E1 Detailed Specifications (MS1-MS4)

*E1-MS1 through E1-MS4 are fully specified. E1-MS5+ use the template above.*

#### E1-MS1: WAL Binary Format + Writer

**Effort:** ~20 tool calls | **Quality Tier:** DEEP

**ENTRY CONDITIONS:**
- P3-P4 COMPLETE (SU-4 + SAU-Full passed)
- prism-platform builds clean
- Performance baselines established (P-PERF-MS2)

**STEPS:**

1. Design WAL binary format: header (version, timestamp, CRC32 placeholder), entry (operation type, dispatcher, action, payload length, payload, CRC32). Document format spec in docs/WAL_FORMAT.md.
2. Implement WALWriter in src/core/wal/WALWriter.ts.
3. Implement WALReader in src/core/wal/WALReader.ts.
4. Unit tests: write 100 entries → read back → verify all CRC32 → intentionally corrupt entry #50 → verify reader skips and recovers.
5. Wire WALWriter to dispatcher output hook.
6. **CRITICAL: Update compaction_armor.py** — add WAL state to survival files.
7. Build prism-platform.

**HOOKS INSTALLED:** PLATFORM-WAL-WRITE (post-dispatcher, priority 80)

**EXIT CONDITIONS:**
- WAL binary format documented
- WALWriter + WALReader operational
- CRC32 verification passing
- Corruption recovery working
- compaction_armor.py updated with WAL state
- Build passes

---

#### E1-MS2: WAL CRC32 Verification + Integrity Chain

**Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** E1-MS1 COMPLETE.

Implement chain verification → integrity checker → boot integrity check → performance test (< 2ms write overhead).

**EXIT:** Chain verification implemented. Integrity checker operational. Write overhead < 2ms.

---

#### E1-MS3: Snapshot Indexing + Fast Replay Positioning

**Effort:** ~18 tool calls | **Quality Tier:** STANDARD | **ENTRY:** E1-MS2 COMPLETE.

Design snapshot index → SnapshotManager → fast replay from nearest snapshot → test with 1000 entries.

**EXIT:** Snapshot indexing implemented. Fast replay working. Seek < 100ms for 10K entry WAL.

---

#### E1-MS4: Replay Sandbox + SAU-Light

**Effort:** ~18 tool calls | **Quality Tier:** STANDARD | **ENTRY:** E1-MS3 COMPLETE.

Implement ReplaySandbox → state reconstruction → test replay matches current state → **SAU-Light**.

**EXIT:** Replay sandbox operational. State reconstruction verified. SAU-Light complete.

---

### E3 Architectural Constraints (NEW in v7)

*E3 is 30 microsessions of React engineering — the largest phase in the project. Without architectural constraints, front-loading at E3-MS1 will make decisions that don't compound correctly across 30 MS. These constraints are BINDING on E3 front-loading.*

#### E3 Layer → MS Mapping (NEW in v8.2)

| Layer | MS Range | Description | SAU Stop | Flex |
|-------|----------|-------------|----------|------|
| **Layer 1** — Foundation | E3-MS1 through E3-MS5 | React scaffold, TelemetryBridge, WebSocket, component library, auth | — | — |
| **Layer 2** — Core Dashboards | E3-MS6 through E3-MS12 | System, Campaign, Calculation, Alarm dashboards + PredictiveAlertPanel | SAU-Light at E3-MS10 | — |
| **Layer 3** — Interactive Tools | E3-MS13 through E3-MS20 | FlowCanvas, HookDesigner, ReplayViewer, WhatIfBrancher | SAU-Light at E3-MS20 | **FLEX-E3** after MS20 |
| **Layer 4** — Platform | E3-MS21 through E3-MS30 | Plugin SDK, Marketplace, Hot-install, Compliance dashboard, Integration tests | — | — |

*Each layer boundary triggers front-loading: write detailed specs for next layer's MS before executing them.*

#### E3 Component Dependency Graph

```
LAYER 1 — Foundation (E3-MS1 through E3-MS5):
  React scaffold + build pipeline
  → TelemetryBridge (connects React to TelemetryEngine)
  → WebSocket real-time data feed
  → Component library (buttons, cards, modals, charts)
  → Authentication + session management

LAYER 2 — Core Dashboards (E3-MS6 through E3-MS12):
  SystemDashboard (hook status, registry counts, performance)
  → CampaignDashboard (batch progress, quarantine rates, ETA)
  → CalculationDashboard (recent calcs, accuracy tracking)
  → AlarmDashboard (active alarms, fix history, trends)
  → PredictiveAlertPanel (predicted failures, proactive warnings, risk scores)
  ALL dashboards consume TelemetryBridge — no direct TelemetryEngine access from React.
  
  ENGINE WIRING FOR LAYER 2:
  - PredictiveFailureEngine.ts (523L): Import at E3-MS6 (with SystemDashboard).
    Consumes: TelemetryEngine metrics (error rates, response times, registry loads).
    Produces: failure predictions with confidence scores and time-to-failure estimates.
    Wire: PredictiveFailureEngine → TelemetryEngine channel "system" → TelemetryBridge → PredictiveAlertPanel
  - PFPEngine.ts (834L): Import at E3-MS6.
    Consumes: PredictiveFailureEngine predictions + historical failure data from error_pattern_db.
    Produces: proactive mitigation recommendations (not just "X will fail" but "do Y to prevent X").
    Wire: PFPEngine reads PredictiveFailureEngine output → generates mitigation actions →
          TelemetryEngine channel "system" with type="proactive_alert" → TelemetryBridge → PredictiveAlertPanel
  - MemoryGraphEngine.ts (685L): Already imported at P4-MS4 for knowledge graph.
    Consumes: Material/tool/operation relationship queries from CalculationDashboard.
    Produces: Visual relationship maps, "related materials" panels, "recommended tools" suggestions.
    Wire: CalculationDashboard calls MemoryGraphEngine.getRelated(node_id) → renders relationship graph

LAYER 3 — Interactive Tools (E3-MS13 through E3-MS20):
  FlowCanvas (visual workflow builder)
  → HookDesigner (visual hook creation/wiring)
  → ReplayViewer (WAL replay with visual timeline)
  → WhatIfBrancher (branching point selection + comparison)
  ALL tools use Component library from Layer 1. ALL tools access data through same WebSocket feed.

LAYER 4 — Platform (E3-MS21 through E3-MS30):
  Plugin SDK + documentation
  → Marketplace (plugin discovery, install, update)
  → Hot-install (zero-downtime plugin deployment)
  → Compliance dashboard (ISO, audit trail visualization)
  → Integration test suite for all visual components
```

#### E3 State Management Decisions (BINDING)

```
1. ALL application state lives in a single Zustand store (BINDING — decided in v10.0 CM-4.
   Rationale: 70% less boilerplate than Redux, subscribe() maps to TelemetryBridge pattern,
   TypeScript-first inference, 1KB bundle, no middleware ceremony. If Zustand has a critical
   bug: switch to Jotai (same mental model). NEVER switch to Redux. Document in E3_ARCHITECTURE.md).

2. Server data flows through ONE path: TelemetryEngine → WebSocket → TelemetryBridge → Components.
   Components NEVER call backend APIs directly. All data comes through TelemetryBridge.

3. Component communication: parent→child via props, child→parent via callbacks, 
   sibling via state store. No event buses. No global mutable state outside the store.

4. Every dashboard component must accept a `timeRange` prop and filter its data accordingly.
   This enables global time-range selection across all dashboards.

5. Every interactive tool (FlowCanvas, HookDesigner, ReplayViewer) must implement
   save/load through a standard ToolState interface:
   - toJSON(): serializable state
   - fromJSON(state): restore from serialized state
   - isDirty(): boolean (unsaved changes)
   This enables ATCS to checkpoint visual tool state during compaction.
```

#### E3 API Contracts (BINDING)

```
TelemetryBridge interface (decided at E3-MS1, immutable after):
  subscribe(channel: string, callback: (data) => void): unsubscribe
  getLatest(channel: string): data | null
  getHistory(channel: string, timeRange: TimeRange): data[]

Channels (defined at E3-MS2):
  "hooks": { hookId, event, timestamp, payload }
  "performance": { metric, value, timestamp }
  "campaign": { category, batch, status, counts }
  "calculations": { calcId, inputs, outputs, omega, timestamp }
  "alarms": { alarmId, controller, severity, timestamp }
  "system": { component, status, message, timestamp }
  "predictions": { engineId, prediction_type, confidence, time_to_failure, mitigation, timestamp }
  "knowledge": { query, node_id, relationships[], relevance_scores, timestamp }

ToolState interface (decided at E3-MS13, immutable after):
  toJSON(): Record<string, unknown>
  fromJSON(state: Record<string, unknown>): void
  isDirty(): boolean
  getDisplayName(): string
```

#### E3 Front-Loading Protocol (ENHANCED)

```
At E3-MS1 (first 10 tool calls):
1. Read these E3 architectural constraints
2. Configure Zustand store (already decided in v10.0 CM-4) — set up store structure, document in E3_ARCHITECTURE.md
3. Implement TelemetryBridge interface exactly as specified above
4. Implement channel definitions exactly as specified above
5. Write detailed specs for E3-MS1 through E3-MS5 following the dependency graph Layer 1
6. Document ALL architectural decisions in E3_ARCHITECTURE.md
7. Proceed to execute E3-MS1

At E3-MS5 (Layer 1 complete):
  Verify: TelemetryBridge working, WebSocket connected, component library usable, auth working.
  Write detailed specs for E3-MS6 through E3-MS12 (Layer 2).

At E3-MS12 (Layer 2 complete):
  Verify: all dashboards rendering with real data from TelemetryBridge.
  Write detailed specs for E3-MS13 through E3-MS20 (Layer 3).

At E3-MS20 (Layer 3 complete):
  Verify: all interactive tools working with ToolState interface.
  Write detailed specs for E3-MS21 through E3-MS30 (Layer 4).
```

#### E3 Security Constraints (BINDING) (NEW in v8.1)

*E3 exposes a web-accessible dashboard for an enterprise manufacturing system. Security decisions at E3-MS5 (authentication) are BINDING for all subsequent MS.*

```
1. AUTHENTICATION: Token-based (JWT preferred). Decide at E3-MS5, document in
   E3_ARCHITECTURE.md. Session timeout: configurable (default 8 hours for shop floor).
   Refresh token rotation required. No plaintext credentials in state files.

2. AUTHORIZATION: Role-based access control (RBAC) with minimum 3 roles:
   - OPERATOR: View dashboards, view calculations, view alarms. No modifications.
   - ENGINEER: All OPERATOR + run calculations, modify parameters, manage campaigns.
   - ADMIN: All ENGINEER + hook management, plugin install, configuration changes.
   Role assigned at login, stored in JWT claims. Every API endpoint checks role.

3. INPUT SANITIZATION: All user input sanitized before:
   - Rendering in React components (XSS prevention — React handles by default, 
     but dangerouslySetInnerHTML NEVER used)
   - Passing to calculation engines (numeric validation, range checks)
   - Writing to state files or WAL (injection prevention)

4. API SECURITY between React frontend and TelemetryBridge:
   - WebSocket connections authenticated with JWT token in connection handshake
   - CORS configured for specific origin only (no wildcard)
   - Rate limiting on calculation endpoints (prevent DoS on safety-critical compute)
   - CSRF tokens on all state-modifying REST endpoints

5. DATA PROTECTION:
   - Material parameters and cutting data are proprietary — no client-side caching
     of full material databases
   - WAL entries may contain proprietary machining parameters — encrypted at rest (E1-MS8)
   - Session tokens cleared on logout/timeout — no persistent auth in localStorage
```

---

### E4 Architectural Constraints (NEW in v7)

*E4 is 24 microsessions of enterprise infrastructure. Replication and failover decisions must account for ATCS state and WAL integrity.*

#### E4 Replication Architecture Constraints (BINDING)

```
1. ATCS state is REPLICATED, not just WAL entries. A replica that fails over must be able
   to resume an in-progress ATCS task from the last checkpoint. This means:
   - ATCS checkpoint files (C:\PRISM\autonomous-tasks\) are included in replication
   - COMPACTION_SURVIVAL.json is included in replication
   - On failover: replica reads ATCS state → resumes from last checkpoint

2. WAL replication uses streaming, not periodic copy. The replica receives WAL entries
   in near-real-time (< 1s lag). This enables:
   - Hot standby with < 30s RTO
   - No data loss on failover (RPO ≈ 0)

3. Registry data replication is eventual-consistent. Registries are large and change
   infrequently (only during M-M2 campaigns). Sync hourly, not streaming.

4. Configuration replication is pull-based. Replica pulls config on boot and on
   heartbeat failure detection. Config includes: .env, GSD_QUICK.md, hook registry.

5. Multi-tenant isolation: each tenant gets separate WAL files, separate ATCS state,
   separate registry namespaces. Shared: plugin code, calculation engines, hook engine.
   Tenant-specific: data, state, configuration, WAL.
```

#### E4 Failover Sequence (BINDING)

```
Detection: heartbeat miss > 3 consecutive (configurable)
1. Replica promotes to primary
2. Load latest WAL position from replicated COMPACTION_SURVIVAL.json
3. Replay any un-acknowledged WAL entries
4. Load ATCS state → resume any in-progress tasks
5. Update GSD_QUICK.md with new primary endpoint
6. Notify monitoring (if configured)
Total RTO target: < 30 seconds

Reconciliation (after failover):
1. Old primary comes back online as replica
2. Compare WAL positions between old and new primary
3. Replay any divergent entries
4. Sync registries
5. Resume normal replication
```

### E2, E3, E4 Front-Loading Protocol

**At the START of each enterprise phase (E2-MS1, E3-MS1, E4-MS1)**, the first 10 tool calls must:

1. Read the enterprise MS template
2. Read the architectural constraints for that phase (E3 and E4 have binding constraints above)
3. Write detailed specifications for MS1-MS4 of that phase
4. Document in ROADMAP_TRACKER.md: "[PHASE] E{N} specifications written for MS1-MS4"
5. Proceed to execute E{N}-MS1

### Enterprise Critical Integrations

**E1-MS1:** Update compaction_armor.py for WAL state immediately.
**E2-MS1:** Wire cost tracking to PLATFORM-COST-ESTIMATE hook.
**E3-MS1:** React scaffold must implement TelemetryBridge per E3 constraints.
**E4-MS1:** Replication must account for ATCS state per E4 constraints.

### Enterprise SAU Stops

| Stop | Variant | What |
|------|---------|------|
| E1-MS4 | SAU-Light | WAL basics covered |
| E1-MS9 | SAU-Light | Replay + what-if routing in GSD |
| E2-MS5 | SAU-Light | Cost commands in GSD |
| E3-MS10 | SAU-Light | React dashboard routes in GSD |
| E3-MS20 | SAU-Light | Plugin SDK commands, marketplace routing |
| E4-MS8 | SAU-Light | Failover commands, replication status in GSD |

---

## MONOLITH EXTRACTION: M4 (Tiered Approach)

**Tier 1: Critical Extraction (8 MS, Chats 45-52 per Section 9)**

| Category | Count | Est. Lines | MS | Rationale |
|----------|-------|-----------|-----|-----------|
| Core optimization algorithms | ~20 functions | ~8,000 | 3 | Directly improves cutting parameter recommendations |
| Advanced toolpath engines | 5 engines | ~8,000 | 2 | Enables trochoidal, HSM, adaptive strategies |
| Collision detection | 3 engines | ~5,000 | 1 | Safety-critical: prevents tool crashes |
| Thermal analysis | ~10 functions | ~4,000 | 1 | Accuracy-critical: thermal affects tool life |
| Integration + regression | — | — | 1 | Full regression of all Tier 1 extractions |

**Tier 2: High-Value Extraction (20 MS, Chats 53-60 per Section 9)**

| Category | Count | Est. Lines | MS |
|----------|-------|-----------|-----|
| CAD/CAM geometry engines | 15 engines | ~20,000 | 6 |
| Remaining optimization | ~80 functions | ~32,000 | 8 |
| Mesh/geometry processing | 10 engines | ~15,000 | 4 |
| Integration + regression | — | — | 2 |

**Tier 3: Deferred** — 750+ functions. 40-60 additional MS. Scheduled after Tiers 1-2 stable.

**IMPORTANT — T3 and mcp-server retirement:** T3 functions are already ACCESSIBLE through the 324 dispatcher actions — they work through the monolithic mcp-server codebase that gets bulk-imported during M4-T1/T2. T3 extraction is about clean separation into prism-platform plugin architecture, NOT about making functionality available. At retirement (M-FINAL), all 324 actions pass through prism-platform — T3 functions included via bulk-imported code. T3 extraction post-retirement is refactoring for maintainability, not functionality recovery. Gate #2 ("All 324 actions tested through prism-platform, zero regressions") confirms T3 functions work through prism-platform before retirement.

**Each M4 MS must:**
1. **CONSUMER CHAIN MAPPING (BEFORE extraction):** For each function/engine being extracted:
   ```
   a. prism_dev→code_search: find ALL call sites in mcp-server (grep for function name, class name, imports)
   b. Document: "CollisionDetectionEngine is called by: toolpathDispatcher.validatePath() at line 234,
      calcDispatcher.safetyCheck() at line 891, hookRegistration.ts pre-calc gate at line 156"
   c. For EACH call site: verify the equivalent call path exists in prism-platform
   d. If call path missing in prism-platform → CREATE the wire BEFORE marking extraction complete
   e. Write consumer chain to IMPORT_LOG.md: "Engine X → consumed by [A, B, C] → all verified"
   ```
   **This is the critical step that prevents "imported but never called" engines.**
2. Extract function(s) to prism-platform plugin pattern
3. Run prism_validate→validate_anti_regression against mcp-server version
4. Run dual_run_validator.py for extracted functions — **must test through CONSUMER path, not just direct call**
   (i.e., test "prism_calc→toolpath which calls CollisionDetection" not just "CollisionDetection.check()")
5. Verify performance neutral
6. Update IMPORT_LOG.md (with consumer chain) and PLATFORM_STATE.md
7. **KNOWN_RENAMES chain (NEW in v8):** If this MS adds new dispatcher paths, add new prism-platform paths to KNOWN_RENAMES chain (known_renames.json). At M4-T1 integration MS: verify count ≥180. At M-FINAL: verify 10 random old tool names resolve correctly through the full chain (old name → KNOWN_RENAMES → new dispatcher+action → valid response).

**Tier 1 Safety Engine Consumer Expectations (verify during extraction):**

| Engine | Expected Consumers in mcp-server | Verify Wire in prism-platform |
|--------|----------------------------------|------------------------------|
| CollisionDetectionEngine | toolpath validation pre-execution hook, prism_calc→toolpath safety gate | Same hooks fire in prism-platform |
| SpindleProtectionEngine | prism_calc→speed_feed RPM limit check, machine capability validation | CalcHookMiddleware before-hook checks spindle limits |
| ToolBreakageEngine | prism_calc→tool_life, ATCS batch checkpoint (tool wear tracking) | tool_life calculation calls it, batch campaigns track wear |
| WorkholdingEngine | prism_calc→setup fixture validation, toolpath force vs clamp analysis | Setup calculations include workholding check |
| CoolantValidationEngine | prism_calc→speed_feed coolant requirement, machine capability check | CalcHookMiddleware injects coolant validation |
| ManufacturingCalcEngine | prism_calc→speed_feed core Kienzle model, prism_calc→cutting_force | ALL calculation dispatchers delegate to this engine |
| ThreadCalcEngine | prism_thread→calculate, prism_thread→verify_specs | Thread dispatcher actions delegate directly |
| ToolpathStrategyEngine | prism_toolpath→recommend_strategy, prism_toolpath→optimize | Toolpath dispatcher actions delegate directly |
| AdvancedCalcEngine | prism_calc→multi_pass_optimize, prism_calc→surface_finish_predict | Multi-pass and surface finish actions delegate |

**M4 SAU Stops:**
- After Tier 1 integration MS: SAU-Light
- After Tier 2 integration MS: SAU-Full

---

# SECTION 6: ERROR BUDGET AND FAILURE PROTOCOL

## 6.1 Data Campaign Error Policy (Updated for M-M2)

*M-M2 data campaigns are the longest-running workload in the project. Error policy must balance throughput with data integrity. Lives depend on accurate material parameters.*

| Error Type | 1st Occurrence | 2nd Occurrence | 3rd Occurrence | Campaign Impact |
|-----------|----------------|----------------|----------------|----------------|
| Ω < 0.70 on material entry | Retry with adjusted params (check source data) | Split batch, retry halves independently | Quarantine failing entries, accept passing | Continues. Quarantined entries logged to QUARANTINE_LOG.md with root cause. |
| Ω < 0.70 on alarm code | Retry once with expanded reference data | Accept with [LOW_CONFIDENCE] flag | N/A (flags don't accumulate — each stands alone) | Continues. Flagged alarms get manual review queue. |
| Validation failure (S(x) < 0.70) | Fix and re-validate. This is SAFETY-CRITICAL — no auto-skip. | Escalate to OPUS root cause analysis | STOP batch. Quarantine ALL entries from this batch. | Pauses. Entire batch re-validated before acceptance. |
| Registry error mid-campaign | Reload registry, retry current batch | Run registry_health_check.py, fix paths | STOP campaign. Escalate to P0-level registry fix. | Pauses. Registry fix is priority over campaign progress. |
| Compaction during batch | ATCS checkpoint + resume from last checkpoint | Verify ATCS integrity, resume | Manual checkpoint verification before resume | Continues from last verified checkpoint. |
| Ralph API failure | Retry once after 10s delay | Skip Ralph validation, manual review flag | Disable Ralph for remainder of batch, Ω-only validation | Continues with reduced QA. Flag batch as [RALPH_DEGRADED]. |
| Source data conflict (two references disagree) | Use higher-authority source (published handbook > web) | Flag as [SOURCE_CONFLICT], accept with wider uncertainty band | Quarantine. Needs domain expert resolution. | Continues. Quarantined for manual resolution. |

## 6.2 Error Budget Thresholds

| Metric | Green | Yellow | Red | Black (STOP) |
|--------|-------|--------|-----|---------------|
| Batch failure rate (rolling 10) | < 5% | 5-15% | 15-30% | > 30% |
| Quarantined entries | < 2% of total | 2-5% | 5-10% | > 10% |
| Ralph skip rate | < 5% | 5-20% | 20-40% | > 40% |
| Compaction interrupts per chat | 0-1 | 2 | 3 | > 3 |
| Registry reload failures | 0 | 1 | 2 | > 2 |
| S(x) failures (safety-critical) | 0 | 1 (investigate) | 2 (STOP campaign) | > 2 (STOP + full audit) |
| Source conflict rate | < 3% | 3-8% | 8-15% | > 15% (bad source data) |

## 6.3 Error Budget Escalation

```
GREEN on all metrics:
  → Continue campaign at full speed
  → No additional verification needed

YELLOW on any metric:
  → Continue but add extra validation to next 3 batches
  → Log escalation in CAMPAIGN_DASHBOARD.json
  → Review at next SAU-Light stop

RED on any metric:
  → Pause campaign
  → Run mfg_batch_validator.py on last 5 batches
  → Root cause the metric that went RED
  → Resume only after metric returns to YELLOW or GREEN

BLACK on any metric:
  → STOP campaign immediately
  → Full audit of all batches since last GREEN state
  → Root cause + fix required before restart
  → Document in SESSION_INSIGHTS.md as [REGRESSION]
  → Re-validate all entries from degraded batches
```

## 6.4 Campaign Data Rollback Protocol (NEW in v8.1)

*The quarantine system catches individual bad entries. This protocol handles SYSTEMATIC data corruption — when a batch of source data passes validation but contains fundamentally wrong parameters (e.g., Kienzle coefficients from wrong alloy family, incorrect hardness ranges).*

```
REGISTRY SNAPSHOT PROTOCOL:
  Every 5th batch (aligned with mfg_batch_validator.py comprehensive check):
    1. Export full registry state to C:\PRISM\archive\registry_snapshots\
       Filename: SNAPSHOT_{category}_{batch_number}_{timestamp}.json
    2. Record snapshot ID in CAMPAIGN_DASHBOARD.json → snapshot_log[]
    3. Verify snapshot is loadable (read-back test)
    4. Keep last 10 snapshots per category. Archive older to cold storage.

ROLLBACK TRIGGER CONDITIONS:
  - mfg_batch_validator.py detects systematic error (same wrong parameter across 5+ entries)
  - Cross-reference validation finds physically impossible relationships 
    (e.g., kc1.1 values for aluminum appearing in titanium entries)
  - S(x) failures cluster in a single alloy family or condition state
  - External discovery: published reference data contradicts ingested values
  - Error budget hits BLACK for source conflict rate (> 15%)

ROLLBACK PROCEDURE:
  1. STOP campaign immediately
  2. Identify corruption scope: which batches, which entries, which parameters
  3. Find last clean snapshot: the most recent SNAPSHOT before the first corrupted batch
  4. Restore registry from clean snapshot:
     → prism_dev action=file_read path="C:\PRISM\archive\registry_snapshots\SNAPSHOT_materials_{N}.json"
     → Replace current registry entries for affected category
     → Verify registry_health_check.py passes on restored state
  5. Re-validate all entries from corrupted batches against corrected source data
  6. Re-run from the batch after the clean snapshot
  7. Document in SESSION_INSIGHTS.md: [REGRESSION] Campaign rollback from batch X to snapshot Y | root cause
  8. Update CAMPAIGN_DASHBOARD.json: adjust batch counts, mark rolled-back batches as INVALIDATED

SNAPSHOT STORAGE:
  C:\PRISM\archive\registry_snapshots\
  ├── SNAPSHOT_materials_5_2026-03-15T10:00:00.json
  ├── SNAPSHOT_materials_10_2026-03-22T14:30:00.json
  ├── SNAPSHOT_machines_5_2026-03-18T09:00:00.json
  └── ...

INTEGRATION:
  - mfg_batch_validator.py: add --snapshot flag to trigger snapshot before validation
  - campaign_dashboard_updater.py: track snapshot_log with batch→snapshot mapping
  - ATCS: on campaign rollback, replan from clean snapshot batch number
  - CAMPAIGN_DASHBOARD.json: add "last_clean_snapshot" field per category

DOWNSTREAM CONSUMER ROLLBACK PROTOCOL (NEW in v8.4):
  Campaign data flows INTO downstream systems. Rolling back registry data without 
  cleaning downstream consumers creates phantom references and stale intelligence.

  KNOWLEDGE GRAPH (MemoryGraphEngine):
    - M-M2 campaigns add edges at P4-MS4 Consumer #3
    - On rollback: MemoryGraphEngine.removeEdgesBySource(batch_range, category)
    - Verify: query for rolled-back materials returns empty (not stale edges)
    - If MemoryGraphEngine has no removeBySource: add it at M-M2-MS1 as edge metadata
    - Edge metadata: { source_batch: N, validated_at: timestamp }
    - This enables surgical rollback: remove edges from batches X-Y only

  FORMULA ACCURACY TRACKER:
    - CalcHookMiddleware logs predictions vs actuals using campaign data
    - On rollback: purge formula_accuracy.json entries where source_batch in rollback range
    - Recalculate accuracy_scores from remaining data
    - PLATFORM-FORMULA-RECOMMEND will auto-adjust on next invocation

  COMPUTATION CACHE:
    - ComputationCache may contain results computed with rolled-back data
    - On rollback: flush entire cache (conservative but safe — cache rebuilds quickly)
    - Alternative: cache entries tagged with registry_version, invalidate by version

  E2 COST TRACKING:
    - Cost entries from rolled-back batch operations are NOT rolled back
    - Costs were incurred regardless of data validity
    - Add note in cost log: "Batch X-Y costs retained despite data rollback"

  E3 TELEMETRY:
    - TelemetryEngine historical data from rolled-back periods: mark as [ROLLED_BACK]
    - Dashboard renders rolled-back periods with visual indicator (strikethrough/dimmed)
    - Do NOT delete telemetry — it's the audit trail of what happened

  ROLLBACK CHECKLIST (execute in order):
    1. ☐ STOP campaign
    2. ☐ Restore registry from clean snapshot
    3. ☐ MemoryGraphEngine.removeEdgesBySource(batch_range)
    4. ☐ Purge formula_accuracy.json for affected batches
    5. ☐ Flush ComputationCache
    6. ☐ Mark telemetry period as [ROLLED_BACK]
    7. ☐ Verify registry_health_check.py passes
    8. ☐ Verify MemoryGraphEngine queries return clean results
    9. ☐ Document in SESSION_INSIGHTS.md
    10. ☐ Resume campaign from clean snapshot batch
```



## 6.5 Post-Deployment Data Maintenance Protocol (NEW in v9.0)

*Manufacturing data is not static. New alloys, revised handbook data, updated tooling catalogs, controller firmware changes, and evolving safety recommendations all require ongoing data maintenance. Without a defined process, PRISM's knowledge base becomes stale within 12-18 months and operators lose trust.*

```
DATA CATEGORIES AND UPDATE FREQUENCY:

  MATERIALS (quarterly review + event-driven):
    Triggers:
      - New alloy grade published (aerospace specs, tool steel catalogs)
      - Handbook revision (Machinery's Handbook new edition, Sandvik catalog update)
      - Field correction (operator reports parameter mismatch with shop floor experience)
      - New material category request (composites, additive powders, plastics)
    
    Procedure — New Material in Existing Family:
      1. Prepare source data in campaign batch format
      2. Run through data_ingestion_pipeline.py as single-material batch
      3. Ω validation against existing family members (cross-reference check)
      4. If Ω ≥ 0.70: add to registry via DataProvider.put()
      5. Knowledge graph: MemoryGraphEngine.addEdges() for new material relationships
      6. Formula accuracy tracker: reset accuracy_score for affected formulas (new data point)
      7. Safety calculations: run affected entries from test matrix (Category 1-3 overlap)
      8. Document in MAINTENANCE_LOG.md: material, source, date, validator
    
    Procedure — New Material Category (via Extension Fields):
      1. Register new category in EXTENSION_REGISTRY.json
      2. Define extension fields with types, units, and uncertainty ranges
      3. If new calculation model needed: register through CalcModelRegistry (see below)
      4. Ingest materials using campaign batch format with extensions populated
      5. Validate: existing calculations ignore new extensions (backward compatible)
      6. Validate: new calculation model (if any) produces S(x) ≥ 0.70
      7. Document in BREAKING_CHANGES.md if new API actions added (MINOR version bump)

  MACHINES (annual review + event-driven):
    Triggers:
      - Manufacturer releases new model
      - Firmware update changes machine capabilities (max RPM, axis travel)
      - Machine decommissioned from shop floor
    
    Procedure:
      1. Update machine entry via DataProvider.put() with new specs
      2. Cross-reference: verify updated specs don't invalidate existing cutting parameters
         (e.g., new max RPM lower than previously recommended cutting speed)
      3. If cross-reference conflict: flag affected material entries for recalculation
      4. Document in MAINTENANCE_LOG.md

  ALARMS (semi-annual review + event-driven):
    Triggers:
      - Controller firmware update changes alarm codes or meanings
      - New controller family added to shop floor
      - Operator reports fix procedure is incorrect or incomplete
    
    Procedure — Firmware Update:
      1. Compare old alarm code table against new firmware documentation
      2. For changed codes: update via DataProvider.put() with new decode + fix
      3. For removed codes: mark as DEPRECATED (don't delete — historical reference)
      4. For new codes: add via data_ingestion_pipeline.py
      5. Run alarm decode validation (test matrix Category 8) for affected controller
    
    Procedure — New Controller Family:
      1. Register controller in ControllerRegistry (see Section 3.14)
      2. Define alarm schema, decode logic, and fix procedure templates
      3. Ingest alarm codes using campaign batch format
      4. Validate: prism_data→alarm_lookup returns correct decode for new controller
      5. Add test calculation to safety matrix Category 8 (alarm #51+)

  TOOLING (annual review):
    Triggers:
      - Insert manufacturer releases new geometry/grade
      - Tool life data updated from field experience
    
    Procedure:
      1. Update tool entries via DataProvider.put()
      2. Recalculate affected tool life predictions (test matrix Category 4)
      3. Knowledge graph: update tool-material-operation relationships

  SAFETY RECOMMENDATIONS (event-driven):
    Triggers:
      - Industry incident report with parameter implications
      - Updated safety standard (OSHA, ANSI, ISO)
      - Operator near-miss report
    
    Procedure:
      1. Identify affected material/operation/tool combinations
      2. Adjust safety margins (S(x) threshold may need tightening for specific combos)
      3. Re-run full safety test matrix
      4. Document in SAFETY_UPDATES.md with source and rationale
      5. If S(x) threshold change: this is a MAJOR API version bump

QUARTERLY REVIEW CADENCE:
  At every 3rd SAU-Light equivalent (or quarterly, whichever is more frequent post-deployment):
    1. Check for new Machinery's Handbook errata or supplements
    2. Check for manufacturer catalog updates (Sandvik, Kennametal, Iscar, Seco)
    3. Review MAINTENANCE_LOG.md for pending updates
    4. Review operator feedback queue (if integrated with shop floor system)
    5. Run data freshness check: flag any material entry not validated in > 18 months
    6. Run safety test matrix: confirm all 50 calculations still pass post-updates

CHANGE PROPAGATION:
  Any data update triggers:
    1. DataProvider.subscribe('updated') → knowledge graph edge refresh
    2. Formula accuracy tracker: invalidate cached accuracy for affected formulas
    3. ComputationCache: flush entries involving changed data
    4. If safety-critical parameter changed: BLOCK until test matrix re-run passes
    5. E3 dashboard: display "data updated" indicator with timestamp

MAINTENANCE_LOG.md FORMAT:
  [DATE] [CATEGORY] [ACTION] [ENTRY_ID] [SOURCE] [VALIDATOR]
  Example: 2027-01-15 MATERIAL ADD 4140_MOD Machinery's Handbook 31st Ed. J.Smith
```


---

# SECTION 7: ROLLBACK AND RETIREMENT PROTOCOL

## 7.1 Pre-Retirement Gate (M-FINAL)

ALL must pass. No exceptions. No partial credit.

1. **Dual-run validation:** dual_run_validator.py — ~7,200 queries including warm scenario journeys (v8.5), discrepancy < 1%
2. **Full regression:** All 324 actions tested through prism-platform, zero regressions
3. **Performance parity:** All 10 benchmarks — prism-platform meets or exceeds mcp-server
4. **Data integrity:** prism-platform registry counts ≥ mcp-server registry counts
5. **UAT sign-off (ENHANCED in v8.5):** H-4 golden-path sign-off in HUMAN_REVIEW_LOG.md. Manufacturing engineer confirms golden-path outputs are trustworthy for shop-floor use. Requires H-1, H-2, H-3 completed with zero unresolved [REJECTED] entries.
6. **72-hour dual-run:** Both servers parallel for 72 hours, zero divergence. Includes warm scenario workloads (v8.5) testing multi-step journeys.
7. **Safety-critical test matrix:** All 50 calculations (Section 15) produce identical results within ±2σ across both codebases
8. **Cross-track flag resolution:** Zero unresolved [SYNTHETIC_DATA], [DEFERRED], or [INCOMPLETE_REPLICA] flags (Section 3.9)
9. **Agent roster finalized:** Agent count verified and documented, all agents reachable through prism-platform
10. **Infrastructure parity (NEW in v8):** autoHookWrapper (1,559L), cadenceExecutor (2,246L), responseSlimmer (~200L) all imported and functional in prism-platform. Hook chains fire identically in both codebases. Cadence functions execute on same triggers.
11. **Registry parity (NEW in v8):** All 19 registries from MASTER_INDEX §5 loading in prism-platform. Combined loaded lines ≥ mcp-server's 13,879 lines. Verify with registry_health_check.py on both codebases.
12. **Type parity (NEW in v8):** All 5 type definition files (1,419 lines) present in prism-platform. TypeScript compiler reports zero type errors.
13. **MASTER_INDEX parity (NEW in v8):** MASTER_INDEX.md structural counts (dispatchers, actions, engines, registries) match prism-platform live system counts exactly. Zero [MASTER_INDEX_DRIFT] flags.
14. **Wiring certification (NEW in v8.1):** WIRING_CERTIFICATION.md exists, documenting: 29/29 engines with verified consumers, 7/7 intelligence feedback loops with bidirectional flow, 22/22 sequencing guides with all steps traced. Produced by Section 18.5 protocol.
15. **Human review log (NEW in v8.5):** HUMAN_REVIEW_LOG.md exists with H-1 through H-4 complete. Zero unresolved [REJECTED] entries. Domain expert spot-checks confirm source data quality and calculation output trustworthiness.

## 7.2 Rollback Triggers

Automatic rollback if ANY of the following detected post-migration:

- S(x) < 0.70 on safety-critical calculation that mcp-server would have caught
- Registry loading < 90% of pre-migration levels
- 3+ user-reported incorrect outputs in 24 hours
- Performance degradation > 50% on any benchmark
- WAL integrity chain broken (CRC32 verification failure)
- ATCS task fails to resume after compaction (previously worked)

**Procedure:**
1. Switch MCP endpoint to mcp-server (config change only, < 30s)
2. Verify mcp-server is serving correctly
3. Investigate root cause in prism-platform
4. Fix and re-run dual_run_validator.py
5. Re-run safety-critical test matrix (Section 15)
6. Only then re-attempt migration

## 7.3 Post-Migration Monitoring (First 30 Days)

```
Days 1-7:
  → Run safety_calc_test_matrix.py daily
  → Monitor QUARANTINE_LOG.md for new entries
  → Compare all outputs against mcp-server logs
  → Keep mcp-server warm (ready for instant rollback)

Days 8-14:
  → Run safety_calc_test_matrix.py every 48 hours
  → mcp-server can go cold standby
  → Monitor error pattern DB for new patterns

Days 15-30:
  → Run safety_calc_test_matrix.py weekly
  → If zero issues: schedule mcp-server decommission
  → Archive mcp-server codebase to C:\PRISM\archive\mcp-server-final\

Day 31+:
  → Normal operations through prism-platform
  → mcp-server archived but recoverable
```

## 7.4 Backup and Disaster Recovery (NEW in v8.1, ENHANCED in v8.5)

*Compaction survival handles transient context loss. E4 replication handles server failover. This section handles disk failure, file corruption, and environment destruction. v8.5 adds EXTERNAL backup — all prior backups targeted C:\PRISM\archive\ on the SAME drive as source, meaning a single drive failure loses source AND backups simultaneously.*

```
BACKUP SCHEDULE:
  DAILY:
    → C:\PRISM\state\ (all 17 state files: HANDOFF.json, COMPACTION_SURVIVAL.json, 
      CAMPAIGN_DASHBOARD.json, session_memory.json, doc_baselines.json,
      HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json, etc.)
    → C:\PRISM\docs\ (ROADMAP_TRACKER.md, SESSION_INSIGHTS.md, DRIFT_LOG.md,
      COHERENCE_AUDIT.md, ENTERPRISE_PACE.md, HUMAN_REVIEW_LOG.md)
    → Destination: C:\PRISM\archive\daily\ (rotate: keep last 7)

  WEEKLY:
    → C:\PRISM\data\ + C:\PRISM\extracted\ (215 JSON data files)
    → C:\PRISM\mcp-server\.env + C:\PRISM\prism-platform\.env
    → Registry snapshots from Section 6.4
    → Destination: C:\PRISM\archive\weekly\ (rotate: keep last 4)

  AT EVERY SAU STOP (Light or Full):
    → Full codebase snapshot: mcp-server/ and prism-platform/ (excluding node_modules/)
    → MASTER_INDEX.md
    → All GSD files
    → Destination: C:\PRISM\archive\sau\SAU_{id}_{timestamp}\

  EXTERNAL BACKUP (NEW in v8.5):

    AT EVERY SAU-FULL (SU-1 through SU-6):
      → Full codebase snapshot + state files + data files
      → Copy to AT LEAST ONE off-machine destination:
        Option A: External USB drive (manual, reliable)
        Option B: Network share (if available on LAN)
        Option C: Cloud sync (OneDrive/Google Drive/S3 — encrypted)
      → Destination selected at P0-MS0, documented in ENV_CONFIG.md
      → Verify: read-back test on external copy (not just "copy succeeded")
      → Log: "EXTERNAL_BACKUP: SU-X → [destination] [size] [verified: YES/NO]"

    AT EVERY SAU-LIGHT:
      → State files only (HANDOFF.json, ROADMAP_TRACKER.md, COMPACTION_SURVIVAL.json,
        CAMPAIGN_DASHBOARD.json, session_memory.json, HOOK_MANIFEST.json)
      → Same external destination
      → Lightweight: < 5MB, < 30 seconds

    WEEKLY (during M-M2 steady state, weeks 15-49):
      → Registry snapshots + data files to external destination
      → This is the highest-risk period: active data campaigns generating
        irreplaceable validated manufacturing data
      → If external backup fails: WARN in CAMPAIGN_DASHBOARD.json, retry next session

    MINIMUM VIABLE BACKUP:
      → If no external storage available: at minimum, copy latest SAU archive
        to a DIFFERENT physical drive (D:, E:, or any non-C: partition)
      → If only C: exists: document as [SINGLE_DISK_RISK] in ROADMAP_TRACKER
        and prioritize external storage acquisition

    POST-E4:
      → E4 replication subsumes external backup for live data
      → SAU archives still go to external storage (replication covers live state,
        not point-in-time snapshots)
      → Weekly external backup can be reduced to monthly

  WAL FILES:
    → WAL rotation: archive completed WAL segments after retention policy prunes them
    → Keep last 30 days of WAL archives (post-E1)
    → Destination: C:\PRISM\archive\wal\

RECOVERY PROCEDURE (environment destroyed):
  0. If C: drive failed: restore from EXTERNAL backup first. If external backup is
     stale, recover to last external SAU snapshot, accept work loss since that snapshot.
  1. Install toolchain: Node ≥ 18, Python ≥ 3.10, esbuild
  2. Restore latest SAU archive → C:\PRISM\mcp-server\ and C:\PRISM\prism-platform\
  3. Restore latest daily backup → C:\PRISM\state\ and C:\PRISM\docs\
  4. Restore latest weekly backup → C:\PRISM\data\ and C:\PRISM\extracted\
  5. Restore .env files from weekly backup
  6. npm install in both codebases
  7. npm run build in both codebases
  8. Run env_smoke_test.py → verify environment
  9. Run registry_health_check.py → verify data
  10. Run system_self_test.py → verify state coherence
  11. Run Position Recovery (Section 3.1) → find current MS
  12. Resume from last verified MS

CORRUPTION DETECTION:
  - system_self_test.py state coherence check detects state file corruption
  - registry_health_check.py detects data file corruption
  - WAL CRC32 chain detects WAL corruption
  - autoDocAntiRegression detects document corruption (>60% size reduction)
  - HOOK_MANIFEST.json three-way check detects hook count corruption (v8.5)
  - If any corruption detected: restore from most recent clean backup, 
    re-run from last SAU checkpoint
```


---


## 7.5 Post-Migration Rollback Procedure (NEW in v9.0)

*The 72-hour dual-run validates migration quality. But what happens on day 4 — after mcp-server goes to cold standby — when a production issue surfaces that the dual-run didn't catch? This protocol defines how to roll back safely and when to permanently decommission the old system.*

```
ROLLBACK WINDOW: 14 calendar days from migration (M-FINAL-MS6 completion date)

WARM STANDBY (days 1-14):
  mcp-server remains in WARM STANDBY — not deleted, not archived:
    - Server code intact at C:\PRISM\mcp-server\
    - Registry data frozen at migration-day state
    - .env files preserved with last known working config
    - Can be restarted with: cd C:\PRISM\mcp-server && npm run build && restart
    - Daily: verify mcp-server COULD start (build check only, don't run)
    - NOT receiving production traffic (prism-platform is live)

ROLLBACK TRIGGER CONDITIONS (any ONE triggers):
  1. SAFETY CALCULATION FAILURE:
     safety_calc_test_matrix.py (running daily via cron) produces ANY failure
     that was not present in the pre-migration baseline.
     → IMMEDIATE rollback. Safety trumps everything.

  2. REGISTRY DATA CORRUPTION:
     registry_health_check.py reports loading < 90% of RAW_AVAILABLE for any
     category, AND the same check on mcp-server shows no degradation.
     → Rollback + investigate prism-platform-specific data issue.

  3. OPERATOR-REPORTED CALCULATION MISMATCH:
     Shop floor operator reports cutting parameters that "don't match experience"
     for a scenario that WAS validated during H-1 through H-4 gates.
     → Investigate: run same query on BOTH codebases. If mcp-server correct
       and prism-platform wrong: rollback. If both wrong: not a migration issue.

  4. PERFORMANCE DEGRADATION > 50%:
     Any of the 10 performance benchmarks degrades > 50% from pre-migration
     baseline AND persists for > 24 hours.
     → Rollback to restore operator experience while investigating.

  5. ENTERPRISE FEATURE FAILURE AFFECTING SAFETY:
     WAL corruption, replication divergence, or tenant isolation breach that
     could cause incorrect data to reach safety-critical calculations.
     → IMMEDIATE rollback.

ROLLBACK PROCEDURE:
  1. ANNOUNCE: Notify all system users — "System reverting to previous version for [reason]"
  2. SWITCH: Change MCP endpoint back to mcp-server (claude_desktop_config.json)
  3. VERIFY: Run system_self_test.py against mcp-server — all checks pass
  4. DATA RECONCILIATION:
     During the live period, prism-platform may have received:
       - New data campaign entries (if M-M2 continued post-migration)
       - New WAL entries
       - Updated formula accuracy data
       - New operator queries (telemetry only — no action needed)
     
     FOR CAMPAIGN DATA written to prism-platform:
       → Export new entries from prism-platform registries
       → Re-ingest into mcp-server using campaign batch format
       → Validate: Ω ≥ 0.70 for all re-ingested entries
       → Document: "POST_ROLLBACK_REINGEST: X entries from [date range]"
     
     FOR WAL ENTRIES:
       → WAL entries in prism-platform are NOT replayed into mcp-server
       → Document gap in audit trail: "WAL_GAP: [migration_date] to [rollback_date]"
       → This is acceptable — the audit trail gap is documented, not hidden
     
     FOR EVERYTHING ELSE:
       → Telemetry, formula accuracy, computation cache: rebuild naturally
       → No manual reconciliation needed — these self-heal through normal operation
  
  5. POST-ROLLBACK:
     → Run safety_calc_test_matrix.py — verify baseline restored
     → Run performance_benchmark.py — verify baselines restored
     → Document in ROADMAP_TRACKER: "ROLLBACK: prism-platform→mcp-server on [date], reason: [reason]"
     → Create ROOT_CAUSE.md with investigation findings
     → Fix issue in prism-platform
     → Re-attempt migration with extended dual-run (96 hours, not 72)

FORWARD-FIX vs ROLLBACK DECISION:
  If the issue can be fixed in < 4 hours AND is not safety-critical:
    → Forward-fix in prism-platform (apply fix, rebuild, verify)
    → Do NOT rollback for UI issues, performance tuning, or non-safety bugs
  
  If the issue is safety-critical OR estimated fix > 4 hours:
    → Rollback first, fix second
    → Operator safety cannot wait for debugging

DECOMMISSION CRITERIA (end of rollback window):
  After 14 days of clean prism-platform operation (zero rollback triggers):
  1. Final safety_calc_test_matrix.py run — all 50 pass
  2. Final performance_benchmark.py run — all 10 meet targets
  3. Export mcp-server codebase to C:\PRISM\archive\mcp-server-final\
  4. Archive with timestamp and migration report
  5. Remove mcp-server from active paths (but keep archive permanently)
  6. Update claude_desktop_config.json to remove mcp-server endpoint
  7. Document: "DECOMMISSION: mcp-server archived on [date] after 14-day clean operation"

PERMANENT ARCHIVE:
  mcp-server archive is NEVER deleted. It serves as:
    - Historical reference for architectural decisions
    - Regression baseline for safety calculations
    - Recovery option for catastrophic prism-platform failure (unlikely but possible)
  Archive location: C:\PRISM\archive\mcp-server-final\ + external backup
```


# SECTION 8: CORRECTED HOOK INSTALLATION SEQUENCE

*Every hook installs in the MS that builds its dependencies. No hook activates before its deps exist. Updated for Manufacturing track hooks. **Every MS in this table updates HOOK_MANIFEST.json when installing or activating hooks (v8.5).**  Three-way reconciliation at SAU-Full: HOOK_MANIFEST.json == this table == live system.*

| MS | Hooks Installed | Why Here |
|----|----------------|----------|
| P-P0-MS1 | SYS-REGISTRY-HEALTH | registry_health_check.py built |
| P-P0-MS2 | SYS-API-KEY-VERIFY | API verification logic built |
| P-P0-MS3 | PLATFORM-COMPACTION-ARMOR, PLATFORM-ATCS-CHECKPOINT-SYNC (PENDING→ACTIVE at P0-MS8), PLATFORM-CONTEXT-BUDGET | compaction_armor.py + context tracking built |
| P-P0-MS4 | SYS-PHASE-TODO-RESET | todo_phase_reset.py built |
| P-P0-MS9 | PLATFORM-COST-ESTIMATE | Agent executors imported |
| P-P0-MS10 | PLATFORM-SYNC-MANIFEST | SYNC_MANIFEST.json created |
| P-P1-MS1 | PLATFORM-SCRIPT-SANDBOX | safe_script_runner.py built |
| P-P1-MS3 | PLATFORM-IMPORT-VERIFY, PLATFORM-ERROR-PATTERN, PLATFORM-SKILL-AUTO-LOAD, SYS-DRIFT-CHECK (PENDING) | Infra hooks with existing deps. Drift PENDING. |
| P-P1-MS5 | PLATFORM-FORMULA-RECOMMEND | FORMULA_TASK_MAP.json built |
| P-P1-MS7 | PLATFORM-MEMORY-EXPAND | session_memory_expander.py built |
| P-P1-MS8 | SYS-DRIFT-CHECK (→ ACTIVE) | drift_detector.py built |
| P-P2-MS5 | PLATFORM-DEMO-VERIFY | demo_hardener.py built |
| P-P2-MS7 | PLATFORM-MIGRATION-GATE, PLATFORM-REGRESSION-FULL | dual_run_validator.py built |
| P-P2-MS8 | PLATFORM-PERF-GATE | performance_benchmark.py built |
| P-P3-MS1 | PLATFORM-BATCH-ERROR, PLATFORM-BATCH-PROGRESS, PLATFORM-SCHEMA-VERSION | Batch resilience framework built |
| P-P3-MS5 | MFG-UAT-FEEDBACK | UAT infrastructure prepared |
| M-M0-MS2 | MFG-INGESTION-VALIDATE | data_ingestion_pipeline.py built |
| M-M0-MS3 | MFG-CAMPAIGN-PROGRESS | CAMPAIGN_DASHBOARD.json + mfg_batch_validator.py built |
| M-M1-MS4 | MFG-SAFETY-CALC-VERIFY | safety_calc_test_matrix.py built |
| E1-MS1 | PLATFORM-WAL-WRITE | WAL writer built |

**Total: 27 NEW hooks installed across 20 MS. Zero premature activations.**

*Note: The system has 144 total hooks (117 inherited + 23 new platform/system + 4 new manufacturing = 27 new total). The 117 are pre-existing hooks inherited from mcp-server that migrate automatically with autoHookWrapper import at P0-MS7. The 27 above are NEW hooks created during roadmap execution (v8.4 corrected from 28 — SYS-DRIFT-CHECK counted once despite PENDING→ACTIVE transition). Pre-existing hooks must be triaged at P1-MS3 (categorize KEEP/MODIFY/DISABLE) — see P1-MS3 for details.*

**Hook categorization (NEW in v8.4 — corrected):**
```
SYS- prefix (4):       System-level hooks: REGISTRY-HEALTH, API-KEY-VERIFY, PHASE-TODO-RESET, DRIFT-CHECK
PLATFORM- prefix (19):  Platform infrastructure: COMPACTION-ARMOR, ATCS-CHECKPOINT-SYNC, CONTEXT-BUDGET,
                        COST-ESTIMATE, SYNC-MANIFEST, SCRIPT-SANDBOX, IMPORT-VERIFY, ERROR-PATTERN,
                        SKILL-AUTO-LOAD, FORMULA-RECOMMEND, MEMORY-EXPAND, DEMO-VERIFY, MIGRATION-GATE,
                        REGRESSION-FULL, PERF-GATE, BATCH-ERROR, BATCH-PROGRESS, SCHEMA-VERSION, WAL-WRITE
MFG- prefix (4):        Manufacturing: UAT-FEEDBACK, INGESTION-VALIDATE, CAMPAIGN-PROGRESS, SAFETY-CALC-VERIFY
```

**Manufacturing-track hooks (NEW in v7):**
- MFG-INGESTION-VALIDATE: fires on every data ingestion, validates entry against schema + Ω threshold
- MFG-CAMPAIGN-PROGRESS: fires every 50 entries, updates dashboard + checks error budget thresholds
- MFG-SAFETY-CALC-VERIFY: fires on any safety-critical calculation, cross-validates against test matrix


---

# SECTION 9: CHAT EXECUTION SEQUENCES

*Explicit order within every multi-MS chat. Main track first, cross-cutting second, Strategic Update last. Manufacturing track chats interleave with Enterprise starting at Chat 11.*

## Platform Track (Chats 1-10b)

| Chat | Execution Order | MS Count | Context Notes |
|------|----------------|---------|--------------|
| 1 | P-P0-MS0 → MS1 → MS2 → MS3 → MS4 | 5 | Env check + foundation fixes. Sequential. |
| 2 | P-P0-MS5 → MS6 → MS7 → MS8 | 4 | Scaffold then imports. |
| 3 | P-P0-MS9 → MS10 → **SU-1+SAU-Full** → P-P1-MS1 → MS2 | 4+SU | Finish P0, verify+SAU, start P1. |
| 4a | P-P1-MS3 → MS4 → MS5 | 3 | Hook triage + recommendations + config. |
| 4b | P-P1-MS6 → MS7 → MS8 → **SU-2+SAU-Full** | 3+SU | Skills + memory + drift + verify+SAU. |
| 5 | P-P2-MS1 → MS2 → MS3 | 3 | Plugin architecture. |
| 6 | P-P2-MS4 → MS5 | 2 | AutoPilot + manufacturing demos. |
| 7 | P-P2-MS6 → MS7 → MS8 → P-PERF-MS1 → **SU-3+SAU-Full** | 4+PERF+SU | Main → perf → verify+SAU. |
| 8 | P-P3-MS1 → MS2 → MS3 | 3 | ATCS + batch resilience. |
| 9 | P-P4-MS1 → MS2 → P-P3-MS4 → **P-UAT-MS2** | 3+UAT | AutoPilot default + swarm + learning. UAT after main track. |
| 10a | P-P4-MS3 → MS4 → P-P3-MS5 → P-P3P4-FINAL | 4 | Main track only. Clean context. |
| 10b | P-PERF-MS2 → **SU-4+SAU-Full** | PERF+SU | Performance + full verify+SAU. |

## Manufacturing Track (Chats 11-14, then interleaved)

| Chat | Execution Order | MS Count | Context Notes |
|------|----------------|---------|--------------|
| 11 | M-M0-MS1 → MS2 → MS3 | 3 | Plugin activation + data pipeline + dashboard. |
| 12 | M-M0-MS4 → MS5 + SAU-Light | 2+SAU | Remaining dispatchers + SAU. M-M0 COMPLETE. |
| 13 | M-M1-MS1 → MS2 | 2 | Physics audit + material validation. |
| 14 | M-M1-MS3 → MS4 + SAU-Light | 2+SAU | Alarm verification + test matrix. M-M1 COMPLETE. |
| 15 | M-M2-MS1 → MS2 → MS3 | 3 | Campaign init + first batches. |
| 16 | M-M2-MS4 → MS5 → MS6 | 3 | Continued batches + steady state established. |
| 17+ | M-M2 steady-state batches | Variable | 15-25 sessions (v8.5, was 15-20). Includes quarantine-resolution sessions every 5th M-M2 session. Interleaving window extended to weeks 15-49. |

## Enterprise Track (Chats 18+, interleaved with M-M2)

| Chat | Execution Order | Context Notes |
|------|----------------|--------------|
| 18-22 | E1-MS1 through E1-MS18 | WAL + Replay. 3-4 MS per chat. SAU-Light at MS4 and MS9. |
| 23-26 | E2-MS1 through E2-MS10 | Cost Intelligence. **SU-5+SAU-Full** after E2. |
| FLEX-2 | *Buffer if needed* | Between E2 and E3. |
| 27-36 | E3-MS1 through E3-MS30 | Visual Platform. SAU-Light at MS10 and MS20. FLEX-E3 between MS20→MS21. |

**E3 Chat Loading Guide (30 MS across ~12 chats, EXPANDED from ~10 in v8.5 due to TOOL-BUILD complexity):**

**E3 COMPLEXITY CLASSIFICATION (NEW in v8.5):**
```
[UI-RENDER]: Component builds with known patterns. Predictable effort.
[STATE-INTEGRATION]: Wiring data flow through TelemetryBridge + state store.
  Debugging state issues is unpredictable. Budget 50% more tool calls.
[TOOL-BUILD]: Interactive tools with complex user interaction (drag-drop,
  visual editing, timeline scrubbing). Highest variance. Budget 100% more.
  These MS should be allocated 1-2 per chat, NOT 3-4.
[PLATFORM-BUILD]: SDK, marketplace, hot-install. Moderate complexity.
```

| Chat | MS | Load | Class | Deliverables |
|------|----|------|-------|-------------|
| 27 | E3-MS1 → MS3 | 🔴 HEAVY | STATE-INT + UI-RENDER | React scaffold + state store decision + TelemetryBridge + WebSocket channels + component library foundation. Front-loading writes detailed specs for MS1-MS5. **E3 Architectural Decision Replay #1 (v8.5).** |
| 28 | E3-MS4 → MS6 | 🟡 MEDIUM | STATE-INT + UI-RENDER | Extended components (TimeRangeSelector, MetricCard) + auth/RBAC + SystemDashboard + PredictiveFailure/PFP engine imports. |
| 29 | E3-MS7 → MS10 + SAU-Light | 🔴 HEAVY | UI-RENDER | PredictiveAlertPanel + CampaignDashboard + CalculationDashboard + AlarmDashboard + SAU-Light. Layer 1→2 complete. Front-load Layer 2 specs. **E3 Decision Replay #2 (v8.5).** |
| 30 | E3-MS11 → MS13 | 🟡 MEDIUM | STATE-INT + TOOL-BUILD | Dashboard cross-integration + dashboard polish + engine consumer verification + FlowCanvas foundation. |
| 31 | E3-MS14 → MS15 | 🟡 MEDIUM | TOOL-BUILD | FlowCanvas wiring + HookDesigner foundation. **(SPLIT from v8.4: was MS14-MS16, TOOL-BUILD MS need more room)** |
| 31b | E3-MS16 | 🟡 MEDIUM | TOOL-BUILD | HookDesigner advanced (chain visualization, priority conflicts). |
| 32 | E3-MS17 → MS18 | 🔴 HEAVY | TOOL-BUILD | ReplayViewer + WhatIf branching. **(SPLIT from v8.4: was MS17-MS20, 4 TOOL-BUILD MS in one chat was unrealistic)** |
| 32b | E3-MS19 → MS20 + SAU-Light | 🔴 HEAVY | TOOL-BUILD | Interactive tool integration + Layer 3 validation + SAU-Light. Front-load Layer 4 specs. **E3 Decision Replay #3 (v8.5).** |
| FLEX-E3 | *Buffer* | — | — | Catch-up before Layer 3→4 transition. |
| 33 | E3-MS21 → MS23 | 🟡 MEDIUM | PLATFORM-BUILD | Plugin SDK design + implementation + Marketplace foundation. |
| 34 | E3-MS24 → MS26 | 🟡 MEDIUM | PLATFORM-BUILD | Marketplace install/update + hot-install zero-downtime + compliance dashboard. |
| 35 | E3-MS27 → MS29 | 🟡 MEDIUM | PLATFORM-BUILD | Compliance reporting + integration test suite + performance polish + accessibility. |
| 36 | E3-MS30 | 🟢 LIGHT | — | Final integration, E3 certification, all engine consumers confirmed, handoff to E4. **E3 Decision Replay #4 (v8.5).** |

| 37-44 | E4-MS1 through E4-MS24 | Enterprise Readiness. SAU-Light at E4-MS8. |

**E4 Chat Loading Guide (24 MS across ~8 chats, interleaved with M-M3):**
| Chat | MS | Load | Deliverables |
|------|----|------|-------------|
| 37 | E4-MS1 → MS3 | 🔴 HEAVY | Multi-tenant data model + auth/provisioning + data isolation. Front-loading writes detailed specs for MS1-MS6. 10+ tool calls per MS. |
| 38 | M-M3-MS1 → MS2 | — | *M-M3 interleave: ISO compliance framework + process validation. CertificateEngine imported.* |
| 39 | E4-MS4 → MS6 | 🟡 MEDIUM | Tenant config management + dashboard scoping + tenant integration test (3 tenants, zero cross-contamination). |
| 40 | E4-MS7 → MS8 + SAU-Light | 🟡 MEDIUM | Replication infrastructure + WAL streaming replication + SAU-Light. |
| 41 | M-M3-MS3 → MS4 + SAU-Light | — | *M-M3 interleave: Material certification + compliance integration. M-M3 COMPLETE.* |
| 42 | E4-MS9 → MS14 | 🔴 HEAVY | ATCS replication + registry replication + failover sequence + reconciliation + audit logging + compliance hooks. Consider splitting at MS12. |
| 43 | E4-MS15 → MS20 | 🔴 HEAVY | API governance + data retention + security audit + governance integration + deployment config + health monitoring. Consider splitting at MS18. |
| 44 | E4-MS21 → MS24 | 🟡 MEDIUM | Operational runbooks + load testing + full integration suite + E4 phase completion. Handoff to M4. |

### Manufacturing M-M3 Chats (Interleaved with E4, Chats 37-44)

| Chat | Execution Order | Context Notes |
|------|----------------|--------------|
| 38 | M-M3-MS1 → MS2 | ISO compliance framework + process validation. CertificateEngine imported. |
| 41 | M-M3-MS3 → MS4 + SAU-Light | Material certification + compliance integration + SAU-Light. M-M3 COMPLETE. |

*M-M3 chats interleave with E4. Scheduling rule: do NOT mix M-M3 and E4 MS in the same chat. Use alternating chats within the 37-44 range.*
| FLEX-3 | *Buffer if needed* | Before M4 extraction. |
| 45-52 | M4-T1 (8 MS) | Tier 1 critical extraction. SAU-Light after T1 integration MS. |
| 53-60 | M4-T2 (20 MS) | Tier 2 high-value extraction. SAU-Full after T2 integration MS. |
| 61-66 | M-FINAL-MS1 through MS6 + **SU-6+SAU-Full** | Migration: dual-run + certification + retirement. |

### M-FINAL Microsession Breakdown (Chats 61-66)

M-FINAL spans real-world days due to the 72-hour dual-run. Chat mapping accounts for wait periods.

| Chat | MS | Title | Effort | Steps |
|------|-----|-------|--------|-------|
| 61 | M-FINAL-MS1 | Pre-migration wiring certification + H-4 gate | ~25 tool calls | Run WIRING_CERTIFICATION.md protocol (Section 18.5). Verify 29/29 engines, 7/7 loops, 22/22 guides. **Execute H-4 human gate (v8.5): present 5 golden-path scenarios to manufacturing engineer for live observation. Scenarios: (1) roughing 4140 steel, (2) finishing Ti-6Al-4V, (3) alarm decode FANUC 414, (4) multi-operation sequence, (5) tool life prediction. Engineer observes PRISM output vs their experience. Written sign-off required in HUMAN_REVIEW_LOG.md.** Generate certification report. ENTRY: SU-6 COMPLETE + SAU-Full PASS. EXIT: WIRING_CERTIFICATION.md exists, H-4 sign-off in HUMAN_REVIEW_LOG.md, all 15 gates pass. |
| 62 | M-FINAL-MS2 | Dual-run infrastructure + gate validation (gates 1-5) | ~20 tool calls | Deploy dual_run_workload.py (~350 lines, v8.5 rebalanced). Run ~7,200 queries including warm scenario journeys across both codebases. Validate gates 1-5 (dual-run <1%, 324 actions zero regression, 10 benchmarks, registry counts, H-4 UAT sign-off confirmed). EXIT: Gates 1-5 PASS, dual-run infrastructure operational. |
| 63 | M-FINAL-MS3 | 72-hour dual-run START + safety matrix | ~15 tool calls | Start 72-hour parallel execution. Run safety_calc_test_matrix.py (50 calculations from Section 15). Validate gate 7 (±2σ tolerance). Verify KNOWN_RENAMES: test 10 random old tool names resolve correctly. EXIT: 72-hour dual-run running, safety matrix PASS, KNOWN_RENAMES verified. |
| 64 | M-FINAL-MS4 | 72-hour dual-run MIDPOINT check | ~10 tool calls | Check divergence logs at ~36 hours. Run spot-check on gates 6, 8-15. Verify zero [SYNTHETIC_DATA]/[DEFERRED]/[INCOMPLETE_REPLICA] flags. Verify agent roster. Check for [STATEFUL_DIVERGENCE] from warm scenarios (v8.5). EXIT: Zero divergence at midpoint, cross-track flags resolved. |
| 65 | M-FINAL-MS5 | 72-hour dual-run END + final certification | ~15 tool calls | Collect 72-hour results. Validate gate 6 (zero divergence). Run ALL 15 gates as final pass. Verify HUMAN_REVIEW_LOG.md: H-1 through H-4 complete, zero unresolved [REJECTED]. Verify COHERENCE_AUDIT.md: zero MAJOR drift items at SU-6. Generate MIGRATION_REPORT.md with gate-by-gate results. EXIT: All 15 gates PASS, MIGRATION_REPORT.md complete. |
| 66 | M-FINAL-MS6 | Retirement execution + monitoring setup | ~15 tool calls | Switch MCP endpoint to prism-platform. Verify mcp-server goes cold standby (not deleted). Deploy post-migration monitoring (Section 7.3). Set up daily safety_calc_test_matrix.py cron. **Final external backup of both codebases to off-machine destination (v8.5).** EXIT: prism-platform LIVE, mcp-server on standby, monitoring active, final backup verified. |

| 67 | M-FINAL-MS7 | User documentation generation (v9.0) | ~15 tool calls | Auto-generate operator-facing documentation from system knowledge: (1) Getting Started Guide — boot, first query, understanding results. (2) Common Workflow Tutorials — material lookup, speed/feed calculation, alarm decode, tool life prediction, multi-operation sequence. (3) Alarm Decode Quick Reference — printable reference card for each controller family. (4) Understanding PRISM Output — what S(x) means, what uncertainty bands mean, when to trust vs verify, what quarantine means. (5) Shop Floor FAQ — "why is this number different from my handbook?" "what if PRISM says X but I know Y?" "how to report a problem." All generated from PRISM's own knowledge base + data registry. Validated during H-4 engineer review — engineer confirms docs match operator mental model. ENTRY: M-FINAL-MS6 COMPLETE (system live). EXIT: USER_GUIDE.md + ALARM_QUICK_REF.md + SHOP_FLOOR_FAQ.md generated, reviewed, placed in C:\PRISM\docs\user-facing\. |

**72-HOUR DUAL-RUN WORKLOAD SPECIFICATION (REBALANCED in v8.5):**
```
THE PROBLEM:
  The 72-hour dual-run requires continuous query traffic to both codebases.
  Claude sessions are not continuously active for 72 hours.
  Manual operation for 72 hours is impractical.
  v8.4 had ~5,400 queries at ~3.7 per action — insufficient for complex actions.
  All queries were stateless, missing interaction bugs between ATCS/context/calcs.

SOLUTION — AUTOMATED WORKLOAD GENERATOR:
  Created at M-FINAL-MS2 as dual_run_workload.py (~350 lines):

  1. WORKLOAD COMPOSITION (~7,200 queries, was ~5,400):

     a. SAFETY-CRITICAL CALCULATIONS (unchanged):
        50 calculations × 12 cycles = 600 queries

     b. WEIGHTED REPRESENTATIVE QUERIES (v8.5 — replaces flat 100/cycle):
        Distributed by action complexity class, not uniformly:

        CLASS A — Stateful/Complex (82 actions):
          Multi-pass optimization, knowledge graph, ATCS operations,
          batch validation, campaign management, WAL replay, swarm deployment
          → 8 varied queries per action per cycle (edge cases, boundary values)
          → Cap: 3,600 queries

        CLASS B — Standard (162 actions):
          Material lookups, alarm decodes, single calculations, hook operations
          → 3 queries per action per cycle (1 nominal + 1 edge case + 1 varied)
          → Cap: 2,400 queries

        CLASS C — Infrastructure (80 actions):
          Config reads, status checks, simple getters
          → 1 query per action per cycle
          → Cap: 600 queries

     c. KNOWN_RENAMES (unchanged): 10 per cycle × 12 = 120

     d. ATCS LIFECYCLE (unchanged): 5 per day × 3 = 15

     e. HIGH-PRESSURE SCENARIOS (unchanged): 3 per day × 3 = 9

     f. WARM SCENARIO WORKLOADS (NEW in v8.5 — ~208 queries):
        Multi-step user journeys that test state interaction:

        JOURNEY A — "New Job Setup" (6 runs):
          boot → material_lookup → speed_feed → tool_life → cutting_force → report
          → 36 queries

        JOURNEY B — "Alarm Investigation" (6 runs):
          boot → alarm_decode → related_alarms → fix_procedure → knowledge_graph → log
          → 36 queries

        JOURNEY C — "Batch Campaign Session" (4 runs):
          boot → ATCS_queue → batch_start → ingest → validate → quarantine_check →
          dashboard → ATCS_checkpoint → ATCS_resume
          → 36 queries

        JOURNEY D — "Context Pressure + Recovery" (4 runs):
          boot → fill_context_70% → pressure_hook → calc_under_pressure →
          verify_result → compaction → resume → verify_state → same_calc → compare
          → 40 queries

        JOURNEY E — "Multi-Operation Machining" (4 runs):
          boot → material → rough → semi_finish → finish → verify_params_change →
          tool_life_each → total_cycle_time
          → 32 queries

        JOURNEY F — "Knowledge Graph + Learning" (4 runs):
          boot → material → related → calc_related → log_accuracy →
          query_recommendations → verify_changed
          → 28 queries

        Each journey runs on BOTH codebases and compares END-STATE, not just
        individual responses. The journey must produce identical final state.

     GRAND TOTAL: 600 + 6,600 + 120 + 15 + 9 + 208 ≈ 7,552 queries
     (~7,200 after deduplication and cycle timing)

  2. EXECUTION MECHANISM:
     - dual_run_workload.py runs as a Windows Scheduled Task (schtasks)
     - Triggers: every 4 hours for 72 hours starting at M-FINAL-MS3 completion
     - Each run: sends identical queries to BOTH mcp-server AND prism-platform endpoints
     - Warm scenario journeys run once per cycle (every 4 hours)
     - Logs: query, both responses, diff (if any), timestamp → DUAL_RUN_LOG.json

  3. DIVERGENCE DETECTION (enhanced in v8.5):
     - After each cycle: compare all response pairs
     - Numeric results: ±2σ tolerance (same as safety matrix)
     - String results: exact match required
     - Journey end-state: compare final system state after full journey
     - NEW: Sequence-dependent divergence — if journey step N produces identical
       results but step N+1 diverges, flag as [STATEFUL_DIVERGENCE] (higher
       severity than isolated divergence)
     - Missing responses: immediate RED flag
     - Divergence log: DUAL_RUN_DIVERGENCE.md (append-only)
     - If divergence count > 0 at any cycle: alert file → C:\PRISM\state\DUAL_RUN_ALERT.json

  4. SESSION INTERACTION:
     - M-FINAL-MS4 (midpoint, ~36h): read DUAL_RUN_LOG.json + DIVERGENCE.md → assess
     - M-FINAL-MS5 (endpoint, ~72h): read final logs → validate gate 6 → generate report
     - If DUAL_RUN_ALERT.json exists at midpoint: investigate before continuing
     - If any [STATEFUL_DIVERGENCE] detected: investigate IMMEDIATELY — state bugs compound

  5. SETUP (at M-FINAL-MS2):
     - Write dual_run_workload.py
     - Configure scheduled task: schtasks /create /sc HOURLY /mo 4 /tn "PRISM_DualRun" ...
     - Verify: run one manual cycle → check both endpoints respond → check log writes
     - Verify: run one warm scenario journey → check end-state comparison works
     - Document: scheduled task name, log locations, alert mechanism
```

**M-FINAL scheduling note:** Chats 63-65 span 3+ real-world days due to 72-hour dual-run. Chat 64 occurs ~36 hours after chat 63. Chat 65 occurs ~72 hours after chat 63. Do NOT attempt to compress into single day. The automated workload generator runs between sessions — no manual operation required during the 72-hour window.
| 67-70 | M4-T3 (ongoing) | Deferred extraction (post-retirement refactoring). |

### M-M2 Interleaving Protocol (NEW in v8.2)

*M-M2 steady-state batches (batches 6+) run in parallel with Enterprise chats 18+. This section defines the mechanics.*

```
INTERLEAVING MECHANICS:
  M-M2 batches execute via ATCS queue-and-execute model (NOT background daemon).
  Enterprise MS execute in dedicated chats (NOT mixed with batch operations).

  ATCS QUEUE MODEL (NEW in v8.4):
    - ATCS maintains TASK_QUEUE.json with pending batch operations
    - Batches only execute during active Claude sessions
    - On M-M2 session start: ATCS reads queue → auto-starts next batch → checkpoints
    - Between sessions: queue is dormant (no processing occurs)
    - Throughput: ~3-5 batches per M-M2 chat session

  Each working session, the executor picks the next chat based on:
    1. BLOCK dependencies (Section 3.9 table) — unblock first
    2. SAU-Light stops due — complete before proceeding
    3. Alternate tracks — if last chat was Enterprise, next is M-M2 batch review (and vice versa)
    4. M-M2 batch milestones — at batch 10/20/30, M-M2 takes priority for SAU-Light/UAT

  Within a single chat:
    - Do NOT mix M-M2 batch operations with Enterprise MS
    - M-M2 chats: ATCS auto-starts queued batches → review results → run mfg_batch_validator if due → ATCS checkpoint → dashboard update
    - Enterprise chats: 2-4 MS per chat per enterprise template
    - Cross-cutting MS (P-PERF, P-UAT) execute AFTER main-track MS in whichever chat they're assigned to

  ATCS SESSION-BASED AUTONOMY:
    At the start of each M-M2 chat: SessionLifecycleEngine reads TASK_QUEUE.json →
    ATCS auto-starts next queued batches → processes until checkpoint/completion/pressure →
    executor reviews results → run validation on completed batches → update dashboard → 
    resolve any quarantine items → ATCS checkpoints remaining queue.
```

## Flex Chats

| Flex | Position | Use |
|------|----------|-----|
| FLEX-1 | Between P2 and P3 (after Chat 7) | Platform catch-up or tech debt. |
| FLEX-2 | Between E2 and E3 (after Chat 26) | Enterprise catch-up. Cross-track flag resolution. |
| FLEX-E3 | Between E3-MS20 and E3-MS21 (Layer 3→4, after Chat ~33) | E3 catch-up. 30 MS is the largest phase — Layer 3→4 is the natural break point. |
| FLEX-3 | Between E4 and M4-T1 (after Chat 44) | Pre-extraction catch-up. |

## Execution Rules

1. If PLATFORM-CONTEXT-BUDGET hits YELLOW: complete current MS, write HANDOFF.json, defer rest to next chat.
2. SU points (with SAU) are ALWAYS the last thing in their chat. Never skip, but defer if context-pressured.
3. Cross-cutting MS (PERF, UAT) execute AFTER all main-track MS in that chat.
4. SAU-Full at SU points and major phase boundaries. SAU-Light at all other boundaries.
5. Flex chats are used if ANY phase ran over schedule. If on track, skip them.
6. Build only the changed codebase unless both are explicitly touched or at phase boundary/SU.
7. Manufacturing and Enterprise chats alternate when M-M2 enters steady state. Priority: whichever has a BLOCK dependency waiting.
8. Cross-track dependency check (Section 3.9) at the START of every chat that appears in the dependency table.


---

# SECTION 10: PRISM_QUICK_REF.md SPECIFICATION

*This file is AUTO-GENERATED by quick_ref_generator.py. Max 2KB. NEVER hand-edited. Contains ONLY identifiers and paths.*

```markdown
# PRISM Quick Reference — [Auto-generated: YYYY-MM-DD HH:MM]

## Build
- Command: npm run build (esbuild, NEVER tsc)
- mcp-server: C:\PRISM\mcp-server\
- prism-platform: C:\PRISM\prism-platform\

## State Files
- Position: C:\PRISM\docs\ROADMAP_TRACKER.md
- Handoff: C:\PRISM\state\HANDOFF.json
- Survival: C:\PRISM\state\COMPACTION_SURVIVAL.json
- Insights: C:\PRISM\docs\SESSION_INSIGHTS.md
- Insight Archive: C:\PRISM\docs\SESSION_INSIGHTS_ARCHIVE.md
- Imports: C:\PRISM\prism-platform\docs\IMPORT_LOG.md
- Drift: C:\PRISM\docs\DRIFT_LOG.md
- Campaign: C:\PRISM\state\CAMPAIGN_DASHBOARD.json

## Active Hooks [auto-counted]
[List of hook IDs read from hook registry]

## Pending Hooks [auto-counted]
[List of PENDING hook IDs with awaited dependency]

## Scripts [auto-scanned]
[List of script paths from C:\PRISM\scripts\]

## Agent Model Strings [auto-read from config]
- HAIKU: [current string from .env]
- SONNET: [current string from .env]
- OPUS: [current string from .env]

## Agent Count [auto-counted from agent registry]
- Total: X agents
- Last verified: [timestamp from most recent SAU]

## Registry Counts [auto-queried]
- Materials: X/RAW_AVAILABLE (theoretical: 3,518)
- Machines: Y/RAW_AVAILABLE (theoretical: 824)
- Alarms: Z/RAW_AVAILABLE (theoretical: 9,200)

## Campaign Progress [auto-read from CAMPAIGN_DASHBOARD.json]
- Material batches: X complete
- Machine batches: Y complete
- Alarm batches: Z complete
- Quarantine rate: X%

## Current Phase [auto-read from ROADMAP_TRACKER]
[Phase and MS ID]

## Last SAU [auto-read from ROADMAP_TRACKER]
[Most recent SAU completion timestamp and variant (Light/Full)]

## Cross-Track Flags [auto-scanned from ROADMAP_TRACKER]
[List of active SYNTHETIC_DATA / DEFERRED / INCOMPLETE_REPLICA flags]
```

**Generation:** `python C:\PRISM\scripts\quick_ref_generator.py` — reads actual system state, outputs to C:\PRISM\docs\PRISM_QUICK_REF.md. Runs automatically at every SAU stop (Light or Full).


---

# SECTION 11: REVISED COMPLETE TIMELINE

## Critical Path Analysis (NEW in v7)

```
CRITICAL PATH (delay here delays everything):
  P0-MS1 (registries) → P0-MS3 (compaction) → P0-MS5 (scaffold) → P0-MS7 (dispatchers) →
  P0-MS9 (agents) → P0-MS10 → SU-1 → P1 → P2 → P3-MS1 (batch resilience) →
  M-M2-MS1 (campaign start) → ... → M-M2 batch 20 → P-UAT-MS1 →
  M-FINAL → retirement

FLOAT (can slip without delaying critical path):
  P0-MS2 (API verify): 1 chat float — can move to Chat 2 if needed
  P0-MS4 (calc fix + telemetry): 0.5 chat float — calc fix is critical, telemetry can defer
  P1-MS4 through P1-MS7 (recommendations, skills, memory): 1 chat float each
  E1 through E4: can slip relative to each other, but E1 must precede M-FINAL
  M-M3 (compliance): 2-3 chat float — not on critical path until M-FINAL

ZERO FLOAT (any delay cascades):
  P0-MS1: registries block everything
  P3-MS1: batch resilience blocks M-M2
  M-M2 batch 20: blocks P-UAT-MS1
  SU-4: blocks M-M2 campaign start
  SU-6: blocks M-FINAL
```

## Timeline

| Week | Chat # | Platform Track | Manufacturing Track | Enterprise Track | Strategic Updates |
|------|--------|---------------|---------------------|-----------------|-------------------|
| 1-2 | 1-3 | P0: Env check, fix registries, scaffold, imports | — | — | **SU-1+SAU-Full** (end Chat 3) |
| 3-4 | 4a-4b | P1: Consolidate + wire + sandbox | — | — | **SU-2+SAU-Full** (end Chat 4b) |
| 5-7 | 5-7 | P2: Generalize (DEMO 1 prep) | — | — | **SU-3+SAU-Full** (end Chat 7) |
| 7-8 | FLEX-1 | *Buffer if needed* | — | — | — |
| 8-10 | 8-10b | P3+P4: Autonomy + orchestration | — | — | **SU-4+SAU-Full** (Chat 10b) |
| 11-12 | 11-12 | — | M-M0: Plugin packaging + data infra | — | SAU-Light (end M-M0) |
| 13-14 | 13-14 | — | M-M1: Knowledge recovery + validation | — | SAU-Light (end M-M1) |
| 15-16 | 15-16 | — | M-M2: Campaign init + first batches | — | — |
| 17-20 | 17-22 | — | M-M2: Steady-state (interleaved) | E1: WAL + Replay (18 MS) | SAU-Light at E1-MS4, E1-MS9 |
| 21-26 | 23-26 | — | M-M2: Continues | E2: Cost Intelligence (10 MS) | **SU-5+SAU-Full** (after E2) |
| 26-27 | FLEX-2 | *Buffer if needed* | — | — | Cross-track flag resolution |
| 27-36 | 27-36 | — | M-M2: Completing + M-M3 start | E3: Visual Platform (30 MS) | SAU-Light at E3-MS10, E3-MS20 |
| 37-44 | 37-44 | — | M-M3: Compliance | E4: Enterprise Readiness (24 MS) | SAU-Light at E4-MS8 |
| 44-45 | FLEX-3 | *Buffer if needed* | — | — | — |
| 45-52 | 45-52 | — | M4-T1: Critical extraction | — | SAU-Light (after T1) |
| 53-60 | 53-60 | — | M4-T2: High-value extraction | — | SAU-Full (after T2) |
| 61-66 | 61-66 | — | M-FINAL: Migration (dual-run) | — | **SU-6+SAU-Full** (pre-migration) |
| 67-70 | 67-70 | — | M4-T3: Deferred (ongoing) | — | Post-migration monitoring |

**Total: ~71 chats + 4 flex + ~5 additional (v8.5 E3 splits + quarantine sessions) + 1 documentation chat (v9.0) = ~75-80 chats. ~195 microsessions. ~75-85 weeks.**

## Investor Demo Schedule

| Demo | When | Shows | Depends On |
|------|------|-------|-----------|
| DEMO 1 | After SU-3 (Week 7) | Plugin architecture, 5 golden paths, AutoPilot routing | P2 complete |
| DEMO 2 | After M-M2 batch 20 (Week ~20) | Live data, batch campaigns, autonomous operation | M-M2 progress + **P-UAT-MS1 critical issues resolved** |
| DEMO 3 | After E3-MS20 (Week ~34) | Visual dashboard, FlowCanvas, compliance UI | E3 progress |
| DEMO 4 | After SU-6 (Week ~66) | Full system, migration readiness, enterprise features | Everything |

**DEMO/UAT Ordering (NEW in v8.2):**
Both DEMO 2 and P-UAT-MS1 trigger at M-M2 batch 20 (≥900 validated material entries). Execution order:
1. P-UAT-MS1 runs FIRST — early feedback from manufacturing engineer
2. Any CRITICAL issues from P-UAT-MS1 → fix before DEMO 2
3. DEMO 2 runs after P-UAT-MS1 critical issues resolved
4. P-UAT-MS1 critical failures BLOCK DEMO 2 (investor demos must show working system)
Both can be in the same chat if P-UAT-MS1 produces no critical issues; otherwise separate chats.


---

# SECTION 12: OUTCOME METRICS

| Metric | Target | Measured How | Gate |
|--------|--------|-------------|------|
| Hooks catch real defects | ≥ 3 blocks per session | Count BLOCK events | Quality |
| Swarms beat single-agent | ≥ 15% higher Ω | A/B same task | Quality |
| Agent recommendations accepted | ≥ 75% not overridden | Override rate | Efficiency |
| Tasks survive compaction | ≥ 95% via ATCS + armor | Completion rate | Resilience |
| Error resolution accelerates | ≥ 50% faster for known | Time-to-fix trend | Intelligence |
| Cost tracking accurate | ±5% of actual | API billing calibration | Financial |
| Material queries accurate | 100% with uncertainty | Published data cross-validation | Safety |
| Calculations correct | Within ±2σ | Safety-critical test matrix (Section 15) | Safety |
| Failover RTO | < 30 seconds | Kill primary, measure | Reliability |
| Plugin hot-install | Zero downtime | Install during workload | Architecture |
| Demo reliability | 100% across 5 runs | demo_hardener.py | Quality |
| Registry loading | > 95% of RAW_AVAILABLE | registry_health_check.py | Data |
| Performance benchmarks | All 10 met | performance_benchmark.py | Performance |
| UAT pass rate | > 90% scenarios | uat_session_runner.py | Usability |
| Dual-run discrepancy | < 1% across 100 queries | dual_run_validator.py | Migration |
| Data campaign error rate | < 5% quarantined | mfg_batch_validator.py | Data |
| Codebase drift | < 3 unresolved items | DRIFT_LOG.md | Architecture |
| Session memory utilization | 15/15 categories populated | session_memory.json audit | Intelligence |
| Formula recommendation hit rate | > 50% used | Accuracy tracker | Intelligence |
| Strategic Update pass rate | 6/6 SU gates passed | SU verification results | System |
| SAU artifact freshness | GSD + quick-ref updated at every boundary | SAU log in ROADMAP_TRACKER | System |
| State file coherence | Zero discrepancies at SU points | system_self_test.py | Reliability |
| Agent count accuracy | Verified at every SAU stop | Agent registry vs documented count | System |
| Cross-track flag resolution | Zero flags at SU-6 | ROADMAP_TRACKER flag scan | Integration |
| Safety test matrix pass rate | 50/50 on both codebases pre-migration | safety_calc_test_matrix.py | Safety |
| Campaign throughput | ≥ 50 entries/batch average | CAMPAIGN_DASHBOARD.json | Efficiency |
| Phase insight preservation | All phases archived | SESSION_INSIGHTS_ARCHIVE.md | Intelligence |

## 12.1 Performance Benchmark Specification (10 benchmarks) (NEW in v8.1)

*Referenced by P2-MS8, P-PERF-MS1 through MS4, SU-3, SU-5, SU-6, and Section 7.1. Executed by performance_benchmark.py. All 10 must pass for migration.*

| # | Benchmark | Target | How Measured | Seeded At | Migration Gate? |
|---|-----------|--------|-------------|----------|----------------|
| 1 | Material lookup latency | < 50ms | prism_data→material_lookup("4140") average over 100 calls | P0-MS10 | YES |
| 2 | Hook chain overhead | < 10ms per call | Time from dispatcher entry to first hook exit, 100-call average | P0-MS10 | YES |
| 3 | Session boot time | < 3s cold start | Time from prism_dev→session_boot to "ready" response | P0-MS10 | YES |
| 4 | Calculation throughput | < 200ms for speed_feed | prism_calc→speed_feed end-to-end including hooks, 50-call average | P-PERF-MS1 | YES |
| 5 | WAL write overhead | < 2ms per entry | Time added to dispatcher call by WAL write, 1000-entry average | P-PERF-MS3 (after E1) | YES |
| 6 | AutoPilot routing latency | < 50ms query→dispatcher | Time from query receipt to correct dispatcher invocation | P-PERF-MS1 | YES |
| 7 | Swarm deployment time | < 500ms to first agent | Time from swarm request to first agent invocation | P-PERF-MS2 | YES |
| 8 | ComputationCache hit rate | > 80% on repeated queries | Cache hits / (hits + misses) over 200 repeated calculations | P-PERF-MS2 | NO (advisory) |
| 9 | Context pressure accuracy | ±5% of actual | Predicted vs actual context usage at 60%, 70%, 85% thresholds | P-PERF-MS2 | YES |
| 10 | Compaction recovery time | < 10s to resume | Time from compaction detection to first resumed operation | P-PERF-MS2 | YES |

```
MEASUREMENT PROTOCOL:
  1. Each benchmark runs 3 times minimum (100+ samples per run for latency benchmarks)
  2. Report: mean, P95, P99, max
  3. Pass criteria: P95 must meet target (not just mean)
  4. Record results in BENCHMARK_LOG.md with timestamp
  5. At SU stops: compare against last recorded baseline → flag if > 10% regression
```


---

# SECTION 13: CONFIDENCE ASSESSMENT

### Per-Phase Confidence (unchanged methodology — "given good execution, will this phase's specs produce the intended outcome?")

| Phase | v7 | v8 | v8.2 | v8.4 | v8.5 | What Changed v8.4→v8.5 |
|-------|-----|-----|------|------|------|---------------------|
| P0: Foundation | 99.8% | **99.9%** | **99.9%** | **99.9%** | **99.9%** | No change. |
| P1: Consolidate | 99.5% | **99.5%** | **99.5%** | **99.5%** | **99.5%** | No change. |
| P2: Generalize | 99% | **99.5%** | **99.5%** | **99.5%** | **99.5%** | No change. |
| P3-P4: Autonomy | 99.5% | **99.5%** | **99.7%** | **99.8%** | **99.8%** | Quarantine budget adds resilience. |
| M-M0: Plugin Packaging | 98% | **99%** | **99%** | **99.2%** | **99.2%** | No change. |
| M-M1: Knowledge Recovery | 97% | **97%** | **97%** | **97%** | **97%** | No change. |
| M-M2: Data Campaigns | 95% | **97%** | **98%** | **99%** | **99%** | Human gates add source quality validation. |
| M-M3: Compliance | 92% | **92%** | **92%** | **92%** | **95%** | Standards research + domain expert review + sample artifacts. |
| Post-deployment sustainability | — | — | — | — | **~92%** | NEW in v9.0: system can accept new materials, calcs, integrations without rework for 3+ years. |
| E1-E4: Enterprise | 97% | **97%** | **97%** | **99%** | **98%** | Complexity classification + margin protocol reveal tighter constraints. More honest. |
| M4: Monolith | 94% | **96%** | **97%** | **98%** | **98%** | Dual-run rebalanced to 7,200 queries. Warm scenarios added. |

### Compound Confidence Assessment (NEW in v8.5)

```
THE PROBLEM WITH PER-PHASE CONFIDENCE:
  Per-phase numbers are presented independently, creating an illusion of certainty.
  10 phases averaging 97% per-phase = ~74% joint probability, NOT 99.85%.
  This is basic probability: P(all succeed) = P(A) × P(B) × ... × P(J).

HONEST COMPOUND ESTIMATE:

  Phase groups with CORRELATED risks (not independent):
    Platform phases (P0-P2): share architecture decisions. If P0 foundation
      is wrong, P1-P2 inherit the problem. Treat as 1 unit: ~98% joint.
    Manufacturing phases (M-M0 through M-M2): share data quality. If source
      data is systematically flawed, all phases inherit. Treat as 1 unit: ~95% joint.
    Enterprise phases (E1-E4): share E3 architecture. If React dashboard approach
      is wrong, E3 alone is 30 MS of rework. Treat as 1 unit: ~92% joint.
    Integration phases (P3-P4, M-M3, M4): each partially independent. ~95% joint.

  JOINT CONFIDENCE (accounting for correlation):
    ~85% — the project completes without blocking issues
    ~74% — the project completes within the 75-85 week schedule (raised from ~72% — progressive testing reduces E3 rework risk)
    ~92% — completed system operates and extends without architectural rework for 3+ years (NEW in v9.0)

  WHAT THE 15% FAILURE MODE LOOKS LIKE:
    - E3 React dashboard requires architectural restart at MS15 (3-week delay)
    - M-M2 source data quality issues cascade through batch 20 (campaign pause)
    - Enterprise pace goes RED and requires scope reduction
    - Compaction frequency exceeds threshold, requiring architecture restructuring

  WHY 85% IS GENUINELY STRONG:
    85% across 75+ weeks of AI-driven safety-critical development, where the
    primary developer (Claude) has no persistent memory between sessions and
    operates through a text-based context window, is a high confidence level.
    For comparison: traditional 75-week software projects with human teams
    deliver on-spec and on-schedule roughly 30-40% of the time (Standish Group).

  THE REMAINING 15% IS COVERED BY:
    - Emergency Off-Ramp Protocol (Section 3.11): detect early, restructure
    - Human validation gates (H-1 through H-4): catch source quality issues
    - Enterprise Margin Protocol: detect pace problems before they compound
    - Partial delivery is always an option: PRISM with correct materials,
      calculations, and alarms — but without the visual dashboard — is a
      working, valuable system
```


---

# SECTION 14: COMPLETE CAPABILITY COUNT (MASTER_INDEX-Verified)

| Capability | Count | Source | v7→v8 Change |
|-----------|-------|--------|-------------|
| Dispatchers | 27 (324 actions) | MASTER_INDEX §1 | No change |
| Engines | 29 (19,930 lines) | MASTER_INDEX §4 | Added line counts + 4 migration tiers |
| Registries | 19 (13,879 lines) | MASTER_INDEX §5 | **NEW — enumerated with line counts** |
| Hooks | 144 (117 inherited + 23 new platform/system + 4 new MFG) | Section 8 | v8.4: Corrected from 145→144 (27 new, not 28) |
| Skills | **137** (119 existing + 18 new) | MASTER_INDEX §11 | **Fixed** (was 171+) |
| Scripts | **75** core (73 existing + 2 new) | MASTER_INDEX §7 | **Fixed** (was 342+) |
| Agents | ~54 (verified at every SAU) | Section 4.7 | No change |
| Swarm patterns | 8 (5 assigned to M-M2) | Section 2 + M-M2 | **Assigned to campaigns** |
| Cadence functions | 34 (30 original + 4 new) | MASTER_INDEX §6 | No change |
| Infrastructure files | 3 (autoHookWrapper 1,559L + cadenceExecutor 2,246L + responseSlimmer ~200L) | MASTER_INDEX §6 | **NEW — mapped with migration tiers** |
| Type definitions | 5 (1,419 lines) | MASTER_INDEX §9 | **NEW — import at P0-MS5** |
| Data files | 215 across 6 directories | MASTER_INDEX §8 | **NEW — directory inventory** |
| GSD files | 16 (~628 lines) | Section 2.10 | **NEW — enumerated** |
| KNOWN_RENAMES | 180-190 entries | guardDispatcher.ts | **NEW — export as JSON** |
| Migration gates | **17** | Section 7.1 | +1 v8.5 (human review log) +2 v9.0 (API version parity, data abstraction verification) |
| Quality tiers | 4 (Quick/Standard/Deep/Release) | START HERE + per-MS | **NEW — assigned per MS** |
| Wiring verification tests | **7** (SU-4 consume tests) | Section 18.2 | **NEW — closed feedback loops** |
| Engine consumer chains | **29** mapped | Section 18.1 | **NEW — every engine has named consumer** |
| Performance benchmarks | 10 | Section 12 | No change |
| UAT scenarios | **8** | Section 5 (P-UAT) | No change |
| Error policies | 7 (5 standard + 2 MFG) | Section 6 | No change |
| Strategic Update Points | 6 (SAU-Full) | Section 4.7 | No change |
| Mini-SAU stops | 10 (6 enterprise + 4 manufacturing) | Section 4.7 | No change |
| State files | **19** | Section 2.12 | +2 v8.5 (HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json) +2 v9.0 (API_VERSION.json, EXTENSION_REGISTRY.json) |
| Decision protocol rules | **15** categories | Section 3 | +1 v8.5 (Emergency Off-Ramp) +4 v9.0 (API Version Mgmt, Data Access Abstraction, Calc Engine Extension, Controller Extension) |
| System self-test checks | **7** | Section 2.13 | +1 v9.0 (API version consistency check) |
| Flex chats | **4** | Section 9 | +1 (FLEX-E3 added in v8.1) |
| Safety-critical test calculations | 50 | Section 15 | No change |
| Cross-track dependency mappings | 10 | Section 3.9 | No change |
| Sequencing guides | 22 | MASTER_INDEX §3 | **All 22 tested at SU-3 in 4 batches** |
| SAU artifacts updated | **11** per stop (14 total protocol steps including verification) | Section 4.7 | +2 (COHERENCE_AUDIT, EXTERNAL_BACKUP — v8.5) |
| Human validation gates | **4** (H-1 through H-4) | M-M2 + M-FINAL | **NEW in v8.5** |
| 72-hour dual-run queries | **~7,200** | Section 7.1 M-FINAL | +1,800 (warm scenarios + rebalance — v8.5) |
| Doc files | **7** | Section 2.12 | 5 from v8.5 (COHERENCE_AUDIT, ENTERPRISE_PACE, HUMAN_REVIEW_LOG, COMPLIANCE_REQUIREMENTS, ENV_CONFIG) + 2 from v9.0 (BREAKING_CHANGES, USER_GUIDE) |
| Manufacturing MS (fully specified) | 15 | Section 5 | No change |
| Manufacturing MS (template) | 8 | Section 5 | No change |
| Type definitions | **7** (1,649 lines) | MASTER_INDEX §9 + v9.0 | +2 v9.0 (data-provider.ts, calc-model-types.ts) |
| Plugin permission tiers | **4** | E3-MS21 | NEW in v9.0 (READ_ONLY, UI_EXTEND, HOOK_INSTALL, CALC_MODIFY) |
| CalcModel registry entries | **4** built-in | Section 3.14 | NEW in v9.0 (kienzle, taylor, johnson_cook, thread) |
| E3 progressive test gates | **4** | E3 Layer boundaries | NEW in v9.0 (MS5: 40%, MS12: 60%, MS20: 70%, MS30: 80%) |
| E4 smoke test gates | **3** | E4 Layer boundaries | NEW in v9.0 (MS6: tenant, MS12: failover, MS18: governance) |
| Post-deployment maintenance cadence | Quarterly | Section 6.5 | NEW in v9.0 |
| Rollback window | 14 days | Section 7.5 | NEW in v9.0 |


---

# SECTION 15: SAFETY-CRITICAL TEST MATRIX (NEW in v7)

*50 calculations across 8 categories. Every calculation has known reference values from published machining handbooks. This matrix is the HARD GATE for migration — both codebases must produce identical results within ±2σ.*

## Matrix Structure

Each calculation specifies: material, condition, operation, tool, and expected output range from published reference data. The test validates that PRISM produces results within the accepted uncertainty band.

**Executed by:** safety_calc_test_matrix.py
**Seeded in:** M-M1-MS4
**Run at:** SU-5, SU-6, P-PERF-MS4, pre-migration, post-migration daily for 7 days

## Category 1: Common Steels — Standard Conditions (8 calculations)

| # | Material | Condition | Operation | Tool | Key Output | Reference Source |
|---|----------|-----------|-----------|------|-----------|-----------------|
| 1 | 4140 | Annealed (197 HB) | Roughing | Carbide insert | Vc, fz, ap | Machinery's Handbook |
| 2 | 4140 | Q&T (50 HRC) | Finishing | CBN insert | Vc, fz, Rz | Sandvik Coromant |
| 3 | 1045 | Hot rolled (180 HB) | Roughing | Carbide insert | Vc, fz, Fc | Machinery's Handbook |
| 4 | 4340 | Annealed (217 HB) | Roughing | Carbide insert | Vc, fz, ap | Machinery's Handbook |
| 5 | 4340 | Q&T (45 HRC) | Finishing | Ceramic insert | Vc, fz | Kennametal |
| 6 | D2 Tool Steel | Annealed (220 HB) | Roughing | Carbide insert | Vc, fz, Fc | Machinery's Handbook |
| 7 | D2 Tool Steel | Hardened (60 HRC) | Finishing | CBN insert | Vc, fz, Rz | Sandvik Coromant |
| 8 | 316 Stainless | Annealed (170 HB) | Roughing | Carbide coated | Vc, fz, BUE risk | Machinery's Handbook |

## Category 2: Aluminum Alloys (6 calculations)

| # | Material | Condition | Operation | Tool | Key Output |
|---|----------|-----------|-----------|------|-----------|
| 9 | 6061-T6 | Standard | Roughing | HSS | Vc, fz |
| 10 | 6061-T6 | Standard | Finishing | Carbide | Vc, fz, Ra |
| 11 | 7075-T6 | Standard | Roughing | Carbide | Vc, fz, Fc |
| 12 | 2024-T351 | Standard | Roughing | Carbide | Vc, fz |
| 13 | A356 Cast | T6 | Roughing | PCD | Vc, fz |
| 14 | 6061-T6 | Standard | Drilling | Carbide drill | Vc, feed, thrust |

## Category 3: Aerospace Alloys — High Consequence (8 calculations)

| # | Material | Condition | Operation | Tool | Key Output |
|---|----------|-----------|-----------|------|-----------|
| 15 | Ti-6Al-4V | Annealed | Roughing | Carbide | Vc, fz, Fc, temp |
| 16 | Ti-6Al-4V | STA | Finishing | Carbide | Vc, fz, Ra |
| 17 | Inconel 718 | Solution treated | Roughing | Ceramic | Vc, fz, Fc |
| 18 | Inconel 718 | Aged (44 HRC) | Finishing | CBN | Vc, fz, Rz |
| 19 | Waspaloy | Standard | Roughing | Carbide | Vc, fz, tool life |
| 20 | Hastelloy X | Standard | Roughing | Carbide | Vc, fz |
| 21 | Ti-6Al-4V | Annealed | Drilling | Carbide drill | Vc, feed, peck cycle |
| 22 | Inconel 625 | Annealed | Roughing | Ceramic | Vc, fz, notch risk |

## Category 4: Tool Life Predictions (6 calculations)

| # | Material | Condition | Tool | Key Output |
|---|----------|-----------|------|-----------|
| 23 | 4140 Annealed | Vc=200, fz=0.25, ap=3 | Carbide insert | Taylor tool life (min) |
| 24 | Ti-6Al-4V Annealed | Vc=60, fz=0.15, ap=2 | Carbide insert | Taylor tool life (min) |
| 25 | 6061-T6 | Vc=400, fz=0.20, ap=4 | Carbide insert | Taylor tool life (min) |
| 26 | Inconel 718 | Vc=30, fz=0.12, ap=1.5 | Ceramic insert | Taylor tool life (min) |
| 27 | 4340 Q&T 45 HRC | Vc=100, fz=0.10, ap=0.5 | CBN insert | Taylor tool life (min) |
| 28 | 1045 Hot Rolled | Vc=250, fz=0.30, ap=5 | Carbide insert | Taylor tool life (min) |

## Category 5: Cutting Force Calculations — Kienzle Model (6 calculations)

| # | Material | Parameters | Key Output |
|---|----------|-----------|-----------|
| 29 | 4140 Annealed | kc1.1=1820, mc=0.26, ap=3, fz=0.25 | Fc, Ff, Fp (3-component) |
| 30 | Ti-6Al-4V | kc1.1=1400, mc=0.23, ap=2, fz=0.15 | Fc, power, torque |
| 31 | 6061-T6 | kc1.1=800, mc=0.23, ap=4, fz=0.20 | Fc, power |
| 32 | Inconel 718 | kc1.1=2800, mc=0.29, ap=1.5, fz=0.12 | Fc, power, spindle load % |
| 33 | 316 Stainless | kc1.1=2100, mc=0.27, ap=2.5, fz=0.20 | Fc, power |
| 34 | D2 60 HRC | kc1.1=4500, mc=0.32, ap=0.3, fz=0.08 | Fc, power (hard turning) |

## Category 6: Edge Cases — Boundary Conditions (6 calculations)

| # | Scenario | Why This Edge Case |
|---|----------|-------------------|
| 35 | 4140 at 0.01mm ap (microfinishing) | Minimum chip thickness violation risk |
| 36 | Ti-6Al-4V at 90% of max recommended Vc | Near-limit thermal behavior |
| 37 | Inconel 718 interrupted cut | Impact loading on ceramic tool |
| 38 | 6061-T6 at 30,000 RPM (HSM) | Centrifugal force on tool holder |
| 39 | 4340 at phase-transition hardness (32 HRC) | Between "soft" and "hard" regimes |
| 40 | Cast iron (GG25) dry machining | No coolant thermal model |

## Category 7: Multi-Operation Sequences (5 calculations)

| # | Scenario | Key Validation |
|---|----------|---------------|
| 41 | 4140: rough → semi-finish → finish | Parameters change correctly per operation |
| 42 | Ti-6Al-4V: face → contour → pocket | Tool selection changes per geometry |
| 43 | Inconel 718: rough → finish with tool change | Tool life consumed in rough affects finish tool selection |
| 44 | 6061-T6: drill → ream → tap | Correct feed/speed per operation type |
| 45 | 4340 Q&T: OD turn → grooving → threading | Radically different parameters per operation |

## Category 8: Alarm Decode Validation (5 calculations)

| # | Controller | Alarm | Key Validation |
|---|-----------|-------|---------------|
| 46 | FANUC | 414 (Servo alarm) | Correct cause identification + fix procedure |
| 47 | SIEMENS | 25000 (Drive fault) | Correct cause + safety interlock identification |
| 48 | HAAS | 108 (Spindle fault) | Correct cause + specific HAAS fix steps |
| 49 | OKUMA | 43 (Turret alarm) | Correct cause + turret-specific procedure |
| 50 | MAZAK | 218 (Axis alarm) | Correct cause + Mazatrol-specific context |

## Acceptance Criteria

```
Per calculation:
  S(x) ≥ 0.70 — mathematical certainty score
  Result within ±2σ of published reference value

Per category:
  100% pass rate required for Categories 1-5 (core calculations)
  ≥ 90% pass rate for Category 6 (edge cases — document any failures as [EDGE_CASE_GAP])
  100% pass rate for Category 7 (multi-operation — validates sequencing)
  100% pass rate for Category 8 (alarm decode — validates knowledge base)

For migration:
  Both codebases must produce identical results (within floating-point tolerance)
  Any discrepancy → BLOCK migration → investigate → fix → re-test
```


---

# SECTION 16: OPERATOR QUICK REFERENCE (NEW in v7)

*One-page decision card. When you're overwhelmed, read ONLY this section.*

## Where Am I?

```
Read C:\PRISM\docs\ROADMAP_TRACKER.md → find last COMPLETE entry → next MS is yours.
If missing: read C:\PRISM\state\HANDOFF.json → last_ms_completed field.
If both missing: Section 3.1 full recovery.
```

## What Do I Do Next?

```
1. Find your MS in Section 5 (platform), Section 5 manufacturing track, or enterprise specs
2. Read ENTRY CONDITIONS — are they all met?
   YES → execute the MS steps
   MOSTLY (≥90%) → proceed with [PARTIAL_ENTRY] flag
   NO → check prior MS, something's wrong
3. Execute steps. Build only the changed codebase.
4. Check EXIT CONDITIONS — all met?
   YES → mark COMPLETE in ROADMAP_TRACKER, write HANDOFF.json
   PARTIALLY (data gap) → mark with [DATA_GAP] flag, proceed
   PARTIALLY (code bug) → debug, don't mark complete
5. Is this MS an SAU boundary? → Run SAU (Light or Full per Section 4.7 table)
6. Move to next MS.
```

## Am I At a Boundary?

```
Phase boundary (P0→P1, P1→P2, etc.) → SAU-Full (~15-17 tool calls)
SU point (SU-1 through SU-6) → SAU-Full (~15-17 tool calls)
Enterprise mini-SAU stop → SAU-Light (~7 tool calls)
Manufacturing SAU stop → SAU-Light (~7 tool calls)
Normal MS completion → No SAU. Just mark complete + handoff.
```

## Context Pressure?

```
GREEN (< 60%) → keep going
YELLOW (60-84%) → finish current MS, then evaluate
RED (85-94%) → finish current STEP, write survival files, stop
BLACK (95%+) → compaction armor fires automatically
```

## Something Broke?

```
Tool returns "not yet imported" → Section 3.8 (use mcp-server fallback if in P0-P1)
State files disagree → Section 3.5 (trust ROADMAP_TRACKER)
Cross-track dependency unmet → Section 3.9 (check fallback column)
S(x) < 0.70 on calculation → STOP. Debug. Do not proceed.
Error budget metric RED → Pause campaign. Root cause. Section 6.3.
Enterprise pace RED → STOP and reassess. Section 3.11 / Enterprise Margin Protocol.
Off-ramp trigger fired → Section 3.11. Complete current MS, then reassess.
```

## Human Review Due? (NEW in v8.5)

```
M-M2 batch 10 reached → H-1 gate: export 10 materials, get engineer review
M-M2 batch 20 reached → H-2 gate: edge cases + 3 calculation outputs
M-M2 batch 30 reached → H-3 gate: machine specs + alarm fixes + compliance
Pre-M-FINAL → H-4 gate: 5 golden-path scenarios with engineer observing
All reviews logged in HUMAN_REVIEW_LOG.md. [REJECTED] = investigate immediately.
```

## Key Paths

```
Roadmap:       This document
MASTER_INDEX:  C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md (structural truth source)
Position:      C:\PRISM\docs\ROADMAP_TRACKER.md
Handoff:       C:\PRISM\state\HANDOFF.json
Survival:      C:\PRISM\state\COMPACTION_SURVIVAL.json
Quick Ref:     C:\PRISM\docs\PRISM_QUICK_REF.md (auto-generated)
Insights:      C:\PRISM\docs\SESSION_INSIGHTS.md
Archive:       C:\PRISM\docs\SESSION_INSIGHTS_ARCHIVE.md
Campaign:      C:\PRISM\state\CAMPAIGN_DASHBOARD.json
GSD:           C:\PRISM\mcp-server\data\docs\gsd\GSD_QUICK.md
DEV_PROTOCOL:  C:\PRISM\mcp-server\data\docs\gsd\DEV_PROTOCOL.md
Build:         npm run build (esbuild, NEVER tsc)
MCP Server:    C:\PRISM\mcp-server\
Platform:      C:\PRISM\prism-platform\
Scripts:       C:\PRISM\scripts\
Data:          C:\PRISM\data\ + C:\PRISM\extracted\ (215 JSON files, 6 directories)
Hook Manifest: C:\PRISM\state\HOOK_MANIFEST.json (v8.5 — hook count truth source)
Quarantine BL: C:\PRISM\state\QUARANTINE_BACKLOG.json (v8.5 — deferred quarantine items)
Coherence:     C:\PRISM\docs\COHERENCE_AUDIT.md (v8.5 — architectural drift tracking)
Enterprise Pace: C:\PRISM\docs\ENTERPRISE_PACE.md (v8.5 — enterprise velocity tracking)
Human Review:  C:\PRISM\docs\HUMAN_REVIEW_LOG.md (v8.5 — domain expert validation)
Compliance:    C:\PRISM\docs\COMPLIANCE_REQUIREMENTS.md (v8.5 — ISO clause mapping)
Env Config:    C:\PRISM\docs\ENV_CONFIG.md (v8.5 — external backup config)
API Version:   C:\PRISM\state\API_VERSION.json (v9.0 — dispatcher version tracking)
Extension Reg: C:\PRISM\state\EXTENSION_REGISTRY.json (v9.0 — data model extensions)
Breaking Chgs: C:\PRISM\docs\BREAKING_CHANGES.md (v9.0 — API migration paths)
User Guide:    C:\PRISM\docs\user-facing\USER_GUIDE.md (v9.0 — operator documentation)
Maintenance:   C:\PRISM\docs\MAINTENANCE_LOG.md (v9.0 — post-deployment data updates)
```


---

**END OF SECTION 16**

---

# SECTION 17: INFRASTRUCTURE MIGRATION MAP (NEW in v8)

*Every file in mcp-server that must migrate to prism-platform, organized by migration tier and timing. Line counts from MASTER_INDEX.md — imported file line counts MUST match these or STOP (content was lost).*

## 17.1 Engine Migration Tiers (29 engines, 19,930 lines)

### Tier 0 — Infrastructure Engines (import at P0-MS6 and P0-MS7)

These make everything else work. Import FIRST.

| Engine | Lines | Import At | What It Does |
|--------|-------|----------|-------------|
| SessionLifecycleEngine.ts | 351 | **P0-MS6** | Session boot/shutdown orchestration |
| ComputationCache.ts | 420 | **P0-MS6** | Caches expensive calculations across calls |
| DiffEngine.ts | 196 | **P0-MS6** | Detects changes between states for drift detection |
| HookEngine.ts | 802 | P0-MS7 | Hook registration and execution framework |
| HookExecutor.ts | 835 | P0-MS7 | Hook chain execution with priority ordering |
| EventBus.ts | 656 | P0-MS7 | Event system for hook triggers |
| index.ts | 300 | P0-MS7 | Engine registration and bootstrapping (infrastructure — counted in 29 for migration parity, not a computation engine) |
| **Tier 0 Total** | **3,560** | |

### Tier 1 — Safety-Critical Engines (import at M4-T1)

These perform or protect calculations where errors = physical harm.

| Engine | Lines | What It Does |
|--------|-------|-------------|
| CollisionDetectionEngine.ts | 1,923 | Prevents tool crashes — spatial analysis of tool paths vs workholding |
| SpindleProtectionEngine.ts | 901 | RPM/power limit enforcement |
| ToolBreakageEngine.ts | 1,071 | Tool life monitoring, breakage prediction |
| WorkholdingEngine.ts | 1,409 | Clamping force validation, fixture analysis |
| CoolantValidationEngine.ts | 752 | Coolant flow/pressure verification |
| ManufacturingCalcEngine.ts | 1,082 | Core Kienzle/Taylor calculations |
| ThreadCalcEngine.ts | 484 | Thread cutting parameter calculation |
| ToolpathStrategyEngine.ts | 624 | Trochoidal, HSM, adaptive strategy selection |
| AdvancedCalcEngine.ts | 313 | Multi-pass optimization, surface finish prediction |
| **Tier 1 Total** | **8,559** | |

### Tier 2 — Intelligence Engines (import at P0-MS7 through P1)

| Engine | Lines | Import At | What It Does |
|--------|-------|----------|-------------|
| CalcHookMiddleware.ts | 269 | **P0-MS7** (early — wired with autoHookWrapper) | Pre/post-calculation hook injection |
| AgentExecutor.ts | 818 | P0-MS9 | Agent tier management, invocation, governance |
| SwarmExecutor.ts | 953 | P0-MS9 | 8 swarm patterns including ralph_loop |
| BatchProcessor.ts | 233 | P0-MS9 | Batch operation management |
| KnowledgeQueryEngine.ts | 871 | P0-MS9 | Knowledge graph queries |
| ResponseTemplateEngine.ts | 669 | P0-MS9 | Response formatting and template rendering |
| ScriptExecutor.ts | 754 | P0-MS9 | Python script sandbox execution |
| SkillExecutor.ts | 868 | P0-MS9 | Skill loading and execution |
| **Tier 2 Total** | **5,435** | |

### Tier 3a — Early-Import Engines (import BEFORE E3 — see individual MS specs)

*These were originally classified as Tier 3 but are explicitly imported earlier because their consumers need them before E3. The MS-level specs say "import NOW" — this table confirms the correct timing.*

| Engine | Lines | Actual Import At | Why Early | Consumer |
|--------|-------|-----------------|-----------|----------|
| TelemetryEngine.ts | 609 | **P0-MS4** | E3 dashboards are months away; telemetry is needed from day 1 for cadence, boot tracking, hook monitoring | All cadence functions, E3 TelemetryBridge, boot tracker |
| MemoryGraphEngine.ts | 685 | **P4-MS4** | Knowledge graph feeds PLATFORM-FORMULA-RECOMMEND and AutoPilot enrichment during M-M2 campaigns | PLATFORM-FORMULA-RECOMMEND, AutoPilot, CalculationDashboard |
| CertificateEngine.ts | 757 | **M-M3-MS1** | M-M3 IS the consumer — compliance workflows need it before E3 dashboard exists | prism_compliance→generate_cert, audit_trail, iso_report |
| **Tier 3a Total** | **2,051** | | |

### Tier 3b — Dashboard Engines (import at E3)

| Engine | Lines | What It Does |
|--------|-------|-------------|
| PredictiveFailureEngine.ts | 523 | ML-based failure prediction from telemetry metrics |
| PFPEngine.ts | 834 | Predictive Failure Prevention — proactive alerts and mitigations |
| **Tier 3b Total** | **1,357** | |

**Validation rule:** After import, count imported file lines. If imported < MASTER_INDEX count → anti-regression FAIL → content was lost → investigate before proceeding.

## 17.2 Registry Migration Tiers (19 registries, 13,879 lines)

*Individual line counts below are approximate (~). The 13,879L total from MASTER_INDEX §5 is the authoritative count. Use MASTER_INDEX totals for anti-regression validation, not the sum of estimates below.*

### Tier 1 — Core Framework (import at P0-MS1/MS5)

| Registry | Lines | Purpose |
|----------|-------|---------|
| BaseRegistry.ts | ~2,800 | Abstract base class for all registries |
| base.ts | ~400 | Registry type definitions |
| manager.ts | ~600 | Registry lifecycle management |
| index.ts | ~300 | Registry exports and bootstrapping |

### Tier 2 — Manufacturing Data (import at P0-MS1 through M-M0)

| Registry | Lines | Purpose |
|----------|-------|---------|
| MaterialRegistry.ts | ~2,200 | 3,518 materials with 127 parameters each |
| MachineRegistry.ts | ~1,800 | 824 machines across 43 manufacturers |
| AlarmRegistry.ts | ~1,600 | 9,200 alarm codes across 12 controller families |
| ToolRegistry.ts | ~1,400 | 1,944 cutting tools |

### Tier 3 — Platform Registries (import at P0-MS7 through P1)

| Registry | Lines | Purpose |
|----------|-------|---------|
| SkillRegistry.ts | ~800 | 137 skill definitions |
| ScriptRegistry.ts | ~600 | 75 script definitions |
| FormulaRegistry.ts | ~700 | 490 formula mappings |
| HookRegistry.ts | ~500 | Hook definitions and dependency tracking |
| AgentRegistry.ts | ~400 | ~54 agent definitions |
| ToolpathRegistry.ts | ~350 | Toolpath strategy definitions |
| DispatcherRegistry.ts | ~300 | 27 dispatcher registrations |
| ConfigRegistry.ts | ~200 | Configuration management |
| PluginRegistry.ts | ~200 | Plugin manifest management |

## 17.3 Infrastructure File Migration

| File | Lines | Import At | Why Critical |
|------|-------|----------|-------------|
| autoHookWrapper.ts | 1,559 | P0-MS7 (with hook engine) | Without this, hooks are registered but NEVER FIRE |
| cadenceExecutor.ts | 2,246 | P0-MS9 (with cadence system) | Without this, no auto-checkpoint, no compaction detection, no todo refresh |
| responseSlimmer.ts | ~200 | P0-MS9 | Without this, context overflows at high pressure |
| autoDocAntiRegression.ts | ~150 | P0-MS3 (with compaction armor) | Fires on .md writes: WARN on >30% reduction, BLOCK on >60% reduction. Tracks baselines in doc_baselines.json. |
| prism-schema.ts | 689 | P0-MS5 (scaffold) | Core type definitions for all dispatchers |
| hookRegistration.ts | ~400 | P0-MS7 | Boot-time hook wiring |

## 17.4 WORKING_TOOLS Maintenance Protocol

AutoPilotV2.ts maintains a WORKING_TOOLS list — the set of dispatcher+actions that are currently functional. Any MS that adds or imports a dispatcher/action MUST:

1. Update WORKING_TOOLS in AutoPilotV2.ts
2. Update MASTER_INDEX.md Sections 1-3 if action count changed
3. Run gsd_sync_v2.py to update tools.md and GSD_QUICK.md
4. Rebuild (npm run build)

**MS triggers for WORKING_TOOLS updates:** M-M0-MS1 (+5 dispatchers), M-M0-MS4/MS5 (+remaining dispatchers), E1-MS1 (+WAL actions), E3-MS1 (+React dashboard actions).

## 17.5 Governance Protocols

### Changelog Protocol
Every skill file and doc MUST have a `## Changelog` section. autoDocAntiRegression enforces:
- On creation: WARN if missing
- On edit: BLOCK if missing
- Format: `YYYY-MM-DD | Change description | Author`

### Anti-Regression Document Protection
autoDocAntiRegression fires on all .md file writes:
- >30% size reduction → WARNING (may be legitimate consolidation)
- >60% size reduction → BLOCK (almost certainly content loss)
- Tracks baselines in C:\PRISM\state\doc_baselines.json
- Import at P0-MS3 (with compaction armor infrastructure)


---

# SECTION 18: WIRING VERIFICATION PROTOCOL (NEW in v8.1)

*Every engine, subsystem, and intelligence feature has a BUILD step and a CONSUME step. This section maps the full chain and the SU where each is verified. If a chain shows ❌ at any SU, it's a BLOCK — fix before proceeding.*

## 18.1 Engine Consumer Chain Map (29 engines)

| Engine | Lines | Built At | Consumer | Verified At |
|--------|-------|---------|----------|-------------|
| index.ts | 300 | P0-MS7 | Engine registration and bootstrapping; consumed by all engine imports at startup | SU-1 |
| HookEngine.ts | 802 | P0-MS7 | autoHookWrapper dispatches through it | SU-1 |
| HookExecutor.ts | 835 | P0-MS7 | HookEngine delegates chain execution | SU-1 |
| EventBus.ts | 656 | P0-MS7 | Dispatchers emit, hooks subscribe | SU-1 |
| SessionLifecycleEngine.ts | 351 | P0-MS6 | Orchestrates boot/shutdown; session_memory consumers read from it | SU-2 |
| ComputationCache.ts | 420 | P0-MS6 | prism_calc→speed_feed/cutting_force/tool_life check before computing | SU-4 (cache test) |
| DiffEngine.ts | 196 | P0-MS6 | drift_detector.py + codebase_sync_check.py call DiffEngine.diff() | SU-2 |
| CalcHookMiddleware.ts | 269 | P0-MS7 | autoHookWrapper calls for calc dispatchers: pre-injects formulas, post-caches | SU-3 |
| AgentExecutor.ts | 818 | P0-MS9 | ralph_loop, agent_invoke, swarm patterns | SU-1 |
| SwarmExecutor.ts | 953 | P0-MS9 | 8 swarm patterns, M-M2 campaign swarms | SU-4 |
| BatchProcessor.ts | 233 | P0-MS9 | ATCS batch framework | SU-4 |
| KnowledgeQueryEngine.ts | 871 | P0-MS9 | MemoryGraphEngine, PLATFORM-FORMULA-RECOMMEND, AutoPilot enrichment | SU-4 |
| ResponseTemplateEngine.ts | 669 | P0-MS9 | autoHookWrapper post-output → format all dispatcher responses | SU-2 |
| ScriptExecutor.ts | 754 | P0-MS9 | safe_script_runner.py sandbox | SU-2 |
| SkillExecutor.ts | 868 | P0-MS9 | PLATFORM-SKILL-AUTO-LOAD hook | SU-2 |
| TelemetryEngine.ts | 609 | P0-MS4 | E3 TelemetryBridge → all dashboards; cadence functions; boot tracker | SU-1 |
| CollisionDetectionEngine.ts | 1,923 | M4-T1 | toolpath validation pre-hook, prism_calc safety gate | M4-T1 integration |
| SpindleProtectionEngine.ts | 901 | M4-T1 | CalcHookMiddleware RPM limit check | M4-T1 integration |
| ToolBreakageEngine.ts | 1,071 | M4-T1 | prism_calc→tool_life, ATCS batch wear tracking | M4-T1 integration |
| WorkholdingEngine.ts | 1,409 | M4-T1 | prism_calc→setup fixture validation | M4-T1 integration |
| CoolantValidationEngine.ts | 752 | M4-T1 | CalcHookMiddleware coolant injection | M4-T1 integration |
| ManufacturingCalcEngine.ts | 1,082 | M4-T1 | ALL prism_calc actions delegate core Kienzle model | M4-T1 integration |
| ThreadCalcEngine.ts | 484 | M4-T1 | prism_thread→calculate, verify_specs | M4-T1 integration |
| ToolpathStrategyEngine.ts | 624 | M4-T1 | prism_toolpath→recommend, optimize | M4-T1 integration |
| AdvancedCalcEngine.ts | 313 | M4-T1 | prism_calc→multi_pass_optimize, surface_finish_predict | M4-T1 integration |
| MemoryGraphEngine.ts | 685 | P4-MS4 | Knowledge graph: PLATFORM-FORMULA-RECOMMEND + AutoPilot + CalculationDashboard | SU-4 |
| PredictiveFailureEngine.ts | 523 | E3-MS6 | TelemetryBridge "predictions" → PredictiveAlertPanel | E3-MS12 |
| PFPEngine.ts | 834 | E3-MS6 | Reads PredictiveFailure → generates mitigations → "predictions" channel | E3-MS12 |
| CertificateEngine.ts | 757 | M-M3-MS1 | prism_compliance→generate_cert, audit_trail, iso_report | M-M3-MS4 |

## 18.2 Intelligence Subsystem Feedback Loops (7 loops)

| Subsystem | Write Path | Read Path (Consumer) | Feedback Mechanism | Verified At |
|-----------|-----------|---------------------|-------------------|-------------|
| Error Pattern DB | PLATFORM-ERROR-PATTERN stores on error | autoHookWrapper.onError() queries → injects fix | Resolution outcome feeds back (did fix work? → confidence adjusts) | SU-4 test #1 |
| Formula Accuracy | CalcHookMiddleware post-hook logs prediction vs actual | PLATFORM-FORMULA-RECOMMEND weights by accuracy_score | Higher accuracy → higher weight → better predictions → even higher accuracy | SU-4 test #2 |
| Knowledge Graph | P4-MS4 seeds; M-M2 campaigns add edges | PLATFORM-FORMULA-RECOMMEND + AutoPilot query graph | More data → more edges → better recommendations → better validation outcomes | SU-4 test #3 |
| Session Memory | PLATFORM-MEMORY-EXPAND writes at session_end | SessionLifecycleEngine + ResponseTemplate + FORMULA-RECOMMEND | Better context → better responses → user validates → memory improves | SU-4 test #4 |
| Drift Detection | SYS-DRIFT-CHECK writes DRIFT_LOG.md | Auto-TODO at 3+, CRITICAL at 5+, auto-resolution for common types | Fixes reduce count → threshold drops → system stabilizes | SU-4 test #5 |
| Boot Efficiency | autoBootHealthCheck at session start | 3s WARN → 5s optimize → 8s BLOCK | Optimization prunes memory/cache → boot speeds up → threshold clears | SU-4 test #6 |
| ComputationCache | prism_calc writes results post-computation | prism_calc reads pre-computation (cache hit = skip) | Cache hits → faster calcs; invalidation on data change → accuracy preserved | SU-4 test #7 |

## 18.3 Sequencing Guide Coverage (22/22)

All 22 sequencing guides from MASTER_INDEX §3 tested at SU-3 in 4 batches. Pass criteria: ≥20/22, with all Batch 1 (manufacturing) required to pass.

**Batch composition (enumerated at SU-3, Section 6):**
- **Batch 1 — Core Manufacturing (5 guides, ALL must pass):** 3.5, 3.6, 3.7, 3.8, 3.9
- **Batch 2 — System Operations (5 guides):** 3.1, 3.2, 3.3, 3.4, 3.10
- **Batch 3 — Autonomous Operations (5 guides):** 3.11, 3.12, 3.13, 3.14, 3.16
- **Batch 4 — Intelligence + Platform (7 guides):** 3.15, 3.17, 3.18, 3.19, 3.20, 3.21, 3.22

## 18.4 Verification Schedule

| SU | What's Tested | Engine Count | Loop Count | Guide Count |
|----|--------------|-------------|-----------|-------------|
| SU-1 | Core infrastructure: hooks, agents, telemetry | 5 engines | 0 loops | 0 guides |
| SU-2 | Session, drift, response, scripts, skills | 5 engines | 0 loops | 0 guides |
| SU-3 | All sequencing, calc middleware, plugins | 1 engine | 0 loops | **22 guides** |
| SU-4 | **ALL intelligence subsystems + feedback loops** | 3 engines | **7 loops** | 0 guides |
| SU-5 | Enterprise: WAL infrastructure, cost tracking, cross-track flags | 0 engines (WAL/cost are infrastructure, not in 29-engine list) | 0 loops | 0 guides |
| M4-T1 | **ALL 9 safety-critical engine consumer chains** | 9 engines | 0 loops | 0 guides |
| E3-MS12 | Dashboard engine consumers | 2 engines | 0 loops | 0 guides |
| M-M3-MS4 | Compliance engine consumer | 1 engine | 0 loops | 0 guides |
| SU-6 | **FULL AUDIT: all 29 engines, 7 loops, 22 guides** | 29 | 7 | 22 |

**Cumulative by SU-6:** 29/29 engines verified, 7/7 feedback loops verified, 22/22 sequencing guides verified. **100% wiring confidence.**

## 18.5 Pre-Migration Wiring Certification (M-FINAL)

Before dual-run validation, run this comprehensive test:

```
FOR EACH of the 29 engines:
  1. Identify all consumers (from 18.1 "Consumer" column)
  2. Call each consumer → verify engine is actually invoked (not silently bypassed)
  3. Verify output matches expected format
  4. BLOCK migration if ANY engine has zero actual consumers

FOR EACH of the 7 intelligence subsystems:
  1. Write test data to the subsystem
  2. Trigger the consumer that should READ the data
  3. Verify consumer behavior CHANGED based on the data
  4. BLOCK migration if behavior unchanged (feedback loop broken)

FOR EACH of the 22 sequencing guides:
  1. Send query that triggers the sequence
  2. Trace execution through TelemetryEngine
  3. Verify all steps fire
  4. BLOCK migration if any step skipped

PRODUCE: WIRING_CERTIFICATION.md
  → 29 engines × consumers verified
  → 7 feedback loops × bidirectional flow verified
  → 22 sequences × all steps traced
  → REQUIRED artifact for pre-retirement gate (Section 7.1, gate #14)
```


---

**END OF ROADMAP v10.0**

~75-80 chats • ~195 microsessions • 6 Strategic Update Points (SAU-Full) • 10 SAU-Light stops • 4 Flex Chats • 4 investor demos • 4 human validation gates + temporal heartbeat • 4 E3 progressive test gates • 3 E4 smoke test gates • 1 rollback fire drill • ~75-85 weeks

**MASTER_INDEX-verified counts (floors where auto-discovered):**
27 dispatchers (324 actions) • 29 engines (19,930L) • 19 registries (13,879L) • 8 type defs (1,799L)
≥144 hooks (117 inherited + 27 new, atomically registered) • ≥137 skills (auto-discovered) • ≥75 core scripts (self-describing) • ~54 agents • 8 swarm patterns • 34 cadence functions
215 data files across 6 directories • 16 GSD files • 180-190 KNOWN_RENAMES
3 infrastructure files (autoHookWrapper 1,559L + cadenceExecutor 2,246L + responseSlimmer ~200L)
8 type definitions (1,799L) • 4 plugin permission tiers with resource limits • 4 built-in CalcModels • 1 External Integration API
17 migration gates • 4 quality tiers • 11 SAU artifacts per stop • 22 sequencing guides
7 intelligence feedback loops • 19 state files • 7 doc files • 20 sections + 3 new protocol sections (v10.0)
~7,200 dual-run queries (weighted + warm scenarios) • 50+ safety-critical test calculations (expandable via JSON, fuzz-tested at boundaries)
4 build pipeline steps (typecheck + compile + test:critical + output) • 9 system self-test checks • 6 hook priority bands

**v10.0 additions (50 enhancements from extensibility friction analysis + build safety audit + external review integration):**

See v10.0 CHANGELOG at document header for full details. Key changes:
Zero-Touch Extensibility Protocol: skills auto-discover, scripts self-describe, hooks register atomically, plugins resolve deps (ZT-1 through ZT-8)
Hardened Build Pipeline: tsc --noEmit type checking + esbuild incremental + test:critical on every build (BP-1 through BP-5)
PrismError class hierarchy: typed errors replace string matching for safety-critical error handling (CM-1)
Correlation ID logging: every request traced dispatcher→hooks→engine→response for debugging (CM-2)
E3 state management decided: Zustand selected NOW with documented rationale, not deferred to execution (CM-4)
External backup elevated to BLOCK: M-M2 cannot start without verified off-machine backup (SR-1)
Long-tail migration validation: real production traffic replayed against warm standby nightly (SR-2)
Safety fuzz testing: randomized boundary tests around S(x)=0.70 threshold on every build (SR-4)
Runtime safety trace proof: every safety action must produce correlationId trace proving execution (SR-5)
Fast-path execution: reduced ceremony after 3 consecutive clean MS (ER-1)
Temporal HITL heartbeat: human review every 10 sessions regardless of batch count (ER-2)
Rollback fire drill: mandatory rehearsal at SU-3 prevents procedure rot (ER-3)
Multi-axis extension conflict testing: composite safety tests when multiple extensions active (ER-4)
DataProvider marked provisional: interface may revise until SU-5 based on real query patterns (ER-5)
Schema migration v1 limits: additive and rename only, structural transforms deferred (ER-6)
Metadata auto-repair: system proposes corrections when code reality is clear (ER-7)
SAU-Full duration cap: maximum 20 tool calls, overflow deferred to SAU-Light (ER-8)
HITL structured questionnaires: fixed questions with recorded answers prevent rubber-stamping (ER-9)
Test harness trailing: non-safety tests may trail 1 layer, safety tests never trail (ER-10)
Amendment frequency tracking: >5 amendments per phase triggers simplification review (ER-11)
Plugin runtime resource limits: CALC_MODIFY plugins sandboxed with CPU/memory limits (ER-12)
MASTER_INDEX counts become floors: auto-discovery means counts grow without manual updates (ZT-8)
Microsession resource profiles: I/O-bound, context-bound, compute-bound with adaptive budgets (SR-3)

**v8.5 additions (22 fixes from external structural risk analysis):**

See v8.5 CHANGELOG at document header for full details. Key changes:
Off-machine backup protocol: external backup at every SAU-Full, weekly during M-M2 steady state (B-1)
Human validation gates: 4 distributed domain expert spot-checks at batch 10/20/30/pre-M-FINAL (B-2)
Architectural coherence audit: code style + decision replay + naming + dependency checks at every SAU-Full (B-3)
Hook count source-of-truth: HOOK_MANIFEST.json created at P0-MS1, three-way reconciliation at SAU-Full (B-4)
Compound confidence: honest joint estimate ~85% (not 99.85%), ~72% within schedule (D-2)
Dual-run rebalanced: ~7,200 queries weighted by complexity class + warm scenario journeys (D-3)
ATCS throughput: M-M2 chats 15-25 (was 15-20), quarantine budget protocol with deferred resolution (D-4)
Enterprise margin protocol: ENTERPRISE_PACE.md with GREEN/YELLOW/RED thresholds (G-3)
E3 complexity classification: UI-RENDER/STATE-INTEGRATION/TOOL-BUILD/PLATFORM-BUILD per MS (G-3, A-4)
E3 architectural decision replay: automated spot-checks at 4 layer boundaries (G-7)
M-M3 compliance domain protocol: standards research + sample artifacts + domain expert review (G-4)
Emergency off-ramp: 6 trigger conditions with reassessment procedure (G-8)
Interleaving overhead budgeted: effective 13 tool calls per interleaved session (G-6)
New artifacts: HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json, COHERENCE_AUDIT.md, ENTERPRISE_PACE.md, HUMAN_REVIEW_LOG.md, COMPLIANCE_REQUIREMENTS.md, ENV_CONFIG.md, REASSESSMENT.md (emergency only)

**v8.4 additions (13 fixes from structural risk analysis):**

See v8.4 CHANGELOG at document header for full details. Key changes:
Enterprise MS cliff eliminated: ALL 82 enterprise MS (E3+E4) have defined purpose/deliverable/entry/exit (B-1)
ATCS execution model grounded in reality: session-based queue, not background daemon (B-2)
72-hour dual-run: automated workload generator via Windows Scheduled Task (B-3)
Hook count: corrected 145→144, full prefix categorization (D-1)
Campaign rollback: downstream consumers (knowledge graph, formula tracker, cache, telemetry) cleaned up (D-2, G-5)
P-DM: full microsession spec with assessment→scope→migrate→verify→document steps (D-3)
New protocols: Model Upgrade (G-1), Disk Space Management (G-2), Context Window Contingency (G-3)
Junction points: WSL2/cross-drive edge cases with 3-tier fallback chain (G-4)

**v8.3 additions (21 fixes from independent gap analysis):**

See v8.3 CHANGELOG at document header for full details. Key changes: engine import sequencing fixed (B-1/B-2), M-FINAL microsession breakdown added (G-4), 15 session memory categories enumerated (G-3), E3/E4 chat loading guides added (G-8), campaign plateau contingency added (A-5), microsession count corrected to ~190 (A-1).
Section 9 ↔ Section 11 chat number reconciliation (M4-T1/T2/M-FINAL aligned)
Engine Tier 3 split into 3a (early import) and 3b (E3 import) with correct timing
ROADMAP_TRACKER.md format specification • M-M2 interleaving protocol
P-UAT-MS2 explicitly placed in Chat 9 • autoDocAntiRegression wired into P0-MS3
UAT scenario enumeration (8 scenarios) • P-DM schema detection mechanism
CAMPAIGN_DASHBOARD.json schema_version field • DEMO 2 / P-UAT-MS1 ordering
E3 Layer→MS mapping table • SU-1 quality tier added • Flex chat count corrected to 4
Hook categorization clarified • Registry estimate advisory note • Batch 30 machines corrected

**v8.1 additions:**
Campaign data rollback protocol (Section 6.4) • Backup/DR specification (Section 7.4)
E3 Security Constraints (BINDING) • Enterprise MS entry/exit minimums (E1-E2 fully specified)
10 performance benchmarks enumerated (Section 12.1) • FLEX-E3 buffer added
Roadmap amendment protocol • 28 gaps closed from independent audit

**Wiring verification (Section 18):**
29/29 engines have explicit consumers with verification schedule
7/7 intelligence subsystems have bidirectional feedback loops with SU-4 tests
22/22 sequencing guides tested at SU-3 (not just 8)
9/9 Tier 1 safety engines have consumer chain mapping protocol at M4
WIRING_CERTIFICATION.md required at M-FINAL as gate #14

**Self-executing architecture:**
- START HERE block on page 1 — boot sequence, resume protocol, key rules
- Exact MCP commands for P0-MS0 through MS5 (pattern learned, generalize after)
- Quality tier assigned per MS — no ambiguity on validation depth
- Every addendum patch folded inline — no cross-referencing
- MASTER_INDEX.md as structural truth source — verified at every SAU
- Infrastructure migration map with line counts — anti-regression baselines
- Every engine has a named consumer — no "import and hope"
- Every intelligence subsystem has a closed feedback loop — no write-only databases
- ROADMAP_TRACKER.md format specified — no ambiguity on position tracking
- Section 9 ↔ Section 11 chat numbers reconciled — no conflicting schedules
- Engine import timing verified against MS specs — no Tier classification lies
- **Every enterprise MS has a defined deliverable — no "front-load and hope" (v8.4)**
- **ATCS execution model documented — no phantom background daemons (v8.4)**
- **72-hour dual-run has automated workload — no manual 3-day operation (v8.4)**
- **Model upgrades, disk space, context changes all have protocols (v8.4)**
- **Human validation gates prevent self-referential validation — domain experts verify (v8.5)**
- **Architectural coherence audit prevents style drift — consistency verified at every SAU (v8.5)**
- **External backup prevents single-point-of-failure — off-machine copies required (v8.5)**
- **Emergency off-ramp prevents runaway failure — stop criteria defined before starting (v8.5)**
- **Enterprise pace tracking prevents silent schedule erosion — early warning metrics (v8.5)**
- **Compound confidence is honest — 85% joint probability, not aspirational 99.85% (v8.5)**
- **Data access is abstracted — DataProvider interface enables storage backend swaps without engine changes (v9.0)**
- **API is versioned — dispatcher signatures tracked with semantic versioning, plugins declare compatibility (v9.0)**
- **Calculation models are pluggable — CalcModelRegistry enables new physics domains without core engine modification (v9.0)**
- **Plugin security is tiered — 4 permission levels prevent unauthorized access to safety-critical hooks (v9.0)**
- **Post-deployment data maintenance is defined — materials, machines, alarms, tools all have update procedures (v9.0)**
- **Post-migration rollback is safe — 14-day warm standby with defined trigger conditions and data reconciliation (v9.0)**
- **E3 testing is progressive — component coverage gates at every layer boundary, not just MS28 (v9.0)**
- **User documentation is generated — operator-facing guides built from system knowledge at M-FINAL-MS7 (v9.0)**
- **Skills auto-discover — drop a file, it's registered. No manual wiring needed (v10.0)**
- **Scripts self-describe — PRISM_MANIFEST headers auto-wire to triggers (v10.0)**
- **Hooks register atomically — one action updates everything: registry, manifest, counts (v10.0)**
- **Plugins resolve dependencies — load order enforced, uninstall protection, resource limits (v10.0)**
- **Hook priorities are banded — collision detection at registration prevents subtle priority bugs (v10.0)**
- **Build pipeline validates safety — type check + safety calculations + fuzz tests on EVERY build (v10.0)**
- **MASTER_INDEX counts are floors — auto-discovery means counts grow without manual updates (v10.0)**
- **Errors are typed — PrismError hierarchy enables typed dispatch, not string matching (v10.0)**
- **Logs are correlated — correlationId traces any request from dispatcher to response (v10.0)**
- **Dependencies are locked — npm ci + pinned versions prevent "it worked yesterday" bugs (v10.0)**
- **E3 state management is decided — Zustand selected with rationale, not deferred to execution (v10.0)**
- **External backup is enforced — M-M2 BLOCKED without verified off-machine backup (v10.0)**
- **Migration is long-tail validated — real production traffic replayed against warm standby nightly (v10.0)**
- **Safety boundaries are fuzz-tested — randomized perturbations verify S(x) gates at edges (v10.0)**
- **Safety execution is trace-proven — correlationId proves safety engines ran, not just registered (v10.0)**
- **Fast-path reduces ceremony — 3 clean MS in a row → reduced overhead for routine work (v10.0)**
- **Human review has temporal heartbeat — every 10 sessions regardless of batch milestones (v10.0)**
- **Rollback is rehearsed — fire drill at SU-3 proves procedure works mid-project (v10.0)**
- **Multi-axis extensions are tested together — composite safety tests prevent interaction bypasses (v10.0)**
- **Schema migrations are scoped — v1 limits to additive/rename only, preventing framework creep (v10.0)**
- **Metadata repairs itself — auto-repair proposes fixes when code reality is clear (v10.0)**

*Every platform and manufacturing MS executable from cold start. Every enterprise MS has a defined purpose, deliverable, and entry/exit conditions — front-loading augments these specs with detailed steps, it does not generate them from nothing. Every hook installed with its dependencies.*
*Every feature verified for wiring and synergy. Every ambiguity resolved by protocol.*
*Every system artifact — GSD, AutoPilot, memories, quick-ref, MASTER_INDEX, DEV_PROTOCOL, COHERENCE_AUDIT — updated at defined stops.*
*Every track fully specified. Every cross-track dependency mapped with fallbacks.*
*Every safety-critical calculation has a test matrix entry and fuzz-tested boundaries.*
*Every infrastructure file has a migration tier and line count baseline.*
*Every engine has a consumer. Every feedback loop is closed. Every sequence is tested.*
*Every downstream consumer has a cleanup protocol for data rollback.*
*Every human validation point is scheduled before it's needed, with structured questionnaires.*
*Every risk has an off-ramp. Stopping with a working partial system is always an option.*
*Every data access is abstracted. Every API is versioned. Every extension point is defined.*
*Every calculation model is pluggable. Every plugin is sandboxed, permissioned, and resource-limited.*
*Every post-deployment maintenance scenario has a procedure.*
*Every component type has a zero-touch or single-action extension path.*
*Every build validates type safety, safety calculations, and safety execution traces.*
*The system that gets built can grow, adapt, and accept new domains without a rewrite — and without updating a bunch of other things.*

*If you're lost: Section 3 Decision Protocol → Position Recovery → find your MS → read entry conditions → continue.*
*If you're overwhelmed: Section 16 Operator Quick Reference → see exactly what to do next.*
*If you need architecture details: Section 17 Infrastructure Migration Map → find the file → check its tier and import timing.*
*If you need wiring details: Section 18 Wiring Verification Protocol → find the engine → trace its consumer chain.*
*If things are going wrong: Section 3.11 Emergency Off-Ramp Protocol → check triggers → reassess if needed.*
*If you want to add something: Section 3.17 Zero-Touch Extensibility Protocol → find your component type → follow the drop-in contract.*
*If you're starting fresh: START HERE block (page 1) → boot → find position → execute.*

