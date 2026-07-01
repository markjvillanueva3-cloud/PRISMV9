---
name: reference_agent_api_limits_commit_2026_06_10
description: "Re-verified 2026-06-10 (slot:tango): 'API errors when launching agents' = local ECONNREFUSED from HOST COMMIT pressure, not Anthropic 429. NIM committer gone; commit 190/291GB=65.5%. Real levers: raise H: pagefile (commit limit) + bound Ollama resident models. WSL cap + tool-concurrency are NOT the fix. Fixed MCP daemon heap divergence."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.461Z
aliases: reference_agent_api_limits_commit_2026_06_10
---


Operator (2026-06-10): "increase any limits that cause api server / OOM errors -- I used to launch more agents without api errors." Re-verified the live state (extends [[reference_api_ratelimit_wsl_commit_2026_06_08]]).

## Measured state (DESKTOP-N7MI1VB, 127GB RAM, 96GB Blackwell)
- **Host commit: 190.8 / 291.1 GB = 65.5%.** ECONNREFUSED ("API error") historically hit at ~87%. ~100GB headroom now.
- **Commit limit 291GB = 127GB RAM + ~164GB pagefile** (C: 4GB→192max, G/J/L: 32GB each, **H: 64GB**). Pagefile is **manually managed** (AutomaticManagedPagefile=False).
- **Top committer: `llama-server` 60GB** (Ollama). `ollama ps`: qwen2.5-coder:32b **54.7GB** + nomic-embed 0.3GB resident.
- **No NIM container** (docker ps = prometheus/qdrant/grafana/postgres only) -- the old ~88GB committer is gone.

## The error class (R12 -- do NOT conflate)
- This symptom = **LOCAL ECONNREFUSED** at high host commit (MCP :3100 / socket allocs fail). Settings-fixable.
- A TRUE Anthropic 429 carries `retry-after` + `anthropic-ratelimit-*` headers -- needs request pacing, not local limits. No evidence of these.

## Real levers ("more agents without API errors" = more COMMIT HEADROOM)
1. **Raise the commit limit via the H: pagefile** (2.7TB free, only 64GB now). System Properties > Performance > Virtual Memory, or admin PowerShell: set H:\pagefile.sys to e.g. 256GB -> commit limit ~291 -> ~483GB. **Needs admin + reboot.** PRIMARY lever.
2. **Bound Ollama resident commit** (no reboot, but restarts Ollama): `OLLAMA_MAX_LOADED_MODELS=2` + a shorter `OLLAMA_KEEP_ALIVE` so big models unload when idle -- the 54.7GB qwen2.5-coder:32b is the dominant committer; multiple large models warm at once spikes commit fast.
3. **`PRISM_MCP_HEAP_FLOOR_MB`** now tunes BOTH MCP spawn paths (daemon + supervisor) after U-FLOR-MCP-HEAP (806423f1e5). Default 24576 (24GB). Lower it (e.g. 8192) to free MCP commit if tight.

## NOT the fix (verified -- do not repeat)
- **WSL `.wslconfig memory=16GB`** is honored + correct; raising it does NOT touch host commit pressure. Left unchanged.
- **`CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` (20)**: raising it spawns MORE concurrent agents -> MORE commit + MORE true-429 risk. The OPPOSITE of the fix. Left at 20.
- **start-production heap (4096)**: Windows `--max-old-space-size` is a COMMIT RESERVATION; a large hardcoded default re-breaks spawn. Env-overridable.

## Shipped this session
- `U-FLOR-MCP-HEAP` (806423f1e5): fixed the daemon/supervisor heap divergence (daemon was 4GB default vs supervisor 24GB) -> both read PRISM_MCP_HEAP_FLOOR_MB. Removes the recurring [[reference_mcp_boot_heap_oom_2026_06_09]] heap-OOM on the daemon path + gives a single commit-vs-heap knob.
