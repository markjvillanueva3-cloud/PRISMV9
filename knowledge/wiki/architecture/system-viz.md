---
type: architecture
created: 2026-05-08
tags: [visualization, dev-tools, system-map, neural-network, three-js, observability]
related: [build-state, dispatcher-digest, engine-digest]
---

# System Viz — PRISM Live System Map

## Summary

Interactive 3D visualization of the entire PRISM platform as a 10-layer neural network. Every layer from user personas down to filesystem is rendered as concentric rings with live edge connections. **Generated from live codebase state** — not a static diagram.

## Layers (top → bottom)

| Layer | Contents | Source |
|-------|----------|--------|
| L0 Personas | Operator / Programmer / Quoter / Boss / Admin | hardcoded |
| L1 Frontend | mcp-server/web (144 pages → 14 functional clusters), cqask/ui (pending), mcp-cadquery (pending), CLI, Mobile | live `webPages` scan |
| L2 Transport | MCP / REST / gRPC / GraphQL / WS / Auth / Rate / Telemetry | hardcoded |
| L3 AI Hierarchy | Tier-1 Claude · Tier-2 FullSystemAICoordinator · 7 Tier-3 specialists · 4 Ollama models | hardcoded |
| L4 Dispatchers | All 97 individual `*Dispatcher.ts` files, color-coded by category | live filesystem scan |
| L5 Engine Domains | 24 wired domain clusters + top 16 unwired domains | `BUILD_STATE.json` |
| L6 Cores | algorithms / schemas / physics constants / formulas / tests / hooks / scripts / skills | live counts |
| L7 Registries | All 26 registry files + 4 catalog summaries | live filesystem scan |
| L8 State / Wiki | wiki sub-categories + memory types + state subdirs + JM Die corpus | live filesystem scan |
| L9 Filesystem | Top-level `H:/prism/*` directories | live filesystem scan |

## Why it matters

- Single-pane-of-glass for the entire 3,173-engine / 97-dispatcher / 7,302-action codebase
- Shows what's built vs what's unwired vs what's drift in real time
- Click any node → side-panel with id / label / layer / status / info **+ clickable Obsidian deep-links** (📖 wiki, 🧠 memory → `obsidian://`; `showNode()` in `viz3d.html`)
- Search any node → highlights it **and reports a live match count** (`N matches` / `no match (typo? or outside sampled set)`) in the topbar — without it a typed or deep-linked query that hits 0 nodes dims the whole cloud identically to a 1-node off-screen match, giving no feedback; reserved words `brain`/`gap` highlight Obsidian-covered vs knowledge-gap nodes (count shows `N with notes`/`N gaps`); the stats bar shows `🧠 N% brain` coverage
- Deep-link INTO the viz: `/3d?q=<term>` (shareable filtered view — and if the term resolves to **exactly one** node, e.g. a dashboard orphan-punch-list link, its side panel auto-opens so you land on the node's details + neighbors instead of hunting one dot; brain/gap coverage words are exempt) · `/3d?node=<id>` (open a node's panel)
- Click → blast-radius: the side-panel fetches `/api/node-neighbors?id=` and lists the node's in/out graph neighbors (capped top-8/dir, with edge type) as clickable `/3d?node=` links → click-through navigation. Served from the `node-adjacency.json` sidecar, not the snapshot (per-engine edges live only in the 695 MB merged graph)
- Dashboard (`/`) shows a **System-viz health** panel: regen verdict/age/size, pending augmentations, node/edge/dead-edge integrity, and **master-index sidecar freshness** (mirrors `loadGraph`'s `sourceMtimeMs >= graph.mtime` gate via a 512-byte sidecar-head read — a stale sidecar silently drops fleet-wide search to the architecture-graph fallback; the card shows `Nh behind graph` + the `build-graph-index.mjs` rebuild hint). It also distinguishes a **FAILED rebuild with its cause** (OOM / schema-drift / disk) from plain old-graph staleness, via the `.last-index-build.json` breadcrumb `build-graph-index.mjs` writes on every success+failure — a non-fatal rebuild failure inside regen-viz used to vanish into a `console.error` (R12). All from light sidecars / fd-reads — no graph parse
- Dashboard (`/`) also shows a **Graph utilization** panel: hub / sink / **orphan** (built-but-unwired punch list) / **ghost** (dead-code / unrealized-roadmap) counts + scanned fraction + snapshot age + the **top-10 orphan names** — each a clickable `/3d?q=<name>` deep-link that opens the orphan highlighted in the 3D map, turning the wiring punch list into one-click navigation (not just a count, and not just a name to then go hunt) — parsed from `state/shared/AWARENESS-SNAPSHOT.md` (~4 KB precomputed markdown — no graph parse). Puts the fleet-wide wiring punch list on the landing page; full per-node classification via `/utilization-dashboard`
- Multi-chat claims overlay → see files locked by peer Claude/Codex/Gemini sessions
- Replaces grep-driven discovery for newcomers and refactor planning

## Files

- Merged-graph producer: `H:/prism/scripts/regen-viz.mjs` (full pipeline; also `POST /regenerate`)
- Architecture-only producer: `H:/prism/scripts/generate-system-viz.mjs` → `architecture-graph.json` (~20k nodes; NOT the merged graph)
- Single writer of merged graph: `H:/prism/scripts/merge-augmentations.mjs` (via `writeGraphStreaming`)
- OOM-safe reader: `H:/prism/scripts/lib/graph-io.mjs` (`readGraphStreaming` — the ~570 MB graph exceeds V8's ~512 MB string cap, so never `JSON.parse(readFileSync(...,'utf8'))`)
- Adjacency sidecar: `H:/prism/scripts/build-viz-adjacency.mjs` → `node-adjacency.json` (capped top-8/dir node-neighbors for the blast-radius side-panel + `/api/node-neighbors`; **auto-rebuilt as a `regen-viz` post-merge stage**, in-lock after the last graph writer — was previously hand-run-only and went stale after every regen)
- Find-cache sidecar: `H:/prism/scripts/lib/system-viz-graph.mjs` (`loadFindCache` lazy reader + `regenFindCache` eager writer) → `find-cache.json` (~56 MB slim 6-field per-node projection for `findInGraph` — the substrate behind `viz-first-redirect` + the four `pre-*-graph-inject` hooks, ~1060 `find` calls/day). **Auto-rebuilt as a `regen-viz` post-merge stage** via `scripts/regen-find-cache.mjs` (after `build-viz-adjacency`, in-lock). DEFECT CLOSED: was built ONLY lazily by the first `find` cache-miss, which paid the full ~695 MB graph cold-parse inside the ~1500 ms hook budget → timeout → the node-context inject silently failed fleet-wide. Eager regen keeps every hook on the ~540 ms warm-parse path. Reuses the SAME `writeSidecarAtomic` primitive as the lazy path (byte-identical sidecar, schemaVersion 1 — a pure drop-in producer)
- Query adapter: `H:/prism/scripts/system-viz-query.mjs` (subcommands incl. `cache-status` — **stat-only** freshness of find-cache + graph-index vs the live graph, each judged by its OWN consumer's gate [find-cache = exact mtime+size · graph-index = `sourceMtimeMs ≥ graph.mtime`], fraction-aware; exit 0 iff both fresh so hooks/scripts can gate a `regen-find-cache` on it — never loads the 695MB graph)
- Brain-coverage marker (`U-SV-NOTECOUNT-BRIDGE-SURFACE`, commit `fb117e7649`): the find-cache projection carries a structural `noteCount` (= `knowledge.wikiEntries.length + memoryEntries.length`, set only when >0; **not** in `FIND_FIELDS`, so search ranking is unchanged). The `find` HUMAN path appends a trailing **ASCII** ` [docs:N]` marker per hit when `noteCount>0` (deliberately not an emoji — survives grep / PowerShell codepage / the c-to-h mirror; end-anchored `\d+` → collision-safe, no real label ends in `[docs:N]`). `viz-first-redirect.parseFindOutput` strips + captures it into `hit.noteCount`; `formatInjection` surfaces ` (N docs)` so the model routes to **documented** nodes first (memory/wiki × context-retention, the node-substrate lane — a COUNT, not content). `audit-viz-first-inject` passes the marker through verbatim. The emit↔parse contract is guarded by a round-trip test so drift fails loudly, not silently. Token-conscious callers use `find --brain-only` to trim to documented hits.
- Viewer: `H:/prism/state/shared/system-viz/dashboard.html` (status dashboard, `/`) + `viz3d.html` (3D point cloud, `/3d`)
- Server: `H:/prism/state/shared/system-viz/_server.cjs` (Node http, port 8765)
- Output: `H:/prism/state/shared/system-viz/system-graph.json` (~570 MB; ~300k nodes / ~1M edges)

## Endpoints

`GET /` (dashboard) · `GET /3d` (3D viewer) · `GET /api/snapshot` · `GET /api/graph-snapshot?limit=N` · `GET /briefing[.json]` · `GET /system-graph.json` · `GET /system-graph-index.json` · `POST /regenerate` · `GET /healthz`. (`/2d`, `/file-claims`, `/system-graph-light.json`, `/system-graph-skeleton.json` → 404 'not generated'.) Full route table is authoritative in `_server.cjs`.

## How to launch

`/system-viz` slash command — handles regenerate + server + browser open.

## Integration with rgs / forge / roadmap planning

`state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md` is the authoritative rule set:
- **Before proposing new milestones** — read `system-graph.json`, filter unwired engines, propose work that wires them
- **Before creating new engines** — search the graph for existing similar nodes (replaces `duplicationGuardEngine` proximity search with structural one)
- **Before proposing new frontend pages** — check pending-merge nodes; merge `cqask` / `mcp-cadquery` first
- **Before scheduling** — check `/file-claims` to avoid stepping on peer chats
- **For envelope-vs-reality reconciliation** — drift nodes flash red

## Auto-refresh

Generated on demand via `/system-viz` or `POST /regenerate`. The server adds `cache-control: no-store` so reload always shows fresh data. Recommended cron: every 30 min while developing.

## Authored

Generator + viewer built 2026-05-08 in session `claude-0413eca6` (CAD-FUSION-LIVE-MS0 worktree).
