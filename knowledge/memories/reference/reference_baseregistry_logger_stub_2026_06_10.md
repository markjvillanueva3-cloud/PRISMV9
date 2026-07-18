---
name: baseregistry-logger-stub-2026-06-10
description: "BaseRegistry (+ ~15 registry subclasses) is non-constructable: it imports { Logger } (a CLASS) from utils/Logger.js, but Logger.ts is a STUB exporting only `log`/`logger` consts -- no Logger class. `new Logger()` throws 'Logger is not a constructor'. Surfaced while hardening the MCP server (slot:golf). Owner: juliett (registries/database-expansion)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.476Z
aliases: reference_baseregistry_logger_stub_2026_06_10
---


# BaseRegistry can't construct -- Logger.ts is a stub with no `Logger` class (slot:golf, 2026-06-10)

## Verified facts
- `mcp-server/src/utils/Logger.ts` (1144 bytes) header literally says "Logger Stub for
  mcp-server dispatchers". It exports ONLY `export const log = {...}` and
  `export const logger = log`. `grep -nE "class Logger" Logger.ts` returns NOTHING -- there
  is no `Logger` class. (There is no separate lowercase `logger.ts`; on Windows the
  case-insensitive FS made an earlier `Read .../logger.ts` open this same stub.)
- `mcp-server/src/registries/BaseRegistry.ts:8` does `import { Logger } from '../utils/Logger.js';`
  and the constructor (line 62) does `this.logger = new Logger(\`Registry:${name}\`);`.
  Since `Logger` is not exported, it resolves to `undefined` -> `new undefined()` ->
  **TypeError: Logger is not a constructor**.
- PROVEN live: a vitest `class TestRegistry extends BaseRegistry` threw exactly this at
  `new BaseRegistry src/registries/BaseRegistry.ts:62:19` under the same esbuild/vite
  resolution the server build uses.
- `grep -rlE "extends BaseRegistry" src` = ~15 subclasses (Agent/Alarm/Algorithm/Coating/
  Coolant/Formula/Hook/KnowledgeBase/Machine/Material/... Registry). Every one inherits the
  broken constructor.

## NOT yet verified (do not overclaim -- R12)
- Whether any of those 15 subclasses are actually instantiated at runtime in the live
  `:3100` server. The server runs, so either (a) they are dormant / never `new`-ed on a hot
  path, or (b) their construction is swallowed by a try/catch somewhere, or (c) a stale
  `dist/` bundled a real Logger from an older checkout. The constructor THROW is proven; the
  runtime BLAST RADIUS is not. Investigate before claiming "the server is broken".

## Why this matters / how it was found
Found while hardening the MCP server (the 5-fix reliability cluster: transport try/catch,
callTool logging, slimResponse depth guard, bridge.ts logging, EventBus trim). The 6th/7th
candidate fixes (`BaseRegistry.persistItem -> atomicLockedWrite` + single-flight
`ensureInitialized`) were DROPPED because the class can't construct -> the fixes are
unvalidatable against a live path (R15 step 3) and would sit on an unproven foundation (R13).
Reverted both edits; surfaced this instead.

## Apply / next
- Owner = **juliett** (registries / database-expansion galaxy).
- Decide: was Logger.ts intentionally stubbed (migration to the `log` const) and BaseRegistry
  left dangling? If so, change `BaseRegistry` to use `log` (the const) + a per-instance name
  prefix instead of `new Logger()`. If a real `Logger` class is still wanted, restore it in
  Logger.ts WITHOUT breaking the `log`/`logger` const consumers (index.ts, EventBus, bridge,
  errorHandler, et al. import `{ log }`).
- Re-validate BaseRegistry construction with a real subclass test once fixed, THEN the
  dropped persistItem-atomic + single-flight-init hardening can land on a proven base.
