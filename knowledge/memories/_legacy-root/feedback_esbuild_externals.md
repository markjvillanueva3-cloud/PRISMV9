---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_esbuild_externals.md
source_filename: feedback_esbuild_externals.md
content_hash: 91ed6ecd0e594edbc87d12d3c6719715e4b0b5f3ee0a758eecc96dd86c0600be
mirror_ts: 2026-05-05T13:00:09.433Z
mirror_engine: ObsidianMemorySyncEngine
---

The esbuild `build` and `build:fast` scripts in package.json need `--external:ws --external:node-opcua --external:occt-import-js` alongside the existing externals.

**Why:** These are native/optional modules that esbuild can't bundle. Without them, build:fast fails with "Could not resolve" errors.
**How to apply:** If build scripts are regenerated or modified, ensure these three externals remain.
