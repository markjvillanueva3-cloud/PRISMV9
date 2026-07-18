---
name: reference_cad_print_learning_ai_goal_scope_2026_06_24
description: "Scoped decomposition of the \"improve CAD/print learning-AI systems\" goal (slot:india 2026-06-24) — 1 unit shipped + the india-in-lane unit queue for fresh-context execution"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.496Z
aliases: reference_cad_print_learning_ai_goal_scope_2026_06_24
---


# CAD / print / print-to-CAD learning-AI goal — scope + queue (2026-06-24, slot:india)

Operator /goal: "improve the learning and ai systems for cad drawing, print generation,
print to cad file" (utilize hermes/ollama/octopus/harnesses/loops/crons/jm-files/obsidian).
Spans 3 galaxies: **delta** (CAD geometry) + **xray** (blueprint OCR / print->CAD) + **india**
(the learning / LoRA / RAG / inference AI layer). India's IN-LANE slice = the learning/AI layer.

## Shipped this session (3, india-in-lane)

**U-CAD-LEARN-FEATURE-SIGNAL** (`[CAD-LEARNING-AI]`) — `CADTrialErrorLearningEngine` accepted `features`
on outcomes + recommendation candidates but they were INERT (never aggregated, never scored — only
partType/generator were). Added `featureTotals` map + crediting in updateAggregates (mirrors generator)
+ shrinkage-weighted feature slices in recommendAdjustments + clears in reset()/loadFromDisk(). Now a
candidate is risk-scored by its features (3rd learning dimension). 36/36 tests (incl risky>>safe
isolation + ledger-replay durability), 2-arm scrutiny PASS 0 findings (arm B empirically proved R9 by
stashing the change). VERIFIED: the 14 cadDispatcher probe-facades are NOT dark (regex false-positive;
CADToSTEPPipelineEngine.runPipeline etc. exist) — dark-facade vein confirmed tapped.



**U-CAD-LEARN-STATS-RATE-FIX** (`[CAD-LEARNING-AI]`) — `CADTrialErrorLearningEngine.getFailureStats()`
(the `cad_learning_stats` action) `byCategory` credited 0 successes on a pass (classify() returns
[] for a pass) -> per-category `rate=(f+1)/(f+2)` wildly inflated + DISAGREED with extractPatterns
on the same data. Fixed: a pass credits success to ALL categories (new shared `ALL_FAILURE_CATEGORIES`
const, also DRY-replaces updateAggregates' inline array). 32/32 tests (incl cross-consumer
stats==extractPatterns equality), 2-arm scrutiny PASS 0 findings.



**U-INCAD-INFER-FAILLOUD** (`[CAD-LEARNING-AI]`, slot:india, first) — `per_app_incad_infer`
(`cadDispatcher.ts:5820`) did `new PerAppInCADInferenceAdapter()` with NO args, but the ctor
REQUIRES injected `runtime: InferenceRuntime` + `extractor: FeatureExtractor` -> TypeError
crash-on-construct (never even reached the dark `.runInference?.()` probe). Fixed to fail-loud
([[stub-fallback-must-signal-mode-not-pose-as-real]]): added pure `static describeCapabilities()`
(no construct) + rewired the case to report `{wired:false, mode:"backend-required", capabilities}`
(10 CAD apps x 10 inference types discoverable). 59/59 tests (54 existing engine + 5 new), 2-arm
scrutiny PASS 0 findings.

## India-in-lane unit QUEUE (next, fresh context — verified via search-first)

1. **`cad_learning_*` subsystem audit** (`cadAutomationDispatcher`: cad_learning_ingest /
   _patterns / _recommend / _ingest_batch / _reset). The actual CAD LEARNING loop (learns from
   CAD ops -> recommends). Master-index L10/built. NOT yet verified dark-or-real — audit each
   for dark-facade / loop-closure gaps (predictions in, actuals back?). Likely the highest-value
   india unit for this goal.
2. **text->CAD Ollama loop** (`scripts/cad-text-to-cadquery.mjs`, LIVE — qwen2.5-coder:32b ->
   gated CadQuery staging `state/shared/cad-text-gen/`). Wiki [[cad-text-to-cad-landscape]].
   Improve the learning feedback (each generation outcome -> training signal).
3. **blueprint LoRA / RAG** (`blueprint_lora_*`, `blueprint_rag_*` on cadDispatcher). India OWNS
   blueprint LoRA per galaxy doctrine. Audit wiring + close the train/eval loop.
4. **per_app_incad_infer REAL backend** (needs-design): build/inject a real `InferenceRuntime`
   (ONNX/TensorRT) + `FeatureExtractor` so the adapter can actually serve in-CAD inference.
   Substantial — dedicated milestone, coordinate delta (CAD runtime).
5. **print->CAD orchestrator** (`PrintToCADOrchestratorEngine`, `BlueprintToCADGenerationEngine`)
   — xray's domain; coordinate, the india slice is the learning/RAG feeding it.

## Deeper veins found (not fast/clean — for fresh-context / owning-slot)

- **14 probe-facade actions in `cadDispatcher.ts`** (`.method?.() ?? .run?.() ?? {note:"method not callable"}`):
  engine_digest, freecad_automation, autocad_open_drawing/addin, nx_sketch, cad_to_step, cad_screenshot,
  fusion360_generator_adapt, fusion360/hypercad_function_index, fiveaxis_cad_template, two_pass_cascade,
  cascade_fallback, cad_live_blueprint_ocr (~5886). PROBE form (many likely resolve to a real method) ->
  each needs per-engine verification like the india dark-facade audit. Mostly **delta (CAD-app bridges) /
  xray (blueprint OCR)** domain -> route to owners or a fresh dedicated audit. (india already fixed the one
  that CRASHED: per_app_incad_infer.)
- text->CAD loop, blueprint LoRA/RAG engine internals, per_app real InferenceRuntime backend = deeper builds.

## Goal is UNBOUNDED (operator loss-function needed)

The operator goal is open-ended "improve" prose with no deterministic stop test; the goal-complete Stop
hook flagged it can't genuinely resolve without a loss function. 2 verified improvements shipped; fast
india-in-lane veins tapped. Proposed bound for a clean resume: "audit+fix all dark/probe-facade CAD-AI
actions (count == 0 dark) AND close the cad_learning_* feedback loop (predictions->outcomes->retrain)" —
a deterministic, countable gate. Until the operator sets the real loss function, treat each fresh session
as: ship 1-3 verified CAD-learning-AI improvements from this queue, then checkpoint.

## Coordination
delta = CAD geometry kernel; xray = blueprint OCR / print->CAD (active, fleet-LIVE); india =
learning/LoRA/RAG/inference layer. peer claude-b active on U-NN-TIER05. Use cheapest rung first
(galaxy-claudemd -> tribal -> wiki -> prism_cad/prism_ai -> claude); offload mechanical to Ollama.

Cross-cutting gotchas (this session): responseSlimmer prunes null/[]; executeAIReasoningAction
single-wraps (bare result); cadDispatcher wraps {success,data} + slims; ascii-guard blocks em
dashes; 16GB heap for tsc. See [[reference_dark_facade_action_class_2026_06_23]].
