# SYSTEM VIZ — Awareness Card (auto-inject candidate)

**One line:** PRISM has a live 3D atomic-first system map of the entire codebase — engines, dispatchers, hooks, skills, wiki, memories, and roadmap phases — wired as a 10-layer neural-network graph.

**Location:** `state/shared/system-viz/` — graph at `system-graph.json` (~193 KB), viewer at `system-viz.html`, server `_server.cjs`.

**Slash command:** `/system-viz` — regenerates graph, starts local server on :8765, opens browser.

**Query adapter:** `node scripts/system-viz-query.mjs <flags>` (programmatic graph access for chats).

## Atomic-first principle

Every node carries a tier-floor and dependency edges. The graph's `meta.roadmap.phases` skeleton enforces atomic-first planning: a new milestone unit may not be claimed until every node it depends on is BUILT and WIRED at a tier ≥ its tier-floor. This makes the viz the canonical dependency oracle — roadmap edits, gap audits, and forge passes that bypass it cause the silent-rot class of build drift PRISM exists to eliminate. Treat the graph as authoritative and regenerate after wiring changes so the next chat sees current state.

## When to use this

- Before any roadmap edit (claim a phase, add a unit, mark shipped)
- Before any gap audit (`/audit-task`, `/forge-audit`) — subtract built nodes from your gap list
- Before any wiring batch — surface unwired engines/orphan dispatchers in one query
- Before answering "what depends on X" or "what's the blast radius of editing Y"
- Before forge3/forge4 runs — Phase 0.6 binds the viz as the dependency oracle
