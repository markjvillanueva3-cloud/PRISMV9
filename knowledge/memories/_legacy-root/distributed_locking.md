---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/distributed_locking.md
source_filename: distributed_locking.md
content_hash: 90478ae08d941b8c93fa8e450b7f7c5291bfe1cffe95dbe0d0a9c2fb08f39fdc
mirror_ts: 2026-05-05T13:00:09.410Z
mirror_engine: ObsidianMemorySyncEngine
---
## Atomic Write Utility

**File:** `mcp-server/src/utils/atomicWrite.ts`

All state file writes MUST use atomic write to prevent corruption.

### API
```typescript
// Async (preferred for most cases)
await atomicWrite(filePath, jsonData);

// Sync (for critical shutdown paths)
safeWriteSync(filePath, jsonData);
```

### How It Works
1. Write to `{file}.{timestamp}.tmp`
2. Rename tmp to target (atomic on most filesystems)
3. If crash mid-write, only .tmp is corrupted
4. Per-file serialization prevents concurrent writes to same file

### Usage Pattern
```typescript
import { atomicWrite } from '../utils/atomicWrite.js';

const state = { lastRun: Date.now(), status: 'complete' };
await atomicWrite('data/state/workflow.json', JSON.stringify(state, null, 2));
```

## Orchestration Patterns

**File:** `mcp-server/src/hooks/OrchestrationHooks.ts`

### Swarm Patterns
| Pattern | Agents | Use Case |
|---------|--------|----------|
| `parallel_extract` | 2-20 | Same input, collect results |
| `ralph_loop` | 2-3 | Generate, critique, refine cycle |
| `pipeline` | 2-10 | Sequential A->B->C with handoffs |
| `map_reduce` | 2-20 | Distribute work, aggregate results |
| `consensus` | 3-5 (odd) | Multiple agents vote, majority wins |
| `specialist_team` | 2-10 | Different agents for subtasks |
| `redundant_verify` | 2-5 | Same task to multiple agents, compare |
| `hierarchical` | 2-20 | Coordinator + workers |

### Orchestration Hooks
- `pre-swarm-pattern-select`: Validate pattern fits task
- `pre-swarm-agent-mix`: Cost-optimize tier distribution
- `post-swarm-result-merge`: Validate merged results quality
- `on-swarm-consensus-vote`: Track and validate voting
- `pre-pipeline-stage-gate`: BLOCKING - quality gate between stages
- `on-swarm-cost-budget`: Track cumulative swarm cost
- `pre-swarm-atcs-bridge`: Validate ATCS->swarm delegation

### Pipeline Stage Gates
Pipelines use blocking quality gates:
- Previous stage must not have errors
- Previous stage must produce non-empty output
- Safety score must be >= 0.70

```typescript
// Stage gate blocks progression if previous stage failed
if (prevStageResult.error || prevStageResult.safety_score < 0.70) {
  return hookBlock(hook, `Pipeline blocked: stage ${n-1} failed`);
}
```

## State File Schema Versioning

**File:** `mcp-server/src/schemas/schemaVersioning.ts`

All JSON state files in `data/state/` require schema versioning.

### Version Format
SemVer: `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking changes requiring migration
- **MINOR:** New optional fields, additive changes
- **PATCH:** Documentation, description updates

### Current Version
- `SCHEMA_VERSION = "2.0.0"`
- `MIN_SUPPORTED_VERSION = "1.0.0"`

### Validation API
```typescript
import { validateSchemaVersion, isVersionSupported } from '../schemas/schemaVersioning.js';

const result = validateSchemaVersion(providedVersion);
// { valid, compatible, requires_migration, message }
```

## File Locking (External)

For cross-process file locking, PRISM uses `proper-lockfile`:

```typescript
import lockfile from 'proper-lockfile';

// Acquire lock
const release = await lockfile.lock(filePath);
try {
  // ... do work ...
} finally {
  await release();
}
```

## Best Practices

1. **Always use atomicWrite** for state files - never raw writeFile
2. **Chain writes per-file** - the utility serializes automatically
3. **Include schemaVersion** in all state JSON files
4. **Use blocking hooks** for safety-critical stage gates
5. **Odd agent counts** for consensus patterns (avoids ties)
6. **Track swarm costs** - budget is $5/session by default
