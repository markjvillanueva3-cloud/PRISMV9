# DELTA CAD GENERATION-LANE STATUS — 2026-07-04 (slot:delta)

Honest proof-of-progress for the CAD text→model generation lane after a 24-unit build arc.
ASCII only. Numbers are LIVE-measured, not asserted.

## 1. WHAT IS BUILT (the self-improving generation loop, end to end)

`request -> [deterministic primitive OR LLM] -> execute (cadquery) -> dim-check -> outcome -> fix-ledger -> LoRA`

- **Pattern-recognition (geometric):** featurizer -> index -> retrieve -> coherence -> loop-wire -> quality
  (7 units). A generated part records its nearest proven corpus precedents + archetype + outlier flag
  (`status.precedentCheck`). Live recall@1=0.935 over 696 real corpus parts. Commits: a80f53bd21, 37cd14ef83,
  5ecca1d395, 8e9b1c7fc4, 4cc7b0e142, ebf705e98a, 1d7fd9b570.
- **Offline dimensional convergence (no Fusion):** prismatic via point-cloud bbox (EXACT); curved via the
  STEP RADIUS entity for diameter + bbox for axial length. Both feed the learning signal
  (classifyGenerationOutcome fails a wrong-size part offline). Commits: 73347d34eb (topology),
  d6f576f401 (curved dia), f001ad65b8 (curved len), 6225fdc743 (learning-signal wire).
- **Units-bug self-improvement arc (detect -> root-cause -> fix):** root-caused that 41% of METRIC requests
  had the LLM divide by 25.4 (25.4x-undersize scrap). Fixed by (a) a request-specific metric prompt override
  (092b6c9373) and (b) a DETERMINISTIC primitive emitter (23a50eb83e + 046f9d6648) that bypasses the LLM for
  unambiguous primitives -- dimensionally EXACT and Ollama-INDEPENDENT.

## 2. LIVE CONVERGENCE NUMBERS (measured 2026-07-04)

- Generation self-consistency over the 320 staged gens: 85% executed.
- Dimensional accuracy (offline, whole-population, split by measurement reliability):
  - prismatic (bbox EXACT): 83.7% over 123
  - curved (radius+bbox): 68.9% over 148 (dia+len; the diameter-only figure was 84.5% -> ~16% wrong-length)
- Geometric outliers (resemble no proven precedent): 4.0% (all small cylinders -> corpus underrepresents them)
- **DETERMINISTIC emitter coverage: 218/321 = 68%** of corpus requests now generate dimensionally-EXACT +
  Ollama-free (cube 8, cylinder 60, rect/block 97, tube/bushing 53).

## 3. HONEST CEILING + GATED FRONTIER (what remains, and why it is not "just build it")

- **68% is the unambiguous-primitive ceiling.** The uncovered 32% are FEATURE parts whose geometry needs
  judgment: has-hole 35, slot/pocket 28, fillet/chamfer 8, bracket/flange 5, cone/taper 3, other 23. A
  hole's AXIS and LOCATION are ambiguous even when "centered" is stated (through which face?), so a
  deterministic emit would be a guess, not exact (R12). These correctly route to the LLM.
- **BLOCKED: the LLM path (Ollama).** Ollama generation currently times out (curl exit 28) under fleet load,
  so the complex-part 32% cannot generate right now. The deterministic 68% is unaffected. Needs a
  free/prioritized inference lane or off-peak run.
- **GATED: curved SURFACE fidelity** (Hausdorff, non-manifold, freeform blades) needs the Fusion add-in on
  :18362. Offline handles DIMENSIONS, not surface fidelity. (Diameter is offline via the radius entity --
  do NOT confuse the two.)
- **GATED: the MCAD lane (UNIT-0037)** -- 12,572 ipt/iam/sldprt need Inventor/SolidWorks or a STEP bridge.
- **BUILD-LAST: UNIT-0039 convergence audit** -- correctly deferred until the per-modality lanes land.
- **ASSEMBLY generation (goal pillar) -- LLM-frontier, execution verified.** cadquery `cq.Assembly().add(...)
  .export(STEP)` WORKS (verified: pin-in-bushing -> valid multi-body STEP, radii 4.76/4.85/9.53). But a
  typical assembly request is UNDER-specified (relative positioning / part lengths / mate are ambiguous --
  same class as a hole's axis), so it is NOT deterministically tractable; it needs LLM judgment and joins the
  complex 32%. The deterministic 68% ceiling therefore holds across ALL shape classes (primitives+tubes exact,
  features+assemblies -> LLM). Use `assy.export()` not `assy.save()` (deprecated). Memory:
  reference_cad_assembly_feasibility_2026_07_04.

## 4. NEXT (operator decision)

Non-gated deterministic gen-lane work is at its ceiling. The highest-leverage next moves require an operator
resource: (a) bring Ollama back to a usable latency (or run the complex-part batch off-peak) to exercise +
train the LLM on the 32%; (b) bring the Fusion add-in up on :18362 for curved surface-fidelity grading; (c)
supply an MCAD reader/bridge for UNIT-0037. Until then, primitives self-generate correctly and the loop
learns from every executed part offline.
