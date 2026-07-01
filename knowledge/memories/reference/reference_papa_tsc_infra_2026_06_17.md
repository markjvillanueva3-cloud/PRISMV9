---
name: reference_papa_tsc_infra_2026_06_17
description: "Papa session 2026-06-17 — model-stack \"do it all\" (3 units) + tsc 93→89 clean continuation + per-owner defer-routing + durable loop cron"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.723Z
aliases: reference_papa_tsc_infra_2026_06_17
---


**Papa session 2026-06-17 (slot:papa, claude-a59e4a3e, branch cad-fusion-live-ms0).** Continuation of the BUILD-QUALITY-PAPA tsc campaign + the cloud-model-stack work. 7 `[MAIN-FORCE]` commits (pathspec).

**Model-stack "do it all"** (operator-requested) — see [[reference_cloud_model_stack_2026_06_17]]: GLM-5.2/5.1 candidates (`51e6613aee`), free-Nemotron offloader rung (`4189424b25`), assess-cloud-candidate.mjs benchmark harness (`8a0fcc9a20`).

**TSC clean continuation 93→89** (4 commits, every gate regression-clean, ZERO fabrication):
- `2d8b674ba0` U-TSC-DOMAIN-MISC1 — CADRegenerationTest (318 casing-alias destructure + 341 positional GenerationConfig→5th param), QuotingMaterialBridge (113 name→material_name).
- `cf1831d8dc` U-TSC-DEFER-ROUTING — `state/shared/specs/TSC-DEFER-ROUTING-2026-06-17.md`: per-domain-owner punch-list for the remaining 89 (delta CAD ~24, mike EDM ~12, oscar chatter/SF ~8, whiskey/kilo/india/echo/charlie/lima + papa-infra ~6).
- `91366e65ae` U-TSC-HOOKDAG-VALIDATE — **latent runtime-bug fix**: HookDAGValidatorEngine's domain `validate(opts)` squatted on BaseEngine's abstract `validate(input):string|null`; its real input-validator was mis-named `validateInput` (uncalled). So `execute()` (BaseEngine) passed a result object where string|null was expected → ALWAYS threw. Fix: validateInput→validate, domain→validateManifest (20 callers: engine×2, dispatcher×1, test×17). tsc -1, vitest 20/20.
- `f1a59315d3` U-TSC-HOOKS-BARREL — hooks/index.ts TS2308: `preMachineControllerCompatibility` defined in BOTH CrossReferenceHooks + MachineValidationHooks (different hooks, SAME id "pre-machine-controller-compatibility" = latent duplicate-id bug routed to hooks owner). Lossless explicit re-export (both live via arrays; only consumer imports directly).

**Long-tail tsc lessons (the recurring traps past ~90 errors — gate EVERY change + comm-13 regression-diff):**
1. **Physics/safety/machine VALUE behind a "missing property"** — fabrication trap (ElectrodeAIReasoning sinker_spark_gap, WEDMSafetyEnvelope axis-travel, SpeedFeedNineAxis part_volume_cm3). Defer to domain owner.
2. **enum→exhaustive-Record cascade** — adding a union member breaks `Record<Enum,physicsValue>` maps needing fabricated entries. Confirmed: OperationType "probe" (Vc/Fz/DOC Records), DecisionCategory "milestone" (CATEGORY_WEIGHTS/RUBRICS). NOT papa-safe.
3. **any-cast / invalid-`new` masks N>1 errors** — `new StabilityLobeDiagram()` on a singleton typed sldAlg as `any`, masking 19 downstream API-mismatch errors; removing `new` un-masked all 19 → reverted. (Also a real runtime bug per [[reference_chatter_engine_regression_2026_05_24]] — routed to oscar.)
4. **stale integration** — ReasoningChainSharing calls a 3-arg EventBus that's now 2-arg with a different payload; re-map risks silent no-fire.
5. **multi-site rename** — tractable when callers are enumerable (HookDAGValidator = 20, done).

**Reverted (correct, not failures):** IntelligentSequencingAdapter (SequenceResult contract = kilo), ChatterStabilityLobe (oscar runtime bug + 19-error un-mask).

**Continuity:** durable cron `1b150d99` (every :17/:47, 7-day auto-expire) re-engages `/startup-papa` autonomous backend loop: re-gate tsc → clear peer regressions → advance papa-infra backlog (RoadmapIntelligence:381, JMDie:435 never-narrow, ReasoningChainSharing:662, authHttp OAuth, AutomatedResourceHarvesting:482) → improve built assets. Handoff: HANDOFF-claude-a59e4a3e-papa.md. Baseline log: state/shared/tsc-after-c4.log (89). The remaining 89 are domain-routed — do not fabricate to clear them.
