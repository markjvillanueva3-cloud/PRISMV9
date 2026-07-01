---
name: tmp-orphan-leak-janitor-2026-05-30
description: "P0 in juliett's tmp-orphan-janitor: its scan/classify gates used endsWith('.tmp') so the .tmp-<pid> family (the dominant leaker) was SKIPPED. golf fixed the gate + scheduled it --apply."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.222Z
aliases: reference_tmp_orphan_leak_janitor_2026_05_30
---


**The leak (measured 2026-05-30, slot golf):** `state/shared` held **3438 orphaned `.tmp-<pid>` files / 98.6 MB**, growing ~250/hr. PRISM's atomic-write idiom `writeFileSync(`${f}.tmp-${pid}`); renameSync(tmp,f)` orphans the temp when the rename hits EPERM/EBUSY (a peer chat holds `f` open) or the writer node.exe is killed before unlink. Top leakers: `defer-queue.json` (2779) + `mcp-route-suggest-stats.json` (433) — both from `.claude/hooks/mcp-route-suggest.mjs` (alpha) — + `feature-util-counts.json` (214) + the dominant ONGOING one, **`ollama-offload-stats.json`** (~38 every few min under Ollama churn).

**Root cause (the real bug — a P0 in the EXISTING janitor):** juliett's `scripts/tmp-orphan-janitor.mjs` (U-TMPJAN01, merged 2026-05-29) was *supposed* to cover this — its `pidOf()` parses three patterns incl `\.tmp-(\d+)$`. **But its scan gate (`main` line ~104) AND classify gate (line ~60) both used `name.endsWith(".tmp")`** — and `.tmp-<pid>` files end in a DIGIT, not `.tmp`. So the janitor SKIPPED the exact pattern its own `pidOf` was built to parse → 3438 orphans leaked despite the janitor "existing + working" (its ledger showed it only ever scanned the `.tmp` / `.<pid>.tmp` families). Classic "the cleaner had a filter that excluded the mess."

**golf's fix (2026-05-30):**
1. Added `export function isTmpName(name)` = `endsWith(".tmp") || /\.tmp-\d+$/.test(name)`; replaced both `endsWith(".tmp")` gates with it. Now all 3 patterns sweep.
2. Two regression tests (`classify` reclaims `.tmp-<pid>` dead+old; spares it alive; spares it young) — these FAIL against the pre-fix code. Suite **18/18** (juliett's 16 + golf's 2). End-to-end proof: a synthetic dead-pid 40-min-old `.tmp-<pid>` orphan is now reaped.
3. **Scheduling — what U-TMPJAN01 explicitly asked golf to do** ("Recurrence: recommend golf schedule --apply"): registered user-context task **`PRISM Tmp Sweep`** → `node scripts/tmp-orphan-janitor.mjs --apply` every 10 min (`State=Ready`). Reverse: `Unregister-ScheduledTask -TaskName 'PRISM Tmp Sweep'`. juliett's 30-min min-age default is respected (fast-churning small tmps reaped once >30 min, ~125 present at steady state — bounded).
4. Manual sweep this session: 3435 files / 98.5 MB reclaimed.

**DEDUP LESSON (golf's miss):** golf first BUILT a parallel `sweep-orphan-tmps.mjs` + test before the pre-write graph surfaced juliett's existing janitor — a duplication-guard violation (should check the graph / `/dedup` BEFORE writing, not after). On discovery: deleted the duplicate, deferred to juliett's canonical file, and fixed ITS bug instead. R7 — one canonical asset, fix it; never maintain two. See [[reference_juliett_tmp_janitor_2026_05_29]], [[reference_juliett_tmp_orphan_leak_2026_05_29]].

**Root-cause follow-up (hand to alpha — owns the writers):** the dominant ongoing leaker `ollama-offload-stats.json` writer should retry `renameSync` with backoff + sweep its own stale `.tmp-*` pre-write. Until then the janitor task is the net. Related: [[reference_fleet_reaper]] (process analog), [[feedback_golf_owns_reaper]].
