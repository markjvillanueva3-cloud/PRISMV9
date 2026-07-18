---
name: prism-anti-regression
description: |
  Mandatory protocol for preventing content, feature, and data loss
  during updates, replacements, migrations, and version upgrades.
  Use when: Replacing, updating, upgrading, migrating, rewriting ANY artifact.
  Provides: Inventory protocols, comparison audits, size heuristics,
  automated checking via regression_checker.py.
  Key principle: If the replacement is smaller, justify every removed byte.
  Part of Quality & Validation skills.
---

# PRISM-ANTI-REGRESSION
## Preventing Content, Feature, and Data Loss
### Version 1.0 | Quality & Validation | ~15KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill prevents the **silent loss of content, features, data, or functionality** when updating, replacing, or migrating any PRISM artifact.

**The Problem:**
- Rewrites often lose critical content from originals
- "Improvements" sometimes remove important sections
- Version upgrades can silently drop features
- Consolidations may lose content from merged sources
- No systematic comparison = no detection until too late

**The Incident That Created This Skill:**
```
v9.0 Battle Prompt: 969 lines, comprehensive
v10.0 Battle Prompt: 442 lines (54% SMALLER!)

LOST IN v10.0:
❌ Part 3: Defensive Layer (Error Prevention Matrix)
❌ Part 4: Predictive Layer (Complexity Forecasting)
❌ 59 Skill Trigger Phrases
❌ Skill Combination Matrix
❌ Part 7: Expert Role Activation Matrix
❌ Part 9: MIT/Stanford Integration
❌ Algorithm Selection Decision Tree
❌ Pre-Action Validation Gates (G1-G6)

WHY: No systematic comparison before declaring "done"
```

**This Skill Provides:**
- Mandatory inventory protocol before replacements
- Comparison audit checklists
- Size heuristics for regression detection
- Automated checking via regression_checker.py
- Domain-specific checklists

## 1.2 The Anti-Regression Mindset

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE ANTI-REGRESSION MINDSET                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ❌ WRONG APPROACH:                                                                     │
│  "I'll rewrite this from scratch"                                                       │
│  "The new version is better organized"                                                  │
│  "I included all the important stuff"                                                   │
│  "It's shorter because it's more efficient"                                             │
│                                                                                         │
│  ✅ RIGHT APPROACH:                                                                     │
│  1. INVENTORY the old artifact completely                                               │
│  2. CREATE the new with inventory visible                                               │
│  3. CHECK OFF each item as incorporated                                                 │
│  4. COMPARE old vs new systematically                                                   │
│  5. JUSTIFY any intentional removals                                                    │
│  6. GET APPROVAL for removals                                                           │
│                                                                                         │
│  KEY INSIGHT:                                                                           │
│  ────────────                                                                           │
│  If the replacement is SMALLER than the original,                                       │
│  you must justify EVERY removed byte.                                                   │
│  "Better organized" is not justification for loss.                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 When This Skill Triggers (AUTO-ACTIVATION)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    ⚠️ AUTO-ACTIVATION RULES - MANDATORY                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  This skill is AUTOMATICALLY ACTIVE (like life-safety mindset) when:                    │
│                                                                                         │
│  1. ANY version number appears (v2, v3, v10, 2.0, etc.)                                 │
│  2. ANY replacement trigger phrase is detected                                          │
│  3. ANY file is being overwritten with new content                                      │
│  4. ANY "new version" of anything is being created                                      │
│                                                                                         │
│  Claude MUST automatically apply this skill without being asked.                        │
│  Failure to apply = potential data loss = safety issue.                                 │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

| Trigger Phrase | Action Required | Auto-Detect |
|----------------|-----------------|-------------|
| "update", "upgrade", "new version" | Full comparison audit | ✅ YES |
| "replace", "supersede", "migrate" | Full comparison audit | ✅ YES |
| "rewrite", "rebuild", "recreate" | Full comparison audit | ✅ YES |
| "merge", "consolidate", "combine" | Union audit (nothing lost from ANY source) | ✅ YES |
| "refactor", "restructure" | Feature parity audit | ✅ YES |
| "v2", "v3", "v10", version numbers | Version comparison audit | ✅ YES |
| "improve", "enhance", "better" | Additive audit (old + new) | ✅ YES |
| Creating file that already exists | Overwrite protection audit | ✅ YES |

**RULE:** If the new thing is meant to REPLACE the old thing, this skill is MANDATORY.
**HIERARCHY:** This skill operates at LEVEL 0 (alongside Life-Safety) for replacement operations.

---

# SECTION 2: THE ANTI-REGRESSION PROTOCOL

## 2.1 Phase 1: Inventory the Old

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 1: INVENTORY (Before Writing Anything New)                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BEFORE creating ANY replacement, MUST document:                                        │
│                                                                                         │
│  □ 1. SECTION INVENTORY                                                                 │
│     List every major section/heading in the original                                    │
│     Count: ___ sections                                                                 │
│                                                                                         │
│  □ 2. FEATURE INVENTORY                                                                 │
│     List every distinct feature, capability, or function                                │
│     Count: ___ features                                                                 │
│                                                                                         │
│  □ 3. DATA INVENTORY                                                                    │
│     List every data table, matrix, list, or enumeration                                 │
│     Count: ___ data structures                                                          │
│                                                                                         │
│  □ 4. RULE INVENTORY                                                                    │
│     List every rule, requirement, or constraint                                         │
│     Count: ___ rules                                                                    │
│                                                                                         │
│  □ 5. EXAMPLE INVENTORY                                                                 │
│     List every example, template, or sample                                             │
│     Count: ___ examples                                                                 │
│                                                                                         │
│  □ 6. SIZE METRICS                                                                      │
│     Line count: ___                                                                     │
│     Word count: ___                                                                     │
│     Size (KB): ___                                                                      │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│  ▼ MANDATORY: Complete Phase 1 before writing ANY new content                           │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Phase 2: Create with Inventory Visible

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: CREATE (With Inventory Visible)                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  WHILE creating the replacement:                                                        │
│                                                                                         │
│  □ Keep the inventory from Phase 1 visible/accessible                                   │
│                                                                                         │
│  □ Check off each item as it's incorporated:                                            │
│     [✓] Section 1: Role & Identity                                                      │
│     [✓] Section 2: Session Protocol                                                     │
│     [ ] Section 3: Defensive Layer     ← NOT YET INCORPORATED                           │
│     [ ] Section 4: Predictive Layer    ← NOT YET INCORPORATED                           │
│     ...                                                                                 │
│                                                                                         │
│  □ For items NOT being carried forward:                                                 │
│     - Document WHY it's being removed                                                   │
│     - Get USER APPROVAL for each removal                                                │
│     - Never silently drop content                                                       │
│                                                                                         │
│  □ Track incorporation status:                                                          │
│     Sections: ___/___ incorporated                                                      │
│     Features: ___/___ incorporated                                                      │
│     Rules: ___/___ incorporated                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Phase 3: Comparison Audit

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: COMPARISON AUDIT (Before Declaring Done)                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  AFTER creating the replacement, MUST verify:                                           │
│                                                                                         │
│  □ 1. SECTION COMPARISON                                                                │
│     Old sections: ___                                                                   │
│     New sections: ___                                                                   │
│     Missing: ___ (list each)                                                            │
│     Added: ___ (list each)                                                              │
│                                                                                         │
│  □ 2. FEATURE COMPARISON                                                                │
│     Old features: ___                                                                   │
│     New features: ___                                                                   │
│     Missing: ___ (list each)                                                            │
│     Added: ___ (list each)                                                              │
│                                                                                         │
│  □ 3. DATA COMPARISON                                                                   │
│     Old data structures: ___                                                            │
│     New data structures: ___                                                            │
│     Missing: ___ (list each)                                                            │
│                                                                                         │
│  □ 4. RULE COMPARISON                                                                   │
│     Old rules: ___                                                                      │
│     New rules: ___                                                                      │
│     Missing: ___ (list each)                                                            │
│                                                                                         │
│  □ 5. SIZE COMPARISON                                                                   │
│     Old size: ___ lines / ___ KB                                                        │
│     New size: ___ lines / ___ KB                                                        │
│     Delta: ___%                                                                         │
│                                                                                         │
│     ⚠️ WARNING: If new is >20% SMALLER, regression likely!                              │
│                                                                                         │
│  □ 6. RUN AUTOMATED CHECK                                                               │
│     python regression_checker.py old_file new_file                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.4 Phase 4: Verdict

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 4: REGRESSION VERDICT                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  REGRESSION CHECK RESULTS:                                                              │
│                                                                                         │
│  □ All old sections accounted for:        YES / NO                                      │
│  □ All old features accounted for:        YES / NO                                      │
│  □ All old data structures accounted for: YES / NO                                      │
│  □ All old rules accounted for:           YES / NO                                      │
│  □ Size delta acceptable:                 YES / NO                                      │
│  □ Any removals approved by user:         YES / NO / N/A                                │
│  □ regression_checker.py passed:          YES / NO                                      │
│                                                                                         │
│  VERDICT:                                                                               │
│  [ ] ✅ NO REGRESSION - Safe to proceed                                                 │
│  [ ] ⚠️ INTENTIONAL CHANGES - User approved removals                                    │
│  [ ] ❌ REGRESSION DETECTED - Must fix before proceeding                                │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│  IF REGRESSION DETECTED:                                                                │
│  1. Do NOT ship/finalize the replacement                                                │
│  2. Identify all missing content                                                        │
│  3. Add missing content to new version                                                  │
│  4. Re-run comparison audit                                                             │
│  5. Repeat until PASS                                                                   │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 3: SIZE HEURISTICS

## 3.1 Expected Size by Operation Type

| Scenario | Expected Size | Red Flag |
|----------|---------------|----------|
| Bug fix only | ~Same size | >5% smaller |
| Enhancement | Larger | Same or smaller |
| Rewrite/Rebuild | Similar or larger | >20% smaller |
| Consolidation | Sum of sources | Less than largest source |
| Version upgrade | Larger | Smaller than previous |
| Refactor | ~Same size | >10% smaller |

## 3.2 Size Delta Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SIZE DELTA DECISION TREE                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  NEW vs OLD SIZE:                                                                       │
│                                                                                         │
│  New > Old + 20%                                                                        │
│  └── ✅ GOOD: Significant additions (verify no removals hidden by additions)            │
│                                                                                         │
│  New ≈ Old (±10%)                                                                       │
│  └── ✅ OK: Similar size (still verify section-by-section)                              │
│                                                                                         │
│  New < Old - 10%                                                                        │
│  └── ⚠️ WARNING: Some content removed (verify intentional)                              │
│                                                                                         │
│  New < Old - 20%                                                                        │
│  └── 🔴 ALERT: Significant loss likely (detailed audit required)                        │
│                                                                                         │
│  New < Old - 50%                                                                        │
│  └── ❌ CRITICAL: Major regression almost certain (do not proceed)                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 4: DOMAIN-SPECIFIC CHECKLISTS

## 4.1 Documents (Prompts, Skills, Docs)

```
DOCUMENT REPLACEMENT CHECKLIST:
□ All sections/headings preserved or justified
□ All tables preserved or justified
□ All code blocks preserved or justified
□ All examples preserved or justified
□ All rules/requirements preserved or justified
□ All references/links preserved or justified
□ All diagrams/ASCII art preserved or justified
```

## 4.2 Databases

```
DATABASE REPLACEMENT CHECKLIST:
□ All records preserved (count match)
□ All fields preserved (schema match)
□ All relationships preserved
□ All indexes preserved
□ All constraints preserved
□ All computed values preserved
□ All metadata preserved
```

## 4.3 Code Modules

```
CODE MODULE REPLACEMENT CHECKLIST:
□ All exports preserved (API compatibility)
□ All functions preserved or deprecated properly
□ All error handling preserved
□ All edge cases still handled
□ All tests still pass
□ All consumers still work
□ All comments/documentation preserved
```

## 4.4 Skills

```
SKILL REPLACEMENT CHECKLIST:
□ YAML frontmatter preserved (name, description)
□ All SECTION numbers preserved
□ PURPOSE section complete
□ WHEN TO USE triggers preserved
□ METHODOLOGY steps preserved
□ All CHECKLISTS preserved
□ All EXAMPLES preserved
□ INTEGRATION points preserved
□ Quick reference card preserved
□ Document footer preserved
```

---

# SECTION 5: AUTOMATION

## 5.1 regression_checker.py

```bash
# Compare two files for regression
python regression_checker.py old_version.md new_version.md

# Strict mode (fail on any warning)
python regression_checker.py old.md new.md --strict

# Output as JSON
python regression_checker.py old.md new.md --json

# Compare directories
python regression_checker.py old_dir/ new_dir/ --batch
```

## 5.2 Integration with prism_toolkit.py

```bash
# Add to prism_toolkit.py:
python prism_toolkit.py regression <old> <new>

# Example workflow:
1. python prism_toolkit.py regression v9.md v10.md
2. Review report
3. Fix any regressions
4. Re-run until PASS
5. Then proceed with replacement
```

## 5.3 Pre-Commit Hook (Future)

```bash
# Future: Add to git pre-commit
# Automatically check any file being replaced
```

---

# SECTION 6: INTEGRATION

## 6.1 Skill Dependencies

```yaml
integrates_with:
  - prism-life-safety-mindset: "Regression = potential safety issue"
  - prism-maximum-completeness: "100% means nothing lost"
  - prism-sp-review-spec: "Spec review includes regression check"
  - prism-sp-review-quality: "Quality review includes regression check"
  - prism-auditor: "Audits compare to previous versions"
  - prism-verification: "Verification confirms no regression"

automation:
  - regression_checker.py: "Automated comparison tool"
  - prism_toolkit.py: "Master tool integration"

triggers_on:
  - "update", "upgrade", "new version"
  - "replace", "supersede", "migrate"
  - "rewrite", "rebuild", "recreate"
  - "merge", "consolidate", "combine"
  - "refactor", "restructure"
  - Version numbers (v2, v3, v10)
```

## 6.2 Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           ANTI-REGRESSION IN SUPERPOWERS WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BRAINSTORM                                                                             │
│  └── If replacing something: "I will inventory the old artifact first"                  │
│                                                                                         │
│  PLANNING                                                                               │
│  └── Include: "Task: Run regression check before finalizing"                            │
│                                                                                         │
│  EXECUTION                                                                              │
│  └── Keep inventory visible, check off items as incorporated                            │
│                                                                                         │
│  REVIEW-SPEC                                                                            │
│  └── Verify: "All old content accounted for"                                            │
│                                                                                         │
│  REVIEW-QUALITY                                                                         │
│  └── Run: python regression_checker.py old new                                          │
│                                                                                         │
│  VERIFICATION                                                                           │
│  └── Evidence: regression_checker.py output shows PASS                                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-ANTI-REGRESSION QUICK REFERENCE                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  🔴 BEFORE REPLACING ANYTHING:                                                          │
│                                                                                         │
│  □ Did I inventory the old artifact first?                                              │
│  □ Did I check off each item as I incorporated it?                                      │
│  □ Did I get approval for any intentional removals?                                     │
│  □ Is the new version at least as large as the old?                                     │
│  □ Did I run regression_checker.py?                                                     │
│  □ Can I list what's NEW (not just what's kept)?                                        │
│                                                                                         │
│  If ANY answer is NO → Do not proceed until fixed                                       │
│                                                                                         │
│  SIZE HEURISTIC:                                                                        │
│  ──────────────────────────────────────────────────────────────                         │
│  If replacement is SMALLER → Justify EVERY removed byte                                 │
│  >20% smaller → Almost certainly a regression                                           │
│  >50% smaller → Do not proceed without full audit                                       │
│                                                                                         │
│  COMMAND:                                                                               │
│  ──────────────────────────────────────────────────────────────                         │
│  python regression_checker.py old_file new_file                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# DOCUMENT END

**Skill:** prism-anti-regression
**Version:** 1.0
**Category:** Quality & Validation
**Priority:** CRITICAL
**Created:** Session following v10.0 incident
**Status:** COMPLETE

**Key Features:**
- 4-phase protocol (Inventory → Create → Compare → Verdict)
- Size heuristics for regression detection
- Domain-specific checklists (documents, databases, code, skills)
- Automated checking via regression_checker.py
- Integration with Superpowers workflow
- Triggers on any replacement/update/upgrade operation

**ABSOLUTE RULES:**
- ✗ NEVER replace without inventorying the original first
- ✗ NEVER silently drop content
- ✗ NEVER ship a replacement significantly smaller without justification
- ✓ ALWAYS inventory before replacing
- ✓ ALWAYS compare old vs new before shipping
- ✓ ALWAYS get approval for intentional removals
- ✓ ALWAYS run regression_checker.py

---
