---
name: prism-mcp-server "can't connect" — alwaysLoad missing from .mcp.json
description: Recovery procedure when prism MCP tools (mcp__prism__*) are not available in a new chat. Companion to reference_active_settings_2026_05_06.md.
type: feedback
originSessionId: 845cf238-2caf-4b83-9e12-d2a1ea10059c
---
**Symptom:** New chat starts but the `mcp__prism__*` tool family is missing from available tools. User reports "can't connect to MCP."

**Diagnosis (10 seconds):**
```bash
node -e "const m = JSON.parse(require('fs').readFileSync('H:/.claude/.mcp.json','utf8')); console.log(m.mcpServers['prism-mcp-server']);"
```
If the entry is missing `"alwaysLoad": true`, that's the bug.

**Why:** Claude Code reads `.mcp.json` at session start to decide which MCP servers to spawn. Without `alwaysLoad: true`, the prism server is lazy-loaded on first `mcp__prism__*` invocation. But in many session bootstraps Claude Code doesn't pre-emptively spawn lazy MCP servers, so the tool family stays missing.

**Why it keeps recurring:** `reference_active_settings_2026_05_06.md` explicitly warned: *"After CLI updates, verify these stay present — settings.json hooks may rewrite the file. Restore if missing."* This memory was prophetic — the setting was found removed on 2026-05-10 ~22:00 local during a session restart.

**How to apply:**
1. Edit `H:/.claude/.mcp.json` (NOT a repo file, user-level config)
2. Add `"alwaysLoad": true` as a sibling of `command/args/env` on `prism-mcp-server` and `claude-flow`
3. **Restart the chat** — the change does not take effect mid-session

**Recovery validation after restart:**
- The `mcp__prism__*` family should appear in available tools at session start
- `H:/prism/.claude/cache/mcp-daemon.log` should have writes within ~30s of session start
- `Get-CimInstance Win32_Process` filtered on `dist/index.js` should find a PRISM process

**Sanity check the server itself isn't broken:**
```bash
timeout 3 "/c/Program Files/nodejs/node.exe" "H:/PRISM/mcp-server/dist/index.js" < /dev/null
```
Clean exit with all the registry init messages = server is fine, problem is in spawn config.

**Related:** `reference_active_settings_2026_05_06.md` is the canonical "load-bearing settings" memory. If a third such setting goes missing in future, document here.
