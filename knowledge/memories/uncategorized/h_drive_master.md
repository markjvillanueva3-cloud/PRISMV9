---
name: H: Drive is Master for .claude Config
description: H:\.claude is the portable canonical source for all Claude Code config (settings, hooks, commands, skills, memories). C: mirrors are secondary — they exist because Claude CLI reads from $HOME/.claude but must be kept in sync with H:.
type: feedback
originSessionId: a0ecc7c0-ee3e-4203-b6cb-a554ce5d5606
---
H:\.claude\ is the **master / canonical / portable** source for all Claude Code config files. Any time config is modified, the H: copy must be authoritative.

**Why:** User uses multiple computers — H: is a portable drive that travels between machines. Keeping H: as master means settings, commands, skills, hooks, memories, and agents all move with the drive. C: is a local mirror that Claude CLI reads at runtime ($HOME/.claude) but should always reflect whatever is on H:.

**How to apply:**
- When writing new config: write to H:\.claude\<path> first, then mirror to C:\Users\wompu\.claude\<path>.
- When reading config: treat H: as source of truth; if C: and H: differ, H: wins unless the user explicitly says otherwise.
- Root-level config files to keep in sync bidirectionally: settings.json, settings.local.json, .mcp.json, CLAUDE.md, keybindings.json.
- Subdirs already covered by H:\prism\.claude\helpers\sync-h-c-drives.mjs (commands, agents, hooks, skills, rules, plans, memory) — run on any session where drift is suspected.
- The PostToolUse hook H:\prism\.claude\hooks\c-to-h-mirror.mjs auto-propagates writes of C:\Users\wompu\.claude\{settings,.mcp,CLAUDE.md,keybindings}.json → H:\.claude\ after every Write/Edit.
- Explicit user preferences (2026-04-19): model = claude-opus-4-7[1m]; adaptive thinking OFF; bypass permissions ON; rtk hook ON; alwaysThinkingEnabled + advisorModel=opus + autoMemoryEnabled ON; CLAUDE_AUTOCOMPACT_PCT_OVERRIDE OFF (removed).
