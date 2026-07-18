---
name: blueprint-ocr-bridge-adapter-gap
type: lesson
tags: [quoting, blueprint, ocr, adapter, silent-bug, type-safety, charlie]
created: 2026-06-09
commit: d447cee202
related: ["blueprint-to-quote", "quoting-synergy-ms0"]
authored_by: claude-928a8226 (charlie); drafted by local Ollama qwen2.5-coder, verified + corrected by Claude
---

# Blueprint OCR to Quote bridge adapter gap

## Symptom
Two engines each export an interface named `BlueprintAnalysis`, but the shapes differ. `BlueprintOCREngine` emits `gdt_frames`, `dim.nominal`, `dim.raw_text`, `gdt.datum_references`, `title.title`. `BlueprintToQuoteBridgeEngine.bridge()` reads `analysis.gdt`, `dim.value`, `dim.text`, `datum_refs`, `title_block.part_name`. Both call sites (`shopDispatcher.emp_blueprint_to_quote`, `businessDispatcher.blueprint_to_quote`) fed the OCR shape straight into `bridge()`, so `bridge()` read `analysis.gdt = undefined` -- silently dropping ALL GD&T and mis-reading dimensions, producing under-spec'd quotes from real prints with no error.

## Root cause
The two interfaces collide by NAME only across modules. `shopDispatcher` DID fail type-check (TS2345 + TS2694) -- but the error sat unfixed in the pre-existing tsc baseline. `businessDispatcher` hid the SAME runtime bug entirely: its params are a loose `z.record(z.string(), z.any())`, so feeding the wrong shape was type-invisible. The original tests mocked the consumer's `BlueprintAnalysis` shape directly, so they never exercised the real OCR -> bridge edge.

## Fix (commit `d447cee202`)
A typed `fromOCRAnalysis(ocr)` adapter on the bridge engine remaps the fields (`gdt_frames` -> `gdt` is the load-bearing remap; also `nominal` -> `value`, `raw_text` -> `text`, `datum_references` -> `datum_refs`, `title` -> `part_name`). A `bridgeFromOCR(ocr, overrides)` entrypoint composes `bridge(fromOCRAnalysis(ocr), overrides)`. Both consumers were rewired to it; `QuoteEstimateInput` was re-exported (fixing the TS2694). `bounding_box` has no OCR source -> left undefined (the bridge guards it), never fabricated from unordered dimension callouts. Validated by 6 fail-on-revert round-trip tests fed REAL `analyzeBlueprint()` output (73 tests green; tsc -2/0-introduced).

## Lesson
Two interfaces sharing a name across modules is a silent-data-loss trap -- a loose `z.record(any)` schema makes it type-invisible, and mocking the consumer's shape in tests hides it indefinitely. Test an intake adapter with REAL producer output, never a hand-built mock of the consumer's shape: the mock is exactly what hid this.
