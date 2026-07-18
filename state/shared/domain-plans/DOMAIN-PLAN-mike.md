---
artifact: domain-buildout-plan
slot: mike
galaxy: wedm
galaxy_dir: mcp-server/src/engines/wedm/
kienzle_pages: [Kienzle Wizards.dc.html]
backend_dispatchers: [prism_edm]
frontend_owner: quebec
status: draft
generated_by: mike-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — MIKE (WEDM)

> Finalized plan to take the wedm galaxy to **PhD-master depth**, then **test → simulate →
> validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** Wire EDM — rough cuts, skim cuts, taper cuts, thread cuts, no-core cuts, micro-EDM
  (fine wire). Material removal is thermal-electric discharge, NOT mechanical chip formation.
  Covers the full pipeline: DXF/STEP profile import → feasibility → multi-pass strategy (rough +
  N-skim) → flushing adequacy gate → NC emit (5 vendor dialects) → surface integrity / HAZ
  validation. JM Die primary machine: Mitsubishi FA-10S (deionized water dielectric).
- **Excludes:** Sinker-EDM · fast-hole EDM · micro-hole EDM · chip-formation processes
  (→ mill/foxtrot, lathe/whiskey). `JM DIE/CNC LATHE/NORTHERN WIRE/` is a lathe CUSTOMER,
  not wire-EDM programs.
- **Slot worktree:** `H:/prism-slot-mike` · branch `slot/mike`
- **Galaxy brain:** `mcp-server/src/engines/wedm/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

---

## §2 — Current state (verified, not assumed — R12)

- **Scaffolding:** PARTIAL — MEMORY.md is an auto-filled stub (status: "awaiting U-GALAXY-MS1-C1
  migration + wedm-soul slot assignment"). CLAUDE.md is fully authored with verified engine
  cluster map, dispatcher quick-ref, and domain gotchas. AWARENESS.md was not found on disk.
- **Engines / dispatcher actions:** 164 engine files (145 `WEDM*.ts` + 19 `EDM*.ts`) flat under
  `mcp-server/src/engines/`. Dispatcher: `edmDispatcher.ts` (3,262 lines, 280 `wedm_` actions
  under `prism_edm`). Key large engines: `EDMQualityOrchestratorEngine.ts` (102K),
  `EDMPostProcessGCodeEngine.ts` (126K), `EDMCuttingParamFlushEngine.ts` (71K),
  `EDMStartHoleSetupEngine.ts` (48K). 14 AI engines owned (e.g. `WEDMAnalogicalReasoningEngine`,
  `WEDMLoRAAdapterEngine`, `WEDMLoRACadenceEngine`). 23 AI dispatcher actions wired.
- **PSN 11-leg health:**
  - Engines (leg #6): STRONG — 164 files, cluster map complete
  - Tribal (leg #5): PARTIAL — 122 tips in `wedm-knowledge-tips.ts`; 73 memory-heuristic tribal
    tips; 5 JM-Die `tribal-wedm-jmd-00{1-5}.md` files; 89 tip files at `knowledge/tribal/wedm-*`
  - Wiki (leg #3): PARTIAL — 6 verified entries + `_staging/deep-domain-research-2026-06-09.md`
    (UNVERIFIED numerics; owner-gate for mike before any engine use)
  - Memories (leg #2): 25 curated files; auto-filled synthesis
  - Algorithms (leg #7): mapped — `signal_savgol`, `ml_dtw`, `ml_viterbi`, `ml_beam_search`,
    `ml_gmm`, `ml_knn`, `spatial_ransac_fit` all available via `prism_algorithm`
  - NN/GNN (leg #9): wired to GNN tier-5 via cross-substrate edges; AUROC still subgating
  - LoRA (leg #10): `wedm_synthesis.md` feeds vault→LoRA pipeline; cadence engine exists
  - Obsidian/brain (leg #1): auto-fed via stop hook; master-index back-pointer wired 2026-05-29
  - System-viz (leg #4): ghost roost nodes exist; PSN leg health not yet audited
  - Formulas (leg #8): THIN — no dedicated `wedm-formulas.md` wiki leaf
  - PRISM-AI (leg #11): THIN — AI orchestration documented but untested per MEMORY.md
- **Known landmines (R12):**
  - CLAUDE.md §5 gotchas are "HINT-LEVEL, not knowledge" — they come from literature, NOT
    verified wedm-soul first-hand experience with PRISM's FA-10S. Must replace with verified
    data before relying on them for safety gates.
  - `_staging/deep-domain-research-2026-06-09.md` contains UNVERIFIED numeric cutting constants
    (discharge energy/MRR/recast/Ra/spark-gap/offset/temp) — mike-owner-gate; do NOT promote to
    engines until validated against `jm-die-wedm-tech-tables.ts` + FA-10S observed data.
  - Advanced AI orchestration (`ai_wedm_agi_orchestrate`) documented but integration/testing
    noted as needing further refinement (MEMORY.md §Known failure modes).
  - Kienzle/Taylor constants DO NOT APPLY to EDM — any engine that imports chip-formation
    physics constants from `constants.ts` for EDM computations is a silent physics error.

---

## §3 — Deepening roadmap → PhD master

> "PhD master" = an engineered loop, not a one-shot. Bounded, concrete, cron-driven.

- **Tribal tips to add:** Current: ~122 tips in `wedm-knowledge-tips.ts` + 73 memory-heuristic
  hits. Target: 200 total verified tips. Sources: JM Die FA-10S operator logs
  (`JM DIE/WIRE EDM/` — access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` only,
  never Glob the 4,058-file tree), Mitsubishi FA-10S manual E-code family tables, wire vendor
  spec sheets (`wire-spec-sheets.ts`), `_staging/` VERIFIED-PARTIAL promotions.
  Capture via `prism_knowledge:tribal_capture slot=mike` — never direct markdown.
  Priority topics: no-core sequencing consequences (tab timing), bi-material compensation
  numerics for carbide/steel stacks, taper-cut wire-deflection measured offsets per FA-10S.

- **Wiki entries to write/cross-link** (missing leaves, load-bearing):
  - `knowledge/wiki/wedm/wedm-formulas.md` — discharge energy formula (E = ½CV²), MRR model
    (gap-voltage / pulse-frequency relationship), recast depth prediction equation, wire-break
    probability model. All cite `src/physics/constants.ts` + `jm-die-wedm-tech-tables.ts`.
  - `knowledge/wiki/wedm/wedm-fa10s-tech-tables.md` — E12XX/E28XX pass family decode,
    per-pass power/speed/offset canon for JM Die FA-10S (verified against the `.ts` source).
  - `knowledge/wiki/wedm/wedm-ai-orchestration.md` — how `WEDMAnalogicalReasoningEngine` +
    `WEDMLoRAAdapterEngine` + `WEDMLoRACadenceEngine` wire together; current health; gaps.
  - Cross-link `wedm-foundations.md` ↔ `wedm-applied-practice.md` ↔ `wedm-formulas.md` via
    `[[wikilinks]]`; cross-link `tribal-wedm-jmd-001..005` → the new formula leaf.

- **Memories to write:**
  - `reference/reference_mike_fa10s_epass_verified_2026-06-26.md` — verified E-code families
    from `jm-die-wedm-tech-tables.ts` (after owner-gate validation)
  - `feedback/feedback_mike_no_kienzle_in_edm.md` — standing doctrine: Kienzle/Taylor are
    chip-formation only; EDM heat-flux physics are separate; cite the CLAUDE.md §6 refuse
  - `reference/reference_mike_staging_promotion_gate_2026-06-26.md` — which numerics from
    `_staging/deep-domain-research-2026-06-09.md` passed FA-10S validation and which did not

- **RAG corpus:** `wedm-knowledge-tips.ts` (122 tips) + 89 `knowledge/tribal/wedm-*` tip files
  + 5 `tribal-wedm-jmd-*.md` files + 6 verified wiki leaves. Target: fully embedded in
  fleet's 768d HNSW index (`node-embeddings-768d.jsonl`). Run:
  `node scripts/embed-knowledge-store.mjs --domain wedm` after each new wiki/tribal write.

- **CAG cold-anchor:** Cache `mcp-server/src/engines/wedm/CLAUDE.md` §§2-7 (engine cluster map,
  dispatcher quick-ref, gotchas, pipeline contract) via `scripts/lib/cag-router.mjs`. This
  doctrine is stable and read on every UserPromptSubmit for the mike slot — CAG cost = ~0.

- **NN/GNN features:** The 14 AI engines + `EDMQualityOrchestratorEngine` +
  `WEDMPostDialectRouterEngine` are the highest-priority ghost nodes for feature vectors.
  Feed `state/shared/nn-graph/node-embeddings-768d.jsonl` with their docstring + action
  embeddings. Owner: india (via `scripts/build-galaxy-node-embeddings.mjs --galaxy wedm`).

- **LoRA dataset:** `wedm_lora_{train,test}.jsonl` under `mcp-server/data/lora/`.
  Sources: verified tribal tips reformatted as instruction pairs + JM Die FA-10S program
  patterns from `jm-die-wedm-program-patterns.ts` + closed-loop outcome ledger entries.
  India trains via `CrossProcessNeuralLearningEngine`. `WEDMLoRAAdapterEngine` +
  `WEDMLoRACadenceEngine` already exist — connect them to the india LoRA substrate.

- **Engineered loop + cron:**
  Nightly scheduled task: `node scripts/mine-galaxy-transcripts.mjs --galaxy wedm` (Ollama
  qwen2.5-coder:32b summarizes) → synthesis → auto-appends to `wedm_synthesis.md` →
  `vault-to-lora-dataset.mjs` picks it up → india retrains on threshold. Cadence: nightly
  02:47 (phase-offset from the fleet). Acceptance signal: tribal tip count ≥ 200 AND wiki
  leaf coverage ≥ 8 entries AND LoRA dataset ≥ 500 instruction pairs.

- **Ollama offload:** Route to local `qwen2.5-coder:32b` (default): E-code program summarize,
  wiki-leaf lint, tribal tip classify, diff-summary. Route to `gpt-oss:120b` for
  discharge-physics derivation and multi-pass strategy reasoning. Deep domain reasoning +
  safety-gate evaluation stays on Claude (not Ollama). CLI: `node scripts/lib/galaxy-reasoning-bridge.mjs wedm "<question>"`.

---

## §4 — Test plan (real assertions — R9)

- **Unit — core physics engines (reference-value / algebraic-invariant):**
  - `EDMFeasibilityEngine.test.ts` — assert conductivity check blocks pure ceramics (Al₂O₃),
    passes D2 steel and C2 carbide; geometry aspect-ratio gate triggers at h/w > 100.
  - `EDMCuttingParamFlushEngine.test.ts` — MRR algebraic invariant: doubling pulse energy
    increases MRR proportionally (not linearly — verify exponent against
    `jm-die-wedm-tech-tables.ts` E12XX family); flushing pressure output is monotone
    increasing in cut depth. Constants sourced from `jm-die-wedm-tech-tables.ts`, never inline.
  - `WEDMTaperErrorBudgetEngine.test.ts` — corrected taper angle < nominal angle for any
    wire stiffness > 0; at stiffness → ∞, corrected → nominal. Reference: deflection
    offset measured on JM Die FA-10S E28XX_TAPER_5PASS family.
  - `WEDMWireDeflectionEngine.test.ts` — deflection = 0 at zero tension; monotone decreasing
    in tension for fixed wire speed; carbide high-break-risk flag at tension > 95% rated break.
  - `WEDMGapVoltageControlEngine.test.ts` — working gap voltage strictly less than OC voltage
    for any valid dielectric condition; NaN input → structured error, not throw.
  - `EDMMultiPassStrategyEngine.test.ts` — 3-skim schedule for ±0.0001" tolerance on carbide;
    pass offsets decrease monotonically; final offset equals spark-gap compensation from
    `jm-die-wedm-tech-tables.ts` E-code family.

- **Integration — through the dispatcher (not singleton):**
  - `edmDispatcher.integration.test.ts` — round-trip `prism_edm:wedm_assess_feasibility` with
    Zod schema validation; `wedm_plan_passes` returns rough + N-skim schedule with N ≥ 1;
    `wedm_generate_gcode` returns a non-empty string containing the correct dialect header;
    `wedm_full_multipass` chains feasibility → pass plan → flush calc → gcode without error;
    lazy-import verified (no eager engine load at dispatcher init).

- **E2E — JM Die live data:**
  - Carbide form punch (C2, ±0.0001", trilobe) → full pipeline → assert 4-pass program with
    Mitsubishi dialect header, `H000` wire-radius offset line, high-pressure flush `M98`
    present, total time estimate within ±15% of JM Die historical 1.8 hr.
  - D2 steel die insert → `E12XX_STANDARD_4PASS` → assert pass offsets decrease, final Ra
    prediction ≤ 0.4 µm, safety gate PASS (conductivity + feasibility + flush adequacy all
    satisfied).

- **Coverage floor:**
  - Failure modes (≥3): (1) non-conductive material (ceramic) → `wedm_check_conductivity`
    returns `conductiveEnough: false`, blocks NC emit; (2) taper angle > mechanical limit of
    FA-10S UV guide → `WEDMTaperErrorBudgetEngine` returns error with recommended max;
    (3) insufficient flush pressure for cut depth > 80 mm → `wedm_dielectric_flush_calc`
    returns `flushAdequate: false` with reason.
  - Adversarial (≥2): (1) NaN wire tension input → structured `{error, code}` not throw;
    (2) zero-thickness stock → feasibility gate blocks with `geometryError`.
  - Spanning configs (≥3): (1) D2 steel / E12XX / 4-pass / Mitsubishi-FA10S dialect;
    (2) 17-4 PH stainless / E28XX taper / 5-pass / Sodick-AQ dialect;
    (3) C2 carbide / micro-EDM wire / 3-skim / Agie dialect.

- **Target test files to add/extend:**
  `src/__tests__/EDMFeasibilityEngine.test.ts` ·
  `src/__tests__/EDMCuttingParamFlushEngine.test.ts` ·
  `src/__tests__/WEDMTaperErrorBudgetEngine.test.ts` ·
  `src/__tests__/WEDMGapVoltageControlEngine.test.ts` ·
  `src/__tests__/EDMMultiPassStrategyEngine.test.ts` ·
  `src/__tests__/edmDispatcher.integration.test.ts` (extend or create)

- **Runner:** `cd mcp-server && rtk npx vitest run -t "EDM|WEDM"` · CI gate green before commit.

---

## §5 — Simulation plan

- **What to simulate:** Discharge-parameter dry runs (no physical machine) via the existing
  `EDMQualityOrchestratorEngine.ts` (102K) orchestrating the full pass sequence; wire-break
  risk Monte Carlo over pulse-energy × wire-tension × material parameter space; gap-voltage
  control PID step-response simulation using `WEDMGapVoltageControlEngine`.

- **Tools:** `prism_edm:wedm_full_multipass` (dispatched) · `prism_edm:wedm_predict_wire_break`
  (risk surface) · `prism_calc` for energy/power baseline checks ·
  `prism_algorithm:ml_gmm` (discharge-regime clustering) ·
  `prism_algorithm:signal_savgol` (gap-voltage trace pre-processing before feature extraction).

- **Scenarios (≥3 real JM-Die + ≥2 adversarial):**
  1. **Carbide form punch (JM Die)** — C2, 0.75" thick, ±0.0001", 0.008" brass wire.
     Assert: 4-pass program, total MRR = 0.42 in²/hr ± 20%, wire-break risk LOW,
     final Ra ≤ 4 µin.
  2. **D2 die insert (JM Die)** — D2 58HRC, 1.5" thick, E12XX_STANDARD_4PASS.
     Assert: 4-pass offsets decrease, flush pressure adequacy PASS for 1.5" depth,
     cycle time within 25% of historical program in `jm-die-wedm-program-patterns.ts`.
  3. **Taper guide profile (JM Die)** — SS 316, E28XX_TAPER_5PASS, UV differential guide,
     15° nominal taper. Assert: corrected angle < 15° (deflection compensation applied),
     gap voltage working < OC voltage by expected dielectric factor.
  4. **Adversarial: zero dielectric flow** — flush pressure = 0 psi. Assert: pipeline
     blocks at `wedm_dielectric_flush_calc` with `flushAdequate: false`; no NC emitted.
  5. **Adversarial: wire break saturation** — titanium alloy, aggressive E-code, maximum
     cut speed. Assert: `wedm_predict_wire_break` returns HIGH risk and NC emit is gated.

- **Pass criteria (numeric, with tolerance bands):**
  - MRR predictions within ±20% of `jm-die-wedm-tech-tables.ts` reference values per pass.
  - Cycle time within ±25% of historical JM Die programs from `jm-die-wedm-program-patterns.ts`.
  - Wire-break risk LOW for all brass-wire + standard-steel scenarios.
  - Final Ra ≤ Ra_target × 1.1 (within 10% of spec) after the final skim pass.

---

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:** Run against JM Die FA-10S programs in
  `JM DIE/WIRE EDM/` (accessed via `prismSelfAwarenessEngine.getJMDieCustomerPath()`).
  Pull 5 real programs representing the 3 E-code families + 2 taper variants. Compare
  PRISM-generated NC output vs historical JM Die operator NC programs:
  line-by-line offset values, E-code family assignment, flush-mode commands, pass count.

- **Acceptance gates (numeric):**
  - Parity probe: PRISM frontend `WireEdmWizardPage` output vs backend `prism_edm` core
    output — pass-count, offset values, and cycle estimate must agree within ±5%.
  - MRR prediction MAPE ≤ 20% vs JM Die historical cycle-time records.
  - Pass offset sequence: each skim offset < prior skim offset (monotone decreasing) — 100%.
  - Dialect header: Mitsubishi-FA10S output must contain `H000`, `M98` flush-on, correct
    G-code modal group initializers for FA-10S — verified against
    `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/PRISM-Master-Mitsubishi-FA10S-WEDM.cps`.

- **Safety gate:** `prism_safety:validate_physics` on every wedm NC emit. EDM is NOT
  chip-formation — the safety gate must verify: (1) feasibility pre-check ran and passed;
  (2) flush adequacy gate ran and passed; (3) no chip-formation constants (Kienzle kc1.1,
  Taylor C/n) appear in the parameter chain. S(x) ≥ 0.98 required before release.

- **Parity probe:** `WireEdmWizardPage` Step 6 "Post & release" displayed cycle-time and
  pass offsets must match `prism_edm:wedm_generate_complete_program` response values to
  within ±5%. Automated via Playwright: submit form → read displayed values → compare to
  direct dispatcher call with same inputs.

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** write sim/validation outcomes to the wedm closed-loop ledger via
  `xproc_outcome_publish {slot: 'mike', domain: 'wedm'}` (verify action name via grep of
  india dispatcher before calling — CLAUDE.md §10 flags this as UNVERIFIED).
  Ledger path: `mcp-server/data/state/wedm-outcomes.jsonl` (schema-versioned, APPEND-ONLY).

- **LoRA:** Failed predictions (MRR off > 20%, wrong E-code family selection, wire-break
  risk mis-rated) → augment `wedm_lora_train.jsonl` with the corrected instruction pair.
  India retrains `WEDMLoRAAdapterEngine` via `CrossProcessNeuralLearningEngine`. Promote
  IFF: MAPE on held-out wedm test set ≤ 20% AND wire-break risk classification accuracy ≥ 85%.

- **RAG/CAG:** New validated facts from JM Die FA-10S programs → write to
  `wedm-knowledge-tips.ts` (canonical) → re-embed: `node scripts/embed-knowledge-store.mjs
  --domain wedm`. Refresh CAG cold-anchor for `wedm/CLAUDE.md` §§2-7 after any doctrine edit.
  Promote validated `_staging/` numerics → `wedm-foundations.md` / `wedm-formulas.md` per
  owner-gate: mike verifies numeric against FA-10S observed data before promotion.

- **NN/GNN:** New labeled node→dispatcher pairs from integration tests → append to
  `state/shared/nn-graph/refpool-wedm.jsonl` → feed into india's `nn-graph-retrain-lifecycle`
  pre-retrain stage. Promote IFF AUROC ≥ 0.78 / macro-F1 ≥ 0.55 / Brier ≤ 0.15 at the
  selective-deploy gate (`GNN_DEFAULTS.minConf=0.7`).

- **Trigger + cadence:** Nightly cron at 02:47 (fleet-offset): mine transcripts → synthesis
  → LoRA dataset update. LoRA retrain triggers when `wedm_lora_train.jsonl` grows by ≥ 50
  new pairs since last retrain. GNN retrain triggers when refpool grows by ≥ 10 new labeled
  wedm nodes (matches the `nn-graph-retrain-lifecycle` threshold contract).

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

- **Assigned Kienzle page:** `Kienzle Wizards.dc.html` — Wire EDM tab (`proc: 'wire'`).
  The design defines a 6-step wizard: (1) Import profile (DXF), (2) Machine & wire setup,
  (3) Pass strategy (rough + N-skim), (4) Power & speed (generator settings per pass),
  (5) Simulate & verify (wire path, tab, lead-in), (6) Post & release (dialect + safety gate).
  Right panel: live-building G-code preview (line-numbered, syntax-colored). Left nav:
  step progress list with ✓/active/pending states. Header: machine type tab switcher
  (Milling / Lathe / Wire EDM). Bottom-right panel footer: Est. cycle time + Safety gate status.

- **Target React page:** `mcp-server/web/src/pages/WireEdmWizardPage.tsx` — EXTEND this
  existing page (Codex Page Protection: do NOT create a new page). Analyze the existing
  component structure before editing. The Kienzle design maps 1:1 to the wizard flow this
  page already implements; the gap is wiring live dispatcher calls and adding the Kienzle
  design tokens + step-panel layout from the `.dc.html`.

- **Backend wiring (prism_edm dispatcher → :3100 routes):**

  | Wizard step | Dispatcher action | :3100 route (confirm/add) |
  |-------------|-------------------|---------------------------|
  | Step 1 — Import profile | `prism_edm:wedm_interpret_drawing` | `POST /api/v1/edm/interpret-drawing` |
  | Step 2 — Machine & wire | `prism_edm:wedm_select_wire` + `wedm_assess_material` | `POST /api/v1/edm/select-wire` |
  | Step 3 — Pass strategy | `prism_edm:wedm_plan_passes` | `POST /api/v1/edm/plan-passes` |
  | Step 4 — Power & speed | `prism_edm:wedm_generate_toolpath` | `POST /api/v1/edm/generate-toolpath` |
  | Step 5 — Simulate | `prism_edm:wedm_predict_wire_break` + `wedm_dielectric_flush_calc` | `POST /api/v1/edm/simulate` |
  | Step 6 — Post & release | `prism_edm:wedm_generate_complete_program` + `wedm_assess_surface_integrity` | `POST /api/v1/edm/generate-program` |
  | Live G-code panel | `prism_edm:wedm_generate_gcode` (incremental) | `POST /api/v1/edm/generate-gcode` |
  | Cycle estimate | `prism_edm:wedm_estimate_time` | `POST /api/v1/edm/estimate-time` |
  | Safety gate | `prism_safety:validate_physics` | `POST /api/v1/safety/validate` |

  API client: `web/src/api/edmClient.ts` (create or extend). Verify each route exists in
  `mcp-server/src/routes/` before assuming it is live — dead wire = silent failure (R12).

- **Design language (from `Kienzle Wizards.dc.html` wire tab + web/DESIGN.md tokens):**
  - Background: `#0A0B0D` / `#0B0C0F` / `#0C0D10` (matches design; map to `var(--surface-1/2/3)`)
  - Accent: `#FF5A2B` (Kienzle orange — PRISM status "active/accent"; map to `var(--accent)`)
  - Status colors: `#36D399` (pass/ready) · `#F4B740` (in-progress/warning) · `#7FB2FF` (calc/info)
  - Typography: `Space Grotesk` headings · `Archivo` body · `JetBrains Mono` all numeric + G-code
  - Step nav active: `background: linear-gradient(180deg, rgba(255,90,43,0.12), transparent)` +
    `border: 1px solid rgba(255,90,43,0.4)` — map to `var(--accent)` with 0.12/0.4 opacity
  - G-code panel: dark monospace code view, line numbers in `#3A3D44`, syntax colors per token type
  - Tap targets: all buttons ≥ 44pt (`h-11`); Step nav items ≥ 44px height on mobile
  - iOS fleet language: critically-damped framer-motion spring on step transitions
    (`stiffness: 500, damping: 34`); `<MobileSafeArea>` wrapper; `inputMode="decimal"` on all
    numeric inputs; bottom-centered CTAs on mobile (Back ←  / Next → / Release buttons)
  - Never inline hex/px — always reference `src/index.css` CSS variables or `DESIGN.md` tokens

- **Build/verify loop:**
  Edit `WireEdmWizardPage.tsx` → `npm run build:fast` (3s) → Playwright screenshot at:
  (1) desktop 1360×852 (matches `.dc.html` viewport), (2) iPhone 14 390×844, (3) Pixel 7
  412×915. Compare to `.dc.html` Wire EDM tab visual intent. Iterate until all 3 viewports
  match design and live data round-trips through `:3100`.

- **Acceptance:**
  - Page renders all 6 wizard steps with step-nav + main-panel + G-code live preview layout.
  - Live data round-trips: submitting Step 1 (DXF profile) populates Step 2 fields via
    `prism_edm:wedm_interpret_drawing`; Step 6 "Release" button calls
    `wedm_generate_complete_program` and displays downloadable NC + cycle estimate.
  - Parity with backend (§6): displayed cycle time and pass offsets match dispatcher response ±5%.
  - Safety gate status shows PASSED (green `#36D399`) or FAILED (red) in the bottom-right panel
    footer from `prism_safety:validate_physics` result.
  - 3-viewport screenshots match design intent at desktop + iPhone 14 + Pixel 7.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - india: LoRA retrain substrate (`CrossProcessNeuralLearningEngine`) + GNN refpool pipeline
  - quebec: shared UI shell (`MobileSafeArea`, `ResponsiveTable`, bottom tab bar) + merge of
    `WireEdmWizardPage.tsx` changes (frontend owner)
  - echo (post-processor): `EDMPostProcessGCodeEngine` / `WEDMPostDialectRouterEngine` — verify
    the Mitsubishi-FA10S post emits correct dialect before PRISM-generated programs are released

- **Blocks:**
  - quality galaxy: `EDMMonitorSurfaceIntegrityEngine` SPC feeds (discharge-driven Ra gates must
    be validated here first before quality/SPC can trust them)
  - business/hotel: `EDMCostDocumentationEngine` → ERP wire-reorder loop depends on validated
    cycle-time estimates from this plan's §6 validation
  - ai-training/india: `WEDMLoRAAdapterEngine` training dataset requires §3 LoRA corpus build

- **Logical order (R13):** Verify `_staging/` numerics + owner-gate (§2 landmine) →
  write wiki formulas leaf (§3) → extend test suite (§4) → simulation dry-runs (§5) →
  live FA-10S validation (§6) → LoRA/GNN fine-tune loop (§7) → frontend extension (§8).
  Frontend is LAST — never build the UI atop an unproven backend.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: `_staging/` numeric promotions, new wiki leaves, and any new helper engines wired
      to `prism_edm` dispatcher in the same commit (no orphans). `stop_on_unwired_assets`
      green (no new orphan engine files).
- [ ] TEST: All 6 target test files green via `rtk npx vitest run -t "EDM|WEDM"`. Happy path +
      ≥3 failure modes + ≥2 adversarial + ≥3 spanning configs. Round-trip through dispatcher.
      No `.skip`-ped tests.
- [ ] VALIDATE: Live JM Die FA-10S program comparison complete. MRR MAPE ≤ 20%.
      Cycle-time estimate within ±25% of historical. Parity probe ≤ ±5%. S(x) ≥ 0.98.
      Staging numerics either promoted (verified) or explicitly deferred with a written reason.
- [ ] APPLY: Deepening cron (nightly 02:47) live and producing tribal tip count growth.
      LoRA dataset ≥ 500 instruction pairs in `wedm_lora_train.jsonl`.
      `WireEdmWizardPage.tsx` rendering live dispatcher data with 3-viewport screenshots
      matching the `.dc.html` Wire EDM tab design. Parity passing.
- [ ] Per-file 2-arm scrutiny on every code file changed in this buildout.
      3-of-3 Stop gate (`node .claude/scripts/scrutiny-3way.mjs`) on the final session.
