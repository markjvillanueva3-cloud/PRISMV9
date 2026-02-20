# PRISM PROTOCOLS CHANGELOG
# Extracted from PRISM_PROTOCOLS_CORE.md on 2026-02-17 (Roadmap Audit Finding 1+14)
# This file is for REFERENCE ONLY. Never loaded during sessions.
# For active protocols, see: PROTOCOLS_BOOT.md, PROTOCOLS_SAFETY.md, PROTOCOLS_CODING.md

# PRISM PROTOCOLS — CORE v14.3
# ALWAYS loaded every session alongside PRISM_MASTER_INDEX.md
# Contains ONLY what every session needs. For Quality Tiers, Roles, Rollback, see PRISM_PROTOCOLS_REFERENCE.md
#
# v13.9 CHANGES (from v13.8 — Cross-Audit Governance Hardening, 13 improvements):
#   - LOG SCHEMA: All structured logs must include timestamp, level, dispatcher, action,
#     correlationId, durationMs. Safety blocks get dedicated record format. (XA-8)
#   - TRACE PROPAGATION: Every API call chain gets UUID correlationId at entry. (XA-8)
#   - ARTIFACT VALIDATION: Boot Step 2.5 checks REQUIRES artifacts from SYSTEM_CONTRACT.md. (XA-1)
#   - SYSTEM_CONTRACT.md: Referenced at phase gates for invariant verification. (XA-5)
#   All v13.8 third infrastructure audit hardening retained unchanged.
#
# v13.8 CHANGES (from v13.7 — Third Infrastructure Audit, 11 findings):
#   - STUCK PROTOCOL: 3-attempt ceiling + state preserve + human escalation (IA3-9.1)
#   - SUSPECT DATA QUARANTINE: Tier 2.1 degradation for corrupt-but-plausible data (IA3-7.1)
#   - DISPATCHER PROBE: Tier 2.5 probe-action fallback for non-health dispatchers (IA3-1.1)
#   - RESPONSE BUDGET VALIDATION: Estimated vs actual throughput tracking per MS (IA3-2.1)
#   - HOOK OUTPUT STABILITY: Additive-only versioning for hook output schemas (IA3-5.1)
#   - BOUNDED RECOVERY LOAD: Phase doc bounded read during compaction recovery (IA3-3.1)
#   - PARALLEL PROGRESS: swarm_status polling during long R3+ batches (IA3-6.1)
#   - DEPRECATION LIFECYCLE: 3-phase removal protocol for dispatchers/actions (IA3-12.1)
#   All v13.7 second infrastructure audit hardening retained unchanged.
#
# v13.7 CHANGES (from v13.6 — Second Infrastructure Audit, 14 findings):
#   - ACTION ENUM HARDENING: Dispatcher schemas use JSON Schema enum for 'action' param (IA2-1.2)
#   - OVERHEAD VALIDATION: Boot Step 3.1 runs every P0 session, not once (IA2-2.1)
#   - BOOTSTRAP RESPONSE SAFETY: Manual limits during MS0b before responseGuard wired (IA2-2.2)
#   - COMPACTION TELEMETRY: COMPACTION-RECOVERY entries in ROADMAP_TRACKER (IA2-3.1)
#   - BLOCKED PRIORITY: Autonomous continue resolves blocks first (IA2-4.1)
#   - SKILL SIZE AUDIT: Measure actual token cost during P0-MS1 (IA2-5.1)
#   - PARALLEL TASK LIMIT: Max 10 concurrent per parallel_batch (IA2-6.1)
#   - RESULT ACCESS TEST: MS8 Chain 5 verifies getResult() contract (IA2-6.2)
#   - NAMESPACE AUDIT: No tool name collisions across MCP servers (IA2-11.1)
#   - SESSION PLANNING: Boot Step 3.5 — plan before executing (IA2-8.1)
#   - TIER 2.5: Partial dispatcher failure degradation (IA2-7.1)
#   - PHASE GATE AUTOMATION: Automated vs human-review distinction (IA2-9.2)
#   - STATE FILE STABILITY: Backward-compatible format additions (IA2-12.1)
#   All v13.6 infrastructure audit hardening retained unchanged.
#
# v13.6 CHANGES (from v13.5 — Infrastructure Audit Hardening, 23 findings):
#   - SCHEMA TOKEN AUDIT: New Boot Step 3.1 — measure actual system overhead, budget rule (IA-2.1)
#   - GRACEFUL DEGRADATION: 5-tier hierarchy when subsystems are down (IA-7.1)
#   - POSITION VALIDATION: New Boot Step 2.1 — cross-reference position files (IA-9.1)
#   - CASCADING FAILURE: Chain failure propagation protocol (IA-7.3)
#   - ERROR CONTEXT: Block errors preserved in position files (IA-7.2)
#   - PARALLEL RESULT CONTRACT: JSON schema for agent results (IA-6.1)
#   - CLAUDE.AI RECOVERY: Full 3-layer cascade with Layer 2 specifics (IA-3.1)
#   - HOOK RESPONSE PROTOCOL: Per-hook output response actions (IA-5.1)
#   - ORCHESTRATOR FAILURE: Fallback to sequential execution (IA-6.2)
#   - RESPONSE CAPPING: Dispatcher-level size limits + responseGuard (IA-2.2)
#   - SUBAGENT BUDGET: 500B summary cap per parallel agent (IA-6.3)
#   - FILE DECONFLICTION: PRISM files via prism_ only, not Desktop Commander (IA-11.1)
#   - API VERSIONING: Additive-only dispatcher changes within P0→R6 (IA-11.2)
#   - NEW ACTION DOCS: Expected build break on EFFORT_MAP exhaustiveness (IA-11.3)
#   - COMPACTION PARALLEL: Re-run protocol for compaction during parallel execution (IA-3.2)
#   - SONNET DELEGATION: Design for model routing by effort tier, R4+ implementation (IA-8.1)
#   - AUTONOMOUS GOAL: Claude selects next goal when human says "continue" (IA-9.2)
#   All v13.5 gap analysis hardening retained unchanged.
#
# v13.5 CHANGES (from v13.4 — Gap Analysis & Pitfall Hardening, 42 findings):
#   - CROSS-FIELD PHYSICS VALIDATION: New post-schema validation for physically impossible calc results (SK-1)
#   - getEffort() FALLBACK: Changed from 'high' to 'max' + boot-time action audit (SK-2)
#   - REFERENCE VALUES: New referenceValues.ts for R2 tolerance validation with sourced data (SK-3)
#   - ALARM TOLERANCE: Exact match → structured-field match with description similarity (SK-4)
#   - MATERIAL SANITY CHECKS: Cross-parameter validation per material class (SK-5)
#   - S(x) DERIVATION: Documented safety score formula origin and physical meaning (SK-6)
#   - ADAPTIVE RATE LIMITING: p-queue responds to 429s with backoff (CB-4)
#   - PARALLEL TIMEOUT: Per-task timeout in swarm_execute batches (CB-1)
#   - CONTEXT EDITING SAFETY: No clearing during active parallel tasks (CB-2)
#   - HEALTH SCHEMA EXPANSION: Added registry_status for partial startup detection (AG-3)
#   - UNIT TEST MANDATE: Unit tests alongside integration tests from P0 (AG-4)
#   - CALC RESULT VERSIONING: meta block in structured output schema (AG-2)
#   - ORPHANED TMP CLEANUP: Added to boot protocol (DC-1)
#   - TRACKER ATOMIC WRITES: ROADMAP_TRACKER uses atomicWrite (DC-2)
#   - FORMULA LIMITATION CATEGORY: Fifth classification for R2 fix cycle (OB-1)
#   - CLAUDE DESKTOP RESTART: Process verification after restart (OB-3)
#   - FINDINGS SIZE CAP: Max 10 CRITICAL findings per phase in tiered loading (OB-4)
#   - WALL-CLOCK ESTIMATES: Split into compute time + human time, latency-aware (OB-6)
#   - PARALLEL EQUIVALENCE TOLERANCE: Tolerance-based comparison for R6 diff (CB-5)
#   - RALPH/OMEGA SANITY CHECK: Validate-the-validator step before phase gates (SD-5)
#   All v13.4 instruction completeness hardening retained unchanged.
#
# v13.4 CHANGES (from v13.3 — Instruction Completeness Hardening):
#   - BUILD FAILURE TRIAGE: New section in §Code Standards — classify, fix one, rebuild loop
#   - MCP SERVER RESTART: Added to Boot Protocol after every code-modifying build
#   - STRUCTURED OUTPUT INVOCATION: HOW-TO added to §Structured Outputs (server-level, not per-call)
#   - SUB-MS POSITION TRACKING: ACTION_TRACKER threshold lowered >12 → >8 calls + lightweight updates
#   - INTERMEDIATE VARIABLE PERSISTENCE: New pattern for task_ids, file paths, counts
#   - COMPACTION INSTRUCTIONS: Enhanced to preserve current step number within MS
#   - CRASH RECOVERY: New section for MCP server crash handling
#   - RALPH/OMEGA: What they evaluate, how to improve failing scores
#   - WALL-CLOCK TIMES: Approximate durations per MS tier
#   - SHARED STATE QUICK CHECK: Practical guide for parallel vs sequential decision
#   All v13.3 tool utilization hardening retained unchanged.
#
# v13.2 CHANGES (from v13.1 — Coding Best Practices Hardening):
#   - EFFORT_MAP: Record<string,string> → exhaustive typed Record<ActionName,EffortLevel> + getEffort() fallback
#   - STRUCTURED OUTPUTS: All cutting params required, exclusiveMinimum:0, physical upper bounds, additionalProperties:false
#   - HEALTH_SCHEMA: Added to structured outputs (prevents silent regression pass on undefined fields)
#   - COMPACTION INSTRUCTIONS: Hardcoded as const, NOT env-configurable (safety invariant)
#   - CODE STANDARDS: Major expansion with 5 required utilities (atomicWrite, env, apiTimeout, PrismError, tolerances.ts)
#   - CODE STANDARDS: Added error taxonomy (SafetyBlockError/DataError/NetworkError), schema migration path,
#     API rate limiting for batches, structured JSON logging from P0 onward, Vitest test framework convention
#   - BOOT PROTOCOL: .gitignore expanded (exclude transient state files, keep audit trail)
#   - BOOT PROTOCOL: Health check validates against HEALTH_SCHEMA (prevents undefined < 31 silent pass)
#   - PARALLEL EXECUTION: Added ordering rule (sort by stable key before flush for deterministic diffs)
#   - VERIFIED FLUSH: Added content verification step for MANDATORY flushes (read-back last 100 chars)
#   - TOLERANCE TABLE: Added note requiring src/schemas/tolerances.ts code file alongside protocol doc
#
# v13.1 CHANGES (from v13.0):
#   - RESTORED: Canonical Tolerance Table (R2_TOLERANCES) — math accuracy gate separate from S(x) safety gate
#   - RESTORED: Lightweight compaction detection + 3-layer recovery cascade for claude.ai fallback
#     (~60 lines vs 468 in v12.2 CMS — retains all recovery capability without avoidance/telemetry overhead)
#   - RESTORED: Verified Flush protocol detail (mandatory/optional classification)
#   - RESTORED: Session management guidance in PHASE_TEMPLATE.md
#   - All Opus 4.6 additions from v13.0 retained unchanged
#
# v13.0 CHANGES (from v12.2):
#   - Compaction Management System v2.0 (636 lines) → REMOVED. Replaced by Compaction API (~50 lines)
#   - Added: Opus 4.6 Configuration section (Adaptive Thinking, Structured Outputs, Agent Teams,
#            Fast Mode, Context Editing, Fine-grained Streaming, Data Residency, Prefilling removal)
#   - Added: Effort Tier Classification (per-action mapping to low/medium/high/max)
#   - Added: Structured Output Schemas for safety-critical calculations
#   - Added: Parallel Execution Patterns for Agent Teams
#   - Boot Protocol: Updated for Opus 4.6 config verification at Step 1.1
#   - Code Standards: Updated with Opus 4.6 API patterns (output_config, adaptive thinking)
#   - Flush-to-file patterns RETAINED for cross-session persistence (not for compaction management)
#   - Idempotency Classification RETAINED (needed regardless of compaction method)
#   - Micro-checkpoints RETAINED as disk-level state persistence (backup role)

---

<!-- ANCHOR: pc_boot_protocol_every_session_no_exceptions -->
