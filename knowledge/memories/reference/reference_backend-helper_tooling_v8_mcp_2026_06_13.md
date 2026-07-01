---
name: reference_backend-helper_tooling_v8_mcp_2026_06_13
description: "Backend-helper (papa) Phase-2 deep-research anchor — TS Compiler API + ts-morph (AST), esbuild internals (Go, tree-shaking, plugins), V8 GC + --max-old-space-size + the 512MiB string cap 0x1fffffe8 (repo lesson), Node worker_threads/perf_hooks, MCP protocol (JSON-RPC 2.0 stdio/SSE), vitest, Windows scheduled-task + process-ancestry (reaper model), pure-fn+isMain test-seam pattern. Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.476Z
aliases: reference_backend-helper_tooling_v8_mcp_2026_06_13
---


**Context:** Phase-2 anchor for the backend-helper galaxy (papa — build/infra/dev-loop support across galaxies),
per the 2026-06-13 knowledge-max `/goal`. World-leading "expert" here = world-class engineering on THIS stack.
Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §papa.

## The PRISM stack internals to master
- **TypeScript Compiler API + ts-morph** — programmatic AST read/transform (the right tool for codemods, wiring
  audits, dispatcher generation — vs regex). SWC for fast transpile.
- **esbuild** — Go-based bundler (build:fast ~3s); plugin API (onResolve/onLoad), tree-shaking, ESM/CJS interop.
  PRISM build = tsc (types) + esbuild (bundle); `build:incremental` for the middle path.
- **V8 memory** — generational GC; `--max-old-space-size` (PRISM build uses 16 GB heap; Blackwell box has 136 GB
  RAM → be generous, never fight a low default). **The 512 MiB string cap** `0x1fffffe8` (536,870,888 B) —
  `JSON.parse(readFileSync(...,'utf8'))` THROWS above it (the tribal-index + system-graph lesson) → read as Buffer
  + incremental parse, or shard. This is THE recurring repo failure class papa owns.
- **Node** — worker_threads (CPU-bound parallel), perf_hooks (timing), streams + readline (the >cap-file pattern),
  spawnSync for child tools.
- **MCP protocol** — JSON-RPC 2.0 over stdio (or SSE); tools/resources/prompts; the prism_* dispatchers are MCP
  tools. Lazy-import dispatch + Zod schema validation.
- **vitest** — vite-powered, fast, happy-dom; `node:test` for the .mjs scripts. Real reference-value tests (R9),
  never toBeDefined() stubs.
- **Windows Task Scheduler + process ancestry** — scheduled-task node child's parent = svchost/scheduler (NOT a
  chat) → reaper-immune (the durable-task pattern this very session used for galaxy mining).

## Engineering discipline (the "expert" bar)
- SOLID / DRY (3× rule) / YAGNI; dependency injection for testability; **pure functions + `isMain` guard** (the
  repo's test-seam pattern — export pure logic, guard the CLI dispatch so imports don't execute it). Cyclomatic
  complexity < 10/fn; fail-loud (R12) over fail-open (the tribal-index fail-open clobber lesson).

## Integration (papa)
- Serves EVERY galaxy (build fixes, infra, dev-loop). Next deep-research (roadmap §papa): codify the V8 string-cap
  + heap patterns + the buffer/shard recipe into a reusable backend-helper playbook engine (recurring failure
  class); ts-morph-based wiring codemod for romeo.

Sources (canonical): TypeScript Compiler API + ts-morph docs; esbuild documentation; V8 / Node.js docs (GC,
string length limit, worker_threads); Model Context Protocol spec (JSON-RPC 2.0); vitest docs. Cross-referenced to
PRISM repo lessons ([[reference_tribal_index_v8_string_cap_2026_06_08]], the heap-reexec + reaper-immune patterns).
