# MCP-RELIABILITY/U-MCP-FATAL-REJECTIONS-OPTIN — [MAIN] [MCP-RELIABILITY]/U-MCP-FATAL-REJECTIONS-OPTIN (slot:golf): opt-in fail-loud on unhandledRejection

**Commit:** `73d6fa49eaae` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:59:18-05:00
**Tags:** mcp-reliability, u-mcp-fatal-rejections-optin, auto-distilled

## Subject
[MAIN] [MCP-RELIABILITY]/U-MCP-FATAL-REJECTIONS-OPTIN (slot:golf): opt-in fail-loud on unhandledRejection

## Body
```
[MAIN] [MCP-RELIABILITY]/U-MCP-FATAL-REJECTIONS-OPTIN (slot:golf): opt-in fail-loud on unhandledRejection

#1 synthesis item (operator-decision -> shipped as opt-in default-off): the unhandledRejection
handler only logged (unlike uncaughtException which gracefulShutdown's). Add an OPT-IN fatal
path gated by PRISM_MCP_FATAL_REJECTIONS=1 -> gracefulShutdown + supervisor restart. Default
OFF = byte-identical to prior behavior. Pairs with U-MCP-HARDEN's transport try/catch.
```

## Files touched (2)
- mcp-server/src/index.ts | 7 +++++++
- 1 file changed, 7 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 73d6fa49eaae`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._