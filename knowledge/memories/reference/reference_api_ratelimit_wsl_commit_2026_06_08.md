---
name: reference_api_ratelimit_wsl_commit_2026_06_08
description: "CORRECTED — the recurring \"API limit error\" (local ECONNREFUSED, not a true Anthropic 429) is host commit-charge pressure, but the committer is the nim-llama32-3b GPU Docker container (~88GB GPU-address-space reservation into WSL), NOT an unenforced WSL .wslconfig cap. The cap was honored all along."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-09T14:54:09.022Z
aliases: reference_api_ratelimit_wsl_commit_2026_06_08
---


# "API rate-limit" = host commit pressure from the NIM GPU container (CORRECTED diagnosis, 2026-06-08, slot:india)

Operator asked what causes API rate-limit errors + whether our equipment/settings
can mitigate. **The widely-cited charlie diagnosis ("WSL balloons past its 16GB
.wslconfig cap because wsl --shutdown was never run") is WRONG about the cause.**
India re-diagnosed with a definitive isolation test.

## What's actually true (measured, DESKTOP-N7MI1VB, 127GB RAM, 96GB Blackwell)

| Claim | Reality |
|---|---|
| WSL `.wslconfig memory=16GB` unenforced | **FALSE — it IS honored.** `docker stats` shows every container a **15.62 GiB** ceiling; WSL working set is ~3-6GB. |
| `vmmemWSL` "95GB" = wasted WSL RAM | **NO** — it's COMMIT charge (reserved address space), working set tiny. |
| Root committer | **`nim-llama32-3b` Docker container** (a GPU NIM model server). DEFINITIVE TEST: `docker stop nim-llama32-3b` → vmmemWSL commit **96.94GB → 9GB** (−88GB); host commit **87% → 50%**. The ~88GB ≈ the GPU's address space mapped into the WSL2 VM for the container's CUDA context (same class as the BLACKWELL "96GB committed-pool" WDDM artifact). |
| Why it surfaces as "API limit" | host commit at ~88-90% (near the 227GB limit ceiling) → outbound HTTPS/socket allocs + MCP server fail → ECONNREFUSED (watchdog.log confirms ECONNREFUSED, NOT Anthropic `429`/`retry-after`). |

## THE real fix (our equipment/settings)

**Stop / don't run `nim-llama32-3b`.** It's REDUNDANT: native Ollama already
serves `qwen2.5-coder:32b` (a far more capable model) on the same GPU — that's the
octopus/RAG/india-routing workhorse (35GB VRAM, legit, KEEP). The NIM 3B is a
leftover; it's already `AutoStart: False` in Docker Desktop yet was running 24/7.
- Immediate: `docker stop nim-llama32-3b` → reclaims ~88GB commit, host 87%→50%.
- Durable: keep it stopped; optionally drop its `restart: unless-stopped` so a
  Docker Desktop restart doesn't revive it. Don't run two GPU model servers
  (NIM + Ollama) concurrently for the same role.

## The wsl --shutdown was a RED HERRING (but harmless)

`wsl --shutdown` "worked" briefly only because it took the NIM container down as
collateral. The `.wslconfig` 16GB cap + `autoMemoryReclaim=gradual` are correct
and good hygiene (now applied), but were never the problem. The `27-wsl-memory-
guard.mjs` task (15-min advise + boot) stays as a tripwire — but note it measures
`vmmemWSL` commit, which on a GPU host is inflated by GPU-container mappings, so
its "overrun" can be a GPU-reservation artifact, not RAM starvation. Treat its
verdict as "investigate WHAT is committing," not "WSL RAM is being wasted."

## Distinguish the two error classes (R12)

- **Local** (this one): ECONNREFUSED / allocation-fail at high host commit. Fixed
  by freeing commit (stop the NIM container). Our-side, settings-fixable.
- **True Anthropic 429**: carries `retry-after` + `anthropic-ratelimit-*` headers.
  Not fixable by local settings; needs request pacing. No evidence of these in logs.

Supersedes the earlier (wrong) framing in this file's first version. Related:
[[reference_loop_auto_advance_2026_06_08]]. The guard script:
`scripts/system-health/27-wsl-memory-guard.mjs` (charlie); installer
`install-wsl-memory-guard-task.ps1`.
