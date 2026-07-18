---
source: project
section: SYSTEM VIZ — Live System Map
slug: system-viz-live-system-map
indexed_at: 2026-05-09T00:28:46.019Z
---

## SYSTEM VIZ — Live System Map

3D atomic-first neural-network visualization of the entire PRISM codebase. Graph at `state/shared/system-viz/system-graph.json` (~193 KB) embeds `meta.roadmap.phases` for atomic-first roadmap planning — every new milestone unit must respect tier-floor dependencies surfaced here.
- Slash command: `/system-viz` (regenerates graph, starts local server :8765, opens browser)
- Query adapter: `node scripts/system-viz-query.mjs <query>` (e.g. `--node <id>`, `--phase <n>`, `--unwired`)
- Authoritative directive: `state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md` (read for full schema, atomic-first principle, query patterns)
- Wiki entry: `knowledge/wiki/architecture/system-viz.md`
- Awareness surface (auto-inject candidate): `state/shared/SYSTEM-VIZ-AWARENESS.md`

Use before any roadmap edit, gap audit, wiring batch, or "what depends on X" question — the graph is the dependency oracle.
