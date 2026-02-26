---
name: prism-anti-regression-process
description: 4-phase protocol for replacing any file without losing content — Inventory, Create, Compare, Verdict
---
# Anti-Regression 4-Phase Process

## When To Use
- "I need to rewrite this file" / "replace this with a new version" / "rebuild from scratch"
- Any operation that REPLACES an existing file: version upgrades, rewrites, consolidations, merges
- Trigger words: replace, supersede, migrate, rewrite, rebuild, recreate, refactor, restructure
- Trigger patterns: version bumps (v9 → v10), file renames with new content, "improved version of"
- NOT for: new files with no predecessor, appending to existing files, editing a few lines in place
- NOT for: size/delta analysis (use prism-anti-regression-size-analysis)
- NOT for: domain-specific checklist details (use prism-anti-regression-checklists)

## How To Use
The protocol has 4 mandatory phases executed in strict order. Skipping phases causes regressions.

**Phase 1 — INVENTORY THE OLD** (before writing anything):
Document 6 inventories from the original file:
  1. Section inventory: list every heading/section, count them
  2. Feature inventory: list every capability or function, count them
  3. Data inventory: list every table, matrix, list, enumeration, count them
  4. Rule inventory: list every rule, requirement, constraint, count them
  5. Example inventory: list every example, template, sample, count them
  6. Size metrics: line count, word count, KB size
Write these counts down. They are your regression baseline.

**Phase 2 — CREATE WITH INVENTORY VISIBLE** (during replacement):
Keep the Phase 1 inventory open/visible while writing. Check off each item as incorporated.
For items NOT carried forward: document WHY removed, get user approval. Never silently drop.
Track running totals: sections ___/___ incorporated, features ___/___ incorporated.

**Phase 3 — COMPARISON AUDIT** (after writing, before shipping):
Side-by-side comparison across all 6 categories:
  Old sections: N → New sections: M → Missing: [list] → Added: [list]
  Repeat for features, data, rules, examples, size.
If new < old - 20% in any category → ALERT, detailed audit required.
Run `prism_validate action=anti_regression params={old_count: N, new_count: M}` for automated check.

**Phase 4 — VERDICT** (go/no-go decision):
All old sections accounted for? All features? All data? All rules? Size delta acceptable?
Three possible verdicts:
  ✅ NO REGRESSION — safe to ship
  ⚠️ INTENTIONAL CHANGES — user approved specific removals
  ❌ REGRESSION DETECTED — fix before proceeding, re-run from Phase 3

## What It Returns
- Phase 1 produces: inventory baseline with 6 category counts
- Phase 2 produces: checked-off incorporation tracker showing coverage
- Phase 3 produces: side-by-side comparison with explicit missing/added lists
- Phase 4 produces: one of 3 verdicts (pass / intentional changes / regression)
- If regression detected: specific list of missing items to add back before shipping
- Integration: verdict feeds into pre_write_antiregression hook which BLOCKS writes that fail

## Examples
- Input: "Rewriting ROADMAP_INSTRUCTIONS.md from v14.4 to v14.5"
  Phase 1: 12 sections, 8 rules, 3 examples, 341 lines, 14.2KB
  Phase 2: writing new version, checking off sections... 11/12 incorporated, 1 flagged for removal
  Phase 3: old=12 sections new=13 sections, 1 removed (DRY-RUN — moved to RECOVERY_CARD), 2 added
  Phase 4: ⚠️ INTENTIONAL CHANGES — DRY-RUN removal approved, documented in tracker
  
- Input: "Consolidating GSD_QUICK.md and DEV_PROTOCOL.md into single GSD file"
  Phase 1: Source A: 45 sections, 890 lines. Source B: 23 sections, 412 lines. Combined baseline: 68 sections, 1302 lines
  Phase 2: writing consolidated version... 62/68 incorporated, 6 duplicates identified
  Phase 3: old combined=68 new=64 (6 genuine duplicates removed, 2 new integration sections added)
  Size: 1302 → 1180 lines (9% smaller — within ±10% OK range)
  Phase 4: ✅ NO REGRESSION — duplicates confirmed, all unique content preserved

- Edge case: "Quick bug fix to one function in cadenceExecutor.ts"
  This does NOT trigger the full 4-phase process — it's an edit, not a replacement.
  Use str_replace/edit_block for targeted fixes. Anti-regression applies to FULL FILE REPLACEMENT only.
SOURCE: Split from prism-anti-regression (37.3KB)
RELATED: prism-anti-regression-size-analysis, prism-anti-regression-checklists
