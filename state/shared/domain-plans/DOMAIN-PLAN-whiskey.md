---
artifact: domain-buildout-plan
slot: whiskey
galaxy: lathe
galaxy_dir: mcp-server/src/engines/lathe/
kienzle_pages: ["Kienzle Wizards.dc.html"]
backend_dispatchers: [prism_turning, turningProgramDispatcher, threadDispatcher, threadingPipelineDispatcher]
frontend_owner: quebec
status: draft
generated_by: zulu-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — whiskey (lathe)

> Finalized plan to take the lathe galaxy to **PhD-master depth**, then
> **test → simulate → validate → fine-tune**, then **build the frontend** from the
> Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub ·
> no-inline-constants · canonical physics from `src/physics/constants.ts`) bind
> every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** OD turning, ID boring, facing, threading (single-point + G76 multi-pass + tap),
  parting/grooving, drilling on-axis, knurling, taper turning, contour turning, mill-turn hybrid
  ops (live tooling + sub-spindle + bar feeder + Swiss guide bushing).
- **Excludes:** pure milling → foxtrot/mill; wire-EDM → mike/wedm; sinker-EDM; additive;
  G-code post-processing → echo.
- **Slot worktree:** `H:/prism-slot-whiskey` · branch `slot/whiskey`
- **Galaxy brain:** `mcp-server/src/engines/lathe/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`
  Note: `Lathe*` engines are flat under `mcp-server/src/engines/` (NOT inside a `lathe/` subdir).

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PASS — 13-artifact buildout complete per AI-SYNERGY-AUDIT.md 2026-06-26.
  `lathe/SOUL.md` confirms soul: whiskey (operator-codified 2026-05-27).
- **Verified engines (CLAUDE.md §2, ~194+ Lathe*.ts confirmed via Glob):**
  - Physics: `LatheAdvancedOperationsEngine.ts` (32K) · `HardTurningCapstoneEngine.ts` ·
    `HardTurningDecisionEngine.ts` · `CSSChipLoadInvariantCoordinatorEngine.ts` ·
    `BoringBarDeflectionEngine.ts` · `LathePartingChipClearanceEngine.ts`
  - Workholding: `ChuckJawForceEngine.ts` · `SoftJawProfileEngine.ts` · `SoftJawBoringGCodeEngine.ts`
    · `SteadyRestPlacementEngine.ts` · `TailstockForceEngine.ts`
  - Bar feeder/Swiss: `BarFeedPitchOptimizerEngine.ts` · `SwissGuideBushingPhysicsEngine.ts`
  - Dialect/Post: `OkumaDialectKnowledgeEngine.ts` · `Fusion360MillTurnBridgeEngine.ts` ·
    `HyperMillMillTurnBridge.ts` · `FusionLathePostDeltaRegistryEngine.ts` ·
    `HyperMillTurningConfigIngesterEngine.ts`
  - Business: `JMDieLatheProgramUpgraderEngine.ts` · `JMDieLatheProgramUpgraderV2Engine.ts` ·
    `LatheAutoQuoteFromPrintEngine.ts` (19K) · `LatheActualCostReconciliationEngine.ts` (19K)
  - AI: `LatheAIOrchestrationEngine.ts` (77K) · `LatheActiveLearningEngine.ts` (76K) ·
    `LatheAttentionMechanismEngine.ts` (88K) · `LatheBayesianOptimizationEngine.ts` (64K)
- **Dispatcher surface (CLAUDE.md §3):**
  - `turningDispatcher.ts` (`prism_turning`): 373 actions — primary surface.
  - `turningProgramDispatcher.ts`: 14 actions.
  - `threadDispatcher.ts`: 17 actions.
  - `threadingPipelineDispatcher.ts`: G76 multi-pass orchestration — **VERIFIED EXISTS** 2026-06-26.
- **Knowledge legs (PSN 11-leg):** Engines (194+ strong), Memories (whiskey synthesis present),
  Wiki (lathe entries present), Tribal (~35 lathe-keyword tips per MEMORY.md baseline; audit for
  precision). Thin: LoRA (LatheLoRA* not in the ~95 stack? — verify), NN/GNN (lathe ghost nodes
  not labeled in refpool), Algorithms (Kienzle/Taylor/Merchant are in constants.ts but algorithm
  invocation surface for `ml_knn` tool-wear clustering not confirmed for lathe).
- **Known landmines (R12):**
  1. **U-LEGAL-13 applies to Okuma/Fanuc/Haas dialect tables** — public manuals only (Okuma
     OSP-P300 programming manual). Never re-derive from copyrighted sources.
  2. **Pre-emit safety gate is ORDERED and NON-SKIPPABLE** — sequence must be exactly:
     `lathe_safety_predicate_evaluate` → `lathe_partoff_safety_gate` →
     `lathe_workholding_select_jaw` → `check_spindle_torque` + `check_spindle_power` (parallel)
     → `turning_force`. Any deviation is a safety violation.
  3. **194+ LatheEngine.ts** — duplication near-certain without `duplicationGuardEngine.checkBeforeCreating()`.
  4. **Boring-bar deflection fix (2026-06-26)**: `U-W2K-BORING-OVERHANG-FIX` — was using part
     length not bore depth for L in δ = FL³/3EI. Verify consuming callers use bore depth.
  5. **`lathe-gcode-lint-guard.mjs` PostToolUse hook** is wired; standalone `lathe-gcode-lint.mjs`
     CLI is UNCONFIRMED — use the hook + `prism_turning` quality actions, not the CLI.

---

## §3 — Deepening roadmap → PhD master

- **Tribal tips to add:** current ~35 lathe-keyword tips (MEMORY.md baseline; refine via `prism_knowledge:tribal_search
  domain=lathe`) → target 80 lathe-specific tips.
  Sources: JM Die lathe programs (`JM DIE/CNC LATHE/` — every Alcoa/Optimas/SFS folder);
  Okuma OSP-P300 public programming manual §G/M-codes (public domain); whiskey Kienzle Wizard
  sessions (transcript mining already in progress); Machinery's Handbook threading tables.
  Priority topics: CSS G96/G50 traps (speed overshoot on part-off), G76 thread cycle parameter
  pitfalls, boring-bar L/D ≥ 4 chatter thresholds, sub-spindle sync timing, bar-remnant waste calc.

- **Wiki entries to write:**
  - `knowledge/wiki/architecture/lathe-safety-gate-sequence.md` — the exact 5-step ordered gate;
    cross-link to whiskey CLAUDE.md §pre-emit safety gate.
  - `knowledge/wiki/lessons/boring-bar-deflection-L-vs-bore-depth.md` — the U-W2K bug root cause
    (part-length vs bore-depth in δ = FL³/3EI); references `src/physics/constants.ts`.
  - `knowledge/wiki/architecture/lathe-threading-g76-multipass.md` — G76 multi-pass pipeline,
    `threadingPipelineDispatcher` contract, infeed angle modes.
  - `knowledge/wiki/reference/lathe-workholding-decision-tree.md` — chuck/soft-jaw/steady-rest/
    tailstock selection logic from `ChuckJawForceEngine` + `SteadyRestPlacementEngine`.

- **Memories to write:**
  - `reference_whiskey_engine_coverage_2026_06_26.md` — confirmed 194+ LatheEngine.ts list with
    file sizes; prevents duplicate creation.
  - `feedback_lathe_boring_bar_l_vs_boredepth.md` — the deflection formula dimension mismatch
    lesson (part-length ≠ bore-depth; see U-W2K-BORING-OVERHANG-FIX 2026-06-26).

- **RAG corpus:** `JM DIE/CNC LATHE/` programs (Okuma MULTUS B250/B300, OSP-P300) + Okuma OSP
  public manual. Embed via `mine-galaxy-transcripts.mjs --galaxy lathe`.
  Target: ≥5,000 lathe NC lines indexed, Okuma OSP G/M-code table embedded.

- **CAG cold-anchor:** whiskey CLAUDE.md §pre-emit safety gate sequence + Kienzle tangential force
  formula (Fc = kc1.1 × ap × fz^(1−mc) — constants from `src/physics/constants.ts`) + CSS/G50
  doctrine + 194-engine existence map. Cache via `cag-router.mjs`.

- **NN/GNN features:** `LatheAIOrchestrationEngine`, `LatheActiveLearningEngine`,
  `LatheBayesianOptimizationEngine` — 3 heavyweight AI engines as ghost refpool candidates for
  india's classifier. Emit labeled outcomes via `prism_outcome:capture_bus_emit {domain:'lathe'}`.

- **LoRA dataset:** whiskey turning sessions → `lathe_lora_{train,test}.jsonl` targeting
  hard-turning D2/52100/M2 high-hardness cases + CSS thread-to-bore transition cases (the
  scenarios most likely to fool a base model). india retrains.

- **Engineered loop + cron:**
  - Nightly (02:33): `mine-galaxy-transcripts.mjs --galaxy lathe` → synthesis → tribal capture.
  - Weekly (Saturday 01:00): `LatheActualCostReconciliationEngine` reconcile JM Die actuals vs
    estimated → reward signal → LoRA augmentation for cost outliers.
  - Acceptance signal: tribal tip count ≥ 80 lathe-specific; `LatheAIOrchestrationEngine`
    outcome reward mean ≥ 0.80 on JM Die lathe validation set.

---

## §4 — Test plan (real assertions — R9)

- **Unit (reference-value / algebraic-invariant):**
  - `BoringBarDeflectionEngine.test.ts`: δ = FL³/3EI where L = bore depth (NOT part length);
    for F=200N, L=0.08m, E=200GPa, I=π·d⁴/64 with d=0.016m: δ = 0.0025mm ± 10%.
    Constants from `src/physics/constants.ts` (E_steel_GPa).
  - `CSSChipLoadInvariantCoordinatorEngine.test.ts`: at G96 S_surface=200m/min, D=50mm,
    N = 1000×200/(π×50) = 1273 RPM; G50 S_max clamp must not allow > 4000 RPM on the Okuma
    MULTUS B250 (spindle limit from `ShopConfigurationEngine`).
  - `ChuckJawForceEngine.test.ts`: jaw clamping force ≥ 3× cutting tangential force (Fc)
    from `prism_calc:turning_force` for the workpiece to be safe — algebraic invariant.
  - `LatheAutoQuoteFromPrintEngine.test.ts`: quote for a 50mm diameter ×100mm long 1045 steel
    shaft (OD + face + bore) must fall within ±20% of JM Die actual cost from Job Cost records.

- **Integration (through the dispatcher):**
  - `prism_turning:lathe_safety_predicate_evaluate` → must return `{safe: true/false}` with
    `reason` string — never undefined; test with a known-safe and a known-unsafe input.
  - `prism_turning:lathe_workholding_select_jaw` for D=60mm, L=120mm, material=D2 58HRC →
    must recommend soft-jaw (hard-turning requires precision holding), not a standard chuck.
  - `prism_turning:turning_thread_optimize` (G76 multi-pass; the `threadingPipelineDispatcher` G76
    action name is UNVERIFIED — grep its action enum before wiring) for M20×2.5 thread, 304SS →
    assert: infeed angle ≤ 29° (modified flank), number of passes ≥ 5, depth-of-cut tapers.
  - Safety gate E2E: `lathe_safety_predicate_evaluate` → `lathe_partoff_safety_gate` →
    `lathe_workholding_select_jaw` → spindle checks — all 5 must run in order (test via mock
    that records call sequence).

- **E2E (JM Die live):**
  - Load a real JM Die Okuma lathe program from `JM DIE/CNC LATHE/ALCOA/` → run through
    `JMDieLatheProgramUpgraderV2Engine` → assert: CSS enabled, G50 S_max present, no legacy
    G97 spindle-lock remaining in OD turn cycles.

- **Coverage floor:** happy + ≥3 failure + ≥2 adversarial + ≥3 spanning configs:
  - Failure: (a) D/L > 8 boring bar → must WARN chatter risk; (b) G50 missing before CSS →
    must ERROR; (c) parting tool at D > 80mm without support → must WARN ejection risk.
  - Adversarial: (a) NaN diameter → structured error; (b) zero feed-rate → error before emit.
  - Spanning configs: OD turning (Okuma MULTUS), Swiss guide-bushing (sub-spindle), hard-turning D2 58HRC.

- **Runner:** `cd mcp-server && rtk npx vitest run -t "BoringBar|CSS|ChuckJaw|LatheAutoQuote|lathe"`

---

## §5 — Simulation plan

- **Scenarios:**
  1. **SEMBLEX shaft turning** — 1045 steel, D=38mm, L=95mm, OD rough + finish + face.
     Tools: CNMG432 carbide. Assert: CSS ≤ 4000 RPM, Fc from `prism_calc:turning_force` ≤
     jaw clamping force / 3 safety factor; cycle time within ±12% of JM Die actual.
  2. **D2 hard-turning bore** — 58HRC, D=40mm bore, L=60mm (L/D=1.5, benign).
     Assert: `HardTurningCapstoneEngine` recommends CBN insert, DOC ≤ 0.15mm per pass,
     `BoringBarDeflectionEngine` δ ≤ 0.005mm.
  3. **G76 M20×2.5 threading** — 304SS, pitch=2.5mm. Assert: ≥6 passes, final pass depth
     ≤ 0.05mm, infeed 29° modified flank, no chattering flag from `LatheAttentionMechanismEngine`.
  4. **Adversarial: bar remnant waste** — `BarFeedPitchOptimizerEngine` with bar length=3000mm,
     part length=47mm → optimal pitch minimizes remnant < 50mm. Assert: remnant ≤ 47mm.
  5. **Adversarial: tailstock force** — `TailstockForceEngine` at L/D=12 (slender shaft) →
     must recommend tailstock AND steady rest combined; neither alone is insufficient.

- **Pass criteria:**
  - Physics in-band: Fc within ±15% of Kienzle model reference.
  - Safety gate: S(x) ≥ 0.95 for all JM Die lathe scenarios.
  - Cycle-time MAPE ≤ 15% vs JM Die actuals.
  - No NaN/undefined in any physics output field.

---

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:** load 10 JM Die lathe programs from `JM DIE/CNC LATHE/` across
  Alcoa/Optimas/SFS customers → run `JMDieLatheProgramUpgraderV2Engine` → score: CSS present,
  G50 clamped, G76 used for threading (not G32 single-point loop), chuck jaw force safe.
- **Acceptance gates:**
  - 10/10 upgraded programs pass `lathe_safety_predicate_evaluate`.
  - `LatheAutoQuoteFromPrintEngine` quote within ±20% of Job Cost actuals for 5 real prints.
  - Cycle-time MAPE ≤ 15% across the 10 programs.
- **Safety gate:** `prism_safety:check_spindle_torque` + `check_spindle_power` on all simulated
  programs — S(x) ≥ 0.95 required (shop floor); any FAIL blocks NC emit.
- **Parity probe:** `LatheWizardPage.tsx` displayed Fc, CSS, cycle-time must match backend
  `prism_turning` dispatcher output within ±1%.

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** `prism_outcome:capture_bus_emit {domain:'lathe', reward, program_id}` on
  every `JMDieLatheProgramUpgraderV2` run and every `LatheAutoQuoteFromPrintEngine` quote.
- **LoRA:** cost outliers (quote error > 20%) + chatter-predicted programs → `lathe_lora_train.jsonl`
  → india weekly retrain → promote IFF lathe quote MAPE lifts from baseline ±20% to ±12%.
- **RAG/CAG:** new tribal tips from JM Die lathe corpus → tribal index → CAG cold-anchor refresh.
- **NN/GNN:** `LatheAIOrchestrationEngine` outcome labels → india refpool → GNN tier-5 lathe
  classification lift.
- **Trigger:** weekly cost reconciliation cron (Saturday 01:00) drives both LoRA + outcome capture.

---

## §8 — Frontend build (Kienzle Lathe Wizard → LatheWizardPage.tsx)

- **Assigned Kienzle page:** `mcp-server/web/design-imports/kienzle-app-build/Kienzle Wizards.dc.html`
  (verified on disk 2026-06-27 — the lathe wizard renders from the shared `Kienzle Wizards.dc.html`).
- **Target React page:** `mcp-server/web/src/pages/LatheWizardPage.tsx` — **REUSE/EXTEND**.
  Also audit: `LatheStudioPage.tsx`, `LathePrintToProgramPage.tsx` for overlap.

- **UI structure (lathe wizard intent):**
  - Left panel: material + workpiece geometry input (OD, length, bore, thread spec) + machine select
    (Okuma MULTUS B250, B300) + operation sequence builder (drag-drop: face → OD → bore → thread
    → part-off) + workholding recommendation display.
  - Right panel: Kienzle force card (Fc, kc1.1, ap, fz from `prism_calc:turning_force`) +
    CSS/RPM card (G96 S_surface, G50 S_max) + safety gate status (5-step gate colors) +
    G-code preview (LathePost output, syntax-colored, JetBrains Mono) + cycle time estimate.

- **Backend wiring:**
  - `prism_calc:turning_force` — Kienzle Fc.
  - `prism_turning:lathe_safety_predicate_evaluate` — master safety gate.
  - `prism_turning:lathe_workholding_select_jaw` — chuck/jaw recommendation.
  - `prism_turning:lathe_css_optimize` — CSS/G50 parameters (also `lathe_css_select_mode` /
    `lathe_css_stats`; all three verified in `turningDispatcher.ts`).
  - `prism_turning:turning_thread_optimize` — G76 multi-pass threading cycle (the
    `threadingPipelineDispatcher` G76 action name is UNVERIFIED — grep its action enum before wiring).
  - Web API client: `mcp-server/web/src/api/latheApi.ts` (create or extend).
  - Express route: `POST /api/v1/lathe/wizard` → turningDispatcher.

- **Design language:** iOS fleet tokens; `var(--status-emerald)` for safe gate, `var(--status-red)`
  for fail. Kienzle force values in `var(--font-mono)`. Mobile-first 44pt taps.
  3-viewport verify: desktop 1360×852 / iPhone 14 390×844 / Pixel 7 412×915.

- **Acceptance:** safety gate 5-step sequence executes and renders; Fc displayed matches
  `prism_calc:turning_force` within ±1%; 3-viewport screenshots match `.dc.html`.

---

## §9 — Dependencies & sequencing

- **Blocked by:** india (LoRA retrain + GNN refpool for `LatheAIOrchestrationEngine` labeling);
  oscar (SFC physics feeds whiskey's Kienzle Fc computations via `src/physics/constants.ts`).
- **Blocks:** echo (lathe post share — `OkumaDialectKnowledgeEngine` consumed by post pipeline);
  charlie (lathe quoting consumes `LatheAutoQuoteFromPrintEngine`).
- **Logical order (R13):** close safety gate ordering gap → deepen tribal/wiki → test suite →
  simulate JM Die programs → validate actuals → fine-tune → frontend last.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: safety gate 5-step sequence enforced in every lathe NC emit path; all 5 dispatcher
  actions wired; `POST /api/v1/lathe/wizard` route live.
- [ ] TEST: BoringBarDeflection / CSS / ChuckJaw / AutoQuote tests green; safety gate ordered E2E;
  threading pipeline spanning configs pass; `rtk npx vitest run -t "lathe"` 100% green.
- [ ] VALIDATE: 10/10 JM Die programs upgraded and safety-passing; quote MAPE ≤ 20%; cycle-time
  MAPE ≤ 15%; S(x) ≥ 0.95 on all simulated scenarios.
- [ ] APPLY: tribal tip count ≥ 80 lathe-specific; LatheWizardPage.tsx rendering live data;
  parity probe passes; per-file 2-arm scrutiny + 3-of-3 Stop gate PASS.
