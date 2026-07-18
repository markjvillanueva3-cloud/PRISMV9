# UNIT-0036 — CNC Program Back-Inference Training Lane

**Unit ID**: 0036
**Domain**: CAD Modeling & Engineering (Domain 10)
**Title**: CNC Program Back-Inference Training Lane (G-code → geometry/features)
**Status**: In Progress (prerequisite slice shipped 2026-07-02, slot:delta)
**Priority**: P0
**Estimated Effort**: 8-12 hours (largest corpus)

## Gap verdict (delta-cad agent, 2026-07-02 — `work/UNIT-0036-gap.md`)
**EXTEND** — foundation exists: `UnifiedProgramParserEngine.parseArchive/parseContent` (multi-dialect Okuma/Haas/Hurco/Fanuc, wired to prism_dev) + `GCodeReverseCADEngine.reconstruct` (real back-inference: tool list + stock envelope + feature hypotheses + confidence). ROI 7/10.

## Progress
- ✅ **2026-07-02 (`ae64ecad2f`) — reconstruct wiring fix (prerequisite):** the `prism_cam:gcode_reverse_cad_reconstruct` action was 100%-dead (passed `params` as the `blocks` arg → engine threw on every call). Fixed arg-shape + tools→Map normalization + fail-loud; 7 round-trip tests pass with real reference volumes. The back-inference core is now callable through the dispatcher. [[reference_delta_gcode_reconstruct_wire_2026_07_02]]
- ⏭ **Remaining:** raw-text→`ParsedBlock[]` tokenizer (parser's `ParsedProgram` lacks per-block XYZ) · stock/tool-diameter inference · G20/G21 units resolution · (program→geometry) training-pair emitter · night-chain CNC lane. Mill-3-axis first; lathe/WEDM out of current engine scope.

## Description

The H drive holds **367,522 CNC programs** + **2,763 Mastercam files** — the single largest asset class, with NO training lane. This unit back-infers machined geometry / feature intent from G-code (toolpaths → swept-volume → feature hypotheses) to produce (program → geometry/feature) training pairs that close the loop from the CNC-program side. This is the inverse of the CAM path and directly feeds the goal's "cnc programs" bucket.

## Acceptance Criteria

- [ ] G-code parser handles the real controller dialects present at JM (Fanuc/Haas/Okuma/Hurco — verify from the corpus, don't assume)
- [ ] Back-inference emits: tool list, stock-removal envelope (swept volume proxy), feature hypotheses (holes/pockets/profiles/faces), with a confidence per inference
- [ ] Real-data validation: back-infer ≥50 real JM programs; where a matching CAD/print exists, measure feature-recall against it (cross-modality check)
- [ ] Units resolved from `G20`/`G21` per program (NOT assumed) — mismatch is a 25.4× error
- [ ] Wired to `prism_cad` / `prism_cam` back-inference action; training pairs appended to fleet corpus
- [ ] 3-of-3 scrutiny on real programs; no stubs; fail-loud on unparseable dialects (count them, don't silently drop)

## Dependencies

- UNIT-0034 (census)
- Existing: `GCodeRuntimePredictorEngine`, post-processor dialect knowledge (echo galaxy), any existing G-code parser (dedup check FIRST)
- CNC corpus roots (enumerate from canonical-counts source; JM DIE + resources)

## Deliverables

- G-code back-inference engine (or extension of an existing parser)
- (program → geometry/feature) training-pair emitter
- Cross-modality feature-recall validation report
- Night-chain lane wiring + cron

## Autonomous Execution Notes

Gap-analyze FIRST — a G-code parser very likely exists (post-processor + runtime-predictor galaxies); this may be feature-inference ON TOP of an existing parser, not a new parser. 367K programs → stream + batch (Ollama for bulk classify, Claude for the inference logic). Never load raw programs into Claude context — mine via a script.
