---
source: global
section: MULTI-AGENT PATTERNS
slug: multi-agent-patterns
indexed_at: 2026-04-28T00:49:50.586Z
---

## MULTI-AGENT PATTERNS

### For Builds (spawn team)
```
builder + physics-reviewer + test-reviewer + code-reviewer
```

### Available Agents (subagent_type)
`build-doctor` · `catalog-enricher` · `dispatcher-wirer` · `physics-reviewer` · 
`test-runner` · `regression-hunter` · `forge-team` · `pipeline-team` · `test-team`

### Coordination
- Lock: `DistributedLockManager.withLock(resource, fn)`
- Claims: `mcp-server/data/claims/<unit>/claim.json`
- Workboard: `state/shared/AGENT_WORKBOARD.md`
- Chat: `state/shared/AGENT_CHAT.md`

---
