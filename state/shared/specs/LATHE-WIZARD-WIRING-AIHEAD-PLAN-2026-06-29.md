# Lathe Wizard -- Master Wiring + AI-Head Integration Plan (2026-06-29, slot:whiskey)

> Workflow wf_d061077f-bc0 (5 audit agents + opus synthesis). HEADLINE: only ~3% of built lathe capability (~14 of ~230 engines / ~466 MCP actions) is reachable at program-gen time; 66 AI engines (49 LoRA) built but ZERO called from runPipeline; GNN+CAG absent; 796 memories + 946 tribal never reach engine runtime. AI head = LatheAIOrchestrationEngine wrapping LatheOrchestrationEngine (21/35 stub). Multi-session + multi-slot (india owns AI-training, echo post, oscar SFC). Companion: LATHE-COMPENSATION-CATALOG-2026-06-29.md.

---

I'll synthesize the master plan from the 5 audits. This is a synthesis task — no file exploration needed; the audits are the authoritative source. Let me produce the build-ready plan.

# LATHE WIZARD — MASTER WIRING + AI-HEAD INTEGRATION PLAN

Synthesized strictly from the 5 audits. Build-ready, dependency-ordered, dedup-first.

---

## 1. LANDSCAPE SUMMARY

**Asset inventory (verified counts across the 5 audits):**

| Asset class | Count | Source audit |
|---|---|---|
| Lathe/turning `.ts` files (engines+data+hooks+schemas+dispatchers+routes) | **281** | Comprehensiveness |
| Lathe/turning engines (engines/ dir) | **230–235** | Physics / Comprehensiveness |
| In-scope physics/process engines | **169** | Physics |
| AI/ML-tier engines (LatheLoRA/AGI/DeepLearning/Neural/Reasoning/Bayesian/Genetic/Ensemble/RL/Transfer/Meta/Transformer/Attention/Causal/Kinematics) | **66** (incl. **49 LatheLoRA**) | Physics / AI Head |
| `prism_turning` dispatcher actions | **339–433** (339 ACTIONS array; 433 case branches) | Dispatchers / Knowledge |
| `prism_turning_program` actions | **14** (2 wizard-facing) | Dispatchers |
| `prism_thread` / `prism_threading_pipeline` actions | **22 / 3** | Dispatchers |
| `prism_cam` lathe-specific case blocks | **88** | Dispatchers |
| Total MCP-surface lathe actions | **~466** | Dispatchers |
| Skills (`.claude/commands/lathe*`) | **23** | Dispatchers |
| Hooks (`.claude/hooks/*lathe*`) | **4** (1 DEAD) | Dispatchers |
| Scripts (`scripts/lathe*`) | **13** | Dispatchers |
| Lathe-relevant algorithms (`src/algorithms/`) | **51 classes** (0 wired to wizard) | Knowledge |
| Lathe-relevant memories | **796 files** | Knowledge |
| Lathe-relevant tribal (code-tribal) | **946 files** | Knowledge |
| Unported monolith JS modules | **5** | Knowledge |
| `engines/lathe/` TS source files | **0** (docs-only dir) | Knowledge |
| Catalog scenarios (LATHE-COMPENSATION-CATALOG) | **~150** across 6 domains | Comprehensiveness |

**Engines confirmed directly imported into `TurningPrintToProgramEngine.runPipeline`: 14** (WorkholdingVerification, SmartToolSelector, CoolantStrategy, EntryExitStrategy, IntelligentSequencing, MachineEnvelopeGuard, BoringBarDeflection, PartDeflection, ChuckJawForce, LathePartClassifier, LatheCollisionZone, GilbertEconomicSpeed, OkumaB250LatheMasterPost, MachiningKnowledgeBase).

### HEADLINE GAP

**The wizard's runtime pipeline consumes ~14 engines out of ~466 MCP-surface lathe actions and ~230 engines. Roughly 3% of the built lathe capability is reachable at program-generation time.**

Everything else is **MCP-surface-only** (callable as a standalone tool but never invoked by `runPipeline`) or **fully orphaned** (no dispatcher action AND not in the pipeline). The three structural truths:

1. **Physics gap inside the pipeline itself** — `runPipeline` inlines Kienzle force via `MachiningKnowledgeBaseEngine` instead of calling the dedicated, Altintas-correct `TurningForceEngine`; the 16-engine `LatheSpeedFeedCalculatorFacadeEngine` and all 51 `src/algorithms/` classes (stability lobes, Merchant shear, RCSA, economic MRR) are never consulted. The wizard can emit G-code without ever computing a stability lobe or a force-accurate chip thickness.
2. **The AI head is built but disconnected** — 66 AI engines (49 LoRA, 4 AGI, deep-learning/reasoning/ML/self-improving) exist; ~145 have dispatcher actions; **zero are called from `runPipeline`**. 4 AGI engines (the self-improving core) have **zero dispatcher actions at all**. GNN and CAG are **completely absent** from the lathe galaxy.
3. **Knowledge is chat-context-only** — 796 memories + 946 tribal tips reach Claude's reasoning via UserPromptSubmit hooks but **never reach the wizard's engine runtime**. A headless MCP call to the wizard runs blind to all tribal knowledge. Two independent physics authorities (`constants.ts` 6-ISO-group vs `MachiningKnowledgeBase` 30-row inline) are unreconciled — the exact class of bug that produced 4× tool-life error on 2026-06-23 (`4ad8a0116b`).

**Wired vs orphaned: ~3% of lathe capability is live in the wizard pipeline; ~97% is either MCP-only or fully orphaned.**

---

## 2. THE AI HEAD ARCHITECTURE

### What "an AI system at the head" should be

A single orchestration spine that:

```
USER VARIABLE INPUTS (machine / tooling / inserts / turret / holders /
                      stock / material / features / tolerances)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  AI HEAD ORCHESTRATOR                                         │
│  1. RETRIEVE  → RAG/tribal + memory + CAG cache (runtime)     │
│  2. REASON    → deep-reasoning PRE-emit advisory              │
│  3. AUGMENT   → LoRA/QLoRA physics-augmented inference        │
│              → GNN feature-classify (part-family / strategy)  │
│  4. PHYSICS   → routes to the verified physics engines        │
│              (force, deflection, thermal, chatter, SFC facade)│
│  5. SAFETY    → fail-closed gates (collision, G50, grip, tox) │
│  6. EMIT      → post (Okuma/Hurco/Swiss) via master-post      │
│  7. CAPTURE   → outcome → LoRA/GNN retrain (self-improving)   │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
   runPipeline (the verifiable physics core) → G-code
```

### The EXISTING engine that is (or should be) the head — DEDUP-FIRST

**Do NOT build greenfield.** Four orchestrator candidates already exist (AI Head audit). The decision:

| Candidate | State | Verdict |
|---|---|---|
| `LatheOrchestrationEngine` | Imports `TurningPrintToProgramEngine` (the ONLY AI-side wizard import); 35 stages, **stages 14–35 are STUBS** (21 of 35); self-scored 30/100 | **The wizard-coupled head — but 60% stub.** This is the spine to complete. |
| `LatheAIOrchestrationEngine` | Best-built; 4 live MCP paths (`lathe_ai_orchestrate_full/optimization/learning/diagnosis`); references `LatheOrchestrationEngine` by name but does NOT import it | **The most complete dispatcher-wired AI head — but does not drive runPipeline.** |
| `LatheUnifiedAIOrchestrator` | Registers 13 engines; wired (`lathe_unified_ai_execute`); task router, not pipeline wrapper | Sub-router, keep as a capability map. |
| `LatheLoRAMasterOrchestratorEngine` | LoRA subsystem phases only | LoRA-subsystem orchestrator only. |

**DECISION (R7 — pick the more-tested + the wizard-coupled, flag the other):**
- **`LatheAIOrchestrationEngine` becomes the AI HEAD** (it is the best-built, has 4 live orchestration paths, and already has an engine registry).
- **`LatheOrchestrationEngine` becomes the PIPELINE SPINE it wraps** — its 21 stub stages get completed to delegate to the now-wired physics + AI engines, and the head imports it directly (closing the "references by name but does not import" gap).
- These two are **connected** in U-AIHEAD-01. `LatheUnifiedAIOrchestrator` (13-engine registry) and `LatheLoRAMasterOrchestratorEngine` are wired in as **sub-routers the head consults**, not duplicated.

### What the head already does
- `LatheAIOrchestrationEngine`: 4 async orchestration paths live via MCP, an engine registry mapping `lathe_millturn_plan` / `lathe_complete_analysis` → engines.
- `LatheOrchestrationEngine`: 14 of 35 pipeline stages implemented, imports the wizard.

### What wiring it needs
1. `LatheAIOrchestrationEngine` must **import + call** `LatheOrchestrationEngine` (not reference by name).
2. `LatheOrchestrationEngine` stages 14–35 must be **de-stubbed** to delegate to the real physics/AI engines (no `// Stub — will delegate…`).
3. `runPipeline` must accept an **optional AI-head pre-pass** (retrieve→reason→augment) that produces parameter recommendations BEFORE the physics clamps run, so AI advice is an input to physics, and physics remains the fail-closed authority over AI output.
4. The 4 orphaned AGI engines (continuous-learning, feature-bridge, knowledge-unification, safety-containment) get dispatcher actions and become the **self-improving + safety-containment** legs of the head.

### India ai-training substrate — COORDINATE, DON'T DUPLICATE
**Confirmed gap:** `engines/ai-training/` has **zero** lathe/turning references; the lathe galaxy has its own parallel 49-engine LoRA stack. India owns GraphSAGE GNN tier-5 (`scripts/graphsage-trainer.mjs`, `nn-graph-retrain-lifecycle.mjs`), the RAG corpus, and LoRA dataset builders.

**Rule:** The lathe head does NOT rebuild GNN/training infra. It **bridges** to india's substrate:
- GNN (completely missing in lathe): add a **bridge engine** `LatheGNNBridgeEngine` that calls india's GraphSAGE for part-family/strategy classification — not a new `LatheGNN*` greenfield engine.
- LoRA dataset/retrain: the lathe outcome-capture loop feeds **india's** dataset builders + retrain lifecycle (shared dataset path), rather than the lathe LoRA stack training in isolation.
- Coordinate via the cross-galaxy section (§5). This is a WIRING task, not greenfield.

---

## 3. PRIORITIZED WIRING ROADMAP (dependency order, each shippable)

**Principle (R13/R15):** build the verifiable physics core first, then the AI head that consumes it, then knowledge into the head's reasoning, then close the self-improving loop. Each unit: assets wired · integration point · test. Commit per-pathspec (`git add <exact files>`) to avoid shared-tree absorption; commit format `[LATHE-WIRING]/U-ID: title` on `slot/whiskey`.

### PHASE A — WIRE ORPHANED PHYSICS INTO THE PIPELINE (verifiable core first)

**U-LW-W01 — TurningForceEngine into runPipeline (Tier-1 CRITICAL, physics audit)**
- Wires: `TurningForceEngine` (Altintas Fc/Ff/Fp + spindle power + torque).
- Integration: `TurningPrintToProgramEngine.ts` — replace the inline `MachiningKnowledgeBaseEngine` force computation in the safety-clamp path with a call to `TurningForceEngine`; add dispatcher action `turning_force_compute` in `turningDispatcher.ts`.
- Test: round-trip assertion — Fc/Ff/Fp from `turning_force_compute` MUST equal the value the clamp path now uses (no divergence); reference-value check vs Altintas Ch.2 worked example; ≥3 failure modes (zero ap, over-power, NaN feed). Round-trip THROUGH the dispatcher.

**U-LW-W02 — SFC facade + shop-aware tuning into the pipeline (Tier-1 CRITICAL)**
- Wires: `LatheSpeedFeedCalculatorFacadeEngine` (16-engine S/F gateway) + `LatheSpeedFeedShopAwareTuningEngine`.
- Integration: add dispatcher actions `lathe_sfc_calculate`, `lathe_sfc_shop_tune`; route `runPipeline`'s Vc/fz derivation through the facade instead of `MachiningKnowledgeBase.getKienzleByISO/getTaylor` direct calls.
- Test: facade output band-checks against published Vc/fz for P/M/K/N/S/H; shop-tune adjusts from JM actuals; assert NO inline-constant divergence (regression-lock vs the 2026-06-23 4× tool-life bug class).
- **Coordinate with oscar** — the SFC core is oscar's galaxy; the facade must single-source `constants.ts`, no re-inline (§5).

**U-LW-W03 — Reconcile MachiningKnowledgeBase to constants.ts (Gap B, P1 reproducibility)**
- Wires: `MachiningKnowledgeBaseEngine` → `physics/constants.ts` (compose, don't inline — exact pattern of the `4ad8a0116b` fix).
- Integration: replace inline `KIENZLE_DATABASE`/`TAYLOR_DATABASE`/`SPEED_DATABASE` with module-load composition from `CANONICAL_KIENZLE`/`CANONICAL_TAYLOR` + per-subclass overrides; preserve the 30-row granularity as overrides over the 6-ISO-group canonical fallback.
- Test: R9 canonical-bound locks (fail on revert to inline); per-subclass values reconcile to canonical at ISO-group level; physics-reviewer mandatory.

**U-LW-W04 — CAD-intake front of the wizard (Tier-2, physics audit)**
- Wires: `TurningCADImportEngine → TurningRevProfileEngine → TurningFeatureTaxonomyEngine → TurningProfileEngine` (the STEP/IGES 3D → 2D-XZ-profile → classified features chain).
- Integration: chain these as the upstream `TurningInput.features` populator before `runPipeline`; add dispatcher actions (`turning_cad_import`, `turning_rev_profile`, `turning_feature_taxonomy`, `turning_profile_generate`); wire `prism_turning_program:turning_blueprint_intake`/`turning_cad_import` (already exist in the program dispatcher) to this chain.
- Test: STEP fixture → gap-free XZ silhouette → ≥20 classified feature types → profile feeds runPipeline end-to-end; units-first guard (STEP `CONVERSION_BASED_UNIT` → inch/mm resolved before geometry).

**U-LW-W05 — Advisory-orphan physics → actuation (Tier-1, comprehensiveness audit; the highest-ROI cluster)**
Each closes an advisory→actuation loop where the engine EXISTS but produces a number that is never written to the NC. Ship as sub-units in dependency order:
- **W05a** `LatheThermodynamicsEngine.offset_adjustment_um` → finish-pass commanded X diameter (U-LW-05/Task #11, the named immediate-next). Import into the finish-op block; write ΔD=α·D·ΔT. Requires oscar SFC for Q=Fc·Vc/(J·η) (single-source, no inline).
- **W05b** `TurningWearPredictionEngine` → `TurningOffsetCompensationEngine.wearToOffset()` → G10 L3 ramp emit (closes the broken wear→offset chain).
- **W05c** `ChatterPredictionEngine` → RPM snap-to-stable-lobe actuation (consume `src/algorithms/StabilityLobeDiagram`/`FRFStabilityLobe`/`RCSA` from U-LW-W06).
- **W05d** `CoolantStrategyEngine` method → M-code emission in the NC block (mapping exists lines 79–92, never emitted).
- **W05e** `TurningInsertLifeEngine` grade hard-block → fail-CLOSED in runPipeline (not dispatcher-advisory).
- Test (each): assert the computed correction actually changes an emitted NC block (the failure mode is "number computed, never written"); fail-closed paths assert BLOCK on violation, never warn-and-proceed.

**U-LW-W06 — src/algorithms physics into the wizard (Gap A, P0 accuracy)**
- Wires: the 51 lathe-relevant algorithm classes — at minimum `KienzleForceModel`, `ExtendedTaylorModel`, `SandvikTurningForceModel`, `MerchantShearForceModel`, `StabilityLobeDiagram`, `FRFStabilityLobe`, `RCSA`, `GilbertMRRModel`, `CoolantVcModifier`.
- Integration: route the wizard's force/stability/economic computations through these (consumed by `TurningForceEngine` from W01 and `ChatterPredictionEngine` from W05c), so the pipeline has physics rigor not lookup-table approximation.
- Test: stability-lobe RPM recommendation changes vs naive; Merchant shear-plane chip-thickness vs lookup; algebraic-invariant checks.

**U-LW-W07 — Post + secondary-physics orphan dispatcher actions (Tier-2/3, physics audit)**
- Wires: `TaperTurningEngine`, `TurningThreadRobustOptimizerEngine`, `HurcoWinMaxLatheMasterPostEngine`, `PPOkumaTurningPostEngine`, `LatheSwissPostGeneratorEngine`, `DiamondTurningEngine`, CAM-ingest utilities (`HyperMillTurningConfigIngester`, `NXCAMTurningFunctionIndex`, `SolidCAMTurningFunctionIndex`, `FusionLathePostDeltaRegistry`).
- Integration: dispatcher actions analogous to existing `okuma_*`/`hypermill_*`; coordinate post engines with **echo** (post-processor galaxy owner) for dialect correctness (§5).
- Test: each post emits dialect-correct G-code vs a reference `.MIN`/`.cps`; Swiss guide-bushing/B-axis/polar emit verified.

### PHASE B — WIRE THE AI HEAD TO CONSUME PHYSICS + USER INPUTS

**U-AIHEAD-01 — Connect the head to the spine**
- Wires: `LatheAIOrchestrationEngine` (head) imports + calls `LatheOrchestrationEngine` (spine); spine imports `TurningPrintToProgramEngine` (already does).
- Integration: replace the name-only registry reference with a real import + call path.
- Test: `lathe_ai_orchestrate_full` round-trips through the spine to runPipeline and returns a generated program (not a stub).

**U-AIHEAD-02 — De-stub LatheOrchestrationEngine stages 14–35**
- Wires: each of the 21 stub stages → its real engine (the audit names several: stage→`SmartToolSelectorEngine`, →`GDTInterpreterEngine`, →`TurningPrintToProgramEngine`).
- Integration: `LatheOrchestrationEngine.ts` lines ~571, 585, 910–978 — replace `// Stub — will delegate…` with real delegation; self-score must rise from 30/100.
- Test: each stage produces real output; no `process.exit`/placeholder; comprehensive-build-enforce passes (no stubs).

**U-AIHEAD-03 — AI pre-pass into runPipeline**
- Wires: `LatheLoRAPhysicsAugmentedInferenceEngine` (param augmentation) + `LatheLoRAInferenceGatewayEngine` + `LatheDeepReasoningEngine` (pre-emit reasoning) into the head's pre-physics pass.
- Integration: `runPipeline` gains an optional `aiHead` pre-pass producing parameter recommendations consumed BEFORE physics clamps; **physics remains the fail-closed authority** (AI recommends, physics vetoes).
- Test: AI recommendation is consumed as input; a physics violation on an AI-suggested param still fail-closes (safety invariant); AI-off path byte-identical to current pipeline (additive).

**U-AIHEAD-04 — 4 orphaned AGI engines → dispatcher actions (AI head P1)**
- Wires: `LatheAGIContinuousLearningEngine` (`lathe_agi_continuous_{record,get_state,adjust_slot}`), `LatheAGIFeatureBridgeEngine` (`lathe_agi_feature_{reason,get_state,get_calls}`), `LatheAGIKnowledgeUnificationEngine` (`lathe_agi_knowledge_{unify,query,get_graph}`), `LatheAGISafetyContainmentEngine` (`lathe_agi_safety_{check,get_config}`).
- Integration: `turningDispatcher.ts` action enum + handler cases; `LatheAGISafetyContainmentEngine` wires into the head's safety leg.
- Test: each action round-trips; continuous-learning persists state; safety-containment blocks an unsafe AGI recommendation.

### PHASE C — WIRE KNOWLEDGE INTO THE HEAD'S RUNTIME REASONING

**U-KNOW-01 — Tribal/memory at engine runtime (Gap C, P2)**
- Wires: `LatheTribalIntegrationEngine` + `LatheJMDieKnowledgeEngine` + tribal search into the head's RETRIEVE step (NOT the chat hooks).
- Integration: the AI head's pre-pass queries tribal knowledge at runtime via `LatheTribalIntegrationEngine`, so a headless MCP call to the wizard has tribal access. Create the missing `engines/lathe/KNOWLEDGE.md` compiled index that `whiskey-lathe-context-inject.mjs` already references (currently a dangling pointer).
- Test: headless wizard call (no whiskey-slot context) still surfaces relevant tribal tips into the reasoning; KNOWLEDGE.md exists and is consumed.

**U-KNOW-02 — CAG runtime cache for the lathe head (Gap: CAG completely absent)**
- Wires: the fleet `galaxy-reasoning-bridge.mjs` (CAG answer-cache) into the head — NOT a new `LatheCAG` engine (dedup).
- Integration: head RETRIEVE step checks CAG cache before reasoning; caches lathe reasoning answers.
- Test: repeated identical query hits cache; cache invalidation on outcome change.

**U-KNOW-03 — Port the 5 monolith modules (Gap D, P2)**
- Wires: `PRISM_CHATTER_PREDICTION_ENGINE.js`, `PRISM_CUTTING_MECHANICS_ENGINE.js`, `PRISM_CUTTING_PHYSICS.js`, `PRISM_CUTTING_THERMAL_ENGINE.js`, `PRISM_SURFACE_INTEGRITY_ENGINE.js`.
- Integration: dedup-check FIRST (`duplicationGuardEngine`) — chatter/thermal likely overlap existing engines; port only genuinely-absent capability (surface-integrity Ra/residual-stress is the likely net-new) to `.ts`, wire to dispatcher.
- Test: ported engine reference-value match vs the original JS; no duplicate of an existing engine.

### PHASE D — CLOSE THE SELF-IMPROVING LOOP

**U-SELFIMPROVE-01 — Outcome capture → retrain (AI head, self-improving core)**
- Wires: `LatheAGIContinuousLearningEngine` (from U-AIHEAD-04) + `LatheActualFeedbackTuningEngine` + `LatheLoRAContinualLearningEngine`/`LatheLoRADriftDetectorEngine` into a runtime outcome-capture pass post-emit.
- Integration: after runPipeline emits, capture outcome (predicted vs actual params, from the Rung-C accuracy harnesses `lathe-prism-accuracy.mjs`/`lathe-closed-loop-full.mjs`) → feed continuous-learning + drift detection.
- Test: an outcome record adjusts a future recommendation; drift detector fires on distribution shift.

**U-SELFIMPROVE-02 — GNN bridge to india + shared LoRA dataset (cross-galaxy)**
- Wires: NEW `LatheGNNBridgeEngine` → india's `graphsage-trainer.mjs`/`nn-graph-retrain-lifecycle.mjs`; lathe outcome dataset → india's LoRA dataset builders (shared path).
- Integration: dispatcher action `lathe_gnn_classify` calling india's GraphSAGE for part-family/strategy classification; lathe outcomes feed india's retrain lifecycle.
- Test: GNN classification round-trips through india; lathe dataset rows appear in india's builder; **coordinate with india slot before merge** (§5).

---

## 4. KNOW-HOW GAPS — TRUE-COMPREHENSIVENESS engines/formulas needed (no engine exists)

From the comprehensiveness audit's domain×coverage matrix, these capabilities have **NO engine** and need greenfield (after the wiring phases, since wiring existing > building new):

**Tier-2 (new physics, common operations):**
1. **Axial deflection engine** (DIM-2) — turret Kz, Ft model (only radial deflection exists).
2. **TNR / G41-G42 handedness validator** (DIM-15/16/17) — tool-nose-radius compensation cross-check.
3. **Peck / drill-cycle generator** (TGS-13..18, DIM-38) — G83 peck, spot-drill auto-insert, peck-bore.
4. **Peck-groove generator** (TGS-8/10, DIM-26) — chip-packing groove pecking, width-oversize.
5. **Parting-safety generator** (TLW-10, DIM-35) — parting-tool breakage / chip-clearance gate.
6. **Ra-from-feed gate** (SUR-4) — enforce f ≤ √(8·r_ε·Ra) (formula never enforced anywhere).
7. **Sub-spindle NO-DROP sequencer** (WHS-6, TGS-23/24) — `LatheSubSpindleTransferPurgeEngine` exists but is orphaned; the actuating sequencer is missing (coordinate with echo on dialect).
8. **CSS→G97 min-D clamp** (G96 RPM runaway at small diameter) — `LatheCSSOptimizerEngine` exists but is not imported in the wizard; the clamp actuation is missing.

**Tier-2 (regulatory / safety, lower frequency but fail-closed):**
9. **BeCu / toxic-material HARD-BLOCK** (MAT-56) — regulatory fail-closed, missing entirely.
10. **Ti fire gate HARD-BLOCK** (MAT-12) — `CoolantStrategyEngine` returns a method but does not hard-block Vc>80 on Ti.
11. **Chuck-jaw wear cal-log** (DIM-14) — no engine.
12. **Backlash / servo-lag correction** (DIM-20/37) — no engine.
13. **Bar-remnant gate** (TGS-29/31, DIM-29) — no max-bar-D / remnant-count gate.

**Tier-3 (specialty, lower machining frequency):**
14. **Polygon turning + knurling generators** (TGS-25..28) — none.
15. **Y-axis milling on lathe** (no engine found).
16. **Residual-stress op-splitter** (DIM-22) + **material-condition op-splitter** (MAT-5/30/43/46/47).
17. **Composite/polymer/specialty material gates** (MAT-34/35/36/48/49/52) — thermoplastic melt, CFRP delamination, white-iron hard spots, metastable-SS transform.
18. **2-plane dynamic imbalance** (TGS-34).

Each greenfield engine ships as `[LATHE-PHYSICS]/U-LWP-NN` with: physics-reviewer mandatory, no inline constants (import from `constants.ts`), fail-closed for safety/regulatory gates, real reference-value tests.

---

## 5. CROSS-GALAXY + SAFETY

**Coordination (do not duplicate — clone/bridge):**
- **india (AI training)** — owns GraphSAGE GNN, RAG corpus, LoRA dataset builders + retrain lifecycle. Lathe BRIDGES (`LatheGNNBridgeEngine`), never rebuilds. The lathe 49-engine LoRA stack feeds india's dataset/retrain (shared path) rather than training in isolation. **Post to AGENT_CHAT before U-SELFIMPROVE-02 merge.**
- **oscar (SFC physics)** — owns the speed-feed core + `constants.ts`. U-LW-W02/W03/W05a must single-source oscar's canonical constants (Q=Fc·Vc/(J·η), Kienzle/Taylor); NO re-inline. The 2026-06-23 4× tool-life bug is the cautionary precedent.
- **echo (post-processor)** — owns G-code dialect emission. U-LW-W07 post engines (Hurco/PP-Okuma/Swiss) + sub-spindle sequencer (Tier-2 #7) coordinate dialect with echo (cf. the Okuma G71/G76 + sub-spindle dialect regressions on 2026-06-28/29).
- **kilo (CAM)** — owns the parallel `prism_cam:lathe_p2p_*` path. **Bridge gap (Dispatcher audit #2):** `/lathe-print-to-program` routes through `prism_cam` P2P, NOT `prism_turning_program:turning_print_to_program`. Decide (R7): make the skill call the canonical wizard action, OR formally bridge the two P2P paths. Coordinate with kilo so there is ONE canonical print-to-program entry, not two unbridged ones.

**Safety (always fail-closed):**
- Every safety gate stays fail-CLOSED: collision (`LatheCollisionZoneEngine`, already fail-closed U-LW-02), G50 centrifugal clamp (U-LW-01), grip-margin SF, toxic-material/Ti hard-blocks. AI recommendations are inputs to physics; **physics vetoes AI, never the reverse** (U-AIHEAD-03 invariant).
- Re-enable or replace the **DEAD `lathe-master-post-quality-gate.mjs`** (hard-disabled at line 8) — ship as `[LATHE-WIRING]/U-LW-HOOK` with a live PreToolUse gate on wizard output (currently the only lathe gate is advisory post-tool lint).

**Build discipline (every unit):**
- **No stubs** (comprehensive-build-enforce will block) — U-AIHEAD-02 explicitly de-stubs, must not introduce new ones.
- **No inline physics constants** — import from `constants.ts` (U-LW-W03 is the reconciliation unit).
- **Commit per-pathspec** — `git add <exact file list>`, never `git add .`, on `slot/whiskey` branch, to avoid shared-tree absorption (3 commits were absorbed in one session per the commit-discipline memory).
- **Per-file scrutiny** (2 parallel reviewer agents after each file) + end-of-task 3-of-3 gate.
- **Round-trip tests THROUGH the dispatcher**, not the singleton; happy + ≥3 failure + ≥2 adversarial (R15).

**Dependency order (critical path):** W01→W02→W03 (physics core + constants reconciliation) → W04 (intake) → W05/W06 (actuation + algorithms) → W07 (posts) → AIHEAD-01→02→03→04 (head spine + AI pre-pass + AGI) → KNOW-01→02→03 (runtime knowledge) → SELFIMPROVE-01→02 (closed loop). Each phase builds on a proven foundation; the AI head is never wired atop unverified physics.

---

## Addendum: physics-authority divergence -- VERIFIED EVIDENCE (2026-06-29, slot:whiskey)

The audit framed the two physics authorities (constants.ts vs MachiningKnowledgeBaseEngine inline) as
"unreconciled -- the 4x tool-life bug class." Direct comparison of the kc1.1 tables REFINES that risk:

- MachiningKnowledgeBaseEngine.ts carries a ~40-row per-material-class kc1.1/mc table; its ANCHOR
  values LARGELY MATCH canonical constants.ts (P1800/M2100/K1100/N700/S2800/H3200):
  1045->1800 (P), gray-iron->1100 (K), 6061->700 (N), Ti-6Al-4V->2800 (S), 45-55HRC->3200 (H) all align.
- Only kc1.1 delta: M = 2100 canonical vs 2200 for 304/316 (~5%).
- Real internal inconsistency: a DUPLICATE 1018 entry across MKB's two tables (:56 mc=0.23 Sandvik vs
  :103 mc=0.22 Kennametal) -- a ~1.3% force delta, sourced-difference not a clear bug.

CONCLUSION: the kc1.1 reconciliation is LOWER-RISK than the audit implied (anchors already consistent).
The historical 4x tool-life hazard (2026-06-23, 4ad8a0116b) was the SFC ProductEngine inline TAYLOR C
(250 vs 350), already fixed for the SFC page. REMAINING CHECK before reconciliation: the TAYLOR C/n
table in MachiningKnowledgeBase vs constants.ts CANONICAL_TAYLOR (not yet diffed this session).

OPERATOR-GATED: switching runPipeline's runtime force source to constants.ts CHANGES emitted shop-floor
feeds/speeds fleet-wide (real-machine) -> awaits operator sign-off. RECOMMENDATION: make constants.ts
the single runtime source; the kc1.1 change is negligible, so the switch is safe once Taylor is verified.
