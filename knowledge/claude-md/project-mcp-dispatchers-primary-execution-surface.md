---
source: project
section: MCP DISPATCHERS (primary execution surface)
slug: mcp-dispatchers-primary-execution-surface
indexed_at: 2026-05-02T20:38:22.486Z
---

## MCP DISPATCHERS (primary execution surface)

PRISM exposes every capability as an MCP dispatcher action. Prefer these over inlining logic:
- `prism_calc` (manufacturing physics) • `prism_cam` / `prism_cad` / `prism_turning` / `prism_5axis`
- `prism_ai` (reasoning/deep learning) • `prism_intelligence` • `prism_safety` • `prism_omega`
- `prism_session` • `prism_context` • `prism_dev` (build/quality/inventory) • `prism_memory`
- `prism_orchestrate` / `prism_autopilot_d` / `prism_atcs` for multi-step orchestration

Full map in `DISPATCHER_DIGEST.md`. Every dispatcher has an `action` enum — action list also in tool descriptions.
