---
name: reference_xray_gdt_fcf_validation_2026_06_21
description: "xray shipped a 3-unit GD&T FCF-validation thread (blueprint OCR): (1) informational ASME Y14.5 FCF syntax validation wired into the VLM OCR live path (gdtFcfValidate adapter -> FCFSyntaxValidatorEngine, fcf_valid/fcf_issues on ExtractedGDT); (2) fixed a false datum-deficient flag on FORM tolerances in the closed-loop grinder (.mjs); (3) closed a real validator gap -- concentricity/symmetry now flagged missing-datum. Both OCR runtimes + the shared validator now agree on the 8 datum-requiring symbols. Key hazard: OCR-side vs parser-side GDTSymbol enums DIFFER (circularity/profile_line/profile_surface vs roundness/profile_of_line/profile_of_surface)."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.273Z
aliases: reference_xray_gdt_fcf_validation_2026_06_21
---


# xray GD&T FCF-validation thread (2026-06-21, 3 units, all CLEAN attribution + 2-arm PASS)

All on `cad-fusion-live-ms0`, `[MAIN-FORCE]` (chained `git add && git commit` in ONE shell
beat the cherry-pick absorption race -- 3/3 kept own attribution; see
[[reference_xray_surface_finish_normalize_2026_06_20]] for the absorption hazard).

## U-XRAY-GDT-FCF-VALIDATE (a99e1c867d)
New pure adapter `mcp-server/src/utils/gdtFcfValidate.ts`: maps the OCR-side `ExtractedGDT`
shape into the existing `FCFSyntaxValidatorEngine` `FCF` input and calls `.validate()` (REUSE,
not reimplement). Wired into `BlueprintVisionOCREngine.convertGDT` -> two ADDITIVE optional
informational fields `fcf_valid?`/`fcf_issues?` on `ExtractedGDT` (BlueprintOCREngine.ts).
INFORMATIONAL ONLY -- mutates no cost/process-bearing field (sibling of the
U-XRAY-PART-DEFAULT-FINISH discipline); no GPU; verdict rides the existing OCR result through
cad_live_blueprint_ocr/blueprint_to_quote/print_to_program. No new dispatcher action
(cad_fcf_validate already validates pre-parsed FCFs).

**KEY HAZARD (the load-bearing reason the adapter exists):** the two `GDTSymbol` enums DIFFER:
- OCR side (`BlueprintOCREngine.ts`): `circularity`, `profile_line`, `profile_surface`
- parser side (`GDTCalloutParserEngine.ts`): `roundness`, `profile_of_line`, `profile_of_surface`
A naive symbol pass-through would make the validator silently fail to recognize `circularity`
as a FORM tolerance (no FORM_WITH_DATUM) + the two profile symbols. `SYMBOL_TO_PARSER` maps all
14 OCR symbols + 3 parser-native aliases. material_condition (MMC/LMC/RFS) -> material_modifier
(M/L); inch->mm (NO rounding -- round4 could truncate a real sub-0.00005mm tol to a false
ZERO_TOLERANCE); unknown symbol -> undefined (no misleading verdict). 26/26 vitest.

## U-XRAY-GDT-DATUM-DEFICIENT-SYMBOL-AWARE (75a12e4922)
BUG in the closed-loop grinder `scripts/lib/ollama-vision-extract-lib.mjs` `extractGdt`:
`datum_deficient: datums.length === 0` for ALL symbols. WRONG per ASME Y14.5 §8.2 -- FORM
tolerances (flatness/straightness/roundness/circularity/cylindricity) must NOT reference datums,
so zero-datum is CORRECT there (not deficient); a datum-less profile is a valid form-only
profile. The crude boolean falsely flagged every valid form frame -> OVER-COUNTED deficiency in
the closed-loop TRAINING metrics (blueprint-ocr-review.mjs dashboard + run-ollama-vision-extract
per-print count). Fix: symbol-aware via `DATUM_REQUIRED_SYMBOLS` (location position/concentricity/
symmetry + orientation parallelism/perpendicularity/angularity + runout circular/total). The
pre-existing test ENSHRINED the bug (R9) -> corrected the oracle + added per-symbol coverage.
82/82 lib + 9/9 review node tests (run via `node file.mjs`, NOT `node --test` -- env note).

## U-XRAY-FCF-CONCENTRICITY-SYMMETRY-DATUM (95ac8443c0)
Real gap in the SHARED `FCFSyntaxValidatorEngine`: it emitted missing-datum only for
position+orientation+runout; `concentricity`/`symmetry` (datum-requiring LOCATION controls --
coaxiality about a datum axis / median-plane symmetry; deprecation is NOT datum-exemption) fell
through -> wrongly valid. Added them to the MISSING_DATUM condition (position keeps its own
POSITION_NO_DATUM, no double error). Purely additive (no existing test/consumer passed those
datum-less). **R16 fit-the-whole:** the TS validator now AGREES with the grinder's 8-symbol
DATUM_REQUIRED_SYMBOLS set -- the cross-runtime divergence is closed; flows through gdtFcfValidate
so the OCR live path now flags concentricity/symmetry-no-datum too. 19/19 validator + 26/26
adapter; tsc 0 errors.

## U-XRAY-LIVE-OCR-FCF-SURFACE (b649ebba4c)
The live MCP consumer `CADLiveBlueprintOcrAdapter.mapAnalysisToPrintOcr` was flattening
`gdt_frames` -> `{id,kind,detail}` and DROPPING the FCF verdict -- so `cad_live_blueprint_ocr`
(operator-facing MCP action) never surfaced an invalid frame (orphan output: computed but not
delivered). Added `fcfValid?`/`fcfIssues?` to `PrintFeature` (CADRoundTripValidationEngine.ts,
additive optional) + carry the verdict through the GD&T mapping; an invalid frame is marked
"-- INVALID FCF" in detail. ALL advisory issues carried (not just invalid -- e.g.
PROFILE_WITHOUT_DATUM info on a valid frame). Survives the multi-page `unionFeatures` spread.
Back-compat: a frame with no verdict (unknown symbol / pre-validation) preserves the EXACT prior
shape. 53/53 adapter tests; tsc 0. This is the real R15 consumer -- the verdict now reaches an
operator surface, not just rides BlueprintVisionResult.gdt_frames.

## State of the GD&T blueprint-reading capability now
- Both VLM prompts (.mjs + TS) ALREADY request structured GD&T (symbol/tolerance/material_condition/
  datum_references/raw_text) -- so backlog P1.4 "GD&T-aware structured prompting" is largely DONE.
- FCF syntax validation now runs on BOTH OCR paths (grinder datum-deficiency + TS full validator)
  and the two AGREE on the datum-requiring classification.
- The TS validator + the gdtFcfValidate adapter are the authoritative GD&T-validation surface.

## Open follow-ups (next xray loop iters -- all pure/no-GPU unless noted)
1. [DONE -- U-XRAY-LIVE-OCR-FCF-SURFACE b649ebba4c] A real CONSUMER that ACTS on fcf_valid: the
   live cad_live_blueprint_ocr MCP output now surfaces fcfValid/fcfIssues + an "INVALID FCF"
   detail marker per GD&T feature (was dropped). Possible further wiring: route an invalid-FCF
   count into the operator-confirm/accuracy gate at the print level (currently per-feature only).
2. [VERIFIED MOOT 2026-06-21] Training-set quality: the closed-loop training+scorer
   (blueprint-ocr-training-loop.mjs + dimension-set-score.mjs) is DIMENSION-ONLY -- it does NOT
   touch gdt/datum/fcf (grep-confirmed 0 refs). GD&T is a separate review channel, never fed to
   the training ground-truth. No "training on malformed GD&T" bug exists. Do NOT re-investigate.
3. Backlog P2.8 symbol/vocabulary normalizers -- THREAD callouts (M8x1.25-6H, 1/4-20 UNC-2B, LH,
   depth) are the high-value target for the JM corpus (tapped holes common); weld symbols are
   low-value for machined dies/inserts. Same shape as the shipped surface-finish normalizer.
   NEXT NATURAL UNIT (pure/no-GPU). First scope what the existing DIMENSION_PATTERNS thread regex
   already captures (nominal_str) vs structured fields (class/fit/depth/hand).
4. Backlog P0.2 region tiling for dense pages (GPU A/B -- run OFF the live grinder window).
