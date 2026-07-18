---
name: golf-fsmonitor-daemon-count-2026-06-14
description: "BENIGN baseline (golf census): git.exe count can spike to ~63 across the 26-slot-worktree fleet and it is NOT chat-orphan accumulation -- nearly all are `git fsmonitor--daemon run --detach` processes (one+ per worktree, lightweight, intentionally dead-parented because --detach). Do NOT mass-kill them (a live worktree's daemon just respawns). The fleet-reaper findFsmonitorOrphans hunter owns reaping the truly-abandoned ones (worktree gone). golf's node/bash census classifier does NOT track git.exe -- fold a git-fsmonitor line into the census one-liner to keep direct tabs. True orphan = non-fsmonitor git.exe, dead-parent, age>=120s."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.596Z
aliases: reference_golf_fsmonitor_daemon_count_2026_06_14
---


**Observation (2026-06-14, slot golf, session 02a2de10 -- the perpetual /goal fleet-health loop).** During steady-state monitoring (baseline ~444 procs / 166 images) a census tick jumped to **504-514 procs**. Breakdown by image: `svchost=85, git.exe=63, conhost=40, OpenConsole=23, pwsh=23, firefox=22, node=19, claude=12`. The delta was almost entirely **git.exe (63)** + its conhost children.

**Ancestry analysis (do this BEFORE concluding leftover):** all 63 git.exe were dead-parented, but:
- **0 were true orphans** (non-fsmonitor, dead-parent, age>=120s).
- Nearly all 63 matched `git fsmonitor--daemon run --detach --ipc-threads=8` -- git's **filesystem-monitor daemon**, one(+) per worktree, which speeds up `git status`. It is spawned with `--detach`, so a **dead parent is its NORMAL shape, not an orphan signal**. Transient `git status/add` ops across the 26 slot worktrees also briefly appear as fresh (<120s) dead-parented git.exe during a fleet-wide git burst (e.g. /checkin or git-sync running in many slots).

**Why ~63 for a 26-worktree fleet (~2.4/worktree):** fsmonitor daemons are *meant* to be singleton-per-worktree (they bind an IPC named pipe), but spawn races during heavy concurrent git activity transiently produce duplicates; the losers exit when they can't bind the socket. Count is **stable (not monotonically growing)** and **low-impact** (each daemon is small RSS).

**RULES (golf hygiene):**
1. **Do NOT mass-kill fsmonitor daemons.** Killing a *live* worktree's daemon just makes git respawn it on the next `git status` -- zero benefit, and a kill mid-git-operation can disrupt a peer chat. Ancestry (dead parent) is NOT sufficient to reap an fsmonitor daemon -- it is *supposed* to be detached.
2. **The fleet-reaper's `findFsmonitorOrphans` hunter owns this** (`scripts/lib/fleet-reaper-stuck-hunters.mjs`) -- it reaps fsmonitor daemons whose **worktree is actually gone**, a check ancestry alone can't make. Trust the durable 5-min reaper.
3. **Escalate only if it climbs unbounded** (toward 100+ and growing across reaper cycles) -- THAT would be a real fsmonitor leak (worktree churn faster than reap, or the reaper's fsmonitor hunter failing). At ~63 stable it is "elevated but benign."
4. **Census gap:** golf's counter-5 census one-liner classifies node.exe/bash.exe orphans + search-tool orphans, but **NOT git.exe** -- a git pileup grows unseen at golf's layer (the durable reaper still covers it). Fold a git line into the census: `gitFsmon = git.exe matching 'fsmonitor--daemon'`; `gitTrueOrphan = git.exe NOT fsmonitor AND dead-parent AND age>=120s`. Report `git.exe=N (fsmon=X true-orphan=Y)`. Same blind-spot *class* as the search-tool-orphan gap fixed this session ([[reference_golf_reaper_searchtool_orphan_gap_2026_06_14]]).

## REFINEMENT (2026-06-14, same session, later) -- the DUPLICATE-COHORT failure mode + reaper gap
A later, heavier sustained git episode (multiple chats running large parallel git workflows at once) produced a fsmon count that **held at exactly 62 across many ticks even after bash drained to ~2** -- i.e. it did NOT drain like the earlier 63->2. Definitive breakdown: all 62 were a **single age-cohort 5-15min old** (NOT a rolling-replacement spread), totalRSS=**567MB** (~9.1MB each), **48 dead-parented + aged>=10min** (reaper-eligible by age) yet unreaped. For ~28 repos (26 slot worktrees + main + mirror) that is **~2.2 daemons per worktree = spawn-race DUPLICATES**: under heavy concurrent git, two `git fsmonitor--daemon` race to bind the per-worktree IPC socket; the loser doesn't immediately exit, so each live worktree transiently carries a redundant 2nd daemon.

**The gap:** `findFsmonitorOrphans` reaps only **worktree-GONE** daemons. A redundant DUPLICATE on a **LIVE** worktree is correctly spared by the worktree-exists check -- so duplicates are NOT reaped; they drain only via git's own fsmonitor idle-timeout (slow). Net effect: after a heavy concurrent-git burst the fleet sits at an elevated fsmon plateau (~2x worktree count, here 62) holding several hundred MB for a while.

**Disposition = STILL benign, STILL no-action:** 567MB is 0.4% of 136GB RAM (not pressure); these are git infra, not chat-orphans; they self-drain on idle-timeout; and they CANNOT be safely hand-killed (can't distinguish the redundant daemon from the live socket-holder via process info -- killing the wrong one disrupts a live worktree -> golf rule #1 holds). The earlier "escalate only if climbs unbounded toward 100+ AND growing across cycles" threshold is unchanged -- a stable 62 cohort that self-drains is NOT unbounded growth.

**Reaper-enhancement CANDIDATE (do NOT auto-build mid-/goal -- queue for a golf build cycle):** add a `findDuplicateFsmonitorDaemons` hunter that, per worktree with >1 live fsmonitor daemon, keeps the one holding the IPC socket (or the oldest/socket-bound) and reaps the redundant younger duplicate(s). Requires safely identifying the socket-holder (e.g. via the named-pipe owner) before any kill -- non-trivial, needs design + tests. Until then, idle-timeout handles it.

Siblings: [[reference_golf_reaper_searchtool_orphan_gap_2026_06_14]] (the node/bash/search-tool reaper coverage), [[reference_fleet_reaper_ms2_2026_05_18]] (fsmonitor hunter home), [[reference_golf_mcp_proc_spike_not_pileup_2026_06_14]] (sibling "raw count != pileup; ancestry/age-confirm first" near-miss), [[feedback_golf_owns_reaper]].
