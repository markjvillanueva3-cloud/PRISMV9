# HERMES-BRIDGE-MS0/U-ASK-HERMES-SKILL — [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-ASK-HERMES-SKILL: /ask-hermes slash command -- Hermes access from every Claude Code chat slot

**Commit:** `5f6c5a25bd71` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T14:58:35-05:00
**Tags:** hermes-bridge-ms0, u-ask-hermes-skill, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-ASK-HERMES-SKILL: /ask-hermes slash command -- Hermes access from every Claude Code chat slot

## Body
```
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-ASK-HERMES-SKILL: /ask-hermes slash command -- Hermes access from every Claude Code chat slot

Project .claude/commands/ask-hermes.md (force-added; commands/* is gitignored but 55
are tracked -- matching convention) -> available in EVERY slot. Backed by the live
proxy (scripts/ask-hermes.mjs -> :8645/v1 grok via xai OAuth), free-ollama fallback.
Durable proxy kept up by the 'PRISM Hermes Proxy' scheduled task (State=Ready,
LastResult=0, every 5min+AtStartup). LIVE E2E from the slot path: PRISM_SLOT_HERMES_OK.
```

## Files touched (2)
- .claude/commands/ask-hermes.md | 96 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 96 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5f6c5a25bd71`
- Milestone envelope: `mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._