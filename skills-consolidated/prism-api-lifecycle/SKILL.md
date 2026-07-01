---
name: prism-api-lifecycle
description: |
  Dispatcher/action API lifecycle: design, versioning, deprecation, documentation.
  Ensures stable, predictable APIs for all PRISM consumers.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "api", "lifecycle", "dispatcher", "action", "design", "versioning", "deprecation"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-api-lifecycle")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-api-lifecycle") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What api parameters for 316 stainless?"
→ Load skill: skill_content("prism-api-lifecycle") → Extract relevant api data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot lifecycle issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM API Lifecycle
## Design → Version → Deprecate → Retire

## API Design Principles
1. **Consistent naming:** `verb_noun` for actions (material_get, tool_search)
2. **Predictable params:** Same parameter names across dispatchers for same concepts
3. **Structured responses:** Always return `{ success, data?, error?, _cadence? }`
4. **Backward compatible:** New fields are additive, never remove existing fields

## Action Lifecycle
```
DRAFT → BETA → STABLE → DEPRECATED → RETIRED
  │       │       │          │           │
  Dev    Testing  Production  Warning    Removed
  only   only     use         period     from code
```

| Stage | Duration | Breaking Changes? | Consumer Action |
|-------|----------|-------------------|-----------------|
| Draft | Until tested | Yes | Don't depend on it |
| Beta | 1-2 sessions | Minor only | Test, report issues |
| Stable | Indefinite | No | Safe to depend on |
| Deprecated | 3+ sessions | No | Migrate to replacement |
| Retired | — | N/A | Must have migrated |

## Versioning Strategy
- **Non-breaking:** Add new optional params, add new response fields → no version bump
- **Breaking:** Change param types, remove fields, change behavior → new action name or KNOWN_RENAMES

## Deprecation Protocol
1. Add deprecation notice to action response: `_deprecated: true, _replacement: "new_action"`
2. Add to KNOWN_RENAMES map so old name still works
3. Log warning when deprecated action is called
4. Document migration path in skill/docs
5. Remove after confirmed zero usage

## Documentation Requirements
Every stable action must document:
- **Purpose:** One-line description
- **Params:** Name, type, required/optional, valid values
- **Response:** Structure with example
- **Errors:** Possible error conditions
- **Example:** Working example call
