---
name: reference_dispatcher_bundle_path_resolution_bug_2026_06_25
description: P0 - 7 dispatcher sites that load scripts/*.mjs via import.meta.url resolve the WRONG path in the esbuild code-split bundle runtime (import.meta.url=dist/index.js, not src/tools/dispatchers) -> MODULE_NOT_FOUND, 6 fail silently. Found live via :3100 bridge. 2026-06-25 slot:india.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.553Z
aliases: reference_dispatcher_bundle_path_resolution_bug_2026_06_25
---


**P0 production bug: dispatcher `scripts/`-loading sites mis-resolve the repo root in the esbuild bundle runtime.** Found empirically via a live `:3100` bridge `tools/call` (NOT catchable by a standalone dryRun — only the bundled dispatcher runtime exhibits it).

## Symptom (empirical, live)
`curl -X POST :3100/mcp tools/call {name:prism_ai, arguments:{action:blueprint_loop_drain, dryRun:true}}` →
`{"success":false,"error":"Cannot find module 'H:\\scripts\\lib\\blueprint-loop-drain-lib.mjs' imported from H:\\prism\\mcp-server\\dist\\index.js"}`.
Resolved path = `H:\scripts\lib\...` (WRONG; should be `H:\prism\scripts\lib\...`).

## Root cause (confirmed)
`esbuild.config.mjs` DEFAULT = code-splitting → `dist/index.js` (9.3MB bundle) + `dist/chunk-*.js`; `package.json start = node dist/index.js`. So the RUNTIME is the esbuild bundle. Bundled dispatcher code has `import.meta.url = dist/index.js` (1 level under `mcp-server`). But the source does:
```
const dispatcherDir = path.dirname(fileURLToPath(import.meta.url)); // = mcp-server/dist  (NOT src/tools/dispatchers)
const repoMcpRoot   = path.resolve(dispatcherDir, "..", "..", ".."); // assumes dist/tools/dispatchers -> over-climbs to H:\
const target        = path.resolve(repoMcpRoot, "..", "scripts/lib/..."); // -> H:\scripts\... (broken)
```
The 3-level climb is correct ONLY for the unbundled `src|tsc /tools/dispatchers/X` layout; under the bundle (`dist/index.js`) it over-shoots by 2 levels. (`dist/tools/dispatchers/*.js` DOES exist from tsc, but is NOT what runs — the bundle index.js runs.)

## Blast radius (7 sites, 6 SILENT)
`grep -nE 'resolve\([a-z]+, "\.\.", "\.\.", "\.\."\)'` in dispatchers:
- aiReasoningDispatcher.ts:4256, **5050 (blueprint_loop_drain — surfaces the error)**
- cadDispatcher.ts:2452 (RAG tribal loader), 2555 (drive variant), **3423 + 3451 (blueprint_rag_extract recordOutcome / U-BPA-RAG-RECORDOUTCOME)**, 3509
All load `scripts/*.mjs`. The 6 non-blueprint_loop_drain sites are wrapped in try/catch or fail-soft fallbacks (return [] / advisory), so they **fail SILENTLY** -> features silently degraded in the bundled prod server: RAG tribal injection (returns no tribal priors), recordOutcome (never records via the dispatcher path -> explains the week-old/145-only ledger!), etc.
**R12 CORRECTION:** "U-BPA-RAG-RECORDOUTCOME verified done" earlier this session was SOURCE-level; it is BROKEN in the bundled RUNTIME. "Wired in source" != "works in the bundle." Verify dispatcher scripts/-loads via the LIVE bridge, not just by reading source.

## FIXED -- c741b6074d (slot:india 2026-06-25), 3-of-3 PASS
Shipped `mcp-server/src/utils/resolve-repo-root.ts` -- depth-independent `resolveRepoRoot()` that walks up to the nearest ancestor containing BOTH `.git` AND `mcp-server/`. **Marker pitfall caught by live validation (R12):** a bare `mcp-server/` marker FALSE-MATCHES because the live tree has `mcp-server/mcp-server/` + `mcp-server/src/mcp-server/`; `.git` (absent from mcp-server/) disambiguates (and is a FILE in slot worktrees -- existsSync covers it). Wired into all 7 sites via `resolve(resolveRepoRoot(), "mcp-server")` (keeps every downstream resolve identical): aiReasoningDispatcher x2 (blueprint_loop_drain, lora-pairs); cadDispatcher x5 (corpus-report x2, RAG tribal loader, recordOutcome, lora-pairs). resolve-repo-root.test.ts 7/7 (bundle/tsx/tsc layouts + nested-mcp-server false-match guard + fail-loud). LIVE PROOF: `resolveRepoRoot('.../mcp-server/dist')` -> H:/prism, drainPath -> `H:\prism\scripts\lib\blueprint-loop-drain-lib.mjs` (exists:true; was the broken `H:\scripts\...`). build:fast clean; 4 files type-clean.
**ACTIVATES ON NEXT :3100 MCP-SERVER RESTART** -- the running process holds the old bundle; did NOT unilaterally restart the shared server. After restart: blueprint_loop_drain loads, the RAG tribal loader + recordOutcome stop silently failing, and the autonomous-trigger unit becomes viable.

## Follow-ups (3-of-3 found; separate units)
- **SIBLING bug -- FIXED d6b917f831 (U-DISPATCHER-REPO-ROOT-SIBLING):** `mcp-server/src/engines/SchemaCoverageAuditEngine.ts:26` `PROJECT_ROOT = resolve(ENGINE_DIR,"..","..","..")` at MODULE scope over-shot to the drive root in the bundle (SCHEMAS_DIR/OUT_FILE wrong). Now `PROJECT_ROOT = resolveRepoRoot()`. Validated: tsx module-load OK, root=H:/PRISM, paths exist, build:fast clean. Bug-class CLOSED (the 7 dispatcher sites + this engine). [activates on next :3100 restart] Lazy-imported (devDispatcher), so a module-scope throw can't crash boot.
- 3 dead `const dispatcherDir = ...` lines left in cadDispatcher (3422/3450/3508) -- harmless (noUnusedLocals:false) but a future reader could "fix" them back to a climb; cosmetic.
- resolve-repo-root.ts:37 docstring says "no ancestor ... mcp-server/" but the marker/throw require BOTH .git + mcp-server (P2 doc imprecision; code correct).

Verify the live symptom: `curl -s -X POST http://127.0.0.1:3100/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"prism_ai","arguments":{"action":"blueprint_loop_drain","dryRun":true}}}'`. Sibling: [[reference_blueprint_consumer_cron_2026_06_25]].
