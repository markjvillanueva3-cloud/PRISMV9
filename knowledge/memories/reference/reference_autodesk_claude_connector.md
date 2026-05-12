---
name: autodesk-claude-connector
description: Autodesk released a Claude connector/extension that PRISM can exploit. Already partially wired via AutodeskFusionMCPProxyEngine (the JSON-RPC client for Autodesk's official Fusion 360 MCP server). Hook into PRISM's CAD AI pipeline whenever working on CAD designing, drawing, or Fusion 360 integration.
type: reference
originSessionId: bee98bb8-8225-44b2-a173-84f75e3ee61b
---
# Autodesk Claude Connector / Extension

**Status:** Released by Autodesk. PRISM should exploit it for the print→CAD pipeline and the broader CAD AI system.

## What's already integrated

- **`AutodeskFusionMCPProxyEngine.ts`** (graduated to canonical in CAD-FUSION-LIVE-MS0 PHASE18, commit `d6781865d`) — JSON-RPC client for Autodesk's official Fusion 360 MCP server (release 2026-04-28). Lives at `mcp-server/src/engines/AutodeskFusionMCPProxyEngine.ts`. Used by `CADSystemRouterEngine.planAndRender` when `system: "fusion360"` is selected.

- **`Fusion360LiveBridgeEngine.ts`** — direct HTTP bridge to a Fusion 360 add-in on `:18360`. Used by the `prism_cad` dispatcher actions for live geometry building. Add-in install: `H:\prism\mcp-server\fusion-addin\` (per session da2aef6f handoff — `revolveStepProfile`, `extrudeTapered`, `crossDrillHoles` typed methods restored in PHASE2C).

## What the Claude connector likely unlocks

The Anthropic-Autodesk connector probably exposes Fusion 360 (and possibly other Autodesk products: AutoCAD, Inventor, Revit, Maya) to Claude as MCP tools. PRISM's role:

1. **Replace direct HTTP bridge** (`Fusion360LiveBridgeEngine` :18360) with the official MCP connector when available — fewer install steps for users (no PRISMBridge add-in install).
2. **Multi-product reach** — if the connector covers AutoCAD/Inventor/Revit, PRISM gets those CAD systems for free. PHASE18 already has `*CADExecutionBridge.ts` engines for SW/Inventor/Mastercam/HyperCAD/Esprit emitting native scripts; the connector could replace the script emission with direct MCP tool calls.
3. **Extension manifest** — wherever Autodesk publishes the connector spec, mirror the schema into `mcp-server/data/cad-functions/autodesk-claude/<product>/function-index.json` so `CADSystemRouterEngine.findOperationAcrossSystems()` can discover ops via the connector.

## Action items when you're touching CAD work

- Check whether `AutodeskFusionMCPProxyEngine` needs to be re-pointed at the new connector endpoint.
- If the connector ships an OpenAPI/JSON-RPC schema, map it into the existing `data/cad-functions/fusion360/` catalog so the router treats it as another module of the function index.
- See if Autodesk's connector exposes Inventor/AutoCAD/Revit too — if yes, expand `SUPPORTED_CAD_SYSTEMS` in `CADSystemRouterEngine.ts` accordingly (currently 6: fusion360, inventor, mastercam, hypercad, solidworks, esprit).
- Cross-reference: `AutoCADAddinPluginEngine.ts` (orphan, no default singleton) — the Claude connector may obsolete the need to ship a manual AutoCAD add-in.

## Why this is permanent knowledge

Autodesk integrations are foundational to the CAD-FUSION-LIVE-MS0 milestone and every print→CAD-draw test. Forgetting the connector exists means re-implementing what Autodesk already gave us for free. Future CAD sessions should always check this entry before deciding whether to write new bridge code or extend the existing connector.
