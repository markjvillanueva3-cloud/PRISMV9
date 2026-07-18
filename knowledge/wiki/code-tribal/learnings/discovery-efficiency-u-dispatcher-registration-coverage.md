# DISCOVERY-EFFICIENCY/U-DISPATCHER-REGISTRATION-COVERAGE — [MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-DISPATCHER-REGISTRATION-COVERAGE: standing scanner for the loop named task (8/8)

**Commit:** `ee2368d77b4a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T19:21:18-05:00
**Tags:** discovery-efficiency, u-dispatcher-registration-coverage, auto-distilled

## Subject
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-DISPATCHER-REGISTRATION-COVERAGE: standing scanner for the loop named task (8/8)

## Body
```
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-DISPATCHER-REGISTRATION-COVERAGE: standing scanner for the loop named task (8/8)

Formalizes the ad-hoc diff (registerXDispatcher exports vs index.ts calls) that I
ran by hand 3x this session -- now a standing tool catches dormant MCP dispatchers
automatically. Live tree: 101/106 registered (95%), 5 dormant, all classified with
a reason (ZERO blind-register candidates -- the honest answer):
  - cross-lane: prism_cad_automation to delta, prism_cam_function to kilo
  - safety-sensitive: prism_machine, prism_security (operator intent before exposing)
  - intentionally-skipped: prism_ai (registerAIDispatcher) -- index.ts documents the
    skip; prism_ai is owned by registerAIReasoningDispatcher and registering it
    crashes boot.

VALUE PROVEN ON FIRST RUN: it caught registerAIDispatcher, which my earlier manual
grep diff MISSED. Two correctness issues caught by verify-on-disk (R12):
  1. tool-name regex anchored on the bare server receiver missed the
     (server as any) cast form -- false no-tool-name. Fixed: match the tool call
     on any receiver.
  2. naive classification would have flagged registerAIDispatcher as a register
     candidate -- but registering it crashes boot. Added intentionally-skipped
     (driven by index.ts comments, the authoritative record of deliberate skips)
     + superseded (tool-name collision). Conservative bias: a false skip is safe,
     a false candidate is dangerous.

DISTINCT from the /dispatcher-coverage SKILL (engines-per-dispatcher heatmap) which
ASSUMES the dispatcher is registered; this checks the index.ts registration layer it
cannot see. Pure-node. 8/8 node:test incl. cast-form extraction, commented-call
exclusion, all 5 classes, and a real-tree regression oracle. Sibling of
algorithm-dispatcher-coverage.mjs (2e86620392).
```

## Files touched (3)
- scripts/dispatcher-registration-coverage.mjs      | 210 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/dispatcher-registration-coverage.test.mjs | 157 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 367 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ee2368d77b4a`
- Milestone envelope: `mcp-server/data/milestones/DISCOVERY-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._