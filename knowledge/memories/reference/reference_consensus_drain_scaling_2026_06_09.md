---
name: reference_consensus_drain_scaling_2026_06_09
description: "consensus-queue-drain reliable at small batches (--max<=3) but FAILS at --max=20 (exit 255): each entry re-loads the 644MB graph via MultiModelConsensusEngine.ask(). Queue grows faster than the Stop-hook --max=3 drains -> structural backlog. Fix: load-graph-once or cap the queue."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.529Z
aliases: reference_consensus_drain_scaling_2026_06_09
---


# Consensus-drain scaling limitation (slot:bravo, 2026-06-09)

## Finding (verified live)
After making the consensus drain local-only (U-CONSENSUS-DRAIN-LOCAL), I tried to clear the 46-48 entry backlog with `--max=20`. It FAILED (exit 255, ~0 useful entries drained) -- but `--max=2` and the default `--max=3` work reliably (clean `{"drained":N}`). 

## Root cause
`consensus-queue-drain.mjs` calls `engine.ask()` per entry, and `MultiModelConsensusEngine.ask()` loads the master-index / system-graph (644MB, logs `system-graph 630.2MB > cap` + falls back to architecture-graph 58MB) on EACH call for context. At `--max=3` the cumulative cost is fine; at `--max=20` it accumulates memory/time and the process dies (OOM or timeout). So the drain does NOT scale to large batches.

## Structural consequence
The auto-consensus hook queues EVERY prompt; the Stop-hook drains 3/Stop -- much slower than the enqueue rate. **CORRECTION 2026-06-10 (R8/R12, read auto-consensus-userprompt.mjs):** the queue is NOT unbounded -- it is already CAPPED at MAX_QUEUE=50 (line 48, env PRISM_CONSENSUS_QUEUE_MAX; HARNESS-AUDIT 2026-05-11 + HS-08 lowered 200->50) and bounds itself on enqueue (lines 169-172: keep most-recent MAX_QUEUE-1 + new). The "was 50 -> back to 48" oscillation IS the cap at work, not unbounded growth. The real behavior is a **capped LOSSY ring**: when the drainer can't keep up, un-drained stale entries are silently DROPPED at the 50-cap before consensus ever runs on them. Draining via repeated small batches is slow + low-value (queued prompts are stale by the time consensus lands; nothing confirmed consumes consensus-queue-processed.jsonl actionably).

## Fix options (future unit, bravo/consensus lane -- NOT done)
1. ~~Load the heavy graph ONCE / pass `prismContext:false`~~ -- **TESTED 2026-06-09, INSUFFICIENT (R12).** Adding `prismContext:false` to the drain's `ask()` did NOT fix `--max=20` (still exit 255). Reverted (a behavior change -- bare-prompt consensus -- that does not achieve its purpose is not worth shipping). So the per-entry cost is NOT (only) the prismContext build; the root cause is deeper -- likely cumulative memory across 20 sequential MultiModelConsensusEngine instantiations/graph-loads, or the wall-clock timeout (20 entries x ~15-20s each x cold-model = >400s). Next attempt must MEASURE which (heap profile vs timing) before another fix.
2. ~~Cap the queue~~ -- **ALREADY IMPLEMENTED (verified 2026-06-10, R8 read-before-write).** auto-consensus-userprompt.mjs:48 MAX_QUEUE=50 + :169-172 already bound on enqueue. Do NOT re-build this. The residual issue is drop-BEFORE-drain (lossy ring), not growth -- if retroactive consensus on dropped prompts ever matters, the fix is raising drain throughput or a priority queue, NOT another cap.
3. **Question whether to queue every prompt at all** -- if nothing consumes the processed output actionably, the whole auto-consensus-on-every-prompt feature is low-ROI per-prompt overhead. Audit the consumer side before optimizing the producer (R8). 

The LOCAL-ONLY fix (no Claude API spend) is solid + the default --max=3 drains fine; this is a SCALING + queue-growth note, not a regression of the core fix.
