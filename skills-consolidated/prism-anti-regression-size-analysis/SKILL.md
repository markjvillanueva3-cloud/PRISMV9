---
name: prism-anti-regression-size-analysis
description: Size heuristics and delta decision tree for detecting regressions — expected sizes by operation type and interpretation of size changes
---
# Anti-Regression Size Analysis

## When To Use
- During Phase 3 (Comparison Audit) when comparing old vs new file sizes
- "My replacement is smaller/larger — is that a regression?"
- "What size should I expect for a [rewrite/consolidation/bug fix]?"
- Quick sanity check before detailed content comparison — size is the first warning sign
- NOT for: the full 4-phase process (use prism-anti-regression-process)
- NOT for: domain-specific item checks (use prism-anti-regression-checklists)

## How To Use
**Step 1: Determine operation type and expected size behavior:**

| Operation | Expected Size Change | Red Flag |
|-----------|---------------------|----------|
| Bug fix (few lines) | ≈ same size (±5%) | >5% smaller |
| Enhancement / new feature | Larger than original | Same size or smaller |
| Full rewrite / rebuild | Similar or larger | >20% smaller |
| Consolidation (N files → 1) | ≥ sum of all sources | Less than largest single source |
| Version upgrade (vN → vN+1) | Larger (new content added) | Smaller than previous version |
| Refactor (restructure, no new features) | ≈ same size (±10%) | >10% smaller |
| Skill split (1 → N atomic) | Sum of N ≈ original | Sum < 80% of original |

**Step 2: Calculate size delta:**
  Delta% = ((new_size - old_size) / old_size) × 100
  For consolidations: old_size = sum of all source files

**Step 3: Interpret using the decision tree:**
  new > old + 20% → ✅ GOOD — significant additions (but verify no removals hidden by growth)
  new ≈ old (±10%) → ✅ OK — similar size (still do section-by-section comparison)
  new < old - 10% → ⚠️ WARNING — some content likely removed (verify each removal is intentional)
  new < old - 20% → 🔴 ALERT — significant content loss likely (full audit mandatory)
  new < old - 50% → ❌ CRITICAL — major regression almost certain (do NOT proceed)

**Step 4: If alert or critical, use line-level analysis:**
  Compare line counts per section (not just total). A file that's 5% smaller overall
  might have lost an entire section (-40 lines) while gaining another (+30 lines).
  Total masks section-level regression. Always check section counts independently.

## What It Returns
- Expected size range for the current operation type
- Size delta percentage and severity classification (GOOD/OK/WARNING/ALERT/CRITICAL)
- Go/no-go recommendation based on size alone
- If WARNING or worse: recommendation to do detailed content audit before proceeding
- This is a SCREENING tool — it catches obvious regressions fast but doesn't replace content comparison

## Examples
- Input: "Rewrote PHASE_DA_DEV_ACCELERATION.md from 1446 lines to 1612 lines"
  Operation type: Enhancement (adding new milestones MS9-MS11)
  Delta: +11.5% → ✅ GOOD — file grew as expected for adding 3 new milestones
  Quick verify: new milestones exist, old milestones still present

- Input: "Consolidated GSD_QUICK.md (890 lines) + DEV_PROTOCOL.md (412 lines) → GSD_CORE.md (980 lines)"
  Operation type: Consolidation
  Combined baseline: 1302 lines. New: 980 lines.
  Delta: -24.7% → 🔴 ALERT — lost nearly a quarter of combined content
  Action: full section-by-section audit. Check if 6 duplicate sections removed = 320 lines.
  If duplicates confirmed: adjusted delta = 980/982 = -0.2% → ✅ OK after dedup accounting

- Edge case: "Bug fix changed 3 lines in cadenceExecutor.ts but file went from 450 to 380 lines"
  Operation type: Bug fix. Expected: ±5%.
  Delta: -15.6% → 🔴 ALERT for a bug fix. 70 lines disappeared.
  Likely cause: accidental deletion during edit. Do NOT commit. Compare old vs new line by line.
  If using str_replace/edit_block: this shouldn't happen (surgical edits). Full rewrite suspected.
SOURCE: Split from prism-anti-regression (37.3KB)
RELATED: prism-anti-regression-process, prism-anti-regression-checklists
