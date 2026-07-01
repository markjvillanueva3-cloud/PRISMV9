---
title: Hermes desktop "won't load" = a stranded failed-update venv-recreate; relaunch heals once the tree is current
tags: [hermes, desktop-app, electron, venv, bootstrap, update, path, cli, regression, zulu, bravo]
created: 2026-06-26
slot: bravo
related:
  - hermes-desktop-app-dead-venv-deps-and-full-rebuild-2026-06-25
  - reference_hermes_app_launch_fix_cred_pool_2026_06_12
memory: reference_hermes_app_relaunch_fix_2026_06_26
---

# Hermes desktop "won't load" + "CLI won't launch" (2026-06-26, slot:bravo)

Operator: "fix the hermes app install, it doesnt load properly and the hermes cli doesn't launch anymore in powershell."

## Disambiguate FIRST (held again — third incident)
- **Hermes xAI proxy `:8645`** (`ask-hermes` / `mcp__hermes__*`) — separate lane; was up the whole time (socket owned by the **uv-python** proxy, not the venv one).
- **Nous Hermes desktop app** (`C:/Users/wompu/AppData/Local/hermes/`) — the reported-broken thing.

## Root cause — a STRANDED venv-recreate from a half-finished update (NOT a brick)
The desktop bootstrap recreates the venv **only as part of an update** (pull new code → recreate venv). At 10:02 the update's `repository` stage **succeeded** (pull applied → tree advanced to current) but the `venv` stage **failed**: `Cannot remove ...aiohttp\_http_parser.cp311-win_amd64.pyd: Access to the path is denied` — the `.pyd` was locked by a **venv-bound** `python.exe -m hermes_cli.main proxy start` (PID held the lock). Bootstrap reported FAILED → desktop showed the boot-failure overlay = "doesn't load." This is the same venv-lock-collision class as 2026-06-25 / 2026-06-17.

**Key insight that makes the fix trivial:** the recreate is gated on *there being an update to apply*. Once the pull already applied (tree `+0/-0` vs `origin/main`), the **next launch's bootstrap finds "up to date" → skips the venv recreate entirely → boots clean on the existing healthy venv.** The lock is irrelevant because the recreate never runs.

## What was actually healthy the whole time (verify, don't assume)
- git tree current + clean (`HEAD 65be0061e`, `origin/main`, `+0/-0`; only an untracked `utils.local-deadfiles.bak/`).
- venv healthy: Python 3.11.15; `hermes_cli.main`, `annotated_doc`, `fastapi`, `uvicorn`, `kanban_db`, `toolsets` all import. Editable `-e .` install serves the current code, so no `pip install -e .` was needed.
- CLI binary works: `hermes.exe --version`/`--help` run fine.

## The fix (minimal, non-destructive — nothing killed, nothing reinstalled)
Just **relaunch the desktop GUI** (`...\apps\desktop\release\win-unpacked\Hermes.exe`). Verified clean boot in `desktop.log`: `Resolving backend → runtime ready → HERMES_DASHBOARD_READY port=25915 → backend is ready. Finalizing desktop startup`, **zero new `bootstrap-installer.log`** (recreate skipped), renderer bundle `index-BP2lCrYS.js` executing, and the GUI Electron PIDs hold **ESTABLISHED** connections to the backend on :25915 (UI↔backend wired). 5 GUI procs stable.

## CLI "won't launch in PowerShell" = stale-shell PATH, not a broken binary
`hermes.exe` lives in `...\hermes-agent\venv\Scripts\` and that dir **is** on the persisted **User** PATH — a fresh login shell resolves `hermes` (verified by testing `Machine+User` PATH). The operator's open terminals predate the PATH entry (or the broken-update window), so they hold a stale PATH. **Fix = open a NEW PowerShell window.** (There is no `$PROFILE` alias; resolution is pure PATH.)

## Verification gotcha
External anonymous HTTP probes to the dashboard port time out — it's token-gated/WebSocket (anon `/api/*` → 401, per 06-25) and the box was under heavy local load. Don't read that as "app down." The authoritative load signal is the app's own `backend is ready. Finalizing desktop startup` + ESTABLISHED GUI↔backend sockets, not an anonymous curl.

## Lessons
1. "Won't load" after an auto-update is often a **stranded recreate**, not a brick — check the git tree first: if it's already current, the next launch skips the recreate and just boots. Relaunch before reaching for kill/reinstall.
2. The venv recreate is gated on an update being pending; a venv-bound `:8645` proxy holding `.pyd` locks only breaks the recreate *mid-update*, never a steady-state boot.
3. A working CLI binary that "won't launch" is usually stale-PATH in an already-open shell — verify against `Machine+User` PATH and tell the operator to open a fresh window.
4. Don't run `pip install -e .` reflexively — prove the venv is broken (import the boot-chain modules) before "fixing" a healthy one.
5. Recurrence-proofing for later: the venv-bound proxy vs venv-recreate lock collision keeps biting; a durable fix is to run the `:8645` proxy from **uv-python** (not the venv) so updates never collide, or quiesce venv-bound procs before an update.
