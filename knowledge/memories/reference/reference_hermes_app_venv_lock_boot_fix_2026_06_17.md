---
name: reference_hermes_app_venv_lock_boot_fix_2026_06_17
description: "Hermes desktop app failing to load was NOT the vendored-UI restart loop -- it was the bootstrap venv stage failing because stale python.exe processes (from a prior dashboard/proxy) held hermes-agent/venv/Scripts/python.exe LOCKED, so the post-update venv-recreate couldn't delete it. Fix: kill the venv-locking python procs, relaunch."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.604Z
aliases: reference_hermes_app_venv_lock_boot_fix_2026_06_17
---


# Hermes desktop "not loading" = venv-recreate blocked by a locked python.exe (2026-06-17, slot:bravo)

## Symptom
Operator: "fix the hermes app, it's still not working or loading properly." The desktop boot FAILED at the `venv` bootstrap stage:
> `venv FAILED: Cannot remove item ...\hermes-agent\venv\Scripts\python.exe: Access to the path 'python.exe' is denied` → `Desktop boot failed: bootstrap failed at stage 'venv'`

This is DISTINCT from the vendored-UI `/api/ws` -> `bootstrap:reset` restart loop documented in `HERMES-CONTROL-BRIDGE-SPEC-2026-06-18.md`. Don't assume the spec's restart-loop is the cause -- READ `C:/Users/wompu/AppData/Local/hermes/logs/desktop.log` for the actual failing stage.

## Root cause
The desktop auto-updated `hermes-agent` (git pull to a new HEAD) and its bootstrap tries to **recreate the Python venv** (`-> Virtual environment already exists, recreating...`). But python.exe from that venv was **still running** (stale dashboard/proxy processes), so Windows denied the delete (a running .exe is locked). Boot aborts.

## Diagnose
- `Get-CimInstance Win32_Process -Filter "Name='python.exe'"` -> look at `ExecutablePath`. The processes whose Exe == `C:\Users\wompu\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe` are the lockers. (NOTE: the LIVE services often run from the uv-managed python `AppData\Roaming\uv\python\...\python.exe` -- those do NOT lock the hermes-agent venv, so leaving the `:8645` ask-hermes proxy + a uv-python dashboard alone is fine.)

## Fix (verified)
1. `Stop-Process -Id <pid> -Force` for each python proc whose Exe is the hermes-agent venv python.exe. (PowerShell gotcha: `$pid` is a READ-ONLY automatic var -- use `$procId` in the loop.)
2. Verify the lock released: `[System.IO.File]::Open(path,'Open','ReadWrite','None')` should succeed (no other process holds it).
3. Also stop any stray dashboard backend on the SAME profile as `active_profile` (here :9119 bravo) to avoid a `kanban.db`/`auth.json` SQLite contention failure on the NEXT boot stage (the control-bridge spec's contention warning).
4. Relaunch: `Start-Process 'C:\Users\wompu\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Hermes.lnk'` (target = `...\hermes-agent\apps\desktop\release\win-unpacked\Hermes.exe`, a PREBUILT Electron app -- the renderer SPA is already built, no OOM-prone build step).
5. Watch `desktop.log`: stages should now succeed `repository -> venv ✓ -> dependencies ✓ -> node-deps ✓ (downloads ~300MB Playwright browsers, slow) -> ... -> gateway ✓ -> bootstrap complete -> HERMES_DASHBOARD_READY port=<ephemeral> -> backend is ready`.

## Sibling finding (subscription state, same session)
After boot, the bravo profile had `config.providers = {}` (no active provider) + `config_version 0/29` (29 migrations behind the updated code) -> `credential pool: no available entries`. 3 OAuth providers ARE logged in (xai-oauth/Grok, openai-codex/ChatGPT, claude-code/Anthropic) but not wired active. Setting up a subscription via the buggy renderer fails; the supported bypass is the CLI device-code/loopback flow (`hermes auth add <provider>`; provider list + cli_command come from `GET /api/providers/oauth`). Do NOT hand-edit `auth.json`/config blind -- it holds live creds.

## Resolution (2026-06-17, same session) — Grok subscription set up + proven; GUI is a SEPARATE deferred bug
- **Activated Grok via the SUPPORTED endpoint (not hand-edit):** `POST /api/model/set?profile=bravo {scope:"main", provider:"xai-oauth", model:"grok-4.3"}` (scope MUST be `main` -> writes `model.provider`+`model.default`; `auxiliary` is the other valid value; web_server.py:714). Verified persisted to `profiles/bravo/config.yaml` (`model.default: grok-4.3`, `model.provider: xai-oauth`). Drive it via the control bridge (`scripts/hermes-control-bridge.mjs`) which adopts the running backend's served token.
- **config_version auto-migrated 0/29 -> 29/29** on the next clean boot (no manual `hermes migrate` needed; the desktop migrates on launch).
- **PROVEN working** (R15 live-validate): `node scripts/ask-hermes.mjs ask "..."` -> `:8645` proxy -> xai OAuth -> Grok returned a real answer ("GROK IS LIVE"). Subscription is functional end-to-end.
- **xAI Grok is the ONLY subscription-OAuth that still works in Hermes** (operator 2026-06-17): ChatGPT + Anthropic now require API keys, not subscription OAuth. `xai-oauth` flow=loopback; the 8 grok models incl `grok-4.3` (flagship), `grok-4.20-*`.
- **The desktop SETTINGS PAGE is a SEPARATE, un-fixable-from-outside bug:** "failed to load" / "error invoking remote method hermesapi" / "background gateway didn't come up" persists EVEN with the backend healthy (HTTP 200, grok active, migrated) and EVEN headless (so it is NOT the missing provider and NOT a backend fault). The failure is inside the desktop's PACKAGED renderer bundle (`apps/desktop/release/win-unpacked/resources/app.asar/dist/...`) — a vendored Nous UI build. Patching it needs a desktop app REBUILD (tsc+vite, project-flagged known-failing/deferred); you cannot patch the shipped `.asar` from outside. `gateway_running:false` is NORMAL (messaging gateway, no platforms) — a red herring, not the fault. Bypass: drive every settings action (model/providers/env/cron) via the control bridge headlessly.

## Lesson
A desktop app that recreates its own venv on update will hard-fail boot if any process is still running that venv's interpreter. Reap the stale interpreter processes first. And: prove the failing stage from the log before adopting a spec's assumed failure mode (R12 -- the spec's restart-loop was a red herring; so was `gateway_running:false`). When a packaged Electron renderer (`.asar`) is the broken layer, the fix is a desktop rebuild — don't loop relaunching it; deliver the value (working subscription) via the backend/CLI/bridge and say so plainly. Related: [[reference_hermes_app_launch_fix_cred_pool_2026_06_12]], [[reference_hermes_cred_pool_verified_2026_06_15]], [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]].
