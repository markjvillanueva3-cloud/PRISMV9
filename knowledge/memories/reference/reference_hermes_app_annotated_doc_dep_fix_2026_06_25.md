---
name: reference_hermes_app_annotated_doc_dep_fix_2026_06_25
description: "Nous Hermes desktop app down ~8 days (operator: 'down over a week') = backend crashed every boot on `No module named 'annotated_doc'` + 'Web UI dependencies not installed (fastapi+uvicorn)'. Root cause: the 06-17 auto-update pulled hermes-agent to a new HEAD but the venv dep-install stage never completed (the 06-17 venv-recreate-lock left deps uninstalled). Fix = `venv/Scripts/python.exe -m pip install -e .` into the EXISTING venv; do NOT kill PID running `hermes_cli.main proxy start --port 8645` (that's the LIVE :8645 proxy, not a zombie, even though it locks the venv python.exe). App booted: HERMES_DASHBOARD_READY + backend ready + dashboard HTTP 200."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.603Z
aliases: reference_hermes_app_annotated_doc_dep_fix_2026_06_25
---


# Hermes desktop app dead 8 days = missing venv deps after auto-update (2026-06-25, slot:zulu)

Operator `/checkin-zulu` interrupt: "update hermes cli and get the hermes app working again. its been down for over a week."

## Two separate "Hermes" systems — only ONE was down
- **Hermes proxy `:8645`** (xAI Grok OAuth, `ask-hermes` / `mcp__hermes__*`) = **HEALTHY** the whole time (probe ok, 348 calls 0 fail, `PRISM Hermes Proxy` task Ready/0x0). NOT what the operator meant.
- **Nous Hermes desktop app** (`C:/Users/wompu/AppData/Local/hermes/`, WebView2/electron + python `hermes-agent` backend) = **DOWN**. This is the "hermes app".

## Root cause (read `logs/desktop.log` FIRST — both prior fixes say this)
desktop.log tail showed the same failure every boot up to 06-18:
```
Web UI dependencies not installed (need fastapi + uvicorn).
Import error: No module named 'annotated_doc'
Hermes backend exited (1) -> Desktop boot failed
```
The 06-17 auto-update pulled `hermes-agent` to HEAD `394cdf48c` (concurrent-log-handler logging change), but the bootstrap's **venv dep-install stage never completed** (sibling of [[reference_hermes_app_venv_lock_boot_fix_2026_06_17]] — the venv-recreate was blocked by a locked python.exe). So the new code's new dep `annotated_doc` (a fastapi dep) + updated fastapi/uvicorn editable metadata were missing -> backend crashed on import. 06-17 -> 06-25 = 8 days = "over a week".

## KEY non-obvious finding — the venv-locking python was the LIVE proxy, not a zombie
`Get-CimInstance Win32_Process` showed `python.exe` PID 11632 from `hermes-agent/venv/Scripts/python.exe` holding the venv lock. The 06-17 memory says "kill the venv-locking python." BUT its command line was `python -m hermes_cli.main proxy start --provider xai --host 127.0.0.1 --port 8645` = **the live :8645 proxy** (parent gone = launched detached by the scheduled task). Killing it would have taken down the one working Hermes lane. **Always check the CommandLine before killing a venv-locker** — it may be the service you depend on. The fix did NOT require the lock: `pip install -e .` writes site-packages, never overwrites the locked `python.exe`; only a venv *recreate* needs the lock released, and the current boot was NOT recreating (it used the existing venv and crashed on import).

## Fix (verified)
1. `cd hermes-agent && ./venv/Scripts/python.exe -m pip install -e .` -> installed `annotated-doc-0.0.4`, `annotated-types`, `concurrent-log-handler-0.9.29`, `portalocker`, rebuilt `hermes-agent==0.16.0` editable. `PIP_EXIT=0`. Proxy stayed up.
2. Headless verify: `python -c "import annotated_doc, fastapi, uvicorn"` -> `fastapi 0.133.1 uvicorn 0.41.0` OK.
3. `Start-Process Hermes.lnk` -> desktop.log: `HERMES_DASHBOARD_READY port=31946` -> `Hermes backend is ready. Finalizing desktop startup`. 5 electron `Hermes` procs. Dashboard `HTTP 200` (`/api/*` = `Unauthorized` to bare curl = healthy + auth-gated, normal). `:8645` proxy still ok.

## The "update" (operator also asked "update hermes cli") — DONE: full update + GUI rebuild
HEAD `394cdf48c` was **1059 commits behind** `origin/NousResearch/hermes-agent main`. A naive `git pull` updates the python backend/CLI but NOT the **prebuilt electron renderer** (`apps/desktop/release/win-unpacked/`, a gitignored build artifact) -> backend<->renderer protocol-mismatch risk + GUI not terminal-verifiable. Surfaced as a 3-way decision; operator chose **full update + GUI rebuild**. Executed safely (R13 proven-foundation-first + rollback net):
1. **Rollback net:** recorded HEAD `394cdf48c`; `robocopy` backed up the working `win-unpacked` -> `win-unpacked.working-bak` (restore + `git reset --hard 394cdf48c` + `pip install -e .` reverts to the working app).
2. **Closed the electron app** (5 procs) so the build could overwrite win-unpacked; **left the :8645 proxy running** (independent lane).
3. **Pulled** ff-only (moved dead `utils/` aside first) -> HEAD `7cd5eaa64` (v0.17.0); requires-python still `>=3.11,<3.14` so **no venv recreate** (proxy never disturbed). `pip install -e .` -> hermes-agent 0.17.0, deps satisfied, imports clean.
4. **Rebuilt GUI:** root workspace `npm install` (357 pkgs, 0 vuln) then `cd apps/desktop && npm run pack` (= `tsc -b && vite build && electron-builder --dir`, NODE_OPTIONS max-old-space 16384). **Built clean, 0 tsc errors** -> the prior "known-failing renderer build" was the LOCAL autonomous-agent UI corruption (06-12), NOT upstream; a clean pull replaced it. `npm run pack` (--dir) refreshes `release/win-unpacked/` IN PLACE (no installer re-run, no config/auth loss) — that's the correct rebuild vs `dist:win` (which makes an NSIS/MSI the operator would have to re-run).
5. **Verified:** relaunch -> `HERMES_DASHBOARD_READY port=38399` + backend ready + 5 procs; dashboard root HTTP 200 (slow ~9s first cold render, normal); `/api/*` 401 (auth-gated, healthy); `:8645` proxy still authenticated; `ask-hermes ask` round-trip returned the exact sentinel = full Grok lane live end-to-end.

**Update doctrine for this desktop app:** `npm run pack` (not `git pull` alone, not `dist:win`) is the in-place GUI refresh; the build is npm-workspaces (root install first, then `apps/desktop`); `requires-python` gates whether the venv must be recreated (and only THEN must the :8645 proxy be stopped first, since it runs from that venv's python.exe).

## Lessons (fleet-wide)
1. "Hermes is down" is ambiguous — disambiguate the **proxy `:8645`** (CLI/ask-hermes lane) from the **desktop app** before diagnosing; they fail independently.
2. A desktop app that auto-updates its repo then recreates/reinstalls its venv will silently brick if the dep-install stage doesn't complete — the code is new, the deps are old. `pip install -e .` is the boot log's own prescribed recovery.
3. Before killing a "venv-locking" process, read its CommandLine — it may BE the live service (here the :8645 proxy), not a zombie.
4. Updating a desktop app with a prebuilt renderer is NOT `git pull` — that desyncs renderer<->backend. Real update = matched renderer rebuild or a fresh prebuilt release.

-> [[reference_hermes_app_venv_lock_boot_fix_2026_06_17]] · [[reference_hermes_app_launch_fix_cred_pool_2026_06_12]] · [[reference_zulu_ollama_wedge_selfheal_2026_06_23]] · [[reference_claude_desktop_cli_parity_2026_06_22]]
