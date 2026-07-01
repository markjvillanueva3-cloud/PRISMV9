---
name: reference_tango_register_algorithm_dispatcher_2026_06_15
description: tango registered prism_algorithm (algorithmDispatcher, 35 actions) in index.ts — a dormant dispatcher the ALGO-SYNERGY wiring left unexposed on the integration branch. Unblocks dormant-algo wiring. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.220Z
aliases: reference_tango_register_algorithm_dispatcher_2026_06_15
---


**TANGO REGISTER-ALGORITHM-DISPATCHER (slot tango, 2026-06-15, commit `39c1d501dc`)** — cron iter, the Workflow sweep's residual finding turned into a build.

**FINDING (from the stalled Workflow sweep's verify-agent, then tango-verified on the CURRENT tree):** `algorithmDispatcher.ts` exports `registerAlgorithmDispatcher(server)` (`server.tool("prism_algorithm", 35 actions` — signal/control/optimization/numerical/graph/search/interpolation/toolpath/surface/spatial/ml; lazy-loads `algorithmGatewayEngine` + `algorithmRegistry`) but **`index.ts` never called it** -> the `prism_algorithm` MCP tool was UNEXPOSED on `cad-fusion-live-ms0`. The ALGO-SYNERGY wiring (a87f10e75c etc.) landed on the `slot/tango` branch but the index.ts registration never reached the integration branch. Same class as `4734d6bd85` (the 5 dormant dispatchers I registered earlier this session).

**SAFE-to-register checks (mirrors the 5-dispatcher precedent):** register fn exists + signature `(server: Server)`; tool name `prism_algorithm` unique (absent from index.ts); NO deliberate-disable/"not on branch" comment (pure omission); both lazy deps exist on disk (`AlgorithmGatewayEngine.ts`, `AlgorithmRegistry.ts`).

**Registered** (import + call, in the existing tango dormant-dispatcher block). **R15 validated:** build:fast PASS; `tsc --noEmit` introduced ZERO new errors (the infraDispatcher/knowledgeDispatcher errors are PRE-EXISTING + unrelated — the `mod.quiz` one was in the session-start error log); `algorithmDispatcher.synergy.test.ts` **56/56** (dispatcher round-trip). Live on next MCP server restart (running server uses pre-edit build).

**HIGH ROI — unblocks the operator's repeated ask:** the work order kept listing "wire the ~20 dormant algorithms to prism_algorithm" — the BLOCKER was that prism_algorithm itself wasn't registered. Now it is; the algorithms route through it. **Lesson: a dispatcher can pass its own synergy test + have wired algorithms yet be invisible because index.ts never registers it — check index.ts registration, not just the dispatcher file.** Sister: [[reference_tango_dispatcher_register_ghost_2026_06_15]] (the earlier 5), [[reference_tango_wire_test_quality_dims_2026_06_15]] (same sweep).
