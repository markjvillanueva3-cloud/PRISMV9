# FMERGE-MS0 Canonical Frontend Audit

Updated: 2026-04-10
Owner: Codex
Task: `FMERGE-MS0-U01`

## Decision

Canonical frontend target: `H:/PRISM/mcp-server/web`

Legacy donor frontend: `H:/PRISM/web`

The canonical target stays the `mcp-server/web` app because it is the active routed ERP/business surface and already anchors the live APPW convergence counts and protected-route posture. The legacy `web` app should now be treated as a donor surface for machine-page experiences that still have value, not as a competing deployment target.

## Evidence

- `H:/PRISM/mcp-server/web/src/App.tsx`: 132 route declarations
- `H:/PRISM/web/src/App.tsx`: 111 route declarations
- `H:/PRISM/mcp-server/web/src/pages`: 101 page components
- `H:/PRISM/web/src/pages`: 108 page components

## Canonical Strengths Already Present

- `H:/PRISM/mcp-server/web/src/components/calculator/LatheSketch2D.tsx`
- `H:/PRISM/mcp-server/web/src/components/calculator/FeatureEditorPanel.tsx`
- `H:/PRISM/mcp-server/web/src/components/calculator/WireEdmContourPicker.tsx`
- `H:/PRISM/mcp-server/web/src/components/calculator/WireEdmContour3D.tsx`
- `H:/PRISM/mcp-server/web/src/components/calculator/CalculatorProgramWorkbench.tsx`
- `H:/PRISM/mcp-server/web/src/components/viewer/Viewer3D.tsx`
- `H:/PRISM/mcp-server/web/src/components/viewer/ViewerCanvasWorkspace.tsx`

These prove the canonical app already has shared CAD/programming primitives for:

- lathe feature selection and 2D sketch review
- wire contour selection in 2D and 3D
- manual offsets and feature editing
- a reusable 3D viewer stack

## Donor Surfaces Worth Absorbing

- `H:/PRISM/web/src/pages/WireEdmStudioPage.tsx`
- `H:/PRISM/web/src/components/wedm-studio/ProfileCanvas.tsx`
- `H:/PRISM/web/src/components/wedm-studio/StepReview.tsx`
- `H:/PRISM/web/src/components/wedm-studio/StepWcs.tsx`
- `H:/PRISM/web/src/components/wedm-studio/StepToolpath.tsx`

These donor surfaces provide better step-oriented wire workflow and richer overlay logic, but they should be merged into canonical shared machine-workspace primitives rather than copied forward as a second app.

## Gaps Confirmed By Audit

1. The canonical frontend does not mount a unified CAD window across the dedicated machine pages. Most of the reusable capability is trapped inside `CalculatorPage.tsx` and `CalculatorProgramWorkbench.tsx`.
2. The old wire studio exposes a sketch/draw-from-scratch entry, but it is still unfinished:
   - `H:/PRISM/web/src/components/wedm-studio/StepImport.tsx`
   - Sketch is labeled "coming soon" and is disabled.
3. Feature selection exists today, but explicit feature avoid/fill/modify flows are not exposed as a shared machine-page workspace contract.
4. There is still frontend split-brain:
   - old app owns several machine-oriented pages (`TurningPage.tsx`, `EdmPage.tsx`, `WireEdmStudioPage.tsx`, `MechanicalDesignPage.tsx`)
   - canonical app owns the larger routed ERP/business shell and calculator-era shared CAD primitives

## Merge Rule

Do not make `H:/PRISM/web` the canonical app.

Instead:

1. Keep `H:/PRISM/mcp-server/web` as the only authoritative frontend target.
2. Extract a shared machine CAD workspace inside the canonical app.
3. Promote the existing calculator CAD/editor blocks into dedicated machine pages.
4. Absorb only the donor capabilities from the old wire studio that materially improve the canonical shared workspace.

## Required CAD Workspace Scope

Every supported machine page should converge on one shared CAD workspace contract with:

- upload/import entry points for print/CAD/image
- 2D/3D toggle
- feature selection
- feature modification inputs
- feature avoid/fill controls where the process supports them
- offset input parameters
- draw-from-scratch support for workflows that need manual geometry entry

## Downstream APPW Impact

APPW work must explicitly cover machine-page CAD workspace convergence, not just theme/modal parity.

At minimum:

- `APPW-MS8-U39` must declare which routed machine pages require CAD workspace coverage
- `APPW-MS8-U43` must promote shared CAD workspace surfaces into the machine pages
- `APPW-MS8-U44` must verify those CAD interactions end-to-end

## Immediate Next Task

`FMERGE-MS1-U01`

Reason:

- the canonical target is now chosen
- the frontend split is still real
- donor machine-page/CAD capabilities still need selective merge into `mcp-server/web`
