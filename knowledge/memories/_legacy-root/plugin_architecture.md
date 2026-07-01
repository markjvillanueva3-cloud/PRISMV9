---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/plugin_architecture.md
source_filename: plugin_architecture.md
content_hash: 914e14afd53c69560445363bcd808f4d87bd0534e05c9523d2817b7d8edf7a95
mirror_ts: 2026-05-05T13:00:09.479Z
mirror_engine: ObsidianMemorySyncEngine
---
## Physics Plugin Registry

**File:** `mcp-server/src/engines/PhysicsPluginRegistry.ts`

The 24 physics plugins are managed through a registry that handles:
- Registration/unregistration
- Topological sort of dependencies
- Tier-aware filtering
- Feedback edge tracking for convergence
- Graceful degradation with confidence penalties

### Plugin Interface

Each plugin implements `PhysicsPlugin` with a descriptor:

```typescript
interface PhysicsPluginDescriptor {
  id: string;              // Unique identifier
  level: 1-8;              // Complexity level
  min_tier: 1-4;           // Minimum execution tier
  skip_penalty: 0-1;       // Confidence penalty if skipped
  depends_on: string[];    // Feed-forward dependencies
  feedback_from: string[]; // Cyclical dependencies (convergence)
  outputs: string[];       // Output keys produced
}
```

### Registration

```typescript
import { physicsPluginRegistry } from './PhysicsPluginRegistry.js';

const myPlugin: PhysicsPlugin = {
  descriptor: {
    id: 'my_thermal_model',
    level: 4,
    min_tier: 2,
    skip_penalty: 0.15,
    depends_on: ['base_force_model'],
    feedback_from: ['wear_model'],
    outputs: ['cutting_temperature', 'thermal_expansion'],
  },
  compute: async (state) => { /* ... */ },
  canRun: (state) => state.has_force_data,
};

physicsPluginRegistry.register(myPlugin);
```

### Execution Order

The registry topologically sorts plugins by `depends_on`:

```typescript
const plan = physicsPluginRegistry.getExecutionOrder(availableInputs, tier);
// plan.ordered: plugins in execution order
// plan.skipped: plugins excluded (with reasons)
// plan.total_penalty: confidence loss from skipped plugins
```

### Tier System
- Tier 1: Basic (fast, essential plugins only)
- Tier 2: Standard (most common plugins)
- Tier 3: Advanced (complex physics)
- Tier 4: Full (all plugins, slowest)

Plugins with `min_tier > current_tier` are skipped.

### Dependency Validation

```typescript
const result = physicsPluginRegistry.validateDependencies();
// Checks:
//   - All depends_on references exist
//   - No cycles in depends_on graph
//   - depends_on and feedback_from are disjoint
//   - Output keys are unique
```

## Hook System

**Files:**
- `mcp-server/src/engines/HookExecutor.ts` - Core executor
- `mcp-server/src/hooks/*.ts` - Domain-specific hooks

### Hook Definition

```typescript
const myHook: HookDefinition = {
  id: 'my-safety-check',
  name: 'Safety Limit Validator',
  description: 'Blocks operations exceeding machine limits',
  phase: 'pre-execute',           // When to run
  category: 'safety',             // Grouping
  mode: 'blocking',               // blocking | warning
  priority: 'critical',           // critical | high | normal | low
  enabled: true,
  tags: ['safety', 'limits'],
  handler: (context: HookContext): HookResult => {
    if (context.params.rpm > 15000) {
      return hookBlock(hook, 'RPM exceeds machine limit');
    }
    return hookSuccess(hook, 'Within limits');
  },
};
```

### Hook Phases
- `pre-execute`: Before dispatcher action
- `post-execute`: After dispatcher action
- `pre-swarm-execute`: Before swarm orchestration
- `post-swarm-complete`: After swarm completes
- `on-swarm-consensus`: During consensus voting

### Hook Results

```typescript
hookSuccess(hook, message, metadata?)  // Continue execution
hookWarning(hook, message, metadata?)  // Log warning, continue
hookBlock(hook, message, metadata?)    // STOP execution
```

## Registry System

**File:** `mcp-server/src/registries/manager.ts`

PRISM has 14 registries for different domain objects:
- Materials, tools, machines, strategies
- Formulas, controllers, coolants
- CAM systems, post processors

### Adding to a Registry

```typescript
import { registryManager } from '../registries/manager.js';

const materialRegistry = registryManager.get('materials');
materialRegistry.register('custom-alloy', {
  name: 'Custom Alloy 7075-T6',
  density: 2810,
  tensile_strength: 572,
  kc1_1: 1800,  // Kienzle specific cutting force
  mc: 0.25,     // Kienzle exponent
  // ... other properties
});
```

### Registry Lookup

```typescript
const material = materialRegistry.get('custom-alloy');
const allAluminum = materialRegistry.findByProperty('family', 'aluminum');
```

## Extending PRISM

### Adding a New Engine

1. Create engine in `src/engines/YourEngine.ts`
2. Export singleton: `export const yourEngine = new YourEngine();`
3. Add to `src/engines/index.ts` exports
4. Wire to dispatcher if user-facing

### Adding a New Dispatcher Action

1. Add to dispatcher's z.enum list
2. Add schema in `src/schemas/*ActionSchemas.ts`
3. Add case in dispatcher switch
4. Add tests in `src/__tests__/`

### Adding a New Hook

1. Create hook definition with handler
2. Add to appropriate hooks file (`SafetyHooks.ts`, etc.)
3. Export in hooks array
4. Register in `src/hooks/index.ts`

## Key Patterns

- **Singletons:** Engines export `const fooEngine = new FooEngine()`
- **Lazy loading:** Dispatchers use `await import('../engines/Foo.js')`
- **AtomicValue:** All physics returns include `{ value, unit, uncertainty, source }`
- **Zod validation:** All inputs validated with Zod schemas
- **JSDoc required:** Public methods must have @param and @returns
