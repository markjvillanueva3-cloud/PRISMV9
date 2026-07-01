# QUOTING-SYNERGY-MS0/U-QP-RUN-ALL-HEAP-GUARD — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-RUN-ALL-HEAP-GUARD (slot:charlie): orchestrator self-raises heap for repeatable full-corpus runs [MAIN-FORCE]

**Commit:** `696920242e8f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T10:10:44-05:00
**Tags:** quoting-synergy-ms0, u-qp-run-all-heap-guard, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-RUN-ALL-HEAP-GUARD (slot:charlie): orchestrator self-raises heap for repeatable full-corpus runs [MAIN-FORCE]

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-RUN-ALL-HEAP-GUARD (slot:charlie): orchestrator self-raises heap for repeatable full-corpus runs [MAIN-FORCE]

Stage-5 in-memory merge OOMs at default heap on 12K+ records (full Orders-Closed run crashed
at default, worked at 16384). main() re-execs once with a generous heap + NODE_OPTIONS
(propagates to extractor child). Knob PRISM_OC_HEAP_MB. Smoke-tested. Streaming-merge queued.
```

## Files touched (2)
- scripts/docustrata-run-all-documents.mjs | 10 ++++++++++
- 1 file changed, 10 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 696920242e8f`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._