---
name: H-drive canonical for ~/.claude authored content (h-drive-enforcement hook)
description: Authored ~/.claude content lives on H:\.claude\; only settings.json is C:-edited and mirrored. h-drive-enforcement HARD BLOCKS C: edits.
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
Complements `feedback_h_drive_master.md`. Specific rule for the **h-drive-enforcement** PreToolUse hook:

`~/.claude/*` **authored content** (`.mcp.json`, `commands/`, `agents/`, `hooks/`, `skills/`, `rules/`, `plans/`) is canonical on **`H:\.claude\`**. The `h-drive-enforcement.mjs` PreToolUse hook HARD BLOCKS Edit/Write to the C:-side equivalent paths and emits:
> `H: drive enforcement: project work must stay on H:\prism\ and user-authored ~/.claude/ content must live on H:\.claude\ for drive-swap portability.`

**Special cases (writeable on C:):**
- `C:\Users\wompu\.claude\settings.json` — edited at C:, replicated C:→H: by `c-to-h-mirror.mjs` PostToolUse hook (per global CLAUDE.md).
- `C:\Users\wompu\.claude\projects\H--prism\memory\` — auto-memory directory; PostToolUse `memory-mirror-to-vault.mjs` propagates to vault. NOT blocked by h-drive-enforcement.

**How to apply:**
- For `.mcp.json`, commands, agents, hooks, skills: edit `H:\.claude\<file>` directly. Don't waste a tool call on the C: path; you'll get blocked.
- For `settings.json`: edit `C:\Users\wompu\.claude\settings.json` and let the mirror replicate.
- For auto-memory: write to `C:\Users\wompu\.claude\projects\H--prism\memory\<file>.md`; the mirror hook handles vault routing.
- If the hook blocks an edit, the redirect path is in the error message — follow it without retry.
