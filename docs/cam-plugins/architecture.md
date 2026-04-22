# CAM Plugin Architecture

The four CAM plugins (hyperMILL, Fusion 360, Inventor HSM, Mastercam)
share a common in-host architecture and talk to PRISM through a single
plane of MCP dispatcher actions. This document is for developers
integrating a fifth host or debugging cross-host behavior.

## Layered diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAM Host UI                             │
│  (hyperMILL side-bar / Fusion palette / Inventor ribbon /       │
│   Mastercam menu + Result Pane)                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │  WebSocket (default) or gRPC
                         │  payload format = host-specific
                         │     XML-RPC | JSON-RPC | typed-JSON | pipe
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              CAMPluginCommunicationHubEngine (U-CAM96)          │
│  per-target latency model • queue depth limits • hard-stop      │
│  propagation • per-session stats                                │
└─────┬──────────┬───────────┬────────────┬─────────────┬─────────┘
      ▼          ▼           ▼            ▼             ▼
 Force      Chatter    Deflection    Thermal      Safety Score
 Overlay    SLD        Overlay       Overlay      Overlay
 (U-CAM90)  (U-CAM91)  (U-CAM92)     (U-CAM93)    (U-CAM95)
                              ▲
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│                     Capability engines                           │
│  CAMGeometryExchangeEngine        — STEP/STL/B-Rep streaming     │
│  CAMSpeedFeedBridgeEngine         — wraps SpeedFeedOrchestrator  │
│  CAMPostSelectorUIEngine          — JM Die controller map        │
│  CAMTribalKnowledgeInjectionEngine — wraps TribalKnowledgeEngine │
│  CAMMachiningErrorPredictionEngine — 5 physics predictors        │
│  CAMOptimizationSuggestionEngine  — 3 goal generators            │
└─────────────────────────────┬────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│             CAMPluginRegistryEngine (U-CAM98)                   │
│  health state machine: online → degraded → offline → reconnect  │
│  SemVer compat enforcement • backoff schedule (1s..60s, max 10) │
└─────────────────────────────────────────────────────────────────┘
```

## Cross-engine contracts

Every plugin-aware engine exposes the same 5-target enum via
`supportedTargets()`:
**hypermill, fusion360, inventor_hsm, mastercam, generic**.
The U-CAM104 integration suite enforces this invariant — adding a
target to one engine without adding it to all is a build-breaking
contract violation.

The hub's frame types (`force`, `chatter`, `deflection`, `thermal`,
`tool_life`, `safety_score`) match the six overlay engines 1:1.

## Adding a fifth host

To add a new CAM host (e.g., NX CAM, PowerMill, ESPRIT):

1. **Add the target to every plugin-aware schema enum.**
   Files: `CAMPluginCommunicationHubEngine.ts`,
   `CAMGeometryExchangeEngine.ts`,
   `CAMPluginRegistryEngine.ts`,
   `CAMSpeedFeedBridgeEngine.ts`,
   `CAMPostSelectorUIEngine.ts`,
   `CAMTribalKnowledgeInjectionEngine.ts`,
   `CAMMachiningErrorPredictionEngine.ts`,
   `CAMOptimizationSuggestionEngine.ts`.

2. **Add a per-target encoder in each engine.** The encoder takes the
   engine's report type and returns a string suitable for the host's
   native handlers (XML / JSON-RPC / typed-JSON / pipe / etc.).

3. **Add `cam_<host>_*` actions to `prism_cam` dispatcher.** Follow the
   pattern of the existing 55 actions.

4. **Run `npx vitest run src/__tests__/cam-plugins/`.** The integration
   suite's "every plugin-aware engine supports the same N targets"
   contract test will fail until step 1 is complete for every engine —
   this is the "missed an engine" guard rail.

5. **Build the in-host plugin.** Each existing host plugin lives in
   `plugins/<host>/` (TypeScript build for WebSocket clients,
   C-Hook for Mastercam). Use the most architecturally similar
   existing plugin as a starting template.

## Why per-target encoders, not one canonical envelope?

Every CAM host already has a server-side message bridge with its own
parsing rules. PRISM produces payloads *those bridges already understand*
so plugin developers do not have to write a translation shim inside
the host. This is also why we accept the cost of maintaining 5 encoders
per engine — the savings on each plugin's host-side complexity dwarf it.

## Plugin-side dependency

Every plugin depends on:
- the **MCP server** running locally (default `ws://localhost:7421`)
- the **plugin registry** for compat checking + health
- one of the **2 transports** (WebSocket or gRPC)

Plugins do **not** depend on each other. A plugin offline in one host
has no effect on the others.
