# SCRUTINY PASS 5 — Codex Frontend Inventory + Universal Roadmap Alignment
**Date:** 2026-04-16
**User directive:** *"run a scrutiny pass again so you see what codex built on the front end and to plan adjacent to the main ai road map"*
**Agents (round 5, 3 new roles):** researcher (frontend inventory), code-analyzer (CalculatorPage machine-mode), Plan (Universal roadmap alignment)
**Prior roles used:** physics-reviewer, system-architect, analyst, code-archaeologist, production-validator, security-manager, goal-planner, collective-intelligence-coordinator, safety-physics, Explore, backend-dev, reviewer

---

## TL;DR

1. **Codex built 134 pages / ~170 components / 87 API clients** on `H:/prism/mcp-server/web/` — exceeds the 111 figure in MILL-AGI roadmap. `/web/` is a 3-week-stale mirror; retire or codegen.
2. **Mill tab is catastrophically shallow** on CalculatorPage — zero mill-specific sub-panels vs. 7 for lathe. Mode-switch hygiene is buggy (tool/material/operation don't reset).
3. **Most R4/MILL-AGI work is already scoped inside Universal Phase 0** — ~18 MILL-AGI units and R3 Phases C/D are redundant. Executing adjacent to Universal (not parallel) saves 5,500+ LOC of duplicated work.
4. **Three decisions required** before execution: mill-only-first vs all-modes, Local LLM in/out of Phase 0, `/web` parity mechanism.

---

## 1. Codex Frontend — What's There

### Page inventory (134 total)
- **Routed in App.tsx:** 133
- **True orphan (no route):** 1 — `QuoteFollowUpPage.tsx`
- **Routed but not in shell nav catalog:** ~23 (including `/print-to-cnc`, `/wire-edm-studio`, `/cam-strategy`, `/post-processor`, `/admin`) — reachable only by URL

### Domain grouping
| Domain | Pages | Notes |
|---|---|---|
| CAM / Strategy / Calculator | 8 | CalculatorPage at 13,400 LOC / 665KB — largest page in repo |
| Post-Processor | 4 | PostProcessorGeneratorPage at 186KB, 4,411 LOC |
| Lathe | 3 | Upload → Wizard → Results triple |
| Milling | 3 | Upload → Wizard → Results triple |
| Wire EDM / EDM | 7 | WireEdmStudioPage is **the cleanest vertical** (6-step wizard pattern) |
| Print-to-CNC / Pipeline | 4 | ProgramReleasePage at `/print-to-cnc` (1,624 LOC) |
| Quote / Sales | 8 | |
| Dashboards | 11 | |
| ERP / Finance | 11 | |
| Jobs / Ops | 9 | |
| Quality / Safety | 9 | |
| Employee / HR | 7 | |
| Learning | 9 | |
| Telemetry / Live | 6 | |
| Other | 33 | |

### Component library (~170 components across 17 subdirs)
- `calculator/` (23), `ppg/` (21), `puoa/` (14 AI copilots), `learning/` (14), `sfc/` (13), `ui/` (12), `wedm-studio/` (10), `viewer/` (7), `optimization-report/` (6), plus smaller subdirs
- **Largest component:** `Layout.tsx` at 73KB — central shell (sidebar, breadcrumbs, command palette, commerce controls, saved views)
- **Red flag:** `components/shared/` duplicates 7 primitives also at top-level — legacy drift

### API client surface
- **87 files under `src/api/`**, all REST via `/api/v1/*` — zero `callTool` (MCP) calls from frontend
- **`client.ts` is the mega-hub:** 2,104 LOC, 88 consumers → high coupling, should be split per-domain
- **46% orphan rate:** 40 of 87 API clients have zero page consumers (`adaptiveControl`, `autonomous`, `cadGeometry`, `fiveAxis`, `orchestrate`, `toolpath`, `multiAxisProgram`, `feasibility`, etc.) — either dead code or pending consumers

### State management
- **No Zustand / Redux.** Pattern is React Context + hooks + localStorage
- **7 Context providers:** Auth, Learning, Ppg, Erp, WedmStudio, OperatingSystem (+ runtime mode), UI
- **45 custom hooks** under `src/hooks/` (useCam, useEdm, useLatheAI, usePpg, useSfc, useSpeedFeed, useWedmPipeline, etc.)
- **Cross-page handoff:** route-based `jobId` passed via URL, fetched server-side on next page

### Parity — `/web` vs `/mcp-server/web`
| Metric | mcp-server/web | /web | Verdict |
|---|---|---|---|
| Page files | 134 | 111 | Mirror is stale |
| Unique pages | +25 canonical-only | +3 legacy-only | |
| CalculatorPage.tsx | 665,751 B | 640,608 B | 25 KB divergent (~430 lines) |
| PostProcessorGeneratorPage.tsx | 186,677 B | 140,604 B | 46 KB divergent |
| MillingWizardPage.tsx | Present | **Absent** | mcp-server exclusive |

**Verdict:** `/web/` is a 3-week-stale legacy snapshot. Retire, codegen, or symlink — see Decision #3.

---

## 2. Calculator Per-Mode Reality

### Six machine modes (canonical at `calculatorWorkspace.ts:2`)
```
type MachineMode = 'mill' | 'lathe' | 'edm' | 'wire_edm' | 'laser' | 'waterjet';
```
- Default: `useState<MachineMode>('mill')` at CalculatorPage.tsx:2443
- **4 divergent type definitions** exist across the codebase — latent bug surface

### Per-mode feature matrix (condensed; full matrix in code-analyzer report)

| Feature | mill | lathe | wire_edm | edm | laser | waterjet |
|---|---|---|---|---|---|---|
| Speed/feed primary | **FULL** | FULL | FULL | STUB | STUB | STUB |
| Chatter stability | **MISS** | FULL | N/A | N/A | N/A | N/A |
| Tool life (Taylor) | **MISS** | FULL | PART | MISS | MISS | MISS |
| Cost estimate | **MISS** | FULL | FULL | STUB | STUB | STUB |
| Deflection | **MISS** | MISS | N/A | N/A | N/A | N/A |
| Multi-pass table | N/A | N/A | FULL | MISS | N/A | N/A |
| Feature Editor | **MISS** | FULL | FULL | MISS | MISS | MISS |
| Embedded program studio | **MISS** | FULL | FULL | FULL | MISS | MISS |
| Peck drilling | **MISS** | — | — | — | — | — |
| Trochoidal/HSM | **MISS** | — | — | — | — | — |
| Rigid tapping | **MISS** | PART | — | — | — | — |
| Thread milling | **MISS** | — | — | — | — | — |
| Face mill setup | **MISS** | — | — | — | — | — |
| Engagement angle | **MISS** | — | — | — | — | — |

**Mill is catastrophically shallow.** Lathe gets 7 dedicated sub-panels (threading, insert selector, hard-turn, grooving, tool-life, workholding, chatter, cost). Mill gets **zero**.

### Mode-switch hygiene — BUGGY
Resets on mode change: coolant, workholding, stockShape, entryStyle, finishTarget, holderBrand, holderPackageId, doc, woc (CalculatorPage.tsx:4271-4383).
**Does NOT reset:** `selectedTool`, `selectedMaterial`, `machineTypeId`, `operation`, `selectedControllerOption`, `programming`, `selectedToolpath`, `selectedStation` (except lathe=1).

→ Switching mill→lathe keeps ¾" end-mill selected, mill CAM programming environment, and `face_mill` operation active — nonsense state.

### Handoff surface
- `postProcessorPath` (line 5486) — route-based handoff to `/ppg` via URL params
- `guidedWizardPath` (5682-5684) — mode-specific wizard launcher
- `hasEmbeddedProgramStudio` (5629) — **excludes `mill`** (lathe/wire_edm/edm only)
- **Zero** direct `pp_*` dispatcher calls — calculator→PP is URL-serialized-only
- **Missing:** "Send to Quote" / "Send to Job Cost" handoffs

### Hardcoded data risks (HIGH)
- `MACHINE_MODE_OPTIONS` — `calculatorWorkspace.ts:307` (UI-driving, not registry-fetched)
- `MODE_NOTES` — `calculatorWorkspace.ts:3194` (hardcoded copy)
- `WORKHOLDING_CATEGORY_OPTIONS` — `calculatorWorkholding.ts:18` (per-mode Record hardcoded)
- Default machine IDs — `CalculatorPage.tsx:1980-1988` (`'th-jmd-vdi30-turning-baseline'`, `'fanuc-wire-standard'` — registry-rename breaks the page)

---

## 3. Universal Roadmap Alignment

**Directive:** Universal is the canonical AI spine. Everything else runs as a *consumer* of Phase 0, not parallel to it.

### Duplication verdict — R4 / R3 / MILL-AGI work already scoped by Universal

| Adjacent unit | Absorbed by | Action |
|---|---|---|
| R4 fix #4 "Wire 5 `pp_generate_*` stubs" | Universal 0.23 U-UTL12 PostProcessorUnificationEngine | Retire |
| R4 fix #9 "32 AGI HTTP endpoints" | Universal 0.6 Auto-Wiring + 0.17 Plugin activation | Retire |
| R4 fix #13 "CalculatorPage feature inventory" | Universal 0.7 ENGINE_USAGE_INDEX + 0.15 ACTION_TRACKER | Retire (auto-generated) |
| R4 U-PP-01 "Subsystem inventory" | Universal 0.7 reverse index | Retire |
| R3 Phase C Step 8 "Build ReasoningTraceLedger" | Universal 0.18 U-AGI2 CausalReasoningEngine | Retire (superset) |
| R3 Phase C Step 9 "Wire consultAwareness" | Universal 0.2 adoption | Retire (same work) |
| R3 Phase D Step 11 "kc1_1/taylor_n migration" | Universal 0.25.2 U-PHYS4 FormulaValidationMatrix | Retire (superset) |
| MILL-AGI P0.1 Awareness middleware | Universal 0.2 | Retire |
| MILL-AGI P0.2 Deep Reasoning (4 engines) | Universal 0.18 U-AGI1/2/3 | Retire (MILL-AGI keeps `CounterfactualMillEngine` as mill-specific extension) |
| MILL-AGI P0.4 DeepLogicTraceEngine | Universal 0.18 U-AGI2 | Retire |
| MILL-AGI P0.6 MILL_CAPABILITY_MANIFEST | Universal 0.17 CAPABILITY_MANIFEST | Retire (cross-domain superset) |
| MILL-AGI P0.7 AWR residual | Universal 0.2 + 0.13 | Retire |
| MILL-AGI P6.1/P6.2 Codex app audit | R4 Patches 2+3 | Retire (R4 is more specific) |

**~18 MILL-AGI units + R3 Phases C/D retired. ~5,500 LOC saved.**

### Additive (genuinely new, keep)

| Unit | Reason |
|---|---|
| R3 Phase A Step 1 — `print_to_program_enhanced` case fix | Specific bug, `PrintToProgramPipelineEngine.ts:506` |
| R3 Phase A Step 2 — raw STEP tmp-file adapter | Specific fix, `AutoPrintToProgramBridgeEngine.ts:227` |
| R3 Phase A Step 3 — hard S(x) gate ≥ 0.70 | Specific fix, `PrintToProgramPipelineEngine.ts:2489` |
| R4 Fix #3 — rename `pp_ss_*` / `pp_tc_*` duplicates | Specific bug, `ppDispatcher.ts:839/909/823/919` |
| R4 Fix #5 — `pp_validate_program` vacuous-true | Safety-critical fix at `ppDispatcher.ts:1228-1231` |
| R4 Fix #6 — `MillToPPHandoff.ts` typed adapter | New data contract |
| R4 Fix #7 — `pp_release` + `/api/v1/release/*` | ProgramReleaseEngine net-new |
| R4 Fix #8 — AtomicValue migration (8 calc actions) | Migration distinct from Universal validation |
| R4 Fix #10 — Mitsubishi-Mill + Citizen + Tsugami posts | Net-new dialect engines |
| R4 Fix #11 — MillingResults→ProgramRelease nav | Specific UI fix |
| R4 Fix #12 — MillingWizardPage dynamic catalogs | Specific UI fix |
| MILL-AGI P0.3 — 5 ONNX neural models | Mill-specific training |
| MILL-AGI P0.5 — MetaLearningLoop | Depends on Universal 0.19 outcomes |
| MILL-AGI P2–P5 — machine-family hardening, per-CAM infra | Physics + CAM-specific, not Universal-covered |

### 6-Week sequenced Gantt

| Week | Universal (primary) | Adjacent | Critical gate |
|---|---|---|---|
| **W1** | 0.1 Enforcement + 0.2 Awareness + 0.3 Forge-Quint + 0.4 Registry Locks + 0.5 Hardcoded loaders + 0.16 U-OP1 BOOTSTRAP_MODE.flag | PAUSED | 0.4 locks live before any new file write |
| **W2** | 0.6 Auto-Wiring + 0.7 Reverse Indexes + 0.8 Rename/Delete + 0.9 Orphan Detection + 0.16 U-OP3 retrofit (30-45 min) | R4 Fix #3 (rename dupes) + R4 Fix #5 (vacuous-true) as line-fixes under 0.16 U-OP14 | 0.9 orphan hook live |
| **W3** | 0.10 Codex adapter + 0.12 MIT OCW + 0.13 AGI self-awareness + 0.14 SVI coupling | R3 Phase A (entry-point fixes, S(x) gate, unit tag) + R3 Phase B (wire PP/Toolpath/Collision) via 0.6 | S(x) ≥ 0.70 canary; 3 Pipeline Closure units green |
| **W4** | 0.15 Auto-Doc + 0.16 residual + 0.17 Plugin + 0.23 U-UTL1/12/4 | **CALC-MILL-MS0** (mill tab to FULL, ~2,400 LOC) + R4 Fix #1 `/api/v1/calc/*` + R4 Fix #6 MillToPPHandoff | Mill tab Playwright green; Ψ-delta positive |
| **W5** | 0.18 AGI Proximity + 0.24 Cross-Asset + 0.25.1 Safety Containment + 0.25.2 Physics + 0.25.8 Forge-hex | **PP-WIRING-MS0** (9-dialect matrix incl. Mitsubishi) + **CALC-LATHE-MS0** + R4 Fix #7 release gate + R4 Fix #10 Swiss posts + MILL-AGI P0.3 neural (see Decision #2) | 9-dialect × 5-job suite green; Ψ ≥ 60% |
| **W6** | 0.19 Local LLM (optional) + 0.20 Math + 0.21 Sim + 0.22 SPC + 0.25.3-10 + **0.11 Exit Gate** | CALC-WEDM/SEDM/GRIND/CROSS + MILL-AGI P0.5 + MILL-AGI P1 kickoff | 0.11 Exit Gate passes; BOOTSTRAP_MODE flag auto-removed |

### Calculator per-mode expansion — mill-first

| Sub-milestone | LOC | Week | Exit |
|---|---|---|---|
| **CALC-MILL-MS0** (baseline) | ~2,400 | W4 | Mill tab 100% wired, Playwright green |
| **CALC-MILL-MS1** (sub-panels: chatter, tool-life, cost, workholding, deflection) | ~680 | W4 | Parity with lathe sub-panel count |
| **CALC-MILL-MS2** (operation panels: peck, trochoidal, thread-mill, rigid-tap, face-mill, engagement angle) | ~1,125 | W5 | Mill-specific operations fully supported |
| **CALC-MILL-MS3** (embedded program studio + dispatcher-bridged handoff) | ~400 | W5 | `hasEmbeddedProgramStudio` includes mill; `pp_*` direct call not URL-only |
| CALC-LATHE-MS0 | ~2,000 | W5 | Swiss dialect toggle post Fix #10 |
| CALC-WEDM-MS0 | ~1,300 | W6 | |
| CALC-SEDM-MS0 | ~900 | W6 | |
| CALC-GRIND-MS0 | ~800 | W6 | |
| CALC-CROSS-MS0 (state hygiene, parity, laser/waterjet stubs) | ~1,200 | W6 | Mode-switch clears tool/material/operation |

**Aggregate calc expansion:** ~8,600 LOC / 34 units / 3.5 engineering weeks adjacent to Universal W4–W6.

---

## 4. Risk Call-outs (Universal ordering violations)

1. **CALC-MILL-MS0 before 0.4 Registry Locks** → machine catalog corruption on concurrent writes (unlocked `fs.writeFileSync` at `cross-session-asset-registry.json`)
2. **PP-WIRING-MS0 before 0.9 Orphan Detection** → ship Mitsubishi dialect with the same "5 stub `pp_generate_*`" pattern
3. **ReasoningTraceLedger before 0.16 U-OP6 LedgerRetention** → unbounded JSONL growth (~20 MB/day)
4. **CALC-LATHE-MS0 before R4 Fix #10 Swiss posts** → broken Citizen/Tsugami UX (green light, stub G-code)
5. **MILL-AGI P0.3 neural before 0.19 Local LLM** → Claude API quota burn (cloud fallback instead of local inference)

---

## 5. Three Decisions Required Before W1

### Decision #1 — Mill-only-first vs. all-modes-parallel
- **Mill-only (recommended):** 1 week to working mill flow. Matches JM Die's 80% mill workload. Failures isolated.
- **All-modes-parallel:** 3-4 weeks before any mode works; shared-cascade bugs surface across 6 tabs simultaneously.

### Decision #2 — Adopt Universal 0.19 Local LLM Infrastructure in Phase 0?
- **Adopt (in W6):** Ollama + Qdrant + LoRA wired. ~14 GB VRAM on your 4080, may conflict with other GPU use.
- **Defer (recommended):** MILL-AGI P0.3 ships cloud-first; swap to local inference post-Phase 0 in W7-W8. Keeps 6-week budget close-able.

### Decision #3 — `/web` vs `/mcp-server/web` parity mechanism
- **Symlink:** 1 hour; flaky on Windows NTFS
- **Codegen (recommended):** ~200 LOC under 0.6 auto-wiring; zero-drift CI enforcement; native Phase 0.6 pattern-match
- **Drop `/web/`:** cleanest long-term; ~400 LOC migration + Vite config + harness updates; irreversible; too much blast-radius mid-sprint

---

## 6. Frontend Pre-Ship Requirements (for print→CNC one-shot)

Codex-built plumbing is mostly ready, with 6 frontend gaps:

1. **"Print Drop" bridge page** — single entry that accepts CAD/PDF → auto-dispatches to correct wizard (mill/lathe/wedm/edm). Missing.
2. **Unified job-session store** — current `jobId`-via-URL fails for multi-op jobs (mill then WEDM). Need lightweight Zustand or shared Context.
3. **Studio pattern extension** — clone WEDM studio 6-step wizard for `/lathe-studio` and `/mill-studio`.
4. **Wire orphan API clients** critical to one-shot: `cadGeometry`, `holePattern`, `fiveAxis`, `multiAxisProgram`, `multiOp`, `toolpath`, `feasibility`.
5. **Default nav exposure** for `/print-to-cnc` (today only reachable by URL).
6. **`QuoteFollowUpPage`** — wire or delete before quote-autopilot ships.

---

## 7. Consolidated Verdict

- **Codex did good work.** 134 pages, clean routing, clearance-aware auth, fixture-mode provider, WEDM studio pattern, lazy loading, design system. Canonical tree at `/mcp-server/web/`.
- **Two blocking frontend issues:** (1) Mill calculator tab is catastrophically shallow vs. lathe, (2) Mode-switch state hygiene is buggy.
- **Most R4/MILL-AGI work is redundant with Universal Phase 0.** Executing adjacent — as consumers, not parallel — saves ~18 MILL-AGI units and ~5,500 LOC.
- **11 additive items keep** (specific bugs, net-new dialects, typed adapters, release gate).
- **6-week Gantt holds** if Universal W1-W2 is respected as a hard gate before adjacent work begins.

---

## Artifacts
- This report: `H:/prism/SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`
- R4: `H:/prism/SCRUTINY-R4-CALC-PP-WIRING-2026-04-16.md`
- R3: `H:/prism/SCRUTINY-PRINT-TO-CNC-ONESHOT-2026-04-16.md`
- Universal (primary): `H:/prism/UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`
- MILL-AGI: `H:/prism/MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md`
- Latest inventory: `H:/prism-agi-infra-a/PRISM-INVENTORY-LATEST.md`

## Canonical source paths
- Frontend canonical: `H:/prism/mcp-server/web/` (retire `/web/` or codegen under 0.6)
- Calculator: `H:/prism/mcp-server/web/src/pages/CalculatorPage.tsx`
- MachineMode canonical type: `H:/prism/mcp-server/web/src/data/calculatorWorkspace.ts:2`
- WEDM studio template (clone for mill-studio, lathe-studio): `H:/prism/mcp-server/web/src/pages/WireEdmStudioPage.tsx` + `H:/prism/mcp-server/web/src/components/wedm-studio/`
- calcDispatcher: `H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts` (1,086 actions)
- ppDispatcher: `H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts` (328 actions, has duplicate z.enum bug)
