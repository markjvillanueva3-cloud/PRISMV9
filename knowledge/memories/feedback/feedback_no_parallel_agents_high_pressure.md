---
name: no-parallel-agents-high-pressure
description: "When commit-memory pressure is sustained >90%, do NOT dispatch parallel Agent() calls + heavy bash audits + fresh node procs concurrently — fork-storm crashes the chat. Serialize."
aliases: feedback_no_parallel_agents_high_pressure
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.436Z
---


When commit-memory pressure (`fleet-reaper-sweep --status --json | .mem.commitUsedPct`) is sustained >90%, do **NOT** combine these in one turn:

- Multiple parallel `Agent()` dispatches (each spawns a full subagent session — 2-3 concurrent burns ~1GB and forks 5-10 procs)
- Heavy bash audits (full H: drive walks, large `grep -r`, multi-file `find`)
- Fresh `node` invocations for test suites
- Background bash tasks via `run_in_background`

**Why:** Cygwin's process table is finite. Concurrent bash + node procs hit the `xmalloc: cannot allocate 8192 bytes` ceiling. The harness fork-storm cascades. `node-process-janitor` reaps the orphans but the parent `claude.exe` loses child-process handles → chat becomes unresponsive → crash. Documented in [[reference_harness_hang_prevention]] but observed AGAIN on 2026-05-15: chat `claude-b6c4b196` crashed at ~12:32 after dispatching 2 parallel review agents while at 91% commit pressure. 30+ janitor-kill events at 12:32-12:46. Lost session work; commits survived (24 ahead of origin) but the test file P1 additions had to be re-run.

**How to apply:**

1. **Check pressure FIRST** every time you're about to dispatch parallel Agents: `node H:/prism/scripts/fleet-reaper-sweep.mjs --status --json | jq .mem.commitUsedPct`. If >90%, serialize.
2. **Below 90%:** parallel is fine (per-file scrutiny gate explicitly wants 2 reviewers in one message). 
3. **At 90-92%:** serialize Agent dispatch (one at a time), but normal Bash/Read/Edit fine.
4. **Above 92%:** no Agent dispatch at all this turn. Defer the scrutiny review to next turn after some Edit/Read activity drops the pressure. Consider proactive `/precompact`.
5. **Above 95% (the crash zone):** stop all heavy work. Wait for the Layer-3 Ollama hint to absorb some load (5-min window). If still high, /compact.

**Pre-flight pattern (use before any planned parallel dispatch):**
```bash
PRESSURE=$(node H:/prism/scripts/fleet-reaper-sweep.mjs --status --json 2>/dev/null | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).mem.commitUsedPct||0)}catch{console.log(0)}})")
echo "pressure: ${PRESSURE}%"
# branch on the value
```

**Compounding pattern observed:** the [[reference_fleet_reaper_ms1|FLEET-REAPER-MS1]] Layer 3 Ollama pre-warm + aggressive-offload hint took ~5-10 min to absorb pressure back below 90%. During that window any heavy work re-spikes it. Wait for the hint to do its job before launching new heavy operations.

**Related:** [[reference_harness_hang_prevention]] (the foundational fix); [[reference_fleet_reaper_ms1]] (Layer 3 coordinator that did fire correctly but couldn't keep up with the burst); [[feedback_no_schedule_wakeup_in_loop]] (don't multiply pressure with scheduled wakeups either).
