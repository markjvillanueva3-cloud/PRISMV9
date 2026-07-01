# CAD-Generation-Technique Coverage Audit (2026-06-12, slot:india)

**Operator goal:** resume closed-loop CAD training, galaxy-by-galaxy; assess whether wiki + tribal
knowledge cover **every possible CAD generation technique** (the corpus-readiness check behind
"draw any cad file from print with 100% accuracy").

**Method:** a 40-agent Workflow (`wf_980af3a7-06e`). Phase A (taxonomy) + Phase C (synthesis)
SUCCEEDED; **Phase B — the 34 per-galaxy coverage agents ALL rate-limited and failed** (Anthropic
server-side limit from 16-wide concurrency burst). The synthesis agent recovered by reading the real
files itself, so the verdict is grounded in direct reads — but the per-galaxy granularity the
operator wanted was NOT achieved via fan-out. Raw output:
`state/shared/specs/CAD-GEN-TECHNIQUE-COVERAGE-AUDIT-2026-06-12.raw.txt`.

## Denominator: 361 canonical CAD generation techniques

The taxonomy phase built an authoritative, deduplicated list of **361 distinct techniques** across 33
categories: sketch-additive (extrude/revolve/sweep/loft families), subtractive, dress-up
(fillet/chamfer/shell/draft/rib/boss/dome), holes, threads/coils, patterns, boolean, surfacing
(NURBS/ruled/lofted/swept/boundary/fill + modify/offset/knit/trim), freeform/sub-D/direct, sheet-metal
(40), weldments (12), mold/die/casting (28), plastic features, assembly (mates/joints/patterns/top-down),
parametric/config, import/repair/feature-recognition, 2D drawing, CAM-integrated geometry, generative.
Full list in the `.raw.txt` artifact (sections SKETCH-BASED ADDITIVE … SPECIALTY, items 1–361).

## VERDICT: ~7% real coverage — NOT enough

- **Real technique-level coverage: ~25 / 361 = 6.9%.** Concept-touched ceiling (named-in-theory): ~70 / 361 = 19.4%. **~291 techniques (80.6%) have ZERO coverage.**
- **Tribal corpus: 23 tips, 0 about CAD generation, 5 were test fixtures** (`example.com` / `/tmp/` / `/path/to/` placeholders — **PURGED this session, 23→18**, `state/tribal_captured_tips.json`). As a "how to draw a part" signal the tribal store contributes ~nothing.
- **CAD wiki is theory/strategy/DFM, not a generation cookbook** (5 files, ~530 lines: B-rep/CSG, NURBS, GD&T, STEP/AP242, skeleton/top-down, history-vs-direct, class-A). It does not enumerate how to execute an extrude/sweep/flange/parting-surface.
- **Only operation footprint: ~44 dispatcher action stubs** (extrude/extrude-cut/revolve/fillet/chamfer/shell/hole/sketch/spline/loft-wing/coil + 8 `f360-live-*` Fusion bindings) — the prismatic-primitive core only.
- **Only ~1.5 galaxies are real CAD-gen sources:** `cad` (consumption theory + strategy, weak on generation ops) and the live-binding half of `cad-fusion-live` (8 Fusion ops). All machining galaxies (mill/lathe/wedm/cam/speed-feed/post-processor) hold downstream toolpath knowledge, **0 CAD generation**.

## Whole-domain GAPS (zero coverage)
sheet-metal (40, **largest contiguous gap**) · surfacing generated+modify (32) · sub-D/mesh-to-BREP (23) ·
mold/die/casting (28, **strategic — JM Die IS a die shop**) · weldments (12) · assembly component-patterns +
mechanical-mates/joints (~30) · 2D-drawing generation (20) · sweep/loft/draft/rib/thread/boolean families (Tier-1).

## Gap-closure shopping list (ranked ROI)
1. **CAD-system command references** (SolidWorks/Fusion/Inventor/Onshape/FreeCAD/Creo/NX help) — one ingest pass yields the full operation set; **lifts coverage ~7% → ~70%**. Highest ROI per token.
2. **Sheet-metal + weldment** training/vendor material (the 52-technique twin gaps).
3. **Mine the JM Die corpus** (`H:/PRISM/JM DIE/`, 24,545 files) — first-party progressive-die strips / electrodes / part files = real mold/die generation exemplars for PRISM's actual customer.
4. **Surfacing + sub-D** docs (Alias/class-A, Fusion sculpt/T-spline; MIT 2.158J for the math tier).
5. Restructure the CAD wiki around the 361-technique taxonomy (`cad/generation/` layer keyed to technique IDs) so coverage is measurable + gaps become assignable units; wire each `actions/cad/*` stub to its taxonomy ID.

## Lesson: agent-spawning rate-limit + the workaround (for the re-run)
34 concurrent tool-heavy Claude agents tripped Anthropic's **server-side** rate limit (5.8M tokens, mostly wasted on the failed fan-out — the [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] failure class). Workarounds for the granular per-galaxy re-run:
1. **Batch ≤4–6 concurrent**, sequential batches (`for (chunk) await parallel(chunk)`).
2. **Route the mechanical inventory to LOCAL Ollama** (qwen3-coder:30b, 100%/8-task probe) — **no Anthropic RPM limit, $0**, GPU-bound concurrency. The model-routing/offload system (MODEL-ROUTING-MS0) exists for exactly this.
3. **Best: do the inventory in CODE (deterministic grep per technique-keyword), reserve the model only for synthesis** (R5). The coverage question is a deterministic search problem — it should not need 34 agents at all.

Memory: [[reference_cad_gen_coverage_audit_2026_06_12]]. Pairs with the MODEL-ROUTING-MS0 offload system.
