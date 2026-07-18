---
name: autonomous-loop-drift-discipline
description: "In an autonomous /loop, a verification that uncovers an anomaly can swallow N iterations; cap the investigation budget per tick, record the finding, move on."
aliases: feedback_autonomous_loop_drift_discipline
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.399Z
---


In a fixed-interval `/loop` (e.g. `[5m] continue high value wiki`), each cron fire is a bounded tick. A tick should produce its deliverable or honestly report no-deliverable — not become a multi-iteration investigation.

**The trap:** a tick begins as a routine check (e.g. "verify the last iteration's output reached the consumer"), uncovers an anomaly (the output is *not* in the index), and starts diagnosing the anomaly. Diagnosis is open-ended: run a tool, observe, hypothesize, test, repeat. One iteration becomes two, then three. The original cron purpose ("continue high value wiki") goes unfulfilled while the chat chases a side branch. This happened 2026-05-18 lima `/loop` — three iterations consumed investigating why `build-wiki-leaf-index.mjs` no-op'd on a memory-pressured host before catching the drift and recording the finding.

**Why:** in interactive work a multi-hour investigation is fine — the user is present and you can update them. In a 5-min autonomous loop, a multi-iteration investigation produces no visible output, blocks the loop's stated purpose, and is invisible to the absent user. Karpathy R10 (checkpoint each iteration) + the anti-drift question ("am I still on the user's goal or did I wander?") apply with extra force.

**How to apply:**
1. **One iteration is the investigation budget**, by default. If a tick discovers an anomaly, allow up to ONE additional iteration to root-cause it. After that, *stop*.
2. **When you stop, record durably** — a `reference_*` memory + MEMORY.md pointer is the right artifact (auto-feeds Obsidian; survives across sessions). The recording IS the deliverable for that tick.
3. **Then return to the loop's stated purpose** the next tick — don't keep reopening the closed investigation.
4. **Tell-tale you've drifted:** you're three iterations in, the output of those iterations is "checked things and found more questions," and the cron purpose hasn't advanced. That's the moment to stop, write the memory, move on.

Related: [[karpathy-12-rule-discipline]] (R10), the recorded [[wiki-recall-index-stale-2026-05-18]] is the artifact from the drift this rule names.
