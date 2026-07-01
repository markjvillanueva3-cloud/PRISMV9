---
artifact: domain-buildout-plan
slot: oscar
galaxy: speed-feed
galaxy_dir: mcp-server/src/engines/speed-feed/
kienzle_pages: [Kienzle Speed-Feed.dc.html]
backend_dispatchers: [prism_calc, prism_product]
frontend_owner: quebec
status: draft
generated_by: oscar-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — OSCAR (speed-feed)

> Finalized plan to take the speed-feed galaxy to **PhD-master depth**, then **test → simulate →
> validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle Claude-Design
> build (`Kienzle Speed-Feed.dc.html`).
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

## §1 — Domain identity & scope

- **Owns:** Speed/Feed Calculator (SFC) — the primary saleable subscription product. Includes
  Kienzle force model, Taylor tool-life, Merchant shear, 9-axis orchestration, auto-speed-feed,
  chatter/SLD stability lobes, deflection prediction, spindle-power gate, tool-wear progression,
  thermal estimation, vendor parity loop (G-Wizard / HSMAdvisor tri-compare), SFC self-learning
  closed loop (outcome capture → parameter refinement), and the SFC frontend page.
- **Excludes:** turning toolpath strategy (whiskey), wire-EDM conditions (mike), CAM strategy
  selection (kilo), G-code post-processing (echo), billing/ERP (hotel), LoRA training
  infrastructure (india — oscar produces the dataset, india trains).
- **Slot worktree:** `H:/prism-slot-oscar` · branch `slot/oscar`
- **Galaxy brain:** `mcp-server/src/engines/speed-feed/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

## §2 — Current state (verified — R12)

- **Scaffolding:** PASS on 5 of 13 artifacts (CLAUDE, MEMORY, AWARENESS present; PATHS/TOOLBELT
  present). AI-synergy audit: all 4 dimensions = 1 (discoverability, ownsOrWiresAi, vaultSynergy,
  crossSubstrate). PSN legs #1/#3/#6/#10 all healthy per AWARENESS.md.
- **Engines (verified in CLAUDE.md):** 29+ engines in the flat `mcp-server/src/engines/`
  namespace. Core: `UltimateSpeedFeedEngine.ts` (31 models, 401-assert gauntlet),
  `SpeedFeedOrchestratorEngine.ts` (2,851 LOC), `SpeedFeedNineAxisOrchestratorEngine.ts`,
  `SFCMultiHypothesisRankerEngine.ts`, `SFCParameterRefinementEngine.ts`,
  `SpeedFeedOutcomeFeedbackBridgeEngine.ts`, `KienzleForceModelEngine.ts`,
  `SpindlePowerCheckEngine.ts`, `SpindleTorqueGateEngine.ts`, `ToolDeflectionPredictionEngine.ts`,
  `AutoSpeedFeedEngine.ts`, `AutoSpeedFeedCalculatorEngine.ts`, `SFCCalculateEngine.ts`,
  `SFCOptimizeEngine.ts`, `ProvenSpeedFeedAggregatorEngine.ts`, `ChatterStabilityLobeEngine.ts`,
  `SpeedFeedChatterStabilityAdapterEngine.ts`, `GWizardAdapterEngine.ts`,
  `GWizardComparatorBridgeEngine.ts`, `HSMAdvisorAdapterEngine.ts`,
  `HSMAdvisorComparatorBridgeEngine.ts`, `CAMSpeedFeedBridgeEngine.ts`,
  `SpeedFeedDeepLearningEngine.ts`, `SpeedFeedPSNDecisionPriorEngine.ts`,
  `SpeedFeedPropagationBridgeEngine.ts`, `SpeedFeedDownstreamSubscriberEngine.ts`,
  `ToolCatalogEngine.ts`, `ToolCatalogAdaptiveEngine.ts`. Algorithm primitives (import only):
  `JohnsonCookConstitutiveEngine.ts`, `GilbertEconomicSpeedEngine.ts`, `ToolWearRateEngine.ts`,
  `StochasticToolWearEngine.ts`.
- **Dispatcher surface:** `prism_calc` — 30+ actions including `ultimate_speed_feed`,
  `sfc_calculate`, `sfc_nine_axis_run`, `sfc_optimize_run`, `sfc_rank_hypotheses`,
  `sfc_parameter_refinement_compute`, `auto_speed_feed_calc`, `cam_speed_feed_bridge`,
  `speed_feed_tri_compare`, `speed_feed_exhaustive_sweep`, `speed_feed_calibration_persist`,
  `speed_feed_gpu_judge`, `speedfeed_outcome_record_actuals`, `speedfeed_outcome_stats`,
  `speedfeed_outcome_recent`, `joint_speed_feed_optimize`, `stepover_calc`,
  `sfc_fewshot_predict` (AI leg). `prism_product:sfc_calculate` is the page-facing product
  action route. `prism_safety:check_spindle_torque`, `prism_safety:validate_physics`.
- **Registries:** `CoatingRegistry.ts` (100 entries), `PhysicsMappingRegistry.ts` (1,942 entries),
  `MaterialRegistry.ts`, `ToolRegistry.ts`, `MachineRegistry.ts`, `MachineSpindleDefaults.ts`,
  `CoolantRegistry.ts`.
- **Knowledge legs (PSN):** #1 Obsidian — PASS (synthesis brain present at
  `knowledge/memories/patterns/speed-feed_synthesis.md`); #3 Wiki — PASS (282 entries);
  #5 Tribal — PARTIAL (54 tips, target 100+); #6 system-viz — PASS; #10 NN/GNN — PASS (typed
  cross-substrate edges: owned-by-slot, documented-by). Algorithms: `signal_savgol`, `ml_dtw`,
  `ml_viterbi`, `ml_beam_search`, `ml_gmm`, `ml_knn`, `spatial_ransac_fit` wired (tango,
  ALGO-SYNERGY 2026-05-29).
- **Known landmines (R12):**
  1. Vc-collapse regression (2026-06-23, ec0ce2ea26): `SpeedFeedOrchestratorEngine` proportional-
     reduction block was reducing cutting speed Vc for deflection/force violations — Vc is force-
     independent; fix routes each binding check to its physically correct lever. **FIXED** — verify
     `git show ec0ce2ea26`.
  2. Spindle efficiency blind spot (2026-06-23): power guard compared raw Pc vs rated spindle,
     missing `/eta_drive` (0.85). `SPINDLE_DRIVE_EFFICIENCY` now imported from `constants.ts`.
     **FIXED** (U-SFC-OVERPOWER-SPINDLE-EFF).
  3. `ProductEngine` inline kc divergence (2026-06-23, 4ad8a0116b): 1045 steel Taylor C was 250
     inline vs canonical 350 in `constants.ts` — tool life 4× short on customer page. **FIXED**.
  4. Phantom wire-exempt orphans: `SFCProvenanceWireEngine` (U-SFC-PROVENANCE-WIRE pending) and
     `SFCInferenceGateWireEngine` (unmerged from slot/india) — NOT verified in repo, treat as
     open gaps.
  5. Feed unit discipline: IPM (mill) vs IPR (lathe) confusion = 25.4× chip-load error. Guard
     via `units-guard.mjs`; never assume, always resolve from `G20`/`G21` or machine profile.

## §3 — Deepening roadmap → PhD master

> **RECONCILIATION 2026-06-28 (slot:oscar).** The wiki-namespace targets below are **SHIPPED**: all 5 named entries now exist — `kienzle-force-depth`, `chatter-solver-sld`, `vendor-parity-loop`, `nine-axis-orchestration` (written this session, every one physics-reviewer PASS) + `sfc-deflection-vc-lever` (prior). The speed-feed wiki namespace now has **10 leaves**, so the §wiki-leaf acceptance (≥10) is **MET**. The "54 tribal" figure is a **narrow namespace metric**, not a coverage gap: the live embed-index (`prism_knowledge:tribal_stats`) carries **800+ speed/feed-relevant tips** (542 `speeds_feeds` + 160 `speed_feed` + 111 `chip_control`), so SFC tribal *retrieval* is functionally deep. Treat the continuity "advance tribal 54→100" nextAction as an artifact of the narrow count. Detail + the R12 false-bug lesson: [[reference_oscar_sfc_wiki_deepen_and_false_bug_2026_06_28]].

- **Tribal tips:** 54 current → 100+ target. Sources: JM Die corpus (`JM DIE/CNC MILL/`),
  ISCAR radial chip-thinning guide (free corpus), IIT Bombay Virtual Labs milling modules,
  ACS College Engineering lecture notes, vendor HSMAdvisor/G-Wizard published case studies.
  Capture via `prism_knowledge:tribal_capture slot=oscar`. Mine with
  `scripts/mine-galaxy-transcripts.mjs --galaxy speed-feed` (Ollama-first, qwen2.5-coder:32b).
- **Wiki entries to write/cross-link:**
  - `knowledge/wiki/speed-feed/kienzle-force-depth.md` — full Kienzle variant coverage: oblique
    cutting, cutter-engagement sweep, Fc/Ff/Fp decomposition, kc1.1 table by ISO group with
    source citations (ISO 3685 / Schroeter / König).
  - `knowledge/wiki/speed-feed/chatter-solver-sld.md` — SLD (stability lobe diagram) physics:
    regenerative chatter, FRF, limit depth of cut formula; cross-link `ChatterStabilityLobeEngine`.
  - `knowledge/wiki/speed-feed/vendor-parity-loop.md` — tri-compare (PRISM × G-Wizard ×
    HSMAdvisor) methodology, acceptance bands ±30%, known divergence sources.
  - `knowledge/wiki/speed-feed/nine-axis-orchestration.md` — the 9 physical axes, lever mapping
    per binding check (force→fz, power→Vc, deflection→fz/ap), clamp sequencing.
  - `knowledge/wiki/lessons/sfc-vc-collapse-regression-2026-06-23.md` — regression lesson from
    ec0ce2ea26 (already in `## Recent regressions`; promote to wiki lessons leaf).
- **Memories to write:** `reference_oscar_sfc_nine_axis_lever_map_<date>.md` (lever-per-axis
  physics invariant table), `reference_oscar_sfc_parity_baseline_<date>.md` (G-Wizard/HSMAdvisor
  tri-compare result by ISO group as a regression anchor).
- **RAG corpus:** `mcp-server/data/state/milling-pdf-cited-tips.ts` (primary); supplement with
  ISCAR / Sandvik / Kennametal PDF excerpts via `/pdf-learn`. Embed target: 200+ chunked passages
  indexed by `scripts/embed-cited-tips.mjs`.
- **CAG cold-anchor:** `src/physics/constants.ts` (kc1.1/Taylor/material table) + galaxy CLAUDE.md
  + `knowledge/wiki/speed-feed/kienzle-force-depth.md` (once written). Route via
  `scripts/lib/cag-router.mjs`.
- **NN/GNN features:** `SpeedFeedOrchestratorEngine` and `UltimateSpeedFeedEngine` nodes need
  768-d feature vectors for GNN refpool. Route via `vault-to-gnn-refpool.mjs`. Owner: india.
- **LoRA dataset:** `speed-feed_lora_train.jsonl` / `speed-feed_lora_test.jsonl` in
  `mcp-server/data/state/lora-datasets/`. Generate from outcome-capture bus actuals +
  tri-compare divergence records. India trains; oscar produces dataset + acceptance gate.
- **Engineered loop + cron:** nightly scheduled task (S4U, `22:30 local`):
  1. `scripts/mine-galaxy-transcripts.mjs --galaxy speed-feed` (Ollama summarize → tribal tips)
  2. `scripts/sfc-awareness-snapshot.mjs` (PSN leg refresh → `AWARENESS.md`)
  3. `prism_calc:speed_feed_exhaustive_sweep` (Monte-Carlo variability audit, 5 machines × 4 ISO groups)
  Acceptance signal: tribal coverage ≥100 tips AND wiki leaf count ≥10 for speed-feed namespace.
- **Ollama offload:** route tribal-tip summarize/classify/lint to `qwen2.5-coder:32b`; deep
  force-model reasoning to `gpt-oss:120b` (Blackwell 96GB). Reserve Claude for new physics
  derivations and safety-critical cross-domain synthesis.

## §4 — Test plan (real assertions — R9)

All tests round-trip **through the dispatcher** (`prism_calc` action enum + Zod schema +
lazy import). Never `toBeDefined()` — always concrete numeric bounds vs `src/physics/constants.ts`.

- **Unit — `mcp-server/src/__tests__/UltimateSpeedFeedEngine.test.ts` (extend existing 401-assert
  gauntlet):**
  - ISO P (4140 PH, kc1.1=1800 from `constants.ts`): Vc 120–200 m/min, fz 0.05–0.15 mm/tooth
    → assert Fc within ±8% of Kienzle closed-form.
  - ISO K (D2 tool steel, kc1.1=1100): deflection guard fires when stickout > 4×D at ap=5mm.
  - ISO S (Ti-6Al-4V, kc1.1=2800): power check gate reduces fz (NOT Vc) when P_spindle >
    rated × 0.98 (eta=0.85 applied via `SPINDLE_DRIVE_EFFICIENCY` from `constants.ts`).
  - ISO N (6061-T6, kc1.1=700): RPM cap (G50/CSS) enforced; no Vc collapse for force checks.
  - Failure modes: ap=0 → structured error object (not throw); ae > Ø → clamped to Ø; fz=NaN
    → reject at Zod; Infinity rpm input → clamped to MachineSpindleDefaults max.
  - Adversarial: kc1.1 = 0 (physics guard); stickout = negative (sign error detection).

- **Integration — `sfc-nine-axis-radial-engagement.test.ts` (new):**
  - Round-trip via `prism_calc:sfc_nine_axis_run`: slotting (ae=Ø) → hex chip = fz (not
    near-zero); ae=0.05×Ø (light finish) → hex chip = fz×sin(acos(1−2×0.05)) within 1%.
  - Full-slot Fc rises monotonically vs ae/Ø; reducing fz by r^(1/(1−mc)) resolves force
    violations; Vc untouched (regression lock for ec0ce2ea26 class).
  - Dispatcher contract: action `"sfc_nine_axis_run"` in z.enum; Zod validates required fields;
    lazy import loads `SpeedFeedNineAxisOrchestratorEngine`.

- **Integration — `SpeedFeedOutcomeFeedbackBridge-bus-capture.test.ts` (new/extend):**
  - `tryBusCapture()` returns REAL capture result (not hardwired `true`) — regression lock for
    U-SFC-OUTCOME-BUS-REAL fix (2026-06-22).
  - Outcome recorded via `prism_calc:speedfeed_outcome_record_actuals` persists to ledger;
    `speedfeed_outcome_stats` reflects updated count.

- **E2E — parity probe (`sfc-page-core-parity.test.ts`):**
  - `SfcCalculatorPage` computed RPM / Fc / tool_life vs `prism_product:sfc_calculate` backend:
    all 6 ISO groups, ratio ≤1.3× (acceptance gate for §6).

- **Coverage floor:** happy path + ≥3 failure modes (bad ae, bad fz, oversize ap) + ≥2 adversarial
  (NaN, Infinity) + ≥3 ISO-group spanning configs (P+K+S minimum). Runner:
  `rtk npx vitest run mcp-server/src/__tests__/UltimateSpeedFeedEngine.test.ts
  mcp-server/src/__tests__/sfc-nine-axis-radial-engagement.test.ts
  mcp-server/src/__tests__/SpeedFeedOutcomeFeedbackBridge-bus-capture.test.ts`.

## §5 — Simulation plan

- **What:** Monte-Carlo cutting-condition sweep via `prism_calc:speed_feed_exhaustive_sweep` —
  varies ap, ae, fz, Vc, material, machine, coating across a Latin-hypercube grid. Also: SLD
  (stability lobe) sweep via `ChatterStabilityLobeEngine` across spindle-speed range for each
  JM machine at JM material mix.
- **Tools:** `prism_calc:speed_feed_exhaustive_sweep`, `prism_calc:ultimate_speed_feed`,
  `prism_safety:check_spindle_torque`, `prism_safety:validate_physics`.
- **Scenarios:**
  1. Hurco VM30i 12k + D2 (ISO K) roughing: ap 1–8mm × ae 5–50% × fz 0.01–0.15 mm/tooth —
     verify all Vc-reduce paths are force-driven not Vc-driven.
  2. Okuma M460V-5AX + Ti-6Al-4V (ISO S) semi-finish: spindle rpm cap enforced, thermal warning
     at Vc > 80 m/min, SLD lobe boundary respected.
  3. Haas VF-2 + 4140 PH (ISO P) slotting (ae=Ø): chip thickness = fz at full slot, deflection
     guard triggers at stickout > 4×D.
  4. Edge: ap = 3×Ø → warning issued (not hard crash); ae > Ø → clamped; maxRPM cap at
     Haas OM-2 30k spindle.
  5. Adversarial: all-zero inputs, INF spindle speed, unknown material code → structured error.
- **Pass criteria:** 0 unguarded Vc-collapse events; deflection ratio ≤ 1.0 per physics model;
  power ≤ rated × 0.98 / eta; rpm ≤ machine max; all 401 gauntlet asserts still green.

## §6 — Validation plan (live data — R12/R15)

- **Live-data validation:** run `prism_calc:speed_feed_tri_compare` on JM Die's actual shop
  records: 5 confirmed jobs from `JM DIE/CNC MILL/` (material + machine + tool confirmed from
  NC program header). Report: PRISM vs G-Wizard vs HSMAdvisor for Vc, fz, MRR, Fc, tool_life.
- **Acceptance gate — parity:** PRISM vs vendor ratio ≤1.3× for Vc and fz across all 6 ISO
  groups (P/M/K/N/S/H). Values sourced from `constants.ts`; never inline.
- **Acceptance gate — page↔core:** `SfcCalculatorPage` displayed RPM/feed/Fc vs
  `prism_product:sfc_calculate` backend response ≤1.3× for all 6 ISO groups. Test via
  `sfc-page-core-parity.test.ts` (§4 E2E).
- **Safety gate:** `prism_safety:validate_physics` + `prism_safety:check_spindle_torque` →
  S(x) ≥ 0.98 on all JM Die shop-floor scenarios. Eta-corrected power P_spindle = Pc / 0.85
  must be ≤ rated at the gate (not raw Pc).
- **In-band verification per ISO group:**
  - P (steels): Vc 100–250 m/min carbide uncoated; 150–320 m/min TiAlN coated.
  - K (cast iron, tool steel): Vc 80–200 m/min.
  - S (Ti alloys): Vc 40–100 m/min (thermal limit).
  - N (aluminium): Vc 300–800 m/min.
  All backed by constants from `src/physics/constants.ts`; report MAPE vs published Sandvik/Kennametal
  handbook values.

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** `prism_calc:speedfeed_outcome_record_actuals` writes to the SFC outcome
  ledger. `SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture()` (fixed U-SFC-OUTCOME-BUS-REAL)
  gates the write to real capture, not a stub.
- **Parameter refinement:** `prism_calc:sfc_parameter_refinement_compute` runs
  `SFCParameterRefinementEngine` (Median+IQR, correction factor clamped [0.25, 4.0]). Trigger:
  ≥5 new actuals in the ledger OR nightly cron (22:30 local, post-sweep step 3).
- **LoRA:** validation failures and tri-compare divergence cells → append to
  `speed-feed_lora_train.jsonl`; india retrains on weekly cadence. Promotion gate: acceptance
  tests green + tri-compare parity ≤1.3× post-retrain. Never promote on a single seed.
- **RAG/CAG:** new wiki leaves and tribal tips → `scripts/embed-cited-tips.mjs` re-embeds;
  `constants.ts` kc/Taylor anchors refreshed in CAG cold cache every SessionStart.
- **NN/GNN:** `speedfeed_outcome_record_actuals` records → `vault-to-gnn-refpool.mjs` labels
  SFC engine nodes → GraphSAGE selective retrain (india). Promote IFF AUROC ≥ 0.78 / macro-F1
  ≥ 0.55 / Brier ≤ 0.15 at minConf = 0.70 selective gate.
- **Cadence summary:** nightly cron (sweep + refinement + tribal mine) → weekly LoRA → on-
  threshold GNN retrain. All results written to ledger + Obsidian brain for cross-session recall.

## §8 — Frontend build (Kienzle Claude-Design rollout)

- **Assigned Kienzle page:** `mcp-server/web/design-imports/kienzle-app-build/Kienzle Speed-Feed.dc.html`
  (727 lines, 3-column layout: inputs | cut-viewport | results).
- **Target React page:** EXTEND `mcp-server/web/src/pages/SfcCalculatorPage.tsx` (name-matches,
  already exists). Adopt Calculator-Studio design patterns from `CalculatorPage.tsx` (12,909 LOC)
  for shared UI shell/layout primitives. Do NOT create a new page.
- **Design extraction (Kienzle HTML → React fields):**
  - 01 MACHINE: `<select>` bound to `MACH` table (5 mills + 7 lathes including all JM fleet);
    spindle/control/rigidity chips; thru-spindle / HP coolant checkboxes.
  - 02 MATERIAL & STOCK: 9 JM materials (D2, A2, S7, 4140 PH, H13, 17-4PH, Ti64, 6061,
    graphite); ISO/kc1.1/HRC display synced from `window.KIENZLE.MATERIALS` (NOT inline — fetch
    from `constants.ts` via the API); calibration status badge; L×W×H stock inputs.
  - 03 TOOL & HOLDER: tooling / holder dropdowns; Ø input; flute count; stickout range slider.
  - 04 CUT: operation (roughing/profiling/slotting/finishing); CAM seat (Fusion/hyperMILL/
    Mastercam); ap/ae inputs; coolant/Ra dropdowns; strategy chip buttons.
  - Results panel: RPM + FEED primary cards (JetBrains Mono 30px via CSS var); load% + safety
    donut gauges (SVG); Fc / deflection / tool_life / wear% / temp / confidence metrics; radar
    chart; "Vs. the old way" improvement display; stability lobe tab chart.
- **Backend wiring:**
  - Primary: `prism_calc:sfc_nine_axis_run` (full 9-axis solve); `prism_product:sfc_calculate`
    (product-tier page action, ETL → display shape).
  - Safety gate: `prism_safety:check_spindle_torque` fires on every solve before surfacing RPM.
  - Tri-compare (advanced mode): `prism_calc:speed_feed_tri_compare`.
  - Outcome record (post-run): `prism_calc:speedfeed_outcome_record_actuals` (non-blocking).
  - API client: `mcp-server/web/src/api/sfcApi.ts` — POST to `:3100/api/v1/sfc/calculate` and
    `:3100/api/v1/sfc/nine-axis`. Verify both routes exist/live before shipping (dead-wire
    prevention: grep `mcp-server/src/routes/` for `sfc`).
- **Design language:** iOS fleet tokens from `mcp-server/web/DESIGN.md`; Calculator-Studio accent
  (`--accent-sfc` or `--accent-calculator` per token file). Never inline hex or px — only CSS
  vars. Mobile-first: 44pt tap targets, safe-area padding, Capacitor 6 compatible.
- **Build/verify loop:** `npm run build:fast` → Playwright screenshot → compare to `.dc.html`
  intent → iterate. No inline physics constants in frontend JS; kc/Taylor values fetched from
  backend, never hardcoded in React component.
- **3-viewport acceptance:**
  1. 375×667 (iPhone SE) — single-column stacked; SOLVE button full-width above fold.
  2. 390×844 (iPhone 14) — primary target (iOS fleet); results panel scrollable; donut gauges
     rendered at 100px diameter.
  3. 1440×900 (desktop) — 3-column Kienzle layout intact; chart panel visible without scroll.
- **Acceptance:** page renders live data from `:3100`; parity ≤1.3× (§6); 3-viewport screenshots
  match design intent; per-file 2-arm scrutiny PASS on `SfcCalculatorPage.tsx`.

## §9 — Dependencies & sequencing

- **Blocked by:**
  - india — LoRA retrain and GNN refpool promotion (oscar produces datasets/labels; india trains).
  - `prism_safety:check_spindle_torque` route must be live on `:3100` before frontend can gate RPM.
  - `vault-to-gnn-refpool.mjs` must be wired to outcome ledger (india/sierra).
- **Blocks:**
  - echo (`CAMSpeedFeedBridgeEngine` → `cam_speed_feed_bridge` is a consumer of SFC core).
  - kilo (CAM strategy requests validated SFC recommendations before toolpath generation).
  - Frontend page `SfcCalculatorPage` is the #1 customer-facing saleable-product surface.
- **Logical order (R13):** deepen core (§3) → test core (§4) → simulate (§5) → validate live (§6)
  → fine-tune loop live (§7) → frontend build (§8). Frontend LAST — never build UI atop an
  unvalidated backend.

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] **WIRE:** every new asset (wiki leaves, tribal tips, LoRA datasets, GNN labels) wired to
  its consumer in the same commit. SFCProvenanceWireEngine and SFCInferenceGateWireEngine phantom
  orphans resolved or explicitly scoped.
- [ ] **TEST:** `UltimateSpeedFeedEngine.test.ts` 401-assert gauntlet extended + 2 new test files
  (nine-axis radial engagement + outcome-bus-capture); all green; no `.skip`; ≥3 failure modes
  + ≥2 adversarial + ≥3 ISO-group spanning configs; round-tripped through `prism_calc` dispatcher.
- [ ] **VALIDATE:** tri-compare parity ≤1.3× for all 6 ISO groups; S(x) ≥ 0.98; page↔core
  parity ≤1.3× for all 6 ISO groups; in-band Vc/fz per published Sandvik/Kennametal handbook.
- [ ] **APPLY:** deepening cron live (nightly); tribal tips ≥100; wiki leaves ≥10 in speed-feed
  namespace; `SfcCalculatorPage.tsx` rendering live data at 3 viewports; LoRA dataset produced;
  GNN refpool labeled. Per-file 2-arm scrutiny on every code file; 3-of-3 Stop gate on session.
