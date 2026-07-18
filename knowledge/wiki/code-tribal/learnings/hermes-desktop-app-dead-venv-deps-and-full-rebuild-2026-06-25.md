---
title: Hermes desktop app dead 8 days = missing venv deps after auto-update; full update+GUI-rebuild recovery
tags: [hermes, desktop-app, electron, venv, python, npm, electron-builder, update, regression, zulu]
created: 2026-06-25
slot: zulu
related:
  - hermes-proxy-silent-degradation-missing-aiohttp-2026-06-23
  - ollama-wedge-recovery-disabled-task-brick-2026-06-23
memory: reference_hermes_app_annotated_doc_dep_fix_2026_06_25
---

# Hermes desktop app dead 8 days = missing venv deps after auto-update (2026-06-25, slot:zulu)

Operator: "update hermes cli and get the hermes app working again. its been down for over a week."

## The bug class
A desktop app that **auto-updates its own git repo then recreates/reinstalls its Python venv** will silently brick on boot if the dep-install stage does not complete: the code is new, the deps are old. Here the 06-17 auto-update pulled `hermes-agent` to a new HEAD but the venv dep-install never finished, so the backend crashed **every** boot on `No module named 'annotated_doc'` + "Web UI dependencies not installed (need fastapi + uvicorn)". 06-17 → 06-25 = 8 days = "over a week".

## Disambiguate FIRST — two independent "Hermes" systems
- **Hermes proxy `:8645`** (xAI Grok OAuth, behind `ask-hermes` / `mcp__hermes__*`) — was HEALTHY the entire outage (probe ok, 348 calls, `PRISM Hermes Proxy` task Ready/0x0).
- **Nous Hermes desktop app** (`C:/Users/wompu/AppData/Local/hermes/`, Electron + python `hermes-agent` backend) — the thing that was down.
"Hermes is down" is ambiguous; always split the proxy/CLI lane from the desktop app before diagnosing.

## Diagnose from the log, not assumptions
Both prior Hermes fixes say it and it held again: **read `logs/desktop.log` for the actual failing stage.** The tail named the exact missing module and the boot's own prescribed fix (`venv/Scripts/python.exe -m pip install -e .`).

## Non-obvious trap — the "venv-locking python" was the LIVE proxy, not a zombie
`Get-CimInstance Win32_Process` showed a `python.exe` from the hermes-agent venv holding the venv lock. Prior doctrine says "kill the venv-locker." But its CommandLine was `python -m hermes_cli.main proxy start --port 8645` = **the live :8645 proxy**. Killing it would have taken down the one working lane. **Read a process's CommandLine before killing it** — a venv-locker may be the service you depend on. The fix did not need the lock: `pip install -e .` writes site-packages, never the locked `python.exe`; only a venv *recreate* needs the lock released — and the current boot was not recreating.

## Fix (verified, two phases, rollback net throughout)
1. **Restore (current HEAD):** `pip install -e .` into the existing venv → installed `annotated_doc`, fastapi/uvicorn metadata → app booted. Proxy untouched.
2. **Full update + GUI rebuild** (operator-chosen):
   - Rollback net: recorded HEAD `394cdf48c`; `robocopy` backed up `win-unpacked` → `win-unpacked.working-bak`.
   - Pulled ff-only (moved dead `utils/` aside) → HEAD `7cd5eaa64` / hermes-agent 0.17.0; `requires-python` still `>=3.11,<3.14` so **no venv recreate** → proxy never disturbed. `pip install -e .` clean.
   - Rebuilt GUI: root **workspace `npm install`** (357 pkgs, 0 vuln) then `cd apps/desktop && npm run pack` (= `tsc -b && vite build && electron-builder --dir`). **0 tsc errors** → the prior "known-failing renderer build" was LOCAL autonomous-agent UI corruption (06-12), replaced by clean upstream source.
   - Verified: `HERMES_DASHBOARD_READY port=38399`, 5 procs, dashboard HTTP 200, `/api/*` 401 (auth-gated OK), `:8645` authenticated, `ask-hermes` round-trip returned the exact sentinel; rebuilt renderer bundle `index-BP2lCrYS.js` (old broken `index-AAwO0bRN.js` gone), `app.asar` repacked at the rebuild time.

## Update doctrine for this desktop app (the "how to update hermes cli")
- `npm run pack` (`electron-builder --dir`) refreshes `release/win-unpacked/` **in place** — no installer re-run, no config/auth loss. Prefer it over `dist:win` (which makes an NSIS/MSI the operator must re-run).
- It's an **npm-workspaces monorepo** → root `npm install` FIRST, then build `apps/desktop`.
- `release/win-unpacked/` is a gitignored **build artifact** — a plain `git pull` updates the backend but NOT the prebuilt renderer, so the matched update is pull + rebuild (or a fresh prebuilt release), never pull alone.
- `pyproject requires-python` gates whether the venv must be recreated; **only then** must the `:8645` proxy be stopped first (it runs from that venv's `python.exe`).

## Lessons
1. Auto-update + venv-recreate apps brick silently when dep-install doesn't finish — `pip install -e .` is the boot log's own recovery.
2. Read a process's CommandLine before killing a "venv-locker" — it may be the live service.
3. Updating a desktop app with a prebuilt renderer is pull + matched rebuild, not `git pull` alone.
4. Always keep a rollback net (backup the working build + record HEAD) before a multi-thousand-commit update you can't visually verify.
