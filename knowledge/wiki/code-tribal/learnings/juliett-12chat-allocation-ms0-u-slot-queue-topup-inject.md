# JULIETT-12CHAT-ALLOCATION-MS0/U-SLOT-QUEUE-TOPUP-INJECT — [MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-SLOT-QUEUE-TOPUP-INJECT: inject RGS allocation into live slot task queues

**Commit:** `a308f353d86e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T15:12:14-05:00
**Tags:** juliett-12chat-allocation-ms0, u-slot-queue-topup-inject, auto-distilled

## Subject
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-SLOT-QUEUE-TOPUP-INJECT: inject RGS allocation into live slot task queues

## Body
```
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-SLOT-QUEUE-TOPUP-INJECT: inject RGS allocation into live slot task queues

Work order "build the roadmaps for each chat slot then inject them into their
task queues": built scripts/topup-slot-queues.mjs — non-destructively tops up
starved per-slot queues in state/shared/slot-task-queues.json (the runtime
queue slot-queue.mjs serves to /checkin-<slot> /loop).

For each slot with eligible < --min-depth (default 6), appends units toward
that depth: first the slot's curated RGS allocation, then a priority-queue.mjs
deep-tail fallback when dedup exhausts it. Global case-insensitive dedup (no
unit in two slot queues); golf exempt from the fallback (hygiene slot);
shipped/peer-claimed skipped; atomic write; --dry-run/--no-fallback. Topped-up
entries carry depends_on:[] — the RGS inventory has no dependency data
(0/3197 units), recorded honestly in lastTopup.note.

Applied: 9 starved slots topped up (+33 units), every slot now eligible >=6
(was india/kilo 0, juliett 1). Existing peer allocation untouched.

Per-file 2-reviewer gate: round 1 (A PASS / B FAIL) -> fixed -> round 2
PASS/PASS. 4-surface doc reflection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- CLAUDE.md                                          |   2 +
- .../wiki/architecture/per-slot-rgs-allocation.md   |  33 ++
- scripts/topup-slot-queues.mjs                      | 383 ++++++++++++++++++++
- state/shared/slot-task-queues.json                 | 394 +++++++++++++++++++++
- 4 files changed, 812 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a308f353d86e`
- Milestone envelope: `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._