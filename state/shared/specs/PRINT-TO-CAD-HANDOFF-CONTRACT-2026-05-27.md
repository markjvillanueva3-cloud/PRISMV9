# Print-to-CAD handoff contract — kilo → delta

**Owner:** kilo (print-to-program specialist)
**Consumer:** delta (CAD generation slot)
**Created:** 2026-05-27 in response to operator failures: (a) delta silently converting inches → mm, (b) delta producing a "turbine that looks nothing like a turbine."

## What this contract enforces

Delta MUST NOT generate a CAD file from a print without first reading the corresponding kilo-produced handoff JSON. The handoff carries hard fields delta MUST honor + hard fields delta MUST verify after generating output.

## Handoff location

```
H:/prism-slot-kilo/state/shared/print-to-cad-handoff/<partId>__handoff.json
```

Companion full PMI record at the same path with `__pmi.json` suffix.

## Mandatory fields delta MUST honor

| Field | Type | Meaning | Failure mode if ignored |
|---|---|---|---|
| `kiloDecision.overall` | `'pass'` \| `'reject'` | If `reject`, delta MUST NOT generate any CAD; surface blocking reasons to operator | Silent generation of unsafe parts |
| `kiloDecision.blockingReasons` | string[] | If non-empty, every entry must be resolved before delta proceeds | Operator never sees the gate trip |
| `unitDetection.unit` | `'in'` \| `'mm'` \| `'mixed'` \| `'unknown'` | Source-of-truth unit | Silent inch↔mm conversion (operator's 2026-05-27 failure) |
| `unitGate.decision` | `'pass'` \| `'reject'` \| `'operator-confirm'` | If `reject`, delta CANNOT proceed; if `operator-confirm`, delta must escalate before drawing | Same as above |
| `partClassHint.partClass` | string | The CAD-class template delta should hydrate (`turbine-impeller`, `lathe-shaft`, `sheet-metal-stamping`, etc.) | Wrong feature template → turbine drawn as a flat disc (operator's 2026-05-27 failure) |
| `partClassHint.expectedCadFeatures` | string[] | Feature types delta's output MUST contain (e.g. `['hub_revolve', 'blade_loft', 'polar_pattern']`) | Missing essential geometry |
| `expectedFeatureGraph.unitMustMatch` | string | The unit delta's emitted STEP file MUST declare | Wrong unit declaration in STEP/IGES header |
| `expectedFeatureGraph.polarPatternCount` | number? | If present, delta MUST instantiate exactly N polar-patterned features | Wrong blade count |
| `expectedFeatureGraph.criticalTolerancesMustPropagate` | array | Every entry MUST appear in delta's emitted PMI on the corresponding feature | Tolerance stack dropped silently (kilo soul refuse) |
| `expectedFeatureGraph.minDimensionCount` | number | Delta's output PMI must carry ≥ this many dimensions | Dimensions silently dropped |

## Verification gate (delta's responsibility post-generation)

After delta emits a CAD file, BEFORE declaring success, delta MUST:

1. Parse own output and count features by type → compare against `expectedFeatureGraph.requiredFeatureTypes`. Missing types → REJECT own output.
2. Verify unit declaration in output header matches `expectedFeatureGraph.unitMustMatch`. Mismatch → REJECT.
3. Confirm dimension count ≥ `expectedFeatureGraph.minDimensionCount`. Otherwise REJECT.
4. If `expectedFeatureGraph.polarPatternCount` present, verify exact count in emitted geometry. Mismatch → REJECT.
5. Walk `expectedFeatureGraph.criticalTolerancesMustPropagate` — each must appear in emitted PMI on the right feature. Drop → REJECT.

Failure of ANY verification step means delta MUST surface "CAD generation rejected by kilo verification gate" with the specific mismatch, NOT silently ship an inaccurate CAD.

## Producing the handoff (kilo's side)

```bash
H:/Tools/python/python.exe \
  H:/prism-slot-kilo/scripts/print-to-cad-handoff.py \
  "<path-to-blueprint.pdf>" \
  --out-dir H:/prism-slot-kilo/state/shared/print-to-cad-handoff
```

Or in batch:

```bash
H:/Tools/python/python.exe \
  H:/prism-slot-kilo/scripts/print-to-cad-handoff.py \
  --batch "H:/PRISM/JM DIE/_PART LIBRARY/FONTANA FASTENERS" \
  --limit 50
```

## Schema versioning

`schemaVersion: '1.0.0'` — bump on any change to mandatory fields. Delta must check `schemaVersion` and refuse handoffs with unrecognized major versions.

## Operator escape hatch

A handoff with `kiloDecision.overall: 'reject'` is NEVER auto-overridable by delta. Operator must either:
1. Annotate the source PDF with explicit unit + part class declarations and re-run kilo, OR
2. Manually edit the handoff JSON to flip `overall: 'pass'` and accept responsibility (this MUST log to `state/shared/print-to-cad-handoff/overrides.jsonl`).

## Related

- Kilo soul refuse_list: `silent-fallback-on-ambiguous-callouts`, `dropping-tolerance-stack-on-translate`, `emitting-program-without-pmi-validation`
- PMI extractor: `scripts/blueprint-pmi-extract.py` (12 self-tests pass)
- Handoff orchestrator: `scripts/print-to-cad-handoff.py` (9 self-tests pass — 3 variability + 4 failure-mode + 2 adversarial)
- Existing TS engines (NOT YET WIRED into this Python path; future work):
  - `BlueprintOCREngine.ts` — canonical TS dimension extractor (the regex patterns this script ports)
  - `BlueprintVisionOCREngine.ts` — vision-based curve digitization (needed for turbine blade profiles)
  - `CADClassFeatureLibraryEngine.ts` — `templateFor(partClass)` returns the canonical feature graph
  - `PrintToCADOrchestratorEngine.ts` — 5-stage orchestrator (geometry → features → class → plan → route)
- Operator memory: [[reference_cam_corpus_locations]] — full asset map
