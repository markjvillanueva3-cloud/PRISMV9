---
name: reference_hook_fork_storm_rootcause_2026_05_16
description: "Root cause of fleet-wide `/bin/bash: xmalloc: cannot allocate 8192 bytes` hook errors — Stop-hook thundering-herd exhausts the Windows system COMMIT limit (not physical RAM) via MSYS bash fork() amplitude. Transient + self-draining. Fix = route T4 hooks through AsyncHookDispatcher + fleet-wide Stop-fork jitter."
source: prism-memory
synced: 2026-05-18T01:02:09.420Z
aliases: reference_hook_fork_storm_rootcause_2026_05_16
---


**Diagnosed 2026-05-16, slot lima (claude-02436db5).** User reported recurring Stop-hook failures: `["...portable-node" .../output-cache-capture.mjs]: /bin/bash: xmalloc: cannot allocate 8192 bytes` (also session-end-peer-share.mjs).

## Root cause (definitive, measured)

**It is virtual-memory / system-commit-limit exhaustion — NOT physical RAM, NOT a leak.** Live census during a spike: bash.exe=**68**, node.exe=**48**, claude.exe=12; **FreePhysicalMemory=21,988 MB (fine)** but **FreeVirtualMemory=108 MB (critical)**. ~2 min later, unforced: bash=**6**, FreeVirtMB=**291** — it self-drained.

Mechanism: 8–12 concurrent fleet chats hitting Stop near-simultaneously each fire a ~30-hook Stop chain. ≈12 × ~30 ≈ **360 near-simultaneous MSYS/Git-Bash `fork()` calls**. MSYS fork is cygwin-style (reserves a large contiguous virtual range per fork) → it consumes the system **commit limit (RAM + pagefile)**, not physical RAM. During the spike window, the *next* bash fork can't commit even 8 KB → `xmalloc: cannot allocate 8192 bytes`. Sub-second hook children exit within ~1–2 min and the spike drains. **Thundering-herd / fork-fan-out contention, transient.** `node-process-janitor --full` produced no output earlier because it was itself fork-starved (deadlock: the problem prevents its own fix) — it completed once initial procs freed commit. PowerShell (native Win32 CreateProcess, no fork) is the resilient tool to diagnose/remediate this exact failure.

## Why these two hooks were the casualties

`output-cache-capture.mjs` and `session-end-peer-share.mjs` are both marked `// tier: T4` (lowest-priority, non-critical, async-eligible) — the EXACT class `AsyncHookDispatcher` (H7, [[reference_h7_async_hook_dispatcher]]) exists to decouple ("Stop returns <50ms, JSONL queue + detached runner"). But they are wired as **synchronous direct forks** in `H:/.claude/settings.json` (lines ~356, ~366: `"command": "\"H:/.claude/bin/portable-node\" .../output-cache-capture.mjs"`), NOT routed through the async dispatcher. So non-critical T4 hooks fork synchronously into the Stop herd and are the unlucky casualties when commit exhausts. **This is the systemic gap.**

## Mitigations already in place

`PRISM Fleet Reaper` Windows scheduled task is INSTALLED + Ready (5-min cadence, FLEET-REAPER-MS0) — bounds orphan accumulation; this is why the storm self-drained rather than wedging. The gap is per-spike *amplitude*, not unbounded growth.

## Recommended optimization (ranked leverage / risk) — NEXT-SESSION UNIT

NOT done this session: a settings.json Stop-chain rewire mid-fork-storm, on a just-recovered memory-pressured host, with 8–12 peers concurrently active, on the single most multi-chat-contended file (settings.json drift is a recurring documented regression) — violates R6/R7 + the COMPREHENSIVE-BUILD "don't half-build" cut-off. Scoped as a proper unit:

1. **Route the T4 Stop hooks through `AsyncHookDispatcher` (highest leverage, medium risk).** They're already tier-tagged T4; the H7 infra exists. This removes N forks from the synchronous Stop herd AND makes them resilient (queued+retried, not failed-and-lost). Enumerate ALL `// tier: T4` hooks in the Stop chain first, then move the set, not just these 2.
2. **Fleet-wide Stop-fork jitter (highest leverage, lowest risk if done at the bundle layer).** A small 0–3 s randomized stagger before the non-critical tail of the Stop chain spreads 360 simultaneous forks across a window. Best implemented in the Stop bundle runner, NOT per-hook in settings.json.
3. **Verify `AsyncHookDispatcher` actually drains under commit pressure** (its detached runner is itself a node spawn — confirm it uses a bounded queue + native spawn, not bash fork, or it has the same failure mode).

Build per COMPREHENSIVE-BUILD: enumerate every T4 Stop hook, real before/after fork-count test, E2E that a simulated 12-chat Stop fan-out stays under a commit-charge budget. Wiki + envelope + the settings.json edit done via the atomic node-write + manual C:→H: mirror pattern (the c-to-h-mirror hook does NOT fire on Bash node-writes — documented gap).

**Verify root cause reproducible:** `Get-CimInstance Win32_OperatingSystem | Select FreeVirtualMemory,FreePhysicalMemory` during a fleet-wide Stop — FreeVirtMB collapses while FreePhysMB stays high. Sister: [[reference_h7_async_hook_dispatcher]], [[reference_fleet_reaper]], [[reference_harness_hang_prevention]].


## Related
[[skills/output-cache-capture|/output-cache-capture]] • [[skills/bin|/bin]] • [[skills/bash|/bash]] • [[skills/remediate|/remediate]] • [[skills/settings|/settings]] • [[skills/portable-node|/portable-node]] • [[skills/after|/after]]