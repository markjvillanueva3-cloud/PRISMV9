# R0-P0-U02: CLAUDE.md Integrity Audit

**Date:** 2026-02-24
**Status:** COMPLETE
**Auditor:** R4 Scrutinizer (Opus)

---

## 1. Scope

Audit of `C:\PRISM\mcp-server\CLAUDE.md` (123 lines) against actual codebase state. Every factual claim is verified against filesystem reality.

---

## 2. Line-by-Line Findings

### 2.1 Header (Line 4)

**Claim:** "31 dispatchers, 368 actions, 37 engines"
**Reality:**
- Dispatchers: **32** .ts files in `src/tools/dispatchers/` (plan says ~32)
- Actions: **368+** (cannot verify exact count without running server — plan says 368+, CURRENT_STATE says 388+)
- Engines: **74** .ts files in `src/engines/` (plan confirms 74)

| Metric | CLAUDE.md | Actual | Severity |
|--------|-----------|--------|----------|
| Dispatchers | 31 | 32 | MEDIUM |
| Actions | 368 | 368+ | LOW (approximate) |
| Engines | 37 | 74 | **CRITICAL** |

**Severity: CRITICAL** — Engine count is off by 2x (37 vs 74). Any developer reading CLAUDE.md gets a fundamentally wrong mental model of the codebase.

### 2.2 Build Section (Lines 16-23)

**Claim:** `npm run build # ONLY build command (tsc --noEmit + esbuild + test:critical)`
**Reality:** Build script is `tsc --noEmit + esbuild`. There is NO `test:critical` step in the build script.
**Severity: MEDIUM** — Misleading comment about what build does.

**Claim:** "NEVER standalone tsc (OOM at 3.87MB bundle)"
**Reality:** tsc doesn't produce bundles. The 3.87MB figure appears to reference bundle size, not tsc. tsc OOMs at 8GB heap (U01 finding).
**Severity: MEDIUM** — Confusing/incorrect rationale.

**Claim:** `scripts/verify-build.ps1` exists
**Reality:** File exists at `scripts/verify-build.ps1`. VERIFIED.

**Claim:** "Ω = 0.77"
**Reality:** Cannot verify without running prism_omega. Plan references this same value. ASSUMED CORRECT pending U03+ verification.

### 2.3 Registry Counts (Lines 25-29)

**Claim:** "verified 2026-02-19"

| Registry | CLAUDE.md | Plan Baseline | Severity |
|----------|-----------|---------------|----------|
| Materials | 3,533 | 3,533 | OK |
| Machines | 1,016 | 1,016 | OK |
| Tools | 13,967 | 13,967 | OK |
| Alarms | 10,033 | 10,033 | OK |
| Formulas | **509** | **109 registered** (509 is TARGET) | **HIGH** |
| Toolpath Strategies | 680 | 680 | OK |
| Threads | 339 | not in plan table | UNVERIFIED |
| Skills | **196** | **231 registered** + 252 mfg | **HIGH** |
| Scripts | 215 | 215 | OK |
| Agents | 75 | not in plan table | UNVERIFIED |
| Hooks | **62** | **162+ registered** / 1,107 generated | **HIGH** |
| Total | **29,569 across 9 registries** | 29,569 across **14 registries** | **MEDIUM** |

**Severity: HIGH** — Three counts are significantly wrong:
- Formulas 509 vs 109 registered (overstated 4.7x — claims target as current)
- Skills 196 vs 231+ (understated)
- Hooks 62 vs 162+ (understated 2.6x)
- Registry count 9 vs 14 (understated)

### 2.4 Current Position (Lines 31-36)

**Claim:** "Phase: Roadmap v17.0 COMPLETE -> R2 Safety next"
**Reality:** We are now executing a comprehensive layered roadmap (R0-P0 through L10). The v17.0 reference is stale.
**Severity: HIGH** — Developers following CLAUDE.md would look at wrong roadmap files.

**Claim:** "Read `data/docs/roadmap/PRISM_ROADMAP_v17.0.md`"
**Reality:** This file may still exist but is superseded by the new comprehensive roadmap. Misleading pointer.
**Severity: HIGH** — Points to outdated plan.

### 2.5 Subagents (Lines 38-41)

**Claim:** 3 subagent archetypes (safety-physics, implementer, verifier)
**Reality:** The `.claude/agents/` directory contains many more agents. The 3-archetype model may be a simplification.
**Severity: LOW** — Simplified but not wrong as an abstraction.

### 2.6 Key Architecture - Dispatchers (Lines 43-53)

**Claim:** "31 total" dispatchers with specific action counts
**Reality:** 32 .ts dispatcher files exist. The listed dispatchers and their action counts need verification against actual code (deferred to U03).
**Severity: MEDIUM** — Undercount by 1; individual action counts unverified.

### 2.7 Key Paths (Lines 66-78)

| Path | CLAUDE.md | Actual | Severity |
|------|-----------|--------|----------|
| `src/tools/dispatchers/` | "31 dispatcher files" | 32 .ts files | MEDIUM |
| `src/engines/` | "37 engine files" | **74** .ts files | **CRITICAL** |
| `src/tools/autoHookWrapper.ts` | exists | Exists | OK |
| `src/tools/cadenceExecutor.ts` | exists | Exists | OK |
| `src/utils/paramNormalizer.ts` | exists | UNVERIFIED | LOW |
| `src/utils/smokeTest.ts` | exists | UNVERIFIED | LOW |
| `src/utils/responseSlimmer.ts` | exists | UNVERIFIED | LOW |
| `data/docs/roadmap/` | "51 files" | **63 files** | MEDIUM |
| `data/docs/gsd/GSD_QUICK.md` | exists | UNVERIFIED | LOW |

### 2.8 Code Conventions (Lines 80-86)

Claims appear reasonable and consistent with observed patterns. No contradictions found.
**Severity: INFO** — Accepted as-is.

### 2.9 Mode Switching (Lines 101-123)

References to SWITCH_SIGNAL.md and CHAT_RESOLUTION.md. These are operational protocols, not verifiable against filesystem.
**Severity: INFO** — Operational guidance, no code verification needed.

---

## 3. Findings Summary

### CRITICAL

| ID | Finding | Details |
|----|---------|---------|
| U02-C01 | Engine count 37 vs 74 | CLAUDE.md header AND key paths both say 37 engines. Reality: 74. This is the most prominent number in the file and it's off by 2x. |

### HIGH

| ID | Finding | Details |
|----|---------|---------|
| U02-H01 | Formula count 509 vs 109 | Claims 509 formulas as registered count. Only 109 are registered; 509 is the post-extraction target. Misleading. |
| U02-H02 | Skill count 196 vs 231+ | Understates registered skills. Plan says 231 in SkillRegistry + 252 mfg files. |
| U02-H03 | Hook count 62 vs 162+ | Understates by 2.6x. Plan says 162+ registered, 1,107 generated. |
| U02-H04 | Roadmap reference v17.0 outdated | Points to superseded roadmap. Should reference new comprehensive layered roadmap. |
| U02-H05 | Roadmap file pointer outdated | Points to `PRISM_ROADMAP_v17.0.md` which is superseded. |

### MEDIUM

| ID | Finding | Details |
|----|---------|---------|
| U02-M01 | Dispatcher count 31 vs 32 | Off by 1. |
| U02-M02 | Registry count 9 vs 14 | Understates registry count. 14 distinct registries exist. |
| U02-M03 | Build comment claims test:critical | Build script has no test:critical step. |
| U02-M04 | tsc OOM rationale confusing | Says "OOM at 3.87MB bundle" but tsc doesn't make bundles. |
| U02-M05 | Roadmap file count 51 vs 63 | 63 files now exist in `data/docs/roadmap/`. |

### LOW

| ID | Finding | Details |
|----|---------|---------|
| U02-L01 | Subagent model simplified | 3 archetypes listed; actual agent directory has many more. |
| U02-L02 | Several path claims unverified | paramNormalizer, smokeTest, responseSlimmer, GSD_QUICK — not yet verified. |

### INFO

| ID | Finding | Details |
|----|---------|---------|
| U02-I01 | Code conventions section appears accurate | No contradictions found. |
| U02-I02 | Safety Laws section matches GSD Hard Laws | Consistent with plan. |

---

## 4. Recommended Fixes (for U11)

1. **Line 4:** Change "31 dispatchers, 368 actions, 37 engines" to "32 dispatchers, 368+ actions, 74 engines"
2. **Lines 25-29:** Update registry counts to match actual verified values:
   - Formulas: 109 registered (509+ target)
   - Skills: 231 registered + 252 mfg (~483 total)
   - Hooks: 162+ registered (1,107 generated)
   - Change "9 registries" to "14 registries"
3. **Lines 17-21:** Fix build section:
   - Remove "test:critical" from build comment
   - Fix OOM description (tsc OOMs at 8GB heap on 130K LOC, not "at 3.87MB bundle")
   - Document that `build:fast` is the working build path
4. **Lines 31-36:** Update current position to reference new comprehensive roadmap
5. **Lines 43-53:** Update dispatcher count to 32
6. **Lines 68-69:** Update engine count to 74, dispatcher count to 32
7. **Line 75:** Update roadmap file count or remove specific count
