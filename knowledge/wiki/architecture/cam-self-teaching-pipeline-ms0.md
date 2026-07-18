---
title: CAM-SELF-TEACHING-PIPELINE-MS0 — auto-train CAM AI across hyperCAD / Mastercam / Fusion
date: 2026-05-28
slot: kilo
status: active
---

# CAM-SELF-TEACHING-PIPELINE-MS0

The outer self-teaching pipeline that wraps kilo's already-shipped 4-engine closed-learning loop and adds the missing decision stages. Built atop the cross-CAM action template family (`state/shared/cad-action-templates/` — 12 CAM systems × ~38 atomic ops + `ARCHETYPE-RECIPES.json` 125.9K) and the 224-toolpath × 1020-tribal-tip canonical CAM corpus.

> Long-form assessment + unit list: [`state/shared/specs/CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md`](../../state/shared/specs/CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md).

## Inner closed loop (already shipped by kilo, 2026-05-26..27)

| Engine | Role |
|---|---|
| `TemplateApplicabilityClassifierEngine.mjs` | kNN-Jaccard classify → {direct, override, compose, gate} |
| `SelfLearningLoopOrchestratorEngine.mjs` | 7-state FSM idle → classify → emit → observe → outcome → corpus_delta → retrain_signal |
| `OutcomeFeedbackWireEngine.mjs` | promote / demote / newCandidates from outcome ledger |
| `ToolpathTipRetrieverEngine.mjs` | (software, toolpath, materialHint?, featureHint?) → top-K tribal tips with full provenance |

## Outer pipeline (MS0 scope)

Data flow CAD → CAM emit → echo PP + oscar SFC → outcome → feedback:

1. **CAD feature recognition** (`CADCorpusIngestionEngine`, `CADCorpusFeaturePrevalenceLearnerEngine`, `CADClassFeatureLibraryEngine`).
2. **CAD feature modify advisor** — `U-CAD-FEATURE-MODIFY` (suppress/add features to avoid downstream issues — open).
3. **CAM strategy reco** (`CAMStrategyRecommenderEngine`) + cross-CAM action templates (12 systems).
4. **Operation sequencer** (`CAMOperationSequencePlannerEngine`, `OperationSequencerEngine`).
5. **★ Interrupted-cut avoidance** — `U-INTERRUPTED-CUT-AVOID` — **THIS UNIT**.
6. **Air-cut detection** — existing `AirCutDetectionEngine` (`ppg_air_cut_detect`).
7. **Lead-in / lead-out selector** — `U-LEAD-IN-OUT-SELECTOR` (open).
8. **Machine select** (`CAMMachineSelectionEngine`, `MachineSelectionEngine`) — shop-floor priors.
9. **CAM template generator** (`CAMTemplateGeneratorEngine`, `CAMTemplateParameterCompletenessEngine`).
10. **Echo PP auto-populate** (`PostProcessorPipelineEngine` + `SpeedFeedPropagationBridgeEngine`).
11. **Oscar SFC auto-populate** (`SpeedFeedNineAxisOrchestratorEngine` + `CAMSpeedFeedBridgeEngine`).
12. **Outcome ledger + feedback** (`OutcomeFeedbackWireEngine`, `SpeedFeedOutcomeFeedbackBridgeEngine`).

The dashed re-entrancy edge is the self-improvement path — every cycle-time / surface-finish / tool-wear outcome feeds back into the tribal corpus + per-machine speed-feed priors.

## InterruptedCutAvoidanceEngine (`U-INTERRUPTED-CUT-AVOID`)

- File: `mcp-server/src/engines/InterruptedCutAvoidanceEngine.ts`
- Test: `mcp-server/src/__tests__/InterruptedCutAvoidanceEngine.test.ts` (25 tests, 25 PASS)
- Dispatcher: `prism_product:ppg_interrupted_cut_detect` (production tier — sibling of `ppg_air_cut_detect`)

### Two analysis modes

| Mode | Input | Output |
|---|---|---|
| `sequence` | `OperationStep[]` with `affected_regions` + `material_iso_group` | per-pair detections + reordered `optimized_sequence` + remediations |
| `gcode` | raw G-code + controller + material | engagement-drop detections (Z-height-map sampling) + remediations |

### Six interrupted-cut types

| Type | Sequence-mode trigger | Severity |
|---|---|---|
| `drill_into_existing_pocket` | drill after pocket/slot/adaptive at same XY (prior op is **void-creating**) | 3-5 |
| `mill_face_after_drill` | face/contour after drill/bore/ream at same XY | 3-5 |
| `pocket_through_breakthrough` | pocket after through-drill | 3-4 |
| `finish_across_rough_breaks` | finish-style after rough-style with stepJ below prior floor | 2-3 |
| `slot_crosses_hole` | slot pass after drill | 4-5 |
| `engagement_drop` | G-code-mode lateral move crosses prior-cut void mid-segment | 3-4 |

Drilling onto a **uniform face** (face_mill / contour) is NOT flagged — only void-creating prior ops trigger interrupted-cut detection. The distinction is encoded in `VOID_CREATING_OPS`.

### Seven remediation kinds

| Kind | When | Effect |
|---|---|---|
| `swap_sequence` | almost always | Face before drill; pocket before drill; etc. |
| `defer_to_setup` | severity 5 | Move op to a separate setup |
| `suppress_feature` | severity ≥ 4 | Suppress CAD feature until later |
| `swap_machine` | severity ≥ 4 | Move to higher-rigidity machine (Okuma > Hurco > Haas) |
| `flip_milling_direction` | severity ≥ 3 | Climb ↔ conventional |
| `reduce_engagement` | severity ≥ 3 | Halve `ap`, double pass count |
| `add_dwell` | always offered | G4 P0.2 before re-entry to clear chip |

### Severity → physics multipliers (NOT physics constants — calibrated heuristic)

Per Konig (1976) + Astakhov (2004):

| Severity | Shock load factor | Tool-life multiplier | Description |
|---|---:|---:|---|
| 1 | 1.05× | 0.95 | minor surface impact |
| 2 | 1.20× | 0.85 | chip-evacuation issue |
| 3 | 1.50× | 0.70 | clear interrupted entry |
| 4 | 2.00× | 0.50 | heavy / multi-impact |
| 5 | 3.00× | 0.25 | drill into through-hole / brittle interrupt |

ISO groups **S** (Inconel) and **H** (hardened) get a **+1 severity penalty** (low Taylor n → faster fatigue decay). Machine rigidity ≥ 0.85 softens minor severities by one tier.

### Physics composition (Karpathy R8 — composes, never inlines)

- `baselineKienzleForce(iso, ap, fz)` → reads `CANONICAL_KIENZLE` from `physics/constants.ts`.
- `baselineTaylorLifeMin(iso, Vc)` → reads `CANONICAL_TAYLOR`.
- The engine returns shock multipliers; downstream consumers (`ToolWearPrediction`, `BayesianWearModel`, oscar SFC) integrate.

### Dispatcher contract

```ts
prism_product:ppg_interrupted_cut_detect({
  mode: "sequence",
  steps: OperationStep[],
  material_iso_group: "P"|"M"|"K"|"N"|"S"|"H",
  machine_rigidity?: number,  // 0..1
  tolerate_minor?: boolean,
}) → { detections, optimized_sequence, summary, report }
```

Or:

```ts
prism_product:ppg_interrupted_cut_detect({
  mode: "gcode",
  gcode: string,
  controller?: string,
  material_iso_group: "P"|"M"|"K"|"N"|"S"|"H",
  stock_top_z?: number,
  min_engagement_pct?: number,
}) → { detections, summary, report }
```

## Test coverage (25 tests PASS)

- **Happy path** (2): face → drill 0 detections; non-overlapping ops 0 detections.
- **Failure modes** (4): drill→face → mill_face_after_drill sev 4-5; pocket→drill → drill_into_existing_pocket; through-drill on Inconel → severity 5 with defer_to_setup; slot crossing hole → severity 4 with reduce_engagement.
- **Adversarial** (5): empty steps; invalid step type fail-loud; missing material; unsupported mode; missing affected_regions.
- **ISO-group spanning** (5): P / S / N base behavior; tolerate_minor filter; rigidity discount.
- **G-code mode** (3): clean toolpath 0 detections; empty input no throw; comments stripped.
- **Physics composition** (4): Kienzle reference values match canonical constants; Taylor life sensible; comparative monotonicity P vs H, P vs S.
- **Report / summary** (2): material group in report; optimized_sequence preserves IDs.

## Related

- Sibling: [[air-cut-detection]] — same dispatcher tier, same I/O contract pattern.
- Inner loop: kilo commits d8bd95f102 + f6118295d1 (SF-PSN-WIRE-MS0).
- Cross-CAM substrate: `state/shared/cad-action-templates/ARCHETYPE-RECIPES.json`.
- Tribal corpus: `knowledge/wiki/architecture/tribal/per-toolpath/` (224 entries).
- Doctrine: [[feedback_ai_training_first_before_revenue]] · [[feedback_engine_tests_in_tests_dir]] · [[feedback_parallel_scrutiny_per_file]] · [[feedback_never_delete_only_disable]].

## Cross-slot coordination (chat-bus broadcasts on commit)

- **echo** — `shock_load_factor` is a new input for `pp_emit` safety gates.
- **oscar** — `shock_load_factor` overrides SF priors (higher → lower feed downstream).
- **delta** — `U-CAD-FEATURE-MODIFY` will need delta's CAD-feature surfaces; coordinate before MS0/U2.
- **foxtrot** (mill) — `U-CLIMB-CONVENTIONAL-DEC` lives in foxtrot's mill domain.
- **mike** (wire) — no interrupted cuts in WEDM (no rotating tool); MS0 scopes to mill+lathe only.
