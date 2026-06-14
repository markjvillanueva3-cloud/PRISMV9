# hyperMILL Python SDK — Reference

**Unit:** CAD-COMPLETE-MS0/U-CADC40 — Map hyperMILL SDK Python Scripts
**Date:** 2026-05-23
**Slot:** delta
**Scope:** Operator-facing reference for the hyperMILL Python automation surface
exposed to PRISM via `HyperCADSAutomationEngine` + `HyperCADCADExecutionBridge`
and the loopback `mcp-cad-automation/` HTTP companion.

## API surface categories

| Category | Python module | PRISM bridge entry point |
|---|---|---|
| Session lifecycle | `OpenMind.Automation.Application` | `cad_hypercads_plan_execution` |
| Geometry import | `OpenMind.Automation.Geometry` | `cad_hypercads_outcome_adapter` |
| Toolpath generation | `OpenMind.Automation.Toolpath` | `cad_hypermill_generate_toolpath` |
| Post-processor | `OpenMind.Automation.Post` | `cad_hypermill_post_run` |
| Live drawing (hyperCAD-S) | `OpenMind.HyperCAD.Sketch + Feature` | `cad_draw_any_part` |
| Outcome publishing | (PRISM-side) | `cad_regen_feedback_publish` |
| Tutorial corpus | (PRISM-side) | `hypercads_tutorial_corpus_ingest` |

## Session lifecycle (canonical pattern)

```python
import OpenMind.Automation.Application as app

session = app.start(project_name="PRISMDraw")
try:
    # 1. Import geometry (or build live via sketch+extrude)
    # 2. Apply toolpath operations
    # 3. Post-process to controller-specific G-code
    # 4. Export
    session.export(format="step", path="out.step")
finally:
    session.close()
```

## Live drawing (hyperCAD-S — used by CADDrawAnyPartOrchestratorEngine)

The 12-action vocabulary that `CADOperationDecoderEngine` proposes:
`sketch_create`, `sketch_close`, `sketch_line`, `sketch_arc`, `sketch_circle`,
`sketch_rectangle`, `sketch_polygon`, `sketch_spline`, `sketch_ellipse`,
`sketch_slot`, `sketch_point`, `sketch_dimension`.

And the 6 solid-feature actions: `feature_extrude`, `feature_revolve`,
`feature_loft`, `feature_hole`, `feature_thread`, `feature_chamfer`.

Each maps to a Python call via the loopback HTTP companion (see
`scripts/hypermill-ac-companion/` per CAD-FUSION-LIVE-MS0-ACBRIDGE).

## Argument decoder (CADArgEncoder + CADOperationDecoder)

Numeric arguments per op kind, in priority order:

| Op kind | Primary args | Secondary args |
|---|---|---|
| `sketch_circle` | `diameter` | `radius` (×2 → diameter via transform) |
| `sketch_rectangle` | `width`, `height` | — |
| `sketch_slot` | `width`, `length` | — |
| `feature_extrude` | `depth` | `distance` (alias) |
| `feature_revolve` | `angle` | — |
| `feature_hole` | `diameter`, `depth` | — |
| `feature_thread` | `diameter`, `pitch` | — |
| `sketch_fillet` | `radius` | — |
| `sketch_chamfer` | `distance` | — |

## Outcome publishing

After each op executes, the bridge publishes a `cross_process_decision` event
(v1.1.0 schema) to the LP01 outcome bus via `HyperCADSOutcomePublisherEngine`:

```json
{
  "schemaVersion": "1.1.0",
  "adapterId": "cad_hypercads_outcome_adapter",
  "lineageId": "<uuid>",
  "outcome": { "op": "feature_extrude", "passed": true, "iter": 5 },
  "regenTest": { "passed": true, "reason": "BRep solidify ok" }
}
```

Downstream learners (LP04 closed-loop) subscribe to this bus.

## Regression validation harness

For batch corpus regression testing against the SDK:
- `scripts/cad-regen-test.mjs` (U-CADC22) — file-readability + size sanity
- `mcp-server/src/engines/CADRoundTripValidationEngine.ts` (U-VALIDATION-ROUNDTRIP) — end-to-end print→CAD→print round-trip

## Schema file companion

The full machine-readable API surface is at `data/state/HYPERMILL_SDK_APIS.json`
(schemaVersion 1). Consumers should import that file rather than parsing
this Markdown.

## Memory

[[reference_u_cadc40_hypermill_sdk_reference_2026_05_23]]
