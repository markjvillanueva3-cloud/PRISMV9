# Hookify Rule: Warn on WebFetch for documentation sites
type: warn
event: PreToolUse
tool: WebFetch

## Pattern
Warns when fetching documentation from well-known library doc sites that are available via context7 MCP.

## Condition
URL matches known documentation domains: docs.python.org, developer.mozilla.org, nodejs.org/api, typescriptlang.org, reactjs.org, nextjs.org, docs.rs, pkg.go.dev, docs.djangoproject.com, docs.nestjs.com, vitejs.dev, vitest.dev, zod.dev, expressjs.com, fastapi.tiangolo.com

## Message
TOKEN SAVE: Use context7 MCP (mcp__plugin_context7_context7__query-docs) for library documentation instead of WebFetch. It returns structured, token-efficient results.
