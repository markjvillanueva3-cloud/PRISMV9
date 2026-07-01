---
name: reference_sierra_sfc_fold_and_regen_in_loop_lesson_2026_06_24
description: "Sierra 2026-06-24: shipped the bounded sfc-variability graph fold (commit 63b150c158 -- 9 structural nodes, 50K cells dropped; verified LANDED in the merged graph). The hard lesson: do NOT run regen-viz manually in a busy 26-chat loop, and NEVER pipe it through `| tail` -- the pipe-break orphaned a regen holding the graph-write lock, cascading into lock-skips + hung orphans + a graph rewritten-but-unstamped. Let the SCHEDULED regen complete the stamp."
type: reference
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.200Z
aliases: reference_sierra_sfc_fold_and_regen_in_loop_lesson_2026_06_24
---


# Sierra: bounded sfc-variability fold SHIPPED + the regen-in-loop lesson (2026-06-24)

## SHIPPED (verified-landed): U-VIZ-SFC-VARIABILITY-BOUNDED-FOLD (commit 63b150c158)
The 45MB / 50,009-node sfc-variability augmentation (8 ghost roosts + 1 machine-type + 50,000 raw
`sfc-cell` matrix cells + 100,007 edges) was DELIBERATELY never wired into the merged graph -- folding
50K cells would ~double the 834MB fleet-critical graph (merge-OOM class). `generate-sfc-variability-summary.mjs`
condenses it to a BOUNDED summary (~3KB): keeps the 9 structural nodes + 7 inter-edges, DROPS the 50K
cells (roost annotated `metadata.cellsAggregated=50000`, never silent). Standard `{newNodes,newEdges}`
shape, folded by the proven `foldRoostAug` (ADD-only, dedup, dangler-drop). Wired FAST[] + merge
loadOptional (both-or-neither; dual-reg auditor 0 gaps). 6/6 tests.
**LIVE-verified at merge level:** after a regen, the merged graph contains `"id":"ghost.sfc-machine-types"`
(grep=1) + `G.meta.sfcVariabilitySummary` (grep=1), and master-index surfaces "SFC Machine Types".
The SFC-variability surface is now graph-queryable (was invisible).

## THE LESSON (regen-viz in a loop session -- generalizable, fleet-wide)
The regen-VERIFY step turned into a multi-attempt spiral. Root causes, all self-inflicted by running
a heavy multi-stage graph op in a contended 26-chat loop:
1. **NEVER pipe regen-viz through `| tail`.** My first run was `node scripts/regen-viz.mjs | tail -25`.
   tail exited early -> broke the pipe -> the exit code (255) was the PIPE failure, not regen -> and
   regen-viz ORPHANED (kept running, hung at 1s CPU, holding the graph-write lock). Always
   `> logfile 2>&1` (file redirect, no pipe). A pipe + a long heavy process = orphan + wrong exit code.
2. **A hung regen holds the cross-process graph-write lock** (`acquireGraphWriteLock`, regen-viz line
   298). While held, every other regen EXIT-SKIPS the merge (exit 4) -- so subsequent regens ran their
   FAST generators (which refresh augmentation FILES, before the lock) then skipped the merge+stamp.
   That is why the augmentation refreshed but the graph never re-stamped. Kill stale/hung regen
   orphans (Stop-Process) before retrying; a dead pid-holder auto-reclaims.
3. **Regens rewrote the graph (merge ran, my fold landed) but crashed/were-interrupted in the
   POST-merge stages before `.last-successful-regen.json` updated** -> the stamp went stale relative
   to the graph mtime. In a busy fleet, the heavy post-merge stages don't reliably complete.
4. **Net: do NOT run manual regen-viz in a loop session.** It is the documented "route heavy graph
   ops AWAY from loop sessions" -- now empirically confirmed (~4 non-completions + orphan churn). The
   SCHEDULED regen (SYSTEM principal, fires when the fleet is quieter) is the right vehicle to complete
   the stamp + post-merge stages. The fold wiring is on disk + committed, so the next scheduled regen
   that completes will fully land it. A dedicated quiesced-fleet session is the place to root-cause WHY
   the post-merge stages don't complete (a real open thread -- needs a logged regen on a quiet fleet).

## Anti-poison/discipline note
Killing the hung orphans (58392, 61460) was correct (R14) -- both were 1s-CPU/7min hung, never loaded
the graph, blocking the lock. The graph stayed queryable + valid throughout (the merge is ADD-only;
the crashes were in post-merge polish, not corruption).

Related: [[reference_sierra_heavy_graph_levers_nongaps_2026_06_24]] ·
[[reference_sierra_resolver_memory_safe_2026_06_24]] · [[windows-commit-reservation-hook-heap]] ·
[[reference_u_regen_viz_merge_faillod_2026_05_17]]
