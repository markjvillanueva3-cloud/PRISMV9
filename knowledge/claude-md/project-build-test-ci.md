---
schema_version: 1.0.0
source: project
section: BUILD / TEST / CI
slug: build-test-ci
start_line: 218
end_line: 228
indexed_at: 2026-05-05T13:49:55.478Z
content_hash: f9f39cfd7e5381b994e6e6e76cf93d3a38fc778dbc7d4406fc547a5c45e4124a
mirror_engine: ClaudeMdChunkerEngine
---
## BUILD / TEST / CI
```bash
cd mcp-server
npm run build:fast        # esbuild only (~3s) — rapid iteration
npm run build:incremental # tsc incremental + esbuild (~10s)
npm run build             # full tsc + esbuild (~30s) — pre-commit gate
npx vitest run            # all tests
npx vitest run <file>     # specific file
```
CI: `.github/workflows/` (ci.yml, deploy.yml, nightly.yml). Tests: real behavior checks — placeholder asserts are rejected by hook-stack. Workflow/routing changes must parse rendered URLs and assert concrete params.
