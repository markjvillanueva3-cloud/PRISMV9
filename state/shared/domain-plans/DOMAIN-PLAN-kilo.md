---
artifact: domain-buildout-plan
slot: kilo
galaxy: cam
galaxy_dir: mcp-server/src/engines/cam/
kienzle_pages:
  - Kienzle Collision Gap.dc.html
  - Kienzle Tooling Shop.dc.html
backend_dispatchers:
  - prism_cam
  - prism_toolpath
  - camFunctionDispatcher
frontend_owner: quebec
status: draft
generated_by: kilo-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — kilo (cam)

> Finalized plan to take the **cam** galaxy to PhD-master depth, then
> **test → simulate → validate → fine-tune**, then build/flesh out the
> frontend from the Kienzle Claude-Design pages.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub ·
> no-inline-constants · canonical physics from `src/physics/constants.ts`)
> bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** toolpath strategy selection and generation, workholding/fixture
  design, cross-vendor strategy mapping (Mastercam ↔ hyperMILL ↔ Fusion 360
  ↔ NX-CAM ↔ PowerMill ↔ GibbsCAM ↔ SprutCAM ↔ EdgeCAM + 10 others),
  HyperMILL CAM sub-galaxy (`engines/hypermill/`, 17 verified .ts files),
  collision pre-flight triage (NOT the authoritative CAM sim — hyperMILL sim
  is the authority per Collision Gap design page), CAM learning-loop
  (`CAMFeedbackLoopEngine` → india), cycle-time estimation for quoting hand-off.
- **Excludes:** per-machine cutting physics (mill/foxtrot, lathe/whiskey,
  wedm/mike); G-code post-emission (echo); blueprint/OCR input (xray);
  authoritative collision sign-off (hyperMILL sim remains the authority until
  a zero-false-clear validation corpus is built).
- **Slot worktree:** `H:/prism-slot-kilo` · branch `slot/kilo`
- **Galaxy brain:** `mcp-server/src/engines/cam/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PARTIAL. CLAUDE.md / MEMORY.md / PATHS.md / TOOLBELT.md
  confirmed present. AWARENESS.md exists (AI-synergy surface: 6 AI engines,
  37 dispatcher actions, hybrid RAG active). `CAM-KNOWLEDGE-INDEX.md` is
  **MISSING** from `state/shared/` as of 2026-06-13 (verified in CLAUDE.md §12).
- **Verified engines in source (2026-06-13):**
  Root tree: `CAMAGIMasterOrchestratorEngine.ts`, `CAMKernelEngine.ts`,
  `CAMKernelDispatcherBridge.ts`, `CAMCrossSystemTranslatorEngine.ts`,
  `CAMFeedbackLoopEngine.ts`, `ToolpathGenerationEngine.ts`,
  `AdaptiveToolpathRouterEngine.ts`.
  HyperMILL sub-galaxy (17 .ts files): `HyperMillDeflectionThermalMappingEngine.ts`,
  `HyperMillSpeedFeedMappingEngine.ts`, `HMCProjectParserEngine.ts`,
  `HyperMillKienzleMappingEngine.ts`, `PartSimilaritySearchEngine.ts` + 12 more.
  AI engines (6): `CAMDeepLearningEngine`, `CAMDeepLearningOrchestratorEngine`,
  `CAMLoRAAdapterTrainerEngine` + 3 others.
- **Dispatcher surface (3 dispatchers):**
  `prism_cam`: `cam_material_map`, `cam_strategy_recommend`,
  `cam_strategy_recommend_full`, `collision_check_full`, `cam_safety_validate`,
  `cam_multiaxis_recommend`, `toolpath_generate`, `mastercam_strategy_recommend`,
  `mastercam_safety_validate`, `ollama_cam_strategy_recommend`, `cam_ml_train_lora`.
  `prism_toolpath`: `strategy_select`, `simulate`, `cycle_time_estimate`,
  `surface_finish_predict`, `stock_simulate`.
  `camFunctionDispatcher`: per-vendor `mastercam_*`, `fusion360_*`,
  `hypermill_*`, `solidcam_*`, `edgecam_*`, `gibbscam_*`, `sprutcam_*`, `nxcam_*`.
- **Data stores confirmed:** `CAM_VENDOR_REGISTRY.json` (10K),
  `CAM_TRIBAL_RAG_INDEX.json` (5.3M — query only, never full-read),
  `CAM_AI_ACTIONS_INDEX.json` (310K — query only), ToolpathStrategyDB (586
  entries), ToolDB (13,967 entries), MaterialDB (6,509 entries),
  `CoatingRegistry.ts` (100 entries), `PhysicsMappingRegistry.ts` (1,942 entries).
- **PSN 11-leg health:**
  - Engines: HEALTHY (12+ root + 17 hypermill + 6 AI).
  - Tribal: 88 tips — PARTIAL (target 150+).
  - Wiki: `cam-foundations.md` VERIFIED-PARTIAL; `cam-corpus-index.md` present.
    5 load-bearing topics missing wiki leaves (see §3).
  - Memories: 66 curated + 1,296 auto-node files — PARTIAL.
  - NN/GNN: wired via `xproc_kg_project_features` — THIN (feature vectors
    not confirmed emitted for 4 key engines).
  - RAG/CAG: hybrid active via `galaxy-reasoning-bridge.mjs` — HEALTHY.
  - Algorithms: `ml_dtw`, `ml_gmm`, `ml_knn`, `signal_savgol`,
    `spatial_ransac_fit` mapped (papa 2026-06-09) — NOT yet wired into cam
    engine calls. **GAP.**
  - LoRA dataset: `CAMLoRAAdapterTrainerEngine` exists; `cam_lora_train.jsonl`
    population status unconfirmed. **GAP.**
  - Formulas / PRISM-OS / PRISM-AI: advisory stubs. **THIN.**
- **Known landmines (R12):**
  1. `collision_check_full` SOUL.md refuse gate
     (`emitting-toolpath-without-collision-check`) — verify wired in Stop
     hook stack before marking any toolpath workflow complete.
  2. Fusion 360 internal unit = cm (2.54 trap); `units-guard.mjs` must fire
     before every CAM operation on Fusion-sourced projects.
  3. `cam-vendor-matrix.ts` does NOT exist — always use `CAM_VENDOR_REGISTRY.json`.
  4. `CAMCrossSystemTranslatorEngine` transfers strategy only; holder geometry
     does NOT transfer — re-validation required post-transfer.
  5. Autonomous learning loop gap: `CAMFeedbackLoopEngine` exists but the
     closed loop (outcomes → LoRA dataset → retrain) is not confirmed wired.
  6. Collision Gap design page is explicit: current PRISM collision check is
     probabilistic — that is the WRONG default for a provable system. Conservative
     CCD is the build target; hyperMILL sim remains the authority until then.

---

## §3 — Deepening roadmap → PhD master

**Tribal tips to add:** 88 → 150. Sources: JM Die Fusion CAD/CAM files
(via `prismSelfAwarenessEngine.getJMDieCustomerPath()`), OPEN MIND training
corpus (`H:/PRISM/JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training/`),
`H:/PRISM/resources/OPEN MIND/`, `H:/PRISM/resources/MasterCam/`,
`H:/PRISM/resources/FUSION 360 PROGRAMS/`, free-source PMC trochoidal Ti-6Al-4V
paper (PMC6630620) + USPTO rough-toolpath patents (11,176,291 / 6,704,611).
Capture via `prism_knowledge:tribal_capture slot=kilo` only.

**Wiki entries to write (5 load-bearing gaps):**
- `knowledge/wiki/cam/cam-collision-ccd-architecture.md` — conservative
  swept-volume CCD vs probabilistic; the 7 pillars (exact geometry,
  kinematic chain, FK from G-code, swept volume, BVH+narrowphase, conservative
  certificate, validation corpus); why `SWEEP_LOFT_ENGINE` must be rewired as
  conservative CCD, not visual lofting.
- `knowledge/wiki/cam/cam-cross-vendor-transfer-protocol.md` — what
  transfers (strategy family, depth-of-cut basis) vs what does NOT (holder
  geometry, spindle-specific tilt); post-transfer re-validation sequence.
- `knowledge/wiki/cam/cam-units-trap-fusion.md` — Fusion 360 cm internal
  unit, G20/G21 verification rule, units-guard API, 2.54 scale error class.
- `knowledge/wiki/cam/cam-algorithm-primitives.md` — DTW for cycle-time
  signature elastic alignment, GMM/KNN for strategy regime clustering,
  Savitzky-Golay for force-trace smoothing, RANSAC for feature-plane fit;
  invocation via `prism_algorithm:ml_dtw` etc.
- `knowledge/wiki/cam/cam-hypermill-blade-roughing.md` — why hyperMILL blade
  roughing ≠ generic 5-axis swarf; proprietary tilt-angle optimization;
  mandatory `cam_hypermill_strategy_kb_for_geometry` lookup before any blade
  job; never substitute `cam_multiaxis_recommend` output directly.

**Memories to write:**
- `reference_kilo_cam_units_guard_integration_2026_06_26.md`
- `feedback_cam_collision_conservative_vs_probabilistic.md` (standing doctrine
  from Collision Gap design page: conservative = must never miss;
  probabilistic = may miss; PRISM pre-flight is triage only until corpus built)
- `reference_kilo_cam_algo_primitives_wired_<date>.md` (write on completion)

**RAG corpus:** embed OPEN MIND training corpus + JM Die Fusion CAD/CAM
file set into `CAM_TRIBAL_RAG_INDEX.json` via `scripts/tribal-embed-index.mjs`.
Offload embedding entirely to `qwen2.5-coder:32b` on Blackwell (free);
Claude reviews synthesis only. Target: 88 existing tips embedded + 62 new.

**CAG cold-anchor:** cache `engines/cam/CLAUDE.md` + `cam-foundations.md` +
the 7-pillar CCD collision doctrine (distilled from Collision Gap dc.html)
in the CAG cold tier via `scripts/lib/cag-router.mjs`. These are stable,
high-reuse reference facts.

**NN/GNN features:** emit feature vectors for 4 priority cam engine nodes via
`xproc_kg_project_features {slot:'kilo', domain:'cam'}`:
`CAMAGIMasterOrchestratorEngine`, `CAMCrossSystemTranslatorEngine`,
`AdaptiveToolpathRouterEngine`, `HyperMillKienzleMappingEngine`.
India owns GNN retrain; kilo feeds the refpool.

**LoRA dataset:** populate `cam_lora_train.jsonl` + `cam_lora_test.jsonl`
from: (a) strategy recommendation Q/A pairs from JM Die job history where
operator choice is documented, (b) cross-vendor before/after pairs
(Mastercam → hyperMILL), (c) collision pre-flight triage examples including
near-misses. India trains via `cam_ml_train_lora` action.

**Engineered loop + cron:**
- **Nightly 02:13** (offset to avoid :00/:30 contention):
  `mine-galaxy-transcripts.mjs --galaxy cam` → Ollama `qwen2.5-coder:32b`
  synthesis → tribal capture via dispatcher → wiki-ingest for generalizable
  lessons.
- **Weekly Sunday 03:17:** fire `cam_ml_train_lora` if new LoRA sample delta
  ≥ 50; promote IFF strategy match rate +5% on held-out JM Die set.
- **Acceptance signal:** tribal count ≥ 150 AND all 5 wiki-gap entries
  present AND LoRA dataset has ≥ 200 train rows.

**Ollama offload:** strategy-doc summarize, `.mcam` op-tree classify,
vendor-manual extract → `qwen2.5-coder:32b`. Deep 5-axis singularity /
blade-roughing physics → `gpt-oss:120b`. Quick filter/synthesis →
`gpt-oss:20b`. Never promote to Claude for mechanical operations.

---

## §4 — Test plan (real assertions — R9)

All constants sourced from `src/physics/constants.ts` — never inline.

**Unit tests (reference-value / algebraic-invariant):**
- `cam-material-map.test.ts` — `cam_material_map("D2 tool steel")` returns
  ISO group H with `kc1_1 = 3200 MPa` (`CANONICAL_KIENZLE.H`); cm-unit
  input triggers units-guard error; empty material string returns
  `ISO_UNKNOWN`, not a throw.
- `cam-strategy-recommend.test.ts` — calling without prior `cam_material_map`
  returns structured error (not a strategy); trochoidal recommended for
  P-group Ti-6Al-4V at depth > 1×D; 5-axis swarf NOT recommended when
  fixture clearance < 10mm; blade-roughing job triggers mandatory strategy-KB
  lookup, not direct `cam_multiaxis_recommend` output.
- `cam-collision-check.test.ts` — `collision_check_full` returns
  `clearance: number` (never bare boolean); clearance < 0 → COLLISION verdict;
  conservative flag present in return object; probabilistic-only mode is NOT
  the default (fails if `PRISM_PROBABILISTIC_COLLISION` is set without
  conservative override).
- `cam-cross-vendor.test.ts` — `CAMCrossSystemTranslatorEngine` Mastercam →
  hyperMILL returns strategy family; holder geometry fields ABSENT from
  output; re-validation-required flag is SET.
- `cam-hypermill-units.test.ts` — `HMCProjectParserEngine` returns
  `unitsError` on cm project (Fusion trap); INCH projects parse cleanly.

**Integration (round-trip through dispatcher, not singleton):**
- `cam-dispatcher-roundtrip.test.ts` — 8-step pipeline via dispatcher:
  `cam_material_map` → `cam_strategy_recommend` → `toolpath_generate` →
  `simulate` → `collision_check_full` → `cam_safety_validate` →
  `cycle_time_estimate`; assert each step returns valid typed object; assert
  skipping `collision_check_full` is blocked by the SOUL refuse gate.

**E2E (JM Die live data):**
- SEMBLEX trilobe D2 job from `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` →
  full pipeline; cycle-time estimate within ±15% of recorded actual;
  `collision_check_full` does not false-clear on fixture model.

**Coverage floor (R15):**
- Happy: D2 INCH part, full 8-step pipeline, all gates pass.
- Failure 1: `cam_strategy_recommend` without `cam_material_map` → error.
- Failure 2: Fusion 360 cm project → units-guard fires, pipeline blocked.
- Failure 3: `collision_check_full` clearance < 0 → COLLISION, no proceed.
- Adversarial 1: NaN spindle speed → structured error, not propagation.
- Adversarial 2: empty material → `ISO_UNKNOWN`, no crash.
- Spanning 1: P-group (1045 steel) → trochoidal recommended.
- Spanning 2: K-group (6061 Al) → conventional, higher SFM unlocked.
- Spanning 3: H-group (D2 58 HRC) → hard-milling / CBN recommended.

**Runner:** `cd mcp-server && rtk npx vitest run -t "CAM|Toolpath|Strategy|Collision"`

---

## §5 — Simulation plan

**What to simulate:** Kienzle force + Jaeger temperature + Brammertz
roughness per toolpath segment via `prism_toolpath:simulate`; voxel stock
evolution via `prism_toolpath:stock_simulate`; accel/corner-ramp cycle time
via `prism_toolpath:cycle_time_estimate`. All physics constants from
`src/physics/constants.ts`.

**Tools:** `prism_toolpath:simulate`, `prism_toolpath:stock_simulate`,
`AdaptiveToolpathRouterEngine`, `HyperMillDeflectionThermalMappingEngine`,
`HyperMillSpeedFeedMappingEngine`.

**Scenarios:**
1. SEMBLEX trilobe D2 roughing (H-group, JM Die) — peak Fc < machine
   spindle-stall threshold; Ra ≤ 3.2 µm after finish pass.
2. Alcoa 6061 Al pocket (K-group, JM Die) — trochoidal radial engagement
   ≤ 10% at ae = 0.1×D; thermal ≤ 150°C dry.
3. Ti-6Al-4V deep slot (P-group) — chip-thinning applied
   (fz_eff = fz × √(ae/D)); coolant-evacuation flag set.
4. Edge: zero-flute-count end mill → structured error, not divide-by-zero.
5. Adversarial: overlapping tool paths (stale stock model) → re-cut warning
   emitted, auto-approve blocked.

**Pass criteria:**
- Force: within ±20% of Kienzle reference (`src/physics/constants.ts`).
- Thermal: Jaeger model within ±25°C of group-calibrated literature value.
- Roughness: Brammertz Ra within ±0.4 µm for the feed/nose-radius combination.
- Cycle-time: `cycle_time_estimate` within ±15% of JM Die recorded actual.

---

## §6 — Validation plan (live data + numbers — R12/R15)

**Live-data validation:** 3 real JM Die jobs from
`H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` (SEMBLEX trilobe D2, Alcoa
6061 pocket, one OKUMA/hyperCAD-S job). Record: strategy recommendation
match rate vs operator-chosen strategy; cycle-time MAPE vs recorded actual;
collision pre-flight verdict vs hyperMILL sim verdict.

**Acceptance gates:**
- Strategy match rate ≥ 70% vs documented operator choices.
- Cycle-time MAPE ≤ 15% vs actual recorded time.
- Collision false-clear rate = 0 (conservative gate — must never miss).
- Parity probe: `prism_toolpath:cycle_time_estimate` via API client vs direct
  engine call within ±1% (no round-trip loss).

**Safety gate:** `prism_cam:cam_safety_validate` S(x) ≥ 0.98 for any
toolpath approved for JM Die shop floor; S(x) < 0.98 = blocked, no bypass.
`collision_check_full` must return positive clearance BEFORE `cam_safety_validate`
is called — hard sequence gate.

**Parity probe:** `CamStrategyPage.tsx` strategy output vs
`prism_cam:cam_strategy_recommend` direct response must agree on strategy
family, ISO material group, and top-1 toolpath suggestion.

---

## §7 — Fine-tune loop (results → retrain)

**Outcome capture:** write per-job results to cam closed-loop ledger via
`xproc_outcome_publish {slot:'kilo', domain:'cam'}` (verify action name in
`camDispatcher.ts` before relying — noted UNVERIFIED in CLAUDE.md §10).
Ledger: `mcp-server/data/state/cam-outcome-ledger.jsonl`.

**LoRA:** failed strategy recommendations (operator corrected PRISM) and
edge-case toolpath scenarios → appended to `cam_lora_train.jsonl`. India
retrains via `cam_ml_train_lora` when sample delta ≥ 50. Promote IFF:
strategy match rate +5% on held-out JM Die set AND cycle-time MAPE does not
regress.

**RAG/CAG:** new operator-confirmed tribal tips → re-embed into
`CAM_TRIBAL_RAG_INDEX.json` via tribal-embed pipeline. CAG cold-anchor
refreshed when `cam-foundations.md` changes (Stop hook trigger).

**NN/GNN:** newly labeled cam engine nodes → india refpool via
`xproc_kg_project_features`. Retrain when refpool grows ≥ 10 nodes. Promote
IFF AUROC ≥ 0.78 / macro-F1 ≥ 0.55 / Brier ≤ 0.15 (fleet gate in
`nn-graph-eval.mjs`).

**Trigger + cadence:** weekly Sunday 03:17 cron fires `cam_ml_train_lora` if
sample delta met; nightly cron checks refpool size for GNN trigger; CAG
anchor refresh on every `cam-foundations.md` write via Stop hook.

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

**Assigned Kienzle pages:**
1. `Kienzle Collision Gap.dc.html` — static-to-live assessment dashboard:
   7 CCD proof pillars (HAVE / PARTIAL / GAP status badges), 3-phase road to
   independent verifier, 3 summary stat cards (component %, open pillars,
   validation corpus size). Data must come from backend, not hardcoded.
2. `Kienzle Tooling Shop.dc.html` — 3-panel interactive app: left = ROI-ranked
   tool suggestions (4 items: AlCrN coating, HAIMER shrink-fit, ceramic
   inserts, through-spindle coolant); center = per-item ROI math + before/after
   table + Kienzle insight; right = distributor routing (LOCAL/NATIONAL,
   stock status, cart). EN/ES/PL language toggle; St. Charles IL / Dallas TX /
   National location filter; cart checkout action.

**Target React pages (reuse-first — Codex Page Protection):**
- **Collision Gap → extend `CamStrategyPage.tsx`**
  (`mcp-server/web/src/pages/CamStrategyPage.tsx`). Add a `CollisionGapTab`
  within the existing tab layout. Only create `CollisionAssessmentPage.tsx`
  if the existing tab structure is structurally incompatible (> 5 tabs already
  at capacity). Check `cam-ai-dashboard.tsx` for existing pillar-status card
  patterns before building new components.
- **Tooling Shop → extend `ToolpathAdvisorPage.tsx`**
  (`mcp-server/web/src/pages/ToolpathAdvisorPage.tsx`). Add a `ToolingShopPanel`
  (3-column layout: ROI list / item detail / distributor). The Tooling Shop
  is a natural companion to toolpath advice. Inspect `cam-ai-dashboard.tsx`
  for reusable ROI-card components before building fresh.

**Backend wiring (kilo owns; quebec implements UI):**

| Feature | Dispatcher action | Express route `:3100` | API client |
|---|---|---|---|
| Pillar live status | `prism_cam:collision_check_full` + `cam_safety_validate` | `POST /api/v1/cam/collision-status` | `web/src/api/cam.ts` |
| ROI-ranked suggestions | `prism_cam:cam_strategy_recommend` with `include_tooling_roi:true` | `POST /api/v1/cam/tooling-roi` | `web/src/api/cam.ts` |
| ROI math (cycle Δ, tool-life Δ) | `prism_toolpath:cycle_time_estimate` + `prism_cam:cam_material_map` | `POST /api/v1/cam/roi-math` | `web/src/api/cam.ts` |
| Distributor routing | `prism_cam:cam_vendor_route` (verify name in dispatcher) | `GET /api/v1/cam/distributors?loc=il` | `web/src/api/cam.ts` |

Verify each route exists in `src/routes/` before the UI wires to it; if
absent, wire the Express handler in the same commit as the frontend (R15).
Extend `web/src/api/cam.ts` — do not create a parallel client file.

**Design language:** iOS fleet language per `web/DESIGN.md` tokens.
Dark base `#0A0B0D` / `#0C0D10` as in both dc.html files. Typefaces:
`Space Grotesk` (headings) + `Archivo` (body) + `JetBrains Mono`
(all numeric values, status codes, SKUs) — these must load via `index.css`
tokens, never inline `@import`. Status colors: emerald `#36D399` = HAVE /
amber `#F4B740` = PARTIAL / red `#FF5247` = GAP (pillar badges); orange
`#FF5A2B` = PRISM accent. All values referenced as CSS variables from
`src/index.css` — no inline hex. Tap targets ≥ 44pt; Tooling Shop cart
checkout CTA is a primary action → bottom-center on mobile, above
`env(safe-area-inset-bottom)` via `<MobileSafeArea>`. `inputMode="decimal"`
on quantity/price inputs. Language toggle (EN/ES/PL) as inline chip buttons
(not a hamburger dropdown). `<ResponsiveTable>` for distributor list at
< 600px — not `overflow-x: scroll`.

**Build/verify loop:** `rtk npm run build:fast` in `mcp-server` after each
file → Playwright at desktop 1440px + `devices['iPhone 14']` (390×844) +
`devices['Pixel 7']` (412×915) → compare to dc.html visual intent →
list concrete gaps → iterate. Three screenshots minimum per change.

**Acceptance:** page renders live `:3100` data (not mocks); parity probe
passes (§6); collision pillar statuses reflect current backend state (not
dc.html sample values); distributor cart round-trips checkout without page
reload; 3-viewport screenshots match dc.html design intent.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - india: LoRA retrain + GNN refpool promotion (kilo feeds, india trains).
  - echo: must confirm NCI/APT handoff schema before E2E test can close
    the full pipeline loop.
  - quebec: implements the TSX UI shells kilo defines; coordinate via
    `state/shared/AGENT_CHAT.md`.
  - `scripts/lib/units-guard.mjs` must be confirmed present and importable
    before any toolpath dispatcher call in tests.
- **Blocks:**
  - echo: `toolpath_generate` NCI/APT output is echo's input; stable schema
    required before echo can post-process.
  - charlie/quoting: `cycle_time_estimate` feeds quoting; dispatcher action
    must be stable before charlie wires it into cost calculation.
- **Logical order (R13):**
  1. Tribal + wiki deepening (§3) — knowledge foundation.
  2. Unit tests (§4) — prove core engines correct.
  3. Dispatcher integration tests — round-trip all 3 dispatchers.
  4. Simulate 5 scenarios (§5) — physics correctness gate.
  5. Live JM Die validation (§6) — acceptance gate numbers.
  6. Fine-tune loop (§7) — retrain on failures from §6.
  7. Frontend build (§8) — UI last, never atop unproven backend.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: all new engines / dispatcher actions / routes committed in same
      commit; `stop_on_unwired_assets.mjs` returns 0 new cam orphans.
- [ ] TEST: all §4 test files green; happy + ≥3 failure + ≥2 adversarial +
      ≥3 spanning configs; round-trip through dispatcher; `rtk npx vitest run
      -t "CAM|Toolpath|Strategy|Collision"` exits 0.
- [ ] VALIDATE: JM Die live data meets gates — strategy match ≥ 70%,
      cycle-time MAPE ≤ 15%, collision false-clear = 0, S(x) ≥ 0.98.
- [ ] APPLY: nightly tribal mine cron + weekly LoRA cron live; collision-gap
      tab in `CamStrategyPage.tsx` and tooling-shop panel in
      `ToolpathAdvisorPage.tsx` rendering live `:3100` data; parity probe
      passing; 3-viewport screenshots match dc.html design.
- [ ] Per-file 2-arm scrutiny on every code file + 3-of-3 Stop gate before
      marking done.
