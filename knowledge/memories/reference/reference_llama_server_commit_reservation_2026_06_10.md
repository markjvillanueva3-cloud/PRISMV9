---
name: reference_llama_server_commit_reservation_2026_06_10
description: "The recurring 97% commit-pressure spikes on this 127GB box = leaked llama-server ORPHANS (a single untracked model server holding 65GB), NOT a leak in active use. Alpha reaped PID 44604 (65GB, untracked) live: commit 68%->38.5%, freed 67GB, no reboot, tracked models stayed healthy. india's reap-llama-server-orphans.mjs catches same-blob DUPS only; the UNTRACKED-single-instance case is the open gap (routed to golf, needs manifest resolution). Also: critical-memory-compact-nudge is CORRECTLY designed (R8 -- do not relabel)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.645Z
aliases: reference_llama_server_commit_reservation_2026_06_10
---


# llama-server ORPHAN = the recurring commit-pressure source (alpha, 2026-06-10)

Extends [[reference_commit_pressure_rootfix_2026_06_10]] + [[reference_llama_server_orphan_reap_2026_06_09]] (india).

## What happened (corrected -- supersedes my first framing)
Pressure gate kept firing ~97% commit even after the auto-relief + pagefile fixes.
First framing was "llama-server 65GB is the goal's live engine, don't kill." WRONG --
live cross-ref proved it was a **leaked orphan**:
- `/api/ps` tracked ONLY `nomic-embed-text` (0.3GB) at the time, yet `Win32_Process
  llama-server.exe` showed PID 44604 = **65.3GB, 68min old, blob `6be6d66a...`**.
- Ollama runs one llama-server per TRACKED model. A 65GB server with no tracked
  counterpart = an orphan from an expired gpt-oss generation (process didn't die).
- **Reaped PID 44604 (`Stop-Process -Force`): commit 68.2% -> 38.5%, freed ~67GB,
  no reboot. nomic-embed-text stayed tracked + healthy (fail-soft confirmed).** Kept
  PID 35680 (1.7GB, the live nomic server). india's 2026-06-09 reap = same pattern.

## The DURABLE gap (routed to golf -- owner of the reaper)
`scripts/system-health/reap-llama-server-orphans.mjs` (india, f4a681e986) catches
ONLY a **same-model-blob DUP** (2 servers, same blob, kill older). It deliberately
skips "single-instance/different-model" -- so it MISSED my untracked-single-instance
orphan (correct conservatism, real gap). The complementary criterion needed:
**a llama-server whose `--model` blob matches NO currently-tracked model, older than
a generous min-age, = untracked orphan -> reap.**

SAFE-DESIGN constraint (verified live): `/api/ps` exposes the model MANIFEST `digest`
(e.g. qwen2.5-coder:32b -> `b92d6a0b...`), NOT the GGUF blob sha in `--model`
(`6be6d66a...`) -- they are DIFFERENT hashes. So the detector must RESOLVE each
tracked model's manifest (`~/.ollama/models/manifests/.../<tag>` JSON -> the gguf
layer's blob digest) and match that against the llama-server `--model` blob leaf. A
count/size heuristic is NOT safe (a wrong kill drops a live GPU model server -> fleet
inference outage). Dry-run default + generous min-age + re-check-before-kill, like
india's existing harness. This is golf's delicate build, NOT to be rushed.

## R8 CORRECTION to guard-audit (wf_8aad5adf-f68)
`critical-memory-compact-nudge.mjs` is CORRECTLY designed -- it nudges /compact ONLY
when `row.largestTree === mySlot` (this CHAT is the largest tree), where /compact
genuinely sheds the claude.exe transcript footprint. It would NOT fire on a
llama-server orphan (not a slot). Do NOT relabel it. The "always says compact" noise
relax should target the un-deduped Stop advisories + redundant ctx-token injectors.
