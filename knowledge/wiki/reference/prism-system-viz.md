---
title: "PRISM System Viz"
name: prism-system-viz
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_system_viz.md
promoted_at: 2026-06-06T04:55:56.319Z
source_refs: 20
---

# PRISM System Viz — permanent reference

The canonical live system map of PRISM. Generated from real filesystem + `BUILD_STATE.json`, NOT a static diagram.

## Locations

- **Slash command**: `/system-viz` (regenerate + start server + open browser)
- **URL when running**: http://127.0.0.1:8765/
- **Generator**: `H:/prism/scripts/generate-system-viz.mjs`
- **Query adapter**: `H:/prism/scripts/system-viz-query.mjs` (for rgs / forge / roadmap tools)
- **Viewer**: `H:/prism/state/shared/system-viz/system-viz.html`
- **Server**: `H:/prism/state/shared/system-viz/_server.cjs` (port 8765)
- **Generated graph JSON**: `H:/prism/state/shared/system-viz/system-graph.json` (~174 KB)
- **Wiki entry**: `H:/prism/knowledge/wiki/architecture/system-viz.md`
- **Authoritative directive**: `H:/prism/state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`

## When to use

| Scenario | Why |
|----------|-----|
| Drafting roadmap milestones | Shows what's actually built vs unwired vs drift |
| Considering new engine | Search first; reuse existing |
| Considering new frontend page | Pending merges (`cqask`, `mcp-cadquery`) come first |
| Refactor planning | Click node → full upstream/downstream blast radius |
| Multi-chat coordination | Claims overlay shows files locked by peer chats |
| Onboarding new chat | `cat system-graph.json` is the fastest orientation |
| Boss demos | 10-layer concentric-ring viz is impressive AND honest |

## Quick CLI usage

```bash
node H:/prism/scripts/system-viz-query.mjs headline                 # one-line summary
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates       # what to build next
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain       # wired-ratio per domain
node H:/prism/scripts/system-viz-query.mjs blast-radius eng.lathe   # refactor impact
node H:/prism/scripts/system-viz-query.mjs find kienzle             # search
```

## Authority

When the viz disagrees with a written architecture doc, the viz wins (it's regenerated from source of truth). Refresh cadence: regenerate before any `/rgs` or `/forge` planning session, or every 30 min while actively developing.

## Built

2026-05-08 in session `claude-0413eca6` (CAD-FUSION-LIVE-MS0 worktree). Generator + viewer + server + adapter + slash command + wiki entry + directive shipped together.

## Source

Promoted from memory [[reference_system_viz]] (referenced 20x across the vault). The memory remains the editable source of truth.
