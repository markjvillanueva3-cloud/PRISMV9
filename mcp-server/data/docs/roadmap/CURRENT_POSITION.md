# CURRENT POSITION
## Updated: 2026-02-20T01:41:00Z

**Phase:** Roadmap v17.0 COMPLETE → R2 Safety next
**Build:** 3.87MB clean, verify-build PASS
**Roadmap:** v17.0 (Claude Code Maximized)

## Roadmap v17.0 Key Architecture
- 3 subagent archetypes: safety-physics (opus), implementer (sonnet), verifier (haiku)
- Agent teams for parallel milestone execution
- Claude Code hooks for automated safety enforcement
- Task DAGs with dependency graphs per milestone
- Binary effort model: STANDARD (sonnet) vs NOVEL (opus)
- Confidence-based escalation to Chat (only when uncertainty >30%)
- MCP in Code eliminates most Chat switches

## Pre-R2 Setup Required
- [ ] Create .claude/agents/ with 3 subagent .md files
- [ ] Create scripts/hooks/ with 5 hook scripts
- [ ] Enable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
- [ ] Create tests/r2/ directory
- [ ] Verify MCP accessible from Code mode

## Next: R2-MS0-T1 (Create 50-Calc Test Matrix)
Start in Code mode. Implementer subagent (sonnet) creates test scaffold.
