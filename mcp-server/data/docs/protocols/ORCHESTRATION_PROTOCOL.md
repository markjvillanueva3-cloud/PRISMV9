# PRISM Orchestration Protocol v1.0

## Overview
This document defines the distributed orchestration protocol for PRISM MCP Server.
It covers multi-agent coordination, distributed locking, and plugin registration.

## Distributed Locking

### Lock Manager
Location: `src/orchestration/DistributedLockManager.ts`

```typescript
import { DistributedLockManager } from "./orchestration/DistributedLockManager.js";

// Acquire lock for resource
const lock = await DistributedLockManager.acquire("roadmap:milestone-5");

try {
  // Perform exclusive operation
  await updateMilestone(5);
} finally {
  // Always release lock
  await lock.release();
}
```

### Lock Pattern: withLock
The preferred pattern for automatic lock release:

```typescript
const result = await DistributedLockManager.withLock(
  "state:CURRENT_STATE.json",
  async () => {
    const state = await loadState();
    state.lastUpdated = new Date().toISOString();
    await saveState(state);
    return state;
  }
);
```

### Lock Timeouts
| Resource Type | Default Timeout | Max Timeout |
|---------------|-----------------|-------------|
| State files | 30s | 60s |
| Roadmap claims | 60s | 300s |
| Build operations | 120s | 600s |
| Orchestration tasks | 30s | 180s |

### Lock Conflict Resolution
- **First-writer-wins**: First agent to acquire lock owns the resource
- **Retry with backoff**: On conflict, retry with exponential backoff
- **Deadlock prevention**: No nested locks on same resource category

```typescript
// Retry pattern with backoff
const maxRetries = 3;
let delay = 100; // ms

for (let i = 0; i < maxRetries; i++) {
  try {
    return await DistributedLockManager.withLock(resource, fn);
  } catch (e) {
    if (e.code === "LOCK_CONFLICT" && i < maxRetries - 1) {
      await sleep(delay);
      delay *= 2;
      continue;
    }
    throw e;
  }
}
```

## Plugin Registration Protocol

### Plugin Lifecycle
1. **Discovery**: Plugins in `src/plugins/` are auto-discovered at startup
2. **Validation**: Plugin manifest validated against schema
3. **Registration**: Plugin registered with orchestration hub
4. **Activation**: Plugin hooks connected to event system

### Plugin Manifest
Every plugin requires a `manifest.json`:

```json
{
  "pluginId": "prism-hypermill-integration",
  "version": "1.0.0",
  "schemaVersion": "2.0.0",
  "name": "HyperMill Integration",
  "description": "Integrates HyperMill CAM with PRISM orchestration",
  "author": "PRISM Team",
  "entryPoint": "./index.ts",
  "capabilities": [
    "cam:toolpath-generation",
    "cam:post-processing",
    "cam:simulation"
  ],
  "dependencies": {
    "prism-core": ">=2.0.0"
  },
  "hooks": {
    "pre-toolpath": "onPreToolpath",
    "post-nc-output": "onPostNcOutput"
  }
}
```

### Registration API
```typescript
import { PluginRegistry } from "./orchestration/PluginRegistry.js";

// Register plugin
await PluginRegistry.register({
  pluginId: "my-plugin",
  version: "1.0.0",
  capabilities: ["custom:feature"],
  handlers: {
    "custom:feature": async (ctx) => {
      // Handle custom feature
      return { success: true };
    }
  }
});

// Check if capability is available
const available = PluginRegistry.hasCapability("custom:feature");

// Execute capability
const result = await PluginRegistry.execute("custom:feature", context);
```

## Multi-Agent Orchestration

### Orchestration Dispatchers
| Dispatcher | Purpose |
|------------|---------|
| `prism_orchestrate` | Multi-agent task distribution |
| `prism_autonomous` | Background task execution |
| `prism_autopilot_d` | Full lifecycle orchestration |
| `prism_atcs` | Async task coordination service |

### Task Distribution
```typescript
// Parallel execution of independent tasks
const results = await orchestrateEngine.swarmParallel({
  tasks: [
    { agent: "validator", action: "validate_schemas" },
    { agent: "analyzer", action: "analyze_performance" },
    { agent: "reporter", action: "generate_report" }
  ],
  timeout_ms: 30000,
  fail_fast: false
});
```

### Roadmap Claim Protocol
For multi-session work on roadmap milestones:

```typescript
// Claim milestone before working
const claim = await orchestrateEngine.roadmapClaim({
  milestone_id: "S1-MS2",
  agent_id: process.env.AGENT_ID,
  estimated_duration_min: 30
});

// Heartbeat during work
setInterval(async () => {
  await orchestrateEngine.roadmapHeartbeat({ claim_id: claim.id });
}, 60000);

// Release when done
await orchestrateEngine.roadmapRelease({ claim_id: claim.id });
```

### Coordination States
| State | Description |
|-------|-------------|
| `IDLE` | No active orchestration |
| `CLAIMED` | Resource claimed by agent |
| `EXECUTING` | Task in progress |
| `WAITING` | Blocked on dependency |
| `COMPLETING` | Finalizing results |
| `RELEASED` | Resource released |

## Event Bus

### Event Types
```typescript
type OrchestrationEvent =
  | "task:started"
  | "task:completed"
  | "task:failed"
  | "lock:acquired"
  | "lock:released"
  | "lock:expired"
  | "plugin:registered"
  | "plugin:activated"
  | "plugin:deactivated"
  | "milestone:claimed"
  | "milestone:released";
```

### Event Handlers
```typescript
import { EventBus } from "./orchestration/EventBus.js";

// Subscribe to events
EventBus.on("task:completed", async (event) => {
  log.info(`Task ${event.taskId} completed by ${event.agentId}`);
  await updateMetrics(event);
});

// Emit events
EventBus.emit("task:started", {
  taskId: "abc123",
  agentId: "orchestrator-1",
  timestamp: Date.now()
});
```

## State Synchronization

### State Files Requiring Locks
| File | Lock Resource ID |
|------|------------------|
| CURRENT_STATE.json | `state:current` |
| HEALTH_CHECK_REPORT.json | `state:health` |
| roadmap-index.json | `roadmap:index` |
| harvest-pipeline-state.json | `pipeline:harvest` |

### Atomic State Updates
```typescript
import { atomicStateUpdate } from "./utils/atomicWrite.js";

await atomicStateUpdate("data/state/CURRENT_STATE.json", (state) => {
  state.lastAction = "milestone_complete";
  state.timestamp = new Date().toISOString();
  return state;
});
```

## Error Handling

### Orchestration Errors
| Error Code | Meaning | Recovery |
|------------|---------|----------|
| `LOCK_CONFLICT` | Resource locked by another agent | Retry with backoff |
| `LOCK_EXPIRED` | Lock timed out | Re-acquire if needed |
| `TASK_TIMEOUT` | Task exceeded timeout | Check task status, retry |
| `PLUGIN_NOT_FOUND` | Unknown plugin ID | Check plugin registration |
| `CAPABILITY_MISSING` | Required capability not available | Install plugin |

### Circuit Breaker
For unreliable external services:

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000
});

const result = await breaker.execute(async () => {
  return await externalService.call();
});
```

## Monitoring

### Orchestration Metrics
- `orchestration_tasks_total`: Total tasks executed
- `orchestration_locks_active`: Current active locks
- `orchestration_lock_wait_seconds`: Lock acquisition wait time
- `orchestration_task_duration_seconds`: Task execution duration
- `orchestration_plugins_registered`: Number of registered plugins

### Health Checks
```typescript
// Orchestration health check
const health = await orchestrateEngine.healthCheck();
// Returns: { locks_active: 2, tasks_pending: 5, plugins_healthy: true }
```

## Implementation Files

| Purpose | File |
|---------|------|
| Lock manager | `src/orchestration/DistributedLockManager.ts` |
| Plugin registry | `src/orchestration/PluginRegistry.ts` |
| Event bus | `src/orchestration/EventBus.ts` |
| Orchestration engine | `src/engines/OrchestrationEngine.ts` |
| Dispatcher | `src/tools/dispatchers/orchestrateDispatcher.ts` |

## Changelog
- 2026-04-12: v1.0 — Initial protocol document
