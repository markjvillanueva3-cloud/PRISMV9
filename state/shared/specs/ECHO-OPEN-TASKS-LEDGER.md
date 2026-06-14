# ECHO OPEN-TASKS LEDGER (post-processor galaxy) -- STABLE single-read context surface

> **Purpose:** the ONE file a fresh echo session reads to regain full context on every open /
> unfinished / built-but-unwired / dormant thread in the post-processor domain. Stable filename
> (NOT date-stamped) so it is always findable. Distinct from the auto-consolidated handoff (noisy)
> and the narrative galaxy brain (`mcp-server/src/engines/post-processor/MEMORY.md`).
> Pattern adopted from bravo's `U-BRAVO-OPEN-TASKS-LEDGER`. **Keep current** -- bump on each unit.

- **Slot:** echo (post-processor specialist) -- CAM toolpath -> controller-specific G-code emission.
- **Working tree:** `H:/prism` main shared tree, branch `cad-fusion-live-ms0`; commit with the
  `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` prefix (bypasses slot-commit-enforce; echo's established pattern).
- **Galaxy brain:** `mcp-server/src/engines/post-processor/{CLAUDE,MEMORY,PATHS,TOOLBELT,SOUL}.md`.
- **Last updated:** 2026-06-10 (slot echo, session c20ce37b) -- live-verified the status below.

---

## CONTEXT-REGAIN POINTERS (read these to go deep)
| Surface | What | Path |
|---|---|---|
| Full finalization roadmap (v2) | dependency-ordered, H-drive-wide ultracode synthesis -- THE plan | `state/shared/specs/ECHO-FORGE-ROADMAP-2026-06-09.md` |
| Today's verbatim context | 4 compaction roll-ups + all operator directives | `state/shared/context-recovery/echo-TODAY-2026-06-10.md` |
| CIMCO closed-loop status | sim-driver / UI-driver state + fidelity gaps | `state/shared/cimco/CIMCO-CLOSED-LOOP-STATUS-2026-06-09.md` |
| CIMCO sim-config tailoring | per-setting config plan (sim add-on ACTIVE) | `state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md` |
| Ollama deep-dive (17 slices) | raw extraction the roadmap was synthesized from | `state/shared/cimco/echo-forge-dive.{json,md}` |
| Older incomplete inventories | superseded but historically useful | `state/shared/specs/ECHO-INCOMPLETE-TASKS-INVENTORY-2026-05-17.md`, `ECHO-UNDONE-2026-05-18-19-COMPILATION.md` |
| JM fleet sim map | 15 machines -> .mcfg + sim-able classification | `state/shared/cimco/jm-fleet-sim-map.json` |

## OPERATOR GOAL (standing, verbatim distillation)
"Complete closed-loop testing of post-processors for ALL JM machines (CIMCO as the editor: code-correctness
+ simulation). Sim add-on is PAID + must be activated; tailor every CIMCO setting to our setup. If finished
overnight, start building posts for the highest-selling machines globally." + use Ollama for bulk work,
reserve Claude for safety/judgment; bounded concurrency (the 6-agent fan-out rate-limited twice).

---

## OPEN / UNFINISHED / DORMANT -- ROI-ordered (live-verified 2026-06-10)

### A. DORMANT SURFACE (built, never wired) -- highest leverage
- [DONE 2026-06-10] **U-PP-DISPATCHER-REGISTER** -- `prism_pp` is now LIVE. The `NOT ON THIS BRANCH`
  guard was confirmed STALE (the comment said "50 actions"; the enum has **654** top-level actions /
  6432 lines / 807 case-stmts; all 150 lazy engines present). Re-enabled the import + `registerPPDispatcher(server)`
  in `mcp-server/src/index.ts` + made the tool self-description honest (`${ACTIONS.length}`).
  VALIDATED 4 ways: build:fast bundles clean; runtime smoke registers `prism_pp` + 2 actions round-trip
  REAL output (pp_compat_list_controllers, pp_generate_header); 0 new tsc errors (648 are pre-existing
  baseline). HONEST CAVEAT: some individual actions may still hit stub/fallback paths (graceful
  `?? {error}`); the Phase-1 unmask (section B) refines those -- but the surface is no longer 100% dark.
- **MasterPost facade** -- U-MASTERPOST-FACADE: one canonical facade over
  MasterPostProcessor{UnifiedAGI,Genius,AGIOrchestration}Engine (4 entries -> 1). Dep: register.

### A2. STUB-ACTION UNMASK (now reachable since prism_pp is LIVE)
- [DONE 2026-06-10] **U-PP-UNMASK-CONTROLLER-TRANSLATE** -- `pp_controller_translate` was a genuine
  WRONG-ENGINE bug: wired to `PostProcessorTransformerEngine` (a neural diffusion/tokenizer with no
  translate/transform method) so it ALWAYS returned `{error:"translate not found"}`. Re-routed to the
  real `GCodeTranspilerEngine.transpile()` (added a `transpiler` getEngine key) + fail-loud dialect
  guard (transpiler supports 6 of the 13 pp controller enum). 5/5 real round-trip tests
  (`ppDispatcher.controller-translate.test.ts`: siemens MCALL + `;` comments, okuma `G15 H0`, guards). Commit follows.
- **HONEST CORRECTION + VERIFIED TRIAGE** (2026-06-10): the "37 stub" awk over-counts fallback TEXT.
  Per-action method-existence check of the echo-domain candidates -- ALL RESOLVE, none are genuine stubs:
  `pp_validate_program`->`verify()` OK · `pp_analyze_cps`->`analyzeFile()` OK · `pp_generate_gcode`->`process()` OK
  · `pp_strategy_best`->`getBestStrategy()` OK · `pp_strategy_stats`->`getStats()` OK · `pp_formula_apply`->`applyFormula()` OK
  · `pp_graph_query`->`calculate()` OK. **`pp_controller_translate` was the ONLY genuine echo-domain break**
  (wrong engine) -- FIXED (`d671f0f1af`). => **The autonomous-safe echo-domain unmask work is EXHAUSTED.**
  Any remaining genuine stubs are CROSS-DOMAIN (`pp_physics_*`->bravo, `pp_neural_*`->india, `pp_kinematics_*`->machine-setup)
  and are NOT echo's to inline (soul refuse) -- wire to the owning-galaxy engine or leave routed. Re-triage rule:
  a fallback-text match is NOT a stub unless BOTH tried methods are absent on the resolved engine.

### A3. CROSS-DOMAIN STUB ROUTING (audited 2026-06-10 -- NOT echo-fixable autonomously)
Per-method audit of the cross-domain pp actions on their (echo-owned) post engines:
- `pp_neural_classify` -> RESOLVES via `classifyController()` (functional, not a stub).
- GENUINE stubs with NO clean rename target (engine exposes unrelated public methods):
  `pp_neural_predict` (NeuralNetworkEngine has classifyController/comprehensiveAnalysis/analyzeWithHMM,
  no predict/inference) · `pp_physics_forces` + `pp_physics_thermal` (PhysicsAwareGeneratorEngine's
  public surface is generatePhysicsAwarePost/getStatistics, no force/thermal calc) · `pp_kinematics_analyze`
  + `pp_kinematics_transform` (MachineKinematicsEngine is a topology/machine DB -- getTopologies/
  recommendBuildQualityTier -- no analyze/transform/RTCP).
- **DECISION:** these need REAL physics/neural/kinematics logic = echo's soul REFUSES to inline. They are
  owning-galaxy work (physics->bravo, neural->india, kinematics->machine-setup) OR a deliberate echo+owner
  collaboration to define the correct method mapping. NOT an autonomous echo reroute. => the full prism_pp
  stub investigation is CLOSED for echo: 1 real echo break fixed (controller_translate), rest resolve or
  belong to other galaxies. No phantom-stub chasing.

### B. MASKED / DARK ENGINES (built, not real) -- PHASE 1, must precede A
- **U-ECHO-WEDM-DIALECT-UNMASK** -- make Sodick/Makino/Agie/Fanuc WEDM posts real + byte-equiv vs golden
  (Mitsubishi already real). NOTE: the roadmap's `engine.method?.()` grep pattern did NOT match on
  2026-06-10 -- re-locate the actual mask shape before assuming it persists.
- **U-PP-LATHE-LEARNERS-REAL** -- un-dark 3 lathe learners (LathePostProcessorAIEngine 73K = largest dark,
  JMDiePostProcessorLearningEngine, LathePostGeneratorActiveLearningEngine): >=1 real path each.
- **U-PP-AGI-SURFACE** -- ~14 AGI post engines: >=1 REAL dispatcher-invoked case each.

### C. PHASE 0 HYGIENE (cheap, no deps)
- [DONE 2026-06-10 `bb0cd23d4a`] **U-ECHO-FINETUNE-RED-GREEN** -- true Welford variance + decoupled
  stability; MasterPostFineTuningEngine.test.ts 44->46/46.
- **U-PP-KIENZLE-EMIT-REGRESSION** -- assert emitted F/S == physics-core output through
  PostProcessorPipelineEngine P1 (Hurco/Okuma/Haas goldens). On-domain, autonomous-safe.
- **U-PP-MISSING-ENGINE-TESTS** -- 7 absent engine tests. CAVEAT: several (ThermalWearCoupling,
  SpeedFeedOrchestrator, ConstitutiveModel...) are PHYSICS engines = oscar/india territory, NOT
  post-processor. Coordinate or defer the cross-domain ones.

### D. CIMCO CLOSED-LOOP (the operator's #1 north-star) -- live-CIMCO, partial op-gated
- **CONTINUE-FROM (in-flight, from handoff):** **U-CIMCO-COMBO-WRITE + LOAD-MACHINE** -- WRITE op,
  full 3-of-3. Extend `set-setting` to combos (CB_GETCOUNT + per-index CB_GETLBTEXT find-by-name ->
  CB_SETCURSEL -> WM_COMMAND CBN_SELCHANGE -> read-back -> safe-discard / --persist). Then load-machine
  on Backplot Setup (Control Type cid 14639 + Machine setup cid 14307 per jm-fleet-sim-map.json).
  EVAL: over-travel NC -> Report limit row -> verdict FAILS (proves the loop catches problems).
  Driver: `mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs` (75940 bytes, Win32-only;
  ops map/find/invoke/window-info/read-report/invoke-read/list-windows/setup-pages/read-setting/
  set-setting/combo-read). Build: `build.ps1` (framework csc, no SDK).
- **U-CIMCO-FSM-LIVE-DRIVE** (roadmap PHASE 5, ~2-3d) -- the ONLY remaining [NOW] tech unit on the
  critical path: navigate -> run -> read-report -> assessLiveRunClearance 5-gate, end-to-end.
- **FIDELITY CEILING (honest):** sim reads are header-only until a `.mcfg` machine + stock geometry
  are loaded -- that is what load-machine targets; stock/fixture collision needs a per-setup body
  manifest that does not exist yet -> truthful verdict is "kinematics + tool-collision-only".

### E. OPERATOR-GATED (no code path around these)
- **U-CIMCO-OPEN-VMC01** -- operator opens CIMCO Edit FOREGROUND on VMC-01 (Codejock/Machine-Sim ribbon
  only realizes interactively; proven across 4 SIM-realize probes).
- **U-LEGAL-13** -- public-manuals-only provenance sign-off before ANY post ships to a live machine.
- **U-CIMCO-LIVE-E2E-VMC01 -> U-CIMCO-FLEET-ROLLOUT** -- 12 sim-able + 3 EDM-routed = 15/15.

### F. LATER
- **U-ECHO-GOLDEN-NC-CI** (PHASE 3) -- byte-equiv CI for >=6 controllers (adds Fanuc/Siemens/Heidenhain).
- **U-ECHO-FEEDBACKBUS-SUBSCRIBER / U-ECHO-JMPOST-FEEDER / U-PP-THERMAL-LITERATURE** (PHASE 4 learning loop).
- **U-ECHO-NN-REAL-TRAIN** -> india (real backprop loop, shares the triple schema).
- **U-ECHO-HURCO-DNC-CHAIN** (PHASE 7) -- full Hurco CAM->WinMax roundtrip with per-op physics gates + S(x)>=0.98.

---

## NEXT-ACTION (for the next echo session)
1. If fresh budget + want max ROI: **U-PP-DISPATCHER-REGISTER build-check** -- uncomment the import/call,
   `npm run build`, see if ppDispatcher.ts compiles on cad-fusion-live-ms0. If clean -> do Phase-1 unmask
   then register (full 3-of-3). If it errors -> log the errors here, they ARE the unmask work-list.
2. If continuing in-flight CIMCO work + operator present: **U-CIMCO-COMBO-WRITE + LOAD-MACHINE** (section D).
3. Autonomous-safe filler (no live CIMCO, no rate-limit risk): **U-PP-KIENZLE-EMIT-REGRESSION** (section C).
