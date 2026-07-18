---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Per-file 2-arm gate, file 3/4 for OBSIDIAN-INTELLIGENCE-MS3 / F1 (U-VOICE-CAPTUR"
date: "2026-05-17"
first_ts: "2026-05-17T02:48:40.884Z"
last_ts: "2026-05-17T02:49:06.535Z"
cwd: "h:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-a08536e3e79cc5a39.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Per-file 2-arm gate, file 3/4 for OBSIDIAN-INTELLIGENCE-MS3 / F1 (U-VOICE-CAPTUR

> **claude-code-cli** | 2026-05-17 | 5 msgs (2 user / 3 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-a08536e3e79cc5a39.jsonl`

## Transcript

### User | 2026-05-17T02:48:40.884Z

Per-file 2-arm gate, file 3/4 for OBSIDIAN-INTELLIGENCE-MS3 / F1 (U-VOICE-CAPTURE).

FILE: H:/prism-hotel-c2/scripts/install-whisper-local.ps1

PowerShell installer for whisper.cpp local binary + ggml model. Idempotent. -DryRun, -Uninstall, -Force flags. Tries winget first, falls back to manual-download instructions. Uninstall renames to `.disabled-<stamp>` (never-delete doctrine).

YOUR JOB: flag P0/P1 with weight on:
- Strict mode + ErrorActionPreference Stop honored (R12 fail-loud)
- Idempotency: re-running doesn't double-install; -Force is the explicit opt-in
- Uninstall is reversible (rename, not Remove-Item -Recurse)
- Download safety: TLS, no chained pipe injection, timeout on Invoke-WebRequest
- Env-var hints printed verbatim with proper quoting for paths-with-spaces
- winget command failure properly detected via $LASTEXITCODE
- No shell-injection vector (operator-controlled $WhisperDir / $Model flow into paths only, not Invoke-Expression)
- Model URL is canonical (huggingface.co/ggerganov/whisper.cpp is the official mirror)

P2/P3 deferrable. GRADE PASS/FAIL. Under 200 words.

### Assistant | 2026-05-17T02:48:46.512Z

I'll read the file and analyze it against the criteria.

### Assistant | 2026-05-17T02:48:46.766Z

[tool_use: Read]

### User | 2026-05-17T02:48:47.635Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  install-whisper-local.ps1 — OBSIDIAN-INTELLIGENCE-MS3 / F1 (U-VOICE-CAPTURE)
4	
5	  Installs whisper.cpp (or whisper-faster) locally so the F1 watcher script
6	  (scripts/voice-capture-watcher.mjs) can transcribe voice memos without a
7	  network round-trip. Idempotent; -DryRun for inspection; -Uninstall reverses.
8	
9	.DESCRIPTION
10	  Three install paths, tried in order:
11	
... [+8095 chars truncated]

### Assistant | 2026-05-17T02:49:06.535Z

## Per-File Gate — File 3/4 — install-whisper-local.ps1

**GRADE: PASS** (with 2 P1 fixes recommended)

### P0 — None.

### P1 (recommend fix before next file)

1. **No integrity check on model download (~140 MB-3 GB binary, no checksum/signature).** A MITM or HuggingFace mirror compromise yields silent bad-model installation. Add SHA-256 verification — HuggingFace publishes `sha256` in the file's API metadata (`GET /api/models/ggerganov/whisper.cpp`). At minimum verify download size > 0 and matches `Content-Length` post-write; ideally pin known-good SHA per model.

2. **`Rename-Item -NewName (Split-Path -Leaf $disabled)`** — if `$WhisperDir` is a relative path or has a trailing slash, `Split-Path -Leaf` of `"$WhisperDir.disabled-$stamp"` can produce unexpected results. Safer: resolve `$WhisperDir` to absolute first via `Resolve-Path`, then construct the disabled name from the resolved parent.

### P2/P3 (deferrable)

- TLS version not pinned — Win10+ PS5.1 defaults to TLS 1.2+ for `Invoke-WebRequest`, but explicit `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12` would be belt-and-suspenders.
- `winget install` runs without verifying publisher signature explicitly (winget handles internally — acceptable).
- `Write-Error` followed by `exit N` — Stop preference makes `Write-Error` throw; the explicit `exit` is unreachable but harmless.

### Strengths
- StrictMode Latest + `$ErrorActionPreference="Stop"` honored. R12 compliant.
- Idempotency clean: `-Force` is explicit opt-in; existing-binary check covers both `$WhisperDir` and `$env:PATH`.
- Uninstall renames (never deletes) — doctrine-compliant + recoverable.
- `$LASTEXITCODE` properly checked post-winget invocation.
- `Test-Path -LiteralPath` throughout — no glob-injection on operator-controlled paths.
- Model URL is canonical (HuggingFace `ggerganov/whisper.cpp` is the upstream-blessed mirror).
- No `Invoke-Expression`; operator inputs flow only into path joins.
- Env-var hints use 
... [+227 chars truncated]
