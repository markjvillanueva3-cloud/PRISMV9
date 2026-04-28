---
source: gsd_micro
section: Approach Decision Tree (Dev)
slug: approach-decision-tree-dev
indexed_at: 2026-04-28T02:39:36.895Z
---

## Approach Decision Tree (Dev)

```
Simple fix (<20 lines, single file):
  READ → Edit → verify → done
  No brainstorm. Skip ralph.

Medium task (20-100 lines, 1-3 files):
  Plan in head → implement → self-review
  Optional: prism_ralph:scrutinize if safety-touching

Large task (>100 lines or >3 files):
  prism_sp:brainstorm (MANDATORY, await user approval)
  prism_sp:plan (steps + checkpoints)
  Implement in <50-line chunks
  prism_ralph:loop (4-phase validation)
  prism_ralph:assess (Opus-level grade)

Safety-critical (forces, speeds, G-code):
  ALL of the above PLUS:
    prism_validate:safety (S(x)≥0.70 hard block)
    prism_omega:compute (Ω≥0.70 release; 0.95+ for shop floor)
    Evidence ≥ L4 (reproducible)
```
