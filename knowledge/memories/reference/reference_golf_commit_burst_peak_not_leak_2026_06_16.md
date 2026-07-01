---
name: golf-commit-burst-peak-not-leak-2026-06-16
description: "FLEET-HYGIENE/golf diagnostic (2026-06-16, operator 'clear up commit oom, were getting api errors again'): a commit reading of 88.9% WATCH (185.69/208.95GB) with the box throwing 'API errors' was a TRANSIENT BURST PEAK, not a reapable leak. Verified comprehensively: 0 dead-parent orphans (node/bash/git/python/search-tools), bash drained 401->287->146 in ~40s (all <1min age, 216 active-child, 0 hung-leaked), node 97 = 86 young-churn + 5 durable + 6 legit-detached, 72 scheduled tasks 0 launch-failing. Commit SELF-RELIEVED to 47.3% OK within ~3min as the synchronized 13-chat ultracode hook-burst drained + a concurrent heavy op (gpt-oss:120b 66.5GB) completed. LESSON: at a WATCH reading with a clean orphan census, DON'T chase a phantom leak -- re-measure after 2-3min first; bursts drain. The structural driver is CHAT-COUNT x ultracode(effortLevel:xhigh) fan-out, NOT orphans. The only durable levers are operator-side: close idle chats (charlie+tango were idle 170m/101m = the close-list) + disable ultracode / restart onto the shipped effortLevel:high baseline. Reaping/WS-trim cannot help because nothing is leaked and commit is reservation-backed (WS-trim frees RAM, not commit)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.595Z
aliases: reference_golf_commit_burst_peak_not_leak_2026_06_16
---


**Diagnostic (golf, 2026-06-16).** Operator: "clear up commit oom, were getting api errors again." Recurring pattern -- the "API errors" are the local ECONNREFUSED that host commit-charge pressure produces (per [[reference_api_ratelimit_wsl_commit_2026_06_08]]), compounded by ultracode fan-out (per [[reference_hybrid_effort_tier_router_2026_06_15]]). Both vault memories surfaced on the memory pre-search -- the diagnosis was already known; this entry adds the BURST-PEAK-vs-LEAK distinction.

## The trap: a WATCH reading is NOT proof of a leak
First measurement: **commit 185.69/208.95GB = 88.9% [WATCH]**, RAM 50%, C: 44GB free, pagefile cur 1.14GB / peak 16.49GB (HEALTHY -- not the runaway recapture spiral of the earlier 2026-06-16 crisis [[reference_ollama_c_to_h_consolidation_2026_06_16]]).

I initially flagged "401 bash.exe + 222 conhost + 80 node" as a fork-storm smoking gun. **It was not.** Re-measuring ~40s later: bash 401->287, ALL 287 age <1min, 216 with active children, **0 hung-leaked**. The census confirmed **0 dead-parent orphans** across node/bash/git/python/search-tools. node 97 = 86 young-churn + 5 durable-daemon + 6 legit old-detached (zulu-brain-web, TS language-server, typingsInstaller, Fusion webdeploy updater, 2 npx). 72 PRISM scheduled tasks: **0 launch-failing**, 2 intentionally-disabled (Tribal Consolidate Weekly, Zebra Orchestrator -- non-critical).

Then the key event: **within ~3 min, commit SELF-RELIEVED 88.9% -> 47.3% [OK]** (185.69 -> 81.21GB), bash 287 -> 146. Nothing was reaped. The peak drained on its own as the synchronized 13-chat ultracode hook-burst finished + a concurrent heavy op released (gpt-oss:120b 66.5GB resident, expiry bumped to 20:26 = actively in use, then settled).

## What this means (the lesson)
1. **A WATCH-band commit reading during a 13-chat ultracode session is usually a transient burst peak, not a sustained leak.** 13 xhigh chats each fan out subagents + fire many hooks; when their bursts align, process count spikes near the fork-storm threshold (400) and commit peaks, then drains in 1-3 min. **Re-measure after 2-3 min before chasing anything.**
2. **A clean orphan census (0 dead-parent) is authoritative -- trust it.** The strict ancestry rule is correct: parent-alive young bash is live tool-call churn, NOT a leak. Don't reclassify churn as a leak just because the count is high.
3. **Reaping / WS-trim cannot fix a commit-reservation problem.** Memory-Pressure Auto-Relief trims working sets -> frees physical RAM (already fine at 50%), but commit is pagefile-backed RESERVATION -- WS-trim leaves it unchanged. Triggering it for a commit problem is theater (R12: said so out loud, did not claim it helped commit).

## The only durable levers (all operator-side -- golf cannot do them)
- **Close idle chats.** Slot liveness showed 8 LIVE (sierra/alpha/india/golf/oscar/papa/romeo/xray, hb<=2m) but **charlie idle 170m + tango idle 101m** -- open-but-untouched, each holding ~claude + node-children + 1M context. Those were the precise close-list. (13 claude procs vs 8 LIVE slots -> ~5 idle/unbound.)
- **Disable ultracode / restart chats onto effortLevel:high** (the shipped baseline in settings.json; running sessions keep xhigh until restarted). This is THE structural fix for the burst peaks.

## Standing-goal status this tick (the perpetual /goal)
All reapers + monitors ACTIVE, 0 failing: Fleet Reaper, Fleet Memory Monitor, Memory Pressure Auto-Relief, Hook Janitor, Node Orphan Cleaner, Orphan Process Reaper (PS), Zombie Reaper v2, WSL Memory Guard, Tmp Sweep, MCP Server Watchdog, MCP Connectivity Monitor, MCP Priority Guardian, Cleanup Orchestrator, Task Hardener -- all [Ready] 0x0. Benign non-zero last-results (Ollama Serve 0x1 port-bound, MCP Server 0x800710E0 already-running, Brain Web / SFC batches 0x41301 running) are documented cry-wolfs per [[reference_fleet_task_health_cry_wolf_2026_06_09]]. Census crons alive: 20-min /goal (4899f10e) + 15-min tick (546d0cbe).

Siblings: [[reference_api_ratelimit_wsl_commit_2026_06_08]] (commit-pressure -> local ECONNREFUSED root), [[reference_hybrid_effort_tier_router_2026_06_15]] (ultracode fan-out = the storm; the baseline fix), [[reference_ollama_c_to_h_consolidation_2026_06_16]] (the EARLIER same-day real crisis -- contrast: that was a true sustained CRIT from a 133GB model + pagefile spiral; THIS was a transient peak), [[reference_golf_census_python_orphan_blindspot_2026_06_15]] (census completeness), [[feedback_golf_owns_reaper]].
