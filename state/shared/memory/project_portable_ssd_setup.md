---
name: Portable SSD Setup Guide
description: Complete instructions for setting up PRISM on a new PC from the portable SSD (H:\). Includes setup-new-pc.bat, copy-to-ssd.bat, and manual steps.
type: project
---

## Portable SSD — Setup Guide for New PC (Updated 2026-03-30)

**Why:** User has a portable SSD with the full PRISM dev environment. Goal is to plug into any PC and launch Claude + Codex.

**How to apply:** When user opens Claude on a new PC and references the portable SSD, follow this guide.

### Quick Start (Automated)

1. Plug in the portable SSD (should mount as H:, but any letter works)
2. Run `H:\prism\setup-new-pc.bat` — copies configs, patches paths, installs npm deps
3. Follow the manual steps printed at the end (auth logins, Python path)

### What's on the SSD (H:\)

```
H:\prism\                          — Main system (mcp-server, cad-engine, state, data)
H:\PRISM_ARCHIVE_2026-02-01\      — Historical archive
H:\USER_PROFILE\                   — Copied user profile configs:
  .claude\                         — Commands, hooks, skills, plugins, rules, agents
  .codex\                          — Codex config
  .bashrc, .bash_profile, .profile — Shell configs
  .gitconfig                       — Git identity + LFS
  AppData\Roaming\Claude\          — claude_desktop_config.json (MCP config)
  AppData\Roaming\Code\User\       — VSCode settings
  AppData\Roaming\npm\             — Global npm packages
```

### Scripts

| Script | Purpose |
|--------|---------|
| `H:\prism\setup-new-pc.bat` | Set up a fresh PC from the portable SSD |
| `H:\prism\copy-to-ssd.bat D` | Backup current machine to another SSD (arg = drive letter) |

### Prerequisites on Target PC

| Tool | Source |
|------|--------|
| Node.js >= 24.x | nodejs.org |
| Python 3.12+ | python.org |
| Git >= 2.50 | git-scm.com |
| GitHub CLI >= 2.87 | cli.github.com |

### Manual Steps After setup-new-pc.bat

1. `claude login` — authenticate Claude Code
2. `codex login` — authenticate Codex (if using)
3. `gh auth login` — authenticate GitHub CLI
4. Update Python path in `claude_desktop_config.json` if `where python` returns a non-PATH result
5. Add ANTHROPIC_API_KEY to `H:\prism\mcp-server\.env`
6. `cd H:\prism\mcp-server && npm run build:fast` — build the MCP server

### Key Portability Notes
- All hook scripts use `/h/prism` (portable) — no C: or user-specific paths
- `constants.ts` PYTHON fallback is just `"python"` (uses PATH)
- `claude_desktop_config.json` template uses `H:/prism` paths
- No SSH private keys — GitHub uses HTTPS + Windows Credential Manager
- Python `.venv` must be recreated on each machine (`python -m venv .venv`)
