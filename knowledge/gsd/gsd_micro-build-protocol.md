---
source: gsd_micro
section: Build Protocol
slug: build-protocol
indexed_at: 2026-04-28T02:50:03.702Z
---

## Build Protocol

```
Full:        npm run build       (tsc + esbuild, ~30s, pre-commit)
Incremental: npm run build:incremental (~10s)
Fast:        npm run build:fast  (esbuild only, ~3s, dev iteration)
Tests:       npx vitest run
Tests one:   npx vitest run <file.test.ts>

Pre-commit gate: build_guard hook runs tsc on every meaningful edit
Stop gate:       scrutinize-before-stop blocks Stop with uncommitted
                 unreviewed changes (3-strike escape hatch)

Server reload: kill running MCP, run build:fast, restart Claude desktop
               app to load new actions
```
