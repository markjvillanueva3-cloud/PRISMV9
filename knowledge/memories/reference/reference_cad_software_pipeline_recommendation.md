---
name: cad-software-pipeline-recommendation
description: Recommendation for which CAD software to integrate fully for the print→CNC pipeline (CAD design + CAM + speeds/feeds + collision avoidance + simulation + quoting). Fusion 360 wins on every axis. Use this when user asks about CAD vendor selection, integration prioritization, or print-to-program pipeline architecture.
type: reference
originSessionId: bee98bb8-8225-44b2-a173-84f75e3ee61b
---
# Best CAD software for the full print→CNC PRISM pipeline: **Fusion 360**

## TL;DR

Fusion 360 is the only viable choice for the end-to-end print→CNC pipeline PRISM is building. Recommendation made 2026-05-06 after PHASE17-22 cherry-picks landed all 6 CAD vendor execution bridges + 21 dispatcher actions. Decision drivers below.

## Engine count by CAD/CAM software (post-PHASE22)

| Software | Engines | Live bridge | Notes |
|---|---|---|---|
| **HyperMill** | 63 | No | CAM-only, deepest CAM surface but no native CAD |
| **Mastercam** | 28 | No | CAM-leaning, basic CAD via SolidCAM-style work |
| **Fusion 360** | 18 | **Yes (:18360)** | CAD + CAM in one app; live add-in proven via PHASE2C/14/15/16 |
| Inventor | 15 | No | CAD-strong (Autodesk), CAM via Inventor HSM (separate engines) |
| NX | 10 | No | Enterprise CAD/CAM, expensive licensing |
| CATIA | 7 | No | Aerospace/defense focus, $$$$ |
| HyperCAD | 6 | No | CAD partner of HyperMill |
| SolidWorks | 5 | No | CAD-strong, CAM via SolidCAM/Mastercam-bridge |
| Esprit | 5 | No | Pure CAM, KBM scaffold output (PHASE19) |

## Decision matrix — full pipeline coverage

| Requirement | Fusion 360 | Mastercam | HyperMill | SolidWorks | Inventor |
|---|---|---|---|---|---|
| Native CAD modeling | ✓ | ✗ | ✗ | ✓ | ✓ |
| Native CAM toolpath | ✓ | ✓ | ✓ | ✗ (needs add-on) | ✓ (HSM) |
| Live API bridge in PRISM | ✓ (:18360, ~5 typed methods) | ✗ | ✗ | ✗ | ✗ |
| Autodesk official Claude connector | ✓ (released 2026-04-28) | ✗ | ✗ | ✗ | ✓ |
| Speeds/feeds (via PRISM physics) | ✓ | ✓ | ✓ | n/a | ✓ |
| Collision avoidance | ✓ (Fusion360SafetyHooksEngine) | partial | ✓ (HyperMill specific) | n/a | partial |
| Simulation | ✓ (built-in) | ✓ | ✓ | ✗ | ✓ |
| Probing | ✓ (Fusion360ProbingBridgeEngine) | ✗ | partial | ✗ | ✗ |
| Multi-axis | ✓ (Fusion360MultiAxisEngine) | ✓ | ✓ | ✗ | ✓ |
| Mill-turn | ✓ (Fusion360MillTurnBridgeEngine) | ✓ | partial | ✗ | partial |
| Material bridge | ✓ (Fusion360MaterialBridgeEngine) | ✓ | ✓ | ✗ | ✓ |
| Cost / licensing for JM-Die customers | $700/yr commercial, free hobbyist | $$$$$ | $$$$$ | $$$ | $$$ |

## Why Fusion 360 wins on EVERY axis

1. **Only CAD with live PRISM bridge.** `Fusion360LiveBridgeEngine` runs on port 18360 via the `PRISMBridge` add-in. Round-trip proven in PHASE2C (typed `revolveStepProfile` + `extrudeTapered` + `crossDrillHoles`), PHASE14 (training-loop closure), PHASE15 (100% fidelity on JM Die 2475-037 extrude punch), PHASE16 (generalized into `prism_cad:cad_class_drive_build`).
2. **CAD AND CAM in one platform.** Lets PRISM run the full pipeline (drawing → toolpath → G-code) in a single client without bridging multiple apps. Mastercam/HyperMill require a separate CAD app for drawing.
3. **Autodesk Claude connector exists.** Released 2026-04-28 (see `reference_autodesk_claude_connector.md`). PRISM's `AutodeskFusionMCPProxyEngine.ts` (PHASE18) is the JSON-RPC client. Future state: replace direct `:18360` HTTP bridge with the official MCP connector — fewer install steps for users.
4. **Coverage of every PRISM pipeline stage.** 18 Fusion-prefixed engines span CAD generation, code generation, CAM cycles, controller catalogs, material bridges, mill-turn, multi-axis, probing, safety hooks, AI orchestration, automation, in-host runner. Plus `Fusion360CADFunctionIndexEngine` (PHASE18) gives 4933-parameter sealed-COMPLETE function catalog.
5. **Affordable for JM Die's customer base.** Most JM Die customers are job shops or product companies (ITW, Alcoa, SFS, Holo-Krome). Fusion 360 commercial subscription is ~$700/yr — far below CATIA / NX / Mastercam licensing — meaning customers can install it, get the PRISMBridge add-in, and consume PRISM's output natively.

## Implementation order to deliver "print → CNC program with full pipeline"

1. **Already done (PHASE17-22):** 6-CAD execution bridges + router + Esprit closure + PrintToCADOrchestrator + GD&T/tolerance/dimension/ML wiring. 21 new dispatcher actions on `prism_cad`.
2. **Next phase priorities (Fusion 360-specific):**
   - Wire `Fusion360AIOrchestrationEngine` + `Fusion360SafetyHooksEngine` + `Fusion360ProbingBridgeEngine` + `Fusion360MillTurnBridgeEngine` + `Fusion360MultiAxisEngine` if any are still orphan (run the same audit-then-wire pattern as PHASE21-22).
   - Add a unified `prism_cad:fusion360_full_pipeline` action that chains: `cad_print_to_cad` (PHASE20 diagnostic) → `cad_route_plan_execution` (PHASE18 router with system=fusion360) → live bridge build → CAM toolpath gen via Fusion's CAM workspace API → speeds/feeds via PRISM Kienzle/Taylor → safety check via SafetyHooks → probing routine via ProbingBridge → quoting via existing `quote-to-ship` skill.
3. **Customer rollout pattern:** Install Fusion 360 + PRISMBridge add-in. Customer drops a PDF print on the PRISM web UI. Pipeline runs end-to-end. Customer reviews G-code + speeds/feeds + setup sheet + quote in one place.

## What NOT to do

- Don't build feature parity with Mastercam/HyperMill across the WHOLE PRISM pipeline. Their 28 / 63 engines lean toward CAM-specific operations; if a customer is already on those platforms, route them through the existing 6-CAD orchestrator (PHASE18) using the per-vendor `*CADExecutionBridge.ts` to emit native scripts (VBA/iLogic/C#/macro/KBM). Don't ship a SECOND live bridge for them.
- Don't pursue Onshape, FreeCAD, TopSolid integration further. They have 1-2 engines each and no clear customer demand.
- Don't pursue Inventor live bridge — Autodesk's own Claude connector likely covers Inventor too, eliminating need for a separate PRISM-side live bridge.

## Action items when working on CAD pipeline

- Default to `system: "fusion360"` in any new dispatcher route action.
- New CAD-pipeline engines should target Fusion 360 first; other CAD systems get implementation only when customer demand requires it.
- If a feature exists ONLY in HyperMill (e.g., 5-axis blade roughing, dental blank routing), wire it through `HyperMillCADExecutionBridge` (PHASE18) but document that it requires HyperMill license at the customer site.
