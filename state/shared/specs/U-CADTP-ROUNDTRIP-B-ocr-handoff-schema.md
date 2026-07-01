# U-CADTP-ROUNDTRIP-B — OCR → CAD handoff schema (the print-axis contract)

**Owner of producer half:** slot **xray** (blueprint-vision galaxy).
**Owner of consumer half:** slot **delta** (CAD galaxy) — builds the CAD-gen +
compare back-half against this contract.
**Status:** contract LOCKED 2026-06-01 (xray). Producer (live ingest) operational;
consumer (delta CAD-gen) builds against the stub-fed contract until xray's live
feed lands.

---

## 1. What xray emits

xray's OCR front-half (`BlueprintVisionOCREngine` / the standalone
`scripts/lib/ollama-vision-extract-lib.mjs` runner) emits a **dimensioned + GD&T
part-spec**, NOT a geometry-feature summary. The canonical shape is the
`extraction` object returned by `parseVisionResponse(rawText, {assumeUnits})` in
`scripts/lib/ollama-vision-extract-lib.mjs` (mirrors the wired contract in
`BlueprintVisionOCREngine.ts`).

```jsonc
{
  "confidence": 0.0,                 // overall extraction confidence [0,1]
  "units": "mm" | "in" | "mixed" | null,   // drawing's declared unit system
  "title_block": {
    "part_number": "string|null",
    "revision": "string|null",
    "drawing_number": "string|null",
    "title": "string|null",
    "material": "string|null",       // e.g. "D2 Tool Steel", "4140", "SS 304"
    "finish": "string|null",
    "scale": "string|null",
    "units": "in" | "mm" | "mixed" | null,
    "general_tolerance": "string|null",
    "third_angle": true | false | null
  },
  "dimensions": [
    {
      "type": "linear|diameter|radius|angular|chamfer|depth|thread|counterbore|countersink|unknown",
      "nominal_mm": 25.4,            // ★ CANONICAL mm — see §3
      "nominal_raw": 1.0,            // value as printed (pre-conversion)
      "unit": "in" | "mm" | "unknown",
      "unit_resolved": true,         // false ⇒ nominal_mm is null (unit unknown, not assumed)
      "unit_assumed": false,         // true ⇒ converted via caller assumeUnits fallback (NOT silent)
      "tolerance_mm": { "upper": 0.013, "lower": -0.013 },  // present only when a tol was read
      "tolerance_type": "bilateral|unilateral_plus|unilateral_minus|limit|basic|reference|null",
      "location_hint": "where on the part",
      "raw_text": "the exact text on the drawing",
      "confidence": 0.95
    }
  ],
  "gdt": [
    {
      "symbol": "position|flatness|perpendicularity|parallelism|concentricity|circularity|cylindricity|profile_line|profile_surface|circular_runout|total_runout|straightness|symmetry|angularity|unknown",
      "tolerance_value": 0.05,
      "tolerance_unit": "mm" | "in" | null,
      "material_condition": "MMC|LMC|RFS|null",
      "datum_references": ["A", "B", "C"],
      "datum_deficient": false,      // ★ true ⇒ FCF has NO datum (structurally invalid — low-trust, see §4)
      "applied_to": "what feature",
      "raw_text": "the feature control frame text verbatim",
      "confidence": 0.9
    }
  ],
  "notes": [ { "category": "process|material|finish|tolerance|inspection|safety|assembly|general", "text": "...", "is_critical": false } ],
  "profiles": [ { "name": "...", "type": "external|internal|hole|slot|pocket", "is_closed": true, "width_mm": 25.4, "height_mm": 12.7, "diameter_mm": null, "corner_radii_mm": [0.5], "confidence": 0.85 } ],
  "part_bounds_mm": { "width": 50.0, "height": 25.0, "depth": 12.7 } | null,
  "thickness_mm": 25.4,              // stock/part thickness (critical for wire-EDM)
  "surface_finishes": [ { "ra_um": 0.8, "location": "all machined surfaces", "raw_text": "Ra 0.8" } ],
  "unit_resolution": { "drawing_units": "...", "assume_units": "...", "dimensions_total": N, "dimensions_unit_resolved": M },
  "source": "ollama-vision"
}
```

---

## 2. Load-bearing fields for delta's CAD-gen + compare

delta's back-half does NOT need every field. The minimal stable subset the
CAD-gen consumes and the compare diffs against:

| Field | Why delta needs it |
|-------|--------------------|
| `units` + `title_block.units` | sets the CAD model's working unit; a mismatch is a 25.4× scale error |
| `title_block.{part_number, material}` | identifies the part + drives stock/material selection |
| `dimensions[].{type, nominal_mm}` | the geometry-defining values — the heart of the compare |
| `dimensions[].tolerance_mm.{upper,lower}` | fit/feature tolerance for the regenerated print |
| `dimensions[].location_hint` | disambiguates which feature a dimension applies to |
| `gdt[].{symbol, tolerance_value, datum_references, applied_to}` | GD&T to re-emit on the regenerated print |
| `part_bounds_mm`, `thickness_mm` | overall envelope / stock thickness |
| `profiles[]` | closed-loop profile reconstruction (holes/slots/pockets) |

---

## 3. Canonical-mm rule (UNITS-FIRST)

`dimensions[].nominal_mm` is **ALWAYS canonical millimetres**. The conversion is
done in code by `convertToMm()` (R5 — deterministic transform in code, NOT in the
VLM prompt; the model reports the raw printed value + its unit token, code
converts). An inch source → `nominal_mm = nominal_raw × 25.4`.

- `unit_resolved: false` ⇒ `nominal_mm` is `null` (the unit was genuinely
  unknown and no `assumeUnits` fallback was supplied — the value is NEVER
  silently treated as either unit; R12 fail-loud).
- `unit_assumed: true` ⇒ converted via the caller's `assumeUnits` fallback
  (e.g. `"in"` for the all-inch JM Die corpus) AND flagged — never silent.

delta must read `nominal_mm` (not `nominal_raw`) for all geometry, and treat a
`null nominal_mm` / `unit_resolved:false` dimension as a hard "needs operator
confirm", never a 0.

---

## 4. Diff axis — SPEC-DIFF, not geom-diff

The round-trip B compare (old print spec ↔ regenerated print spec) diffs on
**value + type** (a dimensioned spec-diff), NOT on geometry features
(bbox / cylinder_count / bspline_count). That geom-feature summary is delta's
INTERNAL CAD representation; the printed-spec axis of the round-trip is this
dimensioned contract.

- Match a regenerated dimension to an original by `(type, nominal_mm)` within a
  tolerance band (the existing `scripts/lib/dimension-set-score.mjs`
  `scoreDimensionSet` uses `max(1%, 0.05mm)`).
- GD&T match on `(symbol, applied_to, datum_references, tolerance_value)`.
- `datum_deficient:true` FCFs are low-trust — surface, don't auto-pass.

---

## 5. Validation status (why this contract is trustworthy)

The producer half is validated: **qwen3-vl:8b-instruct** reads this exact shape
at **100% value-recovery** (recall = precision = 1, MAE = 0 mm) on CLEAN and
moderately-degraded (`--difficulty hard`) synthetic dimensioned prints via the
closed loop (`scripts/ocr-closed-loop.mjs` + `scripts/lib/dimension-set-score.mjs`).
The model's ceiling on ideal input is 100%; the real-corpus gap is INPUT QUALITY
(non-drawing pages, scan noise), not dimension-reading capability — addressed by
the drawing-vs-paperwork page classifier (this milestone's iter5).

---

## 6. Dual-training feed (print-axis)

Every print↔print compare delta runs in the round-trip should append a labeled
row to `state/shared/cad-fix-training-ledger.jsonl` with `domain:"print"`
(OCR/extraction misread → corrected ground truth: dimension / GD&T /
feature-count / units). xray tails those rows for the reader-retrain set
(`deriveFixesFromCompare()` in `scripts/lib/cad-fix-training-ledger.mjs`).

**Current state (2026-06-01):** the ledger has **0 `domain:"print"` rows** — the
print-axis feed is producer-blocked until delta begins running print↔print
compares against this contract. This spec is precisely what unblocks delta's
back-half to start emitting them.

---

## References

- Producer lib: `scripts/lib/ollama-vision-extract-lib.mjs` (`parseVisionResponse`, `convertToMm`)
- Wired engine: `mcp-server/src/engines/blueprint-vision/BlueprintVisionOCREngine.ts`
- Scorer: `scripts/lib/dimension-set-score.mjs` (`scoreDimensionSet`, `aggregateScores`)
- Closed loop: `scripts/ocr-closed-loop.mjs` · synthetic gen: `scripts/lib/synthetic-print-gen.py`
- Ledger lib: `scripts/lib/cad-fix-training-ledger.mjs` (`deriveFixesFromCompare`)
- Memory: `reference_xray_ocr_closed_loop_2026_06_01`, `reference_xray_ocr_gpu_concurrency_2026_05_31`
- Bus thread: delta→xray `cad-roundtrip-ocr-handoff` + `dual-training-fix-ledger-LIVE`
