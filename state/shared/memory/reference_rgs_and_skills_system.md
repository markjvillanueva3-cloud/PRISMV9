---
name: RGS & PRISM Skills System
description: /rgs = Roadmap Generation System (7-stage pipeline). 250+ skills across 3 tiers. MASTER_INDEX not yet wired into /rgs (audit gap).
type: reference
---

## /rgs — Roadmap Generation System
- 7-stage pipeline: Brief Analysis → Codebase Audit → Scope Estimation → Phase Decomposition → Unit Population → Dependency Resolution → Output Formatting
- State tracking: `mcp-server/data/state/RGS/position.json`
- Schema: `src/schemas/roadmapSchema.ts` (RoadmapEnvelope, RoadmapPhase, RoadmapUnit, RoadmapStep)
- Classified as opus_tier

**Known gap (2026-03-30):** /rgs and /rgs-sync do NOT consume MASTER_INDEX.json. They should read it for full system awareness during roadmap generation.

## Skills System Overview
- 250+ skills across 3 tiers (haiku, sonnet, opus)
- Skills defined in `.claude/commands/` (user-level) and project commands
- 14 superpowers (priority=100)
- 10 context-triggered auto-skills

## 3-Tier Model Routing
- **Haiku** (~50): calc, material-lookup, tool-catalog, quick-ref, navigate, code-index, etc.
- **Sonnet** (~100): feasibility-check, scope, scrutinize, forge-*, test, calibrate, quality-gate, etc.
- **Opus** (~70): autopilot, forge, rgs, full-job, print-to-program, quote-job, physics-verify, etc.

## Key Pipeline Skills
- `/rgs` — Roadmap Generation System (opus)
- `/print-to-program` — Full drawing→G-code pipeline (opus)
- `/quote-job` — Physics-backed job quoting (opus)
- `/autopilot` — Autonomous execution mode (opus)
- `/forge-triple` — Hook + MCP action + skill generation (opus)
- `/prism-review` — Multi-agent code review

**How to apply:** When user says `/rgs`, it means "generate a full roadmap using the 7-stage RGS pipeline." Check that MASTER_INDEX wiring is done before relying on /rgs for complete system awareness.
