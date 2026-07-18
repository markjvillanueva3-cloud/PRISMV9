# Plan — Operationalize SFC Calculator + 3 Studios + PPG (priority-ordered)

## Context

The user is launching **five surfaces in priority order**:

1. **Calculator page** with full functionality (Mill/Lathe/WireEDM all green, end-to-end working)
2. **Mill Studio** (`MillStudioPage.tsx`, 672 LOC)
3. **Lathe Studio** (`LatheStudioPage.tsx`, 520 LOC)
4. **WireEDM Studio** (`WireEdmStudioPage.tsx`, 147 LOC — visibly thin vs. siblings)
5. **Post Processor Generator** (`PostProcessorGeneratorPage.tsx`, 4458 LOC)

Each must reach "fully operational" before the next is started, where **operational = page loads + every panel calls real dispatcher actions + Mill/Lathe/WireEDM coverage parity + simulated test pyramid green (backend → variability sweep → E2E Playwright) + variability-adjusted pipeline emits a per-operation autonomous-selection plan (machine/tool/holder/toolpath/material/parameters) per part difficulty**.

### Key discovery — the "2 web builds" mystery is solved

The user flagged unmerged web builds. There are **three dual-builds** in `mcp-server/web/src/pages/`, all routed in `mcp-server/web/src/App.tsx`:

| Concern | Canonical (keep) | Parallel (audit then absorb/retire) | Evidence |
|---|---|---|---|
| Calculator | **`CalculatorPage.tsx` (13,542 LOC)** routed at `/calculator` | `SfcCalculatorPage.tsx` (370 LOC) routed at `/speed-feed-calc` | All 23 calculator vitest files import from `CalculatorPage.tsx`; `calculator-live-launch-audit.ts` + `calculator-live-variability-sweep.ts` target the big build. Agent-A confusion came from reading only the smaller one. |
| PPG | **`PostProcessorGeneratorPage.tsx` (4458 LOC)** routed at `/ppg` | `PostProcessorPage.tsx` (1171 LOC, no route grep hit) + `PpgPage.tsx` (395 LOC) routed at `/ppg-lite` | Generator file is 4× bigger, the explicit `/ppg` route, name matches "Post Processor Generator". |
| WireEDM Studio | `WireEdmStudioPage.tsx` (147 LOC, routed at `/wire-edm-studio`) | (none — it's just thin) | Single file but undersized — content gap, not duplication. |

BUILD_STATE.json's "2 frontend merges pending" (`cqask/ui`, `mcp-cadquery/frontend`) is **a different concern** — those are top-level standalone apps, not duplicates of the main `mcp-server/web/` Vite app. They block CAD-side work, not Calculator/Studio/PPG. We do not need to merge them to ship the user's 5 priorities.

### Other ground-truth findings (worth knowing before phasing)

**Backend is in much better shape than frontend.** From the 3 parallel Explore agents:

- **USF-MS0 (12/12 shipped)** — the orchestrator backbone is there: `SpeedFeedOrchestratorEngine` (~2851 LOC, `mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts`) resolves machine → tool → material → holder → coolant → CAM → strategy through 67 integration points and feeds `UltimateSpeedFeedEngine` for Kienzle/Taylor physics. Dispatcher actions live in `calcDispatcher`: `sf_orchestrate`, `sf_quick`, `sf_stochastic`, `sf_compare`, `sf_optimize`, `sf_resolve_{machine,tool,material}`, `sf_inventory_select`, `sf_tool_roi`.
- **CALC-HARDEN-MS0 (18/18 shipped)** — 38 CRITICAL physics findings closed; canonical-constants enforcer hook now blocks new inlining (`mcp-server/src/physics/constants.ts` is source of truth: P=1800, M=2100, K=1100, N=700, S=2800, H=3200).
- **PSAU-PPG-SFC (14/14 shipped)** — provenance + outcome capture + LoRA gates wired into SFC/PPG.
- **PIPELINE-VAR-MS0 (15/15 shipped)** — `PostProcessorPipelineEngine` (~3301 LOC, 38-stage per-block physics gate). This is the "variability pipeline" Agent-C identified.
- **MACRO-PROGRAM-PIPELINE-MS0 (7/7 shipped)** — macro emit / per-machine + S(x) ≥ 0.70 gate.
- **CAD-AUTOMATION-MS0 (12/12 shipped)** — 6 CAD bridges + router/spawner/mock.
- **AUTO-LEARNING-LOOP-MS0 (12/12 shipped)** — source monitor + novelty + roadmap-append.

Open backend gaps (relevant to the 5 priorities):

- **MS-SFC-CALIBRATE (0/24)** — Stacked Bayesian Model Averaging — strictly an enhancement layer, NOT a blocker for "fully operational".
- **89 unwired Lathe-domain engines** + **143 unwired "Other"** + **11 unwired Turning** + WEDM has 0 dedicated vitest files (62 engines, 36 actions, no regression net).
- **2 engines with inlined Kienzle constants** (`AdaptivePipelineGeneratorEngine`, `AIPhysicsOptimizationEngine`) — canonical-violations, fix as we touch them.

**Frontend has real coverage gaps.** Out of the 105 SFC files in `web/`:

- **Mill panels in the canonical CalculatorPage.tsx exist** (it's 13.5K LOC — Agent-A's "no Mill panels" finding was on the wrong file, the 370-LOC parallel build).
- **Lathe panels: 7/7 exist; 6/7 call real dispatcher actions; LatheCostPanel is 100% local mock** (`web/src/components/calculator/LatheCostPanel.tsx:37-68` — hardcoded ρ=7850, no API call).
- **WireEDM panels: 8 exist; only visualization is real;** `WireEdmFeasibilityPanel.tsx:44-62` + `WireEdmCostBreakdownPanel.tsx:46-142` are 100% local math — **zero of the 36 WEDM dispatcher actions are reached from the UI**.
- **E2E `web/e2e/sfc-calculator.spec.ts` has ~25 assertions, all soft** (`.toBeVisible`, `.toBeGreaterThanOrEqual(0)`) — fails on a mode-tab selector that exists in big-build but not small-build. **Zero real-value physics assertions** — direct violation of CLAUDE.md R9 / `feedback_always_build`.
- **`calculator-live-launch-audit.ts` + `calculator-live-variability-sweep.ts` exist** but have not been run recently — no fresh JSON in `output/`. These are the right contracts for "operational" — we drive against them.

**The thin orchestrator gap (Agent-C's finding).** PRISM has every selection engine needed — `MachineSelectionEngine`, `ToolSelectionEngine`, `WorkholdingSelectionEngine`, `ToolpathStrategyEngine`, `ComplexPartPlannerEngine`, `CADOperationPlannerEngine`, `SpeedFeedOrchestratorEngine`, `StrategySafetyDecisionEngine` (S(x) ≥ 0.70 gate) — but **no engine composes them into a per-operation autonomous plan**: "upload part → emit `[{op, machine, tool, holder, strategy, material_setup, rpm, feed, confidence}…]`". This is the "thin orchestrator" the user named.

### Coordination + constraints

- Slot ALPHA on `cad-fusion-live-ms0`; peer BRAVO is on `CLEANUP-MS0` (orthogonal). One staged peer leftover (`mcp-server/data/milestones/CLEANUP-MS0.json`) already unstaged in `/checkin`.
- **173 milestones drift "complete claim vs. git reality"** — before building any unit under a milestone we touch, run `/close-out-audit` so we don't recreate already-shipped work. Per `feedback_roadmap_close_out` + the goal-complete Stop gate.
- **Per-file scrutiny gate** (2 parallel reviewer agents after every file) + end-of-task **3-of-3 scrutiny** (Codex CLI + Claude reviewer A + Claude reviewer B) per CLAUDE.md.
- **No inlined physics constants** — import from `mcp-server/src/physics/constants.ts`. Hard-blocked by `canonical-constants-enforcer`.
- **No `.toBeDefined()` stubs** — `comprehensive-build-enforce` and `feedback_always_build` reject them.

---

## Plan

### Phase 0 — De-duplicate web pages (1 session, no engine work)

**Goal:** remove ambiguity about which file is canonical, so subsequent phases stop fighting two builds. Honor `feedback_never_delete_only_disable`: parallel builds are **renamed `.archive.<date>.tsx` and unrouted**, not deleted.

| Step | What | Path |
|---|---|---|
| 0.1 | Confirm canonical pairs by reading App.tsx routing table + vitest imports | `mcp-server/web/src/App.tsx:43-372`, all `mcp-server/web/src/__tests__/Calculator*.test.tsx` |
| 0.2 | Run `/close-out-audit --min-confidence 0.7` filtered to Calculator/PPG units | confirms no shipped work depends on the archived files |
| 0.3 | Rename parallel builds with `.archive.2026-05-14` suffix + remove their routes from App.tsx | `SfcCalculatorPage.tsx → SfcCalculatorPage.archive.2026-05-14.tsx`; same for `PostProcessorPage.tsx` + `PpgPage.tsx` (the `/ppg-lite` and `/speed-feed-calc` routes get deleted from App.tsx) |
| 0.4 | Per-file scrutiny gate (2-agent parallel) after each rename | reviewer + code-analyzer |
| 0.5 | Run web vitest suite + run `tsc --noEmit` to catch any missed import sites | `cd mcp-server/web && npx vitest run && cd .. && npm run build` |
| 0.6 | Commit `[CALC-DEDUPE-MS0]/U-CALC-DEDUPE-01: archive parallel calculator + PPG builds` then 3-of-3 scrutiny |  |

Acceptance: only `CalculatorPage.tsx` is routed at `/calculator`; only `PostProcessorGeneratorPage.tsx` is routed at `/ppg`; all tests pass; archive files still readable for reference.

### Phase 1 — Calculator page fully operational (3–4 sessions)

**Backend (mostly green) → Frontend gaps → Test pyramid.** This phase delivers the user's #1 priority across all three suites Mill+Lathe+WireEDM simultaneously, since the canonical `CalculatorPage.tsx` already has mode-switching for all three.

#### 1A — Wire the remaining local-mock panels to real dispatcher actions

| Panel | File:lines | Replace local math with | Dispatcher action | Keep local fallback for offline |
|---|---|---|---|---|
| LatheCostPanel | `web/src/components/calculator/LatheCostPanel.tsx:37-68` | `JobCostingEngine` via `/api/v1/turning/calculate` | new `turning_cost_estimate` (add to `turningDispatcher.ts` z.enum + lazy import + case) | yes (current math, behind `apiResult ?? fallback`) |
| WireEdmFeasibilityPanel | `web/src/components/calculator/WireEdmFeasibilityPanel.tsx:44-62` | `WEDMFeasibilityEngine` via `/api/v1/wedm/...` | existing `wedm_assess_feasibility` | yes |
| WireEdmCostBreakdownPanel | `web/src/components/calculator/WireEdmCostBreakdownPanel.tsx:46-142` | `WEDMCostEngine` | existing `wedm_estimate_cost` | yes |
| LatheGroovingPanel + LatheHardTurningPanel | silent null returns | add error toast + structured warning, do NOT swallow | existing `turning_groove_classify` / `turning_hard_turning_analyze` | n/a |

Per file: per-file scrutiny gate (2 parallel agents). Reference engines:
- `mcp-server/src/engines/JobCostingEngine.ts` (Lathe cost) — verify wiring; if missing dispatcher case add it.
- `mcp-server/src/engines/WEDMFeasibilityEngine.ts` + `WEDMCostEngine.ts`.

#### 1B — Canonical-constants compliance for the 2 violators

While editing dispatcher cases, fix:
- `mcp-server/src/engines/AdaptivePipelineGeneratorEngine.ts` (lines ~50–80: inline P/M/K/N/S/H kc1_1) → import from `mcp-server/src/physics/constants.ts`
- `mcp-server/src/engines/AIPhysicsOptimizationEngine.ts` (ISO_GROUP_PROPERTIES) → same
- Re-run the CALC-HARDEN-MS0/U-CH17 invariant tests.

#### 1C — Build the thin orchestrator (variability-adjusted, per-operation autonomous selection)

This is the user-named "variability-adjusted pipelines depending on user input and part difficulty when a part is uploaded and the prism system determines best machine, tooling, holders, tool paths, material setup, parameters, etc...per operation". Compose existing engines; do not duplicate logic.

- **New engine** `mcp-server/src/engines/OperationAutonomousSelectionOrchestratorEngine.ts` (~170 LOC):
  - Input: `{ cad_path?, features?, part_envelope, material, user_difficulty?: 'easy'|'medium'|'hard'|'auto', user_preferences? }`
  - Output: `{ operations: [{ id, op_type, machine_id, tool_id, holder_id, strategy, material_setup, rpm, feed_mmmin, confidence, sx_score, warnings[] }], part_difficulty_score, total_cycle_estimate_min, blockers[] }`
  - Calls (in order): `ComplexPartPlannerEngine.decompose` → for each op: `MachineSelectionEngine` → `ToolSelectionEngine` → `WorkholdingSelectionEngine` → `ToolpathStrategyEngine` → `SpeedFeedOrchestratorEngine` → `StrategySafetyDecisionEngine` (S(x) gate).
  - Part-difficulty score = weighted blend of feature count, smallest-feature dimension, tightest tolerance, depth-to-diameter, material machinability index. Feeds back into engine selections (e.g. difficulty=hard biases ToolSelector toward higher-grade inserts).
- **New dispatcher action** `prism_cam:autonomous_operation_plan` (~50 LOC):
  - Wire to `camDispatcher.ts` (z.enum + Zod schema + lazy-import + case).
  - Schema: `{ cad_path: z.string().optional(), features: FeatureSchema.array().optional(), material: z.string(), part_envelope: EnvelopeSchema, user_difficulty: z.enum(['easy','medium','hard','auto']).default('auto'), user_preferences: UserPrefSchema.optional() }`.
- **New skill** `.claude/commands/auto-operation-plan.md` (~120 LOC):
  - Usage: `/auto-operation-plan <cad-path> [material] [difficulty]`.
  - Emits markdown summary + JSON plan.
- **New UI tab** in `CalculatorPage.tsx`: "Operation Plan" panel that posts to the new action and renders a per-operation table.
- **Tests**: real-value assertions on a known JM Die part (e.g. a Holo-Krome fastener that produces an exact-known op sequence). Coverage: happy path + ≥3 failure modes (no machine fits envelope, no tool matches geometry, S(x)<0.70) + ≥2 adversarial (NaN tolerance, oversized stock).

#### 1D — Hardened test pyramid for the Calculator

Run all three layers and gate Phase 1 on green:

| Layer | Tool | Target | Real-value assertions |
|---|---|---|---|
| Backend simulation | `npx vitest run` | new `mcp-server/src/__tests__/calculatorAutonomousPlan.test.ts` + run `calculator-live-launch-audit.ts` against a local server | yes — RPM, feed, Ra, sx_score thresholds |
| Variability sweep | `npx tsx mcp-server/web/scripts/calculator-live-variability-sweep.ts` | extend to span all three modes (mill+lathe+wedm) × 3 materials × 3 difficulties; ≥200 scenarios | yes — anomaly rate <5%, no http 500s |
| E2E Playwright | `npx playwright test` | rewrite `web/e2e/sfc-calculator.spec.ts` — add real-value assertions on visible RPM/feed values + drive every mode tab + assert the autonomous-plan panel renders ≥1 operation row | yes |

Acceptance: all three test layers green; LatheCostPanel + the two WireEDM panels show real dispatcher numbers when the server is running; `output/calculator-audit-2026-05-14.json` shows ≥80% success in `quick` + `orchestrate` for all three modes.

### Phase 2 — Mill Studio fully operational (1–2 sessions)

`MillStudioPage.tsx` is 672 LOC — the densest of the three studios — but we haven't audited it yet. Phase 2 is **audit-first**: produce the same operational-state grid we built for the Calculator, then fix gaps.

- 2.1 — Read `MillStudioPage.tsx` end-to-end; inventory: what dispatcher actions it calls, where it stubs, what panels it embeds. Cross-reference against `mcp-server/src/tools/dispatchers/millDispatcher.ts` (find unwired actions). Use the master-index dispatcher (`prism_session:master_index_query "MillStudio dispatcher coverage"`) to surface every related engine.
- 2.2 — Run `/close-out-audit` filtered to MILL-* units (none in master, but MS-CRITWIRE / CAM-EXHAUST-MS0 / USF-MS0 touch mill physics).
- 2.3 — Wire any local-mock panels, same pattern as 1A.
- 2.4 — Connect MillStudio to the autonomous-plan orchestrator from 1C (Mill route → emit per-op plan for mill-only operations).
- 2.5 — Test pyramid: extend `calculator-live-variability-sweep.ts` mill scenarios; add `web/e2e/mill-studio.spec.ts` with real-value assertions; vitest unit covers any new wiring.
- 2.6 — Per-file scrutiny gate after every file; 3-of-3 at end.

Acceptance: MillStudio page loads, every visible control invokes a real dispatcher action, "/auto-operation-plan" emits a mill-only plan, all three test layers green.

### Phase 3 — Lathe Studio fully operational (1–2 sessions)

Same structure as Phase 2, applied to `LatheStudioPage.tsx` (520 LOC).

- 3.1 — Audit page; inventory dispatcher coverage against `turningDispatcher.ts`.
- 3.2 — `/close-out-audit` filtered to LATHE-* (17+ milestones — `LATHE-PROD-READY-MS0` is at 10/127 shipped per drift report, this is rich ground for silent close-outs).
- 3.3 — Wire local-mock panels + complete the Phase 1 LatheCostPanel work if any Lathe Studio embed reuses it.
- 3.4 — Connect to autonomous-plan orchestrator (Lathe route — incl. Swiss decision tree via `SwissTypeDecisionEngine`).
- 3.5 — Test pyramid: lathe scenarios in variability sweep + new `web/e2e/lathe-studio.spec.ts` + vitest.
- 3.6 — **Batch-wire 5–10 of the 89 unwired Lathe engines** that have direct Lathe Studio relevance (e.g. `LathePartoffSafetyRailEngine`, `LatheThermodynamicsEngine`). Use the `[reference_skill_tier_wire_pattern]` 5-file recipe. This makes Lathe Studio richer and decreases BUILD_STATE NEEDS_WIRING count.

Acceptance: LatheStudio page loads, every panel real-wired, autonomous-plan emits lathe-only plans, ≥5 previously-unwired Lathe engines now reachable, test pyramid green.

### Phase 4 — WireEDM Studio fully operational (2 sessions)

`WireEdmStudioPage.tsx` is **only 147 LOC** — by far the thinnest of the three. This phase is closer to building-out than wiring-up.

- 4.1 — Audit page + decide content depth target: parity with Lathe Studio (520 LOC) or with Mill Studio (672 LOC). Recommend Lathe parity given WEDM market size at JM Die.
- 4.2 — `/close-out-audit` filtered to WEDM/CWEDM-* (CWEDM-MS0 + 23 WEDM skills, 62 engines, 235 dispatcher actions — heavy backend, light frontend).
- 4.3 — Build out the page using the **already-existing** WEDM panels: `WireEdmFeasibilityPanel` (wired in Phase 1), `WireEdmCostBreakdownPanel` (wired in Phase 1), `WireEdmBackplot`, `WireEdmContour3D`, `WireEdmContourPicker`, `WireEdmOptimizeCards`, `WireEdmPassChart`, `WireEdmSurfaceIntegrityPanel`. Add tabs/sections to surface them.
- 4.4 — **Plug the documented vitest coverage hole** — Agent-B flagged WEDM as having 0 dedicated vitest files for its 62 engines. Add at minimum 3 high-leverage tests: `WEDMSpeedEngine.test.ts` (real reference values), `WEDMPassScheduleEngine.test.ts` (multi-pass invariant), `WEDMSafetyGateEngine.test.ts` (S(x) ≥ 0.70 hard block).
- 4.5 — Connect to autonomous-plan orchestrator (WireEDM route).
- 4.6 — Test pyramid: wedm scenarios in variability sweep + new `web/e2e/wedm-studio.spec.ts` + the 3 vitest files from 4.4.
- 4.7 — Per-file scrutiny + 3-of-3.

Acceptance: WireEdmStudio page is ≥500 LOC of real component composition, every WEDM panel reachable, ≥3 vitest files protecting 62 engines, autonomous-plan emits WEDM plans (including wire-only feasibility + pass schedule), test pyramid green.

### Phase 5 — Post Processor Generator fully operational (2–3 sessions)

`PostProcessorGeneratorPage.tsx` is 4458 LOC — the largest of the five. Phase 5 is the riskiest by sheer surface area.

- 5.1 — Audit page end-to-end via 1 Explore agent (Mill+Lathe+WEDM PPG modes; controller dialect coverage Fanuc/Siemens/Haas/Mazak/Okuma; macro library integration via MACRO-PROGRAM-PIPELINE-MS0).
- 5.2 — `/close-out-audit` filtered to PSAU-* / PPG-* / POST-* (PSAU-PPG-SFC is 14/14 shipped per backend, so most of the PPG infra is real).
- 5.3 — Verify dispatcher chain end-to-end: `/api/v1/post/generate` → `ppDispatcher` action → `PostProcessorPipelineEngine` (PIPELINE-VAR-MS0's 38-stage engine) → emitted G-code. Run on a known JM Die test program; diff against expected output.
- 5.4 — Wire any local-mock dialects (likely candidate: Mazak-OKuma variations).
- 5.5 — Add G-code-safety gate visualization (`GCodeSafetyAnalyzerEngine`) to the page so the operator sees the safety verdict before download.
- 5.6 — Connect to autonomous-plan orchestrator (PPG consumes the per-op plan → emits per-op-aware G-code).
- 5.7 — Test pyramid: vitest covers new wiring; variability sweep extended with PPG scenarios; E2E `web/e2e/ppg.spec.ts` — upload an autonomous plan → assert generator outputs valid G-code parseable by `GCodeSafetyAnalyzerEngine`.
- 5.8 — Per-file scrutiny + 3-of-3.

Acceptance: PPG accepts an autonomous-plan output, emits dialect-specific G-code that passes `GCodeSafetyAnalyzerEngine`, every controller dialect green for a known reference program, test pyramid green.

---

## Critical files

### Frontend (canonical)
- `mcp-server/web/src/App.tsx:43-372` — router; the only place to wire/unwire pages
- `mcp-server/web/src/pages/CalculatorPage.tsx` (13,542 LOC) — Phase 1 target
- `mcp-server/web/src/pages/MillStudioPage.tsx` (672) — Phase 2
- `mcp-server/web/src/pages/LatheStudioPage.tsx` (520) — Phase 3
- `mcp-server/web/src/pages/WireEdmStudioPage.tsx` (147) — Phase 4 (expansion)
- `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` (4458) — Phase 5
- `mcp-server/web/src/components/calculator/*.tsx` (30+ panels)
- `mcp-server/web/src/api/{sfc.ts,speedfeed.ts,calculatorData.ts}`
- `mcp-server/web/e2e/sfc-calculator.spec.ts` (+ new mill-studio.spec.ts, lathe-studio.spec.ts, wedm-studio.spec.ts, ppg.spec.ts)
- `mcp-server/web/scripts/{calculator-live-launch-audit,calculator-live-variability-sweep}.ts`

### Frontend (archive in Phase 0)
- `mcp-server/web/src/pages/SfcCalculatorPage.tsx` → `.archive.2026-05-14.tsx`
- `mcp-server/web/src/pages/PostProcessorPage.tsx` → `.archive.2026-05-14.tsx`
- `mcp-server/web/src/pages/PpgPage.tsx` → `.archive.2026-05-14.tsx`

### Backend — engines & dispatchers (existing, to reuse)
- `mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` (~2851 LOC)
- `mcp-server/src/engines/UltimateSpeedFeedEngine.ts`
- `mcp-server/src/engines/MachineSelectionEngine.ts`
- `mcp-server/src/engines/ToolSelectionEngine.ts`
- `mcp-server/src/engines/WorkholdingSelectionEngine.ts`
- `mcp-server/src/engines/ToolpathStrategyEngine.ts` + `ToolpathStrategyRouterEngine.ts`
- `mcp-server/src/engines/ComplexPartPlannerEngine.ts`
- `mcp-server/src/engines/CADOperationPlannerEngine.ts`
- `mcp-server/src/engines/StrategySafetyDecisionEngine.ts`
- `mcp-server/src/engines/PostProcessorPipelineEngine.ts` (~3301 LOC)
- `mcp-server/src/engines/JobCostingEngine.ts` (Phase 1A target)
- `mcp-server/src/engines/WEDMFeasibilityEngine.ts` + `WEDMCostEngine.ts`
- `mcp-server/src/tools/dispatchers/{calcDispatcher,turningDispatcher,camDispatcher,edmDispatcher,millDispatcher,ppDispatcher}.ts`
- `mcp-server/src/physics/constants.ts` — single source of truth, no inlining

### Backend — new (Phase 1C)
- `mcp-server/src/engines/OperationAutonomousSelectionOrchestratorEngine.ts` (new, ~170 LOC)
- `mcp-server/src/__tests__/operationAutonomousSelectionOrchestrator.test.ts` (new, real-value reference)
- New action in `camDispatcher.ts`: `autonomous_operation_plan` (enum + Zod schema + lazy-import + case)
- `.claude/commands/auto-operation-plan.md` (new skill)

### Canonical-constants compliance fixes (Phase 1B)
- `mcp-server/src/engines/AdaptivePipelineGeneratorEngine.ts` — replace inline kc1_1 with imports
- `mcp-server/src/engines/AIPhysicsOptimizationEngine.ts` — same

### Inlined-test floors (Phase 4.4)
- `mcp-server/src/__tests__/WEDMSpeedEngine.test.ts` (new)
- `mcp-server/src/__tests__/WEDMPassScheduleEngine.test.ts` (new)
- `mcp-server/src/__tests__/WEDMSafetyGateEngine.test.ts` (new)

---

## Verification

End-to-end gate for each phase before starting the next:

```bash
# Backend tests
cd H:/PRISM/mcp-server && npx vitest run 2>&1 | tail -20

# Type check
cd H:/PRISM/mcp-server && npx tsc --noEmit

# Variability sweep (the user-explicit acceptance contract)
cd H:/PRISM/mcp-server/web && npx tsx scripts/calculator-live-variability-sweep.ts

# Live audit (the user-explicit acceptance contract)
cd H:/PRISM/mcp-server/web && npx tsx scripts/calculator-live-launch-audit.ts

# E2E
cd H:/PRISM/mcp-server/web && npx playwright test

# Close-out for milestones we touched this phase
node H:/PRISM/scripts/close-out-milestone.mjs --milestone <PHASE-MS-ID>

# Per-file scrutiny — REQUIRED after every file written (use parallel reviewer + content-specialist agents per CLAUDE.md §PER-FILE SCRUTINY GATE)

# End-of-task 3-of-3 scrutiny — REQUIRED before commit (CLAUDE.md §SCRUTINY GATE)
node H:/PRISM/.claude/scripts/scrutiny-3way.mjs --session-id <sid>
# Then 3 parallel Agent({reviewer, reviewer, code-analyzer}) with the prompts it emits, then 3 --mark-* calls.

# Per-phase commit format
git commit -m "[CALC-OPS-MS0]/U-PHASE-<N>-<X>: <title> — <summary>"
```

Per-phase **definition of done**:
1. Page loads in browser without console errors (manual smoke).
2. Every visible interactive control invokes a real dispatcher action (no local mocks). Verified via the panel-coverage table above + the audit script `output/calculator-audit-<date>.json` showing the panel's expected actions hit.
3. `npx vitest run` green; `npx tsc --noEmit` green; `npx playwright test` green.
4. `calculator-live-variability-sweep.ts` green: ≥80% success on `quick` + `orchestrate`, ≥70% on `optimize`, anomaly rate <5%.
5. `/auto-operation-plan` returns a non-empty operations array for a JM Die test part, with each op having `confidence > 0` and `sx_score ≥ 0.70` (otherwise it's marked `blocked`).
6. Close-out audit shows no silent debt for milestones touched (`/close-out-audit --min-confidence 0.75` after the phase).
7. 3-of-3 scrutiny PASS recorded in the ledger.
8. Handoff updated via `per-agent-handoff.mjs --source live-chat`.

Total estimated effort: ~10–15 sessions across Phases 0–5. Each phase ships independently; the user can re-prioritize between phases as we learn.
