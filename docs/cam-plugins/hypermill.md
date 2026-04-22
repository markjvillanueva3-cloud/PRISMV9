# hyperMILL Plugin

PRISM's hyperMILL plugin runs as an OPENMIND-Technologies side-bar pane
inside hyperMILL 2024+ and surfaces every PRISM capability through XML
payloads compatible with the hyperMILL XML-RPC pipeline.

## Supported versions

| hyperMILL release | Status         |
|-------------------|----------------|
| 2024.1 +          | Fully supported |
| 2023.2 SR1+       | Supported (XML namespace differences handled automatically) |
| 2023.1 and older  | Not supported — upgrade path documented in [troubleshooting.md](troubleshooting.md) |

## Installation

1. Close hyperMILL.
2. Run `prism-cli plugin install hypermill` (writes the plugin DLL to
   `%APPDATA%\OPENMIND\hyperMILL\Plugins\PRISM\`).
3. Re-open hyperMILL → verify the **PRISM** tab appears in the side-bar.
4. In **Tools → Options → PRISM**, point the plugin at the local MCP
   server (default `ws://localhost:7421`). Click **Test connection** —
   the plugin status should turn green within ~1 s.
5. The plugin self-registers with the PRISM Plugin Registry
   (U-CAM98). To verify, run `prism-cli call prism_monitoring
   cam_registry_health` — `online_count` should include `hypermill`.

## Payload format

Every payload is a flat XML element so OPENMIND's existing XML-RPC parser
processes it without modification:

```xml
<predictionReport session="op-1" alerts="3">
  <alert seg="0" pred="tool_overload" sev="0.92" pri="critical">
    <msg>Cutting force 1843 N vs limit 800 N (230%)</msg>
  </alert>
  …
</predictionReport>
```

Special characters in messages are XML-escaped automatically. The
plugin never emits attribute-bound CDATA, so any hyperMILL XML
post-processor will pass it through untouched.

## Feature walkthrough

### Real-time physics overlays

When you select an operation, the side-bar redraws six bars (force,
chatter SLD, deflection, thermal, tool life, safety score). Each bar
turns yellow at PRIORITY_MEDIUM, red at PRIORITY_HIGH, and flashes
red at PRIORITY_CRITICAL.

### Predictive alerts

Click **Scan toolpath**. The plugin sends every operation segment to
`cam_predict_scan` and renders the ranked alert list inline. Click any
alert to jump the hyperMILL viewport to the offending segment.

### Optimization (one-click apply)

For any selected operation, click **Suggest…** → choose goal
(cycle_time / tool_life / surface_finish). The plugin shows the ranked
suggestions and lets you click **Apply** to overwrite the operation's
cutting parameters in place. Every suggestion is pre-verified to keep
**all** safety predictors below PRIORITY_HIGH (U-CAM103 contract).

### Tribal-knowledge tooltips

Hover any toolpath in the operation tree — the tooltip pane shows up
to 5 of the most relevant operator tips from PRISM's 4,758-tip corpus,
reranked against the current operation, material, machine, and
workholding.

## Troubleshooting

| Symptom                                    | Most likely cause                                 | Fix                                                    |
|--------------------------------------------|---------------------------------------------------|--------------------------------------------------------|
| Side-bar tab missing                       | DLL blocked by Windows SmartScreen                | Right-click DLL → Properties → Unblock → restart       |
| Status stays red, "reconnecting…"          | MCP server not running                            | `prism-cli serve` in a terminal                        |
| `unknown_target` errors in MCP log         | Plugin version below 1.0.0 (compat range gate)    | Re-install plugin                                      |
| Alerts never appear                        | hyperMILL operation has no `kc1.1` for the material | Update material assignment or see [troubleshooting.md](troubleshooting.md#missing-material) |

## Uninstall

```powershell
prism-cli plugin uninstall hypermill
```

This removes the DLL and clears the plugin record from the PRISM Plugin
Registry. hyperMILL itself is untouched.
