---
source: dev_protocol
section: Approach Decision — Before Writing Any Code
slug: approach-decision-before-writing-any-code
indexed_at: 2026-05-02T23:44:16.641Z
---

## Approach Decision — Before Writing Any Code

### Simple fix (<20 lines, single file)
→ Read → Edit → verify → done. No brainstorm. Skip ralph.

### Medium task (20-100 lines, 1-3 files)
→ Plan in your head → implement → self-review.
Optional: `prism_ralph:scrutinize` if it touches safety or core
infrastructure.

### Large task (>100 lines or >3 files)
→ `prism_sp:brainstorm` (MANDATORY — present to user, AWAIT APPROVAL)
→ `prism_sp:plan` (define steps, checkpoints, quality gates)
→ Implement in chunks (plan-first for each >50 line block)
→ `prism_ralph:loop` for validation (4-phase with API calls)
→ `prism_ralph:assess` for final grade (Opus-level review)

### Safety-critical (forces, speeds, G-code, anything that hits a real machine)
ALL of the above PLUS:
→ `prism_validate:safety` (S(x)≥0.70 HARD BLOCK)
→ `prism_omega:compute` (Ω≥0.70 sim, 0.95+ shop floor)
→ Evidence ≥ L4 (reproducible, not just sampled)
