---
name: H: drive enforcement hook — which paths block C: writes
description: PreToolUse hook hard-blocks C:\Users\*\.claude\<authored> edits; redirect rules and the settings.json exception
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
`H:/prism/.claude/hooks/h-drive-enforcement.mjs` (PreToolUse Edit/Write) HARD BLOCKS C: drive writes for `~/.claude/<authored>` content. Authored = `.mcp.json`, `commands/`, `agents/`, `hooks/`, `skills/`, `rules/`, `plans/`.

**Redirect:** `C:\Users\*\.claude\<authored>` → `H:\.claude\<authored>` (canonical master).

**Exceptions:**
- `settings.json` — edited at `C:\Users\wompu\.claude\settings.json`; the `c-to-h-mirror.mjs` PostToolUse hook replicates C:→H: automatically. Per global CLAUDE.md.
- `C:\Users\wompu\.claude\projects\H--prism\memory\` — auto-memory dir is allowed for C: writes (PostToolUse `memory-mirror-to-vault.mjs` handles vault routing).

**How to apply:**
- For `.mcp.json` / commands / agents / hooks / skills: edit `H:\.claude\<file>` directly. Do not waste a tool call attempting C:.
- For `settings.json`: stick to C: — the C:→H: mirror is the documented path.
- For auto-memory: write to C:\Users\wompu\.claude\projects\H--prism\memory\ and let the mirror hook propagate.
- If the enforcement hook blocks an edit, the redirect path is in the error message — follow it, don't argue.

**Why:** H: is a portable USB drive shared between user's home + work PCs. Authored content must live there for drive-swap continuity. Settings.json is the C:-edited exception because some Claude Code internals expect it under `%USERPROFILE%`.

**Related:** `feedback_h_drive_master.md` covers the user-portability rationale; this file covers hook behavior.
