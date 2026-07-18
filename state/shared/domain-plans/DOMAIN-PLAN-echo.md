---
artifact: domain-buildout-plan
slot: echo
galaxy: post-processor
galaxy_dir: mcp-server/src/engines/post-processor/
kienzle_pages: ["Kienzle Post.dc.html", "Kienzle Alarm Decoder.dc.html"]
backend_dispatchers: [prism_pp, camDispatcher, productDispatcher]
frontend_owner: quebec
status: draft
generated_by: echo-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — echo (post-processor)

> Finalized plan to take the post-processor galaxy to **PhD-master depth**, then
> **test → simulate → validate → fine-tune**, then **build/flesh out the frontend**
> from the Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub ·
> no-inline-constants · canonical physics from `src/physics/constants.ts`) bind
> every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** CAM-output → controller-dialect translation: post-processor engines, per-controller
  dialect mapping (14 controllers, 19 CAM systems), G-code intelligence
  (validate / verify / safety / optimize / transpile / reverse), MasterPost saleable product
  line, and the JM Die `.cps` fleet (12 files, 4 production controllers).
- **Excludes:** CAM strategy/toolpath generation → kilo; per-machine dynamics/setup → cam
  galaxy; shop-floor live execution → shop-floor galaxy; speed-feed physics → oscar;
  lathe turning physics → whiskey.
- **Slot worktree:** `H:/prism-slot-echo` · branch `slot/echo`
- **Galaxy brain:** `mcp-server/src/engines/post-processor/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PARTIAL — CLAUDE.md / MEMORY.md / PATHS.md / TOOLBELT.md present;
  AWARENESS.md absent (not generated yet). AI-synergy audit: 6 AI engines wired,
  46 AI dispatcher actions, discoverability score non-zero but not measured this session.
- **Engines / dispatcher actions (CLAUDE.md §2–3, grep-verified):**
  - Active named engines: ~20+ flat in `mcp-server/src/engines/` (GCode* / MasterPost* / Post*):
    `MasterPostProcessorEngine`, `MasterPostProcessorUnifiedAGIEngine`,
    `PostProcessorPipelineEngine` (7-phase / 38-stage), `MasterPostFineTuningEngine`,
    `HurcoV11MillMasterPostEngine`, `GCodeSafetyAnalyzerEngine`, `GCodeTemplateEngine`,
    `GCodeSnippetEngine`, `GCodeIntelligencePipelineEngine`, `GCodeValidationEngine`,
    `GCodeVerificationEngine`, `GCodeTranspilerEngine`, `GCodeEnergyOptimizerEngine`,
    `GCodeOptimizationEngine`, `GCodeBidirectionalOptimizerEngine`,
    `GCodeRuntimePredictorEngine`, `GCodeTimeEstimatorEngine`,
    `GCodeUnderstandingTransformerEngine`, `GCodeReverseCADEngine`,
    `Fusion360MillTurnBridgeEngine`, `HyperMillCodeGeneratorEngine`.
  - Stub-wired / dark: 8 controller-specialist stubs (`WEDMPost*` x5, `LathePostProcessor*`,
    `LathePostGeneratorActiveLearning`, `JMDiePostProcessorLearning`) + ~14 AGI-tier
    fully-dark engines (`MasterPostProcessorAGIOrchestrationEngine`, `CrossCAMPostEngine`,
    `MachineFingerprintEngine`, etc.).
  - **prism_pp** (ppDispatcher): 655 actions — PRIMARY surface (verified commit ab0c5d5193).
  - **camDispatcher**: ~155 post-related cases (`lathe_postgen_*`, `master_post_*`, `pp_*`,
    `post_*`, `wedm_post_*`, etc.).
  - **productDispatcher**: 24 `ppg_*` actions.
  - Data stores: AlarmDB 2,588 entries / 13 controllers; PostProcessorDB 34 posts;
    NC corpus 160,582 programs; 13,790 `.cps` (Fusion) + 52 Mastercam posts.
- **Knowledge legs (PSN 11-leg):**
  - Healthy: Engines (wired), Memories (152 files), Wiki (734 entries), Tribal (78 tips),
    System-viz (cross-substrate edges present), PRISM-AI (6 AI engines, 46 actions),
    LoRA (post-processor_synthesis.md feeds vault→LoRA pipeline).
  - Thin: NN/GNN (no dedicated labeled refpool nodes for post-processor ghost nodes);
    Algorithms (only ml_dtw / ml_knn / ml_gmm / signal_savgol mapped — not yet formally
    invoked from engines); PRISM-OS (no dedicated OS-skill invocation surface found);
    Formulas (physics inline in pipeline stages rather than formula-registry entries).
- **Known landmines (R12 — from CLAUDE.md §12 + MEMORY.md):**
  1. **`pp_outcome_emit` not auto-called in PostProcessorPipelineEngine P6** — the dispatcher
     action exists (commit 0777fda9d2) but the in-pipeline auto-call is still echo's hot-path
     work; confirmed absent (MEMORY.md 2026-06-11).
  2. **U-PP-BACKPLOT-G0NORM safety fix (`8f47872237`) needs 3-of-3 scrutiny** — the
     `replace(/^G0*/,'G')` bug that made gouge + rapid-into-material detection permanently
     dead is fixed, but the 3-of-3 gate was not completed in that session (CLAUDE.md §12).
  3. **AlarmDB Stage-5.1b coverage gap** — Stage 5.1b IS wired to `AlarmRegistry` but coverage
     against the full 2,588-entry `controller-alarm-database.json` (vs the smaller
     `MASTER_ALARM_DATABASE.json`) is unconfirmed.
  4. **12 dormant `slot/echo` commits** — PostEmitSafetyGate, PostFeatureAudit, PostLibrary,
     HURCO-POST-PIPELINE-BRIDGE iters 9–16 — unintegrated; operator go-ahead required.
  5. **MS-MASTERPOST (44 units) gated on U-LEGAL-13** — cannot ship until legal review on
     public-manual re-derivation clears; do not attempt to bypass.
  6. **4 machine-coverage gaps** — Haas PRE-NGC, Roku-Roku, EA12D sinker (now fixed per
     commit 669c03dac), FA10S mis-route — from POST-GEN-COVERAGE-AUDIT-2026-05-29.
  7. **Feed-rate mode / coolant-sequence / comment-bracket dialect gotchas** — the 8 domain
     traps in CLAUDE.md §5 apply to every emit path; P5 safety gate MUST NOT be skipped.

---

## §3 — Deepening roadmap → PhD master

> "PhD master" = an engineered loop, not a one-shot. All deepening is BOUNDED by explicit
> targets and a cron that drives continuous coverage growth.

- **Tribal tips to add:** current 78 → target 130.
  Sources: JM Die `.cps` corpus (12 files, parse for embedded operator comments);
  NC corpus (160,582 programs — mine via `scripts/mine-galaxy-transcripts.mjs --galaxy post-processor`
  already in progress: 35 sessions / 704MB via Ollama);
  public controller manuals (Fanuc B-61395E §10, Haas 96-0284 §G-code, Okuma OSP-P300
  programming manual — public domain only, U-LEGAL-13 gate applies).
  Capture: `prism_knowledge:tribal_capture slot=echo` only (never write
  `knowledge/tribal/post-processor-*.md` directly — hook auto-overwrites).
  Priority tribes: G93/G94/G95 modal-tap traps, coolant sequencing (M8/M3 ordering),
  Okuma OSP G15/H work-offset discipline, Heidenhain CC/C arc-center syntax, Haas G187
  smoothing interaction with G61/G64 path modes.

- **Wiki entries to write / cross-link:**
  - `knowledge/wiki/architecture/post-processor-alarm-decoder.md` — AlarmDB 2,588-entry
    structure + coverage map (which of 13 controllers have full P5.1b coverage).
  - `knowledge/wiki/lessons/post-processor-pipeline-safety-gates.md` — the G0-norm bug
    root cause, backplot gouge-detection architecture, how P5 Stage-5.1b works.
  - `knowledge/wiki/architecture/post-processor-controller-dialect-matrix.md` — EXTEND
    existing entry with Heidenhain iTNC 530 vs TNC 7 incompatibility table and
    Haas-PRE-NGC vs NGC delta.
  - `knowledge/wiki/code-tribal/post-processor-outcome-emit-loop.md` — the closed-loop
    wiring from P6 `pp_outcome_emit` → OutcomeCaptureBus → india LoRA / refpool.

- **Memories to write:**
  - `reference_echo_alarm_coverage_2026_06_26.md` — which AlarmDB entries ARE vs ARE NOT
    cross-checked by Stage-5.1b (per a direct grep of `PostProcessorPipelineEngine.ts`
    line ~3153).
  - `reference_echo_backplot_g0norm_fixed_2026_06_24.md` — the fix + the 72-test companion
    (already partially captured; promote from MEMORY.md inline note to a standalone file).
  - `feedback_echo_pp_outcome_emit_wiring.md` — the auto-call gap + the pattern for
    wiring it without double-publish risk.

- **RAG corpus:** `JM DIE/` NC programs (160,582 files) + `data/programs/` + the 13,790
  `.cps` Fusion post files. Embed via `scripts/mine-galaxy-transcripts.mjs` → Obsidian
  synthesis → `tribal-embed-index.json`. Target: ≥90% of 160K NC programs indexed
  (current: unknown — query `prism_memory:semantic_search query="post-processor NC program"`
  to gauge hit rate before embedding).

- **CAG cold-anchor:** cache the PostProcessorPipelineEngine 7-phase / 38-stage contract
  (CLAUDE.md §7) + the 14-controller dialect feature matrix + the 8 domain gotchas
  (CLAUDE.md §5) via `scripts/lib/cag-router.mjs` so every reasoning-bridge call to
  `galaxy-reasoning-bridge.mjs post-processor` has the pipeline spec at zero I/O cost.

- **NN/GNN features:** the 8 stub-wired controller-specialist engines
  (`WEDMPostMitsubishiEngine` etc.) and ~14 AGI-tier dark engines are the primary
  `ghost.unwired-engine` candidates for the GraphSAGE tier-5 wiring-inference cascade.
  Feature vectors needed: engine name embedding (768d), import-graph edges (which engines
  call which), dispatcher action string TF-IDF. Coordinate with india for refpool seeding
  — write a `reference_echo_gnn_candidate_engines_2026_06_26.md` listing the 22 ghost nodes.

- **LoRA dataset:** `post_processor_lora_{train,test}.jsonl` — instruction pairs derived
  from the transcript synthesis (`state/shared/galaxy-transcript-mining/post-processor/
  _SYNTHESIS.md`) + real post emit/validate round-trips through `prism_pp`. india trains.
  Target split: 80/20, ≥500 pairs, covering all 14 controller dialects.

- **Engineered loop + cron:**
  - Nightly (02:17): `node scripts/mine-galaxy-transcripts.mjs --galaxy post-processor`
    → synthesis → `prism_knowledge:tribal_capture slot=echo` for net-new tribal tips.
  - Nightly (03:44): `node scripts/post-gen-reward.mjs` over a random 500-program NC
    sample from JM Die corpus → reward scores → outliers flagged for LoRA augmentation.
  - Acceptance signal: tribal tip count ≥ 130, tribal rerank hit-rate ≥ 40% on
    post-processor queries, wiki entries ≥ 8 for this galaxy.

- **Ollama offload:** explain `.cps` / `.pst` post files → `qwen2.5-coder:32b`;
  deep dialect-semantics reasoning + P1 physics tradeoffs → `gpt-oss:120b`;
  quick synthesis / summarize → `gpt-oss:20b`. Controller numeric defaults (feed-rate
  limits, spindle maximums, axis travels) stay `src/physics/constants.ts`-gated —
  never route to Ollama for canonical values.

---

## §4 — Test plan (real assertions — R9)

- **Unit (reference-value / algebraic-invariant):**
  - `GCodeSafetyAnalyzerEngine.test.ts` — extend with: (a) coolant-before-spindle trap
    must FAIL when M8 precedes M3; reference: CLAUDE.md §5 gotcha #2; (b) safe-retract
    missing between ops must WARN; (c) G93/G94/G95 feed-mode mismatch detection.
  - `GCodeTranspilerEngine.test.ts` — round-trip: Okuma OSP `G15 H1` → Fanuc `G54` work
    offset translation must not alias (reference: `okuma-dialect-knowledge.ts` + CLAUDE.md §5).
  - `PostProcessorPipelineEngine.test.ts` — the 7-phase P0→P6 contract: assert that a
    valid NCI → real NC block → byte-equiv vs `mcp-server/data/programs/` golden sample;
    physics output (P1 Kienzle force/temp) must be non-stub (`AtomicValue.source` ≠ "stub");
    constants sourced from `src/physics/constants.ts` not inline.
  - `MasterPostFineTuningEngine.test.ts` — Welford variance fix (commit bb0cd23d4a):
    variance for 10× identical reward must be ≤ 0.01 (algebraic invariant); 46/46 green.
  - `GCodeRuntimePredictorEngine.test.ts` — cycle-time estimate for a 1,000-line Hurco
    finish program must fall within ±15% of JM Die actual shop time (reference: JM Die
    Job Cost actuals from `mcp-server/data/` — verify path via `prism_data`).

- **Integration (through the dispatcher — not the singleton):**
  - `prism_pp:pp_generate` → `prism_pp:pp_validate` round-trip for Hurco WinMAX dialect:
    assert emitted NC passes `post-nc-dialect-lint.mjs --dialect hurco --strict` with 0
    violations (8-rule linter wired as PostToolUse guard).
  - `prism_pp:pp_analyze` on a known-bad over-travel NC (golden fixture:
    `state/shared/specs/CIMCO-KNOWN-BAD-NC-*` from commit 99c6bb8b7f) must return
    at least one `overtravel` finding with axis + magnitude.
  - `camDispatcher:post_generate` for Haas NGC dialect: verify `G53 Z0.` home move
    present, `M30` end-of-program, no `M02` (Haas convention differs from Okuma).
  - `prism_pp:pp_outcome_emit` must publish to OutcomeCaptureBus with `domain:'post_processor'`
    and a non-empty `reward` field (closes the phantom-until-0777fda9d2 wiring).

- **E2E (JM Die live data):**
  - Load `JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_WINMAX.cps` → emit NC for
    the SEMBLEX TRILOBE PUNCH OP20 (from Kienzle Post design: S3104 F460, D2 58HRC) →
    lint → compare structure to Kienzle-generated reference in `.dc.html` `genOkuma()`.
  - Alarm lookup E2E: feed OSP alarm code `1234` → `prism_pp:pp_analyze` alarm path →
    must return cause list + fix steps matching `MASTER_ALARM_DATABASE.json` entry.

- **Coverage floor:**
  - Happy path: valid NCI → NC emit → lint pass.
  - Failure modes (≥3): (a) missing M3 before M8 → P5 gate BLOCK; (b) G68.2 in a
    2-axis Haas post → validation ERROR (unsupported 5-axis cycle on 3-axis machine);
    (c) subprogram M98 without M99 return → modal-leak WARNING.
  - Adversarial (≥2): (a) NaN feed-rate injected into ToolpathBlock → pipeline must not
    emit NaN in NC; must return structured error; (b) empty NCI (zero blocks) → pipeline
    must return empty NC with P0 defaults only, not crash.
  - Spanning configs (≥3): Okuma OSP-P300 (mill-turn), Haas NGC (3-axis mill),
    Heidenhain TNC (conversational klartext) — each must emit syntactically correct NC
    per their dialect validator.

- **Target test files to add/extend:**
  `GCodeSafetyAnalyzerEngine.test.ts` · `GCodeTranspilerEngine.test.ts` ·
  `PostProcessorPipelineEngine.test.ts` · `GCodeRuntimePredictorEngine.test.ts` ·
  `prism_pp.integration.test.ts` (new — dispatcher round-trip) ·
  `AlarmDB.coverage.test.ts` (new — Stage-5.1b vs full 2,588-entry set).
  ~36 post engines still untested per MEMORY.md 2026-06-24 — batch via Agent fanout
  (Sonnet model, groups of 4 max per Workflow gate).

- **Runner:** `cd mcp-server && rtk npx vitest run -t "GCode|MasterPost|Post|Alarm"`
  CI gate green before any commit to `slot/echo`.

---

## §5 — Simulation plan

- **What to simulate:** dry-run NC programs through `PostProcessorPipelineEngine` with
  real JM Die fixture geometry (available in `JM DIE/` CAD files); backplot verification;
  cycle-time Monte-Carlo; alarm injection.

- **Tools:**
  - `prism_pp:pp_analyze` (backplot + collision check via `GCodeSafetyAnalyzerEngine`).
  - `node scripts/post-nc-dialect-lint.mjs <file.nc> --dialect <d> --json --strict`.
  - `node scripts/post-gen-reward.mjs <out.nc> --dialect hurco --golden <ref.nc>`
    (reward components: lint + structure + alarm + golden byte-equiv).
  - `GCodeRuntimePredictorEngine` for cycle-time prediction per NC block.
  - `ml_dtw` (DynamicTimeWarping via `prism_algorithm`) for elastic structure-diff of
    emitted vs golden NC when byte-equiv fails.

- **Scenarios (≥3 spanning + ≥2 adversarial):**
  1. **SEMBLEX TRILOBE PUNCH OP20 finish** — Hurco WinMAX, D2 58HRC, S3104 F460 mm/min
     (values from Kienzle Post `.dc.html`). Assert: lint 0 violations; cycle-time within
     ±12% of 9.8 min (Kienzle reference); safety gate PASS.
  2. **5-axis reorient on M460V-5AX** — triggers OSP G68.2 (NOT G54.4). Assert: G68.2
     present in output, G54.4 absent; B-axis unclamp M10 precedes rotary move.
  3. **Wire-EDM post emit — Mitsubishi MV1200** — route through `WEDMPostMitsubishiEngine`
     (currently stub-wired). Assert: E-number format, tension code, wire-feed present;
     no mill G-codes in output.
  4. **Adversarial: over-travel injection** — inject a Z-move past the M460V Z610.0 soft
     limit. Assert: `GCodeSafetyAnalyzerEngine` returns `overtravel` finding before P6 emit.
  5. **Adversarial: zero-block NCI** — empty toolpath input. Assert: pipeline returns
     structured error at P0, no NC file emitted, no crash, no NaN.

- **Pass criteria:**
  - Lint: 0 violations on all 3 spanning scenarios (strict mode).
  - Cycle-time: MAPE ≤ 15% vs JM Die actuals for Hurco finish scenario.
  - Safety gate: S(x) ≥ 0.90 for the SEMBLEX finish scenario (validated + optimized path).
  - Reward score (`post-gen-reward.mjs`): ≥ 0.80 composite for Hurco finish.
  - Byte-equiv or DTW structural-match ≥ 0.92 vs golden NC archive.

---

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:**
  - Load real JM Die NC programs from `JM DIE/PRISM MODIFIED POST PROCESSORS/` (12 `.cps`).
  - Re-emit each via `prism_pp:pp_generate` with matching controller dialect.
  - Run `post-gen-reward.mjs --golden <original>` on each emitted output.
  - Report: reward distribution (mean ± σ), lint violation counts per controller,
    cycle-time MAPE across all 12 posts.

- **Acceptance gates:**
  - Byte-equivalence or DTW structural-match ≥ 0.90 on all 12 JM Die `.cps` re-emits.
  - Lint violation count = 0 for Haas / Okuma / Fanuc (the 3 primary JM controllers).
  - Cycle-time MAPE ≤ 15% for programs where JM Die actual time is available in Job Cost.
  - `pp_outcome_emit` publishes on every real post-gen (verify via OutcomeCaptureBus log).
  - AlarmDB Stage-5.1b must flag ≥ 95% of the known-bad fixtures (from the CIMCO
    over-travel NC committed in 99c6bb8b7f).

- **Safety gate:** `prism_safety:validate_physics` on P1 physics outputs (Kienzle force /
  Taylor tool-life / cutting temperature) for every JM Die scenario. S(x) ≥ 0.90
  shop_floor required before any NC is marked MACHINE-READY (mirrors the Kienzle Post
  UI's safety-gate card: validated only when safety score clears).

- **Parity probe:** the Kienzle Post frontend page (PostProcessorPage.tsx) must display
  cycle-time, safety score, and dialect within ±5% / exact-match of the backend
  `prism_pp:pp_generate` JSON response. Automate via Playwright MCP assertion.

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** `PostProcessorPipelineEngine` P6 must auto-call `pp_outcome_emit`
  (the remaining hot-path wiring per MEMORY.md) — every real post-gen publishes
  `{slot:'echo', domain:'post_processor', reward, dialect, controller, ncLines, cycleTimeSec}`
  to the OutcomeCaptureBus. This is the prerequisite for all downstream loops.

- **LoRA:** post-gen sessions where `reward < 0.70` (lint fail, cycle-time off, safety HOLD)
  → append to `post_processor_lora_train.jsonl` as negative examples with corrected output.
  High-reward sessions (reward ≥ 0.90) → positive examples. india retrains on the
  next weekly batch. Promote IFF the trained model improves mean reward ≥ +0.05 on the
  12 JM Die `.cps` validation set.

- **RAG/CAG:** new tribal tips captured via `prism_knowledge:tribal_capture slot=echo`
  → auto-embedded by the nightly `tribal-embed-index` cron → refresh the CAG cold-anchor
  (galaxy-reasoning-bridge.mjs post-processor) with updated doctrine corpus.

- **NN/GNN:** the 22 ghost-node candidates (8 stub-wired + ~14 AGI-tier dark engines)
  + the `pp_outcome_emit` labeled edges → refpool via `scripts/vault-to-gnn-refpool.mjs`.
  Retrain trigger: india's `nn-graph-retrain-lifecycle.mjs --force` when refpool grows
  by ≥ 10 new post-processor nodes. Promote IFF AUROC ≥ 0.78 / macro-F1 ≥ 0.55 /
  Brier ≤ 0.15 (or selective-deploy gate: emitted-set Brier ≤ 0.05 at minConf 0.70).

- **Trigger + cadence:** nightly transcript mining (02:17) feeds tribal/RAG;
  weekly LoRA batch (Sunday 01:00 via india's cron); GNN retrain on refpool-growth
  threshold. All cadences coordinated via `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md`.

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

### Page 1 — Post Processor (Kienzle Post.dc.html)

- **Assigned Kienzle page:** `mcp-server/web/design-imports/kienzle-app-build/Kienzle Post.dc.html`
- **Target React page:** `mcp-server/web/src/pages/PostProcessorPage.tsx` — **REUSE/EXTEND**
  (Codex Page Protection: file already exists, do not create a new page).
  Audit the existing page against the `.dc.html` intent; fill any gaps.

- **UI structure to implement (from the .dc.html):**
  - Left panel (330px): SOURCE card (file name, CAM label, raw-lines count) + MACHINE &
    CONTROL section (machine dropdown: Okuma Multus/M460V, Haas VF-2, Mikron/Heidenhain,
    Mitsubishi MV1200; controller dialect selector cards with NATIVE badge) + OPERATION
    dropdown (profile finish, adaptive rough, peck drill, bore+chamfer) + POST OPTIONS
    chip-toggles (Full modal/line, Coolant M08, High-speed mode, Probe datum, Kienzle S/F
    inject) + JM TRIBAL RULE card (auto-surfaced from tribal injection, amber border).
  - Right panel: 38-stage pipeline progress bar (5 phase groups with tick visualisation,
    P5 colors to amber on safety HOLD) + safety gate status card (MACHINE-READY / PREVIEW
    ONLY with green/amber coloring) + G-code viewer (syntax-highlighted, JetBrains Mono,
    line numbers, scrollable 286px height) + 4-metric footer row (RAW CAM CYCLE
    strikethrough, KIENZLE CYCLE + % faster, SAFETY GATE score, FEEDS FROM Kienzle solver).
  - Header: "Post Processor" title + MASTERPOST · jobLabel subtitle + CAM→dialect badge
    + Download .nc / Download preview button.

- **Backend wiring:**
  - `prism_pp:pp_generate` — emit NC for selected machine/dialect/operation (primary call).
  - `prism_pp:pp_validate` — returns safety gate status + lint violations.
  - `prism_pp:pp_analyze` — returns pipeline stage pass/fail breakdown + cycle-time.
  - `camDispatcher:master_post_get_strategy` — fetch available dialects for selected machine.
  - `prism_pp:pp_outcome_emit` — publish post-gen outcome (fire-and-forget on download).
  - Web API client: `mcp-server/web/src/api/postProcessorApi.ts` (create if absent,
    reuse pattern from existing api/ clients).
  - Express route: verify `POST /api/v1/pp/generate` exists in `:3100` routes;
    add if absent — wire to `ppDispatcher`.

- **Design language:** iOS fleet language per `web/DESIGN.md` tokens + Calculator-Studio
  accent for the G-code viewer (dark HUD, JetBrains Mono for all NC output and metrics).
  Use `var(--border)`, `var(--fg-dim)`, `var(--accent-orange)` (maps to `#FF5A2B`
  from `.dc.html`) — never inline hex. Safety gate: emerald (`var(--status-emerald)`)
  for PASS, amber (`var(--status-amber)`) for HOLD. Tap targets ≥ 44pt on all chip-toggles
  and dialect selector cards. Wrap in `<MobileSafeArea>`.

- **Build/verify loop:** edit → `rtk npm run build:fast` → Playwright MCP screenshot at
  desktop (1360×852), iPhone 14 (390×844), Pixel 7 (412×915) → compare to `.dc.html` →
  iterate. Three screenshots per change minimum.

- **Acceptance:** page renders with live `prism_pp` data; dialect switch updates G-code
  viewer in ≤ 200ms; parity probe (§6) passes; 3-viewport screenshots match `.dc.html`.

### Page 2 — Alarm Decoder (Kienzle Alarm Decoder.dc.html)

- **Assigned Kienzle page:** `mcp-server/web/design-imports/kienzle-app-build/Kienzle Alarm Decoder.dc.html`
- **Target React page:** `mcp-server/web/src/pages/AlarmPage.tsx` — **REUSE/EXTEND**
  (file already exists; audit and extend rather than replace).

- **UI structure to implement (from the .dc.html):**
  - Left panel (330px): controller selector dropdown (Okuma OSP-P300, Fanuc 31i, Haas,
    Mitsubishi WEDM) + ENTER ALARM section with live code display (prefix + code + pulse
    indicator) + descriptive hint + RECENT FAULTS list (severity dot, alarm code, short
    description, machine tag, click-to-select).
  - Right panel: alarm title with controller label + severity badge (color-coded:
    red=critical, amber=warning) + plain-language description + 2-column grid:
    LIKELY CAUSES (percentage-ranked) / FIX IN ORDER (numbered steps) + RAW + REFERENCE
    panel (raw alarm string, manual ref, self-resettable flag) + KIENZLE SEES insight
    panel (orange accent — contextual AI insight from `prism_pp:pp_analyze` alarm path).

- **Backend wiring:**
  - `prism_pp:pp_analyze` with alarm code + controller → returns cause list, fix steps,
    severity, raw string, manual reference.
  - `camDispatcher:lathe_selfaware_get_alarms` (if the lathe alarm surface overlaps) or
    direct AlarmDB query via a new `prism_pp:pp_alarm_lookup` action (verify exists in
    655-action surface before creating).
  - Web API client: `mcp-server/web/src/api/alarmApi.ts` (create or extend).
  - Express route: `GET /api/v1/pp/alarm/:controller/:code` → ppDispatcher.

- **Design language:** same iOS fleet language; severity spectrum maps to PRISM status
  tokens: `var(--status-red)` for critical (sev 1), `var(--status-amber)` for warning
  (sev 2). KIENZLE SEES panel uses `var(--accent-orange)` border to match `.dc.html`.
  The recent-faults list uses `var(--surface-2)` cards with hover state via
  `transition: 0.18s ease`. All font sizes ≥ 16px on inputs to prevent iOS zoom-on-focus.

- **Acceptance:** alarm lookup round-trips AlarmDB (2,588 entries); Okuma OSP `1234 P`
  returns B-axis overload cause+fix; severity badge colors correct; 3-viewport verify.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - india — LoRA retrain + NN/GNN refpool growth (§7); india must have OutcomeCaptureBus
    consuming `pp_outcome_emit` before the closed loop is truly end-to-end.
  - U-LEGAL-13 — MS-MASTERPOST (44 units) cannot ship until legal review clears; all
    MasterPost product-line deepening is gated.
  - Operator go-ahead — 12 dormant `slot/echo` commits must be reviewed before integration.
  - quebec — implements the `.dc.html` UI; echo owns the backend API the pages consume.

- **Blocks:**
  - lima (academy) — GCode safety patterns + dialect cheat-sheets feed operator-training
    leaves; echo's tribal deepening (§3) is the upstream.
  - india — post outcome data feeds the LoRA training pipeline; the `pp_outcome_emit`
    auto-call (§7) must land before india's next post-domain retrain.

- **Logical order (R13):** close `pp_outcome_emit` wiring (P6 auto-call) → complete
  3-of-3 scrutiny for U-PP-BACKPLOT-G0NORM → deepen tribal/wiki (§3) → build test suite
  (§4) → run simulations (§5) → live-data validation (§6) → fine-tune loop wired (§7) →
  frontend build (§8). Frontend last — never a UI atop an unproven backend.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: `pp_outcome_emit` auto-called from PostProcessorPipelineEngine P6 (no-orphan);
  AlarmDB Stage-5.1b verified against full 2,588-entry `controller-alarm-database.json`;
  all new API routes registered in `:3100` Express app; frontend pages call live dispatcher.
- [ ] TEST: real reference/invariant tests green; happy + ≥3 failure + ≥2 adversarial +
  ≥3 spanning configs; dispatcher round-trips pass; `rtk npx vitest run -t "GCode|Post|Alarm"` 100% green.
- [ ] VALIDATE: 12 JM Die `.cps` re-emits score ≥ 0.90 reward; cycle-time MAPE ≤ 15%;
  Stage-5.1b catches ≥ 95% of known-bad fixtures; parity probe frontend↔backend ≤ ±5%.
- [ ] APPLY: tribal tip count ≥ 130; deepening cron live; PostProcessorPage.tsx +
  AlarmPage.tsx rendering live data at `:3100`; 3-of-3 Stop gate PASS; per-file 2-arm
  scrutiny on every code file; U-PP-BACKPLOT-G0NORM 3-of-3 completed.
