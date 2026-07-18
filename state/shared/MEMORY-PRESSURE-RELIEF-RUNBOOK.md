---
title: PRISM Memory Pressure Relief Runbook — 12+ concurrent chats
date: 2026-05-19
audience: operator (Mark) — running 12+ Claude chats on one PC
related:
  - knowledge/memories/_legacy-root/feedback_no_parallel_agents_high_pressure.md
  - state/shared/specs/ANALYSIS-HANDOFF-SYSTEM-2026-05-11.md
  - scripts/fleet-reaper-sweep.mjs (Tier-1/2/3/4)
---

# Memory Pressure Relief Runbook

This runbook covers EVERY layer of memory relief available on a PRISM dev PC running 12+ concurrent chats. Layers go from **automatic** (fleet-reaper handles) to **one-time operator setup** (needs elevation, lasts forever).

## Quick triage — when commit pressure crosses critical (88%+)

1. **Check fleet-reaper status** — it auto-fires every 5 min via Windows scheduled task. If it's NOT Ready, run: `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`
2. **Force an immediate sweep**: `node H:/prism/scripts/fleet-reaper-sweep.mjs --once`
3. **Close one chat**: pick the heaviest claude.exe via Task Manager → Details → sort by Working Set, close that terminal. Slot is freed; fleet-reaper picks up the orphan in next sweep.

If commit > 95% sustained, STOP starting new tools/agents (per [[feedback_no_parallel_agents_high_pressure]] — combining tools at 90%+ deterministically wedges PS spawns).

## Layer 1 — automatic (fleet-reaper Tier 1-4, runs every 5 min)

| Layer | Trigger | Action | Source |
|-------|---------|--------|--------|
| Tier 1 — ballast release | first critical sweep | releases pre-reserved 256MB Buffer back to OS | fleet-reaper-sweep.mjs |
| Tier 1 — soft relief | stale-slot processes | BelowNormal priority + working-set trim on stale chat children | fleet-reaper-sweep.mjs |
| Tier 2 — Docker service restart | critical + wedged service | restart Qdrant/Postgres/Prometheus if down (opt-in: `PRISM_FLEET_REAPER_SERVICE_RESTART=1`) | fleet-reaper-sweep.mjs §1554 |
| Tier 3 — NIM keepalive | NIM probe down | spawn `H:/Tools/nim/start.ps1` (cooldown 300s) | fleet-reaper-sweep.mjs §7b |
| Tier 3 — task self-heal | scheduled-task !Ready | `schtasks /Run /TN "PRISM Fleet Reaper"` | fleet-reaper-sweep.mjs §7b |
| **Tier 4 — global compaction** | **critical pressure** | **`$p.MinWorkingSet = -1` on every claude/node/bash process — Windows trims working sets to minimum, refaults on access** | **fleet-reaper-sweep.mjs §7c (NEW 2026-05-19 U-WAVE4)** |
| Tier 4 — Ollama prewarm | GPU idle + pressure | prewarm qwen2.5-coder:3b → ollama-task-offloader absorbs more | fleet-reaper-sweep.mjs §8 |
| Tier 4 — offload hint | pressure | writes `state/shared/.ollama-routing-hint.json` with negative thresholdDelta — chats route more tasks to local Ollama | fleet-reaper-sweep.mjs §8 |

**Knobs to disable any layer if it misbehaves:**

```
PRISM_FLEET_REAPER_DISABLE=1             # turn off the whole reaper
PRISM_FLEET_REAPER_GLOBAL_COMPACT_DISABLE=1   # disable Tier-4 only
PRISM_FLEET_REAPER_NIM_KEEPALIVE_DISABLE=1    # disable NIM auto-restart
PRISM_FLEET_REAPER_TASK_SELFHEAL_DISABLE=1    # disable task self-heal
PRISM_FLEET_REAPER_SERVICE_RESTART=1     # ENABLE auto Docker service restart (default off)
```

## Layer 2 — one-time Windows-level setup (operator, elevated)

These are CONFIGURATION CHANGES that persist forever. Do them once on each PC running 12+ chats.

### 2.1 Page file — sized for crisis

If commit total is 58GB (32GB physical + 26GB pagefile on this PC), 12 chats can push commit to >50GB. Recommended:

```powershell
# From elevated PowerShell:
$pageFile = Get-WmiObject -Query "select * from win32_PageFileSetting"
# If you see a "System Managed" entry, switch to custom:
$cs = Get-WmiObject Win32_ComputerSystem
$cs.AutomaticManagedPagefile = $false
$cs.Put()

# Set initial=8192MB, max=32768MB on C: (adjust path for your system drive)
Set-CimInstance -Query "Select * from Win32_PageFileSetting where Name='C:\\pagefile.sys'" `
  -Property @{InitialSize=8192; MaximumSize=32768}
# Reboot for the new pagefile to take effect
```

### 2.2 Windows Memory Compression — verify it's enabled

Windows 10/11 has built-in memory compression (a compressed RAM tier between physical RAM and pagefile). Verify it's ON:

```powershell
Get-MMAgent | Select MemoryCompression
# Expected: MemoryCompression : True
# If False:
Enable-MMAgent -MemoryCompression
```

### 2.3 SysMain (Superfetch) — disable under low-RAM pressure

SysMain prefetches data into standby memory, which competes with the live working sets of 12 chats. On a memory-starved system, it's net-negative:

```powershell
# Stop the service + disable on boot
Stop-Service SysMain
Set-Service SysMain -StartupType Disabled
```

Reversibility: `Set-Service SysMain -StartupType Automatic; Start-Service SysMain`. Per the never-delete rule, prefer disable over uninstall.

### 2.4 Standby list clearer — RAMMap

Microsoft's free tool [RAMMap](https://learn.microsoft.com/sysinternals/downloads/rammap) (Sysinternals) has an `Empty -> Empty Standby List` command. Standby memory is "available but not free" — Windows reports it as in-use commit. Flushing it reclaims for active use.

Manual one-time: download RAMMap → run elevated → Empty Standby List.

Automated: download `EmptyStandbyList.exe` (community tool by Wen Jia Liu, sourceforge). Invoke as `EmptyStandbyList.exe standbylist` from elevated. Add to fleet-reaper Tier-4 in a future iteration if needed — currently NOT wired (would require shipping a binary in the repo, which we avoid).

## Layer 3 — PRISM-level configuration (already shipped 2026-05-19)

| Setting | Before | After | Effect |
|---------|--------|-------|--------|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 95 | **80** | Compact triggers earlier → less time spent at 95% commit |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 85000 | **48000** | Caps any single turn at 4.8% of 1M context (was 8.5%) |
| `heartbeat-keepalive timeout` | 8ms (broken) | **8000ms** | Heartbeat actually fires now (was no-op fleet-wide) |
| SessionStart hook injection | 14KB/fire | **3.3KB/fire** (74% reduction) | Wave 1+2 conversions — ai-deep-intelligence/claude-brief/ai-command-awareness now pointer mode |

## Layer 4 — Docker container memory limits (recommended next milestone)

Currently the PRISM docker-compose runs containers without `mem_limit`. Under pressure a container can OOM the whole host. Recommended limits:

| Container | mem_limit | mem_reservation |
|-----------|-----------|-----------------|
| qdrant | 4GB | 2GB |
| postgres-prism | 1.5GB | 512MB |
| prometheus | 768MB | 256MB |
| prism-server | 2GB | 1GB |
| ollama | (leave unbounded — model cache is the largest single consumer) | (none) |

Edit `H:/prism/mcp-server/docker-compose.yml` to add `mem_limit:` and `mem_reservation:` under each `services:` entry. Restart containers with `docker compose up -d --force-recreate <service>`.

**NOT shipped this milestone** — touches the production Docker config, needs operator review before applying.

## Layer 5 — operator behavior (no code changes)

Heuristics that matter at 12+ chats:

- **Cap concurrent chats at 8 during heavy work** — 12 is the documented max but assumes most chats are idle. If you're actively running /loop in 4+ chats simultaneously, expect 95%+ commit.
- **Restart the heaviest claude.exe weekly** — node accumulates working set over long sessions. The `fleet-memory-monitor` scheduled task names the largest tree in `AGENT_CHAT.jsonl` so you know which to restart.
- **Close browser tabs + video apps during /goal runs** — Chromium chats can hold 5-10GB on their own.
- **Watch fleet-reaper caveats** — every `--once` output has a `caveat:` line. `global compaction FAILED` or `service relief ADVISED` are signals to act.
- **Use `/compact` proactively** — don't wait for autocompact (80%). Run `/compact` at end of each unit, before starting a new one.

## Verification — current pressure right now

```bash
node H:/prism/scripts/fleet-reaper-sweep.mjs --status --json | jq '.mem.commitUsedPct, .mem.physUsedPct, .pressureTier'
```

Or call directly:

```powershell
$os = Get-CimInstance Win32_OperatingSystem
$physUsedPct = [math]::Round((1 - $os.FreePhysicalMemory / $os.TotalVisibleMemorySize) * 100, 0)
$commitUsedPct = [math]::Round((1 - $os.FreeVirtualMemory / $os.TotalVirtualMemorySize) * 100, 0)
"Phys: ${physUsedPct}% used, Commit: ${commitUsedPct}% used"
```

Critical threshold per fleet-reaper: **88% commit** (OPT-2 lowered from 95 to 88 on 2026-05-17 — see `## Recent regressions` in `H:/prism/CLAUDE.md`). At 88%+ all Tier-1..4 actions are armed and Tier-4 global compaction fires.
