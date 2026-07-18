# CAD/CAM Audit — Agent 4: Frontend

## mcp-server/web CAD/CAM Pages

**146 total pages**. Key CAD/CAM pages:
- **CADAIStatePage.tsx** (251 LOC) — FSM inspector for CAD decomposition/planning/execution with 6 forward events + pause/resume/reset. Polls session snapshots & transition log every 2s.
- **CamStrategyPage.tsx** (140 LOC) — Tabbed UI (Strategy Generator, Simulation, Collision Check). Material/operation pickers, numeric inputs (tool Ø, DoC, WoC), results in JSON display.
- **cam-ai-dashboard.tsx** (200+ LOC) — CAM model serving health: latency, error rate, drift, 5 status states (pending/shadow/canary/active/retired), pending confirmations, alert thresholds.
- **CADRegenerationDashboard** — CAD model retraining FSM with status chips.
- **MillingUploadPage.tsx** (80+ LOC) — Multi-format intake (STEP/IGES/STL/PDF/photo with OCR) → classifies file type → routes to /milling/wizard.
- **MillingUploadPage, WireEdmUploadPage, LatheUploadPage** — Per-process upload entry points.

## 3D Viewer Status

**Three.js integration present and working**:
- **Viewer3D.tsx** — @react-three/fiber Canvas with OrbitControls, Grid, AxesHelper. Camera presets (front/back/top/iso) with smooth 600ms easing. Ambient + 2× directional lighting.
- **StockMesh.tsx** — Workpiece rendering in 4 modes (solid/wireframe/transparent/xray). Phong material with configurable opacity & side. Syncs removal progress with toolpath animation.
- **ToolpathLayer.tsx, ToolAssembly.tsx, HeatmapOverlay.tsx** — Layered visualization for paths, holders, force/thermal heatmaps.
- **ViewerCanvasWorkspace, ViewerToolbar** — Container + controls.
- **WireEdmContour3D.tsx, CalculatorSetupPreview3D.tsx** — Domain-specific 3D previews.

**Status**: Mature, working. 3D viewer is production-grade.

## AI Prompt UI

**Minimal text-to-CAD in current web app**:
- CADAIStatePage is FSM debugging UI, not generative text input.
- CamStrategyPage accepts form parameters (dropdowns + numbers), not free-text prompts.
- **CalculatorPage.tsx** (12,909 LOC) includes "Advanced AI-driven print/CAD intake" as premium feature mention, but actual UI not found in pages audit.

**Gap**: No dedicated "describe part in words → generate CAD" page found in mcp-server/web. AI prompt integration exists in unmerged codex frontends.

## Pending Codex Merges

### cqask/ui (Next.js 13 + Ant Design + Tailwind)
- **Stack**: Next.js 13.4.19, React 18.2, Ant Design 5.9, Tailwind, TypeScript, Axios
- **cad-viewer.tsx**: Wraps three-cad-viewer WASM lib (render XYZ models with trackball/ortho/light controls). Tessellation, renderOptions (metalness/roughness/edge color).
- **Status**: Unmerged, Next.js SSR framework, Ant Design component library ready.

### mcp-cadquery/frontend (Vite + React 19 + Three.js)
- **Stack**: Vite 6.2, React 19, @react-three/fiber 9.1, Three.js 0.175, TypeScript 5.8
- **Components**: 
  - **App.tsx** (258 LOC) — CadQuery script executor + TJS renderer. Auto-render debounce (1s). SSE streaming from /mcp server.
  - **ParamsInput.tsx** — JSON parameter editor (textarea).
  - **ScriptInput, Controls, RenderOutput, LogDisplay, StatusBar** — Full IDE for parametric CAD.
- **Capability**: Live parametric CAD scripting with 3D viewport, state machine (Idle/Debouncing/Executing/Rendering/Error).
- **Status**: Unmerged, React 19 + Vite, ready for integration.

## Parametric Editor & Simulation

**Parametric manipulation**:
- CamStrategyPage uses form inputs (dropdowns, numeric sliders).
- mcp-cadquery/frontend ParamsInput exposes JSON editor for full parametric control.
- cqask/ui implicitly supports via three-cad-viewer tessellation options.

**Simulation**:
- CamStrategyPage tab "Simulation" scaffolded (G-code textarea placeholder).
- CAM AI Dashboard monitors real inference latency (p95/error rate).
- Stock mesh supports removal animation synced to toolpath progress.

## Score

**Functionality**: 75
- CAD/CAM pages exist (FSM, strategy, upload, dashboard).
- 3D viewer fully functional (Three.js, stock mesh, layers, camera presets).
- Parametric editing present but scattered (form vs JSON vs WASM).
- **Gaps**: No unified text-to-CAD UI. Simulation tab incomplete. 2 codex frontends unmerged, holding advanced parametric + React19 tooling.

**Architecture**: 72
- mcp-server/web: mature, 146 pages, production-ready.
- cqask/ui: SSR-capable (Next.js), Ant Design, but unmerged.
- mcp-cadquery/frontend: modern (React 19, Vite), CadQuery IDE, but unmerged.
- **Risk**: Duplication across 3 frontends; merge coordination needed.

**Integration**: 68
- Three.js viewer excellent. Ant Design available but in separate repo.
- SSE streaming in mcp-cadquery/frontend not in canonical mcp-server/web.
- AI prompting logic in unmerged codex; mcp-server/web lacks generative UX.

**Overall: 72/100**

---
*Audit date: 2026-05-08 | auditor: Claude Code CAD/CAM Agent | scope: mcp-server/web (146 pages, 3D viewer, strategy UI) + cqask/ui + mcp-cadquery/frontend (pending merges)*
