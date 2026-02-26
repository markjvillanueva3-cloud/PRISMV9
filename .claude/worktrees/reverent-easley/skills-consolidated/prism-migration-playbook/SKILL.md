---
name: prism-migration-playbook
description: |
  Safe migration patterns: data, schema, API, and code migrations.
  Anti-regression enforcement, rollback planning, zero-downtime transitions.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "migration", "playbook", "safe", "patterns", "data", "schema", "code"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-migration-playbook")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-migration-playbook") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What migration parameters for 316 stainless?"
→ Load skill: skill_content("prism-migration-playbook") → Extract relevant migration data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot playbook issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Migration Playbook
## Safe Transitions for Safety-Critical Systems

## Migration Types

| Type | Risk | Example |
|------|------|---------|
| Data migration | HIGH | Changing material schema, moving state |
| API migration | MEDIUM | Renaming dispatchers, changing action params |
| Code refactor | MEDIUM | Extracting modules, consolidating files |
| Dependency update | LOW-HIGH | Updating libraries, Node.js version |

## Universal Migration Protocol

### Phase 1: PREPARE
1. **Inventory:** Count everything (functions, tests, exports, records)
2. **Backup:** Copy originals before any modification
3. **Plan:** Define exact steps, expected outcomes, rollback triggers
4. **Test:** Write migration-specific tests that verify before AND after

### Phase 2: MIGRATE
1. **New alongside old:** Create new structure without removing old
2. **Copy data:** Transfer content to new structure
3. **Verify count:** `new_count ≥ old_count` — MANDATORY
4. **Verify content:** Spot-check 10% of migrated items
5. **Integration test:** Run full test suite against new structure

### Phase 3: SWITCH
1. **Update references:** Point consumers to new structure
2. **Deprecation period:** Old structure remains accessible (read-only)
3. **Monitor:** Watch for errors from missed references
4. **Clean up:** Remove old structure only after confirmed stable

### Phase 4: VERIFY
1. **Anti-regression:** Full inventory count comparison
2. **Functional test:** All existing tests pass
3. **Performance:** No degradation >10%
4. **Rollback test:** Can we actually roll back if needed?

## Anti-Regression Rules (NON-NEGOTIABLE)
```
BEFORE migration:
  old_count = inventory(original)

AFTER migration:
  new_count = inventory(migrated)
  ASSERT: new_count ≥ old_count

If new_count < old_count:
  → HALT migration
  → Identify missing items
  → Fix before proceeding
```

## Rollback Planning
Every migration must have a documented rollback plan:
- **Trigger:** What conditions trigger rollback?
- **Steps:** Exact commands to revert
- **Time:** How long does rollback take?
- **Data:** Is any data loss possible during rollback?

## PRISM-Specific Migrations

### Dispatcher Rename
1. Add old name to KNOWN_RENAMES map
2. New dispatcher handles all actions
3. Old name routes to new via KNOWN_RENAMES
4. Update MASTER_INDEX.md

### Skill Consolidation
1. Read all source skills
2. Create merged skill with combined content
3. Verify merged skill covers all source topics
4. Keep source skills (archive, don't delete)
5. Deploy merged skill to /mnt/skills/user/

### Schema Change
1. New schema alongside old (additive, not breaking)
2. Migrate data to new schema
3. Validate all records pass new schema validation
4. Update consumers to use new fields
5. Deprecate old fields (keep for backward compat)
