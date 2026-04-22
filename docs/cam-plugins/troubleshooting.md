# Troubleshooting — common to all CAM plugins

Problems specific to a particular CAM host live in that host's plugin
doc. This page covers issues that look the same regardless of which
host you're in.

## "Reconnecting…" status that never goes green

Cause: the local MCP server is not running (or is bound to a different
port than the plugin expects).

Fix:
```powershell
# 1. Confirm whether MCP is up
prism-cli health

# 2. If down, start it:
prism-cli serve

# 3. If up but on a non-default port, point the plugin at it via the
#    plugin's Settings dialog — every plugin has the field.
```

The plugin's reconnect schedule is `1s → 2s → 4s → 8s → 16s → 32s →
60s` (capped, with a maximum of 10 attempts). After 10 attempts the
registry marks the plugin **offline**; you'll need to click
**Reconnect** in the plugin Settings dialog manually.

## Predict / Optimize / Tooltip returns nothing

Cause: the operation is missing a parameter PRISM needs.

The most common cause is a missing material (no `kc1.1` to apply
Kienzle, no `material_iso_group` to filter tribal tips). Verify by
calling the dispatcher action directly:

```powershell
prism-cli call prism_cam cam_predict_scan '{"session_id":"debug","segments":[…]}'
```

If the segment object is missing `kc1_1` or `material_iso_group`,
fill it in via the host's material dialog and retry.

### Missing material

If the host's material dialog has no entry that maps to a PRISM
ISO group, add one to PRISM's material registry:

```typescript
import { materialRegistry } from "src/registries/MaterialRegistry.js";
materialRegistry.add({
  id: "tool-steel-d2-jm-die",
  iso_group: "P",      // P/M/K/N/S/H
  kc1_1: 1900,
  mc: 0.27,
  // …
});
```

### Unknown material

If the host sends a material name PRISM doesn't recognize, the speed/feed
bridge returns `compute_error` (not a hard failure — the host UI should
treat it as "no PRISM SF available for this tool"). Add the material
to the registry as above, or alias it in
`src/data/material-aliases.ts`.

## Plugin marked offline but you can see traffic in MCP log

Cause: stale heartbeat. Plugins must heartbeat at least every 10 s
(`STALE_AFTER_MS = 10_000` in `CAMPluginRegistryEngine`).

Fix: restart the plugin (Settings → **Reconnect**). The plugin's
heartbeat thread may have wedged — common after the laptop wakes from
sleep.

## "compatible=false" in compatibility check

Cause: the plugin's `compat_range.min_prism_version` is higher than the
running PRISM, or the plugin's version is older than the
`min_plugin_version` PRISM accepts.

Fix: upgrade the lagging side.

```powershell
# Check the plugin's declared range:
prism-cli call prism_cam cam_registry_health

# Upgrade plugin:
prism-cli plugin upgrade <host>

# Upgrade PRISM:
git -C H:/prism pull && cd H:/prism/mcp-server && npm run build
```

## Optimization "Apply" button disabled

Cause: every suggestion the plugin received was filtered by the U-CAM103
safety guard — it would push *some* predictor past PRIORITY_HIGH, so the
optimizer refuses to emit it. There is genuinely nothing safe to suggest
at this baseline.

Fix: relax the constraint that's blocking the bump. Often this is the
tool load limit — verify the tool's load limit in your tooling DB
matches the manufacturer's spec; PRISM ships some conservative defaults
that overestimate risk for premium-grade carbide.

## Plugin causes host CAM to hang on startup

Almost always: a stale plugin DLL/bundle from a prior PRISM install. The
new plugin loads, then the old one tries to load, and they fight.

Fix:
```powershell
prism-cli plugin uninstall <host>
prism-cli plugin install <host>
```

If that doesn't clear it, clean the host's plugin folder by hand:
- hyperMILL: `%APPDATA%\OPENMIND\hyperMILL\Plugins\PRISM\`
- Fusion 360: `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\PRISM.bundle\`
- Inventor HSM: `%APPDATA%\Autodesk\ApplicationPlugins\PRISM.bundle\`
- Mastercam: `<Mastercam>\chooks\PRISM.dll`

## Geometry handoff fails for very large STEP files

Models above 100 MB (`STREAM_LARGE_THRESHOLD` in
`CAMGeometryExchangeEngine`) are streamed in 1 MB chunks (configurable up
to 16 MB). If the receiving side reports `format mismatch` or
`out of range`, the chunks are arriving in the wrong order — most often
because two different sessions share a `blob_id`. Use a UUID per
geometry handoff.

## Where to look for more

- **Engine logs**: `H:/prism/mcp-server/logs/` — every dispatcher call
  is logged with its action and elapsed_ms.
- **MCP server health**: `prism-cli call prism_monitoring system_health`.
- **Plugin registry dashboard**: `prism-cli call prism_monitoring cam_registry_health`.
- **Recent registry events**: `prism-cli call prism_telemetry cam_registry_event_log`.
