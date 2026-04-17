---
name: esbuild externals fix
description: ws, node-opcua, occt-import-js must be externalized in esbuild build scripts to prevent build failures
type: feedback
---

The esbuild `build` and `build:fast` scripts in package.json need `--external:ws --external:node-opcua --external:occt-import-js` alongside the existing externals.

**Why:** These are native/optional modules that esbuild can't bundle. Without them, build:fast fails with "Could not resolve" errors.
**How to apply:** If build scripts are regenerated or modified, ensure these three externals remain.
