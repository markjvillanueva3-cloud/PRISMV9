---
name: reference_call_engine_server_free_invoker_2026_06_08
description: "scripts/call-engine.mjs — call any PRISM engine method directly without the MCP server (:3100); the documented \"run lean\" fallback for the prism_* dispatcher convenience layer."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.045Z
aliases: reference_call_engine_server_free_invoker_2026_06_08
---


`scripts/call-engine.mjs` (+ `.cmd`/`.sh` wrappers) invokes any PRISM engine singleton or named-export method **directly via `tsx`, with the MCP server (`:3100`) uninvolved**. Committed 2026-06-08 (slot:charlie, `316872f7`, `[TOOLING]/U-CALL-ENGINE`).

**Why it exists:** the 107 `prism_*` MCP dispatchers (13,866 actions) are thin Zod-validate → `engine.method(params)` routers over plain singletons in `mcp-server/src/engines/*.ts`. So for codebase navigation + H:-drive tooling the MCP server is **OPTIONAL** — every pure-compute dispatcher wraps an engine file callable directly. The server is genuinely load-bearing for only ~3 things: ranked semantic memory recall (`prism_memory`, fallback = Grep over `.md`), live machine connectivity (`prism_machine_live`), live WebSocket push to the web UI (`prism_realtime`).

**Usage:**
```
node scripts/call-engine.mjs <module> <export.method> '<json-params>'   # via tsx wrapper
node scripts/call-engine.mjs --list <module>                            # list exports
node scripts/call-engine.mjs --methods <module> <export>                # list singleton methods
```
- `<module>`: path under `mcp-server/src` (e.g. `utils/validators`) OR bare engine name (resolves against `src/engines/`).
- `<export.method>`: dotted = singleton + method; single token = named-export function called directly.
- params JSON: array → spread positional; else → single arg; absent → none.
- Run THROUGH tsx (the `.cmd`/`.sh` do this): `node <mcp-server/node_modules/tsx/dist/cli.mjs> scripts/call-engine.mjs ...`. The `dist/index.js` bundle is NOT per-engine importable — `tsx` over `src/*.ts` is the path.
- Fail-loud exit codes: 0 ok · 2 usage/JSON · 3 module-not-found · 4 export/method-not-found · 5 threw.

**Verified live (8/8 tests, `call-engine.test.mjs`):** `validateKienzle([1800,0.25,"P"])` → valid; out-of-range kc1.1 → invalid (R9 intent-flip); `prismSelfAwarenessEngine.findCapabilities("cutting force prediction")` → `CuttingForceEngine` etc., server-free.

**Gotcha caught building the test:** `spawnSync(...,{shell:true})` on Windows mangles JSON args with quotes/spaces (strips inner `"`, splits on spaces) → harness sees invalid JSON. Fix: invoke `node tsx/dist/cli.mjs` directly, NO shell — args pass byte-for-byte. Same class as any Windows shell-quoting bug. See [[feedback_verify_actual_contract_not_proxy]].

**Caveats (R12):** no dispatcher-side param normalization (snake_case→camelCase, unit coercion) — pass params in the shape the *method* expects. Needs `mcp-server/node_modules` (dev box). Tribal/Qdrant-backed methods may return empty without the server's indexed stores.
