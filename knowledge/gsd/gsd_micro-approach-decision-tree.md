---
source: gsd_micro
section: Approach Decision Tree
slug: approach-decision-tree
indexed_at: 2026-04-28T02:50:03.700Z
---

## Approach Decision Tree

```
Simple fix (<20 lines, single file):
  Read → Edit → verify → done. No brainstorm. Skip ralph.

Medium task (20-100 lines, 1-3 files):
  Plan in head → implement → self-review.
  Optional: prism_ralph:scrutinize on safety-touching changes.

Large task (>100 lines or >3 files):
  prism_sp:brainstorm (MANDATORY, await user approval)
  prism_sp:plan (steps + checkpoints)
  Implement in <50-line chunks
  prism_ralph:loop (4-phase validation)
  prism_ralph:assess (Opus-level grade)

Safety-critical (forces, speeds, G-code):
  ALL of the above PLUS:
    prism_validate:safety (S(x)≥0.70 hard block)
    prism_omega:compute (Ω≥0.95 shop floor; ≥0.90 production)
    Evidence ≥ L4 (reproducible)
```
