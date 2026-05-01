# PRISM Web UI — Complete TODO List

**Status**: SAVED FOR LAST — all backend engines, simulation, token efficiency, and data systems complete.
**Priority**: This is the final major work item before production release.
**Location**: `mcp-server/web/src/` (React + TypeScript + Three.js)

## What Already Exists (DO NOT REBUILD)

### 3D Viewer (Three.js + React-Three-Fiber)
- `web/src/components/viewer/Viewer3D.tsx` — Canvas + orbit controls + grid + axes + lighting
- `web/src/components/viewer/ToolpathLayer.tsx` — 5 color modes, dashed rapids, playback marker
- `web/src/components/viewer/StockMesh.tsx` — 4 render modes (solid/wireframe/transparent/xray)
- `web/src/components/viewer/HeatmapOverlay.tsx` — 6 types (thermal/force/wear/stress/deflection)
- `web/src/components/viewer/ToolAssembly.tsx` — tool + holder rendering
- `web/src/components/viewer/ViewerToolbar.tsx` — layer toggles, color modes, presets, playback
- Deps: `three@0.183`, `@react-three/fiber@9.5`, `@react-three/drei@10.7`

### Backend Engines (data pipeline — ready to wire)
- `VisualizationEngine.ts` — scene graph generation (meshes, lines, lights, cameras)
- `BackplotEngine.ts` — G-code to 3D moves (rapid/linear/arc)
- `SimulationVisualizationBridgeEngine.ts` — simulation physics → colored toolpath data
- `CNCSimulationPipelineEngine.ts` — full simulation (force/thermal/deflection/cost)
- `SimulationReportEngine.ts` — Vericut-style reports
- `CalibratedSimulationEngine.ts` — Monte Carlo uncertainty + calibration

### Pages (42 exist as stubs/partial)
- `web/src/pages/` — 42 page components
- Most need wiring to backend MCP actions

### Charts (SVG-based)
- `web/src/components/charts/` — RadarChart, BarChart, ProgressRing, Sparkline

## TODO Items (Prioritized)

### P0 — Core Viewer Wiring (must work first)
- [ ] Wire SimulationVisualizationBridgeEngine output → ToolpathLayer props
- [ ] Wire simulation heatmap data → HeatmapOverlay
- [ ] Wire stock dimensions → StockMesh geometry
- [ ] Wire tool assembly data → ToolAssembly component
- [ ] Create SimulationPage that chains: upload G-code → simulate → display 3D
- [ ] Add G-code text editor component (CodeMirror or Monaco)

### P1 — Simulation Viewer Enhancements
- [ ] STEP/STL file import + mesh display (three-stdlib STLLoader/GLTFLoader)
- [ ] Section view / clipping plane (Three.js LocalClippingEnabled)
- [ ] Machine envelope wireframe overlay (transparent box)
- [ ] Collision zone highlight (red transparent volumes from SimVizBridge)
- [ ] Multi-tool visualization (show tool changes during playback)
- [ ] Machine kinematic animation (animate axes from kinematic chain data)

### P2 — Dashboard & Analytics Pages
- [ ] Wire DashboardPage to SystemSnapshotEngine
- [ ] Wire CalculatorPage to process-calc dispatcher actions
- [ ] Wire MachinePage to machine-enrich data (910 machines)
- [ ] Wire ToolCatalogPage to tool catalog (46K tools)
- [ ] Wire QuotingPage to quote-job pipeline
- [ ] Wire QualityPage to SPC/capability engines
- [ ] Wire SafetyPage to safety chain + simulation results

### P3 — Advanced Features
- [ ] Real-time simulation playback with physics overlay
- [ ] Comparative view (before/after optimization)
- [ ] PDF report generation from SimulationReportEngine
- [ ] Mobile-responsive layout
- [ ] Dark mode theme
- [ ] Keyboard shortcuts for viewer controls
- [ ] WebSocket for live machine monitoring (future OPC-UA bridge)

### P4 — Polish
- [ ] PBR materials for metallic appearance (MeshStandardMaterial)
- [ ] SSAO post-processing for depth perception
- [ ] Smooth camera transitions between presets
- [ ] Loading states and error boundaries
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Performance optimization (instanced rendering for large toolpaths)

## Architecture Notes

```
Data Flow:
  User uploads G-code → POST to /api/simulate
  → CNCSimulationPipelineEngine.simulate()
  → SimulationVisualizationBridgeEngine.generateVisualization()
  → JSON response with colored segments, collision zones, timeline
  → React state → Three.js components render

API Endpoints Needed:
  POST /api/simulate — run simulation, return viz data
  POST /api/simulate/physics — single-block physics check
  GET  /api/machines — list 910 machines
  GET  /api/tools — search 46K tools
  GET  /api/viewer/scene — get scene graph from VisualizationEngine
```

## Dependencies (already installed)
- three, @react-three/fiber, @react-three/drei
- React 18, TypeScript 5
- Vite build system

## Estimated Effort
- P0: 2-3 sessions (core wiring)
- P1: 2-3 sessions (viewer enhancements)
- P2: 3-4 sessions (dashboard pages)
- P3: 2-3 sessions (advanced features)
- P4: 1-2 sessions (polish)
- **Total: 10-15 sessions**
