# Post-Processor Galaxy — slot:echo

> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = post-processor-domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

Echo owns the **CAM-output → controller-dialect translation** surface: post-processor engines, per-controller dialect mapping, G-code intelligence (validate/verify/safety/optimize/transpile/reverse), the MasterPost saleable product line, and the JM Die `.cps` fleet.

**EXCLUDES:** CAM strategy/toolpath generation → kilo; per-machine dynamics/setup → cam; shop-floor live execution → shop-floor galaxy; speed-feed physics → oscar; lathe turning physics → whiskey.

Slot: **echo** · Worktree: `H:/prism-slot-echo` · Branch: `slot/echo`
Git lane: commit to `slot/echo` only — not the shared integration tree. See `feedback_commit_to_slot_worktree`.

> **R12 — open reconciliation:** `slot/echo` holds 12 real unintegrated commits (PostEmitSafetyGate, PostFeatureAudit, PostLibrary, HURCO-POST-PIPELINE-BRIDGE iters 9–16). Do NOT blind-reset or blind-merge. Safe path: `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md`.

**File geography:** post-processor engines live FLAT at `mcp-server/src/engines/` (`GCode*` / `MasterPost*` / `*Post*` / per-vendor). `post-processor/` subdir = galaxy doctrine only (CLAUDE.md + MEMORY.md + PATHS.md + TOOLBELT.md).

---

## §2 — Verified engines

All names Glob-confirmed at `mcp-server/src/engines/`.

| Role | Engine file |
|---|---|
| MasterPost fanout (7-engine, 14-controller) | `MasterPostProcessorEngine.ts` |
| Unified AGI (14 controllers, 19 CAM systems, 25+ ops) | `MasterPostProcessorUnifiedAGIEngine.ts` |
| 7-phase / 38-stage emit pipeline | `PostProcessorPipelineEngine.ts` |
| Per-vendor calibration / LoRA learner | `MasterPostFineTuningEngine.ts` |
| JM Hurco WinMAX lead post (92K) | `HurcoV11MillMasterPostEngine.ts` |
| Central safety gate (rapid/coolant/retract) | `GCodeSafetyAnalyzerEngine.ts` |
| Snippet / template library | `GCodeTemplateEngine.ts` · `GCodeSnippetEngine.ts` |
| G-code intelligence orchestrator | `GCodeIntelligencePipelineEngine.ts` |
| Pre-emit gates | `GCodeValidationEngine.ts` · `GCodeVerificationEngine.ts` |
| Cross-controller transpile | `GCodeTranspilerEngine.ts` |
| Optimization | `GCodeEnergyOptimizerEngine.ts` · `GCodeOptimizationEngine.ts` · `GCodeBidirectionalOptimizerEngine.ts` |
| Cycle-time | `GCodeRuntimePredictorEngine.ts` · `GCodeTimeEstimatorEngine.ts` |
| NL→G-code / G-code→CAD | `GCodeUnderstandingTransformerEngine.ts` · `GCodeReverseCADEngine.ts` |
| CAM→post bridges | `Fusion360MillTurnBridgeEngine.ts` · `HyperMillCodeGeneratorEngine.ts` · `HyperMillACServerConfig.ts` |
| Fully wired (reference impl) | `PostProcessorUnificationEngine.ts` (4 actions) · `LatheMasterPostSelfAwarenessEngine.ts` (6 actions) |

**Controller-specialist — stub-wired (dark-in-practice):** single dispatcher case each; `"method not callable"` fallback = not live.
`WEDMPostMitsubishiEngine` · `WEDMPostSodickEngine` · `WEDMPostMakinoEngine` · `WEDMPostAgieEngine` · `WEDMPostFanucEngine` · `LathePostProcessorAIEngine` · `LathePostGeneratorActiveLearningEngine` · `JMDiePostProcessorLearningEngine`

**AGI-tier — fully dark (zero dispatcher case):** `MasterPostProcessorAGIOrchestrationEngine` · `MasterPostProcessorGeniusEngine` · `PostProcessorTransformerEngine` · `CrossCAMPostEngine` · `MachineFingerprintEngine` + registry/wiring stubs.

---

## §3 — Dispatcher quick-ref

**`prism_pp` / `ppDispatcher` is the PRIMARY post-processor MCP surface (655 `case "pp_` entries — verified by grep).** Use it BEFORE camDispatcher for any pp_ work. A camDispatcher-only search misses ~80% of the action surface.

| Dispatcher | Key action groups | Notes |
|---|---|---|
| `prism_pp` (ppDispatcher, 655 actions) | `pp_generate` · `pp_validate` · `pp_analyze` · `pp_translate` · `pp_controller_translate` · `pp_outcome_emit` · `ppg_*` | **PRIMARY** — verified ab0c5d5193 |
| `camDispatcher` (~155 post cases) | `lathe_postgen_*` (9) · `lathe_masterpost_*` (23) · `master_post_*` (17) · `pp_*` (10) · `pp_ai_*` (~30) · `pp_kb_*` (12) · `ppg_*` (~50) · `post_*` (~80) · `wedm_dialect_*` (3) · `wedm_post_*` (5 stub) · `lathe_selfaware_*` (6) | secondary |
| `productDispatcher` (24 actions) | `ppg_*` | PPG product surface |

**MCP-down fallback:** `node scripts/post-nc-dialect-lint.mjs <file.nc> --dialect hurco [--json] [--strict]`

**Skills:** `/post-generate` `/post-validate` `/post-harden` `/post-register` `/post-diff` · `/lathe-postgen` `/lathe-master-post` · `/post-status-echo`

---

## §4 — Canonical constants + data paths

**HARD RULE: NEVER inline G/M dialect tables, feed/speed values, or physics constants.**

| Constant family | Canonical source | Use |
|---|---|---|
| Physics (Kienzle kc, Taylor C/n) | `mcp-server/src/physics/constants.ts` | P1 pipeline force/temp/wear |
| Okuma dialect knowledge | `mcp-server/src/data/okuma-dialect-knowledge.ts` (verified) | Okuma dialect translation |
| Per-machine kinematics (3/4/5-ax, RTCP, mill-turn) | `mcp-server/src/data/machine-kinematics.ts` (verified) | G68.2 / multi-channel |
| Controller G/M dialect tables | `controller-knowledge.json` (verify path via `prism_pp`) | dialect translation — **NOT** `controller-dialects/<vendor>.ts` (dir does NOT exist) |

**Key data stores (query via `prism_data` — NEVER Glob/re-enumerate):**

| Store | Size | Path |
|---|---|---|
| AlarmDB | 2,588 alarms / 13 controllers | `mcp-server/data/controllers/` |
| PostProcessorDB | 34 registered posts | `mcp-server/src/registries/PostProcessorRegistry.ts` |
| MachineDB | 1,015 machines (incl. 21 JM fleet) | `mcp-server/data/machines/` |
| ToolDB | 13,967 tools | `mcp-server/data/tools/` |
| CAMSystemDB | 61 CAM system integrations | `mcp-server/data/databases/CAMSystemDB.json` |
| NC corpus | 160,582 programs | `JM DIE/` + `mcp-server/data/programs/` |
| Post definitions | 13,790 .cps (Fusion) + 52 Mastercam .pst/.spm | various |

Feed/speed → `cam_speedfeed_compute` (oscar SFC); physics → `src/physics/constants.ts`; dialect → controller-knowledge lookup.

---

## §5 — Domain gotchas / safety rails

1. **Feed-rate mode confusion** — G93 inverse-time vs G94 ipm vs G95 ipr. Mismatch = wrong cycle time or crash. Confirm before every block emit.
2. **Coolant sequence** — M8 (coolant ON) MUST come AFTER M3 (spindle at speed). M8 before M3 = wet floor, safety incident.
3. **Comment bracket dialect** — Okuma uses `[comment]`; Fanuc uses `(comment)`. Wrong bracket = alarm at controller.
4. **Modal state leak across subprogram calls** — leaked modal feed/mode on M98/M99 re-entry = silent wrong-feed on the resumed path.
5. **Safe retract missing between ops** — tool drags across part at feedrate. PostProcessorPipelineEngine P5 is the safety gate; never skip it.
6. **Heidenhain iTNC 530 vs TNC 7 incompatibility** — NOT code-compatible (G vs L format, cycle numbering differ). Never mix emit paths.
7. **G68.2 vs G54.4 semantics** — G68.2 = 5-axis WCS tilt; G54.4 = workpiece error compensation. Entirely different; never substitute.
8. **Decimal-point convention** — some Fanuc variants reject `0.5`, require `.5` (or vice-versa). Verify via controller-knowledge before emit.

---

## §6 — What NOT to do (echo refuses)

- **NEVER** emit NC by string-concatenation — always route through `PostProcessorPipelineEngine` 7-phase (P0–P6), especially P1 physics + P5 safety+tribal.
- **NEVER** skip P1 physics (Kienzle/Taylor force/temp/wear) — stubs P5 safety with no physical basis.
- **NEVER** skip P5 safety+tribal — collision on rapid, coolant sequencing errors, known-alarm patterns.
- **NEVER** inline feed/speed values — route through `cam_speedfeed_compute` (oscar SFC).
- **NEVER** inline dialect G/M codes — read from `controller-knowledge.json` + `okuma-dialect-knowledge.ts`.
- **NEVER** inline physics constants — import from `mcp-server/src/physics/constants.ts`.
- **NEVER** treat a single `engine.method?.()` dispatcher case with `"method not callable"` fallback as "wired" — that is stub-wired, dark-in-practice.
- **NEVER** ship a post change without byte-equivalence proof vs the golden NC archive (`MasterPostByteEquivalenceCI`).
- **NEVER** re-derive dialect codes from copyrighted manuals — MS-MASTERPOST gated on **U-LEGAL-13** (public manuals only: Fanuc B-61395E, Haas 96-0284, Mitsubishi IB-1501279, Siemens 840D, Okuma OSP-P300).
- **NEVER** touch `HurcoV11*` / `WEDMPost*` without chat-bus claim — 16 in-flight handoffs cross post-proc files.
- **NEVER** use `prism_cam` / `camDispatcher` alone for post queries — `prism_pp` (655 actions) is the PRIMARY surface; camDispatcher-only misses ~80%.
- **NEVER** claim `controller-dialects/<vendor>.ts` exists — that directory does NOT exist (PATHS.md audit 2026-05-29); use `okuma-dialect-knowledge.ts` + `controller-knowledge.json`.

---

## §7 — Domain workflow / pipeline contract

**PostProcessorPipelineEngine 7-phase emit contract (P0–P6):**

```
P0  defaults        — machine config, controller dialect, WCS, tool-table
P1  physics         — Kienzle/Taylor/Tlusty: force · temp · wear · Ra · power · torque
P2  block-by-block  — engagement / force / thermal / wear per NC block
P3  motion-opt      — feed override, arc-smooth, look-ahead
P4  stochastic CI95 — confidence interval on cycle-time + tool-life
P5  safety+tribal   — GCodeSafetyAnalyzer gate · AlarmDB cross-check · tribal tip citations
P6  output          — emit NC · byte-equivalence CI · xproc_outcome_publish
```

**JM Die fleet:** `JM DIE/PRISM MODIFIED POST PROCESSORS/` — 12 `.cps` (controllers: Haas Classic, Hurco WinMAX/MAX5, Okuma OSP-P300, Fanuc 31i). Wire-EDM post absent — generate via `WEDMPostMitsubishiEngine`.

**Alarm-aware post validation (doc CORRECTED 2026-06-24):** P5 Stage **5.1b** (`5.1b_alarm_check`, line ~3153, PP-MOAT-MS3 U05) DOES cross-check emitted blocks vs controller alarms via `AlarmRegistry` (`MASTER_ALARM_DATABASE.json`). Residual ⚠: confirm Stage-5.1b coverage spans the full 2,588-entry `controller-alarm-database.json` (not just AlarmRegistry's master set) — that completeness, not the wiring, is the remaining gap.

---

## §8 — Tribal + corpus pointers

**Wiki entries:**
- `[[architecture/post-processor-galaxy]]` — galaxy architecture map (echo-authored)
- `[[architecture/post-processor-controller-dialect-matrix]]` — 14-controller dialect feature matrix
- `[[architecture/post-processor-pipeline]]` — 7-phase / 38-stage emit pipeline

**JM Die corpus:** `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 24K-file tree directly. NC corpus: 160,582 programs at `JM DIE/` + `data/programs/`.

**Tribal capture rule:** `prism_knowledge:tribal_capture slot=echo` — NEVER write `knowledge/tribal/post-processor-*.md` directly (auto-overwritten by hook).

**Synthesis brain:** `mcp-server/src/engines/post-processor/MEMORY.md` · `PATHS.md` · `TOOLBELT.md`

**Open work:** `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md` (ROI-ordered). Coverage audit: `state/shared/specs/POST-GEN-COVERAGE-AUDIT-2026-05-29-echo.md` (~40%; 4 P0 machine gaps: Haas PRE-NGC, Roku-Roku, EA sinker, FA10S mis-route).

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|---|---|---|
| CONSUMES FROM | kilo (cam) | CAM toolpath (NCI/APT) → echo post emit; strategy+tool-list+WCS lossless |
| CONSUMES FROM | oscar (speed-feed) | `cam_speedfeed_compute` → `ToolpathBlock` → NC feed/speed injection |
| SHARES WITH | whiskey (lathe) | `LathePostProcessor*` · `lathe_postgen_*` · `lathe_masterpost_*` |
| SHARES WITH | mike (wedm) | `WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc}` — echo = dialect-emit, mike = cut-physics |
| SHARES WITH | foxtrot (mill) | mill toolpaths → mill NC; shares `MACHINE_FEATURE_DB` mill rows |
| PRODUCES TO | india (ai-training) | post outcomes via `JMDiePostProcessorLearning` / `LathePostGeneratorActiveLearning` / `PostProcessorAGIContinuousLearning` |
| PRODUCES TO | frontend-app (quebec) | G-code preview in web/mobile |
| CONSUMES FROM | pdf-corpus-mill | Haas/Mazak dialect mining feeds post knowledge |
| CONSUMES FROM | tribal-knowledge | cited-tip pipeline output into P5 safety phase |
| AUDITED BY | alpha (token-opt) | alpha audits echo's G-code template emissions for redundant blocks |
| FEEDS | academy (lima) | GCode safety patterns + dialect cheat-sheets → operator-training leaves |

---

## §10 — Closed-loop integration (india)

Per `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`:
Call `prism_pp:pp_outcome_emit` (or `xproc_outcome_publish {slot:'echo', domain:'post-processor'}` // UNVERIFIED action name — grep ppDispatcher before use) from PostProcessorPipelineEngine P6 on every real post-gen so outcomes reach india's OutcomeCaptureBus. Tribal learnings via `prism_knowledge:tribal_capture slot=echo` only. **Gap:** `pp_outcome_emit` auto-call inside the pipeline is echo's remaining wiring work (phantom until commit 0777fda9d2 per MEMORY.md 2026-06-11).

---

## §11 — Test commands

```bash
# Domain-filtered tests
cd mcp-server && rtk npx vitest run -t "GCode|MasterPost|Post"
cd mcp-server && rtk npx vitest run src/__tests__/GCodeSafetyAnalyzerEngine.test.ts

# Pure-node quality loop (no build / MCP needed)
node scripts/post-nc-dialect-lint.mjs <file.nc> --dialect hurco [--json] [--strict]
node scripts/post-gen-reward.mjs <out.nc> --dialect hurco [--golden ref.nc]
```

`post-nc-dialect-lint.mjs` — 8-rule static NC linter (coolant-before-spindle, feed-mode G93/G94/G95, retract, comment-style, modal-tap, program-end); wired as PostToolUse auto-guard `.claude/hooks/post-nc-dialect-guard.mjs`.

`post-gen-reward.mjs` — scored reward for HurcoV11 fine-tuning: `scorePost(nc, {dialect, golden, filename})` → `{reward, components:{lint,structure,alarm,golden?}}`; alarm gate uses `controller-alarm-database.json` (2,588 entries).

---

## §12 — Known bugs / open threads

- **`pp_outcome_emit` not auto-called in pipeline** — verified absent from PostProcessorPipelineEngine P6 (phantom until 0777fda9d2, MEMORY.md 2026-06-11). Remaining echo wiring work.
- **AlarmDB IS wired into P5 (doc CORRECTED 2026-06-24)** — `PostProcessorPipelineEngine` Stage **5.1b** (`5.1b_alarm_check`, line ~3153, PP-MOAT-MS3 U05) cross-references emitted blocks vs controller alarms via `AlarmRegistry` (data: `MASTER_ALARM_DATABASE.json`). Residual ⚠ (NOT "absent"): confirm Stage-5.1b coverage spans the full 2,588-entry `controller-alarm-database.json`, not just AlarmRegistry's master set.
- **FIXED 2026-06-24 — `U-PP-BACKPLOT-G0NORM` (commit `8f47872237`):** `PostValidationSuiteEngine.parseGCode` did `replace(/^G0*/, "G")` which collapsed `G0`→`G`, so `is_rapid` was ALWAYS false and `is_cutting` ALWAYS true → backplot **gouge + rapid-into-material detection were structurally DEAD**. Fixed (parse motion by numeric value) + 72-test companion proving both detectors fire. Memory [[reference_echo_backplot_g0norm_dead_safety_2026_06_24]]. NEEDS a full 3-of-3 next session.
- **Dormant slot/echo commits** — 12 unintegrated commits (PostEmitSafetyGate, PostFeatureAudit, PostLibrary, HURCO-POST-PIPELINE-BRIDGE iters 9–16); operator go-ahead needed before merge.
- **MS-MASTERPOST** — 44/44 units pending, gated on U-LEGAL-13. **WEDM-P2P-PRODUCTION-MS0** — 6/24 shipped.
- Open-task ledger: `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md`

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs post-processor "<question>"
```

Ollama routing for echo: explain a `.cps`/`.pst` post or diff two controller dialects → `qwen2.5-coder:32b`; deep domain reasoning (dialect semantics, P1 physics tradeoffs) → `gpt-oss:120b`; quick filter/synthesis → `gpt-oss:20b`. Controller numeric defaults stay `constants.ts`-gated — never route to Ollama for canonical values.

AI-systems fleet state: `knowledge/memories/patterns/ai-systems-fleet-state.md` — [[reference_ai_systems_fleet_state_2026_06_11]]

## AI Synergy (PSN leg #10)

This galaxy is a first-class AI-substrate **participant** -- it OWNS 6 AI engine(s) (e.g. `PostProcessorAICoordinationBridge`, `PostProcessorDeepLearningEngine`, `PostProcessorDeepReasoningEngine`), wired to PSN leg #10 via `post_get_prediction`, `pp_ai_deep_learning_analyze`, `pp_ai_causal_inference`.
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs post-processor "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/post-processor_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
