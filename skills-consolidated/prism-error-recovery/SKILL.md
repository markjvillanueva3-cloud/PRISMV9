

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "error", "recovery"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.
- 

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-error-recovery")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-error-recovery") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about error
→ Load skill: skill_content("prism-error-recovery") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires recovery guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Error Recovery Patterns
## Systematic Recovery from Common Failures

> **Priority**: 9/10 — Manufacturing systems MUST recover gracefully. Silent failures kill.

## 1. Recovery Decision Tree

```
Error detected
  ├─ Build failure? → §2 Build Recovery
  ├─ Runtime MCP error? → §3 MCP Recovery
  ├─ File operation failed? → §4 File Recovery
  ├─ Registry data issue? → §5 Registry Recovery
  ├─ Session/state corruption? → §6 Session Recovery
  ├─ Calculation produced NaN/Infinity? → §7 Calc Recovery
  └─ Hook chain failure? → §8 Hook Recovery
```

## 2. Build Recovery

| Symptom | Root Cause | Fix |
|---|---|---|
| OOM during tsc | TypeScript standalone compile | Use `npm run build` (tsc --noEmit + esbuild) |
| "Cannot find module" | Missing .js extension | Add `.js` to ALL import paths |
| "Circular dependency" | Engine A imports Engine B imports Engine A | Use late `require()` or extract shared types |
| "Type X is not assignable" | Interface changed in engine but not schema | Update `prism-schema.ts` types |
| esbuild bundle too large | Unnecessary imports | Check for `import *` patterns, use named imports |
| test:critical fails | Smoke test regression | Read test output, fix the specific assertion |

### Recovery Steps:
1. Read the EXACT error message (don't guess)
2. Search for the error pattern in this table
3. Apply the fix
4. Run `npm run build` to verify
5. If new error type, add to this skill via `prism_doc → append`

## 3. MCP Runtime Recovery

| Symptom | Root Cause | Fix |
|---|---|---|
| "Tool not found" | Dispatcher not registered in index.ts | Add tool registration in index.ts |
| "Unknown action" | Action not in switch statement | Add case to dispatcher |
| Timeout on tool call | Engine hanging (infinite loop or deadlock) | Add timeout wrapper, check for await issues |
| "EPERM" or "EACCES" | File locked by another process | Wait and retry, or restart Claude app |
| JSON parse error in response | Engine returning non-serializable data | Ensure all returns are plain objects |

### General MCP Recovery Protocol:
1. Check Claude Desktop logs: `%APPDATA%\Claude\logs\`
2. Verify MCP server is running: check task manager for node.exe
3. Restart Claude app if server died
4. Re-run `npm run build` if code changed

## 4. File Operation Recovery

| Symptom | Root Cause | Fix |
|---|---|---|
| edit_block "no match found" | Content changed since last read | Re-read file, get exact current content, retry |
| write_file truncated | Content too large for single write | Use append mode in 30-line chunks |
| File appears empty after write | Write path wrong | Verify path, use absolute paths always |
| Anti-regression failure | New file smaller than old | Compare contents, identify what was lost, restore |

### Critical Rule: NEVER overwrite without reading first.
```
READ current → COMPARE with intended → WRITE only if safe → VERIFY after write
```

## 5. Registry Recovery

| Symptom | Root Cause | Fix |
|---|---|---|
| material_get returns empty | Registry not loaded at startup | Check dataLoader.ts initialization |
| "Material not found" for known material | Search index stale | Rebuild search index or use exact ID |
| Duplicate entries | Append without dedup check | Search before adding, use anti-regression |
| Corrupted JSON in registry file | Partial write or encoding issue | Restore from last known good backup |

## 6. Session/State Recovery

| Symptom | Root Cause | Fix |
|---|---|---|
| CURRENT_STATE.json empty | Write failed mid-operation | Use prism_session → state_reconstruct |
| Todo list lost | Compaction ate the context | Use prism_context → todo_read (reads from disk) |
| Session ID mismatch | New session started without proper boot | Run prism_dev → session_boot |
| Checkpoint won't load | State file corrupted | Use prism_session → session_recover |

### Compaction Recovery Protocol:
1. Detect: 30-second gap or mid-session session_boot
2. L1: Read `_context` file if available
3. L2: Read `_COMPACTION_RECOVERY` file
4. L3: Response hijack — dump recovery state into next response
5. Rebuild todo from `todo.md` on disk

## 7. Calculation Recovery

| Symptom | Root Cause | Fix |
|---|---|---|
| NaN in result | Division by zero or missing parameter | Add input validation, check for zero denominators |
| Infinity | Exponential overflow | Clamp values, use bounded calculations |
| Negative cutting force | Parameter sign error | Validate physical bounds (force > 0) |
| Tool life = 0 | Taylor equation breakdown | Check Vc/C ratio, validate n exponent |
| S(x) < 0.70 BLOCKED | Safety violation | Review ALL inputs, identify which parameter triggered |

### Physics Sanity Checks:
- Cutting speed: 1-1000 m/min (typical)
- Feed per tooth: 0.01-2.0 mm
- Depth of cut: 0.1-50 mm
- Cutting force: 10-50000 N
- Power: 0.1-200 kW
- Tool life: 1-999 min

## 8. Hook Chain Recovery

| Symptom | Root Cause | Fix |
|---|---|---|
| Hook blocks unexpectedly | Condition too strict | Review hook logic, adjust thresholds |
| Hook chain infinite loop | Hook A triggers Hook B triggers Hook A | Add chain-depth limit, mark re-entrant |
| Hook not firing | Not registered in hookRegistration.ts | Add registration |
| Hook fires too often | Cadence frequency too high | Adjust call-count trigger |

## 9. Emergency Fallback Sequence

When nothing else works:
1. `prism_session → state_save` (save what you can)
2. Stop current work
3. `npm run build` to verify codebase integrity
4. Restart Claude app
5. `prism_dev → session_boot` (fresh start)
6. `prism_session → session_recover` (recover state)
7. Resume from last checkpoint
