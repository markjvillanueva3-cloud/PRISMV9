# CAD-to-CAM handoff contract — delta → kilo

**Owner:** delta (CAD generation specialist)
**Consumer:** kilo (print-to-program / CAM specialist)
**Created:** 2026-05-28 in response to operator follow-up — *"do another deep assessment … apply all of the same things but specifically for cam since its your domain"* — mirroring delta's own kilo→delta `PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md` pattern.

## What this contract enforces

Kilo MUST NOT generate a CAM program (machine pick + stock + workholding + op order + tool/holder + post-emit) without first reading the corresponding delta-produced handoff JSON. The handoff carries:

1. **Hard fields kilo MUST honor** (GD&T, unit, polar-pattern count, material, critical tolerances, expected feature graph, surface finishes).
2. **Hard fields kilo MUST verify** after generating the CAM program (toolpath respects every tolerance, no interrupted cuts beyond shop-floor cap, every critical-tolerance feature has an inspection probe, post emits in the unit the CAD declared).

The seam closes the **GD&T propagation Stage-2 → Stage-3** gap (delta's V2 §10 critique) and the **CAD-feature-modify advisor** loop (operator-named in the CAM ask).

## Handoff location

```
H:/prism/state/shared/cad-to-cam-handoff/<partId>__cad-to-cam.json
```

Companion full-PMI record at the same path with `__pmi.json` suffix. Per-slot worktree variants (`H:/prism-slot-delta/`, `H:/prism-slot-kilo/`) merge to the canonical `H:/prism/` shared path at golf merge time.

## Schema version

`schemaVersion: "1.0.0"` — bump on any change to mandatory fields. Kilo MUST check `schemaVersion` and refuse handoffs with unrecognized major versions.

## Mandatory fields kilo MUST honor

| Field | Type | Meaning | Failure mode if ignored |
|---|---|---|---|
| `deltaDecision.overall` | `"pass" \| "reject"` | If `reject`, kilo MUST NOT generate any CAM; surface blocking reasons to operator. | Silent generation of unmachineable parts |
| `deltaDecision.blockingReasons` | `string[]` | If non-empty, every entry must be resolved before kilo proceeds. | Operator never sees the gate trip |
| `partIdentity.partNumber` | `string` | Source-of-truth part identifier. | CAM program named wrong — fleet outcome ledger mis-attributed |
| `partIdentity.revision` | `string` | Drawing revision; CAM must include in setup-sheet header. | Old-revision program runs against new-revision dimensions |
| `unitDeclaration.unit` | `"mm" \| "in"` | Source-of-truth unit declared in delta's emitted STEP/IGES/F3D header. | Silent inch↔mm conversion (delta's documented 2026-05-27 failure mode) |
| `material.iso_group` | `"P" \| "M" \| "K" \| "N" \| "S" \| "H"` | ISO material group for Kienzle + Taylor lookup. | Wrong physics constants → wrong S/F → tool break / scrap |
| `material.alloy_designation` | `string` | E.g., "AISI 4140 HRC 38", "6061-T6", "Ti-6Al-4V Gr5". | Generic ISO-P treatment of heat-treated tool steel — Ti hard-state burned tools |
| `expectedFeatureGraph.features` | `Array<{ feature_id, type, gdt[], affected_regions, dimensions, tolerance_class, surface_finish_Ra_um }>` | Every machinable feature delta's output declares. | CAM misses a feature → undercut / overcut |
| `expectedFeatureGraph.polarPatternCount` | `number?` | If present, kilo MUST plan toolpaths for exactly N polar-patterned instances. | Wrong blade count / hole-pattern count |
| `expectedFeatureGraph.criticalTolerancesMustPropagate` | `Array<{feature_id, tolerance_mm, gdt_symbol, datum_refs[]}>` | Every entry MUST appear in kilo's emitted G-code as a per-feature tolerance comment / probe-cycle insertion. | Tolerance stack dropped → scrap |
| `expectedFeatureGraph.minFeatureCount` | `number` | Kilo's output operation tree must contain ≥ this many operations. | Operations silently dropped |
| `expectedFeatureGraph.gd_t_propagation_marker` | `boolean` | If `true`, delta has explicitly propagated GD&T via the Stage-2→3 side channel; kilo can read full PMI from `__pmi.json` companion. | Closes delta V2 §10 GD&T-propagation gap |
| `cadAdjustmentSuggestions` | `Array<{ kind: "suppress_feature" \| "add_feature" \| "reorder_constraint", feature_ref, rationale }>` | Operator-named (in the CAM ask): suggestions delta makes to CAM-favorable CAD adjustments (suppress drilled holes until after face, add chamfers to ease tool entry, reorder feature constraints to avoid interrupted cuts). | Lost optimization opportunities |
| `geometryArtifacts.step_path` | `string` | Path to delta's emitted STEP file (kilo's geometry input). | Wrong geometry parsed |
| `geometryArtifacts.f3d_path?` | `string?` | If delta worked in Fusion 360, the source .f3d path — kilo can read embedded CAM operation tree directly via `scripts/extract-f3d-feature-trees.py`. | Fusion CAM hints unused |
| `geometryArtifacts.feature_graph_json` | `string` | Path to the structured feature graph (delta's CADClassFeatureLibrary output). | Re-derivation cost |
| `partClassHint.partClass` | `string` | The CAD-class template (`turbine-impeller`, `lathe-shaft`, `sheet-metal-stamping`, `electrode-graphite`, `complex-mold-cavity`, etc.). | Wrong machining strategy applied |
| `partClassHint.recommendedFamily` | `string` | The CAM family (mill 3-axis / mill 4-axis / mill 5-axis / lathe / mill-turn / wire-EDM / sinker-EDM). | Wrong CAM platform selection |
| `operatorOverride.allowed` | `boolean` | If `true`, kilo may apply CAM-side overrides (e.g., add chamfer for tool entry, suppress redundant feature). | Default-deny prevents silent CAD modifications |

## Verification gate (kilo's responsibility post-CAM-generation)

After kilo emits a CAM program (toolpath + post + setup sheet) but BEFORE declaring success, kilo MUST:

1. Parse own output → count operations by feature → compare against `expectedFeatureGraph.features`. Missing features → REJECT own output.
2. Verify emitted G-code declares the unit from `unitDeclaration.unit` (G20/G21). Mismatch → REJECT.
3. Confirm operation count ≥ `expectedFeatureGraph.minFeatureCount`. Otherwise REJECT.
4. If `expectedFeatureGraph.polarPatternCount` present, verify exact toolpath-count per pattern. Mismatch → REJECT.
5. Walk `expectedFeatureGraph.criticalTolerancesMustPropagate` — each entry MUST appear in emitted G-code as a `( CRIT TOL: <feature_id> <tolerance_mm> <gdt_symbol> )` comment AND an in-process probe-cycle insertion. Drop → REJECT.
6. Run the InterruptedCutAvoidanceEngine (shipped 2026-05-28) on the operation tree — max severity must be ≤ shop-floor cap (default 3 unless `operatorOverride.allowed === true`). Else REJECT.
7. Run AirCutDetectionEngine on the emitted G-code — air-cut percentage must be ≤ 15% (delta's CAD audit caveat F6 inspection-mode analog). Else REJECT.
8. Re-emit `outcome_ledger_entry` to `outcomes/outcomes.jsonl` for closed-loop feedback: `{partId, cycleTime, surfaceFinishRa, scrapRate, toolWearObserved, criticalTolerancesAchieved}`.

Failure of ANY verification step means kilo MUST surface `"CAM generation rejected by delta-CAD verification gate"` with the specific mismatch, NOT silently ship a CAM program that violates the contract.

## Producing the handoff (delta's side)

```bash
H:/Tools/python/python.exe `
  H:/prism-slot-delta/scripts/cad-to-cam-handoff.py `
  "<path-to-step-or-f3d>" `
  --out-dir H:/prism/state/shared/cad-to-cam-handoff/
```

For Fusion-native CAD (`.f3d`), delta can additionally invoke `extract-f3d-feature-trees.py` to lift the embedded feature tree into the handoff's `expectedFeatureGraph`:

```bash
H:/Tools/python/python.exe `
  H:/prism-slot-kilo/scripts/extract-f3d-feature-trees.py `
  "<part.f3d>" `
  --out-dir H:/prism/state/shared/cad-rev-eng/
```

## Operator escape hatch

A handoff with `deltaDecision.overall: "reject"` is NEVER auto-overridable by kilo. Operator must either:

1. Annotate the source CAD with explicit unit + GD&T + part-class declarations and re-run delta, OR
2. Manually edit the handoff JSON to flip `overall: "pass"` and accept responsibility (this MUST log to `state/shared/cad-to-cam-handoff/overrides.jsonl`).

## Schema example

```json
{
  "schemaVersion": "1.0.0",
  "partIdentity": { "partNumber": "PP-1005337", "revision": "B", "fixtureSetCount": 2 },
  "unitDeclaration": { "unit": "in", "tolerance_default_mm": 0.025 },
  "material": { "iso_group": "P", "alloy_designation": "AISI 4140 HRC 38" },
  "deltaDecision": { "overall": "pass", "blockingReasons": [] },
  "expectedFeatureGraph": {
    "features": [
      { "feature_id": "F01", "type": "pocket_closed", "tolerance_class": "IT8",
        "surface_finish_Ra_um": 1.6, "affected_regions": [{"x_min": -10, "x_max": 10, "y_min": -10, "y_max": 10, "z_top": 0, "z_bottom": -8}] },
      { "feature_id": "F02", "type": "hole_through", "tolerance_class": "IT7",
        "dimensions": { "diameter_mm": 6.0, "depth_mm": 25 } }
    ],
    "polarPatternCount": 6,
    "criticalTolerancesMustPropagate": [
      { "feature_id": "F02", "tolerance_mm": 0.013, "gdt_symbol": "position", "datum_refs": ["A", "B|", "C"] }
    ],
    "minFeatureCount": 8,
    "gd_t_propagation_marker": true
  },
  "cadAdjustmentSuggestions": [
    { "kind": "suppress_feature", "feature_ref": "F02", "rationale": "Drill F02 holes AFTER face F01 to avoid interrupted top — kilo InterruptedCutAvoidance F1 pattern." }
  ],
  "geometryArtifacts": {
    "step_path": "H:/prism/state/shared/cad-to-cam-handoff/PP-1005337__rev-B.step",
    "f3d_path": "H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/JM/PP-1005337 OP1 FUSION/PP-1005337 OP1 v1.f3d",
    "feature_graph_json": "H:/prism/state/shared/cad-to-cam-handoff/PP-1005337__feature-graph.json"
  },
  "partClassHint": { "partClass": "complex-fixture-component", "recommendedFamily": "mill 3-axis" },
  "operatorOverride": { "allowed": false }
}
```

## Related

- Sibling: `state/shared/specs/PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md` (kilo → delta, the upstream handoff)
- `state/shared/specs/CAM-PIPELINE-AUDIT-2026-05-28.md` — the CAM audit this contract implements §6 of
- `state/shared/specs/CAM-TEST-PLAYBOOK-2026-05-28.md` — Tier 4 orchestrator uses this contract as its input format
- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` — delta's CAD audit (§10 V2 critique of GD&T propagation; this contract closes that gap)
- `mcp-server/src/engines/InterruptedCutAvoidanceEngine.ts` — referenced by verification gate step 6
- `mcp-server/src/engines/AirCutDetectionEngine.ts` — referenced by verification gate step 7
- `scripts/extract-f3d-feature-trees.py` — referenced by `geometryArtifacts.f3d_path` consumers

## Kilo soul refuse_list (post-CAM-generation must reject)

- `silent-fallback-on-ambiguous-callouts` — if a feature has `tolerance_class` unset, REJECT, don't pick a default.
- `dropping-tolerance-stack-on-translate` — every `criticalTolerancesMustPropagate` entry must reach the G-code.
- `emitting-program-without-pmi-validation` — `gd_t_propagation_marker: true` with no `__pmi.json` companion is a hard error.
- `applying-unauthorized-cad-modifications` — `cadAdjustmentSuggestions` are suggestions for delta to apply on re-run; kilo NEVER edits the source CAD.
- `bypass-interrupted-cut-cap` — operator's `operatorOverride.allowed === false` (the default) means InterruptedCutAvoidance severity > 3 is a HARD REJECT.

## Closed-loop fold-in

Every CAM run that passes the verification gate writes an `outcome_ledger_entry` to `outcomes/outcomes.jsonl`. The `SelfLearningLoopOrchestratorEngine` 7-state FSM picks it up at the `observe` transition, computes `corpus_delta`, and updates the bandit posteriors. Net effect: each completed CAM job sharpens the priors for the next job. **The handoff contract is what makes this closed-loop work cross-slot** — delta+kilo agree on what passes/fails, the ledger records the outcome, and the priors converge.

---

**End of contract.** Bump `schemaVersion` on any mandatory-field change. Kilo refuses handoffs with unrecognized major versions.
