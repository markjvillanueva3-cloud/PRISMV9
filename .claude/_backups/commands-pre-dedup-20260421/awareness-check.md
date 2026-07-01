---
name: "awareness-check"
description: "Awareness score check — per-directive"
policy:
  tier: 1
  triggers:
    - events:
      - "UserPromptSubmit"
      keywords:
      - "awareness"
      - "awareness score"
  mode: "suggest"
  priority: 40
  timeout_ms: 2000
  token_budget: 400
---

# /awareness-check — Awareness Score Check

Check and report the current awareness score and identify coverage gaps.

## Usage
```
/awareness-check [--verbose]
```

## MCP Action
```
prism_awareness:check_score
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs awareness audit)
- **Advisor**: None (diagnostic only)

## What it does
1. Load awareness cache from AwarenessQueryEngine
2. Calculate awareness score via AwarenessScoreEngine
3. Identify coverage gaps (missing registrations)
4. Check for stale entries (orphan references)
5. Verify cross-session sync state
6. Report score breakdown by category

## Awareness Categories
- **Engines**: Engine registry coverage
- **Actions**: Dispatcher action coverage
- **Skills**: Slash command coverage
- **Hooks**: Hook registration coverage
- **Formulas**: Formula registry coverage
- **Tribal**: Tribal knowledge coverage
- **H: Drive**: JM Die program awareness

## Score Interpretation
- **≥0.95**: Excellent — full awareness
- **0.80-0.94**: Good — minor gaps
- **0.60-0.79**: Fair — significant gaps
- **<0.60**: Poor — major awareness issues

## Output
- Overall awareness score
- Per-category breakdown
- Gap inventory
- Remediation suggestions

## Related
- `/sync-terminals` — Sync awareness
- `/forge-drift` — Check registry drift
- `/aware` — Full awareness command
