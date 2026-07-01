# MCP-CONSOLIDATION-MS0/U-MCP-TOOL-DOMAINS — [MAIN] [MCP-CONSOLIDATION-MS0]/U-MCP-TOOL-DOMAINS (slot:alpha 2026-05-28): Tier-1 domain filter + papa->frontend

**Commit:** `da70187caeeb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-28T18:54:51-05:00
**Tags:** mcp-consolidation-ms0, u-mcp-tool-domains, auto-distilled

## Subject
[MAIN] [MCP-CONSOLIDATION-MS0]/U-MCP-TOOL-DOMAINS (slot:alpha 2026-05-28): Tier-1 domain filter + papa->frontend

## Body
```
[MAIN] [MCP-CONSOLIDATION-MS0]/U-MCP-TOOL-DOMAINS (slot:alpha 2026-05-28): Tier-1 domain filter + papa->frontend

The operator's '4-5 MCP servers split between primary chats' realized as a FILTER on the
one shared :3100 backend (we dropped the per-chat prism_safe monolith in the prior commit),
not N server processes. Each chat sets MCP_TOOL_DOMAINS to narrow tools/list to its galaxy's
dispatchers -> carries ~its-domain tools, not all 90 (context-tax win, zero extra processes/RAM).

NEW: .claude/helpers/mcp-tool-domains.mjs (5-domain map: compute/cognitive/devops/business/
frontend + ALWAYS universal core + galaxy->domains) + .test.mjs (15/15, incl 2 fail-open SAFETY
invariants). EDIT: mcp-http-bridge.mjs filters tools/list at the single response chokepoint,
env-gated + try/catch, FAIL-OPEN by construction. papa re-designated backend-helper->frontend-app
(shares quebec's frontend galaxy) in SLOT_GALAXY_MAP + CHAT-SLOT-DOMAINS.md.

PROVEN LIVE: unfiltered=90 tools (fallback intact), MCP_TOOL_DOMAINS=compute=48 (session/ALWAYS
kept, quoting/ai excluded). NO-OP TODAY: nothing sets the env yet, so resolveDomainsFromEnv()=''
-> filter skipped -> zero behavior change. 3-of-3 PASS (claude-a198ff5f), bridge is sole PRISM
surface so reviewed as SPOF.

DEFERRED (MS0 follow-up units): per-slot MCP_TOOL_DOMAINS rollout in launcher (the activation);
regen papa skill-wrappers (still say backend-helper); pre-existing launcher dirt left for owner.
```

## Files touched (5)
- .claude/helpers/mcp-http-bridge.mjs          |  33 ++++++++++++++++++++++++++
- .claude/helpers/mcp-tool-domains.mjs         | 173 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/mcp-tool-domains.test.mjs    | 126 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/slot-context-bundle-inject.mjs |   2 +-
- 4 files changed, 333 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till say backend-helper); pre-existing launcher dirt left for owner.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show da70187caeeb`
- Milestone envelope: `mcp-server/data/milestones/MCP-CONSOLIDATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._