# MONOLITH v11.6 vs MODULAR v13.1 — COMPREHENSIVE COMPARISON
# Auditor: Claude Opus 4.6 | Date: 2026-02-13
# Scope: Every substantive section in the monolith checked against modular counterpart

---

## EXECUTIVE SUMMARY

The monolith is 3,261 lines (~180KB). The modular set is 12 files totaling ~2,500 lines (~111KB).
The modular set intentionally condenses verbose content and defers R3-R6 detail to brainstorm-time
expansion, so raw size difference is expected and correct.

After section-by-section comparison, I found **4 substantive content gaps** where the monolith
has useful content the modular set doesn't cover. None are catastrophic — they're all
enrichment content that improves execution quality. The modular set also has significant
NEW content the monolith lacks (Opus 4.6 patterns, AI edge cases, structured outputs, etc.).

**VERDICT: The modular v13.1 covers all critical operational content. Four areas of
enrichment content from the monolith should be restored for completeness.**

---

## SECTION-BY-SECTION TRACKING

### ✅ FULLY COVERED (monolith content present in modular set)

| Monolith Section | Modular Location | Notes |
|-----------------|------------------|-------|
| What Is PRISM | MASTER_INDEX §What Is PRISM | Equivalent |
| What Already Exists (component table) | MASTER_INDEX §What Is PRISM + P0 doc | Condensed but complete |
| Registry Duplication (ROOT CAUSE) | MASTER_INDEX §ROOT PROBLEM + P0-MS3 | Covered |
| Phase Overview table | MASTER_INDEX §Phase Registry | Updated with Opus 4.6 session estimates |
| Boot Protocol (Steps -1 through 5) | PROTOCOLS_CORE §Boot Protocol | Expanded with Opus 4.6 gate |
| Compaction Continuation Protocol | PROTOCOLS_CORE §Compaction API + §FALLBACK | v13.1 restored 3-layer recovery |
| Quality Tiers | PROTOCOLS_REFERENCE §Quality Tiers | Updated with effort tiers |
| Sequencing Guides (S3.5-S3.26) | PROTOCOLS_REFERENCE §Sequencing Guides | Top 5 chains with effort tiers |
| 8 Laws | PROTOCOLS_CORE §8 Laws | Identical |
| Code Standards (all 10 patterns) | PROTOCOLS_CORE §Code Standards | Updated with Opus 4.6 API patterns |
| Standard Rollback | PROTOCOLS_REFERENCE §Standard Rollback | Updated with Compaction API note |
| Phase P0 (all 9 MS) | PHASE_P0_ACTIVATION.md | Restructured for Opus 4.6, parallel MS8 |
| Phase R1 (all 7 MS) | PHASE_R1_REGISTRY.md | Restructured, added MS1.5 formula validation |
| Phase R2 (all 4 MS) | PHASE_R2_SAFETY.md | Expanded: MS1.5 AI edge cases, MS4 uncertainty |
| R2 Canonical Tolerance Table | PROTOCOLS_CORE §Canonical Tolerance Table | v13.1 restored |
| Phase Findings format/rules | MASTER_INDEX §Phase Findings Tiered Loading | Enhanced with tiered loading |
| System Activation Report template | P0-MS8 in PHASE_P0_ACTIVATION.md | Condensed reference |
| Wiring Chains (14) | PROTOCOLS_REFERENCE §Wiring Chains | Reorganized for parallel execution |
| Critical Path | MASTER_INDEX §Critical Path | Equivalent |
| What Success Looks Like | Implicitly in each phase's Exit criteria | Distributed, not centralized |
| P0 Parallelism Map | P0 doc §Parallelism Map | Expanded |
| R1 Parallelism Map | R1 doc (implicit in MS dependencies) | Less explicit — see gaps |
| Idempotency Contract | PROTOCOLS_CORE §Idempotency Classification | Equivalent |
| Flush/checkpoint patterns | PROTOCOLS_CORE §Flush-to-file + R2-MS0 | v13.1 restored detail |
| R3-R6 MS Generation Protocol | PHASE_TEMPLATE.md + MASTER_INDEX §Phase Findings | Restructured |
| R3 stub + mandatory requirements | PHASE_R3_CAMPAIGNS.md | Condensed — see gaps |
| R4 stub + mandatory requirements | PHASE_R4_ENTERPRISE.md | Condensed — see gaps |
| R5 stub + mandatory requirements | PHASE_R5_VISUAL.md | Condensed — see gaps |
| R6 stub + mandatory requirements | PHASE_R6_PRODUCTION.md | Condensed — see gaps |
| Context budget model | MASTER_INDEX §Context Budget Model | Updated for Compaction API |
| Document manifest | MASTER_INDEX §Document Manifest | Comprehensive |
| Version control | MASTER_INDEX §Version Control | Comprehensive |

---

### ⚠️ GAP 1: Role Protocol Detail — SEVERITY: MEDIUM

**Monolith has** (lines 320-448): 129 lines of detailed role definitions per phase, including:
- MINDSET (1-2 sentences per role)
- PRIORITIES (ranked list)
- WATCH FOR (specific anti-patterns to catch per phase)
- VOCABULARY (domain terms)
- ANTI-PATTERNS TO CATCH (concrete examples)
- MASTER_INDEX FOCUS (which sections matter per phase)
- RECOMMENDED SKILLS (specific skill_load commands)
- COGNITIVE HOOKS (which auto-diagnosis hooks to enable)

**Modular has** (PROTOCOLS_REFERENCE §Role Protocol, lines 33-46): 14 lines with one-liner
role assignments per phase. No WATCH FOR, no ANTI-PATTERNS, no RECOMMENDED SKILLS, no
COGNITIVE HOOKS.

**Impact:** The detailed role protocol is one of the most valuable operational enrichments
in the monolith. It changes HOW Claude thinks during each phase — not just what to do, but
what class of bugs to look for. The condensed version loses this "cognitive tuning."

**Recommendation:** This is too large to restore inline (129 lines would bloat PROTOCOLS_REFERENCE).
Instead, create a dedicated ROLE_PROTOCOL_DETAIL.md (~130 lines, loaded on-demand at session boot)
or add condensed WATCH FOR + RECOMMENDED SKILLS per role to the existing §Role Protocol.
A middle path: add 2-3 key lines per role (WATCH FOR + SKILLS) which would be ~50 lines total.

---

### ⚠️ GAP 2: Manus Law ↔ Roadmap Law Alignment — SEVERITY: LOW-MEDIUM

**Monolith has** (lines 688-716): 29 lines mapping the 6 Manus Laws to the 8 Roadmap Laws,
with WHEN TO INVOKE guidance (session start, before each step, after each fix, before commit,
session end).

**Modular has:** No equivalent. Manus Laws are not referenced in any modular document.

**Impact:** The Manus Laws provide meta-cognitive guardrails for PLANNING (before executing steps).
They're complementary to the Roadmap Laws which are EXECUTION constraints. Without the mapping,
the Manus Law system exists in PRISM's MCP server but isn't connected to the roadmap workflow.

**Recommendation:** Add a condensed ~15-line "Manus Law Integration" section to PROTOCOLS_CORE
or PROTOCOLS_REFERENCE. The full mapping is overkill for per-session loading, but the WHEN TO
INVOKE timing guide is genuinely useful.

---

### ⚠️ GAP 3: R3-R6 Mandatory Requirements Lists — SEVERITY: MEDIUM

**Monolith has:**
- R3: 10 mandatory requirements (error budget, quarantine, human review gate, PFP calibration,
  MAINTENANCE_MODE, schema versioning, threshold monitoring, swarm pattern docs, ATCS tracking,
  CAMPAIGN_STATE.json)
- R4: 9 mandatory requirements (WAL + MAINTENANCE_MODE, graceful shutdown, structured logging,
  version pinning, atomic writes, AbortController, zod/joi validation, rate limiting, health checks)
  Plus detailed MS-level descriptions: WAL implementation, structured logging with pino, cost
  intelligence, threshold monitoring, REST API, and specific code examples (graceful shutdown handler)
- R5: 8 mandatory requirements (version pinning, color-blind accessibility, bundle budget,
  loading states, error states, verified data, semantic HTML, code-split)
- R6: 9 mandatory requirements (strictNullChecks, memory profiling, max-old-space-size,
  runbooks, load testing, chains under load, health endpoint, log rotation, backup/restore)
  Plus Omega stepping stones trajectory (0.70→0.72→0.75→0.80→0.83→0.85)

**Modular has:** R3-R6 stubs with 3-5 high-level objectives each, plus Opus 4.6 patterns.
No mandatory requirements lists. The PHASE_TEMPLATE.md has a brainstorm quality checklist
but it's generic (not phase-specific).

**Impact:** The mandatory requirements are the SPEC that constrains brainstorm-time expansion.
Without them, the brainstorm-to-ship process for R3-R6 could generate MS detail that misses
critical requirements (e.g., R3 without CAMPAIGN_STATE.json, R4 without graceful shutdown,
R5 without color-blind accessibility, R6 without strictNullChecks).

**Recommendation:** Add a MANDATORY REQUIREMENTS block to each R3-R6 stub. This is the
highest-value restoration. Each block is 10-15 lines. Total: ~50 lines across 4 files.
These requirements are the guardrails that make brainstorm-to-ship produce correct output.

---

### ⚠️ GAP 4: Tool Utilization Quick Reference — SEVERITY: LOW

**Monolith has** (lines 3164-3256): 93 lines mapping every tool category (dispatchers, skills,
scripts, hooks, cognitive hooks, agents, swarms, ATCS, cadence, Manus Laws, sequencing guides,
response slimmer, Phase Findings, Roadmap Tracker, Action Tracker) to WHEN and WHERE to use them.

**Modular has:** Tool usage is implicit in MS step definitions and Opus 4.6 patterns.
No centralized quick reference.

**Impact:** Low for experienced operators. Medium for new sessions where context about
tool selection could prevent wrong-tool-for-the-job errors. The monolith's tool reference
is comprehensive but verbose.

**Recommendation:** Not critical to restore. The information is implicitly available in the
phase docs and protocols. If desired, a condensed ~30-line version could go in
PROTOCOLS_REFERENCE as a new §Tool Selection Guide.

---

### ⚠️ MINOR GAP: "What Success Looks Like" — SEVERITY: LOW

**Monolith has** (lines 3135-3157): Centralized per-phase success criteria.
**Modular has:** Distributed in each phase's Exit criteria and gate requirements.

Not really a gap — the information exists but is distributed rather than centralized.
No action needed.

---

### ⚠️ MINOR GAP: R1 Parallelism Map — SEVERITY: LOW

**Monolith has** (lines 3125-3131): Explicit R1 dependency graph (MS0→MS1, MS0→MS1.5,
MS1+MS1.5→MS2, MS2→MS3→MS4→MS5→MS5.5).
**Modular has:** R1 MS dependencies are implicit in Entry conditions but no explicit
parallelism map section like P0 has.

Minimal impact — R1 is mostly sequential anyway.

---

### ⚠️ MINOR GAP: Changelog History (v11.2-v11.6) — SEVERITY: NONE

**Monolith has** (lines 8-261): 254 lines of changelogs from v11.2 through v11.6.
**Modular has:** Deployment Guide has version history + v13.0/v13.1 migration details.

This is historical context. Not operational. No action needed.

---

## CONTENT THE MODULAR SET HAS THAT THE MONOLITH DOESN'T

The modular v13.1 is not just a restructuring — it adds significant new capability:

| New Content | Location | Value |
|-------------|----------|-------|
| Opus 4.6 Configuration | PROTOCOLS_CORE §Opus 4.6 | Adaptive thinking, effort tiers, structured outputs |
| Compaction API | PROTOCOLS_CORE §Compaction API | Server-side context management |
| Agent Teams / Parallel Execution | PROTOCOLS_CORE §Parallel Execution | 55% P0-MS8 call reduction |
| AI-Generated Edge Cases (R2-MS1.5) | PHASE_R2_SAFETY | Novel problem-solving for test coverage |
| Structured Output Schemas | PROTOCOLS_CORE §Structured Outputs | Schema-guaranteed calc returns |
| Effort Tier Classification | PROTOCOLS_CORE §Effort Tiers | Per-action reasoning depth |
| Fast Mode routing | PROTOCOLS_CORE §Fast Mode | 2.5x faster for diagnostics |
| 1M Context Beta | MASTER_INDEX §Context Budget | Eliminates session splitting |
| Context Editing | PROTOCOLS_CORE §Context Editing | Tool result clearing |
| Data Residency | PROTOCOLS_CORE §Data Residency | Enterprise geo compliance |
| R2-MS4 Uncertainty Quantification | PHASE_R2_SAFETY | Sensitivity analysis |
| Canonical Tolerance Table (restored) | PROTOCOLS_CORE §Tolerance Table | Math accuracy gate |
| Dual-gate validation (S(x) + tolerance) | PHASE_R2_SAFETY | Two independent quality checks |
| Claude.ai recovery cascade (restored) | PROTOCOLS_CORE §FALLBACK | 3-layer lightweight recovery |
| Session management in template | PHASE_TEMPLATE §5 | Risk-classified flush/checkpoint |
| Phase Findings tiered loading | MASTER_INDEX §Phase Findings | Context-efficient knowledge transfer |

---

## RECOMMENDED FIXES (priority ordered)

### FIX 1 — R3-R6 Mandatory Requirements (PRIORITY: HIGH)

Restore the mandatory requirements lists from the monolith into each R3-R6 stub.
These are the constraints that make brainstorm-to-ship produce correct output.

Estimated effort: ~20 minutes, ~50 lines total across 4 files.

### FIX 2 — Role Protocol Enrichment (PRIORITY: MEDIUM)

Add WATCH FOR + RECOMMENDED SKILLS + COGNITIVE HOOKS to each role in §Role Protocol.
Condensed from 129 lines to ~50 lines (3-4 lines per role × 7 roles).

Estimated effort: ~15 minutes, ~50 lines in PROTOCOLS_REFERENCE.

### FIX 3 — Manus Law Integration (PRIORITY: LOW-MEDIUM)

Add condensed Manus Law ↔ Roadmap Law mapping and WHEN TO INVOKE timing.
~15 lines in PROTOCOLS_CORE or PROTOCOLS_REFERENCE.

Estimated effort: ~10 minutes.

### FIX 4 — Tool Utilization Reference (PRIORITY: LOW)

Optional. Add condensed tool selection guide to PROTOCOLS_REFERENCE.
~30 lines.

Estimated effort: ~10 minutes.

**Total effort for all 4 fixes: ~55 minutes, ~145 lines added.**

---

## FINAL ASSESSMENT

The modular v13.1 roadmap successfully captures all critical operational content from the
monolith while adding substantial new Opus 4.6 capability. The four gaps identified are
all "enrichment" content — they improve execution quality but don't block execution.

The highest-priority gap is the R3-R6 mandatory requirements. These are the SPEC that
prevents brainstorm-to-ship from generating incomplete phase detail. Without them, R3 could
ship without CAMPAIGN_STATE.json, R4 without graceful shutdown, R5 without accessibility,
R6 without strictNullChecks.

The second priority is role protocol enrichment. The detailed WATCH FOR and ANTI-PATTERNS
lists fundamentally change how Claude approaches each phase. They're the difference between
"fix bugs" and "find the class of bugs this phase is most likely to introduce."

After these 4 fixes, the modular set will be a strict superset of the monolith's operational
content, plus all the Opus 4.6 enhancements.
