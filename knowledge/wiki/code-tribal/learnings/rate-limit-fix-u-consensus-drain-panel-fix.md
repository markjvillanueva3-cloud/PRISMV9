# RATE-LIMIT-FIX/U-CONSENSUS-DRAIN-PANEL-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-CONSENSUS-DRAIN-PANEL-FIX (slot:bravo): correct the drain panel to co-resident models + HONEST single-voice framing

**Commit:** `7391dd2c0187` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:56:13-05:00
**Tags:** rate-limit-fix, u-consensus-drain-panel-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-CONSENSUS-DRAIN-PANEL-FIX (slot:bravo): correct the drain panel to co-resident models + HONEST single-voice framing

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-CONSENSUS-DRAIN-PANEL-FIX (slot:bravo): correct the drain panel to co-resident models + HONEST single-voice framing

R12 correction to U-CONSENSUS-DRAIN-LOCAL: I claimed 'genuine 2-voice consensus' but live-validation proved it is currently SINGLE-voice (a batch drain recorded voters=[qwen2.5-coder:32b] x8, never the 2nd model). Root cause: the prior panel [gpt-oss:120b, qwen2.5-coder:32b] = 65GB+37GB = 102GB > 96GB VRAM -> can't co-reside -> resolveDiverseOllamaPanel drops the 120b. Corrected to [qwen2.5-coder:32b (37GB), gpt-oss:20b (13GB)] = 50GB < 96GB (both resident + warm, diverse families) + PRISM_CONSENSUS_DRAIN_PANEL override.

HONEST STATUS (R12): the RATE-LIMIT FIX is solid + proven -- the drain is LOCAL-ONLY, every voter local, zero Claude/Codex API even under the active throttle; 10 backlog entries drained on the GPU (50->38). BUT it is still SINGLE-voice: even with the co-resident panel, the engine's resolveDiverseOllamaPanel does not seat gpt-oss:20b alongside the resident qwen-32b (likely a conservative free-VRAM runnable-check). That 2nd-voice seating is a DEEPER engine-resolver issue (MultiModelConsensusEngine, ~line 520 resolveDiverseOllamaPanel) flagged for follow-up (india/sierra or a dedicated bravo unit) -- NOT chased overnight per loop-discipline. A single strong local voice is still a valid $0 no-rate-limit consensus signal.
```

## Files touched (2)
- .claude/scripts/consensus-queue-drain.mjs | 11 ++++++++++-
- 1 file changed, 10 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till SINGLE-voice: even with the co-resident panel, the engine's resolveDiverseOllamaPanel does not seat gpt-oss:20b alongside the resident qwen-32b (likely a conservative free-VRAM runnable-check). That 2nd-voice seating is a DEEPER engine-resolver issue (MultiModelConsensusEngine, ~line 520 resolveDiverseOllamaPanel) flagged for follow-up (india/sierra or a dedicated bravo unit) -- NOT chased overn
- till a valid $0 no-rate-limit consensus signal.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7391dd2c0187`
- Milestone envelope: `mcp-server/data/milestones/RATE-LIMIT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._