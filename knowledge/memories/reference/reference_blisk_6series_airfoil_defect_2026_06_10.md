---
name: reference-blisk-6series-airfoil-defect-2026-06-10
description: "BliskCADEngine turbine/blisk DEFECT (live repro): BladeProfileLibraryEngine.listProfiles() advertises NACA 65-010 + 65-012 (6-series) but parseDesignation()/getProfile() only handle 4/5-digit -> generate() THROWS AirfoilParseError on the 6-series profiles the catalog lists AND that BliskBladeSpec JSDoc gives as the example. validate() returns {valid:true} for the unparseable profile (validate/generate inconsistency). POSITIVE: with NACA 0006 generate() works -> 53 ops, 5 blade sections, vol 400973.6mm3, mass 3.284kg turbine. Fix = extend parseDesignation for 6-series (complete) + validate() reject unparseable profiles (fail-loud)."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.479Z
aliases: reference_blisk_6series_airfoil_defect_2026_06_10
---


# BliskCADEngine 6-series airfoil defect + turbine-blisk generation PROVEN (2026-06-10, slot:delta)

Probed the literal "turbine/blisk" goal target via the built dist (`mcp-server/dist/engines/BliskCADEngine.js`), node driver (no fan-out, no throttle). Ollama (`qwen2.5-coder`) was used to explain the engine first (operator Ollama directive; ~5859 tok saved).

## POSITIVE — turbine blisk generates (R9 real numbers)
`new BliskCADEngine().generate({stageType:"turbine", diskOuterRadius_mm:80, bladeCount:30, blade:{profile:"NACA 0006", inletAngle_deg:35, outletAngle_deg:55, chordHub_mm:18, chordTip_mm:14, height_mm:30, twist_deg:15}, ...})` ->
- **53 CAD operations**, op types: `datum_coord_system, sketch_create, sketch_line, sketch_close, feature_revolve, feature_hole, datum_plane, sketch_spline, feature_loft, pattern_circular, feature_fillet` (a complete blisk authoring recipe: revolve disk -> bore -> loft blade from hub->tip splines -> circular-pattern 30 blades -> fillets).
- 5 blade control-point sections (hub->tip), volumeEstimate 400,973.6 mm3, massEstimate 3.284 kg (Inconel 718 rho 8190), 0 warnings.
- This is a FEATURE/op-sequence representation (not faceted STEP) -> feeds a Fusion/CAM bridge. Higher-value than the faceted multi-prism trilobe STEP [[reference_delta_complex_part_generation_proven_2026_06_10]].

## DEFECT (R12, live repro)
- `eng.listProfiles()` returns 8: `NACA 0006, 0010, 0012, 2412, 4412, 65-010, 65-012, 23012` -- INCLUDES the 6-series 65-010/65-012.
- `eng.generate({...blade.profile:"NACA 65-010"...})` THROWS `AirfoilParseError: Cannot parse airfoil designation "NACA 65-010": expected 'NACA <4-or-5-digits>'` at `BladeProfileLibraryEngine.parseDesignation` (dist line 279) <- `getProfile` (117) <- `BliskCADEngine.generate` (56).
- `eng.validate({...same...})` returns `{valid:true, errors:[], warnings:[]}` -- does NOT catch the profile its own generate() will reject (validate/generate inconsistency; silent-pass -> runtime throw).
- 6-series (NACA 65-010) is THE standard compressor/turbine airfoil family AND is `BliskBladeSpec`'s documented example (src/engines/BliskCADEngine.ts:48 JSDoc).

## FIX (next fresh-ctx fire, through scrutiny gates -- agents throttled now)
1. **Complete fix:** extend `BladeProfileLibraryEngine.parseDesignation` to handle NACA 6-series ("6X-0YY" -> series 6, min-pressure-loc X*10%, thickness YY%). The catalog already carries 65-010/65-012 thicknessPercent; the parser just rejects the string. Real 6-series thickness distribution if doing it properly (not just %-extraction -> that would be a silent geometry fallback the soul refuses).
2. **Fail-loud secondary:** `BliskCADEngine.validate()` should reject a profile not parseable by the library (so it fails at validate, not generate). Unit test: validate("NACA 65-010").valid === false.
Repro is deterministic; both are real-reference-value testable. Unit: U-BLISK-6SERIES-PARSE.

Bug-finding doctrine: [[feedback_always_capture_lessons]] · [[feedback_always_update_wiki_on_bug_finding]]. Soul refuse: silent-feature-recognition-fallback.
