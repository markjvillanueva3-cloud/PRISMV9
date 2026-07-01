---
paths:
  - "**/src/mcp/**/*.ts"
  - "**/src/index.ts"
---

# MCP Conventions

- Tool annotations required: readOnly, destructive, idempotent, openWorld
- Resource URIs follow pattern: prism://type/id
- Prompts include required/optional argument definitions
- Use progress tracking for operations >5s
- Structured logging via mcpLogging
- Error responses use MCP error codes
- Output schemas use Zod-to-JSON-Schema conversion
