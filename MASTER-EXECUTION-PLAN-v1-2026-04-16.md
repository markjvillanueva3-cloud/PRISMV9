# PRISM Master Execution Plan v1
**Date:** 2026-04-16
**Status:** ACTIVE — executing
**Based on:** SCRUTINY-R5 (codex frontend + Universal alignment), SCRUTINY-R4 (calc+PP wiring), SCRUTINY-R3 (print→CNC one-shot), Universal roadmap

---

## Decisions Locked

1. **Mill-only-first** across calculator + PP wiring (JM Die is 80% mill; proves the per-mode pattern cheaply)
2. **Defer Universal 0.19 Local LLM to W7-W8** (keeps 6-week Phase 0 exit gate closeable; MILL-AGI P0.3 neural ships cloud-first)
3. **Codegen `/web/` from `/mcp-server/web/` under Universal 0.6** (zero-drift CI-enforced parity; reversible)

---

## 6-Week Gantt

| Week | Universal (primary spine) | Adjacent (R3/R4/MILL-AGI) | Exit gate |
|---|---|---|---|
| **W1** | 0.1 Fix Enforcement Root Cause · 0.2 Five Awareness Engines · 0.3 Transactional Forge-Quint · 0.4 Lock registry writes · 0.5 Wire hardcoded loaders · 0.16 U-OP1 BOOTSTRAP_MODE.flag | PAUSED (no new file creation outside Universal) | 0.4 locks active before any calc/PP write |
| **W2** | 0.6 Auto-Wiring Transactional Closure · 0.7 Reverse Index Layer · 0.8 Rename/Delete Protocol · 0.9 Orphan Detection at write-time · 0.16 U-OP3 retrofit (one-shot) | R4 Fix #3 (rename pp_ss_/pp_tc_ duplicates) · R4 Fix #5 (pp_validate_program fail-closed) — landing NOW as part of W1 prep | 0.9 orphan hook live; duplicates gone |
| **W3** | 0.10 Codex adapter · 0.12 MIT OCW rigor · 0.13 AGI self-awareness · 0.14 SVI coupling | R3 Phase A (print_to_program_enhanced, S(x) hard gate, unit tag, tmp-file adapter) · R3 Phase B (wire PP/Toolpath/Collision via 0.6) | 3 Pipeline Closure units green; S(x) ≥ 0.50 canary |
| **W4** | 0.15 Auto-Doc · 0.16 residual · 0.17 Plugin activation · 0.23 U-UTL1/12/4 | **CALC-MILL-MS0** · R4 Fix #1 `/api/v1/calc/*` proxy · R4 Fix #6 MillToPPHandoff.ts | Mill tab Playwright green; Ψ-delta positive |
| **W5** | 0.18 AGI Proximity · 0.24 Cross-Asset · 0.25.1 Safety Containment · 0.25.2 Physics · 0.25.8 Forge-hex | **MILL-WIZARD-MS0** (clone WEDM studio 6-step pattern) · **PP-WIRING-MS0** (9-dialect matrix incl Mitsubishi) · **CALC-LATHE-MS0** · R4 Fix #7 `/api/v1/release/*` · R4 Fix #10 Citizen/Tsugami posts · MILL-AGI P0.3 neural (cloud fallback) | 9-dialect×5-job suite green; mill-studio E2E green; Ψ ≥ 60% |
| **W6** | 0.20 Math · 0.21 Sim · 0.22 SPC · 0.25.3-0.25.10 residual · **0.11 Phase 0 Exit Gate** | CALC-WEDM-MS0 · CALC-SEDM-MS0 · CALC-GRIND-MS0 · CALC-CROSS-MS0 · MILL-AGI P0.5 MetaLearningLoop · MILL-AGI P1 Strategy Foundation kickoff | 0.11 Exit Gate passes all criteria; BOOTSTRAP_MODE.flag auto-removed |
| W7-W8 (deferred) | 0.19 Local LLM · MILL-AGI P2-P5 mill-family hardening + per-CAM | Swap MILL-AGI P0.3 to local inference | Local LLM wired; MILL-AGI hardening begins |

---

## Immediate Actions (session T0)

Executing NOW — safe isolated line-fixes that slot under W2's 0.16 U-OP14 CRITICAL-guard anyway:

- **R4 Fix #3:** rename pp dispatcher duplicate z.enum entries (3× `pp_ss_*`, 2× `pp_tc_*`) + matching switch cases
- **R4 Fix #5:** `pp_validate_program` fails-closed when engine method missing
- Commit under auto-mode YOLO convention

These are **line fixes**, not new file creation, so they don't violate "Universal W1 before adjacent work" — the restriction is on new writes that would need the 0.4 registry locks. Dispatcher line-edits are isolated.

---

## Retired Work (absorbed by Universal Phase 0)

| Adjacent unit | Absorbed by | Action |
|---|---|---|
| R4 fix #4 "Wire 5 pp_generate_* stubs" | Universal 0.23 U-UTL12 | retire |
| R4 fix #9 "32 AGI HTTP endpoints" | Universal 0.6 + 0.17 | retire |
| R4 fix #13 "CalculatorPage feature inventory" | Universal 0.7 ENGINE_USAGE_INDEX | retire |
| R4 U-PP-01 "Subsystem inventory" | Universal 0.7 | retire |
| R3 Phase C Step 8 "Build ReasoningTraceLedger" | Universal 0.18 U-AGI2 | retire |
| R3 Phase C Step 9 "Wire consultAwareness" | Universal 0.2 | retire |
| R3 Phase D Step 11 "kc1_1/taylor_n migration" | Universal 0.25.2 U-PHYS4 | retire |
| MILL-AGI P0.1 Awareness middleware | Universal 0.2 | retire |
| MILL-AGI P0.2 Deep Reasoning (4 engines) | Universal 0.18 U-AGI1/2/3 | retire (keep CounterfactualMillEngine as extension) |
| MILL-AGI P0.4 DeepLogicTraceEngine | Universal 0.18 U-AGI2 | retire |
| MILL-AGI P0.6 MILL_CAPABILITY_MANIFEST | Universal 0.17 | retire |
| MILL-AGI P0.7 AWR residual | Universal 0.2 + 0.13 | retire |
| MILL-AGI P6.1/P6.2 Codex app audit | R4 Patches 2+3 | retire |

~5,500 LOC saved. ~18 MILL-AGI units retired.

---

## Additive Work (keep)

Specific bugs + net-new artifacts Universal doesn't cover:

- R3 Phase A Step 1 — `print_to_program_enhanced` case fix
- R3 Phase A Step 2 — raw STEP tmp-file adapter
- R3 Phase A Step 3 — hard S(x) gate ≥ 0.70
- R4 Fix #3 — rename `pp_ss_*`/`pp_tc_*` duplicates **← LANDED**
- R4 Fix #5 — `pp_validate_program` fail-closed **← LANDED**
- R4 Fix #6 — `MillToPPHandoff.ts` typed adapter (absorbed into PP-WIRING-MS0 U-PP-05)
- R4 Fix #7 — `pp_release` action + `/api/v1/release/*` route + ProgramReleaseEngine
- R4 Fix #8 — AtomicValue migration for 8 mill calc actions
- R4 Fix #10 — Mitsubishi-Mill + Citizen + Tsugami Swiss post engines
- R4 Fix #11 — MillingResults→ProgramRelease nav (absorbed into MILL-WIZARD-MS0 U-MW-04)
- R4 Fix #12 — MillingWizardPage dynamic catalogs (absorbed into MILL-WIZARD-MS0 U-MW-03)
- **MILL-WIZARD-MS0 — clone WEDM studio 6-step pattern into `/mill-studio`** (new milestone — see section below)
- MILL-AGI P0.3 — 5 ONNX neural models (cloud fallback initially)
- MILL-AGI P0.5 — MetaLearningLoop (depends on Universal 0.19 outcomes post-W6)
- MILL-AGI P2–P5 — machine-family physics hardening + per-CAM infra (W7+)

---

## MILL-WIZARD-MS0 — Mill Studio (new milestone, W5)

**Goal:** Convert the current 3-page `MillingUploadPage → MillingWizardPage → MillingResultsPage` flow into a unified `/mill-studio` that clones the WireEdmStudioPage 6-step pattern (the cleanest vertical in the Codex frontend, per R5). Wire the studio end-to-end to the R3-closed print→CNC pipeline so a user dropping a CAD file into step 1 receives a validated, dialect-correct, release-ready G-code program at step 6 — in one flow.

**Why now (W5, not earlier):**
- Needs W3 R3 Pipeline Closure (backend actually emits collision-checked + post-processed G-code)
- Needs W4 CALC-MILL-MS0 (calculator mill tab working so `guidedWizardPath` handoff has real params)
- Runs parallel with W5 PP-WIRING-MS0 (wizard's step 6 consumes the typed `MillToPPHandoff` built there)

**Reference implementation:** `H:/prism/mcp-server/web/src/pages/WireEdmStudioPage.tsx` (121 LOC shell) + `src/contexts/WedmStudioContext.tsx` (Navigation + Data split) + `src/components/wedm-studio/` (10 step components).

### Unit breakdown

| Unit | LOC | Work |
|---|---|---|
| U-MW-01 | 350 | `MillStudioContext.tsx` — split into `MillStudioNavigationContext` (current step, step status) + `MillStudioDataContext` (serialized wizard payload). Mirrors WedmStudioContext pattern. |
| U-MW-02 | 150 | `MillStudioPage.tsx` shell — 6-step WizardShell wrapper at route `/mill-studio`, lazy-loads step components. |
| U-MW-03 | 900 | 6 step components under `src/components/mill-studio/`: StepImport (CAD drop), StepFeatures (feature recognition + GD&T), StepStockSetup (stock + workholding), StepStrategy (toolpath strategy picker), StepToolpath (generated toolpath preview), StepProgram (post-processed G-code + release). Absorbs **R4 Fix #12** by reading machines/materials from dynamic catalog fetchers (not hardcoded). |
| U-MW-04 | 200 | StepProgram → ProgramReleasePage navigation + handoff payload (tool list, machine, controller, material cert links). Absorbs **R4 Fix #11**. |
| U-MW-05 | 250 | Handoff from CalculatorPage's `guidedWizardPath('mill')` → `/mill-studio?prefill=<serialized calc state>` with hydration in MillStudioDataContext. Matches the R5 requirement that calc → wizard actually preserves params. |
| U-MW-06 | 400 | Backend wiring — each step calls the R3-closed pipeline endpoint (`/api/v1/milling/studio/step-{1..6}`). Step 6 consumes `MillToPPHandoff` from PP-WIRING-MS0 U-PP-05. |
| U-MW-07 | 150 | Legacy redirects — `/milling/upload` → `/mill-studio?step=1`, `/milling/wizard` → `/mill-studio?step=3`, `/milling/results` → `/mill-studio?step=6`. Keep the 3 old routes as aliases for 2 releases to preserve deep-linked bookmarks. |
| U-MW-08 | 400 | Playwright E2E — drop STEP file at step 1, arrive at release-ready G-code at step 6, with assertions on feature recognition, strategy ranking, toolpath block count, post-processor dialect correctness, S(x) ≥ 0.70. |
| U-MW-09 | 300 | Vitest contract tests — one per backend endpoint + context-hydration test + prefill handoff test. |
| U-MW-10 | 200 | Clone-pattern generator script `scripts/clone-studio-pattern.mjs` — takes `{newMachineMode, backendEndpointPrefix}` and scaffolds `/lathe-studio` and `/edm-studio` in later weeks without re-implementing the shell. |

**Total:** ~3,300 LOC / 10 units.

**Exit gate:**
- `/mill-studio` at 6 steps, each step passes its contract test
- Playwright green on full drop-STEP-get-G-code E2E
- `guidedWizardPath` prefill round-trips (calc → wizard → hydrated state)
- Legacy 3-route redirects work for back-compat
- Step 6 emits dialect-correct G-code (consumes PP-WIRING-MS0 handoff)
- MillingResults→ProgramRelease transition verified
- `scripts/clone-studio-pattern.mjs` exists for future `/lathe-studio`, `/edm-studio`

**Dependencies:**
- W3 R3 Pipeline Closure (U-PCS-01/02/03) — wizard backend can't emit toolpaths without this
- W4 CALC-MILL-MS0 — `guidedWizardPath` handoff source
- W5 PP-WIRING-MS0 U-PP-05 (MillToPPHandoff) — wizard step 6 consumer
- Universal 0.6 auto-wiring — new API routes + MCP actions auto-registered
- Universal 0.9 orphan detection — catches any stub step handler

**Deferred (out of W5):**
- Clone to `/lathe-studio` — belongs in CALC-LATHE-MS0 or a dedicated W6 LATHE-WIZARD-MS0
- Clone to `/edm-studio` — W6+
- Multi-op job session (mill then WEDM as a single work order) — belongs in a post-Phase-0 UNIFIED-JOB-SESSION milestone; requires the lightweight Zustand store noted in R5

---

## Calculator Per-Mode Expansion (mill-first sequence)

| Sub-milestone | LOC | Week |
|---|---|---|
| **CALC-MILL-MS0** baseline (feature inventory + wiring matrix + Playwright) | ~2,400 | W4 |
| **CALC-MILL-MS1** sub-panels (chatter/tool-life/cost/workholding/deflection) | ~680 | W4 |
| **CALC-MILL-MS2** operation panels (peck/trochoidal/thread-mill/rigid-tap/face-mill/engagement) | ~1,125 | W5 |
| **CALC-MILL-MS3** embedded program studio + dispatcher-bridged handoff | ~400 | W5 |
| CALC-LATHE-MS0 | ~2,000 | W5 |
| CALC-WEDM-MS0 | ~1,300 | W6 |
| CALC-SEDM-MS0 | ~900 | W6 |
| CALC-GRIND-MS0 | ~800 | W6 |
| CALC-CROSS-MS0 (state hygiene + parity codegen + laser/waterjet stubs) | ~1,200 | W6 |

**Total calc expansion:** ~8,600 LOC / 34 units / 3.5 adjacent weeks.

---

## Risk Ordering (Universal-first is non-negotiable)

1. CALC-MILL-MS0 before 0.4 locks → machine catalog corruption
2. PP-WIRING-MS0 before 0.9 orphan hook → replay the "5 stub pp_generate_*" pattern
3. ReasoningTraceLedger before 0.16 U-OP6 rotation → unbounded JSONL growth
4. CALC-LATHE-MS0 before Swiss posts → broken Citizen/Tsugami UX
5. MILL-AGI P0.3 neural before Universal 0.19 → Claude API quota burn

---

## Artifacts

- Plan: this file
- R5 synthesis: `SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`
- R4 synthesis: `SCRUTINY-R4-CALC-PP-WIRING-2026-04-16.md`
- R3 synthesis: `SCRUTINY-PRINT-TO-CNC-ONESHOT-2026-04-16.md`
- Universal primary: `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`
- MILL-AGI: `MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md`
- Live inventory: `H:/prism-agi-infra-a/PRISM-INVENTORY-LATEST.md`

---

## Progress Log

- 2026-04-16 T0 — Plan created. Beginning R4 Fix #3 + #5 as immediate safe line-fixes.
- 2026-04-16 T1 — R4 Fix #3 applied (5 duplicate pp_ss_*/pp_tc_* enum entries + matching switch cases renamed to pp_sstate_*/pp_safestart_*/pp_thread_*). R4 Fix #5 applied (pp_validate_program fails-closed). Build 9.2s clean, 108/108 tests pass. Commit blocked by sibling terminal git lock — pending retry.
- 2026-04-16 T2 — Master plan patched to add **MILL-WIZARD-MS0** (W5, ~3,300 LOC, 10 units). Clones the WireEdmStudioPage 6-step pattern into `/mill-studio`, absorbs R4 Fix #11 (Results→Release nav) and R4 Fix #12 (dynamic catalogs) as full milestone units instead of line-fixes. Adds `scripts/clone-studio-pattern.mjs` so lathe and EDM studios reuse the pattern.
