# ALPHA-CONTEXT-RETENTION/U-ALPHA-CLAUDEMD-SLIM — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-CONTEXT-RETENTION]/U-ALPHA-CLAUDEMD-SLIM (slot:alpha): cut the fleet-wide token injection 44% -- CLAUDE.md 167KB->92KB (~21K tokens/agent saved)

**Commit:** `3ea41fc22a67` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T08:46:54-05:00
**Tags:** alpha-context-retention, u-alpha-claudemd-slim, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-CONTEXT-RETENTION]/U-ALPHA-CLAUDEMD-SLIM (slot:alpha): cut the fleet-wide token injection 44% -- CLAUDE.md 167KB->92KB (~21K tokens/agent saved)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-CONTEXT-RETENTION]/U-ALPHA-CLAUDEMD-SLIM (slot:alpha): cut the fleet-wide token injection 44% -- CLAUDE.md 167KB->92KB (~21K tokens/agent saved)

Operator directive 2026-06-11: 'optimize the 200k token injection, make it more efficient.' The project CLAUDE.md is auto-injected into EVERY chat turn AND every subagent prompt fleet-wide; it was 811 lines/167KB, of which 308 were append-only DATED log lines (pure history, zero doctrine) -- a suspected contributor to the subagent 'Prompt is too long' wall that killed the Sonnet-agent fan-out (2.6M tokens, 0 results).

scripts/slim-claude-md-injection.mjs (operator-authorized, writes via node fs): moves (1) the 273-line HEADERLESS stale commit log (no active writer -- regression-auto-write targets only '## Recent regressions') to state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md, and (2) the 20 oldest of 35 '## Recent regressions' entries to RECENT-REGRESSIONS-ARCHIVE.md (keep 15 recent inline). HARD SAFEGUARDS (R12): only DATED log lines ever move (never a ## header/prose); the ## section-header set must be IDENTICAL before/after (fail-loud if any doctrine section would be lost); atomic write + .bak backup.

PERMANENCE: regression-auto-write.mjs now self-trims via capRegressionsSection (keep most-recent PRISM_REGRESSION_CAP=25, overflow OLDEST -> archive, no data loss) so the section can never re-bloat.

VALIDATE LIVE: 167485 -> 93948 bytes (-73537, 43.9%, ~21011 tokens/injection); 7/7 key doctrine sections intact (SCRUTINY GATE/PER-CHAT HANDOFF/ENGINE WIRING/SAFETY/Recent regressions/MCP DISPATCHERS/GOLF SLOT); 15 recent regressions kept; 278+25 lines archived; idempotent re-run = no-op. TEST: regression-auto-write 25/25 (3 new cap tests: under-cap no-op, over-cap keeps-newest-N + OLDEST-overflow + doctrine-preserved + exactly-N-inline, bad-input safe). Fleet-wide: every chat + subagent now injects ~21K fewer tokens. Pairs with [[reference_claude_md_log_bloat_2026_06_11]].
```

## Files touched (7)
- .claude/hooks/regression-auto-write.mjs      |  54 +++++++++++++++-
- .claude/hooks/regression-auto-write.test.mjs |  41 +++++++++++++
- CLAUDE.md                                    | 284 ++-----------------------------------------------------------------------------------
- scripts/slim-claude-md-injection.mjs         | 121 ++++++++++++++++++++++++++++++++++++
- state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md | 278 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/RECENT-REGRESSIONS-ARCHIVE.md   |  25 ++++++++
- 6 files changed, 520 insertions(+), 283 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3ea41fc22a67`
- Milestone envelope: `mcp-server/data/milestones/ALPHA-CONTEXT-RETENTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._