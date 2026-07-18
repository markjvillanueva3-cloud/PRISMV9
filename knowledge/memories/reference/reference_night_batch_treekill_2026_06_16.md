---
name: reference_night_batch_treekill_2026_06_16
description: Night-batch cron job ran 13.6h past its 2h timeout — Windows spawnSync blocks on orphaned grandchild pipes; fix = async spawn + live tree-kill
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.663Z
aliases: reference_night_batch_treekill_2026_06_16
---


# Night-batch 13.6h runaway → async tree-kill (slot:zulu, 2026-06-16)

`PRISM Ollama Night Batch` cron returned 0x2; reconstruction (`--status` log) showed
`galaxy-transcript-mine` ran **13.6h (49,150,091ms)** despite a correct `timeoutMs:7200000`
(2h) in the registry — 5.6h past the 06:00 window, burning the Blackwell GPU into the workday.

**Root cause (verified):** `spawnJob` used `spawnSync(file, args, {timeout})`. On Windows the
timeout fires (tail showed `[spawn-error: ETIMEDOUT]`) and kills the **direct** child, but
`spawnSync` then BLOCKS draining the child's stdout/stderr pipes that an orphaned **grandchild**
(the miner's own ollama subprocess, looping on HTTP 503) still holds open. So wall-clock = 13.6h
while the timeout "fired" at 2h. A post-hoc tree-kill is impossible with `spawnSync` (the direct
child is already reaped → its grandchildren are orphaned with no parent link to walk).

**Fix (`925a1dc172` + `U-NIGHT-TREEKILL-TEST-TIGHTEN`):** `spawnJob` is now async —
`child_process.spawn` + a wall-clock `setTimeout` that **tree-kills the whole process tree while
it is still LIVE** (Windows `taskkill /pid <pid> /t /f`; POSIX `detached:true` + `process.kill(-pid)`
group SIGKILL), returning the same `spawnSync`-shaped `{status,error,stdout,stderr}` so `runJobs`
row-capture is unchanged. `runJobs`/`main` now `await` it; the injected `runImpl` test seam survives
because `await` passes a sync return through. A `KILL_GRACE_MS=5000` backstop guarantees the promise
settles even if `'close'` never fires (the hang class itself). Protects all 14 jobs, not just the miner.

**Lessons (reusable):**
- A correct per-child `timeoutMs` does NOT bound a Windows `spawnSync` job whose child spawns a
  grandchild that inherits the stdio pipe — the parent blocks on pipe EOF, not on the timeout.
  Any harness that runs sub-processes which themselves spawn (miners, ollama callers) needs a LIVE
  tree-kill, not `spawnSync({timeout})`.
- An R9 regression-test oracle that relies on a wall-clock threshold must sit **below** any grace
  backstop in the code, or a partial-break (tree-kill broken, grace still fires) silently passes.
  Threshold tightened 10000ms → 3000ms (below the 5000ms grace) so it actually isolates the tree-kill.
- Scheduled-task app exit codes (0x1=most-regens-failed, 0x2=≥1 job failed) are honest fail-loud
  signals, NOT HRESULT launch failures — the task-health watchdog ignores them, so they need a
  human/orchestrator to read the job log to see WHICH sub-work failed.

Companion finding same session: `PRISM Galaxy Synthesis Refresh` 0x1 was a transient (noon run hit
Ollama mid-reload, tripping `failed≥regenerated`); live re-run regenerated 4/6 galaxies clean —
the Obsidian reflection loop is healthy. See [[reference_zulu_ledger_reconciler_2026_06_11]] for the
"hand-curated ledger rots in hours" doctrine that made me VERIFY the 5-day-stale 'blocked' items
(all 5 were already shipped). Related: [[reference_ollama_autonomy_expansion_2026_06_12]],
[[reference_post_ship_ollama-offload-u-night-batch]].
