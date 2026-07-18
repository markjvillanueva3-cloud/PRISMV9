---
name: cam-export-tools
description: Export tool libraries across CAM systems — universal export, multi-sync, drift detection.
---

# /cam-export-tools

## Pipeline

1. `prism_cam` → `universal_tool_export` with `{ cam, target_path }`
2. `prism_cam` → `tool_sync_multi` with `{ cams }`
3. `prism_cam` → `tool_sync_drift` with `{ cam }`
4. `prism_cam` → `tool_sync_status`
5. `prism_cam` → `iso13399_export` with `{ target_path }` (optional — ISO-standard)

## Exit criteria
- Tools exported in CAM-native format.
- Multi-CAM sync complete.
- Drift report clean.
