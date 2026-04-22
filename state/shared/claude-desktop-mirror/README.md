# Claude Desktop App Mirror

**Purpose:** Portable snapshot of Claude Desktop app config from
`C:\Users\<user>\AppData\Roaming\claude\`. Only config/state files are
mirrored — the many caches (blob_storage, Cache, IndexedDB, GPUCache, etc.)
are intentionally omitted because they rebuild on launch.

## What's mirrored

- `claude_desktop_config.json` — MCP server config
- `config.json`                — app config
- `Preferences`                — user prefs
- `Local State`                — app state
- `window-state.json`          — window positions
- `git-worktrees.json`         — worktree registry
- `bridge-state.json`          — bridge state
- `extensions-installations.json` — installed extensions list

## Restoring

```powershell
# On target PC, Claude Desktop must NOT be running:
robocopy 'H:\prism\state\shared\claude-desktop-mirror' `
         "$env:APPDATA\claude" /XO
```

Caches will rebuild automatically on next launch.
