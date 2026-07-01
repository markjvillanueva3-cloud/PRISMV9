---
title: Windows harness — repo file-ops, process persistence, shared-tree git contention & local-AI GPU limits
type: lesson
domain: dev-infra
slot: golf
created: 2026-06-01
tags: [windows, powershell, encoding, crlf, bom, scheduled-task, process-persistence, git, index-lock, gpu, ollama, nim, fleet-hygiene]
related:
  - "[[context-economy-injector-knobs]]"
  - "[[hot-path-injector-safety-patterns]]"
  - "[[fleet-reaper]]"
---

# Windows harness — file-ops, process persistence, shared-tree git contention, local-AI GPU limits

Hard-won 2026-06-01 (slot:golf) across an Ollama/Docker/NIM startup + fleet-reaper + install-script session. golf's fleet-hygiene/dev-infra domain is the fleet's **worst-covered** wiki↔tribal leg (1.1%); these four are real, reproduced, high-recurrence — capture beats re-deriving.

## 1. NEVER edit a repo file with PowerShell `[IO.File]::WriteAllText` — use the Edit/Write tool

Editing `.ps1`/source content via PowerShell `WriteAllText(path, text, UTF8Encoding $false)` is a Windows trap:

- It **strips the UTF-8 BOM**. Windows PowerShell 5.1 (`powershell.exe` — the documented `-File` scheduled-task re-register path) reads a no-BOM UTF-8 file under the CP1252 codepage, so any non-ASCII glyph (em-dash `—`, right-arrow `→`, smart quotes) becomes mojibake (`â€"`) → `UnexpectedToken` parse failure. The **BOM is what lets 5.1 parse a UTF-8 script** (a BOM'd install script re-registers fine; a de-BOM'd one fails).
- The repo's autocrlf checkout makes the working tree **CRLF**; `WriteAllText` preserves it, so committing flips line endings vs the blob — git shows the *entire file* changed (`465 insertions / 465 deletions` for a 2-glyph edit), masquerading as a huge regression.
- `sed -i 's/\r$//'` and `perl -i -pe 's/\r//g'` on git-bash **do NOT fix the CRLF** — git-bash perl's Windows text-mode output layer re-adds `\r` on write. `[Parser]::ParseFile` (UTF-8 aware) reports the file clean while `powershell.exe -File` chokes — the discrepancy *is* the tell.

**Fix:** edit harness/repo files with the **Edit/Write tool** (preserves the file's existing encoding + line endings). Reserve PowerShell for *process/service/task* operations, never repo file content. Cost when ignored: a multi-commit phantom "CRLF regression" rabbit hole whose net change ended up **zero**.

## 2. Tool-spawned processes DIE on call completion — persistent services need a scheduled task

A process started via `Start-Process` (PowerShell tool) or `&` / `run_in_background` (Bash tool) lives in the tool's process tree and is reaped when the tool call returns. `ollama serve` bound `127.0.0.1:11434` successfully (the serve log proved `Listening on 127.0.0.1:11434`) yet `ollama procs: 0` by the next call.

**Fix for a persistent service** — register a **scheduled task** (runs under Task Scheduler, outside the tool's tree). The pattern that made Ollama persistent:

```powershell
Register-ScheduledTask -TaskName 'PRISM Ollama Serve' `
  -Action    (New-ScheduledTaskAction -Execute $ollamaExe -Argument 'serve') `
  -Trigger   (New-ScheduledTaskTrigger -AtLogOn) `
  -Principal (New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest) `
  -Settings  (New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)) -Force
Start-ScheduledTask -TaskName 'PRISM Ollama Serve'
```

Same persistence pattern as every `PRISM *` fleet task (fleet-reaper, monitors). `ExecutionTimeLimit ([TimeSpan]::Zero)` = no timeout (servers run forever); `S4U` = survives logoff + reboot; `RestartCount` self-heals.

## 3. Shared-tree `index.lock` contention — classify the lock before removing it

On the shared `H:/prism` tree with many concurrent `[MAIN]` committers + slow pre-commit hooks, `git add/commit/checkout` constantly lose the `.git/index.lock` race. Recovery rules:

- **0-byte lock** = a git process created it then died = **stale, safe to `rm`** (`[ -f .git/index.lock ] && [ ! -s .git/index.lock ] && rm -f`).
- **Non-empty lock, mtime static > ~60 s** = stale (real ops finish in seconds or touch it continuously) → safe to `rm`. BUT this repo's pre-commit hooks can run *minutes*, so a *fresh* large lock may be an active slow-hook commit — **do NOT remove** (corrupts a peer's in-flight commit).
- `rm` reporting **"Device or resource busy"** = a live process holds the file open = active, leave it and wait.
- A peer commit **rebuilds the index → your staged changes are dropped silently**. Re-`git add` *inside* the retry loop; never stage-once-then-retry-commit.
- Reaping orphan `git.exe` (parent process dead) clears abandoned locks — when `git` process count hits 0, contention clears and commits flow.

## 4. A 16 GB GPU can't hold NIM-Llama + big Ollama models at once

NVIDIA NIM (vLLM) **reserves the bulk of GPU memory** for its KV cache on startup — `nim-llama32-3b` pushed the RTX 4080 SUPER to 97% (15.9 / 16.4 GB). Ollama then cannot load `qwen-14b/32b` alongside it (OOM). Coexistence reality on a 16 GB card:

- Keep **NIM-Llama-3B + NIM-embed resident**; let Ollama load smaller models (`qwen2.5-coder:7b`) on demand and `keep_alive=0`-unload them to free room.
- NIM first-start is **slow under WSL** (`WARNING ... Using 'pin_memory=False' as WSL is detected`). `health: starting` for several minutes is a normal vLLM model load, **not a hang** — confirm progress via `docker logs <nim> --tail` (look for "Starting to load model" / "Loading safetensors checkpoint shards").
- `nvidia-smi` "unavailable" reported by a tool is usually a **PATH gap in that tool's env**, not a dead GPU — it lives at `C:\Windows\System32\nvidia-smi.exe`.

## Meta
These four recur across every Windows PRISM host. The unifying rule: **match the tool to the job** — Edit/Write for repo files, scheduled tasks for persistent processes, lock-classification before git force-recovery, and capacity-aware model residency for the shared GPU.
