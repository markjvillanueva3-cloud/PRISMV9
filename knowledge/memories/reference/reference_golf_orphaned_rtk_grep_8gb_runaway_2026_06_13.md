---
name: golf-orphaned-rtk-grep-8gb-runaway-2026-06-13
description: "Fleet sluggishness root cause: orphaned `rtk grep` processes balloon to 8-9 GB each (parent-dead, child grep still buffering) — reap the parent-dead rtk/grep TREE (taskkill /T) to free ~9 GB apiece. CPU-100% under a 13-chat fleet is mostly genuine load (tsserver + active greps), NOT a single reapable runaway."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_orphaned_rtk_grep_8gb_runaway_2026_06_13
---


**Incident (2026-06-13 ~14:10Z, slot golf, session 02a2de10):** operator reported "things getting sluggy." Ground-truth system probe (`Get-CimInstance Win32_OperatingSystem` + `Win32_Processor` + `Win32_Process`) found:
- **RAM was NOT the problem** — 43% used, ~73 GB free of 130 GB. Sluggishness was **CPU pinned at 100%** + a **process explosion** (total procs 880; `bash.exe`=198, `git.exe`=42, `node.exe`=54).
- **Heavy-hitter RAM hogs (the real runaways):** TWO `rtk grep` processes (PID 135152 + 86156) each **8.2 GB and GROWING (4→8 GB in seconds)**. Both `parentAlive=False` (orphaned — the chat/command that launched the grep died) but `childless=False` (each still had a live child `grep.exe` buffering output). cmd e.g. `rtk grep -n "tribal_|playbook_" mcp-server/src/tools/dispatchers/...`. A normal source-tree grep is KB — 8 GB means the **`rtk` proxy leaks/buffers unboundedly when its parent dies mid-grep** (the grep keeps producing output into a pipe nobody drains).

**Root cause = orphaned `rtk grep` mega-runaways.** When a peer chat exits/crashes while an `rtk grep ...` is mid-flight, the rtk+grep tree is orphaned and the rtk buffer balloons to multi-GB, pinning a core. They are **parent-dead orphans but NOT childless** (they own the grep child), so the standard `defunct-childless` reaper criterion SKIPS them — they need a separate **parent-dead-rtk/grep** rule.

**Fix that worked (golf reap):** target `Name -match 'rtk|grep'` with `parentAlive=False`, re-guard the parent is still dead, then **`taskkill /PID <pid> /T /F`** to kill the whole tree (rtk + child grep). Reaping the 2 trees freed **~18.4 GB** (RAM 45%→32%) and dropped procs 880→494. Also reaped **38 orphaned `git fsmonitor--daemon` processes** (all parent-dead+childless, 353 MB) in the same incident — git auto-respawns fsmonitor on demand so these are pure waste; the fleet-reaper's `stuckHunt.fsmonitorReaped` is supposed to catch them but reaped 0 (its criteria are narrower than parent-dead-AND-childless).

**CPU stayed ~100% after the reaps** — because with **13 active claude.exe chats** + multiple `tsserver.js` (2.8 GB each, `parentAlive=True` = live editor IntelliSense, **NEVER reap**) + live peer greps (e.g. an active `grep -rn tribal_ shopPracticeDispatcher.ts`, parent alive = legit, **keep**), 100% CPU is **genuine distributed fleet load, not a single hygiene-reapable runaway**. Golf cannot fix that by reaping — the levers are: fewer concurrent chats, `/compact` the heaviest trees, or fix the upstream rtk-grep-orphan leak. **Honest framing (R12): golf freed the RAM + killed the orphan runaways; the residual CPU is active work.**

**Reusable golf rule:** on "sluggish" reports, probe `Win32_OperatingSystem` (RAM%), `Win32_Processor` (CPU%), top-10 `WorkingSet64`, and process counts FIRST — distinguish RAM-pressure vs CPU-pin vs proc-explosion before acting. Then reap: (1) parent-dead `rtk`/`grep` TREES via taskkill /T (the 8 GB runaways), (2) orphaned `git fsmonitor--daemon`, (3) defunct-childless bash wrappers — but NEVER tsserver (live editor) or parent-alive greps (active work). Siblings: [[golf-parent-dead-count-is-noisy-use-defunct-childless]] · [[reference_fleet_memory_monitor_2026_05_16]] · [[golf-reaper-lastresult-1-is-benign-sweep-acted]].
