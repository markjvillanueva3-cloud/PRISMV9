---
title: System-Viz Galaxy — Applied Practice (Graph-Visualization Practitioner Gotchas)
galaxy: system-viz
owner_slot: sierra
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Each gotcha is grounded in a free/legal source confirmed via live WebFetch (Wikipedia survey articles on graph drawing / force layout / label placement / color vision / adjacency matrix / JSON+SAX streaming, and official MDN WebGL documentation). Claims not confirmable from a free source are quarantined in the Owner-gate, not asserted in the body (R12). PRISM-internal regressions are cited as engineering context, not as the academic claim."
tags: [system-viz, graph-visualization, force-directed-layout, hairball, edge-bundling, label-placement, color-accessibility, webgl, streaming, oom, applied-practice, tribal-knowledge]
---

# System-Viz Galaxy — Applied Practice

This is the **practitioner-knowledge layer** for `system-viz`: the hard-won engineering gotchas, failure modes, and technique decisions that pure theory does not teach. Read [`system-viz-foundations.md`](system-viz-foundations.md) first — it covers the *theory* (visual-encoding channels, node-link quality criteria, the force-layout O(n^3)->n log n result, LOD, WebGL/Three.js scene model). This entry does NOT repeat that. It answers a different question: **what actually goes wrong when you render a ~600 MB live system graph at PRISM scale, and how does an expert avoid it.**

Each note is: the gotcha + WHY it bites + the expert's avoidance (cited inline) + one line on how `system-viz` hits it.

---

## 1. Force-directed layout failure modes (it is not "set it and forget it")

### 1.1 The layout you get is a LOCAL minimum, not a good one
Force-directed algorithms minimize an energy function, but **"produce a graph with minimal energy, in particular one whose total energy is only a local minimum"**, and crucially **"the local minimum found can be, in many cases, considerably worse than a global minimum, which translates into a low-quality drawing"** (Wikipedia, *Force-directed graph drawing*). WHY it bites: a single run that "settles" looks done but can be a tangled, asymmetric mess that a different seed would have untangled. The expert's avoidance: don't trust one run — use a multilevel/coarsening initial placement or run several seeds and keep the lowest-energy result, rather than assuming convergence equals quality.
> *system-viz:* the fleet graph's layout is an objective being approximately minimized; a one-shot relaxation can lock the ~300K-node graph into a bad local minimum, so layout quality must be evaluated (crossing/area, see foundations §2), not assumed from "it stopped moving."

### 1.2 Non-determinism: the same data lays out differently every time
**"The final result can be strongly influenced by the initial layout, that in most cases is randomly generated"** (Wikipedia, *Force-directed graph drawing*). WHY it bites: a random seed means the graph jumps to a new shape on every regeneration, destroying the operator's spatial memory ("the quoting cluster was top-left last time") and making screenshots non-comparable across runs. The expert's avoidance: pin the RNG seed (or anchor known nodes to fixed positions) so re-layouts are stable and diffable.
> *system-viz:* the canonical graph is regenerated repeatedly (`regen-viz`); without a fixed seed/anchors, every regen would scramble node positions and break visual continuity for operators reading the same map across sessions.

### 1.3 The pain scales super-linearly with node count
**"The problem of poor local minima becomes more important as the number of vertices of the graph increases"** (Wikipedia, *Force-directed graph drawing*), and the practical ceiling is stark: **"in a few seconds one can expect to draw at most 1,000 nodes with a standard n^2 per iteration technique, and 100,000 with a n log(n) per iteration technique."** WHY it bites: an approach that is fine on a demo graph (hundreds of nodes) silently becomes both slow AND low-quality at fleet scale. The expert's avoidance: adopt Barnes-Hut/n-log-n force approximation from the start (foundations §3) AND reduce the node set before layout, not after.
> *system-viz:* a raw force layout over the full graph is doubly doomed (cubic-ish time + worse minima); the galaxy's ghost-roost aggregation reduces the layout input rather than relaying the full node set every frame.

---

## 2. The hairball: dense graphs become unreadable regardless of layout

### 2.1 No layout saves a too-dense node-link diagram
Graph-drawing theory defines readability by **crossing number ("the number of pairs of edges that cross each other")** and **edge length ("it is generally desirable to minimize the total length of the edges as well as the maximum length of any edge")** (Wikipedia, *Graph drawing*). WHY it bites: as edge density rises, crossing number grows combinatorially — the drawing degenerates into an opaque tangle (a "hairball") where no node-link layout, however optimal, is legible. The expert's avoidance: stop adding edges to the picture. Filter to a sub-graph, show edges on-demand (hover/focus), or switch representation entirely.

### 2.2 For genuinely dense regions, use a matrix, not a node-link diagram
The space/representation tradeoff from graph theory transfers directly to visualization: **"for a large sparse graph, adjacency lists require less storage space, because they do not waste any space representing edges that are not present"** — i.e. the adjacency matrix is the compact, complete representation precisely when the graph is *dense* (Wikipedia, *Adjacency matrix*). WHY it bites: practitioners reflexively reach for node-link because it is intuitive, then fight an unwinnable hairball on dense clusters. The expert's avoidance: render dense sub-graphs as a shaded adjacency-matrix grid (cell (i,j) filled iff an edge exists) where every relationship is visible with zero crossings, and reserve node-link for sparse overview.
> *system-viz:* highly-connected hubs (a dispatcher wired to dozens of engines) are local hairballs; a matrix or a degree-filtered/edge-on-demand view of just that neighborhood reads where a full node-link splatter does not.

---

## 3. Labels and color: the encoding fails silently for real users

### 3.1 Label placement is NP-hard — naive "draw text at the node" overlaps
Placing readable labels is not a layout afterthought: **"For all but the most trivial setups, the problem is NP-hard"** (Wikipedia, *Automatic label placement*), because every label has a few candidate positions and the goal is that **"the label does not overlap with those already placed"** while staying associated with its feature. WHY it bites: drawing a label centered on every node guarantees mutual occlusion the moment nodes are close — exactly when you most need to read them. The expert's avoidance: treat labeling as its own optimization — a **greedy** pass that places labels "in positions that result in minimal overlap" (fast, imperfect) or **simulated annealing** which "yields good results" and can "keep a change even if it worsens the result" to escape local optima; and cull labels below a zoom/importance threshold rather than drawing all of them.
> *system-viz:* with hundreds of thousands of nodes, labeling all is both impossible and useless; label only near/important nodes (tie label visibility to the LOD selection in foundations §4) and de-conflict the ones shown.

### 3.2 Color hue alone fails ~8% of male viewers
Roughly **"1 in 12 males (8%) and 1 in 200 females (0.5%)"** have red-green color vision deficiency (Wikipedia, *Color blindness*), and red-green confusions are the most common. WHY it bites: encoding node status as red-vs-green (the reflex choice) is invisible to a large fraction of operators — a "failing" node looks identical to a "healthy" one for them. The expert's avoidance: **"using other signals that are parallel to the color coding, such as patterns, shapes, size or order"** — redundant encoding that, per the source, "also aids understanding by normally sighted people by providing them with multiple reinforcing cues." Never rely on hue alone for a categorical/status distinction.
> *system-viz:* status (built / needs-wiring / ghost) must carry a redundant channel (shape or icon) alongside hue, consistent with foundations §1's rule that hue is associative/categorical — so a color-blind operator and a grayscale screenshot both still read status.

---

## 4. Streaming vs materialize: how a large graph OOMs the process

### 4.1 Loading the whole document into a tree is the OOM trap
The canonical streaming-parse principle (SAX vs DOM) states it plainly: a tree/DOM parser **"has to build a tree representation of the entire document in memory ... thus using memory that increases with the entire document length,"** whereas an event-driven streaming parser's memory **"is proportional to the maximum depth ... and the maximum data involved in a single ... event"** — and therefore streaming parsers **"are faster for very large documents where the DOM model hits virtual memory or consumes all available memory"** (Wikipedia, *Simple API for XML*). WHY it bites: `JSON.parse(readFileSync(...))` is the JSON DOM model — it materializes the entire structure, so a multi-hundred-MB graph file blows the heap (or worse, the language's max-string-length) before a single node is read. The expert's avoidance: parse incrementally / event-driven, and read by record, never the whole blob.

### 4.2 Use a delimited record format so you can read one entry at a time
JSON streaming exists exactly to make incremental reads possible: **newline-delimited JSON (NDJSON/JSONL)** — "send the JSON objects formatted without newlines and use a newline as the delimiter" — and **length-prefixed JSON** let a streaming parser "extract them" one record at a time without buffering the document (Wikipedia, *JSON streaming*). WHY it bites: a single giant JSON object forces all-or-nothing parsing; a delimited stream lets you seek/scan record-by-record. The expert's avoidance: store the large graph as JSONL plus an offset index, and read the one record you need.
> *system-viz:* PRISM hit this concretely — a monolithic graph blob crossed V8's max-string-length and every `JSON.parse(readFileSync)` consumer threw before parsing (`reference_tribal_index_v8_string_cap_2026_06_08`); the fix is exactly the streaming/record principle above — buffer-read + incremental walk, and the node-card offset-index (`reference_cheap_node_access_ms0_2026_06_04`) so reading one node is a seek, not a 600 MB load. (PRISM-internal regression cited as engineering context, not as the academic claim.)

---

## 5. The render loop and the GPU: stale frames, jank, and lost contexts

### 5.1 Minimize draw calls — one call per node does not scale
MDN is explicit: **"'Batching' draw calls into fewer, larger draw calls will generally improve performance. If you have 1000 sprites to paint, try to do it as a single drawArrays() or drawElements() call"** (MDN, *WebGL best practices*). The mechanism is instanced rendering — `drawArraysInstanced` "can execute multiple instances of the range of elements" in a single draw call (MDN, *WebGL2RenderingContext.drawArraysInstanced*). WHY it bites: a draw call per node means tens of thousands of CPU->GPU submissions per frame, and the CPU-side overhead — not the pixel work — caps the frame rate. The expert's avoidance: instance same-kind nodes into one draw call (which also dovetails with foundations §6's "reuse one Geometry/Material across many Meshes").
> *system-viz:* nodes of the same layer/kind should be one instanced draw, not N meshes — the only way the LOD budget in foundations §4 buys interactive frame rates.

### 5.2 Synchronous GL queries jank the whole page
**"Certain WebGL entry points ... cause synchronous stalls on the calling thread ... avoid such entry points, especially on the browser main thread where they can cause the entire page to jank"** — named offenders include `getError()`, the `getShader/ProgramInfoLog()` family, `checkFramebufferStatus()`, and `readPixels()` (use async readback instead) (MDN, *WebGL best practices*). WHY it bites: a "harmless" per-frame `getError()` or a synchronous `readPixels()` (e.g. for click-picking) silently serializes the CPU against the GPU, freezing the UI. The expert's avoidance: keep these calls out of the hot path; use async readback (fenceSync/clientWaitSync) for picking/screenshots.
> *system-viz:* interactive picking on a huge graph must not synchronous-readback per click — it stalls the render loop just when the operator is navigating.

### 5.3 The WebGL context can be LOST — render goes stale until re-established
A WebGL context can be lost at runtime; `isContextLost()` returns true when the context **"has been lost and must be re-established before rendering can resume,"** with causes including **"multiple pages competing for GPU resources, ... another page's GPU operation causing a GPU reset, [and] graphics driver updates"** (MDN, *WebGLRenderingContext.isContextLost*). WHY it bites: after context loss every GPU resource (buffers, textures, shaders) is invalid; a viewer that ignores the `webglcontextlost`/`webglcontextrestored` events shows a frozen, stale last-good frame forever and looks "broken." The expert's avoidance: listen for the loss/restore events, preventDefault on loss, and re-create GPU resources on restore; also eagerly release contexts via `WEBGL_lose_context` when a canvas is done (MDN, *WebGL best practices*). This is the rendering-side analogue of the data-side stale-render problem.
> *system-viz:* a long-lived 3D map sharing the GPU with other tabs/apps WILL eventually lose its context; without restore handling the operator sees a stale graph that no data refresh can fix — the render must rebuild on `webglcontextrestored`, not just on new data.

---

## Owner-gate (NOT promoted)

These items are standard practice but were **not confirmable from a free/legal source on this pass** (matching the foundations entry's own gaps), so they are quarantined for sierra to verify before promotion:

- **Edge bundling specifics** (hierarchical / force-directed edge bundling as the named clutter-reduction technique). The dedicated `Edge_bundling` Wikipedia page 404'd and the `Graph_drawing` survey mentions only confluent-drawing "smooth curves within mathematical train tracks," not bundling for clutter. The hairball *problem* (§2) is grounded via crossing-number/edge-length and the matrix alternative; the *bundling solution* needs a free citable source (e.g. Holten 2006 hierarchical edge bundling, or Holten & van Wijk FDEB) before it can be asserted in the body.
- **A named "hairball" definition.** `Hairball_(graph)` 404'd; the term is used colloquially in the field. §2 grounds the underlying mechanism (crossing number exploding with density) without leaning on the slang as if it were a cited definition.
- **Focus+context / fisheye distortion for large-graph navigation** (Furnas degree-of-interest). Owner-gated in foundations for the same reason; no free source confirmed on this pass.
- **Munzner channel-effectiveness ranking** (position > length > angle > area > ... > hue). Carried over from the foundations Owner-gate; §3.2 uses the color-vision prevalence claim instead, which IS confirmable.
- **PRISM-specific benchmark numbers** — target frame rate, node-count LOD cutoffs, Barnes-Hut theta, the exact graph file size, draw-call counts. These are engineering tuning/measurement values owned by sierra's galaxy MEMORY.md / spec, not academic claims; left numerically ungated here (n/a to the free-source rule). The PRISM regression references in §4.2 are cited as engineering context only.

## Sources

Distinct URLs confirmed via live WebFetch during this pass:

1. Force-directed graph drawing (local minimum / "considerably worse than a global minimum", random initial layout influence, poor-minima worsens with vertices, 1k-vs-100k-node practical ceiling) — https://en.wikipedia.org/wiki/Force-directed_graph_drawing
2. Graph drawing (crossing number, edge-length minimization, node-link quality criteria) — https://en.wikipedia.org/wiki/Graph_drawing
3. Adjacency matrix (sparse graphs "waste" space in a matrix / matrix suited to dense; representation tradeoff) — https://en.wikipedia.org/wiki/Adjacency_matrix
4. Automatic label placement (NP-hard, non-overlap requirement, greedy + simulated-annealing heuristics) — https://en.wikipedia.org/wiki/Automatic_label_placement
5. Color blindness (1-in-12 male / 8% red-green prevalence, redundant parallel signals: patterns/shapes/size) — https://en.wikipedia.org/wiki/Color_blindness
6. Simple API for XML (SAX vs DOM memory tradeoff: DOM memory grows with document length, SAX for documents that hit/exceed available memory) — https://en.wikipedia.org/wiki/Simple_API_for_XML
7. JSON streaming (NDJSON/JSONL and length-prefixed framing for incremental record-by-record parsing) — https://en.wikipedia.org/wiki/JSON_streaming
8. WebGL best practices (MDN — batch draw calls into one call, synchronous-stall entry points jank the main thread, WEBGL_lose_context) — https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
9. WebGL2RenderingContext.drawArraysInstanced (MDN — multiple instances in a single draw call) — https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced
10. WebGLRenderingContext.isContextLost (MDN — context lost and "must be re-established before rendering can resume"; loss causes: GPU resource competition, GPU reset, driver updates) — https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost
