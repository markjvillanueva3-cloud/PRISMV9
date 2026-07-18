---
name: reference_hermes_app_relaunch_fix_2026_06_26
description: "Hermes desktop 'won't load' + 'CLI won't launch in PowerShell' (2026-06-26) was NOT a brick: a stranded failed-update venv-recreate (recreate blocked by a .pyd locked by the venv-bound :8645 proxy). Tree was already current (+0/-0), so simply relaunching the GUI skips the recreate and boots clean. CLI binary works; 'won't launch' = stale-PATH in open shells, fixed by a fresh window."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.604Z
aliases: reference_hermes_app_relaunch_fix_2026_06_26
---


2026-06-26 slot:bravo. Operator: "fix the hermes app install, it doesnt load properly and the hermes cli doesn't launch anymore in powershell."

**Two lanes (always disambiguate):** the xAI `:8645` proxy (`ask-hermes`/`mcp__hermes__*`) was fine (socket owned by the uv-python proxy, not the venv one); the **Nous Hermes desktop app** (`C:/Users/wompu/AppData/Local/hermes/`) was the broken thing.

**App "won't load" — root cause:** the desktop bootstrap recreates the venv only as part of an *update*. The 10:02 update's `repository` stage applied the pull (tree advanced to current) but the `venv` stage FAILED — `Cannot remove ...aiohttp\_http_parser.cp311-win_amd64.pyd: Access denied`, locked by a venv-bound `python -m hermes_cli.main proxy start :8645`. → boot-failure overlay. Same venv-lock class as [[reference_hermes_app_annotated_doc_dep_fix_2026_06_25]] / 06-17.

**Why the fix is trivial:** the recreate is gated on a pending update. Tree is now `+0/-0` vs `origin/main` (HEAD 65be0061e), so the NEXT launch finds "up to date" → **skips the recreate → boots clean** on the existing healthy venv (Python 3.11.15; hermes_cli.main/annotated_doc/fastapi/uvicorn all import — no `pip install -e .` needed). Verified: `desktop.log` clean boot (HERMES_DASHBOARD_READY port=25915, "backend is ready. Finalizing desktop startup"), zero new bootstrap-installer.log, renderer `index-BP2lCrYS.js` live, GUI Electron PIDs hold ESTABLISHED sockets to backend :25915. **The fix was literally: relaunch the GUI** (`...\apps\desktop\release\win-unpacked\Hermes.exe`). Operator chose minimal/non-destructive; nothing killed, nothing reinstalled.

**CLI "won't launch in PowerShell":** `hermes.exe` (`...\hermes-agent\venv\Scripts\`) works (`--version`/`--help` fine) and that dir IS on the persisted **User** PATH → a fresh login shell resolves `hermes` (verified against Machine+User PATH). The operator's open terminals hold a stale PATH. **Fix = open a NEW PowerShell window.** No `$PROFILE` alias exists; resolution is pure PATH.

**How to apply next time:** "won't load" after an auto-update → check `git -C hermes-agent status -b` FIRST; if `+0/-0`, just relaunch (recreate is skipped). Don't kill/reinstall a healthy venv — prove it broken by importing the boot-chain modules. Dashboard HTTP probe timing out is a token-gated/WebSocket + load artifact, not "app down"; trust the boot log + ESTABLISHED GUI↔backend sockets. Durable recurrence-fix: run the `:8645` proxy from uv-python (not the venv) so an update's venv-recreate never collides with the proxy's `.pyd` lock. Related: [[reference_hermes_app_launch_fix_cred_pool_2026_06_12]].
