# Inventor HSM Plugin

PRISM's Inventor HSM plugin is an Autodesk Inventor **Add-In** that runs
inside the **Manufacture** workspace (Inventor CAM, formerly HSMWorks).
It uses a typed-JSON envelope distinct from Fusion 360's JSON-RPC so that
HSM's existing server bridge handlers route PRISM messages cleanly.

## Supported versions

| Inventor (Manufacture / Inventor CAM) | Status         |
|---------------------------------------|----------------|
| 2025+                                 | Fully supported |
| 2024 SP3+                             | Supported (HSM 2024 update 3 added the post-bridge hook PRISM needs) |
| Older                                 | Not supported   |

## Installation

1. Close Inventor.
2. Run `prism-cli plugin install inventor_hsm` — installs to
   `%APPDATA%\Autodesk\ApplicationPlugins\PRISM.bundle\`.
3. Start Inventor → switch to the **Manufacture** workspace → the
   PRISM panel appears in the ribbon.
4. **PRISM → Settings** → enter MCP server URL (default
   `ws://localhost:7421`). Click **Connect**.
5. Auto-registers with the PRISM Plugin Registry (U-CAM98).

## Payload format

Typed-JSON, structurally simpler than JSON-RPC 2.0 — Inventor HSM's
internal handlers dispatch on the top-level `type` string:

```json
{
  "type": "hsm.predictionAlerts",
  "sessionId": "job-7821",
  "count": 4,
  "worstPriority": "high",
  "alerts": [
    {
      "segment": 0,
      "predictor": "deflection",
      "priority": "high",
      "severity": 0.78,
      "message": "Tool tip deflection 22.4 µm (budget 25 µm)"
    },
    …
  ]
}
```

Top-level types in use:

| `type`                       | Source engine action       |
|------------------------------|----------------------------|
| `hsm.predictionAlerts`       | `cam_predict_encode`       |
| `hsm.optimizationSuggestions`| `cam_suggest_encode`       |
| `hsm.tribalTooltips`         | `cam_tooltip_render`       |
| `hsm.speedFeed`              | `cam_speedfeed_compute`    |

## Feature walkthrough

### PRISM ribbon panel

The Manufacture ribbon gains a PRISM panel with three buttons:
**Scan**, **Optimize**, **Tooltips**. Each operates on the currently
selected operation in the Inventor browser tree.

### Predict before post

Inventor HSM users typically post-process before running a job. The
PRISM plugin inserts itself one step earlier: **Scan** runs
`cam_predict_scan` on every operation in the active setup and shows
a per-operation table with the worst-priority badge. Critical badges
prevent the **Post** action from completing until acknowledged.

### Optimize

Identical to Fusion 360's flow: one report per goal
(cycle_time / tool_life / surface_finish), one-click **Apply**, every
patch verified by the U-CAM102 predictor stack.

### Tooltip pane

The Tooltips toggle docks a panel that updates as you click through the
operation tree, reranking the 4,758-tip corpus against the selected
operation's material, machine, and workholding.

## Troubleshooting

| Symptom                                       | Most likely cause                                     | Fix                                                    |
|-----------------------------------------------|-------------------------------------------------------|--------------------------------------------------------|
| PRISM ribbon panel missing                    | Manifest XML not registered                           | `prism-cli plugin install inventor_hsm --register-only`|
| **Post** disabled with "PRISM critical alerts" | Working as intended — review the Scan tab            | Resolve alerts or click **Acknowledge**                |
| Tooltips empty                                | TribalKnowledgeEngine corpus failed to load           | Check MCP log for "[TribalKnowledge] Loaded N raw static tips" |
| Plugin marked offline after a long idle       | Heartbeat stale (>10 s)                               | Plugin auto-reconnects with backoff (1s → 60s → exhaust at 10) |

## Uninstall

```powershell
prism-cli plugin uninstall inventor_hsm
```

Inventor itself is untouched. The PRISM ApplicationPlugins entry is
removed and the registry record purged.
