# MCP-RELIABILITY/U-MCP-BODY-LIMIT — [MAIN] [MCP-RELIABILITY]/U-MCP-BODY-LIMIT (slot:golf): raise express.json 100KB default -> 50mb env-overridable

**Commit:** `361725ffc2a6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:39:04-05:00
**Tags:** mcp-reliability, u-mcp-body-limit, auto-distilled

## Subject
[MAIN] [MCP-RELIABILITY]/U-MCP-BODY-LIMIT (slot:golf): raise express.json 100KB default -> 50mb env-overridable

## Body
```
[MAIN] [MCP-RELIABILITY]/U-MCP-BODY-LIMIT (slot:golf): raise express.json 100KB default -> 50mb env-overridable

VERIFIED: src/index.ts:981 was `app.use(express.json())` with NO limit -> express's 100KB
default, so the MCP server silently 413s any request body >100KB (large dispatcher inputs /
CAD blobs / batch ingests). Raise to `{ limit: process.env.PRISM_MCP_BODY_LIMIT || "50mb" }`.
Strictly beneficial + reversible: existing <100KB requests unaffected (only LARGER valid
bodies now succeed); PRISM_MCP_BODY_LIMIT tunes the DoS floor. First of #1's MCP-hardening
items -- the only one that needed no operator constant (raising a too-low limit can't break
a valid payload). Standard typed express option (OptionsJson.limit), type-safe by construction.
```

## Files touched (2)
- mcp-server/src/index.ts | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 361725ffc2a6`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._