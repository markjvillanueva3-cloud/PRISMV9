---
artifact: domain-buildout-plan
slot: foxtrot
galaxy: mill
galaxy_dir: mcp-server/src/engines/mill/
kienzle_pages: ["Kienzle Wizards.dc.html"]
backend_dispatchers: [prism_mill]
frontend_owner: quebec
status: draft
generated_by: foxtrot-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — FOXTROT (MILL)

> Finalized plan to take the mill galaxy to **PhD-master depth**, then **test → simulate →
> validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle Claude-Design
> build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** face milling, end milling (square/ball/bull-nose/tapered), pocket, contouring,
  helical interpolation, ramping, plunging, profiling, slotting, thread milling, chamfering,
  deburring, engraving, drilling-via-mill (helical drilling), 3-axis + indexed 4th/5th +
  simultaneous 5-axis. HyperMILL CAM bridge (`mcp-server/src/engines/hypermill/`) is a
  sub-galaxy owned by foxtrot. JM Die VMC fleet: VMC-01..04 (Haas NGC) + VMC-05 (Hurco
  WinMax `.hnc`). Dominant materials: P-group (1018/1045/4140/4340), K-group (6061/7075),
  S-group specialty (Ti-6Al-4V, Inconel 718, D2 tool steel 58 HRC).
- **Excludes:** turning → whiskey; wire-EDM → mike; G-code emission/post-processor → echo;
  additive (no canonical galaxy). Mill-turn bridge (`Fusion360MillTurnBridgeEngine`) lives at
  the mill–lathe interface; memories go under `cross-galaxy/mill-lathe/`.
- **Slot worktree:** `H:/prism-slot-foxtrot` · branch `slot/foxtrot`
- **Galaxy brain:** `mcp-server/src/engines/mill/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

---

## §2 — Current state (verified, not assumed — R12)

- **Scaffolding:** PARTIAL — 5-of-13 galaxy artifacts confirmed (CLAUDE.md fully populated by
  alpha; MEMORY.md stub awaiting U-GALAXY-MS1-C1 migration; PATHS.md/TOOLBELT.md present;
  AWARENESS.md auto-generated 2026-06-11). AI-synergy audit scores discoverability=1,
  ownsOrWiresAi=1, vaultSynergy=1, crossSubstrate=1 (composite from AWARENESS.md).
- **Engines / dispatcher actions:** 222+ mill `.ts` engines flat in `mcp-server/src/engines/`
  (not yet migrated into `mill/` subdir). Verified subset from CLAUDE.md §2:
  `AdaptiveMillingChipLoadMonitorEngine`, `AdvancedMillingStrategiesEngine`,
  `MillingForceEngine`, `MillingAGIMasterEngine`, `MillProgramOptimizerEngine`,
  `MillStrategyNeuralEngine`, `MillKinematicsCollisionEngine`, `TrochoidalMillingEngine`,
  `Fusion360MillTurnBridgeEngine`, `BallEndMillEngine`, `ChamferMillingEngine`,
  `HelicalMillingEngine`, `HighFeedMillingEngine`, `HurcoV11MillMasterPostEngine`,
  `HyperMillAIOrchestrationEngine`. 19 AI engines (4 neural, 15 LoRA). `prism_mill`
  exposes **49 actions** (key: `mill_physics_force`, `mill_validate_safety`,
  `mill_strategy_recommend`, `mill_agi_orchestrate`, `mill_collision_check`,
  `mill_kinematics_verify`). Wiring: **198/204 mill engines dispatcher-wired (97%)**
  via 308 dynamic `await import` lazy-loaders in `millDispatcher.ts`. 6 true-dark: 1
  now wired (`MonolithHyperMillFixtureDatabaseEngine` → 8 `mill_hm_fixture_*` actions),
  5 legit-exempt (HyperMILL-AC live-exec, inference middleware, resource index).
- **Knowledge legs (PSN 11-leg):**
  - HEALTHY: Engines (#6) · Algorithms (#8, 5 algorithm primitives via `prism_algorithm`) ·
    Obsidian brain (#1, `knowledge/memories/patterns/mill_synthesis.md` present) ·
    System-viz (#6, cross-substrate edges: owned-by-slot + documented-by + embeds) ·
    PRISM-AI (#10, 19 AI engines, 170 AI actions, reasoning bridge live) · Wiki (#3,
    16 grounded pages in `knowledge/wiki/mill/`, sample pages confirmed on disk)
  - THIN / GAPS: Tribal (#5, only 57 tips matching mill keyword heuristic — target 120+) ·
    Formulas (#9, chamfer/helical/high-feed formula nodes exist but LoRA dataset not yet
    production-fed) · NN/GNN (#11, GNN selective-deploy AUROC 0.808 but mill ref-pool
    coverage thin) · Memories (#4, 36 curated files but MEMORY.md migration stub-only) ·
    PRISM-OS (#2, `prism_operating_system` surface not specifically mill-tuned)
- **Known landmines (R12):**
  1. **VMC-05 (Hurco Roku-Roku) has no registered post** — NGC output silently produced for
     a WinMax machine. Must verify post assignment before any NC generation for VMC-05.
  2. **HyperMILL wiki pages not yet RAG-embedded** — semantic recall unavailable for
     `hypermill-2018.md`, `hypermill-cam-strategies.md`; keyword-only until Ollama embed
     completes. [[reference_bravo_mill_knowledge_not_yet_embedded_2026_06_12]]
  3. **`HyperMillCycleCatalogEngine.ts` / `HyperMillCodeGeneratorEngine.ts` filenames
     UNVERIFIED** — grep `ls mcp-server/src/engines/Hyper*` before calling.
  4. **Chip-thinning is NON-OPTIONAL for radial engagement < 50% cutter diameter** — bare
     chip-load without the thinning factor is a silent feed error. Use
     `AdvancedMillingStrategiesEngine` canonical formula only.
  5. **5-axis singularity at A=0 + tool-axis-aligned-with-Z** — RTCP divides by zero; always
     call singularity detection from `Fusion360MillTurnBridgeEngine` before any A-axis move
     < 0.5° from zero.
  6. **HyperMILL coolant block 4-char vs 2-char format** — 4-char breaks Hurco WinMax (V11);
     never assume coolant block transfers across posts.
  7. **Enhanced JM mill programs labeled as mislabeled landmines** — generate fresh programs
     from the engine pipeline rather than patching the `JM DIE/CNC MILL HAAS/` corpus
     output. [[reference_jm_enhanced_mill_programs_assessment_2026_06_01]]

---

## §3 — Deepening roadmap → PhD master

- **Tribal tips to add:** current 57 → target 120 tips.
  Sources: (a) `JM DIE/CNC MILL HAAS/` 59 customer folders (`.NC/.mcx-8`) mined via
  `mine-galaxy-transcripts.mjs` + Ollama `qwen2.5-coder:32b`; (b) `JM DIE/HURCO CNC
  PROGRAMS/` 25 folders (`.hnc`); (c) MIT-OCW chatter stability PDFs (Altintas ZOA,
  MTRC reprint — URLs in MEMORY.md §Authoritative free-source corpus); (d) Mitsubishi
  Materials cutting-power formula page. Capture exclusively via
  `prism_knowledge:tribal_capture slot=foxtrot` — never write directly to markdown.
  Priority topics missing coverage: per-machine alarm codes (JM VMC-01..05), holder/insert
  selection for D2 and Ti-6Al-4V, thermal doctrine for hard-milling, tool-on-hand → toolpath
  ROI rules, climb-vs-conventional for thin-wall features.

- **Wiki entries to write/cross-link (missing load-bearing leaves):**
  - `knowledge/wiki/mill/mill-vmc05-hurco-winmax.md` — VMC-05 post registration, WinMax
    dialect differences from NGC, `.hnc` format gotchas (the open landmine)
  - `knowledge/wiki/mill/mill-hypermill-rag-embed-status.md` — embed status ledger + embed
    cadence (resolves the RAG gap)
  - `knowledge/wiki/mill/mill-d2-hard-milling-playbook.md` — D2 58 HRC strategy doctrine
    (referenced by Kienzle design page for cavity plate job)
  - `knowledge/wiki/mill/mill-5axis-singularity-guard.md` — RTCP singularity detection
    protocol, cross-links `Fusion360MillTurnBridgeEngine`
  - `knowledge/wiki/mill/mill-chip-thinning-enforcement.md` — canonical formula + enforcement
    reference, links `AdvancedMillingStrategiesEngine`
  - Cross-link existing 16 pages into a cluster via `[[wikilinks]]` in each file's
    `## Related` block; wiki-lint after each edit.

- **Memories to write:**
  - `reference/reference_foxtrot_vmc05_post_gap_2026_06_26.md` — VMC-05 no-post landmine
  - `feedback/feedback_mill_chip_thinning_enforcement.md` — chip-thinning non-optional rule
  - `feedback/feedback_mill_5axis_singularity_check.md` — A=0 guard protocol
  - `reference/reference_mill_hypermill_coolant_block_format.md` — 4-char vs 2-char gotcha
  Write via `C:/Users/wompu/.claude/projects/H--prism/memory/` — auto-fed to
  `knowledge/memories/` by Stop hook.

- **RAG corpus:** embed all 16 `knowledge/wiki/mill/*.md` pages + 3 extracted training
  pages (`haas-mill-2023-operator.md`, `hypermill-2018.md`, `hypermill-cam-strategies.md`)
  via `nomic-embed-text` through the wiki-embedding pipeline. Target: 19 pages embedded.
  Route embed job via Ollama (`qwen2.5-coder:32b` batch, not Claude) — free on Blackwell.

- **CAG cold-anchor:** cache `mcp-server/src/engines/mill/CLAUDE.md` + the 16 wiki pages
  as the mill-domain cold-anchor in `scripts/lib/cag-router.mjs` so the reasoning bridge
  answers mill-doctrine questions from cache, not re-read.

- **NN/GNN features:** 5 algorithm-primitive engine nodes (`SavitzkyGolayFilter`,
  `DynamicTimeWarping`, `Viterbi`, `GMM`, `RANSAC`) need 768d feature vectors in
  `state/shared/nn-graph/node-embeddings-768d.jsonl` for the wiring-inference cascade
  classification of mill ghost nodes. Route to india (`xproc_outcome_publish`) for refpool
  seed. Target: add ≥6 high-confidence mill ghost-node examples to refpool
  (`ghost.unwired-engine` candidates from the 6 true-dark engines enumerated above).

- **LoRA dataset:** `mill_lora_train.jsonl` + `mill_lora_test.jsonl` sourced from
  `knowledge/memories/patterns/mill_synthesis.md` → `scripts/vault-to-lora-dataset.mjs`.
  Augment with failing edge cases from §4 tests. India retrains; foxtrot gates
  promotion (acceptance: AUROC ≥ 0.78 / macro-F1 ≥ 0.55 / Brier ≤ 0.15 on mill ghost
  holdout).

- **Engineered loop + cron:**
  - **Nightly** (2:17 AM): `node scripts/mine-galaxy-transcripts.mjs --galaxy mill` →
    Ollama `qwen2.5-coder:32b` synthesis → `prism_knowledge:tribal_capture slot=foxtrot`
    for each new tip (delta only via cursor). Acceptance signal: tribal tip count ≥ 120.
  - **Weekly** (Sunday 3:41 AM): wiki embed refresh → `scripts/build-galaxy-free-source-corpus.mjs`
    pull on Altintas/MTRC/Mitsubishi URLs → distill into wiki leaf updates.
  - **After each session stop:** `stop-obsidian-memory-feed.mjs` auto-feeds C: → H:
    Obsidian; `stop-bug-finding-wiki-gate.mjs` checks wiki companion on any regression.

- **Ollama offload:** route ALL of the following to `qwen2.5-coder:32b` (never Claude):
  summarizing `.NC`/`.hnc` program headers, classifying mill features from feature lists,
  embedding wiki pages, mining JM Die transcripts for tribal tips. Reserve Claude for
  Kienzle/Taylor deep reasoning, S(x) safety analysis, and strategy synthesis.

---

## §4 — Test plan (real assertions — R9)

- **Unit — reference-value / algebraic-invariant tests:**
  - `MillingForceEngine.test.ts`: Kienzle force at 4140 P-group (kc1.1=1800 from
    `src/physics/constants.ts`, mc from `KIENZLE_MC`): assert Fc within ±5% of
    hand-calc at documented chip thickness h=0.1 mm, width b=5 mm.
    Failure modes: h=0 → structured error (not NaN), h<0 → error, b<0 → error.
    Adversarial: h=Infinity → capped result + warning, NaN input → error object.
    Configs: P-group steel / K-group aluminum (kc1.1=1100) / S-group Ti (kc1.1=2800).
  - `AdaptiveMillingStrategiesEngine.test.ts`: chip-thinning factor at ae/D=0.08 (8%
    radial) must be ≥ 1.35× (published Sandvik formula); at ae/D=0.50 must be exactly
    1.0× (no correction needed). Fail: omitting chip-thinning at ae/D<0.5 must return
    `chipThinningApplied: false` warning — never silently pass uncorrected feed.
  - `TrochoidalMillingEngine.test.ts`: entry-angle validation — angles ≥ 90° pass;
    angles < 90° must return `entryAngleViolation: true` + recommended safe default.
  - `BallEndMillEngine.test.ts`: scallop height formula (h = R - R·cos(stepover/(2R)))
    — assert algebraic result at R=6mm, stepover=0.3mm within 0.001mm tolerance.
  - `MillKinematicsCollisionEngine.test.ts`: 5-axis singularity detection at A=0.3°
    must flag `singularityRisk: true`; at A=5° must clear.

- **Integration — round-trip THROUGH `prism_mill` dispatcher:**
  - `millDispatcher.integration.test.ts`: invoke `mill_physics_force` via the dispatcher
    action enum → Zod schema validation fires → lazy-import resolves → AtomicValue
    returned with `unit`, `value`, `confidence`, `source` all populated.
  - `mill_validate_safety` integration: call with force budget at 95% of VMC-01 spindle
    power → `prism_safety:validate_physics` must return S(x) ≥ 0.98 gate result.
  - `mill_strategy_recommend` integration: P-group material + pocket feature + VMC-01
    machine → trochoidal/adaptive strategy returned with `chipThinningApplied: true`.
  - Failure: `mill_physics_force` with unknown ISO group → structured dispatcher error,
    not unhandled exception.

- **E2E — JM Die live data:**
  - Replay `JM DIE/CNC MILL HAAS/` SEMBLEX cavity-plate D2 job through
    `mill_print_to_program` pipeline; assert output `.nc` contains `G131` (HI-CUT
    ADAPTIVE cycle) + `T1 M06` tool call + `M03 S3104` (matching Kienzle-computed
    RPM ±10%) + `M02` terminator.
  - Replay a 4140 steel pocket job through the full 8-step pipeline (§7 workflow contract
    in CLAUDE.md); assert S(x) ≥ 0.98 at the safety gate step.

- **Coverage floor:**
  Happy path + 3 failure modes (bad ISO group, negative chip-load, zero spindle power) +
  2 adversarial (NaN feed, Infinity depth-of-cut) + 3 spanning configs
  (P-group/1045 · K-group/6061 · S-group/Ti-6Al-4V).

- **Target test files to add/extend:**
  `src/__tests__/MillingForceEngine.test.ts` ·
  `src/__tests__/AdaptiveMillingStrategiesEngine.test.ts` ·
  `src/__tests__/TrochoidalMillingEngine.test.ts` ·
  `src/__tests__/BallEndMillEngine.test.ts` ·
  `src/__tests__/MillKinematicsCollisionEngine.test.ts` ·
  `src/__tests__/millDispatcher.integration.test.ts`

- **Runner:** `cd mcp-server && rtk npx vitest run -t "Mill|mill|Trochoidal|Milling"`;
  CI gate must be green before any commit touching mill engines.

---

## §5 — Simulation plan

- **What to simulate:** physics dry-run of the 8-step print-to-program pipeline (CLAUDE.md
  §7) against JM Die representative jobs; Monte Carlo force variability on D2 hard-milling;
  chip-load adaptive simulation at varying radial engagement (ae sweep 5%→50%).

- **Tools:** `prism_calc:{milling_forces, chip_thinning_factor}` for physics primitives ·
  `mill_collision_check` for toolpath clearance · `mill_kinematics_verify` for 5-axis RTCP ·
  `MillProgramOptimizerEngine` for cycle-time prediction · `prism_algorithm:ml_dtw` for
  force-signature comparison (predicted vs JM Die actual spindle-load traces).

- **Scenarios:**
  1. **D2 cavity plate (SEMBLEX, 58 HRC)** — adaptive roughing at ae=8%D, full flute
     depth; assert cutting force Fc < VMC-01 spindle force limit (from `jm-die-profile.ts`)
     and tool deflection ≤ 0.001" (25 µm).
  2. **4140 steel pocket, 4-axis indexed** — 4FL carbide, P-group kc1.1=1800; assert
     MRR ≥ 1.5 in³/min and S(x) ≥ 0.98.
  3. **6061 aluminum face mill, VMC-03** — K-group kc1.1=1100; assert chip-thinning
     factor applied (ae < 50% D), surface finish Ra ≤ 1.6 µm predicted.
  4. **Adversarial: Ti-6Al-4V thin-wall rib (0.060" wall)** — S-group kc1.1=2800;
     assert climb-only finishing strategy recommended, deflection check triggers warning at
     stickout > 4×D.
  5. **Adversarial: 5-axis A=0.3° approach** — assert singularity flag fires before any
     toolpath move is generated, motion is blocked.

- **Pass criteria:**
  - Force within ±8% of hand-computed Kienzle reference.
  - Deflection ≤ 0.001" at standard 4×D stickout (P-group, 1000 N radial force).
  - Cycle-time prediction MAPE ≤ 15% vs JM Die actual (from program headers).
  - S(x) ≥ 0.98 on all shop-floor tier scenarios; < 0.70 must hard-block.
  - Singularity detected at A < 0.5° in 100% of 5-axis adversarial runs.

---

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:** run `mill_print_to_program` against 5 real JM Die jobs from
  `JM DIE/CNC MILL HAAS/` (one per customer: SEMBLEX/ALCOA/OPTIMAS/SFS/HOLO-KROME);
  compare generated RPM/feed values to program-header values already proven in production.

- **Acceptance gates:**
  - Kienzle-computed RPM within ±10% of JM Die production values for same material/tool.
  - Feed (IPM) within ±15% — wider band because feed varies by strategy and program style.
  - Parity probe: `mill_physics_force` backend core vs `MillingWizardPage.tsx` frontend
    display ≤ 1.3× divergence (same input, both paths).
  - Cycle-time estimate MAPE ≤ 15% vs program-header run-time comments.
  - `mill_validate_safety` S(x) ≥ 0.98 on all 5 live jobs (required before release gate).

- **Safety gate:** `prism_safety:validate_physics` called on every mill output; S(x) ≥ 0.98
  required at `shop_floor` tier. Any result S(x) < 0.70 must hard-block and prevent NC
  release.

- **Parity probe:** run the same input through `mill_physics_force` (backend core) AND
  through `MillingWizardPage.tsx` Step 4 "Tools & speeds" display; assert both show
  RPM/feed in the same ±1.3× band. Fail = dead wire in the frontend.

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** after each simulation or live-data validation run, publish via
  `xproc_outcome_publish {slot:'foxtrot', domain:'mill'}` to the closed-loop outcome ledger
  (verify exact action name against `prism_session` dispatcher before calling — marked
  UNVERIFIED in CLAUDE.md §10). Write a `reference/reference_foxtrot_mill_outcome_<date>.md`
  memory for each session with numeric gate results.

- **LoRA:** failing edge cases (especially D2/Ti-6Al-4V adversarial configs, chip-thinning
  violations, singularity misses) → append to `mill_lora_train.jsonl` as
  instruction-tune pairs → notify india to retrain. Promote IFF AUROC ≥ 0.78 / macro-F1
  ≥ 0.55 / Brier ≤ 0.15 on the mill ghost-node holdout. Foxtrot gates promotion, india
  owns training.

- **RAG/CAG:** new validated tribal tips → `prism_knowledge:tribal_capture slot=foxtrot`;
  new wiki pages → wiki-lint → re-embed via nightly Ollama job. Refresh CAG cold-anchor
  after any CLAUDE.md doctrine update.

- **NN/GNN:** new labeled mill ghost nodes (confirmed wired/unwired) → append to refpool
  via india's `ghost-wire-outcomes-to-refpool.mjs`; retrain IFF AUROC meets gate. The 5
  legit-exempt engines contribute negative examples (confirmed-unwired) to the holdout.

- **Trigger + cadence:** LoRA retrain triggered when `mill_lora_train.jsonl` accrues ≥ 50
  new examples since last promotion OR when the parity probe fails (RPM divergence > 1.3×).
  NN/GNN retrain gated by india's lifecycle at AUROC ≥ 0.78 gate. RAG re-embed nightly.

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

- **Assigned Kienzle page:** `Kienzle Wizards.dc.html` — Milling tab (6-step wizard: Import
  print → Select machine & fixture → Choose strategy → Tools & speeds → Simulate & verify →
  Post & release). Galaxy tag `FOXTROT`. Design uses `#070809` base, `#FF5A2B` accent,
  `Space Grotesk` headings, `JetBrains Mono` data values, `Archivo` body. 3-pane layout:
  left nav (248px step list) · center content (fields grid + Kienzle guidance panel) ·
  right panel (live program viewer + cycle + safety gate readout).

- **Target React page:** `mcp-server/web/src/pages/MillingWizardPage.tsx` — **REUSE/EXTEND**
  this existing page (confirmed present; Codex Page Protection applies — do NOT create a new
  file). Extend to implement the 6-step Kienzle wizard flow. Sibling pages
  `MillingUploadPage.tsx`, `MillingResultsPage.tsx`, `MillStudioPage.tsx`,
  `MillTurnPage.tsx` may supply reusable sub-components.

- **Backend wiring (foxtrot owns this half):**
  | Wizard step | `prism_mill` action(s) | Express route `:3100` | API client |
  |---|---|---|---|
  | 1 Import print | `mill_agi_quick_analyze` | `POST /api/v1/mill/analyze` | `web/src/api/mill.ts` |
  | 2 Machine & fixture | `mill_hm_fixture_auto_select` | `POST /api/v1/mill/fixture` | `web/src/api/mill.ts` |
  | 3 Choose strategy | `mill_strategy_recommend` | `POST /api/v1/mill/strategy` | `web/src/api/mill.ts` |
  | 4 Tools & speeds | `mill_physics_force` + `mill_physics_tool_life` | `POST /api/v1/mill/physics` | `web/src/api/mill.ts` |
  | 5 Simulate & verify | `mill_collision_check` + `mill_kinematics_verify` | `POST /api/v1/mill/simulate` | `web/src/api/mill.ts` |
  | 6 Post & release | `mill_validate_safety` + `mill_validate_program` | `POST /api/v1/mill/release` | `web/src/api/mill.ts` |

  Verify each route exists in `mcp-server/src/routes/` before shipping — grep before assuming.
  `prism_safety:validate_physics` must be called (S(x) ≥ 0.98) before Step 6 release button
  is enabled; gate is enforced server-side, never trust client-only.

- **Design language (iOS fleet + Kienzle accent):**
  - Token source: `web/src/index.css` CSS variables + `web/DESIGN.md`; never inline hex/px.
  - Map design colors: `#FF5A2B` → `var(--color-accent)` or `prism-glow-amber/red` token;
    `#7FB2FF` (guidance panel) → `var(--color-info)` or equivalent.
  - Step nav circles: active = filled accent, done = emerald chip, pending = muted border —
    use `prism-chip` + status palette (emerald/amber/red).
  - Kienzle guidance panel (`◆ KIENZLE GUIDANCE`): `background: linear-gradient(135deg,
    rgba(42,111,219,0.06), var(--surface-1))` + `border: 1px solid var(--border-info)`.
  - Live program panel: `JetBrains Mono` font, syntax-colored G-code (cyan=headers,
    orange=tool calls, amber=safety blocks, gray=motion, comments dim).
  - Mobile-first: 44pt tap targets on step nav buttons + Back/Next CTAs; CTA Next button
    pinned bottom-center on mobile (`<MobileSafeArea>` wraps); `<input inputMode="decimal">`
    on all numeric fields; tables collapse to card list at < 600px via `<ResponsiveTable>`.
  - Critically-damped spring on step transitions: `framer-motion` whileTap scale
    `var(--press-scale)`, stiffness 500 / damping 34 — no bounce.

- **Build/verify loop:** edit `MillingWizardPage.tsx` → `npm run build:fast` → Playwright
  screenshot at desktop (1360×852) + iPhone 14 (390×844) + Pixel 7 (412×915) → compare
  to `.dc.html` intent → iterate. Three screenshots minimum per change.

- **Acceptance:** page renders 6-step wizard; live data round-trips all 6 `:3100` routes;
  parity probe Step 4 RPM ≤ 1.3× divergence from core; S(x) ≥ 0.98 gate blocks Step 6
  release on unsafe params; 3-viewport screenshots match Kienzle design intent.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - india: LoRA retrain + NN/GNN refpool growth (§7 fine-tune loop triggers).
  - oscar (speed-feed galaxy): `prism_calc:{chip_thinning_*, milling_forces}` primitives
    must be healthy — mill physics queries them on every force computation.
  - echo (post-processor): Step 6 "Post & release" routes through `MasterPostEngine`;
    VMC-05 WinMax post gap (§2 landmine) is echo's delivery, blocking VMC-05 NC release.
  - quebec: implements `MillingWizardPage.tsx` UI; foxtrot delivers backend routes first.
- **Blocks:**
  - quality galaxy: `SurfaceFinishPredictionEngine` Cpk output feeds `prism_quality:*`
    gates post-machining.
  - echo galaxy: mill toolpath output is echo's G-code input.
  - india: mill LoRA training data and mill GNN refpool examples are india's inputs.

- **Logical order (R13):** (1) deepening core (tribal tips + wiki + memories) → (2) test
  suite green → (3) simulation scenarios validated → (4) live-data parity confirmed → (5)
  fine-tune loop wired → (6) frontend built on a proven backend. Never ship Step 6 UI atop
  an unproven `mill_validate_safety` route.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] **WIRE:** every new engine wired to `prism_mill` dispatcher in the same commit;
  VMC-05 post gap resolved (or tracked `[SCOPED]`); all 6 wizard API routes live on `:3100`
  with no dead wires.
- [ ] **TEST:** all 6 test files green; happy path + ≥3 failure + ≥2 adversarial +
  ≥3 spanning configs; round-trip through `prism_mill` dispatcher (not singleton only); no
  `.skip`, no `toBeDefined()` stubs; CI gate green.
- [ ] **VALIDATE:** live-data validation on 5 JM Die jobs; RPM ±10%, feed ±15%, MAPE ≤ 15%;
  S(x) ≥ 0.98 on all; parity probe ≤ 1.3× Step 4 RPM divergence.
- [ ] **APPLY:** deepening cron (nightly tribal + weekly wiki embed) live and confirmed
  running; tribal tip count ≥ 120; `MillingWizardPage.tsx` rendering live data at 3 viewports;
  HyperMILL wiki pages RAG-embedded; LoRA dataset fed; GNN refpool ≥ 6 mill examples.
- [ ] Per-file 2-arm scrutiny on every code file changed; 3-of-3 Stop gate on the session.
