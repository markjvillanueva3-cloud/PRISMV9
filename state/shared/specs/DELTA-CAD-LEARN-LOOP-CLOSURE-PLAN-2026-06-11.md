# Delta CAD Closed-Loop TRAINING — learn-loop closure plan (india ⇄ delta, 2026-06-11)

> Operator goal (india session): "max out training for CAD drawing for delta... completing
> closed loop training to draw any cad file from print with 100% accuracy."
> india owns the **training-methods** half (LoRA/RAG/closed-loop/outcome-consumption); delta
> owns the CAD domain (geometry/BRep/feature-recognition/metrology). This is the india half:
> how to CLOSE delta's learn loop, grounded in delta's real state.

## State of delta's CAD closed loop (grounded)

- **MEASUREMENT loop: PROVEN.** CAD-CLOSED-LOOP-MS0 (18 commits 2026-06-10) proved
  measure→correct→converge against REAL references (`blisk.stp`, `Impeller turbine.stp`, valve,
  rotor) with real metrics: surface-Hausdorff + Chamfer + dims + bbox-volume, units-first
  inch→mm. Canonical accuracy: **0.000% dims / 1.551% mean / 5.087% worst** surface deviation
  (U-CAD-FIDELITY-E2E-VALIDATE). Honest ceiling: literal 0% surface = re-import the NURBS net,
  not regeneration. Real trainers EXIST: `CADSequenceTrainerEngine`, `CADTrainingPipelineOrchestratorEngine`.
- **CORRECTION loop: EXISTS + validated live** (R12 — verified, not measure-only).
  `scripts/cad-fusion-correction-loop-live.mjs` runs end-to-end on the real `:18365` Fusion
  bridge: build part proxy → `probeFaceGeometry` → `diffXrayPrints` vs xray ground truth →
  `proposeFeatureCorrections` → plan + apply ([[reference_delta_closed_loop_training_live_2026_06_02]]).
  So delta measures AND corrects within a session.
- **TRAINING-PERSISTENCE arrow: OPEN (the actual gap).** Per DELTA-CONTEXT-LEDGER §3 A3/P9
  (delta's iter2 finding): `cad-fix-training-ledger` does NOT exist; `xproc_outcome_publish →
  india` is unwired. VERIFIED: `state/outcomes/` carries speed_feed/sinker_edm/mill/lathe/wedm/
  grinder/welder — **NO `cad.jsonl`**. So each session's corrections are NOT persisted as durable
  training signal that improves the NEXT session's generator. The loop is
  measure→correct→**(corrections evaporate at session end)**, not measure→correct→**persist→retrain**.
  Closing THAT arrow is what makes the loop self-improving ACROSS sessions, not just within one.

## Why india is the right half-owner

This is the SAME open-loop→training gap india just closed fleet-wide (U-OUTCOME-LORA-WIRE,
2026-06-11): the outcome bus was a write-only sink until a converter turned its events into
LoRA training pairs. Delta's CAD accuracy outcomes are the identical pattern at the CAD grain.
The `xproc_outcome_publish → india` arrow literally points the CAD outcomes at india's training
substrate.

## Closure plan (dependency-ordered; clone-don't-fork the L2 pattern)

1. **delta — emit CAD compare() outcomes to the bus.** On each closed-loop regen, delta's
   compare()/Hausdorff engine appends a `state/outcomes/cad.jsonl` event:
   `{domain:"cad", kind:"regen_measured", context:{part, geometryClass, units, featureCount,
   generator}, actual:{dimsPctDev, meanSurfacePct, worstSurfacePct, hausdorffMm, chamferMm,
   converged:bool}}`. (Mirror the existing outcome-bus event schema — speed_feed/sinker_edm
   already use `{schemaVersion,event_id,domain,kind,context,recommended|actual}`.) **delta-owned**
   — it needs the real compare() field names (do NOT fabricate them; R12).
2. **india — CAD-outcome → training-correction converter.** Extend the L2 converter family
   (`scripts/lib/outcome-to-alpaca-converter.mjs`) with a CAD path: instruction = the print/part
   context (geometryClass, featureCount, target dims), output = the generation directives that
   REDUCED deviation (the "correction" — needs delta's fix-ledger to know which regen params cut
   the deviation). Register `cad-outcomes` as an advisory `lora-training-jsonl` source (exactly
   like `outcome-bus-recommendations`). The assembler auto-folds it (manifest-driven).
3. **delta+india — the fix-ledger (A3/P9, the L-build).** `cad-fix-training-ledger`: per regen,
   record (deviation_before, correction_applied, deviation_after). THIS is the closed-loop signal
   — only corrections that MEASURABLY reduced deviation become positive training pairs (R9: a
   correction is "good" only if `deviation_after < deviation_before`). Build ONTO
   `CADTrainingPipelineOrchestratorEngine`. Wire it as the retrain consumer.
4. **delta — GPU re-embed for CAD-RAG (Blackwell lever, C3/P5).** The deferred 768d CPU-ONNX →
   1024d GPU `nv-embedqa-e5-v5` migration + STEP catalog 33%→100% re-embed. Leverages the new PC
   specs the goal names; feeds retrieval that grounds generation. Use the fleet
   `PRISM_EMBED_CONCURRENCY=16` knob (now honored after U-EMBED-CONCURRENCY-KNOB) to saturate the GPU.

## The top UNBLOCK (operator-gated)

DELTA-CONTEXT-LEDGER §4 names **C1 → P1 `U-MERGE-SLOT-DELTA`** (operator-gated coordinated merge)
as "THE highest-leverage action — unlocks 410 commits incl. the built smooth-solid emitter."
The learn-loop closure builds on that merged foundation; the merge is the precondition. Operator
action: run the merge playbook in DELTA-CONTEXT-LEDGER §1.

## Honest scope (R12)

Step 1 (delta emit) + Step 3 (fix-ledger) are **delta-domain L-builds** needing delta's real
compare() schema + generation-param introspection — NOT fabricated here. Step 2 (india converter)
is a clean clone of the shipped L2 pattern, buildable once Step 1 emits a real `cad.jsonl`. The
"100% every time" goal is bounded by the proven ~1.5% NURBS-regeneration ceiling (exact = re-import).
The acceleration here is **closing the feedback arrow**, so each regen's measured deviation trains
the next — turning delta's proven measurement loop into an actual learning loop.

_slot:india 2026-06-11. Pairs with the fleet outcome→LoRA wiring (U-OUTCOME-LORA-WIRE) + delta's
CAD-CLOSED-LOOP-MS0. Entry: DELTA-CONTEXT-LEDGER §3 A3/P9 + §4 C1._
