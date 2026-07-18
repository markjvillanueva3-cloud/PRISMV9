---
name: mcp-boot-crash-duplicate-prism-ai-2026-06-13
description: RESOLVED 2026-06-13 (slot:bravo) — fleet-wide MCP :3100 boot crash from duplicate tool registrations (prism_ai + prism_auth), fatal after @modelcontextprotocol/sdk caret-drifted 1.27.1->1.29.0 (silent last-wins -> hard throw). Fixed 4 ways; daemon healthy.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.650Z
aliases: reference_mcp_boot_crash_duplicate_prism_ai_2026_06_13
---


## RESOLVED 2026-06-13 (slot:bravo) — daemon healthy, verified live
**Root cause:** `@modelcontextprotocol/sdk` declared `^1.27.1` (package.json untouched since 2026-05-14) drifted to **1.29.0** installed via the unpinned caret. 1.29.0's `McpServer.tool()` HARD-THROWS `Tool <name> is already registered` (mcp.js:658-659) where the prior installed version silently overwrote (last-wins). Two dispatcher pairs had long registered the SAME tool name (harmless for 3+ weeks of boots under last-wins), so the drift crashed boot fleet-wide.
**Fix (4 parts, all committed; daemon restarted healthy in ~2s, /health=healthy, 0 dedup warnings):**
1. **R12 un-swallow** `src/index.ts` catch (~L1450): log `error.stack` not the `{}`-serializing Error object — exposed the real cause (permanent observability win).
2. **prism_ai:** removed the duplicate `registerAIDispatcher(server)` call + import. `aiDispatcher.ts` is an explicit STUB ("would normally call Python ModelRouterEngine; for now return...") whose 3 actions were already overwritten at runtime by the canonical 12-action `aiReasoningDispatcher` (registered later). File preserved on disk, just unwired. Behavior-preserving.
3. **prism_auth:** `claudeAccountDispatcher.ts` had mis-named its tool `"prism_auth"` (copy-paste collision with the SECURITY-CRITICAL `authDispatcher`, which registered later and won). Renamed to free name **`prism_claude_account`** — eliminates the collision AND restores 4 dead Claude-account-pool actions (list/switch/rotate/set-status; verified no external callers, relevant to ZEBRA-ACCOUNT-CYCLE).
4. **Dedup safety-net:** `proxiedTool` (src/index.ts:~576) now deletes any prior `_registeredTools[name]` before re-registering (restores historical last-wins) + logs a LOUD `[MCP-DEDUP]` warning — so a future accidental duplicate tool name degrades gracefully + is surfaced, instead of crashing the fleet.
**Note for the SDK API drift (separate, pre-existing, NOT fixed here):** tsc errors at `src/index.ts` ~L816-818/1175 (`McpServer` not assignable to `Server`, "Expected 0 arguments but got 1") = source still written for the older SDK API. These block full `npm run build` (tsc) but NOT `build:fast` (esbuild), which the daemon runs from. Owner: papa/server-core — reconcile the SDK API or pin the dep. → [[reference_obsidian_fully_operational_2026_06_09]]

---

## Original diagnosis (preserved)
2026-06-13 (slot:bravo, session 17b9f42e) — diagnosed a fleet-wide MCP outage hit during a goal session. The `:3100` MCP daemon (supervisor pid varies) crashes on boot, taking all `prism_*` dispatchers down for every chat. Supervisor auto-retries every 60s, hitting the same deterministic crash; fleet runs degraded via direct `node scripts/<X>.mjs` invocation.

## Root cause (VERIFIED, not assumed)
Boot registers ALL dispatchers, then dies exit 1. The fatal error was **swallowed as `{}`** at `src/index.ts:1443` (`log.error("Server startup failed", error)` — an Error object serializes to `{}`). Un-swallowed (see fix) → real stack:
```
Error: Tool prism_ai is already registered
  at McpServer.tool (node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:659)
  at registerAIReasoningDispatcher (src/index.ts:704 → aiReasoningDispatcher.ts:4323 server.tool(...))
  at bindDispatchers → runHTTP → main
```
Confirmed by reading the SDK: `mcp.js:659` `tool(name,...){ if(this._registeredTools[name]) throw new Error(\`Tool ${name} is already registered\`) }`. Boot logs wrap `prism_ai` TWICE (an early batch alongside prism_pfp/prism_memory/prism_auth, then again at index.ts:704). So `prism_ai` is registered twice in one boot; the SDK (apparently upgraded/stricter) now THROWS where it previously tolerated it.

## Ruled out (R12)
NOT OOM (24GB heap, gets past full registration) · NOT port conflict (3000+3100 both free) · the `Cannot find module '../dist/tools/registryBootstrapper.js'` warning is NON-fatal · `npm run build:fast` (exit 0, 4380 files) does NOT fix it.

## Anomalies → likely in-flight / botched SDK upgrade (papa)
- `require("@modelcontextprotocol/sdk/package.json").version` → **undefined** (repo expects `^1.27.1`) — possible partial/broken SDK install.
- tsc errors `src/index.ts:806-809` (`McpServer` not assignable / "Expected 0 arguments but got 1" at registerResources/registerPrompts/registerTaskTools/initMcpLogging) = SDK API drift, source not reconciled.
- Only ONE def named `prism_ai` exists (`aiReasoningDispatcher.ts:942`) and `registerAIReasoningDispatcher` is called once (704) — so the FIRST (early) `prism_ai` registration is via an obscure path; tracing it is server-core work.

## Fix applied this session (KEEP — uncommitted, isolated, R12)
`src/index.ts:1443` catch block now logs `error.stack || name:message` instead of the object → every future MCP boot crash shows the real cause instead of `{}`. Permanent fail-loud observability win. Whoever fixes the boot should keep this.

## Owner + next (papa / MCP-server-core)
Either (a) trace + remove the duplicate early `prism_ai` registration, or (b) reconcile the `@modelcontextprotocol/sdk` upgrade across all dispatchers (the McpServer API changed). Then `npm run build` + restart daemon (`node .claude/helpers/mcp-server-daemon.mjs start`). → [[reference_obsidian_fully_operational_2026_06_09]] (MCP recovery context)
