---
session: claude-1415666f
topic: system-viz-simple-fix
written_at: 2026-05-11T02:07:17.465Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-1415666f
status: active
---

# HANDOFF: claude-1415666f
Updated: 2026-05-11T02:07:17.465Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-1415666f

## STATE
U-VIZ-PERF shipped d2833bfd9; type=module fix was reverted; need async-IIFE wrapping instead

## RESUME
Finish U-VIZ-PERF simple viewer fix. CRITICAL UPDATE: my earlier 'change script to type=module' edit was REVERTED (system-reminder confirmed at line 107 of simple.html shows plain <script> tag, intentionally kept). DO NOT re-add type=module. Instead, wrap the top-level await in an async IIFE — plain <script> tag does not support top-level await. STEPS: (1) Read H:/prism/state/shared/system-viz/simple.html around line 133 — the bare 'try { G = await loadGraph(true); } catch ...' block needs to be wrapped: async function boot() { let G; try { G = await loadGraph(true); } catch (e) { toast('✗ ' + e.message, true); G = { nodes:[], edges:[], layers:[], meta:{} }; } /* …everything below currently at top level moves here, OR stays at top-level but is rewritten to use .then() chains… */ }. EASIER ALTERNATIVE: wrap the whole top-level body in (async () => { … })(); — single edit, no restructuring. (2) Hoist any 'let G, layout, mode, edgesOn, pinned, hovered' declarations to outside the IIFE if they need to be reached from event handlers — they currently are at top level and used by handlers added later in the file. Cleanest: declare them at top level with plain 'let', then have the IIFE assign G = await loadGraph(true), call computeLayout(), call resize(), call refreshHud(). (3) Verify viz server is alive: curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8765/ — if not 200, restart: H:/Tools/nodejs/node.exe H:/prism/state/shared/system-viz/_server.cjs run_in_background. (4) Commit: cd H:/prism && git add state/shared/system-viz/simple.html && git commit -m '[CAD-FUSION-LIVE-MS0]/U-VIZ-PERF-FIX: wrap top-level await in async IIFE — plain <script> does not support top-level await'. (5) Tell user to Ctrl+Shift+R http://127.0.0.1:8765/. AFTER fix verified: continue last 15% layer-saturation — L5 'other' bucket reclassifier (2167 mis-classified engines, use import-pattern analysis), L1 frontend apps (cqask/ui + mcp-cadquery/frontend not drilled), L7 registry entries (data dir paths unknown — discover via mcp-server/data/state/*-catalog.json), L9 fs-deep --full mode, engine→engine semantic edges (produces/consumes typed flow beyond imports).

## CONTEXT
5 commits this session: c4672f4f5 U-VIZ-COMBO, 1cc6c68a7 U-VIZ-SATURATE, 95bc680ff U-VIZ-SATURATE2, 72c3547ff U-VIZ-SATURATE3 (introduced L4a action layer with 9228 atomic action nodes), 165b53362 U-VIZ-SATURATE4, d2833bfd9 U-VIZ-PERF. Graph: 126441 nodes / 136106 edges / schema 2.24.0. Server has in-memory cache + gzip/brotli + skeleton endpoint. Routes: / → simple.html (2D Canvas, zero deps), /3d → system-viz.html (Three.js from unpkg CDN — silent CDN failure suspected). Both should load skeleton first then upgrade on F key. Performance: skeleton gzip 172KB/5ms, full gzip 6.1MB/670ms. The system-viz.html top-level await DOES work because it has type=module via importmap — only simple.html broke from missing the attribute. Peer claims at crash: claude-99eca613 owns revenue-roadmap audit findings; claude-845cf238 owns OutcomeEpisodicMemoryBridgeEngine; claude-2d87fea3 owns TribalKnowledgeEngine. Don't touch any of those.
