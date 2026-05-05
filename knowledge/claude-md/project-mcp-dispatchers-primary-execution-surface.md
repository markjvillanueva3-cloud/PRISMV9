---
schema_version: 1.0.0
source: project
section: MCP DISPATCHERS (primary execution surface)
slug: mcp-dispatchers-primary-execution-surface
start_line: 75
end_line: 83
indexed_at: 2026-05-05T13:49:55.468Z
content_hash: 77f2a3925acda89351efea050a52f249de0b946beea459672cd5018fcd46f93c
mirror_engine: ClaudeMdChunkerEngine
---
## MCP DISPATCHERS (primary execution surface)
PRISM exposes every capability as an MCP dispatcher action. Prefer these over inlining logic:
- `prism_calc` (manufacturing physics) • `prism_cam` / `prism_cad` / `prism_turning` / `prism_5axis`
- `prism_ai` (reasoning/deep learning) • `prism_intelligence` • `prism_safety` • `prism_omega`
- `prism_session` • `prism_context` • `prism_dev` (build/quality/inventory) • `prism_memory`
- `prism_orchestrate` / `prism_autopilot_d` / `prism_atcs` for multi-step orchestration

Full map in `DISPATCHER_DIGEST.md`. Every dispatcher has an `action` enum — action list also in tool descriptions.
