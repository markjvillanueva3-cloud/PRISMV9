# PRISM CAM Plugins — User Documentation

PRISM ships an in-host plugin for each of the four production CAM systems
JM Die Company runs daily. The plugin surfaces every PRISM physics overlay,
predictive alert, optimization suggestion, and tribal-knowledge tooltip
**inside the CAM UI you already use** — no context switching, no copy-paste.

| CAM Host       | Transport  | Payload Format       | Doc                                    |
|----------------|------------|----------------------|----------------------------------------|
| hyperMILL      | WebSocket  | XML-RPC              | [hypermill.md](hypermill.md)           |
| Fusion 360     | WebSocket  | JSON-RPC 2.0         | [fusion360.md](fusion360.md)           |
| Inventor HSM   | WebSocket  | typed JSON           | [inventor-hsm.md](inventor-hsm.md)     |
| Mastercam      | WebSocket  | pipe-delimited       | [mastercam.md](mastercam.md)           |

For PRISM developers integrating a new CAM host, start with
[architecture.md](architecture.md). For installation troubleshooting common
to all four hosts, see [troubleshooting.md](troubleshooting.md). For the
planned in-host video tutorials, see [video-tutorials.md](video-tutorials.md).

## What every plugin gives you

Each plugin connects to the local PRISM MCP server via the
**CAM Plugin Communication Hub** (U-CAM96) and surfaces these capability
groups:

| Capability                 | Source engine (MCP action)                | What you see in the CAM UI                                         |
|----------------------------|-------------------------------------------|--------------------------------------------------------------------|
| Force overlay              | `cam_overlay_force_render`                | Real-time Fc bar across the active toolpath                        |
| Chatter SLD overlay        | `cam_overlay_chatter_render`              | Stability-lobe diagram with current operating point                |
| Deflection overlay         | `cam_overlay_deflection_render`           | Tool-tip deflection budget (μm)                                    |
| Thermal overlay            | `cam_overlay_thermal_render`              | MRR-vs-coolant capacity heat-bar                                   |
| Tool life overlay          | `cam_overlay_tool_life_render`            | Taylor T-bar with predicted minutes remaining                      |
| Safety score overlay       | `cam_overlay_safety_score_render`         | Composite S(x) traffic light                                       |
| Geometry handoff           | `cam_geometry_*` (U-CAM97)                | Streams STEP / STL / OBJ blobs to/from PRISM                       |
| Speed/Feed bridge          | `cam_speedfeed_compute` (U-CAM99)         | One-click "use PRISM SF" button per operation                      |
| Post selector              | `cam_post_select`,  `cam_post_dashboard`  | Auto-selects PRISM-enhanced or vendor-stock post per machine       |
| Tribal-knowledge tooltips  | `cam_tooltip_render` (U-CAM101)           | Context tooltips drawn from 4,758 operator tips                    |
| Predictive alerts          | `cam_predict_scan` (U-CAM102)             | Ranked critical/high/medium/low alerts before cycle start          |
| Optimization suggestions   | `cam_suggest_recommend` (U-CAM103)        | One-click "Apply" patches for cycle-time / tool-life / Ra          |
| Plugin health monitoring   | `cam_registry_health` (U-CAM98)           | online/degraded/offline status with auto-reconnect                 |

## Common requirements

- **PRISM MCP server** running on the same workstation (default port 7421)
- **Windows 10/11 x64** (the JM Die test shop standard)
- **Network**: localhost only — no firewall changes needed for default install
- **CAM host minimum versions**: see each plugin's doc

## Single source of truth

The plugin's behavior is fully defined by the engines listed above. If you
suspect a mismatch between what the plugin shows and what PRISM computes,
call the dispatcher action directly from the MCP CLI to see the same
result the plugin received — there is no hidden middle layer.
