---
name: reference_mcp_fleet_capacity_ms0_2026_06_08
description: "MCP-FLEET-CAPACITY-MS0 (sierra 2026-06-08) — the MCP \"failing\" alarm was a commit-over-commit false-positive, not weak HW. Hook-heap cap is THE fix. Verified HW specs + the 4 changes."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.652Z
aliases: reference_mcp_fleet_capacity_ms0_2026_06_08
---


**MCP-FLEET-CAPACITY-MS0** (slot:sierra, 2026-06-08). Operator: "upgrade MCP to use the new CPU/RAM/GPU/NVMe so the full 26-slot fleet + spawned agents run without failing." Changes are committed in HEAD tree (folded into peer oscar commit `43e1b8e449` by the shared-index race — content safe, attribution muddied; rationale lives here since the commit message didn't land standalone).

## The reframe (R12) — NOT a weak build
The "PRISM MCP Server=failing" alarm was a **FALSE POSITIVE**. The daemon was healthy (`/health` 200, watchdog `consecutiveFails:0`). `fleet-task-health-watch.mjs` flagged the Task Scheduler `LastTaskResult` HRESULT **`0x800710E0` (ERROR_NO_SYSTEM_RESOURCES)** as a launch failure — but that = Windows couldn't *spawn the supervisor task* under commit pressure (210/227GB, 92%), not a crash.

## Verified hardware (live, 2026-06-08)
Ryzen 9 9950X3D2 **16C/32T** · **127.1 GB RAM** (38-54 GB free — healthy) · **RTX PRO 6000 Blackwell 96 GB VRAM (99.9% IDLE)** · NVMe: `H:` = Crucial T710 4TB (1997 GB free, fastest). Pagefile distributed C:4GB + G/J/L:32GB = 100GB (127+100=227GB commit ceiling).

## ROOT CAUSE — commit over-commit, not RAM exhaustion
`portable-node` (the wrapper EVERY hook invokes) set a **blanket `NODE_OPTIONS=--max-old-space-size=4096`**. On Windows `--max-old-space-size` is a COMMIT RESERVATION (counts against the ceiling even unused; unlike Linux lazy mmap). ~84 node procs × 4GB = ~210GB *reserved* commit, only ~7GB *resident*. At ≥96% commit Windows refuses new spawns → false "failing". **Raising heaps would WORSEN it; the fix is to CAP the reservation.**

## The 4 changes
1. **portable-node + .cmd** (live config, outside repo): hook heap **4096→384MB** (`PRISM_HOOK_HEAP_MB` knob). A hook uses ~50-100MB; 384 is generous. Heavy graph hooks use sidecars (verified run clean at 384). Fresh hooks verified reserving 384MB (10.7× cut). **THE root-cause fix.**
2. **mcp-server/src/index.ts:1319**: `maxConnections` 200→**512** (`PRISM_MCP_MAX_CONNECTIONS` env) for 26 slots + agents/workflows. Per-request `buildRequestServer()` already isolates — socket ceiling only. **Loads on next daemon restart** (NOT force-restarted — avoids mid-boot restart storm; latent until then).
3. **fleet-task-health-watch.mjs**: `isTransientPressureCode()` + `pressure` status — `0x800710E0` & siblings (`0x8007000E`/`0x800705AA`/`0x8007012B`) excluded from `isLaunchFailureCode` + `aggregateHealth` severity (benign box-finding, surfaced as info, never escalates). Stops the false alarm. +`KNOWN_PRISM_TASKS` drift-sync (4 installers incl this session's 2 vault crons). 58/58 tests.
4. **OllamaTaskOffloaderEngine.ts**: widened `OFFLOADABLE_PATTERNS` (lint/classify/docstring/diff-summary/triage/extract/describe/rephrase) to push the ~8% offload ratio toward 30% onto the idle 96GB GPU. `KEEP_ON_CLAUDE` checked FIRST (code-gen/refactor/physics/safety stay on Claude). 10/10 previously-missed phrasings now route to GPU. 31/31 tests.

## CONSTRAINT (memory recall [[reference_ollama_cpu_inference_host_thrash_2026_06_02]])
Offload is safe ONLY while Ollama stays **GPU-resident** — CPU-fallback inference at AboveNormal was a prior host-thrash cause. The 32b pin (KEEP_ALIVE=-1, 37GB VRAM) keeps it on GPU.

## Deferred (operator) — FREEZE STILL ON as of 2026-06-08 PM (operator-confirmed)
- MCP daemon restart to load `maxConnections 512` (latent — only matters >200 concurrent; commit fix is the live win). NOT armed — operator confirmed migration freeze still on.
- 2 vault crons (`install-vault-{promotion,rot-sentinel}-cron.ps1`) shipped but unarmed. NOT registered — freeze.
- `PRISM WSL Memory Guard` (charlie's `install-wsl-memory-guard-task.ps1`, vmmemWSL commit-cap relief) shipped but NOT registered on this host — operator chose to keep it surfacing as real `missing` (not auto-defer). Arm it when freeze lifts (it directly relieves the same commit pressure).
- Pagefile relocate to `H:` T710 (page-I/O speed; Phase 1 removed the crash-urgency — C: pagefile is only 4GB).
- 1 pre-existing sibling test red: `ollama-task-offloader.mjs` HOOK classifier (NOT my engine) — separate unit.

## FOLLOW-UP SHIPPED — U-FTH-DEFERRED-PARTITION (commit 3d796dcf5c, 2026-06-08 PM, slot:sierra)
- **Phase-1 cap VALIDATED HOLDING:** live commit re-measured **70.5%** (160/227GB) vs the 92.5% pre-cap — −50GB / −22pts. The 384MB hook cap works; spawn-refusal condition structurally relieved. 30 node procs / 17.85GB resident.
- **Banner noise fixed:** `aggregateHealth` in `fleet-task-health-watch.mjs` now partitions absent KNOWN tasks → real `missing` (warns) vs `EXPECTED_UNREGISTERED_TASKS` (deferred, informational-only, never escalates). The 2 vault crons moved out of `missing`. Mirrors the benign `pressure` pattern. R12-honest (deferral still surfaced everywhere, just de-alarmed). **WHEN FREEZE LIFTS: register the task AND remove its name from `EXPECTED_UNREGISTERED_TASKS` in the same change** so a vanished task re-surfaces as real missing.
- **Drift-sync (live E2E test fail-loud catch):** added `PRISM WSL Memory Guard` to `KNOWN_PRISM_TASKS` + `CRASH_CRITICAL_TASKS` (charlie's task was unwatched; the drift test caught it — that test is doing its job).
- 62/62 tests (4 partition + 1 adversarial present-not-deferred + 1 now-green E2E drift). Per-file 2-arm scrutiny PASS/PASS 0 P0/P1; reviewer-B mutation-tested each new test (R9). Committed STANDALONE this time (atomic stage+commit + `CLAUDE_SESSION_ID` held — no peer-fold).

## DOMINANT COMMITTER = vmmemWSL, NOT node heap (live finding 2026-06-08 PM, slot:sierra)
When operator asked "can we increase that [hook heap] cap?", live `Get-Process | Sort PrivateMemorySize64` proved the hook cap is the WRONG lever — the 90.8% commit spike was TWO non-node committers:
- **vmmemWSL: 95.38 GB committed / 3.22 GB resident** — a 6× balloon over its `.wslconfig memory=16GB` cap. The cap was set (charlie 2026-05-17) but a `wsl --shutdown` to APPLY it never ran. THIS is the dominant committer, by far.
- **llama-server: 44.77 GB / 3.98 GB** — the GPU-resident 32b model (expected, leave it).
- **30 node procs: 13.53 GB committed / 13.56 GB resident** — perfectly tight, ZERO over-commit. The 384MB hook cap is OPTIMAL; raising it adds pressure for no benefit. **Do not raise node heap to relieve commit — it's not the cause.**
SELF-HEAL CONFIRMED: between probes commit dropped 90.8%→51.8% on its own — `autoMemoryReclaim=gradual` (the load-bearing `.wslconfig` knob) bled the WSL balloon back to host once WSL went idle. The 95 GB was transient, not stuck. Operator authorized `wsl --shutdown` (Docker briefly killed, both distros auto-restarted under the cap); ran exit 0, final commit **52.6%** (119/227 GB), 72.9 GB RAM free, Docker recovered (6 procs, Ubuntu+docker-desktop Running), MCP /health 200. Charlie's `PRISM WSL Memory Guard` (`scripts/system-health/27-wsl-memory-guard.mjs`, advise-only, gated on no active docker build) is the durable watchdog for this — now in the fleet-task-health KNOWN+CRASH_CRITICAL set. Lesson: **on commit pressure, sort by PrivateMemorySize64 FIRST — find the real committer before touching any heap cap.**
