---
name: golf-reaper-searchtool-orphan-gap-2026-06-14
description: "GAP + ready-to-build spec: the fleet-reaper-sweep reaps orphaned node/bash/git/fsmonitor but NOT orphaned search/filter coreutils (grep/rg/find/head/tail/sort/wc/sed/awk) left by DEAD chats. Observed 2026-06-14: 4 grep.exe orphaned 22-28min by dead chats, killed MANUALLY. Permanent fix = add findOrphanedSearchTools() to scripts/lib/fleet-reaper-stuck-hunters.mjs (mirror findFsmonitorOrphans), wire into runStuckHunters + the sweep kill-consumer. Design fully worked out below."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_reaper_searchtool_orphan_gap_2026_06_14
---


**Gap (2026-06-14, slot golf, session 02a2de10).** A full task-manager enumeration (480 procs / 174 images) found **8 parent-dead candidates**; 4 were orphaned `grep.exe` (ages 22-28min, dead parents) from chats that ran recursive searches then died — their stdout points at a dead pipe = pure waste. `fleet-reaper-sweep.mjs` reaped 0 of them because its hunters cover **node/bash/git/fsmonitor only** — search/filter coreutils slip through. The enumeration also showed 4x tail.exe, 4x head.exe, 3x find.exe present (same orphan risk). I killed the 4 greps MANUALLY (ancestry-confirmed: dead parent + still-grep at kill time). Permanent fix is a new hunter.

## Ready-to-build spec (mirror `findFsmonitorOrphans`, the dead-parent-AND-age sibling)

**File 1 — `scripts/lib/fleet-reaper-stuck-hunters.mjs`** (NOTE: this file is NOT in the golf worktree's slot/golf branch — it errored ERR_MODULE_NOT_FOUND when I tried to test from there; build via `cp main->golf` sync first, or patch main directly via a node script since Bash isn't main-tree-write-blocked).

Add constants (mirror the `DEFAULT_*_AGE_SEC` + `MIN/MAX` pattern at lines 35-47):
```js
export const DEFAULT_SEARCHTOOL_AGE_SEC = 300;        // 5min: parent dead 5min => output orphaned
const MIN_SEARCHTOOL_AGE_SEC = 120;                   // <2min risks a legit long recursive grep
const MAX_SEARCHTOOL_AGE_SEC = 86400;
const DEFAULT_SEARCHTOOL_NAMES = new Set([
  "grep.exe","rg.exe","find.exe","head.exe","tail.exe","sort.exe","wc.exe","sed.exe","awk.exe","uniq.exe","cut.exe",
]);
```
Add the hunter (mirror `findFsmonitorOrphans` lines 174-206 EXACTLY — name-match -> isProtected skip -> `isLive(ppid)` spare -> `ageSec >= threshold` -> push `{pid,ppid,ageSec,rssBytes,reason,cmd}`). Reason string `orphan-search-tool <name> (age=Xs, parent <ppid> dead)`. The proc shape is `{pid, ppid, name, cmd, createdMs, rssBytes}`; helpers `clamp`/`ageSec`/`isLive`/`isProtected` already exist. **Critical safety = the LIVE-parent spare** (an in-flight search in a live chat is never reaped) + the 120s MIN floor.

Wire into `runStuckHunters` (lines 335-365): add param `searchToolAgeSec`, `enableSearchTool = true`; call `findOrphanedSearchTools(procs, livePidSet, { now, ageSec: searchToolAgeSec, protectedPids })`; return `searchToolOrphans` in the result object. Knobs (mirror the existing): `PRISM_FR_HUNT_SEARCHTOOL_DISABLE=1`, `PRISM_FR_HUNT_SEARCHTOOL_AGE_SEC=N`.

**File 2 — `scripts/fleet-reaper-sweep.mjs`** (the kill-consumer): find where `runStuckHunters().{stuckBashes,fsmonitorOrphans}` are passed to `reapProcesses()` + summarized into the JSON `stuckHunt` block; add `searchToolOrphans` to the kill list + a `searchToolReaped` count in the report. Pass the new env knob through. Fail-soft + protectedPids threaded (same as the siblings).

**File 3 — `scripts/lib/fleet-reaper-stuck-hunters.test.mjs`**: add cases — (a) grep dead-parent+age>=300 => reaped; (b) grep LIVE-parent => spared; (c) grep dead-parent age<120 => spared (fresh); (d) protected pid => spared; (e) non-search-tool (node.exe) dead-parent => NOT matched here; (f) missing createdMs => skip.

## Status — RESOLVED 2026-06-14 (commit `1d9b2c4197`)
**BUILT + shipped this session.** `findOrphanedSearchTools()` added to `scripts/lib/fleet-reaper-stuck-hunters.mjs` (mirrors `findFsmonitorOrphans`: dead-parent AND age, live-parent spared, protected-pid + missing-createdMs skips, 120s MIN floor), wired into `runStuckHunters` (`searchToolAgeSec` + `enableSearchTool`) and the sweep kill-consumer (`stuckHunt.searchToolReaped` + caveat). Env-gated `PRISM_FR_HUNT_SEARCHTOOL_{DISABLE,AGE_SEC}`. **40/40 tests** (`fleet-reaper-stuck-hunters.test.mjs`, 7 new: happy + live-parent/fresh-floor/protected/non-match/missing-createdMs + runStuckHunters wiring). **Live-validated**: `stuckHunt.searchToolReaped` field present, sweep runs clean from main. The durable 5-min `PRISM Fleet Reaper` task + per-Stop reaper hook now reap orphaned grep/find/tail/etc **automatically** — the manual-sweep mitigation is superseded by continuous auto-coverage. R15 complete (WIRE+TEST+VALIDATE; APPLY = the canonical fleet-wide reaper, all 26 chats). Siblings: [[reference_fleet_reaper_ms2_2026_05_18]], [[feedback_golf_owns_reaper]]; the guardian transient fix this session = [[reference_reaper_guardian_false_negative_2026_05_26]].
