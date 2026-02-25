---
name: prism-anti-regression-checklists
description: Domain-specific regression checklists for documents, databases, code modules, and skills — what to inventory and compare per file type
---
# Anti-Regression Domain Checklists

## When To Use
- During Phase 1 (Inventory) and Phase 3 (Comparison) of the anti-regression process
- "What specifically should I check for regression in this [document/database/code/skill]?"
- When the generic 6-category inventory needs domain-specific detail
- Pair with prism-anti-regression-process which defines WHEN to check; this skill defines WHAT to check
- NOT for: deciding whether to run anti-regression (that's the process skill's trigger list)
- NOT for: interpreting size deltas (use prism-anti-regression-size-analysis)

## How To Use
Identify the domain of the file being replaced, then use the matching checklist:

**DOCUMENTS** (prompts, skills, markdown, docs, roadmap files):
  □ All sections/headings preserved or removal justified
  □ All tables preserved — row counts match, column structure intact
  □ All code blocks preserved — syntax, language tags, content
  □ All examples preserved — input/output pairs, edge cases
  □ All rules/requirements preserved — especially MUST/SHALL/NEVER statements
  □ All references/links preserved — cross-references to other files still valid
  □ All ASCII diagrams/visual structures preserved — decision trees, flowcharts
  □ Anchors (<!-- ANCHOR: -->) preserved — downstream references break if removed

**DATABASES** (JSON registries, material files, machine catalogs):
  □ Record count match — old_count <= new_count
  □ Schema match — all fields present, no silent field drops
  □ Relationship integrity — foreign keys, cross-references still valid
  □ Index preservation — any indexed fields still indexed
  □ Constraint preservation — validation rules, required fields, type constraints
  □ Computed/derived values — formulas, aggregates still produce same results
  □ Metadata — timestamps, versions, source attributions intact

**CODE MODULES** (TypeScript engines, dispatchers, utilities):
  □ All exports preserved — public API unchanged or backward-compatible
  □ All functions preserved — no silent removal of capabilities
  □ Error handling preserved — catch blocks, PrismError taxonomy, fallback paths
  □ Edge case handling — boundary checks, null guards, type narrowing
  □ Test compatibility — existing vitest suite still passes
  □ Consumer compatibility — all callers still work (grep for import references)
  □ Comments/JSDoc preserved — especially safety-critical annotations

**SKILLS** (SKILL.md files in skills-consolidated/):
  □ YAML frontmatter preserved — name, description fields
  □ All 4 v2.0 sections present — When To Use, How To Use, What It Returns, Examples
  □ Trigger keywords preserved — the words that cause this skill to load
  □ All methodology steps preserved — numbered procedures
  □ All examples preserved — with real numbers, not placeholders
  □ Integration points preserved — RELATED skills, SOURCE attribution
  □ Unique operational text — doesn't duplicate another skill's How To Use

## What It Returns
- The correct checklist for the file type being replaced
- A concrete list of items to inventory in Phase 1 and compare in Phase 3
- If all items checked: confidence that domain-specific content is preserved
- If items missing: specific gaps to address before shipping the replacement
- Feeds directly into Phase 4 verdict — unchecked items are potential regressions

## Examples
- Input: "Replacing PHASE_R2_SAFETY.md with expanded version"
  Domain: DOCUMENT
  Checklist focus: sections/headings (##), anchor tags, milestone definitions, gate criteria tables
  Specific check: count ## headings in old (14) vs new — new must have ≥14
  Specific check: grep '<!-- ANCHOR:' in old (8 anchors) — all 8 must exist in new
  Specific check: gate criteria table rows — old has 12 criteria, new must have ≥12

- Input: "Rebuilding materials.json after schema migration"
  Domain: DATABASE
  Checklist focus: record count (3518 materials), field count (127 per record), cross-references
  Specific check: old record count 3518 → new must be ≥3518
  Specific check: spot-check 3 random materials — all 127 fields present with physically reasonable values
  Red flag: if new file is smaller in bytes but claims same record count → likely field drops

- Input: "Refactoring cadenceExecutor.ts to add new functions"
  Domain: CODE MODULE
  Checklist focus: exported functions, existing cadence function names, error handling
  Specific check: grep 'export' in old (12 exports) → new must have ≥12
  Specific check: existing 25 cadence functions all still present and callable
  Red flag: if any existing function is renamed or removed → consumer breakage
SOURCE: Split from prism-anti-regression (37.3KB)
RELATED: prism-anti-regression-process, prism-anti-regression-size-analysis
