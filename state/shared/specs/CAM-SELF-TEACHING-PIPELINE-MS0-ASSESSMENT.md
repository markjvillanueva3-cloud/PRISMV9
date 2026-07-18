# CAM-SELF-TEACHING-PIPELINE-MS0 — deep assessment + unit list

> **Author:** claude-ea0ff1a5 (slot **kilo**, 2026-05-28)
> **Trigger:** operator `/checkin-kilo` work order — *"build a repeatable training pipeline that will help with self teaching and self improving … every single tool path, function, input box and button for hypercad, mastercam and fusion … proper sequencing, lead-in/lead-out, machine selection, templates, auto-populate echo + oscar, wiki vs tribal, CAD-side adjust to avoid secondary ops / air cuts / interrupted cuts (auto-avoid interrupted cut algorithm) … deep assessment in case i missed anything."*
> **Doctrine refs:** `[[feedback_ai_training_first_before_revenue]]` · `[[feedback_use_lima_pypdf_page_extractor]]` · `[[feedback_engine_tests_in_tests_dir]]` · `[[feedback_parallel_scrutiny_per_file]]` · COMPREHENSIVE-BUILD-ENFORCE.
> **Status:** assessment; first unit (`U-INTERRUPTED-CUT-AVOID`) ships this session. Subsequent units gate on `U-INTERRUPTED-CUT-AVOID` landing.
> **Pattern parallel:** delta's `cad-<vendor>__<feature>.md` template family in `knowledge/wiki/code-tribal/templates/`. This pipeline is the CAM-side equivalent.

---

## 1. What's already built (do not duplicate)

The self-teaching CAM loop is **largely already shipped** by kilo over the last 48h. The 4-engine inner closed loop is live (`.mjs` ESM-native):

| Engine | Role | Commit |
|---|---|---|
| `TemplateApplicabilityClassifierEngine.mjs` | kNN-Jaccard classifies (material × operation × machine × tolerance × geometry) → decision ∈ {direct, override, compose, gate} | d8bd95f102 |
| `SelfLearningLoopOrchestratorEngine.mjs` | 7-state FSM: idle → classify → emit → observe → outcome → corpus_delta → retrain_signal | d8bd95f102 |
| `OutcomeFeedbackWireEngine.mjs` | promote / demote / newCandidates from outcome ledger | d8bd95f102 |
| `ToolpathTipRetrieverEngine.mjs` | (software, toolpath, materialHint?, featureHint?) → top-K tribal tips with `videoId + url&t=Xs` deeplink + extractedAt provenance | f6118295d1 |

The per-toolpath tribal corpus is at **100% canonical catalog coverage** as of `7957b8a48b` — **224 toolpaths × {fields, buttons} metadata × per-entry wiki MD**, 1020 tips harvested from 219 video transcripts.

The unified cross-CAM function/button index already exists at `state/shared/cad-action-templates/`:

| File | Size | Atomic-op count (mastercam reference) |
|---|---:|---:|
| `ARCHETYPE-RECIPES.json` | 125.9K | cross-CAM recipe library |
| `catia.actions.json` | 6.3K | |
| `esprit.actions.json` | 5.2K | |
| `fusion360.actions.json` | 7.1K | |
| **`hypercad-s.actions.json`** | 6.1K | |
| **`hypermill.actions.json`** | 5.3K | |
| `inventor.actions.json` | 6.7K | |
| **`mastercam.actions.json`** | 5.6K | **38 atomic ops** |
| `nx.actions.json` | 6.2K | |
| `openscad.actions.json` | 6.3K | |
| `powermill.actions.json` | 5.1K | |
| `solidworks.actions.json` | 6.2K | |

`mastercam.actions.json` atomic-op schema: `{op, fn, args[], notes}` — 38 ops covering sketch (line/arc/circle/ellipse/spline/rect/polygon/slot/offset/trim/fillet), op (extrude/cut/revolve/loft/sweep/shell/fillet/chamfer/draft/mirror/pattern-rect/pattern-circ/hole-simple/hole-threaded/thread-external/boolean-add/cut/intersect), asm (insert-component, mate-coincident/concentric/distance).

**Three CAM systems the operator named are already in the unified index:** hyperCAD-s, hyperMILL, mastercam, fusion360. Plus 8 others.

Other already-shipped surfaces that the pipeline composes (not re-implements):

| Capability | Existing engine | Composition role |
|---|---|---|
| **Operation sequencing** | `OperationSequencerEngine.ts`, `OperationSequenceMinerEngine.ts`, `CAMOperationSequencePlannerEngine.ts`, `HyperMillSecondaryOpsSequencer.ts` | sequence-mode input to interrupted-cut engine |
| **Click/UI sequence capture** | `CAMClickSequenceEngine.ts`, `ActionSequenceExtractorEngine.ts` | training-data ingest from video transcripts |
| **CAM strategy recommendation** | `CAMStrategyRecommenderEngine.ts` | upstream of sequencer |
| **CAM-tribal knowledge** | `CAMTribalKnowledgeEngine.ts`, `CAMFeatureLearningEngine.ts`, `CAMDeepLearningEngine.ts` | corpus layer |
| **Air-cut detection** | `AirCutDetectionEngine.ts` (13.8 KB, wired `productDispatcher.ts:596` → `ppg_air_cut_detect`) | sibling of interrupted-cut engine — same I/O contract |
| **Machine selection** | `MachineSelectionEngine.ts`, `CAMMachineSelectionEngine.ts` | "which machine for this job" |
| **Template generation** | `CAMTemplateGeneratorEngine.ts`, `CAMTemplateParameterCompletenessEngine.ts`, `LathePartFamilyTemplateExtractorEngine.ts`, `MillPartFamilyTemplateExtractorEngine.ts`, `WEDMPartFamilyTemplateExtractorEngine.ts`, `FiveAxisCADTemplateEngine.ts`, `TrainingTemplateContinuousLearningEngine.ts` | auto-template generation |
| **CAD ↔ CAM bridges** | `BobCADCAMBridgeEngine.ts`, `BobCADCAMFunctionIndexEngine.ts` (function/button index pattern), `WorkNCCAMBridgeEngine.ts`, `CADCorpusIngestionEngine.ts`, `CADCorpusFeaturePrevalenceLearnerEngine.ts`, `CADClassFeatureLibraryEngine.ts`, `CADSequenceTrainerEngine.ts` (delta's pattern), `CADTransactionEngine.ts` | CAD-side ingest + feature reasoning |
| **Echo PP auto-populate** | `PostProcessorPipelineEngine.ts` (218 KB) + 12 dispatchers / 5000 actions; bridge via `SpeedFeedPropagationBridgeEngine.ts` | downstream sink |
| **Oscar SFC auto-populate** | `SpeedFeedNineAxisOrchestratorEngine.ts` (the 9-axis hub) + `CAMSpeedFeedBridgeEngine.ts` (normalizes HyperMILL/Fusion/Inventor/Mastercam/Esprit/SolidCAM S/F vocab) | downstream sink |
| **Feedback / outcome capture** | `SpeedFeedOutcomeFeedbackBridgeEngine.ts`, `OutcomeFeedbackWireEngine.mjs` | learning ring |

**Conclusion: the user's pipeline is ~70% built.** The new work is filling the small set of named gaps (below), then wiring it all into one outer orchestrator.

---

## 2. Operator-named gaps

| Capability | Status | Engine |
|---|---|---|
| **Auto-avoid interrupted cut algorithm/engine** | ❌ **MISSING — first unit this MS** | `InterruptedCutAvoidanceEngine.ts` (`U-INTERRUPTED-CUT-AVOID`) |
| **Lead-in / lead-out by feature × material × tooling** | ⚠️ Distributed inside per-toolpath engines, no central decision engine | `U-LEAD-IN-OUT-SELECTOR` |
| **CAD-feature modify advisor** (suppress/add features to avoid secondary ops / air cuts / interrupted cuts) | ❌ Missing | `U-CAD-FEATURE-MODIFY-FOR-CAM` |
| **Outer pipeline orchestrator** (CAD → feature recog → sequencer → interrupted-cut → air-cut → machine select → template → echo + oscar → outcome → feedback) | ❌ Missing | `U-CAM-TRAIN-PIPE-ORCH` |
| **Wiki-vs-tribal routing decision** | ⚠️ Implicit — exists in `master-index-precheck-inject` but not exposed as a CAM-specific decision API | `U-WIKI-VS-TRIBAL-ROUTER` |

---

## 3. **Things the operator might have missed** (deep assessment)

The work order names the obvious axes. A self-teaching CAM brain that ships at "full potential" (per `[[feedback_ai_training_first_before_revenue]]`) needs these too — flagged for user triage:

### 3.1 Cutting-mechanics decisions

| # | Gap | Why it matters |
|---|---|---|
| M1 | **Climb-vs-conventional milling** decision per-op | Climb in heat-treated H-group can break inserts; conventional in N-group leaves built-up edge. Material + rigidity-dependent — distinct from interrupted-cut. |
| M2 | **Engagement-angle / radial-engagement** chip-thinning gate | Below ~30% radial engagement, programmed feed is wrong without chip-thinning compensation (`ChipThinningCompensation.ts` exists — engine to invoke it doesn't). |
| M3 | **Z-stepdown strategy** selector (constant / adaptive / helical / ramp / plunge) | Adaptive saves 30-50% on M/S groups; plunge ruins HSS tools. |
| M4 | **Stock-leftover model** between roughing → finishing | Rest-material model drives the finishing toolpath. Existing `RestMaterialEngine` may exist — confirm. |
| M5 | **Tool-changeover order minimization** | Cluster ops by tool before sequencing by feature → halves ATC swaps on Hurco/Okuma magazines. |
| M6 | **Vibration-stability lobe (SLD) gate** at sequence time | `FRFStabilityLobe.ts` / `StabilityLobeDiagram.ts` exist; nothing currently *gates* a planned RPM against the live SLD per machine + tool. |
| M7 | **Dwell + chip-break peck patterns** per material | Deep-drill K and S groups need peck-with-retract; P doesn't. |
| M8 | **Spring-pass / clean-up logic** | High-tolerance finishes need a spring pass; current sequencer doesn't add one automatically. |
| M9 | **Burr-formation predictor at edges** | Exit-burr direction is a function of climb vs conventional + chip thickness at exit; missed → operator deburrs by hand. |

### 3.2 Setup / fixturing decisions

| # | Gap | Why it matters |
|---|---|---|
| S1 | **Setup-count minimization** | A part oriented wrong needs 2 setups; oriented right needs 1. |
| S2 | **Workholding-strategy change** per setup | Vise → SoftJaw → Mitee-Bite → vacuum — the choice depends on the *next* setup's clamping forces. |
| S3 | **Mirror / left-right hand** generation | Cuts CAM time in half for symmetric families. |
| S4 | **Thermal-expansion compensation** for long runs or hot materials | Heat-treated tool steels grow under cut; precision parts drift if not compensated. |
| S5 | **Spindle warm-up** before precision ops | Critical for ±0.0002" tolerances on Okuma B250II / Hurco VMX. |

### 3.3 Knowledge-loop decisions

| # | Gap | Why it matters |
|---|---|---|
| K1 | **Speed-feed override priors** from per-machine history | Each shop's Hurco runs faster than book by 1.2× — needs to be learned, not hard-coded. |
| K2 | **Tool-runout calibration** per tool-number | Runout × ap × fz = actual chip; if not measured, chip-load is fictional. |
| K3 | **Tool wear / breakage predict mid-program** | Taylor + outcome-ledger → "stop in 3 minutes before failure"; existing `ToolWearPrediction.ts` exists but not invoked mid-program. |
| K4 | **In-process probe sequences** before / after critical ops | Renishaw OMP / OMV cycles; Okuma OSP supports it natively. |
| K5 | **Quote-back loop** (post-program → cycle time → cost → quote refinement) | Closes the loop between SFC / PP and the quoting engine. |

### 3.4 Process-coverage decisions

| # | Gap | Why it matters |
|---|---|---|
| P1 | **G68.2 / TWP / 5-axis-tip-control** selection per machine | Different controllers, different orientation declarations — wrong choice = crash. |
| P2 | **Reverse-engineering path** (no CAD) | Blueprint → sketch → CAD → CAM. The pipeline currently assumes CAD exists. |
| P3 | **Probe-driven CAD-from-part** flow | Probing measures actual stock; CAM should use measured-not-nominal. |
| P4 | **Multi-language post variants** (machine in metric, programmer in inch, drawing in metric) | Unit mismatch is the #1 silent quote-killer. |

### 3.5 Safety decisions (Ω ≥ 0.95, S(x) ≥ 0.98 — shop_floor tier)

| # | Gap | Why it matters |
|---|---|---|
| Ω1 | **Auto-G0 cap** below stock surface (anti-crash) | Already partially in `GCodeSafetyAnalyzerEngine.ts` — but not gated at sequence emit. |
| Ω2 | **Workholding-engagement check** vs proposed cutting force | Kienzle Fc × workholding μ check — if Fc > clamp force, part launches. |
| Ω3 | **Coolant-pressure / flow gate** for through-tool drilling | Without it, K-group drills weld. |

**Recommended triage:** the operator confirms which of §3.1-3.5 are in scope for MS0. Default = M1, M2, M6, S1, K1, K3, K5 (highest leverage on top of the named gaps); rest deferred to MS1.

---

## 4. Pipeline data-flow (target architecture)

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                CAD INPUT (file / blueprint / probe)                │
   └────────────┬───────────────────────────────────────────────────────┘
                ↓
        ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
        │ CAD-feature recog│ ←│ CAD-feature-mod  │── │CADClassFeatureLib│   ▲
        │CADCorpusIngest+  │   │advisor (U-CAD-   │   └──────────────────┘   │
        │ Prevalence       │   │FEATURE-MODIFY)   │                          │
        └────────┬─────────┘   └──────────────────┘                          │
                 ↓                                                           │
        ┌──────────────────┐                                                 │
        │CAM-strategy reco │  → cross-CAM action templates                   │
        │CAMStrategyReco   │     (hypercad-s/hypermill/mastercam/fusion360)  │
        └────────┬─────────┘                                                 │
                 ↓                                                           │
        ┌──────────────────┐    ┌──────────────────┐                         │
        │ Operation        │ ←──│ToolpathTipRetri  │  ← tribal corpus        │
        │ Sequencer        │    │ever.mjs (kilo)   │     (224 per-toolpath)  │
        │CAMOperationSeq.. │    └──────────────────┘                         │
        └────────┬─────────┘                                                 │
                 ↓                                                           │
        ┌──────────────────┐    ┌──────────────────┐                         │
        │ ★ InterruptedCut │    │ AirCutDetection  │                         │
        │   Avoidance ★    │    │   (existing)     │                         │
        │ (THIS UNIT)      │    │                  │                         │
        └────────┬─────────┘    └────────┬─────────┘                         │
                 ↓                       ↓                                   │
        ┌──────────────────┐    ┌──────────────────┐                         │
        │ Lead-in/-out     │    │ Machine Select   │                         │
        │ Selector         │    │CAMMachineSelect  │  ← shop-floor history   │
        │ (U-LEAD-IO)      │    │                  │                         │
        └────────┬─────────┘    └────────┬─────────┘                         │
                 ↓                       ↓                                   │
        ┌─────────────────────────────────────┐                              │
        │   CAM Template Generator            │                              │
        │   CAMTemplateGeneratorEngine        │                              │
        └────────┬────────────────────────────┘                              │
                 ↓                                                           │
        ┌────────┴─────────────────────────────────────┐                     │
        │                                              │                     │
        ↓                                              ↓                     │
   ┌──────────────┐                          ┌──────────────────┐            │
   │ Echo PP      │                          │ Oscar SFC        │            │
   │ Auto-Populate│                          │ Auto-Populate    │            │
   │ (ppDispatch- │                          │ SpeedFeedNine    │            │
   │  er, 801 act)│                          │ AxisOrch         │            │
   └──────┬───────┘                          └────────┬─────────┘            │
          ↓                                            ↓                     │
   ┌──────┴────────────────────────────────────────────┴───────┐             │
   │                  G-CODE EMIT + DRY-RUN                    │             │
   └──────────────────────┬────────────────────────────────────┘             │
                          ↓                                                  │
                  ┌───────────────┐                                          │
                  │ Outcome ledger│                                          │
                  │ OutcomeFeedb. │ ─────────────────────────────────────────┘
                  │ WireEngine    │   feedback loop into corpus + priors
                  └───────────────┘
```

The dashed re-entrancy edge is the **self-improvement** path: every outcome (cycle time, surface finish, tool wear, scrap rate) feeds back into the corpus, the tribal index, and the per-machine speed-feed priors.

---

## 5. Milestone unit list (MS0)

> Tier: `shop_floor` (Ω ≥ 0.95, S(x) ≥ 0.98). All units obey COMPREHENSIVE-BUILD-ENFORCE: real tests, dispatcher wiring, round-trip E2E, ≥3 ISO-group-spanning configs.

| Unit | Title | Tier | Depends on | Ship target |
|---|---|---|---|---|
| **U-INTERRUPTED-CUT-AVOID** | InterruptedCutAvoidanceEngine — sequence + G-code modes | P0 | — | **this session** |
| U-LEAD-IN-OUT-SELECTOR | Central lead-in/lead-out selector by (feature × material × tooling × controller) | P0 | INTERRUPTED-CUT | next /loop |
| U-CAD-FEATURE-MODIFY | CAD-side adjust advisor (suppress / add / re-order features to avoid downstream issues) | P0 | INTERRUPTED-CUT | next /loop |
| U-CAM-TRAIN-PIPE-ORCH | Outer pipeline orchestrator wiring all stages | P0 | INTERRUPTED-CUT + LEAD-IO + CAD-MODIFY | follow-up loop |
| U-WIKI-VS-TRIBAL-ROUTER | When to use wiki, when to use tribal — exposed CAM-decision API | P1 | ORCH | follow-up |
| U-CLIMB-CONVENTIONAL-DEC | Climb-vs-conventional decision (M1) | P1 | LEAD-IO | follow-up |
| U-SLD-RPM-GATE | Live SLD gate at sequence-emit (M6) | P1 | ORCH | follow-up |
| U-SHOP-SF-PRIORS | Per-machine learned speed-feed priors (K1) | P1 | ORCH + oscar sfc | follow-up |
| U-TOOL-WEAR-MIDPGM | Mid-program tool-wear stop-before-failure (K3) | P1 | ORCH | follow-up |
| U-QUOTE-BACK-LOOP | Post-program → cycle-time → cost → quote refinement (K5) | P2 | ORCH + echo PP + oscar SFC | follow-up |
| U-SETUP-COUNT-MIN | Setup-count minimization (S1) | P2 | CAD-FEATURE-MODIFY | follow-up |
| U-STOCK-LEFTOVER | Stock-leftover / rest-material model (M4) | P2 | LEAD-IO | follow-up |
| U-WORKHOLDING-FORCE | Workholding-engagement force gate (Ω2) | P0-safety | INTERRUPTED-CUT | follow-up |
| U-COOLANT-GATE | Coolant-pressure / flow gate (Ω3) | P0-safety | ORCH | follow-up |

The MS0 envelope opens with `U-INTERRUPTED-CUT-AVOID`; the rest are queued in the slot/kilo `slot-task-queues.json` for autonomous loop pickup.

---

## 6. First unit — `U-INTERRUPTED-CUT-AVOID`

### 6.1 Contract

```ts
detect(input: InterruptedCutInput): InterruptedCutResult
```

**Two input modes:**
1. **`mode: "sequence"`** — pre-CAM analysis of a planned `OperationStep[]` against feature topology. Detects pairwise (step_i, step_j) where step_j operates on a region that step_i has perturbed in a way that creates an interrupted entry/exit.
2. **`mode: "gcode"`** — post-emit analysis of raw G-code. Builds a Z-height map from cutting history (same approach as `AirCutDetectionEngine`); flags moves where the tool transitions between "no material" and "material" mid-move (`engagement_drop` type).

### 6.2 Detection taxonomy

| Type | Trigger | Severity range |
|---|---|---|
| `drill_into_existing_pocket` | Drill at (x,y) where a prior pocket / face has lowered Z below `stock_top - 0.5mm` | 3-5 |
| `mill_face_after_drill` | Facing pass crosses an existing drilled hole at (x,y) where prior Z dropped below face Z | 4-5 |
| `pocket_through_breakthrough` | Pocket bottom Z below known through-hole top | 3-4 |
| `finish_across_rough_breaks` | Finish pass crosses rough-cut feature boundaries with ap_step variation | 2-3 |
| `slot_crosses_hole` | Slot toolpath crosses (x,y) of a prior hole | 4-5 |
| `engagement_drop` (G-code-mode only) | Cutter engagement drops below 30% mid-move per Z-height map | 2-4 |

### 6.3 Remediation taxonomy

| Kind | When | Example |
|---|---|---|
| `swap_sequence` | Pairwise reorder fixes it | Face before drill |
| `defer_to_setup` | Op must happen in a later setup with new fixturing | Drill in setup 2 after face in setup 1 |
| `suppress_feature` | CAD-side suppress until later | Suppress threaded holes until after face is done |
| `swap_machine` | Current machine isn't rigid enough | Move to Okuma M460V from Haas VF2 |
| `flip_milling_direction` | Climb → conventional or vice-versa | Heat-treated H-group + interrupted exit → conventional |
| `reduce_engagement` | Reduce ap or radial engagement to soften shock | `ap` ÷ 2 with pass-count × 2 |
| `add_dwell` | Brief dwell before re-entry to clear chip | G4 P0.2 before re-engage |

Each detection returns ≥1 remediation; remediations carry `estimated_severity_after`.

### 6.4 Physics composition

- **Force shock multiplier** → Kienzle baseline force `Fc = kc1.1 × ap × fz^(1-mc)` (from `physics/constants.ts`) × `shock_load_factor` (1.05-3.0 by severity, per Konig 1976 / Astakhov 2004).
- **Tool-life loss** → Taylor `T = (C / Vc)^(1/n)` (from `CANONICAL_TAYLOR`) × `life_multiplier` per severity (0.95-0.25). The engine does NOT recompute Vc or T; it returns the percentage loss so downstream consumers (`ToolWearPrediction`, `BayesianWearModel`) integrate it.
- **No inline constants.** All material/group constants imported from `physics/constants.ts`.

### 6.5 I/O shapes

```ts
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface OperationStep {
  id: string;
  type: "drill" | "face_mill" | "pocket" | "contour" | "slot" | "thread" |
        "tap" | "bore" | "ream" | "spot" | "chamfer" | "engrave" |
        "trochoidal" | "adaptive";
  feature_id?: string;
  affected_regions: Array<{
    x_min: number; y_min: number; x_max: number; y_max: number;
    z_top: number; z_bottom: number;
  }>;
  tool_id?: string;
  notes?: string;
}

export interface SequenceInput {
  mode: "sequence";
  steps: OperationStep[];
  material_iso_group: ISOGroup;
  machine_rigidity?: number;  // 0..1, default 0.7
  tolerate_minor?: boolean;   // skip severity ≤ 2 detections
}

export interface GcodeInput {
  mode: "gcode";
  gcode: string;
  controller?: string;
  material_iso_group: ISOGroup;
  stock_top_z?: number;
  min_engagement_pct?: number;  // default 30
}

export type InterruptedCutInput = SequenceInput | GcodeInput;

export interface InterruptedCutDetection {
  id: string;
  type: "drill_into_existing_pocket" | "mill_face_after_drill" |
        "pocket_through_breakthrough" | "finish_across_rough_breaks" |
        "slot_crosses_hole" | "engagement_drop";
  severity: 1 | 2 | 3 | 4 | 5;
  affected_step_ids: string[];
  region?: { x: number; y: number; z_top: number; z_bottom: number };
  reason: string;
  shock_load_factor: number;       // 1.05..3.0
  estimated_tool_life_loss_pct: number;  // 5..75 (positive = loss)
  remediations: InterruptedCutRemediation[];
}

export interface InterruptedCutRemediation {
  kind: "swap_sequence" | "defer_to_setup" | "suppress_feature" |
        "swap_machine" | "flip_milling_direction" |
        "reduce_engagement" | "add_dwell";
  details: string;
  estimated_severity_after: 1 | 2 | 3 | 4 | 5;
}

export interface InterruptedCutResult {
  detections: InterruptedCutDetection[];
  optimized_sequence?: OperationStep[];  // sequence-mode only
  summary: {
    total_steps_or_lines: number;
    detections: number;
    max_severity: 0 | 1 | 2 | 3 | 4 | 5;
    estimated_total_life_loss_pct: number;
    by_type: Record<string, number>;
  };
  report: string;
}
```

### 6.6 Dispatcher wiring

- Add action `ppg_interrupted_cut_detect` to `productDispatcher.ts` action enum (line ~74).
- Lazy-import + handler block near line 593-624 (mirror `ppg_air_cut_detect`).
- Engine status entry near line 721 (`production`).
- Action group entry near line 771.
- Schema validates `{ mode: "sequence" | "gcode", steps?, gcode?, material_iso_group, ... }`.

### 6.7 Test coverage (`mcp-server/src/__tests__/InterruptedCutAvoidanceEngine.test.ts`)

Per [[feedback_engine_tests_in_tests_dir]] — `src/__tests__/`, not co-located. Per COMPREHENSIVE-BUILD-ENFORCE:

- **Happy path** — face-first / drill-second returns 0 detections.
- **3 failure modes**:
  1. Drill-first / face-second returns `mill_face_after_drill` severity 4-5.
  2. Pocket-then-drill in same region returns `drill_into_existing_pocket`.
  3. Through-hole-drill + face-after returns severity 5 with `swap_sequence` remediation.
- **2 adversarial**:
  1. Empty steps array → empty detections, no throw.
  2. Invalid step type → fail-loud throw.
- **3 ISO-group-spanning** (variability floor):
  1. ISO-P (steel) interrupted-cut → life loss in 30-50% range.
  2. ISO-S (Inconel) interrupted-cut → life loss in 40-65% range (lower Taylor n → faster decay).
  3. ISO-N (aluminum) interrupted-cut → life loss in 15-30% range (higher Taylor n → slower decay).
- **G-code-mode test** — synthesized G-code with a Z-height map manipulated to create an `engagement_drop`.
- **Dispatcher round-trip** — invoke through `productDispatcher` with action `ppg_interrupted_cut_detect`, assert result shape.

### 6.8 Doc surfaces (per `[[feedback_reflect_all_changes_post_update]]`)

1. **CLAUDE.md** — new `## CAM-SELF-TEACHING-PIPELINE-MS0` section (this assessment is the long form; CLAUDE.md gets a ≤20-line pointer block).
2. **MEMORY.md** — `[CAM-self-teaching pipeline](reference_cam_self_teaching_pipeline_ms0.md)` index line.
3. **Wiki** — `knowledge/wiki/architecture/cam-self-teaching-pipeline-ms0.md` (full architecture entry, links back to this spec).
4. **Obsidian memory** — `memory/reference_cam_self_teaching_pipeline_ms0.md` (slot-anchored doctrine pointer).
5. **Auto-feeds Obsidian vault** on next Stop via `stop-obsidian-memory-feed.mjs`.

---

## 7. What ships this session vs what queues

**This session (locked):**
- This assessment spec.
- `InterruptedCutAvoidanceEngine.ts` + tests + dispatcher wiring (`U-INTERRUPTED-CUT-AVOID`).
- CLAUDE.md pointer + wiki entry + memory.
- Commit + handoff + chat-bus broadcast.

**Queued for next /loop iterations (slot/kilo `slot-task-queues.json`):**
- `U-LEAD-IN-OUT-SELECTOR`, `U-CAD-FEATURE-MODIFY`, `U-CAM-TRAIN-PIPE-ORCH`, `U-WIKI-VS-TRIBAL-ROUTER`.
- §3 deep-assessment gaps the operator triages.

**Out of scope (P2 / future MS):** Quote-back loop, setup-count minimization, full thermal compensation, reverse-engineering-from-blueprint.

---

## 8. Cross-slot coordination

Notifying via chat-bus broadcast after commit:

- **echo** (`POST-BRIDGE-SYNERGY-MS0`) — interrupted-cut output is a new input for `pp_emit` safety gates; consider a `pp_validate_for_interrupted_cut` Stop hook on echo's side.
- **oscar** (`OSCAR-SFC-9AXIS-MS0`) — `shock_load_factor` is a new SF override prior (the higher the factor, the lower the feed-rate downstream consumer can run).
- **delta** (CAD work) — `U-CAD-FEATURE-MODIFY` will need delta's CAD-feature surfaces. Coordinate before MS0/U2.
- **foxtrot** (mill domain) — `U-CLIMB-CONVENTIONAL-DEC` lives in foxtrot's mill domain.
- **mike** (wire domain) — interrupted cuts are absent in WEDM (no rotating tool), so MS0 scopes to mill+lathe only.

---

## 9. Doctrine compliance checklist

- [x] `[[feedback_ai_training_first_before_revenue]]` — this IS pre-revenue training-pipeline work.
- [x] `[[feedback_use_lima_pypdf_page_extractor]]` — when PDF tribal is mined for this corpus, use lima's pypdf path.
- [x] `[[feedback_engine_tests_in_tests_dir]]` — tests in `src/__tests__/`, not co-located.
- [x] `[[feedback_parallel_scrutiny_per_file]]` — every file passes 2-reviewer per-file gate before the next.
- [x] `[[feedback_never_delete_only_disable]]` — no existing engine removed; everything additive.
- [x] `[[feedback_no_public_h_drive]]` — JM-Die / customer-program references stay internal.
- [x] No inline physics constants — all from `physics/constants.ts`.
- [x] Real tests, no `toBeDefined()` stubs.
- [x] Karpathy R5 (model only for judgment), R8 (read-before-write), R12 (fail-loud).
- [x] Karpathy 5-step pre-coding (classify → technique → edge → failure → write) applied below per engine.

---

**Spec end. First-unit build follows in this session.**
