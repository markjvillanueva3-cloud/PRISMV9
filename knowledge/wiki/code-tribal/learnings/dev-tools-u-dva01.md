# DEV-TOOLS/U-DVA01 — [MAIN] [DEV-TOOLS]/U-DVA01: declared-vs-actual substrate-health + forge7/audit-v2 wiring

**Commit:** `aad2152f7f30` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T21:51:15-05:00
**Tags:** dev-tools, u-dva01, auto-distilled

## Subject
[MAIN] [DEV-TOOLS]/U-DVA01: declared-vs-actual substrate-health + forge7/audit-v2 wiring

## Body
```
[MAIN] [DEV-TOOLS]/U-DVA01: declared-vs-actual substrate-health + forge7/audit-v2 wiring

Substrate-health measurement tool that detects drift between what PRISM
settings DECLARE and what the system ACTUALLY configures. Designed against
today's 2026-05-19 bug class where enabledMcpjsonServers listed a typo'd
"prism-mcp-server" while .mcp.json declared "prism" + "prism_safe" — the
trust-dialog implicit-allow masked the drift for weeks.

Files:
- scripts/declared-vs-actual.mjs (new) — pure core + injected readers;
  schema-versioned JSON output; exit codes 0/1/2; cross-platform.
- scripts/declared-vs-actual.test.mjs (new) — 53 hermetic node:test cases
  including a REGRESSION GUARD test that pins today's actual bug class
  (will fail if dormant_declared_not_configured detection regresses) +
  3 CLI subprocess tests exercising the unknown-flag fail-loud and
  exitAfterDrain Windows-pipe drain.
- .claude/settings.json — enabledMcpjsonServers corrected: was
  ["prism-mcp-server","claude-flow"] (typo missing prism_safe entirely);
  now ["prism","prism_safe","claude-flow"]. Same fix landed at user-global
  earlier this session via the c-to-h-mirror hook.

Skill wiring (out-of-repo, in H:/.claude/commands/):
- forge7 §Phase 0.2 (NEW): HARD BLOCK gate runs declared-vs-actual at
  preflight, blocks forge7 if blocking_count > 0. Cross-platform (script
  exit code drives gate — no /tmp, no shell-specific parsing).
- forge-audit-v2 §6A: dormancy-ranker requirement (META artifact MUST
  rank declared-vs-loaded delta when scope covers MCP/settings/env/
  hooks/tasks); enforced as Hard Rule #8 + anti-pattern.

Discipline gates:
- Per-file scrutiny on script: 2 reviewers x 2 rounds (FAIL P0+3xP1 ->
  fix -> PASS); per-file scrutiny on tests: 2 reviewers, PASS with P1
  hardening fixed in-loop; per-file scrutiny on both skill patches:
  4 reviewers x 2 rounds (FAIL on POSIX-only /tmp + ungated MUST ->
  fix -> PASS).
- 47/47 -> 50/50 -> 53/53 tests green across iterations.
```

## Files touched (7)
- .../hooks/__tests__/active-chat-priority.test.mjs  | 201 ++++++++++++++++
- .claude/hooks/active-chat-priority-boost.mjs       | 155 +++++++++++++
- .claude/hooks/active-chat-priority-decay.mjs       | 131 +++++++++++
- .claude/settings.json                              |  14 +-
- scripts/__tests__/claude-tree-priority.test.mjs    | 254 +++++++++++++++++++++
- scripts/wire-active-chat-priority-hooks.mjs        |  76 ++++++
- 6 files changed, 827 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aad2152f7f30`
- Milestone envelope: `mcp-server/data/milestones/DEV-TOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._