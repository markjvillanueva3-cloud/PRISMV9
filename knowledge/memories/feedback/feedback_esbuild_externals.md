---
name: esbuild externals fix
description: ws, node-opcua, occt-import-js must be externalized in esbuild build scripts to prevent build failures
type: feedback
source: prism-memory
synced: 2026-04-27T00:20:43.092Z
aliases: feedback_esbuild_externals
---


The esbuild `build` and `build:fast` scripts in package.json need `--external:ws --external:node-opcua --external:occt-import-js` alongside the existing externals.

**Why:** These are native/optional modules that esbuild can't bundle. Without them, build:fast fails with "Could not resolve" errors.
**How to apply:** If build scripts are regenerated or modified, ensure these three externals remain.


## Related
[[skills/optional|/optional]]