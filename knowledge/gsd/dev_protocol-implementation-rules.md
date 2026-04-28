---
source: dev_protocol
section: IMPLEMENTATION RULES
slug: implementation-rules
indexed_at: 2026-04-28T02:29:29.168Z
---

## IMPLEMENTATION RULES

### Code Editing
- Always READ before editing (never assume file contents)
- Use edit_block or str_replace for surgical changes
- NEVER retype entire files — append, don't rewrite
- State exact line numbers changed after every edit
- Verify changes compile: npm run build (esbuild, NEVER tsc)

### Anti-Regression (MANDATORY)
- prism_validate→anti_regression before ANY file replacement
- Doc anti-regression: warn >30% loss, BLOCK >60% loss (automatic via hooks)
- New dispatcher/action/hook counts must ≥ old counts
- When removing code: justify removal, confirm with user

### File Operations Priority
1. prism_doc (for PRISM docs: todo, ACTION_TRACKER, roadmaps)
2. prism_dev→file_read/file_write (for source code within MCP server)
3. Desktop Commander (for files outside MCP server, non-PRISM operations)
4. bash_tool (last resort, for container operations)

### Build Protocol
- See `data/docs/protocols/BUILD_PROTOCOL.md` for full specification
- Command: npm run build (alias for build:verify — tsc + esbuild, ~30s)
- Fast iteration: npm run build:fast (esbuild only, ~3s)
- After every build: Phase Checklist fires automatically
- gsd_sync_v2.py runs automatically on build success
- Server restart needed to load new build (restart Claude app)

### Schema Versioning Protocol
- See `data/docs/protocols/SCHEMA_VERSIONING_PROTOCOL.md` for full specification
- All state files MUST include `schemaVersion` field
- Breaking changes require migration script in `src/migrations/`
- Use `getVersionMetadata()` in dispatcher responses

### Orchestration Protocol
- See `data/docs/protocols/ORCHESTRATION_PROTOCOL.md` for full specification
- Use `withLock(resourceId, fn)` for exclusive resource access
- Orchestration dispatchers require distributed locks
- Lock timeout: 30s default, increase for long operations
