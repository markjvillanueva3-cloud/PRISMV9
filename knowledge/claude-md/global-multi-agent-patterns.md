---
schema_version: 1.0.0
source: global
section: MULTI-AGENT PATTERNS
slug: multi-agent-patterns
start_line: 93
end_line: 111
indexed_at: 2026-05-05T13:49:55.899Z
content_hash: cae464ec3d34ce55b647977193024ff04ec2f063dbba3534e448d2272a8d78e7
mirror_engine: ClaudeMdChunkerEngine
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
