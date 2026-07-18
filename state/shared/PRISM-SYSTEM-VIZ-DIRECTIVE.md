# PRISM System-Viz Directive

> **Authoritative rule set for using the Live System Map in planning, roadmapping, and execution.**
> Authored 2026-05-08. Owner: viz at `H:/prism/state/shared/system-viz/`.

## What

`system-viz` is the **canonical live system map** of PRISM — 10 layers, 334 nodes, 627 edges, generated from real filesystem + `BUILD_STATE.json` state. It supersedes:
- Hand-drawn architecture diagrams
- Stale milestone roadmap docs that don't reflect git reality
- Ad-hoc grep-based exploration

When the viz disagrees with a written doc, **the viz wins** (it's regenerated from source of truth).

## Where

| What | Path |
|------|------|
| Merged-graph producer | `H:/prism/scripts/regen-viz.mjs` (full pipeline → `system-graph.json`; also run by `POST /regenerate`) |
| Architecture-only producer | `H:/prism/scripts/generate-system-viz.mjs` (→ `architecture-graph.json`, ~20k nodes; does NOT write the merged graph) |
| Single writer of merged graph | `H:/prism/scripts/merge-augmentations.mjs` (always via `writeGraphStreaming`) |
| Query adapter (for tools) | `H:/prism/scripts/system-viz-query.mjs` |
| OOM-safe graph reader | `H:/prism/scripts/lib/graph-io.mjs` (`readGraphStreaming`) |
| Viewer HTML | `dashboard.html` (status dashboard, served at `/`) + `viz3d.html` (3D point cloud, served at `/3d`) under `H:/prism/state/shared/system-viz/` |
| Local server | `H:/prism/state/shared/system-viz/_server.cjs` (port 8765) |
| Generated graph | `H:/prism/state/shared/system-viz/system-graph.json` (~570 MB) |
| Slash command | `/system-viz` |
| Wiki entry | `knowledge/wiki/architecture/system-viz.md` |

## When to use

| Scenario | Action |
|----------|--------|
| Planning a new milestone | Run `/system-viz`, open `/3d`, search (`/`) for `unwired` / `L5` nodes → propose work that wires them |
| Drafting a master roadmap (rgs / forge) | Read `system-graph.json` programmatically; pull unwired domains, pending merges, drift milestones into the roadmap |
| Considering a new engine | Search the viz first; if a node already exists, extend it rather than create new |
| Considering a new frontend page | Check L1 — if `cqask` or `mcp-cadquery` are still magenta-pulsing (pending), merge them before adding new pages |
| Scheduling a non-trivial edit | Check peer file claims (`mcp-server/data/claims/`) → if your target file is claimed, fork to a sibling worktree per CLAUDE.md conflict-fork rule |
| Refactoring | Click the node → upstream/downstream pills show full blast radius (no more grep-by-symbol) |
| Drift reconciliation | Flashing red node = envelope says complete, git says not. Run `/envelope-sync` |
| Onboarding a new chat / agent | Query the graph via `master_index_query` / `readGraphStreaming` — **never `cat system-graph.json`** (it is ~570 MB, not 174 KB; cat/`JSON.parse`-ing it as a string blows V8's ~512 MB cap) |

## How to use programmatically (rgs / forge / roadmap tools)

```js
// system-graph.json is ~570 MB — JSON.parse(readFileSync(...,'utf8')) throws
// RangeError: Invalid string length (V8 ~512 MB string cap). Use the streaming reader:
import { readGraphStreaming } from 'H:/prism/scripts/lib/graph-io.mjs';
const G = readGraphStreaming('H:/prism/state/shared/system-viz/system-graph.json'); // sync → { nodes, edges, ... }

// 1) Find unwired engine domains — these are roadmap candidates
const unwiredDomains = G.nodes
  .filter(n => n.layer === 'L5' && n.subgroup === 'unwired')
  .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

// 2) Find pending frontend merges — high-leverage low-cost work
const pendingMerges = G.nodes.filter(n => n.status === 'pending_merge');

// 3) Find drift milestones (claim vs git)
//    Drift count is in G.meta.headline.drift, list is in BUILD_STATE.json

// 4) Get downstream blast radius for a candidate refactor
function downstream(id, depth = 3) {
  const visited = new Set([id]); const out = [];
  let frontier = [id];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const e of G.edges) if (frontier.includes(e.from) && !visited.has(e.to)) {
      visited.add(e.to); out.push(e); next.push(e.to);
    }
    frontier = next;
  }
  return out;
}
```

Or use the adapter `node H:/prism/scripts/system-viz-query.mjs <command>`:
- `roadmap-candidates` — emits unwired + pending + drift as roadmap-shaped JSON
- `blast-radius <nodeId>` — downstream edges for refactor planning
- `dispatcher-summary` — actions/engine counts per dispatcher
- `coverage-by-domain` — wired-ratio per engine domain

## Atomic-First Build Principle (ENFORCED for every roadmap)

**Build the lowest tier first. Each tier consumes the one beneath. Never start a higher-tier feature while its lower-tier blocks are missing.**

| Tier | Layer in viz | Examples | Build order |
|------|--------------|----------|-------------|
| 0 | L6–L9 | Physics constants, formulas, algorithms, registries, schemas, hooks, scripts, filesystem | **Foundation — build/fix first** |
| 1 | L5 | Engines (3,173) | After tier 0 stable |
| 2 | L3, L4 | Dispatchers (97), AI hierarchy (12) | After tier 1 wiring done |
| 3 | L2 | Transport (REST, WS, auth, rate-limit, telemetry) | After tier 2 schema-stable |
| 4 | L1 | Frontends + 144 pages | After tier 3 contracts frozen |
| 5 | L0 | Personas | UX validation last |

**Why this ordering matters for exponential value:**

Building one Tier-0 atomic primitive (e.g. a new Kienzle constant table or formula module) cascades upward:
- Unlocks 5–20 Tier-1 engines that consume it
- Which become callable through 1–4 Tier-2 dispatchers
- Which expose new actions on Tier-3 transport
- Which power N Tier-4 pages
- Which serve every Tier-5 persona

Conversely, building a Tier-4 page first when its Tier-1 engine is unwired produces a **dead pixel** — the UI exists but does nothing. We have 38 specialty pages today that may be in this state.

The viz visualizes this directly:
- **Atomic overlay** (key `6`) colors nodes by tier — cyan foundation glows brightest
- **Cascade overlay** (key `7`) — click any node, see how its impact ripples up
- **Suggestions overlay** (key `8`) — phantom yellow edges show where unwired engines should logically connect (3 candidate dispatchers per unwired domain)
- **Target-state overlay** (key `9`) — red highlights every gap node; everything else dims to show how close the system is to "complete"
- **Roadmap export** (key `M` or 🗺 button) — produces atomic-first markdown roadmap directly consumable by `rgs` / `forge`

## Rules for rgs / forge / roadmap chats (claude-99eca613 and successors)

1. **Always read `system-graph.json` before drafting roadmap units.** If you propose work for an engine domain that's already wired (green), justify why; default is reject.
2. **Atomic-first ordering is non-negotiable.** Use the embedded `meta.roadmap.phases` array verbatim as the master skeleton: Phase 0 drift → Phase 1 atomic foundation → Phase 2 wire-up → Phase 3 pending merge → Phase 4 new build. Higher phases must wait until lower phases are <10% gap.
3. **Use `node.tier` as the dependency-depth oracle.** Never propose a Tier-N unit if its Tier-N-1 prerequisites have unfilled gaps in the same vertical column.
4. **Use `node.suggestedDispatchers` for wiring proposals.** Don't invent target dispatchers — the generator already proposed 3 candidates per unwired domain by name + category match.
5. **Use `node.unlocks.leverageScore` to rank within a phase.** Highest leverage (engineCount × dispatcherTargets) wins. The exported roadmap is pre-sorted by this.
6. **Pending-merge nodes outrank net-new code.** A merge unblocks already-built work; new code creates more unwired engines.
7. **Use `meta.headline.built / meta.counts.engines` as the single % done metric.** Show on every roadmap milestone.
8. **Cross-reference Claims overlay before generating phase claims.** If a file you'd lock is already red in `/file-claims`, route around it.
9. **Don't propose duplicate engines.** Search the graph; if any L4/L5 node label contains the proposed name, extend the existing one.
10. **Export the markdown roadmap and commit it.** `M` key in viewer or `node scripts/system-viz-query.mjs build-order` produces a ready-to-commit `PRISM-MASTER-ROADMAP-<date>.md`.

## Refresh cadence

- On demand: `/system-viz` or `POST /regenerate`
- Automatic: viewer auto-polls every 30 s and rebuilds when `generatedAt` changes
- Recommended cron while developing: regenerate every 30 min
- Mandatory before any `/rgs` or `/forge` planning session

## Failure modes

| Symptom | Fix |
|---------|-----|
| Viewer shows stale data | Press `R` in viewer or `POST /regenerate` |
| `/file-claims` returns `[]` | Normal if no peer chats are active; otherwise check `mcp-server/data/state/session-file-ownership.json` |
| Server won't start on :8765 | `Get-NetTCPConnection -LocalPort 8765` to find existing process; kill before restart |
| Three.js fails to load | CDN block — replace `unpkg.com/three@0.160.0` import map with a local copy |

## Authority

This directive supersedes any prior architecture-diagram convention in PRISM. Update this file when adding new layers, endpoints, or rules. Wiki entry mirrors and links here.
