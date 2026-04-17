# SCRUTINY PASS 4 — Calculator Page + Post-Processor Generator Wiring
**Date:** 2026-04-16
**User directive:** *"wire properly to the calculator page that codex built as well and all milling related stuff that needs to work in tandem with the post processor generator is built and wired"*
**Agents used (round 4, 3 new roles):** Explore (frontend), backend-dev (route/dispatcher), reviewer (roadmap)
**Prior roles:** physics-reviewer, system-architect, analyst, code-archaeologist, production-validator, security-manager, goal-planner, collective-intelligence-coordinator, safety-physics

---

## TL;DR — CONVERGENT VERDICT

Roadmap completeness for the user's re-emphasized requirements: **3 / 10** (reviewer). Will the current `MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md` deliver properly-wired Calculator + PostProcessor Generator integrated with milling engines working in tandem? **NO.**

**Three new blocking findings** (not surfaced in rounds 1-3):

1. **calcDispatcher has 1,086 actions** but **zero HTTP proxy routes** — all calc actions are unreachable from the Codex-built web UI. CalculatorPage works today only because it bypasses the dispatcher entirely via `/api/v1/speed-feed/*` (direct engine import).
2. **ppDispatcher has 328 actions** (header says 95 — stale by 233 actions) with **duplicate z.enum entries** (`pp_ss_*`, `pp_tc_*` registered twice at lines 839-842 and 909-912 / 823-826 and 919-922). Zod accepts dupes but the switch routes only to the first case → second handler is dead code.
3. **5 of 6 `pp_generate_*` actions are silent stubs** — they fall through to string-template helpers at `ppDispatcher.ts:3670-3753` because `PostProcessorGeneratorEngine` lacks `generateHeader`, `generateSafeStart`, `generateToolChange`, `generateCannedCycle`, `generateSubroutine` methods. Frontend sees "success"; output is a template stub.

Plus one safety-critical regression: **`pp_validate_program` returns `{valid: true, warnings: []}`** when the engine method is missing (vacuous-true fallback, line 1228-1231) — a program could pass validation when the validator itself never ran.

---

## 1. Frontend Wiring Map (Explore findings)

### Pages discovered
| Page | LOC | Primary MCP actions | Direct MCP calls? |
|---|---|---|---|
| `CalculatorPage.tsx` | 13,400 | sfOrchestrate, sfQuick, sfResolveMachine/Tool, weCalculatorSolve, fetchMachineCatalogState, fetchMaterialCatalogState | **NONE** — only local client wrappers |
| `PostProcessorGeneratorPage.tsx` | ~4,411 | ppgGenerate, ppgValidate, ppgCompare, ppgControllers, ppgProveOut, ppgDownload, ppgMachineFingerprint, ppgMachineFeatures, ppgLibrarySearch, ppgValidationReport (15 fns) | Routes to `prism_product` + `prism_cam` (NOT `prism_pp`) |
| `MillingUploadPage.tsx` | — | uploadMillingFile → `/api/v1/milling/upload` | yes |
| `MillingWizardPage.tsx` | — | submitMillingWizard → `/api/v1/milling/wizard-submit` | yes — but **hardcodes 4 machines / 16 materials** (not dynamic fetch) |
| `MillingResultsPage.tsx` | — | (viewer only) | — |
| `ProgramReleasePage.tsx` | — | listPacketAttachments, uploadPacketFile, attachPacketFile | **UI-ONLY — no release-gate backend** |

### Critical silo
`CalculatorPage.tsx` contains **zero** imports of `PostProcessorGeneratorPage`, zero calls to `pp_*` actions, and zero calls to `ppgGenerate`. Reverse: `PostProcessorGeneratorPage.tsx` has no CalculatorPage integration. A user calculating SFM=350 in the calculator has no path to push that spec into the PP generator. They're two apps that share a sidebar.

### Milling flow break
```
MillingUploadPage ──► MillingWizardPage ──► MillingResultsPage ──►  ???
                                                                    │
                                                        ProgramReleasePage (unreachable by nav)
```
The Results → Release transition is absent from MillingResultsPage within the first 80 lines of rendered code. ProgramReleasePage exists but nothing routes to it from the milling flow.

### Orphan engine count
62 files matching `Mill*.ts` / `Milling*.ts`. Zero dispatcher files grep-match `MillEngine|MillingEngine` as a direct lazy-import. Conservative estimate: **40-50 Mill engines are orphans** — including advanced reasoning (`MillingMetaLearningEngine`, `MillingAGIMasterEngine`, `MillingPhysicsKernelEngine`'s higher-order cousins).

---

## 2. Backend Wiring Map (backend-dev findings)

### calcDispatcher
- **File:** `H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts` (8,888 lines)
- **Real action count:** **1,086** in z.enum (line 618-1067). Header docblock is stale.
- **Mill coverage:** 11 of 11 canonical calculators present (speed_feed, cutting_force, tool_life, surface_finish, MRR, power/torque, chatter_*, deflection, cycle_time, cost_optimize)
- **AtomicValue compliance:** ~35% — core mill actions return bare numbers, violating `engines/CLAUDE.md` contract `{value, unit, uncertainty, source}`
- **HTTP route exposure:** **ZERO.** No `/api/calc`, `/api/v1/calc`, or any proxy. All 1,086 actions are MCP-only.
- **Silent fallbacks:** calcDispatcher.ts:1296 — when caller omits material, silently uses `mfgCalc.getDefaultKienzle(cfGroupKey)` without flagging `source: "fallback-default"`. Same for Taylor (line 1316).

### ppDispatcher
- **File:** `H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts` (3,779 lines)
- **Header claims 95 actions, actual count: 328**
- **Duplicate z.enum entries:**
  - `pp_ss_validate`, `pp_ss_quick`, `pp_ss_defaults` — twice (lines 839-842 and 909-912), intended as *spindle-state* and *spindle-safety*
  - `pp_tc_validate`, `pp_tc_quick`, `pp_tc_defaults` — twice (lines 823-826 and 919-922), intended as *tool-change* and *thread-cycle*
  - **Second handler is dead code** (switch hits first case first)
  - Fix: rename second set to `pp_sstate_*` / `pp_thread_*`
- **Stub handlers masquerading as engine-backed:**
  - `pp_generate_gcode` (line 1132-1136): `engine.process?.(params) ?? engine.generate?.(params) ?? { error: "PostProcessorEngine method not found" }` — returns error object, UI sees success envelope
  - `pp_generate_header` / `pp_generate_safe_start` / `pp_generate_tool_change` / `pp_generate_canned_cycle` / `pp_generate_subroutine` (lines 1137-1161): all 5 fall through to string-template helpers at lines 3670-3753 because `PostProcessorGeneratorEngine` has no such methods
  - **5 of 6 `pp_generate_*` actions are production stubs**
- **Safety-critical regression:** `pp_validate_program` (line 1228-1231) defaults to `{valid: true, warnings: []}` when `PostProcessorVerificationEngine.validateProgram` is missing — **vacuous-true validation pass**

### Route coverage matrix
| Frontend expects | Route exists | Dispatcher | Status |
|---|---|---|---|
| `/api/calc/*` (any of 1,086 actions) | No | — | **MISSING — all calc actions unreachable by HTTP** |
| `/api/v1/speed-feed/orchestrate` | yes | direct engine import (not dispatcher) | wired |
| `/api/pp/*` | No | — | MISSING |
| `/api/v1/ppg/generate` | yes (ppg.ts:50) | `prism_cam:post_process` | wired (via cam, not pp) |
| `/api/v1/ppg/validate` | yes (ppg.ts:80) | `prism_product:ppg_validate` | wired (via product, not pp) |
| `/api/v1/ppg/optimize` | yes (ppg.ts:100) | `prism_calc:gcode_optimize` | **only calc route that works — one proxy through ppg** |
| `/api/mill/*` | No | — | MISSING |
| `/api/v1/release/*` | No | — | MISSING |
| 32 promised AGI endpoints (`/reasoning`, `/dl`, `/audit`, `/synergy`, `/sync`) | 0 of 32 | — | MISSING |

### Controller dialect coverage
| Controller | Dedicated post engine | pp_* action | End-to-end | Tests |
|---|---|---|---|---|
| Fanuc | No (dialect only) | shared via `pp_e2e_generate` | yes | broad |
| Haas | No (dialect only) | shared | yes | yes |
| Okuma | **Yes** (`PPOkumaTurningPostEngine`, `PPOkumaSubSpindleSyncEngine`) | `pp_turning_generate`, `pp_ssp_generate` | yes | yes |
| Mazak | No (dialect only) | shared | partial | weak |
| Heidenhain | No (dialect only) | shared (header template) | partial | weak |
| Siemens 840D | No (dialect only) | shared | partial | weak |
| Mitsubishi (mill) | **MISSING — dialect only** | — | **NO** | none |
| Mitsubishi (EDM) | `PPWireEDMPostEngine`, `PPSinkerEDMPostEngine` | `pp_wedm_generate`, `pp_sedm_generate` | yes | yes |
| Citizen Swiss | **MISSING** | none | **NO** | none |
| Tsugami Swiss | **MISSING** | none | **NO** | none |

**Mill→PP handoff:** `MillingPrintToProgramEngine.generateGCode()` returns a raw `string`. `PostProcessorPipelineEngine.process(input)` expects an untyped `input = {}` with `input.gcode`. **No adapter function, no shared `ProgramBlock[]` type.** Upstream physics context (`MillingPlannedOp[]`, `MillingChatterCheck[]`, `safety_checks`, `setup_sheet`) is **discarded** — Pipeline re-parses text and redoes Stage-0/Stage-1 physics.

---

## 3. Roadmap Completeness (reviewer findings)

### Scoring
| Dimension | Score | Evidence |
|---|---|---|
| CalculatorPage wiring rigor | **2/10** | Two one-word mentions (L145, L387); no feature inventory, no action list, no gap matrix, no tests |
| PostProcessor generator wiring rigor | **2/10** | 124 engines reduced to 6-unit sub-task (MILL-MS0.5); no mention of PostProcessorGeneratorPage, ppDispatcher, or ProgramReleasePage |
| Milling↔PP tandem rigor | **1/10** | No forward handoff schema; P1.3 handshake is reverse (PP validates strategy upstream); no mill→PP→dialect integration test |
| Overall | **3/10** | Both subsystems treated as decoration line-items in P6.4; Mitsubishi missing from mill controller list (L261) |

### Roadmap gaps
- `PostProcessorGeneratorPage` — **zero mentions**
- `ppDispatcher` — **zero mentions**
- `ProgramReleasePage` — **zero mentions**
- `CalculatorPage` — **two one-word mentions**, no specifics
- Mitsubishi mill controller — **not in MILL-MS6 list** (only 7 controllers: Fanuc/Haas/Okuma/Siemens/Heidenhain/Hurco/Mazak)
- Citizen/Tsugami — only scoped under MT-MS9 Swiss (no mill post)
- Mill→PP handoff schema — **not specified**
- Calc→PP cross-link — **zero sentences**
- SCRUTINY-R3 Pipeline Closure Sprint findings — **not adopted**

---

## 4. Consolidated Top Fixes (ranked by calc+PP integration impact)

| # | Fix | Source | Effort |
|---|-----|--------|--------|
| 1 | Add `/api/v1/calc/:action` HTTP proxy to `prism_calc` MCP dispatcher so the 1,086 calc actions become reachable from CalculatorPage | backend-dev | ~400 LOC |
| 2 | Add `/api/v1/pp/:action` HTTP proxy to `prism_pp` MCP dispatcher | backend-dev | ~400 LOC |
| 3 | Fix ppDispatcher duplicate z.enum names (`pp_ss_*`, `pp_tc_*`) — rename to `pp_sstate_*` / `pp_thread_*` | backend-dev | ~100 LOC |
| 4 | Wire the 5 `pp_generate_*` actions to real engine methods OR route to `PostProcessorEngine.process()` fragments | backend-dev | ~600 LOC |
| 5 | Fix `pp_validate_program` vacuous-true fallback (safety-critical) | backend-dev | ~50 LOC |
| 6 | Build `MillToPPHandoff.ts` typed adapter — preserves physics context through handoff | backend-dev + reviewer | ~500 LOC |
| 7 | `pp_release` action + `/api/v1/release/*` route + backend `ProgramReleaseEngine` — back the UI-only ProgramReleasePage | backend-dev + reviewer | ~700 LOC |
| 8 | Migrate mill-core calc actions to AtomicValue (speed_feed, cutting_force, tool_life, mrr, power, deflection, cycle_time) | backend-dev | ~800 LOC |
| 9 | Ship 32 promised AGI HTTP endpoints OR retract from roadmap | backend-dev | ~1,200 LOC or doc edit |
| 10 | Add Mitsubishi-Mill / Citizen-Swiss / Tsugami-Swiss post engines + `pp_*` actions | backend-dev + reviewer | ~1,800 LOC |
| 11 | Wire MillingResults → ProgramRelease page navigation | Explore | ~50 LOC |
| 12 | Replace MillingWizardPage hardcoded catalogs with dynamic fetch from machine/material registries | Explore | ~200 LOC |
| 13 | Build CalculatorPage feature inventory + wiring matrix (CALC_PAGE_WIRING_MATRIX.json) | reviewer | ~800 LOC |
| 14 | Build PP subsystem inventory + controller-dialect coverage matrix (PP_CONTROLLER_DIALECT_MATRIX.json) | reviewer | ~900 LOC |
| 15 | Parity enforcement: CalculatorPage in `/web` and `/mcp-server/web` must share a single source (symlink or codegen, CI fail on divergence) | reviewer | ~500 LOC |

**Aggregate new effort: ~9,000 LOC across 15 fixes.** Combined with the SCRUTINY-R3 Pipeline Closure Sprint (~2,100 LOC), total closure = **~11,100 LOC / ~30 units / ~8-10 engineering days.**

---

## 5. Roadmap Amendments (copy-paste ready)

The reviewer agent produced 5 patch sections for `MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md`. Reproducing here for direct application:

### Patch 1 — insert as new Section 7.5 (Pipeline Closure Sprint from R3)
```markdown
## 7.5 — Phase 0.8 — Pipeline Closure Sprint (from SCRUTINY-R3)

Close the 3 broken links identified in SCRUTINY-PRINT-TO-CNC-ONESHOT-2026-04-16.md:

| Unit | LOC | Work |
|---|---|---|
| U-PCS-01 | 400 | PrintToProgramPipelineEngine.invoke(PostProcessorPipelineEngine) wired + test |
| U-PCS-02 | 350 | PrintToProgramPipelineEngine.invoke(ToolpathGenerationEngine) wired + test |
| U-PCS-03 | 300 | PrintToProgramPipelineEngine.invoke(CollisionDetectionEngine) wired + test |

Exit gate: synergy-score ≥ 0.40 (was 0.148), S(x) floor ≥ 0.50, coverage ≥ 0.65.
Dependencies: P0.1 awareness middleware.
```

### Patch 2 — insert as new Section 8.5 (CalculatorPage full wiring)
```markdown
## 8.5 — Phase CALC-WIRING-MS0

Scope: H:/prism/mcp-server/web/src/pages/CalculatorPage.tsx (665,751 B, ~13k LOC)
plus mirror H:/prism/web/src/pages/CalculatorPage.tsx (parity required).

| Unit | LOC | Work |
|---|---|---|
| U-CALC-01 | 600 | Feature inventory → state/shared/CALC_PAGE_FEATURES.json |
| U-CALC-02 | 800 | Gap matrix CALC_PAGE_WIRING_MATRIX.json (feature × calcDispatcher action × {wired,mocked,missing}) — min 80 actions |
| U-CALC-03 | 1,200 | Wire every missing cell — calcDispatcher handlers + Zod schemas + AgiEngineResponse<T> envelope |
| U-CALC-04 | 500 | Parity enforcement: single-source /web ↔ /mcp-server/web (symlink or codegen); CI fail on divergence |
| U-CALC-05 | 700 | Vitest contract tests — one per invoked calcDispatcher action |
| U-CALC-06 | 600 | Playwright E2E — 10 representative tiles round-trip |
| U-CALC-07 | 400 | CalcToPPSpec.ts shared spec object (cross-link to PP) |

Exit gate: matrix 100% wired, both mirrors SHA256-identical, Playwright green, zero mock data.
Dependencies: P0.1, Patch 1.
```

### Patch 3 — insert as new Section 8.7 (PP generator full wiring)
```markdown
## 8.7 — Phase PP-WIRING-MS0

Scope: PostProcessorGeneratorPage.tsx (186,677 B) + ppDispatcher.ts (171,360 B, 328 actions)
+ 124 PP*/PostProcessor* engines + ProgramReleasePage.tsx (77,534 B).

| Unit | LOC | Work |
|---|---|---|
| U-PP-01 | 500 | Subsystem inventory (124 engines, 328 actions, handoff types from Mill engines) |
| U-PP-02 | 900 | PP_CONTROLLER_DIALECT_MATRIX.json (9 controllers × 9 features × {engine, test, fixture}) |
| U-PP-03 | 1,500 | Mitsubishi-Mill dialect complete — PPMitsubishiMillPostEngine + 20 validators + fixtures |
| U-PP-04 | 1,200 | Fill remaining dialect gaps |
| U-PP-05 | 700 | MillToPPHandoff.ts typed contract (segments, modal state, feeds, coolant, WCS, tool comp) |
| U-PP-06 | 500 | ppDispatcher action `postprocessor.generateFromMillHandoff` |
| U-PP-07 | 1,000 | Integration suite: 9 dialects × 5 jobs = 45 E2E tests |
| U-PP-08 | 600 | PostProcessorGeneratorPage wiring — every action reachable from UI + PP_PAGE_WIRING_MATRIX.json |
| U-PP-09 | 500 | ProgramReleasePage backend gate — blocks release on validator FAIL |
| U-PP-10 | 400 | Calc↔PP cross-link (SFM in calc → feed in PP block within 1%) |

Exit gate: all 9 controllers pass 5-job suite, matrix 100% implemented, release gate blocks on FAIL, cross-link test green.
Dependencies: P0.1, Patch 1, Patch 2.
```

### Patch 4 — amend MILL-MS0.5 (L255)
```markdown
| MILL-MS0.5 | 6 | POST-ULT dialect reconciliation (superseded by PP-WIRING-MS0; retain for Hurco-only) |
```

### Patch 5 — amend dependency diagram (L440)
```
P0 (AGI substrate) ──► P0.8 (Closure Sprint) ──► CALC-WIRING-MS0 ──┐
                                                                    ├──► P1 ──► P2/P3/P4 ──► P5 ──► P6
                                                ──► PP-WIRING-MS0 ──┘
```

---

## 6. Convergent Verdict

The MILL-AGI-UNIFIED-ROADMAP treats the Codex-built CalculatorPage (13k LOC, the largest page in the repo) and the PostProcessor Generator subsystem (124 engines, 328 dispatcher actions, dedicated page, release gate) as **decoration line-items inside P6.4**. The roadmap:

- Names CalculatorPage twice with zero specifics
- Names `PostProcessorGeneratorPage` / `ppDispatcher` / `ProgramReleasePage` **zero times**
- Undercounts PP engines by 3× (says 41, actually 124)
- Omits Mitsubishi from the mill controller list
- Defines no mill→PP handoff schema
- Describes no calc↔PP cross-link
- Defers both subsystems behind ~755 units of AGI/hardening work
- Does not adopt the SCRUTINY-R3 closure sprint

**Executing the roadmap as currently written will not deliver the user's requirement.** Apply Patches 1-5 (~11,100 LOC, ~30 units, ~8-10 engineering days) before resuming the other phases, and additionally fix the **3 blocking correctness bugs** discovered in this round:

1. Add `/api/v1/calc` and `/api/v1/pp` HTTP proxies (calc dispatcher is currently HTTP-unreachable)
2. Fix ppDispatcher duplicate z.enum entries (dead-code handlers)
3. Fix `pp_validate_program` vacuous-true (safety-critical false positive)

After this closure, CalculatorPage, PostProcessorGeneratorPage, and the milling pipeline will be genuinely integrated — calculator feeds PP, milling pipeline hands typed ops to PP, PP emits dialect-correct G-code, ProgramReleasePage gates the final release against a real backend validator.

---

## Artifacts
- This report: `H:/prism/SCRUTINY-R4-CALC-PP-WIRING-2026-04-16.md`
- Round 3: `H:/prism/SCRUTINY-PRINT-TO-CNC-ONESHOT-2026-04-16.md`
- Roadmap: `H:/prism/MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md`
- Latest inventory: `H:/prism-agi-infra-a/PRISM-INVENTORY-LATEST.md`
