# RATE-LIMIT-FIX/U-OLLAMA-FANOUT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-OLLAMA-FANOUT (slot:bravo): bounded local-Ollama fan-out -- eliminate the workflow-concurrency rate-limit class

**Commit:** `f022cb4e84dc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:26:00-05:00
**Tags:** rate-limit-fix, u-ollama-fanout, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-OLLAMA-FANOUT (slot:bravo): bounded local-Ollama fan-out -- eliminate the workflow-concurrency rate-limit class

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-OLLAMA-FANOUT (slot:bravo): bounded local-Ollama fan-out -- eliminate the workflow-concurrency rate-limit class

NARROWED DOWN: the recurring 'Server is temporarily limiting requests (not your usage limit)' is Anthropic org-wide throttling from ultracode Workflow fan-outs spawning 5-13 Claude subagents in concurrent bursts across the 26-slot fleet (per reference_fleet_rate_limit_diagnosis + feedback_workflow_concurrency_and_local_routing). NOT the local/host class (host commit healthy at 39%, NIM container down). The synthesis-after-burst agent is the casualty -- 2M tokens burned for null, twice this session.

FIX (the documented elimination, not mitigation): route MECHANICAL fan-out work (grep/audit/summarize/classify) to the local 96GB Blackwell, NOT the Claude API -- no Anthropic rate limit, $0. This is the missing primitive: scripts/lib/ollama-fanout.mjs runs N tasks against local Ollama with BOUNDED concurrency (default 3, gpt-oss:120b), fail-soft per-task, 127.0.0.1 (the IPv6 fix). 10/10 hermetic node:test (bounded-concurrency + fail-soft + 127-not-localhost asserts). LIVE-smoked: 2-task fan-out, peak 2, real answers, 0 Claude load. Reserve Claude subagents for final synthesis/judgment only (R5). FLEET LEVER (operator's call, restart-gated): effortLevel xhigh->high in settings.json removes the always-on auto-fan-out while keeping explicit ultracode.
```

## Files touched (3)
- scripts/lib/ollama-fanout.mjs      | 114 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-fanout.test.mjs | 123 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 237 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f022cb4e84dc`
- Milestone envelope: `mcp-server/data/milestones/RATE-LIMIT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._