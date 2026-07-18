---
name: prism-dev-guide
description: |
  Unified PRISM development guide: utilities, dispatcher development, module building,
  skill deployment, and document management. Complete developer workflow reference.
  Consolidates: dev-utilities, dispatcher-dev, document-management, module-builder, skill-deployer.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "dev", "guide", "unified", "development", "utilities", "dispatcher", "module"
- Safety validation required, collision risk assessment, or safe parameter verification needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-dev-guide")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_safety→[relevant_check] for safety validation
   - prism_skill_script→skill_content(id="prism-dev-guide") for safety reference
   - prism_validate→safety for S(x)≥0.70 gate

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Safety criteria, validation rules, and threshold values
- **Failure**: S(x)<0.70 → operation BLOCKED, must resolve before proceeding

### Examples
**Example 1**: Pre-operation safety check needed
→ Load skill → Run safety criteria against current parameters → Return S(x) score → BLOCK if <0.70

**Example 2**: User overriding recommended limits
→ Load skill → Flag risk factors → Require explicit acknowledgment → Log override decision

# PRISM Development Guide
## Plan → Build → Test → Deploy → Document

## Developer Workflow Overview
```
1. PLAN: Define scope, identify dispatcher/module/skill target
2. BUILD: Use module-builder patterns, follow coding standards
3. TEST: TDD (prism-validation-unified), safety checks
4. DEPLOY: Skill deployer auto-pushes to /mnt/skills/user/
5. DOCUMENT: Update ACTION_TRACKER, state, roadmap via MCP-native tools
```

## 1. DEVELOPMENT UTILITIES

### Session Protocols
- **Boot:** `prism_dev→session_boot` loads state, GSD, key memories, integrity
- **End:** `prism_session→state_save` + `prism_doc→write(ACTION_TRACKER.md)` + `prism_context→todo_update`
- **Mid-session:** Checkpoint every 10 calls via `prism_session→auto_checkpoint`

### Extraction Patterns
When extracting modules from monoliths:
1. Identify module boundaries (single responsibility)
2. Map dependencies (imports, shared state)
3. Extract with interface preservation
4. Verify anti-regression: `new_count ≥ old_count`
5. Update consumer imports

### Auditing
- Count functions, lines, exports before/after changes
- Verify no functionality lost during refactors
- Use `prism_guard→pre_write_diff` before file modifications

### Utilization Checks
- Verify all dispatchers are reachable from routing
- Check for dead actions (registered but never called)
- Monitor via `prism_telemetry→get_dashboard`

## 2. DISPATCHER DEVELOPMENT

### 31-Dispatcher Architecture
Dispatchers route to engines. Each dispatcher owns a domain.
```
index.ts → registerDispatchers() → each dispatcher.ts
  └── handles actions via switch/case
      └── calls engine functions
          └── returns structured results
```

### Creating a New Dispatcher
1. Create `src/dispatchers/myDispatcher.ts`
2. Implement `handleAction(action: string, params: Record<string, any>)`
3. Register in `src/dispatchers/index.ts` → `DISPATCHER_MAP`
4. Add to `KNOWN_RENAMES` if replacing an existing dispatcher
5. Update MASTER_INDEX.md with new action count
6. Build: `npm run build` (tsc --noEmit + esbuild + test:critical)
7. Restart Claude app (gsd_sync auto-fires after build)

### Adding Actions to Existing Dispatcher
1. Add case in dispatcher's `handleAction` switch
2. Implement handler function
3. Update dispatcher description in tool registration
4. Update MASTER_INDEX.md action count
5. Build and test

### Debugging Dispatcher Routing
- Check `KNOWN_RENAMES` map for renamed dispatchers
- Verify action exists in dispatcher's switch/case
- Check `prism_telemetry→get_detail` for routing failures
- Use `prism_guard→pre_call_validate` before suspicious calls

## 3. MODULE BUILDING (From Academic Specs)

### When to Build New Modules
- Monolith extraction reveals stubs or missing implementations
- New capability needed (from roadmap or gap analysis)
- Academic algorithm needs production implementation

### Build Process
1. **Source:** Identify academic reference (MIT/Stanford course, peer-reviewed paper)
2. **Specify:** Write interface (inputs, outputs, types, error cases)
3. **Implement:** Follow pseudocode → TypeScript translation
4. **Validate:** Physics-based sanity checks on outputs
5. **Test:** Unit tests with known-good values from literature
6. **Document:** Cite sources, note assumptions, state valid ranges

### Quality Standards
- Every public function: JSDoc with `@param`, `@returns`, `@throws`
- Every formula: cite source, state assumptions, note valid range
- Every output: include uncertainty estimate
- No magic numbers: named constants with units
- Result types over exceptions for expected failure modes

## 4. SKILL DEPLOYMENT

### Auto-Deploy Protocol (Level 0 — Always On)
When a skill is created or updated, it MUST be deployed:

```bash
# Deploy to skill tree
cp -r C:\PRISM\skills-consolidated\prism-my-skill\ /mnt/skills/user/prism-my-skill/

# Verify deployment
ls /mnt/skills/user/prism-my-skill/SKILL.md
```

### Deployment Checklist
- ☐ SKILL.md has YAML frontmatter (name, description)
- ☐ Description accurately reflects content
- ☐ No broken internal references
- ☐ File size reasonable (<50KB preferred)
- ☐ Deployed to /mnt/skills/user/ tree
- ☐ Verified readable after deployment

### Registry Updates
After deploying, update:
- MASTER_INDEX.md skill count
- ACTION_TRACKER.md if skill was a tracked deliverable
- State via `prism_session→state_save`

## 5. DOCUMENT MANAGEMENT (MCP-Native)

### Key Documents & Access
| Document | Read | Write |
|----------|------|-------|
| ACTION_TRACKER.md | `prism_doc→read` | `prism_doc→write` or `append` |
| PRIORITY_ROADMAP | `prism_doc→roadmap_status` | `prism_doc→write` |
| Todo list | `prism_context→todo_read` | `prism_context→todo_update` |
| GSD protocol | `prism_gsd→quick` | Edit .md files directly |
| State | `prism_session→state_load` | `prism_session→state_save` |

### MCP-First Rule
ALWAYS use dispatcher actions over Desktop Commander for these documents.
MCP tools provide validation, formatting, and anti-regression checks automatically.

### Document Lifecycle
- **Create:** `prism_doc→write` with full content
- **Update:** `prism_doc→append` for additions, `write` for replacements
- **Track:** `prism_doc→action_tracker` for status queries
- **Migrate:** `prism_doc→migrate` for format changes
