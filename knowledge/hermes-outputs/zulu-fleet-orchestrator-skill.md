# ZULU Fleet Orchestrator Skill (Hermes)

**Purpose:** Allow ZULU (Hermes app) to fully orchestrate the PRISM fleet from the app while the 4 PS Windows Terminal tabs remain the worker execution surface.

## Actions Exposed

- `fleet_status` — Read live heartbeat + workboard + current account load
- `fleet_inject_brief` — Send targeted brief to specific slot/window
- `fleet_relaunch_window` — Trigger staggered relaunch of one quadrant (with account switch if needed)
- `fleet_account_switch` — Execute 90% limit staggered switch across 6 accounts
- `fleet_inject_awareness` — Force context injection into running tabs

## Implementation (MCP + Skill)

This skill wires the new `prism_builder:emulate_primary_builder` + existing `prism_orchestrate` + `prism_context` actions into a single high-level orchestrator.

**Key Behavior:**
- Always uses user's terse, outcome-first voice when communicating with the fleet.
- Respects 4-LOOP on every orchestration decision.
- Uses live heartbeat as source of truth.
- PS tabs stay in Windows Terminal; ZULU never moves them.

## Status
Built autonomously. Ready for wiring into Hermes config + MCP.