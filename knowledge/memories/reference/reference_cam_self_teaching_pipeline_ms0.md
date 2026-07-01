---
name: reference-cam-self-teaching-pipeline-ms0
description: CAM-SELF-TEACHING-PIPELINE-MS0 — outer self-teaching CAM pipeline + InterruptedCutAvoidanceEngine first-unit ship. Sequence + G-code dual-mode interrupted-cut detection with severity-graded remediations (swap_sequence / suppress_feature / swap_machine / etc.). Composes kilo's already-shipped 4-engine inner loop + 224-toolpath canonical corpus + 12-CAM action templates.
type: reference
slot: kilo
source: prism-memory
synced: 2026-06-27T20:30:46.505Z
aliases: reference_cam_self_teaching_pipeline_ms0
---


# CAM-SELF-TEACHING-PIPELINE-MS0 — `U-INTERRUPTED-CUT-AVOID` ship + spec (2026-05-28)

Operator `/checkin-kilo` work order: *"build a repeatable training pipeline … every toolpath, function, input box and button for hyperCAD/Mastercam/Fusion … operation sequencing, lead-in/-out, machine selection, templates, auto-populate echo + oscar, CAD-adjust to avoid secondary ops / air cuts / interrupted cuts (auto-avoid interrupted-cut algorithm/engine) … deep assessment in case i missed anything."*

## What shipped

1. **Spec** — `state/shared/specs/CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md` — deep assessment naming every existing engine that composes into the pipeline, every gap, every user-missed deep-assessment item (M1-M9 cutting mechanics, S1-S5 setup, K1-K5 knowledge loop, P1-P4 process coverage, Ω1-Ω3 safety).
2. **Engine** — `mcp-server/src/engines/InterruptedCutAvoidanceEngine.ts` — sequence-mode + G-code-mode interrupted-cut detection. Composes `CANONICAL_KIENZLE` + `CANONICAL_TAYLOR` from `physics/constants.ts` (NO inline constants).
3. **Tests** — `mcp-server/src/__tests__/InterruptedCutAvoidanceEngine.test.ts` — 25/25 PASS. Happy path + 4 failure modes + 5 adversarial + 5 ISO-group-spanning (P/S/N) + 3 G-code + 4 physics composition + 2 report shape.
4. **Dispatcher** — `productDispatcher.ts:ppg_interrupted_cut_detect` (production tier, sibling of `ppg_air_cut_detect`). Action enum + lazy import + handler + tier map + feature list — all wired.
5. **Wiki** — `knowledge/wiki/architecture/cam-self-teaching-pipeline-ms0.md` — pipeline data-flow + engine surface + 6 detection types + 7 remediation kinds + severity table.

## Key insight: the pipeline is ~70% already built

The user's training pipeline isn't a from-scratch build — it's an **integration milestone**. Already-shipped engines kilo's outer pipeline composes:

| Need | Existing engine |
|---|---|
| Inner closed loop (4 engines) | kilo just shipped 2026-05-26..27: `TemplateApplicabilityClassifierEngine` / `SelfLearningLoopOrchestratorEngine` / `OutcomeFeedbackWireEngine` / `ToolpathTipRetrieverEngine` (all `.mjs`) |
| Unified function/button index | `state/shared/cad-action-templates/` — 12 CAM systems × ~38 atomic ops + `ARCHETYPE-RECIPES.json` 125.9K |
| Operation sequencing | `CAMOperationSequencePlannerEngine`, `OperationSequencerEngine`, `OperationSequenceMinerEngine`, `HyperMillSecondaryOpsSequencer` |
| Air-cut detection (sibling) | `AirCutDetectionEngine` wired `productDispatcher:ppg_air_cut_detect` |
| Machine selection | `CAMMachineSelectionEngine`, `MachineSelectionEngine` |
| Template generation | `CAMTemplateGeneratorEngine`, `CAMTemplateParameterCompletenessEngine`, +5 family-template engines |
| Echo PP auto-populate | `PostProcessorPipelineEngine` (218KB) + `SpeedFeedPropagationBridgeEngine` |
| Oscar SFC auto-populate | `SpeedFeedNineAxisOrchestratorEngine` + `CAMSpeedFeedBridgeEngine` |
| CAD-side reasoning | `CADCorpusIngestionEngine`, `CADCorpusFeaturePrevalenceLearnerEngine`, `CADClassFeatureLibraryEngine`, `CADSequenceTrainerEngine` (delta's pattern) |

## Gaps the operator named (status)

| User-named capability | Status |
|---|---|
| **Auto-avoid interrupted cut algorithm/engine** | ✅ **shipped this session** (`U-INTERRUPTED-CUT-AVOID`) |
| Lead-in / lead-out by feature × material × tooling | open — `U-LEAD-IN-OUT-SELECTOR` |
| CAD-feature modify advisor | open — `U-CAD-FEATURE-MODIFY` |
| Outer pipeline orchestrator | open — `U-CAM-TRAIN-PIPE-ORCH` |
| Wiki vs tribal routing | implicit (exposed via `U-WIKI-VS-TRIBAL-ROUTER`) |

## Things the operator might have missed (deep assessment §3 in spec)

5 axes the spec surfaces — operator triages which go in MS0 vs MS1:

- **Cutting mechanics (M1-M9):** climb vs conventional, engagement chip-thinning, Z-stepdown, rest-material, tool-changeover order, SLD gate, dwell/peck patterns, spring-pass, burr-formation.
- **Setup/fixturing (S1-S5):** setup-count minimization, workholding strategy, mirror operations, thermal compensation, spindle warm-up.
- **Knowledge loop (K1-K5):** per-machine SF priors, tool runout, mid-program wear predict, probe sequences, quote-back loop.
- **Process coverage (P1-P4):** G68.2/TWP/5-axis-tip-control, reverse-engineering, probe-driven CAD-from-part, multi-language post variants.
- **Safety (Ω1-Ω3):** auto-G0 below stock, workholding-engagement-vs-force, coolant-pressure gate.

## InterruptedCutAvoidanceEngine — atomic facts

- **Two modes**: `sequence` (pre-CAM, pairwise on `OperationStep[]`) + `gcode` (post-emit, Z-height-map sampling on lateral cutting moves only — plunge/ramp excluded via `|Δz| < VOID_GAP_TOL_MM` gate).
- **Six interrupt types**: drill_into_existing_pocket, mill_face_after_drill, pocket_through_breakthrough, finish_across_rough_breaks, slot_crosses_hole, engagement_drop.
- **Seven remediations**: swap_sequence (always), defer_to_setup (sev 5), suppress_feature (sev ≥ 4), swap_machine (sev ≥ 4), flip_milling_direction (sev ≥ 3), reduce_engagement (sev ≥ 3), add_dwell (always).
- **Critical design choice**: `VOID_CREATING_OPS` set distinguishes localized voids (pocket/drill/slot/adaptive/etc.) from uniform-plane-reducing ops (face_mill, contour). Drill onto a face is FINE; drill into a pocket is interrupted. Caught by happy-path test "face → drill = 0 detections."
- **Brittle penalty**: ISO-S (Inconel) + ISO-H (hardened tool steel) get +1 severity (low Taylor n → faster fatigue decay).
- **Rigidity discount**: machine_rigidity ≥ 0.85 softens minor severities by one tier.
- **No inline physics**: imports `CANONICAL_KIENZLE` + `CANONICAL_TAYLOR` from `physics/constants.ts`. `baselineKienzleForce()` + `baselineTaylorLifeMin()` exposed for downstream consumers (`ToolWearPrediction`, oscar SFC, `BayesianWearModel`).

## Bugs caught + fixed during build (R12 honesty)

1. **Face → drill false-flag**: original engine treated ANY prior op that lowered Z as a cavity. Fixed by gating branch 1 on `VOID_CREATING_OPS.has(t_i)` — face_mill / contour leave uniform plane, not void.
2. **G-code plunge self-reference**: zMap built in pass-1 contained the plunge's own endpoint; pass-2 walking the same plunge saw intermediate samples as "above the deepest" → false engagement-drop. Fixed by `isLateral = |Δz| < VOID_GAP_TOL_MM` gate (plunges & ramps excluded — they're standard CAM entry, not interrupted).
3. **V1/V3 test reference values**: drill 25 + face 4 always gives dropDepth 25 → severity 5 unconditionally. Test reframed with drill 4 + face 2 → dropDepth 4 → severity 4 for P/N, +1 brittle → 5 for S.

## Queued MS0 follow-ups (in slot/kilo queue)

- `U-LEAD-IN-OUT-SELECTOR` — central lead-in/out by (feature × material × tooling × controller)
- `U-CAD-FEATURE-MODIFY` — CAD-side suppress/add/reorder advisor
- `U-CAM-TRAIN-PIPE-ORCH` — outer orchestrator wiring all stages
- `U-WIKI-VS-TRIBAL-ROUTER` — when to use wiki, when tribal — exposed CAM-decision API
- `U-WORKHOLDING-FORCE` — Kienzle × workholding μ vs clamp force gate (safety P0)
- `U-COOLANT-GATE` — coolant-pressure/flow gate (safety P0)
- 13 P1/P2 units from §3 deep-assessment after operator triage

## Cross-slot broadcasts

- **echo**: `shock_load_factor` is a new input for `pp_emit` safety gates → consider a `pp_validate_for_interrupted_cut` Stop hook on echo's side.
- **oscar**: `shock_load_factor` is a new SF override prior — higher factor → lower feed downstream.
- **delta**: U-CAD-FEATURE-MODIFY will need delta's CAD-feature surfaces. Coordinate before MS0/U2.
- **foxtrot**: U-CLIMB-CONVENTIONAL-DEC lives in foxtrot's mill domain.
- **mike**: no interrupted cuts in WEDM (no rotating tool); MS0 scopes mill+lathe only.

## Related

- [[reference_echo_post_processor_domain_map_2026_05_27]] — echo's PP surface map (where this engine's `shock_load_factor` flows downstream).
- [[reference_oscar_sfc_domain_map_2026_05_27]] — oscar's SFC map.
- [[reference_cam_corpus_locations]] — kilo's CAM corpus inventory.
- [[feedback_ai_training_first_before_revenue]] — pre-revenue training-pipeline doctrine.
- [[feedback_use_lima_pypdf_page_extractor]] — canonical PDF extractor when this corpus mines PDFs.
- [[feedback_engine_tests_in_tests_dir]] — tests live in `src/__tests__/`, not co-located.
- [[feedback_parallel_scrutiny_per_file]] — multi-file builds gate on per-file 2-reviewer pass.
