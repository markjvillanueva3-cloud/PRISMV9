# OBSIDIAN-AI-SYNERGY/U-OLLAMA-KEEPALIVE-FIX — [MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-KEEPALIVE-FIX (slot:india): ask-ollama keep_alive 10m -> OLLAMA_KEEP_ALIVE||30m

**Commit:** `e5f29a5df526` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T09:19:34-05:00
**Tags:** obsidian-ai-synergy, u-ollama-keepalive-fix, auto-distilled

## Subject
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-KEEPALIVE-FIX (slot:india): ask-ollama keep_alive 10m -> OLLAMA_KEEP_ALIVE||30m

## Body
```
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-KEEPALIVE-FIX (slot:india): ask-ollama keep_alive 10m -> OLLAMA_KEEP_ALIVE||30m

P1 from state/shared/specs/OLLAMA-FLEET-AUDIT-2026-06-11.md. ask-ollama.mjs:72 hardcoded
keep_alive='10m' which is sent per-/api/generate-call and OVERRODE the operator's 30m
server default down to 1/3 warm-hold (more cold-loads -> more of the timeout failures the
audit found). Now reads OLLAMA_KEEP_ALIVE with a 30m fallback (the operator's Blackwell
96GB intent). Finding: interactive shells carry a STALE OLLAMA_KEEP_ALIVE=10m while the
live server env is 30m -- env is not uniformly propagated (infra-hygiene note for golf).
Surgical, zero-behavioral-risk; node --check clean.
```

## Files touched (2)
- scripts/ask-ollama.mjs | 6 ++++--
- 1 file changed, 4 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e5f29a5df526`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._