---
title: DualChannelContextEngine (JSON + viz dual-channel subagent context)
type: architecture
layer: L6
created: 2026-06-15
slot: sierra
unit: GRAPH-AS-LLM-CONTEXT-MS0/U-GAC04
tags: [dual-channel, subagent-context, ego-graph, screenshot, mermaid, prism_session, system-viz, tldraw]
related:
  - graph-context-lens-engine
  - graphrag-retrieval-engine
  - code-graph-projection-engine
---

# DualChannelContextEngine

Fourth unit of GRAPH-AS-LLM-CONTEXT-MS0 (slot:sierra). Builds a **dual-channel** context
bundle for subagent dispatch: a structured JSON ego-graph (addressed by explicit `node-id:`
markers) PLUS a visual layer (a real PNG when a system Chrome/Edge is free, else a
mermaid+markdown fallback). The tldraw dual-channel insight (2025): structured-data + a
spatial/visual representation beats prose-only context for multi-agent coordination.

## Design

Composes (does NOT re-implement):
- **GraphContextLensEngine** (U-GAC01) -- ego extraction + mermaid/markdown render.
- **scripts/render-viz-screenshot.mjs** (U-GAC04) -- system-Chrome headless PNG, NO npm dep.

The viz channel's PNG is **best-effort + capability-probed**: it renders on a host where
Chrome/Edge can run headless (proven live: `disp.prism_ai` -> a valid PNG), and degrades to
the mermaid+markdown "visual layer" when Chrome is absent OR forwards to a running instance
(the common desktop case -- 19 live Chrome procs make `chrome.exe` no-op the screenshot).
The dual-channel **contract** (JSON node-ids + a visual layer) is therefore ALWAYS satisfied:
mermaid is itself a parseable visual diagram a text-only subagent can consume. No puppeteer/
playwright/canvas dependency was added (all absent from the tree); the system browser is not
a package.

## Surfaces

- `prism_session:dual_channel_dispatch` -- params `{nodeId|id (req), prompt|subagentPrompt,
  mode(json-only|viz-only|both), hops, maxNodes, layer, embed(path|data-uri), maxPngBytes,
  outDir, enrich, adjacencyPath}`. Returns the bundle `{prompt, mode, nodeId, json, viz, warnings}`.
- Engine methods: `attachJsonContext(prompt,nodeId)`, `attachVizScreenshot(prompt,layerFilter,{nodeId})`,
  `buildDualChannel(prompt,nodeId,opts)` (primary). Singleton `dualChannelContextEngine`.
- CLI: `scripts/render-viz-screenshot.mjs --ego=<egoJson> --out=<png> [--layer=L4] [--window=WxH] [--max-bytes=N]`.

## Failure modes + adversarial (all tested)

- chromium unavailable / forwards -> **mermaid+markdown MD fallback** (`kind:"md-fallback"`).
- PNG > maxPngBytes (10MB) -> renderer re-renders at half window once, then `reason:"oversize"` -> MD fallback.
- subagent rejects binary -> `embed:"data-uri"` base64-inlines the PNG -- but **skips + keeps the path**
  if the PNG exceeds `maxPngBytes` (a ~13MB base64 would blow the prompt budget).
- screenshot-of-screenshot recursion -> the engine refuses to embed a viz channel into a prompt
  that already carries ANY dual-channel sentinel block (cannot be evaded by a prior json-only block).
- malicious payload in a node label/id -> `esc()` HTML-escapes every text field at the render
  boundary; mermaid node *identifiers* are sanitized to `n_...` so markup is never structural.
- path traversal via a `../` layer -> sanitized in the engine filename AND rejected by the Zod
  `layer` regex (`^[A-Za-z0-9_-]{1,20}$`) at the dispatcher boundary.

## Tests + proof

30 tests: `DualChannelContextEngine.test.ts` (16 -- happy/3 modes/missing-tool/oversize/throw/
malformed-nodeId/empty-layer/data-uri/data-uri-oversize-skip/recursion x2/markup/standalone methods/
live-smoke), `sessionDispatcher.dualChannel-wire.test.ts` (4 -- both-channels real topology,
json-only, traversal-layer schema reject, missing-nodeId structured error),
`render-viz-screenshot.test.mjs` (10 -- esc/buildHtml XSS-escape + layer filter + empty card +
chromium-unavailable). Live full-stack: `disp.prism_ai` -> PNG channel rendered; `ghost.galaxy.wedm`
(10 nodes/10 edges) -> MD fallback; both carry `node-id:` markers + a visual layer.

## 2-agent scrutiny

A (code-analyzer) + B (reviewer) both FAIL -> all P0/P1 fixed: per-call mkdtemp PNG-dir leak
(-> one stable reused dir + delete-after-data-uri), layer path-traversal in the filename
(-> engine sanitize + Zod regex), data-uri no size guard (-> skip+warn over maxPngBytes),
dispatcher dropped maxPngBytes/outDir (-> plumbed + schema), recursion guard evadable by a
json-only prompt (-> guard on any sentinel), nodeId="" raw-throw (-> pre-validated dispatcherError).
Rejected A's `emptyForLayer` "fix" (would break the legit center-in-layer case -- current
`every(n => n.id===center && n.layer!==layer)` is correct).

## Lessons

- Headless screenshots via a SYSTEM browser (`chrome --headless --screenshot`) need no npm dep,
  but are environment-flaky: a running Chrome forwards `chrome.exe` to its singleton and no-ops
  the capture. Design the visual channel so the text (mermaid) fallback is the guaranteed path.
- A best-effort enhancement (PNG) must never be the only delivery of a contract (a visual layer).
- data-uri inlining of binary into an LLM prompt needs a byte ceiling -- base64 is ~1.33x and
  blows the prompt budget silently otherwise.

## Next: U-GAC05..08 (4 remaining)
spatial-UI agent coordination (deps GAC01+GAC04), community summaries (deps GAC02), stale-graph
guard hook (1h cron), hallucinated-node-id guard hook (hooks = cross-worktree-blocked, use node-fs).
