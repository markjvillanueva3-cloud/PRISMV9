---
title: Dispatcher false-wires (`?? {note:"method not callable"}`) + duplicate `case` dead code
domain: code-tribal
tags: [dispatcher, false-wire, dead-code, R12, business, bulk-sweep]
created: 2026-06-01
by: claude-223d9a61 (slot:hotel)
related: [[feedback_always_update_wiki_on_bug_finding]] [[feedback_net_benefit_auto_build]]
---

# Two systemic anti-patterns in big MCP dispatchers

Found + fixed in `businessDispatcher.ts` (commit `701210abf2`, BUSINESS-CLEANUP/U-HOTEL-FALSE-WIRE-CLUSTER). Both came from a single "iter8 bulk-sweep" that wired 9 actions mechanically without verifying the engines' real APIs.

## Anti-pattern 1 — the guessed-method false-wire (an R12 lie)

```ts
// WRONG — looks wired, always returns the placeholder
result = { success: true, data:
  (_engine as any).methodA?.(params)
  ?? (_engine as any).methodB?.(params)
  ?? (_engine as any).run?.(params)
  ?? { engine: "FooEngine", note: "method not callable" } };
```

The `.methodA/.methodB/.run` names were **guesses** — none existed on the engine, so the `??` chain always fell through to `{note:"method not callable"}` **with `success:true`**. That is the R12 lie: a fake success on a call that never happened. A caller (or a downstream training loop) sees `success:true` and trusts garbage.

**Detection:** grep the dispatcher for `method not callable` / `?? { engine:`. Every hit is a false-wire until proven otherwise.
**Fix:** read the engine's REAL exported method signatures (and whether they're `static` on the class vs instance methods on the singleton), then route explicitly with a `sub` param, validate required inputs, and **throw** on a missing input rather than returning a placeholder. Default each action to a SAFE READ; require an explicit `sub` for any mutating method (financial/ERP soul: never silently mutate).

## Anti-pattern 2 — duplicate `case` label = dead shadowed code

The same bulk-sweep appended a second `case "customer_portfolio_mine":` to a switch that **already** had a real handler ~2000 lines earlier (`-> mineCustomer(customer_name)`). In JS the **first** matching `case` wins and `break`s, so the appended duplicate is **dead/shadowed** — never executed. TypeScript does **not** error on duplicate `case` labels, so it hides.

**Detection:** `grep -n 'case "<action>":'` — any action appearing twice in one switch has a dead duplicate.
**Fix:** delete the duplicate (keep the earlier real one), and remove any now-orphaned lazy-holder (`let _x: any;`) whose only consumer was the dead case.

## Verification that actually proves it (not a unit test that imports the world)

Restart the live `:3100` MCP server on the fresh `dist`, then round-trip each action through `/mcp` (`{action, params:{...}}` — params MUST nest under `params`). Real data back = real wire. Examples that landed: `customer_portfolio_mine` -> ALCOA 11 programs + tool-preference histogram; `docustrata_customer_index_search` totals -> 240 real customers; `cost_efficiency_bridge_analyze` -> loud-throws on a missing `BridgeInputs` field instead of fabricating a cost.

> **:3100 restart gotcha:** the server is supervisor-pinned (`scripts/mcp-server-supervisor.mjs`) and ignores `PORT` (binds only :3100). A manual `Stop-Process`+`Start-Process` RACES the supervisor and you probe STALE code (`HEALTHY after 0s` is the tell). Reliable: kill the :3100 listener PID **and every zombie `dist/index.js`**, wait ~8s for the supervisor to respawn the fresh dist, verify `uptime_seconds < 120` before probing.

## FLEET-WIDE SCOPE (discovered 2026-06-01, slot hotel) — this is NOT a business-only problem

`grep -rc 'note: "method not callable"' mcp-server/src/tools/dispatchers/` -> **341 occurrences across 14 dispatchers**. The iter8-style bulk-sweep false-wired actions across the ENTIRE MCP surface, not just business. By owning-slot:

| Dispatcher | count | owner |
|---|---|---|
| aiReasoningDispatcher | 69 | india |
| calcDispatcher | 63 | oscar (SFC/physics) |
| camDispatcher | 55 | kilo |
| edmDispatcher | 41 | mike (WEDM) |
| devDispatcher | 24 | papa |
| orchestrationDispatcher | 19 | — |
| qualityDispatcher | 19 | quality |
| cadDispatcher | 15 | delta |
| safetyDispatcher | 13 | **safety-critical** |
| turningDispatcher | 6 | whiskey |
| authDispatcher | 6 | — |
| fiveAxisDispatcher | 5 | 5-axis |
| millDispatcher | 3 | foxtrot |
| businessDispatcher | 3 | hotel (now only the accidentally-real defensive fallbacks) |

**Hotel closed its lane** (businessDispatcher: 19 genuinely-false wired real across U-HOTEL-FALSE-WIRE-CLUSTER iters 1-4, commits 701210abf2 / d8e8b1bfa3 / 15c1db8621 / 919e40e395; the 3 remaining are accidentally-real: `business_sync_stats`/`cash_flow_project`/`burden_rate`). The other **~290 (est. ~85% genuinely false)** belong to other slots. **A `calc`/`safety` action returning `{note:"method not callable"}` with `success:true` is a physics/safety hazard — a caller trusts a fabricated answer.** Each owning slot should sweep its dispatcher with this recipe: grep `note: "method not callable"`, separate genuinely-false (generic `.run/.manage/.analyze` guesses) from accidentally-real (guessed name matches), wire the false ones to the engine's REAL method (sub-routed + validated + loud-throw), live-prove on :3100.
