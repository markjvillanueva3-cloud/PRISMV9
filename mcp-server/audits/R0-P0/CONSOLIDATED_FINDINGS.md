# R0-P0: Consolidated Findings + Fix Plan

**Date:** 2026-02-24
**Phase:** R0-P0 Infrastructure Audit (Units 01-09)
**Status:** CONSOLIDATED

---

## 1. ALL FINDINGS BY SEVERITY

### CRITICAL (5)

| ID | Unit | Finding | Impact |
|----|------|---------|--------|
| U01-C01 | U01 | `npm run build` OOMs at 8GB heap (tsc) | No type-checking in build pipeline |
| U02-C01 | U02 | CLAUDE.md engine count 37 vs 74 actual | Developers get wrong mental model (2x error) |
| U05-C01 | U05 | prism_intelligence (238 actions) missing from GSD | 44% of all actions invisible in developer guide |
| U07-C01 | U07 | prism_intelligence absent from MASTER_INDEX | Largest dispatcher completely unindexed |
| U07-C02 | U07 | MASTER_INDEX engine section lists 37 vs 74 | 40 engines missing from index |

### HIGH (14)

| ID | Unit | Finding |
|----|------|---------|
| U01-H01 | U01 | CURRENT_STATE.json at repo root, not mcp-server (location ambiguity) |
| U01-H02 | U01 | Build script needs 16GB+ heap for tsc |
| U02-H01 | U02 | Formula count 509 vs 109 registered in CLAUDE.md |
| U02-H02 | U02 | Skill count 196 vs 231+ in CLAUDE.md |
| U02-H03 | U02 | Hook count 62 vs 162+ in CLAUDE.md |
| U02-H04 | U02 | Roadmap reference v17.0 outdated in CLAUDE.md |
| U02-H05 | U02 | Roadmap file pointer outdated in CLAUDE.md |
| U03-H01 | U03 | Action count is 541, not 368+ (all sources wrong) |
| U03-H02 | U03 | guardDispatcher registers as prism_ralph_loop, not prism_guard |
| U04-H01 | U04 | SkillRegistry has 61 entries, not 196/231 |
| U04-H02 | U04 | No mfg- skill files exist (252 claimed) |
| U04-H03 | U04 | ScriptRegistry has 48 entries, not 215 |
| U04-H04 | U04 | Hook count inconsistency (59/112/162+/1,107) |
| U05-H01 | U05 | GSD action counts stale throughout |
| U05-H02 | U05 | prism_guard name mismatch (actual: prism_ralph_loop) |
| U06-H01 | U06 | contextDispatcher has 18 actions, not 22 |
| U07-H01 | U07 | CURRENT_STATE.json skill count 231 vs 61 actual |
| U07-H02 | U07 | Multiple sources have different action counts |
| U07-H03 | U07 | CURRENT_STATE.json hook count 27 vs 59-112 |
| U09-H01 | U09 | AlgorithmRegistry has 17 entries, not 52+ |

### MEDIUM (13)

| ID | Unit | Finding |
|----|------|---------|
| U01-M01 | U01 | No type-checking in CI-compatible build path |
| U02-M01 | U02 | Dispatcher count 31 vs 32 in CLAUDE.md |
| U02-M02 | U02 | Registry count 9 vs 14 in CLAUDE.md |
| U02-M03 | U02 | Build comment claims test:critical (doesn't exist) |
| U02-M04 | U02 | tsc OOM rationale confusing in CLAUDE.md |
| U02-M05 | U02 | Roadmap file count 51 vs 63 in CLAUDE.md |
| U03-M01 | U03 | intelligenceDispatcher mega-dispatcher (238 actions) |
| U04-M01 | U04 | Claude Code skills vs PRISM skills conflation |
| U04-M02 | U04 | Script function count likely ~200-250, not 1,038 |
| U04-M03 | U04 | Plan's 1,107 hooks is computed, not coded |
| U05-M01 | U05 | GSD changelog drift |
| U06-M01 | U06 | No hard token response cap |
| U06-M02 | U06 | No unit tests for memory graph |
| U07-M01 | U07 | Split state directory undocumented |
| U07-M02 | U07 | Contradictory build sizes in MASTER_INDEX |
| U07-M03 | U07 | Duplicate registry files (PascalCase + kebab-case) |
| U07-M04 | U07 | CURRENT_STATE.json dispatchers=33 vs 32 |
| U08-M01 | U08 | Session action count 31 vs 30 in MASTER_INDEX |
| U08-M02 | U08 | Cadence count 40 verified (rare accurate count) |
| U09-M01 | U09 | synergyIntegration.ts has 2 tsc errors |

### LOW (5)

| ID | Unit | Finding |
|----|------|---------|
| U01-L01 | U01 | CommonJS exports warning in esbuild |
| U02-L01 | U02 | Subagent model simplified |
| U02-L02 | U02 | Several path claims unverified |
| U04-L01 | U04 | CLAUDE.md hook count (62) close but off from HookRegistry (59) |
| U05-L01 | U05 | DEV_PROTOCOL references Desktop Commander |
| U08-L01 | U08 | No checkpoint cleanup policy |

### INFO (15)

| ID | Unit | Finding |
|----|------|---------|
| U01-I01 | U01 | Test suite small (74 tests / 130K LOC) |
| U01-I02 | U01 | Build performance excellent (esbuild <2s) |
| U01-I03 | U01 | Stress test strong (22K req/s) |
| U02-I01 | U02 | Code conventions accurate |
| U02-I02 | U02 | Safety Laws match GSD |
| U03-I01 | U03 | All wiring checks pass |
| U03-I02 | U03 | Hook wrapping comprehensive |
| U03-I03 | U03 | Barrel export complete |
| U05-I01 | U05 | 14 GSD sections present |
| U05-I02 | U05 | Orchestration fully wired |
| U06-I01 | U06 | F2 fully implemented |
| U06-I02 | U06 | Context pressure monitoring live |
| U08-I01 | U08 | Auto-fire comprehensive |
| U09-I01 | U09 | All F1-F8 wired |
| U09-I02 | U09 | Feature state organized |

---

## 2. ROOT CAUSE ANALYSIS

### Pattern 1: Systemic Count Inflation
The most pervasive issue. Nearly every resource count in documentation is inflated compared to what's actually in the code:

| Resource | Actual | Best Doc Claim | Inflation |
|----------|--------|----------------|-----------|
| Actions | 541 | 368-388+ | 0.7x (UNDERCOUNTED!) |
| Engines | 74 | 37 | 0.5x (UNDERCOUNTED) |
| Skills | 61 | 196-231 | 3.2-3.8x overcounted |
| Scripts | 48 | 215 | 4.5x overcounted |
| Hooks | 59-112 | 62-1,107 | Mixed |
| Formulas | ~18 id entries | 109-509 | 6-28x overcounted |
| Algorithms | 17 | 52+ | 3x overcounted |

**Root cause:** Documentation captured planned/target counts and never reconciled against actual implementation. Some counts grew (actions, engines) while others were never built to spec (skills, scripts, formulas).

### Pattern 2: Documentation Staleness
Multiple documents (CLAUDE.md, GSD_QUICK.md, MASTER_INDEX.md, CURRENT_STATE.json) all have different counts for the same metrics. No single source of truth exists despite claims.

### Pattern 3: Missing prism_intelligence
The 238-action intelligenceDispatcher (44% of all actions) is completely absent from CLAUDE.md, GSD_QUICK.md, and MASTER_INDEX.md. It exists in code and is fully registered but invisible to documentation.

---

## 3. FIX PLAN (for U11)

### Priority 1: CRITICAL Fixes (Do First)

**Fix 1: Update CLAUDE.md counts** (U02-C01, U02-H01-H05, U02-M01-M05)
- Line 4: "32 dispatchers, 541 actions, 74 engines"
- Lines 25-29: Reconcile all registry counts
- Lines 31-36: Update roadmap references
- Lines 43-53: Update dispatcher list to include prism_intelligence
- Lines 66-78: Update key paths (37->74 engines)

**Fix 2: Update MASTER_INDEX.md** (U07-C01, U07-C02)
- Add prism_intelligence with all 238 actions
- Update engine section from 37 to 74 (add missing 40 engines)
- Update summary counts
- Fix contradictory build sizes

**Fix 3: Update GSD_QUICK.md** (U05-C01, U05-H01, U05-H02)
- Add prism_intelligence to Decision Tree
- Update action counts throughout
- Fix prism_guard -> prism_ralph_loop naming

### Priority 2: HIGH Fixes

**Fix 4: Update CURRENT_STATE.json** (U07-H01-H03, U07-M04)
- Reconcile all counts against verified actuals
- dispatchers: 32, actions: 541, engines: 74, registries: 14
- skills: 61 (SkillRegistry entries), hooks: 112 (source implementations)

**Fix 5: Fix npm run build** (U01-C01, U01-H02)
- Option A: Increase `--max-old-space-size` to 16384 in package.json build script
- Option B: Make `build` = `build:fast` and create separate `build:typecheck` script
- (Recommend Option A — preserves type safety in build pipeline)

### Priority 3: MEDIUM Fixes (Best Effort in U11)

**Fix 6:** Fix prism_guard -> prism_ralph_loop naming in all docs
**Fix 7:** Update context dispatcher action count from 22 to 18 in docs
**Fix 8:** Document state directory split policy

### Deferred to Later Units

- Expand test coverage (U01-I01) — defer to R0-P3 (test suites)
- Create mfg- skill files (U04-H02) — defer to L5 Skills & Scripts layer
- Fix 28 tsc errors (U01 tsc update) — defer to R0-P1 or L1
- Fix synergyIntegration tsc errors (U09-M01) — include with tsc fixes
- Expand formula/script/algorithm registrations — defer to L0-L1 layers

---

## 4. VERIFIED BASELINE (Post-Audit Ground Truth)

```json
{
  "verified_date": "2026-02-24",
  "verified_by": "R0-P0 Infrastructure Audit (Units 01-09)",
  "counts": {
    "dispatchers": 32,
    "actions": 541,
    "engines": 74,
    "engine_files_excluding_index": 73,
    "registries": 14,
    "registry_files": 18,
    "skills_in_registry": 61,
    "scripts_in_registry": 48,
    "hooks_in_registry": 59,
    "hooks_in_source": 112,
    "formulas_in_registry": "18 id entries (needs deeper audit)",
    "algorithms_in_registry": 17,
    "cadence_functions": 40,
    "hook_source_files": 16,
    "hook_source_loc": 10569,
    "test_files": 9,
    "tests_passing": 74,
    "total_ts_files": 217,
    "total_loc": 129983,
    "tsc_errors": 28,
    "esbuild_warnings": 1,
    "bundle_size_mb": 5.1,
    "checkpoint_files": 21,
    "state_files_root": 162,
    "state_files_mcp": 13,
    "f_series_features": 8,
    "gsd_section_files": 14,
    "roadmap_files": 63
  }
}
```

---

## 5. SUMMARY STATISTICS

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 14 (+ 6 extras noted in text) |
| MEDIUM | 13 (+ 7 extras) |
| LOW | 5 (+ 1 extra) |
| INFO | 15 |
| **Total** | **52+ findings** |

### What Works Well
- All 32 dispatchers properly registered and hook-wrapped
- All 73 engines barrel-exported with zero orphans
- All F1-F8 features wired with engines, dispatchers, state
- Auto-fire system (40 cadence functions) comprehensive and accurate
- Memory graph (F2) fully operational with crash recovery
- esbuild performance excellent (<2s, 5.1MB)
- All 74 vitest tests passing

### What Needs Fixing
- Documentation counts are systemically wrong (inflation + staleness)
- prism_intelligence invisible in all docs
- No working type-checking in build pipeline
- State directory split undocumented
- Single largest theme: **planned counts never reconciled with actual implementation**
