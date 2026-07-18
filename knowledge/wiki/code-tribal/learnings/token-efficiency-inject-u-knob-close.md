# TOKEN-EFFICIENCY-INJECT/U-KNOB-CLOSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-KNOB-CLOSE (slot:bravo): add disable knobs to the 3 genuinely-knobless context-injectors -> knobless 3 to 0

**Commit:** `f9b65bc35c0a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:43:12-05:00
**Tags:** token-efficiency-inject, u-knob-close, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-KNOB-CLOSE (slot:bravo): add disable knobs to the 3 genuinely-knobless context-injectors -> knobless 3 to 0

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-KNOB-CLOSE (slot:bravo): add disable knobs to the 3 genuinely-knobless context-injectors -> knobless 3 to 0

Closes the loop opened by U-INJECTION-SURFACE-CENSUS: census found the gap,
U-CENSUS-KNOB-ACCURACY corrected the detector (6 false-positive-inflated -> 3
real), and this adds the knobs so every recurring context-emitting injector is
now operator-silenceable.

  - auto-consensus-userprompt:  PRISM_AUTO_CONSENSUS_DISABLE=1   -> writeOutput empty
  - session-reorient-inject:    PRISM_SESSION_REORIENT_DISABLE=1 -> bare continue (top per-prompt consumer, ~2069B)
  - chat-state-isolator:        PRISM_CHAT_STATE_ISOLATOR_SILENT=1 -> drops the context line but KEEPS the load-bearing dir-isolation work (R12: do not break work)

All knobs are opt-in (default behavior byte-identical). LIVE: all 3 silence
correctly; census knob coverage 75.4 -> 78.1 pct, KNOBLESS context-injectors
3 -> 0. 4/4 subprocess tests (positive silence + auto-consensus negative control
proving the knob is load-bearing + chat-state-isolator work-preserved assertion).

Scrutiny via Ollama+self (org bucket rate-limited; R12-noted).
```

## Files touched (5)
- .claude/hooks/__tests__/injection-knob-gates.test.mjs | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/auto-consensus-userprompt.mjs           |  2 ++
- .claude/hooks/chat-state-isolator.mjs                 |  7 +++++++
- .claude/hooks/session-reorient-inject.mjs             |  5 +++++
- 4 files changed, 88 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f9b65bc35c0a`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._