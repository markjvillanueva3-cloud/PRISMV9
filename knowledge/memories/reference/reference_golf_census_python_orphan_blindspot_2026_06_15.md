---
name: golf-census-python-orphan-blindspot-2026-06-15
description: "FLEET-HYGIENE/golf finding (2026-06-15): golf's ROUTINE per-tick census ($searchOrph + $nodeOrph + $gitOrph) scans grep/rg/find/head/tail/sort/wc/sed/awk/uniq/cut + node.exe + bash.exe + git.exe for dead-parent orphans -- but NEVER python.exe. A /goal-mandated COMPREHENSIVE pass (Stop hook demanded 'analyze every single task') found a 51.8h-old dead-parent python.exe orphan (pid 127796) invisible to every routine census this session. Reaped (dead-parent confirmed + extreme age + no durable signature). FIX: add python.exe (age>=600, dead-parent, exclude live-parent venv/training/ollama) to the standard census orphan set. LESSON: capture CommandLine BEFORE Stop-Process so the report can NAME the killed script (R12 -- pid 127796's script could not be named). Protected entities were never at risk: llama-server.exe is a separate exe (Ollama Serve task Running), the Blackwell LoRA job is parent-ALIVE (this was parent-DEAD)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.595Z
aliases: reference_golf_census_python_orphan_blindspot_2026_06_15
---


**Finding (golf, 2026-06-15).** The perpetual `/goal` fleet-health Stop hook correctly rejected a single summary-count census as insufficient ("analyze every single task in task manager... tasks clearly leftover from a chat"). The comprehensive pass it forced surfaced a real leftover the routine loop had been blind to all session.

## The blind spot
golf's routine per-tick census builds three orphan sets:
- `$searchOrph` -- grep/rg/find/head/tail/sort/wc/sed/awk/uniq/cut, dead-parent, age>=300s
- `$nodeOrph` -- node.exe + bash.exe, dead-parent, age>=600s, minus durables (`master-index-daemon|obsidian|git-sync|consolidate-graph|mcp-server|dist[\\/]index`)
- `$gitOrph` -- git.exe (non-fsmonitor), dead-parent, age>=120s

**`python.exe` is in NONE of them.** Every routine census this session reported `orphans 0/0/0` truthfully -- but the 0s only covered node/bash/git/search-tools. A dead-parent python could sit forever uncounted.

## What the comprehensive hunt found
Exhaustive dead-parent scan across ALL categories (added python.exe) found 5 dead-parent procs:
- KEEP node.exe#38976 (41.8h, master-index/obsidian daemon -- durable)
- KEEP node.exe#86748 (2h, MCP server, port-3100 owner -- durable, orphaned-by-design per [[reference_mcp_daemon_orphaned_by_design_2026_06_15]])
- KEEP git.exe#23068 + git.exe#8012 (fsmonitor daemons)
- **REAPED python.exe#127796, age 51.8h, dead parent, no durable signature** -- textbook chat-leftover.

Ancestry was confirmed (parent dead) before reap -> satisfies golf refuse-list item `reaping-a-process-without-ancestry-confirmation`. Not a protected entity: `llama-server.exe` is a separate exe (Ollama Serve scheduled task = Running); the Blackwell LoRA training job is parent-ALIVE (never-reap) whereas this was parent-DEAD. A 51.8h dead-parent python with no PRISM-durable cmdline pattern is the exact "leftover from a dead chat" the /goal targets.

## FIX (fold into the standing census)
1. Add a `$pyOrph` set to the routine census: `python.exe`/`py.exe`, dead-parent, age>=600s, EXCLUDING live-parent venv/training/ollama python (a parent-alive python is legit work -- the LoRA job, an Ollama embed worker, a detached learning-revival). Only dead-parent + aged python is a leftover.
2. **Capture CommandLine BEFORE Stop-Process.** I reaped pid 127796 before logging its cmdline, so I could not name the script (R12 honesty gap). Going forward: read `$p.CommandLine` into the kill-log entry first, then kill, so the report names exactly what was reaped.

## Why it matters
"orphans 0/0/0" was a TRUE statement about an INCOMPLETE scan -- the shallow-search failure mode applied to a process census. The /goal's "analyze EVERY single task" is precisely the corrective: a periodic comprehensive pass (all 72 scheduled tasks + full process table incl. python) catches what the fast per-tick loop structurally cannot. Run the comprehensive pass on a slower cadence between the fast node/bash/git censuses.

Siblings: [[reference_mcp_daemon_orphaned_by_design_2026_06_15]] (don't-reap-by-design counterpart), [[feedback_golf_owns_reaper]], [[feedback_never_claim_absence_without_deep_search]] (the parent doctrine -- a count is only as deep as the scan behind it).
