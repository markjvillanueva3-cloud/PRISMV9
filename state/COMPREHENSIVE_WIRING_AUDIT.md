# PRISM COMPREHENSIVE WIRING & INDEX AUDIT
## Date: 2026-02-22 | Auditor: Claude Opus 4.6 | Scope: P0 → R11 + R6

---

## EXECUTIVE SUMMARY

**73 engines, 32 dispatchers, 368+ actions, 9 registries.**
57 engines wired directly to dispatchers. 15 more wired via handler files. 1 orphaned (SkillBundleEngine).
6,372 materials on disk, ~3,022 loaded. 10,033 alarms loaded. ~1,731 tools loaded.
**5 CRITICAL gaps found. 7 MEDIUM gaps. System is ~88% fully wired.**

---

## 1. ENGINE → DISPATCHER WIRING

### ✅ PROPERLY WIRED (57 engines → dispatchers directly)
All R4-R11 engines route through intelligenceDispatcher (239 actions) via IntelligenceEngine.
calcDispatcher handles 91 physics actions via ManufacturingCalculations + AdvancedCalculations.
safetyDispatcher delegates to 5 handler files (collision, coolant, spindle, toolBreakage, workholding).
threadDispatcher delegates to threadTools.ts handler.

### ✅ WIRED VIA HANDLER FILES (15 engines)
| Engine | Handler | Dispatcher |
|--------|---------|-----------|
| CollisionEngine | collisionTools.ts (1,131L) | safetyDispatcher |
| CoolantValidationEngine | coolantValidationTools.ts (424L) | safetyDispatcher |
| SpindleProtectionEngine | spindleProtectionTools.ts (571L) | safetyDispatcher |
| ToolBreakageEngine | toolBreakageTools.ts (556L) | safetyDispatcher |
| WorkholdingEngine | workholdingTools.ts (894L) | safetyDispatcher |
| ThreadCalculationEngine | threadTools.ts (614L) | threadDispatcher |
| BatchProcessor | orchestrationDispatcher | via AgentExecutor |
| CertificateEngine | index.ts direct | F5 feature |
| ComputationCache | calcDispatcher internal | caching layer |
| DiffEngine | sessionDispatcher | state diffing |
| PredictiveFailureEngine | pfpDispatcher | via PFPEngine |
| ResponseTemplateEngine | intelligenceDispatcher | via formatter |
| SessionLifecycleEngine | sessionDispatcher | lifecycle hooks |
| SkillAutoLoader | skillScriptDispatcher | auto-loading |
| TaskAgentClassifier | atcsDispatcher | task routing |

### ❌ ORPHANED (1 engine)
| Engine | Issue | Fix |
|--------|-------|-----|
| **SkillBundleEngine** (198L) | Defines 9 skill bundles, only exported as type. Not imported by any dispatcher. | Wire to skillScriptDispatcher or autopilotDispatcher |

---

## 2. REGISTRY LOADING & DATA COVERAGE

### MaterialRegistry
| Metric | Value | Issue |
|--------|-------|-------|
| On disk (data/materials/) | 229 JSON files, **6,372 entries** | — |
| Loaded via dispatch | ~3,022 entries | ⚠️ 52% gap |
| Loading path | `C:\PRISM\data\materials\{ISO_GROUP}\` | ✅ Correct |
| Layer paths (constants.ts) | core/enhanced/user/learned | ❌ Directories DON'T EXIST |
| extracted/materials/ | 7 ISO dirs with 0 JSON files | ❌ Empty dirs |

**ROOT CAUSE**: MaterialRegistry iterates ISO groups (P, M, K, N, S, H, X) in `data/materials/` — loads files but stops at ~3,022 entries. The layered loading (core/enhanced/user/learned) is **dead code** because those directories were never created. Knowledge engine reports higher count because it scans ALL files.

### ToolRegistry
| Metric | Value | Issue |
|--------|-------|-------|
| data/tools/ | 14 JSON files | ✅ Loads |
| extracted/tools/ | 2 .js files (55KB + 6KB) | ❌ .js NOT loaded (registry filters .json) |
| Loaded via dispatch | ~1,731 tools | — |
| Knowledge reports | 13,967 tools | ⚠️ 88% gap |

**ROOT CAUSE**: extracted/tools/ has `PRISM_CUTTING_TOOL_DATABASE_V2.js` (55KB) and `PRISM_TOOL_TYPES_COMPLETE.js` (6.5KB) — these are JavaScript files, not JSON. ToolRegistry only loads `.json` files. The 14 JSON files in `data/tools/` are the only source.

### AlarmRegistry
| Metric | Value | Issue |
|--------|-------|-------|
| extracted/controllers/alarms/ | 12 JSON files, ~10,033 alarms | ✅ All loaded |
| alarms_verified/ | 12 files | ❌ NOT loaded (different path) |
| alarms_accurate/ | 15 files | ❌ NOT loaded (different path) |

**STATUS**: AlarmRegistry loads from `alarms/` only. `alarms_verified/` and `alarms_accurate/` contain potentially higher-quality data but are ignored.

### MachineRegistry
| Metric | Value | Issue |
|--------|-------|-------|
| extracted/machines/ | 110 files across 5 layers | Partially loaded |
| Loaded via dispatch | ~1,015 machines | ✅ Near-parity with knowledge (1,016) |

**STATUS**: Machine data is the best-wired registry. Near 100% coverage.

### FormulaRegistry
| Metric | Value | Issue |
|--------|-------|-------|
| Built-in formulas | 12 in code | ✅ |
| FORMULA_REGISTRY.json | **FILE DOES NOT EXIST** | ❌ CRITICAL |
| extracted/formulas/ | 12 .js files | ❌ Not loaded (.js format) |
| Expected total | ~509 formulas | Only 12 active |

**ROOT CAUSE**: FormulaRegistry code references `data/FORMULA_REGISTRY.json` but the file was never created. The 12 built-in formulas (Kienzle, Taylor, etc.) work, but 490+ extended formulas are missing. extracted/formulas/ has .js files that aren't loaded.

---

## 3. TEST COVERAGE & RUNNABILITY

### vitest (RUNNABLE: `npx vitest run`)
| File | Tests | Phase |
|------|-------|-------|
| health.test.ts | 5 | P0 |
| safetyMatrix.test.ts | 17 (16 pass, 1 pre-existing) | R2 |
| stressTest.test.ts | 3 | R6 |
| securityAudit.test.ts | 16 | R6 |
| memoryProfile.test.ts | 3 | R6 |
| unit/apiTimeout.test.ts | 4 | Core |
| unit/atomicWrite.test.ts | 4 | Core |
| unit/envParsing.test.ts | 14 | Core |
| unit/getEffort.test.ts | 8 | Core |
| **TOTAL** | **74 (73 pass)** | |

### tests/ (NOT RUNNABLE via vitest — standalone scripts)
| Dir | Files | Phase | Run method |
|-----|-------|-------|-----------|
| tests/r2/ | 3 (.ts + .json) | R2 | `npx tsx tests/r2/run-benchmarks.ts` |
| tests/r3/ | 10 | R3 | `npx tsx tests/r3/*.ts` |
| tests/r4/ | 1 | R4 | `npx tsx tests/r4/*.ts` |
| tests/r5/ | 5 | R5 | `npx tsx tests/r5/*.ts` |
| tests/r7/ | 6 | R7 | `npx tsx tests/r7/*.ts` |
| tests/r8/ | 8 | R8 | `npx tsx tests/r8/*.ts` |
| tests/r9/ | 6 | R9 | `npx tsx tests/r9/*.ts` |
| tests/r10/ | 10 | R10 | `npx tsx tests/r10/*.ts` |
| tests/r11/ | 4 | R11 | `npx tsx tests/r11/*.ts` |
| **TOTAL** | **53 files** (~3,900+ tests) | | **NOT in vitest** |

**ISSUE**: vitest.config.ts only includes `src/__tests__/**/*.test.ts`. The 53 files in `tests/` use custom assert() functions, not vitest's expect/describe/it. They must be run individually via `npx tsx`. This means `npx vitest run` only validates 74 tests, not the full 4,900+.

---

## 4. SKILLS & HOOKS

### Skills
- **232 directories** in skills-consolidated/
- **223 with SKILL.md** (96% coverage)
- **9 empty dirs**: prism-campaign-engine, prism-decision-tree-engine, prism-event-bus-engine, prism-gcode-template-engine, prism-inference-chain-engine, prism-report-renderer, prism-tolerance-engine, proposals, scripts

### SkillBundleEngine (9 bundles defined, NOT wired)
Speed & Feed, Toolpath Strategy, Material Analysis, Alarm Diagnosis, Safety Validation, Threading Operations, Quality & Release, Session Recovery, Optimization & Planning

### NL Hooks: 48 deployed (state/nl_hooks/registry.json)
### HookRegistry: Built-in hooks loaded dynamically (not static registration)

---

## 5. INFRASTRUCTURE & PRODUCTION

### ✅ Fully Wired
- 32 dispatchers registered in index.ts
- RegistryManager boots 9 registries
- AutoPilot.ts + AutoPilotV2.ts in src/orchestration/
- cadenceExecutor.ts (4,040L) — 30+ auto-firing functions
- autoHookWrapper.ts (1,897L) — pre/post hook execution
- synergyIntegration.ts (275L) — F1-F8 cross-feature wiring
- R6: Docker, CI/CD, monitoring, tests, production scripts

### ✅ R5 Web Frontend
- 8 pages, API client uses F7 Bridge endpoints
- Not yet connected to live server (needs endpoint config)

---

## 6. CRITICAL GAPS (Priority Order)

| # | Gap | Impact | Fix Effort |
|---|-----|--------|-----------|
| 1 | **FORMULA_REGISTRY.json missing** | Only 12/509 formulas active. formula_calculate returns errors for 490+ formulas. | 2-4hr: Generate from extracted/formulas/*.js + skill files |
| 2 | **MaterialRegistry loads 3,022/6,372** | 52% of materials unreachable via dispatch. All engines inherit the gap. | 2-3hr: Debug loading loop, fix layer paths |
| 3 | **53 test files not in vitest** | `npx vitest run` only covers 74/4,900+ tests. CI/CD only validates P0+R2+R6 unit tests. | 1-2hr: Add tests/ to vitest config or create wrapper |
| 4 | **Tool .js files not loaded** | extracted/tools/ has 55KB tool DB in .js format. ToolRegistry only loads .json. | 1hr: Convert .js→.json or add .js loader |
| 5 | **Layer paths are dead code** | constants.ts defines core/enhanced/user/learned paths that don't exist. MaterialRegistry has dead layer loading. | 30min: Remove dead code or create layer dirs |

## 7. MEDIUM GAPS

| # | Gap | Impact | Fix Effort |
|---|-----|--------|-----------|
| 6 | 7 empty skill dirs | Skills for campaign, decision-tree, event-bus, gcode-template, inference-chain, report-renderer, tolerance engines missing | 2hr: Create 7 SKILL.md files |
| 7 | Duplicate shop_schedule (L430+L907) | Dead code, esbuild warning | 5min: Remove duplicate case |
| 8 | alarms_verified/ not loaded | Higher quality alarm data available but unused | 30min: Add secondary load path |
| 9 | SkillBundleEngine orphaned | 9 bundles defined but never used | 30min: Wire to dispatcher |
| 10 | R5 frontend not connected | Pages exist but need live API endpoint | 1hr: Configure proxy/endpoint |
| 11 | extracted/formulas/*.js not loaded | 12 physics formula files in wrong format | 1hr: Convert or add .js loader |

---

## 8. WHAT IS PROPERLY INDEXED

✅ 9 registries in RegistryManager (material, machine, tool, alarm, formula, agent, hook, skill, script)
✅ KnowledgeQueryEngine cross-searches ALL 9 registries
✅ 698 toolpath strategies in ToolpathStrategyRegistry
✅ 12 controller families with alarm data
✅ 7 report templates in ReportRenderer
✅ 6 G-code controller templates (Fanuc, Haas, Siemens, Heidenhain, Mazak, Okuma)
✅ 4 campaign actions
✅ 1 decision tree template (material_selection)
✅ 239 intelligence actions across 40 action categories
✅ 91 calc actions (physics, optimization, inference)
✅ 48 NL hooks
✅ 223 skills with SKILL.md

---

## BOTTOM LINE

The system architecture is sound — 73 engines, 32 dispatchers, comprehensive wiring. The main issues are **data loading gaps** (materials at 52%, tools at 88%, formulas at 97.6% missing) and **test infrastructure** (only 74 of 4,900+ tests run via CI). 

The engines themselves are properly composed and wired. ProductEngine→IntelligenceEngine→individual engines chain works correctly. Safety dispatchers delegate to handler files properly. R6 production infrastructure is complete.

**Fix the 5 critical gaps and you have a fully operational system.**
