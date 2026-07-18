# Desktop Mode-Switcher (Claude / Normal / Gaming)

## Context

You want a one-click way to flip Windows between three optimization profiles so the box behaves correctly for what you're doing right now:

- **Claude mode** — sustained CPU for the up-to-26 concurrent chat fleet, all PRISM watchdog scheduled tasks ENABLED (Fleet Reaper, Memory Monitor, MCP Server, etc.), animations off so 13 PowerShell windows redraw instantly, Game Mode off (Game Mode throttles background processes — bad when 50+ node.exe are "background").
- **Normal mode** — Balanced power plan, defaults restored, everything quiet — the calm everyday baseline.
- **Gaming mode** — Ultimate Performance, all PRISM watchdog tasks DISABLED (free CPU/RAM, no surprise 5-min PowerShell forks mid-frame), Game Mode on, transparency off (GPU savings).

This is a *personal Windows utility*, not a PRISM project unit — it lives under `H:\Tools\mode-switcher\`, no PRISM commit, no roadmap envelope, no 3-of-3 scrutiny gate. It coexists with `apply-host-fleet-tuning.ps1` (which it does NOT duplicate — that handles reboot-required tuning; this handles per-session mode flips).

## Out of scope (documented but not built)

- Pagefile resize · `HwSchMode` toggle · `TdrDelay` (all reboot-required — covered by `apply-host-fleet-tuning.ps1`)
- NVIDIA Reflex / Low Latency Mode (driver-version-dependent; `H:\Tools\nvidiaProfileInspector\` is the manual tool for now)
- Killing live `claude.exe` processes (too destructive; Gaming mode only sets BelowNormal priority on existing Claude trees)
- Defender exclusions, ephemeral TCP port range (already handled idempotently by `apply-host-fleet-tuning.ps1`)

---

## Deliverable

### Files (3 new, under `H:\Tools\mode-switcher\`)

1. **`Switch-Mode.ps1`** (~280 LOC) — the only logic file. Accepts:
   - `-Mode Claude|Normal|Gaming` (required for a switch)
   - `-Show` (status query, no changes)
   - `-Restore` (revert from baseline snapshot)
   - Self-elevates via `Start-Process -Verb RunAs` if not admin
   - Idempotent (same-mode-twice = no-op + status print)
   - Mirrors the pattern of `H:\PRISM\.claude\helpers\apply-host-fleet-tuning.ps1` (snapshot JSON, `Step {}` helper, color output, footer with verify commands)

2. **`mode-snapshot.json`** (auto-created first run) — the *original* baseline: pre-existing power plan GUID, every PRISM scheduled task's enabled/disabled state, all touched registry values. `-Restore` reads this; it is never overwritten on subsequent runs.

3. **`mode-switch.log`** (append-only) — one line per mode change: timestamp, from-mode, to-mode, host, who.

4. **`README.md`** — what each mode does + how to reverse + the knob env-vars.

### Desktop shortcuts (3 new under `C:\Users\wompu\Desktop\`)

| Shortcut | Target |
|---|---|
| **Claude Mode.lnk** | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "H:\Tools\mode-switcher\Switch-Mode.ps1" -Mode Claude` (RunAs admin) |
| **Normal Mode.lnk** | `… -Mode Normal` (RunAs admin) |
| **Gaming Mode.lnk** | `… -Mode Gaming` (RunAs admin) |

(Each `.lnk` `Run as administrator` checkbox set via the `WshShell` object's `IShellLinkDataList` flags — the same scripted-shortcut pattern used by Windows installers. No GUI launcher — 3 icons is one click cheaper than chooser-then-click.)

---

## Mode matrix (every setting is per-session flippable, no reboot)

| Setting | Claude | Normal | Gaming | How it's flipped |
|---|---|---|---|---|
| Power plan | High Performance | Balanced | Ultimate Performance | `powercfg /setactive <GUID>` (Ultimate Perf auto-created from template `e9a42b02-d5df-448d-aa00-03f14749eb61` if missing — same logic as `apply-host-fleet-tuning.ps1:198-211`) |
| Visual effects | Best Performance (no animations) | System Default | System Default | `HKCU\Control Panel\Desktop\UserPreferencesMask` + `VisualEffects` |
| Transparency | Off | On | Off | `HKCU\…\Themes\Personalize\EnableTransparency` |
| Windows Game Mode | Off | Default | On | `HKCU\Software\Microsoft\GameBar\AutoGameModeEnabled` |
| Game Bar UI | Off | Default | On | `HKCU\Software\Microsoft\GameBar\ShowStartupPanel` + `AppCaptureEnabled` |
| Focus Assist (notifications) | Priority Only | Off | Alarms Only | `HKCU\…\Notifications\Settings\Windows.SystemToast.QuietHours\…` |
| Mouse acceleration | Off | System Default | Off | `HKCU\Control Panel\Mouse\MouseSpeed/1/2` |
| WSearch (indexer) service | Manual | Automatic | Manual | `Set-Service WSearch -StartupType` (does NOT stop a running indexer — only changes startup) |
| PRISM watchdog scheduled tasks (10) | Enabled | Enabled | Disabled | `Enable-ScheduledTask` / `Disable-ScheduledTask` per [[feedback_never_delete_only_disable]] — NEVER `Unregister` |
| Claude.exe + node.exe priority | (skip — they're in foreground) | Normal | BelowNormal on existing trees | `Get-Process \| ForEach-Object { $_.PriorityClass = … }` (live processes only; never kills) |

**The 10 PRISM watchdog tasks toggled** (from `H:\PRISM\.claude\helpers\ensure-all-watchdogs.ps1:54-63`):
`PRISM MCP Server`, `PRISM MCP Server Watchdog`, `PRISM Fleet Reaper`, `PRISM Fleet Memory Monitor`, `PRISM Cleanup Orchestrator`, `PRISM Memory Pressure Auto-Relief`, `PRISM Zombie Reaper v2`, `PRISM Hook Janitor`, `PRISM Node Orphan Cleaner`, `PRISM Synergy Regression Watch`.

When the user flips Gaming → Claude or Gaming → Normal, the script re-enables every task it disabled (tracked per-task in the snapshot — if the user had a task disabled BEFORE entering Gaming mode, it stays disabled on exit; we only restore what we changed).

---

## Safety properties (load-bearing)

- **Reversibility**: `mode-snapshot.json` is written ONCE on first run and never overwritten — `-Restore` exits identically to the original baseline regardless of intermediate mode changes.
- **No `Unregister-ScheduledTask` ever** (per `feedback_never_delete_only_disable.md`) — only `Disable-ScheduledTask` / `Enable-ScheduledTask`.
- **No process kills** — Gaming mode only lowers `PriorityClass` on existing `claude.exe`/`node.exe` trees; the user's live chats keep running.
- **Self-elevation** — if not admin, `Start-Process pwsh -Verb RunAs -ArgumentList …` re-launches with the same args (mirrors `install-fleet-reaper-task.ps1:60-64` admin-check pattern).
- **Audit log** — every mode flip appends one line to `mode-switch.log` (timestamp, from→to, host, exit code).
- **Idempotency** — running `Switch-Mode -Mode Claude` twice in a row is a no-op-with-status the second time.
- **No reboot required** — all tweaks take effect on the next paint cycle / next task fire / next process spawn.
- **No PRISM-repo commits** — `H:\Tools\mode-switcher\` is outside any git tree; no `[SCOPE]/U-ID` commit, no 3-of-3 scrutiny gate, no roadmap envelope.

---

## Critical files referenced (read-only, for pattern reuse)

- `H:\PRISM\.claude\helpers\apply-host-fleet-tuning.ps1` — gold-standard pattern for: snapshot/restore JSON, `Step {}` helper, `Get-PortRange`/`Get-CurrentSnapshot`-style state probes, Ultimate Performance creation, color output (`Cyan` headers, `Green` OK, `Red` FAIL, `Yellow` warn), footer with verify commands. **Will be reused as the structural template.**
- `H:\PRISM\.claude\helpers\install-fleet-reaper-task.ps1` — admin-check pattern (line 60-64), `New-ScheduledTaskAction` argument quoting, `param([switch])` style.
- `H:\PRISM\.claude\helpers\ensure-all-watchdogs.ps1:54-63` — authoritative list of the 10 PRISM watchdog tasks to toggle in Gaming mode.
- `H:\Tools\nodejs\node.exe` — confirmed present (used by install-fleet-reaper-task.ps1:72).
- `C:\Users\wompu\Desktop\` — confirmed exists, currently sparse (only `Box.lnk`). Loose `.lnk` is the established norm.

---

## Verification (run after build)

```powershell
# 1. Dry-run status (no admin needed, no changes)
powershell -NoProfile -ExecutionPolicy Bypass -File H:\Tools\mode-switcher\Switch-Mode.ps1 -Show

# 2. Flip into Claude mode (elevated) — verify power plan + tasks
powershell -NoProfile -ExecutionPolicy Bypass -File H:\Tools\mode-switcher\Switch-Mode.ps1 -Mode Claude
powercfg /getactivescheme   # expect: High performance
Get-ScheduledTask -TaskName 'PRISM Fleet Reaper' | Select State   # expect: Ready (enabled)

# 3. Flip to Gaming — verify tasks disabled + power plan changed
powershell -NoProfile -ExecutionPolicy Bypass -File H:\Tools\mode-switcher\Switch-Mode.ps1 -Mode Gaming
powercfg /getactivescheme   # expect: Ultimate Performance
Get-ScheduledTask -TaskName 'PRISM Fleet Reaper' | Select State   # expect: Disabled
Get-ScheduledTask -TaskName 'PRISM MCP Server' | Select State     # expect: Disabled

# 4. Flip to Normal — verify ALL watchdog tasks re-enabled
powershell -NoProfile -ExecutionPolicy Bypass -File H:\Tools\mode-switcher\Switch-Mode.ps1 -Mode Normal
Get-ScheduledTask -TaskName 'PRISM*' | Select TaskName,State

# 5. Restore to original baseline (whatever was on disk before first run)
powershell -NoProfile -ExecutionPolicy Bypass -File H:\Tools\mode-switcher\Switch-Mode.ps1 -Restore

# 6. Confirm the 3 desktop shortcuts exist and the RunAs flag is set
Get-ChildItem 'C:\Users\wompu\Desktop\*Mode.lnk'
```

Acceptance: every command above prints the expected state, `mode-switch.log` has one line per flip, no errors, no process kills, no reboot demanded.

---

## Optional follow-up (not in this plan, mention only)

- A 4th `Mode Status.lnk` shortcut wired to `-Show` for at-a-glance current-mode check
- A small tray-icon (PowerShell `NotifyIcon`) that shows current mode and right-click switches — adds a long-running process, deferred unless you want the discoverability
- Auto-flip into Claude mode whenever any `claude.exe` process spawns (would need a WMI watcher scheduled task) — deferred; conflicts with "you decide when to switch"
