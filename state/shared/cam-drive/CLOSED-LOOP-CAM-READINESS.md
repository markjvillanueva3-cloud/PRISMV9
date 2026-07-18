# CLOSED-LOOP CAM-GENERATION READINESS ASSESSMENT

> **Target:** closed-loop SELF-IMPROVING CAM program generation INSIDE Fusion 360, ultimately able to generate highly intricate **5-AXIS** and **MULTI-TURN** programs of **100+ operations** on the JM fleet (INCH / Okuma OSP). kilo drives Fusion **SCRATCH docs only** (delta owns live CAD).
> **Slot:** kilo · **Branch:** cad-fusion-live-ms0 · **Date:** 2026-06-01 · **Synthesis of 4 audits** (Fusion nav-map · offline chain · training harness · 5-axis/multi-turn).
> Honest framing (R12): the offline single-setup-turning spine is real and sound. Everything beyond single-setup turning — multi-WCS, multi-setup, 5-axis, multi-turn, and the live self-improving revolution — is mostly UNBUILT. This is a build-the-spine effort, not a wiring touch-up.

---

## 1. READINESS SCORECARD

| Area | %-Complete | One-line status |
|------|-----------|-----------------|
| **A. Fusion CAM-authoring nav-map** | **~55-60%** | Read/nav + doc(scratch) control + post-execute solid; operation AUTHORING (geometry/region selection, machine/WCS/stock-solid setup, 5-axis tool-axis, op edit, NCProgram, turning-op geometry) is the gap. |
| **B. Offline CAM-generation chain** | **~70% (single-setup turning only)** | part→plan→recipe→optimize→tool-bind BUILT, fail-loud, dialect-correct (Okuma G85/G87 LAP, G74 peck), corpus-grounded on 16,558 JM Okuma programs. NO multi-setup, NO 5-axis, matrix still 8 families (8→14 PENDING). |
| **C. Closed-loop training harness** | **~75% wired / 0% revolutions** | Producer + Consumer + Orchestrator + offline Trainer all BUILT & dispatcher-wired; loop is architecturally CLOSED but has NEVER run one live self-improving revolution (`state/outcomes/cam.jsonl` shard does not yet exist on disk). Live-arm (#4) + retrain-trigger (#6/#7) unbuilt. |
| **D. 5-axis + multi-turn (100+op)** | **~5% live-drive / ~0% closed-loop** | ~30 real engines (no stubs: MultiAxisKinematic 858L, Fusion5Axis 836L, MultiAxisPrintToProgram 950L, MillTurnSwiss, SubSpindle/PhaseSync, LiveTurretCAxis) exist but are vendor-siloed and NOT plumbed into the Fusion-scratch live-drive path. Multi-WCS entirely absent (0 G54/work-offset refs). |

**Composite:** ready for **offline single-setup INCH/Okuma turning generation**; NOT ready for intricate 5-axis / multi-turn / 100+op closed-loop generation.

---

## 2. WHAT IS BUILT

**Offline lathe chain (single-setup, simple→moderate turned parts) — BUILT & sound:**
- `scripts/lib/cam-turning-recipe-resolver.mjs` — pure `resolveRecipe`, fail-loud, 11/11 tests.
- `scripts/lib/cam-part-program-planner.mjs` — `planPartProgram` + `applyOptimizationRules` (v1.2, adversarially hardened) with static op-order rank table + advisory out-of-order warnings.
- `scripts/lib/cam-tool-binder.mjs` — fail-loud `bindTool` + explicit data contract (ready; awaits ShopTool CSVs).
- Physics-delegated (NO inlined constants), corpus-grounded on real **16,558** JM Okuma programs, dialect-corrected for **Okuma OSP** (G85/G87 LAP cycles, G74 peck — NOT Fanuc G75).

**Corpus + dialect-correct matrix/rules:**
- `state/shared/cam-drive/CAM-OP-TEMPLATE-MATRIX.json` — **8-family** turning matrix (single-setup).
- `state/shared/cam-drive/CAM-OPTIMIZATION-RULES.json` — optimization rules v1.2.
- Trainer `scripts/cam-build-corpus-and-train.mjs` runs real on **34,989** JM `.MIN`: spindle RPM R²≈0.3-0.5 (real signal); FEED model corrected to mm/REV target (CSS shop) — regex fixed, per-rev populates explicit-G95 subset.

**Closed-loop harness (all stages BUILT + dispatcher-wired into `camDispatcher`):**
- PRODUCER — `CAMDriveRecipeEngine` + `CAMDriveRecipeAdapter` → `cam_drive_recipe_{compile,execute,replay}` (LLM-free, fail-closed, stage-derived safety gate; configured to emit `domain:"cam"` outcomes).
- CONSUMER — `CamOutcomeFeedbackAdapterEngine` + `OutcomeFeedbackWireEngine.computeCorpusDelta/shouldRetrain` → `cam_outcome_feedback_compute_delta` (schema mismatch closed).
- ORCHESTRATOR — `SelfLearningLoopOrchestratorEngine` (pure FSM idle→classify→emit→observe→outcome→delta→retrain_signal) → `cam_self_learning_loop_step` (retrain threshold = 50 outcomes).
- FEATURE-RECOGNITION — `CAMFeatureLearningEngine` (rule/keyword PRODUCTION, not a stub).

**Fusion scratch-doc control + nav endpoints (`fusion360_api_server.py`) — solid:**
- Doc control ~95%: `/new` (scratch-by-default + registry), `/documents`, `/doc/close` (R14-safe), `/doc/save`, `/doc/save-as`, `/data/file/open`.
- Read design/geometry/features ~95%: `/design/{tree,features,parameters,selection}`, `/geometry`, `/cam/geometry-detail`, `/cam/feature-candidates`.
- Read CAM tree ~80%: `/cam/setups`, `/cam/setup/stock`, `/cam/setup/bodies`, `/data/file/metadata`, `/post/programs|library`.
- Post/NC ~70%: `/cam/toolpath` (async + status poll), `/cam/post` (setup→.cps→G-code, INCH/mm units).
- Op create (partial): `/cam/setup` (name/type/models/box-stock), `/cam/operation` (21-strategy map incl. swarf/multiAxisContour + `raw_parameters`), `/cam/assign-tool`.

**5-axis/multi-turn physics (siloed, real, not fused):** MultiAxisKinematicEngine, Fusion5AxisEngine, MultiAxisPrintToProgramEngine, MillTurnSwiss/Orchestration, LatheSubSpindleTransferPurge, PPOkumaSubSpindleSync, LiveTurretCAxis, LiveTooling{,Intelligence,Syntax} — many wired as `prism_cam` actions, but NOT plumbed into the live cam-drive path.

---

## 3. BUILDABLE NOW (unblocked, dependency-ordered — R13)

Each item sits on a proven foundation; do not start a consumer before its dependency ships.

1. **#46 — Matrix 8→14 expansion** *(BLOCKS everything intricate)*. Add to `CAM-OP-TEMPLATE-MATRIX.json` + planner `LATHE_OP_ORDER`: **profile/contour** (largest unrepresented corpus class — everything intricate depends on it), face_grooving, chamfer, bore_finish, live_tool, peck_drill. Pure offline, corpus-grounded, no external dep.
2. **#4 — U-CAM-LOOP-ARM (live-feed arm)**. At bootstrap, dual-emit real outcomes + `enableOutcomeObservation()` so outcomes auto-flow to `state/outcomes/cam.jsonl`. **This is what first materializes the shard** and starts the corpus growing from real cuts. (Producer/consumer/orchestrator already wired — this is the missing arming call.)
3. **#7 + #6 — Retrain trigger + persist**. Wire orchestrator `retrain_signal` → invoke `cam-build-corpus-and-train.mjs` with a **promote-IFF metric gate**; persist orchestrator loop state; add a scheduled retrain task. Without this a delta never becomes a new model.
4. **#8 — mm/REV feed target into FeatureVector** + **#10 — full ~25-34K-corpus train**. Finishes the CSS-correct feed model and grows R² off the full Okuma corpus.
5. **#9 — E2E oracle test** (generate→drive(stub)→outcome→delta→retrain-decision) to lock the wiring against regression before live Fusion arrives.
6. **Op-ordering upgrade** — replace the single static rank with setup-scoped + tool-grouped ordering (minimize turret/tool changes), resolve rank-50 ties. Required before 100+op sequencing is meaningful. (Depends on #46 + the multi-setup model in §5.)
7. **Fusion nav-map authoring endpoints** (promote proven `/execute` calls to first-class routes — fastest path to "100% plotted"): (a) `/cam/operation/geometry` — assign machining boundary/faces/contours to an op *(single biggest nav gap for 100+op)*; (b) extend `/cam/setup` to plot `machine`, `stockSolids` (from-solid), `fixtures`+`fixtureEnabled`, `wcs_origin`; (c) `/cam/parameters/catalog?strategy=` — per-strategy valid-param enumeration to de-blind `raw_parameters`; (d) `/cam/operation/{edit,delete,reorder}`. These are buildable against the add-in code now, but live verification is gated (§4).

---

## 4. EXTERNALLY GATED (cannot proceed without operator/peer action)

| Item | Exact unblock |
|------|---------------|
| Live `adsk.cam` binding / true closed-loop harness (#5b) | **Operator: RESTART Fusion 360.** `:18365`/`:18360` still runs the OLD add-in; `fusion_strategy_verified=false` on all families until restart re-loads the updated add-in. (Dedicated Fusion instance per delta-coordination so kilo scratch docs don't collide with delta's live CAD.) |
| JM-tool-aware generation (#7-data) | **charlie/hotel: deliver ShopToolLibrary CSVs.** Binder + data contract are ready; the tool data is not on disk. |
| Live `prism_*` runtime dispatch | **MCP server must be UP.** Today only `node scripts/` direct execution works; dispatcher round-trips need the server running. |
| Nav-map endpoint *live verification* | Same Fusion restart — the new authoring routes (§3.7) can be coded offline but cannot be verified against a live CAM tree until the add-in is reloaded. |
| #43-style confirmations | Operator confirmation of the dedicated-Fusion / scratch-isolation arrangement before any live drive runs. |

---

## 5. PATH TO 5-AXIS + MULTI-TURN 100+OP (honest: large, mostly-unbuilt extension)

This is a build-the-spine effort beyond single-setup turning. Foundational physics is ~50% present but vendor-siloed; live-drive integration is ~5%; closed-loop self-improving 100+op generation is ~0%. Dependency-ordered (each on a proven foundation):

1. **Multi-WCS + setup-graph core** *(0% present — the spine all 100+op multi-setup programs hang on)*. G54..G59 / G54.1 work-offset model + per-setup datum/orientation; part = ordered setups (OP1/OP2, refixture, sub-spindle handoff) with `setup_id` and second-op datum. Nothing downstream is correct without it.
2. **JM Okuma fleet kinematic models** — B-axis tilt + C-axis rotary + sub-spindle as a 2nd channel, in INCH/OSP. Bind existing MultiAxisKinematicEngine/MachineKinematics to **real fleet configs** + the live bridge (today they are unbound).
3. **Sub-spindle transfer + phase-sync sequencer** — fuse LatheSubSpindleTransferPurge + PPOkumaSubSpindleSync into a real two-channel transfer (M-code handoff, C0 phase-match, cutoff→regrip→verify) emitting OSP-valid sync blocks on a channel timeline.
4. **C/Y-axis live-tool op library** — cross/face/polar milling, off-center drilling, polar interpolation. Corpus is only ~7% live-tool C/Y → needs corpus expansion + LiveTurretCAxis/LiveTooling promotion into drivable ops.
5. **Extend the live cam-drive bridge to 5-axis + multi-turn verbs** — add B-tilt/multi-axis/turning-channel op types to the Fusion360LiveBridge add-in + CAMDriveGate validation, so the engines from steps 2-4 actually actuate Fusion-scratch. (~5% today.)
6. **Expand corpus + matrix to 5-axis/multi-turn families** (finish #46, then add B-axis + sub-spindle + C/Y families) and **only THEN** re-target the self-learning loop (tasks #33-40) at multi-setup data. 100+op intricate generation is achievable only after 1-5 are proven.

---

## 6. VERDICT — ARE WE READY TO START CLOSED-LOOP TRAINING?

**NO — not for a *live* self-improving revolution today; YES — for offline corpus training + arming the loop now.**

- The loop is architecturally CLOSED and dispatcher-wired, but has **never completed one live revolution**; `state/outcomes/cam.jsonl` does not exist on disk (no real outcome has ever been emitted).
- **Blocking conditions for live closed-loop training:**
  1. **#4 live-arm unbuilt** — outcomes don't auto-flow to the shard (buildable now, kilo).
  2. **#6/#7 retrain-trigger unbuilt** — a delta never becomes a new model (buildable now, kilo).
  3. **Fusion restart required** — live `adsk.cam` binding is dead until the operator reloads the add-in (external).
  4. **ShopTool CSVs absent** — tool-aware generation blocked (charlie/hotel).
- **What CAN start immediately (no external dep):** offline trainer on the 34,989-program corpus, the #46 matrix 8→14 expansion, #4 arm, #6/#7 retrain wiring, and the #9 E2E oracle — i.e. build the loop to *armed-and-tested* so the first Fusion restart begins real revolutions.
- **Scope honesty:** even when armed, the loop trains on **single-setup turning only**. 5-axis/multi-turn/100+op closed-loop generation requires the §5 spine (multi-WCS → fleet kinematics → sub-spindle sync → C/Y live-tool → bridge verbs → corpus) and is months of build beyond turning.
