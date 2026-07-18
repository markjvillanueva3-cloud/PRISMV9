---
title: System-Viz Galaxy — Foundations (Information Visualization & Graph Drawing)
galaxy: system-viz
owner_slot: sierra
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: "Each section grounded in a free/legal academic or official-documentation source confirmed via live WebFetch. Claims not confirmable from a free source are quarantined in the Owner-gate section, not promoted into the body."
tags: [system-viz, information-visualization, graph-drawing, visual-encoding, force-directed-layout, level-of-detail, webgl, threejs, foundations]
---

# System-Viz Galaxy — Foundations

This entry establishes the **free-academic information-visualization and graph-drawing grounding** behind PRISM's `system-viz` galaxy — the surface that renders the ~600 MB live system graph (engines, dispatchers, ghost-roosts, cross-substrate edges) as a navigable 3D map and the canonical task/roadmap tracking substrate. Every claim below is tied to a source confirmed via live WebFetch (free college-course slides, free encyclopedic surveys of graph-drawing theory, and the official WebGL / Three.js documentation). Theory the fleet cannot yet ground in a free source is held in the Owner-gate, not asserted in the body (R12 honesty).

The galaxy's job is fundamentally a visualization problem: take a large attributed graph and produce a drawing that a human (and an LLM agent) can read, navigate, and search without drowning in clutter. The sections map each piece of theory to that engineering reality.

## 1. Visual encoding channels — the raw material of any graph drawing

Jacques Bertin systematized the **visual variables** (encoding channels) in *Sémiologie Graphique* (1967): the canonical set comprises position/location, **size, shape, color value (lightness), color hue, orientation, and pattern/texture** (plus saturation in expanded sets). The deciding property of a channel is what kind of data it can faithfully carry: **ordered variables — size, value, grain — show a clear linear order between values, making them suited to ordinal/interval (magnitude) data**, while **shape, orientation, and hue are categorical/associative — variations can be mentally grouped, making them suited to nominal data**. Size and value are *dissociative* (some values stand out far more than others, good for magnitude); **hue is *associative*, suited to categorical distinction rather than magnitude**.

> *Engineering relevance:* `system-viz` encodes node **layer/kind/status** with categorical channels (hue, shape) and reserves ordered channels (size, value) for magnitude — e.g. node importance / connectivity degree — so a glance separates "what kind of node" from "how big a node" without conflating them. Choosing hue for a magnitude would be a known encoding error this grounding prevents.

## 2. Graph drawing — node-link representation and its quality measures

In a node-link drawing, **vertices are represented as disks, boxes, or textual labels and edges as line segments, polylines, or curves in the Euclidean plane**. Graph-drawing theory defines concrete, measurable **aesthetic quality criteria** rather than leaving "good layout" to taste: the **crossing number** (count of pairs of edges that cross), **drawing area** (smallest bounding box relative to closest vertex pair), **edge complexity** (number of bends, minimized), **edge length** (minimize total and maximum length), **angular resolution** (the sharpest angles), and **symmetry display** (find and render symmetry groups). Minimizing edge crossings is a primary aesthetic criterion.

> *Engineering relevance:* The 600 MB system graph is exactly a node-link diagram at scale. These criteria are the objective function `system-viz` layout is implicitly optimizing — and the reason a raw dump of ~300K nodes with all edges is unreadable: crossing number and area both explode, so the galaxy must reduce edges/nodes shown (LOD, §4) and route them well (force layout, §3) before a drawing is useful.

## 3. Force-directed layout — the physics analogy for positioning nodes

Force-directed algorithms position nodes by a **spring/electrical analogy**: **spring-like attractive forces (Hooke's law) pull pairs of adjacent endpoints together, while repulsive forces push all pairs of nodes apart**, with the goal that **all edges are of roughly equal length and there are as few crossing edges as possible**. The canonical algorithms are **Fruchterman–Reingold (1991)** (attractive forces on adjacent vertices + repulsion on all vertices) and **Kamada–Kawai (1989)** (springs between all pairs, with ideal spring lengths equal to graph-theoretic distance). The naive cost is high: iterations are linear O(n) but computing mutual repulsion over all node pairs makes each pass effectively **cubic, O(n^3)**. The **Barnes–Hut approximation (FADE method)** cuts this to **linearithmic, n log(n) per iteration**, enabling layouts of ~100,000 nodes in seconds versus ~1,000 with standard techniques.

> *Engineering relevance:* This is the single most important algorithmic fact for `system-viz`: a naive all-pairs force layout over the fleet graph is computationally hopeless. The Barnes–Hut quadtree/octree approximation is the difference between a layout that completes and one that never does — directly informing why large-graph layout must be approximated, not exact, at PRISM scale.

## 4. Large-graph navigation — level of detail (LOD)

**Level of detail (LOD)** is the technique of varying **the complexity of a 3D model representation** — decreasing it as the model moves away from the viewer, or by other metrics such as **object importance, viewpoint-relative speed, or position**. The purpose is to **increase rendering efficiency by decreasing the workload on graphics-pipeline stages**; the reduced visual quality is often unnoticed because distant or fast-moving objects contribute little to the final image. Two approaches exist: **Discrete LOD (DLOD)** — multiple pre-built versions of the geometry at fixed detail levels, with a drawback of visible "popping" when one is swapped for another — and **Continuous LOD (CLOD)** — a structure holding a continuously variable spectrum of detail that can be **locally varied** (high detail on the near side of an object, reduced on the far side simultaneously). Both select a level by heuristic to **minimize geometric detail to maximize performance while keeping acceptable visual quality**.

> *Engineering relevance:* `system-viz` cannot draw all ~300K nodes at full fidelity at interactive frame rates. LOD is the principled answer: render near/important nodes in full, decimate or aggregate distant ones, and accept the fidelity trade for frame rate — exactly the "ghost-roost aggregation + node-card cheap read" pattern the galaxy already uses to avoid loading the full graph for a single node read.

## 5. The rendering substrate — WebGL

**WebGL is a JavaScript API for rendering high-performance interactive 3D and 2D graphics within any compatible web browser without plug-ins.** It works by **introducing an API that closely conforms to OpenGL ES 2.0 (WebGL 2 conforms to OpenGL ES 3.0)** and runs inside HTML **`<canvas>`** elements. This conformance lets the API **take advantage of hardware graphics acceleration provided by the user's device (the GPU)**, and support is present in all modern browsers (given adequate device hardware).

> *Engineering relevance:* WebGL is why a browser-based `system-viz` can draw a graph at all at this scale — the layout/encoding work above is delivered to the GPU through a canvas, so tens of thousands of marks render per frame. Without GPU acceleration the LOD budget in §4 would be far tighter.

## 6. The scene model — Three.js fundamentals

Three.js structures a 3D scene around a small set of core objects. The **Renderer** draws 3D content to a canvas, taking a **Scene** and a **Camera** and rendering the portion of the scene inside the camera's frustum as a 2D image. The **Scene is the root of the scene graph** — a **tree-like hierarchical structure** where objects have parent-child relationships and **children are positioned and oriented relative to their parent**. A **Mesh** combines a **Geometry** (the shape / vertex data) and a **Material** (surface properties), and **a Geometry or Material can be reused across multiple Meshes to optimize memory**. The **Camera** (e.g. PerspectiveCamera) defines a frustum via field of view, aspect ratio, and near/far clipping planes. Animation runs through a **render loop driven by `requestAnimationFrame`**: the browser calls back with elapsed time, scene properties are updated, `renderer.render(scene, camera)` is called, and the next frame is requested recursively.

> *Engineering relevance:* The scene-graph + reusable-geometry/material model maps directly onto rendering a fleet graph efficiently: every node of the same kind can share one Geometry/Material (instancing-friendly, low memory), parent-child transforms group related roosts, and the `requestAnimationFrame` loop is where LOD selection (§4) and camera-frustum culling actually run each frame.

## Owner-gate (NOT promoted)

These items are plausible and standard in the field but were **not confirmable from a free/legal source during this pass**, so they are quarantined here for sierra (galaxy owner) to verify before promotion into the body:

- **Munzner channel-effectiveness ranking** (the specific Cleveland–McGill / Munzner ordering: position > length > angle > area > ... > color hue, and the separable-vs-integral-channel distinction). The intended free source — UBC CPSC 547 *Visualization Analysis & Design* course slides (`cs.ubc.ca/~tmm/courses/547-14/slides/intro.pdf`) — returned **binary/corrupted PDF content via WebFetch** and could not be parsed. The §1 grounding here uses Bertin's data-type-suitability claims instead, which are confirmable. Owner should re-fetch a readable Munzner slide deck or the book companion site to add the precise effectiveness ranking.
- **Focus+context / fisheye distortion views** (magnify a focus region while compressing the periphery as context — a classic large-graph navigation technique relevant to navigating PRISM's graph). No free source confirmed this on this pass: `Fisheye_lens_(disambiguation)` 404'd and `Fisheye_lens` covers only camera optics, explicitly not the InfoVis technique. Owner should source Furnas's degree-of-interest / generalized-fisheye-views work from a free venue before asserting it.
- **Edge bundling specifics** (hierarchical edge bundling, force-directed edge bundling as clutter-reduction for dense node-link diagrams). The dedicated `Edge_bundling` page 404'd and the `Graph_drawing` survey explicitly **does not** cover edge bundling. The clutter problem is grounded via the §2 crossing-number/area criteria, but the *bundling solution* is owner-gated pending a free citable source.
- **PRISM-specific layout parameters / performance thresholds** (target frame rate, node-count LOD cutoffs, Barnes–Hut theta for the live graph) are engineering tuning values, not academic claims — they belong in sierra's galaxy MEMORY.md / spec, not this foundations entry, and are intentionally left ungated here (n/a to the free-source rule).

## Sources

Distinct URLs confirmed via live WebFetch during this pass:

1. Visual variable (Bertin's visual variables, data-type suitability) — https://en.wikipedia.org/wiki/Visual_variable
2. Graph drawing (node-link representation, quality/aesthetic criteria) — https://en.wikipedia.org/wiki/Graph_drawing
3. Force-directed graph drawing (spring/electrical model, Fruchterman–Reingold, Kamada–Kawai, O(n^3), Barnes–Hut n log n) — https://en.wikipedia.org/wiki/Force-directed_graph_drawing
4. Level of detail (computer graphics) (DLOD vs CLOD, performance/fidelity trade) — https://en.wikipedia.org/wiki/Level_of_detail_(computer_graphics)
5. WebGL API (MDN — JS 3D/2D graphics, OpenGL ES conformance, GPU acceleration, canvas) — https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
6. Three.js Fundamentals (official manual — Renderer/Scene/Camera/Mesh/Geometry/Material, scene graph, requestAnimationFrame loop) — https://threejs.org/manual/en/fundamentals.html
