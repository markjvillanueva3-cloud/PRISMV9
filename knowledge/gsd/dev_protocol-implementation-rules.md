---
source: dev_protocol
section: Implementation Rules
slug: implementation-rules
indexed_at: 2026-04-28T02:50:03.664Z
---

## Implementation Rules

### Code Editing
- Always READ before editing (never assume file contents).
- Use Edit / str_replace for surgical changes.
- NEVER retype entire files — Edit, don't rewrite.
- State exact line numbers changed after every edit.
- Verify changes compile: `npm run build:fast` (esbuild, ~3s).

### Anti-Regression (MANDATORY)
- `prism_validate:anti_regression` before ANY file replacement.
- Doc anti-regression: warn >30% loss, BLOCK >60% loss
  (automatic via hooks).
- New dispatcher / action / hook counts must ≥ old counts.
- When removing code: justify removal, confirm with user.

### File Operations Priority
1. `prism_doc` — for PRISM docs (todo, ACTION_TRACKER, roadmaps).
2. `prism_dev:file_read/file_write` — source code within mcp-server.
3. Direct `Read`/`Write`/`Edit` — general project files.
4. `Bash` — last resort, for container/system operations.

### Build Protocol
- Full: `npm run build` (tsc + esbuild, ~30s, pre-commit gate).
- Incremental: `npm run build:incremental` (~10s).
- Fast iteration: `npm run build:fast` (esbuild only, ~3s).
- After build: Phase Checklist + gsd_sync_v2.py auto-fire.
- Server restart needed to load new build (restart Claude app).

### Schema Versioning Protocol
- See `data/docs/protocols/SCHEMA_VERSIONING_PROTOCOL.md`.
- All state files MUST include `schemaVersion`.
- Breaking changes require migration in `src/migrations/`.
- Use `getVersionMetadata()` in dispatcher responses.

### Orchestration Protocol
- See `data/docs/protocols/ORCHESTRATION_PROTOCOL.md`.
- Use `withLock(resourceId, fn)` for exclusive resource access.
- Lock timeout: 30s default, increase for long ops.
