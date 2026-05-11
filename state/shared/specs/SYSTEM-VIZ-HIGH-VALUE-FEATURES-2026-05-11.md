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

## 🅰 Tier A — ✅ SHIPPED (commit `[CAD-FUSION-LIVE-MS0]/U-VIZ-OVERLAYS-A`)

### A1. ✅ Blast-radius / impact overlay (in-viewer)
Click a node → an info-panel **💥 blast radius** button (or `B` key) → BFS the edge graph both directions: downstream deps (cyan) + upstream consumers (magenta), root yellow, everything else dimmed to 7%. Toast: "💥 blast radius "X": N consumers (↑ L5:12 L4:3 …) + M deps (↓)". Built an `outAdj`/`inAdj` edge-adjacency index at load; `BLAST_DEPTH=6`, `BLAST_MAX=6000`. Esc clears. *This is the in-viewer twin of `system-viz-query.mjs blast-radius <id>`.*

### A2. ✅ Knowledge-debt → wiki-ingest worklist (`generate-wiki-debt-worklist.mjs`)
Scans the graph for L4 (dispatchers) + L5 (engines) nodes that are 🔴 wholly undocumented (no `node.knowledge.wikiEntries`) or 🟡 weakly covered (fuzzy refs exist but none looks like *its* dedicated page — name doesn't appear in any referenced wiki path), ranks both by `leverageScore×1000 + edge-degree`, emits `state/shared/system-viz/WIKI-DEBT-WORKLIST.md` (top-80 per tier, `/wiki-ingest <name>` actions). Wired into `regen-viz.mjs` (post-merge, after the briefing). **First run: 135 undocumented + 1,405 weakly-covered of 1,650 L4+L5 nodes — only 110 have a real dedicated page** (a much starker number than BUILD_STATE's "776 with wiki", which counts fuzzy matches). Feeds `/curiosity-queue`. #1 priority right now: the `cam` dispatcher (degree 97), then `data`/`cad`/`edm`, then the CAD-router/adapter/indexer engines.

### A3. ✅ Stagnant / rot overlay (`S` key / legend row)
Colours every node by file age — `n.staleness.tier` (fresh/warm/stale/ancient → green→amber→red) or `mtimeDays` thresholds (7/30/90/180 days) when there's no tier; nodes with no staleness data dim to 10%. 727 nodes carry the data (from `generate-staleness-overlay.mjs`). Toast summarises the bucket counts. `S` toggles; mutually exclusive with the 📚 docs overlay; Esc clears. **Finds code that compiles but no one's touched in months → cleanup/curiosity candidates.**

*(All three landed in `system-viz-brain.html` + `generate-wiki-debt-worklist.mjs` + a `regen-viz.mjs` wiring line. The overlay rows in the legend are now mutually exclusive and a single `restoreBaseColors()` resets everything.)*

---

## 🅱 Tier B — ✅ SHIPPED (commit `[CAD-FUSION-LIVE-MS0]/U-VIZ-TIERB`)

### B1. ✅ Lgit → structure cross-links (the Lgit v2)
`generate-git-tree.mjs` now parses `git log --all --name-only -n250`, builds a slug→node-id table from the current graph's code-structure prefixes (eng./disp./reg./schema./alg./script./test./core./frontend./skill./formula./ai./wiki./mem — 9,579 entries), and emits `git.commit.<sha> --touched--> <node>` edges (≤30/commit, ≤4000 total). First run: **376 commit→code edges**. Commits also carry `n.scope` (the `[SCOPE-MS#]` subject prefix) for a future colour-by-milestone mode. So "what did milestone X change?" is now traceable in the graph. Runs in regen-viz where the heap flag is passed.

### B2. ✅ system-graph → Obsidian Canvas (the other sync direction)
`generate-vault-graph.mjs` (new) emits **`knowledge/PRISM-System-Map.canvas`** — a navigable JSON-Canvas summary (353 nodes / 880 edges: per-layer top-N by degree across L0/L1/L2/L3/L4/Lgit/L5/L7/L8, vertical layer columns, colour-coded to the brain palette, wiki-backed nodes as `file`-type cards that open the note) so the code map renders **inside Obsidian's canvas view**. Also emits `obsidian-vault-augmentation.json` — the wiki folder hierarchy (`vault.root` → 14 `vault.wiki.<folder>` / `vault.memories` L8 hubs, 785 `contains` edges to existing wiki/mem nodes) so the vault's own topology shows in the 3D map. Wired into regen-viz (FAST list) + merge-augmentations. *(Follow-up: have the `obsidian_viz_regenerate` dispatcher action shell out to this generator — currently it's regen-viz-only.)*

### B3. ✅ Multi-chat coordination overlay (`C` key)
The brain viewer now fetches `/file-claims` on load. **Info panel:** if a node's source file is claimed right now, shows "📌 file claimed by `claude-XXXX` · 3m ago — another chat is editing `<file>` right now". **`C` overlay / legend row:** highlights amber every node whose file is in the live claim ledger, dims the rest; toast summarises which chats hold claims and the total. The three colour overlays (📚 docs / 🕰 staleness / 📌 claims) are mutually exclusive and route through a single `toggleOverlay()` / `__clearAllOverlays()`; Esc clears all + any blast highlight. **A chat about to edit `SafetyEngine` now sees who else owns it, visually, before grabbing it.** *(Follow-up: enrich the info-panel claim line with the Lgit last-commit + the relevant decision-log entry.)*

---

## 🅲 Tier C — nice-to-haves (C1 + C5 ✅ shipped in `[CAD-FUSION-LIVE-MS0]/U-VIZ-POLISH-C`; C2/C3/C4 remain)

| # | Feature | Status | Note |
|---|---|---|---|
| C1 | **Scope-colored commits** — `Lgit` `git_commit` nodes are now coloured by a hash of their `[SCOPE-MS#]` tag (deterministic HSL, done generator-side in `generate-git-tree.mjs` *and* client-side in `system-viz-brain.html` so it shows even when the merged graph carries the older flat-lime colour — `mergeIndexedAugmentation` doesn't recolour existing nodes). Tips keep the bright lime-yellow. | ✅ | a glance at the Lgit layer shows which milestones are hot. |
| C5 | **Briefing ↔ graph deep links** — the brain viewer reads `?highlight=<term>`, `?overlay=docs\|staleness\|claims`, `?node=<id>`, `?blast=<id>` and pre-applies them on load; `/briefing` §7.6 gained a "Deep links" block (`http://127.0.0.1:8765/?overlay=docs`, `?highlight=lathe`, `?node=disp.camdispatcher`, `?blast=eng.calibration.calibrationengine`, plus the `/wiki/<p>` · `/vault/<p>` · `/2d` routes). | ✅ | a reviewing Claude (or the boss) clicks a link in the audit doc → lands on the right view. Ties the doc to the map both ways. |
| C2 | **Action-surface overlay** — trace `disp.X → action → engine` using the ~3,800 `actEng` edges; "show the real call graph." | ⏳ | the edges are already in the graph; just a filter+highlight (~30 lines). The viewer already has 4 overlays (📚/🕰/📌/💥) — add only if it earns the clutter. |
| C3 | **Closed-loop overlay** — colour engines by whether they have a wired feedback loop (per BUILD-VISION today only the SFC AI does). | ⏳ | needs a lookup table that doesn't exist yet — not actually "cheap"; defer. |
| C4 | **Drift flash** — pulse the milestone-envelope-drift nodes (`meta.headline.drift`). | ⏳ | only 2 drift cases now; genuinely low value — revisit when the count grows. |

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
