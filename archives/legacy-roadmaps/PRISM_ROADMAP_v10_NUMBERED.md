00001 | # PRISM MCP FRAMEWORK — MASTER DEVELOPMENT ROADMAP v10.0
00002 | 
00003 | **Self-Executing • Upload-and-Go • Zero-Touch Extensibility • Build-Pipeline-Hardened • Auto-Discovery • Drop-In Architecture • Audit-Hardened • Risk-Mitigated**
00004 | 
00005 | February 2026 | CONFIDENTIAL
00006 | 
00007 | ---
00008 | 
00009 | ### v10.0 CHANGELOG (50 enhancements from extensibility friction analysis + build safety audit + external review integration)
00010 | 
00011 | **ZERO-TOUCH EXTENSIBILITY (8) — The Core Theme:**
00012 | - ZT-1: Added Zero-Touch Extensibility Protocol (Section 3.17) — defines the "drop-in" contract for skills, scripts, hooks, plugins, calc models, and controllers. Adding any of these now requires 1 action (create the file/register the component) instead of 4-5 manual coordination steps.
00013 | - ZT-2: Skill Auto-Discovery — SkillRegistry scans skills directory on boot, auto-registers valid skill files. PLATFORM-SKILL-AUTO-LOAD upgraded from suggestion to auto-registration. New skills = drop file → available. MASTER_INDEX skill count becomes "≥137" validation, not hard count.
00014 | - ZT-3: Script Self-Description — Python scripts include PRISM_MANIFEST header comments declaring name, trigger, priority, and dependencies. ScriptRegistry reads manifests on boot. New scripts = drop file with manifest → auto-wired.
00015 | - ZT-4: Atomic Hook Registration — `prism_hook→register_with_manifest` action atomically registers hook AND updates HOOK_MANIFEST.json. Post-M-FINAL, HOOK_MANIFEST.json is sole source of truth (Section 8 becomes historical). Three-way reconciliation → two-way.
00016 | - ZT-5: Plugin Dependency Resolution — Plugin manifests include `dependencies` and `provides` fields. PluginRegistry enforces load order and blocks uninstall of active dependencies. Critical for E3-MS21 Plugin SDK.
00017 | - ZT-6: Hook Priority Bands — Systematic namespace allocation (0-9 critical, 10-29 system, 30-49 platform, 50-69 manufacturing, 70-89 enterprise, 90-99 telemetry). Collision detection at registration time. Added to P1-MS3 hook triage.
00018 | - ZT-7: Extension Validation at SAU-Light — EXTENSION_REGISTRY.json validated at SAU-Light (not just SAU-Full), preventing orphaned extensions between 8-15 week gaps.
00019 | - ZT-8: Count Validation Shift — MASTER_INDEX counts become floor validators ("≥ N") rather than exact counts. Auto-discovery means counts grow without manual updates. Exact counts verified at SAU-Full via live system query.
00020 | 
00021 | **BUILD PIPELINE HARDENING (5):**
00022 | - BP-1: Added Type Checking to Build Pipeline — `tsc --noEmit --incremental` runs as validation step before esbuild compilation. Catches type mismatches in safety-critical calculation parameters at build time. If tsc --noEmit OOMs, fallback to project references splitting.
00023 | - BP-2: Added `test:critical` npm Script — Runs after EVERY build: type check, 50 safety calculations, hook chain smoke test, registry loading check. Safety calculations are pure math with zero API calls — no reason not to run constantly.
00024 | - BP-3: Added Dependency Lockfile Strategy — package-lock.json committed/archived, `npm ci` replaces `npm install` for reproducible builds, dependency audit at SAU-Full, @anthropic-ai/sdk pinned to specific version.
00025 | - BP-4: Added esbuild Incremental Mode — `esbuild.context()` with `rebuild()` for ~10x faster subsequent builds. Build time drops from ~2s to ~200ms during microsession iteration.
00026 | - BP-5: Added JSON Schema Validation at Python/TypeScript Boundary — Safety-critical Python scripts (safety_calc_test_matrix.py, mfg_batch_validator.py) validate results against shared JSON schemas. Catches serialization mismatches at the language seam.
00027 | 
00028 | **CODING METHODOLOGY (4):**
00029 | - CM-1: Added PrismError Class Hierarchy — Typed error classes (PrismError, CalcError, SafetyError, RegistryError) replace string-based error matching. Error pattern DB and CalcHookMiddleware use typed dispatch. Added to P0-MS5 type definitions.
00030 | - CM-2: Added Structured Logging with Correlation IDs — Every dispatcher call generates a correlationId that flows through hooks, engines, and scripts. TelemetryEngine captures structured log entries: {timestamp, correlationId, source, level, message, context}. Added to P0-MS4.
00031 | - CM-3: Added Async/Await Migration Strategy — JsonFileProvider uses synchronous reads wrapped in Promise.resolve() (zero behavior change). Async transition happens ONLY when swapping to truly async backend (SQLite/PostgreSQL). Prevents accidental async bugs during P0-MS6 DataProvider refactor.
00032 | - CM-4: Added E3 State Management Pre-Decision — Zustand selected over Redux with documented rationale. Decision made NOW, not deferred to E3-MS1 execution. Removes highest-risk single decision from enterprise track.
00033 | 
00034 | **SAFETY & RELIABILITY (5):**
00035 | - SR-1: External Backup Elevated to BLOCK — Before M-M2 batch 1: verified external backup destination required (BLOCK, not advisory). During M-M2: automated backup after every batch completion (not just SAU stops). Irreplaceable validated manufacturing data cannot rely on WARN-level protection.
00036 | - SR-2: Long-Tail Migration Validation — During 14-day warm standby, every unique calculation request through prism-platform is replayed against mcp-server nightly. Real production traffic as test corpus catches edge cases the predefined 50-calc matrix doesn't cover.
00037 | - SR-3: Added Microsession Resource Profiling — Microsessions classified by resource profile (I/O-bound, context-bound, compute-bound) with profile-appropriate tool call budgets. Extends E3 complexity classification to all phases.
00038 | - SR-4: Safety Fuzz Testing — Randomized boundary testing around safety thresholds added to safety_calc_test_matrix.py. Tests parameter combinations at ±5% of S(x)=0.70 boundary to verify safety gates activate correctly at edges, not just at predetermined test points.
00039 | - SR-5: Runtime Safety Trace Proof — Every safety-critical dispatcher action must produce a correlationId trace proving the safety engine was actually called (not just registered). Verified via TelemetryEngine SAFETY log entries. Prevents refactoring or hook changes from silently bypassing safety engines.
00040 | 
00041 | **EXTERNAL REVIEW INTEGRATION (12 — from independent assessments by three reviewers):**
00042 | - ER-1: Fast-Path Execution Protocol — After 3 consecutive clean MS completions with no flags, reduce ceremony: skip detailed plan approval, allow 2 extra tool calls. Resets on any flag or failure. Addresses governance overhead concern.
00043 | - ER-2: Temporal HITL Heartbeat — Added mandatory human review every 10 sessions regardless of batch count. Catches style drift and pattern erosion between the batch-triggered H-1 through H-4 gates. Review uses structured questionnaire.
00044 | - ER-3: Rollback Fire Drill — Mandatory rollback rehearsal at SU-3 (mid-project). Verify mcp-server warm standby activates in <30s, data reconciliation runs correctly, and procedure documentation is still accurate. Prevents rollback procedure rot.
00045 | - ER-4: Multi-Axis Extension Conflict Testing — When multiple extension axes are active simultaneously (plugin + hook + calc model + schema extension), require composite interaction safety test. Prevents combined effects from bypassing safety assumptions.
00046 | - ER-5: DataProvider Interface Provisional — DataProvider interface explicitly marked PROVISIONAL until post-M-M2 completion. Interface may be revised based on real query patterns observed during data campaigns. Frozen to v1.0 after SU-5.
00047 | - ER-6: Schema Migration v1 Limits — v1 schema migrations limited to ADDITIVE and RENAME operations only. Structural transforms (field removal, type changes) deferred to v2 migration framework. Prevents scope creep.
00048 | - ER-7: Metadata Auto-Repair — When code reality is clear but state files disagree, system proposes corrections instead of just failing. auto_repair_mode in system_self_test.py suggests fixes for common discrepancies (count mismatches, stale positions, missing entries).
00049 | - ER-8: SAU-Full Duration Cap — SAU-Full capped at 20 tool calls maximum. If checklist exceeds budget, overflow items automatically deferred to next SAU-Light with [SAU_OVERFLOW] flag. Prevents SAU stops from becoming multi-session blockers.
00050 | - ER-9: HITL Structured Questionnaires — Human review gates H-1 through H-4 use fixed questionnaires with recorded answers. Prevents reviews from becoming superficial rubber-stamps as project progresses.
00051 | - ER-10: Test Harness Trailing Policy — Non-safety test infrastructure may trail feature development by one layer/phase. Safety test infrastructure (safety_calc_test_matrix.py, mfg_batch_validator.py) must NEVER trail. Prevents test harness from blocking feature progress.
00052 | - ER-11: Amendment Frequency Tracking — Track roadmap amendment frequency per phase. If amendments exceed 5 per phase, trigger roadmap simplification review. Prevents specification overhead from becoming a parallel maintenance project.
00053 | - ER-12: Plugin Runtime Resource Limits — CALC_MODIFY tier plugins execute within CPU/memory resource limits (configurable per-plugin). Prevents a faulty calculation extension from crashing the primary manufacturing safety engine.
00054 | 
00055 | **COUNTS UPDATED (4):**
00056 | - CU-1: Type definitions 7→8 (added error-types.ts for PrismError hierarchy)
00057 | - CU-2: System self-test checks 7→9 (added build pipeline verification, safety trace proof)
00058 | - CU-3: Decision protocol rules 13→15 categories (added Zero-Touch Extensibility, Build Pipeline Protocol)
00059 | - CU-4: SAU-Light checks 7→10 (added extension validation, floor check, amendment frequency)
00060 | 
00061 | **CONFIDENCE IMPACT:**
00062 | - Compound confidence raised from ~85% to ~88% (type checking + test-on-build + backup enforcement + safety fuzz testing close the four largest remaining risk windows)
00063 | - Schedule confidence raised from ~74% to ~76% (fast-path execution reduces ceremony overhead; resource profiling prevents budget waste; test harness trailing prevents testing drag)
00064 | - Post-deployment sustainability confidence raised from ~92% to ~96% (zero-touch extensibility eliminates manual coordination; auto-discovery means components grow without friction; plugin dependency resolution prevents load-order bugs)
00065 | 
00066 | ---
00067 | 
00068 | ### v9.0 CHANGELOG (31 enhancements from extensibility and lifecycle audit)
00069 | 
00070 | **ARCHITECTURAL ENHANCEMENTS (4):**
00071 | - AE-1: Added DataProvider Abstraction Layer — all registry access routed through DataProvider interface (P0-MS5), enabling future storage backend swaps (JSON→SQLite→PostgreSQL) without engine modification. DataProvider contract: get(), query(), put(), delete(), subscribe() with typed generics per registry category.
00072 | - AE-2: Added Data Model Extension Protocol — material/machine/tool schemas support typed extension fields via `extensions: Record<string, ExtensionField>` with category grouping, enabling new material families (composites, plastics, additive) without engine code changes. Extension schema registry tracks custom fields per tenant.
00073 | - AE-3: Added API Version Management Protocol (Section 3.12) — semantic versioning on all 324 dispatcher action signatures, deprecation protocol (N+2 version support), BREAKING_CHANGES.md tracked at SAU stops, plugin manifest declares minimum API version. Prevents silent breakage when dispatcher schemas evolve.
00074 | - AE-4: Added Plugin Security Framework — 4 permission tiers (READ_ONLY, UI_EXTEND, HOOK_INSTALL, CALC_MODIFY) with CALC_MODIFY requiring admin approval + safety matrix re-run. Plugin sandboxing prevents unauthorized access to safety-critical calculation hooks. Dependency graph validation on uninstall.
00075 | 
00076 | **LIFECYCLE PROTOCOLS (3):**
00077 | - LP-1: Added Post-Deployment Data Maintenance Protocol (Section 6.5) — covers new material ingestion, parameter updates from handbook revisions, tooling catalog updates, controller firmware alarm changes, and safety recommendation propagation. Defines quarterly review cadence, change propagation through knowledge graph and formula accuracy tracker, and triggered safety recalculation.
00078 | - LP-2: Added Post-Migration Rollback Procedure (Section 7.5) — 14-day rollback window with mcp-server warm standby, defined trigger conditions, data reconciliation procedure for entries written to prism-platform during live period, and explicit decommission criteria (30-day clean operation).
00079 | - LP-3: Added User Documentation Generation microsession (M-FINAL-MS7) — auto-generates operator-facing documentation from system knowledge base: getting started guide, common workflow tutorials, alarm decode quick reference, uncertainty band explanations. Validates with H-4 engineer during review.
00080 | 
00081 | **TESTING ENHANCEMENTS (2):**
00082 | - TE-1: Added E3 Progressive Testing Gates — component-level test coverage requirements at every E3 layer boundary (MS5: ≥40% foundation components, MS12: ≥60% dashboard components, MS20: ≥70% interactive tools, MS30: ≥80% full UI). Catches state wiring issues at layer transitions instead of MS28.
00083 | - TE-2: Added Integration Smoke Test at E4 layer boundaries — tenant isolation verified at MS6, replication verified at MS12, governance verified at MS18, full system at MS24. Prevents compound failures from late discovery.
00084 | 
00085 | **EXTENSIBILITY SPECIFICATIONS (4):**
00086 | - ES-1: Added Calculation Engine Plugin Architecture — new calculation models (beyond Kienzle/Taylor) register through CalcModelRegistry with typed input/output contracts, enabling domain extensions (EDM, additive, laser) without modifying ManufacturingCalcEngine.ts core.
00087 | - ES-2: Added Controller Extension Protocol — new controller families (#13+) register through ControllerRegistry with alarm schema, decode logic, and fix procedure templates. Pattern established by existing 12 families, now formalized as extension point.
00088 | - ES-3: Added External Integration API Contract — RESTful API surface for CAM/ERP/MES integration with versioned endpoints, rate limiting, and tenant-scoped access. Specified as E4-MS19b addition.
00089 | - ES-4: Added Schema Migration Framework — forward-compatible schema evolution with version tags on all data files, automated migration scripts at SAU-Full stops, and backward-compatible reads (new code reads old schema).
00090 | 
00091 | **COUNTS UPDATED (3):**
00092 | - CU-1: State files 17→19 (added API_VERSION.json, EXTENSION_REGISTRY.json)
00093 | - CU-2: Migration gates 15→17 (added API version parity gate, data abstraction verification gate)
00094 | - CU-3: Decision protocol rules 11→13 categories (added API Version Management, Data Access Abstraction)
00095 | 
00096 | **CONFIDENCE IMPACT:**
00097 | - Compound confidence unchanged at ~85% (new protocols reduce risk of post-deployment rework but don't affect build-phase risk)
00098 | - Schedule confidence raised from ~72% to ~74% (progressive testing catches E3 issues earlier, reducing rework probability)
00099 | - Post-deployment sustainability confidence: NEW metric — ~92% (system can accept new materials, calculations, and integrations without architectural rework for 3+ years)
00100 | 
00101 | ---
00102 | 
00103 | ### v8.5 CHANGELOG (22 fixes from external structural risk analysis)
00104 | 
00105 | **BLOCKERS FIXED (4):**
00106 | - B-1: Added Off-Machine Backup Protocol — all backups were on same C: drive as source; added external backup at every SAU-Full, robocopy or cloud sync mandatory before E4 replication arrives (~week 35)
00107 | - B-2: Added Human-in-the-Loop Validation Gates — safety-critical system had only 1 human checkpoint (gate #5 at M-FINAL); added 4 distributed domain expert spot-checks at M-M2 batch 10, batch 20, batch 30, and pre-M-FINAL
00108 | - B-3: Added Architectural Coherence Audit to SAU-Full — Claude's episodic memory creates style/pattern drift across 75 weeks; added code consistency sampling + architectural decision replay at every SAU-Full
00109 | - B-4: Hook Count Source-of-Truth formalized — expected hook count was ambiguous in system_self_test.py; specified HOOK_MANIFEST.json as authoritative source, updated at every hook-installing MS
00110 | 
00111 | **DEFECTS FIXED (4):**
00112 | - D-1: System self-test check count corrected 5→6 in SU-1 verification table (disk space check added in v8.4 but SU-1 still said "All 5 checks")
00113 | - D-2: Confidence assessment methodology changed from per-phase independent to compound probability with honest joint estimate (~85% joint, not 99.85%)
00114 | - D-3: Dual-run workload coverage rebalanced — 1,200 representative queries across 324 actions was ~3.7 per action; rebalanced to weighted distribution with warm scenario journeys (~7,200 total)
00115 | - D-4: ATCS throughput model updated — lower-bound scenario (3 batches/session with sustained quarantine) required 23+ M-M2 chats; schedule buffer added (15-25, was 15-20)
00116 | 
00117 | **GAPS FILLED (8):**
00118 | - G-1: Added Warm Scenario Workload to 72-hour dual-run — stateless queries miss interaction bugs between ATCS, context pressure, and calculations; added 6 multi-step journey test types
00119 | - G-2: Added Style Consistency Audit protocol — code naming, error handling, import patterns drift between model versions; added sampling + comparison at SAU-Full
00120 | - G-3: Added Enterprise Phase Margin Protocol — 82 MS in ~22 chats (3.7 MS/chat) leaves near-zero margin; added flex expansion triggers, early-warning metrics, and E3 complexity classification
00121 | - G-4: Added M-M3 Compliance Domain Expert Protocol — ISO compliance at 92% confidence needs real auditor input, not just code generation; enhanced M-M3 MS with standards research and sample artifact generation
00122 | - G-5: Added ATCS Quarantine Budget Protocol — sustained quarantine rates >5% consume entire sessions in resolution with zero batch throughput; added time-boxing and deferred resolution sessions
00123 | - G-6: Added Interleaving Overhead Budget — track switching between M-M2 and Enterprise adds ~2-3 tool calls per session; effective budget during interleaving is 13 (not 15)
00124 | - G-7: Added E3 Architectural Decision Replay — front-loading at layer boundaries reads E3_ARCHITECTURE.md but doesn't verify consistency with BINDING decisions; added automated spot-checks at each layer boundary
00125 | - G-8: Added Emergency Off-Ramp Protocol — 75-week plan had no defined criteria for when to stop, restructure, or seek help; added 6 trigger conditions with reassessment procedure
00126 | 
00127 | **ADVISORIES ADDRESSED (6):**
00128 | - A-1: Confidence assessment updated with v8.5 column reflecting compound probability (~85% joint confidence)
00129 | - A-2: M-M2 chat estimate widened from "~15-20" to "15-25" with schedule impact documented
00130 | - A-3: Section 7.4 backup destinations diversified beyond C:\PRISM\archive\ — external backup mandatory at SAU-Full
00131 | - A-4: E3 MS annotated with complexity class (UI-RENDER / STATE-INTEGRATION / TOOL-BUILD / PLATFORM-BUILD) affecting chat loading
00132 | - A-5: Migration gate #5 (UAT sign-off) enhanced from single checkpoint to progressive validation (H-1 through H-4)
00133 | - A-6: Section 14 system self-test count corrected from 5 to 6; state file count updated to 17
00134 | 
00135 | ---
00136 | 
00137 | ### v8.4 CHANGELOG (13 fixes from structural risk analysis)
00138 | 
00139 | **BLOCKERS FIXED (3):**
00140 | - B-1: Added 1-line purpose + deliverable + entry/exit for ALL 82 enterprise MS (E3-MS1 through E3-MS30, E4-MS1 through E4-MS24) — front-loading protocol now augments existing specs rather than generating them from nothing
00141 | - B-2: Clarified ATCS "autonomous" execution model — ATCS queues work that executes on next session start, NOT a background daemon; throughput estimates adjusted, M-M2 interleaving protocol updated accordingly
00142 | - B-3: Specified 72-hour dual-run workload generator (dual_run_workload.py as Windows Scheduled Task, not manual operator) with continuous divergence logging and ~5,400 automated test queries
00143 | 
00144 | **DEFECTS FIXED (3):**
00145 | - D-1: Hook count reconciled — 27 named new hooks (not 28); total corrected 145→144 (117 inherited + 23 platform/system + 4 MFG); full categorization by prefix (SYS/PLATFORM/MFG) added to Section 8
00146 | - D-2: Knowledge graph edge rollback mechanism added to campaign data rollback protocol (Section 6.4) — MemoryGraphEngine.removeEdgesBySource() plus downstream consumer cleanup checklist
00147 | - D-3: P-DM microsession fully specified with entry/exit conditions, assessment→scope→migrate→verify→document steps, and schema_migrator.py capabilities (was trigger table only)
00148 | 
00149 | **GAPS FILLED (5):**
00150 | - G-1: Added Model Upgrade Protocol — upgrade at SAU-Full boundaries only, re-run safety matrix + benchmarks, never mid-campaign, cost impact assessment
00151 | - G-2: Added Disk Space and Archive Management Protocol — estimated ~10-15GB growth, disk_space_check added to system_self_test.py, cleanup priority chain
00152 | - G-3: Added Context Window Change Contingency — pressure threshold recalibration procedure, microsession limit scaling, detection via benchmark drift
00153 | - G-4: Added junction point edge cases for WSL2 and cross-drive scenarios with explicit 3-tier fallback chain (junction → config → copy) and validation requirements
00154 | - G-5: Added downstream consumer notification protocol for campaign data rollback — knowledge graph, formula accuracy, computation cache, E2 cost, E3 telemetry each handled with specific cleanup steps
00155 | 
00156 | **ADVISORIES ADDRESSED (2):**
00157 | - A-1: E3 Chat Loading Guide enhanced with per-MS deliverable descriptions (not just load indicators); E4 Chat Loading Guide similarly enhanced
00158 | - A-2: Confidence assessment updated with v8.4 column reflecting all changes; enterprise confidence raised 97%→99%
00159 | 
00160 | ---
00161 | 
00162 | ### v8.3 CHANGELOG (21 fixes from independent gap analysis)
00163 | 
00164 | **BLOCKERS FIXED (2):**
00165 | - B-1: Moved SessionLifecycleEngine (351L), ComputationCache (420L), DiffEngine (196L) imports from P0-MS7 to P0-MS6 — MS6 exit conditions were verifying engines that didn't exist yet
00166 | - B-2: Removed CalcHookMiddleware from P0-MS9 Tier 2 import list (already imported at P0-MS7 with autoHookWrapper); noted early import in Section 17.1 Tier 2 table
00167 | 
00168 | **DEFECTS FIXED (5):**
00169 | - D-1: UAT scenario count in Section 14 corrected from "5+" to "8" (matching enumerated scenarios)
00170 | - D-2: SU-5 engine count corrected to "0 engines" — WAL/cost are infrastructure, not in 29-engine list
00171 | - D-3: Added index.ts (300L) to Section 18.1 consumer chain map — 29/29 claim now verified
00172 | - D-4: Standardized hook categorization to provenance split: "145 total (117 inherited + 25 new platform + 3 new manufacturing)"
00173 | - D-5: Added M-M3 chat assignments (chats 38, 41) interleaved with E4 in Section 9
00174 | 
00175 | **GAPS FILLED (8):**
00176 | - G-1: Added uat_session_runner.py (~200L) creation to P-P3-MS5
00177 | - G-2: Added boot_efficiency_tracker.py (~120L) creation to P-P1-MS7 Step 4
00178 | - G-3: Enumerated all 15 session memory categories with consumers in P-P1-MS7
00179 | - G-4: Created M-FINAL-MS1 through MS6 microsession breakdown with entry/exit conditions and 72-hour scheduling notes
00180 | - G-5: Added UAT Critical Issue Resolution Protocol (classify → fix MS → timing rules → escalation)
00181 | - G-6: Changed Windows symlink to junction points (`mklink /J`, no admin required) with config-based fallback
00182 | - G-7: Added full P-PERF-MS3 and P-PERF-MS4 specifications with entry/exit conditions
00183 | - G-8: Added E3/E4 MS-per-chat loading guides with 🔴/🟡/🟢 load indicators
00184 | 
00185 | **ADVISORIES ADDRESSED (6):**
00186 | - A-1: Microsession count updated from ~124 to ~190 (accurate count across all tracks)
00187 | - A-2: Enhanced P-P3P4-MS-FINAL with 7-point SU-4 pre-flight checklist
00188 | - A-3: Added KNOWN_RENAMES spot-check (3 random names) to SU-2 verification table
00189 | - A-4: Marked PLATFORM-ATCS-CHECKPOINT-SYNC as PENDING at P0-MS3, activates at P0-MS8
00190 | - A-5: Added Campaign Plateau Contingency ([CAMPAIGN_CEILING] flag with analysis and decision protocol)
00191 | - A-6: Added batch composition enumeration to Section 18.3 (cross-ref to SU-3 definitions)
00192 | 
00193 | ---
00194 | 
00195 | ---
00196 | 
00197 | # ⚡ START HERE — READ THIS FIRST
00198 | 
00199 | ## What Is PRISM?
00200 | 
00201 | PRISM is a safety-critical CNC manufacturing intelligence system. It recommends cutting parameters, predicts tool life, validates safety limits, and decodes machine alarms. **Mathematical errors in this system can cause tool explosions and operator injuries.** The system enforces S(x) ≥ 0.70 (mathematical certainty) and Ω ≥ 0.70 (quality score) as hard blocks — no shortcuts, no placeholders, lives depend on correctness.
00202 | 
00203 | ## What Already Exists?
00204 | 
00205 | An MCP server (`C:\PRISM\mcp-server\`) with **27 dispatchers** exposing **324 verified actions**, **29 engines** (19,930 lines), **19 registries** (13,879 lines), **34 auto-firing cadence functions**, **117 pre-existing hooks** (roadmap adds 27 new → **144 total at completion**), and **215 JSON data files** across 6 directories. The structural inventory of everything in the MCP server is documented in **MASTER_INDEX.md** (`C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md`, 302 lines) — this is the truth source for all counts and file locations.
00206 | 
00207 | ## What Are You Building?
00208 | 
00209 | A new platform (`C:\PRISM\prism-platform\`) that replaces the monolithic MCP server with a plugin-based architecture. You'll scaffold it, import systems piece by piece, populate it with validated manufacturing data, build enterprise features (WAL, cost tracking, visual dashboard, replication), then migrate everything over and retire the old server. The project spans ~75-85 weeks across ~74-79 chats.
00210 | 
00211 | ## How to Start
00212 | 
00213 | **EVERY session — no exceptions — begins with:**
00214 | 
00215 | ```
00216 | STEP 1: Run boot sequence
00217 |   → prism_dev action=session_boot
00218 |   → prism_context action=todo_update
00219 | 
00220 | STEP 2: Find your position
00221 |   → prism_doc action=read name=ROADMAP_TRACKER.md
00222 |   → Find the last entry marked COMPLETE
00223 |   → Your current MS is the one immediately after it
00224 | 
00225 | STEP 3: If ROADMAP_TRACKER.md doesn't exist or is empty
00226 |   → prism_session action=state_load          (reads HANDOFF.json)
00227 |   → prism_doc action=read name=ACTION_TRACKER.md   (check pending items)
00228 |   → If ALL state files missing → you're at P-P0-MS0 (the very beginning)
00229 | 
00230 | STEP 4: Find your MS in this document
00231 |   → Platform phases: Section 5
00232 |   → Manufacturing phases: Section 5 (after platform)
00233 |   → Enterprise phases: Section 5 (after manufacturing)
00234 |   → Read ENTRY CONDITIONS → execute STEPS → verify EXIT CONDITIONS
00235 | 
00236 | STEP 5: When you finish a MS
00237 |   → prism_session action=state_save          (writes HANDOFF.json)
00238 |   → prism_doc action=append name=ROADMAP_TRACKER.md content="[MS-ID] COMPLETE [date]"
00239 |   → prism_context action=todo_update
00240 |   → If this MS changed dispatcher/action/engine/hook counts → update MASTER_INDEX.md Section 1 summary
00241 |   → If this MS is an SAU boundary → run SAU protocol (Section 4)
00242 | ```
00243 | 
00244 | ## If You're Lost
00245 | 
00246 | Read **Section 16: Operator Quick Reference** — it's a one-page decision card that tells you exactly what to do in every situation.
00247 | 
00248 | ## If Context Compacts Mid-Session
00249 | 
00250 | The MCP server's L3 auto-recovery will fire. Trust it. When you resume:
00251 | 1. Run `prism_session action=quick_resume`
00252 | 2. Run `prism_context action=todo_read`
00253 | 3. Continue from where the recovery payload says you left off
00254 | 
00255 | ## Key Rules
00256 | 
00257 | - **Build command:** `npm run build` (runs tsc --noEmit type check + esbuild compile + test:critical). Use `npm run build:fast` for non-safety prototyping only.
00258 | - **Edit pattern:** READ → edit_block/str_replace → verify. Never retype entire files.
00259 | - **Safety:** S(x) ≥ 0.70 is a HARD BLOCK. Ω ≥ 0.70 required for release. No exceptions.
00260 | - **Anti-regression:** Run `prism_validate action=anti_regression` before any file replacement.
00261 | - **MCP-native first:** Use PRISM's own tools before Desktop Commander or bash.
00262 | - **Plan first:** Before writing >50 lines, state the plan and get approval.
00263 | - **Microsessions:** 15-25 items max, 15 tool calls max per MS to prevent context overflow.
00264 | - **MASTER_INDEX.md** is the structural truth source — read it when scaffolding, verify at every SAU.
00265 | 
00266 | ## Quality Tiers — Which Validation To Use
00267 | 
00268 | Every MS exit uses ONE of these. The tier is specified in each MS.
00269 | 
00270 | ```
00271 | QUICK:    prism_validate action=safety                              (0 API calls, <1s)
00272 | STANDARD: prism_ralph action=scrutinize                             (1 API call, ~5s)  
00273 | DEEP:     prism_ralph action=loop                                   (4-7 API calls, ~30s)
00274 | RELEASE:  prism_ralph action=assess THEN prism_omega action=compute (Opus-grade, ~45s)
00275 | ```
00276 | 
00277 | ---
00278 | 
00279 | 
00280 | # SECTION 1: WHAT CHANGED (v6 → v7 → v8 → v8.1 → v8.2 → v8.3 → v8.4 → v8.5 → v9.0 → v10.0)
00281 | 
00282 | v7 was the gap-closed, fully-specified revision. v8 was the self-executing, fully-wired revision. v8.1 was the audit-hardened revision (28 gaps). v8.2 was the **cross-reference reconciliation** (19 fixes). v8.3 was the **execution-readiness pass** (21 issues). v8.4 was the **structural risk pass** (13 fixes). v8.5 was the **external risk analysis pass** (22 fixes). v9.0 was the **extensibility and lifecycle pass** (31 enhancements). v10.0 is the **zero-touch extensibility and build hardening pass** — 50 enhancements adding auto-discovery for skills/scripts/hooks, hardened build pipeline with type checking and safety tests on every build, typed error hierarchy, correlation ID logging, external review integration (12 items from three independent assessments), and the principle that adding or upgrading any component should require exactly one action.
00283 | 
00284 | ### v8.1 → v8.2 Changes (19 fixes)
00285 | 
00286 | | # | Severity | Issue | v8.1 State | v8.2 Fix |
00287 | |---|----------|-------|-----------|----------|
00288 | | 1 | 🔴 BLOCKER | Section 9 vs 11 M4/M-FINAL chat numbers contradict | S9: T1+T2 in chats 45-52, M-FINAL 53-58. S11: T1 45-52, T2 53-60, M-FINAL 61-66 | Section 9 updated to match Section 11 allocation |
00289 | | 2 | 🔴 BLOCKER | 3/5 Tier 3 engines import earlier than Tier 3 says | TelemetryEngine, MemoryGraphEngine, CertificateEngine listed as "E3/post-launch" | Tier 3 split into Tier 3a (early import) and Tier 3b (E3 import), totals corrected |
00290 | | 3 | 🟡 DEFECT | Flex chat count: Section 14 says 3, Section 9 lists 4 | FLEX-E3 added in v8.1, count not updated | Corrected to 4 in Section 14 |
00291 | | 4 | 🟡 DEFECT | P-UAT-MS2 has no slot in any chat map | Floating — "Chat ~8" but not in Chat 8 execution order | Explicitly placed in Chat 9 after main-track MS |
00292 | | 5 | 🟡 DEFECT | autoDocAntiRegression import unwired in P0-MS3 | Section 17.3 says import at P0-MS3, but P0-MS3 steps omit it | Steps, tools, exit conditions updated in P0-MS3 |
00293 | | 6 | 🟡 DEFECT | M4-T1/T2 chat range overlap at Chat 49 | Both T1 and T2 claim Chat 49 | Corrected: T1 chats 45-52, T2 chats 53-60 per Section 11 |
00294 | | 7 | 🟡 DEFECT | SU-1 has no quality tier | Every other SU has a tier, SU-1 omitted | Added STANDARD tier to SU-1 |
00295 | | 8 | 🔵 GAP | E3 Layer→MS mapping buried in protocol text | No table, only inline references | Explicit mapping table added to E3 section header |
00296 | | 9 | 🔵 GAP | ROADMAP_TRACKER.md format never specified | Used hundreds of times, format undefined | Format spec with examples added to Section 2.12 |
00297 | | 10 | 🔵 GAP | DEMO 2 vs P-UAT-MS1 ordering undefined | Both trigger at M-M2 batch 20, relationship unspecified | Ordering defined: P-UAT-MS1 → resolve criticals → DEMO 2 |
00298 | | 11 | 🔵 GAP | UAT scenario content unspecified | "5+ scenarios" referenced, never enumerated | 8 core scenarios enumerated in P-UAT section |
00299 | | 12 | 🔵 GAP | M-M2 interleaving mechanics undefined | "Interleaved with Enterprise" with no mechanics | Interleaving protocol added to Section 9 |
00300 | | 13 | 🔵 GAP | P-DM schema mismatch detection mechanism unspecified | Hook installed, detection logic undefined | Detection mechanism specified in P-DM section |
00301 | | 14 | 🔵 GAP | CAMPAIGN_DASHBOARD.json has no schema version | Schema will evolve, no migration path | schema_version field added to initial schema |
00302 | | 15 | ⚪ ADVISORY | Registry line count estimates overshoot total | ~15,150 vs 13,879 total | Note added: MASTER_INDEX total is authoritative |
00303 | | 16 | ⚪ ADVISORY | "Machines likely complete" at batch 30 is optimistic | 750/824 at batch 30 | Corrected to "approaching RAW_AVAILABLE (~750/824)" |
00304 | | 17 | ⚪ ADVISORY | Hook categorization "142 platform + 3 MFG" misleading | Mixes inherited and new | Changed to "117 inherited + 28 new" |
00305 | | 18 | ⚪ ADVISORY | State file count may exceed 15 | Docs vs state boundary unclear | Classification note added distinguishing state files from audit docs |
00306 | | 19 | ⚪ ADVISORY | P-UAT-MS1 trigger "1,000+" wording imprecise | 1,000 processed ≠ 1,000 validated | Corrected to "≥900 validated (1,000 processed)" |
00307 | 
00308 | ### v8.0 → v8.1 Changes (28 gap fixes)
00309 | 
00310 | | Issue | v8.0 State | v8.1 Fix |
00311 | |-------|-----------|----------|
00312 | | SU-3 guide count contradicts (8 vs 22) | Sections 13/14 say 8, body says 22 | All references corrected to 22 |
00313 | | Duplicate Section 2.6 numbering | Two sections both numbered 2.6 | Self-test renumbered to 2.13 |
00314 | | M4 chat numbers overlap enterprise | M4 body says Chats 25-35 | Corrected to Chats 45-52 per Section 9 |
00315 | | P0-MS7 duplicate step 7 | Two steps numbered 7 | Renumbered 7-11 |
00316 | | P0-MS9 duplicate step 5 | Two steps numbered 5 | Renumbered 5-10 |
00317 | | P0-MS6 exit conditions incomplete | 5 components imported, 2 verified | All 5 components have exit verification |
00318 | | Duplicate swarm pattern section | Same info in table + code block | Consolidated to single detailed version |
00319 | | 96 enterprise MS unspecified | Generic template only | Entry/exit minimums for E1-MS5+ and E2; architectural constraint + front-loading for E3/E4; claim qualified |
00320 | | 10 benchmarks undefined | Referenced everywhere, never enumerated | Section 12.1 benchmark specification with all 10 |
00321 | | No campaign data rollback | Quarantine catches individuals, not systematic errors | Section 6.4 registry snapshot + rollback protocol |
00322 | | No backup/DR spec | Only compaction and replication covered | Section 7.4 backup schedule + recovery procedure |
00323 | | No E3 security spec | Auth mentioned, no constraints | E3 Security Constraints (BINDING): auth, RBAC, sanitization, API security |
00324 | | OPUS not tested in P0-MS2 | Only HAIKU + SONNET tested | All 3 tiers tested including OPUS |
00325 | | v6 dead cross-references | 3 sections say "identical to v6" | Content inlined: 18 skills table, toolkit descriptions, hook installation context |
00326 | | UAT MS not placed in chats | Floating with no chat assignment | Specific chat numbers assigned |
00327 | | M4-T3 retirement ambiguity | 750+ functions undefined at retirement | Explicit: T3 functions work via bulk import; extraction is refactoring post-retirement |
00328 | | No roadmap amendment protocol | No process for mid-project changes | Amendment protocol added to Section 1 |
00329 | | MASTER_INDEX update timing unclear | Updated only at SAU stops | MS completion step updated: if counts change → update MASTER_INDEX immediately |
00330 | | P0-MS6 scope exceeds budget | 5 components in 18 tool calls | Budget increased to 22, title updated |
00331 | | No flex buffer within E3 | FLEX-3 after E4, nothing for 30-MS E3 | FLEX-E3 added between Layer 3→Layer 4 (MS20→MS21) |
00332 | | Hook count reconciliation unclear | 28 new vs 145 total unexplained | Clarifying note: 117 pre-existing + 28 new = 145 |
00333 | | index.ts counted as engine | Inflates computation engine count | Clarified as infrastructure in engine table |
00334 | | No GSD file integrity handling | fs.readFileSync with no fallback | Integrity check: cache fallback, degraded flag, boot block if GSD_QUICK missing |
00335 | | 68-week stale reference | Section 3.10 says 68 weeks | Corrected to ~75 weeks |
00336 | | Quarantine boundary condition | 5/50 = 10% fails "< 10%" | Changed to "≤ 10%" |
00337 | | SAU artifact count unclear | "9 per stop" but 12 protocol steps | Clarified: "9 artifacts updated (12 total protocol steps)" |
00338 | 
00339 | ### v7 → v8 Changes
00340 | 
00341 | | Issue | v7.1 State | v8 Fix |
00342 | |-------|-----------|--------|
00343 | | No START HERE block | Document assumes reader knows PRISM | 30-line orientation + boot sequence on page 1 |
00344 | | Addendum A patches external | 15 patches say "see Addendum A.3" | All patches folded INTO their target sections |
00345 | | No exact MCP commands | MS steps say "verify registries" not which tool to call | P0-MS0 through MS4 have exact `prism_X action=Y` commands |
00346 | | No quality tier per MS | Steps say "validate" without specifying which tier | Every MS lists its quality tier (Quick/Standard/Deep/Release) |
00347 | | MASTER_INDEX not integrated | Not in SAU, not in scaffold, not in migration | SAU verifies it, P0-MS5 reads it as blueprint, M4 checks parity |
00348 | | Skill count wrong | 171+ | **137** (119 existing + 18 new) per MASTER_INDEX §11 |
00349 | | Script count wrong | 342+ | **75** core (73 existing + 2 new) per MASTER_INDEX §7 |
00350 | | Infrastructure files invisible | autoHookWrapper, cadenceExecutor, responseSlimmer not mentioned | Section 17 maps all infrastructure with line counts and migration tiers |
00351 | | 215 data files unmapped | "registries loading" without directory layout | Data directory inventory with file counts per directory |
00352 | | No swarm patterns for M-M2 | "swarm patterns: 8" in counts only | Specific patterns assigned per campaign type with agent counts |
00353 | | 9 migration gates | Missing infrastructure, registry, type parity | **13 migration gates** with 4 new infrastructure checks |
00354 | | Session resume buried | Boot sequence in Section 5 body text | Boot + resume protocol in START HERE block, visible immediately |
00355 | | No engine migration tiers | "29 engines" as flat list | 4 tiers (Infrastructure/Safety/Intelligence/Diagnostics) with import order |
00356 | | Engines imported but unwired | 15+ engines had no specified consumer | Section 18: Every engine has named consumer + verification schedule |
00357 | | Intelligence subsystems write-only | Error DB, formula accuracy, knowledge graph had no read-back | 7 bidirectional feedback loops with SU-4 consume tests |
00358 | | Safety engines consumer gap | M4 extracts but doesn't map call sites | Consumer Chain Mapping Protocol: trace all callers BEFORE extracting |
00359 | | Sequencing guides undertested | SU-3 tests 8/22 | SU-3 tests ALL 22 in 4 batches |
00360 | | No pre-migration wiring cert | Dual-run checks outputs but not that engines are called | WIRING_CERTIFICATION.md: gate #14 at M-FINAL |
00361 | 
00362 | | Issue | v6 State | v7 Fix | Impact |
00363 | |-------|----------|--------|--------|
00364 | | Manufacturing track unspecified | M0-M3 are one-line summaries | M0 (5 MS), M1 (4 MS), M-M2 first cycle (6 MS) fully specified | Manufacturing track executable from cold start |
00365 | | E3 has no architectural constraints | 30 MS with generic template | E3 Component Dependency Graph + state management + API contract constraints | Front-loading produces coherent architecture |
00366 | | E4 has no architectural constraints | 24 MS with generic template | E4 Replication Architecture Constraints + ATCS failover requirements | Replication and failover decisions pre-constrained |
00367 | | No cross-track dependency map | Mfg and Enterprise run "in parallel" | Explicit dependency table: what needs what, when, fallback if unavailable | No integration surprises from timing misalignment |
00368 | | No safety-critical test matrix | "50 calculations cross-validated" undefined | 50 calculations defined across 8 categories with edge cases | Test coverage is representative, not random |
00369 | | Agent count drifts silently | ~54 agents referenced everywhere | Agent count verification added to Mini-SAU and full SAU | Agent roster stays accurate across 50+ weeks |
00370 | | SAU overhead too uniform | All SAUs cost ~8-10 tool calls | SAU-Light (5 calls) vs SAU-Full (10 calls) formalized | ~20% fewer tool calls at low-risk boundaries |
00371 | | Model strings hardcoded in roadmap | MS10 checks against literal strings | Model strings read from config; SAU verifies config accuracy | No roadmap edits needed when Anthropic updates models |
00372 | | Cadence count inconsistent | P0-MS9 says 33, Section 14 says 34 | Corrected: 34 total (30 original + 4 new) | Numbers consistent throughout |
00373 | | No "tool not imported" handling | Decision Protocol silent on stub returns | Section 3.8: explicit handling for not-yet-imported tool responses | No confusion during early platform MS |
00374 | | SESSION_INSIGHTS rotates away early data | 3KB limit purges P0 insights during E4 | Phase Archive protocol preserves compiled insights permanently | Regression debugging has historical context |
00375 | | No critical path identification | Flex chats allocated arbitrarily | Critical path analysis with float identification | Flex chats placed where slack is actually needed |
00376 | | No operator quick reference | Decision Protocol is dense | Section 16: one-page operator control sheet | Fast execution decisions without reading full protocol |
00377 | | No Manufacturing data campaign spec | M-M2 "data campaigns start" with no structure | Batch definition, numbering, checkpoint protocol, UAT trigger defined | P-UAT-MS1 trigger ("batch 20") is unambiguous |
00378 | 
00379 | **Net impact:** ~75 chats (up from ~72 — Manufacturing track adds 3-4), ~190 microsessions (up from ~124 — accurate count across all tracks: P0(11) + P1(8) + P2(8) + P3-P4(11) + M-M0(5) + M-M1(4) + M-M2(6) + M-M3(4) + E1(18) + E2(10) + E3(30) + E4(24) + M4-T1(8) + M4-T2(20) + cross-cutting(7) + SU(6) + SAU-Light(~10) + M-FINAL(6)), with dramatically higher cross-track coherence and zero unspecified execution paths. The increase is coverage, not overhead.
00380 | 
00381 | ### Roadmap Amendment Protocol (NEW in v8.1)
00382 | 
00383 | *This document governs ~75-85 weeks of work. It will need amendments.*
00384 | 
00385 | ```
00386 | AMENDMENT PROCESS:
00387 |   1. Document the change in the v7→v8 change table above (add rows for v8→v8.1, v8.1→v8.2, etc.)
00388 |   2. State: what changed, why, and impact on downstream MS
00389 |   3. If the change affects MS entry/exit conditions → update ALL affected MS specs
00390 |   4. If the change affects counts (dispatchers, engines, hooks) → update Section 14 and MASTER_INDEX.md
00391 |   5. If the change affects timing → update Section 11 timeline and Section 9 chat sequences
00392 |   6. Increment version: v8.0 → v8.1 → v8.2 → v8.3, etc. Minor for fixes, major for structural changes.
00393 |   7. At next SAU stop: verify all amendments are consistent with current system state
00394 | 
00395 | DISCOVERY DURING EXECUTION:
00396 |   If an executing session discovers a gap, error, or needed change in this roadmap:
00397 |   → Document as [ROADMAP_AMENDMENT] in SESSION_INSIGHTS.md
00398 |   → Apply the fix to the roadmap file if possible in the same session
00399 |   → If not possible (scope too large): create [PERSISTENT] TODO for next SAU stop
00400 |   → At SAU: review all [ROADMAP_AMENDMENT] insights and apply
00401 | ```
00402 | 
00403 | ### Model Upgrade Protocol (NEW in v8.4)
00404 | 
00405 | *Over 75 weeks, Anthropic will release new model versions. Model changes affect calculation accuracy, agent behavior, and cost estimates. This protocol governs when and how to upgrade.*
00406 | 
00407 | ```
00408 | WHEN TO UPGRADE:
00409 |   - ONLY at SAU-Full boundaries (SU-1 through SU-6)
00410 |   - NEVER mid-campaign (M-M2 batch operations depend on consistent model behavior)
00411 |   - NEVER mid-phase (changing model behavior between MS creates debugging nightmares)
00412 |   - Exception: critical security patch → upgrade immediately, run safety matrix before continuing
00413 | 
00414 | UPGRADE PROCEDURE (at SAU-Full):
00415 |   1. Update model strings in BOTH .env files (mcp-server + prism-platform)
00416 |   2. Update known_renames.json if model string format changes
00417 |   3. Run safety_calc_test_matrix.py with NEW model → compare against baseline
00418 |      → If ANY safety calculation differs by > ±2σ from baseline: STOP
00419 |      → Investigate: is new model more accurate (update baseline) or less? 
00420 |      → If less accurate: REVERT to previous model strings
00421 |   4. Run performance_benchmark.py → compare all 10 benchmarks against baseline
00422 |      → If ANY benchmark degrades > 20%: document but proceed (models may be slower but smarter)
00423 |      → If calculation throughput (benchmark #4) degrades > 50%: REVERT
00424 |   5. Run 3 golden path demos → verify all pass
00425 |   6. Update Claude memory with new model strings
00426 |   7. Update PRISM_QUICK_REF.md (agent model strings section)
00427 |   8. Document in ROADMAP_TRACKER: "MODEL_UPGRADE: [old] → [new] at SU-X, safety matrix [PASS/FAIL]"
00428 | 
00429 | COST IMPACT:
00430 |   - New model tiers may have different pricing
00431 |   - After upgrade: recalibrate E2 cost model within 2 sessions
00432 |   - If cost changes > 30%: alert in CAMPAIGN_DASHBOARD.json
00433 | 
00434 | MODEL DEPRECATION:
00435 |   - If Anthropic deprecates a model mid-project: upgrade at next natural SAU stop
00436 |   - If model becomes unavailable before next SAU: emergency upgrade per procedure above
00437 |   - Document deprecated model in SESSION_INSIGHTS.md: [DECISION] reason for upgrade
00438 | ```
00439 | 
00440 | ### Disk Space and Archive Management Protocol (NEW in v8.4)
00441 | 
00442 | *The project generates archives over 75 weeks. Without monitoring, disk fills silently.*
00443 | 
00444 | ```
00445 | ESTIMATED GROWTH:
00446 |   - Registry snapshots: ~5MB per snapshot × 3 categories × 10 kept = ~150MB
00447 |   - Daily backups: ~50MB per day × 7 kept = ~350MB
00448 |   - Weekly backups: ~500MB per week × 4 kept = ~2GB
00449 |   - SAU archives: ~200MB per stop × 16 stops = ~3.2GB
00450 |   - WAL archives (post-E1): ~100MB/month × 12 months = ~1.2GB
00451 |   - Codebase growth: mcp-server + prism-platform + node_modules = ~2GB
00452 |   - Total estimated: ~10-15GB over 75 weeks (with rotation)
00453 |   - Peak (before rotation kicks in): ~20-25GB
00454 | 
00455 | MONITORING:
00456 |   - Add disk_space_check to system_self_test.py (check #6):
00457 |     → WARN if C:\PRISM\archive\ > 15GB
00458 |     → WARN if C: drive < 10GB free
00459 |     → RED if C: drive < 5GB free
00460 |   - Check fires at every SAU stop (Light or Full)
00461 | 
00462 | CLEANUP PROTOCOL (if WARN triggered):
00463 |   1. Verify rotation is working: daily (7 kept), weekly (4 kept), SAU (all kept)
00464 |   2. If rotation working and still large: archive oldest SAU snapshots to external storage
00465 |   3. WAL archives: reduce retention from 30 days to 14 days if space-constrained
00466 |   4. Registry snapshots: reduce from 10 to 5 per category
00467 |   5. NEVER delete: latest SAU archive, latest daily backup, current WAL files
00468 | ```
00469 | 
00470 | ### Context Window Change Contingency (NEW in v8.4)
00471 | 
00472 | *The compaction/pressure system is calibrated to current context limits. If these change, thresholds need recalibration.*
00473 | 
00474 | ```
00475 | DETECTION:
00476 |   - At every SAU-Full: verify context pressure predictions match actual behavior
00477 |   - If PLATFORM-CONTEXT-BUDGET consistently fires too early (>2 false positives per chat): 
00478 |     window may have increased
00479 |   - If compaction fires without PLATFORM-CONTEXT-BUDGET warning: window may have decreased
00480 | 
00481 | RECALIBRATION TRIGGER:
00482 |   - Anthropic announces context window change (check at SAU-Full stops)
00483 |   - Context pressure accuracy benchmark (#9) fails at P-PERF check
00484 |   - 3+ compaction events in 2 consecutive chats (indicates miscalibrated thresholds)
00485 | 
00486 | RECALIBRATION PROCEDURE:
00487 |   1. Measure actual context capacity: fill context with known-size data, record compaction point
00488 |   2. Recalculate pressure thresholds:
00489 |      → GREEN ceiling: 60% of NEW capacity
00490 |      → YELLOW: 60-84% of NEW capacity
00491 |      → RED: 85-94% of NEW capacity
00492 |      → BLACK: 95%+ of NEW capacity
00493 |   3. Update ContextManager.ts with new thresholds
00494 |   4. Update compaction_armor.py trigger threshold (currently 50% — scale proportionally)
00495 |   5. Update boot context budget (currently 10KB max — scale proportionally)
00496 |   6. Run P-PERF context pressure benchmark → verify ±5% accuracy
00497 |   7. Document in ROADMAP_TRACKER: "CONTEXT_RECALIBRATION: [old_cap] → [new_cap], thresholds updated"
00498 | 
00499 |   MICROSESSION LIMITS:
00500 |   - Current: 15-25 items, 15 tool calls max
00501 |   - If window INCREASES > 50%: raise to 20-35 items, 20 tool calls max
00502 |   - If window DECREASES > 25%: lower to 10-18 items, 12 tool calls max
00503 |   - Recalibrate at SAU stop, never mid-MS
00504 | ```
00505 | 
00506 | ---
00507 | 
00508 | 
00509 | # SECTION 2: NEW CAPABILITIES (Updated from v10.0)
00510 | 
00511 | ## 2.1 Skills: ≥137 (119 existing + 18 new, auto-discovered)
00512 | 
00513 | MASTER_INDEX §11 confirms 119 existing skill files in C:\PRISM\skills-consolidated\. The roadmap creates 18 new skills. **Post v10.0, skills auto-discover from directory — count is a floor ("≥137"), not exact.**
00514 | 
00515 | | # | Skill Name | Created At | Purpose |
00516 | |---|-----------|-----------|---------|
00517 | | 1 | prism-registry-diagnostics | P0-MS1 | Registry path debugging and health reporting |
00518 | | 2 | prism-migration-validator | P2-MS7 | Dual-run validation skill |
00519 | | 3 | prism-campaign-operator | M-M0-MS2 | Data campaign execution guidance |
00520 | | 4 | prism-batch-troubleshoot | M-M2-MS1 | Batch error diagnosis |
00521 | | 5 | prism-material-validation | M-M1-MS2 | Material parameter cross-validation |
00522 | | 6 | prism-alarm-enrichment | M-M1-MS3 | Alarm fix procedure improvement |
00523 | | 7 | prism-compliance-guide | M-M3-MS1 | ISO compliance workflow guidance |
00524 | | 8 | prism-wal-operations | E1-MS1 | WAL management and replay |
00525 | | 9 | prism-cost-analysis | E2-MS1 | Cost intelligence queries |
00526 | | 10 | prism-dashboard-guide | E3-MS1 | Visual dashboard navigation |
00527 | | 11 | prism-plugin-dev | E3-MS21 | Plugin SDK development guide |
00528 | | 12 | prism-replication-ops | E4-MS1 | Replication management |
00529 | | 13 | prism-failover-guide | E4-MS8 | Failover procedures |
00530 | | 14 | prism-perf-tuning | P-PERF-MS1 | Performance optimization guidance |
00531 | | 15 | prism-uat-scenarios | P-UAT-MS1 | UAT test scenario execution |
00532 | | 16 | prism-formula-debug | P1-MS5 | Formula recommendation debugging |
00533 | | 17 | prism-swarm-patterns | P4-MS2 | Swarm deployment guidance |
00534 | | 18 | prism-extraction-guide | M4-T1 | Monolith extraction procedures |
00535 | 
00536 | **Every new skill MUST include a `## Changelog` section** per W1.4 protocol.
00537 | 
00538 | **Auto-Discovery (v10.0):** New skills dropped into C:\PRISM\skills-consolidated\ with valid YAML front matter are registered automatically on next boot or PLATFORM-SKILL-AUTO-LOAD trigger. No manual registry updates needed. See Section 3.17 for skill manifest format.
00539 | 
00540 | ## 2.2 Scripts: ≥75 core (73 existing + 2 new + build pipeline scripts, self-describing)
00541 | 
00542 | MASTER_INDEX §7 confirms 73 core Python scripts (~35,430 lines) in C:\PRISM\scripts\core\. Additions:
00543 | 
00544 | | Script | Est. Lines | Purpose | Wired To |
00545 | |--------|-----------|---------|----------|
00546 | | mfg_batch_validator.py | ~150 | Validates manufacturing data campaign batches | M-M2 batch campaigns, P-UAT-MS1 trigger |
00547 | | safety_calc_test_matrix.py | ~200 | Executes 50+ calculation safety test matrix (with fuzz testing v10.0) | test:critical, SU-6, P-PERF-MS4 |
00548 | | test_critical_runner.py | ~120 | Orchestrates test:critical build step (v10.0) | npm run build pipeline |
00549 | | hook_smoke_test.py | ~80 | Verifies all registered hooks are callable (v10.0) | test:critical build step |
00550 | 
00551 | **Self-Description (v10.0):** Scripts with PRISM_MANIFEST headers auto-register and auto-wire to declared triggers. Legacy scripts without manifests remain accessible via manual invocation. See Section 3.17 for manifest format.
00552 | 
00553 | ## 2.3 Hooks: ≥144 total (117 inherited + 27 new, atomically registered)
00554 | 
00555 | Installation sequence follows dependency order defined in Section 8. Each hook installs in the MS that builds its dependencies — never before deps exist. Incremental with dependency checking: hooks whose dependencies are not yet imported enter PENDING state and activate when deps are available.
00556 | 
00557 | **Atomic Registration (v10.0):** `prism_hook→register_with_manifest` atomically registers hook + updates HOOK_MANIFEST.json + validates priority bands + checks collisions. Post-M-FINAL, HOOK_MANIFEST.json is sole source of truth. See Section 3.17 for priority bands and collision detection.
00558 | 
00559 | ## 2.4 Toolkits: 4
00560 | 
00561 | | Toolkit | Purpose | Key Components |
00562 | |---------|---------|----------------|
00563 | | Manufacturing Analysis | Core CNC calculation workflows | speed_feed, cutting_force, tool_life, surface_finish pipelines |
00564 | | System Administration | Platform management and monitoring | registry management, hook management, telemetry, diagnostics |
00565 | | Data Campaign | Batch data ingestion and validation | ingestion pipeline, batch validator, campaign dashboard |
00566 | | Enterprise Operations | WAL, cost, compliance operations | WAL management, cost tracking, compliance reporting |
00567 | 
00568 | ## 2.5 External Integration API (NEW in v9.0)
00569 | 
00570 | RESTful API surface for CAM/ERP/MES system integration, built at E4-MS19b:
00571 | 
00572 | | Endpoint | Method | Purpose | Permission |
00573 | |----------|--------|---------|------------|
00574 | | /api/v1/materials/{id} | GET | Material lookup with full parameters | READ_ONLY |
00575 | | /api/v1/materials/search | POST | Query materials by filter | READ_ONLY |
00576 | | /api/v1/calculations/speed-feed | POST | Calculate cutting parameters | READ_ONLY |
00577 | | /api/v1/calculations/tool-life | POST | Predict tool life | READ_ONLY |
00578 | | /api/v1/alarms/{controller}/{code} | GET | Alarm decode + fix procedure | READ_ONLY |
00579 | | /api/v1/machines/{id} | GET | Machine specification lookup | READ_ONLY |
00580 | | /api/v1/health | GET | System health status | Public |
00581 | 
00582 | All endpoints versioned. Rate limited per tenant. OpenAPI spec auto-generated. Authentication via tenant-scoped API tokens. Write operations available only at CALC_MODIFY permission tier.
00583 | 
00584 | ## 2.6 Infrastructure Files (Critical — from MASTER_INDEX §6)
00585 | 
00586 | These are the invisible load-bearing files that make hooks fire, context compress, and cadence execute. They MUST migrate to prism-platform.
00587 | 
00588 | | File | Lines | What It Does | What Breaks Without It |
00589 | |------|-------|-------------|----------------------|
00590 | | autoHookWrapper.ts | 1,559 | Universal hook proxy. Wraps all 27 dispatchers with before/after/error hooks, S(x) hard blocks, cadence enforcement, buffer zone warnings. | ALL hooks stop firing. S(x) blocks inactive. Cadence dead. |
00591 | | cadenceExecutor.ts | 2,246 | System heartbeat. 34 auto-fire functions: autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoSurvival, autoAttentionScore, etc. | No auto-todo, no checkpoints, no compaction detection, no context pressure management. |
00592 | | responseSlimmer.ts | ~200 | Truncation caps: 20KB normal, 12KB at 60%, 8KB at 70%, 5KB at 85%. | Context overflows at high pressure. |
00593 | 
00594 | ## 2.7 Engines: 29 (19,930 lines total — from MASTER_INDEX §4)
00595 | 
00596 | See Section 17 for full list with line counts and migration tiers.
00597 | 
00598 | ## 2.8 Registries: 19 (13,879 lines total — from MASTER_INDEX §5)
00599 | 
00600 | See Section 17 for full list with line counts and migration tiers.
00601 | 
00602 | ## 2.9 Type Definitions: 8 files (~1,799 lines total — from MASTER_INDEX §9 + v9.0/v10.0 additions)
00603 | 
00604 | | File | Lines | Purpose |
00605 | |------|-------|---------|
00606 | | prism-schema.ts | 689 | Core dispatcher parameter and result types |
00607 | | telemetry-types.ts | 246 | TelemetryEngine types |
00608 | | graph-types.ts | 193 | MemoryGraphEngine types |
00609 | | pfp-types.ts | 186 | PredictiveFailureEngine types |
00610 | | certificate-types.ts | 105 | CertificateEngine types |
00611 | | data-provider.ts | ~130 | DataProvider interface, QueryFilter, DataEvent types (v9.0) |
00612 | | calc-model-types.ts | ~100 | CalcModel interface, CalcModelRegistry types (v9.0) |
00613 | | error-types.ts | ~150 | PrismError hierarchy: CalcError, SafetyError, RegistryError (v10.0) |
00614 | 
00615 | These import at P0-MS5 (scaffold) — they define the TypeScript interfaces for all dispatcher params.
00616 | 
00617 | ## 2.10 Data Files: 215 JSON files across 6 directories (from MASTER_INDEX §8)
00618 | 
00619 | ```
00620 | C:\PRISM\data\materials\        → 64 files
00621 | C:\PRISM\data\machines\         → 37 files
00622 | C:\PRISM\data\controllers\      → 3 files
00623 | C:\PRISM\data\tools\            → 8 files
00624 | C:\PRISM\extracted\machines\    → 38 files (alternate source)
00625 | C:\PRISM\extracted\controllers\ → 65 files (alternate source)
00626 | ```
00627 | 
00628 | ## 2.11 GSD Protocol Files: 16 files (~628 lines total)
00629 | 
00630 | ```
00631 | C:\PRISM\mcp-server\data\docs\gsd\
00632 | ├── GSD_QUICK.md          (~87L)  — Master quick reference, decision tree
00633 | ├── DEV_PROTOCOL.md       (~165L) — Development workflow rules
00634 | └── sections/
00635 |     ├── laws.md, workflow.md, buffer.md, equation.md, tools.md,
00636 |     ├── manus.md, evidence.md, gates.md, start.md, end.md,
00637 |     └── d1.md, d2.md, d3.md, d4.md
00638 | ```
00639 | 
00640 | gsdDispatcher.ts reads these at runtime (fs.readFileSync). Editing a .md file → changes live immediately (no rebuild). gsd_sync_v2.py auto-updates tools.md and GSD_QUICK.md counts after builds.
00641 | 
00642 | **GSD File Integrity (NEW in v8.1):** If fs.readFileSync throws (file missing, corrupted, or malformed markdown), gsdDispatcher must: (1) log error to TelemetryEngine "system" channel, (2) fall back to last cached GSD state (cached at successful boot), (3) set [GSD_DEGRADED] flag that fires at next boot. If GSD_QUICK.md itself is missing, BLOCK boot and require manual recovery — it's the routing decision tree.
00643 | 
00644 | ## 2.12 KNOWN_RENAMES: 180-190 entries in guardDispatcher.ts
00645 | 
00646 | Maps old tool names → new dispatcher+action format. Backward compatibility for scripts, skills, and sequencing guides. prism_guard→pre_call_validate uses these to auto-correct tool calls. Must be preserved as JSON config during migration.
00647 | 
00648 | ## 2.13 State Files: 19 total (with enhanced coherence checking)
00649 | 
00650 | Same 13 files as v6, plus 2 state files from v8.5 (HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json) and 2 state files from v9.0 (API_VERSION.json, EXTENSION_REGISTRY.json). system_self_test.py includes state file coherence validation (Section 2.13).
00651 | 
00652 | **New state files (v8.5):**
00653 | - `C:\PRISM\state\HOOK_MANIFEST.json` — Machine-readable hook count source-of-truth. Created at P0-MS1, updated by every hook-installing MS. system_self_test.py check #3 reads expected_total from this file.
00654 | - `C:\PRISM\state\QUARANTINE_BACKLOG.json` — Deferred quarantine items for batch resolution sessions. Created at M-M2-MS6 steady-state. Read by quarantine-resolution sessions (every 5th M-M2 session).
00655 | 
00656 | **New state files (v9.0):**
00657 | - `C:\PRISM\state\API_VERSION.json` — Semantic version tracking for all 324 dispatcher action signatures. Created at P0-MS5, bumped by any MS that changes action signatures. Plugin manifests validate against this. system_self_test.py check #7 verifies version consistency.
00658 | - `C:\PRISM\state\EXTENSION_REGISTRY.json` — Tracks registered data model extension categories (composite, additive, etc.) with field definitions and consumers. Created at P0-MS5, updated when new extension categories are registered. Validated at SAU-Full for consumer coverage.
00659 | 
00660 | **New doc files (v8.5):** Stored in C:\PRISM\docs\, backed up on daily doc schedule:
00661 | - `COHERENCE_AUDIT.md` — Architectural consistency tracking, appended at every SAU-Full
00662 | - `ENTERPRISE_PACE.md` — Enterprise phase velocity tracking, updated after every enterprise chat
00663 | - `HUMAN_REVIEW_LOG.md` — Domain expert validation records (H-1 through H-4 gates)
00664 | - `COMPLIANCE_REQUIREMENTS.md` — ISO clause mapping for CNC manufacturing domain
00665 | - `ENV_CONFIG.md` — External backup destination + environment configuration
00666 | - `BREAKING_CHANGES.md` — API version breaking changes with migration paths (v9.0)
00667 | - `USER_GUIDE.md` — Operator-facing documentation auto-generated at M-FINAL-MS7 (v9.0)
00668 | 
00669 | **State file classification (NEW in v8.2):** "State files" are machine-read files used for recovery and system operation (HANDOFF.json, COMPACTION_SURVIVAL.json, CAMPAIGN_DASHBOARD.json, session_memory.json, doc_baselines.json, HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json, etc.). Audit/report documents (BENCHMARK_LOG.md, CALC_REFERENCE_LOG.md, VALIDATION_REPORT.md, PROGRESS_REPORT.md, WIRING_CERTIFICATION.md, COHERENCE_AUDIT.md, ENTERPRISE_PACE.md, HUMAN_REVIEW_LOG.md, COMPLIANCE_REQUIREMENTS.md, ENV_CONFIG.md) are classified as **doc files** stored in C:\PRISM\docs\ and backed up on the daily doc schedule. They are NOT state files and are not counted in the 19.
00670 | 
00671 | ### ROADMAP_TRACKER.md Format (NEW in v8.2)
00672 | 
00673 | *This is the PRIMARY position tracking artifact. Referenced by START HERE, Decision Protocol, every MS handoff, every SAU, and system_self_test.py. NEVER free-form prose.*
00674 | 
00675 | ```
00676 | FORMAT: [MS-ID] [STATUS] [DATE] [FLAGS?]
00677 | 
00678 | STATUSES:
00679 |   COMPLETE            — All exit conditions met
00680 |   COMPLETE [flag]     — Completed with documented exception
00681 | 
00682 | FLAGS (append after status):
00683 |   [DATA_GAP:detail]          — Missing data, documented, non-blocking
00684 |   [PARTIAL_ENTRY:detail]     — Entry conditions ≥90% but <100%
00685 |   [INCOMPLETE_BLOCKED:detail] — Code bug, budget exhausted, persisted as TODO
00686 |   [STUB:detail]              — Used mcp-server fallback for platform stub
00687 |   [SYNTHETIC_DATA:detail]    — Cross-track fallback data used
00688 |   [DEFERRED:detail]          — Deferred for re-execution at next SAU
00689 |   [RALPH_DEGRADED]           — Ralph validation skipped during batch
00690 | 
00691 | EXAMPLES:
00692 |   P-P0-MS0 COMPLETE 2026-02-15
00693 |   P-P0-MS1 COMPLETE 2026-02-20 [DATA_GAP:titanium alloys underrepresented, 2847/3518 raw available]
00694 |   P-P0-MS6 COMPLETE 2026-02-25 [PARTIAL_ENTRY:ContextManager export missing 2 utility functions]
00695 |   M-M2-MS5 COMPLETE 2026-05-10 [DATA_GAP:titanium alloy family underrepresented]
00696 |   E2-MS3 COMPLETE 2026-06-01 [SYNTHETIC_DATA:used P2-P4 agent costs, recalibrate at SU-5]
00697 | 
00698 | SAU ENTRIES:
00699 |   SU-1 SAU-FULL COMPLETE 2026-02-28
00700 |   E1-MS4 SAU-LIGHT COMPLETE 2026-04-15
00701 | 
00702 | AUTOPILOT SEQUENCE TEST (at SU-3):
00703 |   AUTOPILOT_SEQUENCE_TEST: 21/22 pass [FAIL:3.19 Knowledge Graph — graph empty pre-M-M2]
00704 | ```
00705 | 
00706 | ## 2.14 System Self-Test Enhancement
00707 | 
00708 | system_self_test.py now runs **9 checks** (updated v10.0):
00709 | 
00710 | 1. Survival file write-readback
00711 | 2. Known-material query (4140)
00712 | 3. Hook count check — **reads expected_total from HOOK_MANIFEST.json** (v8.5), compares against prism_hook→list actual count. Three-way reconciliation at SAU-Full: HOOK_MANIFEST.json == Section 8 table == live system. Discrepancy = FAIL.
00713 | 4. ROADMAP_TRACKER staleness
00714 | 5. State coherence — verify ROADMAP_TRACKER.md, HANDOFF.json, and COMPACTION_SURVIVAL.json agree on current MS position. If disagreement → WARN with specific discrepancy. **Auto-repair mode (v10.0 ER-7):** if code reality is clear (e.g., files exist that only a completed MS would produce), propose correction: "ROADMAP_TRACKER says P0-MS4, but P0-MS5 scaffold exists. Suggest updating to P0-MS5 COMPLETE." Operator confirms or rejects.
00715 | 6. **Disk space check (v8.4)** — verify C:\PRISM\archive\ < 15GB and C: drive has > 10GB free. WARN if exceeded, RED if C: < 5GB free.
00716 | 7. **API version consistency (v9.0)** — read API_VERSION.json, verify api_major.api_minor matches expected for current MS position. Check for deprecated_actions past their removal_at version. WARN if stale, FAIL if version mismatch.
00717 | 8. **Build pipeline verification (v10.0)** — verify npm run build completes successfully: tsc --noEmit passes (type check), esbuild compiles, test:critical runner exists and last run was PASS. WARN if last test:critical > 1 build old.
00718 | 9. **Safety trace proof (v10.0 SR-5)** — verify TelemetryEngine has SAFETY-level log entries for each safety-critical dispatcher action executed since last check. Any safety action WITHOUT a corresponding correlationId trace = FAIL. Proves safety engines are being called, not just registered.
00719 | 
00720 | ---
00721 | 
00722 | # SECTION 3: DECISION PROTOCOL
00723 | 
00724 | *When things are ambiguous, this is the law. No interpretation. Follow the tree.*
00725 | 
00726 | ## 3.1 Position Recovery — "Where Am I?"
00727 | 
00728 | ```
00729 | STEP 1: Read ROADMAP_TRACKER.md
00730 |   → Find most recent entry marked COMPLETE
00731 |   → Next MS = the one immediately after
00732 | 
00733 | STEP 2: If ROADMAP_TRACKER.md is missing or stale:
00734 |   → Read HANDOFF.json → last_ms_completed field
00735 |   → Read ACTION_TRACKER.md → check pending items for MS context
00736 |   → Read COMPACTION_SURVIVAL.json → check last_active_ms field
00737 |   → Use the LOWEST (most conservative) MS ID across all sources
00738 |   → Document the discrepancy before proceeding
00739 | 
00740 | STEP 3: If ALL state files are missing or corrupted:
00741 |   → Run env_smoke_test.py first — verify environment is functional
00742 |   → Run registry_health_check.py if it exists
00743 |     → If reports > 95% of available data files loaded → P0-MS1+ COMPLETE
00744 |   → Check for prism-platform/ directory
00745 |     → If exists with populated src/ → P0-MS5+ started
00746 |     → If doesn't exist → you're in P0-MS0 through P0-MS4
00747 |   → npm run build both codebases — which ones compile?
00748 |   → Fall back to the earliest MS whose exit conditions are NOT met
00749 |   → Create fresh ROADMAP_TRACKER.md documenting recovery
00750 | 
00751 | STEP 4: After position recovery, verify system artifacts:
00752 |   → Read GSD_QUICK.md — does it reflect current system capabilities?
00753 |   → Read PRISM_QUICK_REF.md — are hook counts and paths current?
00754 |   → If either is stale → run SAU protocol (Section 4.7) before proceeding
00755 | ```
00756 | 
00757 | ## 3.2 Entry Conditions
00758 | 
00759 | ```
00760 | ALL conditions met (100%):
00761 |   → Proceed normally
00762 | 
00763 | Conditions met at ≥ 90%:
00764 |   → PROCEED with [PARTIAL_ENTRY] flag in ROADMAP_TRACKER.md
00765 |   → Document which condition is short and by how much
00766 | 
00767 | Conditions met at < 90%:
00768 |   → STOP. Check if prior MS needs rework.
00769 |   → If prior MS exit conditions were met when completed → something regressed
00770 |   → If prior MS exit conditions were NOT met → prior MS incorrectly marked complete
00771 | 
00772 | Conditions CANNOT be evaluated:
00773 |   → Run the verification tools from the prior MS's exit conditions
00774 |   → If those tools don't exist yet → you're earlier than you think
00775 |   → Fall back to Position Recovery (3.1)
00776 | ```
00777 | 
00778 | ## 3.3 Exit Conditions
00779 | 
00780 | ```
00781 | ALL conditions met:
00782 |   → Mark COMPLETE in ROADMAP_TRACKER.md
00783 |   → Write HANDOFF.json
00784 |   → Write SESSION_INSIGHTS.md if non-obvious learnings (use structured format — see 3.7)
00785 |   → If this MS is an SAU boundary → execute SAU protocol (Section 4.7)
00786 |   → Proceed to next MS
00787 | 
00788 | PARTIALLY met — data limitation (e.g., raw files contain only 2,900 materials):
00789 |   → Mark COMPLETE with [DATA_GAP] flag
00790 |   → Document exact gap: what exists vs what's expected
00791 |   → Proceed
00792 | 
00793 | PARTIALLY met — code bug (system can't load data that exists):
00794 |   → DO NOT mark complete
00795 |   → Debug until fixed or tool call budget exhausted
00796 |   → If budget exhausted: [INCOMPLETE_BLOCKED] flag, [PERSISTENT] TODO, proceed with WARNING
00797 | 
00798 | IMPOSSIBLE (upstream broken):
00799 |   → Document what's broken and which upstream MS owns it
00800 |   → [PERSISTENT] [BLOCKED_EXIT] TODO
00801 |   → Proceed to next MS ONLY if it doesn't depend on this one
00802 | ```
00803 | 
00804 | ## 3.4 Multiple Valid Next Steps
00805 | 
00806 | ```
00807 | Multiple MS in same chat:
00808 |   → Execute LOWER MS number first
00809 |   → Main track before cross-cutting (P-PERF, P-UAT, P-DM)
00810 |   → If different tracks at same priority: Platform > Manufacturing > Enterprise
00811 | 
00812 | Strategic Update Point in this chat:
00813 |   → Complete ALL main-track MS for this chat FIRST
00814 |   → Then execute the Strategic Update Point (which includes SAU)
00815 |   → SU points are the LAST thing in their chat
00816 | 
00817 | P-DM triggered by hook mid-chat:
00818 |   → Complete current MS's current STEP
00819 |   → Execute P-DM microsession (schema mismatches corrupt data — urgent)
00820 |   → Resume interrupted MS from next step
00821 | ```
00822 | 
00823 | ## 3.5 State File Conflicts
00824 | 
00825 | ```
00826 | ROADMAP_TRACKER.md says X, HANDOFF.json says Y:
00827 |   → Trust ROADMAP_TRACKER.md (updates per-MS, more granular)
00828 |   → Update HANDOFF.json to match
00829 | 
00830 | HANDOFF.json says X, COMPACTION_SURVIVAL.json says Y:
00831 |   → Trust whichever has the MORE RECENT timestamp
00832 |   → If equal: trust COMPACTION_SURVIVAL.json (written under pressure = actual crisis state)
00833 | 
00834 | ACTION_TRACKER.md has pending items for a "completed" MS:
00835 |   → The MS is NOT actually complete. Reopen it.
00836 | 
00837 | system_self_test state coherence reports discrepancy:
00838 |   → Run Position Recovery (3.1) from STEP 2
00839 |   → Reconcile ALL state files before continuing
00840 | ```
00841 | 
00842 | ## 3.6 Context Budget Management
00843 | 
00844 | ```
00845 | Context budget at GREEN (< 60%):
00846 |   → Continue normally
00847 | 
00848 | Context budget at YELLOW (60-84%):
00849 |   → Complete current MS
00850 |   → Write HANDOFF.json
00851 |   → If more MS remain in this chat: evaluate whether to continue or defer
00852 |   → If next MS is context-heavy (imports, large code reads): defer to next chat
00853 | 
00854 | Context budget at RED (85-94%):
00855 |   → Complete current STEP of current MS
00856 |   → Write HANDOFF.json + COMPACTION_SURVIVAL.json immediately
00857 |   → Defer ALL remaining MS to next chat
00858 | 
00859 | Context budget at BLACK (95%+):
00860 |   → Compaction armor fires automatically
00861 |   → Trust COMPACTION_SURVIVAL.json for recovery
00862 |   → Next message: read survival files, resume from last checkpoint
00863 | ```
00864 | 
00865 | ## 3.7 SESSION_INSIGHTS.md Structured Format
00866 | 
00867 | *Every insight entry uses one of these 4 categories. One line per insight. No free-form prose.*
00868 | 
00869 | ```
00870 | Format: [CATEGORY] Brief description | detail
00871 | 
00872 | Categories:
00873 |   [PATTERN]    — Reusable approach discovered. E.g.: [PATTERN] Path resolution: data dirs use kebab-case not camelCase | affects all registries
00874 |   [GOTCHA]     — Non-obvious trap to avoid. E.g.: [GOTCHA] CompactionManager import requires ContextManager first | circular dep otherwise
00875 |   [DECISION]   — Choice made with rationale. E.g.: [DECISION] ATCS as core service not plugin | needs cross-plugin state access
00876 |   [REGRESSION] — What broke and root cause. E.g.: [REGRESSION] Hook chain broke after MS7 import | priority collision between SYS-REGISTRY-HEALTH and PLATFORM-IMPORT-VERIFY
00877 | 
00878 | Max 3KB active. Rotation: oldest non-[PERSISTENT] entries rotate first.
00879 | At phase boundaries: compile phase insights into a single summary line per category.
00880 | ```
00881 | 
00882 | ### Phase Archive Protocol (NEW in v7)
00883 | 
00884 | ```
00885 | At every phase boundary (P0→P1, P1→P2, etc.):
00886 |   1. Compile active SESSION_INSIGHTS.md into phase summary (max 500 bytes)
00887 |   2. Append phase summary to SESSION_INSIGHTS_ARCHIVE.md (persistent, never rotated)
00888 |   3. Rotate active file as normal
00889 | 
00890 | SESSION_INSIGHTS_ARCHIVE.md format:
00891 |   === P0 INSIGHTS (compiled YYYY-MM-DD) ===
00892 |   [PATTERN] Registry paths use kebab-case | all registries
00893 |   [GOTCHA] CompactionManager requires ContextManager import first
00894 |   [DECISION] ATCS as core service not plugin | cross-plugin state
00895 |   === P1 INSIGHTS (compiled YYYY-MM-DD) ===
00896 |   ...
00897 | 
00898 | Max 10KB total. If exceeds: keep only [REGRESSION] and [DECISION] entries from oldest phases.
00899 | 
00900 | Purpose: When E4 regression traces to P1 pattern, the archive has it.
00901 | ```
00902 | 
00903 | ## 3.8 Tool Not Yet Imported — Stub Handling (NEW in v7)
00904 | 
00905 | *During P0-P1, prism-platform has stubs that throw "not yet imported." This is expected, not an error.*
00906 | 
00907 | ```
00908 | A step references a tool/action that returns "not yet imported" or "stub: not implemented":
00909 | 
00910 |   IF you are in P0-MS5 through P1-MS8 (platform scaffold + import phase):
00911 |     → This is EXPECTED for prism-platform stubs
00912 |     → Use the mcp-server equivalent tool if available
00913 |     → Document: "[STUB] Used mcp-server fallback for X — platform stub awaiting import"
00914 |     → Continue normally
00915 | 
00916 |   IF you are in P2+ (platform should be functional):
00917 |     → This is NOT expected
00918 |     → Check IMPORT_LOG.md — was this action imported?
00919 |     → If not imported: wrong MS order, check dependencies
00920 |     → If imported but failing: debug as code bug (Section 3.3)
00921 | 
00922 |   IF a step requires BOTH codebases and one has stubs:
00923 |     → Use the functional codebase for the action
00924 |     → Verify the stub codebase at least compiles
00925 |     → Note in HANDOFF.json which codebase actually executed the action
00926 | ```
00927 | 
00928 | ## 3.9 Cross-Track Dependency Protocol (NEW in v7)
00929 | 
00930 | *Manufacturing and Enterprise tracks run in parallel. This table defines explicit timing dependencies and fallbacks.*
00931 | 
00932 | ```
00933 | READING THIS TABLE:
00934 |   "A REQUIRES B" means A cannot produce correct output without B's data.
00935 |   "FALLBACK" means what to do if B isn't ready when A needs it.
00936 |   All fallbacks include a [SYNTHETIC_DATA] or [DEFERRED] flag that triggers re-execution
00937 |   at the next SAU stop once the real data is available.
00938 | ```
00939 | 
00940 | | Dependent MS | Requires | What It Needs | Fallback If Unavailable |
00941 | |-------------|----------|---------------|------------------------|
00942 | | E2-MS3 (cost calibration) | M-M2 batch ≥ 10 complete | Real API costs from batch operations | Use synthetic cost data from P2-P4 agent calls. Flag [SYNTHETIC_DATA]. Recalibrate at SU-5 with real data. |
00943 | | E1-MS5+ (WAL replay testing) | M-M2 batch ≥ 5 complete | Meaningful WAL entries to replay | Use P2 demo operations as replay corpus. Flag [THIN_DATA]. Re-test at SU-5 with M-M2 data. |
00944 | | E3-MS1 (React telemetry wiring) | M-M2 batch ≥ 20 complete | Live telemetry feed with real data | Wire to telemetry with P2-P4 demo data. Flag [DEMO_DATA]. Switch to live feed when M-M2 data available. |
00945 | | P-UAT-MS1 | M-M2 batch 20 complete | ≥900 validated material entries (1,000 processed) | BLOCK. Cannot run UAT without real data. Defer UAT until batch 20 complete. |
00946 | | E2-MS7 (finance export) | M-M2 batch ≥ 15 complete | Meaningful cost history for export | Use accumulated P2-E2 costs. Flag [PARTIAL_COST]. Re-export at SU-5. |
00947 | | E4-MS1 (replication) | M-M2 substantially complete | Registry data worth replicating | Replicate current registry state. Flag [INCOMPLETE_REPLICA]. Re-sync after M-M2 completes. |
00948 | | M-M2 batch campaigns | P3-MS1 (batch resilience) | ATCS batch framework operational | BLOCK. Cannot run data campaigns without batch resilience. |
00949 | | M-M2 batch campaigns | P0-MS1 (registries) | Registries loading > 95% | BLOCK. Cannot populate registries that don't load. |
00950 | | M4-T1 (extraction) | E1 WAL operational | WAL logging for extracted functions | Extract without WAL logging. Flag [NO_WAL]. Wire WAL after E1 completes. |
00951 | | M-FINAL (migration) | E1-E4 complete | All enterprise features operational | BLOCK. Cannot retire mcp-server without enterprise features. |
00952 | 
00953 | ```
00954 | EXECUTION RULE:
00955 |   When starting any MS in this table's "Dependent MS" column:
00956 |   1. Check if the "Requires" MS is COMPLETE
00957 |   2. If YES → proceed normally
00958 |   3. If NO → check "Fallback" column
00959 |   4. If fallback says BLOCK → skip this MS, document in ROADMAP_TRACKER, proceed to next non-blocked MS
00960 |   5. If fallback has a flag → execute with fallback, apply flag to exit conditions
00961 |   6. At next SAU stop → check all flagged MS → re-execute with real data if now available
00962 | ```
00963 | 
00964 | ## 3.10 Model String Management (NEW in v7)
00965 | 
00966 | *Model strings WILL change during a ~75-week project. Never hardcode them in the roadmap.*
00967 | 
00968 | ```
00969 | Model strings are stored in exactly TWO places:
00970 |   1. C:\PRISM\mcp-server\.env (HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL)
00971 |   2. C:\PRISM\prism-platform\.env (same keys)
00972 | 
00973 | NEVER hardcode model strings in source code. Always read from config.
00974 | 
00975 | At every SAU stop (Light or Full):
00976 |   1. Read current model strings from .env
00977 |   2. Test each tier: agent_invoke with echo prompt
00978 |   3. If any tier fails → check Anthropic API for current model strings
00979 |   4. Update .env files if needed
00980 |   5. Update Claude memory with current model strings
00981 | 
00982 | If Anthropic deprecates a model string mid-project:
00983 |   → SAU will catch it at next boundary
00984 |   → Update .env, rebuild, verify
00985 |   → No source code changes needed
00986 | ```
00987 | 
00988 | ## 3.11 Emergency Off-Ramp Protocol (NEW in v8.5)
00989 | 
00990 | *Every complex project needs exit criteria, not just completion criteria. This protocol defines when to STOP and restructure rather than accumulating technical debt.*
00991 | 
00992 | ```
00993 | OFF-RAMP TRIGGERS (any ONE triggers reassessment):
00994 | 
00995 |   1. SCHEDULE BREACH > 25%:
00996 |      If actual elapsed time exceeds planned elapsed time by > 25% at any
00997 |      SAU-Full boundary (e.g., SU-3 should be ~week 18; if it's week 23+,
00998 |      trigger).
00999 |      → Action: Full schedule reassessment. Options: scope reduction,
01000 |        team augmentation (human developers for E3/E4), architecture simplification.
01001 | 
01002 |   2. SAFETY VALIDATION FAILURE AT SCALE:
01003 |      If H-1 or H-2 human review produces 3+ [REJECTED] entries in the same
01004 |      alloy family, indicating systematic source data problems.
01005 |      → Action: Pause all data campaigns. Audit source data methodology.
01006 |        Consider switching primary data sources. Do NOT continue ingesting
01007 |        from a compromised source.
01008 | 
01009 |   3. ARCHITECTURAL COHERENCE COLLAPSE:
01010 |      If 2 consecutive SAU-Full coherence audits show MAJOR style drift AND
01011 |      architectural violations, indicating the codebase is diverging from
01012 |      its own design.
01013 |      → Action: Dedicate 2-3 full sessions to architectural cleanup before
01014 |        ANY new feature work. If cleanup reveals fundamental design problems,
01015 |        reassess E3/E4 approach.
01016 | 
01017 |   4. ENTERPRISE PHASE RED FOR 5+ CONSECUTIVE CHATS:
01018 |      If ENTERPRISE_PACE.md shows RED for 5+ chats with no improvement despite
01019 |      mitigation attempts (see Section 5 Enterprise Margin Protocol).
01020 |      → Action: Enterprise scope is too large for Claude-only execution.
01021 |        Options: simplify E3 to dashboard-only (drop FlowCanvas, HookDesigner,
01022 |        Marketplace), defer E4 to post-MVP, or bring in human frontend developer
01023 |        for E3 React work.
01024 | 
01025 |   5. CAMPAIGN THROUGHPUT DEGRADED FOR 10+ SESSIONS:
01026 |      If M-M2 average throughput stays below 2 batches/session for 10+
01027 |      consecutive sessions.
01028 |      → Action: Data campaign approach is not working at scale. Options:
01029 |        reduce target material count, simplify validation pipeline,
01030 |        accept lower coverage with higher confidence per entry.
01031 | 
01032 |   6. COMPACTION FREQUENCY > 3 PER CHAT SUSTAINED:
01033 |      If context compaction fires > 3 times per chat for 5+ consecutive chats,
01034 |      indicating the system has outgrown the context window for its operational
01035 |      requirements.
01036 |      → Action: Architecture cannot fit in context. Options: split into
01037 |        smaller sub-projects with independent context, reduce boot payload,
01038 |        aggressive microsession scoping.
01039 | 
01040 | REASSESSMENT PROCEDURE (when any trigger fires):
01041 |   1. Document trigger in SESSION_INSIGHTS: [DECISION] Off-ramp trigger N fired
01042 |   2. Complete current MS (don't abandon mid-MS)
01043 |   3. Write comprehensive HANDOFF.json + ROADMAP_TRACKER
01044 |   4. Create REASSESSMENT.md:
01045 |      → What triggered the off-ramp
01046 |      → Current system state (what works, what doesn't)
01047 |      → Options with tradeoffs
01048 |      → Recommended path forward
01049 |   5. Present to project stakeholders for decision
01050 |   6. Do NOT continue building until reassessment is resolved
01051 | 
01052 | KEY PRINCIPLE:
01053 |   Stopping early with a working partial system is ALWAYS better than
01054 |   completing a broken full system. A PRISM that correctly handles materials,
01055 |   calculations, and alarms — without the visual dashboard or marketplace —
01056 |   is infinitely more valuable than a PRISM with everything but incorrect
01057 |   cutting parameters.
01058 | ```
01059 | 
01060 | 
01061 | ## 3.12 API Version Management Protocol (NEW in v9.0)
01062 | 
01063 | *Over 75+ weeks and beyond, dispatcher action signatures WILL evolve. Plugins, skills, and sequencing guides that depend on specific parameter shapes break silently when signatures change without versioning.*
01064 | 
01065 | ```
01066 | API VERSION FILE:
01067 |   C:\PRISM\state\API_VERSION.json
01068 |   {
01069 |     "schema_version": 1,
01070 |     "api_major": 1,
01071 |     "api_minor": 0,
01072 |     "api_patch": 0,
01073 |     "breaking_changes": [],
01074 |     "deprecated_actions": [],
01075 |     "last_updated": "YYYY-MM-DDTHH:MM:SSZ"
01076 |   }
01077 | 
01078 | VERSIONING RULES:
01079 |   PATCH (1.0.X): Bug fixes to action behavior, no signature change
01080 |   MINOR (1.X.0): New optional parameters added, new actions added
01081 |   MAJOR (X.0.0): Parameter removed, parameter type changed, action removed
01082 | 
01083 |   On MINOR bump: all existing callers continue working (new params have defaults)
01084 |   On MAJOR bump: deprecated callers get warning for N+2 minor versions before removal
01085 | 
01086 | DEPRECATION PROTOCOL:
01087 |   1. Add action to deprecated_actions[] with: action_name, deprecated_at (version),
01088 |      removal_at (version), replacement (new action signature), reason
01089 |   2. Deprecated actions log WARNING to TelemetryEngine on every call
01090 |   3. KNOWN_RENAMES updated if action name changes
01091 |   4. Skills and sequencing guides updated at next SAU stop
01092 |   5. After removal_at version: action returns error with migration instructions
01093 | 
01094 | BREAKING_CHANGES.md:
01095 |   Location: C:\PRISM\docs\BREAKING_CHANGES.md
01096 |   Format: "## v[MAJOR].[MINOR].[PATCH] — [DATE]\n- [action]: [what changed] → [migration path]"
01097 |   Checked at: Every SAU-Full (verify all breaking changes have migration paths)
01098 | 
01099 | PLUGIN MANIFEST INTEGRATION:
01100 |   Every plugin manifest.json includes:
01101 |     "min_api_version": "1.0.0"
01102 |   At plugin load: compare min_api_version against current api_major.api_minor
01103 |   If current < required: BLOCK plugin load, log "Plugin X requires API v1.2+, current is v1.1"
01104 | 
01105 | WHEN TO BUMP:
01106 |   - Any MS that changes a dispatcher's parameter types → MAJOR
01107 |   - Any MS that adds new actions or optional params → MINOR
01108 |   - Bug fixes → PATCH
01109 |   - Document in ROADMAP_TRACKER: "API_VERSION: X.Y.Z → X.Y.Z+1 at [MS-ID]"
01110 |   - Update API_VERSION.json immediately (not deferred to SAU)
01111 | 
01112 | CREATED AT: P0-MS5 (scaffold — initial v1.0.0)
01113 | FIRST CONSUMERS: E3-MS21 (Plugin SDK), all skills, all sequencing guides
01114 | ```
01115 | 
01116 | ## 3.13 Data Access Abstraction Protocol (NEW in v9.0)
01117 | 
01118 | *Registries currently read JSON files via direct fs.readFileSync. This couples every engine and registry to the file system. A DataProvider interface abstracts storage, enabling future backend swaps (JSON→SQLite→PostgreSQL→API) without touching engine code.*
01119 | 
01120 | ```
01121 | DATAPROVIDER INTERFACE:
01122 |   Created at P0-MS5 (scaffold) as src/core/DataProvider.ts (~80 lines):
01123 | 
01124 |   interface DataProvider<T> {
01125 |     get(id: string): Promise<T | null>;
01126 |     query(filter: QueryFilter): Promise<T[]>;
01127 |     put(id: string, data: T): Promise<void>;
01128 |     delete(id: string): Promise<void>;
01129 |     count(filter?: QueryFilter): Promise<number>;
01130 |     subscribe(event: DataEvent, callback: (data: T) => void): Unsubscribe;
01131 |   }
01132 | 
01133 |   interface QueryFilter {
01134 |     category?: string;
01135 |     conditions?: Record<string, any>;
01136 |     limit?: number;
01137 |     offset?: number;
01138 |   }
01139 | 
01140 |   type DataEvent = 'created' | 'updated' | 'deleted' | 'bulk_import';
01141 | 
01142 | INITIAL IMPLEMENTATION:
01143 |   JsonFileProvider<T> implements DataProvider<T> — wraps current fs.readFileSync
01144 |   behavior. Zero behavior change from current system. Pure structural refactor.
01145 | 
01146 |   Created at P0-MS5 as src/providers/JsonFileProvider.ts (~150 lines):
01147 |   - Reads from data/ directories exactly as current registries do
01148 |   - Caches in memory after first read (matching current behavior)
01149 |   - subscribe() emits events for hook integration (knowledge graph, formula tracker)
01150 | 
01151 | MIGRATION PATH:
01152 |   All registry classes (MaterialRegistry, MachineRegistry, AlarmRegistry, etc.)
01153 |   refactored to accept DataProvider<T> in constructor instead of hardcoded paths.
01154 |   
01155 |   P0-MS1: Registry fix uses current direct paths (no change)
01156 |   P0-MS5: DataProvider interface created, JsonFileProvider wraps existing behavior
01157 |   P0-MS6: Registries refactored to use DataProvider (behavior identical, coupling broken)
01158 |   Post-deployment: swap JsonFileProvider for SqliteProvider or PostgresProvider
01159 |     → zero engine changes required
01160 | 
01161 | EXTENSION FIELDS:
01162 |   Material schema supports extension fields for new material categories:
01163 |   
01164 |   interface MaterialEntry {
01165 |     // ... existing 127 parameters ...
01166 |     extensions: Record<string, ExtensionField>;
01167 |     schema_version: number;
01168 |   }
01169 |   
01170 |   interface ExtensionField {
01171 |     category: string;       // e.g., "composite", "additive", "edm"
01172 |     field_name: string;
01173 |     field_type: "number" | "string" | "boolean" | "range";
01174 |     value: any;
01175 |     unit?: string;
01176 |     uncertainty?: number;
01177 |     source?: string;
01178 |   }
01179 | 
01180 |   New material categories (composites, plastics, additive powders) add fields
01181 |   to extensions{} without modifying the core 127-parameter schema.
01182 |   Engines that don't understand an extension category ignore it.
01183 |   Engines that DO understand it (e.g., a future AdditiveCalcEngine plugin)
01184 |   read from extensions where category === "additive".
01185 | 
01186 | EXTENSION REGISTRY:
01187 |   C:\PRISM\state\EXTENSION_REGISTRY.json tracks all registered extension categories:
01188 |   {
01189 |     "schema_version": 1,
01190 |     "categories": [
01191 |       { "name": "composite", "fields": [...], "registered_at": "...", "registered_by": "..." }
01192 |     ]
01193 |   }
01194 |   Created at P0-MS5. Updated when new extension categories are registered.
01195 |   Validated at SAU-Full: all extension categories have at least one consumer.
01196 | 
01197 | ANTI-REGRESSION:
01198 |   DataProvider refactor at P0-MS6 MUST pass validate_anti_regression:
01199 |   - All existing registry lookups return identical results before/after
01200 |   - Performance benchmark: lookup latency within ±10% of direct-read baseline
01201 |   - Zero new dependencies introduced (DataProvider is a local interface)
01202 | 
01203 | KEY PRINCIPLE:
01204 |   The DataProvider is an INTERNAL abstraction — it does NOT change the MCP
01205 |   tool interface. prism_data→material_lookup still works exactly the same.
01206 |   The change is HOW the registry satisfies the lookup internally.
01207 | 
01208 | **PROVISIONAL STATUS (v10.0 ER-5):**
01209 |   DataProvider interface is explicitly marked PROVISIONAL until post-M-M2 completion.
01210 |   Real query patterns from data campaigns may reveal interface gaps (e.g., bulk operations,
01211 |   cursor-based pagination for large result sets, transactional writes for atomic batch updates).
01212 |   Interface revision allowed through SU-5, then FROZEN to v1.0. After freeze, changes require
01213 |   MAJOR API version bump and full consumer audit.
01214 | ```
01215 | 
01216 | ## 3.14 Calculation Engine Extension Protocol (NEW in v9.0)
01217 | 
01218 | *The Kienzle cutting force model and Taylor tool life equation cover conventional CNC machining. Future domains (EDM, additive, laser cutting, waterjet) require different physics models. This protocol defines how new calculation models register without modifying ManufacturingCalcEngine.ts.*
01219 | 
01220 | ```
01221 | CALC MODEL REGISTRY:
01222 |   CalcModelRegistry is a typed registry (similar to DataProvider pattern) that maps:
01223 |     domain → calculation model → input contract → output contract → safety thresholds
01224 | 
01225 |   Built at P0-MS5 (scaffold) as src/core/CalcModelRegistry.ts (~100 lines):
01226 |   
01227 |   interface CalcModel {
01228 |     domain: string;                    // "cnc_milling", "cnc_turning", "edm", "additive"
01229 |     name: string;                      // "kienzle_cutting_force", "taylor_tool_life"
01230 |     version: string;                   // semantic version
01231 |     inputSchema: JSONSchema;           // typed input contract
01232 |     outputSchema: JSONSchema;          // typed output contract
01233 |     safetyThresholds: SafetyConfig;    // S(x) thresholds per output field
01234 |     calculate(input: any): Promise<CalcResult>;
01235 |     validate(input: any): ValidationResult;
01236 |   }
01237 | 
01238 |   ManufacturingCalcEngine.ts becomes a ROUTER:
01239 |     1. Receive calculation request with domain + model hint
01240 |     2. Look up model in CalcModelRegistry
01241 |     3. Validate input against model's inputSchema
01242 |     4. Execute model.calculate()
01243 |     5. Validate output against model's safetyThresholds
01244 |     6. Return result through normal hook chain (CalcHookMiddleware still applies)
01245 | 
01246 | REGISTERING A NEW MODEL:
01247 |   1. Implement CalcModel interface
01248 |   2. Register via CalcModelRegistry.register(model)
01249 |   3. Add test calculations to safety matrix (Section 15) — new category
01250 |   4. Run safety matrix — all new calculations must achieve S(x) ≥ 0.70
01251 |   5. API version: MINOR bump (new capability, no breaking change)
01252 |   6. Document in EXTENSION_REGISTRY.json: calculation model entry
01253 | 
01254 | BUILT-IN MODELS (registered at P0-MS5):
01255 |   - kienzle_cutting_force (domain: cnc_milling, cnc_turning)
01256 |   - taylor_tool_life (domain: cnc_milling, cnc_turning)
01257 |   - johnson_cook_thermal (domain: cnc_milling, cnc_turning)
01258 |   - thread_calculation (domain: cnc_turning, cnc_milling)
01259 | 
01260 | FUTURE MODELS (registered post-deployment via plugin or data maintenance):
01261 |   - edm_material_removal (domain: edm)
01262 |   - additive_melt_pool (domain: additive)
01263 |   - laser_kerf_prediction (domain: laser_cutting)
01264 |   Each follows the same register → test → validate → deploy cycle.
01265 | ```
01266 | 
01267 | ## 3.15 Controller Extension Protocol (NEW in v9.0)
01268 | 
01269 | *The system currently supports 12 controller families. New controllers (Mitsubishi, Brother, Doosan, etc.) should be addable without modifying AlarmRegistry core code.*
01270 | 
01271 | ```
01272 | CONTROLLER REGISTRY:
01273 |   ControllerRegistry maps:
01274 |     controller_family → alarm_schema → decode_logic → fix_templates
01275 | 
01276 |   Pattern established by existing 12 families, now formalized:
01277 | 
01278 |   interface ControllerDefinition {
01279 |     family: string;                    // "FANUC", "HAAS", "SIEMENS", etc.
01280 |     version: string;                   // firmware version range
01281 |     alarmSchema: {
01282 |       code_format: string;             // regex for valid alarm codes
01283 |       severity_levels: string[];       // e.g., ["warning", "fault", "emergency"]
01284 |       category_prefix?: Record<string, string>;  // e.g., {"4xx": "servo", "9xx": "system"}
01285 |     };
01286 |     decodeLogic: (code: string) => AlarmDecode;
01287 |     fixTemplates: Record<string, FixProcedure>;
01288 |   }
01289 | 
01290 | ADDING A NEW CONTROLLER FAMILY:
01291 |   1. Create controller definition JSON in C:\PRISM\data\controllers\[family].json
01292 |   2. Register in ControllerRegistry via DataProvider
01293 |   3. Ingest alarm codes using campaign batch format
01294 |   4. Validate: prism_data→alarm_lookup returns correct decode for 10 sample alarms
01295 |   5. Add 1 test alarm to safety matrix Category 8 (alarm #51+)
01296 |   6. API version: MINOR bump
01297 |   7. Document in EXTENSION_REGISTRY.json: controller entry
01298 |   
01299 |   No code changes to AlarmRegistry.ts — it reads from ControllerRegistry.
01300 | ```
01301 | 
01302 | 
01303 | ## 3.16 Schema Migration Framework (NEW in v9.0)
01304 | 
01305 | *Data files (materials, machines, alarms, tools) will evolve their schemas over 75+ weeks and beyond. Without versioned schemas and migration scripts, old data becomes unreadable after schema changes.*
01306 | 
01307 | ```
01308 | SCHEMA VERSION TAGGING:
01309 |   Every JSON data file includes a schema_version field:
01310 |     { "schema_version": 1, "data": { ... } }
01311 |   
01312 |   DataProvider reads schema_version BEFORE parsing data.
01313 |   If schema_version < current_expected: run migration.
01314 |   If schema_version > current_expected: ERROR (data from future version).
01315 | 
01316 | MIGRATION SCRIPTS:
01317 |   Location: C:\PRISM\scripts\migrations\
01318 |   Naming: migrate_{category}_{from_version}_to_{to_version}.py
01319 |   Example: migrate_materials_1_to_2.py
01320 | 
01321 |   Script contract:
01322 |     - Input: JSON data at version N
01323 |     - Output: JSON data at version N+1
01324 |     - MUST be idempotent (running twice produces same result)
01325 |     - MUST preserve all existing fields (additive changes only for MINOR)
01326 |     - MUST NOT change safety-critical parameter values
01327 |     - For MAJOR changes (field removal/rename): map old→new explicitly
01328 | 
01329 | MIGRATION EXECUTION:
01330 |   At SAU-Full stops (SU-1 through SU-6):
01331 |     1. Scan all data files for schema_version
01332 |     2. If any file < current_expected: run migration chain
01333 |        (e.g., v1→v2 then v2→v3 if current is v3)
01334 |     3. Verify: migrated file loads correctly via DataProvider
01335 |     4. Verify: migrated data passes existing validation (Ω checks)
01336 |     5. Backup original before migration (registry snapshot protocol)
01337 | 
01338 | BACKWARD-COMPATIBLE READS:
01339 |   DataProvider implementations MUST handle reading data at version N-1:
01340 |     - Missing fields: use default values (specified per field in schema)
01341 |     - Extra fields: ignore (forward-compatible)
01342 |     - Changed types: cast if safe, error if not
01343 | 
01344 |   This allows gradual rollout: new code can read old data, old data
01345 |   migrates in background, no big-bang conversion needed.
01346 | 
01347 | CREATED AT: P0-MS5 (scaffold — schema_version field added to all data files)
01348 | FIRST MIGRATION: Whenever first schema change occurs (likely M-M2 campaign evolution)
01349 | 
01350 | **MIGRATION V1 LIMITS (v10.0 ER-6):**
01351 |   v1 schema migrations are restricted to TWO operation types only:
01352 |     - ADDITIVE: New fields added with default values (existing data unchanged)
01353 |     - RENAME: Field renamed with explicit old→new mapping (data value unchanged)
01354 |   
01355 |   Operations NOT allowed in v1 migrations:
01356 |     - Field removal (breaks backward compatibility)
01357 |     - Type changes (requires data transformation)
01358 |     - Structural changes (nested object flattening, array restructuring)
01359 |   
01360 |   These restrictions prevent migration framework scope creep. Structural transforms
01361 |   are deferred to v2 migration framework (post-deployment enhancement).
01362 |   If a structural change is truly needed pre-deployment: manual migration with
01363 |   full rollback manifest and domain expert review (H-gate level scrutiny).
01364 | ```
01365 | 
01366 | 
01367 | ---
01368 | 
01369 | ## 3.17 Zero-Touch Extensibility Protocol (NEW in v10.0)
01370 | 
01371 | *The system previously required 4-5 manual updates to add a single skill, script, or hook. Over a 75-week project with 190+ microsessions, this coordination overhead accumulates into a major friction source. Post-deployment, it becomes a barrier to system maintenance. This protocol defines the "drop-in" contract: every extensible component type has a single-action path to registration.*
01372 | 
01373 | ```
01374 | PRINCIPLE: AUTO-DISCOVER > MANUAL REGISTER > HARDCODE
01375 | 
01376 | The extensibility hierarchy for every component type:
01377 |   1. AUTO-DISCOVER: Component self-describes, system finds and registers it on boot
01378 |   2. MANUAL REGISTER: Single atomic action registers component + updates all tracking
01379 |   3. HARDCODE: Never. No component should require editing source code to add.
01380 | 
01381 | ZERO-TOUCH CONTRACTS BY COMPONENT TYPE:
01382 | 
01383 | ═══════════════════════════════════════════════════════════════
01384 | SKILLS — Auto-Discovery (Level 1)
01385 | ═══════════════════════════════════════════════════════════════
01386 | 
01387 |   TO ADD A NEW SKILL:
01388 |     1. Create skill file in C:\PRISM\skills-consolidated\ with valid manifest header
01389 |     2. Done.
01390 | 
01391 |   HOW IT WORKS:
01392 |     SkillRegistry.scanDirectory() runs at boot and on PLATFORM-SKILL-AUTO-LOAD trigger.
01393 |     Scans C:\PRISM\skills-consolidated\ for files matching skill manifest format.
01394 |     Any file with valid header is registered automatically.
01395 | 
01396 |     Skill manifest header format (YAML front matter):
01397 |       ---
01398 |       name: prism-my-new-skill
01399 |       version: 1.0.0
01400 |       domain: manufacturing|system|enterprise
01401 |       description: One-line purpose
01402 |       triggers: [material_query, alarm_decode]  # optional: auto-wire to dispatcher routes
01403 |       ---
01404 | 
01405 |     VALIDATION (on auto-discover):
01406 |       - Has valid YAML front matter → register
01407 |       - Missing front matter → SKIP with WARN in TelemetryEngine
01408 |       - Duplicate name → SKIP with ERROR (keep existing, reject new)
01409 |       - Has ## Changelog section → register (per W1.4 protocol)
01410 |       - Missing ## Changelog → register with WARN flag [NEEDS_CHANGELOG]
01411 | 
01412 |     MASTER_INDEX IMPACT:
01413 |       Section 11 skill count becomes "≥ 137" (floor, not exact).
01414 |       Exact count queried live: prism_skill→list | wc -l
01415 |       SAU-Full verifies: live count ≥ MASTER_INDEX floor.
01416 | 
01417 | ═══════════════════════════════════════════════════════════════
01418 | SCRIPTS — Self-Description (Level 1.5)
01419 | ═══════════════════════════════════════════════════════════════
01420 | 
01421 |   TO ADD A NEW SCRIPT:
01422 |     1. Create Python script in C:\PRISM\scripts\core\ with PRISM_MANIFEST header
01423 |     2. Done.
01424 | 
01425 |   HOW IT WORKS:
01426 |     ScriptRegistry.scanManifests() runs at boot.
01427 |     Scans C:\PRISM\scripts\core\ for files with PRISM_MANIFEST comment block.
01428 |     Scripts with valid manifests are registered and wired to their declared triggers.
01429 | 
01430 |     Script manifest format (Python comment block in first 20 lines):
01431 |       # PRISM_MANIFEST
01432 |       # name: my_new_validator
01433 |       # version: 1.0.0
01434 |       # trigger: hook:MFG-CUSTOM-VALIDATE    # or: cadence:every_10_calls, manual, boot
01435 |       # priority: 50
01436 |       # dependencies: [mfg_batch_validator.py, safety_calc_test_matrix.py]
01437 |       # domain: manufacturing|system|enterprise
01438 |       # sandbox: true                          # execute through safe_script_runner.py
01439 |       # description: Validates custom manufacturing constraints
01440 | 
01441 |     TRIGGER TYPES:
01442 |       hook:<HOOK_NAME>     — Script executes when named hook fires
01443 |       cadence:<FUNCTION>   — Script added to cadence executor with named function
01444 |       manual               — Script available for manual invocation only
01445 |       boot                 — Script executes during session boot sequence
01446 |       build                — Script executes after npm run build (part of test:critical)
01447 | 
01448 | ═══════════════════════════════════════════════════════════════
01449 | HOOKS — Atomic Registration (Level 2)
01450 | ═══════════════════════════════════════════════════════════════
01451 | 
01452 |   TO ADD A NEW HOOK:
01453 |     1. prism_hook→register_with_manifest (one action)
01454 |     2. Done.
01455 | 
01456 |   HOW IT WORKS:
01457 |     register_with_manifest is an enhanced register action that atomically:
01458 |       a. Validates hook name follows priority band convention
01459 |       b. Checks for priority collisions within same trigger
01460 |       c. Registers hook in live hook engine
01461 |       d. Updates HOOK_MANIFEST.json
01462 |       e. Logs to TelemetryEngine
01463 |       f. Fires quick_ref_generator.py if count changed
01464 | 
01465 |     PRIORITY BANDS (enforced at registration):
01466 |       0-9:   CRITICAL  — Blocking safety gates (COMPACTION-ARMOR, S(x) blocks)
01467 |       10-19: SYSTEM    — Core infrastructure (API-KEY-VERIFY, REGISTRY-HEALTH)
01468 |       20-29: SYSTEM    — System monitoring (PHASE-TODO-RESET, DRIFT-CHECK)
01469 |       30-49: PLATFORM  — Platform features (CONTEXT-BUDGET, FORMULA-RECOMMEND, etc.)
01470 |       50-69: MFG       — Manufacturing domain (INGESTION-VALIDATE, CAMPAIGN-PROGRESS)
01471 |       70-89: ENTERPRISE — Enterprise features (WAL-WRITE, COST-ESTIMATE)
01472 |       90-99: TELEMETRY — Logging and telemetry (non-blocking observation hooks)
01473 | 
01474 |     COLLISION DETECTION:
01475 |       Two hooks with same trigger AND same priority → WARN at registration.
01476 |       Resolution: later hook gets priority + 1 (auto-bump within band).
01477 |       If auto-bump would cross band boundary → ERROR: manual priority assignment required.
01478 | 
01479 |     POST-M-FINAL TRANSITION:
01480 |       After migration: HOOK_MANIFEST.json is the SOLE source of truth.
01481 |       Section 8 table (in roadmap document) becomes historical documentation.
01482 |       Three-way reconciliation (manifest + section 8 + live) →
01483 |         two-way reconciliation (manifest + live).
01484 | 
01485 | ═══════════════════════════════════════════════════════════════
01486 | PLUGINS — Dependency-Resolved Loading (Level 2)
01487 | ═══════════════════════════════════════════════════════════════
01488 | 
01489 |   TO ADD A NEW PLUGIN:
01490 |     1. Create plugin directory with manifest.json
01491 |     2. prism_plugin→install (one action)
01492 |     3. Done.
01493 | 
01494 |   Plugin manifest.json now includes dependency and provision declarations:
01495 |     {
01496 |       "name": "advanced-thermal",
01497 |       "version": "1.0.0",
01498 |       "min_api_version": "1.2.0",
01499 |       "dependencies": ["manufacturing-core"],
01500 |       "provides": ["thermal_analysis"],
01501 |       "permission_tier": "CALC_MODIFY",
01502 |       "resource_limits": {                          // v10.0 ER-12
01503 |         "max_cpu_ms_per_calc": 5000,
01504 |         "max_memory_mb": 256,
01505 |         "timeout_ms": 10000
01506 |       },
01507 |       "dispatchers": { ... },
01508 |       "hooks": [ ... ]
01509 |     }
01510 | 
01511 |   DEPENDENCY RESOLUTION:
01512 |     On install: PluginRegistry checks dependencies[] against installed plugins.
01513 |     If missing → ERROR: "Plugin X requires Y. Install Y first."
01514 |     On uninstall: PluginRegistry checks if any other plugin depends on this one.
01515 |     If dependent exists → ERROR: "Cannot uninstall X: plugin Z depends on it."
01516 | 
01517 |   LOAD ORDER:
01518 |     PluginRegistry sorts plugins by dependency graph (topological sort).
01519 |     No circular dependencies allowed (detected at install time).
01520 | 
01521 |   RUNTIME RESOURCE LIMITS (v10.0 ER-12):
01522 |     CALC_MODIFY plugins execute within configured resource limits.
01523 |     If a plugin calculation exceeds timeout_ms: KILL and return SafetyError.
01524 |     If a plugin exceeds max_memory_mb: KILL and return RegistryError.
01525 |     This prevents a faulty calculation extension from crashing the primary
01526 |     manufacturing safety engine or blocking other operations.
01527 | 
01528 | ═══════════════════════════════════════════════════════════════
01529 | CALCULATION MODELS — Registry + Test Matrix Auto-Extend
01530 | ═══════════════════════════════════════════════════════════════
01531 | 
01532 |   TO ADD A NEW CALCULATION MODEL:
01533 |     1. Implement CalcModel interface
01534 |     2. CalcModelRegistry.register(model)
01535 |     3. Add test calculations to safety_calc_test_matrix_extensions.json
01536 |     4. Done.
01537 | 
01538 |   ENHANCEMENT FROM v9.0:
01539 |     v9.0 required adding test calculations to safety_calc_test_matrix.py source code.
01540 |     v10.0 adds safety_calc_test_matrix_extensions.json — a JSON file that the test
01541 |     matrix script reads on startup. New calculation models add test entries to this
01542 |     JSON file instead of modifying the Python script.
01543 | 
01544 | ═══════════════════════════════════════════════════════════════
01545 | MULTI-AXIS EXTENSION CONFLICT TESTING (v10.0 ER-4)
01546 | ═══════════════════════════════════════════════════════════════
01547 | 
01548 |   When multiple extension axes are active simultaneously, combined effects
01549 |   may bypass safety assumptions that hold when tested individually:
01550 |     - Plugin A modifies hook chain priorities
01551 |     - Calc model B changes safety thresholds for a new domain
01552 |     - Schema extension C adds fields that plugin A reads
01553 |     - Controller extension D uses calc model B for alarm severity
01554 | 
01555 |   COMPOSITE SAFETY TEST (required when ≥2 extension axes are active):
01556 |     1. Identify all active extension points (plugins, calc models, hooks, schemas)
01557 |     2. For each pair of extensions: verify no priority/data/safety conflicts
01558 |     3. Run safety_calc_test_matrix.py with ALL extensions loaded
01559 |     4. Run safety fuzz test (SR-4) with ALL extensions loaded
01560 |     5. If ANY safety calculation result differs from single-extension result:
01561 |        INVESTIGATE — the interaction may be valid or may indicate bypass
01562 |     6. Document in EXTENSION_REGISTRY.json: interaction_tests[] field
01563 | 
01564 |   WHEN: At SU-5 (enterprise midpoint) and SU-6 (pre-migration) when
01565 |   extensions are most likely to have accumulated.
01566 | 
01567 | ═══════════════════════════════════════════════════════════════
01568 | 
01569 | SUMMARY — ACTIONS REQUIRED TO EXTEND EACH COMPONENT TYPE:
01570 | 
01571 |   | Component      | v9.0 Actions Required | v10.0 Actions Required |
01572 |   |----------------|----------------------|------------------------|
01573 |   | Skill          | 5 (create + SkillReg + MASTER_INDEX + quick_ref + memory) | 1 (create file) |
01574 |   | Script         | 5 (create + ScriptReg + hook wire + MASTER_INDEX + test) | 1 (create file with manifest) |
01575 |   | Hook           | 5 (register + HOOK_MANIFEST + Section 8 + Section 14 + quick_ref) | 1 (register_with_manifest) |
01576 |   | Plugin         | 3 (create + install + verify deps manually) | 2 (create + install) |
01577 |   | Calc Model     | 4 (implement + register + edit test .py + API bump) | 3 (implement + register + add JSON test entry) |
01578 |   | Controller     | 4 (create JSON + ingest + edit test .py + API bump) | 3 (create JSON + ingest + add JSON test entry) |
01579 | ```
01580 | 
01581 | ## 3.18 Build Pipeline Protocol (NEW in v10.0)
01582 | 
01583 | *The existing build approach (esbuild only, no type checking, no automated tests on build) leaves windows where safety-critical regressions go undetected. This protocol defines the hardened build pipeline that runs on EVERY build.*
01584 | 
01585 | ```
01586 | BUILD PIPELINE (replaces bare "npm run build with esbuild"):
01587 | 
01588 |   Step 1: TYPE CHECK
01589 |     tsc --noEmit --incremental
01590 | 
01591 |     PURPOSE: Catch type mismatches at build time, not runtime. A type error in
01592 |     a calculation parameter (number vs string) can produce wrong cutting params.
01593 | 
01594 |     --noEmit: Does not generate output files (avoids OOM that full tsc causes)
01595 |     --incremental: Caches type check results, subsequent runs ~3x faster
01596 | 
01597 |     IF tsc --noEmit STILL OOMs:
01598 |       Fallback 1: TypeScript project references to split checking
01599 |       Fallback 2: tsc on changed files only
01600 |       Fallback 3 (last resort): Skip tsc, add runtime type assertions on ALL
01601 |         safety-critical calculation inputs. Document as [TYPE_CHECK_DISABLED].
01602 | 
01603 |   Step 2: ESBUILD COMPILE
01604 |     esbuild (using esbuild.context() with incremental rebuild)
01605 |     ~200ms subsequent builds (vs ~2s full builds)
01606 | 
01607 |   Step 3: TEST:CRITICAL
01608 |     npm run test:critical — 4 fast verification checks (~30-60s total):
01609 | 
01610 |     a. SAFETY CALCULATIONS (safety_calc_test_matrix.py + extensions JSON + fuzz tests)
01611 |        → Runs all 50+ calculations (pure math, zero API calls)
01612 |        → PLUS: randomized boundary fuzz tests (v10.0 SR-4):
01613 |          - For each calculation: perturb inputs by ±5% near S(x)=0.70 boundary
01614 |          - Verify: safety gate activates when S(x) < 0.70, allows when S(x) ≥ 0.70
01615 |          - Generates 10 random perturbations per calculation per run
01616 |        → ANY failure = BUILD FAIL (do not proceed)
01617 |        → ~20s runtime for 50 calculations + fuzz
01618 | 
01619 |     b. HOOK CHAIN SMOKE TEST (hook_smoke_test.py)
01620 |        → For each registered hook: verify callable (not just registered)
01621 |        → Any uncallable hook = WARN (not BLOCK — hook may be PENDING)
01622 |        → ~5s runtime
01623 | 
01624 |     c. REGISTRY LOADING CHECK
01625 |        → registry_health_check.py --quick
01626 |        → Verify > 95% loading for each registry category
01627 |        → ANY category < 90% = BUILD FAIL
01628 | 
01629 |     d. COUNT FLOOR VALIDATION
01630 |        → Read MASTER_INDEX.md floor counts
01631 |        → Query live system: dispatcher count, engine count, hook count
01632 |        → Verify: live count ≥ MASTER_INDEX floor
01633 |        → If live < floor: anti-regression FAIL
01634 | 
01635 |   Step 4: ESBUILD OUTPUT
01636 |     Standard output to dist/. Source maps enabled.
01637 | 
01638 | PIPELINE SUMMARY:
01639 |   npm run build =
01640 |     tsc --noEmit --incremental     (~5s first, ~2s subsequent)
01641 |     esbuild rebuild                 (~200ms with incremental)
01642 |     npm run test:critical           (~30s)
01643 |     Total: ~35s first build, ~32s subsequent
01644 | 
01645 | npm SCRIPTS (add to package.json at P0-MS5):
01646 |   "scripts": {
01647 |     "typecheck": "tsc --noEmit --incremental",
01648 |     "compile": "node esbuild.config.js",
01649 |     "test:critical": "python ../scripts/core/test_critical_runner.py",
01650 |     "build": "npm run typecheck && npm run compile && npm run test:critical",
01651 |     "build:fast": "npm run compile"  // escape hatch for non-safety work only
01652 |   }
01653 | 
01654 | DEPENDENCY MANAGEMENT:
01655 |   - Commit package-lock.json to archive at every SAU-Full
01656 |   - Use npm ci (not npm install) for reproducible installs
01657 |   - Pin @anthropic-ai/sdk to specific version: update ONLY at SAU-Full
01658 |   - At SAU-Full: run npm audit, review vulnerabilities, update non-critical deps
01659 |   - NEVER npm update mid-phase or mid-campaign
01660 | ```
01661 | 
01662 | ## 3.19 External Review Integration Protocols (NEW in v10.0)
01663 | 
01664 | *Three independent reviewers identified risks and improvement opportunities in v9.0. These protocols integrate their valid suggestions that weren't already covered by the zero-touch extensibility or build pipeline enhancements.*
01665 | 
01666 | ### Fast-Path Execution (v10.0 ER-1)
01667 | 
01668 | *Protocol-heavy governance adds value on complex or failure-prone MS but creates unnecessary friction on routine ones. This fast-path reduces ceremony after demonstrated clean execution.*
01669 | 
01670 | ```
01671 | FAST-PATH TRIGGER:
01672 |   After 3 consecutive MS completions with:
01673 |     - Zero flags ([DATA_GAP], [PARTIAL_ENTRY], etc.)
01674 |     - Zero test failures
01675 |     - All exit conditions met on first attempt
01676 |   → FAST-PATH ACTIVE for next MS
01677 | 
01678 | FAST-PATH BENEFITS:
01679 |   - Skip detailed plan approval (execute directly, document after)
01680 |   - +2 tool calls above resource profile budget
01681 |   - Skip SESSION_INSIGHTS.md entry if no non-obvious learnings
01682 | 
01683 | FAST-PATH RESET:
01684 |   - ANY flag on MS completion → reset counter to 0
01685 |   - ANY test failure → reset counter to 0
01686 |   - ANY exit condition requiring rework → reset counter to 0
01687 |   - Phase boundary (P0→P1, etc.) → reset counter to 0
01688 | 
01689 | FAST-PATH NEVER APPLIES TO:
01690 |   - Safety-critical MS (any MS with S(x) validation)
01691 |   - SAU stops (always full ceremony)
01692 |   - Human review gates (H-1 through H-4)
01693 |   - First MS of any phase (always full ceremony)
01694 | ```
01695 | 
01696 | ### Temporal HITL Heartbeat (v10.0 ER-2)
01697 | 
01698 | *Human review gates H-1 through H-4 are batch-triggered. This adds a time-based heartbeat to catch drift between batch milestones.*
01699 | 
01700 | ```
01701 | TEMPORAL REVIEW:
01702 |   Every 10 sessions (regardless of batch count or phase):
01703 |     1. Human reviews 3 randomly selected outputs from last 10 sessions:
01704 |        - 1 calculation result (verify params reasonable for material/operation)
01705 |        - 1 alarm decode (verify fix procedure is actionable, not generic)
01706 |        - 1 session completion handoff (verify state coherence)
01707 |     2. Uses structured questionnaire (see HITL Questionnaire below)
01708 |     3. Results logged in HUMAN_REVIEW_LOG.md with [TEMPORAL_REVIEW] tag
01709 |     4. Any [REJECTED] finding → pause and investigate before next session
01710 | 
01711 |   DOES NOT REPLACE H-1 through H-4. Supplements them with temporal coverage.
01712 |   If project pace is 2 sessions/week, this fires roughly every 5 weeks.
01713 | ```
01714 | 
01715 | ### HITL Structured Questionnaires (v10.0 ER-9)
01716 | 
01717 | *Prevents human review gates from becoming superficial rubber-stamps.*
01718 | 
01719 | ```
01720 | QUESTIONNAIRE FOR H-1/H-2 (M-M2 batch reviews):
01721 |   For each sampled entry (5 per review):
01722 |   Q1: Is the material correctly identified? (alloy, condition, hardness) [YES/NO/UNCERTAIN]
01723 |   Q2: Are cutting parameters in reasonable range for this material? [YES/NO/FLAG]
01724 |   Q3: Does uncertainty band reflect real-world variability? [YES/NO/TOO_WIDE/TOO_NARROW]
01725 |   Q4: Would you trust these parameters on a production machine? [YES/NO/NEEDS_VERIFICATION]
01726 |   Q5: Any red flags not captured by automated validation? [FREE_TEXT]
01727 | 
01728 | QUESTIONNAIRE FOR H-3 (Pre-M-FINAL):
01729 |   Q1-Q5: Same as H-1/H-2
01730 |   Q6: Are alarm fix procedures specific enough for a floor operator? [YES/NO/TOO_VAGUE]
01731 |   Q7: Do tool life predictions match your shop experience? [YES/NO/OPTIMISTIC/PESSIMISTIC]
01732 |   Q8: Would this system be safe to deploy alongside existing shop processes? [YES/NO/CONCERNS]
01733 | 
01734 | QUESTIONNAIRE FOR H-4 (User documentation review):
01735 |   Q1: Can a new operator follow the Getting Started guide? [YES/NO]
01736 |   Q2: Are workflow tutorials accurate for your shop setup? [YES/NO/NEEDS_EDIT]
01737 |   Q3: Is terminology appropriate for shop floor personnel? [YES/NO/TOO_TECHNICAL]
01738 | 
01739 | SCORING:
01740 |   - All YES → PASS
01741 |   - Any NO on Q4 (H-1/H-2) or Q8 (H-3) → BLOCK (safety-critical rejection)
01742 |   - 2+ NO on other questions → INVESTIGATE before proceeding
01743 |   - Results and free-text recorded verbatim in HUMAN_REVIEW_LOG.md
01744 | ```
01745 | 
01746 | ### Rollback Fire Drill (v10.0 ER-3)
01747 | 
01748 | ```
01749 | MANDATORY AT SU-3 (mid-project, ~week 18):
01750 |   1. Simulate rollback trigger #1 (safety divergence):
01751 |      → Activate mcp-server warm standby
01752 |      → Verify responds to calculation request within 30 seconds
01753 |      → Verify result matches prism-platform for same request
01754 |   2. Simulate data reconciliation:
01755 |      → Write 3 test entries to prism-platform during "live" window
01756 |      → Execute reconciliation procedure (Section 7.5)
01757 |      → Verify entries appear in mcp-server registries
01758 |   3. Verify procedure documentation accuracy:
01759 |      → Follow Section 7.5 step-by-step as written
01760 |      → Note any steps that are outdated, missing, or unclear
01761 |      → Update Section 7.5 with corrections
01762 |   4. Document: ROADMAP_TRACKER "ROLLBACK_FIRE_DRILL: SU-3 [date] [PASS/FAIL/ISSUES]"
01763 | 
01764 |   Total effort: ~5 tool calls. Cheap insurance against procedure rot.
01765 | ```
01766 | 
01767 | ### Amendment Frequency Tracking (v10.0 ER-11)
01768 | 
01769 | ```
01770 | AT EVERY SAU-FULL:
01771 |   Count amendments applied to roadmap since last SAU-Full.
01772 |   Record in ROADMAP_TRACKER: "AMENDMENT_COUNT: SU-X [count] amendments since SU-[X-1]"
01773 | 
01774 | THRESHOLDS:
01775 |   0-3 amendments per phase: HEALTHY — normal refinement
01776 |   4-5 amendments per phase: ADVISORY — document reasons, ensure amendments simplify not complicate
01777 |   6+ amendments per phase: TRIGGER SIMPLIFICATION REVIEW
01778 |     → Roadmap specification overhead is becoming a parallel maintenance project
01779 |     → Options: consolidate related amendments, simplify affected protocols,
01780 |       convert detailed specs to principles-based guidance
01781 |     → Document decision in SESSION_INSIGHTS: [DECISION] Roadmap simplification at SU-X
01782 | ```
01783 | 
01784 | ### Test Harness Trailing Policy (v10.0 ER-10)
01785 | 
01786 | ```
01787 | SAFETY TEST INFRASTRUCTURE — MUST NEVER TRAIL:
01788 |   safety_calc_test_matrix.py, mfg_batch_validator.py, hook_smoke_test.py
01789 |   These run on every build. They must be current.
01790 | 
01791 | NON-SAFETY TEST INFRASTRUCTURE — MAY TRAIL BY 1 LAYER/PHASE:
01792 |   uat_session_runner.py, performance_benchmark.py, dual_run_workload.py
01793 |   These may be updated in the MS immediately after the feature they test.
01794 |   This prevents test harness development from blocking feature progress.
01795 | 
01796 | RULE: If a non-safety test script is 2+ layers behind, it becomes a
01797 |   [PERSISTENT] TODO with HIGH priority. Test debt > 2 layers is unacceptable.
01798 | ```
01799 | 
01800 | ### Microsession Resource Profiles (v10.0 SR-3)
01801 | 
01802 | ```
01803 | RESOURCE PROFILES (assigned per-MS, documented in MS spec):
01804 | 
01805 |   I/O-BOUND: Heavy file reads/writes, low context accumulation
01806 |     Examples: M-M2 batch processing, data ingestion, registry imports
01807 |     Budget: 18 tool calls (extra headroom — each call is small context)
01808 |     Context risk: LOW
01809 | 
01810 |   CONTEXT-BOUND: Heavy code reading, high context accumulation
01811 |     Examples: P1-MS3 hook triage, E3 front-loading, M4 extraction
01812 |     Budget: 12 tool calls (each call loads significant context)
01813 |     Context risk: HIGH — monitor pressure after each call
01814 | 
01815 |   COMPUTE-BOUND: Heavy calculation/validation, moderate context
01816 |     Examples: Safety matrix runs, performance benchmarks, UAT execution
01817 |     Budget: 15 tool calls (standard)
01818 |     Context risk: MEDIUM
01819 | 
01820 |   MIXED: Combination of above
01821 |     Budget: 15 tool calls (standard, with pressure monitoring)
01822 |     Context risk: MEDIUM-HIGH
01823 | 
01824 |   DEFAULT: If MS spec does not declare a profile → MIXED (15 tool calls).
01825 |   The existing 15-25 item / 15 tool call guidance remains the DEFAULT.
01826 |   Resource profiles OVERRIDE the default when specified.
01827 |   E3 complexity classes map to: UI-RENDER=CONTEXT-BOUND, STATE-INTEGRATION=MIXED,
01828 |     TOOL-BUILD=COMPUTE-BOUND, PLATFORM-BUILD=CONTEXT-BOUND.
01829 | ```
01830 | 
01831 | # SECTION 4: STRATEGIC UPDATE POINTS + SYSTEM ARTIFACT UPDATE PROTOCOL
01832 | 
01833 | *Strategic Update Points verify features are WIRED and COMPOUNDING. The System Artifact Update (SAU) protocol ensures GSD, AutoPilot, memories, orchestrators, and quick-ref reflect what was actually built.*
01834 | 
01835 | ## 4.7 System Artifact Update (SAU) Protocol
01836 | 
01837 | **SAU now has two variants: SAU-Full and SAU-Light. Use the appropriate variant based on boundary type.**
01838 | 
01839 | ### SAU-Full (~15-17 tool calls)
01840 | 
01841 | **SAU-Full Duration Cap (v10.0 ER-8):** Maximum 20 tool calls. If checklist exceeds budget, overflow items automatically deferred to next SAU-Light with [SAU_OVERFLOW] flag. This prevents SAU stops from becoming multi-session blockers.
01842 | 
01843 | **Fires at: SU-1 through SU-6, major phase transitions (P0→P1, P1→P2, P2→P3, P3→E1), any MS that fundamentally changes routing.**
01844 | 
01845 | ```
01846 | 1. GSD_QUICK.md UPDATE
01847 |    → Read current GSD_QUICK.md
01848 |    → Compare against actual system capabilities built since last SAU
01849 |    → ADD: new dispatchers, new actions, new routing paths, new plugins
01850 |    → REMOVE: deprecated paths, renamed actions, retired dispatchers
01851 |    → VERIFY: AutoPilot.ts reads GSD dynamically — test 3 representative queries route correctly
01852 |    → If GSD changed → restart required after build
01853 | 
01854 | 2. AUTOPILOT / ORCHESTRATOR UPDATE
01855 |    → Verify AutoPilot routing table covers ALL current dispatchers
01856 |    → Test routing for each NEW capability added since last SAU
01857 |    → Verify fallback behavior for unknown query types
01858 |    → If new plugin added since last SAU → verify plugin routing works
01859 |    → If new swarm patterns added → verify auto-deployment matrix is current
01860 | 
01861 | 3. PRISM_QUICK_REF.md REGENERATION
01862 |    → Run quick_ref_generator.py (auto-reads system state)
01863 |    → Verify output < 2KB
01864 |    → Diff against previous version — flag unexpected changes
01865 |    → This is GENERATED, never hand-edited
01866 | 
01867 | 4. SESSION MEMORY SEEDING
01868 |    → Review session_memory.json categories
01869 |    → Seed empty categories with actual data from completed phases
01870 |    → Verify retention policy (3KB max, rotation working)
01871 |    → Verify [PERSISTENT] entries preserved
01872 | 
01873 | 5. CLAUDE MEMORY UPDATE (memory_user_edits)
01874 |    → Review what Claude's cross-session memory knows about PRISM
01875 |    → Update memory with: current phase, current MS, key capabilities built,
01876 |      active hook count, registry counts, known gotchas from this phase
01877 |    → Remove stale memory entries that reference completed/changed states
01878 | 
01879 | 6. STATE FILE COHERENCE
01880 |    → Run system_self_test.py state coherence check
01881 |    → Verify ROADMAP_TRACKER, HANDOFF.json, COMPACTION_SURVIVAL.json agree
01882 |    → Fix any discrepancies before proceeding
01883 | 
01884 | 7. SESSION_INSIGHTS COMPILATION + ARCHIVE
01885 |    → Compile phase insights into summary lines
01886 |    → If at phase boundary → append compiled summary to SESSION_INSIGHTS_ARCHIVE.md
01887 |    → Rotate oldest non-[PERSISTENT] entries if > 3KB
01888 |    → Verify file loads at boot within acceptable time
01889 | 
01890 | 8. COMPACTION ARMOR COVERAGE
01891 |    → Verify COMPACTION_SURVIVAL.json captures ALL new state
01892 |    → Run write-readback test
01893 | 
01894 | 9. AGENT COUNT VERIFICATION (NEW in v7)
01895 |    → Count all active agent definitions
01896 |    → Compare against last SAU count
01897 |    → If count changed → document: which agents added/removed and why
01898 |    → Update Claude memory with current agent count
01899 | 
01900 | 10. CROSS-TRACK DEPENDENCY CHECK (NEW in v7)
01901 |     → Check Section 3.9 dependency table for any flagged MS
01902 |     → If upstream data is now available → schedule re-execution of flagged MS
01903 |     → Document any remaining [SYNTHETIC_DATA] or [DEFERRED] flags
01904 | 
01905 | 11. MASTER_INDEX COHERENCE CHECK (NEW in v8)
01906 |     → Read MASTER_INDEX.md → extract dispatcher count, action count, engine count
01907 |     → Compare against live system: prism_autopilot_d→working_tools (dispatcher list),
01908 |       prism_hook→list (hook count), prism_telemetry→get_dashboard (engine status)
01909 |     → If counts disagree → flag [MASTER_INDEX_DRIFT] in ROADMAP_TRACKER
01910 |     → If MASTER_INDEX missing → WARN (not BLOCK — system functions without it, but drift accumulates)
01911 |     → Update MASTER_INDEX.md if live system has legitimate additions from current phase
01912 | 
01913 | 12. DEV_PROTOCOL.md UPDATE (NEW in v8)
01914 |     → Verify DEV_PROTOCOL.md references current roadmap phase
01915 |     → Update if stale
01916 | 
01917 | 13. ARCHITECTURAL COHERENCE AUDIT (NEW in v8.5)
01918 |     PURPOSE: Detect structural drift that accumulates across sessions. NOT about
01919 |     correctness (steps 1-12 cover that). About CONSISTENCY — drift that makes
01920 |     code progressively harder to maintain.
01921 | 
01922 |     a. CODE STYLE SAMPLING (3 tool calls):
01923 |        → Sample 3 files: 1 from earliest completed phase, 1 from most recent phase,
01924 |          1 from the current phase
01925 |        → Compare: naming conventions (camelCase/snake_case), error handling patterns,
01926 |          import patterns (relative/absolute, grouping, aliases)
01927 |        → If drift detected: document in COHERENCE_AUDIT.md as [STYLE_DRIFT]
01928 |        → If severe (>5 inconsistencies in 3 files): create [PERSISTENT] TODO to normalize
01929 | 
01930 |     b. ARCHITECTURAL DECISION REPLAY (2 tool calls):
01931 |        → Read phase architecture docs (E3_ARCHITECTURE.md after E3 starts, etc.)
01932 |        → For each BINDING decision: verify current code honors it
01933 |        → Check: state management consistency, data flow patterns, hook registration patterns
01934 |        → If violation found: fix immediately if < 5 tool calls, else [PERSISTENT] TODO
01935 | 
01936 |     c. NAMING AUDIT (1 tool call):
01937 |        → List all new files created since last SAU
01938 |        → Verify file names follow established convention
01939 |        → Verify new dispatcher actions follow MASTER_INDEX naming pattern
01940 | 
01941 |     d. DEPENDENCY DIRECTION CHECK (1 tool call):
01942 |        → Verify no circular imports introduced since last SAU
01943 |        → Verify dependency direction: plugins depend on core, never core on plugins
01944 |        → Verify infrastructure files have no new dependencies on phase-specific code
01945 | 
01946 |     OUTPUT: COHERENCE_AUDIT.md section appended:
01947 |       === COHERENCE AUDIT SU-X (YYYY-MM-DD) ===
01948 |       Style drift: [NONE / MINOR:details / MAJOR:details]
01949 |       Architecture violations: [NONE / list]
01950 |       Naming deviations: [NONE / list]
01951 |       Dependency issues: [NONE / list]
01952 |       === END ===
01953 | 
01954 | 14. EXTERNAL BACKUP (NEW in v8.5)
01955 |     → Full codebase snapshot + state files + data files
01956 |     → Copy to off-machine destination (configured in ENV_CONFIG.md at P0-MS0):
01957 |       Option A: External USB drive (manual, reliable)
01958 |       Option B: Network share (if available on LAN)
01959 |       Option C: Cloud sync (OneDrive/Google Drive/S3 — encrypted)
01960 |     → Verify: read-back test on external copy (not just "copy succeeded")
01961 |     → Log: "EXTERNAL_BACKUP: SU-X → [destination] [size] [verified: YES/NO]"
01962 | ```
01963 | 
01964 | **System artifacts updated at SAU-Full stops (COMPLETE LIST):**
01965 | ```
01966 | 1. GSD_QUICK.md (routing decisions)
01967 | 2. AutoPilot routing tables
01968 | 3. PRISM_QUICK_REF.md (auto-generated)
01969 | 4. Session memory categories
01970 | 5. Claude project memory
01971 | 6. State files (ROADMAP_TRACKER, HANDOFF, COMPACTION_SURVIVAL)
01972 | 7. Compaction armor payloads
01973 | 8. MASTER_INDEX.md (structural counts)
01974 | 9. DEV_PROTOCOL.md (development workflow)
01975 | 10. COHERENCE_AUDIT.md (architectural consistency — v8.5)
01976 | 11. External backup to off-machine destination (v8.5)
01977 | ```
01978 | 
01979 | ### SAU-Light (~8 tool calls, updated v10.0)
01980 | 
01981 | **Fires at: Mini-SAU stops, mid-phase transitions within a track, after any MS that adds hooks or scripts but doesn't change routing.**
01982 | 
01983 | ```
01984 | 1. GSD_QUICK.md — Quick check: does GSD mention new capabilities? Add if missing.
01985 | 2. PRISM_QUICK_REF.md — Run quick_ref_generator.py
01986 | 3. CLAUDE MEMORY — Update current phase/MS and any new hook or agent counts
01987 | 4. AGENT COUNT — Verify count matches last known. Document changes.
01988 | 5. CROSS-TRACK FLAGS — Check for any [SYNTHETIC_DATA] flags that can now be resolved
01989 | 6. MASTER_INDEX FLOOR CHECK — Read MASTER_INDEX.md floors. Compare against live counts.
01990 |    If live < floor for any category → flag for next SAU-Full.
01991 |    If live > floor significantly (>10% growth) → update floor at next SAU-Full.
01992 | 7. EXTENSION REGISTRY CHECK (v10.0 ZT-7) — Read EXTENSION_REGISTRY.json.
01993 |    For each registered extension category: verify at least one consumer exists.
01994 |    If orphaned extension found AND registered > 2 SAU-Light stops ago → WARN.
01995 | 8. AMENDMENT FREQUENCY (v10.0 ER-11) — Count amendments since last SAU.
01996 |    Log count. If ≥6 since last SAU-Full → flag for simplification review.
01997 | 9. TEMPORAL HITL CHECK (v10.0 ER-2) — If ≥10 sessions since last human review,
01998 |    flag [HITL_DUE] in ROADMAP_TRACKER. Human review before next phase transition.
01999 | 10. EXTERNAL STATE BACKUP — Copy state files to off-machine destination.
02000 | ```
02001 | ### SAU Boundary Map (Updated for v7)
02002 | 
02003 | | Boundary | SAU Variant | Trigger |
02004 | |----------|-------------|---------|
02005 | | SU-1 (end P0) | SAU-Full | Major phase transition |
02006 | | SU-2 (end P1) | SAU-Full | Major phase transition |
02007 | | SU-3 (end P2) | SAU-Full | Routing fundamentally changes (AutoPilot) |
02008 | | SU-4 (end P3/P4) | SAU-Full | Campaign readiness gate |
02009 | | SU-5 (end E2) | SAU-Full | Enterprise midpoint |
02010 | | SU-6 (pre-migration) | SAU-Full | Final certification |
02011 | | E1-MS4, E1-MS9 | SAU-Light | Enterprise sub-phase |
02012 | | E2-MS5 | SAU-Light | Enterprise sub-phase |
02013 | | E3-MS10, E3-MS20 | SAU-Light | Enterprise sub-phase |
02014 | | E4-MS8 | SAU-Light | Enterprise sub-phase |
02015 | | M-M0→M-M1 transition | SAU-Light | Manufacturing phase transition |
02016 | | M-M2 batch 10, batch 30 | SAU-Light | Data campaign milestones |
02017 | | M4-T1 integration MS | SAU-Light | Extraction milestone |
02018 | | M4-T2 integration MS | SAU-Full | Major extraction complete |
02019 | 
02020 | ---
02021 | 
02022 | ## SU-1: POST-P0 — "Foundation Integrity Gate"
02023 | **When:** End of Chat 3, after P-P0-MS10 completes
02024 | **Effort:** ~27 tool calls (SAU-Full with coherence audit) | **Quality Tier:** STANDARD
02025 | **Chat position:** Last MS of Chat 3
02026 | 
02027 | ### What to Verify
02028 | 
02029 | | Component | Verification Method | Expected Result | If Failing |
02030 | |-----------|-------------------|-----------------|------------|
02031 | | Registry loading | prism_data→material_lookup("4140"), machine_lookup("HAAS VF-2"), alarm_lookup("FANUC 414") | All return valid data | Reopen P0-MS1 |
02032 | | Compaction armor | Trigger pressure ≥ 50% manually | 3 survival files written with valid checksums | Reopen P0-MS3 |
02033 | | API key | prism_agent→agent_invoke tier=haiku prompt="echo" | Valid response | Reopen P0-MS2 |
02034 | | Context budget hook | Check last 3 PLATFORM-CONTEXT-BUDGET firings | Pressure projections present in telemetry | Rewire in P0-MS3 |
02035 | | System self-test | Trigger system_self_test manually | All 7 checks pass (including state coherence, disk space, and API version) | Fix before P1 |
02036 | | Hook count | Count active hooks | ≥ 8 hooks active | Identify missing, reinstall |
02037 | | Session boot time | Measure cold start | < 3s | Profile and optimize |
02038 | | HANDOFF.json freshness | Read timestamp | Updated within last MS | Fix update trigger |
02039 | | SESSION_INSIGHTS.md | Read file | Has structured entries from P0 | Start writing insights |
02040 | | Environment health | Run env_smoke_test.py | All checks pass | Fix environment |
02041 | 
02042 | ### SAU-Full Protocol Execution (SU-1)
02043 | 
02044 | 1. **GSD_QUICK.md** — Verify it reflects P0 state. P0 built: registries, compaction armor, context budget, ATCS import, agent/swarm import, cadence system. GSD must include: all dispatcher routing paths verified working, registry query patterns, agent tier strings. If AutoPilot exists in mcp-server, verify it routes correctly with current GSD.
02045 | 
02046 | 2. **AutoPilot/Orchestrator** — If AutoPilot is not yet imported (it's imported in P2-MS4), verify the existing mcp-server orchestrator reflects P0 changes. Document current routing behavior for baseline.
02047 | 
02048 | 3. **PRISM_QUICK_REF.md** — Run quick_ref_generator.py (built in P0-MS4). Create this file if first run.
02049 | 
02050 | 4. **Session Memory** — Seed categories with P0 data:
02051 |    - failure_patterns: calc bug root cause (GAP-002), any registry path issues
02052 |    - performance_baselines: P0-MS10 smoke test values
02053 |    - config_drift: any .env or config changes made during P0
02054 |    - domain_discoveries: material path patterns, registry loading behavior
02055 | 
02056 | 5. **Claude Memory** — Update memory_user_edits with: P0 complete, registry counts, hook count, key P0 patterns learned, current build commands, current model strings from .env.
02057 | 
02058 | 6. **State Coherence** — Run system_self_test.py. Verify all 7 checks pass.
02059 | 
02060 | 7. **Compaction Armor Coverage** — Verify includes: current MS ID, registry counts, hook count, ATCS state (empty for now), platform scaffold status, agent tier baselines.
02061 | 
02062 | 8. **Agent Count** — Document agent count baseline from P0 imports.
02063 | 
02064 | 9. **Insights Archive** — Compile P0 insights into SESSION_INSIGHTS_ARCHIVE.md.
02065 | 
02066 | 10. **Cross-Track Flags** — No cross-track dependencies active yet. Document baseline.
02067 | 
02068 | ### Synergy Checks
02069 | 
02070 | - Is ContextManager feeding pressure data to PLATFORM-CONTEXT-BUDGET?
02071 | - Is CompactionManager calling compaction_armor.py?
02072 | - Is TelemetryEngine capturing hook firings?
02073 | - Is PLATFORM-COST-ESTIMATE running before agent invocations?
02074 | - Is SYNC_MANIFEST.json auto-updating on builds?
02075 | 
02076 | **EXIT:** All verifications pass OR all failures documented with [PERSISTENT] TODOs. SAU-Full complete. quick_ref_generator.py produces valid output. Boot context < 10KB. Session memory has P0 data. Claude memory updated. Agent count recorded.
02077 | 
02078 | ---
02079 | 
02080 | ## SU-2: POST-P1 — "Consolidation Utilization Gate"
02081 | **When:** End of Chat 4b, after P-P1-MS8 completes
02082 | **Effort:** ~29 tool calls (SAU-Full with coherence audit) | **Quality Tier:** STANDARD
02083 | **Chat position:** Last activity of Chat 4b
02084 | 
02085 | ### What to Verify
02086 | 
02087 | | Component | Verification Method | Expected Result | If Failing |
02088 | |-----------|-------------------|-----------------|------------|
02089 | | Formula recommendations | prism_calc→speed_feed with 4140 steel | PLATFORM-FORMULA-RECOMMEND fires, suggests relevant formulas | Rewire hook, check JSON |
02090 | | Session memory (15 cat) | Read session_memory.json | All 15 categories present, entries from P0+P1 | Fix session_memory_expander.py |
02091 | | Script sandbox | Execute test script through safe_script_runner.py | Executes in sandbox, output captured, no file writes | Fix PLATFORM-SCRIPT-SANDBOX |
02092 | | Drift baseline | Read DRIFT_LOG.md | Baseline entry exists, SYS-DRIFT-CHECK hook active | Run codebase_sync_check.py |
02093 | | Active hook count | Count active + pending hooks | ~15 active, ~8 pending | Cross-reference with Section 8 |
02094 | | Agent consolidation | List active agents | ~54 agents, no overlap, no downstream orphans | Verify P1-MS2 cross-ref |
02095 | | Skill count | Count loaded skills | 137 accessible (119 existing + 18 new) | Check prism_skill registry |
02096 | | KNOWN_RENAMES spot-check | Test 3 random old tool names from known_renames.json | All 3 resolve to correct new dispatcher+action | Fix rename chain — 60+ week gap to M-FINAL is too long without early validation |
02097 | 
02098 | ### SAU-Full Protocol Execution (SU-2)
02099 | 
02100 | 1. **GSD_QUICK.md** — P1 added: formula recommendations, session memory, drift detection, script sandbox, skill auto-loading. Update routing for any new dispatcher actions.
02101 | 
02102 | 2. **AutoPilot/Orchestrator** — Verify current orchestrator knows about: formula recommendation hook, skill auto-loading, error pattern matching.
02103 | 
02104 | 3. **PRISM_QUICK_REF.md** — Regenerate via quick_ref_generator.py.
02105 | 
02106 | 4. **Session Memory** — Seed with P1 data.
02107 | 
02108 | 5. **Claude Memory** — Update: P1 complete, ~54 agents, ~15 active hooks, formula system wired, drift baseline established.
02109 | 
02110 | 6. **Boot Efficiency** — Verify boot context < 10KB.
02111 | 
02112 | 7. **Telemetry Coverage** — Verify telemetry captures formula recommendations, session memory writes, drift checks, sandbox executions.
02113 | 
02114 | 8. **Agent Count** — Verify ~54 matches P1-MS2 consolidation. Document exact count.
02115 | 
02116 | 9. **Insights Archive** — Compile P1 insights to archive.
02117 | 
02118 | ### Synergy Checks
02119 | 
02120 | - Is PLATFORM-FORMULA-RECOMMEND injecting formulas into calculation context, or just logging?
02121 | - Is PLATFORM-MEMORY-EXPAND extracting from ALL telemetry sources?
02122 | - Is SYS-DRIFT-CHECK firing on weekly cadence?
02123 | - Is PLATFORM-SKILL-AUTO-LOAD actually loading skills or just suggesting?
02124 | - Are consolidated agents (54) all reachable through prism_agent→agent_invoke?
02125 | 
02126 | **EXIT:** SAU-Full complete. GSD reflects P1 capabilities. Formula recommendations verified relevant. Session memory persisting. Drift baseline established. Agent count verified and recorded. Claude memory current.
02127 | 
02128 | ---
02129 | 
02130 | ## SU-3: POST-P2 — "Demo 1 Readiness + Migration Foundation"
02131 | **When:** End of Chat 7, after P-PERF-MS1 completes
02132 | **Effort:** ~32 tool calls (SAU-Full with coherence audit + demo verification)
02133 | **Chat position:** Last activity of Chat 7
02134 | 
02135 | ### What to Verify
02136 | 
02137 | | Component | Verification Method | Expected Result | If Failing |
02138 | |-----------|-------------------|-----------------|------------|
02139 | | Plugin architecture | Load test plugin → register dispatcher → call action | Full round-trip works | Architectural fix needed |
02140 | | Golden path demos | Run demo_hardener.py for all 5 demos | 5/5 consecutive passes per demo | Fix demo inputs/paths |
02141 | | Performance baselines | Run performance_benchmark.py (3 core metrics) | Material lookup < 50ms, hook chain < 10ms, boot < 3s | Profile and optimize |
02142 | | Migration gate criteria | Read P2-MS7 output | dual_run_validator.py exists, criteria documented | Complete P2-MS7 |
02143 | | AutoPilot routing | Send mixed manufacturing + task-tracker queries | Routes to correct plugin per query | Fix routing logic |
02144 | | Governance layer | Attempt a blocked operation through Manus | Governance intercepts and blocks | Fix governance hooks |
02145 | 
02146 | ### SAU-Full Protocol Execution (SU-3)
02147 | 
02148 | 1. **GSD_QUICK.md** — MAJOR UPDATE. P2 fundamentally changed the architecture: plugin-based routing, multi-domain support, AutoPilot as router, governance interception. This is the biggest GSD rewrite.
02149 | 
02150 | 2. **AutoPilot/Orchestrator** — AutoPilot was imported in P2-MS4. Read MASTER_INDEX.md Section 3 (22 sequencing guides). Test ALL 22 sequences route correctly:
02151 | 
02152 |    **Batch 1 — Core Manufacturing (test individually, must all pass):**
02153 |    - 3.5  Manufacturing Calculation: material→calc→safety→validate
02154 |    - 3.6  Thread Calculation: specs→drill→gcode→safety
02155 |    - 3.7  Toolpath Strategy: material→strategy→params→speed→safety
02156 |    - 3.8  Alarm Investigation: decode→search→fix→knowledge
02157 |    - 3.9  Multi-operation Machining: rough→semi→finish with parameter changes
02158 |    
02159 |    **Batch 2 — System Operations (test individually):**
02160 |    - 3.1  Default Decision Flow: query→classify→route→execute→respond
02161 |    - 3.2  Error Handling: error→pattern_match→suggest_fix→retry_or_escalate
02162 |    - 3.3  Context Pressure Response: detect→evaluate→truncate_or_compact→continue
02163 |    - 3.4  Session Boot: load_state→load_gsd→load_memory→integrity_check→ready
02164 |    - 3.10 Quality Validation (full): safety→ralph→omega→assess
02165 |    
02166 |    **Batch 3 — Autonomous Operations (test individually):**
02167 |    - 3.11 Alarm Decode Chain: code→controller→decode→fix→cross_ref→knowledge
02168 |    - 3.12 Autonomous Task: atcs→plan→execute→queue→status
02169 |    - 3.13 Batch Validation: load→validate→quarantine_or_accept→dashboard_update
02170 |    - 3.14 Compaction Recovery: auto→quick_resume→todo→continue
02171 |    - 3.16 Swarm Deployment: assess_complexity→select_pattern→deploy→monitor→collect
02172 |    
02173 |    **Batch 4 — Intelligence + Platform (test individually):**
02174 |    - 3.15 Cost Estimation: operation→model→estimate→budget_check→log
02175 |    - 3.17 Drift Detection: scan→diff→threshold→auto_todo_or_log
02176 |    - 3.18 Learning Pipeline: error→pattern_store→accuracy_update→formula_reweight
02177 |    - 3.19 Knowledge Graph Query: node→traverse→rank→return_related
02178 |    - 3.20 Script Execution Sandbox: validate→sandbox→execute→capture→return
02179 |    - 3.21 Compliance Report: material→cert_chain→iso_template→generate→validate
02180 |    - 3.22 Full Pipeline: brainstorm→plan→execute→review→validate→ralph→omega
02181 | 
02182 |    Document pass/fail in ROADMAP_TRACKER: "AUTOPILOT_SEQUENCE_TEST: X/22 pass". **≥20/22 required.** Any failure in Batch 1 (manufacturing) is a BLOCK — those are safety-critical routing paths.
02183 | 
02184 | 3. **PRISM_QUICK_REF.md** — Regenerate.
02185 | 
02186 | 4. **Session Memory** — Seed with P2 data.
02187 | 
02188 | 5. **Claude Memory** — Update: P2 complete, plugin architecture working, 5 demos passing, AutoPilot imported and routing, performance baselines recorded, migration gates defined.
02189 | 
02190 | 6. **Error Pattern DB** — P0-P2 generated errors. Verify PLATFORM-ERROR-PATTERN has entries. If empty, seed with 5 most common errors.
02191 | 
02192 | 7. **Compaction Armor** — Re-measure boot context. If > 12KB, optimize.
02193 | 
02194 | 8. **Agent Count** — Verify count stable from SU-2. Document any changes.
02195 | 
02196 | 9. **Insights Archive** — Compile P2 insights to archive.
02197 | 
02198 | 10. **Cross-Track Check** — M-M0 should be starting around this time. Verify Manufacturing track prerequisites are met.
02199 | 
02200 | ### Synergy Checks
02201 | 
02202 | - Does PLATFORM-DEMO-VERIFY actually BLOCK a failing demo?
02203 | - Is PLATFORM-PERF-GATE integrated with build pipeline?
02204 | - Does dual_run_validator.py work against BOTH codebases simultaneously?
02205 | - Are golden path demos using the formula recommendation system?
02206 | - Is PLATFORM-IMPORT-VERIFY firing on every import?
02207 | 
02208 | **EXIT:** Demo 1 passes reliably. SAU-Full complete. GSD reflects plugin architecture. AutoPilot routes all query types correctly. Performance baselines established. Migration gates defined. Error pattern DB ≥ 5 entries. Agent count verified. Claude memory current.
02209 | 
02210 | ---
02211 | 
02212 | ## SU-4: POST-P3P4 — "Campaign Readiness Gate"
02213 | **When:** Chat 10b, after P-PERF-MS2 completes
02214 | **Effort:** ~32 tool calls (SAU-Full with coherence audit)
02215 | **Chat position:** Last activity of Chat 10b
02216 | 
02217 | ### What to Verify
02218 | 
02219 | | Component | Verification Method | Expected Result | If Failing |
02220 | |-----------|-------------------|-----------------|------------|
02221 | | ATCS batch resilience | Create test campaign (10 items), simulate compaction at item 5 | BatchResumeProtocol resumes at item 6, completes 10/10 | Fix checkpoint sync |
02222 | | Error pattern auto-resolution | Trigger a known error | PLATFORM-ERROR-PATTERN auto-suggests fix | Seed pattern DB |
02223 | | Learning pipeline | Check formula accuracy tracking | Accuracy history has entries from P2 demos | Wire tracking |
02224 | | Swarm cost estimation | Run ralph_loop through PLATFORM-COST-ESTIMATE | Cost estimate appears before execution | Wire hook to swarm |
02225 | | ATCS campaign templates | Check for template files | Material/Machine/Alarm templates exist | Create from defaults |
02226 | | Knowledge graph | Query material-tool-operation relationships | Returns relationship data | Check P4-MS4 output |
02227 | | Pipeline automation | Trigger "calculate + validate + recommend" pipeline | Completes end-to-end | Check P4-MS3 output |
02228 | 
02229 | ### SAU-Full Protocol Execution (SU-4)
02230 | 
02231 | 1. **GSD_QUICK.md** — P3-P4 added: ATCS campaigns, batch operations, swarm auto-deployment, learning pipeline, knowledge graph, pipeline automation. GSD must include all new command patterns.
02232 | 
02233 | 2. **AutoPilot/Orchestrator** — Verify routing for: campaign management, complex optimization (auto-deploys swarm), knowledge graph, pipeline invocations.
02234 | 
02235 | 3. **PRISM_QUICK_REF.md** — Regenerate.
02236 | 
02237 | 4. **Session Memory** — Seed with P3-P4 data. Target ≥ 15 error patterns.
02238 | 
02239 | 5. **Claude Memory** — Update: P3-P4 complete, ATCS operational, batch resilience working, campaign templates ready for M-M2.
02240 | 
02241 | 6. **ATCS Campaign Templates** — Must exist before M-M2 starts:
02242 |    - material_batch_template.json: batch_size=50, checkpoint_every=2, omega_threshold=0.70, quarantine_at=10%
02243 |    - machine_batch_template.json: batch_size=25, checkpoint_every=1, omega_threshold=0.70
02244 |    - alarm_batch_template.json: batch_size=100, checkpoint_every=5, omega_threshold=0.65
02245 | 
02246 | 7. **Cost Model Calibration** — Compare estimates from P2-P4 against actual billing. Adjust if > 10% off.
02247 | 
02248 | 8. **Agent Count** — Verify count. Document any P3-P4 agent additions.
02249 | 
02250 | 9. **Insights Archive** — Compile P3-P4 insights to archive.
02251 | 
02252 | 10. **Cross-Track Check** — M-M2 is about to start. Verify: ATCS batch framework operational (BLOCK if not), registries loading > 95% (BLOCK if not), campaign templates exist. This is the CRITICAL gate for Manufacturing data campaigns.
02253 | 
02254 | ### Synergy Checks — CONSUME VERIFICATION (v8 enhancement)
02255 | 
02256 | **Each test proves a FULL consumer chain, not just "does X exist?"**
02257 | 
02258 | 1. **Error Pattern Auto-Resolution Consumer Test:**
02259 |    - Trigger a known error that's in error_pattern_db with confidence > 0.9
02260 |    - Verify: autoHookWrapper.onError() finds the pattern → injects fix_procedure into response
02261 |    - Verify: hit_count incremented → resolution_outcome logged
02262 |    - If no auto-resolution: ERROR — P3-MS4 consumer wire is broken
02263 | 
02264 | 2. **Formula Accuracy Feedback Loop Test:**
02265 |    - Seed formula_accuracy.json: Formula A accuracy=0.95 for 4140+turning, Formula B accuracy=0.55
02266 |    - Run prism_calc→speed_feed for 4140+turning
02267 |    - Verify: PLATFORM-FORMULA-RECOMMEND selects Formula A (not B)
02268 |    - Change scores: A=0.40, B=0.98 → re-run → verify Formula B now selected
02269 |    - If same formula both times: ERROR — feedback loop is broken
02270 | 
02271 | 3. **Knowledge Graph Consumer Test:**
02272 |    - Query MemoryGraphEngine: "what tools work with Ti-6Al-4V for roughing?"
02273 |    - Verify: returns ranked results with edges from P4-MS4 seeding
02274 |    - Run prism_calc→speed_feed for Ti-6Al-4V → verify PLATFORM-FORMULA-RECOMMEND
02275 |      includes graph-derived tool suggestions in its recommendation
02276 |    - If graph results don't appear in formula recommendations: WARN — consumer #1 weak
02277 | 
02278 | 4. **Session Memory Consumer Test:**
02279 |    - Seed session_memory failure_patterns with 15 entries
02280 |    - Boot → verify SessionLifecycleEngine pre-loads mitigation context
02281 |    - Run a calculation → verify ResponseTemplateEngine adjusts output based on session_memory user_context
02282 |    - If boot doesn't change: WARN — consumer may be ambient-only (acceptable but document)
02283 | 
02284 | 5. **Drift Auto-Correction Test:**
02285 |    - Manually add 5 drift items to DRIFT_LOG.md
02286 |    - Run SYS-DRIFT-CHECK
02287 |    - Verify: prism_todo gets CRITICAL priority item for drift resolution
02288 |    - Verify: TelemetryEngine "system" channel fires alert
02289 |    - If no TODO created: ERROR — auto-correction threshold is broken
02290 | 
02291 | 6. **Boot Efficiency Threshold Test:**
02292 |    - Simulate slow boot (inject 4s delay)
02293 |    - Verify: WARN fires in TelemetryEngine "performance" channel
02294 |    - Simulate 6s delay → verify optimization triggers
02295 |    - If no alert: ERROR — boot threshold is unwired
02296 | 
02297 | 7. **ComputationCache Consumer Test:**
02298 |    - Run prism_calc→speed_feed for 4140 annealed
02299 |    - Run same query again → verify second call is < 5ms (cache hit)
02300 |    - Update material registry for 4140 → verify cache invalidated → third call recomputes
02301 | 
02302 | **Pre-existing synergy checks (retained):**
02303 | - Does BatchResumeProtocol correctly read COMPACTION_SURVIVAL.json format from P0-MS3?
02304 | - Does PLATFORM-ERROR-PATTERN feed into session memory's failure_patterns?
02305 | - Are swarm cost estimates included in PLATFORM-COST-ESTIMATE?
02306 | - Does the learning pipeline update formula accuracy based on UAT feedback?
02307 | - Are ATCS campaign templates compatible with batch resilience error policies?
02308 | 
02309 | **EXIT:** SAU-Full complete. GSD reflects autonomous capabilities. Campaign templates ready. ATCS tested with compaction survival. Error DB ≥ 15 patterns. Cost model within 10%. Agent count verified. M-M2 prerequisites confirmed. Claude memory current.
02310 | 
02311 | ---
02312 | 
02313 | ## SU-5: MID-ENTERPRISE — "Platform Health Under Load"
02314 | **When:** After E2 completes (approximately Chat 25), before E3 starts
02315 | **Effort:** ~27 tool calls (SAU-Full with coherence audit)
02316 | 
02317 | ### What to Verify
02318 | 
02319 | | Component | Verification Method | Expected Result | If Failing |
02320 | |-----------|-------------------|-----------------|------------|
02321 | | WAL capture | Check WAL for recent dispatcher calls | All calls logged with CRC32 verification | Fix WAL recording |
02322 | | Cost tracking accuracy | Compare E1-E2 estimates vs actual billing | Within ±5% | Recalibrate cost model |
02323 | | Performance with WAL overhead | Run performance_benchmark.py full suite | All 10 targets still met | Optimize WAL write path |
02324 | | Data campaign progress | Read CampaignDashboard state | Materials: X/target, Machines: Y/target, Alarms: Z/target | Prioritize stalled campaigns |
02325 | | Compaction survival with WAL | Simulate compaction with WAL active | WAL state in survival files | Update compaction_armor.py |
02326 | | Drift detection | Read DRIFT_LOG.md | < 3 unresolved drift items | Prioritize drift resolution |
02327 | 
02328 | ### SAU-Full Protocol Execution (SU-5)
02329 | 
02330 | 1. **GSD_QUICK.md** — E1-E2 added: WAL capture/replay, cost intelligence, budget alerts, finance export. Update GSD with all new command patterns.
02331 | 
02332 | 2. **AutoPilot/Orchestrator** — Verify routing for: WAL replay, cost analysis, what-if branching, budget queries.
02333 | 
02334 | 3. **PRISM_QUICK_REF.md** — Regenerate.
02335 | 
02336 | 4. **Session Memory** — Major enrichment: failure_patterns ≥ 30, cost_history from E1-E2, updated performance_baselines with WAL overhead.
02337 | 
02338 | 5. **Claude Memory** — Update: E2 complete, WAL operational, cost tracking calibrated, data campaign progress.
02339 | 
02340 | 6. **compaction_armor.py** — MUST include WAL state: replay position, last CRC32, snapshot index.
02341 | 
02342 | 7. **Boot Optimization** — Run boot_efficiency_tracker.py. Remove unreferenced boot context.
02343 | 
02344 | 8. **Agent Count** — Verify. Enterprise phases may have added agents.
02345 | 
02346 | 9. **Cross-Track Flag Resolution** — Check ALL [SYNTHETIC_DATA] and [DEFERRED] flags from Section 3.9. M-M2 should have meaningful data by now. Re-execute flagged MS with real data.
02347 | 
02348 | 10. **Safety-Critical Test Matrix** — Run safety_calc_test_matrix.py (Section 15). All 50 calculations must pass on mcp-server. Record prism-platform results for migration comparison.
02349 | 
02350 | **EXIT:** SAU-Full complete. GSD reflects E1-E2 capabilities. WAL + cost routing works. Performance acceptable with overhead. Error DB ≥ 30. All cross-track flags resolved or documented. Safety test matrix recorded. Claude memory current.
02351 | 
02352 | ---
02353 | 
02354 | ## SU-6: PRE-MIGRATION — "System Integrity Certification"
02355 | **When:** Before M-FINAL begins (approximately Chat 53)
02356 | **Effort:** ~37 tool calls (most thorough gate, includes coherence audit + external backup)
02357 | 
02358 | ### What to Verify
02359 | 
02360 | This is the final verification before mcp-server retirement. EVERY system is tested.
02361 | 
02362 | | Component | Verification Method | Expected Result |
02363 | |-----------|-------------------|-----------------|
02364 | | Dual-run validation | dual_run_validator.py: 100 representative queries | Discrepancy rate < 1% |
02365 | | Full regression suite | All 324 actions tested | Zero regressions |
02366 | | Performance parity | All 10 benchmarks | prism-platform meets or exceeds mcp-server |
02367 | | Data integrity | Compare all registry entries | prism-platform ≥ mcp-server counts |
02368 | | UAT sign-off | H-4 golden-path scenarios with engineer observing (v8.5) | Written sign-off in HUMAN_REVIEW_LOG.md |
02369 | | Human review log | H-1 through H-4 complete in HUMAN_REVIEW_LOG.md (v8.5) | Zero unresolved [REJECTED] entries |
02370 | | 72-hour dual-run | Both servers parallel for 72 hours (~7,200 queries including warm scenarios) | Zero divergence |
02371 | | Hook integrity | All 85+ active hooks verified via HOOK_MANIFEST.json three-way check | Every hook fires on trigger |
02372 | | Formula accuracy | safety_calc_test_matrix.py (Section 15) — all 50 calculations | Within ±2σ of reference values |
02373 | | Compaction survival | Full stress test with all systems | Complete recovery from any point |
02374 | | WAL replay | Replay last 1000 operations | Identical results |
02375 | | Error pattern DB | Coverage check | ≥ 50 patterns, auto-resolution working |
02376 | | Cost tracking | Audit trail for E1-E4 | ±5% of actual billing |
02377 | | Session memory | Quality audit | All 15 categories populated, actionable |
02378 | | Architectural coherence | COHERENCE_AUDIT.md review (v8.5) | Zero MAJOR drift items at SU-6 |
02379 | 
02380 | ### SAU-Full Protocol Execution (SU-6) — FINAL
02381 | 
02382 | 1. **GSD_QUICK.md** — FINAL comprehensive update. Must reflect the COMPLETE prism-platform capability set. Every dispatcher, every action, every plugin, every routing path.
02383 | 
02384 | 2. **AutoPilot/Orchestrator** — Final verification: every query type routes correctly through prism-platform. No mcp-server fallbacks. Test 20 representative queries.
02385 | 
02386 | 3. **PRISM_QUICK_REF.md** — Final regeneration with all system identifiers.
02387 | 
02388 | 4. **Session Memory** — Final quality audit. All 15 categories populated. Remove garbage entries.
02389 | 
02390 | 5. **Claude Memory** — Update: pre-migration state, all gates passed/pending, rollback procedure.
02391 | 
02392 | 6. **Migration Certification** — Write MIGRATION_CERT.md with every test result, every metric, sign-off status.
02393 | 
02394 | 7. **Rollback Procedures** — Verify rollback to mcp-server is config-change-only. Test. Time. Must be < 30 seconds.
02395 | 
02396 | 8. **Agent Count** — Final count. Document complete agent roster for post-migration reference.
02397 | 
02398 | 9. **Cross-Track Flags** — ALL flags must be resolved. Any remaining [SYNTHETIC_DATA] or [DEFERRED] flags are BLOCKERS for migration.
02399 | 
02400 | 10. **Safety-Critical Test Matrix** — Run against BOTH codebases. All 50 calculations must produce identical results within ±2σ. This is a HARD BLOCK for migration.
02401 | 
02402 | **EXIT:** Migration certification complete. SAU-Full complete. GSD is definitive. All 15 gates pass (including human review gate — v8.5). All cross-track flags resolved. Safety test matrix passes on both codebases. HUMAN_REVIEW_LOG.md: H-1 through H-4 complete with zero unresolved [REJECTED] entries. COHERENCE_AUDIT.md: zero MAJOR drift items. Rollback tested. Agent roster finalized. External backup verified. Go/no-go for mcp-server retirement.
02403 | 
02404 | ---
02405 | 
02406 | # SECTION 5: PHASE STRUCTURE — DETAILED MICROSESSION SPECIFICATIONS
02407 | 
02408 | *Every MS is executable from cold start. No "Same as v3." Every step names tools. Build only the changed codebase unless both are touched.*
02409 | 
02410 | ---
02411 | 
02412 | ## PHASE P0: SHARED FOUNDATION
02413 | 
02414 | **Sessions: 4-5 | Microsessions: 11 + SU-1 | Chats: 3**
02415 | 
02416 | **PURPOSE:** Validate the development environment, fix the broken foundation (registries, API, calculations), build survival infrastructure (compaction armor, context budget), scaffold prism-platform, and import all core systems. Everything downstream depends on P0.
02417 | 
02418 | **CHAT MAP:**
02419 | - Chat 1: P-P0-MS0 → MS1 → MS2 → MS3 → MS4
02420 | - Chat 2: P-P0-MS5 → MS6 → MS7 → MS8
02421 | - Chat 3: P-P0-MS9 → MS10 → **SU-1**
02422 | 
02423 | ---
02424 | 
02425 | ### P-P0-MS0: Environment Smoke Test
02426 | 
02427 | **Effort:** ~5 tool calls | **Quality Tier:** QUICK
02428 | 
02429 | **ENTRY CONDITIONS:**
02430 | - This is the TRUE first microsession. No prior state required.
02431 | - C:\PRISM\ exists as a directory.
02432 | 
02433 | **STEPS (exact commands):**
02434 | 
02435 | 1. Verify directory structure:
02436 |    ```
02437 |    prism_dev action=file_read path="C:\PRISM"
02438 |    → Expect: mcp-server\, state\, scripts\ (create if missing), docs\ (create if missing), archive\ (create if missing)
02439 |    ```
02440 | 2. Verify toolchain (via bash or Desktop Commander):
02441 |    ```
02442 |    node --version    → expect ≥ 18
02443 |    python --version  → expect ≥ 3.10
02444 |    npx esbuild --version → expect available
02445 |    If any missing → STOP, document what to install.
02446 |    ```
02447 | 3. Verify .env:
02448 |    ```
02449 |    prism_dev action=file_read path="C:\PRISM\mcp-server\.env"
02450 |    → Expect: ANTHROPIC_API_KEY present, non-empty, starts with "sk-"
02451 |    → Also check: HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL keys present
02452 |    If missing → STOP, ask user for key.
02453 |    ```
02454 | 4. Verify build:
02455 |    ```
02456 |    prism_dev action=build target=mcp-server
02457 |    → If fails: document errors for MS1
02458 |    ```
02459 | 5. Verify MASTER_INDEX exists and is current:
02460 |    ```
02461 |    prism_doc action=read name=MASTER_INDEX.md
02462 |    → Expect: 302+ lines, "27 dispatchers, 324 verified actions" on line 6
02463 |    → Check for these 5 known corrections needed (from v7.1 audit):
02464 |      1. Section 12 (GSD) incomplete — lists only 2 files, should list all 16 with line counts
02465 |      2. Section 7 has script count but no script names — enumerate 10 most-used
02466 |      3. Missing Section 6B for utility files (autoDocAntiRegression, responseSlimmer, etc.)
02467 |      4. Section 1 footer missing KNOWN_RENAMES count (180-190)
02468 |      5. Section 14 summary counts may not match corrected values (137 skills, 75 scripts)
02469 |    → Apply corrections if you have tool access. If not, flag [MASTER_INDEX_CORRECTIONS_NEEDED].
02470 |    → If MASTER_INDEX missing entirely → flag [MASTER_INDEX_MISSING], not a blocker for P0 but must create before P0-MS5
02471 |    ```
02472 | 6. Write env_smoke_test.py (~80 lines) to C:\PRISM\scripts\: automates all above checks for future re-runs.
02473 | 7. **Choose external backup destination (NEW in v8.5):** Document choice in C:\PRISM\docs\ENV_CONFIG.md — Options: external USB drive, network share, cloud sync (OneDrive/Google Drive/S3). If no external storage available, document as [SINGLE_DISK_RISK] and prioritize acquisition. At minimum, identify a non-C: partition if one exists.
02474 | 
02475 | **TOOLS:** prism_dev→file_read, prism_dev→build, prism_dev→file_write
02476 | 
02477 | **EXIT CONDITIONS:**
02478 | - Node ≥ 18, Python ≥ 3.10, esbuild available
02479 | - .env exists with API key and model strings
02480 | - mcp-server builds (or errors are documented for MS1)
02481 | - C:\PRISM\scripts\, C:\PRISM\docs\, C:\PRISM\state\, C:\PRISM\archive\ all exist
02482 | - MASTER_INDEX.md verified (or [MASTER_INDEX_MISSING] flagged)
02483 | - env_smoke_test.py operational
02484 | - ENV_CONFIG.md created with external backup destination (or [SINGLE_DISK_RISK] documented)
02485 | 
02486 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS0 COMPLETE. Environment status documented. External backup destination chosen. Any build errors noted for MS1.
02487 | 
02488 | ---
02489 | 
02490 | ### P-P0-MS1: Registry Loading Fix + Diagnostic Skill (CRITICAL PATH)
02491 | 
02492 | **Effort:** ~22 tool calls | **Quality Tier:** DEEP
02493 | 
02494 | **ENTRY CONDITIONS:**
02495 | - P-P0-MS0 COMPLETE (environment verified)
02496 | - C:\PRISM\mcp-server\ is the active server
02497 | - Materials currently loading 707/3,518. Machines 2/824. Alarms 0/9,200.
02498 | 
02499 | **STEPS:**
02500 | 
02501 | 1. Load prism-registry-diagnostics skill from skills-consolidated/
02502 | 2. **DATA AVAILABILITY AUDIT:** Before fixing paths, count raw data. prism_dev→file_read: scan ALL data/ directories recursively. Count: total unique material entries across all files, total machine entries, total alarm entries. Record as RAW_AVAILABLE_MATERIALS, RAW_AVAILABLE_MACHINES, RAW_AVAILABLE_ALARMS. These are the REAL ceilings.
02503 | 3. prism_dev→code_search: find all file discovery paths in MaterialRegistry.ts, MachineRegistry.ts, AlarmRegistry.ts
02504 | 4. prism_dev→file_read: data/ directory structure. Map actual paths vs expected paths.
02505 | 5. Run registry_health_check.py (install to C:\PRISM\scripts\): scan all data directories, report exact path mismatches
02506 | 6. Fix MaterialRegistry loading paths. Verify with prism_data→material_lookup for: 4140 steel, 6061 aluminum, Ti-6Al-4V, Inconel 718
02507 | 7. Fix MachineRegistry loading paths. Verify with prism_data→machine_lookup for: HAAS VF-2, DMG MORI NLX, Mazak QTN
02508 | 8. Fix AlarmRegistry loading paths. Verify with prism_data→alarm_lookup for: FANUC 414, SIEMENS 25000, HAAS 108
02509 | 9. prism_validate→validate_completeness: verify loaded counts against RAW_AVAILABLE totals
02510 | 10. Install SYS-REGISTRY-HEALTH hook: fires on every session_boot, blocks if any critical registry < 50% of RAW_AVAILABLE
02511 | 11. **Create HOOK_MANIFEST.json (NEW in v8.5):** Write to C:\PRISM\state\HOOK_MANIFEST.json with schema_version=1, inherited_count=117, first new_hooks entry for SYS-REGISTRY-HEALTH (status=ACTIVE). expected_total = inherited_count + active new hooks. This is the source-of-truth for system_self_test.py check #3.
02512 | 12. Build mcp-server (npm run build with esbuild), restart, verify all registries loading
02513 | 
02514 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_data (all lookup actions), prism_validate→validate_completeness, prism_hook→execute
02515 | 
02516 | **AGENTS/SWARMS:** OPUS debugger + root_cause_analyst via parallel swarm. HAIKU material_lookup + tool_lookup for fast verification.
02517 | 
02518 | **HOOKS INSTALLED:** SYS-REGISTRY-HEALTH
02519 | 
02520 | **EXIT CONDITIONS:**
02521 | - Materials loading > 95% of RAW_AVAILABLE_MATERIALS (document exact count)
02522 | - Machines loading > 95% of RAW_AVAILABLE_MACHINES (document exact count)
02523 | - Alarms loading > 95% of RAW_AVAILABLE_ALARMS (document exact count)
02524 | - If RAW_AVAILABLE < theoretical max → [DATA_GAP] flag with exact gap documented
02525 | - SYS-REGISTRY-HEALTH hook installed and passing
02526 | - HOOK_MANIFEST.json created with inherited_count=117, SYS-REGISTRY-HEALTH entry (v8.5)
02527 | - registry_health_check.py operational
02528 | 
02529 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS1 COMPLETE with exact registry counts AND raw available counts. MFG_STATE.md: registry status, paths fixed. SESSION_INSIGHTS.md: `[PATTERN] Path resolution patterns found | [DATA_GAP] X materials missing from raw files if applicable`.
02530 | 
02531 | ---
02532 | 
02533 | ### P-P0-MS2: API Key Verification + Ralph Validation
02534 | 
02535 | **Effort:** ~10 tool calls | **Quality Tier:** STANDARD
02536 | 
02537 | **ENTRY CONDITIONS:**
02538 | - P-P0-MS1 COMPLETE (registries loading > 95% of available)
02539 | - Build passes (npm run build)
02540 | 
02541 | **STEPS:**
02542 | 
02543 | 1. prism_dev→file_read: C:\PRISM\mcp-server\.env — verify ANTHROPIC_API_KEY present. Check claude_desktop_config.json — verify env section contains matching key. If mismatch → fix, document.
02544 | 2. prism_agent→agent_invoke: run ralph_loop with trivial prompt ("What is 2+2? Verify."). Expected: generate→critique→refine completes.
02545 | 3. Test each agent tier: HAIKU echo test, SONNET echo test, OPUS echo test. Record response times for baseline. **Read model strings from .env — do NOT hardcode.**
02546 | 4. prism_hook→register: SYS-API-KEY-VERIFY, trigger=session_boot, priority=5. Verify fires.
02547 | 5. Build mcp-server only (npm run build with esbuild). Restart. Verify hook passes.
02548 | 
02549 | **TOOLS:** prism_dev→file_read, prism_dev→edit_block, prism_agent→agent_invoke, prism_hook→register
02550 | 
02551 | **HOOKS INSTALLED:** SYS-API-KEY-VERIFY
02552 | 
02553 | **EXIT CONDITIONS:**
02554 | - API key in BOTH .env AND claude_desktop_config.json
02555 | - ralph_loop completes full cycle
02556 | - HAIKU + SONNET + OPUS tiers respond
02557 | - SYS-API-KEY-VERIFY installed and passing
02558 | - Response time baselines in HANDOFF.json
02559 | - Model strings confirmed read from config (not hardcoded in source)
02560 | 
02561 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS2 COMPLETE. HANDOFF.json: agent tier response times, config state, model strings.
02562 | 
02563 | ---
02564 | 
02565 | ### P-P0-MS3: Compaction Armor + Triple-Redundant Survival
02566 | 
02567 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP
02568 | 
02569 | **ENTRY CONDITIONS:**
02570 | - P-P0-MS2 COMPLETE (API verified, agents operational)
02571 | - C:\PRISM\state\ writable (verified in MS0)
02572 | 
02573 | **STEPS:**
02574 | 
02575 | 1. prism_dev→code_search: "compaction" in src/ — find CompactionManager.ts. prism_dev→file_read: document current survival mechanism.
02576 | 2. Write compaction_armor.py (~250 lines) to C:\PRISM\scripts\:
02577 |    - Writes to THREE locations: COMPACTION_SURVIVAL.json (primary), BACKUP_STATE.json (secondary), EMERGENCY_RESUME.md (human-readable)
02578 |    - Each write verified with read-back
02579 |    - Manifest with SHA-256 checksums
02580 |    - Contents: current MS ID, ATCS position (empty for now), pending items, context snapshot, registry counts
02581 | 3. Test: execute with mock state, verify all 3 files, verify checksums, verify EMERGENCY_RESUME.md readable.
02582 | 4. prism_hook→register: PLATFORM-COMPACTION-ARMOR, trigger=pressure>=50%, priority=0 (fires FIRST).
02583 | 5. prism_hook→register: PLATFORM-ATCS-CHECKPOINT-SYNC, trigger=atcs_checkpoint, priority=5. **NOTE: Registered as PENDING — ATCS is not imported until P0-MS8. Hook will activate automatically when ATCS import wires the checkpoint trigger at MS8. This is correct behavior per hook dependency checking (P0-MS7 Step 8).**
02584 | 6. prism_hook→register: PLATFORM-CONTEXT-BUDGET, trigger=every_3_calls, priority=35.
02585 | 7. Integration test: simulate pressure ≥ 50%, verify armor fires, all 3 files written, checksums valid.
02586 | 8. **Import autoDocAntiRegression.ts (~150L) from mcp-server** (NEW in v8.2):
02587 |    - Copy to prism-platform/src/core/autoDocAntiRegression.ts
02588 |    - Wire to fire on ALL .md file writes (pre-write hook)
02589 |    - Creates doc_baselines.json in C:\PRISM\state\ to track file sizes
02590 |    - Test: >30% size reduction on .md write → WARN in TelemetryEngine. >60% → BLOCK write.
02591 |    - Verify doc_baselines.json tracks current file sizes for ROADMAP_TRACKER.md, SESSION_INSIGHTS.md
02592 | 9. Build mcp-server only. Restart. Verify hooks registered.
02593 | 
02594 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_hook→register, prism_hook→execute
02595 | 
02596 | **HOOKS INSTALLED:** PLATFORM-COMPACTION-ARMOR, PLATFORM-ATCS-CHECKPOINT-SYNC (PENDING until P0-MS8 ATCS import), PLATFORM-CONTEXT-BUDGET
02597 | 
02598 | **EXIT CONDITIONS:**
02599 | - compaction_armor.py exists and passes test
02600 | - 3 hooks installed and verified
02601 | - All 3 survival locations writable and readable
02602 | - Checksum validation passes
02603 | - Context budget projecting correctly
02604 | - autoDocAntiRegression.ts imported, doc_baselines.json created, WARN/BLOCK thresholds verified
02605 | 
02606 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS3 COMPLETE. HANDOFF.json: survival file paths, hook IDs, pressure baseline.
02607 | 
02608 | ---
02609 | 
02610 | ### P-P0-MS4: Calc Bug Fix + Telemetry + Todo Reset + Self-Test + Quick-Ref Generator
02611 | 
02612 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP
02613 | 
02614 | **ENTRY CONDITIONS:**
02615 | - P-P0-MS3 COMPLETE (compaction armor operational)
02616 | - Known calc bug (GAP-002)
02617 | - TelemetryEngine exists
02618 | 
02619 | **STEPS:**
02620 | 
02621 | 1. prism_dev→code_search: GAP-002 calc functions. prism_dev→file_read: affected files. Document: what's wrong, correct behavior, affected formulas.
02622 | 2. prism_dev→edit_block: fix calculation. State exact lines changed. Verify with:
02623 |    - prism_validate→validate_calculation: 4140 steel annealed roughing carbide → known Vc/fz
02624 |    - prism_validate→validate_calculation: 6061-T6 aluminum finishing HSS → known values
02625 |    - Both must pass S(x) ≥ 0.70
02626 | 3. prism_dev→file_read: TelemetryEngine.ts (~609 lines). Verify capturing: dispatcher calls, hook firings, errors, timing.
02627 | 4. Write todo_phase_reset.py (~100 lines) to C:\PRISM\scripts\.
02628 | 5. prism_hook→register: SYS-PHASE-TODO-RESET, trigger=phase_change, priority=30. Test.
02629 | 6. Write system_self_test.py (~120 lines) to C:\PRISM\scripts\: 5 checks.
02630 | 7. Write quick_ref_generator.py (~120 lines) to C:\PRISM\scripts\.
02631 | 8. Build mcp-server only. Run calcs end-to-end. Verify telemetry captures events.
02632 | 3b. **Structured Logging with Correlation IDs (v10.0):**
02633 |     Enhance TelemetryEngine with correlation ID support:
02634 |     - Every dispatcher call generates a unique correlationId (UUID v4)
02635 |     - correlationId flows through: autoHookWrapper → hook chain → engine calls → script invocations
02636 |     - TelemetryEngine.log() accepts: { correlationId, source, level, message, context }
02637 |     - Log levels: DEBUG, INFO, WARN, ERROR, SAFETY (safety is highest — always persisted)
02638 |     - SAFETY level auto-triggers: persist to WAL (if E1 complete), increment error counter,
02639 |       fire PLATFORM-ERROR-PATTERN with full correlation trace
02640 |     - Verify: trigger prism_calc→speed_feed, read TelemetryEngine log, verify correlation trace
02641 |       contains all expected nodes (dispatcher → hooks → engine → response)
02642 | 
02643 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→edit_block, prism_dev→file_write, prism_validate→validate_calculation, prism_data→material_lookup, prism_hook→register
02644 | 
02645 | **HOOKS INSTALLED:** SYS-PHASE-TODO-RESET
02646 | 
02647 | 
02648 | **EXIT CONDITIONS:**
02649 | - Calc bug fixed, test calculations correct with S(x) ≥ 0.70
02650 | - TelemetryEngine operational with correlation ID support (v10.0)
02651 | - SAFETY log level persists correctly (v10.0)
02652 | - todo_phase_reset.py + hook wired and tested
02653 | - system_self_test.py cadence registered (9 checks including state coherence, disk space, API version, build pipeline, safety trace)
02654 | - quick_ref_generator.py operational and produces valid PRISM_QUICK_REF.md
02655 | - Build passes
02656 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS4 COMPLETE. SESSION_INSIGHTS.md: `[REGRESSION] GAP-002 root cause | [PATTERN] calc fix approach`.
02657 | 
02658 | ---
02659 | 
02660 | ### P-P0-MS5: Scaffold prism-platform Project
02661 | 
02662 | **Effort:** ~18 tool calls | **Quality Tier:** STANDARD
02663 | 
02664 | **ENTRY CONDITIONS:**
02665 | - P-P0-MS4 COMPLETE
02666 | - C:\PRISM\prism-platform\ does not exist or is empty
02667 | 
02668 | **STEPS:**
02669 | 
02670 | 0. **Read MASTER_INDEX.md as scaffold blueprint (CRITICAL):**
02671 |    ```
02672 |    prism_doc action=read name=MASTER_INDEX.md
02673 |    → Parse Section 1: Extract all 27 dispatcher names and their action lists
02674 |    → Parse Section 4: Extract all 29 engine names and line counts
02675 |    → Parse Section 5: Extract all 19 registry names and line counts
02676 |    → Parse Section 9: Extract all 5 type definition files
02677 |    → Use these ACTUAL lists to create stubs — do NOT hardcode counts
02678 |    ```
02679 | 1. Create C:\PRISM\prism-platform\. npm init. Install: typescript, esbuild, @anthropic-ai/sdk (pinned version). Create tsconfig.json (strict, noEmit for type checking), esbuild.config.js with incremental rebuild (v10.0 Section 3.18).
02680 | 2. Create directory structure: src/{core, core/types, core/errors, plugins, engines, agents, providers}, data/, docs/, tests/
02681 | 3. **Import type definitions FIRST** (they define all param/result interfaces):
02682 |    ```
02683 |    prism_dev action=file_read path="C:\PRISM\mcp-server\src\types\prism-schema.ts"
02684 |    → Copy to prism-platform/src/core/types/ (689 lines)
02685 |    prism_dev action=file_read path="C:\PRISM\mcp-server\src\types\telemetry-types.ts"
02686 |    → Copy (246 lines)
02687 |    → Repeat for graph-types.ts (193L), pfp-types.ts (186L), certificate-types.ts (105L)
02688 |    → Total: 5 files, 1,419 lines — the TypeScript foundation for everything
02689 |    ```
02690 | 4. **Create PrismError class hierarchy (v10.0 CM-1):**
02691 |    Write src/core/types/error-types.ts (~150 lines):
02692 |    ```typescript
02693 |    export class PrismError extends Error {
02694 |      code: string; severity: 'warning' | 'fault' | 'safety'; correlationId?: string;
02695 |    }
02696 |    export class CalcError extends PrismError { material: string; operation: string; }
02697 |    export class SafetyError extends CalcError { threshold: number; actual: number; }
02698 |    export class RegistryError extends PrismError { registry: string; path: string; }
02699 |    ```
02700 |    Wire to CalcHookMiddleware for typed error dispatch (not string matching).
02701 | 5. **Create DataProvider interface + JsonFileProvider + CalcModelRegistry (v9.0):**
02702 |    Write src/core/DataProvider.ts, src/providers/JsonFileProvider.ts, src/core/CalcModelRegistry.ts per Section 3.13 and 3.14. **JsonFileProvider uses synchronous reads wrapped in Promise.resolve() (v10.0 CM-3) — zero behavior change. Async only when swapping to truly async backend.** **DataProvider marked PROVISIONAL (v10.0 ER-5) — may be revised after M-M2 campaign query pattern analysis.**
02703 | 6. Write src/plugins/PluginInterface.ts: definePlugin(manifest), loadPlugin(path), unloadPlugin(id). **Include dependency resolution (v10.0 ZT-5):** manifest.dependencies[], manifest.provides[], topological sort on load, uninstall protection. **Include resource limits (v10.0 ER-12) for CALC_MODIFY tier.**
02704 | 7. Write src/plugins/manufacturing/manifest.json: For EACH of the 27 dispatchers from MASTER_INDEX Section 1, create a stub with the exact action list. Every stub throws "not yet imported — use mcp-server fallback."
02705 | 8. **Create build pipeline (v10.0 Section 3.18):**
02706 |    - Configure esbuild.config.js with incremental: context() + rebuild()
02707 |    - Configure package.json scripts: typecheck, compile, test:critical, build, build:fast
02708 |    - Create test_critical_runner.py (~120 lines) — orchestrates test:critical
02709 |    - Create hook_smoke_test.py (~80 lines) — verifies hooks callable
02710 |    - Create safety_calc_test_matrix_extensions.json (empty, ready for extensions)
02711 |    - Commit package-lock.json
02712 |    - **NOTE: test:critical will partially skip until safety_calc_test_matrix.py exists (P0-MS4 creates it). Runner gracefully skips missing checks with WARN.**
02713 | 9. Build prism-platform using full pipeline: tsc --noEmit + esbuild + test:critical. Verify clean.
02714 | 10. Write docs/PLATFORM_STATE.md + docs/IMPORT_LOG.md. Create SYNC_MANIFEST.json. Create API_VERSION.json (v1.0.0). Create EXTENSION_REGISTRY.json.
02715 | 11. Create .env with HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL keys matching mcp-server/.env values.
02716 | 12. **Export KNOWN_RENAMES as JSON config:**
02717 |     ```
02718 |     prism_dev action=file_read path="C:\PRISM\mcp-server\src\dispatchers\guardDispatcher.ts"
02719 |     → Extract the KNOWN_RENAMES map (180-190 entries)
02720 |     → Write to C:\PRISM\prism-platform\data\config\known_renames.json
02721 |     ```
02722 | 
02723 | **TOOLS:** prism_dev→file_write, prism_dev→file_read, prism_doc→read
02724 | 
02725 | **EXIT CONDITIONS:**
02726 | - prism-platform/ exists, builds clean through FULL pipeline (typecheck + compile + test:critical)
02727 | - Plugin interface defined WITH dependency resolution and resource limits
02728 | - Manufacturing manifest lists all 27 dispatchers from MASTER_INDEX
02729 | - All 5 type definition files imported (1,419 lines) + error-types.ts (v10.0)
02730 | - PrismError hierarchy defined and wired to error pattern matching
02731 | - DataProvider + JsonFileProvider + CalcModelRegistry created (v9.0), DataProvider marked PROVISIONAL (v10.0)
02732 | - KNOWN_RENAMES exported as JSON config (≥180 entries)
02733 | - .env created with model strings from config (not hardcoded)
02734 | - esbuild incremental mode configured
02735 | - package-lock.json committed
02736 | - test:critical runner operational (gracefully handles missing checks)
02737 | - safety_calc_test_matrix_extensions.json created (empty)
02738 | 
02739 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS5 COMPLETE. IMPORT_LOG.md: "Scaffold created from MASTER_INDEX, 6 type defs imported (5 original + 1 error-types), KNOWN_RENAMES exported, build pipeline configured."
02740 | 
02741 | ---
02742 | 
02743 | 
02744 | ### P-P0-MS6: Import Context Management + Compaction Detection + Tier 0 Engines
02745 | 
02746 | **Effort:** ~22 tool calls | **Quality Tier:** DEEP
02747 | 
02748 | **ENTRY CONDITIONS:**
02749 | - P-P0-MS5 COMPLETE (prism-platform scaffolded, builds clean)
02750 | - compaction_armor.py from P0-MS3 operational
02751 | 
02752 | **STEPS:**
02753 | 
02754 | 1. prism_dev→code_search + file_read: ContextManager.ts, CompactionManager.ts in mcp-server. Document exports, deps, line counts.
02755 | 2. Analyze dependencies: internal imports, external packages, types. Map what exists in prism-platform vs needs importing.
02756 | 3. Copy ContextManager to prism-platform/src/core/. Adapt imports. Verify: pressure calculation, cap enforcement, context tracking.
02757 | 4. Copy CompactionManager to prism-platform/src/core/. Adapt imports. Wire to compaction_armor.py.
02758 | 5. **Import AND wire SessionLifecycleEngine (351L):**
02759 |    - prism_dev→file_read: SessionLifecycleEngine.ts from mcp-server. Copy to prism-platform/src/engines/.
02760 |    - Boot: SessionLifecycleEngine orchestrates prism_dev→session_boot sequence (load state, GSD, memories, integrity check)
02761 |    - Shutdown: SessionLifecycleEngine calls state_save, HANDOFF.json write, SESSION_INSIGHTS append
02762 |    - Wire cadence function autoSessionLifecycle to fire at session start/end
02763 |    - ContextManager reads session state FROM SessionLifecycleEngine (not independently)
02764 | 6. **Import AND wire ComputationCache (420L):**
02765 |    - prism_dev→file_read: ComputationCache.ts from mcp-server. Copy to prism-platform/src/engines/.
02766 |    - prism_calc→speed_feed, prism_calc→cutting_force, prism_calc→tool_life ALL check ComputationCache before computing
02767 |    - Cache key = material_id + operation + tool + parameters hash
02768 |    - Cache invalidation: on registry update, on formula accuracy correction, on data campaign batch completion
02769 |    - Wire PLATFORM-CONTEXT-BUDGET to flush ComputationCache when context pressure > 85% (free memory)
02770 | 7. Integration: verify ContextManager pressure feeds PLATFORM-CONTEXT-BUDGET hook. Verify CompactionManager calls compaction_armor.py at ≥ 50%.
02771 | 8. **Import AND wire DiffEngine (196L):**
02772 |    - prism_dev→file_read: DiffEngine.ts from mcp-server. Copy to prism-platform/src/engines/.
02773 |    - drift_detector.py (P1-MS8) calls DiffEngine.diff(previousState, currentState) to detect changes
02774 |    - codebase_sync_check.py uses DiffEngine for file comparison
02775 |    - SYS-DRIFT-CHECK hook passes results through DiffEngine before logging to DRIFT_LOG.md
02776 | 9. prism_validate→validate_anti_regression: compare imports against source. No lost exports, no missing types. **Verify imported line counts: SessionLifecycleEngine=351L, ComputationCache=420L, DiffEngine=196L match MASTER_INDEX.**
02777 | 10. Build prism-platform only. Test: ContextManager tracks size, CompactionManager detects thresholds, armor fires on simulated pressure, ComputationCache caches and invalidates, SessionLifecycleEngine boots and shuts down cleanly.
02778 | 
02779 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_dev→edit_block, prism_validate→validate_anti_regression
02780 | 
02781 | **EXIT CONDITIONS:**
02782 | - ContextManager and CompactionManager imported and operational
02783 | - Compaction armor integration verified
02784 | - Context budget hook works with imported ContextManager
02785 | - SessionLifecycleEngine imported (351L) and orchestrates boot/shutdown sequence (verified)
02786 | - ComputationCache imported (420L) and caches calculation results and invalidates on registry update (verified)
02787 | - DiffEngine imported (196L) and detects state changes for drift detection (verified)
02788 | - Anti-regression passes, prism-platform builds
02789 | 
02790 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS6 COMPLETE. IMPORT_LOG.md: ContextManager + CompactionManager + SessionLifecycleEngine (351L) + ComputationCache (420L) + DiffEngine (196L) with line counts.
02791 | 
02792 | ---
02793 | 
02794 | ### P-P0-MS7: Import Dispatcher Pattern + Hook Engine + CalcHookMiddleware
02795 | 
02796 | **Effort:** ~20 tool calls | **Quality Tier:** DEEP
02797 | 
02798 | **ENTRY CONDITIONS:**
02799 | - P-P0-MS6 COMPLETE (Tier 0 engines imported: SessionLifecycleEngine, ComputationCache, DiffEngine)
02800 | - prism-platform PluginInterface operational
02801 | 
02802 | **STEPS:**
02803 | 
02804 | 1. prism_dev→code_search + file_read: DispatcherRegistry/dispatcherMap in mcp-server.
02805 | 2. prism_dev→code_search + file_read: hookRegistration.ts, autoHookWrapper.ts (1,559 lines — this is the universal hook proxy that MAKES hooks fire).
02806 | 3. Import dispatcher pattern to src/core/. KEY ADAPTATION: dispatchers register through PluginInterface, not hardcoded.
02807 | 4. Import hook engine to src/core/. This means importing ALL THREE engine files:
02808 |    - HookEngine.ts (802L) — hook registration/execution framework
02809 |    - HookExecutor.ts (835L) — hook chain execution
02810 |    - EventBus.ts (656L) — event system for hook triggers
02811 |    KEY ADAPTATION: system hooks (SYS-*) at boot, plugin hooks on plugin load.
02812 | 5. Import autoHookWrapper.ts pattern (1,559L). This is the mechanism that wraps all dispatchers with before/after/error hooks. Without it, hooks are registered but never fire.
02813 | 6. **Import AND wire CalcHookMiddleware (269L):**
02814 |    - CalcHookMiddleware wraps ONLY calculation dispatchers (prism_calc, prism_thread, prism_toolpath)
02815 |    - BEFORE calc: injects formula recommendations (from PLATFORM-FORMULA-RECOMMEND), checks ComputationCache (imported at P0-MS6), logs input params to TelemetryEngine
02816 |    - AFTER calc: writes result to ComputationCache, updates formula accuracy tracker, triggers S(x) validation
02817 |    - CalcHookMiddleware is SEPARATE from autoHookWrapper: autoHookWrapper handles all dispatchers generically, CalcHookMiddleware adds calculation-specific pre/post logic
02818 |    - Wire: autoHookWrapper calls CalcHookMiddleware.before() and .after() for calc dispatchers only
02819 |    - NOTE: CalcHookMiddleware is Tier 2 by classification but imported here early because it must be wired alongside autoHookWrapper for correct calc dispatch behavior.
02820 | 7. Also import engine infrastructure:
02821 |    - index.ts (300L) — engine registration and bootstrapping
02822 |    - hookRegistration.ts (~400L) — boot-time hook wiring
02823 | 8. ADD hook dependency checking: on register, verify script/file deps exist. If missing → PENDING, not ACTIVE.
02824 | 9. prism_validate→validate_anti_regression: same exports, same signatures. **Verify imported line counts match MASTER_INDEX line counts — if less, content was lost.**
02825 | 10. Integration test: register test dispatcher through plugin → verify routing. Register test hook → verify firing. Register hook with missing dep → verify PENDING state.
02826 | 11. Build BOTH codebases (both touched — cross-referencing patterns).
02827 | 
02828 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_dev→edit_block, prism_validate→validate_anti_regression
02829 | 
02830 | **EXIT CONDITIONS:**
02831 | - Dispatcher pattern imported with plugin registration
02832 | - Hook engine imported (HookEngine + HookExecutor + EventBus = 2,293 lines)
02833 | - autoHookWrapper pattern imported (1,559 lines)
02834 | - CalcHookMiddleware imported (269L) and wired to autoHookWrapper for calc dispatchers
02835 | - Engine infrastructure imported (index.ts 300L + hookRegistration.ts ~400L)
02836 | - Hook dependency checking implemented (PENDING state)
02837 | - Test dispatcher routes, test hook fires, missing-dep hook goes PENDING
02838 | - Anti-regression passes, both codebases build
02839 | - IMPORT_LOG.md records line counts matching MASTER_INDEX
02840 | 
02841 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS7 COMPLETE. IMPORT_LOG.md: dispatcher + hook engine + CalcHookMiddleware + infrastructure files with line counts.
02842 | 
02843 | ---
02844 | 
02845 | ### P-P0-MS8: Import ATCS + Workflow State Machine
02846 | 
02847 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP
02848 | 
02849 | **ENTRY CONDITIONS:**
02850 | - P-P0-MS7 COMPLETE (dispatcher + hooks routing correctly)
02851 | 
02852 | **STEPS:**
02853 | 
02854 | 1. prism_dev→code_search + file_read: ATCS dispatcher (all 10 actions). Document deps and state locations.
02855 | 2. prism_dev→code_search + file_read: WorkflowState/state_machine. Document states, transitions, persistence.
02856 | 3. Import ATCS as platform service (src/core/atcs/) — infrastructure, not plugin. State storage: C:\PRISM\autonomous-tasks\. Wire checkpoint to PLATFORM-ATCS-CHECKPOINT-SYNC.
02857 | 4. Import workflow state machine to src/core/workflow/. Verify transitions match mcp-server.
02858 | 5. Test: create mock ATCS task → checkpoint → verify COMPACTION_SURVIVAL.json has ATCS position.
02859 | 6. prism_validate→validate_anti_regression: all 10 actions present.
02860 | 7. Build prism-platform only. Test queue_next→unit_complete→batch_validate→checkpoint→replan loop.
02861 | 
02862 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_validate→validate_anti_regression, prism_hook→execute
02863 | 
02864 | **EXIT CONDITIONS:**
02865 | - ATCS imported, all 10 actions operational
02866 | - Workflow state machine imported with correct transitions
02867 | - ATCS checkpoint → compaction survival sync verified
02868 | - Full ATCS loop tested
02869 | - Build passes
02870 | 
02871 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS8 COMPLETE. IMPORT_LOG.md: ATCS + workflow files.
02872 | 
02873 | ---
02874 | 
02875 | ### P-P0-MS9: Import Agent/Swarm Executors + Cadence System
02876 | 
02877 | **Effort:** ~20 tool calls | **Quality Tier:** DEEP
02878 | 
02879 | **ENTRY CONDITIONS:**
02880 | - P-P0-MS8 COMPLETE (ATCS operational)
02881 | - API key verified (P0-MS2)
02882 | 
02883 | **STEPS:**
02884 | 
02885 | 1. prism_dev→code_search + file_read: AgentExecutor.ts (818L) in mcp-server. Document: tiers, invocation, governance, error handling, timeouts.
02886 | 2. prism_dev→code_search + file_read: SwarmExecutor.ts (953L) — 8 swarm patterns including ralph_loop.
02887 | 3. prism_dev→code_search + file_read: cadenceExecutor.ts (**2,246 lines** — this is the system heartbeat). Contains 30 auto-fire functions. Also import responseSlimmer.ts (~200L — truncation caps).
02888 | 4. Import agent executors to src/agents/. **Model strings read from .env, not hardcoded.** Wire PLATFORM-COST-ESTIMATE. Import Tier 2 intelligence engines:
02889 |    - AgentExecutor.ts (818L), SwarmExecutor.ts (953L), BatchProcessor.ts (233L)
02890 |    - KnowledgeQueryEngine.ts (871L)
02891 |    - ResponseTemplateEngine.ts (669L), ScriptExecutor.ts (754L), SkillExecutor.ts (868L)
02892 |    - NOTE: CalcHookMiddleware.ts (269L) was already imported at P0-MS7 with autoHookWrapper. Do NOT re-import.
02893 | 5. **Wire ResponseTemplateEngine (669L):**
02894 |    - ALL dispatcher responses pass through ResponseTemplateEngine AFTER computation, BEFORE returning to user
02895 |    - Template selection based on: dispatcher type, output complexity, user context (from session memory)
02896 |    - Templates enforce: safety warnings on calculations, uncertainty bands on predictions, source citations on material data
02897 |    - responseSlimmer.ts calls ResponseTemplateEngine.truncate() — templates know which sections to cut first under pressure
02898 |    - Wire: autoHookWrapper post-output hook → ResponseTemplateEngine.format(result, context) → responseSlimmer.truncate(formatted)
02899 | 6. Import swarm patterns to src/agents/swarms/. Test ralph_loop through platform.
02900 | 7. Import cadence system to src/core/cadence/. Add 4 new: recovery_manifest, learning_extract, context_budget, agent_health_check. Total: 34.
02901 | 8. Import responseSlimmer to src/core/. Verify truncation caps: 20KB normal, 12KB at 60%, 8KB at 70%, 5KB at 85%.
02902 | 9. Test: HAIKU + SONNET + OPUS + ralph_loop through prism-platform. All three tiers must respond. **Read model strings from .env — do NOT hardcode.**
02903 | 10. prism_validate→validate_anti_regression. Build prism-platform only.
02904 | 
02905 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_agent→agent_invoke, prism_validate→validate_anti_regression
02906 | 
02907 | **HOOKS INSTALLED:** PLATFORM-COST-ESTIMATE
02908 | 
02909 | **EXIT CONDITIONS:**
02910 | - All agent tiers functional through platform (model strings from config)
02911 | - 8 swarm patterns imported, ralph_loop verified
02912 | - 34 cadence functions registered (30 original + 4 new)
02913 | - PLATFORM-COST-ESTIMATE fires pre-invoke
02914 | - Build passes
02915 | 
02916 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS9 COMPLETE. IMPORT_LOG.md: agents, swarms, cadence with line counts.
02917 | 
02918 | ---
02919 | 
02920 | ### P-P0-MS10: Dead Code + Integration Verify + Perf Smoke Test
02921 | 
02922 | **Effort:** ~18 tool calls | **Quality Tier:** STANDARD
02923 | 
02924 | **ENTRY CONDITIONS:**
02925 | - P-P0-MS9 COMPLETE
02926 | - Both codebases build clean
02927 | 
02928 | **STEPS:**
02929 | 
02930 | 1. **Model string verification:** Read .env files from BOTH codebases. Verify all agent tiers read from config. prism_dev→code_search for any hardcoded model strings in source — if found, replace with config reads. Test each tier responds.
02931 | 2. Dead code audit: unused imports, unreachable functions, commented blocks in prism-platform/src/. Remove. Track lines removed.
02932 | 3. Create SYNC_MANIFEST.json in BOTH codebases. First DRIFT_LOG.md entry: "Baseline established."
02933 | 4. Integration test: dispatcher call → hook fires → calculation runs → telemetry captures. Specific: prism_data→material_lookup("4140") through platform.
02934 | 5. Performance smoke test (3 metrics): material lookup latency (target < 50ms), hook chain overhead (target < 10ms/call), session boot time (target < 3s).
02935 | 6. Trigger system_self_test cadence. Verify all 7 checks pass (including state coherence, disk space, and API version).
02936 | 7. Build BOTH codebases (final P0 integration check).
02937 | 
02938 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→edit_block, prism_data→material_lookup, prism_validate→validate_completeness
02939 | 
02940 | **HOOKS INSTALLED:** PLATFORM-SYNC-MANIFEST
02941 | 
02942 | **EXIT CONDITIONS:**
02943 | - Model strings confirmed config-driven in BOTH codebases (zero hardcoded strings)
02944 | - Dead code removed
02945 | - SYNC_MANIFEST.json + DRIFT_LOG.md created
02946 | - Full integration chain works
02947 | - Performance smoke test baselines recorded
02948 | - System self-test passes (all 6 checks)
02949 | - BOTH codebases build
02950 | 
02951 | **HANDOFF:** ROADMAP_TRACKER.md: P-P0-MS10 COMPLETE — **P0 PHASE COMPLETE**. HANDOFF.json: full P0 summary. SESSION_INSIGHTS.md: all P0 patterns compiled. → Proceed to **SU-1** (which includes SAU-Full).
02952 | 
02953 | ---
02954 | 
02955 | ## PHASE P1: CONSOLIDATE & WIRE
02956 | 
02957 | **Sessions: 4-5 | Microsessions: 8 + SU-2 | Chats: 3 (Chats 3-4b)**
02958 | 
02959 | **PURPOSE:** Clean up inherited systems, wire intelligence features, build automation sandbox. After P1, the system is self-aware: recommends formulas, learns across sessions, detects drift.
02960 | 
02961 | **CHAT MAP:**
02962 | - Chat 3 (continued from P0 after SU-1): P-P1-MS1 → MS2
02963 | - Chat 4a: P-P1-MS3 → MS4 → MS5
02964 | - Chat 4b: P-P1-MS6 → MS7 → MS8 → **SU-2**
02965 | 
02966 | ---
02967 | 
02968 | ### P-P1-MS1: Script Audit, Cull, Sandbox, AND Self-Description
02969 | 
02970 | **Effort:** ~18 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P0 COMPLETE (SU-1 passed, SAU-Full complete).
02971 | 
02972 | **STEPS:**
02973 | 
02974 | 1. Scan all scripts → categorize ACTIVE/UNUSED/REDUNDANT → cull ~30% to archive.
02975 | 2. Write safe_script_runner.py → install PLATFORM-SCRIPT-SANDBOX hook → test BLOCK on write attempts.
02976 | 3. **Implement ScriptRegistry manifest scanning (v10.0 ZT-3):**
02977 |    - Implement ScriptRegistry.scanManifests() — scans scripts/core/ for PRISM_MANIFEST headers
02978 |    - Parse manifest fields: name, version, trigger, priority, dependencies, domain, sandbox
02979 |    - Auto-wire scripts to declared triggers (hook, cadence, boot, build, manual)
02980 |    - Scripts without manifests: register as legacy (manual invocation only)
02981 | 4. **Add PRISM_MANIFEST headers to key scripts:**
02982 |    - safety_calc_test_matrix.py: trigger=build, priority=0, sandbox=false
02983 |    - mfg_batch_validator.py: trigger=hook:MFG-CAMPAIGN-PROGRESS, priority=50, sandbox=true
02984 |    - registry_health_check.py: trigger=boot, priority=10, sandbox=false
02985 |    - system_self_test.py: trigger=cadence:autoSystemSelfTest, priority=10, sandbox=false
02986 |    - quick_ref_generator.py: trigger=cadence:autoQuickRefGen, priority=90, sandbox=false
02987 | 5. Test: verify manifest-described scripts auto-wire. Verify sandbox enforcement.
02988 | 
02989 | **HOOKS INSTALLED:** PLATFORM-SCRIPT-SANDBOX
02990 | 
02991 | **EXIT:** Script inventory complete, ~30% culled. Sandbox operational. BLOCK verified. ScriptRegistry manifest scanning operational. 5+ key scripts have PRISM_MANIFEST headers and auto-wire. Legacy scripts accessible via manual invocation.
02992 | 
02993 | ---
02994 | 
02995 | ### P-P1-MS2: Agent Consolidation with Downstream Cross-Reference
02996 | 
02997 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS1 COMPLETE.
02998 | 
02999 | List all agents → **cross-reference against ALL future phases (P2-E4) for KEEP list** → merge overlaps → target ~54 → update swarm references → test 5 representatives → document roster with KEEP flags.
03000 | 
03001 | **EXIT:** ~54 agents. No broken swarm references. All KEEP agents preserved. Roster documented.
03002 | 
03003 | ---
03004 | 
03005 | ### P-P1-MS3: Hook Triage, Priority Band Assignment, and Activation Wiring
03006 | 
03007 | **Effort:** ~20 tool calls | **Resource Profile:** CONTEXT-BOUND | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS2 COMPLETE.
03008 | 
03009 | **STEPS:**
03010 | 
03011 | 1. Enumerate ALL 117 inherited hooks → categorize KEEP/MODIFY/DISABLE.
03012 | 2. **Assign priority bands to ALL hooks (v10.0 ZT-6):**
03013 |    - Map each inherited hook to the appropriate priority band:
03014 |      0-9: CRITICAL, 10-29: SYSTEM, 30-49: PLATFORM, 50-69: MFG, 70-89: ENTERPRISE, 90-99: TELEMETRY
03015 |    - Document assignments in HOOK_MANIFEST.json (add priority_band field per hook)
03016 |    - Identify and resolve any priority collisions within same trigger group
03017 | 3. **Implement `register_with_manifest` action (v10.0 ZT-4):**
03018 |    - Enhance prism_hook→register to also accept `register_with_manifest`
03019 |    - Atomic: validates band → checks collisions → registers → updates HOOK_MANIFEST.json → logs
03020 | 4. **Implement collision detection:**
03021 |    - Same trigger AND same priority → WARN, auto-bump +1 within band
03022 |    - Auto-bump crosses band boundary → ERROR, require manual priority
03023 | 5. Disable irrelevant inherited hooks.
03024 | 6. Install: PLATFORM-IMPORT-VERIFY (priority 35), PLATFORM-ERROR-PATTERN (priority 40), PLATFORM-SKILL-AUTO-LOAD (priority 45), SYS-DRIFT-CHECK (priority 25, PENDING).
03025 | 7. **Upgrade PLATFORM-SKILL-AUTO-LOAD to auto-register (v10.0 ZT-2):**
03026 |    - SkillRegistry.scanDirectory() scans skills-consolidated/, parses YAML front matter, auto-registers valid
03027 |    - Test: drop new test skill file → verify auto-discovered on next trigger
03028 | 8. Test 5 representative hooks → document active/pending/disabled counts.
03029 | 
03030 | **HOOKS INSTALLED:** PLATFORM-IMPORT-VERIFY, PLATFORM-ERROR-PATTERN, PLATFORM-SKILL-AUTO-LOAD (auto-register mode), SYS-DRIFT-CHECK (PENDING)
03031 | 
03032 | **EXIT:** ~85 active hooks with assigned priority bands. ~8 PENDING. Rest disabled. Error pattern DB seeded. Priority collision detection operational. register_with_manifest action works. Skill auto-discovery verified.
03033 | 
03034 | ---
03035 | 
03036 | ### P-P1-MS4: Auto-Recommendation Engines
03037 | 
03038 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS3 COMPLETE.
03039 | 
03040 | Verify each recommendation engine → test material + tool recommendations → fix broken logic → wire to platform → verify telemetry captures events.
03041 | 
03042 | **EXIT:** All recommendation engines functional and tested. Telemetry capturing.
03043 | 
03044 | ---
03045 | 
03046 | ### P-P1-MS5: Platform Config Protocol + Formula Cross-Reference
03047 | 
03048 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS4 COMPLETE.
03049 | 
03050 | Standardize config → write formula_cross_ref.py → map 490 formulas → install PLATFORM-FORMULA-RECOMMEND hook → test pre-calculation injection → verify formulas match material+operation.
03051 | 
03052 | **HOOKS INSTALLED:** PLATFORM-FORMULA-RECOMMEND
03053 | 
03054 | **EXIT:** FORMULA_TASK_MAP.json with 490 formulas. Hook fires and injects relevant formulas.
03055 | 
03056 | ---
03057 | 
03058 | ### P-P1-MS6: Skill Packaging + Auto-Discovery Verification
03059 | 
03060 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS5 COMPLETE.
03061 | 
03062 | **STEPS:**
03063 | 
03064 | 1. Package 18 new skills with YAML front matter headers (v10.0 ZT-2).
03065 | 2. Verify all 18 have valid manifest format and ## Changelog section.
03066 | 3. **Test auto-discovery end-to-end:**
03067 |    - Drop a test skill into skills-consolidated/ (NOT pre-registered)
03068 |    - Trigger PLATFORM-SKILL-AUTO-LOAD or reboot
03069 |    - Verify: skill appears in SkillRegistry without ANY manual registration
03070 |    - Verify: prism_skill→list shows new skill
03071 |    - Remove test skill → verify deregistered on next scan
03072 | 4. Test 5 representative skills through normal workflow.
03073 | 5. Verify total count: ≥137 (119 existing + 18 new). Count is now a floor check.
03074 | 
03075 | **EXIT:** 18 new skills packaged with manifests. Auto-discovery verified end-to-end. Floor count ≥137 verified.
03076 | 
03077 | ---
03078 | 
03079 | ### P-P1-MS7: Session Memory Expansion
03080 | 
03081 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS6 COMPLETE.
03082 | 
03083 | **STEPS:**
03084 | 1. Expand session_memory.json to 15 categories → retention policy (3KB, 20/category)
03085 |    **All 15 categories (enumerated for downstream consumer verification):**
03086 |    ```
03087 |    1.  failure_patterns        — Error root causes and fix procedures (consumer: boot context, error pattern DB)
03088 |    2.  performance_baselines   — Benchmark history per metric (consumer: boot health check, PERF gate)
03089 |    3.  config_drift            — .env and config changes (consumer: drift detector)
03090 |    4.  domain_discoveries      — Material/machine behavior patterns (consumer: formula recommend)
03091 |    5.  material_preferences    — Frequently queried materials and conditions (consumer: ComputationCache pre-load)
03092 |    6.  user_context            — Manufacturing role, expertise level (consumer: ResponseTemplateEngine)
03093 |    7.  recent_calculations     — Last N calc results with inputs/outputs (consumer: formula recommend, response template)
03094 |    8.  tool_wear_history       — Observed tool life vs predicted (consumer: ToolBreakageEngine post-M4)
03095 |    9.  alarm_resolutions       — Alarm→fix mappings from operator feedback (consumer: alarm enrichment)
03096 |    10. campaign_state          — Current batch progress summary (consumer: boot context, dashboard)
03097 |    11. cost_history            — API cost trends per operation type (consumer: cost estimate hook)
03098 |    12. session_patterns        — Query frequency by dispatcher (consumer: AutoPilot routing optimization)
03099 |    13. validation_outcomes     — Ω scores and S(x) trends (consumer: formula accuracy tracker)
03100 |    14. cross_reference_cache   — Material-tool-machine compatibility results (consumer: knowledge graph)
03101 |    15. operator_feedback       — UAT feedback and override history (consumer: formula recommend weighting)
03102 |    ```
03103 | 2. Install PLATFORM-MEMORY-EXPAND hook → fires at session_end, extracts from telemetry
03104 | 3. **Wire Session Memory Consumers (close the read gap):**
03105 |    - **Consumer 1: Boot context optimization.** SessionLifecycleEngine reads session_memory at boot →
03106 |      if failure_patterns category has > 10 entries → pre-loads mitigation context for common failures →
03107 |      if material_preferences has entries → pre-loads preferred material params into ComputationCache
03108 |    - **Consumer 2: ResponseTemplateEngine reads session_memory →**
03109 |      if user_context has manufacturing_role → adjusts response detail level (operator vs engineer) →
03110 |      if recent_calculations has entries → references previous results in responses
03111 |    - **Consumer 3: PLATFORM-FORMULA-RECOMMEND reads session_memory →**
03112 |      recent_calculations + material_preferences inform formula weighting (prefer formulas
03113 |      that worked in recent sessions for similar materials)
03114 | 4. **Wire Boot Efficiency Tracker with thresholds:**
03115 |    - Write boot_efficiency_tracker.py (~120 lines) to C:\PRISM\scripts\
03116 |    - boot_efficiency_tracker.py measures: total boot time, state load time, memory load time, registry load time
03117 |    - Add cadence function: autoBootHealthCheck fires at session start
03118 |    - Thresholds: boot > 3s → WARN in TelemetryEngine "performance" channel →
03119 |      boot > 5s → trigger optimization: prune session_memory (remove lowest-priority categories),
03120 |      clear stale ComputationCache entries, compact state files →
03121 |      boot > 8s → BLOCK: something is fundamentally wrong, document and investigate
03122 | 5. Test: verify session_memory data changes ResponseTemplateEngine output. Verify boot threshold triggers.
03123 | 
03124 | **HOOKS INSTALLED:** PLATFORM-MEMORY-EXPAND
03125 | 
03126 | **EXIT:** 15 categories. Retention enforced. Hook fires at session_end. 3 consumers verified (boot context, response templates, formula recommendations). boot_efficiency_tracker.py operational. Boot thresholds operational (3s/5s/8s).
03127 | 
03128 | ---
03129 | 
03130 | ### P-P1-MS8: Drift Detection Baseline + Sync Manifest
03131 | 
03132 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P1-MS7 COMPLETE.
03133 | 
03134 | **STEPS:**
03135 | 1. Write codebase_sync_check.py (uses DiffEngine from P0-MS7) + drift_detector.py → generate baseline DRIFT_LOG.md
03136 | 2. ACTIVATE SYS-DRIFT-CHECK (from PENDING) → wire to weekly cadence
03137 | 3. **Wire Drift Auto-Correction (close the advisory gap):**
03138 |    - drift_detector.py detects drift → writes to DRIFT_LOG.md
03139 |    - **Auto-correction thresholds:**
03140 |      - 1-2 drift items: ADVISORY. Log only. Review at next SAU.
03141 |      - 3-4 drift items: AUTO-TODO. Add "resolve drift items" to prism_todo with priority HIGH.
03142 |        Auto-generates specific fix instructions per drift item in TODO entry.
03143 |      - 5+ drift items: URGENT. Add TODO with priority CRITICAL. Block next phase transition
03144 |        until drift < 3. Fire TelemetryEngine "system" alert channel.
03145 |    - **Auto-resolution for common drift types:**
03146 |      - File count mismatch → auto-run registry_health_check.py → report what changed
03147 |      - Import signature mismatch → auto-run validate_anti_regression → report what broke
03148 |      - Config divergence → auto-diff .env files → report differences
03149 | 4. Test detection → test auto-TODO generation → test threshold escalation → build BOTH.
03150 | 
03151 | **HOOKS INSTALLED:** SYS-DRIFT-CHECK (ACTIVATED from PENDING)
03152 | 
03153 | **EXIT:** Drift detection operational. Baseline established. Auto-correction thresholds wired (advisory/auto-todo/urgent). Common drift types have auto-resolution. → Proceed to **SU-2** (SAU-Full).
03154 | 
03155 | ---
03156 | 
03157 | ## PHASE P2: GENERALIZATION
03158 | 
03159 | **Sessions: 4-6 | Microsessions: 8 + SU-3 | Chats: 3 (Chats 5-7)**
03160 | 
03161 | **PURPOSE:** Prove platform is domain-agnostic (plugin architecture), establish golden path demos, build migration infrastructure, establish performance baselines. After P2, the system can host any domain plugin with a clear path to mcp-server retirement.
03162 | 
03163 | **CHAT MAP:**
03164 | - Chat 5: P-P2-MS1 → MS2 → MS3
03165 | - Chat 6: P-P2-MS4 → MS5
03166 | - Chat 7: P-P2-MS6 → MS7 → MS8 → P-PERF-MS1 → **SU-3**
03167 | 
03168 | ---
03169 | 
03170 | ### P-P2-MS1: Plugin Loader Test with Manufacturing Manifest
03171 | 
03172 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P1 COMPLETE (SU-2 + SAU-Full passed).
03173 | 
03174 | Load manufacturing plugin → verify 27 dispatchers register as stubs → test unload/reload cycle → verify no orphans.
03175 | 
03176 | **EXIT:** Plugin load/unload/reload cycle clean. 27 dispatchers register. No orphans.
03177 | 
03178 | ---
03179 | 
03180 | ### P-P2-MS2: Minimal Proof-of-Concept Domain Plugin
03181 | 
03182 | **Effort:** ~8 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS1 COMPLETE.
03183 | 
03184 | Create task-tracker plugin (2 dispatchers, 1 hook) → test round-trip → prove multi-domain architecture.
03185 | 
03186 | **EXIT:** Second plugin loaded alongside manufacturing. Both route correctly. Hook fires.
03187 | 
03188 | ---
03189 | 
03190 | ### P-P2-MS3: Manus Governance Interception Layer
03191 | 
03192 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS2 COMPLETE.
03193 | 
03194 | Import governance → adapt to hook engine → test BLOCK and ALLOW → verify cross-plugin. Overhead < 5ms.
03195 | 
03196 | **EXIT:** Governance intercepts correctly. BLOCK/ALLOW work. < 5ms overhead. Cross-plugin.
03197 | 
03198 | ---
03199 | 
03200 | ### P-P2-MS4: Import AutoPilot + Ralph Loops
03201 | 
03202 | **Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P2-MS3 COMPLETE.
03203 | 
03204 | Import AutoPilot → verify GSD dynamic reading → test routing → verify ralph_loop through AutoPilot → verify PLATFORM-COST-ESTIMATE fires.
03205 | 
03206 | **SAU NOTE:** This MS fundamentally changes routing. After completion, verify GSD_QUICK.md reflects AutoPilot routing and test 3 query types.
03207 | 
03208 | **EXIT:** AutoPilot imported and routing correctly. Ralph loops through AutoPilot. Cost estimation active. GSD updated.
03209 | 
03210 | ---
03211 | 
03212 | ### P-P2-MS5: Golden Path Demos (Manufacturing)
03213 | 
03214 | **Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P2-MS4 COMPLETE.
03215 | 
03216 | Define 3 manufacturing demos → write demo_hardener.py → install PLATFORM-DEMO-VERIFY hook → execute 5x each → verify formula recommendations fire → write DEMO_READINESS.md.
03217 | 
03218 | **EXIT:** 3 demos pass 5/5 each. Demo hardener operational.
03219 | 
03220 | ---
03221 | 
03222 | ### P-P2-MS6: Golden Path Demos (Cross-Domain + Governance)
03223 | 
03224 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS5 COMPLETE.
03225 | 
03226 | Define 2 cross-domain demos → execute through AutoPilot → run demo_hardener.py 5x each.
03227 | 
03228 | **EXIT:** 5 total demos pass reliably. Cross-domain routing correct.
03229 | 
03230 | ---
03231 | 
03232 | ### P-P2-MS7: Migration Gate Design
03233 | 
03234 | **Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P2-MS6 COMPLETE.
03235 | 
03236 | Write dual_run_validator.py → define 6 migration gate criteria → install PLATFORM-MIGRATION-GATE + PLATFORM-REGRESSION-FULL hooks → test with 10 queries.
03237 | 
03238 | **EXIT:** dual_run_validator.py works. 6 criteria defined. Both hooks installed.
03239 | 
03240 | ---
03241 | 
03242 | ### P-P2-MS8: Performance Baseline
03243 | 
03244 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P2-MS7 COMPLETE.
03245 | 
03246 | Write/complete performance_benchmark.py → execute full 10-benchmark suite → install PLATFORM-PERF-GATE hook → record baselines.
03247 | 
03248 | **EXIT:** All 10 benchmarks recorded. PLATFORM-PERF-GATE installed. → Proceed to P-PERF-MS1 then **SU-3** (SAU-Full).
03249 | 
03250 | ---
03251 | 
03252 | ## PHASES P3-P4: AUTONOMY + ORCHESTRATION
03253 | 
03254 | **Sessions: 4-6 | Microsessions: 10 + SU-4 | Chats: 4 (Chats 8-10b)**
03255 | 
03256 | **PURPOSE:** Make the system autonomous and intelligent. After P3-P4, the system runs multi-session data campaigns surviving compaction, learns from errors, auto-deploys swarms.
03257 | 
03258 | **CHAT MAP:**
03259 | - Chat 8: P-P3-MS1 → MS2 → MS3
03260 | - Chat 9: P-P4-MS1 → P-P4-MS2 → P-P3-MS4
03261 | - Chat 10a: P-P4-MS3 → P-P4-MS4 → P-P3-MS5 → P-P3P4-MS-FINAL
03262 | - Chat 10b: P-PERF-MS2 → **SU-4**
03263 | 
03264 | ---
03265 | 
03266 | ### P-P3-MS1: ATCS as Primary Continuity + Batch Resilience
03267 | 
03268 | **Effort:** ~20 tool calls | **Quality Tier:** DEEP | **ENTRY:** P2 COMPLETE (SU-3 + SAU-Full passed).
03269 | 
03270 | Deploy Batch Resilience Framework → install 3 hooks (PLATFORM-BATCH-ERROR, PLATFORM-BATCH-PROGRESS, PLATFORM-SCHEMA-VERSION) → create campaign templates → test 10-item campaign with compaction at item 5 → verify resume at item 6 → verify dashboard.
03271 | 
03272 | **EXIT:** Batch resilience deployed. Templates created. Compaction recovery passes. Dashboard updating.
03273 | 
03274 | ---
03275 | 
03276 | ### P-P3-MS2: Recovery Manifest + ATCS-Aware Resume
03277 | 
03278 | **Effort:** ~12 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P3-MS1 COMPLETE.
03279 | 
03280 | Enhance ATCS recovery from COMPACTION_SURVIVAL.json → test crash mid-batch → cold restart → verify auto-resume → verify EMERGENCY_RESUME.md has ATCS detail.
03281 | 
03282 | **EXIT:** ATCS-aware resume tested with cold restart.
03283 | 
03284 | ---
03285 | 
03286 | ### P-P3-MS3: Manus ↔ ATCS Integration
03287 | 
03288 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS2 COMPLETE.
03289 | 
03290 | Wire governance to ATCS → test governance intercept in autonomous mode → verify blocked operations → quarantine (not campaign halt).
03291 | 
03292 | **EXIT:** Governance active in autonomous mode. ATCS handles blocks through error policy.
03293 | 
03294 | ---
03295 | 
03296 | ### P-P4-MS1: AutoPilot as Default Entry Point
03297 | 
03298 | **Effort:** ~10 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS3 COMPLETE.
03299 | 
03300 | Configure AutoPilot as default → verify all query types route → verify GSD dynamic reading → test fallback for malformed queries.
03301 | 
03302 | **SAU NOTE:** AutoPilot is now the DEFAULT entry point. Update GSD_QUICK.md.
03303 | 
03304 | **EXIT:** AutoPilot is default entry. All query types route. Fallback works. GSD updated.
03305 | 
03306 | ---
03307 | 
03308 | ### P-P4-MS2: Swarm Auto-Deployment with Decision Matrices
03309 | 
03310 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P4-MS1 COMPLETE.
03311 | 
03312 | Build decision matrix → wire cost estimates with swarm multipliers → test auto-deployment → verify cost accuracy for 5 tasks.
03313 | 
03314 | **EXIT:** Swarm auto-deployment working. Cost estimates include swarm overhead.
03315 | 
03316 | ---
03317 | 
03318 | ### P-P3-MS4: Learning Pipeline + Error Pattern Database
03319 | 
03320 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P4-MS2 COMPLETE.
03321 | 
03322 | **STEPS:**
03323 | 
03324 | 1. **Error Pattern Database — Build + Wire Consumer Chain:**
03325 |    - Create error_pattern_db.json schema: { pattern_id, error_signature, root_cause, fix_procedure, confidence, hit_count, last_seen }
03326 |    - Wire PLATFORM-ERROR-PATTERN hook: on ANY error from any dispatcher → match error message against known patterns → store new patterns, increment hit_count on matches
03327 |    - **CONSUMER (the missing wire):** Wire autoHookWrapper ERROR handler to QUERY error_pattern_db BEFORE returning error to user:
03328 |      ```
03329 |      Error occurs → PLATFORM-ERROR-PATTERN stores pattern
03330 |                   → autoHookWrapper.onError() calls errorPatternDB.findMatch(error)
03331 |                   → If match found (confidence > 0.7): inject fix_procedure into error response
03332 |                   → If match found (confidence > 0.9 AND hit_count > 5): AUTO-APPLY fix, retry operation
03333 |                   → Log resolution outcome back to pattern DB (feedback: did the fix work?)
03334 |      ```
03335 |    - Seed from SESSION_INSIGHTS.md: extract error patterns from all [REGRESSION] and [PATTERN] entries
03336 | 
03337 | 2. **Formula Accuracy Tracker — Build + Wire Feedback Loop:**
03338 |    - Create formula_accuracy.json: { formula_id, material_class, operation_type, predictions[], actuals[], accuracy_score, last_updated }
03339 |    - Wire CalcHookMiddleware AFTER hook to log: predicted value + actual reference value (from published data) when available
03340 |    - **FEEDBACK LOOP (the missing wire):** Rewire PLATFORM-FORMULA-RECOMMEND (from P1-MS5) to READ formula_accuracy.json:
03341 |      ```
03342 |      Calculation requested → PLATFORM-FORMULA-RECOMMEND fires
03343 |        → Reads FORMULA_TASK_MAP.json (which formulas apply)
03344 |        → Reads formula_accuracy.json (which formulas perform best for this material+operation)
03345 |        → Weights recommendation: accuracy_score * relevance_score
03346 |        → Recommends highest-weighted formula (not just first match)
03347 |      ```
03348 |    - Test feedback loop: run same calculation twice with different accuracy histories → verify DIFFERENT formula is recommended
03349 | 
03350 | 3. **Verification — Prove consumers work:**
03351 |    - Test error consumer: trigger a known error → verify fix_procedure appears in response → verify hit_count incremented
03352 |    - Test formula feedback: seed formula_accuracy with one formula at 0.95 and another at 0.60 → run calculation → verify high-accuracy formula is selected
03353 |    - Test auto-resolution: create pattern with confidence=0.95, hit_count=10, known fix → trigger matching error → verify auto-fix applied and retry succeeds
03354 | 
03355 | **EXIT:** Error pattern DB ≥ 15 entries. Auto-suggestion working (verified by consumer test). Auto-resolution working for high-confidence patterns. Formula accuracy feedback loop closed (verified by differential test). Learning pipeline operational with bidirectional data flow.
03356 | 
03357 | ---
03358 | 
03359 | ### P-P4-MS3: Pipeline Automation
03360 | 
03361 | **Effort:** ~10 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS4 COMPLETE.
03362 | 
03363 | Build automated multi-step pipelines → test 3 pipeline patterns end-to-end.
03364 | 
03365 | **EXIT:** 3 pipeline patterns operational.
03366 | 
03367 | ---
03368 | 
03369 | ### P-P4-MS4: Knowledge Graph Foundation
03370 | 
03371 | **Effort:** ~15 tool calls | **Quality Tier:** DEEP | **ENTRY:** P-P4-MS3 COMPLETE.
03372 | 
03373 | **STEPS:**
03374 | 
03375 | 1. **Build Knowledge Graph using MemoryGraphEngine (685L, Tier 3):**
03376 |    - MemoryGraphEngine IS the knowledge graph backend — don't build a separate one
03377 |    - Import MemoryGraphEngine to src/engines/ NOW (don't wait for Tier 3 E3 import)
03378 |    - Graph schema: nodes = {materials, operations, tools, machines, formulas}, edges = {compatible_with, requires, produces, optimized_for}
03379 |    - Seed with core relationships: 4140→turning→carbide_insert, Ti-6Al-4V→roughing→ceramic_insert, etc. (≥50 edges from published machining handbooks)
03380 | 
03381 | 2. **Wire Consumer #1 — PLATFORM-FORMULA-RECOMMEND reads graph:**
03382 |    ```
03383 |    Calculation for material X, operation Y:
03384 |      → PLATFORM-FORMULA-RECOMMEND fires
03385 |      → Queries MemoryGraphEngine: "what tools/formulas are connected to (X, Y)?"
03386 |      → Graph returns ranked edges by weight (weight = confidence * accuracy_score)
03387 |      → Recommendation includes graph-derived tool suggestions alongside formula accuracy data
03388 |    ```
03389 | 
03390 | 3. **Wire Consumer #2 — AutoPilot uses graph for routing enrichment:**
03391 |    ```
03392 |    User query: "machine 316 stainless"
03393 |      → AutoPilot routes to prism_calc
03394 |      → BEFORE routing: AutoPilot queries graph for 316_stainless node
03395 |      → Graph returns: related operations, compatible tools, known problem areas (BUE risk)
03396 |      → AutoPilot enriches routing context with graph data
03397 |      → prism_calc receives enriched context → better recommendations
03398 |    ```
03399 | 
03400 | 4. **Wire Consumer #3 — Data campaigns feed graph (M-M2):**
03401 |    ```
03402 |    M-M2 material batch validates entry for 7075-T6:
03403 |      → After Ω validation passes
03404 |      → MemoryGraphEngine.addEdges(7075_T6, validated_operations, validated_tools)
03405 |      → Graph grows automatically as data campaigns progress
03406 |      → By M-M2 batch 50: graph has thousands of edges from validated data
03407 |    ```
03408 | 
03409 | 5. Query interface: prism_knowledge→query_graph(node, relationship_type, depth)
03410 | 6. Test: query "what tools work with Ti-6Al-4V for roughing?" → verify graph returns ranked results → verify PLATFORM-FORMULA-RECOMMEND uses these results
03411 | 
03412 | **EXIT:** Knowledge graph queryable via MemoryGraphEngine. ≥50 core relationships seeded. PLATFORM-FORMULA-RECOMMEND reads graph (verified). AutoPilot routing enrichment working (verified). M-M2 graph-feed wire documented for M-M2-MS1.
03413 | 
03414 | ---
03415 | 
03416 | ### P-P3-MS5: Integration Test + UAT Prep
03417 | 
03418 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P4-MS4 COMPLETE.
03419 | 
03420 | Full autonomous multi-phase integration test → write uat_session_runner.py (~200 lines) to C:\PRISM\scripts\ implementing all 8 UAT scenarios from P-UAT specification (Section 5) → prepare UAT scenario templates → create test scenario config files.
03421 | 
03422 | **HOOKS INSTALLED:** MFG-UAT-FEEDBACK
03423 | 
03424 | **EXIT:** Full integration passes. uat_session_runner.py operational and runs all 8 scenarios. UAT scenario templates created.
03425 | 
03426 | ---
03427 | 
03428 | ### P-P3P4-MS-FINAL: Phase Completion + Metrics + SU-4 Pre-Flight
03429 | 
03430 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** P-P3-MS5 COMPLETE.
03431 | 
03432 | Verify all P3-P4 components operational → collect metrics → run SU-4 pre-flight → document. → Proceed to Chat 10b for P-PERF-MS2 then **SU-4** (SAU-Full).
03433 | 
03434 | **SU-4 PRE-FLIGHT CHECKLIST (verify before proceeding to SU-4):**
03435 | 1. ✅ 7 consumer chain tests ready: verify each engine's consumer is wired and callable
03436 | 2. ✅ ATCS batch resilience: test campaign with checkpoint + simulated compaction
03437 | 3. ✅ Error pattern DB has ≥ 5 entries from P0-P4 development
03438 | 4. ✅ Formula accuracy tracker has baseline data from test calculations
03439 | 5. ✅ uat_session_runner.py operational (created at P-P3-MS5)
03440 | 6. ✅ ComputationCache (P0-MS6) has cached results from test calculations
03441 | 7. ✅ All [DEFERRED] flags from P3-P4 resolved or documented with justification
03442 | 
03443 | **EXIT:** All P3-P4 components verified. SU-4 pre-flight 7/7 pass. Metrics recorded.
03444 | 
03445 | ---
03446 | 
03447 | ## MANUFACTURING TRACK: M-M0 THROUGH M-M3 (NEW in v7)
03448 | 
03449 | *This track runs in parallel with Enterprise phases. It populates the system with real manufacturing data and validates that data through production use. Cross-track dependencies are defined in Section 3.9.*
03450 | 
03451 | ---
03452 | 
03453 | ### PHASE M-M0: PLUGIN PACKAGING + DATA INFRASTRUCTURE
03454 | 
03455 | **Sessions: 2-3 | Microsessions: 5 | Chats: 2 (Chats 11-12)**
03456 | 
03457 | **PURPOSE:** Convert the manufacturing domain from hardcoded mcp-server integration to clean prism-platform plugin. Build the data pipeline infrastructure that M-M2 campaigns will use. After M-M0, manufacturing is a proper plugin with data ingestion, validation, and storage pipelines ready for batch operations.
03458 | 
03459 | **PREREQUISITES:** P2 COMPLETE (plugin architecture operational, manufacturing manifest exists with 27 dispatcher stubs).
03460 | 
03461 | **CHAT MAP:**
03462 | - Chat 11: M-M0-MS1 → MS2 → MS3
03463 | - Chat 12: M-M0-MS4 → MS5 → SAU-Light
03464 | 
03465 | ---
03466 | 
03467 | #### M-M0-MS1: Manufacturing Plugin Activation
03468 | 
03469 | **Effort:** ~15 tool calls | **Quality Tier:** DEEP
03470 | 
03471 | **ENTRY CONDITIONS:**
03472 | - P2 COMPLETE (SU-3 passed)
03473 | - prism-platform builds with manufacturing manifest (27 dispatcher stubs)
03474 | - Plugin loader tested (P2-MS1)
03475 | 
03476 | **STEPS:**
03477 | 
03478 | 1. prism_dev→file_read: manufacturing manifest.json — verify all 27 dispatchers listed as stubs.
03479 | 2. Identify the 5 CORE dispatchers that ALL other manufacturing operations depend on: prism_data (material/machine/tool/alarm lookup), prism_calc (speed_feed, force, power), prism_validate (calculation validation), prism_hook (manufacturing hooks), prism_context (manufacturing context). These import FIRST.
03480 | 3. Import prism_data dispatcher from mcp-server to prism-platform manufacturing plugin. Adapt: register through PluginInterface, not hardcoded. Verify: material_lookup("4140"), machine_lookup("HAAS VF-2"), alarm_lookup("FANUC 414") all return data through plugin routing.
03481 | 4. Import prism_calc dispatcher. Verify: speed_feed calculation routes through plugin and returns valid results.
03482 | 5. Import prism_validate dispatcher. Verify: validate_calculation works for imported calcs.
03483 | 6. prism_validate→validate_anti_regression for all 3 imported dispatchers.
03484 | 7. Build prism-platform. Verify: 5 dispatchers ACTIVE, 22 dispatchers still STUB.
03485 | 
03486 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_data, prism_calc, prism_validate→validate_anti_regression
03487 | 
03488 | **EXIT CONDITIONS:**
03489 | - 5 core dispatchers imported and functional through plugin routing
03490 | - material_lookup, machine_lookup, alarm_lookup, speed_feed all work through plugin
03491 | - 22 remaining dispatchers are stubs
03492 | - Anti-regression passes
03493 | - Build passes
03494 | 
03495 | **HANDOFF:** ROADMAP_TRACKER.md: M-M0-MS1 COMPLETE. IMPORT_LOG.md: 5 dispatchers imported with line counts. Stub count: 22.
03496 | 
03497 | ---
03498 | 
03499 | #### M-M0-MS2: Data Ingestion Pipeline
03500 | 
03501 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP
03502 | 
03503 | **ENTRY CONDITIONS:**
03504 | - M-M0-MS1 COMPLETE (core dispatchers functional)
03505 | - Registry loading > 95% (from P0-MS1)
03506 | 
03507 | **STEPS:**
03508 | 
03509 | 0. **Data directory audit (against MASTER_INDEX §8):**
03510 |    ```
03511 |    prism_dev action=file_read path="C:\PRISM\data\materials"      → count JSON files (expect 64)
03512 |    prism_dev action=file_read path="C:\PRISM\data\machines"       → count JSON files (expect 37)
03513 |    prism_dev action=file_read path="C:\PRISM\data\controllers"    → count JSON files (expect 3)
03514 |    prism_dev action=file_read path="C:\PRISM\data\tools"          → count JSON files (expect 8)
03515 |    prism_dev action=file_read path="C:\PRISM\extracted\machines"  → count JSON files (expect 38)
03516 |    prism_dev action=file_read path="C:\PRISM\extracted\controllers" → count JSON files (expect 65)
03517 |    → Record actual counts as DATA_AUDIT_BASELINE
03518 |    → If counts deviate from MASTER_INDEX by >5% → flag [DATA_DRIFT] before proceeding
03519 |    ```
03520 |    **Data directory strategy:** Use Windows junction points (`mklink /J prism-platform\data C:\PRISM\data`, no admin privileges required) from prism-platform/data/ to same directories (data is ~3.2MB, copying creates drift risk). Both codebases read from the same files. dual_run_validator.py will later verify file counts, sizes, and JSON structure parity.
03521 |    **IMPORTANT:** Do NOT use `mklink` without `/J` — standard symlinks require admin/Developer Mode on Windows. Junction points (`/J`) work without elevation. Fallback if junctions fail: add `DATA_ROOT` config to prism-platform .env pointing to `C:\PRISM\data` and resolve all data paths through config.
03522 |    **JUNCTION POINT EDGE CASES (NEW in v8.4):**
03523 |    ```
03524 |    KNOWN LIMITATIONS:
03525 |    - Junction points only work for DIRECTORIES, not individual files (this is fine — we junction data/)
03526 |    - Junction points do NOT work across drives (C: → D: fails). Both codebases must be on same drive.
03527 |    - Some antivirus software (Symantec, McAfee) may flag junction traversal — add PRISM dirs to exclusions
03528 |    - WSL2: Junction points are NOT visible from WSL2 Linux filesystem. If dev moves to WSL2:
03529 |      → Use config-based DATA_ROOT fallback (not junctions)
03530 |      → Both codebases must resolve data paths through config
03531 |      → Test: verify material_lookup("4140") returns data through config path
03532 | 
03533 |    FALLBACK CHAIN (in priority order):
03534 |    1. Junction point: mklink /J prism-platform\data C:\PRISM\data
03535 |    2. DATA_ROOT config: DATA_ROOT=C:\PRISM\data in prism-platform/.env
03536 |    3. Data copy: cp -r C:\PRISM\data prism-platform\data (LAST RESORT — creates drift risk)
03537 |       → If using copy: add data_sync_check to SAU-Light (compare file counts + sizes)
03538 | 
03539 |    VALIDATION AT M-M0-MS2:
03540 |    - Whichever method is used: verify BOTH codebases return identical results for:
03541 |      material_lookup("4140"), machine_lookup("HAAS VF-2"), alarm_lookup("FANUC 414")
03542 |    - Document method in PLATFORM_STATE.md: "Data access: [junction|config|copy]"
03543 |    ```
03544 | 1. Design data ingestion pipeline for batch campaigns:
03545 |    - Input: raw data files (JSON, CSV) from data/ directories
03546 |    - Validation: schema check → value range check → cross-reference check → Ω scoring
03547 |    - Storage: validated entries written to registry with full audit trail
03548 |    - Quarantine: entries failing validation go to QUARANTINE_LOG.md with reason
03549 | 2. Write data_ingestion_pipeline.py (~300 lines) to C:\PRISM\scripts\:
03550 |    - Accepts: material|machine|alarm type, input file path, batch_size, omega_threshold
03551 |    - Validates each entry against schema + known physical constraints
03552 |    - Scores each entry with Ω (omega) — reject if < threshold
03553 |    - Writes accepted entries to registry
03554 |    - Writes quarantined entries to log with failure reason
03555 |    - Returns: accepted_count, quarantined_count, error_count
03556 | 3. Write mfg_batch_validator.py (~150 lines) to C:\PRISM\scripts\:
03557 |    - Post-batch validation: compares loaded registry state against expected counts
03558 |    - Cross-references material-machine-tool relationships for consistency
03559 |    - Reports: total entries, validated entries, quarantine rate, Ω distribution
03560 | 4. Test ingestion pipeline with 10 known materials (including edge cases: exotic alloys, extreme hardness values).
03561 | 5. Test quarantine: feed 2 intentionally invalid entries (impossible cutting speed, negative hardness) — verify quarantine.
03562 | 6. Build prism-platform.
03563 | 
03564 | **TOOLS:** prism_dev→file_write, prism_data, prism_validate
03565 | 
03566 | **EXIT CONDITIONS:**
03567 | - data_ingestion_pipeline.py operational
03568 | - mfg_batch_validator.py operational
03569 | - 10 test materials ingested successfully
03570 | - 2 invalid entries quarantined correctly
03571 | - Pipeline outputs full audit trail
03572 | - Build passes
03573 | 
03574 | **HANDOFF:** Pipeline paths documented. Test results recorded.
03575 | 
03576 | ---
03577 | 
03578 | #### M-M0-MS3: Campaign Dashboard + Batch Numbering
03579 | 
03580 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD
03581 | 
03582 | **ENTRY CONDITIONS:**
03583 | - M-M0-MS2 COMPLETE (ingestion pipeline operational)
03584 | 
03585 | **STEPS:**
03586 | 
03587 | 1. Design campaign dashboard state file: C:\PRISM\state\CAMPAIGN_DASHBOARD.json
03588 |    ```json
03589 |    {
03590 |      "schema_version": 1,
03591 |      "materials": { "total_batches": 0, "completed_batches": 0, "total_entries": 0, "validated_entries": 0, "quarantined": 0, "current_batch": null },
03592 |      "machines": { ... },
03593 |      "alarms": { ... },
03594 |      "last_updated": "ISO timestamp",
03595 |      "campaign_start": null,
03596 |      "estimated_completion": null,
03597 |      "last_clean_snapshot": { "materials": null, "machines": null, "alarms": null },
03598 |      "snapshot_log": [],
03599 |      "swarm_config": {}
03600 |    }
03601 |    ```
03602 |    **Schema migration (NEW in v8.2):** On load, if schema_version < current expected → run dashboard_schema_migrator: add missing fields with defaults, bump version. Prevents crashes when dashboard evolves over ~40-batch campaign.
03603 | 2. **BATCH NUMBERING PROTOCOL:** Each batch is numbered sequentially per category starting at 1. A "batch" = one execution of data_ingestion_pipeline.py with batch_size entries. Batch N for materials means material entries (N-1)*batch_size+1 through N*batch_size have been processed.
03604 |    - Material batches: batch_size=50, so batch 1 = entries 1-50, batch 20 = entries 951-1000
03605 |    - Machine batches: batch_size=25
03606 |    - Alarm batches: batch_size=100
03607 |    - **P-UAT-MS1 trigger: "M-M2 batch 20 complete" = 1,000 material entries processed (≥900 validated at ≤10% quarantine)**
03608 | 3. Write campaign_dashboard_updater.py (~100 lines): reads pipeline output, updates dashboard, calculates progress and ETA.
03609 | 4. Wire dashboard update to PLATFORM-BATCH-PROGRESS hook (installed in P3-MS1).
03610 | 5. Test: run test batch → verify dashboard updates → verify batch number increments.
03611 | 
03612 | **TOOLS:** prism_dev→file_write, prism_hook→execute
03613 | 
03614 | **EXIT CONDITIONS:**
03615 | - CAMPAIGN_DASHBOARD.json created with schema
03616 | - Batch numbering protocol documented and implemented
03617 | - Dashboard updates on batch completion
03618 | - Batch 20 = 1,000 materials is explicitly defined (UAT trigger)
03619 | 
03620 | **HANDOFF:** Dashboard path. Batch numbering protocol. UAT trigger definition.
03621 | 
03622 | ---
03623 | 
03624 | #### M-M0-MS4: Remaining Dispatcher Import (Batch 1)
03625 | 
03626 | **Effort:** ~18 tool calls | **Quality Tier:** STANDARD
03627 | 
03628 | **ENTRY CONDITIONS:**
03629 | - M-M0-MS3 COMPLETE
03630 | - 5 core dispatchers active, 22 stubs remaining
03631 | 
03632 | **STEPS:**
03633 | 
03634 | 1. Prioritize remaining 22 dispatchers by dependency order and usage frequency.
03635 | 2. Import next 11 dispatchers (batch 1 of 2): focus on dispatchers that M-M2 campaigns need:
03636 |    - prism_tool (tool lookup, tool life prediction)
03637 |    - prism_alarm (alarm decode, fix procedure)
03638 |    - prism_machine (machine capability, specification lookup)
03639 |    - prism_report (calculation reports, parameter summaries)
03640 |    - prism_optimize (cutting parameter optimization)
03641 |    - prism_thermal (thermal analysis)
03642 |    - prism_force (cutting force calculations)
03643 |    - prism_surface (surface finish prediction)
03644 |    - prism_wear (tool wear modeling)
03645 |    - prism_coolant (coolant selection)
03646 |    - prism_fixture (fixture recommendations)
03647 | 3. For each: import → adapt to plugin → anti-regression → test representative action.
03648 | 4. Build prism-platform. Verify: 16 dispatchers ACTIVE, 11 stubs remaining.
03649 | 
03650 | **TOOLS:** prism_dev→code_search, prism_dev→file_read, prism_dev→file_write, prism_validate→validate_anti_regression
03651 | 
03652 | **EXIT CONDITIONS:**
03653 | - 16 dispatchers active through plugin routing
03654 | - 11 stubs remaining (non-critical for M-M2)
03655 | - Anti-regression passes for all imports
03656 | - Build passes
03657 | 
03658 | **HANDOFF:** IMPORT_LOG.md updated with 11 new imports. Stub count: 11.
03659 | 
03660 | ---
03661 | 
03662 | #### M-M0-MS5: Remaining Dispatcher Import (Batch 2) + SAU-Light
03663 | 
03664 | **Effort:** ~20 tool calls | **Quality Tier:** STANDARD
03665 | 
03666 | **ENTRY CONDITIONS:**
03667 | - M-M0-MS4 COMPLETE
03668 | 
03669 | **STEPS:**
03670 | 
03671 | 1. Import remaining 11 dispatchers. Same pattern: import → adapt → anti-regression → test.
03672 | 2. After all 27 dispatchers active: run full integration test — one representative action per dispatcher.
03673 | 3. Verify AutoPilot routes manufacturing queries to all 27 dispatchers correctly.
03674 | 4. **SAU-Light:** Update GSD with full manufacturing plugin routing. Regenerate PRISM_QUICK_REF.md. Update Claude memory: M-M0 complete, 27 dispatchers active through plugin, data pipeline ready.
03675 | 
03676 | **EXIT CONDITIONS:**
03677 | - All 27 dispatchers active through manufacturing plugin (zero stubs)
03678 | - Full integration test passes
03679 | - AutoPilot routes all manufacturing query types
03680 | - SAU-Light complete
03681 | - Build passes
03682 | 
03683 | **HANDOFF:** ROADMAP_TRACKER.md: M-M0 COMPLETE. IMPORT_LOG.md: all 27 dispatchers. → M-M0 PHASE COMPLETE.
03684 | 
03685 | ---
03686 | 
03687 | ### PHASE M-M1: KNOWLEDGE RECOVERY + VALIDATION
03688 | 
03689 | **Sessions: 2-3 | Microsessions: 4 | Chats: 2 (Chats 13-14)**
03690 | 
03691 | **PURPOSE:** Recover manufacturing knowledge that was lost or degraded during previous development. Validate that all physics calculations, material parameters, and machine specifications are accurate against published reference data. After M-M1, the calculation foundation is verified correct before mass data ingestion begins.
03692 | 
03693 | **PREREQUISITES:** M-M0 COMPLETE.
03694 | 
03695 | **CHAT MAP:**
03696 | - Chat 13: M-M1-MS1 → MS2
03697 | - Chat 14: M-M1-MS3 → MS4 → SAU-Light
03698 | 
03699 | ---
03700 | 
03701 | #### M-M1-MS1: Physics Calculation Audit
03702 | 
03703 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP
03704 | 
03705 | **ENTRY CONDITIONS:**
03706 | - M-M0 COMPLETE (all dispatchers active)
03707 | - Calc bug (GAP-002) was fixed in P0-MS4
03708 | 
03709 | **STEPS:**
03710 | 
03711 | 1. Systematic audit of ALL calculation engines against published reference data:
03712 |    - Kienzle cutting force model: verify kc1.1 and mc coefficients for 10 material groups against Altintas (2012) or equivalent reference
03713 |    - Taylor tool life: verify exponents for carbide, HSS, ceramic against Kalpakjian reference values
03714 |    - Johnson-Cook: verify A, B, C, n, m parameters for 4140, Ti-6Al-4V, Al 6061, Inconel 718 against published data
03715 |    - Surface roughness: verify Ra prediction against theoretical values for given nose radius and feed rate
03716 | 2. For each calculation engine: run 5 test cases with known answers from published tables. Document: input, expected output, actual output, deviation.
03717 | 3. Any calculation with deviation > ±5% from published reference: flag [CALC_DEVIATION] with root cause analysis.
03718 | 4. Fix any deviations. Re-run tests. Verify S(x) ≥ 0.70 for all.
03719 | 5. Document all reference sources used for validation in CALC_REFERENCE_LOG.md.
03720 | 
03721 | **TOOLS:** prism_calc, prism_validate→validate_calculation, prism_data→material_lookup
03722 | 
03723 | **EXIT CONDITIONS:**
03724 | - All calculation engines audited against published references
03725 | - Deviation < ±5% for all engines (or root cause documented)
03726 | - S(x) ≥ 0.70 for all test cases
03727 | - CALC_REFERENCE_LOG.md created
03728 | - Reference sources documented
03729 | 
03730 | **HANDOFF:** Calculation audit results. Reference sources. Any [CALC_DEVIATION] flags.
03731 | 
03732 | ---
03733 | 
03734 | #### M-M1-MS2: Material Parameter Validation
03735 | 
03736 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP
03737 | 
03738 | **ENTRY CONDITIONS:**
03739 | - M-M1-MS1 COMPLETE (calculations verified)
03740 | 
03741 | **STEPS:**
03742 | 
03743 | 1. For ALL currently loaded materials (from P0-MS1 registry fix):
03744 |    - Verify Kienzle coefficients exist and are within published ranges
03745 |    - Verify Johnson-Cook parameters exist for materials that have them
03746 |    - Verify hardness ranges are physically realistic
03747 |    - Verify thermal conductivity, specific heat, density values match published data
03748 | 2. Cross-reference: for materials with multiple condition states (e.g., 4140 annealed vs Q&T 50 HRC), verify DIFFERENT parameters exist for each condition. Same parameters for different conditions → ERROR.
03749 | 3. Machine specification validation: for all loaded machines, verify:
03750 |    - Max RPM within manufacturer specs
03751 |    - Power ratings match published values
03752 |    - Axis travel within spec
03753 | 4. Flag any missing or inconsistent parameters as [PARAM_GAP] with specific fields needed.
03754 | 5. Generate VALIDATION_REPORT.md: total validated, total gaps, gap categories.
03755 | 
03756 | **TOOLS:** prism_data (all lookups), prism_validate
03757 | 
03758 | **EXIT CONDITIONS:**
03759 | - All loaded materials validated against published data
03760 | - Multi-condition materials have distinct parameters per condition
03761 | - Machine specifications verified against manufacturer data
03762 | - VALIDATION_REPORT.md created
03763 | - All [PARAM_GAP] flags documented
03764 | 
03765 | **HANDOFF:** Validation report. Gap summary.
03766 | 
03767 | ---
03768 | 
03769 | #### M-M1-MS3: Alarm Code Verification
03770 | 
03771 | **Effort:** ~15 tool calls | **Quality Tier:** DEEP
03772 | 
03773 | **ENTRY CONDITIONS:**
03774 | - M-M1-MS2 COMPLETE
03775 | 
03776 | **STEPS:**
03777 | 
03778 | 1. For each controller family (FANUC, HAAS, Siemens, Okuma, Mazak, Heidenhain, and 6 others):
03779 |    - Verify alarm code format matches controller documentation
03780 |    - Verify fix procedures are actionable (not generic "contact service")
03781 |    - Verify severity classifications are consistent
03782 | 2. Test alarm decode chain: for 5 representative alarms across different controllers:
03783 |    - Trigger alarm_lookup → verify decode returns
03784 |    - Verify fix procedure is specific to the alarm
03785 |    - Verify related alarms are cross-referenced
03786 | 3. Flag alarms with generic fix procedures as [ALARM_QUALITY] for enrichment during M-M2.
03787 | 4. Document alarm coverage: loaded vs available per controller family.
03788 | 
03789 | **TOOLS:** prism_data→alarm_lookup, prism_validate
03790 | 
03791 | **EXIT CONDITIONS:**
03792 | - Alarm codes verified for all 12 controller families
03793 | - Fix procedures verified actionable for loaded alarms
03794 | - [ALARM_QUALITY] flags on generic procedures
03795 | - Coverage documented per controller family
03796 | 
03797 | **HANDOFF:** Alarm verification results. Coverage by controller family.
03798 | 
03799 | ---
03800 | 
03801 | #### M-M1-MS4: Safety-Critical Test Matrix Seed + SAU-Light
03802 | 
03803 | **Effort:** ~15 tool calls | **Quality Tier:** RELEASE
03804 | 
03805 | **ENTRY CONDITIONS:**
03806 | - M-M1-MS3 COMPLETE
03807 | 
03808 | **STEPS:**
03809 | 
03810 | 1. Write safety_calc_test_matrix.py (~200 lines) implementing the 50-calculation test matrix (Section 15). This script:
03811 |    - Runs all 50 calculations against both codebases
03812 |    - Compares results within ±2σ tolerance
03813 |    - Reports: pass/fail per category, max deviation, overall status
03814 |    - HARD BLOCK if any safety-critical calculation fails
03815 | 2. Execute test matrix against mcp-server. Record baseline results.
03816 | 3. Execute test matrix against prism-platform. Record results. Compare.
03817 | 4. Any prism-platform deviation from mcp-server > ±2σ: flag [CALC_PARITY] and debug.
03818 | 5. **SAU-Light:** Update GSD with validated calculation routing. Update Claude memory: M-M1 complete, physics verified, test matrix operational.
03819 | 
03820 | **TOOLS:** prism_calc, prism_validate, prism_dev→file_write
03821 | 
03822 | **EXIT CONDITIONS:**
03823 | - safety_calc_test_matrix.py operational
03824 | - 50 calculations pass on mcp-server
03825 | - prism-platform results within ±2σ of mcp-server (or [CALC_PARITY] flags documented)
03826 | - SAU-Light complete
03827 | 
03828 | **HANDOFF:** ROADMAP_TRACKER.md: M-M1 COMPLETE. Test matrix baselines. → M-M1 PHASE COMPLETE.
03829 | 
03830 | ---
03831 | 
03832 | ### PHASE M-M2: DATA CAMPAIGNS
03833 | 
03834 | **Sessions: 15-25 | Microsessions: Batch-driven (see below) | Chats: ~15-25 (Chats 15-35+, interleaved with Enterprise)**
03835 | 
03836 | **PURPOSE:** Populate the manufacturing knowledge base with validated data through systematic batch campaigns. This is the longest-running phase in the project. It runs in parallel with E1-E3 enterprise phases. After M-M2, the system has production-grade manufacturing data coverage.
03837 | 
03838 | **PREREQUISITES:** M-M1 COMPLETE + P3-MS1 COMPLETE (batch resilience operational) + registries loading > 95% (P0-MS1).
03839 | 
03840 | **CROSS-TRACK DEPENDENCIES:** See Section 3.9 for timing dependencies with Enterprise phases.
03841 | 
03842 | **HUMAN VALIDATION GATES (NEW in v8.5):**
03843 | ```
03844 | WHY THIS EXISTS:
03845 |   The validation chain is self-referential: Claude ingests source data, Claude validates
03846 |   it against Ω thresholds, Claude runs the test matrix, Claude certifies. If the source
03847 |   data has systematic errors (wrong units, misattributed alloy family, incorrect hardness
03848 |   ranges), the self-referential chain cannot detect it because it validates against the
03849 |   same data it ingested. A human with shop floor experience can catch errors that pass
03850 |   mathematical validation but are physically wrong.
03851 | 
03852 | GATE H-1: M-M2 Batch 10 (~week 20) — "First Contact"
03853 |   TRIGGER: M-M2 SAU-Light at batch 10 (250+ material entries validated)
03854 |   PROCEDURE:
03855 |     1. Export 10 random material entries as HUMAN_REVIEW_BATCH10.json:
03856 |        → 3 common steels (4140, 1045, A2 tool steel or similar)
03857 |        → 3 aluminum alloys (6061, 7075, 2024 or similar)
03858 |        → 2 stainless steels (304, 316 or similar)
03859 |        → 2 specialty (titanium, Inconel, or whatever is available)
03860 |     2. For each entry, extract and present in readable format:
03861 |        → Kienzle kc1.1 and mc coefficients
03862 |        → Recommended cutting speed range (SFM) for roughing and finishing
03863 |        → Recommended feed per tooth range for typical endmill diameters
03864 |        → Hardness range and condition state
03865 |     3. Provide to manufacturing engineer / machinist with the question:
03866 |        "Do these numbers match your experience? Would you trust these parameters
03867 |        to run a first article on your machine?"
03868 |     4. Document feedback in HUMAN_REVIEW_LOG.md:
03869 |        → [CONFIRMED] Entry X: parameters within operator's expected range
03870 |        → [SUSPICIOUS] Entry X: [parameter] seems [high/low] for [material]
03871 |        → [REJECTED] Entry X: [parameter] is physically wrong because [reason]
03872 |     5. Any [REJECTED] entry → trace source data → investigate entire alloy family
03873 |        → potential campaign rollback per Section 6.4 if systematic
03874 |     6. Any [SUSPICIOUS] entry → widen uncertainty band, flag for follow-up at H-2
03875 |   EXIT: HUMAN_REVIEW_LOG.md exists for batch 10. Zero [REJECTED] entries OR
03876 |   rollback initiated. Results inform remaining campaign execution.
03877 |   EFFORT: ~30 min of engineer time. Batch export is automated.
03878 | 
03879 | GATE H-2: M-M2 Batch 20 (~week 28) — "Coverage + Calculation Validation"
03880 |   TRIGGER: P-UAT-MS1 trigger (≥900 validated materials, 1,000 processed)
03881 |   PROCEDURE:
03882 |     1. Export 10 entries focusing on EDGE CASES:
03883 |        → 3 entries from alloy families with highest quarantine rates
03884 |        → 3 entries at extreme hardness ranges (annealed vs Q&T 50+ HRC)
03885 |        → 2 entries from the most recently ingested batches
03886 |        → 2 entries randomly selected from different alloy families than H-1
03887 |     2. Same review format as H-1
03888 |     3. Additionally: present 3 CALCULATION OUTPUTS (not just raw data):
03889 |        → Run prism_calc→speed_feed for a common roughing scenario
03890 |        → Run prism_calc→tool_life for a typical insert
03891 |        → Run prism_calc→cutting_force for a slotting operation
03892 |        → Ask: "Would you run these parameters on your machine?"
03893 |     4. Document in HUMAN_REVIEW_LOG.md (append)
03894 |   EXIT: H-2 results documented. Calculation outputs confirmed reasonable.
03895 |   BLOCKS: P-UAT-MS1 cannot proceed if ANY calculation output is [REJECTED].
03896 | 
03897 | GATE H-3: M-M2 Batch 30 (~week 35) — "Machine + Alarm + Compliance Validation"
03898 |   TRIGGER: SAU-Light at batch 30 (machines approaching complete)
03899 |   PROCEDURE:
03900 |     1. Export 5 machine entries:
03901 |        → Verify max RPM, max feed rate, axis travel match published specs
03902 |        → Cross-reference: can this machine physically execute the recommended
03903 |          cutting parameters for [steel X] from the materials database?
03904 |     2. Export 5 alarm entries from the operator's controller family:
03905 |        → Ask: "Is this fix procedure what you would actually do?"
03906 |        → Alarm fix procedures that say "contact service" are FAILURES —
03907 |          operators need actionable steps
03908 |     3. If M-M3 has started: present 3 sample compliance artifacts:
03909 |        → Material certification record, process validation record, nonconformity record
03910 |        → Ask: "Would these records satisfy your quality auditor?"
03911 |     4. Document in HUMAN_REVIEW_LOG.md (append)
03912 |   EXIT: Machine specs confirmed against published data. Alarm fixes confirmed
03913 |   actionable. Any generic "contact service" alarm procedures flagged for enrichment.
03914 | ```
03915 | 
03916 | **QUARANTINE BUDGET PROTOCOL (NEW in v8.5):**
03917 | ```
03918 | PROBLEM:
03919 |   A batch with 5 quarantine items consumes the entire session in resolution
03920 |   (root cause → fix → re-validate → document = ~3 tool calls per item = 15 calls).
03921 |   This produces zero batch throughput for that session.
03922 | 
03923 | SOLUTION — QUARANTINE DEFERRED RESOLUTION:
03924 |   During steady-state batch execution, quarantine resolution is TIME-BOXED:
03925 | 
03926 |   PER SESSION:
03927 |     → First 80% of tool call budget: batch processing (pipeline → validate → checkpoint)
03928 |     → Last 20% of budget: quarantine triage (classify, not resolve)
03929 |     → Quarantine items classified as:
03930 |       [Q-IMMEDIATE]: S(x) failure, data corruption, physically impossible values
03931 |         → Resolve NOW, consuming remaining budget
03932 |       [Q-DEFERRED]: Ω < 0.70 but not safety-critical, source conflict, marginal params
03933 |         → Log to QUARANTINE_BACKLOG.json with batch number and failure reason
03934 |         → Resolve in dedicated quarantine-resolution sessions (see below)
03935 | 
03936 |   QUARANTINE RESOLUTION SESSIONS (every 5th M-M2 session):
03937 |     → Dedicate 1 session to quarantine backlog resolution
03938 |     → Entry: read QUARANTINE_BACKLOG.json
03939 |     → Process [Q-DEFERRED] items: root cause → fix → re-validate → accept or reject
03940 |     → Exit: QUARANTINE_BACKLOG.json updated, resolved items removed
03941 |     → This prevents quarantine debt from accumulating indefinitely
03942 | 
03943 |   QUARANTINE DEBT CEILING:
03944 |     → If QUARANTINE_BACKLOG.json exceeds 50 unresolved items: STOP batches
03945 |     → Dedicate next 2 sessions to full quarantine resolution
03946 |     → Resume batches only when backlog < 25 items
03947 | 
03948 |   THROUGHPUT DEGRADATION TRIGGER:
03949 |     → If by M-M2 batch 15 (~session 5), average throughput < 3 batches/session:
03950 |       1. Analyze root cause: quarantine handling? source data quality? tool call budget?
03951 |       2. If quarantine rate > 8% sustained: activate full quarantine triage above
03952 |       3. If tool call budget is bottleneck: increase MS limit to 20 for M-M2 batch sessions
03953 |       4. If source data quality: pause campaign, focus 2 sessions on source audit
03954 |       5. Document in CAMPAIGN_DASHBOARD: [THROUGHPUT_DEGRADED] with cause and plan
03955 |     → If average throughput stays below 2 batches/session for 10+ sessions:
03956 |       Emergency Off-Ramp trigger #5 (Section 3.11) fires.
03957 | ```
03958 | 
03959 | **INTERLEAVING OVERHEAD BUDGET (NEW in v8.5):**
03960 | ```
03961 | Every session that switches tracks (M-M2 ↔ Enterprise) costs ~2-3 tool calls:
03962 |   - Read TASK_QUEUE.json (ATCS state)
03963 |   - Read dependency table (Section 3.9)
03964 |   - Determine which track to execute
03965 | This is NOT free. Budget 2 tool calls at the START of every interleaved session.
03966 | Effective tool call budget for MS work: 13 (not 15) during interleaving period.
03967 | ```
03968 | 
03969 | ---
03970 | 
03971 | #### M-M2 Campaign Structure
03972 | 
03973 | Each data campaign follows this cycle:
03974 | 
03975 | ```
03976 | BATCH CYCLE:
03977 | 1. Load raw data file(s) for this batch
03978 | 2. Run data_ingestion_pipeline.py with appropriate template:
03979 |    - Materials: batch_size=50, omega_threshold=0.70
03980 |    - Machines: batch_size=25, omega_threshold=0.70
03981 |    - Alarms: batch_size=100, omega_threshold=0.65
03982 | 3. Review pipeline output: accepted, quarantined, errors
03983 | 4. If quarantine rate > 10%: STOP, investigate root cause before next batch
03984 | 5. Update CAMPAIGN_DASHBOARD.json via campaign_dashboard_updater.py
03985 | 6. ATCS checkpoint (compaction survival)
03986 | 7. Every 5th batch: run mfg_batch_validator.py for cross-reference validation
03987 | 8. Every 10th batch: SAU-Light (GSD + quick-ref + Claude memory)
03988 | 
03989 | QUALITY TIERS FOR BATCH OPERATIONS:
03990 |   - Individual entry validation: QUICK (S(x) only, 0 API calls, <1s per entry)
03991 |   - Every 50th entry: DEEP (ralph_loop, 4-7 API calls, ~30s) — spot-check quality
03992 |   - Batch-level validation (every 5th batch): STANDARD (scrutinize, 1 call, ~5s)
03993 |   - Phase exits (M-M1 COMPLETE, M-M2 COMPLETE): RELEASE (assess+compute, ~45s)
03994 | ```
03995 | 
03996 | #### Swarm Pattern Assignments for M-M2 Campaigns
03997 | 
03998 | Each campaign type uses a specific swarm pattern for optimal throughput. Configure all 5 patterns in M-M2-MS1 Step 3. Store config in CAMPAIGN_DASHBOARD.json under `swarm_config`. Test each with 3 sample entries before full campaign.
03999 | 
04000 | ```
04001 | MATERIALS:  map_reduce swarm
04002 |   → 5 Haiku agents split material entries by alloy family
04003 |   → Each agent validates independently against Kienzle/Johnson-Cook constraints
04004 |   → Reducer merges results, resolves conflicts, generates batch summary
04005 |   → Throughput: ~10 entries/min
04006 | 
04007 | MACHINES:   specialist_team swarm
04008 |   → 4 agents specialized by machine type (mill, lathe, multi-axis, EDM)
04009 |   → Each validates specs against manufacturer data for their type
04010 |   → Team lead agent cross-references tool capacity vs material requirements
04011 |   → Throughput: ~8 entries/min
04012 | 
04013 | ALARMS:     pipeline swarm
04014 |   → 3-stage pipeline: decode → verify_fix_procedure → cross_reference_related
04015 |   → Each stage runs independently, entries flow through
04016 |   → Highest throughput for high-volume alarm processing
04017 |   → Throughput: ~15 entries/min
04018 | 
04019 | VALIDATION: redundant_verify swarm
04020 |   → 2 independent validators check same batch results
04021 |   → Disagreements flagged for manual review
04022 |   → Used for every 5th-batch validation gate
04023 |   → Throughput: ~5 min/batch
04024 | 
04025 | CROSS-BATCH: consensus swarm
04026 |   → 3 agents analyze: range distribution, statistical consistency, reference comparison
04027 |   → Used for every 10th-batch deep consistency check
04028 |   → Detects drift patterns across batch boundaries
04029 |   → Throughput: ~10 min/check
04030 | ```
04031 | 
04032 | Configure all 5 swarm patterns at M-M2-MS1 Step 3. Store config in CAMPAIGN_DASHBOARD.json under `swarm_config`. Test each with 3 sample entries before full campaign.
04033 | 
04034 | #### M-M2 Milestone Map
04035 | 
04036 | | Batch # | Materials | Machines | Alarms | Milestone | Cross-Track |
04037 | |---------|-----------|----------|--------|-----------|-------------|
04038 | | 1-5 | 250 entries | 125 entries | 500 entries | Campaign stabilization | E1 can use as WAL test data |
04039 | | 10 | 500 entries | 250 entries | 1,000 entries | SAU-Light. **H-1 human gate (v8.5).** E2 cost calibration possible. | E2-MS3 unblocked |
04040 | | 15 | 750 entries | 375 entries | 1,500 entries | E2 finance export possible | E2-MS7 unblocked |
04041 | | 20 | **1,000 entries** | 500 entries | 2,000 entries | **P-UAT-MS1 TRIGGER. H-2 human gate (v8.5).** | UAT with real data |
04042 | | 30 | 1,500 entries | ~750/RAW_AVAILABLE | 3,000 entries | SAU-Light. **H-3 human gate (v8.5).** Machines approaching RAW_AVAILABLE (~750/824). | E3 telemetry has real data |
04043 | | 40 | 2,000 entries | — | 4,000 entries | Materials campaign past 50% | — |
04044 | | 50+ | 2,500+ entries | — | 5,000+ entries | Approaching RAW_AVAILABLE ceiling | — |
04045 | | FINAL | RAW_AVAILABLE | RAW_AVAILABLE | RAW_AVAILABLE | Campaign complete | E4 replication has full data |
04046 | 
04047 | **Campaign Plateau Contingency (NEW in v8.3):**
04048 | ```
04049 | CAMPAIGN CEILING DETECTION:
04050 |   If 3 consecutive batches show < 5% net new validated entries (after quarantine):
04051 |   1. FLAG: [CAMPAIGN_CEILING] in CAMPAIGN_LOG.md
04052 |   2. ANALYZE: quarantine rate — if > 40%, data quality issue (fix data, not campaign)
04053 |   3. ANALYZE: remaining RAW_AVAILABLE — if < 10% unprocessed, campaign is legitimately complete
04054 |   4. DECISION:
04055 |      a. If systematic invalidity (bad schema, impossible values): fix data source → re-run failed batch
04056 |      b. If legitimate ceiling (all valid data processed): mark category COMPLETE at current count
04057 |      c. If quarantine-heavy (>40%): triage quarantined entries — some may be recoverable with relaxed constraints
04058 |   5. DOCUMENT: "Materials: X/RAW_AVAILABLE (Y% coverage), ceiling reason: [reason]"
04059 |   6. DO NOT block downstream consumers (E3, E4, M-FINAL) on theoretical 100% — 
04060 |      actual coverage with [CAMPAIGN_CEILING] documented is sufficient for M-FINAL gate #4.
04061 | ```
04062 | 
04063 | #### M-M2 First Cycle Microsessions (Batches 1-5, fully specified)
04064 | 
04065 | ---
04066 | 
04067 | ##### M-M2-MS1: Campaign Initialization
04068 | 
04069 | **Effort:** ~12 tool calls | **Quality Tier:** DEEP
04070 | 
04071 | **ENTRY CONDITIONS:**
04072 | - M-M1 COMPLETE (knowledge validated)
04073 | - P3-MS1 COMPLETE (batch resilience operational)
04074 | - Campaign templates exist (created in SU-4)
04075 | - CAMPAIGN_DASHBOARD.json exists (from M-M0-MS3)
04076 | 
04077 | **STEPS:**
04078 | 
04079 | 1. Verify all prerequisites: batch resilience, templates, dashboard, registries.
04080 | 2. Load material_batch_template.json. Configure for first batch: source files, output registry, quarantine log.
04081 | 3. **Configure swarm patterns:** Set up all 5 patterns from M-M2 Swarm Pattern Assignments section. Write config to CAMPAIGN_DASHBOARD.json `swarm_config`. Test map_reduce with 3 sample materials before running full batch.
04082 | 4. Run data_ingestion_pipeline.py for material batch 1 (entries 1-50) using map_reduce swarm. Monitor: acceptance rate, quarantine rate, Ω scores.
04083 | 5. Run mfg_batch_validator.py on batch 1 results using redundant_verify swarm. Verify cross-references.
04084 | 6. Update CAMPAIGN_DASHBOARD.json. Verify batch 1 recorded.
04085 | 7. If quarantine rate > 10%: diagnose. Common causes: schema mismatch, unit conversion errors, missing reference data. Fix root cause before batch 2.
04086 | 8. ATCS checkpoint.
04087 | 
04088 | **TOOLS:** prism_data, prism_validate, prism_hook→execute, ATCS checkpoint
04089 | 
04090 | **EXIT CONDITIONS:**
04091 | - Material batch 1 complete: ≥ 45/50 accepted (quarantine ≤ 10%)
04092 | - CAMPAIGN_DASHBOARD updated
04093 | - ATCS checkpoint written
04094 | - Any quarantine root causes documented
04095 | 
04096 | **HANDOFF:** Batch 1 results. Quarantine analysis if applicable.
04097 | 
04098 | ---
04099 | 
04100 | ##### M-M2-MS2: Machine + Alarm Campaign Start
04101 | 
04102 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD
04103 | 
04104 | **ENTRY CONDITIONS:**
04105 | - M-M2-MS1 COMPLETE (material batch 1 successful)
04106 | 
04107 | **STEPS:**
04108 | 
04109 | 1. Load machine_batch_template.json. Run machine batch 1 (entries 1-25).
04110 | 2. Validate machine entries: verify specs against manufacturer data where available.
04111 | 3. Load alarm_batch_template.json. Run alarm batch 1 (entries 1-100).
04112 | 4. Validate alarm entries: verify fix procedures are actionable.
04113 | 5. Update CAMPAIGN_DASHBOARD for all three categories.
04114 | 6. ATCS checkpoint.
04115 | 
04116 | **EXIT CONDITIONS:**
04117 | - Machine batch 1: ≥ 22/25 accepted
04118 | - Alarm batch 1: ≥ 90/100 accepted (alarm threshold is 0.65)
04119 | - Dashboard updated for all categories
04120 | - ATCS checkpoint written
04121 | 
04122 | **HANDOFF:** Batch results for all three categories.
04123 | 
04124 | ---
04125 | 
04126 | ##### M-M2-MS3: Material Batches 2-3 + Error Pattern Enrichment
04127 | 
04128 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD
04129 | 
04130 | **ENTRY CONDITIONS:**
04131 | - M-M2-MS2 COMPLETE
04132 | 
04133 | **STEPS:**
04134 | 
04135 | 1. Run material batches 2 and 3 (entries 51-150).
04136 | 2. After each batch: update dashboard, ATCS checkpoint.
04137 | 3. Analyze quarantine patterns across batches 1-3. Identify systematic issues.
04138 | 4. Feed quarantine patterns into PLATFORM-ERROR-PATTERN database — these are REAL manufacturing data errors, not test errors. High value for the learning pipeline.
04139 | 5. Run mfg_batch_validator.py on cumulative results (150 entries). Check for cross-reference inconsistencies.
04140 | 
04141 | **EXIT CONDITIONS:**
04142 | - Material batches 2-3 complete with < 10% quarantine each
04143 | - Error patterns from quarantine fed to learning pipeline
04144 | - Cumulative validation passes
04145 | - Dashboard current
04146 | 
04147 | **HANDOFF:** Cumulative results. Error patterns discovered.
04148 | 
04149 | ---
04150 | 
04151 | ##### M-M2-MS4: Machine Batches 2-3 + Alarm Batches 2-3
04152 | 
04153 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD
04154 | 
04155 | **ENTRY CONDITIONS:**
04156 | - M-M2-MS3 COMPLETE
04157 | 
04158 | **STEPS:**
04159 | 
04160 | 1. Run machine batches 2-3 (entries 26-75). Validate.
04161 | 2. Run alarm batches 2-3 (entries 101-300). Validate.
04162 | 3. Cross-reference: do machine capabilities align with material cutting parameters? (e.g., machine max RPM sufficient for recommended cutting speed at min diameter?)
04163 | 4. Update dashboard. ATCS checkpoint.
04164 | 
04165 | **EXIT CONDITIONS:**
04166 | - Machine batches 2-3 complete
04167 | - Alarm batches 2-3 complete
04168 | - Cross-reference validation passes
04169 | - Dashboard current
04170 | 
04171 | **HANDOFF:** Results. Cross-reference findings.
04172 | 
04173 | ---
04174 | 
04175 | ##### M-M2-MS5: Material Batches 4-5 + First Validation Gate
04176 | 
04177 | **Effort:** ~18 tool calls | **Quality Tier:** DEEP
04178 | 
04179 | **ENTRY CONDITIONS:**
04180 | - M-M2-MS4 COMPLETE
04181 | 
04182 | **STEPS:**
04183 | 
04184 | 1. Run material batches 4-5 (entries 151-250).
04185 | 2. **FIRST VALIDATION GATE (batch 5):** Run mfg_batch_validator.py comprehensive mode:
04186 |    - Total entries validated across all categories
04187 |    - Quarantine rate trending (improving? worsening?)
04188 |    - Ω score distribution (are scores clustered near threshold or well above?)
04189 |    - Material coverage by alloy family (steels, aluminums, titaniums, nickel alloys, etc.)
04190 |    - Identify coverage gaps: which alloy families are underrepresented?
04191 | 3. Generate M-M2 PROGRESS_REPORT.md with: entry counts, quarantine analysis, coverage analysis, estimated batches to RAW_AVAILABLE.
04192 | 4. Update dashboard. ATCS checkpoint.
04193 | 
04194 | **EXIT CONDITIONS:**
04195 | - 250 material entries, 75 machine entries, 300 alarm entries loaded
04196 | - Quarantine rate < 10% for most recent batch
04197 | - PROGRESS_REPORT.md generated
04198 | - Coverage gaps identified
04199 | - Dashboard current
04200 | 
04201 | **HANDOFF:** Progress report. Coverage gaps for prioritization.
04202 | 
04203 | ---
04204 | 
04205 | ##### M-M2-MS6: Campaign Steady State Protocol
04206 | 
04207 | **Effort:** ~10 tool calls | **Quality Tier:** STANDARD
04208 | 
04209 | **ENTRY CONDITIONS:**
04210 | - M-M2-MS5 COMPLETE (first validation gate passed)
04211 | 
04212 | **STEPS:**
04213 | 
04214 | 1. Document the steady-state campaign protocol for remaining batches:
04215 |    ```
04216 |    STEADY STATE (batches 6+):
04217 |    Every batch: pipeline → validate → dashboard → ATCS checkpoint
04218 |    Every 5th batch: mfg_batch_validator.py comprehensive
04219 |    Every 10th batch: SAU-Light + progress report
04220 |    At batch 20: P-UAT-MS1 trigger (1,000 materials)
04221 |    At batch 30: SAU-Light + machines likely complete
04222 |    At RAW_AVAILABLE: campaign complete for that category
04223 |    ```
04224 | 2. Configure ATCS for autonomous batch execution: queue remaining batches as ATCS tasks with checkpoint_every=2.
04225 | 3. Test autonomous execution: queue batches 6-8, let ATCS execute with checkpoints.
04226 | 4. Verify: if compaction hits during autonomous execution, ATCS resumes correctly.
04227 | 
04228 | **ATCS EXECUTION MODEL — CRITICAL CLARIFICATION (NEW in v8.4):**
04229 | ```
04230 | ATCS is NOT a background daemon. It has no persistent process between Claude sessions.
04231 | "Autonomous" means: ATCS maintains a QUEUE of pending work that EXECUTES when a 
04232 | Claude session starts and invokes prism_dev→session_boot.
04233 | 
04234 | HOW IT WORKS:
04235 |   1. M-M2-MS6 queues batches 6+ as ATCS tasks (with checkpoint_every=2)
04236 |   2. ATCS writes queued tasks to C:\PRISM\autonomous-tasks\TASK_QUEUE.json
04237 |   3. On next session start: SessionLifecycleEngine reads TASK_QUEUE.json
04238 |   4. If queued tasks exist AND current chat is an M-M2 chat: ATCS auto-starts next batch
04239 |   5. ATCS processes batches WITHIN the active session, checkpointing every 2 batches
04240 |   6. On session end or compaction: ATCS writes checkpoint, remaining tasks stay queued
04241 |   7. Next session: ATCS resumes from checkpoint
04242 | 
04243 | THROUGHPUT IMPLICATIONS:
04244 |   - Batches only advance during active Claude sessions (not between sessions)
04245 |   - At ~3-5 batches per M-M2 chat, reaching batch 50+ requires ~10-15 M-M2 chats
04246 |   - This is accounted for in the interleaving protocol: M-M2 chats alternate with Enterprise
04247 |   - Estimated campaign duration: weeks 15-44 (~30 weeks, not continuous)
04248 |   - Total M-M2 chats needed: ~15-20 (interleaved with Enterprise chats 18-44)
04249 | 
04250 | WHAT "AUTONOMOUS" ACTUALLY MEANS:
04251 |   - Zero manual batch configuration after M-M2-MS6 (ATCS handles sequencing)
04252 |   - Zero manual checkpoint management (ATCS handles recovery)
04253 |   - Zero manual campaign tracking (dashboard auto-updates)
04254 |   - The operator just starts sessions — ATCS handles the rest WITHIN sessions
04255 | ```
04256 | 
04257 | **EXIT CONDITIONS:**
04258 | - Steady-state protocol documented and tested
04259 | - ATCS autonomous execution verified (queue → session start → auto-execute → checkpoint)
04260 | - Compaction recovery during batch execution verified
04261 | - Campaign can proceed with minimal per-session supervision
04262 | - TASK_QUEUE.json format documented in HANDOFF.json
04263 | 
04264 | **HANDOFF:** ROADMAP_TRACKER.md: M-M2 steady state established. ATCS managing batch queue. Campaign continues via ATCS queue-and-execute model with checkpoints at defined intervals. → Remaining M-M2 batches execute per steady-state protocol when M-M2 sessions are started, interleaved with Enterprise track chats.
04265 | 
04266 | ---
04267 | 
04268 | ### PHASE M-M3: COMPLIANCE + MANUFACTURING PLUGINS
04269 | 
04270 | **Sessions: 3-4 | Microsessions: 4 | Chats: 2-3 (interleaved with E3)**
04271 | 
04272 | **PURPOSE:** Build compliance and regulatory plugins for manufacturing: ISO certification support, material traceability, process validation documentation. After M-M3, the system can generate compliance documentation for manufacturing audits.
04273 | 
04274 | **PREREQUISITES:** M-M2 batch ≥ 30 complete (substantial data coverage).
04275 | 
04276 | **COMPLIANCE DOMAIN PROTOCOL (NEW in v8.5):**
04277 | ```
04278 | THE PROBLEM:
04279 |   Compliance is a domain expertise problem, not a code generation problem.
04280 |   Claude can build the infrastructure (certificate generation, audit trail
04281 |   logging, process validation records) but cannot determine whether the
04282 |   CONTENT of those artifacts would satisfy an actual auditor.
04283 | 
04284 | ENHANCED APPROACH:
04285 |   Each M-M3 MS includes a standards research step and generates sample
04286 |   artifacts for the H-3 domain expert reviewer at batch 30. Compliance
04287 |   infrastructure is built AGAINST specific ISO clause requirements
04288 |   (researched in MS1), not generic "compliance features."
04289 | ```
04290 | 
04291 | ---
04292 | 
04293 | #### M-M3-MS1: ISO Compliance Framework + Standards Research
04294 | 
04295 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M2 batch ≥ 30 complete.
04296 | 
04297 | **STEPS:**
04298 | 0. **Standards research (NEW in v8.5):** Before implementation, research current ISO 9001:2015 / AS9100D requirements relevant to CNC manufacturing process control. Identify specific applicable clauses:
04299 |    - Clause 7.1.5: Monitoring and measuring resources (calibration)
04300 |    - Clause 8.5.1: Control of production (process parameters)
04301 |    - Clause 8.6: Release of products (inspection and test)
04302 |    - Clause 10.2: Nonconformity and corrective action (quarantine)
04303 |    - Document applicable clauses in C:\PRISM\docs\COMPLIANCE_REQUIREMENTS.md
04304 |    - Build compliance infrastructure AGAINST these specific requirements
04305 | 1. **Import CertificateEngine (757L, Tier 3) NOW** — don't wait for E3. M-M3 IS the consumer.
04306 |    - CertificateEngine generates: ISO 9001 compliance documents, material certificates, process validation reports, audit trails
04307 |    - Import to prism-platform/src/engines/CertificateEngine.ts
04308 |    - Wire certificate-types.ts (105L, already imported at P0-MS5) as the type interface
04309 | 2. Design compliance data model → implement traceability hooks → create audit trail for material certifications
04310 | 3. **Wire CertificateEngine consumers:**
04311 |    - prism_compliance→generate_cert calls CertificateEngine.generateMaterialCert(material_id, test_results)
04312 |    - prism_compliance→audit_trail calls CertificateEngine.getTraceabilityChain(material_id, date_range)
04313 |    - prism_compliance→iso_report calls CertificateEngine.generateISOReport(process_id, template)
04314 |    - M-M2 campaign data feeds CertificateEngine: every validated material entry creates a cert-ready record
04315 | 4. Test with sample ISO 9001 workflow: material cert → process validation → audit trail → report generation
04316 | 
04317 | **EXIT:** Compliance framework operational. CertificateEngine imported and wired to 3 dispatcher actions. COMPLIANCE_REQUIREMENTS.md documents specific ISO clauses. Material traceability working. Audit trail generating from real M-M2 campaign data.
04318 | 
04319 | ---
04320 | 
04321 | #### M-M3-MS2: Process Validation Documentation
04322 | 
04323 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M3-MS1 COMPLETE.
04324 | 
04325 | Build process validation report generator → link calculations to source parameters → generate IQ/OQ/PQ document templates → test with sample machining process.
04326 | 
04327 | **Generate 3 sample compliance artifacts for H-3 review (NEW in v8.5):**
04328 | - Material certification record (tracing material params to source data)
04329 | - Process validation record (tracing cutting params to calculation + safety check)
04330 | - Nonconformity record (tracing a quarantined entry through root cause to resolution)
04331 | These will be reviewed by the domain expert at H-3 gate.
04332 | 
04333 | **EXIT:** Validation reports generating. Calculation traceability complete. 3 sample artifacts generated for H-3 review.
04334 | 
04335 | ---
04336 | 
04337 | #### M-M3-MS3: Material Certification Plugin
04338 | 
04339 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M3-MS2 COMPLETE.
04340 | 
04341 | Build material cert lookup → link to material registry entries → verify cert chain for critical materials → test with aerospace-grade materials.
04342 | 
04343 | **Verify audit trail immutability (NEW in v8.5):** Confirm audit trail is append-only (no edits, no deletes). Every calculation output traces back to: input material data source, calculation engine version, validation result. This is what auditors actually check.
04344 | 
04345 | **EXIT:** Material certification lookup operational. Cert chain verified for critical materials. Audit trail confirmed append-only.
04346 | 
04347 | ---
04348 | 
04349 | #### M-M3-MS4: Compliance Integration + SAU-Light + Domain Review
04350 | 
04351 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD | **ENTRY:** M-M3-MS3 COMPLETE.
04352 | 
04353 | Integration test: full compliance workflow (material cert → process validation → audit trail) → verify AutoPilot routes compliance queries → **SAU-Light**.
04354 | 
04355 | **Domain expert review (NEW in v8.5):** Present complete compliance package to manufacturing engineer (at H-3 gate if timing aligns, or separately). Specific question: "If your QA auditor asked 'how do you validate your CNC parameters?', would this system's output satisfy them?" Document response in HUMAN_REVIEW_LOG.md under M-M3 section.
04356 | 
04357 | **EXIT:** Compliance plugins integrated. AutoPilot routes compliance queries. Domain expert feedback documented. SAU-Light complete. → M-M3 PHASE COMPLETE.
04358 | 
04359 | ---
04360 | 
04361 | ## CROSS-CUTTING TRACKS
04362 | 
04363 | ### P-PERF: Performance Validation (4 microsessions)
04364 | 
04365 | | MS ID | When | Scope | Inserted Into |
04366 | |-------|------|-------|--------------|
04367 | | P-PERF-MS1 | After P2 | Baseline benchmarks with test plugin | Chat 7 (after P2-MS8) |
04368 | | P-PERF-MS2 | After P4 | Full benchmarks with all features | Chat 10b (with SU-4) |
04369 | | P-PERF-MS3 | After E2 | Benchmarks with WAL + cost overhead | E2 final chat (Chat ~26, after E2-MS10, before SU-5) |
04370 | | P-PERF-MS4 | Before DEMO 4 | Final certification. BLOCK if any target missed. Includes safety_calc_test_matrix.py. | Pre-DEMO 4 chat (Chat ~65, after P-UAT-MS3, before SU-6) |
04371 | 
04372 | #### P-PERF-MS3: Enterprise Overhead Benchmarks (NEW in v8.3)
04373 | 
04374 | **Effort:** ~12 tool calls | **Quality Tier:** STANDARD
04375 | 
04376 | **ENTRY CONDITIONS:**
04377 | - E2 COMPLETE (WAL, cost tracking, cross-track flags operational)
04378 | - P-PERF-MS2 baselines available for comparison
04379 | 
04380 | **STEPS:**
04381 | 1. Run performance_benchmark.py with WAL enabled — measure overhead vs P-PERF-MS2 baselines.
04382 | 2. Benchmark: material lookup latency, hook chain latency, boot time, calculation time — all WITH WAL + cost tracking active.
04383 | 3. Measure WAL-specific: write latency, checkpoint flush time, recovery time from simulated crash.
04384 | 4. Measure cost tracking overhead: per-operation cost logging latency.
04385 | 5. Compare all metrics against P-PERF-MS2 baselines. Acceptable overhead: ≤15% increase on any metric.
04386 | 6. If overhead >15%: profile and identify bottleneck. Document in PERF_FINDINGS.md with optimization plan.
04387 | 
04388 | **EXIT CONDITIONS:**
04389 | - All benchmarks recorded with WAL + cost overhead measured
04390 | - Comparison table: P-PERF-MS2 baseline vs MS3 (with enterprise features)
04391 | - Any >15% regression documented with optimization plan
04392 | - Results recorded in ROADMAP_TRACKER.md
04393 | 
04394 | #### P-PERF-MS4: Final Performance Certification (NEW in v8.3)
04395 | 
04396 | **Effort:** ~15 tool calls | **Quality Tier:** DEEP
04397 | 
04398 | **ENTRY CONDITIONS:**
04399 | - P-UAT-MS3 COMPLETE (all [UAT_CRITICAL] resolved)
04400 | - All enterprise features operational (E1-E4 complete)
04401 | - P-PERF-MS3 results available
04402 | 
04403 | **STEPS:**
04404 | 1. Run performance_benchmark.py with FULL system load (all plugins, all hooks, all enterprise features).
04405 | 2. Run safety_calc_test_matrix.py (50 calculations from Section 15) — verify all pass within ±2σ.
04406 | 3. Run boot_efficiency_tracker.py — verify boot time ≤ 8s (RED threshold).
04407 | 4. Benchmark all 10 performance targets from P2-MS7:
04408 |    - Material lookup < 50ms
04409 |    - Hook chain < 10ms
04410 |    - Boot < 3s (GREEN) / < 5s (YELLOW) / < 8s (RED)
04411 |    - Calculation dispatch < 100ms
04412 |    - Registry load < 2s
04413 |    - Context pressure response < 50ms
04414 |    - Compaction detection < 100ms
04415 |    - Agent invocation < 200ms
04416 |    - Batch ingestion < 500ms per entry
04417 |    - WAL checkpoint < 1s
04418 | 5. Compare against ALL previous baselines (MS1, MS2, MS3) — trend analysis.
04419 | 6. Generate PERF_CERTIFICATION.md: pass/fail per target, trend graphs, regression analysis.
04420 | 7. **BLOCK GATE:** If ANY target missed, document remediation plan. M-FINAL cannot proceed until all targets pass or explicit waiver documented with safety justification.
04421 | 
04422 | **EXIT CONDITIONS:**
04423 | - PERF_CERTIFICATION.md exists with 10/10 targets assessed
04424 | - safety_calc_test_matrix.py: 50/50 pass
04425 | - All targets PASS or waiver documented
04426 | - Trend analysis across MS1→MS4 recorded
04427 | - ROADMAP_TRACKER.md updated: P-PERF-MS4 COMPLETE
04428 | 
04429 | ### P-UAT: User Acceptance Testing (3 microsessions)
04430 | 
04431 | | MS ID | When | Scope | Inserted Into |
04432 | |-------|------|-------|--------------|
04433 | | P-UAT-MS1 | After M-M2 batch 20 (= 1,000 material entries processed, ≥900 validated) | Early feedback: lookups, basic calcs | M-M2 interleave chat (Chat ~20, whichever chat contains batch 20 completion) |
04434 | | P-UAT-MS2 | After DEMO 1 | Full workflows, alarm decode, optimization | Post-SU-3 chat (Chat 9, after main-track P-P4-MS1 → MS2 → P-P3-MS4) |
04435 | | P-UAT-MS3 | Before DEMO 4 | Final UAT. BLOCK if critical issues. | Pre-DEMO 4 chat (Chat ~65, before SU-6) |
04436 | 
04437 | #### UAT Scenario Enumeration (NEW in v8.2)
04438 | 
04439 | *8 core scenarios executed by uat_session_runner.py. Scenarios 1-5 tested at P-UAT-MS1, all 8 at P-UAT-MS2/MS3. Pass criteria: >90% of scenarios pass (Section 12). Templates created at P-P3-MS5.*
04440 | 
04441 | | # | Scenario | What It Tests | Pass Criteria |
04442 | |---|----------|---------------|---------------|
04443 | | 1 | **Material Lookup Workflow** | Query material → get full parameters → verify against handbook | Correct params returned, uncertainty bands present |
04444 | | 2 | **Speed/Feed Calculation** | Select material+tool+operation → calculate → validate | S(x) ≥ 0.70, result within ±2σ of reference |
04445 | | 3 | **Alarm Decode + Fix** | Enter alarm code → decode → get fix procedure → verify actionable | Fix procedure is specific (not generic "contact service") |
04446 | | 4 | **Tool Life Prediction** | Input cutting conditions → predict tool life → compare to experience | Prediction within operator's "reasonable" range |
04447 | | 5 | **Batch Campaign Review** | View campaign dashboard → check batch results → review quarantine | Dashboard current, quarantine reasons clear |
04448 | | 6 | **Multi-Operation Sequence** | Rough → semi-finish → finish with parameter changes per op | Params change correctly, tool selection appropriate per op |
04449 | | 7 | **Report Generation** | Run calculation → generate parameter report → verify traceability | Source data traced, all inputs documented |
04450 | | 8 | **Error Recovery** | Trigger intentional error → verify error pattern match → verify fix suggestion | Known error produces actionable fix suggestion |
04451 | 
04452 | #### UAT Critical Issue Resolution Protocol (NEW in v8.3)
04453 | 
04454 | When P-UAT-MS1, MS2, or MS3 identifies critical issues (any scenario FAIL that blocks DEMO or M-FINAL):
04455 | 
04456 | ```
04457 | UAT CRITICAL ISSUE RESOLUTION:
04458 |   1. CLASSIFY: Each failing scenario tagged [UAT_CRITICAL] or [UAT_MINOR]
04459 |      - CRITICAL: Safety calc wrong, data corruption, crash, S(x) < 0.70
04460 |      - MINOR: UI/UX, performance (not safety), formatting
04461 | 
04462 |   2. FIX MICROSESSION: Insert P-UAT-FIX-MS (15-20 tool calls) into the NEXT available chat
04463 |      - ENTRY: P-UAT-MS[N] complete with [UAT_CRITICAL] issues documented
04464 |      - STEPS:
04465 |        a. Read [UAT_CRITICAL] issues from UAT_RESULTS.md
04466 |        b. Root-cause each issue (code_search → file_read → identify fix)
04467 |        c. Apply fixes with validate_anti_regression
04468 |        d. Re-run ONLY failing scenarios via uat_session_runner.py --scenarios=N,N
04469 |        e. Document fixes in UAT_FIX_LOG.md with before/after evidence
04470 |      - EXIT: All [UAT_CRITICAL] scenarios now PASS. [UAT_MINOR] tracked but not blocking.
04471 | 
04472 |   3. TIMING RULES:
04473 |      - After P-UAT-MS1: Fix before DEMO 1 (insert between batch chat and DEMO 1 chat)
04474 |      - After P-UAT-MS2: Fix before DEMO 2 (insert after Chat 9, before next DEMO)
04475 |      - After P-UAT-MS3: Fix before M-FINAL-MS1. BLOCK: M-FINAL cannot start with [UAT_CRITICAL] open.
04476 | 
04477 |   4. ESCALATION: If fix requires >20 tool calls or spans multiple systems:
04478 |      - Convert to ATCS task with checkpoint_every=2
04479 |      - Re-run full UAT scenario suite (not just failing) after ATCS completion
04480 | ```
04481 | 
04482 | ### P-DM: Data Migration (triggered, not scheduled)
04483 | 
04484 | *P-DM is a reactive microsession that fires mid-chat when schema mismatches are detected. It interrupts the current MS at the step boundary (Section 3.4) because schema mismatches corrupt data if left unfixed. P-DM is NOT a scheduled phase — it triggers 0-N times during the project.*
04485 | 
04486 | **Effort:** ~8-12 tool calls per trigger | **Quality Tier:** DEEP (data integrity)
04487 | 
04488 | **ENTRY CONDITIONS (any one triggers P-DM):**
04489 | - PLATFORM-SCHEMA-VERSION hook fires with schema_version < expected
04490 | - Systematic batch error detected (same schema error across 3+ entries in a batch)
04491 | - Import at any MS changes a data format that existing registry entries use
04492 | 
04493 | **STEPS (execute in order, then return to interrupted MS):**
04494 | ```
04495 | 1. ASSESS: What triggered P-DM?
04496 |    → Schema version mismatch: which registry? How many entries affected?
04497 |    → Systematic batch error: which batch? Which field(s)?
04498 |    → Import format change: which import? What changed?
04499 | 
04500 | 2. SCOPE: How many entries need migration?
04501 |    → prism_data→registry_scan: count entries with schema_version < expected
04502 |    → If < 50 entries: inline migration (fix in this P-DM session)
04503 |    → If 50-500 entries: batch migration via schema_migrator.py
04504 |    → If > 500 entries: ATCS-queued migration (queue as ATCS task, handle in next M-M2 chat)
04505 | 
04506 | 3. MIGRATE:
04507 |    → Write migration function in schema_migrator.py (if new migration type)
04508 |    → Create rollback manifest BEFORE migration: snapshot affected entries
04509 |    → Run migration: transform entries, validate each with S(x) ≥ 0.70
04510 |    → If ANY entry fails validation post-migration: ROLLBACK entire migration
04511 | 
04512 | 4. VERIFY:
04513 |    → Run mfg_batch_validator.py on migrated entries
04514 |    → Verify downstream consumers still produce correct output:
04515 |      - prism_calc→speed_feed with migrated material → same result as pre-migration?
04516 |      - MemoryGraphEngine edges for migrated entries → still valid?
04517 |    → Update manifest.expected_schema_version if this was a planned schema change
04518 | 
04519 | 5. DOCUMENT:
04520 |    → ROADMAP_TRACKER: "P-DM triggered at [MS-ID] Step [N]: [reason], [count] entries migrated"
04521 |    → SESSION_INSIGHTS: [PATTERN] or [GOTCHA] entry for the schema change
04522 |    → Return to interrupted MS at next step
04523 | ```
04524 | 
04525 | **EXIT CONDITIONS:**
04526 | - All affected entries migrated to current schema version
04527 | - Rollback manifest stored (can undo if problems surface later)
04528 | - mfg_batch_validator.py passes on migrated entries
04529 | - Downstream consumer spot-check passes (at least 1 calc with migrated data)
04530 | - ROADMAP_TRACKER updated
04531 | 
04532 | **TOOLS:** schema_migrator.py + prism_validate + prism_data + mfg_batch_validator.py + ATCS (if >500 entries)
04533 | 
04534 | | Trigger | Action | Tool |
04535 | |---------|--------|------|
04536 | | Schema version mismatch | schema_migrator.py: forward-migrate, validate, rollback manifest | schema_migrator.py + prism_validate |
04537 | | Systematic batch error | Quarantine → re-run corrected → merge verified | batch_error_handler.py + ATCS replan |
04538 | | Import changes data format | Migrate platform data to match, dual-run validate | dual_run_validator.py + schema_migrator.py |
04539 | 
04540 | #### Schema Mismatch Detection Mechanism (NEW in v8.2)
04541 | 
04542 | ```
04543 | SCHEMA VERSION TRACKING:
04544 |   Every registry entry has a schema_version field (integer, starting at 1).
04545 |   The manufacturing plugin manifest.json contains expected_schema_version per registry type:
04546 |     { "materials": 1, "machines": 1, "alarms": 1, "tools": 1 }
04547 | 
04548 | PLATFORM-SCHEMA-VERSION HOOK (installed at P3-MS1):
04549 |   Fires: on every registry write (batch ingestion, individual update)
04550 |   Logic:
04551 |     1. Read entry.schema_version
04552 |     2. Compare against manifest.expected_schema_version for that registry type
04553 |     3. If entry.schema_version < expected → TRIGGER P-DM protocol
04554 |     4. If entry.schema_version > expected → WARN (future schema from newer code?)
04555 |     5. If entry.schema_version missing → assign current expected_schema_version, WARN
04556 | 
04557 | WHEN SCHEMA CHANGES:
04558 |   1. Update expected_schema_version in manifest.json
04559 |   2. Write schema_migrator.py migration function for old→new
04560 |   3. PLATFORM-SCHEMA-VERSION detects old entries → queues P-DM migration
04561 |   4. schema_migrator.py runs: transforms old entries, validates, writes rollback manifest
04562 |   5. If migration fails: rollback to pre-migration state using manifest
04563 | 
04564 | SCHEMA MIGRATOR SCRIPT (created on first P-DM trigger, ~200 lines):
04565 |   schema_migrator.py capabilities:
04566 |   - Forward migration: v1→v2, v2→v3, etc. (each version has a transform function)
04567 |   - Rollback: reads rollback manifest → restores original entries
04568 |   - Dry-run mode: --dry-run flag shows what WOULD change without writing
04569 |   - Validation: every migrated entry passes S(x) ≥ 0.70 or migration fails
04570 |   - Audit trail: writes SCHEMA_MIGRATION_LOG.md with: timestamp, version change, entry count, success/failure
04571 | ```
04572 | 
04573 | ---
04574 | 
04575 | ## ENTERPRISE TRACK: E1-E4
04576 | 
04577 | **~82 microsessions across 4 phases with buffer MS for integration issues.**
04578 | 
04579 | ### Phase Overview
04580 | 
04581 | | Phase | MS Count | Chats | Key Components |
04582 | |-------|---------|-------|---------------|
04583 | | E1: WAL + Replay | 18 | 5-6 | Binary format, CRC32, snapshots, replay sandbox, what-if, retention+encryption, integration, buffer |
04584 | | E2: Cost Intelligence | 10 | 3-4 | Cost model, attribution, value calc, budget alerts, finance export, integration, buffer |
04585 | | E3: Visual Platform | 30 | 8-10 | React, FlowCanvas, dashboards, HookDesigner, ReplayViewer, compliance, SDK, marketplace, hot-install, buffer |
04586 | | E4: Enterprise Readiness | 24 | 6-8 | Replication, WAL streaming, heartbeat, failover, reconciliation, connectors, multi-tenant, integration, buffer |
04587 | 
04588 | ### Enterprise MS Spec Template
04589 | 
04590 | Each E-phase MS follows this pattern:
04591 | 
04592 | ```
04593 | ENTRY: Prior MS complete + build passes + performance within baselines
04594 | STEPS: 1) Read relevant architecture docs  2) Design component  3) Implement  
04595 |        4) Unit test  5) Integration test with existing systems  6) Verify 
04596 |        performance hasn't degraded  7) Build changed codebase only
04597 | EXIT: Component functional + integrated + performance neutral + anti-regression passes
04598 | HANDOFF: ROADMAP_TRACKER + PLATFORM_STATE + IMPORT_LOG if applicable
04599 | HOOKS: Register relevant hooks when their dependencies are built in this MS
04600 | UPDATE: Run quick_ref_generator.py if hooks or scripts added
04601 | INSIGHT: Write structured SESSION_INSIGHTS.md entry if non-obvious learning
04602 | ```
04603 | 
04604 | ### Enterprise Margin Protocol (NEW in v8.5)
04605 | 
04606 | *82 MS in ~22 chats averages 3.7 MS/chat. With SAU overhead, cross-track checks, and debugging, this is tight. This protocol detects pace problems early.*
04607 | 
04608 | ```
04609 | ENTERPRISE_PACE.md TRACKING:
04610 |   At the END of every enterprise chat, record:
04611 |     - Chat number
04612 |     - MS completed this chat (count and IDs)
04613 |     - MS planned this chat (from Section 11 loading guide)
04614 |     - Delta: completed vs planned
04615 |     - Cumulative delta: total MS behind/ahead of schedule
04616 | 
04617 |   THRESHOLDS:
04618 |     GREEN:  cumulative delta ≥ -2 (up to 2 MS behind schedule)
04619 |     YELLOW: cumulative delta -3 to -5 (3-5 MS behind)
04620 |     RED:    cumulative delta < -5 (more than 5 MS behind)
04621 | 
04622 |   RESPONSE AT YELLOW:
04623 |     1. Analyze: which MS took longer than planned? Why?
04624 |     2. If pattern: adjust chat loading guide to 2-3 MS/chat (not 3-4)
04625 |     3. Consume flex chat if available (FLEX-2, FLEX-E3, FLEX-3)
04626 |     4. Document: ROADMAP_TRACKER [ENTERPRISE_PACE:YELLOW] at chat N
04627 | 
04628 |   RESPONSE AT RED:
04629 |     1. STOP and reassess. Do NOT continue hoping to catch up.
04630 |     2. Options (choose one):
04631 |        a. SCOPE REDUCTION: Identify 5-10 MS that can be simplified to STUB
04632 |        b. SCHEDULE EXTENSION: Add 3-5 chats, push M4 back. Recalculate timeline.
04633 |        c. PARALLEL SIMPLIFICATION: Execute 2 independent MS per chat
04634 |     3. Document: SESSION_INSIGHTS [DECISION] Enterprise pace RED response
04635 |     4. If RED persists 5+ consecutive chats → Emergency Off-Ramp trigger #4 (Section 3.11)
04636 | ```
04637 | 
04638 | ### E3 Architectural Decision Replay Protocol (NEW in v8.5)
04639 | 
04640 | *E3_ARCHITECTURE.md is a passive document that can't enforce consistency. This protocol actively verifies BINDING decisions at every layer boundary.*
04641 | 
04642 | ```
04643 | WHEN: E3-MS5 (Layer 1), E3-MS12 (Layer 2), E3-MS20 (Layer 3), E3-MS30 (Layer 4)
04644 | EFFORT: 4 tool calls per boundary, 16 total over E3
04645 | 
04646 | PROCEDURE (runs BEFORE front-loading next layer):
04647 | 
04648 |   1. READ E3_ARCHITECTURE.md — extract all BINDING decisions
04649 | 
04650 |   2. VERIFY EACH BINDING (automated spot-check):
04651 | 
04652 |      BINDING — Single state store:
04653 |        → grep for "useState" or "useReducer" in components managing SERVER data
04654 |        → Any hit = VIOLATION (local state for UI-only concerns is OK)
04655 |        → Fix: refactor to Zustand store (decided in v10.0 CM-4)
04656 | 
04657 |      BINDING — Data flows through TelemetryBridge only:
04658 |        → grep for "fetch(" or "axios" or direct API calls in React components
04659 |        → Any hit = VIOLATION
04660 |        → Fix: route through TelemetryBridge.subscribe() or .getLatest()
04661 | 
04662 |      BINDING — No event buses, no global mutable state:
04663 |        → grep for "EventEmitter" or "window." assignments in React code
04664 |        → Any hit = VIOLATION
04665 | 
04666 |      BINDING — timeRange prop on all dashboards:
04667 |        → For each dashboard: verify timeRange in props interface
04668 |        → Missing = VIOLATION
04669 | 
04670 |      BINDING — ToolState interface on interactive tools (Layer 3+):
04671 |        → For each tool: verify toJSON/fromJSON/isDirty implementation
04672 |        → Missing = VIOLATION (ATCS can't checkpoint this tool)
04673 | 
04674 |   3. DOCUMENT violations in COHERENCE_AUDIT.md (E3 section)
04675 | 
04676 |   4. FIX all violations BEFORE proceeding to next layer
04677 |      → Violations at layer boundaries are cheaper to fix now than after
04678 |        10 more MS build on top of them
04679 | ```
04680 | 
04681 | ### Enterprise Phase Entry/Exit Minimums (NEW in v8.1)
04682 | 
04683 | *The template above is generic. These phase-level constraints give each unspecified MS a minimum entry/exit framework so a fresh Claude can verify progress without detailed step specs.*
04684 | 
04685 | **E1-MS5 through E1-MS18 (WAL advanced features):**
04686 | ```
04687 | E1-MS5:  What-If Branching Design     | ENTRY: Replay sandbox operational | EXIT: Branch point selection works, comparison renders
04688 | E1-MS6:  What-If Branching Impl       | ENTRY: E1-MS5 | EXIT: 3 branch scenarios tested, state divergence visible
04689 | E1-MS7:  WAL Retention Policy          | ENTRY: WAL >100 entries | EXIT: Retention fires, old entries pruned, index updated
04690 | E1-MS8:  WAL Encryption                | ENTRY: Retention working | EXIT: AES-256 at rest, WAL reader decrypts, CRC32 still valid
04691 | E1-MS9:  WAL Integration Test + SAU-L  | ENTRY: E1-MS8 | EXIT: Write→verify→snapshot→replay→branch→retain→encrypt chain passes. SAU-Light.
04692 | E1-MS10: WAL Performance Optimization  | ENTRY: E1-MS9 | EXIT: Write overhead < 2ms at 10K entries, seek < 100ms
04693 | E1-MS11: WAL Compaction Integration    | ENTRY: E1-MS10 | EXIT: compaction_armor.py includes full WAL state, recovery tested
04694 | E1-MS12: WAL API Design               | ENTRY: E1-MS11 | EXIT: WAL_API.md written, REST/WebSocket endpoints defined
04695 | E1-MS13: WAL API Implementation        | ENTRY: E1-MS12 | EXIT: All API endpoints functional, auth wired
04696 | E1-MS14: WAL Streaming Foundation      | ENTRY: E1-MS13 | EXIT: WAL entries stream to subscriber with < 1s lag
04697 | E1-MS15: WAL Multi-Consumer Support    | ENTRY: E1-MS14 | EXIT: 3 concurrent consumers reading WAL without conflict
04698 | E1-MS16: WAL Error Recovery            | ENTRY: E1-MS15 | EXIT: Corrupted segment skipped, consumer notified, chain resumes
04699 | E1-MS17: WAL Integration Full Suite    | ENTRY: E1-MS16 | EXIT: 50 test scenarios pass, all error paths covered
04700 | E1-MS18: E1 Phase Completion + Buffer  | ENTRY: E1-MS17 | EXIT: All E1 components verified, performance baselines updated
04701 | ```
04702 | 
04703 | **E2-MS1 through E2-MS10 (Cost Intelligence):**
04704 | ```
04705 | E2-MS1:  Cost Model Design             | ENTRY: E1 COMPLETE, SU-4 passed | EXIT: COST_MODEL.md with per-tier rates, overhead formula
04706 | E2-MS2:  Cost Attribution Engine        | ENTRY: E2-MS1 | EXIT: Every dispatcher call attributed to cost category
04707 | E2-MS3:  Cost Calibration              | ENTRY: M-M2 batch ≥10 (or SYNTHETIC_DATA fallback) | EXIT: Estimates within ±10% of actual billing
04708 | E2-MS4:  Value Calculation             | ENTRY: E2-MS3 | EXIT: ROI per feature calculated, value/cost ratio per dispatcher
04709 | E2-MS5:  Budget Alerts + SAU-Light     | ENTRY: E2-MS4 | EXIT: Budget threshold alerts fire, daily/weekly/monthly projections. SAU-Light.
04710 | E2-MS6:  Cost Dashboard                | ENTRY: E2-MS5 | EXIT: Real-time cost display, trend charts, budget burn-down
04711 | E2-MS7:  Finance Export                | ENTRY: M-M2 batch ≥15 (or PARTIAL_COST fallback) | EXIT: CSV/JSON export of cost history, audit trail
04712 | E2-MS8:  Cost Optimization Recs        | ENTRY: E2-MS7 | EXIT: System recommends cheaper agent tiers where quality allows
04713 | E2-MS9:  E2 Integration Test           | ENTRY: E2-MS8 | EXIT: End-to-end cost tracking from dispatch→attribution→alert→export
04714 | E2-MS10: E2 Phase Completion + Buffer  | ENTRY: E2-MS9 | EXIT: All E2 components verified. → SU-5 + SAU-Full
04715 | ```
04716 | 
04717 | **E3-MS1 through E3-MS30 (Visual Platform) (NEW in v8.4):**
04718 | *Front-loading at layer boundaries AUGMENTS these specs (adds detailed steps), it does not replace them. Every MS has a defined deliverable before front-loading begins.*
04719 | ```
04720 | LAYER 1 — Foundation (E3-MS1 through E3-MS5):
04721 | E3-MS1:  React Scaffold + Zustand State Mgmt | ENTRY: E2 COMPLETE, SU-5 passed | EXIT: React app builds, **Zustand** store configured (BINDING — decided in v10.0, see below), TelemetryBridge interface implemented per API contract
04722 | E3-MS2:  WebSocket + Channel Defs       | ENTRY: E3-MS1 | EXIT: WebSocket connects to TelemetryEngine, all 8 channels defined and emitting, TelemetryBridge.subscribe() working
04723 | E3-MS3:  Component Library Foundation    | ENTRY: E3-MS2 | EXIT: Button, Card, Modal, Table, Chart base components built with Tailwind, documented with props
04724 | E3-MS4:  Component Library Extended      | ENTRY: E3-MS3 | EXIT: StatusIndicator, TimeRangeSelector, MetricCard, AlertBanner components, all accept timeRange prop
04725 | E3-MS5:  Auth + Session Management       | ENTRY: E3-MS4 | EXIT: JWT auth per E3 Security Constraints, 3 RBAC roles (OPERATOR/ENGINEER/ADMIN), login/logout/timeout working. **TESTING GATE (v9.0): ≥40% component test coverage on Layer 1 foundation components (React Testing Library). Catches state wiring issues before Layer 2.**
04726 | 
04727 | LAYER 2 — Core Dashboards (E3-MS6 through E3-MS12):
04728 | E3-MS6:  SystemDashboard + Engine Import | ENTRY: E3-MS5 | EXIT: System status display, hook status, registry counts. PredictiveFailureEngine (523L) + PFPEngine (834L) imported and wired to TelemetryBridge "predictions" channel
04729 | E3-MS7:  PredictiveAlertPanel           | ENTRY: E3-MS6 | EXIT: Proactive alerts rendering from PFPEngine data, severity color coding, mitigation suggestions displayed
04730 | E3-MS8:  CampaignDashboard              | ENTRY: E3-MS7 | EXIT: Batch progress bars, quarantine rates, ETA calculations, all reading from "campaign" channel
04731 | E3-MS9:  CalculationDashboard           | ENTRY: E3-MS8 | EXIT: Recent calcs table, accuracy tracking chart, MemoryGraphEngine relationship graph rendering
04732 | E3-MS10: AlarmDashboard + SAU-Light     | ENTRY: E3-MS9 | EXIT: Active alarms, fix history, trend visualization, severity filtering. SAU-Light complete.
04733 | E3-MS11: Dashboard Cross-Integration    | ENTRY: E3-MS10 | EXIT: Global time-range selector works across ALL dashboards, drill-through from system→campaign→calc works
04734 | E3-MS12: Dashboard Polish + Engine Test | ENTRY: E3-MS11 | EXIT: All 4 dashboards render with live data, PredictiveFailure+PFP consumer chains verified (Section 18.1), responsive layout. **TESTING GATE (v9.0): ≥60% component test coverage on Layer 2 dashboard components. All dashboard state management paths tested.**
04735 | 
04736 | LAYER 3 — Interactive Tools (E3-MS13 through E3-MS20):
04737 | E3-MS13: FlowCanvas Foundation          | ENTRY: E3-MS12 | EXIT: Visual workflow builder canvas renders, ToolState interface implemented per API contract, drag-drop node placement
04738 | E3-MS14: FlowCanvas Wiring             | ENTRY: E3-MS13 | EXIT: Nodes connect with typed edges, flow validates against sequencing guides, export to JSON
04739 | E3-MS15: HookDesigner                  | ENTRY: E3-MS14 | EXIT: Visual hook creation (trigger type, priority, script), dependency visualization, test-fire from UI
04740 | E3-MS16: HookDesigner Advanced         | ENTRY: E3-MS15 | EXIT: Hook chain visualization, priority conflict detection, before/after preview, save/load via ToolState
04741 | E3-MS17: ReplayViewer Foundation       | ENTRY: E3-MS16 | EXIT: WAL timeline renders, entry selection shows detail, playback controls (play/pause/step)
04742 | E3-MS18: ReplayViewer + WhatIf        | ENTRY: E3-MS17 | EXIT: Branch point selection, side-by-side comparison of divergent states, branch diff highlighting
04743 | E3-MS19: Interactive Tool Integration  | ENTRY: E3-MS18 | EXIT: All tools save/load via ToolState, ATCS can checkpoint tool state, cross-tool navigation
04744 | E3-MS20: Layer 3 Validation + SAU-L   | ENTRY: E3-MS19 | EXIT: All Layer 3 tools functional with real data, ToolState serialize/deserialize verified, SAU-Light complete. **TESTING GATE (v9.0): ≥70% component test coverage on Layer 3 interactive tools. Drag-drop, timeline, and branching interactions tested.**
04745 | 
04746 | LAYER 4 — Platform (E3-MS21 through E3-MS30):
04747 | E3-MS21: Plugin SDK Design            | ENTRY: E3-MS20 | EXIT: PLUGIN_SDK.md with TypeScript interfaces, manifest schema, lifecycle hooks, example plugin skeleton, **plugin permission tiers (v9.0)**, min_api_version requirement
04748 | E3-MS22: Plugin SDK Implementation     | ENTRY: E3-MS21 | EXIT: createPlugin() helper, manifest validator, hot-reload dev server, 1 example plugin passes end-to-end
04749 | E3-MS23: Marketplace Foundation        | ENTRY: E3-MS22 | EXIT: Plugin registry UI, search/filter, install button, version display, dependency graph
04750 | E3-MS24: Marketplace Install/Update    | ENTRY: E3-MS23 | EXIT: Plugin install downloads + registers + activates, update preserves config, uninstall cleans up
04751 | E3-MS25: Hot-Install Zero-Downtime    | ENTRY: E3-MS24 | EXIT: Plugin install during active workload causes zero dropped requests, verified with load test
04752 | 
04753 | **PLUGIN SECURITY FRAMEWORK (NEW in v9.0):**
04754 | ```
04755 | PERMISSION TIERS:
04756 |   Every plugin declares its required permission tier in manifest.json:
04757 |   
04758 |   TIER 1 — READ_ONLY:
04759 |     Can: Read registry data, read telemetry, read campaign dashboard
04760 |     Cannot: Write data, install hooks, modify calculations, access other tenants
04761 |     Review: Automatic approval (manifest validation only)
04762 |     Example: Custom report generator, data export plugin
04763 |   
04764 |   TIER 2 — UI_EXTEND:
04765 |     Can: All of Tier 1 + add dashboard panels, add navigation items, render custom UI
04766 |     Cannot: Install hooks, modify calculations, access safety-critical engines
04767 |     Review: Automatic approval with UI sandbox verification
04768 |     Example: Custom visualization, workflow builder extension
04769 |   
04770 |   TIER 3 — HOOK_INSTALL:
04771 |     Can: All of Tier 2 + install pre/post hooks on non-safety dispatchers
04772 |     Cannot: Hook into safety-critical calculation chain, modify S(x) thresholds
04773 |     Review: Admin approval required. Hook manifest reviewed.
04774 |     Blocked hooks: Any hook on prism_calc, prism_validate→safety, S(x) computation
04775 |     Example: Custom logging, notification plugins, integration webhooks
04776 |   
04777 |   TIER 4 — CALC_MODIFY:
04778 |     Can: All of Tier 3 + register CalcModel in CalcModelRegistry, hook safety chain
04779 |     Cannot: Modify EXISTING calculation models (only ADD new ones)
04780 |     Review: Admin approval + safety matrix re-run with new model active
04781 |     HARD BLOCK: If safety matrix produces ANY regression, plugin install BLOCKED
04782 |     Example: EDM calculation plugin, additive manufacturing plugin
04783 | 
04784 | PLUGIN SANDBOXING:
04785 |   All plugins execute in isolated context:
04786 |     - No direct file system access (use DataProvider through plugin API)
04787 |     - No direct engine access (use dispatcher actions through plugin API)
04788 |     - Network requests only to declared domains in manifest.json
04789 |     - Memory limit per plugin (configurable per tenant)
04790 |     - Execution timeout per plugin action (default 30s)
04791 | 
04792 | UNINSTALL SAFETY:
04793 |   Before uninstalling a plugin:
04794 |     1. Check dependency graph: does any OTHER plugin depend on this one?
04795 |        → If yes: BLOCK uninstall, show dependent plugins
04796 |     2. Check data ownership: did this plugin create extension fields?
04797 |        → If yes: WARN — extension data will become orphaned
04798 |        → Admin must explicitly confirm data retention or deletion
04799 |     3. Check hook ownership: did this plugin install hooks?
04800 |        → Auto-remove all hooks installed by this plugin
04801 |        → Verify hook chain integrity post-removal
04802 |     4. Clean up: remove plugin from manifest, update HOOK_MANIFEST.json
04803 | 
04804 | PLUGIN MANIFEST SCHEMA (v9.0 additions):
04805 |   {
04806 |     "name": "...",
04807 |     "version": "...",
04808 |     "min_api_version": "1.0.0",        // v9.0: required
04809 |     "permission_tier": "READ_ONLY",     // v9.0: required
04810 |     "required_permissions": [...],       // v9.0: granular permission list
04811 |     "network_domains": [...],            // v9.0: allowed external domains
04812 |     "dependencies": [...],               // v9.0: other plugins required
04813 |     ...existing manifest fields...
04814 |   }
04815 | ```
04816 | 
04817 | E3-MS26: Compliance Dashboard          | ENTRY: E3-MS25 | EXIT: ISO cert status, audit trail visualization, material traceability tree, CertificateEngine data rendering
04818 | E3-MS27: Compliance Reporting          | ENTRY: E3-MS26 | EXIT: Generate/export ISO reports from UI, audit log search, date-range filtering, PDF export
04819 | E3-MS28: E3 Integration Test Suite    | ENTRY: E3-MS27 | EXIT: Cypress/Playwright INTEGRATION test suite covers all dashboards + tools + marketplace, ≥80% UI code coverage. **Progressive gates (v9.0) mean component coverage already ≥70% — this MS focuses on INTEGRATION and end-to-end tests, not building component tests from scratch.**
04820 | E3-MS29: E3 Performance + Polish       | ENTRY: E3-MS28 | EXIT: Initial render < 2s, WebSocket reconnect < 5s, all components accessible (ARIA labels), mobile responsive
04821 | E3-MS30: E3 Phase Completion          | ENTRY: E3-MS29 | EXIT: All E3 components verified, all engine consumers from Section 18.1 confirmed, test suite green, E3_ARCHITECTURE.md final
04822 | ```
04823 | 
04824 | **E4-MS1 through E4-MS24 (Enterprise Readiness) (NEW in v8.4):**
04825 | *Front-loading at E4-MS1 AUGMENTS these specs with detailed steps. E4 Replication Architecture Constraints and Failover Sequence (above) are BINDING.*
04826 | ```
04827 | TENANT FOUNDATION (E4-MS1 through E4-MS6):
04828 | E4-MS1:  Multi-Tenant Data Model       | ENTRY: E3 COMPLETE | EXIT: Tenant schema designed, namespace isolation for WAL/ATCS/registries, TENANT_ARCHITECTURE.md written
04829 | E4-MS2:  Tenant Auth + Provisioning     | ENTRY: E4-MS1 | EXIT: Tenant creation API, tenant-scoped JWT claims, login routes per tenant, admin can create/disable tenants
04830 | E4-MS3:  Tenant Data Isolation          | ENTRY: E4-MS2 | EXIT: Tenant A cannot read Tenant B's WAL/registries/ATCS state, verified with cross-tenant access test
04831 | E4-MS4:  Tenant Config Management       | ENTRY: E4-MS3 | EXIT: Per-tenant .env overrides, hook enablement per tenant, shared plugin code with tenant-specific data
04832 | E4-MS5:  Tenant Dashboard Scoping       | ENTRY: E4-MS4 | EXIT: All E3 dashboards filter by tenant context, admin can view cross-tenant, operators see own tenant only
04833 | E4-MS6:  Tenant Integration Test        | ENTRY: E4-MS5 | EXIT: 3 test tenants provisioned, each with independent data/WAL/ATCS, zero cross-contamination. **SMOKE TEST GATE (v9.0): Tenant isolation verified — cross-tenant data access returns empty, not error.**
04834 | 
04835 | REPLICATION + FAILOVER (E4-MS7 through E4-MS12):
04836 | E4-MS7:  Replication Infrastructure     | ENTRY: E4-MS6 | EXIT: Replica node scaffolded, heartbeat protocol implemented (3 missed = failover), health endpoint
04837 | E4-MS8:  WAL Streaming Replication + SAU-L | ENTRY: E4-MS7 | EXIT: WAL entries stream to replica < 1s lag, replica WAL position tracked, SAU-Light complete
04838 | E4-MS9:  ATCS State Replication         | ENTRY: E4-MS8 | EXIT: ATCS checkpoint files + COMPACTION_SURVIVAL.json replicate per E4 constraint #1, failover resume tested
04839 | E4-MS10: Registry Replication           | ENTRY: E4-MS9 | EXIT: Hourly sync per E4 constraint #3, registry delta detection, conflict resolution (last-write-wins)
04840 | E4-MS11: Failover Sequence Impl        | ENTRY: E4-MS10 | EXIT: Full failover sequence (E4 Failover Sequence above) tested: promote → WAL replay → ATCS resume → GSD update. RTO < 30s.
04841 | E4-MS12: Failover Reconciliation       | ENTRY: E4-MS11 | EXIT: Old primary recovers as replica, WAL divergence reconciled, registry synced, normal replication resumes. **SMOKE TEST GATE (v9.0): Full failover→recovery→reconciliation cycle tested end-to-end with live data.**
04842 | 
04843 | GOVERNANCE + COMPLIANCE (E4-MS13 through E4-MS18):
04844 | E4-MS13: Audit Logging Framework       | ENTRY: E4-MS12 | EXIT: All state-modifying operations logged with tenant, user, timestamp, action, before/after state
04845 | E4-MS14: Compliance Hook Integration   | ENTRY: E4-MS13 | EXIT: CertificateEngine events logged, ISO audit trail complete, compliance dashboard (E3-MS26) shows audit data
04846 | E4-MS15: API Governance                | ENTRY: E4-MS14 | EXIT: Rate limiting per tenant, API versioning, deprecation warnings, usage quotas
04847 | E4-MS16: Data Retention Policies       | ENTRY: E4-MS15 | EXIT: Per-tenant retention config, automated purge of expired WAL/logs/audit entries, retention compliance report
04848 | E4-MS17: Security Audit                | ENTRY: E4-MS16 | EXIT: OWASP Top 10 checklist passed, no plaintext secrets, JWT rotation working, CORS locked down
04849 | E4-MS18: Governance Integration Test   | ENTRY: E4-MS17 | EXIT: Audit trail complete for all critical paths, retention fires on schedule, rate limiting blocks excess. **SMOKE TEST GATE (v9.0): Governance chain verified — unauthorized access blocked, audit trail complete, retention executes.**
04850 | 
04851 | DEPLOYMENT + OPERATIONS (E4-MS19 through E4-MS24):
04852 | E4-MS19: Deployment Configuration      | ENTRY: E4-MS18 | EXIT: Environment configs (dev/staging/prod), feature flags, config validation on startup
04853 | E4-MS19b: External Integration API (v9.0) | ENTRY: E4-MS19 | EXIT: RESTful API surface for CAM/ERP/MES integration. Versioned endpoints (/api/v1/materials, /api/v1/calculations, /api/v1/alarms). Rate limiting per tenant. Tenant-scoped access tokens. OpenAPI spec generated. Read-only by default; write requires CALC_MODIFY equivalent permission.
04854 | E4-MS20: Health Monitoring             | ENTRY: E4-MS19b | EXIT: /health endpoint with component status, Prometheus-compatible metrics, alert thresholds
04855 | E4-MS21: Operational Runbooks          | ENTRY: E4-MS20 | EXIT: RUNBOOK.md with: startup, shutdown, failover, rollback, backup restore, emergency procedures
04856 | E4-MS22: Load Testing                  | ENTRY: E4-MS21 | EXIT: 10 concurrent users, 100 req/s sustained, no degradation beyond benchmarks, memory stable
04857 | E4-MS23: E4 Integration Full Suite     | ENTRY: E4-MS22 | EXIT: Multi-tenant + replication + failover + governance + monitoring end-to-end test passes
04858 | E4-MS24: E4 Phase Completion           | ENTRY: E4-MS23 | EXIT: All E4 components verified, TENANT_ARCHITECTURE.md final, operational runbooks complete, handoff to M4
04859 | ```
04860 | 
04861 | **M4 (Extraction):** Each M4 MS follows the consumer chain mapping protocol (Section M4 body). Entry: prior extraction complete + anti-regression passes. Exit: function extracted + all consumer chains verified in prism-platform + dual_run_validator.py passes for affected dispatchers.
04862 | 
04863 | ### E1 Detailed Specifications (MS1-MS4)
04864 | 
04865 | *E1-MS1 through E1-MS4 are fully specified. E1-MS5+ use the template above.*
04866 | 
04867 | #### E1-MS1: WAL Binary Format + Writer
04868 | 
04869 | **Effort:** ~20 tool calls | **Quality Tier:** DEEP
04870 | 
04871 | **ENTRY CONDITIONS:**
04872 | - P3-P4 COMPLETE (SU-4 + SAU-Full passed)
04873 | - prism-platform builds clean
04874 | - Performance baselines established (P-PERF-MS2)
04875 | 
04876 | **STEPS:**
04877 | 
04878 | 1. Design WAL binary format: header (version, timestamp, CRC32 placeholder), entry (operation type, dispatcher, action, payload length, payload, CRC32). Document format spec in docs/WAL_FORMAT.md.
04879 | 2. Implement WALWriter in src/core/wal/WALWriter.ts.
04880 | 3. Implement WALReader in src/core/wal/WALReader.ts.
04881 | 4. Unit tests: write 100 entries → read back → verify all CRC32 → intentionally corrupt entry #50 → verify reader skips and recovers.
04882 | 5. Wire WALWriter to dispatcher output hook.
04883 | 6. **CRITICAL: Update compaction_armor.py** — add WAL state to survival files.
04884 | 7. Build prism-platform.
04885 | 
04886 | **HOOKS INSTALLED:** PLATFORM-WAL-WRITE (post-dispatcher, priority 80)
04887 | 
04888 | **EXIT CONDITIONS:**
04889 | - WAL binary format documented
04890 | - WALWriter + WALReader operational
04891 | - CRC32 verification passing
04892 | - Corruption recovery working
04893 | - compaction_armor.py updated with WAL state
04894 | - Build passes
04895 | 
04896 | ---
04897 | 
04898 | #### E1-MS2: WAL CRC32 Verification + Integrity Chain
04899 | 
04900 | **Effort:** ~15 tool calls | **Quality Tier:** STANDARD | **ENTRY:** E1-MS1 COMPLETE.
04901 | 
04902 | Implement chain verification → integrity checker → boot integrity check → performance test (< 2ms write overhead).
04903 | 
04904 | **EXIT:** Chain verification implemented. Integrity checker operational. Write overhead < 2ms.
04905 | 
04906 | ---
04907 | 
04908 | #### E1-MS3: Snapshot Indexing + Fast Replay Positioning
04909 | 
04910 | **Effort:** ~18 tool calls | **Quality Tier:** STANDARD | **ENTRY:** E1-MS2 COMPLETE.
04911 | 
04912 | Design snapshot index → SnapshotManager → fast replay from nearest snapshot → test with 1000 entries.
04913 | 
04914 | **EXIT:** Snapshot indexing implemented. Fast replay working. Seek < 100ms for 10K entry WAL.
04915 | 
04916 | ---
04917 | 
04918 | #### E1-MS4: Replay Sandbox + SAU-Light
04919 | 
04920 | **Effort:** ~18 tool calls | **Quality Tier:** STANDARD | **ENTRY:** E1-MS3 COMPLETE.
04921 | 
04922 | Implement ReplaySandbox → state reconstruction → test replay matches current state → **SAU-Light**.
04923 | 
04924 | **EXIT:** Replay sandbox operational. State reconstruction verified. SAU-Light complete.
04925 | 
04926 | ---
04927 | 
04928 | ### E3 Architectural Constraints (NEW in v7)
04929 | 
04930 | *E3 is 30 microsessions of React engineering — the largest phase in the project. Without architectural constraints, front-loading at E3-MS1 will make decisions that don't compound correctly across 30 MS. These constraints are BINDING on E3 front-loading.*
04931 | 
04932 | #### E3 Layer → MS Mapping (NEW in v8.2)
04933 | 
04934 | | Layer | MS Range | Description | SAU Stop | Flex |
04935 | |-------|----------|-------------|----------|------|
04936 | | **Layer 1** — Foundation | E3-MS1 through E3-MS5 | React scaffold, TelemetryBridge, WebSocket, component library, auth | — | — |
04937 | | **Layer 2** — Core Dashboards | E3-MS6 through E3-MS12 | System, Campaign, Calculation, Alarm dashboards + PredictiveAlertPanel | SAU-Light at E3-MS10 | — |
04938 | | **Layer 3** — Interactive Tools | E3-MS13 through E3-MS20 | FlowCanvas, HookDesigner, ReplayViewer, WhatIfBrancher | SAU-Light at E3-MS20 | **FLEX-E3** after MS20 |
04939 | | **Layer 4** — Platform | E3-MS21 through E3-MS30 | Plugin SDK, Marketplace, Hot-install, Compliance dashboard, Integration tests | — | — |
04940 | 
04941 | *Each layer boundary triggers front-loading: write detailed specs for next layer's MS before executing them.*
04942 | 
04943 | #### E3 Component Dependency Graph
04944 | 
04945 | ```
04946 | LAYER 1 — Foundation (E3-MS1 through E3-MS5):
04947 |   React scaffold + build pipeline
04948 |   → TelemetryBridge (connects React to TelemetryEngine)
04949 |   → WebSocket real-time data feed
04950 |   → Component library (buttons, cards, modals, charts)
04951 |   → Authentication + session management
04952 | 
04953 | LAYER 2 — Core Dashboards (E3-MS6 through E3-MS12):
04954 |   SystemDashboard (hook status, registry counts, performance)
04955 |   → CampaignDashboard (batch progress, quarantine rates, ETA)
04956 |   → CalculationDashboard (recent calcs, accuracy tracking)
04957 |   → AlarmDashboard (active alarms, fix history, trends)
04958 |   → PredictiveAlertPanel (predicted failures, proactive warnings, risk scores)
04959 |   ALL dashboards consume TelemetryBridge — no direct TelemetryEngine access from React.
04960 |   
04961 |   ENGINE WIRING FOR LAYER 2:
04962 |   - PredictiveFailureEngine.ts (523L): Import at E3-MS6 (with SystemDashboard).
04963 |     Consumes: TelemetryEngine metrics (error rates, response times, registry loads).
04964 |     Produces: failure predictions with confidence scores and time-to-failure estimates.
04965 |     Wire: PredictiveFailureEngine → TelemetryEngine channel "system" → TelemetryBridge → PredictiveAlertPanel
04966 |   - PFPEngine.ts (834L): Import at E3-MS6.
04967 |     Consumes: PredictiveFailureEngine predictions + historical failure data from error_pattern_db.
04968 |     Produces: proactive mitigation recommendations (not just "X will fail" but "do Y to prevent X").
04969 |     Wire: PFPEngine reads PredictiveFailureEngine output → generates mitigation actions →
04970 |           TelemetryEngine channel "system" with type="proactive_alert" → TelemetryBridge → PredictiveAlertPanel
04971 |   - MemoryGraphEngine.ts (685L): Already imported at P4-MS4 for knowledge graph.
04972 |     Consumes: Material/tool/operation relationship queries from CalculationDashboard.
04973 |     Produces: Visual relationship maps, "related materials" panels, "recommended tools" suggestions.
04974 |     Wire: CalculationDashboard calls MemoryGraphEngine.getRelated(node_id) → renders relationship graph
04975 | 
04976 | LAYER 3 — Interactive Tools (E3-MS13 through E3-MS20):
04977 |   FlowCanvas (visual workflow builder)
04978 |   → HookDesigner (visual hook creation/wiring)
04979 |   → ReplayViewer (WAL replay with visual timeline)
04980 |   → WhatIfBrancher (branching point selection + comparison)
04981 |   ALL tools use Component library from Layer 1. ALL tools access data through same WebSocket feed.
04982 | 
04983 | LAYER 4 — Platform (E3-MS21 through E3-MS30):
04984 |   Plugin SDK + documentation
04985 |   → Marketplace (plugin discovery, install, update)
04986 |   → Hot-install (zero-downtime plugin deployment)
04987 |   → Compliance dashboard (ISO, audit trail visualization)
04988 |   → Integration test suite for all visual components
04989 | ```
04990 | 
04991 | #### E3 State Management Decisions (BINDING)
04992 | 
04993 | ```
04994 | 1. ALL application state lives in a single Zustand store (BINDING — decided in v10.0 CM-4.
04995 |    Rationale: 70% less boilerplate than Redux, subscribe() maps to TelemetryBridge pattern,
04996 |    TypeScript-first inference, 1KB bundle, no middleware ceremony. If Zustand has a critical
04997 |    bug: switch to Jotai (same mental model). NEVER switch to Redux. Document in E3_ARCHITECTURE.md).
04998 | 
04999 | 2. Server data flows through ONE path: TelemetryEngine → WebSocket → TelemetryBridge → Components.
05000 |    Components NEVER call backend APIs directly. All data comes through TelemetryBridge.
05001 | 
05002 | 3. Component communication: parent→child via props, child→parent via callbacks, 
05003 |    sibling via state store. No event buses. No global mutable state outside the store.
05004 | 
05005 | 4. Every dashboard component must accept a `timeRange` prop and filter its data accordingly.
05006 |    This enables global time-range selection across all dashboards.
05007 | 
05008 | 5. Every interactive tool (FlowCanvas, HookDesigner, ReplayViewer) must implement
05009 |    save/load through a standard ToolState interface:
05010 |    - toJSON(): serializable state
05011 |    - fromJSON(state): restore from serialized state
05012 |    - isDirty(): boolean (unsaved changes)
05013 |    This enables ATCS to checkpoint visual tool state during compaction.
05014 | ```
05015 | 
05016 | #### E3 API Contracts (BINDING)
05017 | 
05018 | ```
05019 | TelemetryBridge interface (decided at E3-MS1, immutable after):
05020 |   subscribe(channel: string, callback: (data) => void): unsubscribe
05021 |   getLatest(channel: string): data | null
05022 |   getHistory(channel: string, timeRange: TimeRange): data[]
05023 | 
05024 | Channels (defined at E3-MS2):
05025 |   "hooks": { hookId, event, timestamp, payload }
05026 |   "performance": { metric, value, timestamp }
05027 |   "campaign": { category, batch, status, counts }
05028 |   "calculations": { calcId, inputs, outputs, omega, timestamp }
05029 |   "alarms": { alarmId, controller, severity, timestamp }
05030 |   "system": { component, status, message, timestamp }
05031 |   "predictions": { engineId, prediction_type, confidence, time_to_failure, mitigation, timestamp }
05032 |   "knowledge": { query, node_id, relationships[], relevance_scores, timestamp }
05033 | 
05034 | ToolState interface (decided at E3-MS13, immutable after):
05035 |   toJSON(): Record<string, unknown>
05036 |   fromJSON(state: Record<string, unknown>): void
05037 |   isDirty(): boolean
05038 |   getDisplayName(): string
05039 | ```
05040 | 
05041 | #### E3 Front-Loading Protocol (ENHANCED)
05042 | 
05043 | ```
05044 | At E3-MS1 (first 10 tool calls):
05045 | 1. Read these E3 architectural constraints
05046 | 2. Configure Zustand store (already decided in v10.0 CM-4) — set up store structure, document in E3_ARCHITECTURE.md
05047 | 3. Implement TelemetryBridge interface exactly as specified above
05048 | 4. Implement channel definitions exactly as specified above
05049 | 5. Write detailed specs for E3-MS1 through E3-MS5 following the dependency graph Layer 1
05050 | 6. Document ALL architectural decisions in E3_ARCHITECTURE.md
05051 | 7. Proceed to execute E3-MS1
05052 | 
05053 | At E3-MS5 (Layer 1 complete):
05054 |   Verify: TelemetryBridge working, WebSocket connected, component library usable, auth working.
05055 |   Write detailed specs for E3-MS6 through E3-MS12 (Layer 2).
05056 | 
05057 | At E3-MS12 (Layer 2 complete):
05058 |   Verify: all dashboards rendering with real data from TelemetryBridge.
05059 |   Write detailed specs for E3-MS13 through E3-MS20 (Layer 3).
05060 | 
05061 | At E3-MS20 (Layer 3 complete):
05062 |   Verify: all interactive tools working with ToolState interface.
05063 |   Write detailed specs for E3-MS21 through E3-MS30 (Layer 4).
05064 | ```
05065 | 
05066 | #### E3 Security Constraints (BINDING) (NEW in v8.1)
05067 | 
05068 | *E3 exposes a web-accessible dashboard for an enterprise manufacturing system. Security decisions at E3-MS5 (authentication) are BINDING for all subsequent MS.*
05069 | 
05070 | ```
05071 | 1. AUTHENTICATION: Token-based (JWT preferred). Decide at E3-MS5, document in
05072 |    E3_ARCHITECTURE.md. Session timeout: configurable (default 8 hours for shop floor).
05073 |    Refresh token rotation required. No plaintext credentials in state files.
05074 | 
05075 | 2. AUTHORIZATION: Role-based access control (RBAC) with minimum 3 roles:
05076 |    - OPERATOR: View dashboards, view calculations, view alarms. No modifications.
05077 |    - ENGINEER: All OPERATOR + run calculations, modify parameters, manage campaigns.
05078 |    - ADMIN: All ENGINEER + hook management, plugin install, configuration changes.
05079 |    Role assigned at login, stored in JWT claims. Every API endpoint checks role.
05080 | 
05081 | 3. INPUT SANITIZATION: All user input sanitized before:
05082 |    - Rendering in React components (XSS prevention — React handles by default, 
05083 |      but dangerouslySetInnerHTML NEVER used)
05084 |    - Passing to calculation engines (numeric validation, range checks)
05085 |    - Writing to state files or WAL (injection prevention)
05086 | 
05087 | 4. API SECURITY between React frontend and TelemetryBridge:
05088 |    - WebSocket connections authenticated with JWT token in connection handshake
05089 |    - CORS configured for specific origin only (no wildcard)
05090 |    - Rate limiting on calculation endpoints (prevent DoS on safety-critical compute)
05091 |    - CSRF tokens on all state-modifying REST endpoints
05092 | 
05093 | 5. DATA PROTECTION:
05094 |    - Material parameters and cutting data are proprietary — no client-side caching
05095 |      of full material databases
05096 |    - WAL entries may contain proprietary machining parameters — encrypted at rest (E1-MS8)
05097 |    - Session tokens cleared on logout/timeout — no persistent auth in localStorage
05098 | ```
05099 | 
05100 | ---
05101 | 
05102 | ### E4 Architectural Constraints (NEW in v7)
05103 | 
05104 | *E4 is 24 microsessions of enterprise infrastructure. Replication and failover decisions must account for ATCS state and WAL integrity.*
05105 | 
05106 | #### E4 Replication Architecture Constraints (BINDING)
05107 | 
05108 | ```
05109 | 1. ATCS state is REPLICATED, not just WAL entries. A replica that fails over must be able
05110 |    to resume an in-progress ATCS task from the last checkpoint. This means:
05111 |    - ATCS checkpoint files (C:\PRISM\autonomous-tasks\) are included in replication
05112 |    - COMPACTION_SURVIVAL.json is included in replication
05113 |    - On failover: replica reads ATCS state → resumes from last checkpoint
05114 | 
05115 | 2. WAL replication uses streaming, not periodic copy. The replica receives WAL entries
05116 |    in near-real-time (< 1s lag). This enables:
05117 |    - Hot standby with < 30s RTO
05118 |    - No data loss on failover (RPO ≈ 0)
05119 | 
05120 | 3. Registry data replication is eventual-consistent. Registries are large and change
05121 |    infrequently (only during M-M2 campaigns). Sync hourly, not streaming.
05122 | 
05123 | 4. Configuration replication is pull-based. Replica pulls config on boot and on
05124 |    heartbeat failure detection. Config includes: .env, GSD_QUICK.md, hook registry.
05125 | 
05126 | 5. Multi-tenant isolation: each tenant gets separate WAL files, separate ATCS state,
05127 |    separate registry namespaces. Shared: plugin code, calculation engines, hook engine.
05128 |    Tenant-specific: data, state, configuration, WAL.
05129 | ```
05130 | 
05131 | #### E4 Failover Sequence (BINDING)
05132 | 
05133 | ```
05134 | Detection: heartbeat miss > 3 consecutive (configurable)
05135 | 1. Replica promotes to primary
05136 | 2. Load latest WAL position from replicated COMPACTION_SURVIVAL.json
05137 | 3. Replay any un-acknowledged WAL entries
05138 | 4. Load ATCS state → resume any in-progress tasks
05139 | 5. Update GSD_QUICK.md with new primary endpoint
05140 | 6. Notify monitoring (if configured)
05141 | Total RTO target: < 30 seconds
05142 | 
05143 | Reconciliation (after failover):
05144 | 1. Old primary comes back online as replica
05145 | 2. Compare WAL positions between old and new primary
05146 | 3. Replay any divergent entries
05147 | 4. Sync registries
05148 | 5. Resume normal replication
05149 | ```
05150 | 
05151 | ### E2, E3, E4 Front-Loading Protocol
05152 | 
05153 | **At the START of each enterprise phase (E2-MS1, E3-MS1, E4-MS1)**, the first 10 tool calls must:
05154 | 
05155 | 1. Read the enterprise MS template
05156 | 2. Read the architectural constraints for that phase (E3 and E4 have binding constraints above)
05157 | 3. Write detailed specifications for MS1-MS4 of that phase
05158 | 4. Document in ROADMAP_TRACKER.md: "[PHASE] E{N} specifications written for MS1-MS4"
05159 | 5. Proceed to execute E{N}-MS1
05160 | 
05161 | ### Enterprise Critical Integrations
05162 | 
05163 | **E1-MS1:** Update compaction_armor.py for WAL state immediately.
05164 | **E2-MS1:** Wire cost tracking to PLATFORM-COST-ESTIMATE hook.
05165 | **E3-MS1:** React scaffold must implement TelemetryBridge per E3 constraints.
05166 | **E4-MS1:** Replication must account for ATCS state per E4 constraints.
05167 | 
05168 | ### Enterprise SAU Stops
05169 | 
05170 | | Stop | Variant | What |
05171 | |------|---------|------|
05172 | | E1-MS4 | SAU-Light | WAL basics covered |
05173 | | E1-MS9 | SAU-Light | Replay + what-if routing in GSD |
05174 | | E2-MS5 | SAU-Light | Cost commands in GSD |
05175 | | E3-MS10 | SAU-Light | React dashboard routes in GSD |
05176 | | E3-MS20 | SAU-Light | Plugin SDK commands, marketplace routing |
05177 | | E4-MS8 | SAU-Light | Failover commands, replication status in GSD |
05178 | 
05179 | ---
05180 | 
05181 | ## MONOLITH EXTRACTION: M4 (Tiered Approach)
05182 | 
05183 | **Tier 1: Critical Extraction (8 MS, Chats 45-52 per Section 9)**
05184 | 
05185 | | Category | Count | Est. Lines | MS | Rationale |
05186 | |----------|-------|-----------|-----|-----------|
05187 | | Core optimization algorithms | ~20 functions | ~8,000 | 3 | Directly improves cutting parameter recommendations |
05188 | | Advanced toolpath engines | 5 engines | ~8,000 | 2 | Enables trochoidal, HSM, adaptive strategies |
05189 | | Collision detection | 3 engines | ~5,000 | 1 | Safety-critical: prevents tool crashes |
05190 | | Thermal analysis | ~10 functions | ~4,000 | 1 | Accuracy-critical: thermal affects tool life |
05191 | | Integration + regression | — | — | 1 | Full regression of all Tier 1 extractions |
05192 | 
05193 | **Tier 2: High-Value Extraction (20 MS, Chats 53-60 per Section 9)**
05194 | 
05195 | | Category | Count | Est. Lines | MS |
05196 | |----------|-------|-----------|-----|
05197 | | CAD/CAM geometry engines | 15 engines | ~20,000 | 6 |
05198 | | Remaining optimization | ~80 functions | ~32,000 | 8 |
05199 | | Mesh/geometry processing | 10 engines | ~15,000 | 4 |
05200 | | Integration + regression | — | — | 2 |
05201 | 
05202 | **Tier 3: Deferred** — 750+ functions. 40-60 additional MS. Scheduled after Tiers 1-2 stable.
05203 | 
05204 | **IMPORTANT — T3 and mcp-server retirement:** T3 functions are already ACCESSIBLE through the 324 dispatcher actions — they work through the monolithic mcp-server codebase that gets bulk-imported during M4-T1/T2. T3 extraction is about clean separation into prism-platform plugin architecture, NOT about making functionality available. At retirement (M-FINAL), all 324 actions pass through prism-platform — T3 functions included via bulk-imported code. T3 extraction post-retirement is refactoring for maintainability, not functionality recovery. Gate #2 ("All 324 actions tested through prism-platform, zero regressions") confirms T3 functions work through prism-platform before retirement.
05205 | 
05206 | **Each M4 MS must:**
05207 | 1. **CONSUMER CHAIN MAPPING (BEFORE extraction):** For each function/engine being extracted:
05208 |    ```
05209 |    a. prism_dev→code_search: find ALL call sites in mcp-server (grep for function name, class name, imports)
05210 |    b. Document: "CollisionDetectionEngine is called by: toolpathDispatcher.validatePath() at line 234,
05211 |       calcDispatcher.safetyCheck() at line 891, hookRegistration.ts pre-calc gate at line 156"
05212 |    c. For EACH call site: verify the equivalent call path exists in prism-platform
05213 |    d. If call path missing in prism-platform → CREATE the wire BEFORE marking extraction complete
05214 |    e. Write consumer chain to IMPORT_LOG.md: "Engine X → consumed by [A, B, C] → all verified"
05215 |    ```
05216 |    **This is the critical step that prevents "imported but never called" engines.**
05217 | 2. Extract function(s) to prism-platform plugin pattern
05218 | 3. Run prism_validate→validate_anti_regression against mcp-server version
05219 | 4. Run dual_run_validator.py for extracted functions — **must test through CONSUMER path, not just direct call**
05220 |    (i.e., test "prism_calc→toolpath which calls CollisionDetection" not just "CollisionDetection.check()")
05221 | 5. Verify performance neutral
05222 | 6. Update IMPORT_LOG.md (with consumer chain) and PLATFORM_STATE.md
05223 | 7. **KNOWN_RENAMES chain (NEW in v8):** If this MS adds new dispatcher paths, add new prism-platform paths to KNOWN_RENAMES chain (known_renames.json). At M4-T1 integration MS: verify count ≥180. At M-FINAL: verify 10 random old tool names resolve correctly through the full chain (old name → KNOWN_RENAMES → new dispatcher+action → valid response).
05224 | 
05225 | **Tier 1 Safety Engine Consumer Expectations (verify during extraction):**
05226 | 
05227 | | Engine | Expected Consumers in mcp-server | Verify Wire in prism-platform |
05228 | |--------|----------------------------------|------------------------------|
05229 | | CollisionDetectionEngine | toolpath validation pre-execution hook, prism_calc→toolpath safety gate | Same hooks fire in prism-platform |
05230 | | SpindleProtectionEngine | prism_calc→speed_feed RPM limit check, machine capability validation | CalcHookMiddleware before-hook checks spindle limits |
05231 | | ToolBreakageEngine | prism_calc→tool_life, ATCS batch checkpoint (tool wear tracking) | tool_life calculation calls it, batch campaigns track wear |
05232 | | WorkholdingEngine | prism_calc→setup fixture validation, toolpath force vs clamp analysis | Setup calculations include workholding check |
05233 | | CoolantValidationEngine | prism_calc→speed_feed coolant requirement, machine capability check | CalcHookMiddleware injects coolant validation |
05234 | | ManufacturingCalcEngine | prism_calc→speed_feed core Kienzle model, prism_calc→cutting_force | ALL calculation dispatchers delegate to this engine |
05235 | | ThreadCalcEngine | prism_thread→calculate, prism_thread→verify_specs | Thread dispatcher actions delegate directly |
05236 | | ToolpathStrategyEngine | prism_toolpath→recommend_strategy, prism_toolpath→optimize | Toolpath dispatcher actions delegate directly |
05237 | | AdvancedCalcEngine | prism_calc→multi_pass_optimize, prism_calc→surface_finish_predict | Multi-pass and surface finish actions delegate |
05238 | 
05239 | **M4 SAU Stops:**
05240 | - After Tier 1 integration MS: SAU-Light
05241 | - After Tier 2 integration MS: SAU-Full
05242 | 
05243 | ---
05244 | 
05245 | # SECTION 6: ERROR BUDGET AND FAILURE PROTOCOL
05246 | 
05247 | ## 6.1 Data Campaign Error Policy (Updated for M-M2)
05248 | 
05249 | *M-M2 data campaigns are the longest-running workload in the project. Error policy must balance throughput with data integrity. Lives depend on accurate material parameters.*
05250 | 
05251 | | Error Type | 1st Occurrence | 2nd Occurrence | 3rd Occurrence | Campaign Impact |
05252 | |-----------|----------------|----------------|----------------|----------------|
05253 | | Ω < 0.70 on material entry | Retry with adjusted params (check source data) | Split batch, retry halves independently | Quarantine failing entries, accept passing | Continues. Quarantined entries logged to QUARANTINE_LOG.md with root cause. |
05254 | | Ω < 0.70 on alarm code | Retry once with expanded reference data | Accept with [LOW_CONFIDENCE] flag | N/A (flags don't accumulate — each stands alone) | Continues. Flagged alarms get manual review queue. |
05255 | | Validation failure (S(x) < 0.70) | Fix and re-validate. This is SAFETY-CRITICAL — no auto-skip. | Escalate to OPUS root cause analysis | STOP batch. Quarantine ALL entries from this batch. | Pauses. Entire batch re-validated before acceptance. |
05256 | | Registry error mid-campaign | Reload registry, retry current batch | Run registry_health_check.py, fix paths | STOP campaign. Escalate to P0-level registry fix. | Pauses. Registry fix is priority over campaign progress. |
05257 | | Compaction during batch | ATCS checkpoint + resume from last checkpoint | Verify ATCS integrity, resume | Manual checkpoint verification before resume | Continues from last verified checkpoint. |
05258 | | Ralph API failure | Retry once after 10s delay | Skip Ralph validation, manual review flag | Disable Ralph for remainder of batch, Ω-only validation | Continues with reduced QA. Flag batch as [RALPH_DEGRADED]. |
05259 | | Source data conflict (two references disagree) | Use higher-authority source (published handbook > web) | Flag as [SOURCE_CONFLICT], accept with wider uncertainty band | Quarantine. Needs domain expert resolution. | Continues. Quarantined for manual resolution. |
05260 | 
05261 | ## 6.2 Error Budget Thresholds
05262 | 
05263 | | Metric | Green | Yellow | Red | Black (STOP) |
05264 | |--------|-------|--------|-----|---------------|
05265 | | Batch failure rate (rolling 10) | < 5% | 5-15% | 15-30% | > 30% |
05266 | | Quarantined entries | < 2% of total | 2-5% | 5-10% | > 10% |
05267 | | Ralph skip rate | < 5% | 5-20% | 20-40% | > 40% |
05268 | | Compaction interrupts per chat | 0-1 | 2 | 3 | > 3 |
05269 | | Registry reload failures | 0 | 1 | 2 | > 2 |
05270 | | S(x) failures (safety-critical) | 0 | 1 (investigate) | 2 (STOP campaign) | > 2 (STOP + full audit) |
05271 | | Source conflict rate | < 3% | 3-8% | 8-15% | > 15% (bad source data) |
05272 | 
05273 | ## 6.3 Error Budget Escalation
05274 | 
05275 | ```
05276 | GREEN on all metrics:
05277 |   → Continue campaign at full speed
05278 |   → No additional verification needed
05279 | 
05280 | YELLOW on any metric:
05281 |   → Continue but add extra validation to next 3 batches
05282 |   → Log escalation in CAMPAIGN_DASHBOARD.json
05283 |   → Review at next SAU-Light stop
05284 | 
05285 | RED on any metric:
05286 |   → Pause campaign
05287 |   → Run mfg_batch_validator.py on last 5 batches
05288 |   → Root cause the metric that went RED
05289 |   → Resume only after metric returns to YELLOW or GREEN
05290 | 
05291 | BLACK on any metric:
05292 |   → STOP campaign immediately
05293 |   → Full audit of all batches since last GREEN state
05294 |   → Root cause + fix required before restart
05295 |   → Document in SESSION_INSIGHTS.md as [REGRESSION]
05296 |   → Re-validate all entries from degraded batches
05297 | ```
05298 | 
05299 | ## 6.4 Campaign Data Rollback Protocol (NEW in v8.1)
05300 | 
05301 | *The quarantine system catches individual bad entries. This protocol handles SYSTEMATIC data corruption — when a batch of source data passes validation but contains fundamentally wrong parameters (e.g., Kienzle coefficients from wrong alloy family, incorrect hardness ranges).*
05302 | 
05303 | ```
05304 | REGISTRY SNAPSHOT PROTOCOL:
05305 |   Every 5th batch (aligned with mfg_batch_validator.py comprehensive check):
05306 |     1. Export full registry state to C:\PRISM\archive\registry_snapshots\
05307 |        Filename: SNAPSHOT_{category}_{batch_number}_{timestamp}.json
05308 |     2. Record snapshot ID in CAMPAIGN_DASHBOARD.json → snapshot_log[]
05309 |     3. Verify snapshot is loadable (read-back test)
05310 |     4. Keep last 10 snapshots per category. Archive older to cold storage.
05311 | 
05312 | ROLLBACK TRIGGER CONDITIONS:
05313 |   - mfg_batch_validator.py detects systematic error (same wrong parameter across 5+ entries)
05314 |   - Cross-reference validation finds physically impossible relationships 
05315 |     (e.g., kc1.1 values for aluminum appearing in titanium entries)
05316 |   - S(x) failures cluster in a single alloy family or condition state
05317 |   - External discovery: published reference data contradicts ingested values
05318 |   - Error budget hits BLACK for source conflict rate (> 15%)
05319 | 
05320 | ROLLBACK PROCEDURE:
05321 |   1. STOP campaign immediately
05322 |   2. Identify corruption scope: which batches, which entries, which parameters
05323 |   3. Find last clean snapshot: the most recent SNAPSHOT before the first corrupted batch
05324 |   4. Restore registry from clean snapshot:
05325 |      → prism_dev action=file_read path="C:\PRISM\archive\registry_snapshots\SNAPSHOT_materials_{N}.json"
05326 |      → Replace current registry entries for affected category
05327 |      → Verify registry_health_check.py passes on restored state
05328 |   5. Re-validate all entries from corrupted batches against corrected source data
05329 |   6. Re-run from the batch after the clean snapshot
05330 |   7. Document in SESSION_INSIGHTS.md: [REGRESSION] Campaign rollback from batch X to snapshot Y | root cause
05331 |   8. Update CAMPAIGN_DASHBOARD.json: adjust batch counts, mark rolled-back batches as INVALIDATED
05332 | 
05333 | SNAPSHOT STORAGE:
05334 |   C:\PRISM\archive\registry_snapshots\
05335 |   ├── SNAPSHOT_materials_5_2026-03-15T10:00:00.json
05336 |   ├── SNAPSHOT_materials_10_2026-03-22T14:30:00.json
05337 |   ├── SNAPSHOT_machines_5_2026-03-18T09:00:00.json
05338 |   └── ...
05339 | 
05340 | INTEGRATION:
05341 |   - mfg_batch_validator.py: add --snapshot flag to trigger snapshot before validation
05342 |   - campaign_dashboard_updater.py: track snapshot_log with batch→snapshot mapping
05343 |   - ATCS: on campaign rollback, replan from clean snapshot batch number
05344 |   - CAMPAIGN_DASHBOARD.json: add "last_clean_snapshot" field per category
05345 | 
05346 | DOWNSTREAM CONSUMER ROLLBACK PROTOCOL (NEW in v8.4):
05347 |   Campaign data flows INTO downstream systems. Rolling back registry data without 
05348 |   cleaning downstream consumers creates phantom references and stale intelligence.
05349 | 
05350 |   KNOWLEDGE GRAPH (MemoryGraphEngine):
05351 |     - M-M2 campaigns add edges at P4-MS4 Consumer #3
05352 |     - On rollback: MemoryGraphEngine.removeEdgesBySource(batch_range, category)
05353 |     - Verify: query for rolled-back materials returns empty (not stale edges)
05354 |     - If MemoryGraphEngine has no removeBySource: add it at M-M2-MS1 as edge metadata
05355 |     - Edge metadata: { source_batch: N, validated_at: timestamp }
05356 |     - This enables surgical rollback: remove edges from batches X-Y only
05357 | 
05358 |   FORMULA ACCURACY TRACKER:
05359 |     - CalcHookMiddleware logs predictions vs actuals using campaign data
05360 |     - On rollback: purge formula_accuracy.json entries where source_batch in rollback range
05361 |     - Recalculate accuracy_scores from remaining data
05362 |     - PLATFORM-FORMULA-RECOMMEND will auto-adjust on next invocation
05363 | 
05364 |   COMPUTATION CACHE:
05365 |     - ComputationCache may contain results computed with rolled-back data
05366 |     - On rollback: flush entire cache (conservative but safe — cache rebuilds quickly)
05367 |     - Alternative: cache entries tagged with registry_version, invalidate by version
05368 | 
05369 |   E2 COST TRACKING:
05370 |     - Cost entries from rolled-back batch operations are NOT rolled back
05371 |     - Costs were incurred regardless of data validity
05372 |     - Add note in cost log: "Batch X-Y costs retained despite data rollback"
05373 | 
05374 |   E3 TELEMETRY:
05375 |     - TelemetryEngine historical data from rolled-back periods: mark as [ROLLED_BACK]
05376 |     - Dashboard renders rolled-back periods with visual indicator (strikethrough/dimmed)
05377 |     - Do NOT delete telemetry — it's the audit trail of what happened
05378 | 
05379 |   ROLLBACK CHECKLIST (execute in order):
05380 |     1. ☐ STOP campaign
05381 |     2. ☐ Restore registry from clean snapshot
05382 |     3. ☐ MemoryGraphEngine.removeEdgesBySource(batch_range)
05383 |     4. ☐ Purge formula_accuracy.json for affected batches
05384 |     5. ☐ Flush ComputationCache
05385 |     6. ☐ Mark telemetry period as [ROLLED_BACK]
05386 |     7. ☐ Verify registry_health_check.py passes
05387 |     8. ☐ Verify MemoryGraphEngine queries return clean results
05388 |     9. ☐ Document in SESSION_INSIGHTS.md
05389 |     10. ☐ Resume campaign from clean snapshot batch
05390 | ```
05391 | 
05392 | 
05393 | 
05394 | ## 6.5 Post-Deployment Data Maintenance Protocol (NEW in v9.0)
05395 | 
05396 | *Manufacturing data is not static. New alloys, revised handbook data, updated tooling catalogs, controller firmware changes, and evolving safety recommendations all require ongoing data maintenance. Without a defined process, PRISM's knowledge base becomes stale within 12-18 months and operators lose trust.*
05397 | 
05398 | ```
05399 | DATA CATEGORIES AND UPDATE FREQUENCY:
05400 | 
05401 |   MATERIALS (quarterly review + event-driven):
05402 |     Triggers:
05403 |       - New alloy grade published (aerospace specs, tool steel catalogs)
05404 |       - Handbook revision (Machinery's Handbook new edition, Sandvik catalog update)
05405 |       - Field correction (operator reports parameter mismatch with shop floor experience)
05406 |       - New material category request (composites, additive powders, plastics)
05407 |     
05408 |     Procedure — New Material in Existing Family:
05409 |       1. Prepare source data in campaign batch format
05410 |       2. Run through data_ingestion_pipeline.py as single-material batch
05411 |       3. Ω validation against existing family members (cross-reference check)
05412 |       4. If Ω ≥ 0.70: add to registry via DataProvider.put()
05413 |       5. Knowledge graph: MemoryGraphEngine.addEdges() for new material relationships
05414 |       6. Formula accuracy tracker: reset accuracy_score for affected formulas (new data point)
05415 |       7. Safety calculations: run affected entries from test matrix (Category 1-3 overlap)
05416 |       8. Document in MAINTENANCE_LOG.md: material, source, date, validator
05417 |     
05418 |     Procedure — New Material Category (via Extension Fields):
05419 |       1. Register new category in EXTENSION_REGISTRY.json
05420 |       2. Define extension fields with types, units, and uncertainty ranges
05421 |       3. If new calculation model needed: register through CalcModelRegistry (see below)
05422 |       4. Ingest materials using campaign batch format with extensions populated
05423 |       5. Validate: existing calculations ignore new extensions (backward compatible)
05424 |       6. Validate: new calculation model (if any) produces S(x) ≥ 0.70
05425 |       7. Document in BREAKING_CHANGES.md if new API actions added (MINOR version bump)
05426 | 
05427 |   MACHINES (annual review + event-driven):
05428 |     Triggers:
05429 |       - Manufacturer releases new model
05430 |       - Firmware update changes machine capabilities (max RPM, axis travel)
05431 |       - Machine decommissioned from shop floor
05432 |     
05433 |     Procedure:
05434 |       1. Update machine entry via DataProvider.put() with new specs
05435 |       2. Cross-reference: verify updated specs don't invalidate existing cutting parameters
05436 |          (e.g., new max RPM lower than previously recommended cutting speed)
05437 |       3. If cross-reference conflict: flag affected material entries for recalculation
05438 |       4. Document in MAINTENANCE_LOG.md
05439 | 
05440 |   ALARMS (semi-annual review + event-driven):
05441 |     Triggers:
05442 |       - Controller firmware update changes alarm codes or meanings
05443 |       - New controller family added to shop floor
05444 |       - Operator reports fix procedure is incorrect or incomplete
05445 |     
05446 |     Procedure — Firmware Update:
05447 |       1. Compare old alarm code table against new firmware documentation
05448 |       2. For changed codes: update via DataProvider.put() with new decode + fix
05449 |       3. For removed codes: mark as DEPRECATED (don't delete — historical reference)
05450 |       4. For new codes: add via data_ingestion_pipeline.py
05451 |       5. Run alarm decode validation (test matrix Category 8) for affected controller
05452 |     
05453 |     Procedure — New Controller Family:
05454 |       1. Register controller in ControllerRegistry (see Section 3.14)
05455 |       2. Define alarm schema, decode logic, and fix procedure templates
05456 |       3. Ingest alarm codes using campaign batch format
05457 |       4. Validate: prism_data→alarm_lookup returns correct decode for new controller
05458 |       5. Add test calculation to safety matrix Category 8 (alarm #51+)
05459 | 
05460 |   TOOLING (annual review):
05461 |     Triggers:
05462 |       - Insert manufacturer releases new geometry/grade
05463 |       - Tool life data updated from field experience
05464 |     
05465 |     Procedure:
05466 |       1. Update tool entries via DataProvider.put()
05467 |       2. Recalculate affected tool life predictions (test matrix Category 4)
05468 |       3. Knowledge graph: update tool-material-operation relationships
05469 | 
05470 |   SAFETY RECOMMENDATIONS (event-driven):
05471 |     Triggers:
05472 |       - Industry incident report with parameter implications
05473 |       - Updated safety standard (OSHA, ANSI, ISO)
05474 |       - Operator near-miss report
05475 |     
05476 |     Procedure:
05477 |       1. Identify affected material/operation/tool combinations
05478 |       2. Adjust safety margins (S(x) threshold may need tightening for specific combos)
05479 |       3. Re-run full safety test matrix
05480 |       4. Document in SAFETY_UPDATES.md with source and rationale
05481 |       5. If S(x) threshold change: this is a MAJOR API version bump
05482 | 
05483 | QUARTERLY REVIEW CADENCE:
05484 |   At every 3rd SAU-Light equivalent (or quarterly, whichever is more frequent post-deployment):
05485 |     1. Check for new Machinery's Handbook errata or supplements
05486 |     2. Check for manufacturer catalog updates (Sandvik, Kennametal, Iscar, Seco)
05487 |     3. Review MAINTENANCE_LOG.md for pending updates
05488 |     4. Review operator feedback queue (if integrated with shop floor system)
05489 |     5. Run data freshness check: flag any material entry not validated in > 18 months
05490 |     6. Run safety test matrix: confirm all 50 calculations still pass post-updates
05491 | 
05492 | CHANGE PROPAGATION:
05493 |   Any data update triggers:
05494 |     1. DataProvider.subscribe('updated') → knowledge graph edge refresh
05495 |     2. Formula accuracy tracker: invalidate cached accuracy for affected formulas
05496 |     3. ComputationCache: flush entries involving changed data
05497 |     4. If safety-critical parameter changed: BLOCK until test matrix re-run passes
05498 |     5. E3 dashboard: display "data updated" indicator with timestamp
05499 | 
05500 | MAINTENANCE_LOG.md FORMAT:
05501 |   [DATE] [CATEGORY] [ACTION] [ENTRY_ID] [SOURCE] [VALIDATOR]
05502 |   Example: 2027-01-15 MATERIAL ADD 4140_MOD Machinery's Handbook 31st Ed. J.Smith
05503 | ```
05504 | 
05505 | 
05506 | ---
05507 | 
05508 | # SECTION 7: ROLLBACK AND RETIREMENT PROTOCOL
05509 | 
05510 | ## 7.1 Pre-Retirement Gate (M-FINAL)
05511 | 
05512 | ALL must pass. No exceptions. No partial credit.
05513 | 
05514 | 1. **Dual-run validation:** dual_run_validator.py — ~7,200 queries including warm scenario journeys (v8.5), discrepancy < 1%
05515 | 2. **Full regression:** All 324 actions tested through prism-platform, zero regressions
05516 | 3. **Performance parity:** All 10 benchmarks — prism-platform meets or exceeds mcp-server
05517 | 4. **Data integrity:** prism-platform registry counts ≥ mcp-server registry counts
05518 | 5. **UAT sign-off (ENHANCED in v8.5):** H-4 golden-path sign-off in HUMAN_REVIEW_LOG.md. Manufacturing engineer confirms golden-path outputs are trustworthy for shop-floor use. Requires H-1, H-2, H-3 completed with zero unresolved [REJECTED] entries.
05519 | 6. **72-hour dual-run:** Both servers parallel for 72 hours, zero divergence. Includes warm scenario workloads (v8.5) testing multi-step journeys.
05520 | 7. **Safety-critical test matrix:** All 50 calculations (Section 15) produce identical results within ±2σ across both codebases
05521 | 8. **Cross-track flag resolution:** Zero unresolved [SYNTHETIC_DATA], [DEFERRED], or [INCOMPLETE_REPLICA] flags (Section 3.9)
05522 | 9. **Agent roster finalized:** Agent count verified and documented, all agents reachable through prism-platform
05523 | 10. **Infrastructure parity (NEW in v8):** autoHookWrapper (1,559L), cadenceExecutor (2,246L), responseSlimmer (~200L) all imported and functional in prism-platform. Hook chains fire identically in both codebases. Cadence functions execute on same triggers.
05524 | 11. **Registry parity (NEW in v8):** All 19 registries from MASTER_INDEX §5 loading in prism-platform. Combined loaded lines ≥ mcp-server's 13,879 lines. Verify with registry_health_check.py on both codebases.
05525 | 12. **Type parity (NEW in v8):** All 5 type definition files (1,419 lines) present in prism-platform. TypeScript compiler reports zero type errors.
05526 | 13. **MASTER_INDEX parity (NEW in v8):** MASTER_INDEX.md structural counts (dispatchers, actions, engines, registries) match prism-platform live system counts exactly. Zero [MASTER_INDEX_DRIFT] flags.
05527 | 14. **Wiring certification (NEW in v8.1):** WIRING_CERTIFICATION.md exists, documenting: 29/29 engines with verified consumers, 7/7 intelligence feedback loops with bidirectional flow, 22/22 sequencing guides with all steps traced. Produced by Section 18.5 protocol.
05528 | 15. **Human review log (NEW in v8.5):** HUMAN_REVIEW_LOG.md exists with H-1 through H-4 complete. Zero unresolved [REJECTED] entries. Domain expert spot-checks confirm source data quality and calculation output trustworthiness.
05529 | 
05530 | ## 7.2 Rollback Triggers
05531 | 
05532 | Automatic rollback if ANY of the following detected post-migration:
05533 | 
05534 | - S(x) < 0.70 on safety-critical calculation that mcp-server would have caught
05535 | - Registry loading < 90% of pre-migration levels
05536 | - 3+ user-reported incorrect outputs in 24 hours
05537 | - Performance degradation > 50% on any benchmark
05538 | - WAL integrity chain broken (CRC32 verification failure)
05539 | - ATCS task fails to resume after compaction (previously worked)
05540 | 
05541 | **Procedure:**
05542 | 1. Switch MCP endpoint to mcp-server (config change only, < 30s)
05543 | 2. Verify mcp-server is serving correctly
05544 | 3. Investigate root cause in prism-platform
05545 | 4. Fix and re-run dual_run_validator.py
05546 | 5. Re-run safety-critical test matrix (Section 15)
05547 | 6. Only then re-attempt migration
05548 | 
05549 | ## 7.3 Post-Migration Monitoring (First 30 Days)
05550 | 
05551 | ```
05552 | Days 1-7:
05553 |   → Run safety_calc_test_matrix.py daily
05554 |   → Monitor QUARANTINE_LOG.md for new entries
05555 |   → Compare all outputs against mcp-server logs
05556 |   → Keep mcp-server warm (ready for instant rollback)
05557 | 
05558 | Days 8-14:
05559 |   → Run safety_calc_test_matrix.py every 48 hours
05560 |   → mcp-server can go cold standby
05561 |   → Monitor error pattern DB for new patterns
05562 | 
05563 | Days 15-30:
05564 |   → Run safety_calc_test_matrix.py weekly
05565 |   → If zero issues: schedule mcp-server decommission
05566 |   → Archive mcp-server codebase to C:\PRISM\archive\mcp-server-final\
05567 | 
05568 | Day 31+:
05569 |   → Normal operations through prism-platform
05570 |   → mcp-server archived but recoverable
05571 | ```
05572 | 
05573 | ## 7.4 Backup and Disaster Recovery (NEW in v8.1, ENHANCED in v8.5)
05574 | 
05575 | *Compaction survival handles transient context loss. E4 replication handles server failover. This section handles disk failure, file corruption, and environment destruction. v8.5 adds EXTERNAL backup — all prior backups targeted C:\PRISM\archive\ on the SAME drive as source, meaning a single drive failure loses source AND backups simultaneously.*
05576 | 
05577 | ```
05578 | BACKUP SCHEDULE:
05579 |   DAILY:
05580 |     → C:\PRISM\state\ (all 17 state files: HANDOFF.json, COMPACTION_SURVIVAL.json, 
05581 |       CAMPAIGN_DASHBOARD.json, session_memory.json, doc_baselines.json,
05582 |       HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json, etc.)
05583 |     → C:\PRISM\docs\ (ROADMAP_TRACKER.md, SESSION_INSIGHTS.md, DRIFT_LOG.md,
05584 |       COHERENCE_AUDIT.md, ENTERPRISE_PACE.md, HUMAN_REVIEW_LOG.md)
05585 |     → Destination: C:\PRISM\archive\daily\ (rotate: keep last 7)
05586 | 
05587 |   WEEKLY:
05588 |     → C:\PRISM\data\ + C:\PRISM\extracted\ (215 JSON data files)
05589 |     → C:\PRISM\mcp-server\.env + C:\PRISM\prism-platform\.env
05590 |     → Registry snapshots from Section 6.4
05591 |     → Destination: C:\PRISM\archive\weekly\ (rotate: keep last 4)
05592 | 
05593 |   AT EVERY SAU STOP (Light or Full):
05594 |     → Full codebase snapshot: mcp-server/ and prism-platform/ (excluding node_modules/)
05595 |     → MASTER_INDEX.md
05596 |     → All GSD files
05597 |     → Destination: C:\PRISM\archive\sau\SAU_{id}_{timestamp}\
05598 | 
05599 |   EXTERNAL BACKUP (NEW in v8.5):
05600 | 
05601 |     AT EVERY SAU-FULL (SU-1 through SU-6):
05602 |       → Full codebase snapshot + state files + data files
05603 |       → Copy to AT LEAST ONE off-machine destination:
05604 |         Option A: External USB drive (manual, reliable)
05605 |         Option B: Network share (if available on LAN)
05606 |         Option C: Cloud sync (OneDrive/Google Drive/S3 — encrypted)
05607 |       → Destination selected at P0-MS0, documented in ENV_CONFIG.md
05608 |       → Verify: read-back test on external copy (not just "copy succeeded")
05609 |       → Log: "EXTERNAL_BACKUP: SU-X → [destination] [size] [verified: YES/NO]"
05610 | 
05611 |     AT EVERY SAU-LIGHT:
05612 |       → State files only (HANDOFF.json, ROADMAP_TRACKER.md, COMPACTION_SURVIVAL.json,
05613 |         CAMPAIGN_DASHBOARD.json, session_memory.json, HOOK_MANIFEST.json)
05614 |       → Same external destination
05615 |       → Lightweight: < 5MB, < 30 seconds
05616 | 
05617 |     WEEKLY (during M-M2 steady state, weeks 15-49):
05618 |       → Registry snapshots + data files to external destination
05619 |       → This is the highest-risk period: active data campaigns generating
05620 |         irreplaceable validated manufacturing data
05621 |       → If external backup fails: WARN in CAMPAIGN_DASHBOARD.json, retry next session
05622 | 
05623 |     MINIMUM VIABLE BACKUP:
05624 |       → If no external storage available: at minimum, copy latest SAU archive
05625 |         to a DIFFERENT physical drive (D:, E:, or any non-C: partition)
05626 |       → If only C: exists: document as [SINGLE_DISK_RISK] in ROADMAP_TRACKER
05627 |         and prioritize external storage acquisition
05628 | 
05629 |     POST-E4:
05630 |       → E4 replication subsumes external backup for live data
05631 |       → SAU archives still go to external storage (replication covers live state,
05632 |         not point-in-time snapshots)
05633 |       → Weekly external backup can be reduced to monthly
05634 | 
05635 |   WAL FILES:
05636 |     → WAL rotation: archive completed WAL segments after retention policy prunes them
05637 |     → Keep last 30 days of WAL archives (post-E1)
05638 |     → Destination: C:\PRISM\archive\wal\
05639 | 
05640 | RECOVERY PROCEDURE (environment destroyed):
05641 |   0. If C: drive failed: restore from EXTERNAL backup first. If external backup is
05642 |      stale, recover to last external SAU snapshot, accept work loss since that snapshot.
05643 |   1. Install toolchain: Node ≥ 18, Python ≥ 3.10, esbuild
05644 |   2. Restore latest SAU archive → C:\PRISM\mcp-server\ and C:\PRISM\prism-platform\
05645 |   3. Restore latest daily backup → C:\PRISM\state\ and C:\PRISM\docs\
05646 |   4. Restore latest weekly backup → C:\PRISM\data\ and C:\PRISM\extracted\
05647 |   5. Restore .env files from weekly backup
05648 |   6. npm install in both codebases
05649 |   7. npm run build in both codebases
05650 |   8. Run env_smoke_test.py → verify environment
05651 |   9. Run registry_health_check.py → verify data
05652 |   10. Run system_self_test.py → verify state coherence
05653 |   11. Run Position Recovery (Section 3.1) → find current MS
05654 |   12. Resume from last verified MS
05655 | 
05656 | CORRUPTION DETECTION:
05657 |   - system_self_test.py state coherence check detects state file corruption
05658 |   - registry_health_check.py detects data file corruption
05659 |   - WAL CRC32 chain detects WAL corruption
05660 |   - autoDocAntiRegression detects document corruption (>60% size reduction)
05661 |   - HOOK_MANIFEST.json three-way check detects hook count corruption (v8.5)
05662 |   - If any corruption detected: restore from most recent clean backup, 
05663 |     re-run from last SAU checkpoint
05664 | ```
05665 | 
05666 | 
05667 | ---
05668 | 
05669 | 
05670 | ## 7.5 Post-Migration Rollback Procedure (NEW in v9.0)
05671 | 
05672 | *The 72-hour dual-run validates migration quality. But what happens on day 4 — after mcp-server goes to cold standby — when a production issue surfaces that the dual-run didn't catch? This protocol defines how to roll back safely and when to permanently decommission the old system.*
05673 | 
05674 | ```
05675 | ROLLBACK WINDOW: 14 calendar days from migration (M-FINAL-MS6 completion date)
05676 | 
05677 | WARM STANDBY (days 1-14):
05678 |   mcp-server remains in WARM STANDBY — not deleted, not archived:
05679 |     - Server code intact at C:\PRISM\mcp-server\
05680 |     - Registry data frozen at migration-day state
05681 |     - .env files preserved with last known working config
05682 |     - Can be restarted with: cd C:\PRISM\mcp-server && npm run build && restart
05683 |     - Daily: verify mcp-server COULD start (build check only, don't run)
05684 |     - NOT receiving production traffic (prism-platform is live)
05685 | 
05686 | ROLLBACK TRIGGER CONDITIONS (any ONE triggers):
05687 |   1. SAFETY CALCULATION FAILURE:
05688 |      safety_calc_test_matrix.py (running daily via cron) produces ANY failure
05689 |      that was not present in the pre-migration baseline.
05690 |      → IMMEDIATE rollback. Safety trumps everything.
05691 | 
05692 |   2. REGISTRY DATA CORRUPTION:
05693 |      registry_health_check.py reports loading < 90% of RAW_AVAILABLE for any
05694 |      category, AND the same check on mcp-server shows no degradation.
05695 |      → Rollback + investigate prism-platform-specific data issue.
05696 | 
05697 |   3. OPERATOR-REPORTED CALCULATION MISMATCH:
05698 |      Shop floor operator reports cutting parameters that "don't match experience"
05699 |      for a scenario that WAS validated during H-1 through H-4 gates.
05700 |      → Investigate: run same query on BOTH codebases. If mcp-server correct
05701 |        and prism-platform wrong: rollback. If both wrong: not a migration issue.
05702 | 
05703 |   4. PERFORMANCE DEGRADATION > 50%:
05704 |      Any of the 10 performance benchmarks degrades > 50% from pre-migration
05705 |      baseline AND persists for > 24 hours.
05706 |      → Rollback to restore operator experience while investigating.
05707 | 
05708 |   5. ENTERPRISE FEATURE FAILURE AFFECTING SAFETY:
05709 |      WAL corruption, replication divergence, or tenant isolation breach that
05710 |      could cause incorrect data to reach safety-critical calculations.
05711 |      → IMMEDIATE rollback.
05712 | 
05713 | ROLLBACK PROCEDURE:
05714 |   1. ANNOUNCE: Notify all system users — "System reverting to previous version for [reason]"
05715 |   2. SWITCH: Change MCP endpoint back to mcp-server (claude_desktop_config.json)
05716 |   3. VERIFY: Run system_self_test.py against mcp-server — all checks pass
05717 |   4. DATA RECONCILIATION:
05718 |      During the live period, prism-platform may have received:
05719 |        - New data campaign entries (if M-M2 continued post-migration)
05720 |        - New WAL entries
05721 |        - Updated formula accuracy data
05722 |        - New operator queries (telemetry only — no action needed)
05723 |      
05724 |      FOR CAMPAIGN DATA written to prism-platform:
05725 |        → Export new entries from prism-platform registries
05726 |        → Re-ingest into mcp-server using campaign batch format
05727 |        → Validate: Ω ≥ 0.70 for all re-ingested entries
05728 |        → Document: "POST_ROLLBACK_REINGEST: X entries from [date range]"
05729 |      
05730 |      FOR WAL ENTRIES:
05731 |        → WAL entries in prism-platform are NOT replayed into mcp-server
05732 |        → Document gap in audit trail: "WAL_GAP: [migration_date] to [rollback_date]"
05733 |        → This is acceptable — the audit trail gap is documented, not hidden
05734 |      
05735 |      FOR EVERYTHING ELSE:
05736 |        → Telemetry, formula accuracy, computation cache: rebuild naturally
05737 |        → No manual reconciliation needed — these self-heal through normal operation
05738 |   
05739 |   5. POST-ROLLBACK:
05740 |      → Run safety_calc_test_matrix.py — verify baseline restored
05741 |      → Run performance_benchmark.py — verify baselines restored
05742 |      → Document in ROADMAP_TRACKER: "ROLLBACK: prism-platform→mcp-server on [date], reason: [reason]"
05743 |      → Create ROOT_CAUSE.md with investigation findings
05744 |      → Fix issue in prism-platform
05745 |      → Re-attempt migration with extended dual-run (96 hours, not 72)
05746 | 
05747 | FORWARD-FIX vs ROLLBACK DECISION:
05748 |   If the issue can be fixed in < 4 hours AND is not safety-critical:
05749 |     → Forward-fix in prism-platform (apply fix, rebuild, verify)
05750 |     → Do NOT rollback for UI issues, performance tuning, or non-safety bugs
05751 |   
05752 |   If the issue is safety-critical OR estimated fix > 4 hours:
05753 |     → Rollback first, fix second
05754 |     → Operator safety cannot wait for debugging
05755 | 
05756 | DECOMMISSION CRITERIA (end of rollback window):
05757 |   After 14 days of clean prism-platform operation (zero rollback triggers):
05758 |   1. Final safety_calc_test_matrix.py run — all 50 pass
05759 |   2. Final performance_benchmark.py run — all 10 meet targets
05760 |   3. Export mcp-server codebase to C:\PRISM\archive\mcp-server-final\
05761 |   4. Archive with timestamp and migration report
05762 |   5. Remove mcp-server from active paths (but keep archive permanently)
05763 |   6. Update claude_desktop_config.json to remove mcp-server endpoint
05764 |   7. Document: "DECOMMISSION: mcp-server archived on [date] after 14-day clean operation"
05765 | 
05766 | PERMANENT ARCHIVE:
05767 |   mcp-server archive is NEVER deleted. It serves as:
05768 |     - Historical reference for architectural decisions
05769 |     - Regression baseline for safety calculations
05770 |     - Recovery option for catastrophic prism-platform failure (unlikely but possible)
05771 |   Archive location: C:\PRISM\archive\mcp-server-final\ + external backup
05772 | ```
05773 | 
05774 | 
05775 | # SECTION 8: CORRECTED HOOK INSTALLATION SEQUENCE
05776 | 
05777 | *Every hook installs in the MS that builds its dependencies. No hook activates before its deps exist. Updated for Manufacturing track hooks. **Every MS in this table updates HOOK_MANIFEST.json when installing or activating hooks (v8.5).**  Three-way reconciliation at SAU-Full: HOOK_MANIFEST.json == this table == live system.*
05778 | 
05779 | | MS | Hooks Installed | Why Here |
05780 | |----|----------------|----------|
05781 | | P-P0-MS1 | SYS-REGISTRY-HEALTH | registry_health_check.py built |
05782 | | P-P0-MS2 | SYS-API-KEY-VERIFY | API verification logic built |
05783 | | P-P0-MS3 | PLATFORM-COMPACTION-ARMOR, PLATFORM-ATCS-CHECKPOINT-SYNC (PENDING→ACTIVE at P0-MS8), PLATFORM-CONTEXT-BUDGET | compaction_armor.py + context tracking built |
05784 | | P-P0-MS4 | SYS-PHASE-TODO-RESET | todo_phase_reset.py built |
05785 | | P-P0-MS9 | PLATFORM-COST-ESTIMATE | Agent executors imported |
05786 | | P-P0-MS10 | PLATFORM-SYNC-MANIFEST | SYNC_MANIFEST.json created |
05787 | | P-P1-MS1 | PLATFORM-SCRIPT-SANDBOX | safe_script_runner.py built |
05788 | | P-P1-MS3 | PLATFORM-IMPORT-VERIFY, PLATFORM-ERROR-PATTERN, PLATFORM-SKILL-AUTO-LOAD, SYS-DRIFT-CHECK (PENDING) | Infra hooks with existing deps. Drift PENDING. |
05789 | | P-P1-MS5 | PLATFORM-FORMULA-RECOMMEND | FORMULA_TASK_MAP.json built |
05790 | | P-P1-MS7 | PLATFORM-MEMORY-EXPAND | session_memory_expander.py built |
05791 | | P-P1-MS8 | SYS-DRIFT-CHECK (→ ACTIVE) | drift_detector.py built |
05792 | | P-P2-MS5 | PLATFORM-DEMO-VERIFY | demo_hardener.py built |
05793 | | P-P2-MS7 | PLATFORM-MIGRATION-GATE, PLATFORM-REGRESSION-FULL | dual_run_validator.py built |
05794 | | P-P2-MS8 | PLATFORM-PERF-GATE | performance_benchmark.py built |
05795 | | P-P3-MS1 | PLATFORM-BATCH-ERROR, PLATFORM-BATCH-PROGRESS, PLATFORM-SCHEMA-VERSION | Batch resilience framework built |
05796 | | P-P3-MS5 | MFG-UAT-FEEDBACK | UAT infrastructure prepared |
05797 | | M-M0-MS2 | MFG-INGESTION-VALIDATE | data_ingestion_pipeline.py built |
05798 | | M-M0-MS3 | MFG-CAMPAIGN-PROGRESS | CAMPAIGN_DASHBOARD.json + mfg_batch_validator.py built |
05799 | | M-M1-MS4 | MFG-SAFETY-CALC-VERIFY | safety_calc_test_matrix.py built |
05800 | | E1-MS1 | PLATFORM-WAL-WRITE | WAL writer built |
05801 | 
05802 | **Total: 27 NEW hooks installed across 20 MS. Zero premature activations.**
05803 | 
05804 | *Note: The system has 144 total hooks (117 inherited + 23 new platform/system + 4 new manufacturing = 27 new total). The 117 are pre-existing hooks inherited from mcp-server that migrate automatically with autoHookWrapper import at P0-MS7. The 27 above are NEW hooks created during roadmap execution (v8.4 corrected from 28 — SYS-DRIFT-CHECK counted once despite PENDING→ACTIVE transition). Pre-existing hooks must be triaged at P1-MS3 (categorize KEEP/MODIFY/DISABLE) — see P1-MS3 for details.*
05805 | 
05806 | **Hook categorization (NEW in v8.4 — corrected):**
05807 | ```
05808 | SYS- prefix (4):       System-level hooks: REGISTRY-HEALTH, API-KEY-VERIFY, PHASE-TODO-RESET, DRIFT-CHECK
05809 | PLATFORM- prefix (19):  Platform infrastructure: COMPACTION-ARMOR, ATCS-CHECKPOINT-SYNC, CONTEXT-BUDGET,
05810 |                         COST-ESTIMATE, SYNC-MANIFEST, SCRIPT-SANDBOX, IMPORT-VERIFY, ERROR-PATTERN,
05811 |                         SKILL-AUTO-LOAD, FORMULA-RECOMMEND, MEMORY-EXPAND, DEMO-VERIFY, MIGRATION-GATE,
05812 |                         REGRESSION-FULL, PERF-GATE, BATCH-ERROR, BATCH-PROGRESS, SCHEMA-VERSION, WAL-WRITE
05813 | MFG- prefix (4):        Manufacturing: UAT-FEEDBACK, INGESTION-VALIDATE, CAMPAIGN-PROGRESS, SAFETY-CALC-VERIFY
05814 | ```
05815 | 
05816 | **Manufacturing-track hooks (NEW in v7):**
05817 | - MFG-INGESTION-VALIDATE: fires on every data ingestion, validates entry against schema + Ω threshold
05818 | - MFG-CAMPAIGN-PROGRESS: fires every 50 entries, updates dashboard + checks error budget thresholds
05819 | - MFG-SAFETY-CALC-VERIFY: fires on any safety-critical calculation, cross-validates against test matrix
05820 | 
05821 | 
05822 | ---
05823 | 
05824 | # SECTION 9: CHAT EXECUTION SEQUENCES
05825 | 
05826 | *Explicit order within every multi-MS chat. Main track first, cross-cutting second, Strategic Update last. Manufacturing track chats interleave with Enterprise starting at Chat 11.*
05827 | 
05828 | ## Platform Track (Chats 1-10b)
05829 | 
05830 | | Chat | Execution Order | MS Count | Context Notes |
05831 | |------|----------------|---------|--------------|
05832 | | 1 | P-P0-MS0 → MS1 → MS2 → MS3 → MS4 | 5 | Env check + foundation fixes. Sequential. |
05833 | | 2 | P-P0-MS5 → MS6 → MS7 → MS8 | 4 | Scaffold then imports. |
05834 | | 3 | P-P0-MS9 → MS10 → **SU-1+SAU-Full** → P-P1-MS1 → MS2 | 4+SU | Finish P0, verify+SAU, start P1. |
05835 | | 4a | P-P1-MS3 → MS4 → MS5 | 3 | Hook triage + recommendations + config. |
05836 | | 4b | P-P1-MS6 → MS7 → MS8 → **SU-2+SAU-Full** | 3+SU | Skills + memory + drift + verify+SAU. |
05837 | | 5 | P-P2-MS1 → MS2 → MS3 | 3 | Plugin architecture. |
05838 | | 6 | P-P2-MS4 → MS5 | 2 | AutoPilot + manufacturing demos. |
05839 | | 7 | P-P2-MS6 → MS7 → MS8 → P-PERF-MS1 → **SU-3+SAU-Full** | 4+PERF+SU | Main → perf → verify+SAU. |
05840 | | 8 | P-P3-MS1 → MS2 → MS3 | 3 | ATCS + batch resilience. |
05841 | | 9 | P-P4-MS1 → MS2 → P-P3-MS4 → **P-UAT-MS2** | 3+UAT | AutoPilot default + swarm + learning. UAT after main track. |
05842 | | 10a | P-P4-MS3 → MS4 → P-P3-MS5 → P-P3P4-FINAL | 4 | Main track only. Clean context. |
05843 | | 10b | P-PERF-MS2 → **SU-4+SAU-Full** | PERF+SU | Performance + full verify+SAU. |
05844 | 
05845 | ## Manufacturing Track (Chats 11-14, then interleaved)
05846 | 
05847 | | Chat | Execution Order | MS Count | Context Notes |
05848 | |------|----------------|---------|--------------|
05849 | | 11 | M-M0-MS1 → MS2 → MS3 | 3 | Plugin activation + data pipeline + dashboard. |
05850 | | 12 | M-M0-MS4 → MS5 + SAU-Light | 2+SAU | Remaining dispatchers + SAU. M-M0 COMPLETE. |
05851 | | 13 | M-M1-MS1 → MS2 | 2 | Physics audit + material validation. |
05852 | | 14 | M-M1-MS3 → MS4 + SAU-Light | 2+SAU | Alarm verification + test matrix. M-M1 COMPLETE. |
05853 | | 15 | M-M2-MS1 → MS2 → MS3 | 3 | Campaign init + first batches. |
05854 | | 16 | M-M2-MS4 → MS5 → MS6 | 3 | Continued batches + steady state established. |
05855 | | 17+ | M-M2 steady-state batches | Variable | 15-25 sessions (v8.5, was 15-20). Includes quarantine-resolution sessions every 5th M-M2 session. Interleaving window extended to weeks 15-49. |
05856 | 
05857 | ## Enterprise Track (Chats 18+, interleaved with M-M2)
05858 | 
05859 | | Chat | Execution Order | Context Notes |
05860 | |------|----------------|--------------|
05861 | | 18-22 | E1-MS1 through E1-MS18 | WAL + Replay. 3-4 MS per chat. SAU-Light at MS4 and MS9. |
05862 | | 23-26 | E2-MS1 through E2-MS10 | Cost Intelligence. **SU-5+SAU-Full** after E2. |
05863 | | FLEX-2 | *Buffer if needed* | Between E2 and E3. |
05864 | | 27-36 | E3-MS1 through E3-MS30 | Visual Platform. SAU-Light at MS10 and MS20. FLEX-E3 between MS20→MS21. |
05865 | 
05866 | **E3 Chat Loading Guide (30 MS across ~12 chats, EXPANDED from ~10 in v8.5 due to TOOL-BUILD complexity):**
05867 | 
05868 | **E3 COMPLEXITY CLASSIFICATION (NEW in v8.5):**
05869 | ```
05870 | [UI-RENDER]: Component builds with known patterns. Predictable effort.
05871 | [STATE-INTEGRATION]: Wiring data flow through TelemetryBridge + state store.
05872 |   Debugging state issues is unpredictable. Budget 50% more tool calls.
05873 | [TOOL-BUILD]: Interactive tools with complex user interaction (drag-drop,
05874 |   visual editing, timeline scrubbing). Highest variance. Budget 100% more.
05875 |   These MS should be allocated 1-2 per chat, NOT 3-4.
05876 | [PLATFORM-BUILD]: SDK, marketplace, hot-install. Moderate complexity.
05877 | ```
05878 | 
05879 | | Chat | MS | Load | Class | Deliverables |
05880 | |------|----|------|-------|-------------|
05881 | | 27 | E3-MS1 → MS3 | 🔴 HEAVY | STATE-INT + UI-RENDER | React scaffold + state store decision + TelemetryBridge + WebSocket channels + component library foundation. Front-loading writes detailed specs for MS1-MS5. **E3 Architectural Decision Replay #1 (v8.5).** |
05882 | | 28 | E3-MS4 → MS6 | 🟡 MEDIUM | STATE-INT + UI-RENDER | Extended components (TimeRangeSelector, MetricCard) + auth/RBAC + SystemDashboard + PredictiveFailure/PFP engine imports. |
05883 | | 29 | E3-MS7 → MS10 + SAU-Light | 🔴 HEAVY | UI-RENDER | PredictiveAlertPanel + CampaignDashboard + CalculationDashboard + AlarmDashboard + SAU-Light. Layer 1→2 complete. Front-load Layer 2 specs. **E3 Decision Replay #2 (v8.5).** |
05884 | | 30 | E3-MS11 → MS13 | 🟡 MEDIUM | STATE-INT + TOOL-BUILD | Dashboard cross-integration + dashboard polish + engine consumer verification + FlowCanvas foundation. |
05885 | | 31 | E3-MS14 → MS15 | 🟡 MEDIUM | TOOL-BUILD | FlowCanvas wiring + HookDesigner foundation. **(SPLIT from v8.4: was MS14-MS16, TOOL-BUILD MS need more room)** |
05886 | | 31b | E3-MS16 | 🟡 MEDIUM | TOOL-BUILD | HookDesigner advanced (chain visualization, priority conflicts). |
05887 | | 32 | E3-MS17 → MS18 | 🔴 HEAVY | TOOL-BUILD | ReplayViewer + WhatIf branching. **(SPLIT from v8.4: was MS17-MS20, 4 TOOL-BUILD MS in one chat was unrealistic)** |
05888 | | 32b | E3-MS19 → MS20 + SAU-Light | 🔴 HEAVY | TOOL-BUILD | Interactive tool integration + Layer 3 validation + SAU-Light. Front-load Layer 4 specs. **E3 Decision Replay #3 (v8.5).** |
05889 | | FLEX-E3 | *Buffer* | — | — | Catch-up before Layer 3→4 transition. |
05890 | | 33 | E3-MS21 → MS23 | 🟡 MEDIUM | PLATFORM-BUILD | Plugin SDK design + implementation + Marketplace foundation. |
05891 | | 34 | E3-MS24 → MS26 | 🟡 MEDIUM | PLATFORM-BUILD | Marketplace install/update + hot-install zero-downtime + compliance dashboard. |
05892 | | 35 | E3-MS27 → MS29 | 🟡 MEDIUM | PLATFORM-BUILD | Compliance reporting + integration test suite + performance polish + accessibility. |
05893 | | 36 | E3-MS30 | 🟢 LIGHT | — | Final integration, E3 certification, all engine consumers confirmed, handoff to E4. **E3 Decision Replay #4 (v8.5).** |
05894 | 
05895 | | 37-44 | E4-MS1 through E4-MS24 | Enterprise Readiness. SAU-Light at E4-MS8. |
05896 | 
05897 | **E4 Chat Loading Guide (24 MS across ~8 chats, interleaved with M-M3):**
05898 | | Chat | MS | Load | Deliverables |
05899 | |------|----|------|-------------|
05900 | | 37 | E4-MS1 → MS3 | 🔴 HEAVY | Multi-tenant data model + auth/provisioning + data isolation. Front-loading writes detailed specs for MS1-MS6. 10+ tool calls per MS. |
05901 | | 38 | M-M3-MS1 → MS2 | — | *M-M3 interleave: ISO compliance framework + process validation. CertificateEngine imported.* |
05902 | | 39 | E4-MS4 → MS6 | 🟡 MEDIUM | Tenant config management + dashboard scoping + tenant integration test (3 tenants, zero cross-contamination). |
05903 | | 40 | E4-MS7 → MS8 + SAU-Light | 🟡 MEDIUM | Replication infrastructure + WAL streaming replication + SAU-Light. |
05904 | | 41 | M-M3-MS3 → MS4 + SAU-Light | — | *M-M3 interleave: Material certification + compliance integration. M-M3 COMPLETE.* |
05905 | | 42 | E4-MS9 → MS14 | 🔴 HEAVY | ATCS replication + registry replication + failover sequence + reconciliation + audit logging + compliance hooks. Consider splitting at MS12. |
05906 | | 43 | E4-MS15 → MS20 | 🔴 HEAVY | API governance + data retention + security audit + governance integration + deployment config + health monitoring. Consider splitting at MS18. |
05907 | | 44 | E4-MS21 → MS24 | 🟡 MEDIUM | Operational runbooks + load testing + full integration suite + E4 phase completion. Handoff to M4. |
05908 | 
05909 | ### Manufacturing M-M3 Chats (Interleaved with E4, Chats 37-44)
05910 | 
05911 | | Chat | Execution Order | Context Notes |
05912 | |------|----------------|--------------|
05913 | | 38 | M-M3-MS1 → MS2 | ISO compliance framework + process validation. CertificateEngine imported. |
05914 | | 41 | M-M3-MS3 → MS4 + SAU-Light | Material certification + compliance integration + SAU-Light. M-M3 COMPLETE. |
05915 | 
05916 | *M-M3 chats interleave with E4. Scheduling rule: do NOT mix M-M3 and E4 MS in the same chat. Use alternating chats within the 37-44 range.*
05917 | | FLEX-3 | *Buffer if needed* | Before M4 extraction. |
05918 | | 45-52 | M4-T1 (8 MS) | Tier 1 critical extraction. SAU-Light after T1 integration MS. |
05919 | | 53-60 | M4-T2 (20 MS) | Tier 2 high-value extraction. SAU-Full after T2 integration MS. |
05920 | | 61-66 | M-FINAL-MS1 through MS6 + **SU-6+SAU-Full** | Migration: dual-run + certification + retirement. |
05921 | 
05922 | ### M-FINAL Microsession Breakdown (Chats 61-66)
05923 | 
05924 | M-FINAL spans real-world days due to the 72-hour dual-run. Chat mapping accounts for wait periods.
05925 | 
05926 | | Chat | MS | Title | Effort | Steps |
05927 | |------|-----|-------|--------|-------|
05928 | | 61 | M-FINAL-MS1 | Pre-migration wiring certification + H-4 gate | ~25 tool calls | Run WIRING_CERTIFICATION.md protocol (Section 18.5). Verify 29/29 engines, 7/7 loops, 22/22 guides. **Execute H-4 human gate (v8.5): present 5 golden-path scenarios to manufacturing engineer for live observation. Scenarios: (1) roughing 4140 steel, (2) finishing Ti-6Al-4V, (3) alarm decode FANUC 414, (4) multi-operation sequence, (5) tool life prediction. Engineer observes PRISM output vs their experience. Written sign-off required in HUMAN_REVIEW_LOG.md.** Generate certification report. ENTRY: SU-6 COMPLETE + SAU-Full PASS. EXIT: WIRING_CERTIFICATION.md exists, H-4 sign-off in HUMAN_REVIEW_LOG.md, all 15 gates pass. |
05929 | | 62 | M-FINAL-MS2 | Dual-run infrastructure + gate validation (gates 1-5) | ~20 tool calls | Deploy dual_run_workload.py (~350 lines, v8.5 rebalanced). Run ~7,200 queries including warm scenario journeys across both codebases. Validate gates 1-5 (dual-run <1%, 324 actions zero regression, 10 benchmarks, registry counts, H-4 UAT sign-off confirmed). EXIT: Gates 1-5 PASS, dual-run infrastructure operational. |
05930 | | 63 | M-FINAL-MS3 | 72-hour dual-run START + safety matrix | ~15 tool calls | Start 72-hour parallel execution. Run safety_calc_test_matrix.py (50 calculations from Section 15). Validate gate 7 (±2σ tolerance). Verify KNOWN_RENAMES: test 10 random old tool names resolve correctly. EXIT: 72-hour dual-run running, safety matrix PASS, KNOWN_RENAMES verified. |
05931 | | 64 | M-FINAL-MS4 | 72-hour dual-run MIDPOINT check | ~10 tool calls | Check divergence logs at ~36 hours. Run spot-check on gates 6, 8-15. Verify zero [SYNTHETIC_DATA]/[DEFERRED]/[INCOMPLETE_REPLICA] flags. Verify agent roster. Check for [STATEFUL_DIVERGENCE] from warm scenarios (v8.5). EXIT: Zero divergence at midpoint, cross-track flags resolved. |
05932 | | 65 | M-FINAL-MS5 | 72-hour dual-run END + final certification | ~15 tool calls | Collect 72-hour results. Validate gate 6 (zero divergence). Run ALL 15 gates as final pass. Verify HUMAN_REVIEW_LOG.md: H-1 through H-4 complete, zero unresolved [REJECTED]. Verify COHERENCE_AUDIT.md: zero MAJOR drift items at SU-6. Generate MIGRATION_REPORT.md with gate-by-gate results. EXIT: All 15 gates PASS, MIGRATION_REPORT.md complete. |
05933 | | 66 | M-FINAL-MS6 | Retirement execution + monitoring setup | ~15 tool calls | Switch MCP endpoint to prism-platform. Verify mcp-server goes cold standby (not deleted). Deploy post-migration monitoring (Section 7.3). Set up daily safety_calc_test_matrix.py cron. **Final external backup of both codebases to off-machine destination (v8.5).** EXIT: prism-platform LIVE, mcp-server on standby, monitoring active, final backup verified. |
05934 | 
05935 | | 67 | M-FINAL-MS7 | User documentation generation (v9.0) | ~15 tool calls | Auto-generate operator-facing documentation from system knowledge: (1) Getting Started Guide — boot, first query, understanding results. (2) Common Workflow Tutorials — material lookup, speed/feed calculation, alarm decode, tool life prediction, multi-operation sequence. (3) Alarm Decode Quick Reference — printable reference card for each controller family. (4) Understanding PRISM Output — what S(x) means, what uncertainty bands mean, when to trust vs verify, what quarantine means. (5) Shop Floor FAQ — "why is this number different from my handbook?" "what if PRISM says X but I know Y?" "how to report a problem." All generated from PRISM's own knowledge base + data registry. Validated during H-4 engineer review — engineer confirms docs match operator mental model. ENTRY: M-FINAL-MS6 COMPLETE (system live). EXIT: USER_GUIDE.md + ALARM_QUICK_REF.md + SHOP_FLOOR_FAQ.md generated, reviewed, placed in C:\PRISM\docs\user-facing\. |
05936 | 
05937 | **72-HOUR DUAL-RUN WORKLOAD SPECIFICATION (REBALANCED in v8.5):**
05938 | ```
05939 | THE PROBLEM:
05940 |   The 72-hour dual-run requires continuous query traffic to both codebases.
05941 |   Claude sessions are not continuously active for 72 hours.
05942 |   Manual operation for 72 hours is impractical.
05943 |   v8.4 had ~5,400 queries at ~3.7 per action — insufficient for complex actions.
05944 |   All queries were stateless, missing interaction bugs between ATCS/context/calcs.
05945 | 
05946 | SOLUTION — AUTOMATED WORKLOAD GENERATOR:
05947 |   Created at M-FINAL-MS2 as dual_run_workload.py (~350 lines):
05948 | 
05949 |   1. WORKLOAD COMPOSITION (~7,200 queries, was ~5,400):
05950 | 
05951 |      a. SAFETY-CRITICAL CALCULATIONS (unchanged):
05952 |         50 calculations × 12 cycles = 600 queries
05953 | 
05954 |      b. WEIGHTED REPRESENTATIVE QUERIES (v8.5 — replaces flat 100/cycle):
05955 |         Distributed by action complexity class, not uniformly:
05956 | 
05957 |         CLASS A — Stateful/Complex (82 actions):
05958 |           Multi-pass optimization, knowledge graph, ATCS operations,
05959 |           batch validation, campaign management, WAL replay, swarm deployment
05960 |           → 8 varied queries per action per cycle (edge cases, boundary values)
05961 |           → Cap: 3,600 queries
05962 | 
05963 |         CLASS B — Standard (162 actions):
05964 |           Material lookups, alarm decodes, single calculations, hook operations
05965 |           → 3 queries per action per cycle (1 nominal + 1 edge case + 1 varied)
05966 |           → Cap: 2,400 queries
05967 | 
05968 |         CLASS C — Infrastructure (80 actions):
05969 |           Config reads, status checks, simple getters
05970 |           → 1 query per action per cycle
05971 |           → Cap: 600 queries
05972 | 
05973 |      c. KNOWN_RENAMES (unchanged): 10 per cycle × 12 = 120
05974 | 
05975 |      d. ATCS LIFECYCLE (unchanged): 5 per day × 3 = 15
05976 | 
05977 |      e. HIGH-PRESSURE SCENARIOS (unchanged): 3 per day × 3 = 9
05978 | 
05979 |      f. WARM SCENARIO WORKLOADS (NEW in v8.5 — ~208 queries):
05980 |         Multi-step user journeys that test state interaction:
05981 | 
05982 |         JOURNEY A — "New Job Setup" (6 runs):
05983 |           boot → material_lookup → speed_feed → tool_life → cutting_force → report
05984 |           → 36 queries
05985 | 
05986 |         JOURNEY B — "Alarm Investigation" (6 runs):
05987 |           boot → alarm_decode → related_alarms → fix_procedure → knowledge_graph → log
05988 |           → 36 queries
05989 | 
05990 |         JOURNEY C — "Batch Campaign Session" (4 runs):
05991 |           boot → ATCS_queue → batch_start → ingest → validate → quarantine_check →
05992 |           dashboard → ATCS_checkpoint → ATCS_resume
05993 |           → 36 queries
05994 | 
05995 |         JOURNEY D — "Context Pressure + Recovery" (4 runs):
05996 |           boot → fill_context_70% → pressure_hook → calc_under_pressure →
05997 |           verify_result → compaction → resume → verify_state → same_calc → compare
05998 |           → 40 queries
05999 | 
06000 |         JOURNEY E — "Multi-Operation Machining" (4 runs):
06001 |           boot → material → rough → semi_finish → finish → verify_params_change →
06002 |           tool_life_each → total_cycle_time
06003 |           → 32 queries
06004 | 
06005 |         JOURNEY F — "Knowledge Graph + Learning" (4 runs):
06006 |           boot → material → related → calc_related → log_accuracy →
06007 |           query_recommendations → verify_changed
06008 |           → 28 queries
06009 | 
06010 |         Each journey runs on BOTH codebases and compares END-STATE, not just
06011 |         individual responses. The journey must produce identical final state.
06012 | 
06013 |      GRAND TOTAL: 600 + 6,600 + 120 + 15 + 9 + 208 ≈ 7,552 queries
06014 |      (~7,200 after deduplication and cycle timing)
06015 | 
06016 |   2. EXECUTION MECHANISM:
06017 |      - dual_run_workload.py runs as a Windows Scheduled Task (schtasks)
06018 |      - Triggers: every 4 hours for 72 hours starting at M-FINAL-MS3 completion
06019 |      - Each run: sends identical queries to BOTH mcp-server AND prism-platform endpoints
06020 |      - Warm scenario journeys run once per cycle (every 4 hours)
06021 |      - Logs: query, both responses, diff (if any), timestamp → DUAL_RUN_LOG.json
06022 | 
06023 |   3. DIVERGENCE DETECTION (enhanced in v8.5):
06024 |      - After each cycle: compare all response pairs
06025 |      - Numeric results: ±2σ tolerance (same as safety matrix)
06026 |      - String results: exact match required
06027 |      - Journey end-state: compare final system state after full journey
06028 |      - NEW: Sequence-dependent divergence — if journey step N produces identical
06029 |        results but step N+1 diverges, flag as [STATEFUL_DIVERGENCE] (higher
06030 |        severity than isolated divergence)
06031 |      - Missing responses: immediate RED flag
06032 |      - Divergence log: DUAL_RUN_DIVERGENCE.md (append-only)
06033 |      - If divergence count > 0 at any cycle: alert file → C:\PRISM\state\DUAL_RUN_ALERT.json
06034 | 
06035 |   4. SESSION INTERACTION:
06036 |      - M-FINAL-MS4 (midpoint, ~36h): read DUAL_RUN_LOG.json + DIVERGENCE.md → assess
06037 |      - M-FINAL-MS5 (endpoint, ~72h): read final logs → validate gate 6 → generate report
06038 |      - If DUAL_RUN_ALERT.json exists at midpoint: investigate before continuing
06039 |      - If any [STATEFUL_DIVERGENCE] detected: investigate IMMEDIATELY — state bugs compound
06040 | 
06041 |   5. SETUP (at M-FINAL-MS2):
06042 |      - Write dual_run_workload.py
06043 |      - Configure scheduled task: schtasks /create /sc HOURLY /mo 4 /tn "PRISM_DualRun" ...
06044 |      - Verify: run one manual cycle → check both endpoints respond → check log writes
06045 |      - Verify: run one warm scenario journey → check end-state comparison works
06046 |      - Document: scheduled task name, log locations, alert mechanism
06047 | ```
06048 | 
06049 | **M-FINAL scheduling note:** Chats 63-65 span 3+ real-world days due to 72-hour dual-run. Chat 64 occurs ~36 hours after chat 63. Chat 65 occurs ~72 hours after chat 63. Do NOT attempt to compress into single day. The automated workload generator runs between sessions — no manual operation required during the 72-hour window.
06050 | | 67-70 | M4-T3 (ongoing) | Deferred extraction (post-retirement refactoring). |
06051 | 
06052 | ### M-M2 Interleaving Protocol (NEW in v8.2)
06053 | 
06054 | *M-M2 steady-state batches (batches 6+) run in parallel with Enterprise chats 18+. This section defines the mechanics.*
06055 | 
06056 | ```
06057 | INTERLEAVING MECHANICS:
06058 |   M-M2 batches execute via ATCS queue-and-execute model (NOT background daemon).
06059 |   Enterprise MS execute in dedicated chats (NOT mixed with batch operations).
06060 | 
06061 |   ATCS QUEUE MODEL (NEW in v8.4):
06062 |     - ATCS maintains TASK_QUEUE.json with pending batch operations
06063 |     - Batches only execute during active Claude sessions
06064 |     - On M-M2 session start: ATCS reads queue → auto-starts next batch → checkpoints
06065 |     - Between sessions: queue is dormant (no processing occurs)
06066 |     - Throughput: ~3-5 batches per M-M2 chat session
06067 | 
06068 |   Each working session, the executor picks the next chat based on:
06069 |     1. BLOCK dependencies (Section 3.9 table) — unblock first
06070 |     2. SAU-Light stops due — complete before proceeding
06071 |     3. Alternate tracks — if last chat was Enterprise, next is M-M2 batch review (and vice versa)
06072 |     4. M-M2 batch milestones — at batch 10/20/30, M-M2 takes priority for SAU-Light/UAT
06073 | 
06074 |   Within a single chat:
06075 |     - Do NOT mix M-M2 batch operations with Enterprise MS
06076 |     - M-M2 chats: ATCS auto-starts queued batches → review results → run mfg_batch_validator if due → ATCS checkpoint → dashboard update
06077 |     - Enterprise chats: 2-4 MS per chat per enterprise template
06078 |     - Cross-cutting MS (P-PERF, P-UAT) execute AFTER main-track MS in whichever chat they're assigned to
06079 | 
06080 |   ATCS SESSION-BASED AUTONOMY:
06081 |     At the start of each M-M2 chat: SessionLifecycleEngine reads TASK_QUEUE.json →
06082 |     ATCS auto-starts next queued batches → processes until checkpoint/completion/pressure →
06083 |     executor reviews results → run validation on completed batches → update dashboard → 
06084 |     resolve any quarantine items → ATCS checkpoints remaining queue.
06085 | ```
06086 | 
06087 | ## Flex Chats
06088 | 
06089 | | Flex | Position | Use |
06090 | |------|----------|-----|
06091 | | FLEX-1 | Between P2 and P3 (after Chat 7) | Platform catch-up or tech debt. |
06092 | | FLEX-2 | Between E2 and E3 (after Chat 26) | Enterprise catch-up. Cross-track flag resolution. |
06093 | | FLEX-E3 | Between E3-MS20 and E3-MS21 (Layer 3→4, after Chat ~33) | E3 catch-up. 30 MS is the largest phase — Layer 3→4 is the natural break point. |
06094 | | FLEX-3 | Between E4 and M4-T1 (after Chat 44) | Pre-extraction catch-up. |
06095 | 
06096 | ## Execution Rules
06097 | 
06098 | 1. If PLATFORM-CONTEXT-BUDGET hits YELLOW: complete current MS, write HANDOFF.json, defer rest to next chat.
06099 | 2. SU points (with SAU) are ALWAYS the last thing in their chat. Never skip, but defer if context-pressured.
06100 | 3. Cross-cutting MS (PERF, UAT) execute AFTER all main-track MS in that chat.
06101 | 4. SAU-Full at SU points and major phase boundaries. SAU-Light at all other boundaries.
06102 | 5. Flex chats are used if ANY phase ran over schedule. If on track, skip them.
06103 | 6. Build only the changed codebase unless both are explicitly touched or at phase boundary/SU.
06104 | 7. Manufacturing and Enterprise chats alternate when M-M2 enters steady state. Priority: whichever has a BLOCK dependency waiting.
06105 | 8. Cross-track dependency check (Section 3.9) at the START of every chat that appears in the dependency table.
06106 | 
06107 | 
06108 | ---
06109 | 
06110 | # SECTION 10: PRISM_QUICK_REF.md SPECIFICATION
06111 | 
06112 | *This file is AUTO-GENERATED by quick_ref_generator.py. Max 2KB. NEVER hand-edited. Contains ONLY identifiers and paths.*
06113 | 
06114 | ```markdown
06115 | # PRISM Quick Reference — [Auto-generated: YYYY-MM-DD HH:MM]
06116 | 
06117 | ## Build
06118 | - Command: npm run build (esbuild, NEVER tsc)
06119 | - mcp-server: C:\PRISM\mcp-server\
06120 | - prism-platform: C:\PRISM\prism-platform\
06121 | 
06122 | ## State Files
06123 | - Position: C:\PRISM\docs\ROADMAP_TRACKER.md
06124 | - Handoff: C:\PRISM\state\HANDOFF.json
06125 | - Survival: C:\PRISM\state\COMPACTION_SURVIVAL.json
06126 | - Insights: C:\PRISM\docs\SESSION_INSIGHTS.md
06127 | - Insight Archive: C:\PRISM\docs\SESSION_INSIGHTS_ARCHIVE.md
06128 | - Imports: C:\PRISM\prism-platform\docs\IMPORT_LOG.md
06129 | - Drift: C:\PRISM\docs\DRIFT_LOG.md
06130 | - Campaign: C:\PRISM\state\CAMPAIGN_DASHBOARD.json
06131 | 
06132 | ## Active Hooks [auto-counted]
06133 | [List of hook IDs read from hook registry]
06134 | 
06135 | ## Pending Hooks [auto-counted]
06136 | [List of PENDING hook IDs with awaited dependency]
06137 | 
06138 | ## Scripts [auto-scanned]
06139 | [List of script paths from C:\PRISM\scripts\]
06140 | 
06141 | ## Agent Model Strings [auto-read from config]
06142 | - HAIKU: [current string from .env]
06143 | - SONNET: [current string from .env]
06144 | - OPUS: [current string from .env]
06145 | 
06146 | ## Agent Count [auto-counted from agent registry]
06147 | - Total: X agents
06148 | - Last verified: [timestamp from most recent SAU]
06149 | 
06150 | ## Registry Counts [auto-queried]
06151 | - Materials: X/RAW_AVAILABLE (theoretical: 3,518)
06152 | - Machines: Y/RAW_AVAILABLE (theoretical: 824)
06153 | - Alarms: Z/RAW_AVAILABLE (theoretical: 9,200)
06154 | 
06155 | ## Campaign Progress [auto-read from CAMPAIGN_DASHBOARD.json]
06156 | - Material batches: X complete
06157 | - Machine batches: Y complete
06158 | - Alarm batches: Z complete
06159 | - Quarantine rate: X%
06160 | 
06161 | ## Current Phase [auto-read from ROADMAP_TRACKER]
06162 | [Phase and MS ID]
06163 | 
06164 | ## Last SAU [auto-read from ROADMAP_TRACKER]
06165 | [Most recent SAU completion timestamp and variant (Light/Full)]
06166 | 
06167 | ## Cross-Track Flags [auto-scanned from ROADMAP_TRACKER]
06168 | [List of active SYNTHETIC_DATA / DEFERRED / INCOMPLETE_REPLICA flags]
06169 | ```
06170 | 
06171 | **Generation:** `python C:\PRISM\scripts\quick_ref_generator.py` — reads actual system state, outputs to C:\PRISM\docs\PRISM_QUICK_REF.md. Runs automatically at every SAU stop (Light or Full).
06172 | 
06173 | 
06174 | ---
06175 | 
06176 | # SECTION 11: REVISED COMPLETE TIMELINE
06177 | 
06178 | ## Critical Path Analysis (NEW in v7)
06179 | 
06180 | ```
06181 | CRITICAL PATH (delay here delays everything):
06182 |   P0-MS1 (registries) → P0-MS3 (compaction) → P0-MS5 (scaffold) → P0-MS7 (dispatchers) →
06183 |   P0-MS9 (agents) → P0-MS10 → SU-1 → P1 → P2 → P3-MS1 (batch resilience) →
06184 |   M-M2-MS1 (campaign start) → ... → M-M2 batch 20 → P-UAT-MS1 →
06185 |   M-FINAL → retirement
06186 | 
06187 | FLOAT (can slip without delaying critical path):
06188 |   P0-MS2 (API verify): 1 chat float — can move to Chat 2 if needed
06189 |   P0-MS4 (calc fix + telemetry): 0.5 chat float — calc fix is critical, telemetry can defer
06190 |   P1-MS4 through P1-MS7 (recommendations, skills, memory): 1 chat float each
06191 |   E1 through E4: can slip relative to each other, but E1 must precede M-FINAL
06192 |   M-M3 (compliance): 2-3 chat float — not on critical path until M-FINAL
06193 | 
06194 | ZERO FLOAT (any delay cascades):
06195 |   P0-MS1: registries block everything
06196 |   P3-MS1: batch resilience blocks M-M2
06197 |   M-M2 batch 20: blocks P-UAT-MS1
06198 |   SU-4: blocks M-M2 campaign start
06199 |   SU-6: blocks M-FINAL
06200 | ```
06201 | 
06202 | ## Timeline
06203 | 
06204 | | Week | Chat # | Platform Track | Manufacturing Track | Enterprise Track | Strategic Updates |
06205 | |------|--------|---------------|---------------------|-----------------|-------------------|
06206 | | 1-2 | 1-3 | P0: Env check, fix registries, scaffold, imports | — | — | **SU-1+SAU-Full** (end Chat 3) |
06207 | | 3-4 | 4a-4b | P1: Consolidate + wire + sandbox | — | — | **SU-2+SAU-Full** (end Chat 4b) |
06208 | | 5-7 | 5-7 | P2: Generalize (DEMO 1 prep) | — | — | **SU-3+SAU-Full** (end Chat 7) |
06209 | | 7-8 | FLEX-1 | *Buffer if needed* | — | — | — |
06210 | | 8-10 | 8-10b | P3+P4: Autonomy + orchestration | — | — | **SU-4+SAU-Full** (Chat 10b) |
06211 | | 11-12 | 11-12 | — | M-M0: Plugin packaging + data infra | — | SAU-Light (end M-M0) |
06212 | | 13-14 | 13-14 | — | M-M1: Knowledge recovery + validation | — | SAU-Light (end M-M1) |
06213 | | 15-16 | 15-16 | — | M-M2: Campaign init + first batches | — | — |
06214 | | 17-20 | 17-22 | — | M-M2: Steady-state (interleaved) | E1: WAL + Replay (18 MS) | SAU-Light at E1-MS4, E1-MS9 |
06215 | | 21-26 | 23-26 | — | M-M2: Continues | E2: Cost Intelligence (10 MS) | **SU-5+SAU-Full** (after E2) |
06216 | | 26-27 | FLEX-2 | *Buffer if needed* | — | — | Cross-track flag resolution |
06217 | | 27-36 | 27-36 | — | M-M2: Completing + M-M3 start | E3: Visual Platform (30 MS) | SAU-Light at E3-MS10, E3-MS20 |
06218 | | 37-44 | 37-44 | — | M-M3: Compliance | E4: Enterprise Readiness (24 MS) | SAU-Light at E4-MS8 |
06219 | | 44-45 | FLEX-3 | *Buffer if needed* | — | — | — |
06220 | | 45-52 | 45-52 | — | M4-T1: Critical extraction | — | SAU-Light (after T1) |
06221 | | 53-60 | 53-60 | — | M4-T2: High-value extraction | — | SAU-Full (after T2) |
06222 | | 61-66 | 61-66 | — | M-FINAL: Migration (dual-run) | — | **SU-6+SAU-Full** (pre-migration) |
06223 | | 67-70 | 67-70 | — | M4-T3: Deferred (ongoing) | — | Post-migration monitoring |
06224 | 
06225 | **Total: ~71 chats + 4 flex + ~5 additional (v8.5 E3 splits + quarantine sessions) + 1 documentation chat (v9.0) = ~75-80 chats. ~195 microsessions. ~75-85 weeks.**
06226 | 
06227 | ## Investor Demo Schedule
06228 | 
06229 | | Demo | When | Shows | Depends On |
06230 | |------|------|-------|-----------|
06231 | | DEMO 1 | After SU-3 (Week 7) | Plugin architecture, 5 golden paths, AutoPilot routing | P2 complete |
06232 | | DEMO 2 | After M-M2 batch 20 (Week ~20) | Live data, batch campaigns, autonomous operation | M-M2 progress + **P-UAT-MS1 critical issues resolved** |
06233 | | DEMO 3 | After E3-MS20 (Week ~34) | Visual dashboard, FlowCanvas, compliance UI | E3 progress |
06234 | | DEMO 4 | After SU-6 (Week ~66) | Full system, migration readiness, enterprise features | Everything |
06235 | 
06236 | **DEMO/UAT Ordering (NEW in v8.2):**
06237 | Both DEMO 2 and P-UAT-MS1 trigger at M-M2 batch 20 (≥900 validated material entries). Execution order:
06238 | 1. P-UAT-MS1 runs FIRST — early feedback from manufacturing engineer
06239 | 2. Any CRITICAL issues from P-UAT-MS1 → fix before DEMO 2
06240 | 3. DEMO 2 runs after P-UAT-MS1 critical issues resolved
06241 | 4. P-UAT-MS1 critical failures BLOCK DEMO 2 (investor demos must show working system)
06242 | Both can be in the same chat if P-UAT-MS1 produces no critical issues; otherwise separate chats.
06243 | 
06244 | 
06245 | ---
06246 | 
06247 | # SECTION 12: OUTCOME METRICS
06248 | 
06249 | | Metric | Target | Measured How | Gate |
06250 | |--------|--------|-------------|------|
06251 | | Hooks catch real defects | ≥ 3 blocks per session | Count BLOCK events | Quality |
06252 | | Swarms beat single-agent | ≥ 15% higher Ω | A/B same task | Quality |
06253 | | Agent recommendations accepted | ≥ 75% not overridden | Override rate | Efficiency |
06254 | | Tasks survive compaction | ≥ 95% via ATCS + armor | Completion rate | Resilience |
06255 | | Error resolution accelerates | ≥ 50% faster for known | Time-to-fix trend | Intelligence |
06256 | | Cost tracking accurate | ±5% of actual | API billing calibration | Financial |
06257 | | Material queries accurate | 100% with uncertainty | Published data cross-validation | Safety |
06258 | | Calculations correct | Within ±2σ | Safety-critical test matrix (Section 15) | Safety |
06259 | | Failover RTO | < 30 seconds | Kill primary, measure | Reliability |
06260 | | Plugin hot-install | Zero downtime | Install during workload | Architecture |
06261 | | Demo reliability | 100% across 5 runs | demo_hardener.py | Quality |
06262 | | Registry loading | > 95% of RAW_AVAILABLE | registry_health_check.py | Data |
06263 | | Performance benchmarks | All 10 met | performance_benchmark.py | Performance |
06264 | | UAT pass rate | > 90% scenarios | uat_session_runner.py | Usability |
06265 | | Dual-run discrepancy | < 1% across 100 queries | dual_run_validator.py | Migration |
06266 | | Data campaign error rate | < 5% quarantined | mfg_batch_validator.py | Data |
06267 | | Codebase drift | < 3 unresolved items | DRIFT_LOG.md | Architecture |
06268 | | Session memory utilization | 15/15 categories populated | session_memory.json audit | Intelligence |
06269 | | Formula recommendation hit rate | > 50% used | Accuracy tracker | Intelligence |
06270 | | Strategic Update pass rate | 6/6 SU gates passed | SU verification results | System |
06271 | | SAU artifact freshness | GSD + quick-ref updated at every boundary | SAU log in ROADMAP_TRACKER | System |
06272 | | State file coherence | Zero discrepancies at SU points | system_self_test.py | Reliability |
06273 | | Agent count accuracy | Verified at every SAU stop | Agent registry vs documented count | System |
06274 | | Cross-track flag resolution | Zero flags at SU-6 | ROADMAP_TRACKER flag scan | Integration |
06275 | | Safety test matrix pass rate | 50/50 on both codebases pre-migration | safety_calc_test_matrix.py | Safety |
06276 | | Campaign throughput | ≥ 50 entries/batch average | CAMPAIGN_DASHBOARD.json | Efficiency |
06277 | | Phase insight preservation | All phases archived | SESSION_INSIGHTS_ARCHIVE.md | Intelligence |
06278 | 
06279 | ## 12.1 Performance Benchmark Specification (10 benchmarks) (NEW in v8.1)
06280 | 
06281 | *Referenced by P2-MS8, P-PERF-MS1 through MS4, SU-3, SU-5, SU-6, and Section 7.1. Executed by performance_benchmark.py. All 10 must pass for migration.*
06282 | 
06283 | | # | Benchmark | Target | How Measured | Seeded At | Migration Gate? |
06284 | |---|-----------|--------|-------------|----------|----------------|
06285 | | 1 | Material lookup latency | < 50ms | prism_data→material_lookup("4140") average over 100 calls | P0-MS10 | YES |
06286 | | 2 | Hook chain overhead | < 10ms per call | Time from dispatcher entry to first hook exit, 100-call average | P0-MS10 | YES |
06287 | | 3 | Session boot time | < 3s cold start | Time from prism_dev→session_boot to "ready" response | P0-MS10 | YES |
06288 | | 4 | Calculation throughput | < 200ms for speed_feed | prism_calc→speed_feed end-to-end including hooks, 50-call average | P-PERF-MS1 | YES |
06289 | | 5 | WAL write overhead | < 2ms per entry | Time added to dispatcher call by WAL write, 1000-entry average | P-PERF-MS3 (after E1) | YES |
06290 | | 6 | AutoPilot routing latency | < 50ms query→dispatcher | Time from query receipt to correct dispatcher invocation | P-PERF-MS1 | YES |
06291 | | 7 | Swarm deployment time | < 500ms to first agent | Time from swarm request to first agent invocation | P-PERF-MS2 | YES |
06292 | | 8 | ComputationCache hit rate | > 80% on repeated queries | Cache hits / (hits + misses) over 200 repeated calculations | P-PERF-MS2 | NO (advisory) |
06293 | | 9 | Context pressure accuracy | ±5% of actual | Predicted vs actual context usage at 60%, 70%, 85% thresholds | P-PERF-MS2 | YES |
06294 | | 10 | Compaction recovery time | < 10s to resume | Time from compaction detection to first resumed operation | P-PERF-MS2 | YES |
06295 | 
06296 | ```
06297 | MEASUREMENT PROTOCOL:
06298 |   1. Each benchmark runs 3 times minimum (100+ samples per run for latency benchmarks)
06299 |   2. Report: mean, P95, P99, max
06300 |   3. Pass criteria: P95 must meet target (not just mean)
06301 |   4. Record results in BENCHMARK_LOG.md with timestamp
06302 |   5. At SU stops: compare against last recorded baseline → flag if > 10% regression
06303 | ```
06304 | 
06305 | 
06306 | ---
06307 | 
06308 | # SECTION 13: CONFIDENCE ASSESSMENT
06309 | 
06310 | ### Per-Phase Confidence (unchanged methodology — "given good execution, will this phase's specs produce the intended outcome?")
06311 | 
06312 | | Phase | v7 | v8 | v8.2 | v8.4 | v8.5 | What Changed v8.4→v8.5 |
06313 | |-------|-----|-----|------|------|------|---------------------|
06314 | | P0: Foundation | 99.8% | **99.9%** | **99.9%** | **99.9%** | **99.9%** | No change. |
06315 | | P1: Consolidate | 99.5% | **99.5%** | **99.5%** | **99.5%** | **99.5%** | No change. |
06316 | | P2: Generalize | 99% | **99.5%** | **99.5%** | **99.5%** | **99.5%** | No change. |
06317 | | P3-P4: Autonomy | 99.5% | **99.5%** | **99.7%** | **99.8%** | **99.8%** | Quarantine budget adds resilience. |
06318 | | M-M0: Plugin Packaging | 98% | **99%** | **99%** | **99.2%** | **99.2%** | No change. |
06319 | | M-M1: Knowledge Recovery | 97% | **97%** | **97%** | **97%** | **97%** | No change. |
06320 | | M-M2: Data Campaigns | 95% | **97%** | **98%** | **99%** | **99%** | Human gates add source quality validation. |
06321 | | M-M3: Compliance | 92% | **92%** | **92%** | **92%** | **95%** | Standards research + domain expert review + sample artifacts. |
06322 | | Post-deployment sustainability | — | — | — | — | **~92%** | NEW in v9.0: system can accept new materials, calcs, integrations without rework for 3+ years. |
06323 | | E1-E4: Enterprise | 97% | **97%** | **97%** | **99%** | **98%** | Complexity classification + margin protocol reveal tighter constraints. More honest. |
06324 | | M4: Monolith | 94% | **96%** | **97%** | **98%** | **98%** | Dual-run rebalanced to 7,200 queries. Warm scenarios added. |
06325 | 
06326 | ### Compound Confidence Assessment (NEW in v8.5)
06327 | 
06328 | ```
06329 | THE PROBLEM WITH PER-PHASE CONFIDENCE:
06330 |   Per-phase numbers are presented independently, creating an illusion of certainty.
06331 |   10 phases averaging 97% per-phase = ~74% joint probability, NOT 99.85%.
06332 |   This is basic probability: P(all succeed) = P(A) × P(B) × ... × P(J).
06333 | 
06334 | HONEST COMPOUND ESTIMATE:
06335 | 
06336 |   Phase groups with CORRELATED risks (not independent):
06337 |     Platform phases (P0-P2): share architecture decisions. If P0 foundation
06338 |       is wrong, P1-P2 inherit the problem. Treat as 1 unit: ~98% joint.
06339 |     Manufacturing phases (M-M0 through M-M2): share data quality. If source
06340 |       data is systematically flawed, all phases inherit. Treat as 1 unit: ~95% joint.
06341 |     Enterprise phases (E1-E4): share E3 architecture. If React dashboard approach
06342 |       is wrong, E3 alone is 30 MS of rework. Treat as 1 unit: ~92% joint.
06343 |     Integration phases (P3-P4, M-M3, M4): each partially independent. ~95% joint.
06344 | 
06345 |   JOINT CONFIDENCE (accounting for correlation):
06346 |     ~85% — the project completes without blocking issues
06347 |     ~74% — the project completes within the 75-85 week schedule (raised from ~72% — progressive testing reduces E3 rework risk)
06348 |     ~92% — completed system operates and extends without architectural rework for 3+ years (NEW in v9.0)
06349 | 
06350 |   WHAT THE 15% FAILURE MODE LOOKS LIKE:
06351 |     - E3 React dashboard requires architectural restart at MS15 (3-week delay)
06352 |     - M-M2 source data quality issues cascade through batch 20 (campaign pause)
06353 |     - Enterprise pace goes RED and requires scope reduction
06354 |     - Compaction frequency exceeds threshold, requiring architecture restructuring
06355 | 
06356 |   WHY 85% IS GENUINELY STRONG:
06357 |     85% across 75+ weeks of AI-driven safety-critical development, where the
06358 |     primary developer (Claude) has no persistent memory between sessions and
06359 |     operates through a text-based context window, is a high confidence level.
06360 |     For comparison: traditional 75-week software projects with human teams
06361 |     deliver on-spec and on-schedule roughly 30-40% of the time (Standish Group).
06362 | 
06363 |   THE REMAINING 15% IS COVERED BY:
06364 |     - Emergency Off-Ramp Protocol (Section 3.11): detect early, restructure
06365 |     - Human validation gates (H-1 through H-4): catch source quality issues
06366 |     - Enterprise Margin Protocol: detect pace problems before they compound
06367 |     - Partial delivery is always an option: PRISM with correct materials,
06368 |       calculations, and alarms — but without the visual dashboard — is a
06369 |       working, valuable system
06370 | ```
06371 | 
06372 | 
06373 | ---
06374 | 
06375 | # SECTION 14: COMPLETE CAPABILITY COUNT (MASTER_INDEX-Verified)
06376 | 
06377 | | Capability | Count | Source | v7→v8 Change |
06378 | |-----------|-------|--------|-------------|
06379 | | Dispatchers | 27 (324 actions) | MASTER_INDEX §1 | No change |
06380 | | Engines | 29 (19,930 lines) | MASTER_INDEX §4 | Added line counts + 4 migration tiers |
06381 | | Registries | 19 (13,879 lines) | MASTER_INDEX §5 | **NEW — enumerated with line counts** |
06382 | | Hooks | 144 (117 inherited + 23 new platform/system + 4 new MFG) | Section 8 | v8.4: Corrected from 145→144 (27 new, not 28) |
06383 | | Skills | **137** (119 existing + 18 new) | MASTER_INDEX §11 | **Fixed** (was 171+) |
06384 | | Scripts | **75** core (73 existing + 2 new) | MASTER_INDEX §7 | **Fixed** (was 342+) |
06385 | | Agents | ~54 (verified at every SAU) | Section 4.7 | No change |
06386 | | Swarm patterns | 8 (5 assigned to M-M2) | Section 2 + M-M2 | **Assigned to campaigns** |
06387 | | Cadence functions | 34 (30 original + 4 new) | MASTER_INDEX §6 | No change |
06388 | | Infrastructure files | 3 (autoHookWrapper 1,559L + cadenceExecutor 2,246L + responseSlimmer ~200L) | MASTER_INDEX §6 | **NEW — mapped with migration tiers** |
06389 | | Type definitions | 5 (1,419 lines) | MASTER_INDEX §9 | **NEW — import at P0-MS5** |
06390 | | Data files | 215 across 6 directories | MASTER_INDEX §8 | **NEW — directory inventory** |
06391 | | GSD files | 16 (~628 lines) | Section 2.10 | **NEW — enumerated** |
06392 | | KNOWN_RENAMES | 180-190 entries | guardDispatcher.ts | **NEW — export as JSON** |
06393 | | Migration gates | **17** | Section 7.1 | +1 v8.5 (human review log) +2 v9.0 (API version parity, data abstraction verification) |
06394 | | Quality tiers | 4 (Quick/Standard/Deep/Release) | START HERE + per-MS | **NEW — assigned per MS** |
06395 | | Wiring verification tests | **7** (SU-4 consume tests) | Section 18.2 | **NEW — closed feedback loops** |
06396 | | Engine consumer chains | **29** mapped | Section 18.1 | **NEW — every engine has named consumer** |
06397 | | Performance benchmarks | 10 | Section 12 | No change |
06398 | | UAT scenarios | **8** | Section 5 (P-UAT) | No change |
06399 | | Error policies | 7 (5 standard + 2 MFG) | Section 6 | No change |
06400 | | Strategic Update Points | 6 (SAU-Full) | Section 4.7 | No change |
06401 | | Mini-SAU stops | 10 (6 enterprise + 4 manufacturing) | Section 4.7 | No change |
06402 | | State files | **19** | Section 2.12 | +2 v8.5 (HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json) +2 v9.0 (API_VERSION.json, EXTENSION_REGISTRY.json) |
06403 | | Decision protocol rules | **15** categories | Section 3 | +1 v8.5 (Emergency Off-Ramp) +4 v9.0 (API Version Mgmt, Data Access Abstraction, Calc Engine Extension, Controller Extension) |
06404 | | System self-test checks | **7** | Section 2.13 | +1 v9.0 (API version consistency check) |
06405 | | Flex chats | **4** | Section 9 | +1 (FLEX-E3 added in v8.1) |
06406 | | Safety-critical test calculations | 50 | Section 15 | No change |
06407 | | Cross-track dependency mappings | 10 | Section 3.9 | No change |
06408 | | Sequencing guides | 22 | MASTER_INDEX §3 | **All 22 tested at SU-3 in 4 batches** |
06409 | | SAU artifacts updated | **11** per stop (14 total protocol steps including verification) | Section 4.7 | +2 (COHERENCE_AUDIT, EXTERNAL_BACKUP — v8.5) |
06410 | | Human validation gates | **4** (H-1 through H-4) | M-M2 + M-FINAL | **NEW in v8.5** |
06411 | | 72-hour dual-run queries | **~7,200** | Section 7.1 M-FINAL | +1,800 (warm scenarios + rebalance — v8.5) |
06412 | | Doc files | **7** | Section 2.12 | 5 from v8.5 (COHERENCE_AUDIT, ENTERPRISE_PACE, HUMAN_REVIEW_LOG, COMPLIANCE_REQUIREMENTS, ENV_CONFIG) + 2 from v9.0 (BREAKING_CHANGES, USER_GUIDE) |
06413 | | Manufacturing MS (fully specified) | 15 | Section 5 | No change |
06414 | | Manufacturing MS (template) | 8 | Section 5 | No change |
06415 | | Type definitions | **7** (1,649 lines) | MASTER_INDEX §9 + v9.0 | +2 v9.0 (data-provider.ts, calc-model-types.ts) |
06416 | | Plugin permission tiers | **4** | E3-MS21 | NEW in v9.0 (READ_ONLY, UI_EXTEND, HOOK_INSTALL, CALC_MODIFY) |
06417 | | CalcModel registry entries | **4** built-in | Section 3.14 | NEW in v9.0 (kienzle, taylor, johnson_cook, thread) |
06418 | | E3 progressive test gates | **4** | E3 Layer boundaries | NEW in v9.0 (MS5: 40%, MS12: 60%, MS20: 70%, MS30: 80%) |
06419 | | E4 smoke test gates | **3** | E4 Layer boundaries | NEW in v9.0 (MS6: tenant, MS12: failover, MS18: governance) |
06420 | | Post-deployment maintenance cadence | Quarterly | Section 6.5 | NEW in v9.0 |
06421 | | Rollback window | 14 days | Section 7.5 | NEW in v9.0 |
06422 | 
06423 | 
06424 | ---
06425 | 
06426 | # SECTION 15: SAFETY-CRITICAL TEST MATRIX (NEW in v7)
06427 | 
06428 | *50 calculations across 8 categories. Every calculation has known reference values from published machining handbooks. This matrix is the HARD GATE for migration — both codebases must produce identical results within ±2σ.*
06429 | 
06430 | ## Matrix Structure
06431 | 
06432 | Each calculation specifies: material, condition, operation, tool, and expected output range from published reference data. The test validates that PRISM produces results within the accepted uncertainty band.
06433 | 
06434 | **Executed by:** safety_calc_test_matrix.py
06435 | **Seeded in:** M-M1-MS4
06436 | **Run at:** SU-5, SU-6, P-PERF-MS4, pre-migration, post-migration daily for 7 days
06437 | 
06438 | ## Category 1: Common Steels — Standard Conditions (8 calculations)
06439 | 
06440 | | # | Material | Condition | Operation | Tool | Key Output | Reference Source |
06441 | |---|----------|-----------|-----------|------|-----------|-----------------|
06442 | | 1 | 4140 | Annealed (197 HB) | Roughing | Carbide insert | Vc, fz, ap | Machinery's Handbook |
06443 | | 2 | 4140 | Q&T (50 HRC) | Finishing | CBN insert | Vc, fz, Rz | Sandvik Coromant |
06444 | | 3 | 1045 | Hot rolled (180 HB) | Roughing | Carbide insert | Vc, fz, Fc | Machinery's Handbook |
06445 | | 4 | 4340 | Annealed (217 HB) | Roughing | Carbide insert | Vc, fz, ap | Machinery's Handbook |
06446 | | 5 | 4340 | Q&T (45 HRC) | Finishing | Ceramic insert | Vc, fz | Kennametal |
06447 | | 6 | D2 Tool Steel | Annealed (220 HB) | Roughing | Carbide insert | Vc, fz, Fc | Machinery's Handbook |
06448 | | 7 | D2 Tool Steel | Hardened (60 HRC) | Finishing | CBN insert | Vc, fz, Rz | Sandvik Coromant |
06449 | | 8 | 316 Stainless | Annealed (170 HB) | Roughing | Carbide coated | Vc, fz, BUE risk | Machinery's Handbook |
06450 | 
06451 | ## Category 2: Aluminum Alloys (6 calculations)
06452 | 
06453 | | # | Material | Condition | Operation | Tool | Key Output |
06454 | |---|----------|-----------|-----------|------|-----------|
06455 | | 9 | 6061-T6 | Standard | Roughing | HSS | Vc, fz |
06456 | | 10 | 6061-T6 | Standard | Finishing | Carbide | Vc, fz, Ra |
06457 | | 11 | 7075-T6 | Standard | Roughing | Carbide | Vc, fz, Fc |
06458 | | 12 | 2024-T351 | Standard | Roughing | Carbide | Vc, fz |
06459 | | 13 | A356 Cast | T6 | Roughing | PCD | Vc, fz |
06460 | | 14 | 6061-T6 | Standard | Drilling | Carbide drill | Vc, feed, thrust |
06461 | 
06462 | ## Category 3: Aerospace Alloys — High Consequence (8 calculations)
06463 | 
06464 | | # | Material | Condition | Operation | Tool | Key Output |
06465 | |---|----------|-----------|-----------|------|-----------|
06466 | | 15 | Ti-6Al-4V | Annealed | Roughing | Carbide | Vc, fz, Fc, temp |
06467 | | 16 | Ti-6Al-4V | STA | Finishing | Carbide | Vc, fz, Ra |
06468 | | 17 | Inconel 718 | Solution treated | Roughing | Ceramic | Vc, fz, Fc |
06469 | | 18 | Inconel 718 | Aged (44 HRC) | Finishing | CBN | Vc, fz, Rz |
06470 | | 19 | Waspaloy | Standard | Roughing | Carbide | Vc, fz, tool life |
06471 | | 20 | Hastelloy X | Standard | Roughing | Carbide | Vc, fz |
06472 | | 21 | Ti-6Al-4V | Annealed | Drilling | Carbide drill | Vc, feed, peck cycle |
06473 | | 22 | Inconel 625 | Annealed | Roughing | Ceramic | Vc, fz, notch risk |
06474 | 
06475 | ## Category 4: Tool Life Predictions (6 calculations)
06476 | 
06477 | | # | Material | Condition | Tool | Key Output |
06478 | |---|----------|-----------|------|-----------|
06479 | | 23 | 4140 Annealed | Vc=200, fz=0.25, ap=3 | Carbide insert | Taylor tool life (min) |
06480 | | 24 | Ti-6Al-4V Annealed | Vc=60, fz=0.15, ap=2 | Carbide insert | Taylor tool life (min) |
06481 | | 25 | 6061-T6 | Vc=400, fz=0.20, ap=4 | Carbide insert | Taylor tool life (min) |
06482 | | 26 | Inconel 718 | Vc=30, fz=0.12, ap=1.5 | Ceramic insert | Taylor tool life (min) |
06483 | | 27 | 4340 Q&T 45 HRC | Vc=100, fz=0.10, ap=0.5 | CBN insert | Taylor tool life (min) |
06484 | | 28 | 1045 Hot Rolled | Vc=250, fz=0.30, ap=5 | Carbide insert | Taylor tool life (min) |
06485 | 
06486 | ## Category 5: Cutting Force Calculations — Kienzle Model (6 calculations)
06487 | 
06488 | | # | Material | Parameters | Key Output |
06489 | |---|----------|-----------|-----------|
06490 | | 29 | 4140 Annealed | kc1.1=1820, mc=0.26, ap=3, fz=0.25 | Fc, Ff, Fp (3-component) |
06491 | | 30 | Ti-6Al-4V | kc1.1=1400, mc=0.23, ap=2, fz=0.15 | Fc, power, torque |
06492 | | 31 | 6061-T6 | kc1.1=800, mc=0.23, ap=4, fz=0.20 | Fc, power |
06493 | | 32 | Inconel 718 | kc1.1=2800, mc=0.29, ap=1.5, fz=0.12 | Fc, power, spindle load % |
06494 | | 33 | 316 Stainless | kc1.1=2100, mc=0.27, ap=2.5, fz=0.20 | Fc, power |
06495 | | 34 | D2 60 HRC | kc1.1=4500, mc=0.32, ap=0.3, fz=0.08 | Fc, power (hard turning) |
06496 | 
06497 | ## Category 6: Edge Cases — Boundary Conditions (6 calculations)
06498 | 
06499 | | # | Scenario | Why This Edge Case |
06500 | |---|----------|-------------------|
06501 | | 35 | 4140 at 0.01mm ap (microfinishing) | Minimum chip thickness violation risk |
06502 | | 36 | Ti-6Al-4V at 90% of max recommended Vc | Near-limit thermal behavior |
06503 | | 37 | Inconel 718 interrupted cut | Impact loading on ceramic tool |
06504 | | 38 | 6061-T6 at 30,000 RPM (HSM) | Centrifugal force on tool holder |
06505 | | 39 | 4340 at phase-transition hardness (32 HRC) | Between "soft" and "hard" regimes |
06506 | | 40 | Cast iron (GG25) dry machining | No coolant thermal model |
06507 | 
06508 | ## Category 7: Multi-Operation Sequences (5 calculations)
06509 | 
06510 | | # | Scenario | Key Validation |
06511 | |---|----------|---------------|
06512 | | 41 | 4140: rough → semi-finish → finish | Parameters change correctly per operation |
06513 | | 42 | Ti-6Al-4V: face → contour → pocket | Tool selection changes per geometry |
06514 | | 43 | Inconel 718: rough → finish with tool change | Tool life consumed in rough affects finish tool selection |
06515 | | 44 | 6061-T6: drill → ream → tap | Correct feed/speed per operation type |
06516 | | 45 | 4340 Q&T: OD turn → grooving → threading | Radically different parameters per operation |
06517 | 
06518 | ## Category 8: Alarm Decode Validation (5 calculations)
06519 | 
06520 | | # | Controller | Alarm | Key Validation |
06521 | |---|-----------|-------|---------------|
06522 | | 46 | FANUC | 414 (Servo alarm) | Correct cause identification + fix procedure |
06523 | | 47 | SIEMENS | 25000 (Drive fault) | Correct cause + safety interlock identification |
06524 | | 48 | HAAS | 108 (Spindle fault) | Correct cause + specific HAAS fix steps |
06525 | | 49 | OKUMA | 43 (Turret alarm) | Correct cause + turret-specific procedure |
06526 | | 50 | MAZAK | 218 (Axis alarm) | Correct cause + Mazatrol-specific context |
06527 | 
06528 | ## Acceptance Criteria
06529 | 
06530 | ```
06531 | Per calculation:
06532 |   S(x) ≥ 0.70 — mathematical certainty score
06533 |   Result within ±2σ of published reference value
06534 | 
06535 | Per category:
06536 |   100% pass rate required for Categories 1-5 (core calculations)
06537 |   ≥ 90% pass rate for Category 6 (edge cases — document any failures as [EDGE_CASE_GAP])
06538 |   100% pass rate for Category 7 (multi-operation — validates sequencing)
06539 |   100% pass rate for Category 8 (alarm decode — validates knowledge base)
06540 | 
06541 | For migration:
06542 |   Both codebases must produce identical results (within floating-point tolerance)
06543 |   Any discrepancy → BLOCK migration → investigate → fix → re-test
06544 | ```
06545 | 
06546 | 
06547 | ---
06548 | 
06549 | # SECTION 16: OPERATOR QUICK REFERENCE (NEW in v7)
06550 | 
06551 | *One-page decision card. When you're overwhelmed, read ONLY this section.*
06552 | 
06553 | ## Where Am I?
06554 | 
06555 | ```
06556 | Read C:\PRISM\docs\ROADMAP_TRACKER.md → find last COMPLETE entry → next MS is yours.
06557 | If missing: read C:\PRISM\state\HANDOFF.json → last_ms_completed field.
06558 | If both missing: Section 3.1 full recovery.
06559 | ```
06560 | 
06561 | ## What Do I Do Next?
06562 | 
06563 | ```
06564 | 1. Find your MS in Section 5 (platform), Section 5 manufacturing track, or enterprise specs
06565 | 2. Read ENTRY CONDITIONS — are they all met?
06566 |    YES → execute the MS steps
06567 |    MOSTLY (≥90%) → proceed with [PARTIAL_ENTRY] flag
06568 |    NO → check prior MS, something's wrong
06569 | 3. Execute steps. Build only the changed codebase.
06570 | 4. Check EXIT CONDITIONS — all met?
06571 |    YES → mark COMPLETE in ROADMAP_TRACKER, write HANDOFF.json
06572 |    PARTIALLY (data gap) → mark with [DATA_GAP] flag, proceed
06573 |    PARTIALLY (code bug) → debug, don't mark complete
06574 | 5. Is this MS an SAU boundary? → Run SAU (Light or Full per Section 4.7 table)
06575 | 6. Move to next MS.
06576 | ```
06577 | 
06578 | ## Am I At a Boundary?
06579 | 
06580 | ```
06581 | Phase boundary (P0→P1, P1→P2, etc.) → SAU-Full (~15-17 tool calls)
06582 | SU point (SU-1 through SU-6) → SAU-Full (~15-17 tool calls)
06583 | Enterprise mini-SAU stop → SAU-Light (~7 tool calls)
06584 | Manufacturing SAU stop → SAU-Light (~7 tool calls)
06585 | Normal MS completion → No SAU. Just mark complete + handoff.
06586 | ```
06587 | 
06588 | ## Context Pressure?
06589 | 
06590 | ```
06591 | GREEN (< 60%) → keep going
06592 | YELLOW (60-84%) → finish current MS, then evaluate
06593 | RED (85-94%) → finish current STEP, write survival files, stop
06594 | BLACK (95%+) → compaction armor fires automatically
06595 | ```
06596 | 
06597 | ## Something Broke?
06598 | 
06599 | ```
06600 | Tool returns "not yet imported" → Section 3.8 (use mcp-server fallback if in P0-P1)
06601 | State files disagree → Section 3.5 (trust ROADMAP_TRACKER)
06602 | Cross-track dependency unmet → Section 3.9 (check fallback column)
06603 | S(x) < 0.70 on calculation → STOP. Debug. Do not proceed.
06604 | Error budget metric RED → Pause campaign. Root cause. Section 6.3.
06605 | Enterprise pace RED → STOP and reassess. Section 3.11 / Enterprise Margin Protocol.
06606 | Off-ramp trigger fired → Section 3.11. Complete current MS, then reassess.
06607 | ```
06608 | 
06609 | ## Human Review Due? (NEW in v8.5)
06610 | 
06611 | ```
06612 | M-M2 batch 10 reached → H-1 gate: export 10 materials, get engineer review
06613 | M-M2 batch 20 reached → H-2 gate: edge cases + 3 calculation outputs
06614 | M-M2 batch 30 reached → H-3 gate: machine specs + alarm fixes + compliance
06615 | Pre-M-FINAL → H-4 gate: 5 golden-path scenarios with engineer observing
06616 | All reviews logged in HUMAN_REVIEW_LOG.md. [REJECTED] = investigate immediately.
06617 | ```
06618 | 
06619 | ## Key Paths
06620 | 
06621 | ```
06622 | Roadmap:       This document
06623 | MASTER_INDEX:  C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md (structural truth source)
06624 | Position:      C:\PRISM\docs\ROADMAP_TRACKER.md
06625 | Handoff:       C:\PRISM\state\HANDOFF.json
06626 | Survival:      C:\PRISM\state\COMPACTION_SURVIVAL.json
06627 | Quick Ref:     C:\PRISM\docs\PRISM_QUICK_REF.md (auto-generated)
06628 | Insights:      C:\PRISM\docs\SESSION_INSIGHTS.md
06629 | Archive:       C:\PRISM\docs\SESSION_INSIGHTS_ARCHIVE.md
06630 | Campaign:      C:\PRISM\state\CAMPAIGN_DASHBOARD.json
06631 | GSD:           C:\PRISM\mcp-server\data\docs\gsd\GSD_QUICK.md
06632 | DEV_PROTOCOL:  C:\PRISM\mcp-server\data\docs\gsd\DEV_PROTOCOL.md
06633 | Build:         npm run build (esbuild, NEVER tsc)
06634 | MCP Server:    C:\PRISM\mcp-server\
06635 | Platform:      C:\PRISM\prism-platform\
06636 | Scripts:       C:\PRISM\scripts\
06637 | Data:          C:\PRISM\data\ + C:\PRISM\extracted\ (215 JSON files, 6 directories)
06638 | Hook Manifest: C:\PRISM\state\HOOK_MANIFEST.json (v8.5 — hook count truth source)
06639 | Quarantine BL: C:\PRISM\state\QUARANTINE_BACKLOG.json (v8.5 — deferred quarantine items)
06640 | Coherence:     C:\PRISM\docs\COHERENCE_AUDIT.md (v8.5 — architectural drift tracking)
06641 | Enterprise Pace: C:\PRISM\docs\ENTERPRISE_PACE.md (v8.5 — enterprise velocity tracking)
06642 | Human Review:  C:\PRISM\docs\HUMAN_REVIEW_LOG.md (v8.5 — domain expert validation)
06643 | Compliance:    C:\PRISM\docs\COMPLIANCE_REQUIREMENTS.md (v8.5 — ISO clause mapping)
06644 | Env Config:    C:\PRISM\docs\ENV_CONFIG.md (v8.5 — external backup config)
06645 | API Version:   C:\PRISM\state\API_VERSION.json (v9.0 — dispatcher version tracking)
06646 | Extension Reg: C:\PRISM\state\EXTENSION_REGISTRY.json (v9.0 — data model extensions)
06647 | Breaking Chgs: C:\PRISM\docs\BREAKING_CHANGES.md (v9.0 — API migration paths)
06648 | User Guide:    C:\PRISM\docs\user-facing\USER_GUIDE.md (v9.0 — operator documentation)
06649 | Maintenance:   C:\PRISM\docs\MAINTENANCE_LOG.md (v9.0 — post-deployment data updates)
06650 | ```
06651 | 
06652 | 
06653 | ---
06654 | 
06655 | **END OF SECTION 16**
06656 | 
06657 | ---
06658 | 
06659 | # SECTION 17: INFRASTRUCTURE MIGRATION MAP (NEW in v8)
06660 | 
06661 | *Every file in mcp-server that must migrate to prism-platform, organized by migration tier and timing. Line counts from MASTER_INDEX.md — imported file line counts MUST match these or STOP (content was lost).*
06662 | 
06663 | ## 17.1 Engine Migration Tiers (29 engines, 19,930 lines)
06664 | 
06665 | ### Tier 0 — Infrastructure Engines (import at P0-MS6 and P0-MS7)
06666 | 
06667 | These make everything else work. Import FIRST.
06668 | 
06669 | | Engine | Lines | Import At | What It Does |
06670 | |--------|-------|----------|-------------|
06671 | | SessionLifecycleEngine.ts | 351 | **P0-MS6** | Session boot/shutdown orchestration |
06672 | | ComputationCache.ts | 420 | **P0-MS6** | Caches expensive calculations across calls |
06673 | | DiffEngine.ts | 196 | **P0-MS6** | Detects changes between states for drift detection |
06674 | | HookEngine.ts | 802 | P0-MS7 | Hook registration and execution framework |
06675 | | HookExecutor.ts | 835 | P0-MS7 | Hook chain execution with priority ordering |
06676 | | EventBus.ts | 656 | P0-MS7 | Event system for hook triggers |
06677 | | index.ts | 300 | P0-MS7 | Engine registration and bootstrapping (infrastructure — counted in 29 for migration parity, not a computation engine) |
06678 | | **Tier 0 Total** | **3,560** | |
06679 | 
06680 | ### Tier 1 — Safety-Critical Engines (import at M4-T1)
06681 | 
06682 | These perform or protect calculations where errors = physical harm.
06683 | 
06684 | | Engine | Lines | What It Does |
06685 | |--------|-------|-------------|
06686 | | CollisionDetectionEngine.ts | 1,923 | Prevents tool crashes — spatial analysis of tool paths vs workholding |
06687 | | SpindleProtectionEngine.ts | 901 | RPM/power limit enforcement |
06688 | | ToolBreakageEngine.ts | 1,071 | Tool life monitoring, breakage prediction |
06689 | | WorkholdingEngine.ts | 1,409 | Clamping force validation, fixture analysis |
06690 | | CoolantValidationEngine.ts | 752 | Coolant flow/pressure verification |
06691 | | ManufacturingCalcEngine.ts | 1,082 | Core Kienzle/Taylor calculations |
06692 | | ThreadCalcEngine.ts | 484 | Thread cutting parameter calculation |
06693 | | ToolpathStrategyEngine.ts | 624 | Trochoidal, HSM, adaptive strategy selection |
06694 | | AdvancedCalcEngine.ts | 313 | Multi-pass optimization, surface finish prediction |
06695 | | **Tier 1 Total** | **8,559** | |
06696 | 
06697 | ### Tier 2 — Intelligence Engines (import at P0-MS7 through P1)
06698 | 
06699 | | Engine | Lines | Import At | What It Does |
06700 | |--------|-------|----------|-------------|
06701 | | CalcHookMiddleware.ts | 269 | **P0-MS7** (early — wired with autoHookWrapper) | Pre/post-calculation hook injection |
06702 | | AgentExecutor.ts | 818 | P0-MS9 | Agent tier management, invocation, governance |
06703 | | SwarmExecutor.ts | 953 | P0-MS9 | 8 swarm patterns including ralph_loop |
06704 | | BatchProcessor.ts | 233 | P0-MS9 | Batch operation management |
06705 | | KnowledgeQueryEngine.ts | 871 | P0-MS9 | Knowledge graph queries |
06706 | | ResponseTemplateEngine.ts | 669 | P0-MS9 | Response formatting and template rendering |
06707 | | ScriptExecutor.ts | 754 | P0-MS9 | Python script sandbox execution |
06708 | | SkillExecutor.ts | 868 | P0-MS9 | Skill loading and execution |
06709 | | **Tier 2 Total** | **5,435** | |
06710 | 
06711 | ### Tier 3a — Early-Import Engines (import BEFORE E3 — see individual MS specs)
06712 | 
06713 | *These were originally classified as Tier 3 but are explicitly imported earlier because their consumers need them before E3. The MS-level specs say "import NOW" — this table confirms the correct timing.*
06714 | 
06715 | | Engine | Lines | Actual Import At | Why Early | Consumer |
06716 | |--------|-------|-----------------|-----------|----------|
06717 | | TelemetryEngine.ts | 609 | **P0-MS4** | E3 dashboards are months away; telemetry is needed from day 1 for cadence, boot tracking, hook monitoring | All cadence functions, E3 TelemetryBridge, boot tracker |
06718 | | MemoryGraphEngine.ts | 685 | **P4-MS4** | Knowledge graph feeds PLATFORM-FORMULA-RECOMMEND and AutoPilot enrichment during M-M2 campaigns | PLATFORM-FORMULA-RECOMMEND, AutoPilot, CalculationDashboard |
06719 | | CertificateEngine.ts | 757 | **M-M3-MS1** | M-M3 IS the consumer — compliance workflows need it before E3 dashboard exists | prism_compliance→generate_cert, audit_trail, iso_report |
06720 | | **Tier 3a Total** | **2,051** | | |
06721 | 
06722 | ### Tier 3b — Dashboard Engines (import at E3)
06723 | 
06724 | | Engine | Lines | What It Does |
06725 | |--------|-------|-------------|
06726 | | PredictiveFailureEngine.ts | 523 | ML-based failure prediction from telemetry metrics |
06727 | | PFPEngine.ts | 834 | Predictive Failure Prevention — proactive alerts and mitigations |
06728 | | **Tier 3b Total** | **1,357** | |
06729 | 
06730 | **Validation rule:** After import, count imported file lines. If imported < MASTER_INDEX count → anti-regression FAIL → content was lost → investigate before proceeding.
06731 | 
06732 | ## 17.2 Registry Migration Tiers (19 registries, 13,879 lines)
06733 | 
06734 | *Individual line counts below are approximate (~). The 13,879L total from MASTER_INDEX §5 is the authoritative count. Use MASTER_INDEX totals for anti-regression validation, not the sum of estimates below.*
06735 | 
06736 | ### Tier 1 — Core Framework (import at P0-MS1/MS5)
06737 | 
06738 | | Registry | Lines | Purpose |
06739 | |----------|-------|---------|
06740 | | BaseRegistry.ts | ~2,800 | Abstract base class for all registries |
06741 | | base.ts | ~400 | Registry type definitions |
06742 | | manager.ts | ~600 | Registry lifecycle management |
06743 | | index.ts | ~300 | Registry exports and bootstrapping |
06744 | 
06745 | ### Tier 2 — Manufacturing Data (import at P0-MS1 through M-M0)
06746 | 
06747 | | Registry | Lines | Purpose |
06748 | |----------|-------|---------|
06749 | | MaterialRegistry.ts | ~2,200 | 3,518 materials with 127 parameters each |
06750 | | MachineRegistry.ts | ~1,800 | 824 machines across 43 manufacturers |
06751 | | AlarmRegistry.ts | ~1,600 | 9,200 alarm codes across 12 controller families |
06752 | | ToolRegistry.ts | ~1,400 | 1,944 cutting tools |
06753 | 
06754 | ### Tier 3 — Platform Registries (import at P0-MS7 through P1)
06755 | 
06756 | | Registry | Lines | Purpose |
06757 | |----------|-------|---------|
06758 | | SkillRegistry.ts | ~800 | 137 skill definitions |
06759 | | ScriptRegistry.ts | ~600 | 75 script definitions |
06760 | | FormulaRegistry.ts | ~700 | 490 formula mappings |
06761 | | HookRegistry.ts | ~500 | Hook definitions and dependency tracking |
06762 | | AgentRegistry.ts | ~400 | ~54 agent definitions |
06763 | | ToolpathRegistry.ts | ~350 | Toolpath strategy definitions |
06764 | | DispatcherRegistry.ts | ~300 | 27 dispatcher registrations |
06765 | | ConfigRegistry.ts | ~200 | Configuration management |
06766 | | PluginRegistry.ts | ~200 | Plugin manifest management |
06767 | 
06768 | ## 17.3 Infrastructure File Migration
06769 | 
06770 | | File | Lines | Import At | Why Critical |
06771 | |------|-------|----------|-------------|
06772 | | autoHookWrapper.ts | 1,559 | P0-MS7 (with hook engine) | Without this, hooks are registered but NEVER FIRE |
06773 | | cadenceExecutor.ts | 2,246 | P0-MS9 (with cadence system) | Without this, no auto-checkpoint, no compaction detection, no todo refresh |
06774 | | responseSlimmer.ts | ~200 | P0-MS9 | Without this, context overflows at high pressure |
06775 | | autoDocAntiRegression.ts | ~150 | P0-MS3 (with compaction armor) | Fires on .md writes: WARN on >30% reduction, BLOCK on >60% reduction. Tracks baselines in doc_baselines.json. |
06776 | | prism-schema.ts | 689 | P0-MS5 (scaffold) | Core type definitions for all dispatchers |
06777 | | hookRegistration.ts | ~400 | P0-MS7 | Boot-time hook wiring |
06778 | 
06779 | ## 17.4 WORKING_TOOLS Maintenance Protocol
06780 | 
06781 | AutoPilotV2.ts maintains a WORKING_TOOLS list — the set of dispatcher+actions that are currently functional. Any MS that adds or imports a dispatcher/action MUST:
06782 | 
06783 | 1. Update WORKING_TOOLS in AutoPilotV2.ts
06784 | 2. Update MASTER_INDEX.md Sections 1-3 if action count changed
06785 | 3. Run gsd_sync_v2.py to update tools.md and GSD_QUICK.md
06786 | 4. Rebuild (npm run build)
06787 | 
06788 | **MS triggers for WORKING_TOOLS updates:** M-M0-MS1 (+5 dispatchers), M-M0-MS4/MS5 (+remaining dispatchers), E1-MS1 (+WAL actions), E3-MS1 (+React dashboard actions).
06789 | 
06790 | ## 17.5 Governance Protocols
06791 | 
06792 | ### Changelog Protocol
06793 | Every skill file and doc MUST have a `## Changelog` section. autoDocAntiRegression enforces:
06794 | - On creation: WARN if missing
06795 | - On edit: BLOCK if missing
06796 | - Format: `YYYY-MM-DD | Change description | Author`
06797 | 
06798 | ### Anti-Regression Document Protection
06799 | autoDocAntiRegression fires on all .md file writes:
06800 | - >30% size reduction → WARNING (may be legitimate consolidation)
06801 | - >60% size reduction → BLOCK (almost certainly content loss)
06802 | - Tracks baselines in C:\PRISM\state\doc_baselines.json
06803 | - Import at P0-MS3 (with compaction armor infrastructure)
06804 | 
06805 | 
06806 | ---
06807 | 
06808 | # SECTION 18: WIRING VERIFICATION PROTOCOL (NEW in v8.1)
06809 | 
06810 | *Every engine, subsystem, and intelligence feature has a BUILD step and a CONSUME step. This section maps the full chain and the SU where each is verified. If a chain shows ❌ at any SU, it's a BLOCK — fix before proceeding.*
06811 | 
06812 | ## 18.1 Engine Consumer Chain Map (29 engines)
06813 | 
06814 | | Engine | Lines | Built At | Consumer | Verified At |
06815 | |--------|-------|---------|----------|-------------|
06816 | | index.ts | 300 | P0-MS7 | Engine registration and bootstrapping; consumed by all engine imports at startup | SU-1 |
06817 | | HookEngine.ts | 802 | P0-MS7 | autoHookWrapper dispatches through it | SU-1 |
06818 | | HookExecutor.ts | 835 | P0-MS7 | HookEngine delegates chain execution | SU-1 |
06819 | | EventBus.ts | 656 | P0-MS7 | Dispatchers emit, hooks subscribe | SU-1 |
06820 | | SessionLifecycleEngine.ts | 351 | P0-MS6 | Orchestrates boot/shutdown; session_memory consumers read from it | SU-2 |
06821 | | ComputationCache.ts | 420 | P0-MS6 | prism_calc→speed_feed/cutting_force/tool_life check before computing | SU-4 (cache test) |
06822 | | DiffEngine.ts | 196 | P0-MS6 | drift_detector.py + codebase_sync_check.py call DiffEngine.diff() | SU-2 |
06823 | | CalcHookMiddleware.ts | 269 | P0-MS7 | autoHookWrapper calls for calc dispatchers: pre-injects formulas, post-caches | SU-3 |
06824 | | AgentExecutor.ts | 818 | P0-MS9 | ralph_loop, agent_invoke, swarm patterns | SU-1 |
06825 | | SwarmExecutor.ts | 953 | P0-MS9 | 8 swarm patterns, M-M2 campaign swarms | SU-4 |
06826 | | BatchProcessor.ts | 233 | P0-MS9 | ATCS batch framework | SU-4 |
06827 | | KnowledgeQueryEngine.ts | 871 | P0-MS9 | MemoryGraphEngine, PLATFORM-FORMULA-RECOMMEND, AutoPilot enrichment | SU-4 |
06828 | | ResponseTemplateEngine.ts | 669 | P0-MS9 | autoHookWrapper post-output → format all dispatcher responses | SU-2 |
06829 | | ScriptExecutor.ts | 754 | P0-MS9 | safe_script_runner.py sandbox | SU-2 |
06830 | | SkillExecutor.ts | 868 | P0-MS9 | PLATFORM-SKILL-AUTO-LOAD hook | SU-2 |
06831 | | TelemetryEngine.ts | 609 | P0-MS4 | E3 TelemetryBridge → all dashboards; cadence functions; boot tracker | SU-1 |
06832 | | CollisionDetectionEngine.ts | 1,923 | M4-T1 | toolpath validation pre-hook, prism_calc safety gate | M4-T1 integration |
06833 | | SpindleProtectionEngine.ts | 901 | M4-T1 | CalcHookMiddleware RPM limit check | M4-T1 integration |
06834 | | ToolBreakageEngine.ts | 1,071 | M4-T1 | prism_calc→tool_life, ATCS batch wear tracking | M4-T1 integration |
06835 | | WorkholdingEngine.ts | 1,409 | M4-T1 | prism_calc→setup fixture validation | M4-T1 integration |
06836 | | CoolantValidationEngine.ts | 752 | M4-T1 | CalcHookMiddleware coolant injection | M4-T1 integration |
06837 | | ManufacturingCalcEngine.ts | 1,082 | M4-T1 | ALL prism_calc actions delegate core Kienzle model | M4-T1 integration |
06838 | | ThreadCalcEngine.ts | 484 | M4-T1 | prism_thread→calculate, verify_specs | M4-T1 integration |
06839 | | ToolpathStrategyEngine.ts | 624 | M4-T1 | prism_toolpath→recommend, optimize | M4-T1 integration |
06840 | | AdvancedCalcEngine.ts | 313 | M4-T1 | prism_calc→multi_pass_optimize, surface_finish_predict | M4-T1 integration |
06841 | | MemoryGraphEngine.ts | 685 | P4-MS4 | Knowledge graph: PLATFORM-FORMULA-RECOMMEND + AutoPilot + CalculationDashboard | SU-4 |
06842 | | PredictiveFailureEngine.ts | 523 | E3-MS6 | TelemetryBridge "predictions" → PredictiveAlertPanel | E3-MS12 |
06843 | | PFPEngine.ts | 834 | E3-MS6 | Reads PredictiveFailure → generates mitigations → "predictions" channel | E3-MS12 |
06844 | | CertificateEngine.ts | 757 | M-M3-MS1 | prism_compliance→generate_cert, audit_trail, iso_report | M-M3-MS4 |
06845 | 
06846 | ## 18.2 Intelligence Subsystem Feedback Loops (7 loops)
06847 | 
06848 | | Subsystem | Write Path | Read Path (Consumer) | Feedback Mechanism | Verified At |
06849 | |-----------|-----------|---------------------|-------------------|-------------|
06850 | | Error Pattern DB | PLATFORM-ERROR-PATTERN stores on error | autoHookWrapper.onError() queries → injects fix | Resolution outcome feeds back (did fix work? → confidence adjusts) | SU-4 test #1 |
06851 | | Formula Accuracy | CalcHookMiddleware post-hook logs prediction vs actual | PLATFORM-FORMULA-RECOMMEND weights by accuracy_score | Higher accuracy → higher weight → better predictions → even higher accuracy | SU-4 test #2 |
06852 | | Knowledge Graph | P4-MS4 seeds; M-M2 campaigns add edges | PLATFORM-FORMULA-RECOMMEND + AutoPilot query graph | More data → more edges → better recommendations → better validation outcomes | SU-4 test #3 |
06853 | | Session Memory | PLATFORM-MEMORY-EXPAND writes at session_end | SessionLifecycleEngine + ResponseTemplate + FORMULA-RECOMMEND | Better context → better responses → user validates → memory improves | SU-4 test #4 |
06854 | | Drift Detection | SYS-DRIFT-CHECK writes DRIFT_LOG.md | Auto-TODO at 3+, CRITICAL at 5+, auto-resolution for common types | Fixes reduce count → threshold drops → system stabilizes | SU-4 test #5 |
06855 | | Boot Efficiency | autoBootHealthCheck at session start | 3s WARN → 5s optimize → 8s BLOCK | Optimization prunes memory/cache → boot speeds up → threshold clears | SU-4 test #6 |
06856 | | ComputationCache | prism_calc writes results post-computation | prism_calc reads pre-computation (cache hit = skip) | Cache hits → faster calcs; invalidation on data change → accuracy preserved | SU-4 test #7 |
06857 | 
06858 | ## 18.3 Sequencing Guide Coverage (22/22)
06859 | 
06860 | All 22 sequencing guides from MASTER_INDEX §3 tested at SU-3 in 4 batches. Pass criteria: ≥20/22, with all Batch 1 (manufacturing) required to pass.
06861 | 
06862 | **Batch composition (enumerated at SU-3, Section 6):**
06863 | - **Batch 1 — Core Manufacturing (5 guides, ALL must pass):** 3.5, 3.6, 3.7, 3.8, 3.9
06864 | - **Batch 2 — System Operations (5 guides):** 3.1, 3.2, 3.3, 3.4, 3.10
06865 | - **Batch 3 — Autonomous Operations (5 guides):** 3.11, 3.12, 3.13, 3.14, 3.16
06866 | - **Batch 4 — Intelligence + Platform (7 guides):** 3.15, 3.17, 3.18, 3.19, 3.20, 3.21, 3.22
06867 | 
06868 | ## 18.4 Verification Schedule
06869 | 
06870 | | SU | What's Tested | Engine Count | Loop Count | Guide Count |
06871 | |----|--------------|-------------|-----------|-------------|
06872 | | SU-1 | Core infrastructure: hooks, agents, telemetry | 5 engines | 0 loops | 0 guides |
06873 | | SU-2 | Session, drift, response, scripts, skills | 5 engines | 0 loops | 0 guides |
06874 | | SU-3 | All sequencing, calc middleware, plugins | 1 engine | 0 loops | **22 guides** |
06875 | | SU-4 | **ALL intelligence subsystems + feedback loops** | 3 engines | **7 loops** | 0 guides |
06876 | | SU-5 | Enterprise: WAL infrastructure, cost tracking, cross-track flags | 0 engines (WAL/cost are infrastructure, not in 29-engine list) | 0 loops | 0 guides |
06877 | | M4-T1 | **ALL 9 safety-critical engine consumer chains** | 9 engines | 0 loops | 0 guides |
06878 | | E3-MS12 | Dashboard engine consumers | 2 engines | 0 loops | 0 guides |
06879 | | M-M3-MS4 | Compliance engine consumer | 1 engine | 0 loops | 0 guides |
06880 | | SU-6 | **FULL AUDIT: all 29 engines, 7 loops, 22 guides** | 29 | 7 | 22 |
06881 | 
06882 | **Cumulative by SU-6:** 29/29 engines verified, 7/7 feedback loops verified, 22/22 sequencing guides verified. **100% wiring confidence.**
06883 | 
06884 | ## 18.5 Pre-Migration Wiring Certification (M-FINAL)
06885 | 
06886 | Before dual-run validation, run this comprehensive test:
06887 | 
06888 | ```
06889 | FOR EACH of the 29 engines:
06890 |   1. Identify all consumers (from 18.1 "Consumer" column)
06891 |   2. Call each consumer → verify engine is actually invoked (not silently bypassed)
06892 |   3. Verify output matches expected format
06893 |   4. BLOCK migration if ANY engine has zero actual consumers
06894 | 
06895 | FOR EACH of the 7 intelligence subsystems:
06896 |   1. Write test data to the subsystem
06897 |   2. Trigger the consumer that should READ the data
06898 |   3. Verify consumer behavior CHANGED based on the data
06899 |   4. BLOCK migration if behavior unchanged (feedback loop broken)
06900 | 
06901 | FOR EACH of the 22 sequencing guides:
06902 |   1. Send query that triggers the sequence
06903 |   2. Trace execution through TelemetryEngine
06904 |   3. Verify all steps fire
06905 |   4. BLOCK migration if any step skipped
06906 | 
06907 | PRODUCE: WIRING_CERTIFICATION.md
06908 |   → 29 engines × consumers verified
06909 |   → 7 feedback loops × bidirectional flow verified
06910 |   → 22 sequences × all steps traced
06911 |   → REQUIRED artifact for pre-retirement gate (Section 7.1, gate #14)
06912 | ```
06913 | 
06914 | 
06915 | ---
06916 | 
06917 | **END OF ROADMAP v10.0**
06918 | 
06919 | ~75-80 chats • ~195 microsessions • 6 Strategic Update Points (SAU-Full) • 10 SAU-Light stops • 4 Flex Chats • 4 investor demos • 4 human validation gates + temporal heartbeat • 4 E3 progressive test gates • 3 E4 smoke test gates • 1 rollback fire drill • ~75-85 weeks
06920 | 
06921 | **MASTER_INDEX-verified counts (floors where auto-discovered):**
06922 | 27 dispatchers (324 actions) • 29 engines (19,930L) • 19 registries (13,879L) • 8 type defs (1,799L)
06923 | ≥144 hooks (117 inherited + 27 new, atomically registered) • ≥137 skills (auto-discovered) • ≥75 core scripts (self-describing) • ~54 agents • 8 swarm patterns • 34 cadence functions
06924 | 215 data files across 6 directories • 16 GSD files • 180-190 KNOWN_RENAMES
06925 | 3 infrastructure files (autoHookWrapper 1,559L + cadenceExecutor 2,246L + responseSlimmer ~200L)
06926 | 8 type definitions (1,799L) • 4 plugin permission tiers with resource limits • 4 built-in CalcModels • 1 External Integration API
06927 | 17 migration gates • 4 quality tiers • 11 SAU artifacts per stop • 22 sequencing guides
06928 | 7 intelligence feedback loops • 19 state files • 7 doc files • 20 sections + 3 new protocol sections (v10.0)
06929 | ~7,200 dual-run queries (weighted + warm scenarios) • 50+ safety-critical test calculations (expandable via JSON, fuzz-tested at boundaries)
06930 | 4 build pipeline steps (typecheck + compile + test:critical + output) • 9 system self-test checks • 6 hook priority bands
06931 | 
06932 | **v10.0 additions (50 enhancements from extensibility friction analysis + build safety audit + external review integration):**
06933 | 
06934 | See v10.0 CHANGELOG at document header for full details. Key changes:
06935 | Zero-Touch Extensibility Protocol: skills auto-discover, scripts self-describe, hooks register atomically, plugins resolve deps (ZT-1 through ZT-8)
06936 | Hardened Build Pipeline: tsc --noEmit type checking + esbuild incremental + test:critical on every build (BP-1 through BP-5)
06937 | PrismError class hierarchy: typed errors replace string matching for safety-critical error handling (CM-1)
06938 | Correlation ID logging: every request traced dispatcher→hooks→engine→response for debugging (CM-2)
06939 | E3 state management decided: Zustand selected NOW with documented rationale, not deferred to execution (CM-4)
06940 | External backup elevated to BLOCK: M-M2 cannot start without verified off-machine backup (SR-1)
06941 | Long-tail migration validation: real production traffic replayed against warm standby nightly (SR-2)
06942 | Safety fuzz testing: randomized boundary tests around S(x)=0.70 threshold on every build (SR-4)
06943 | Runtime safety trace proof: every safety action must produce correlationId trace proving execution (SR-5)
06944 | Fast-path execution: reduced ceremony after 3 consecutive clean MS (ER-1)
06945 | Temporal HITL heartbeat: human review every 10 sessions regardless of batch count (ER-2)
06946 | Rollback fire drill: mandatory rehearsal at SU-3 prevents procedure rot (ER-3)
06947 | Multi-axis extension conflict testing: composite safety tests when multiple extensions active (ER-4)
06948 | DataProvider marked provisional: interface may revise until SU-5 based on real query patterns (ER-5)
06949 | Schema migration v1 limits: additive and rename only, structural transforms deferred (ER-6)
06950 | Metadata auto-repair: system proposes corrections when code reality is clear (ER-7)
06951 | SAU-Full duration cap: maximum 20 tool calls, overflow deferred to SAU-Light (ER-8)
06952 | HITL structured questionnaires: fixed questions with recorded answers prevent rubber-stamping (ER-9)
06953 | Test harness trailing: non-safety tests may trail 1 layer, safety tests never trail (ER-10)
06954 | Amendment frequency tracking: >5 amendments per phase triggers simplification review (ER-11)
06955 | Plugin runtime resource limits: CALC_MODIFY plugins sandboxed with CPU/memory limits (ER-12)
06956 | MASTER_INDEX counts become floors: auto-discovery means counts grow without manual updates (ZT-8)
06957 | Microsession resource profiles: I/O-bound, context-bound, compute-bound with adaptive budgets (SR-3)
06958 | 
06959 | **v8.5 additions (22 fixes from external structural risk analysis):**
06960 | 
06961 | See v8.5 CHANGELOG at document header for full details. Key changes:
06962 | Off-machine backup protocol: external backup at every SAU-Full, weekly during M-M2 steady state (B-1)
06963 | Human validation gates: 4 distributed domain expert spot-checks at batch 10/20/30/pre-M-FINAL (B-2)
06964 | Architectural coherence audit: code style + decision replay + naming + dependency checks at every SAU-Full (B-3)
06965 | Hook count source-of-truth: HOOK_MANIFEST.json created at P0-MS1, three-way reconciliation at SAU-Full (B-4)
06966 | Compound confidence: honest joint estimate ~85% (not 99.85%), ~72% within schedule (D-2)
06967 | Dual-run rebalanced: ~7,200 queries weighted by complexity class + warm scenario journeys (D-3)
06968 | ATCS throughput: M-M2 chats 15-25 (was 15-20), quarantine budget protocol with deferred resolution (D-4)
06969 | Enterprise margin protocol: ENTERPRISE_PACE.md with GREEN/YELLOW/RED thresholds (G-3)
06970 | E3 complexity classification: UI-RENDER/STATE-INTEGRATION/TOOL-BUILD/PLATFORM-BUILD per MS (G-3, A-4)
06971 | E3 architectural decision replay: automated spot-checks at 4 layer boundaries (G-7)
06972 | M-M3 compliance domain protocol: standards research + sample artifacts + domain expert review (G-4)
06973 | Emergency off-ramp: 6 trigger conditions with reassessment procedure (G-8)
06974 | Interleaving overhead budgeted: effective 13 tool calls per interleaved session (G-6)
06975 | New artifacts: HOOK_MANIFEST.json, QUARANTINE_BACKLOG.json, COHERENCE_AUDIT.md, ENTERPRISE_PACE.md, HUMAN_REVIEW_LOG.md, COMPLIANCE_REQUIREMENTS.md, ENV_CONFIG.md, REASSESSMENT.md (emergency only)
06976 | 
06977 | **v8.4 additions (13 fixes from structural risk analysis):**
06978 | 
06979 | See v8.4 CHANGELOG at document header for full details. Key changes:
06980 | Enterprise MS cliff eliminated: ALL 82 enterprise MS (E3+E4) have defined purpose/deliverable/entry/exit (B-1)
06981 | ATCS execution model grounded in reality: session-based queue, not background daemon (B-2)
06982 | 72-hour dual-run: automated workload generator via Windows Scheduled Task (B-3)
06983 | Hook count: corrected 145→144, full prefix categorization (D-1)
06984 | Campaign rollback: downstream consumers (knowledge graph, formula tracker, cache, telemetry) cleaned up (D-2, G-5)
06985 | P-DM: full microsession spec with assessment→scope→migrate→verify→document steps (D-3)
06986 | New protocols: Model Upgrade (G-1), Disk Space Management (G-2), Context Window Contingency (G-3)
06987 | Junction points: WSL2/cross-drive edge cases with 3-tier fallback chain (G-4)
06988 | 
06989 | **v8.3 additions (21 fixes from independent gap analysis):**
06990 | 
06991 | See v8.3 CHANGELOG at document header for full details. Key changes: engine import sequencing fixed (B-1/B-2), M-FINAL microsession breakdown added (G-4), 15 session memory categories enumerated (G-3), E3/E4 chat loading guides added (G-8), campaign plateau contingency added (A-5), microsession count corrected to ~190 (A-1).
06992 | Section 9 ↔ Section 11 chat number reconciliation (M4-T1/T2/M-FINAL aligned)
06993 | Engine Tier 3 split into 3a (early import) and 3b (E3 import) with correct timing
06994 | ROADMAP_TRACKER.md format specification • M-M2 interleaving protocol
06995 | P-UAT-MS2 explicitly placed in Chat 9 • autoDocAntiRegression wired into P0-MS3
06996 | UAT scenario enumeration (8 scenarios) • P-DM schema detection mechanism
06997 | CAMPAIGN_DASHBOARD.json schema_version field • DEMO 2 / P-UAT-MS1 ordering
06998 | E3 Layer→MS mapping table • SU-1 quality tier added • Flex chat count corrected to 4
06999 | Hook categorization clarified • Registry estimate advisory note • Batch 30 machines corrected
07000 | 
07001 | **v8.1 additions:**
07002 | Campaign data rollback protocol (Section 6.4) • Backup/DR specification (Section 7.4)
07003 | E3 Security Constraints (BINDING) • Enterprise MS entry/exit minimums (E1-E2 fully specified)
07004 | 10 performance benchmarks enumerated (Section 12.1) • FLEX-E3 buffer added
07005 | Roadmap amendment protocol • 28 gaps closed from independent audit
07006 | 
07007 | **Wiring verification (Section 18):**
07008 | 29/29 engines have explicit consumers with verification schedule
07009 | 7/7 intelligence subsystems have bidirectional feedback loops with SU-4 tests
07010 | 22/22 sequencing guides tested at SU-3 (not just 8)
07011 | 9/9 Tier 1 safety engines have consumer chain mapping protocol at M4
07012 | WIRING_CERTIFICATION.md required at M-FINAL as gate #14
07013 | 
07014 | **Self-executing architecture:**
07015 | - START HERE block on page 1 — boot sequence, resume protocol, key rules
07016 | - Exact MCP commands for P0-MS0 through MS5 (pattern learned, generalize after)
07017 | - Quality tier assigned per MS — no ambiguity on validation depth
07018 | - Every addendum patch folded inline — no cross-referencing
07019 | - MASTER_INDEX.md as structural truth source — verified at every SAU
07020 | - Infrastructure migration map with line counts — anti-regression baselines
07021 | - Every engine has a named consumer — no "import and hope"
07022 | - Every intelligence subsystem has a closed feedback loop — no write-only databases
07023 | - ROADMAP_TRACKER.md format specified — no ambiguity on position tracking
07024 | - Section 9 ↔ Section 11 chat numbers reconciled — no conflicting schedules
07025 | - Engine import timing verified against MS specs — no Tier classification lies
07026 | - **Every enterprise MS has a defined deliverable — no "front-load and hope" (v8.4)**
07027 | - **ATCS execution model documented — no phantom background daemons (v8.4)**
07028 | - **72-hour dual-run has automated workload — no manual 3-day operation (v8.4)**
07029 | - **Model upgrades, disk space, context changes all have protocols (v8.4)**
07030 | - **Human validation gates prevent self-referential validation — domain experts verify (v8.5)**
07031 | - **Architectural coherence audit prevents style drift — consistency verified at every SAU (v8.5)**
07032 | - **External backup prevents single-point-of-failure — off-machine copies required (v8.5)**
07033 | - **Emergency off-ramp prevents runaway failure — stop criteria defined before starting (v8.5)**
07034 | - **Enterprise pace tracking prevents silent schedule erosion — early warning metrics (v8.5)**
07035 | - **Compound confidence is honest — 85% joint probability, not aspirational 99.85% (v8.5)**
07036 | - **Data access is abstracted — DataProvider interface enables storage backend swaps without engine changes (v9.0)**
07037 | - **API is versioned — dispatcher signatures tracked with semantic versioning, plugins declare compatibility (v9.0)**
07038 | - **Calculation models are pluggable — CalcModelRegistry enables new physics domains without core engine modification (v9.0)**
07039 | - **Plugin security is tiered — 4 permission levels prevent unauthorized access to safety-critical hooks (v9.0)**
07040 | - **Post-deployment data maintenance is defined — materials, machines, alarms, tools all have update procedures (v9.0)**
07041 | - **Post-migration rollback is safe — 14-day warm standby with defined trigger conditions and data reconciliation (v9.0)**
07042 | - **E3 testing is progressive — component coverage gates at every layer boundary, not just MS28 (v9.0)**
07043 | - **User documentation is generated — operator-facing guides built from system knowledge at M-FINAL-MS7 (v9.0)**
07044 | - **Skills auto-discover — drop a file, it's registered. No manual wiring needed (v10.0)**
07045 | - **Scripts self-describe — PRISM_MANIFEST headers auto-wire to triggers (v10.0)**
07046 | - **Hooks register atomically — one action updates everything: registry, manifest, counts (v10.0)**
07047 | - **Plugins resolve dependencies — load order enforced, uninstall protection, resource limits (v10.0)**
07048 | - **Hook priorities are banded — collision detection at registration prevents subtle priority bugs (v10.0)**
07049 | - **Build pipeline validates safety — type check + safety calculations + fuzz tests on EVERY build (v10.0)**
07050 | - **MASTER_INDEX counts are floors — auto-discovery means counts grow without manual updates (v10.0)**
07051 | - **Errors are typed — PrismError hierarchy enables typed dispatch, not string matching (v10.0)**
07052 | - **Logs are correlated — correlationId traces any request from dispatcher to response (v10.0)**
07053 | - **Dependencies are locked — npm ci + pinned versions prevent "it worked yesterday" bugs (v10.0)**
07054 | - **E3 state management is decided — Zustand selected with rationale, not deferred to execution (v10.0)**
07055 | - **External backup is enforced — M-M2 BLOCKED without verified off-machine backup (v10.0)**
07056 | - **Migration is long-tail validated — real production traffic replayed against warm standby nightly (v10.0)**
07057 | - **Safety boundaries are fuzz-tested — randomized perturbations verify S(x) gates at edges (v10.0)**
07058 | - **Safety execution is trace-proven — correlationId proves safety engines ran, not just registered (v10.0)**
07059 | - **Fast-path reduces ceremony — 3 clean MS in a row → reduced overhead for routine work (v10.0)**
07060 | - **Human review has temporal heartbeat — every 10 sessions regardless of batch milestones (v10.0)**
07061 | - **Rollback is rehearsed — fire drill at SU-3 proves procedure works mid-project (v10.0)**
07062 | - **Multi-axis extensions are tested together — composite safety tests prevent interaction bypasses (v10.0)**
07063 | - **Schema migrations are scoped — v1 limits to additive/rename only, preventing framework creep (v10.0)**
07064 | - **Metadata repairs itself — auto-repair proposes fixes when code reality is clear (v10.0)**
07065 | 
07066 | *Every platform and manufacturing MS executable from cold start. Every enterprise MS has a defined purpose, deliverable, and entry/exit conditions — front-loading augments these specs with detailed steps, it does not generate them from nothing. Every hook installed with its dependencies.*
07067 | *Every feature verified for wiring and synergy. Every ambiguity resolved by protocol.*
07068 | *Every system artifact — GSD, AutoPilot, memories, quick-ref, MASTER_INDEX, DEV_PROTOCOL, COHERENCE_AUDIT — updated at defined stops.*
07069 | *Every track fully specified. Every cross-track dependency mapped with fallbacks.*
07070 | *Every safety-critical calculation has a test matrix entry and fuzz-tested boundaries.*
07071 | *Every infrastructure file has a migration tier and line count baseline.*
07072 | *Every engine has a consumer. Every feedback loop is closed. Every sequence is tested.*
07073 | *Every downstream consumer has a cleanup protocol for data rollback.*
07074 | *Every human validation point is scheduled before it's needed, with structured questionnaires.*
07075 | *Every risk has an off-ramp. Stopping with a working partial system is always an option.*
07076 | *Every data access is abstracted. Every API is versioned. Every extension point is defined.*
07077 | *Every calculation model is pluggable. Every plugin is sandboxed, permissioned, and resource-limited.*
07078 | *Every post-deployment maintenance scenario has a procedure.*
07079 | *Every component type has a zero-touch or single-action extension path.*
07080 | *Every build validates type safety, safety calculations, and safety execution traces.*
07081 | *The system that gets built can grow, adapt, and accept new domains without a rewrite — and without updating a bunch of other things.*
07082 | 
07083 | *If you're lost: Section 3 Decision Protocol → Position Recovery → find your MS → read entry conditions → continue.*
07084 | *If you're overwhelmed: Section 16 Operator Quick Reference → see exactly what to do next.*
07085 | *If you need architecture details: Section 17 Infrastructure Migration Map → find the file → check its tier and import timing.*
07086 | *If you need wiring details: Section 18 Wiring Verification Protocol → find the engine → trace its consumer chain.*
07087 | *If things are going wrong: Section 3.11 Emergency Off-Ramp Protocol → check triggers → reassess if needed.*
07088 | *If you want to add something: Section 3.17 Zero-Touch Extensibility Protocol → find your component type → follow the drop-in contract.*
07089 | *If you're starting fresh: START HERE block (page 1) → boot → find position → execute.*
07090 | 
