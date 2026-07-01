---
title: System-Viz Galaxy — Open Source Atlas (Living-Source Learning Directory)
galaxy: system-viz
owner_slot: sierra
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source below was confirmed REACHABLE and FREE/LEGAL via live WebFetch on 2026-06-10. Each fetch returned the expected course/doc/archive content. One candidate that 404'd after a host redirect (UW IDL /papers/ archive) was retried once then DROPPED rather than guessed. Course numbers and offering years are quoted from the fetched page, not from memory. This is the keep-learning directory, NOT the synthesized theory (see system-viz-foundations.md) nor the practitioner gotchas (see system-viz-applied-practice.md)."
tags: [system-viz, information-visualization, graph-drawing, data-visualization, source-atlas, living-curriculum, free-courses, free-textbooks, official-docs, webgl, d3, threejs, force-directed-layout, keep-learning]
---

# System-Viz Galaxy — Open Source Atlas

The **living-source curriculum** for PRISM's `system-viz` galaxy — a curated directory of WHERE to keep learning the data-visualization + graph-drawing domain from reputable FREE/LEGAL sources, so the galaxy's knowledge never goes stagnant.

This entry is deliberately DISTINCT from its two siblings — read them first, do not expect this file to repeat them:
- [`system-viz-foundations.md`](system-viz-foundations.md) — the synthesized THEORY (visual-encoding channels, node-link quality criteria, force-layout O(n^3) -> n log n, LOD, WebGL/Three.js scene model).
- [`system-viz-applied-practice.md`](system-viz-applied-practice.md) — the practitioner GOTCHAS (local-minima layouts, hairballs, NP-hard labeling, color-blind status encoding, streaming-OOM, GPU context loss).

This file answers a third question: **when sierra (or any chat working this galaxy) wants to go deeper, where is the reputable free material — and how do we keep it fresh?** The galaxy's job is to render the ~600 MB live system graph (engines, dispatchers, ghost-roosts, cross-substrate edges) as a navigable, searchable 3D map, so the curriculum focuses on information visualization, graph drawing, force-directed layout, the WebGL/Three.js rendering substrate, and large network data.

Each source is listed as: **name + verified URL + what it teaches + which part of THIS galaxy it feeds.**

---

## 1. Free college courses

- **UBC CPSC 547 — Information Visualization (Tamara Munzner)** — https://www.cs.ubc.ca/~tmm/courses/547-17/
  - 26 numbered lectures with downloadable slides (PDF + Keynote), required readings, and a project analyzing a real visualization system. Progresses from data/task abstraction and the nested-model validation through marks/channels, color, and layout for tables/spatial/networks, then interaction (manipulation, faceting, focus+context) and D3.
  - *Feeds:* the encoding-channel and network-layout decisions in foundations Sec.1-2 — this is the authoritative free course behind the "hue is categorical, size is ordered" rules system-viz uses for node layer/kind/status.

- **UW CSE 512 — Data Visualization, Spring 2022 offering (public slides + schedule)** — https://courses.cs.washington.edu/courses/cse512/22sp/
  - A fully-public offering (syllabus, schedule, slides, readings all open) covering visual encoding + perception, exploratory analysis, interaction design, cartographic + network + uncertainty visualization, and hands-on Vega-Lite / D3. (The CSE512 hub at /courses/cse512/ is a thin index with some auth-gated admin pages; cite this dated offering for the open lecture material.)
  - *Feeds:* a second independent treatment of network visualization + interaction design, plus the practical Vega-Lite/D3 tooling track that maps onto the galaxy's render/encode pipeline.

## 2. Free textbooks & reference works

- **Visualization Analysis and Design — companion site (Munzner, CRC Press 2014)** — https://www.cs.ubc.ca/~tmm/vadbook/
  - The book's free companion: all 113 figures as PDFs under CC-BY-4.0, 6.5+ hours of video lectures, full slide decks, errata, and chapter-by-chapter "further reading" link lists. The book itself is the canonical framework: data/task abstraction, the nested model, marks-and-channels encoding, and per-data-type techniques (tables, spatial, networks, color, interaction).
  - *Feeds:* the theoretical spine of the whole galaxy. The free figures + slides + further-reading lists are the safest reusable, license-clean teaching assets for system-viz docs and reviews.

- **Handbook of Graph Drawing and Visualization — companion page (ed. Roberto Tamassia, CRC Press 2013)** — https://cs.brown.edu/people/rtamassi/gdhandbook/
  - The companion page lists all 26 chapters as downloadable PDFs (force-directed drawing, planarity, hierarchical/tree drawing, orthogonal, circular, 3D drawing, crossings/planarization, symmetric drawing, labeling; plus software like OGDF/GraphML and application chapters on biological/social/computer networks). (Verified: the force-directed chapter PDF downloads as a 1.4 MB application/pdf; the page itself confirms the full free chapter set.)
  - *Feeds:* the deepest free reference for the layout-algorithm half of the galaxy — the proper next step beyond foundations Sec.3 when sierra needs the actual force-directed / hierarchical / labeling algorithms, not just the survey-level summary.

## 3. Lecture-video sources

- **Munzner VAD video lectures (on the VAD companion site)** — https://www.cs.ubc.ca/~tmm/vadbook/
  - 6.5+ hours of recorded lectures walking the entire book, paired with the matching slide decks — a free, reputable, structured video curriculum for information visualization from the field's standard textbook author.
  - *Feeds:* the same encoding/abstraction/layout theory as Sec.1, in video form for a different learning mode; useful for onboarding a new chat to the galaxy's visual-design vocabulary.

- **The Book of Shaders (Patricio Gonzalez Vivo & Jen Lowe)** — https://thebookofshaders.com/
  - A free, open, step-by-step interactive guide to GLSL fragment shaders: uniforms, shaping functions, color, noise/fractals, kernel convolution, and ray-marching, each with a live editable example.
  - *Feeds:* the GPU/shader layer beneath the Three.js/WebGL rendering substrate (foundations Sec.5-6) — when system-viz needs custom node/edge shaders or GPU-side effects rather than stock materials, this is the free curriculum for writing them.

## 4. Official docs & standards

- **D3.js — official documentation** — https://d3js.org/
  - Official, ISC-licensed open-source docs for data-driven documents: selections/transitions, scales + axes, shapes, SVG, and layouts including **force-directed graphs**, treemaps, Voronoi, chord, and hierarchies. The reference implementation of the encoding channels in the courses above.
  - *Feeds:* the encode-and-lay-out toolkit for 2D/SVG views and the canonical `d3-force` simulation — the practical counterpart to the force-directed theory in foundations Sec.3.

- **Three.js — official documentation** — https://threejs.org/docs/
  - Official, free API reference for the 3D scene model: WebGLRenderer, Scene/Fog, cameras, BufferGeometry + 20+ primitives, materials, lights, and crucially **InstancedMesh** + Points for high-count rendering.
  - *Feeds:* the exact rendering substrate system-viz uses to draw the graph in 3D (foundations Sec.6); InstancedMesh is the API behind the "one instanced draw per node-kind" rule in applied-practice Sec.5.1.

- **WebGL Fundamentals** — https://webglfundamentals.org/
  - Free "WebGL from the ground up. No magic." tutorial series: how WebGL works, shaders, image processing, 2D transforms, 3D, lighting, textures, and rendering optimization.
  - *Feeds:* the raw-WebGL grounding under Three.js — when the galaxy hits a performance/optimization wall, this teaches the GPU pipeline that the higher-level docs abstract away.

- **deck.gl — official documentation (vis.gl / OpenJS Foundation)** — https://deck.gl/docs
  - Official open-source docs for a WebGPU/WebGL2 framework purpose-built for "high-performance visualization of large data sets": a composable layer architecture, GPU-accelerated rendering of massive point/line/polygon data, and interactive picking/filtering.
  - *Feeds:* directly the galaxy's core challenge — rendering ~300K nodes at interactive frame rates. deck.gl is the most relevant reference for the large-data layer + GPU-picking patterns system-viz needs (applied-practice Sec.5).

- **Vega-Lite — official documentation** — https://vega.github.io/vega-lite/docs/
  - Official open-source docs for a high-level declarative grammar of interactive graphics (JSON): marks, encoding channels (position/color/size/shape), scales, transforms, layering/faceting, and selections.
  - *Feeds:* a grammar-of-graphics complement to imperative D3 — useful when system-viz dashboards/roost panels want declarative, reproducible charts rather than hand-coded SVG.

- **Graphviz — official documentation** — https://graphviz.org/documentation/
  - Official open-source docs for the DOT language plus layout engines: **dot** (hierarchical), **neato/fdp/sfdp** (force-directed, sfdp for large graphs), **circo/twopi** (circular/radial), and output formats (SVG/PNG/PDF).
  - *Feeds:* a battle-tested reference (and offline tool) for non-force layouts — hierarchical/radial drawings of dependency sub-graphs that read better than a force splatter for tree-shaped slices of the fleet graph.

## 5. Data & archives (practice material)

- **Stanford Network Analysis Project (SNAP) datasets** — https://snap.stanford.edu/data/
  - Free public collection of ~20+ categories of real network graphs (social, communication, citation/collaboration, web hyperlink, road/infrastructure, e-commerce co-purchase, signed + temporal networks), ranging from thousands to billions of nodes/edges, with precomputed metadata (clustering coefficient, diameter, components).
  - *Feeds:* realistic large-graph test data for benchmarking system-viz layout/LOD/streaming at scale without exposing the live fleet graph — a hairball stress-test corpus (applied-practice Sec.2, Sec.4).

- **UW Interactive Data Lab (IDL)** — https://idl.uw.edu/
  - The home of the Heer-group research that produced D3, Vega, and Vega-Lite. Public hub linking peer-reviewed visualization research, open-source software (github.com/uwdata), and courses. (Note: the older `/papers/` archive path 404'd after a host redirect on this pass and was dropped; use the homepage as the stable entry point and navigate from there.)
  - *Feeds:* the research provenance behind the galaxy's core toolkits — the place to track new graphical-perception and scalable-visualization findings as they publish, so the foundations stay current.

- **Observable — D3 example notebooks (force-directed graph, gallery)** — https://observablehq.com/@d3/force-directed-graph
  - Public, ISC-licensed live notebooks by D3's creator: runnable, forkable source for a force-directed graph (and a broader D3 gallery), editable in the browser.
  - *Feeds:* working reference implementations to copy/adapt — the fastest legal path from "I read the force-layout theory" to "here is running code," directly applicable to the galaxy's 2D/SVG graph views.

---

## Keep-fresh cadence

This atlas is a LIVING document — links rot, courses re-number, and docs version. Sierra (galaxy owner) should keep it fresh on this cadence:

1. **Quarterly link re-verification.** Re-WebFetch every URL in `## Sources`; any that 404 or redirect to a different host gets retried once, then either updated to the new canonical URL or moved to a "dead/relocated" note (never silently left as a guess — R12). The IDL `/papers/` path is the live example: it 404'd this pass and was demoted to the homepage.
2. **Track versioned docs.** D3, Three.js, deck.gl, and Vega-Lite version their docs (the fetched pages showed deck.gl v9.1, Vega-Lite current). When the galaxy upgrades a dependency, re-check the matching doc version and update the one-liners if the API surface moved (e.g. InstancedMesh / WebGPU paths).
3. **Re-pull course offerings yearly.** University courses publish a new offering each year (CSE512 cycles instructors/quarters; CPSC 547 re-offers). When a newer fully-public offering with open slides appears, point at it and keep the prior year only if its materials remain reachable.
4. **Promote, do not duplicate.** New durable theory learned from these sources belongs in `system-viz-foundations.md`; new hard-won gotchas belong in `system-viz-applied-practice.md`. This atlas only ever holds the POINTERS — if a fact graduates into a sibling, cite it there and leave the directory entry here pointing at the source.
5. **Owner-gate carry-over.** The two sibling files have open Owner-gates (Munzner channel-effectiveness ranking, focus+context/fisheye, edge bundling). When a free citable source for any of those is found via the courses/handbook/IDL above, that closes a sibling gate — record the URL there, and add it here if it becomes a recurring reference.

## Sources

Distinct URLs confirmed REACHABLE and FREE/LEGAL via live WebFetch on 2026-06-10:

1. UBC CPSC 547 Information Visualization (Munzner) — https://www.cs.ubc.ca/~tmm/courses/547-17/
2. UW CSE 512 Data Visualization, Spring 2022 (public slides/schedule) — https://courses.cs.washington.edu/courses/cse512/22sp/
3. Visualization Analysis and Design — companion site (figures CC-BY, 6.5h video, slides) — https://www.cs.ubc.ca/~tmm/vadbook/
4. Handbook of Graph Drawing and Visualization — companion page (26 free chapter PDFs) — https://cs.brown.edu/people/rtamassi/gdhandbook/
5. The Book of Shaders (free GLSL fragment-shader book) — https://thebookofshaders.com/
6. D3.js official documentation — https://d3js.org/
7. Three.js official documentation — https://threejs.org/docs/
8. WebGL Fundamentals — https://webglfundamentals.org/
9. deck.gl official documentation (large-dataset WebGL/WebGPU layers) — https://deck.gl/docs
10. Vega-Lite official documentation (declarative grammar) — https://vega.github.io/vega-lite/docs/
11. Graphviz official documentation (DOT + dot/neato/fdp/sfdp/circo/twopi) — https://graphviz.org/documentation/
12. Stanford SNAP network datasets — https://snap.stanford.edu/data/
13. UW Interactive Data Lab homepage — https://idl.uw.edu/
14. Observable — D3 force-directed graph example notebook — https://observablehq.com/@d3/force-directed-graph

Dropped this pass (retried once, unreachable — NOT guessed): UW IDL publications archive `https://idl.cs.washington.edu/papers/` 301-redirected to `https://idl.uw.edu/papers/`, which returned HTTP 404. Demoted to the IDL homepage (#13) above.
