# Redirect Claude Desktop AppData to H: drive (junction + enforcement hook)

## Context

Claude Desktop (the Electron claude.ai app, not Claude Code CLI) stores ~5+ GB of Chromium-style state (Cache, IndexedDB, Local Storage, Session Storage, Crashpad, etc.) at `%APPDATA%\Claude` on each PC. You want both PCs (work = `Mark Villanueva`, home = `wompus`) to read/write a single canonical copy on H: so state (sessions, extensions, local storage) follows you between machines.

You already copied both Claude folders to H::
- `H:\Claude\` — from the work PC's `C:\Users\Mark Villanueva\AppData\Roaming\Claude\` (07:25 today)
- `H:\Claude (CUserswompuAppData)\` — from the home PC's `C:\Users\wompus\AppData\Roaming\Claude\`

The current C: work-PC folder is **7 hours newer** (14:21) than the H: copy, so a pre-swap sync is required to avoid losing today's Desktop session writes.

The OS-level mechanism is a **Windows directory junction** (`mklink /J`) — Claude Desktop reads/writes `C:\...\Claude` and the filesystem silently redirects to `H:\Claude`. No app modification needed.

**"Enforce it with a hook"** means: a Claude Code `SessionStart` hook that verifies the junction is in place, points to the right target, and the H: drive is reachable — and **blocks the session** (exit non-zero, `continueOnError: false`) if any check fails. A hook cannot prevent Claude Desktop itself from misbehaving (separate process), but it can guarantee we never run a Claude Code session on top of silently-drifted state.

## Critical precondition

**Claude Desktop is currently running** — `tasklist` shows 7 `claude.exe` processes. The setup script will refuse to run until you quit Claude Desktop fully (system tray → Quit, not just close window). Running with open file handles risks corrupting IndexedDB/LocalStorage.

## Files to create / modify

### 1. CREATE `H:\PRISM\.claude\helpers\appdata-junction-setup.mjs` (~120 lines)

One-time, idempotent setup. Run once per PC after quitting Claude Desktop.

Flow:
1. **Username detection** → pick H: target
   - `Mark Villanueva` → `H:\Claude`
   - `wompus` → `H:\Claude (CUserswompuAppData)`
   - Anything else → exit 1 with clear error
2. **Guard**: if `tasklist` shows any `claude.exe`, abort with "Quit Claude Desktop first".
3. **Idempotency**: if `C:\...\Claude` is already a junction pointing to the expected H: target, print "already configured" and exit 0 (skip steps 4–6).
4. **Pre-sync C:→H:** using robocopy (preserves the 7-hour-newer C: state):
   ```
   robocopy "<C source>" "<H target>" /MIR /DCOPY:DAT /COPY:DAT /R:2 /W:2 /XJ /NP /NFL /NDL
   ```
   `/XJ` excludes junctions (safety); `/MIR` makes H: a true mirror of C: at this moment.
5. **Backup C:**: rename `<C source>` → `<C source>.pre-junction-backup-<YYYYMMDD-HHMMSS>`. Do NOT delete — user verifies then removes manually.
6. **Create junction**: `cmd /c mklink /J "<C source>" "<H target>"` (no admin required for junctions).
7. **Verify**: `fs.lstatSync(cSource).isSymbolicLink()` + `fs.readlinkSync` target matches expected. Print final status line styled like the existing `sync-h-c-drives.mjs` output:
   ```
   === AppData Junction Setup ===
     C:\...\Claude  →  H:\Claude
     Source backup: C:\...\Claude.pre-junction-backup-20260421-HHMMSS
     Status: ✓ junction created, Claude Desktop safe to launch
   ```

Uses only `node:fs`, `node:child_process.execFileSync`, `node:os`. No external deps. Mirrors the style of the existing `H:\prism\.claude\helpers\sync-h-c-drives.mjs`.

### 2. CREATE `H:\PRISM\.claude\hooks\appdata-junction-guard.mjs` (~90 lines)

Runs on every `SessionStart`. Blocks session on any drift.

Checks (all must pass):
1. `USERNAME` is recognized (Mark Villanueva | wompus).
2. `<C source>` exists.
3. `fs.lstatSync(cSource).isSymbolicLink()` is true (junction, not a real folder regression).
4. `fs.readlinkSync(cSource)` resolves to the expected H: path (case-insensitive compare, Windows-style).
5. H: target is reachable — `fs.statSync(<H target>/Local Storage)` succeeds (marker confirms real Claude Desktop data, not an empty folder).

On success: one-line stdout `✓ AppData junction → H:\Claude` (matches existing SessionStart hook terseness).

On any failure:
- stderr: full diagnostic (which check failed, actual vs expected, remediation hint — e.g., "run H:\\PRISM\\.claude\\helpers\\appdata-junction-setup.mjs").
- Append JSON line to `H:\PRISM\mcp-server\data\state\appdata-junction-drift.jsonl` with `{ ts, username, check_failed, details }`.
- `process.exit(1)` — blocks session because wired with `continueOnError: false`.

Safety: the hook itself is **read-only**. It does not auto-repair (user rejected that option, and auto-repair while Claude Desktop is running would cause corruption).

### 3. EDIT `H:\PRISM\.claude\settings.json`

Insert a new hook entry into the existing `SessionStart` array at line 865, immediately after the `sync-h-c-drives.mjs` entry (line 870) so it runs second in the chain:

```json
{
  "type": "command",
  "command": "node H:/PRISM/.claude/hooks/appdata-junction-guard.mjs",
  "timeout": 3000,
  "continueOnError": false
}
```

`continueOnError: false` is the enforcement lever — a failed check aborts the session. This is the only place in the file where that flag will be `false` for a `SessionStart` hook; the existing entries all use `true` or omit it.

Do **not** edit `C:\Users\Mark Villanueva\.claude\settings.json` (global). Enforcement is PRISM-scoped — if you launch Claude Code outside H:\PRISM, the guard won't run, and that's desired (e.g., you could still recover from a repo that doesn't want this policy).

## Files / areas deliberately NOT touched

- `C:\Users\Mark Villanueva\AppData\Local\claude-cli-nodejs\` — Claude Code CLI data, separate from Claude Desktop. You didn't copy this to H:. Out of scope (see follow-up below).
- `H:\prism\.claude\helpers\sync-h-c-drives.mjs` — existing `~/.claude/` sync. Scoped to user-authored dirs (commands, agents, hooks, skills, rules, plans) per line 19. Does not touch AppData. No conflict.
- `C:\Users\Mark Villanueva\.claude\` — already synced by the existing hook; not part of the AppData redirect.

## Verification (end-to-end)

Run in order, after quitting Claude Desktop:

1. **Pre-check**: `tasklist | findstr claude.exe` → should be empty.
2. **Run setup**: `node H:\PRISM\.claude\helpers\appdata-junction-setup.mjs`
   - Expect: robocopy summary (N files copied), backup rename line, `mklink` confirmation, final `✓ junction created`.
3. **OS-level verify**: `cmd /c dir /AL "C:\Users\Mark Villanueva\AppData\Roaming"` → shows `<JUNCTION>  Claude [H:\Claude]`.
4. **Launch Claude Desktop** → loads normally with prior sessions intact (this validates the H: copy is readable + app finds it transparently).
5. **Write-through test**: inside Desktop, open a conversation. `ls -la "H:\Claude\Session Storage\"` on H: → timestamps within the last minute.
6. **Hook verify**: open a new Claude Code session in H:\PRISM → first SessionStart line includes `✓ AppData junction → H:\Claude`.
7. **Drift simulation**: in a throwaway cmd, `rmdir "C:\Users\Mark Villanueva\AppData\Roaming\Claude"` (removes only the junction, H: data safe), then start a new Claude Code session → session aborts with remediation hint. Re-run setup script to restore.
8. **Home PC**: on the home PC (username `wompus`), run the same setup script — it auto-detects and points C: at `H:\Claude (CUserswompuAppData)`.

## Rollback

If anything goes wrong at any phase:
- Delete the junction: `cmd /c rmdir "C:\Users\Mark Villanueva\AppData\Roaming\Claude"` (removes junction only, leaves H: data).
- Rename backup back: `ren "Claude.pre-junction-backup-*" Claude`.
- Remove the hook block from `settings.json`.
- Result: identical to pre-change state.

## Follow-ups (not in this plan, ask if you want them)

1. **Claude Code CLI data** (`AppData\Local\claude-cli-nodejs`) — apply same junction pattern?
2. **Periodic integrity check** — a cron-style check (PRISM has a scheduler) that re-verifies the junction daily without waiting for SessionStart?
3. **Two-machine conflict detection** — if both PCs write to H: simultaneously (unlikely but possible), detect and warn? Currently a junction gives you last-writer-wins.
