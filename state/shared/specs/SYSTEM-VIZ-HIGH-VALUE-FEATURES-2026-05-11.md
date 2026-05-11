# System-Viz — High-Value Feature Backlog (graph-as-oracle brainstorm)

**Generated:** 2026-05-11 · `/forge4` Phase-2 brainstorm against the live `state/shared/system-viz/system-graph.json` (156,063 nodes / 216,306 edges, 14-layer incl. the new `Lgit` git-DAG layer).
**Method:** the system-graph already carries far more per-node signal than the viewer surfaces — `status` (built/unwired/pending_merge/ghost), `tier`, `subgroup`, `unlocks.leverageScore`, `suggestedDispatchers`, `knowledge` (Obsidian wiki/memory backlinks), `awareness`, `businessValue`, `staleness`, scope/sha/date (Lgit), plus ~3,800 action→engine edges, ~41k vault-link references, layer-bridge edges, hook-bridges. Every feature below is "make an existing-but-buried signal legible." Ranked by (value × cheapness); the cheap-high-value ones ship first, the rest queue via `/loop` / `/schedule`.

---

## ✅ Shipped (this `/forge4` run) — Obsidian 2nd-brain ↔ system-viz link

| Piece | What |
|---|---|
| `/wiki/<relpath>` + `/vault/<relpath>` server routes (`_server.cjs`) | Serve any vault markdown (`knowledge/wiki/…` / `knowledge/…`) inline; accept the absolute `H:/prism/knowledge/…` paths that `obsidian-augmentation.json` stores in `node.knowledge.wikiEntries[].path`. Path-traversal guarded. WebFetch-friendly (`text/markdown`). |
| Brain-viewer info panel (`system-viz-brain.html`) | Clicking a node now renders a **📚 2nd-brain** section listing its wiki entries + memory hits as clickable `/wiki…` links — the map becomes the index into the vault. Data was already on the node (`n.knowledge` from the obsidian-augmentation merge). |
| **📚 docs-coverage overlay** (`D` key / legend row) | Dims every node *without* a wiki page (lime = documented). Mirrors the existing wiring-debt overlay — "knowledge debt" is now a visible layer, not a number. |
| `system-viz-obsidian-bridge-v2.mjs` → regen-viz pipeline | The obsidian-augmentation was stale relative to the post-atomization graph (only ~678 of the augmented ids still matched). Added the bridge to `regen-viz.mjs` so the vault↔graph backlinks auto-refresh on every `/system-viz` build. |

Why this matters: it makes the SVI/Ω story concrete (read "what fraction of the state space is documented" off the map), gives the boss-audit `/briefing` doc teeth ("click any engine → its design wiki page proving it's real"), and turns the 2nd-brain from a parallel artifact into a *linked* one — one direction done (vault → graph backlinks + viewer surfacing), the other direction (graph → Obsidian canvas) is item **B2** below.

---

## 🅰 Tier A — cheap, high leverage — do next

### A1. Blast-radius / impact overlay (in-viewer)
Click a node → BFS the edge graph (downstream deps + upstream consumers) and highlight the reachable subtree, dim the rest; a count badge ("touching this changes 4 engines / 1 dispatcher / 6 pages"). `scripts/system-viz-query.mjs blast-radius <id>` already computes it on the CLI — this is just wiring that into the viewer (reverse-edge index + a recursive color pass; the `childrenOf` map already exists, add a `consumersOf`). **Value:** every refactor needs this; it's the #1 reason the directive lists "refactor planning" as a use case. **Cost:** ~40 lines. **Queue:** ship in the next system-viz unit.

### A2. Knowledge-debt → wiki-ingest worklist (`generate-wiki-debt-worklist.mjs`)
The docs-coverage overlay (shipped) shows *where* the debt is; this turns it into a *queue*: read the graph, find L4/L5 nodes (dispatchers + engines) with no `node.knowledge.wikiEntries`, rank by `node.unlocks.leverageScore`, emit `state/shared/system-viz/WIKI-DEBT-WORKLIST.md` (top-N "run `/wiki-ingest <engine>`"). Wire into regen-viz. **Value:** closes the loop the overlay opens — a chat with idle budget picks the top item. Feeds the `/curiosity-queue` skill. **Cost:** ~60 lines (one generator). **Queue:** next.

### A3. Stagnant / rot overlay (`S` key)
`generate-stagnant-features.mjs` already puts `stagnant: 2,573 nodes` into the graph (last-touch age, no recent commits). Surface a color-by-staleness mode (fresh→green, rotting→red). **Value:** finds code that compiles but no one's looked at in months — candidates for the cleanup/curiosity queue. **Cost:** ~25 lines (data's already on the node). **Queue:** next, bundle with A1.

---

## 🅱 Tier B — medium cost, high value — schedule (`/loop` or `/schedule`)

### B1. Lgit → structure cross-links (the Lgit v2)
The `Lgit` layer (just shipped) plots commits + branches + the parent DAG, but commits are an island — no edges into the code structure. v2: for the most-recent ~150 commits, parse `git log --name-only`, map touched paths → graph node ids (`mcp-server/src/engines/FooEngine.ts` → the `eng.<domain>.fooengine` molecule, `src/tools/dispatchers/XDispatcher.ts` → `disp.x`, `.claude/hooks/*.mjs` → hook nodes, `scripts/*.mjs` → script nodes), emit `commit --touched--> <node>` edges. Then "what did milestone XPROC-NEURAL-CONNECT change?" is one click. **Cost:** the path→node-id map is the work (needs the 119 MB graph parsed for the valid-id set; do it in regen-viz where the heap flag is already passed). **Queue:** `/loop` it as a system-viz unit.

### B2. system-graph → Obsidian Canvas (the other sync direction)
`generate-vault-graph.mjs`: emit `knowledge/PRISM-System-Map.canvas` (JSON Canvas format) of the arch layers (L0–L7 + Lgit) so the code map renders *inside* Obsidian's canvas view — browse the system from your notes. Optionally also emit `obsidian-vault-augmentation.json` adding the ~12 wiki folders + top tags as L8 hub nodes (so the vault's own topology shows in the 3D map). Wire into `obsidian_viz_regenerate` (the dispatcher action already exists) + regen-viz + merge-augmentations. **Value:** "two brains, one source" — the payoff the OBSIDIAN-INTELLIGENCE-MS3 plan names. **Cost:** ~120 lines + merge wiring. **Queue:** schedule after B1.

### B3. Multi-chat coordination overlay (`C` key)
Fuse the existing `/file-claims` ledger + the Lgit "last commit per branch" data + the decision log (`knowledge/decisions/`) → click a node, the info panel shows "📌 claimed by `claude-XXXX` 3 min ago · last commit `abc1234` (`U-FOO-01`) · decision: <link>". The file-claim overlay already exists in the legacy viewer (`4` key); this brings it to the brain viewer and enriches it. **Value:** ~6 concurrent chats — a chat about to edit `SafetyEngine` sees who else has it, *visually*, before grabbing it. **Cost:** map `/file-claims` paths → node ids (similar to B1's path→id map) + an info-panel section. **Queue:** schedule after B2.

---

## 🅲 Tier C — cheap, lower value — nice-to-haves (bundle opportunistically)

| # | Feature | Cost | Note |
|---|---|---|---|
| C1 | **Scope-colored commits** — color `Lgit` commit nodes by their `[SCOPE-MS#]` prefix (already extracted as `n.scope`). | ~15 lines | a color-by-field mode; shows which milestones are hot. |
| C2 | **Action-surface overlay** — trace `disp.X → action → engine` using the ~3,800 `actEng` edges; "show the real call graph." | ~30 lines | the edges are already in the graph; just a filter+highlight. |
| C3 | **Closed-loop overlay** — color engines by whether they have a wired feedback loop (per BUILD-VISION today only the SFC AI does). | ~20 lines | makes the closed-loop gap visible; needs a small lookup. |
| C4 | **Drift flash** — pulse the milestone-envelope-drift nodes (`meta.headline.drift`). | ~10 lines | only 2 drift cases now; revisit when the count grows. |
| C5 | **Briefing ↔ graph anchors** — `/briefing` doc gains "→ open these in the map" links (e.g. `?highlight=domain:Lathe&overlay=wiring`); brain viewer reads query params and pre-applies overlay/search. | ~25 lines | ties the boss-audit doc to the live map both ways. |

---

## 🅳 Tier D — more involved — backlog (revisit when budget allows)

- **D1. Tribal-density heatmap** — color each engine node by # of tribal tips that reference it (query the tribal store / parse `node.knowledge` tags); shows where shop-floor learning is dense vs thin → feeds the closed-loop / curiosity decisions. *Cost: medium — needs a tip↔engine index.*
- **D2. Full `Lvault` layer** — every wiki/memory/decision `.md` as a graph node with `[[wikilink]]` edges (the vault's own knowledge graph, overlaid on the code graph). *Cost: medium-high — ~14k nodes; only worth it if the folder-level B2 version proves too coarse.*
- **D3. Schema-evolution trace** — a Tier-0 schema bump auto-flags every consumer needing migration (the v5-pointer #1 gap in `/forge4`). *Cost: medium — needs `src/schemas/*.ts` version parsing + a consumer index.*
- **D4. Dead-pixel auto-sweep** — `system-viz-query.mjs dead-pixels`: every Tier-4 page whose Tier-1 engine is unwired (the 38-specialty-page risk the `/forge4` anti-patterns name). *Cost: medium — graph query + report.*

---

## Suggested scheduling

```
/loop  A1 blast-radius overlay + A3 stagnant overlay (bundle)        # next system-viz unit
/loop  A2 wiki-debt worklist generator                               # next
/schedule  weekly  B1 Lgit→structure cross-links                     # the Lgit v2
/schedule  weekly  B2 generate-vault-graph.mjs + Obsidian canvas     # the other sync direction
/schedule  weekly  B3 multi-chat coordination overlay
```

Tier C items get picked up opportunistically whenever a system-viz unit is already touching the viewer. Tier D stays in the backlog until 3+ of them cause real friction (the `/forge4` v5-pointer discipline).

---

*Source of truth for the graph: `state/shared/system-viz/system-graph.json` (regen via `scripts/regen-viz.mjs`). Viewer: `http://127.0.0.1:8765/` (`/2d` fallback, `/briefing` exec-audit doc, `/wiki/<p>` vault files). Directive: `state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`.*
