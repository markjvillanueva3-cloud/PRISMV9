# PRISM Production Runbook

## Boot Procedure
1. Verify Node.js >= 18 installed: `node --version`
2. Build: `cd C:\PRISM\mcp-server; npm run build`
3. Verify build: `dist/index.js` exists, ~5MB
4. Start: `node dist/index.js` or `scripts/start-production.ps1`
5. Health check: `prism_dev action=health` — expect all registries loaded

## Recovery from Crash
1. Check last error: `prism_guard action=error_capture`
2. Verify data integrity: `prism_validate action=completeness`
3. Rebuild if needed: `npm run build`
4. Restart: `scripts/start-production.ps1`
5. Verify: `prism_session action=health_check`

## Monitoring Checklist
- Memory: Heap < 3GB (warn), < 4GB (critical)
- Response time: P95 < 500ms for safety calcs
- Error rate: < 1% sustained, < 5% burst
- Registry counts: materials > 3000, machines > 800, tools > 1900

## Rollback Procedure
1. Stop current server
2. `git checkout HEAD~1 -- dist/`
3. Restart server
4. Verify R2 regression: `npx vitest run src/__tests__/safetyMatrix.test.ts`
5. If 16/17+ pass → rollback successful

## Backup
- State: `C:\PRISM\state\` — copy before upgrades
- Data: `C:\PRISM\data\` — immutable between releases
- Config: `claude_desktop_config.json` — backup separately

## Incident Response
| Severity | Response Time | Action |
|----------|--------------|--------|
| P1 (safety calc wrong) | Immediate | Stop server, rollback, notify |
| P2 (data missing) | 1 hour | Investigate registry load, fix data |
| P3 (slow response) | 4 hours | Profile, optimize, deploy fix |
| P4 (cosmetic) | Next release | Log issue, fix in sprint |
