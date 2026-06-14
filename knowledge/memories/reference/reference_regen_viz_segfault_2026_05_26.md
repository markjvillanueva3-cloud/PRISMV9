---
name: reference_regen_viz_segfault_2026_05_26
description: "scripts/regen-viz.mjs crashes with Win32 access violation (exit 3221225786 = 0xC0000005) at \"generate base graph\" step. Augmentation files write, base graph never updates. PSN-LEG"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.916Z
aliases: reference_regen_viz_segfault_2026_05_26
---


# regen-viz.mjs crashes at "generate base graph" step (2026-05-26, slot:golf /loop iter6)

## Observation
SessionStart banner at the top of this session said:
> ⚠ system-viz regen FAILED (master-index search may be degraded)
> Last run failed at `generate base graph` (exit 3221225786) 1.8h ago. Last success: 63.2h ago.

Exit code `3221225786` = `0xC0000005` = Win32 **access violation**. Node binary segfaulted, not a JS-level error.

## Re-verified this iter
Re-ran `node scripts/regen-viz.mjs` in background. Augmentation steps wrote new files:
- `state/shared/system-viz/engine-domain-inventory-augmentation.json` (537 KB, 12:46:38 PM)
- `state/shared/system-viz/knowledge-inventory-augmentation.json` (40 KB, 12:48:26 PM)
- `state/shared/system-viz/.graph-backstop-spawn.json` (112 B, 12:48:46 PM)

But the main `state/shared/system-viz/system-graph.json` (543 MB) stayed 772 min stale — the base-graph generator crashed AGAIN, augmentations ran on top of stale baseline, backstop spawned (signal that the failure was detected).

Bash bg task reported exit 0 because of `> log 2>&1` redirect framing — the redirect ran successfully even though the actual script segfaulted. The 0-byte log file is the smoking gun (no stdout/stderr captured before the OS killed the process).

## Hypothesis (R7 surface — not chased)
The 543 MB system-graph.json is the likely root cause:
- Most node-graph libraries struggle past ~100 MB of in-memory JSON
- V8 default heap is 4 GB; loading a 543 MB JSON + deserializing into JS objects can easily exceed that with object overhead
- A native binding (likely the graph layout or vector library) is what's crashing — that's the only place a JS process gets a Win32 access violation rather than a "JavaScript heap out of memory"
- Probable culprits: HNSW native binding, native diff/merge library, or canvas/d3-3d native dep

## Operator-actionable mitigations (none chased this iter)
1. Run with `NODE_OPTIONS=--max-old-space-size=8192` to push past default heap
2. Run with `--inspect` and let it crash → V8 minidump → identify the native frame
3. Add a "graph compaction" step before base-graph regen to drop dead/orphan nodes (the 543 MB has accumulated 63+ hrs of cruft)
4. Switch to streaming JSON parser (`stream-json`) for the read step — current code likely does `JSON.parse(readFileSync(...))` on 543 MB at once

## Impact
- PSN-LEG #6 (System Viz) banner stays STALE on every UserPromptSubmit (~150 tokens per prompt × ~hundreds of prompts/day fleet-wide = real noise)
- Master-index search degraded (per the SessionStart banner)
- The `/system-viz` 3D view in the browser is showing 13+ hr stale data
- All ghost-roosts (priority-queue, misc-tasks, bridge-synergy, etc.) that render against this graph are showing stale data

## Why I didn't chase further this iter
- Ctx already at 64% YELLOW; debugging a 543 MB JSON segfault would require reading large files into context
- Per `feedback_autonomous_loop_drift_discipline` — cap anomaly investigation at ≤1 extra tick per /loop
- Per `reference_monitor_persistent_unreliable` doctrine — surface, log, move on
- This is a real bug worth a fresh session with full ctx budget

## Related
- [[feedback_autonomous_loop_drift_discipline]] — applied
- [[reference_monitor_persistent_unreliable]] — same doctrine: scheduled task is durable, in-session investigation is best-effort
- `state/shared/system-viz/.graph-backstop-spawn.json` — backstop file the system writes when regen fails, indicates the failure-detection mechanism IS working
- `scripts/regen-viz.mjs` — entry point that's crashing
- CLAUDE.md §MASTER INDEX — system-viz is the primary search substrate that's degraded
