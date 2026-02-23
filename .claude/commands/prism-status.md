Show current PRISM system status:
1. Read `mcp-server/data/docs/roadmap/CURRENT_POSITION.md` — current phase, build size, test count, dispatcher/engine counts
2. Run `cd mcp-server && node scripts/session_preflight.cjs 2>&1` — health check results
3. Run `git log --oneline -5` — last 5 commits
4. Report: Current phase, build health, test status, recent activity
