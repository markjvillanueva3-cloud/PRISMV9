# MCP-RELIABILITY/U-MCP-BLACKWELL-HEAP — [MAIN] [MCP-RELIABILITY]/U-MCP-BLACKWELL-HEAP (slot:golf): raise MCP heap+preempt limits for 136GB hardware -- cut fleet disconnects

**Commit:** `bb1640e2f432` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:54:05-05:00
**Tags:** mcp-reliability, u-mcp-blackwell-heap, auto-distilled

## Subject
[MAIN] [MCP-RELIABILITY]/U-MCP-BLACKWELL-HEAP (slot:golf): raise MCP heap+preempt limits for 136GB hardware -- cut fleet disconnects

## Body
```
[MAIN] [MCP-RELIABILITY]/U-MCP-BLACKWELL-HEAP (slot:golf): raise MCP heap+preempt limits for 136GB hardware -- cut fleet disconnects

Operator: 'improve MCP perf so the chat fleet doesn't disconnect anymore; utilize
new PC hardware to its fullest extent.' Root cause of a top disconnect class: the
limits were sized for the OLD machine.
- supervisor heap floor: 4096MB (4GB) -> 24576MB (24GB), env PRISM_MCP_HEAP_FLOOR_MB.
- watchdog preempt-restart RSS: 3072MB (3GB) -> 18432MB (18GB), env unchanged.

The 4GB heap was a documented band-aid for the error_ledger_recall_similar leak;
the watchdog does an ORDERLY preempt-restart at 3GB to beat the OOM crash. On the
136GB Blackwell, restarting at 3GB (with 80GB+ free) forced needless fleet MCP
disconnects (3rd outage observed this session). New limits keep the orderly design
(preempt 18GB < heap 24GB) but push the restart horizon ~6x out -> ~6x fewer
disconnects, using the RAM the band-aid was sized against. Both env-overridable,
fully reversible. Leak fix still owed separately. Validated: both parse, wd<heap.
Applies on next watchdog cycle + next MCP spawn (no forced restart).
```

## Files touched (3)
- scripts/mcp-server-supervisor.mjs | 8 +++++++-
- scripts/mcp-server-watchdog.mjs   | 6 +++++-
- 2 files changed, 12 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- tilize
- till owed separately. Validated: both parse, wd<heap.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb1640e2f432`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._