---
source: gsd_quick
section: USAGE
slug: usage
indexed_at: 2026-04-28T02:29:29.164Z
---

## USAGE

```typescript
// Via MCP
mcp__prism__prism_gsd({ action: "quick" })
mcp__prism__prism_gsd({ action: "get", section: "laws" })
mcp__prism__prism_gsd({ action: "dev_protocol" })

// Via route
POST /api/gsd/quick
POST /api/gsd/get { section: "laws" }
```
