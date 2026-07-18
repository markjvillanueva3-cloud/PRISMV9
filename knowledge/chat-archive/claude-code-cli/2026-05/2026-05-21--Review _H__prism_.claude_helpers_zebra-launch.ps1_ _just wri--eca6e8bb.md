---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Review `H:/prism/.claude/helpers/zebra-launch.ps1` (just written, ~240 lines aft"
date: "2026-05-21"
first_ts: "2026-05-21T18:24:49.720Z"
last_ts: "2026-05-21T18:25:33.796Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a7ca06797f5e0069c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review `H:/prism/.claude/helpers/zebra-launch.ps1` (just written, ~240 lines aft

> **claude-code-cli** | 2026-05-21 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a7ca06797f5e0069c.jsonl`

## Transcript

### User | 2026-05-21T18:24:49.720Z

Review `H:/prism/.claude/helpers/zebra-launch.ps1` (just written, ~240 lines after ASCII fix) per the CLAUDE.md per-file scrutiny gate. This is the single-file operator launcher closing G10 (scheduled-task install) + G12 (per-slot zebraOptIn flip) — the two operator-actions left at the end of ZEBRA-HERMES-GAP-AUDIT (see `H:/prism/state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md`).

Context: PowerShell 5.1-compatible (Windows default). Already PARSE OK via offline `[Parser]::ParseFile`. Calls `install-zebra-orchestrator-task.ps1` (now em-dash-fixed, also PARSE OK) for G10. Does inline atomic JSON edit on `state/shared/chat-slots.json` for G12 with a lockfile dance mirroring the convention in `H:/prism/.claude/helpers/chat-slots.mjs` (writeFileSync wx-flag → PS New-Item -ItemType File).

Doctrine constraints:
- Default burn-in (`-DryRun` baked into task), `-Live` required to actuate
- Default slots = `alpha + golf` (conservative starter)
- Unknown slot names skipped with warning, NEVER created
- Lockfile timeout 5000ms with stale-break (matches chat-slots.mjs)
- Atomic write via temp file + Move-Item -Force (same-volume NTFS atomic rename)
- `#Requires -RunAsAdministrator` declaration (PS-native elevation gate)

Read the whole file end-to-end and grade PASS/FAIL with P0/P1/P2 findings. Focus on:
1. **Race conditions** — chat-slots.json is the most peer-contended file in the repo. Does the lock dance actually prevent a torn write if a peer claims a slot DURING our edit window? After we acquire-lock + read, can a peer write before we Move-Item? (Peers use the same lockfile — verify.)
2. **Atomic write integrity** — does `Set-Content -NoNewline -Encoding UTF8` preserve the JSON exactly? Any BOM-injection risk on Windows? Does `ConvertTo-Json -Depth 100` round-trip without data loss on a file with arbitrary slot fields?
3. **Failure modes** — what if `Set-Content` succeeds but `Move-Item` fails (e.g., target locked)? Lock release in `finally` should still fire — ve
... [+890 chars truncated]

### Assistant | 2026-05-21T18:25:00.527Z

I'll read the file end-to-end and analyze it.

### Assistant | 2026-05-21T18:25:01.093Z

[tool_use: Read]

### User | 2026-05-21T18:25:07.503Z

[tool_result] 1	#Requires -RunAsAdministrator
2	<#
3	.SYNOPSIS
4	  ZEBRA-OMNISCIENT operator launcher — one elevated PS call lands G10 + G12.
5	
6	.DESCRIPTION
7	  Closes the two operator-action gates left at the end of ZEBRA-HERMES-GAP-AUDIT:
8	    G10 — registers the `PRISM Zebra Orchestrator` scheduled task (via
9	          install-zebra-orchestrator-task.ps1). Default: BURN-IN (dry-run baked
10	          in
... [+10484 chars truncated]

### Assistant | 2026-05-21T18:25:33.796Z

## Code Quality Analysis Report

### P0 — Race Conditions / Atomic Integrity

1. **`Set-Content` does NOT preserve UTF-8 without BOM on PS 5.1** (line 184). PS 5.1 `Set-Content -Encoding UTF8` writes UTF-8-with-BOM. `chat-slots.json` is consumed by `chat-slots.mjs` (Node), which reads via `JSON.parse` — Node tolerates BOM, but other readers (e.g., `Get-Content -Raw` later, jq, hooks) may not. Fix: `[IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))`.

2. **Lock dance does NOT match `chat-slots.mjs` convention.** Peers use `wx`/`O_EXCL` on path `chat-slots.json.lock` (or wherever the mjs helper writes it). This script locks `state/shared/chat-slots.lock` — **verify the exact filename matches the mjs helper**. If different, peers race past your lock entirely. (Critical — peer can write between your read at line 140 and Move-Item at line 185.)

3. **Unknown-vs-empty slot semantics violate doctrine** (lines 152–164). Spec says "unknown skipped, NEVER created." Line 157 `$null -eq $slotObj` triggers slot creation. If `slots.foo: null` exists in JSON, this CREATES a slot — operator never asked for that. Fix: collapse `$null` case into `$skipped` with `:empty-slot` reason; only flip when `$slotObj` is a populated object.

### P1

4. **`ConvertTo-Json -Depth 100` lossy round-trip on PS 5.1**: empty arrays serialize as `null`, integers >2^31 may downcast, custom date strings may reformat. Verify by diffing a no-op run against the original.

5. **`finally` block lock release is correct, but `Move-Item` failure leaves orphan `.tmp`** (line 185). Add `Remove-Item $tmp -Force -EA SilentlyContinue` to `finally`.

6. **`#Requires -RunAsAdministrator` blocks `-WhatIf` preview from non-admin shells.** Doctrine: preview should be cheap. Move admin check inside `-not $SkipInstall` branch, or guard with a `$WhatIf` bypass.

7. **`-Slots` injection surface**: while values funnel into JSON property names (not shell), `New-Item -Path` with `$LockPath` is fixed —
... [+952 chars truncated]
