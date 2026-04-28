---
source: dev_protocol
section: APPROACH DECISION (before writing any code)
slug: approach-decision-before-writing-any-code
indexed_at: 2026-04-28T02:29:29.167Z
---

## APPROACH DECISION (before writing any code)

### Simple fix (<20 lines, single file)?
→ READ → edit_block → verify → done
No brainstorm needed. Just fix it.

### Medium task (20-100 lines, 1-3 files)?
→ Plan in your head → implement → self-review
Call prism_ralph→scrutinize on the result if it touches safety or core infrastructure.

### Large task (>100 lines or >3 files)?
→ prism_sp→brainstorm (MANDATORY — present to user, AWAIT APPROVAL)
→ prism_sp→plan (define steps, checkpoints, quality gates)
→ Implement in chunks (plan-first for each >50 line block)
→ prism_ralph→loop for validation (4-phase with API calls)
→ prism_ralph→assess for final grade (Opus-level review)

### Safety-critical (touches calculations, forces, speeds)?
→ ALL of the above PLUS:
→ prism_validate→safety (S(x)≥0.70 HARD BLOCK)
→ prism_omega→compute (Ω≥0.70 for release)
→ Evidence≥L4 (reproducible, not just sampled)
