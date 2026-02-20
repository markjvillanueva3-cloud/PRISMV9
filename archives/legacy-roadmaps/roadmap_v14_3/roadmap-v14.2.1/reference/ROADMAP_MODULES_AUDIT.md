# ROADMAP MODULES AUDIT — v12.2 (Old) vs v13.0 (New)
# Auditor: Claude Opus 4.6 | Senior MCP Architecture & LLM Context Specialist
# Date: 2026-02-13
# Scope: Content preservation, gap analysis, risk assessment

---

## EXECUTIVE SUMMARY

Your concern is valid but more nuanced than "half got cut." The raw zip size dropped from 83KB → 45KB (46% reduction), but that's misleading because the old zip contains a nested zip + two standalone audit documents. When comparing **core-to-core** (the 12 matching operational files), the drop is 119.7KB → 100.5KB — a **16% reduction**, not 50%.

The size reduction comes from three distinct sources, and only one of them is a potential problem:

1. **Intentional architectural replacement** — CMS v2.0 (468 lines) replaced by Compaction API (~37 lines). This is the biggest single cut and is **deliberate**.
2. **Two audit documents removed entirely** — TOKEN_OPTIMIZATION_AUDIT_v12.md (378 lines) and COMPACTION_PROTOCOL_ASSESSMENT.md (657 lines). These are **reference/historical docs**, not operational.
3. **Substantive content dropped** — The Canonical Tolerance Table, detailed compaction detection fingerprints, 3-layer recovery cascade, and per-category calc structure from R2. **This is where the risk lives.**

**Bottom line: 80% of the reduction is intentional or archival. 20% represents real content loss that needs to be addressed before execution.**

---

## FILE-BY-FILE COMPARISON

### Files in Both Versions (12 files)

| File | Old (bytes) | New (bytes) | Delta | Verdict |
|------|-------------|-------------|-------|---------|
| PRISM_MASTER_INDEX.md | 10,932 | 14,719 | +34.6% | **GREW** — Opus 4.6 sections added |
| PRISM_PROTOCOLS_CORE.md | 35,299 | 17,284 | **-51.0%** | **MAJOR CUT** — CMS v2.0 removed |
| PRISM_PROTOCOLS_REFERENCE.md | 6,187 | 6,048 | -2.2% | Negligible trim |
| PHASE_P0_ACTIVATION.md | 21,505 | 19,849 | -7.7% | Minor streamlining |
| PHASE_R1_REGISTRY.md | 10,814 | 12,674 | +17.1% | **GREW** — more detail added |
| PHASE_R2_SAFETY.md | 10,902 | 10,026 | -8.0% | **RESTRUCTURED** — see below |
| PHASE_R3_CAMPAIGNS.md | 2,630 | 2,500 | -4.9% | Negligible |
| PHASE_R4_ENTERPRISE.md | 1,905 | 2,500 | +31.2% | **GREW** — stub expanded |
| PHASE_R5_VISUAL.md | 1,639 | 2,245 | +36.9% | **GREW** — stub expanded |
| PHASE_R6_PRODUCTION.md | 1,798 | 3,099 | +72.3% | **GREW** — stub expanded |
| PHASE_TEMPLATE.md | 7,817 | 4,447 | -43.1% | **SIGNIFICANT CUT** |
| DEPLOYMENT_GUIDE.md | 11,220 | 7,547 | -32.7% | **CUT** — history collapsed |

### Files Only in Old (2 files — entirely missing from new)

| File | Size | Lines | Status |
|------|------|-------|--------|
| COMPACTION_PROTOCOL_ASSESSMENT.md | 33,951 bytes | 657 lines | **DROPPED** |
| TOKEN_OPTIMIZATION_AUDIT_v12.md | 21,485 bytes | 378 lines | **DROPPED** |

---

## CRITICAL CONTENT GAPS (What Got Lost)

### GAP 1: Canonical Tolerance Table — **SEVERITY: HIGH**

The old R2 contained an explicit TypeScript constant defining tolerances for every calculation category:

```
speed_feed_vc:    0.15   (±15%)
speed_feed_fz:    0.15   (±15%)
cutting_force_fc: 0.20   (±20%)
tool_life:        0.25   (±25%)
thread_calcs:     0.05   (±5%)
alarm_decode:     0.00   (exact)
edge_case:        0.30   (±30%)
multi_op:         0.15   (±15%)
```

The new R2 has **zero references to tolerance values**. The word "tolerance" doesn't appear once. The new version references `S(x) >= 0.70` as the pass criterion but that's a safety score threshold, not a calculation accuracy tolerance. These are different things — S(x) tells you if a cut is safe, tolerances tell you if the *math* is correct.

**Risk:** Without tolerance bounds, R2 test matrix has no way to determine PASS/FAIL for individual calculations. A speed_feed result could be 40% off and still get S(x) >= 0.70 if other parameters compensate. The tolerance table IS the ground truth for mathematical validation.

**Fix needed:** Restore the tolerance table into R2 or into PROTOCOLS_REFERENCE.

---

### GAP 2: Compaction Detection Fingerprints — **SEVERITY: MEDIUM-HIGH**

The old CMS v2.0 Part 2 defined 3 positive detection questions plus false positive protection. The new version has no detection protocol at all — it assumes the Compaction API handles everything. But the FALLBACK section (for claude.ai sessions) gives only:

> "Flush at >60%, end session at >75%"

This is avoidance only. **There is no detection or recovery protocol for claude.ai sessions.** If compaction happens in a claude.ai session (where you can't control the API config), the old system had a 3-layer cascade that cost 6-12 calls to recover. The new system has... nothing.

**Risk:** PRISM is primarily used in claude.ai. The API-based Compaction API requires server-side configuration. Until PRISM's MCP server is deployed with the Compaction API wired in, every session runs under the FALLBACK — and the FALLBACK has no recovery protocol.

**Fix needed:** Either restore a lightweight detection+recovery protocol (doesn't need all 468 lines — maybe 60-80 lines would do), or explicitly document that the old CMS v2.0 should be loaded as a standalone reference file when running in claude.ai mode.

---

### GAP 3: 3-Layer Recovery Cascade — **SEVERITY: MEDIUM**

The old system defined Layer 1 (Standard, 85% of cases, ~6-9KB), Layer 2 (Deep, 10%, ~10-14KB), and Layer 3 (Emergency, 5%, always works). Each had explicit step-by-step instructions including what files to read, what to compare, and when to escalate.

The new system's fallback is 3 bullet points. No escalation. No file-reading sequence. No call budget.

**Risk:** When compaction does happen (and it will — especially in 30+ call sessions like P0-MS8 and R2-MS0), operators have no recovery playbook. They'll improvise, which in the old system's own words costs "15-45 re-execution calls" instead of "1-3 surgical calls."

**Fix needed:** Restore a condensed recovery cascade (Layer 1 at minimum) into the FALLBACK section or as a loadable reference doc.

---

### GAP 4: Per-Category Calc Structure in R2 — **SEVERITY: MEDIUM**

The old R2 organized calculations into 8 categories across 3 milestones (MS0: Categories 1-3 = 22 calcs, MS1: Categories 4-6 = 16 calcs, MS2: Categories 7-8 = 12 calcs). Each category had specific material groupings with micro-checkpoint patterns.

The new R2 restructured to 10 materials × 5 operations = 50 calcs in a flat matrix (MS0), plus manual edge cases (MS1), AI-generated edge cases (MS1.5), fix cycle (MS2), build gate (MS3), and optional uncertainty quantification (MS4).

**This isn't necessarily a loss** — the new structure is arguably better for parallel execution. But the old system's per-material grouping details (which materials to group, which calc to run per group, which results to flush when) are gone. The new MS0 says "10 Material Categories" and "Parallel Material Groups" but doesn't specify the checkpoint/flush granularity that the old system did.

**Risk:** Medium. The operator will figure it out, but the old version's explicit "flush after each material group, micro-checkpoint per group" was battle-tested guidance.

**Fix needed:** Add flush/checkpoint granularity guidance to the new R2-MS0.

---

### GAP 5: Phase Template Compaction Patterns — **SEVERITY: LOW**

The old template (198 lines) included per-MS compaction risk classification (LOW/MEDIUM/HIGH), pressure gating strategy blocks, micro-checkpoint specifications, and flush verification flags. The new template (124 lines) replaced these with Opus 4.6 patterns (effort tiers, parallel execution, structured outputs).

The new patterns are **better for the future** but the compaction management patterns are still needed for claude.ai sessions today.

**Fix needed:** Consider adding a single "Session Management" block to the template for MEDIUM/HIGH risk milestones.

---

### GAP 6: Deployment Guide History — **SEVERITY: LOW**

The old guide had full v12.0→v12.1 and v12.1→v12.2 migration details. The new guide collapsed these into a brief "VERSION HISTORY" section and focuses on v12.2→v13.0. The historical context is useful for understanding *why* decisions were made.

**Fix needed:** Not critical. The audit docs (if preserved separately) cover this.

---

## WHAT THE NEW VERSION DOES BETTER

Credit where due — the v13.0 revision isn't just a cut, it's a genuine architectural upgrade in several areas:

1. **Opus 4.6 Configuration section** — Structured outputs, effort tiers, adaptive thinking, parallel execution patterns. This is forward-looking and correctly positioned.

2. **R2 AI Edge Case Generation (MS1.5)** — Entirely new milestone leveraging Opus 4.6's ARC-AGI-2 capability. Smart addition.

3. **R4, R5, R6 stub expansion** — All three grew 30-72%. These were anemic stubs before and now have real structure.

4. **R1 expansion (+17%)** — More registry detail, better validation patterns.

5. **MASTER_INDEX growth (+35%)** — Comprehensive Opus 4.6 integration map.

6. **Template modernization** — Effort tiers and parallelism maps are the right framework for Opus 4.6.

---

## WHAT TO DO ABOUT THE TWO DROPPED AUDIT FILES

**TOKEN_OPTIMIZATION_AUDIT_v12.md** (378 lines) and **COMPACTION_PROTOCOL_ASSESSMENT.md** (657 lines) are analytical documents, not operational ones. They were assessments of the v12.x system. Their recommendations have been partially incorporated into v13.0.

**Recommendation:** Keep them in a `/reference/` or `/audits/` folder alongside the modular roadmap. Don't load them per-session (that defeats the token optimization), but preserve them as the *reasoning trail* behind the v13.0 decisions. If anyone asks "why did v13.0 remove CMS v2.0?", the Compaction Protocol Assessment is the answer.

---

## RECOMMENDED ACTION PLAN

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| **P0** | Restore Canonical Tolerance Table to R2 or PROTOCOLS_REFERENCE | 15 min | Prevents R2 test matrix from shipping without pass/fail criteria |
| **P1** | Add lightweight compaction detection + recovery to FALLBACK section | 30 min | Prevents dead sessions in claude.ai mode |
| **P2** | Add flush/checkpoint granularity to new R2-MS0 | 15 min | Preserves battle-tested session management |
| **P3** | Archive audit docs in /reference/ folder | 5 min | Preserves reasoning trail |
| **P4** | Add session management block to PHASE_TEMPLATE | 10 min | Future-proofs template for claude.ai usage |

**Total estimated effort: ~75 minutes to close all gaps.**

---

## FINAL VERDICT

The v13.0 revision is **not a careless trim** — it's a deliberate architectural migration from manual compaction management to API-based compaction management, with genuine improvements in Opus 4.6 integration, parallel execution patterns, and stub expansion. The overall direction is correct.

However, it **does have real content gaps** that matter for operational safety. The biggest one — the missing Tolerance Table — is a hard block for R2 execution. The second biggest — no detection/recovery for claude.ai sessions — will cause real pain in the near term since that's where PRISM actually runs today.

The good news: the fixes are additive (restore ~80-100 lines of critical content) rather than requiring any rollback. The v13.0 architecture is sound. It just needs its safety nets reconnected.
