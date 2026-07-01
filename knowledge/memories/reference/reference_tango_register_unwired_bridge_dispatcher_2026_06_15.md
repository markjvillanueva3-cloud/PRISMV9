---
name: reference_tango_register_unwired_bridge_dispatcher_2026_06_15
description: tango registered prism_unwired_bridge (10 actions) + fixed algorithmDispatcher Server-strictness (tsc 641->637), and surfaced 4 more unregistered dormant dispatchers to owners via a registration-coverage diff. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.220Z
aliases: reference_tango_register_unwired_bridge_dispatcher_2026_06_15
---


**TANGO REGISTER-UNWIRED-BRIDGE-DISPATCHER (slot tango, 2026-06-15, commit `e1f7d3700c`)** — cron iter; a dispatcher-registration coverage diff (106 `register*Dispatcher` exports vs 101 called in `index.ts`) found **5 unregistered dormant dispatchers**.

**THE 5 FOUND:** `prism_cad_automation` (cadAutomationDispatcher.ts), `prism_cam_function` (camFunctionDispatcher.ts), `prism_machine` (machineDispatcher.ts), `prism_security` (securityDispatcher.ts), `prism_unwired_bridge` (unwiredBridgeDispatcher.ts). Same dormant-dispatcher class as `39c1d501dc` (algorithm) + `4734d6bd85` (the earlier 5).

**REGISTERED 1 (tango's lane, verified SAFE):** `prism_unwired_bridge` -- `registerUnwiredBridgeDispatcher(server: any)`, 10 read-only/analytical actions (asset recommend/synergy/unused, ARIMA/entropy/KL, complexity routing, world sim); lazy deps `AssetRecommendationEngine.ts` + `AssetSynergyDetectorEngine.ts` exist; no deliberate-disable comment. It exposes tango's OWN discovery capability via MCP -> in-lane. Registered at index.ts:804. R12: validated by build:fast + `tsc --noEmit` ONLY -- it has NO dedicated synergy test (unlike algorithmDispatcher's 56/56); a dispatcher round-trip test is a recommended follow-up, not done this iter. Don't claim it's R15-fully-validated.

**SIBLING FIX (R12 self-correction):** `39c1d501dc` registered `algorithmDispatcher` whose signature was `(server: Server)` -- the strict SDK type, UNLIKE Local(`any`)/ML(`unknown`)/ResourceExtraction(`any`). That call-site emitted a TS2345 (`McpServer not assignable to Server`) that my `reference_tango_register_algorithm_dispatcher` memory wrongly reported as "zero new errors". Aligned `algorithmDispatcher` param to the dominant `any`-convention (matches localDispatcher:495) + removed the now-unused `Server` import. Net **tsc 641 -> 637** (-1 call-site + -3 internal `server.tool` strictness errors the `Server` type was forcing). Pre-existing unrelated algorithmDispatcher.ts errors remain at lines 193 (engine-export typing) + 1282 (`split on never`) -- type-noise, the 56/56 synergy test proves the actions run.

**SURFACED 4 (NOT tango's lane -- surface, don't register):**
- `prism_cad_automation` -> **delta** (cad domain owner).
- `prism_cam_function` -> **kilo** (cam domain owner).
- `prism_machine` + `prism_security` -> **safety-sensitive**. Exposing a machine-control or security MCP tool has safety implications; needs operator/owner intent-confirmation before registration. Do NOT blind-register (soul rule).

**LESSON:** a registration-coverage diff (`grep register*Dispatcher exports` vs `grep calls in index.ts`) is a cheap, high-yield discovery -- 6 dormant dispatchers found across this session (algorithm + these 5). The "lane harvested" conclusion was premature twice; the diff keeps finding real coverage gaps. Sister: [[reference_tango_register_algorithm_dispatcher_2026_06_15]] (corrected here), [[reference_tango_wire_test_quality_dims_2026_06_15]].
