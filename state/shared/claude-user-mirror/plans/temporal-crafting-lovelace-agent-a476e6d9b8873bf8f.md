# Wire EDM Studio — Implementation Plan

## Executive Summary

Transform the existing `EdmPage.tsx` (simple parameter form) into a full **Wire EDM Studio** — a multi-step wizard that takes a user from file input through drawing interpretation, feasibility assessment, toolpath configuration, optimization, and G-code generation. The wizard leverages all 35 existing WEDM-P2P pipeline backend actions and integrates the existing Viewer3D, ToolpathLayer, StockMesh, and GcodeEditor components.

---

## 1. Architecture Overview

### Wizard Steps (7 Steps)

| Step | Name | Backend Actions Used | Viewer Shows |
|------|------|---------------------|-------------|
| 1 | **File Input** | `file_upload` (parts route) | Imported profile wireframe |
| 2 | **Drawing Interpretation** | `wedm_interpret_drawing`, `wedm_classify_features`, `wedm_calculate_passes` | Classified features (color-coded) |
| 3 | **Feasibility & Selection** | `wedm_assess_feasibility`, `wedm_check_conductivity`, `wedm_assess_material`, `wedm_select_machine`, `wedm_select_wire`, `wedm_full_selection` | Stock with feature overlay |
| 4 | **Start Holes & Setup** | `wedm_plan_start_holes`, `wedm_plan_setup` | Start holes as spheres + workpiece |
| 5 | **Toolpath & Strategy** | `wedm_generate_toolpath`, `wedm_plan_tabs`, `wedm_optimize_sequence` | Animated toolpath + tabs |
| 6 | **Optimization** | `wedm_plan_passes`, `wedm_full_multipass`, `wedm_optimize_params`, `wedm_plan_flushing`, `wedm_predict_wire_break`, `wedm_calculate_corners`, `wedm_solve_taper` | Multi-pass overlay (color per pass) |
| 7 | **Program Output** | `wedm_generate_gcode`, `wedm_estimate_cost`, `wedm_generate_setup_sheet` | Toolpath + G-code editor side-by-side |

### Data Flow

```
FileInput → base64 upload → backend interprets →
  DrawingInterpretation (features[]) →
    Feasibility (go/no-go + material/machine/wire selection) →
      StartHoles (hole plan + setup) →
        Toolpath (profiles + tabs + sequence) →
          Optimization (multi-pass + cutting params + flushing + corners) →
            GCode (controller-specific program + cost + setup sheet)
```

### State Management

A single `WedmStudioContext` holds the cumulative pipeline state. Each step appends its results. The context uses `useReducer` for predictable state transitions. The reducer actions map 1:1 with wizard transitions.

---

## 2. New Files to Create

### Frontend — Types

**`H:\prism\web\src\types\wedmStudio.ts`** — All type definitions for the wizard

```
Purpose: Define the complete state shape, step results, input method types,
and pipeline data structures used throughout the Wire EDM Studio.

Key types:
- WedmStudioStep (union: 'input' | 'interpretation' | 'feasibility' | 'setup' | 'toolpath' | 'optimization' | 'output')
- InputMethod ('camera' | 'pdf' | 'sketch' | 'dxf' | 'cad')
- FileUploadPayload { filename, content_base64, file_type, input_method }
- InterpretedFeature { name, type, dimensions_mm, tolerance_mm, surface_finish_ra_um, ... }
- FeasibilityResult { overall_feasible, conductivity_ok, geometry_feasible, ... }
- MaterialSelection { material_assessment, machine_recommendation, wire_recommendation }
- StartHolePlan { holes: StartHole[], setup: SetupPlan }
- ToolpathResult { profiles: ProfileDef[], tabs: TabPlan[], sequence: SequenceOrder }
- MultiPassPlan { passes: PassDefinition[], cutting_params, flushing_strategy, corner_strategies }
- GcodeOutput { controller, gcode_text, cost_estimate, setup_sheet }
- WedmStudioState — the full accumulated state across all steps
- WedmStudioAction — discriminated union for the reducer
- WCSOrigin { x: number, y: number, z: number } — for WCS/origin point setting
```

### Frontend — Context

**`H:\prism\web\src\contexts\WedmStudioContext.tsx`** — State management

```
Purpose: React context + useReducer for the entire wizard pipeline state.
Pattern: Follows PpgContext.tsx but uses useReducer instead of useState.

Exports:
- WedmStudioProvider (wraps the page)
- useWedmStudio() hook
- wedmStudioReducer (for testing)

State shape:
  {
    currentStep: WedmStudioStep,
    inputMethod: InputMethod | null,
    uploadedFile: FileUploadPayload | null,
    interpretation: InterpretedDrawingResult | null,
    feasibility: FeasibilityResult | null,
    materialSelection: MaterialSelection | null,
    startHolePlan: StartHolePlan | null,
    toolpathResult: ToolpathResult | null,
    wcsOrigin: WCSOrigin,
    multiPassPlan: MultiPassPlan | null,
    gcodeOutput: GcodeOutput | null,
    selectedController: ControllerType,
    errors: Record<WedmStudioStep, string | null>,
    loading: Record<WedmStudioStep, boolean>,
  }

Reducer actions:
  SET_STEP, SET_INPUT_METHOD, SET_UPLOADED_FILE,
  SET_INTERPRETATION, SET_FEASIBILITY, SET_MATERIAL_SELECTION,
  SET_START_HOLE_PLAN, SET_TOOLPATH, SET_WCS_ORIGIN,
  SET_MULTI_PASS, SET_GCODE_OUTPUT, SET_CONTROLLER,
  SET_ERROR, SET_LOADING, RESET
```

### Frontend — API Layer

**`H:\prism\web\src\api\wedmStudio.ts`** — API functions for all WEDM pipeline endpoints

```
Purpose: Typed API functions that call the backend WEDM pipeline routes.
Pattern: Follows api/edm.ts pattern with typed post<T> helper.

BASE_URL: "/api/v1/edm"
TIMEOUT_MS: 60_000 (pipeline operations can take longer)

Functions:
- uploadFile(payload: FileUploadPayload) → POST /api/v1/upload
- interpretDrawing(params) → POST /api/v1/edm/pipeline { action: "wedm_interpret_drawing", ... }
- classifyFeatures(params) → POST /api/v1/edm/pipeline { action: "wedm_classify_features", ... }
- assessFeasibility(params) → POST /api/v1/edm/pipeline { action: "wedm_assess_feasibility", ... }
- fullSelection(params) → POST /api/v1/edm/pipeline { action: "wedm_full_selection", ... }
- planStartHoles(params) → POST /api/v1/edm/pipeline { action: "wedm_plan_start_holes", ... }
- planSetup(params) → POST /api/v1/edm/pipeline { action: "wedm_plan_setup", ... }
- generateToolpath(params) → POST /api/v1/edm/pipeline { action: "wedm_generate_toolpath", ... }
- planTabs(params) → POST /api/v1/edm/pipeline { action: "wedm_plan_tabs", ... }
- optimizeSequence(params) → POST /api/v1/edm/pipeline { action: "wedm_optimize_sequence", ... }
- fullMultipass(params) → POST /api/v1/edm/pipeline { action: "wedm_full_multipass", ... }
- optimizeParams(params) → POST /api/v1/edm/pipeline { action: "wedm_optimize_params", ... }
- planFlushing(params) → POST /api/v1/edm/pipeline { action: "wedm_plan_flushing", ... }
- calculateCorners(params) → POST /api/v1/edm/pipeline { action: "wedm_calculate_corners", ... }
- solveTaper(params) → POST /api/v1/edm/pipeline { action: "wedm_solve_taper", ... }
- generateGcode(params) → POST /api/v1/edm/pipeline { action: "wedm_generate_gcode", ... }
- estimateCost(params) → POST /api/v1/edm/pipeline { action: "wedm_estimate_cost", ... }
- generateSetupSheet(params) → POST /api/v1/edm/pipeline { action: "wedm_generate_setup_sheet", ... }
- runFullPipeline(params) → POST /api/v1/edm/pipeline { action: "wedm_run_pipeline", ... }
```

### Frontend — Hooks

**`H:\prism\web\src\hooks\useWedmStudio.ts`** — Orchestration hooks

```
Purpose: Hooks that bridge the context/reducer with the API layer.
Each hook wraps an API call with loading/error state management.
Pattern: Follows useEdm.ts useApiCall pattern.

Exports:
- useWedmInterpretation() — calls interpretDrawing + classifyFeatures, dispatches SET_INTERPRETATION
- useWedmFeasibility() — calls assessFeasibility + fullSelection, dispatches SET_FEASIBILITY + SET_MATERIAL_SELECTION
- useWedmStartHoles() — calls planStartHoles + planSetup, dispatches SET_START_HOLE_PLAN
- useWedmToolpath() — calls generateToolpath + planTabs + optimizeSequence, dispatches SET_TOOLPATH
- useWedmOptimization() — calls fullMultipass + optimizeParams + planFlushing + calculateCorners, dispatches SET_MULTI_PASS
- useWedmGcode() — calls generateGcode + estimateCost + generateSetupSheet, dispatches SET_GCODE_OUTPUT
- useWedmFullPipeline() — calls runFullPipeline for "fast track" mode
```

### Frontend — Page

**`H:\prism\web\src\pages\WireEdmStudioPage.tsx`** — Main page component

```
Purpose: Top-level page that wraps content in WedmStudioProvider and renders the wizard layout.
Pattern: Follows PpgPage.tsx pattern (Provider wrapper + inner component).

Layout:
- Left panel (configurable width): Wizard step sidebar + step-specific controls
- Center: 3D Viewer (always visible, content updates per step)
- Right panel (collapsible): Step details, results, and G-code editor (step 7)
- Bottom bar: Step navigation (Previous / Next / Generate)

Responsive:
- Desktop (xl+): 3-column layout [280px sidebar | flex-1 viewer | 360px details]
- Tablet (md-xl): 2-column [280px sidebar | flex-1 viewer], details in overlay/modal
- Mobile (<md): Stacked with tab navigation between viewer/controls/details
```

### Frontend — Wizard Step Components

All under `H:\prism\web\src\components\wedm-studio\`:

**`WizardSidebar.tsx`** — Step indicator + navigation
```
Vertical stepper showing all 7 steps with status (pending/active/completed/error).
Click to navigate to completed steps. Step names and icons.
Shows overall pipeline progress percentage.
```

**`StepFileInput.tsx`** — Step 1: File input methods
```
5 input method cards:
1. Camera capture — uses navigator.mediaDevices.getUserMedia for webcam,
   captures frame to canvas, converts to base64
2. PDF/Image upload — standard file input with drag-drop zone,
   accepts .pdf, .png, .jpg, .jpeg, .tiff
3. Sketch upload — same file input but with visual "sketch" framing
4. DXF upload — file input accepting .dxf files
5. CAD upload — file input accepting .step, .stp, .iges, .igs

All converge on FileUploadPayload { filename, content_base64, file_type, input_method }.
After upload, shows thumbnail preview and triggers interpretation.
```

**`StepInterpretation.tsx`** — Step 2: Drawing interpretation results
```
Displays interpreted features as a table/list:
- Feature name, type, dimensions, tolerances, surface finish requirements
- Classification badges (profile, hole, slot, cavity, etc.)
- Calculated pass count recommendations
- User can edit/override feature properties
- "Interpret" button triggers wedm_interpret_drawing + wedm_classify_features

Viewer integration: Features displayed as color-coded 2D profiles extruded to thickness.
```

**`StepFeasibility.tsx`** — Step 3: Feasibility + material/machine/wire selection
```
Shows feasibility assessment:
- Go/No-Go indicator with reasons
- Conductivity check result
- Estimated time
- Material assessment with recommendations
- Machine selection (with override dropdown)
- Wire selection (with override dropdown)
- Part dimensions summary

Viewer integration: Stock block rendered as transparent mesh, features overlaid.
```

**`StepStartHoles.tsx`** — Step 4: Start hole planning + WCS setup
```
Two sub-sections:
1. Start Holes: Table of planned holes (X, Y, diameter).
   User can add/remove/reposition holes.
   
2. WCS/Origin: Interactive origin point placement.
   Shows coordinate system with colored axes.
   User sets X0/Y0/Z0 by clicking on part or entering coordinates.
   Toggle between absolute and incremental display.

Viewer integration: Start holes shown as cylinders/spheres at planned locations.
Origin shown as thick RGB axes at WCS position.
```

**`StepToolpath.tsx`** — Step 5: Toolpath generation + strategy selection
```
Controls:
- Approach/departure angle and distance
- Corner strategy selector (radius, tab, slow-down)
- Tab placement configuration (auto/manual, width, spacing)
- Cutting sequence order (drag-to-reorder profiles)
- Wire offset direction (left/right)

Results panel:
- Total wire path length
- Estimated cutting time
- Number of threading operations

Viewer integration: Full toolpath rendered via ToolpathLayer component.
Rapid moves dashed yellow, feed moves colored by profile.
Animated playback available via ViewerToolbar.
```

**`StepOptimization.tsx`** — Step 6: Multi-pass + cutting parameters
```
Multi-pass strategy panel:
- Pass count and types (rough, semi-finish, finish, super-finish)
- Per-pass offset values (editable)
- Target Ra cascade visualization
- Cutting parameters per pass (pulse on/off, voltage, speed)
- Flushing strategy (submerged/spray/combined)
- Wire break risk indicator per pass
- Corner compensation settings

Viewer integration: Toolpath colored by pass number.
Toggle individual passes visible/hidden.
```

**`StepOutput.tsx`** — Step 7: G-code generation + output
```
Layout: Split view — viewer on left, G-code editor on right.

Controls:
- Controller selector (Fanuc, Sodick, Makino, Mitsubishi, AgieCharmilles, Accutex)
- "Generate Program" button
- Cost summary card (machine time, wire cost, total)
- Setup sheet preview/download

G-code panel uses existing GcodeEditor component (Monaco).
Download button exports .nc file.
Setup sheet exports as PDF.

Viewer integration: Final toolpath with all passes, synced with G-code line highlighting.
```

**`WedmViewerPanel.tsx`** — Wrapper around Viewer3D with WEDM-specific content
```
Wraps Viewer3D + ViewerToolbar and conditionally renders:
- ProfileMesh (2D profile extruded to workpiece thickness)
- StockMesh (transparent workpiece block)
- StartHoleMarkers (sphere geometries at hole positions)
- WCSAxes (colored axis lines at WCS origin)
- ToolpathLayer (when toolpath data available)
- PassOverlay (multi-pass with per-pass visibility)
- TabMarkers (tab positions as highlighted segments)

Props come from WedmStudioContext — component reads context and decides what to show.
```

**`ProfileMesh.tsx`** — WEDM-specific 3D component for part profiles
```
Takes 2D contour points + workpiece thickness, creates extruded Three.js geometry.
Renders as transparent blue mesh for part profile visualization.
Used in steps 2-7 as the base part geometry.
```

**`StartHoleMarkers.tsx`** — 3D markers for start holes
```
Renders small cylinders or spheres at each planned start hole location.
Color-coded: green = optimal, yellow = acceptable, red = risk.
Labels with hole ID.
```

**`WCSGizmo.tsx`** — Interactive WCS origin placement
```
Three.js component showing X/Y/Z axes at the WCS origin.
Thick colored lines (Red=X, Green=Y, Blue=Z) with arrow tips.
Origin sphere at intersection. Draggable in the 3D view.
Coordinate readout updates as dragged.
Snaps to grid when shift held.
```

### Frontend — Shared/Utility

**`H:\prism\web\src\utils\wedmGeometry.ts`** — Geometry conversion utilities
```
Functions:
- contourPointsToExtrudedGeometry(points: {x,y}[], thickness: number): MeshData
  Converts 2D contour points to an extruded 3D mesh.
- featuresToToolpathLineData(profiles: ProfileDef[]): ToolpathLineData
  Converts pipeline profile definitions to ToolpathLineData for ToolpathLayer.
- startHolesToSceneNodes(holes: StartHole[]): SceneNode[]
  Converts hole positions to renderable scene nodes.
- buildStockMeshData(dims: {x,y,z}): MeshData
  Creates a simple box mesh for the stock workpiece.
```

### Backend — Route Additions

**Modify `H:\prism\mcp-server\src\routes\edm.ts`** — Add per-action pipeline routes

```
Add granular routes so the frontend can call individual pipeline actions
without the generic /pipeline catch-all. This gives better error handling
and allows the frontend to sequence calls explicitly.

New routes:
  POST /interpret-drawing   → invoke("wedm_interpret_drawing", req.body)
  POST /classify-features   → invoke("wedm_classify_features", req.body)
  POST /assess-feasibility  → invoke("wedm_assess_feasibility", req.body)
  POST /check-conductivity  → invoke("wedm_check_conductivity", req.body)
  POST /estimate-time       → invoke("wedm_estimate_time", req.body)
  POST /full-selection      → invoke("wedm_full_selection", req.body)
  POST /plan-start-holes    → invoke("wedm_plan_start_holes", req.body)
  POST /plan-setup          → invoke("wedm_plan_setup", req.body)
  POST /generate-toolpath   → invoke("wedm_generate_toolpath", req.body)
  POST /plan-tabs           → invoke("wedm_plan_tabs", req.body)
  POST /optimize-sequence   → invoke("wedm_optimize_sequence", req.body)
  POST /full-multipass      → invoke("wedm_full_multipass", req.body)
  POST /optimize-params     → invoke("wedm_optimize_params", req.body)
  POST /plan-flushing       → invoke("wedm_plan_flushing", req.body)
  POST /calculate-corners   → invoke("wedm_calculate_corners", req.body)
  POST /solve-taper         → invoke("wedm_solve_taper", req.body)
  POST /generate-gcode      → invoke("wedm_generate_gcode", req.body)
  POST /estimate-cost       → invoke("wedm_estimate_cost", req.body)
  POST /generate-setup-sheet → invoke("wedm_generate_setup_sheet", req.body)
```

---

## 3. Existing Files to Modify

### `H:\prism\web\src\App.tsx`
Add route for Wire EDM Studio:
```tsx
const WireEdmStudioPage = lazy(() => import("./pages/WireEdmStudioPage"));

// Inside <Route element={<AppShell />}>:
<Route
  path="/wire-edm"
  element={
    <Suspense fallback={<PageLoader />}>
      <WireEdmStudioPage />
    </Suspense>
  }
/>
```

### `H:\prism\web\src\components\layout\AppShell.tsx`
Add nav item in the "Core" group:
```tsx
{
  heading: "Core",
  items: [
    { to: "/sfc", label: "SFC Calculator", icon: CalculatorIcon },
    { to: "/ppg", label: "Post Processor", icon: CodeBracketIcon },
    { to: "/cam", label: "CAM Strategy", icon: CubeIcon },
    { to: "/wire-edm", label: "Wire EDM Studio", icon: BoltIcon },  // NEW
  ],
},
```
Add a `BoltIcon` function (inline SVG of a lightning bolt, matching existing icon patterns).

### `H:\prism\web\src\pages\EdmPage.tsx`
No changes needed — the existing page stays as-is for legacy sinker/laser calculations.
The Wire EDM Studio is a new page at `/wire-edm`.

### `H:\prism\mcp-server\src\routes\edm.ts`
Add the 19 new granular pipeline routes listed above.
Keep existing 7 routes unchanged. New routes are additive only.

### `H:\prism\web\src\types\edm.ts`
Add re-exports from the new `wedmStudio.ts` types:
```tsx
export type { WedmStudioStep, InputMethod, WedmStudioState } from './wedmStudio';
```

---

## 4. Component Architecture & Data Flow

### Render Tree
```
WireEdmStudioPage
  └─ WedmStudioProvider (context + reducer)
       └─ WireEdmStudioInner
            ├─ WizardSidebar (left)
            │    └─ Step indicators (1-7)
            ├─ WedmViewerPanel (center)
            │    └─ Viewer3D
            │         ├─ StockMesh (when stock data available)
            │         ├─ ProfileMesh (when interpretation done)
            │         ├─ StartHoleMarkers (when holes planned)
            │         ├─ WCSGizmo (when on step 4+)
            │         ├─ ToolpathLayer (when toolpath generated)
            │         └─ ViewerToolbar overlay
            └─ StepPanel (right, dynamic)
                 ├─ StepFileInput (step 1)
                 ├─ StepInterpretation (step 2)
                 ├─ StepFeasibility (step 3)
                 ├─ StepStartHoles (step 4)
                 ├─ StepToolpath (step 5)
                 ├─ StepOptimization (step 6)
                 └─ StepOutput (step 7)
                      └─ GcodeEditor (Monaco, reused)
```

### Data Flow per Step

**Step 1 → Step 2:**
```
User selects input method → uploads file → FileUploadPayload stored in context →
"Interpret" auto-triggered → API returns features[] →
Dispatch SET_INTERPRETATION → Viewer renders ProfileMesh
```

**Step 2 → Step 3:**
```
User reviews/edits features → clicks "Assess Feasibility" →
API calls wedm_assess_feasibility + wedm_full_selection →
Dispatch SET_FEASIBILITY + SET_MATERIAL_SELECTION →
Viewer adds StockMesh behind ProfileMesh
```

**Step 3 → Step 4:**
```
User confirms material/machine/wire → clicks "Plan Setup" →
API calls wedm_plan_start_holes + wedm_plan_setup →
Dispatch SET_START_HOLE_PLAN →
Viewer adds StartHoleMarkers + WCSGizmo
```

**Step 4 → Step 5:**
```
User positions WCS origin + reviews start holes → clicks "Generate Toolpath" →
API calls wedm_generate_toolpath + wedm_plan_tabs + wedm_optimize_sequence →
Dispatch SET_TOOLPATH →
Viewer switches to ToolpathLayer (hides stock, shows toolpath)
```

**Step 5 → Step 6:**
```
User configures approach/departure/tabs → clicks "Optimize" →
API calls wedm_full_multipass + wedm_optimize_params + wedm_plan_flushing + wedm_calculate_corners →
Dispatch SET_MULTI_PASS →
Viewer shows multi-pass toolpath colored per pass
```

**Step 6 → Step 7:**
```
User reviews pass strategy → clicks "Generate Program" →
API calls wedm_generate_gcode(controller) + wedm_estimate_cost + wedm_generate_setup_sheet →
Dispatch SET_GCODE_OUTPUT →
Viewer + GcodeEditor split view
```

---

## 5. Input Method Handling

### Camera Capture (Picture of Print)
1. User clicks "Camera" card
2. `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })` opens camera
3. Live video feed in a modal with capture button
4. On capture: `canvas.toDataURL("image/jpeg", 0.85)` → strip prefix → base64 content
5. Payload: `{ filename: "camera_capture.jpg", content_base64, file_type: "image", input_method: "camera" }`
6. Upload to `/api/v1/upload` → server stores temp file
7. The interpretation engine processes the image (OCR + geometry extraction)

### PDF/Image Upload (Print Upload)
1. Drag-drop zone or file picker (`<input type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff">`)
2. Read with `FileReader.readAsDataURL()` → extract base64
3. Payload: `{ filename, content_base64, file_type: ext, input_method: "pdf" }`
4. Same upload flow

### Sketch Upload
1. Same as PDF/Image but UI framing says "Upload your hand sketch"
2. `accept=".png,.jpg,.jpeg"` (no PDF for sketches)
3. `input_method: "sketch"` — backend may apply different preprocessing

### DXF Upload
1. File picker: `accept=".dxf"`
2. Read as text via `FileReader.readAsText()` for small files, or base64 for large
3. Payload: `{ filename, content_base64 OR content_text, file_type: "dxf", input_method: "dxf" }`
4. Backend routes to DXF parser which extracts geometry directly

### CAD Upload (STEP/IGES)
1. File picker: `accept=".step,.stp,.iges,.igs"`
2. Read as base64 (binary formats)
3. Payload: `{ filename, content_base64, file_type: "step"|"iges", input_method: "cad" }`
4. Backend routes to CAD engine (Python CadQuery) for B-rep interpretation
5. Returns features + 3D mesh data for visualization

---

## 6. 3D Viewer Integration per Step

### Step 1 (File Input)
- **Empty scene** with grid and axes
- After file upload success: show a **thumbnail preview** card, not 3D yet
- If DXF/CAD: immediately render wireframe profile in viewer

### Step 2 (Interpretation)
- **ProfileMesh**: Interpreted 2D contour points extruded to `overall_thickness_mm`
- Color-coded by feature type (profiles=blue, holes=green, slots=orange)
- Camera auto-rotates to ISO view
- Feature labels as HTML overlays (drei Html component)

### Step 3 (Feasibility)
- **StockMesh** (transparent): Workpiece bounding box rendered as transparent block
- **ProfileMesh** (solid): Part profiles shown inside stock
- Go/No-Go badge overlay in top-left corner of viewer

### Step 4 (Start Holes + WCS)
- **StartHoleMarkers**: Cylinders at planned hole positions
- **WCSGizmo**: Interactive draggable origin point with X/Y/Z axes
- StockMesh in xray mode so holes are visible through it
- Hover tooltips on holes showing ID, X, Y, diameter

### Step 5 (Toolpath)
- **ToolpathLayer**: Full cutting path rendered using existing component
- **ViewerToolbar**: Layer toggles, color mode, playback controls
- StockMesh switched to transparent mode
- ProfileMesh visible as reference wireframe
- Tab locations highlighted as thicker segments or markers

### Step 6 (Optimization)
- **Multi-pass overlay**: Each pass rendered as separate ToolpathLayer
- Color per pass (rough=red, semi=yellow, finish=green, super=blue)
- Toggle individual passes visible/hidden via checkboxes in right panel
- Animated playback shows passes in sequence

### Step 7 (Output)
- **Split layout**: Viewer takes 50% width, GcodeEditor takes 50%
- Toolpath in viewer synced with G-code: clicking a line in editor highlights corresponding segment
- "Full screen" toggle for editor or viewer independently

---

## 7. WCS / Origin Point Setting (Step 4)

### Interactive Placement
The WCSGizmo component inside the Three.js canvas:
- Three colored axes: X=Red, Y=Green, Z=Blue (matching standard CNC convention)
- Translucent sphere at origin intersection
- Uses drei `TransformControls` in "translate" mode for interactive dragging
- Constrained to XY plane (Z typically at top of stock for WEDM)
- Grid snapping: 0.1mm resolution, 1mm grid
- Coordinate readout displayed as overlay text

### Coordinate Input
In the right panel (StepStartHoles.tsx):
- Three numeric inputs: X0, Y0, Z0
- Bidirectional binding: editing inputs moves gizmo, dragging gizmo updates inputs
- Quick-set buttons: "Part Center", "Stock Corner", "First Start Hole"
- These calculate the position from feature geometry

### Effect on Downstream Steps
- WCS origin is stored in context as `wcsOrigin: { x, y, z }`
- Toolpath generation (step 5) references this as the program zero
- G-code output (step 7) includes appropriate G54/G92 work offset commands

---

## 8. Backend Route Design

### Approach: Granular Per-Action Routes

Rather than using only the single `/pipeline` route, add individual routes for each WEDM action. This provides:
- Better error isolation (one action fails without losing others)
- Frontend can sequence calls in the desired wizard order
- Progress reporting per action
- Cacheability of intermediate results

### Route Structure (in `routes/edm.ts`)

The existing `invoke` helper already handles dispatching to `prism_edm`:

```typescript
// Example new route (pattern repeated for each action):
router.post("/interpret-drawing", async (req, res, next) => {
  try { res.json(await invoke("wedm_interpret_drawing", req.body)); } catch (e) { next(e); }
});
```

19 new routes following this exact pattern. No new middleware needed.
The existing Zod validation in the dispatcher handles input validation.

### File Upload Route

File uploads go through the existing `/api/v1/upload` route (in `routes/upload.ts`).
The upload route already handles:
- Base64 file storage to temp directory
- DXF detection (`ready_for_import: true`)
- STEP/IGES detection
- Returns `{ uploaded: true, file_path, file_type }`

The frontend then passes the result metadata to `wedm_interpret_drawing`.

---

## 9. State Management Deep Dive

### Reducer Design

```typescript
type WedmStudioAction =
  | { type: 'SET_STEP'; step: WedmStudioStep }
  | { type: 'SET_INPUT_METHOD'; method: InputMethod }
  | { type: 'SET_UPLOADED_FILE'; file: FileUploadPayload }
  | { type: 'SET_INTERPRETATION'; data: InterpretedDrawingResult }
  | { type: 'SET_FEASIBILITY'; data: FeasibilityResult }
  | { type: 'SET_MATERIAL_SELECTION'; data: MaterialSelection }
  | { type: 'SET_START_HOLE_PLAN'; data: StartHolePlan }
  | { type: 'SET_WCS_ORIGIN'; origin: WCSOrigin }
  | { type: 'SET_TOOLPATH'; data: ToolpathResult }
  | { type: 'SET_MULTI_PASS'; data: MultiPassPlan }
  | { type: 'SET_GCODE_OUTPUT'; data: GcodeOutput }
  | { type: 'SET_CONTROLLER'; controller: ControllerType }
  | { type: 'SET_ERROR'; step: WedmStudioStep; error: string | null }
  | { type: 'SET_LOADING'; step: WedmStudioStep; loading: boolean }
  | { type: 'RESET' };
```

### Key Design Decisions

1. **Accumulated state**: Each step adds to the state without clearing previous steps. Going back to step 3 does NOT erase step 4-7 data, but re-running step 3 DOES clear steps 4-7 (cascading invalidation).

2. **Cascading invalidation**: When a user re-runs an earlier step, all downstream results are nulled:
   ```typescript
   case 'SET_INTERPRETATION':
     return { ...state, interpretation: action.data,
       feasibility: null, materialSelection: null, startHolePlan: null,
       toolpathResult: null, multiPassPlan: null, gcodeOutput: null };
   ```

3. **Loading/error per step**: Each step has independent loading and error states so the UI shows per-step progress.

4. **localStorage persistence**: Like PpgContext, autosave the state every 30s so the wizard survives page refreshes. On mount, restore from `localStorage.getItem("prism-wedm-studio-state")`.

---

## 10. Implementation Sequence

### Phase 1: Foundation (create first, test in isolation)
1. `types/wedmStudio.ts` — Define all types
2. `contexts/WedmStudioContext.tsx` — Context + reducer
3. `api/wedmStudio.ts` — API layer
4. `hooks/useWedmStudio.ts` — Orchestration hooks
5. Backend: Add 19 routes to `routes/edm.ts`

### Phase 2: Page Shell + Navigation
6. `pages/WireEdmStudioPage.tsx` — Page with provider + layout
7. `components/wedm-studio/WizardSidebar.tsx` — Step indicator
8. Modify `App.tsx` — Add route
9. Modify `AppShell.tsx` — Add nav item

### Phase 3: 3D Infrastructure
10. `utils/wedmGeometry.ts` — Geometry converters
11. `components/wedm-studio/WedmViewerPanel.tsx` — Viewer wrapper
12. `components/wedm-studio/ProfileMesh.tsx` — Part profile 3D
13. `components/wedm-studio/StartHoleMarkers.tsx` — Hole visualization
14. `components/wedm-studio/WCSGizmo.tsx` — Origin placement

### Phase 4: Wizard Steps (in order, each testable independently)
15. `StepFileInput.tsx` — Step 1 (camera capture + file upload)
16. `StepInterpretation.tsx` — Step 2
17. `StepFeasibility.tsx` — Step 3
18. `StepStartHoles.tsx` — Step 4
19. `StepToolpath.tsx` — Step 5
20. `StepOptimization.tsx` — Step 6
21. `StepOutput.tsx` — Step 7 (integrates GcodeEditor)

### Phase 5: Polish & Integration
22. Responsive layouts (mobile/tablet breakpoints)
23. Keyboard shortcuts
24. Error boundaries per step
25. Loading skeletons
26. Unit tests for reducer + hooks

---

## 11. Potential Challenges & Mitigations

### Challenge 1: Large 3D Scenes
**Risk**: Complex toolpaths with thousands of segments could slow the viewer.
**Mitigation**: Use LOD (level of detail) — reduce segment count when zoomed out. The existing ToolpathLayer already uses BufferGeometry which is GPU-efficient.

### Challenge 2: Camera Capture Cross-Browser
**Risk**: `getUserMedia` requires HTTPS and user permission.
**Mitigation**: Wrap in try/catch, show "Camera unavailable" message, fall back to file upload.

### Challenge 3: File Size Limits for Base64 Upload
**Risk**: STEP files can be 50MB+. Base64 encoding adds 33% overhead.
**Mitigation**: For files >5MB, implement chunked upload or switch to FormData multipart. The existing upload route already handles base64; add a size check and suggest multipart for large files.

### Challenge 4: Pipeline Step Sequencing
**Risk**: Users might try to skip steps or go back/forward unpredictably.
**Mitigation**: The reducer enforces step dependencies. "Next" button is disabled until required data is present. Going back is always allowed; going forward requires the previous step's data.

### Challenge 5: WCS Drag Interaction Conflicting with Orbit Controls
**Risk**: Dragging the WCS gizmo might conflict with OrbitControls rotation.
**Mitigation**: Use drei `TransformControls` which automatically disables OrbitControls when gizmo is being dragged (built-in behavior).

---

## 12. File Summary

### New Files (21)
| # | Path | Purpose |
|---|------|---------|
| 1 | `web/src/types/wedmStudio.ts` | Type definitions |
| 2 | `web/src/contexts/WedmStudioContext.tsx` | Context + reducer |
| 3 | `web/src/api/wedmStudio.ts` | API layer |
| 4 | `web/src/hooks/useWedmStudio.ts` | Orchestration hooks |
| 5 | `web/src/pages/WireEdmStudioPage.tsx` | Page component |
| 6 | `web/src/components/wedm-studio/WizardSidebar.tsx` | Step indicator |
| 7 | `web/src/components/wedm-studio/WedmViewerPanel.tsx` | Viewer wrapper |
| 8 | `web/src/components/wedm-studio/StepFileInput.tsx` | Step 1 |
| 9 | `web/src/components/wedm-studio/StepInterpretation.tsx` | Step 2 |
| 10 | `web/src/components/wedm-studio/StepFeasibility.tsx` | Step 3 |
| 11 | `web/src/components/wedm-studio/StepStartHoles.tsx` | Step 4 |
| 12 | `web/src/components/wedm-studio/StepToolpath.tsx` | Step 5 |
| 13 | `web/src/components/wedm-studio/StepOptimization.tsx` | Step 6 |
| 14 | `web/src/components/wedm-studio/StepOutput.tsx` | Step 7 |
| 15 | `web/src/components/wedm-studio/ProfileMesh.tsx` | 3D profile geometry |
| 16 | `web/src/components/wedm-studio/StartHoleMarkers.tsx` | 3D hole markers |
| 17 | `web/src/components/wedm-studio/WCSGizmo.tsx` | Interactive WCS |
| 18 | `web/src/utils/wedmGeometry.ts` | Geometry utilities |

### Modified Files (4)
| # | Path | Change |
|---|------|--------|
| 1 | `web/src/App.tsx` | Add lazy import + `/wire-edm` route |
| 2 | `web/src/components/layout/AppShell.tsx` | Add nav item to Core group |
| 3 | `mcp-server/src/routes/edm.ts` | Add 19 granular pipeline routes |
| 4 | `web/src/types/edm.ts` | Add re-exports from wedmStudio types |

### Reused Existing Components (no changes needed)
- `components/viewer/Viewer3D.tsx` — Core 3D canvas
- `components/viewer/ToolpathLayer.tsx` — Toolpath renderer
- `components/viewer/StockMesh.tsx` — Workpiece mesh
- `components/viewer/ViewerToolbar.tsx` — Viewer controls
- `components/ppg/GcodeEditor.tsx` — Monaco G-code editor
- `utils/sceneParser.ts` — Scene graph parsing utilities
