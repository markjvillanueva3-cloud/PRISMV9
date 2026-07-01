# HOTEL-TRANSCRIPT-MINE/U-MINE-HOTEL-TRANSCRIPTS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-TRANSCRIPT-MINE]/U-MINE-HOTEL-TRANSCRIPTS (slot:hotel): reusable Ollama-powered transcript miner (365MB -> 64KB at $0 Claude tokens)

**Commit:** `bb1640e2f432` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:54:05-05:00
**Tags:** hotel-transcript-mine, u-mine-hotel-transcripts, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-TRANSCRIPT-MINE]/U-MINE-HOTEL-TRANSCRIPTS (slot:hotel): reusable Ollama-powered transcript miner (365MB -> 64KB at $0 Claude tokens)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-TRANSCRIPT-MINE]/U-MINE-HOTEL-TRANSCRIPTS (slot:hotel): reusable Ollama-powered transcript miner (365MB -> 64KB at $0 Claude tokens)

Operator asked to read previous hotel sessions + 'can we use ollama for better efficiency?'.
Answer: yes, decisively. scripts/mine-hotel-transcripts.mjs stream-extracts the conversational
spine from session .jsonl transcripts (readline, never readFileSync -- files exceed V8's string
cap; drops ~90% tool-noise/system-reminders), then map-reduce summarizes via LOCAL Ollama
(gpt-oss:20b default, num_ctx 32768). Per-session output is RESUMABLE (skip-if-exists), so a
host reaper kill loses nothing -- proven when the first run was reaped at ~9/19 and a re-run
completed the rest. Validated on 19 real hotel transcripts (May19-Jun9, 365MB) -> 64KB digest,
~6-80s/session, ZERO Claude tokens for the bulk read; Claude only synthesizes (R5/OLLAMA-EXPAND).

Generalizes to any slot via --since/--model. A Claude-agent Workflow is the WRONG tool here
(agents ARE Claude instances -> cost the tokens we're saving); the script IS the orchestration.

Synthesis findings captured in memory reference_hotel_transcript_mining_3wk_2026_06_09:
hotel slot has heavy off-domain drift (~11/19 sessions non-ERP, via non-domain-filtered RGS
/loop queues); deep ERP genuinely built; shared-tree commit absorption is the chronic velocity
tax (slot-worktree migration never adopted). No tests (standalone CLI utility, no engine/
dispatcher/physics/financial logic); validated by the live 19-transcript run.
```

## Files touched (3)
- scripts/mcp-server-supervisor.mjs | 8 +++++++-
- scripts/mcp-server-watchdog.mjs   | 6 +++++-
- 2 files changed, 12 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- WRONG tool here
- tility, no engine/

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb1640e2f432`
- Milestone envelope: `mcp-server/data/milestones/HOTEL-TRANSCRIPT-MINE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._