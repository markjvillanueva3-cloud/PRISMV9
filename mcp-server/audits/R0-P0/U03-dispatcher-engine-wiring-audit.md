# R0-P0-U03: Dispatcher + Engine Wiring Audit

**Date:** 2026-02-24
**Status:** COMPLETE
**Auditor:** R4 Scrutinizer (Sonnet)

---

## 1. Dispatcher Inventory (32 Total)

| # | File | Tool Name | Actions |
|---|------|-----------|---------|
| 1 | atcsDispatcher.ts | prism_atcs | 12 |
| 2 | autoPilotDispatcher.ts | prism_autopilot_d | 8 |
| 3 | autonomousDispatcher.ts | prism_autonomous | 8 |
| 4 | bridgeDispatcher.ts | prism_bridge | 13 |
| 5 | calcDispatcher.ts | prism_calc | 91 |
| 6 | complianceDispatcher.ts | prism_compliance | 8 |
| 7 | contextDispatcher.ts | prism_context | 22 |
| 8 | dataDispatcher.ts | prism_data | 21 |
| 9 | devDispatcher.ts | prism_dev | 9 |
| 10 | documentDispatcher.ts | prism_doc | 7 |
| 11 | generatorDispatcher.ts | prism_generator | 6 |
| 12 | gsdDispatcher.ts | prism_gsd | 6 |
| 13 | guardDispatcher.ts | prism_ralph_loop | 14 |
| 14 | hookDispatcher.ts | prism_hook | 20 |
| 15 | intelligenceDispatcher.ts | prism_intelligence | 238 |
| 16 | knowledgeDispatcher.ts | prism_knowledge | 5 |
| 17 | manusDispatcher.ts | prism_manus | 11 |
| 18 | memoryDispatcher.ts | prism_memory | 6 |
| 19 | nlHookDispatcher.ts | prism_nl_hook | 8 |
| 20 | omegaDispatcher.ts | prism_omega | 5 |
| 21 | orchestrationDispatcher.ts | prism_orchestrate | 14 |
| 22 | pfpDispatcher.ts | prism_pfp | 6 |
| 23 | ralphDispatcher.ts | prism_ralph | 3 |
| 24 | safetyDispatcher.ts | prism_safety | ~29 |
| 25 | sessionDispatcher.ts | prism_session | 31 |
| 26 | skillScriptDispatcher.ts | prism_skill_script | 27 |
| 27 | spDispatcher.ts | prism_sp | 19 |
| 28 | telemetryDispatcher.ts | prism_telemetry | 7 |
| 29 | tenantDispatcher.ts | prism_tenant | 15 |
| 30 | threadDispatcher.ts | prism_thread | 12 |
| 31 | toolpathDispatcher.ts | prism_toolpath | 8 |
| 32 | validationDispatcher.ts | prism_validate | 7 |
| | **TOTAL** | **32 dispatchers** | **541 actions** |

### Notable Outliers
- **prism_intelligence**: 238 actions (44% of all actions) — mega-dispatcher
- **prism_calc**: 91 actions (17%) — core manufacturing calculations
- **prism_session**: 31 actions — session lifecycle
- **prism_ralph**: 3 actions — smallest dispatcher

---

## 2. Engine Inventory (74 files, 73 engines)

- 74 .ts files in `src/engines/`
- 73 actual engine modules (1 is `index.ts` barrel)
- **ALL 73 engines exported from barrel** (`src/engines/index.ts`)
- Zero orphaned engines

### Engine Categories
| Category | Count |
|----------|-------|
| Manufacturing Core | 8 |
| Execution & Orchestration | 6 |
| Safety & Validation | 7 |
| Knowledge & Skills | 7 |
| Features F1-F8 | 8 |
| Advanced Reasoning | 9 |
| Shop Floor & Integration | 12 |
| UX & Context | 6 |
| Specialized | 5 |
| Infrastructure | 4 |
| **Total** | **73** (+ index.ts = 74 files) |

---

## 3. Wiring Verification

| Check | Result |
|-------|--------|
| All 32 dispatchers imported in src/index.ts | PASS |
| All 32 dispatchers registered via registerTools() | PASS |
| All 32 dispatchers wrapped with universal hooks | PASS |
| Calculation dispatchers wrapped with safety validation | PASS |
| All 73 engines exported from barrel | PASS |
| No dispatcher references to non-existent engines | PASS |
| No orphaned engines (all barrel-exported, all referenced) | PASS |

---

## 4. Count Reconciliation

| Source | Dispatchers | Actions | Engines |
|--------|-------------|---------|---------|
| CLAUDE.md | 31 | 368 | 37 |
| Plan baseline | ~32 | 368+ | 74 |
| CURRENT_STATE.json | 33 | 388+ | 76 |
| **This audit (actual)** | **32** | **541** | **73 (+1 index)** |

---

## 5. Findings

### HIGH

| ID | Finding | Details |
|----|---------|---------|
| U03-H01 | Action count is 541, not 368+ | All sources (CLAUDE.md=368, plan=368+, CURRENT_STATE=388+) significantly undercount. Actual case-statement audit yields 541. The 238-action intelligenceDispatcher likely grew substantially since last count. |
| U03-H02 | guardDispatcher registers as prism_ralph_loop, not prism_guard | CLAUDE.md references `prism_guard` but the actual tool name is `prism_ralph_loop`. Plan also references `prism_guard`. Naming inconsistency. |

### MEDIUM

| ID | Finding | Details |
|----|---------|---------|
| U03-M01 | intelligenceDispatcher is a mega-dispatcher (238 actions) | 44% of all actions in one file. May indicate this dispatcher needs decomposition for maintainability. |

### INFO

| ID | Finding | Details |
|----|---------|---------|
| U03-I01 | All wiring checks pass | Zero structural defects found in dispatcher-engine wiring. |
| U03-I02 | Hook wrapping is comprehensive | Universal hooks on all 32 dispatchers; safety validation on calc/safety/thread/toolpath. |
| U03-I03 | Barrel export is complete | All 73 engines properly exported from index.ts. |

---

## 6. Baseline Snapshot

```json
{
  "dispatchers": 32,
  "total_actions": 541,
  "engines": 73,
  "engine_files": 74,
  "barrel_exports": 73,
  "orphaned_engines": 0,
  "missing_references": 0,
  "all_hooks_wrapped": true,
  "largest_dispatcher": "intelligenceDispatcher (238 actions)",
  "smallest_dispatcher": "ralphDispatcher (3 actions)"
}
```
