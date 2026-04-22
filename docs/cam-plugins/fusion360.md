# Fusion 360 Plugin

PRISM's Fusion 360 plugin is an Autodesk **Add-In** loaded from the
**UTILITIES → ADD-INS** menu. It speaks JSON-RPC 2.0 to the PRISM MCP
server and exposes every capability through Fusion's native
right-click and palette UIs.

## Supported versions

| Fusion 360 release | Status         |
|--------------------|----------------|
| 2.0.20000+ (Apr 2024+) | Fully supported |
| 2.0.18900+              | Supported (some palette icons render at 1× scale) |
| Older                   | Not supported — Autodesk's Add-In API for CAM is too sparse |

## Installation

1. Quit Fusion 360.
2. Run `prism-cli plugin install fusion360` — copies the
   `PRISM.bundle` directory to `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\`.
3. Start Fusion 360 → **UTILITIES → ADD-INS → My Add-Ins** → check
   **PRISM** → click **Run** → optionally check **Run on Startup**.
4. The PRISM palette opens in the right-hand dock. Status pip turns
   green within ~1 s.
5. Auto-registers with the PRISM Plugin Registry (U-CAM98).

## Payload format

JSON-RPC 2.0, the same envelope Fusion uses for its own internal
client/server bridge:

```json
{
  "jsonrpc": "2.0",
  "method": "cam.predictionAlerts",
  "params": {
    "sessionId": "manuf-job-3142",
    "worstPriority": "high",
    "alerts": [ … ]
  }
}
```

Methods used:

| Method                              | Source engine action            |
|-------------------------------------|---------------------------------|
| `cam.predictionAlerts`              | `cam_predict_encode`            |
| `cam.optimizationSuggestions`       | `cam_suggest_encode`            |
| `cam.tribalTooltips`                | `cam_tooltip_render`            |
| `cam.speedFeed`                     | `cam_speedfeed_compute`         |

## Feature walkthrough

### Manufacturing workspace integration

In the **Manufacturing** workspace, right-click any setup or operation
→ **PRISM →** sub-menu:

- **Scan for risks** → runs `cam_predict_scan`, opens an alert palette
- **Optimize…** → runs `cam_suggest_recommend_all`, palette shows
  suggestions per goal; **Apply** rewrites the operation
- **Show tribal tips** → opens the tooltip palette anchored to the op

### Speed/Feed override

For any tool selection, the **PRISM SF** button computes the optimum
spindle/feed via `cam_speedfeed_compute` against PRISM's central
`SpeedFeedOrchestratorEngine`. One click writes the values back into
Fusion's tool library entry.

### Live overlays

The PRISM palette streams the six physics overlays (force, chatter,
deflection, thermal, tool life, safety score) at the rate Fusion can
redraw — typically 30 fps. The palette throttles to plugin's
`max_throughput_fps` capability advertisement.

## Troubleshooting

| Symptom                                | Most likely cause                                | Fix                                                      |
|----------------------------------------|--------------------------------------------------|----------------------------------------------------------|
| Add-In doesn't appear in **My Add-Ins**| Bundle copied to wrong folder for your locale    | `prism-cli plugin install fusion360 --locale <yours>`    |
| Palette opens but stays gray           | MCP server not running                           | `prism-cli serve`                                        |
| `compute_error` from speed/feed        | Fusion sent a tool material PRISM doesn't know    | See [troubleshooting.md](troubleshooting.md#unknown-material) |
| Crashes on **Run**                     | An older PRISM bundle is still on disk           | `prism-cli plugin uninstall fusion360 && prism-cli plugin install fusion360` |

## Uninstall

```powershell
prism-cli plugin uninstall fusion360
```

Fusion 360 stays installed. Only the PRISM bundle is removed.
