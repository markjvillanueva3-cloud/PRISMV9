---
name: cam-bridge
description: Generate CAM add-in bridge — HTTP client + UI panel + post integration for any CAM system.
---

# /cam-bridge

## Pipeline

1. `prism_cam` → `cam_addin_list_systems`
2. `prism_cam` → `cam_addin_generate` with `{ cam, target_dir }`
3. `prism_cam` → `cam_addin_http_client` with `{ cam, endpoint }`
4. `prism_cam` → `cam_addin_ui_panel` with `{ cam }`
5. `prism_cam` → `cam_addin_tool_sync` with `{ cam }`
6. `prism_cam` → `cam_addin_post_integration` with `{ cam, controller }`

## Exit criteria
- Add-in scaffolded.
- HTTP client + UI panel generated.
- Tool sync + post wiring in place.
