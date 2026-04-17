# Claude User-Scope Mirror

**Purpose:** Portable snapshot of `C:\Users\<user>\.claude\` (global Claude Code
config) for cross-PC work on PRISM. Pair with `memory-mirror/` (auto-memory)
and `claude-desktop-mirror/` (Claude Desktop app config).

## What's mirrored

- `agents/`      — global subagent definitions
- `commands/`    — slash commands (`/pdf-learn`, `/wire-edm-studio`, etc.)
- `hooks/`       — PreToolUse/PostToolUse/Stop hooks
- `skills/`      — user-scope skills
- `rules/`       — global rule files (`engines.md`, `tests.md`)
- `plans/`       — planning docs (incl. `sleepy-chasing-prism.md` master roadmap pointer)
- `plugins/`     — installed plugins
- `projects/`    — per-project state (incl. `H--prism/memory/*.md`)
- `teams/`       — team definitions
- `todos/`       — persisted task state
- `tasks/`       — task runner state
- `session-env/` — per-session environment snapshots
- `hookify*.md`  — hookify block/warn/autofire rule files (200+)
- Settings: `settings.json`, `settings.local.json`, `keybindings.json`,
  `dashboard.json`, `ARCHITECTURE.json`, `.mcp.json`, `.gitignore`

## What's NOT mirrored (ephemeral — skip to save space)

- `cache/`, `debug/`, `file-history/`, `paste-cache/`, `shell-snapshots/`,
  `statsig/`, `telemetry/`, `ide/`, `.git/`, `backups/`, `sessions/`
- `.credentials.json` (sensitive — never commit)
- `stats-cache.json`, `mcp-needs-auth-cache.json`,
  `security_warnings_state_*.json` (transient)

## Restoring to another PC

Copy this mirror into the target PC's user `.claude/` directory:

```powershell
# On target PC (Windows, PowerShell):
$dst = "$env:USERPROFILE\.claude"
robocopy 'H:\prism\state\shared\claude-user-mirror' $dst /E /XO
```

Or on bash:
```bash
cp -r /h/prism/state/shared/claude-user-mirror/* ~/.claude/
```

After restore, re-login if `.credentials.json` is missing:
```bash
claude login   # or whatever the current auth command is
```

## Refreshing this mirror (run from any PC that has current C-drive state)

```powershell
robocopy "$env:USERPROFILE\.claude" 'H:\prism\state\shared\claude-user-mirror' `
  /E /XD cache debug file-history paste-cache shell-snapshots statsig `
         telemetry ide .git backups sessions `
  /XF .credentials.json stats-cache.json mcp-needs-auth-cache.json `
      'security_warnings_state_*.json' `
  /R:1 /W:1
```

## Related mirrors

- `state/shared/memory-mirror/`          — framework auto-memory files (28 .md)
- `state/shared/claude-desktop-mirror/`  — Claude Desktop app config (no caches)
- `claude-backup-from-c/`                — older full snapshot (2026-04-15, retain for history)
