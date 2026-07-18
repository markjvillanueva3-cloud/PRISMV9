---
name: reference_prism_task_launchers_fixed_2026_06_11
description: Desktop PRISM launchers fixed (2026-06-11) — RESTORE-PRISM-TASKS.bat (normal) + KILL-PRISM-TASKS.bat (gaming kill switch) now share prism-task-mode.ps1 and manage BOTH scheduled tasks AND the reaper env-knobs; gaming mode also frees Ollama VRAM.
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:47.122Z
aliases: reference_prism_task_launchers_fixed_2026_06_11
---


# PRISM desktop task launchers — fixed + unified (2026-06-11, slot:golf)

Operator: *"fix and update the RESTORE-PRISM-TASKS launcher on my desktop and the reverse kill switch for when I'm gaming."*

**Location:** `C:/Users/wompu/OneDrive/Desktop/` (the OneDrive-redirected Desktop — see [[reference_this_pc_onedrive_desktop_2026_05_28]]). Files: `RESTORE-PRISM-TASKS.bat`, `KILL-PRISM-TASKS.bat`, and the new shared engine `prism-task-mode.ps1`. A local-desktop `Gaming Mode.lnk` launches the kill switch.

## The bug that was fixed
The May-2026 launchers managed ONLY scheduled tasks (`Get-ScheduledTask | ? TaskName -like 'PRISM*'` → Enable/Disable). They did NOT touch the reaper **env kill-switches** in settings.json — so RESTORE left `PRISM_FLEET_REAPER_DISABLE=1` set (reaping stayed off fleet-wide even with tasks enabled), and KILL didn't stop a live chat's guardian hook from re-launching reapers. The env knob is the real backstop; the task is only the durable cadence.

## New design (single source of truth)
- **`prism-task-mode.ps1 -Mode restore|kill`** holds all logic so the two launchers can't drift. Both `.bat` files are thin self-elevating wrappers calling `%~dp0prism-task-mode.ps1`.
- **restore** (normal): Enable all `PRISM*` tasks + set `PRISM_FLEET_REAPER_DISABLE`/`PRISM_GOLF_GUARDIAN_DISABLE` → `0` in BOTH settings.json copies (C: + H:, targeted regex, UTF-8 **no BOM** via `[IO.File]::WriteAllText` — `Set-Content -Encoding UTF8` would inject a BOM and break the parse + the C→H mirror).
- **kill** (GAMING): Disable + stop all `PRISM*` tasks + set the env knobs → `1` + **unload every Ollama model from VRAM** via `POST /api/generate {keep_alive:0}` per `GET /api/ps` model (the big gaming win — qwen2.5-coder:32b alone held **54.7GB VRAM** at validation) + best-effort `docker stop` of `name=prism` containers.

## Validation (2026-06-11, non-destructive — did NOT run the live kill)
- `prism-task-mode.ps1` parses with 0 errors.
- env-knob regex toggles `0↔1` correctly on the real settings.json; output is valid JSON (no corruption).
- `/api/ps` confirmed shape `models[].name` (+ `size_vram`); 54.7GB loaded → kill frees it.

**Why:** RESTORE silently didn't restore reaping (env-knob gap); the gaming switch didn't free the GPU (Ollama VRAM is the dominant gaming hog). **How to apply:** run RESTORE after gaming to return to normal; the reaper is now hardened ([[feedback_reapers_disabled_2026_06_11]]) so re-enabling is safe. Related: [[reference_golf_inventory_of_record_2026_06_11]].
