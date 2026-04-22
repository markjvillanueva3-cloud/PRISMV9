# Wire EDM Studio — Revised Implementation Plan

## Context
The Wire EDM tab in EdmPage.tsx is a simple parameter form. The backend has a complete 35-action WEDM-P2P pipeline. This plan wires that pipeline into an interactive wizard. **Revised after 10-agent scrutiny (avg 56/100) identified 42 findings.**

## Key Design Decisions (from scrutiny)

1. **2D profile rendering, not 3D extrusion** — THREE.ExtrudeGeometry fails on DXF arcs/splines/holes. Wire EDM cuts in XY plane; render profiles as 2D polylines with thickness indicator. Simpler, correct, fast.
2. **Per-step local state, not monolithic reducer** — Matches existing PpgContext/LearningContext patterns. Each step manages its own useState. Only final results pushed to lightweight shared context. No 300-line reducer.
3. **Stale marking, not cascading deletion** — Changing material marks steps 3-6 as "stale" (yellow badge). User chooses to re-run or keep. Never deletes work.
4. **Quick Generate fast track** — DXF upload → one-click → full pipeline → review at end. 90% of jobs don't need 6 manual steps.
5. **Multipart upload, not base64** — Add multer middleware for file routes. Base64 fails on >10MB CAD files.
6. **Lazy-load Monaco + Viewer** — Step 6 (G-code editor) and 3D viewer loaded on demand, not upfront.
7. **Expose manufacturing decisions** — Taper, corners, tabs, wire break risk, surface integrity all visible.
8. **New dedicated page at /wire-edm** — Avoids state collision with existing EdmPage hooks. EdmPage Wire tab links to the studio.

## Wizard Flow (6 Steps + Quick Track)

```
[Quick Generate] ←── Upload DXF → auto-pipeline → jump to Step 6
         |
Step 1: Import ─── Upload (DXF primary, + photo/sketch/CAD secondary)
Step 2: Review ──── Features, material, thickness, wire type, machine, flushing mode, taper
Step 3: WCS ─────── Origin point, start holes, threading method
Step 4: Toolpath ── Strategy, approach/departure, corners, tabs/slugs, sequence
Step 5: Optimize ── Multi-pass cascade, cutting params, flushing, wire break risk, surface integrity
Step 6: Program ─── Controller selection, G-code editor, cost summary, setup sheet, download
```

## Files to Create (10 files, down from 16)

### Types
**`H:\prism\web\src\types\wedmStudio.ts`**
- WedmStep (6-value union), InputMethod (5 modes), StepStatus ('pristine'|'complete'|'stale'|'error'|'pending')
- Per-step result interfaces (inferred from Zod schemas where possible)
- PipelineResponse<T> discriminator: `{ success: true, data: T } | { success: false, error: string }`
- ProfileContour: `{ id, points: number[], isHole?: boolean, arcs?: ArcSegment[] }`
- Keep SEPARATE from types/edm.ts (no re-exports, no namespace pollution)

### Context (lightweight)
**`H:\prism\web\src\contexts\WedmStudioContext.tsx`**
- Split into 2 contexts (prevents re-render storm):
  - `WedmNavigationContext`: currentStep, stepStatuses[], setCurrentStep, markStale(fromStep)
  - `WedmDataContext`: per-step result slots, setStepData(step, data), clearStep(step)
- NO reducer — simple callbacks matching PpgContext/LearningContext patterns
- sessionStorage for step metadata (which step, status badges)
- IndexedDB for large data (contour arrays, toolpath segments) via simple get/set helpers
- Debounce-on-mutation autosave (2s after last dispatch, not fixed timer)

### API + Hooks
**`H:\prism\web\src\api\wedmStudio.ts`**
- Typed API functions for all pipeline endpoints
- File upload via FormData (multipart), not base64 JSON
- 90s timeout for pipeline operations
- AbortController per request

**`H:\prism\web\src\hooks\useWedmPipeline.ts`**
- Per-step hooks managing local loading/error state
- Push final results to WedmDataContext on success
- Retry logic: failed step shows [Retry] button, doesn't cascade
- Quick Generate hook: chains all pipeline calls sequentially

### Page
**`H:\prism\web\src\pages\WireEdmStudioPage.tsx`**
- Top-level page with WedmStudioProvider wrapping both contexts
- Layout: responsive 30/70 split (form | viewer) on desktop, stacked on mobile
- Horizontal step indicator with status badges (pending/active/complete/stale/error)
- Lazy-loaded step components via React.lazy + Suspense
- Quick Generate button prominent at step 1

### Step Components (6 steps in 1 directory)
**`H:\prism\web\src\components\wedm-studio\StepImport.tsx`**
- DXF as PRIMARY (big blue dropzone), secondary options below (camera, image, sketch, CAD)
- Drag-drop zone with FileReader for small files, FormData upload for large files
- Magic byte validation before upload (DXF starts with "0\nSECTION", STEP starts with "ISO-10303")
- Client-side preview: image → `<img>`, DXF → simple 2D canvas render, CAD → filename badge
- Camera: getUserMedia with permission-denied fallback to file upload
- Upload progress bar (XMLHttpRequest.upload.onprogress)
- Quick Generate button: upload + run full pipeline → jump to step 6

**`H:\prism\web\src\components\wedm-studio\StepReview.tsx`**
- Feature table: type, dimensions, tolerance, corner radius, surface finish target
- Editable fields: tolerance (spinner), surface finish target (dropdown), delete feature (button)
- Material selector (from registry), thickness input, wire type selector (prominent, not buried)
- Machine selector, flushing mode (submerged/spray — early, affects everything downstream)
- Taper angle input (if applicable) — taper cutting is a major Wire EDM capability
- Feasibility go/no-go indicator with specific failure reasons
- "Stale" badge on steps 3-6 if material/wire/machine changes

**`H:\prism\web\src\components\wedm-studio\StepWcs.tsx`**
- WCS origin: X/Y/Z coordinate inputs + quick-set buttons (Part Center, Stock Corner, First Hole)
- Interactive origin placement on 2D profile canvas (click-to-place, drag to adjust)
- Start hole table: position, diameter, threading method (auto/mechanical/manual), add/remove
- Threading method affects cycle time estimate (shown inline)

**`H:\prism\web\src\components\wedm-studio\StepToolpath.tsx`**
- Profile type classification (closed external/internal, open, island)
- Cutting direction (CW/CCW) with reason indicator
- Approach/departure type selector (tangent arc, perpendicular, angle)
- Corner strategy: sharp pause, radius follow, tangent blend — with per-corner override
- Corner detail panel: over-travel distance, dwell time, wire lag compensation (from backend)
- Tab/slug management: tab count, width, critical-surface avoidance, holding method (glue/magnetic/vacuum)
- Sequence ordering: drag-to-reorder features, inside-before-outside indicator
- Live 2D toolpath preview updating as settings change

**`H:\prism\web\src\components\wedm-studio\StepOptimize.tsx`**
- Multi-pass cascade: visual strip showing rough → skim passes with per-pass color
- Per-pass parameter cards: offset, energy, pulse timing, wire tension, speed
- Flushing strategy panel: mode, pressure, nozzle position
- Wire break risk indicator (from wedm_predict_wire_break): green/yellow/red per feature
- Surface integrity panel: predicted recast layer (μm), HAZ depth, residual stress
- Ra prediction per pass with confidence interval
- Cost preview: estimated wire consumption, machine time, total cost

**`H:\prism\web\src\components\wedm-studio\StepProgram.tsx`** (lazy-loaded)
- Controller selector: all 6 dialects (Fanuc, Mitsubishi, Sodick, AgieCharmilles, Makino, Accutex)
- Monaco G-code editor (lazy-loaded, reuse GcodeEditor pattern from PPG)
- G-code validation panel (reuse ValidationPanel pattern)
- Cost summary table: wire cost, machine time, consumables, total
- Setup sheet panel: workholding notes, flushing diagram, threading sequence, safety notes
- Download buttons: G-code (.nc), setup sheet (PDF via jsPDF), cost report
- "Print Setup Sheet" button for paper-friendly output

### 2D Profile Renderer
**`H:\prism\web\src\components\wedm-studio\ProfileCanvas.tsx`**
- 2D canvas rendering of wire EDM profiles (NOT Three.js ExtrudeGeometry)
- Renders contour polylines with arc tessellation (circular arcs → polyline segments)
- Multiple contours: outer profile + inner holes, color-coded by feature type
- Toolpath overlay: cutting direction arrows, approach/departure lines
- WCS origin indicator: crosshair with X/Y labels
- Start hole markers: circles with threading method label
- Tab markers: dashed rectangles at tab positions
- Multi-pass overlay: offset lines per pass (onion-skin visualization)
- Zoom/pan via mouse wheel + drag
- Uses HTML5 Canvas 2D (simpler, no WebGL line-width issues, no Three.js overhead)

## Files to Modify (4 existing files)

### `H:\prism\web\src\App.tsx`
- Add lazy import for WireEdmStudioPage
- Add route: `<Route path="/wire-edm" element={<Suspense><WireEdmStudioPage /></Suspense>} />`
- Also add `/edm` route for existing EdmPage (currently not routed at all)

### `H:\prism\web\src\components\layout\AppShell.tsx`
- Add new "Production" nav group (or add to existing group)
- Add nav item: `{ to: "/wire-edm", label: "Wire EDM Studio", icon: BoltIcon }`
- Add nav item: `{ to: "/edm", label: "EDM Calculator", icon: CalculatorIcon }`

### `H:\prism\web\src\pages\EdmPage.tsx`
- Add link/button in Wire EDM tab: "Open Wire EDM Studio →" pointing to /wire-edm
- Keep existing calculator functionality intact (no state collision)

### `H:\prism\mcp-server\src\routes\edm.ts`
- Add 18 new granular routes (all follow existing try/catch/invoke pattern):
  - POST /interpret → wedm_interpret_drawing
  - POST /classify → wedm_classify_features
  - POST /feasibility → wedm_assess_feasibility
  - POST /selection → wedm_full_selection
  - POST /start-holes → wedm_plan_start_holes
  - POST /setup → wedm_plan_setup
  - POST /toolpath → wedm_generate_toolpath
  - POST /tabs → wedm_plan_tabs
  - POST /sequence → wedm_optimize_sequence
  - POST /multipass → wedm_full_multipass
  - POST /optimize → wedm_optimize_params
  - POST /flushing → wedm_plan_flushing
  - POST /gcode → wedm_generate_gcode
  - POST /cost → wedm_estimate_cost
  - POST /setup-sheet → wedm_generate_setup_sheet
  - POST /predict-wire-break → wedm_predict_wire_break (SAFETY)
  - POST /calculate-corners → wedm_calculate_corners (QUALITY)
  - POST /solve-taper → wedm_solve_taper (DIMENSIONAL)
- Add multer middleware for /interpret route (file upload)
- Configure express.json({ limit: '50mb' }) as fallback
- Fix duplicate /parameters route (currently same as /recommendation)

## Data Flow

```
File Upload (FormData) → multer → temp file
    ↓
/interpret → wedm_interpret_drawing → features[] with contour points
    ↓ (user reviews/edits, selects material/wire/machine)
/feasibility + /selection → go/no-go + material/machine/wire result
    ↓ (user sets WCS, configures start holes)
/start-holes → start_holes[] with threading methods
    ↓ (user configures toolpath strategy, corners, tabs)
/toolpath + /tabs + /sequence + /calculate-corners → toolpath data
    ↓ (system optimizes, user reviews)
/multipass + /optimize + /flushing + /predict-wire-break → per-pass params
    ↓ (user selects controller)
/gcode → G-code string (6 dialects)
/cost → wire/machine/consumable costs
/setup-sheet → setup documentation
```

## Quick Generate Flow (one-click)
```
Upload DXF → /interpret → /feasibility → /selection → /start-holes
  → /toolpath → /multipass → /optimize → /gcode
  → Jump to Step 6 with all results populated
  → User reviews and adjusts if needed
```

## Missing Infrastructure (from scrutiny — to address)

### DXF Parser Gap
EDMDrawingInterpretationEngine expects `PartFeature[]`, NOT raw DXF. Need either:
- A DXF-to-PartFeature converter on the backend (parse DXF → extract entities → classify)
- Call Python cad-engine's CadQuery for STEP files
- For MVP: accept DXF as text, parse polylines/arcs/circles into contour arrays server-side
- **This is a backend task, not frontend** — the /interpret route handler should accept raw file and convert

### Image-to-Geometry Gap
BlueprintOCR extracts dimensions but NOT contour geometry. For photo/image input:
- MVP: extract metadata (material, dimensions, tolerances) and display for manual feature entry
- V2: ML-based edge detection + contour reconstruction
- Be honest in UI: "Photo input extracts specs — contour geometry requires DXF or manual entry"

## Responsive Layout
- **Desktop (>1024px)**: 30% form panel | 70% profile canvas — collapsible sidebar
- **Tablet (768-1024px)**: Form panel as slide-over drawer, full-width canvas
- **Mobile (<768px)**: Stacked — step selector tabs, form first, canvas below (scrollable)

## Implementation Order
1. **Backend routes** — 18 new POST routes + multer + JSON limit fix (edm.ts)
2. **Types** — wedmStudio.ts with all interfaces
3. **API + Hooks** — wedmStudio.ts API client + useWedmPipeline hooks
4. **Context** — WedmNavigationContext + WedmDataContext (lightweight)
5. **ProfileCanvas** — 2D profile renderer with arc tessellation, toolpath overlay
6. **Step components** — Import → Review → WCS → Toolpath → Optimize → Program (in order)
7. **Page shell** — WireEdmStudioPage with step indicator, layout, lazy loading
8. **Routing + Nav** — App.tsx routes + AppShell nav items + EdmPage link
9. **Quick Generate** — Chain pipeline calls, skip to step 6
10. **Build verification** — `npx tsc --noEmit` → 0 errors

## Verification
1. `npx tsc --noEmit` from H:\prism\web — 0 type errors
2. `npx tsc --noEmit` from H:\prism\mcp-server — 0 type errors (new routes)
3. Manual: Upload DXF → see 2D profile → set origin → generate toolpath → view G-code
4. Quick Generate: Upload DXF → one click → G-code output in <30s
5. Responsive: Check 1920px, 1024px, 768px, 390px layouts
6. Each step renders with mock data independently
