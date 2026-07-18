---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_h_drive_master.md
source_filename: feedback_h_drive_master.md
content_hash: a3b002048a300229bf3aef3f3bd62be19d6247079e22fb890cc2ff68ea830c70
mirror_ts: 2026-05-05T13:00:09.442Z
mirror_engine: ObsidianMemorySyncEngine
---
H drive is the MASTER portable drive. All work must be done on H drive. All settings must be saved to H drive.

**Why:** User works on two PCs (home PC + work PC). The H drive is a portable USB drive that must contain everything needed to work on either PC with full continuity.

**How to apply:**
- Never store settings only on C drive. Always write to H drive first, then mirror to C.
- Settings locations on H drive:
  - `H:/.claude/settings.json` — global user settings (model, plugins, env)
  - `H:/.claude/settings.local.json` — global user permissions
  - `H:/.claude/.mcp.json` — Claude Code MCP server config
  - `H:/.claude/commands/` — all slash commands
  - `H:/.claude/agents/` — all agent definitions
  - `H:/.claude/hookify*.local.md` — all hookify rules
  - `H:/.claude/keybindings.json` — keyboard shortcuts
  - `H:/.appdata/Claude/claude_desktop_config.json` — Claude Desktop MCP config
  - `H:/PRISM/.claude/settings.json` — project hooks/statusline/permissions
  - `H:/PRISM/.claude/settings.local.json` — project local permissions (includes plugin permissions)
- C drive project-scoped settings (`~/.claude/projects/H--PRISM/settings.json`) should be empty/minimal — permissions belong in project settings.local.json on H drive.
- When settings change, sync H→C afterward.
- Home PC username was previously "wompu" and "Admin.DIGITALSTORM-PC"; work PC is "Mark Villanueva".
