# Suggested Commands

## Build & Check
- `npx tsc --noEmit` — Type-check without emitting (from mcp-server dir)
- `npm run build:fast` — Fast esbuild bundle
- `npm run build` — Full build with type-check

## Test
- `npx vitest` — Run tests
- `npx vitest run` — Run tests once (no watch)

## Start Server
- `node dist/index.js` — Start MCP server (stdio mode)
- `TRANSPORT=http node dist/index.js` — Start HTTP mode

## System Utils (Windows)
- `git` — version control
- `ls` / `dir` — list directory
- `node -e "..."` — run JS one-liners
- `python -c "..."` — run Python one-liners
- `sqlite3` — not installed, use Python sqlite3 module instead
