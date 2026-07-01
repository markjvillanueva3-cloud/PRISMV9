# MCP-CONSOLIDATION-MS0/U-MCP-ROLLOUT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-CONSOLIDATION-MS0]/U-MCP-ROLLOUT (slot:alpha 2026-05-28): CWD self-resolution — per-slot filter activates with ZERO env

**Commit:** `86e015906f74` · **By:** markjvillanueva3-cloud · **At:** 2026-05-28T19:10:10-05:00
**Tags:** mcp-consolidation-ms0, u-mcp-rollout, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-CONSOLIDATION-MS0]/U-MCP-ROLLOUT (slot:alpha 2026-05-28): CWD self-resolution — per-slot filter activates with ZERO env

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-CONSOLIDATION-MS0]/U-MCP-ROLLOUT (slot:alpha 2026-05-28): CWD self-resolution — per-slot filter activates with ZERO env

The Tier-1 filter activation, done WITHOUT touching the launcher (regenerate-launch-fleet.mjs
carries 76/23 lines of a peer's uncommitted work — regenerating the .bat would clobber it,
editing+committing would absorb it). Instead the bridge self-resolves its galaxy from its CWD:
a slot chat runs in H:/prism-slot-<name>, so resolveDomainsFromEnv falls back (after env+galaxy)
to slotFromCwd -> SLOT_GALAXY -> GALAXY_DOMAINS. Reliable at bridge startup (cwd fixed when the
chat launches, before /checkin). FAIL-OPEN: shared tree (cwd=H:/prism) or unknown slot -> all 90.

PROVEN: bridge spawned in H:/prism-slot-foxtrot with ZERO env -> 48 tools (compute; calc+session
kept, quoting excluded); shared tree -> 90 (fail-open). 18/18 tests. 2-reviewer per-file PASS.

The premise that Claude Code spawns the bridge with the worktree cwd is UNVERIFIED in production
— so the bridge now LOGS cwd+toolDomains at startup; the first real slot launch confirms it.
PRISM_SLOT_GALAXY env remains the guaranteed backstop.

DEFERRED P1: SLOT_GALAXY duplicates slot-context-bundle-inject.mjs SLOT_GALAXY_MAP (drift risk;
dangerous direction guarded by invariant test). Follow-up: single shared constant or equality test.
```

## Files touched (4)
- .claude/helpers/mcp-http-bridge.mjs       |  5 +++++
- .claude/helpers/mcp-tool-domains.mjs      | 63 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- .claude/helpers/mcp-tool-domains.test.mjs | 42 +++++++++++++++++++++++++++++++++++-------
- 3 files changed, 100 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86e015906f74`
- Milestone envelope: `mcp-server/data/milestones/MCP-CONSOLIDATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._