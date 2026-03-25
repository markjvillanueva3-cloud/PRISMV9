# PRISM Desktop Claude Brief — Frontend Development Partner
## Read this FIRST. Token-efficient context for parallel development.

## What Is PRISM
CNC manufacturing intelligence MCP server. 1,245 engines, 77 dispatchers, 2,700+ actions.
Takes a drawing/part → produces physics-optimized CNC program with per-block variable S/F.
Backend: TypeScript MCP server at C:/PRISM/mcp-server/ (Node.js, 61MB bundle)
Frontend: React/Vite web app at C:/PRISM/mcp-server/web/src/ (45 pages, partially wired)
MCP: Connected to this Desktop Claude instance already (localhost:3000)

## What CLI Claude Has Done (last 48 hours)
1. **Engine quality audit**: 1,215/1,245 engines are PRODUCTION quality
2. **Physics Fusion Orchestrator**: Designed 24-plugin system with 4 computation tiers + convergence loops (NOT yet built — in roadmap)
3. **Roadmap**: 5,567-line execution plan scrutinized by 51 specialist agents, 14 coverage areas
4. **Live bugs fixed**: SpeedFeedOrchestrator Ti kc1.1, Taylor n per-material, MonteCarlo.ts Sobol sort
5. **Blueprint OCR tests**: 14/14 passing against real Haas workbook data
6. **New sessions added**: security, real-world validation, CAD engine, UX, ERP, lean manufacturing, performance, deployment

## The Roadmap (what we're building, in order)
```
Phase 0-A: Print Reading (OCR → dimensions → geometry)     ← CLI CLAUDE IS HERE NOW
Phase 0-B: Critical Bug Fixes + Security Hardening
Phase 0-C: Test Infrastructure + Real-World Validation Data
Phase 0-D: Registry Wiring + Fusion Infrastructure + CAD Engine
Phase 1:   Knowledge Architecture + Decision Framework + UX/Onboarding
Phase 2:   Machine Selection + Business Logic + ERP + Lean
Phase 3:   Physics Fusion + Convergence + Downstream Wiring
Phase 4:   Simulation Gate + Performance Testing + Lights-Out
Phase 5-11: Per-machine pipelines (Turning, Milling, 5-Axis, etc.)
Phase 12:  Real-world validation (42+ parts, match-then-improve)
Phase 13:  Web UI + Deployment
Phase 14:  Future (embeddings, multi-agent, additive, plasma)
```

## YOUR JOB: Frontend Development (parallel with CLI backend work)

### Priority 1: Wire Existing Backend to Existing Frontend
The web app has 45 pages and 8 learning components that are BUILT but NOT CONNECTED to the MCP server.

**Immediate tasks (wire what exists):**
1. **DashboardPage** (web/src/pages/DashboardPage.tsx) — currently shows mock data. Wire to:
   - `/health` endpoint for system status
   - `prism_calc` dispatcher for live S/F calculations
   - OEECalculatorEngine via `prism_business` dispatcher
2. **CalculatorPage** — wire to SpeedFeedOrchestratorEngine via `prism_calc:speed_feed_orchestrate`
3. **QuoteBuilderPage** — wire to QuoteEstimatorEngine via `prism_business:quote_estimate`
4. **LearningDashboard** — wire to ApprenticeEngine via `/learning/*` API routes (10 endpoints exist)

**API routes already built (web/src/routes/):**
- POST /learning/assess, /learning/plan, /learning/progress, /learning/recommend
- POST /learning/knowledge/search, /learning/tribal
- POST /learning/select/material, /learning/select/tool, /learning/select/machine

### Priority 2: Onboarding Flow (Session 1-UX in roadmap)
OnboardingEngine exists (5 disclosure levels, progressive feature reveal) but NO frontend calls it.
- First visit: welcome modal with 3 example queries
- Progressive disclosure: show more features as user interacts
- Skill-level routing: beginner sees simplified results

**Key engines to wire:**
- OnboardingEngine → `prism_intelligence:onboarding_welcome/state/record/suggestion`
- ApprenticeEngine → `prism_intelligence:apprentice_lesson/assess/challenge`

### Priority 3: Match-Then-Improve Visualization
When CLI Claude finishes Phase 12 validation (42+ real parts), the frontend needs:
- Side-by-side comparison: Original Program vs PRISM Optimized
- Improvement metrics: cycle time reduction %, tool life improvement %, Ra improvement %
- Per-block S/F variability visualization (the PostProcessor generates per-block data)

## How to Call the MCP Server
The server is at localhost:3000. Use the MCP tools directly:
```
Tool: prism_calc          Actions: speed_feed_orchestrate, cutting_force, tool_life, ...
Tool: prism_business      Actions: quote_estimate, oee_calc, job_schedule, ...
Tool: prism_cam           Actions: strategy_select, post_process, ...
Tool: prism_quality       Actions: spc_calculate, fai_inspect, ...
Tool: prism_intelligence  Actions: onboarding_welcome, apprentice_lesson, tribal_search, ...
```

## Key Files for Frontend Work
```
Web app root:     C:/PRISM/mcp-server/web/src/
Pages:            web/src/pages/ (45 pages)
Components:       web/src/components/ (Layout, CommandPalette, learning/*)
Contexts:         web/src/contexts/LearningContext.tsx
Hooks:            web/src/hooks/useLearning.ts (10 hooks built)
API routes:       C:/PRISM/mcp-server/src/routes/ (51 route files)
```

## What CLI Claude Is Building Next (coordinate with this)
- Phase 0-A U02: PrintToGeometry validation (CadQuery → STEP)
- Phase 0-A U03-U06: End-to-end drawing → program pipeline
- Phase 0-B: Bug fixes + security hardening (6 auth bypass closures)
- Phase 0-C: Test infrastructure + golden snapshots + real-world data collection

## Communication Protocol
CLI Claude writes status updates to: `C:/PRISM/state/shared/backend-status.md`
You write status updates to: `C:/PRISM/state/shared/frontend-status.md`
Both read each other's files to stay coordinated.

## One Rule
Don't modify files in `src/engines/` or `src/tools/dispatchers/` — that's CLI Claude's domain.
Your domain: `web/src/`, `src/routes/`, frontend components, CSS, visualization.
