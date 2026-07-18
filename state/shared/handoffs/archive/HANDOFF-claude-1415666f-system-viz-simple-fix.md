---
terminal: claude-1415666f
topic: system-viz-simple-fix
source: live-chat
state: U-VIZ-PERF shipped d2833bfd9; type=module fix was reverted; need async-IIFE wrapping instead
generatedAt: 2026-05-11T01:55:00Z
---

# RESUME

Finish U-VIZ-PERF simple viewer fix.

## CRITICAL UPDATE
My earlier "change script to type=module" edit was REVERTED (system-reminder
confirmed at line 107 of `simple.html` shows plain `<script>` tag, intentionally
kept). DO NOT re-add `type=module`. Instead, wrap the top-level `await` in an
async IIFE — plain `<script>` tag does not support top-level await.

## STEPS

1. Read `H:/prism/state/shared/system-viz/simple.html` around line 133.
   The bare block:
   ```js
   try { G = await loadGraph(true); } catch (e) { ... }
   ```
   currently sits at top level. Needs to be wrapped.

2. **Easiest fix**: wrap the entire top-level script body in:
   ```js
   (async () => {
     // all current top-level code
   })();
   ```
   Single edit, no restructuring needed.

3. **If hoisting is needed**: declare `let G, layout, mode, edgesOn, pinned,
   hovered` at top level with plain `let` (without initialization), then
   inside the IIFE assign `G = await loadGraph(true)`, call `computeLayout()`,
   `resize()`, `refreshHud()`. Event handlers added later in the file
   reference these.

4. Verify viz server is alive:
   ```bash
   curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8765/
   ```
   If not 200, restart:
   ```bash
   H:/Tools/nodejs/node.exe H:/prism/state/shared/system-viz/_server.cjs
   # run_in_background: true
   ```

5. Commit:
   ```bash
   cd H:/prism && git add state/shared/system-viz/simple.html && git commit \
     -m '[CAD-FUSION-LIVE-MS0]/U-VIZ-PERF-FIX: wrap top-level await in async IIFE'
   ```

6. Tell user to Ctrl+Shift+R http://127.0.0.1:8765/

## AFTER FIX VERIFIED

Continue last 15% layer-saturation:
- **L5 "other" bucket reclassifier** — 2167 mis-classified engines. Use
  import-pattern analysis (which engines does this one import? bucket by
  dominant import target's domain).
- **L1 frontend apps** — `cqask/ui` + `mcp-cadquery/frontend` not drilled.
  Each is ~50-100 React/Vite components.
- **L7 registry entries** — 29,569 entries across 14 registries. Discover
  data dir paths via `mcp-server/data/state/*-catalog.json` files.
- **L9 fs-deep --full mode** — current 2,695 dirs is partial walk; `--full`
  saturates to ~40K.
- **Engine→engine semantic edges** — beyond imports, "produces type X /
  consumes type Y" semantic flow.

## CONTEXT

Five commits this session:
- `c4672f4f5` U-VIZ-COMBO
- `1cc6c68a7` U-VIZ-SATURATE (engine-saturate / wiki / formulas / personas
  + merge OOM fix via byId Map hoisting)
- `95bc680ff` U-VIZ-SATURATE2 (skills / schemas / algos / transports / AI tiers)
- `72c3547ff` U-VIZ-SATURATE3 (introduced L4a action layer, 9228 atomic action
  nodes)
- `165b53362` U-VIZ-SATURATE4 (hooks 426 / tests 3175 / scripts 459 /
  memories 189 + 3803 action→engine edges)
- `d2833bfd9` U-VIZ-PERF (simple 2D viewer + skeleton endpoint + gzip/brotli)

**Graph state**: 126,441 nodes / 136,106 edges / schema 2.24.0 / 13 layers
(L0-L11 + L4a).

**Ghost surface**: 2,598 nodes / 4,133 edges.

**Layer counts** (built/atomic):
- L0 13 personas · L1 165 (146 atomic pages) · L2 20 transports
- L3 33 AI tiers · L4 97 dispatchers · **L4a 9228 actions**
- L5 3243 engines · L6 6994 cores (skills/schemas/algos/formulas/hooks/
  tests/scripts/memories)
- L7 27 registries · L8 869 knowledge · L9 2695 dirs · L10 391 vault
- L11 102666 files

**Performance benchmarks** (curl localhost):
- full raw 74MB/70ms
- full gzip 6.1MB/670ms
- full brotli 4.2MB/330ms
- skeleton 2.1MB/670ms
- **skeleton gzip 172KB/5ms** (the fast path)

**Server has**: in-memory cache + content-encoding negotiation (br > gzip >
raw) + skeleton endpoint that ships only L0-L7 (drops L4a, L9, L10, L11 and
big meta arrays).

**Routes**:
- `/` → `simple.html` (2D Canvas, zero deps — BROKEN: top-level await without
  module type)
- `/3d` → `system-viz.html` (Three.js from unpkg CDN — works because it uses
  type=module via importmap; silent CDN failure suspected as the original
  render-failure cause that started this whole work)
- `/simple` → `simple.html` (alias)

Both viewers fetch `/system-graph-skeleton.json` by default, upgrade to full
graph on `F` key or `Full` button.

**simple.html is 23KB**, vanilla Canvas 2D, zero external deps. The only
remaining bug is the top-level await needing IIFE wrap (or another approach
preserving the plain `<script>` tag).

## PEER CLAIMS AT CRASH

Do NOT touch any of these files:
- `claude-99eca613` — various `state/shared/audit-findings/revenue-roadmap/`
  JSONs (round1/round2/round3 audit findings)
- `claude-845cf238` — `OutcomeEpisodicMemoryBridgeEngine.ts` + its test +
  `aiReasoningDispatcher.ts` + `aiReasoningActionSchemas.ts`
- `claude-2d87fea3` — `TribalKnowledgeEngine.ts`

## WORKING DIRECTORY

`H:/prism` (main worktree, branch `cad-fusion-live-ms0`)

## COMMITS TO PUSH

Branch is 2 ahead of `origin/cad-fusion-live-ms0` (push pending; git-sync-stop
handles it).
