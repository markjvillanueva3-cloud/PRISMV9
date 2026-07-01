---
title: System-Viz Galaxy — Resource Atlas (Where-to-REACH Index)
galaxy: system-viz
owner_slot: sierra
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "LOCAL pointers are verified PRISM paths (ls-confirmed 2026-06-10: engine dir, regen-viz.mjs, system-graph.json, node-card offset index + lib). ONLINE entries were each confirmed REACHABLE + FREE/LEGAL via live WebFetch on 2026-06-10 — every fetch returned the expected official repo / companion page / docs and the project name + license were read off the fetched page, not from memory. Candidates that failed verification were DROPPED, not guessed (R12): GraphML home (http://graphml.graphdrawing.org/) failed with ERR_TLS_CERT_ALTNAME_INVALID on the HTTPS upgrade and is NOT listed. This is the where-to-REACH index (canonical repo/paper/standard + local code), DISTINCT from system-viz-source-atlas.md (the where-to-LEARN curriculum)."
tags: [system-viz, resource-atlas, graph-drawing, force-directed-layout, information-visualization, canonical-repos, official-docs, free-resources, d3, three-js, gephi, ogdf, graphviz, where-to-reach]
---

# System-Viz Galaxy — Resource Atlas

The **where-to-REACH index** for PRISM's `system-viz` galaxy — a single hub linking the galaxy's own LOCAL code + stores to the CANONICAL FREE online sources (the official tool repo, the seminal free paper/book, the standards page) so a chat working this galaxy jumps STRAIGHT to the authoritative source instead of re-deriving or webscraping.

This is DISTINCT from its siblings — do not confuse them:
- [[system-viz-source-atlas]] — the where-to-LEARN **curriculum** (free courses + structured directory to keep the domain knowledge fresh).
- **This file (resource-atlas)** — the where-to-REACH **index**: the canonical repo / paper / standard you cite or clone, paired with the galaxy's own local code + stores. Not a course list — a reach list.

The galaxy's job is to render the live PRISM system graph (engines, dispatchers, ghost-roosts, cross-substrate edges) as a navigable, searchable 3D map. So the canonical reach targets are: graph-drawing / force-directed-layout algorithms + libraries, the D3 / Three.js rendering substrate, large-graph tooling, and the interchange formats.

---

## 1. Local code + stores (PRISM — the galaxy's own trove)

These are verified PRISM paths (ls-confirmed 2026-06-10). Reach here FIRST — the galaxy's own engines and graph stores answer most questions before any external source.

- **Engine directory** — `mcp-server/src/engines/system-viz/`
  - The galaxy's own engine dir (carries `CLAUDE.md`, `GSD.md`, `MEMORY.md`, `PATHS.md`, `TOOLBELT.md` — the galaxy sentinels + brain). Start here for the galaxy's own viz/integration engines.
- **Canonical graph writer** — `scripts/regen-viz.mjs`
  - The ONE canonical writer/regenerator of the live system graph (the galaxy's "build" step). Atomic-write discipline; do not hand-edit the graph — regenerate it.
- **Live system graph (store)** — `state/shared/system-viz/system-graph.json`
  - The full materialized fleet graph (multi-hundred-MB; treat as a heavy store — never `Read` it whole, query it through the cheap sidecars below). This IS the fleet search substrate.
- **Node-card offset index (cheap read store)** — `state/shared/system-viz/node-card-offsets.json` + `state/shared/system-viz/node-cards.jsonl`
  - The seekable offset index for token-cheap node read-by-id (read one card by SEEK, not by parsing the giant graph). Emitted/consumed via `scripts/lib/node-card-offset-lib.mjs` (+ `node-card-read.mjs`, `node-card-schema.mjs`); backfilled by `scripts/build-card-offset-index.mjs`. See CLAUDE.md §CHEAP-NODE-ACCESS-MS0.

*(Numeric store sizes/thresholds are owner-gated — see §Owner-gate. Reach the path, read the live size with `ls -lh`.)*

---

## 2. Canonical repos + papers + standards (verified FREE/LEGAL)

Each entry below was WebFetch-confirmed reachable + free on 2026-06-10. Listed as **name + verified URL + what it is + which part of THIS galaxy it serves.**

### Force-directed layout + rendering libraries (the reach-for-code targets)

- **d3-force — official repo (d3 org)** — https://github.com/d3/d3-force
  - The official force-directed graph layout module: velocity-Verlet integrator simulating physical forces on particles, for networks/hierarchies and bubble-collision. ISC license.
  - *Serves:* the canonical reference implementation of the force simulation behind the galaxy's 2D/SVG graph views — clone/cite this, don't re-roll a force loop.
- **D3.js — official repo** — https://github.com/d3/d3
  - "Bring data to life with SVG, Canvas and HTML." The foundational data-visualization library (selections, scales, shapes, layouts). ISC license.
  - *Serves:* the encode-and-lay-out toolkit for the galaxy's 2D views — the umbrella repo that bundles d3-force and friends.
- **three.js — official repo (mrdoob)** — https://github.com/mrdoob/three.js
  - "JavaScript 3D library" — the WebGL/WebGPU 3D scene model (Scene, cameras, BufferGeometry, materials, InstancedMesh/Points for high-count rendering). MIT license.
  - *Serves:* the exact rendering substrate system-viz uses to draw the graph in 3D — the reach target for InstancedMesh-per-node-kind and high-count point rendering.
- **Gephi — official repo** — https://github.com/gephi/gephi
  - "The Open Graph Viz Platform" — an award-winning desktop tool for visualizing + manipulating large graphs (Java + OpenGL, up to ~1M elements, real-time layout/filter). Dual CDDL-1.0 / GPL-v3.
  - *Serves:* a battle-tested external graph-viz application for exploratory layout/filter of exported fleet-graph slices, and a reference for large-graph interaction patterns.
- **OGDF — Open Graph Drawing Framework** — https://github.com/ogdf/ogdf
  - "A self-contained C++ library for graph algorithms, in particular for automatic graph drawing" — sophisticated layout algorithms + data structures (built by multiple European universities). GPL v2/v3 with exceptions.
  - *Serves:* the deepest free implementation library for the layout-algorithm half of the galaxy (force-directed / hierarchical / planarization) when survey-level d3-force isn't enough.

### Tools / standards (the reach-for-a-layout-engine target)

- **Graphviz — official documentation** — https://graphviz.org/documentation/
  - The canonical DOT-language + layout-engine docs: `dot` (hierarchical), `neato`/`fdp`/`sfdp` (force-directed; `sfdp` for large graphs), `circo`/`twopi` (circular/radial), and SVG/PNG/PDF output. Open source.
  - *Serves:* a battle-tested offline tool + spec for non-force layouts — hierarchical/radial drawings of dependency sub-graphs that read better than a force splatter for tree-shaped fleet-graph slices; `sfdp` is the named large-graph engine.

### Seminal free references (the reach-for-the-paper/book target)

- **Handbook of Graph Drawing and Visualization — free companion (ed. Roberto Tamassia, CRC Press 2013)** — https://cs.brown.edu/people/rtamassi/gdhandbook/
  - All 26 chapters as free downloadable PDFs (force-directed, planarity, hierarchical/tree, orthogonal, circular, 3D, crossings/planarization, labeling) + software chapters (OGDF, GDToolkit, PIGALE). 866 pages, "camera ready."
  - *Serves:* the seminal free reference for the actual layout algorithms — the authoritative paper-level source to cite for the graph-drawing half of the galaxy.
- **Visualization Analysis and Design — free companion (Tamara Munzner, CRC Press 2014)** — https://www.cs.ubc.ca/~tmm/vadbook/
  - All 113 figures as PDFs under CC-BY-4.0, 22+ hours of video, full slide decks, per-chapter further-reading + errata. The canonical framework: data/task abstraction, the nested model, marks-and-channels encoding, per-data-type techniques.
  - *Serves:* the theoretical spine + the safest license-clean reusable teaching assets (CC-BY figures) for system-viz docs/reviews — the canonical book to cite for visual-encoding decisions.

---

## 3. Curated video (verified)

- **Munzner VAD video lectures — on the VAD companion** — https://www.cs.ubc.ca/~tmm/vadbook/
  - 22+ hours of free recorded lectures (chapter-by-chapter series + IEEE VIS tutorials + course recordings) paired with the matching slide decks, by the field's standard textbook author. Hosted on the same verified companion site above.
  - *Serves:* a free, reputable, structured video curriculum for onboarding a chat to the galaxy's visual-design vocabulary — the reach target when a teammate learns better by video than by reading the book.

---

## 4. Cross-links (sibling wiki layers)

- [[system-viz-foundations]] — the synthesized THEORY (encoding channels, node-link quality, force-layout complexity, LOD, WebGL/Three.js scene model).
- [[system-viz-source-atlas]] — the where-to-LEARN curriculum (free courses + living directory). The companion to this file; reach-vs-learn.
- [[system-viz-applied-practice]] — the practitioner GOTCHAS (local-minima layouts, hairballs, NP-hard labeling, streaming-OOM, GPU context loss).
- [[system-viz-advanced-techniques]] — the deeper/advanced layout + rendering techniques.
- [[prism-methodology-foundations]] — the cross-galaxy methodology spine all galaxy atlases share.

---

## Keep-fresh cadence

This atlas is a LIVING index — repos move, docs version, companion pages relocate. Sierra (galaxy owner) keeps it fresh on this cadence:

1. **Quarterly link re-verification.** Re-WebFetch every URL in `## Sources`. Any that 404 / redirect to a different host / fail TLS gets retried once, then either updated to the new canonical URL or moved to a "dead/relocated" note — never silently left as a guess (R12). GraphML is the live example: it failed TLS on this pass and was DROPPED rather than listed.
2. **Re-confirm local paths on each pass.** `ls -lh` the engine dir, `regen-viz.mjs`, `system-graph.json`, and the node-card offset index. If the graph store is renamed/relocated (it has been re-sized before), fix the pointer here — the local section is the half most likely to drift with PRISM refactors.
3. **Track repo + doc versions.** D3, three.js, Graphviz, OGDF, and Gephi version their releases/docs. When the galaxy upgrades a dependency, re-check the matching repo/doc and update the one-liner if the API surface or license moved.
4. **Promote, do not duplicate.** Durable theory learned from these sources belongs in [[system-viz-foundations]]; hard-won gotchas belong in [[system-viz-applied-practice]]; structured learning paths belong in [[system-viz-source-atlas]]. This file only ever holds the REACH pointers — the canonical source + the local code.
5. **Add only WebFetch-verified canonical sources.** New entries must be confirmed reachable + FREE/LEGAL by live fetch before listing (no paywalled, no LibGen). Prefer the official repo / the free companion page / the canonical spec over a mirror or a blog.

## Owner-gate (NOT promoted)

The following stay owner-gated to **sierra** + `mcp-server/src/physics/constants.ts` and are deliberately NOT promoted here (this atlas links the method/source; the numbers live with the owner — R12):

- **Store-size + graph-scale numbers** — the live byte-size of `system-graph.json`, the node/edge count, the node-card count, and any "too big to Read" threshold. Reach the path; read the live size with `ls -lh` / the offset index — never copy a number into this index where it rots.
- **Layout / LOD / streaming thresholds** — any force-layout iteration cap, alpha-decay, LOD distance band, instancing cutoff, or streaming chunk size. Link the algorithm (d3-force, OGDF, the Handbook chapter) for the METHOD; the tuned constants stay owner-gated.
- **GPU / render budgets** — frame-rate targets, instanced-draw counts, picking-buffer sizes. Method links live here; the calibrated budgets stay with sierra + constants.ts.

## Sources

LOCAL (verified PRISM paths, ls-confirmed 2026-06-10):
- `mcp-server/src/engines/system-viz/`
- `scripts/regen-viz.mjs`
- `state/shared/system-viz/system-graph.json`
- `state/shared/system-viz/node-card-offsets.json` + `state/shared/system-viz/node-cards.jsonl`
- `scripts/lib/node-card-offset-lib.mjs` (+ `node-card-read.mjs`, `node-card-schema.mjs`); backfill `scripts/build-card-offset-index.mjs`

ONLINE (each confirmed REACHABLE + FREE/LEGAL via live WebFetch on 2026-06-10; project name + license read off the fetched page):
1. d3-force — official repo (ISC) — https://github.com/d3/d3-force
2. D3.js — official repo (ISC) — https://github.com/d3/d3
3. three.js — official repo (MIT) — https://github.com/mrdoob/three.js
4. Gephi — official repo (CDDL-1.0 / GPL-v3) — https://github.com/gephi/gephi
5. OGDF — Open Graph Drawing Framework (GPL v2/v3) — https://github.com/ogdf/ogdf
6. Graphviz — official documentation (open source) — https://graphviz.org/documentation/
7. Handbook of Graph Drawing and Visualization — free companion, 26 chapter PDFs (CRC Press 2013) — https://cs.brown.edu/people/rtamassi/gdhandbook/
8. Visualization Analysis and Design — free companion, CC-BY-4.0 figures + 22h video (Munzner, CRC Press 2014) — https://www.cs.ubc.ca/~tmm/vadbook/

DROPPED this pass (failed verification — NOT guessed, NOT listed above):
- GraphML home `http://graphml.graphdrawing.org/` — `ERR_TLS_CERT_ALTNAME_INVALID` on the HTTPS upgrade. Retried once, still failed; demoted out. Re-attempt next cadence pass; if the canonical GraphML spec URL is confirmed reachable then, add it under §2 standards.
