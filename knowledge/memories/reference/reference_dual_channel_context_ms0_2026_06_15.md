---
name: reference_dual_channel_context_ms0_2026_06_15
description: "GRAPH-AS-LLM-CONTEXT-MS0/U-GAC04 shipped (slot:sierra, 2026-06-15). DualChannelContextEngine = JSON ego-graph (node-id: markers) + viz layer (system-Chrome PNG best-effort, mermaid+markdown fallback) for subagent dispatch. Wired prism_session:dual_channel_dispatch + scripts/render-viz-screenshot.mjs. 30 tests. 4/8 units."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.557Z
aliases: reference_dual_channel_context_ms0_2026_06_15
---


# GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04 -- DualChannelContextEngine (2026-06-15, slot:sierra)

Fourth unit of the roadmap loop (operator "push through all building, self compaction").

## What shipped
- `mcp-server/src/engines/DualChannelContextEngine.ts` -- builds a DUAL-CHANNEL subagent
  context bundle around a graph node: (1) JSON channel = ego-graph addressed by explicit
  `node-id:` markers + raw JSON; (2) viz channel = a real PNG via SYSTEM Chrome/Edge headless
  when free, else a mermaid+markdown "visual layer" fallback. Methods: `attachJsonContext`,
  `attachVizScreenshot`, `buildDualChannel` (primary). Modes json-only/viz-only/both.
  **Composes GAC01** (extractEgoGraph + render); does not re-implement.
- `scripts/render-viz-screenshot.mjs` -- headless PNG via `chrome --headless --screenshot`
  (NO npm dep -- puppeteer/playwright/canvas all absent; system browser is not a package).
  Exports esc/buildHtml/findChrome for Chrome-free unit tests.
- Wired `prism_session:dual_channel_dispatch` (sessionDispatcher case + sessionActionSchemas
  + ACTIONS tuple). 30 tests (engine 16 + dispatcher-wire 4 + render-script 10).

## KEY DECISIONS / gotchas
- **System Chrome headless is environment-FLAKY**: a running Chrome (19 procs) makes the
  chrome.exe launch forward to its singleton and silently no-op the screenshot (exit 0, no PNG).
  Worked at turn-start (no Chrome running -> 921B valid PNG) then failed once Chrome was live.
  So PNG is BEST-EFFORT; the **mermaid+markdown fallback is the GUARANTEED visual layer**.
  Live-proven BOTH: `disp.prism_ai` -> PNG rendered; `ghost.galaxy.wedm` (10n/10e) -> md-fallback.
  A best-effort enhancement must never be the sole delivery of a contract.
- **No npm dep added** (operator "ask before unseen library"): used the system browser CLI.
- **security_reminder_hook.py (a plugin)** blocks the FIRST Write/Edit per file per session whose
  content contains the substrings for the shell-spawn family (even on the SAFE execFile variant,
  and even in markdown docs that merely MENTION them -- a false positive). It saves the warning
  key then ALLOWS the identical re-submit. So: re-issue the same Write once and it passes.
- ascii-guard blocks em-dash in code comments -> use `--`.

## 2-agent scrutiny (A code-analyzer + B reviewer, both FAIL -> all P0/P1 fixed)
- per-call mkdtemp PNG-dir leak -> ONE stable reused dir (`os.tmpdir()/prism-gac04-png`,
  overwrite-by-name) + delete the file after a successful data-uri encode.
- `layer` path-traversal in the PNG filename (`.${layer}.png`) -> engine sanitize
  (`[^A-Za-z0-9_-]->_`, slice 20) + Zod `layer` regex `^[A-Za-z0-9_-]{1,20}$` at the boundary.
- data-uri had NO size guard (~13MB base64 into a prompt) -> skip+warn over maxPngBytes, keep path.
- dispatcher dropped maxPngBytes/outDir -> plumbed + schema (note: `.passthrough()` already let
  them flow, so functional even pre-schema; schema is discoverability + the layer-regex teeth).
- recursion guard evadable by a prior json-only block -> guard on ANY sentinel, not viz-modes.
- nodeId="" raw engine throw -> pre-validate in handler -> structured dispatcherError.
- REJECTED A's `emptyForLayer` "fix" (would break the legit center-IS-in-layer case; current
  `every(n=>n.id===center && n.layer!==layer)` is correct).

## Milestone status: 4/8
Done: GAC01 (GraphContextLensEngine), GAC02 (GraphRAGRetrievalEngine), GAC03 (CodeGraphProjectionEngine),
GAC04 (this). Next: GAC05 spatial-UI coord (deps GAC01+GAC04), GAC06 community summaries (deps GAC02),
GAC07 stale-graph-guard HOOK (1h cron), GAC08 hallucinated-node-id-guard HOOK (hooks=cross-worktree-blocked,
use node-fs).

Related: [[reference_graph_context_lens_ms0_2026_06_15]] · [[reference_graphrag_retrieval_ms0_2026_06_15]] · [[reference_code_graph_projection_ms0_2026_06_15]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]]
