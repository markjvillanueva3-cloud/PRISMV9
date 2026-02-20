

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "dev", "patterns"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.
- 

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-dev-patterns")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-dev-patterns") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about dev
→ Load skill: skill_content("prism-dev-patterns") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires patterns guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Development Patterns
## Meta-Skill: How to Develop PRISM Itself

> **Purpose**: Institutional knowledge for Claude on how to add, modify, and maintain PRISM components.
> **Priority**: 10/10 — This skill eliminates the #1 source of wasted time: re-learning architecture every session.

## 1. Architecture Map (Mental Model)

```
User Query → AutoPilot.ts (routing) → Dispatcher (prism_xxx) → Engine (XxxEngine.ts)
                                            ↓                        ↓
                                     autoHookWrapper.ts         registries/*.ts
                                     (pre/post hooks)           (data access)
                                            ↓
                                     cadenceExecutor.ts
                                     (auto-fire side-channel)
```

### Key Files by Role
| Role | File | Purpose |
|---|---|---|
| Entry point | `src/index.ts` | MCP server setup, tool registration |
| Routing | `src/orchestration/AutoPilot.ts` | Parses GSD, routes to dispatchers |
| Dispatchers | `src/tools/dispatchers/*.ts` | Tool interface → engine calls |
| Engines | `src/engines/*.ts` | Business logic, calculations |
| Registries | `src/registries/*.ts` | Data loading, caching, search |
| Hooks | `src/hooks/*.ts` | Pre/post processing, enforcement |
| Hook wiring | `src/hooks/hookRegistration.ts` | All hook registrations at startup |
| Cadence | `src/tools/cadenceExecutor.ts` | Auto-fire functions (todo, pressure, etc.) |
| Auto-hooks | `src/tools/autoHookWrapper.ts` | Wraps dispatcher calls with cadence |
| Types | `src/types/prism-schema.ts` | All TypeScript interfaces |
| Constants | `src/constants.ts` | Paths, limits, configuration |

## 2. How to Add a New Dispatcher

### Step-by-step:
1. **Create dispatcher file**: `src/tools/dispatchers/prism_xxx.ts`
2. **Create engine file**: `src/engines/XxxEngine.ts`
3. **Register in index.ts**: Add to tool list with schema
4. **Add types**: Define interfaces in `src/types/prism-schema.ts` or dedicated type file
5. **Wire hooks**: Add to `src/hooks/hookRegistration.ts` if needed
6. **Update GSD**: Add to decision tree in `data/docs/gsd/GSD_QUICK.md`
7. **Update MASTER_INDEX.md**: Increment dispatcher/action/engine counts

### Dispatcher Template:
```typescript
// src/tools/dispatchers/prism_xxx.ts
import { XxxEngine } from "../../engines/XxxEngine.js";

const engine = new XxxEngine();

export async function handleXxx(action: string, params: Record<string, any>) {
  switch (action) {
    case "action_one": return engine.actionOne(params);
    case "action_two": return engine.actionTwo(params);
    default: return { error: `Unknown action: ${action}` };
  }
}
```

### Engine Template:
```typescript
// src/engines/XxxEngine.ts
import { log } from "../utils/Logger.js";

export class XxxEngine {
  async actionOne(params: Record<string, any>) {
    log("XxxEngine", "actionOne", params);
    // Implementation
    return { success: true, data: {} };
  }
}
```

### Index.ts Registration Pattern:
```typescript
{
  name: "prism_xxx",
  description: "Description. Actions: action_one, action_two",
  inputSchema: {
    type: "object",
    required: ["action"],
    properties: {
      action: { type: "string", enum: ["action_one", "action_two"] },
      params: { type: "object", additionalProperties: {} }
    }
  }
}
```

## 3. How to Add a New Action to Existing Dispatcher

1. **Add case to dispatcher switch**: `src/tools/dispatchers/prism_xxx.ts`
2. **Add method to engine**: `src/engines/XxxEngine.ts`
3. **Add type interface**: For params and return types
4. **Update dispatcher description**: Add action name to the enum AND description string
5. **Wire skill hint**: Add to `SKILL_DOMAIN_MAP` in cadenceExecutor.ts
6. **Test**: `npm run build` (tsc --noEmit + esbuild + test:critical)

## 4. How to Add/Modify Hooks

### Hook Types Available:
- `pre-calc`: Before manufacturing calculations
- `post-calc`: After calculations (modify results)
- `pre-file-write`: Before writing files (anti-regression)
- `post-file-write`: After file writes (verification)
- `pre-output`: Before sending response (blocking gate)
- `post-output`: After response sent
- `error`: On error occurrence
- `outcome`: After successful completion

### Registration Pattern (hookRegistration.ts):
```typescript
hookEngine.registerHook({
  id: "my-hook-id",
  event: "pre-output",
  priority: 50,        // Lower = runs first
  blocking: true,      // Can block output
  handler: async (ctx) => {
    // ctx.output, ctx.action, ctx.params available
    if (someCondition) {
      return { blocked: true, reason: "Safety violation" };
    }
    return { blocked: false };
  }
});
```

## 5. Build System

### Commands:
- `npm run build` — Full build: tsc --noEmit + esbuild + test:critical
- `npm run build:fast` — Skip tests: tsc --noEmit + esbuild only
- **NEVER use `tsc` alone** — causes OOM at scale

### After build:
- gsd_sync auto-fires (updates GSD from source)
- **Restart Claude app** to pick up MCP server changes

### Common Build Failures:
| Error | Fix |
|---|---|
| TypeScript OOM | Already handled by tsc --noEmit + esbuild |
| Missing import .js extension | All imports MUST end in `.js` (ESM requirement) |
| Circular dependency | Use late `require()` or restructure |
| Type mismatch after engine change | Update prism-schema.ts types |

## 6. File Operations Best Practices

### READ → EDIT → VERIFY Pattern:
1. `read_file` or `view` to see current content
2. `edit_block` or `str_replace` to make surgical changes
3. `read_file` to verify the change landed correctly

### NEVER:
- Rewrite entire files from memory (drift risk)
- Use `write_file` mode "rewrite" on large existing files
- Skip anti-regression validation before file replacement

### Append Pattern:
- For files >100 lines, use `write_file` mode "append" in chunks
- Each chunk ≤30 lines for reliability

## 7. State Management

### Key State Files:
| File | Purpose |
|---|---|
| `C:\PRISM\state\CURRENT_STATE.json` | Session state, todo list, progress |
| `C:\PRISM\state\todo.md` | Active task list |
| `C:\PRISM\state\context_pressure.json` | Context window usage tracking |
| `C:\PRISM\state\session_events.jsonl` | Event log |

### Session Boot:
```
prism_dev → session_boot  → Loads state, GSD, key memories, integrity
prism_context → todo_update → Refreshes task list
```

### Session End:
```
prism_session → state_save → Persists all state
prism_doc → write(ACTION_TRACKER.md) → Document progress
prism_context → todo_update → Final task state
```

## 8. Anti-Regression Checklist

Before ANY file modification:
- [ ] Read current file content
- [ ] Compare line counts (new ≥ old)
- [ ] Verify no data loss in registries
- [ ] Check that existing functionality still works
- [ ] Run `npm run build` after changes

## 9. Common Patterns

### Adding a registry entry:
`read_file` → verify current entries → `edit_block` to add → `read_file` to verify count

### Fixing a bug:
`prism_sp → debug` → collect evidence → identify root cause → surgical fix → verify

### Creating a new feature:
`prism_sp → brainstorm` → get approval → `prism_sp → plan` → execute in chunks → validate
