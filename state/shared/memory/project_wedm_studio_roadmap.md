# WEDM Studio Roadmap State

## Created: 2026-04-01
## Status: Scrutinized, ready to execute

## Milestones
- **WEDM-MS0**: Core 6-step wizard (Import → Program) — 21 units, 7 sessions
  - Envelope: `H:/prism/mcp-server/data/milestones/WEDM-MS0.json`
  - Registered in roadmap-index.json (milestone #288)

- **WEDM-MS1**: Full capability enhancement (Taper/UV, Surface Integrity, Quality, Adaptive) — 24 units, 8 sessions
  - Envelope: `H:/prism/mcp-server/data/milestones/WEDM-MS1.json`
  - Depends on WEDM-MS0
  - Registered in roadmap-index.json (milestone #289)

## Combined: 45 units, 15 sessions, 35/35 WEDM pipeline actions covered

## Scrutiny Results — Round 1 (Plan-Level, 40 agents)
- WEDM-MS0 avg: 89/100
- WEDM-MS1 avg: 83/100
- Combined average 83/100

## Scrutiny Results — Round 2 (Deep 10-Role Review, 2026-04-01)
- 10 agents, R1 avg: 62.8 → fixed roadmap → R2 avg: **75.9** (+13.1)
- 7 blockers fixed: compliance standards, Quick Generate, auth, physics, StepOptimize, rollbacks, formulas
- Both WEDM-MS0.json and WEDM-MS1.json patched with 30 total edits

## Scrutiny Results — Round 3 (20-Role Discovery, 2026-04-01)
- Original 10 re-scored: avg 75.9. 10 NEW roles: avg 45.7. Full 20-agent: 60.8
- NEW BLOCKERS found: DXF parser gap, G-code engine bugs, test specs

## Scrutiny Results — Round 4 (20-Role Final Verification, 2026-04-01)
- Fixes applied: DXF parser unit (U-WEDM00), WCAG specs, tooltips, data_architecture, IQ/OQ/PQ, test files
- **Spec-quality agents (14): avg 80.1/100** (range 69-91)
- Code-reality agents (6): avg 46.8/100 (expected — WEDM-MS0 is not_started)
- Full 20-agent blended: 70.2/100
- Top scores: Domain 91, UX 89, Quality 86, Integration 86, Data 85, Frontend 84
- Improvement: R1 62.8 → R3 75.9 → R4 80.1 (spec-quality metric)
- Total scrutiny: 60 agent-runs across 4 rounds, 3 fix cycles
- Remaining ceilings: Carslaw-Jaeger units, fatigue formula inconsistency, security encryption/CSRF

## Key Design Decisions (from 10-agent scrutiny)
1. 2D Canvas (not Three.js extrusion) — correct for Wire EDM XY profiles
2. Per-step local state (not monolithic useReducer) — matches PpgContext pattern
3. Stale marking (not cascading deletion) — preserves user work
4. Multipart upload (not base64) — handles 10MB+ CAD files
5. Quick Generate fast track — one-click DXF-to-program
6. New dedicated page at /wire-edm — avoids state collision with EdmPage
7. Tabbed sub-sections in StepOptimize (Process/Surface/Logistics) — prevents 13-panel overload
8. Layer toggle system for ProfileCanvas — 20 overlay types catalogued
9. All 6 controller dialects (Fanuc, Mitsubishi, Sodick, AgieCharmilles, Makino, Accutex)
10. Industry spec compliance (AMS 2628, ASTM F86) with per-material limits

## To Resume
Run `/rgs continue WEDM-MS0` to start Session 1 (backend routes + types + API layer)

## Files Modified (roadmap-only, no code yet)
- `H:/prism/mcp-server/data/milestones/WEDM-MS0.json` — created
- `H:/prism/mcp-server/data/milestones/WEDM-MS1.json` — created
- `H:/prism/mcp-server/data/roadmap-index.json` — updated (287→289 milestones)

## Revised Plan File (copy from local)
Original plan at: `C:\Users\wompu\.claude\plans\temporal-crafting-lovelace.md`
Superseded by the milestone JSONs above (which contain the full plan)
