# /status — PRISM System Status Check

## Trigger
User asks "status", "health", "what's the state", "how's the build", "system check", or any system health question.

## Protocol — Minimum Tool Calls
1. **Quick status (1 read)**: Read `H:\PRISM\mcp-server\data\quick-ref.json`
   - Returns: engine/dispatcher/action counts, recent commits, branch, commit hash
   - This answers 90% of status questions with ONE tool call.

2. **Build status (1 command)**: Only if asked about build health:
   ```
   cd H:\PRISM\mcp-server && npx tsc --noEmit --pretty false 2>&1 | head -5
   ```

3. **Test status (1 command)**: Only if asked about tests:
   ```
   cd H:\PRISM\mcp-server && npx vitest run --reporter=verbose 2>&1 | tail -20
   ```

4. **Roadmap status (1 read)**: Only if asked about roadmap:
   Read `H:\PRISM\PRISM-UNIFIED-ROADMAP.md` — check Status fields per MP section.

5. **Git status (1 command)**: Only if asked about recent changes:
   ```
   cd H:\PRISM\mcp-server && git log --oneline -10
   ```

## Output Format
```
PRISM: {engines}E/{dispatchers}D/{actions}A | {branch}@{commit} | Build: {pass/fail} | Tests: {count}
```

## DO NOT
- Run full glob/grep scans
- Read MASTER_INDEX.json (945KB — too large)
- Read multiple files when quick-ref.json suffices
