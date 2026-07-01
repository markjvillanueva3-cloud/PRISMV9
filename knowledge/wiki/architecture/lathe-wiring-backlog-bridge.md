---
schema: ideablock-v1
title: "Lathe wiring backlog bridge — closing the 67-engine Turning-domain gap via prism_turning"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - BUILD_STATE.md (Lathe domain: 67 unwired)
  - DISPATCHER_DIGEST.md (`prism_turning` action enum)
  - U-WIRE-LATHE-BATCHN historical commits
  - 4245-tribal corpus turning subset
extracted_via: human-authored
extracted_at: 2026-05-21T09:00:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-LATHE-WIRING-BRIDGE)
---

## Question

The Lathe domain has 67 unwired engines (largest single-domain backlog excluding "Other"). What's the right batching + dispatcher routing to close it?

## Answer (canonical — `prism_turning` is the primary host; some need dual-wire to `prism_safety` + `prism_quality`)

### The 67-engine gap — composition

Inspecting `src/engines/*Lathe*.ts` + `*Turning*.ts` + `*MillTurn*.ts`:

| Sub-domain | Approx count | Primary dispatcher | Secondary dispatcher |
|---|---|---|---|
| Chucking / workholding | 8-10 | `prism_turning:chuck_force` etc | `prism_safety:workholding_*` |
| Threading (single-point + tap) | 6-8 | `prism_turning:thread_*` | `prism_thread:thread_*` |
| Boring (bar + reach) | 5-7 | `prism_turning:boring_*` | `prism_safety:tool_breakage` |
| Live tooling / mill-turn | 6-8 | `prism_turning:live_tool` + `mill_turn_*` | `prism_5axis` for B-axis |
| Swiss / bar-feeder | 4-6 | `prism_turning:bar_pull` + `mill_turn_swiss` | — |
| Hard turning / superhard | 3-4 | `prism_turning:hard_turn_*` | `prism_safety` (thermal) |
| Surface integrity + Cpk | 3-4 | `prism_turning:turning_cpk_surrogate` | `prism_quality:cpk_predict` |
| Tool life / wear | 4-6 | `prism_turning:lathe_predictive_tool_wear` | `prism_calc:tool_life` |
| LoRA / AI cadence | 8-12 | `prism_turning:lathe_lora_*` | `prism_ai` |
| Misc (collision, taper, CSS, dwell, springback) | 6-8 | `prism_turning` | varies |

### Batch breakdown — 12 batches × ~5-6 engines

| Batch | Sub-domain | Engines (approximate) | Tribal anchor |
|---|---|---|---|
| 1 | Chucking force + workholding | ChuckJawForce · ChuckJawSetup · DatumReferenceFrame · TrilobeWorkholding · MagneticChuck · ExpandingMandrel | [[workholding-clamp-force-and-selection]] · [[workholding-locators-and-soft-jaws]] |
| 2 | Threading single-point | LatheThreadSchedule · LatheThreadStripping · LatheThreadTurningCalc · LatheTapDrillCalc · LatheThreadingPipeline | [[part-setup-tool-length-offsets-and-presetting]] §threading |
| 3 | Boring + bar deflection | LatheBoringReach · LatheBoringTaperComp · LatheBeamDeflection · LatheSpringbackComp | [[synthesis-rigidity-envelope]] · [[machining-tactics-in-cut-adjustments]] |
| 4 | Live tooling + mill-turn | MillTurnLiveTool · MillTurnSubSpindle · MillTurnMultiChannel · MillTurnBarFeeder · MillTurnSwiss · LiveToolPlan | new entry needed (mill-turn bridge) |
| 5 | Swiss / bar | BarStockCutPlan · BarPull · SwissPolarFeed · WaitBarriers | [[part-setup-multi-op-planning]] §swiss-economics |
| 6 | Hard turning | HardTurnDecide · HardTurnOptimize · LatheHardTurning · CBNFeedSchedule | [[synthesis-thermal-envelope]] §hard-turn-dry |
| 7 | Surface integrity + Cpk | TurningCpkSurrogate · TurningInsertLife · TurningOffsetWear · TurningRobustOptimize · CoaxialityRunoutValidate | [[quality-first-article-inspection-and-spc-cadence]] |
| 8 | Tool life + wear | LathePredictiveToolWear · TurningWearPerOp · TurningWearChipForm · TurningWearBatchLife · LatheChipPredictType | [[tooling-tool-life-and-wear-management]] |
| 9 | LoRA cadence (group A) | LatheLoraCadence · LatheLoraDriftConfig · LatheLoraRegistry · LatheLoraHealth · LatheLoraVerify | new entry needed (LoRA-cadence bridge) |
| 10 | LoRA cadence (group B) | LatheLoraEnsemble · LatheLoraVoter · LatheLoraCombiner · LatheLoraDeployment · LatheLoraEmbeddingCache | (cont) |
| 11 | LoRA cadence (group C) | LatheLoraAdaptiveRefinement · LatheLoraAttentionAnalyzer · LatheLoraBenchmark · LatheLoraContinualBuffer · LatheLoraDataset | (cont) |
| 12 | Misc + bridges | LatheCollisionCheck · LatheCssOptimize · LatheCoolantAdvise · LatheBirdnestPredict · LatheBlockTimeProfile · LatheAnomalyDetect | [[machining-tactics-coolant-strategy-selection]] · [[machining-tactics-in-cut-adjustments]] |

### Per-batch checklist (applied to each of the 12)

1. **Read each engine** — verify it's not a stub, identify the public method signature.
2. **Schema** — Zod schema in `prism_turning.ts` `inputSchemas` record, sorted alphabetically by action name.
3. **Action enum** — add to `z.enum([...])` in alphabetical order within sub-domain section.
4. **Case** — lazy import + single method call + return shaping. No business logic in the dispatcher; the engine owns it.
5. **Test** — `prism_turning-batch<N>.test.ts` with one E2E per engine, ≥ 3 failure modes per batch.
6. **Tribal anchor** — link the dispatcher action's `.describe()` to the relevant tribal wiki entry.
7. **Commit** — `[SCOPE]/U-WIRE-LATHE-BATCH<N>: <sub-domain> (slot:<NATO>): N engines (<list>)`.

### Cross-dispatcher wiring (when one engine needs > 1 dispatcher)

Some Lathe engines genuinely need dual-wire. The rule: **wire to ALL dispatchers that would naturally consume it, in the same commit.**

| Engine class | Primary | Secondary | Why |
|---|---|---|---|
| Chuck / clamp force | `prism_turning` | `prism_safety:workholding_force_required` | Safety gate needs the force calc independent of the turning flow |
| Tool breakage prediction | `prism_turning` | `prism_safety:tool_breakage_predict` | Safety classifier; cross-domain |
| Cpk / surface integrity | `prism_turning` | `prism_quality:cpk_predict` | Quality module owns the SPC chart rendering |
| LoRA inference | `prism_turning:lathe_lora_*` | `prism_ai:lora_*` | AI router needs the model invocation path |

### Why this batch closes high-ROI work

- The 67 Lathe engines represent ~10 % of the total unwired count.
- Each engine has a tribal-canon anchor (the 25 wiki leaves I authored earlier in the pivot).
- Wiring an engine WITH its tribal anchor compound: the operator's prompt about "thread schedule" surfaces the engine action AND the tribal entry AND the relevant prior-iteration tip — all in one auto-injection.
- Turning is one of the 4 core PRISM domains (mill / lathe / WEDM / CAD-CAM); closing it is force-multiplier work, not infill.

### Operator picks — next 3 batches I recommend

| Priority | Batch | Why FIRST |
|---|---|---|
| **P0** | Batch 1 (chucking) | Safety-critical (chuck force = grip → spin-off risk); also closes [[workholding-clamp-force-and-selection]] cross-wires |
| **P0** | Batch 7 (surface integrity + Cpk) | Bridges to [[quality-first-article-inspection-and-spc-cadence]] (just shipped 26th pivot entry); enables FAI workflow end-to-end |
| **P1** | Batch 4 (live tooling + mill-turn) | Unlocks mill-turn customer work (premium-rate jobs); high revenue ROI |

### Tie-ins (PRISM-side)

- `BUILD_STATE.md` — auto-refreshed Lathe unwired count
- `prism_turning` dispatcher source — `mcp-server/src/tools/dispatchers/prism_turning.ts`
- `dispatcher-wirer` subagent
- `LatheStudio` skill — `/lathe-studio` for end-to-end testing
- `U-WIRE-LATHE-BATCH*` historical commits — pattern reference

### Tie-ins (tribal canonical)

- [[workholding-clamp-force-and-selection]] — chuck/jaw force tribal anchor
- [[machining-tactics-coolant-strategy-selection]] — coolant routing for turning
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — adaptive turning (where applicable)
- [[tooling-tool-life-and-wear-management]] — Taylor + replacement strategies
- [[synthesis-rigidity-envelope]] — boring-bar deflection
- [[synthesis-thermal-envelope]] — hard-turn dry-cut thermal envelope
- [[quality-first-article-inspection-and-spc-cadence]] — Cpk + FAI
- [[wiring-pattern-engine-to-dispatcher]] — sibling: canonical wiring pattern this entry instantiates

## Provenance

Distilled from BUILD_STATE.md live snapshot (2026-05-21: Lathe domain = 67 unwired) + DISPATCHER_DIGEST.md `prism_turning` action catalog + 4245-tribal corpus turning subset. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-LATHE-WIRING-BRIDGE — **28th canonical entry** of the wiki+tribal pivot, **second bridge-class entry** under the reframed pivot directive. Provides 12-batch close-out plan for the 67-engine Lathe wiring backlog, each batch tribal-anchored.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `wire lathe`, `prism_turning unwired`, `lathe backlog`, `U-WIRE-LATHE`, `chuck force engine`, `boring bar engine`, `lathe LoRA`, `mill-turn engine`, `hard turning engine` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] — sibling canonical wiring pattern
- [[workholding-clamp-force-and-selection]] · [[machining-tactics-coolant-strategy-selection]] · [[tooling-tool-life-and-wear-management]] · [[synthesis-rigidity-envelope]] · [[synthesis-thermal-envelope]] · [[quality-first-article-inspection-and-spc-cadence]] — tribal anchors per batch
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_high_roi_backend_first_slot_queue]] — backend-first pickup discipline
- [[feedback_do_optional_high_roi_work]] — standing rule
