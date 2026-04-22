---
name: Multi-round scrutiny required before plan approval
description: Run 2+ rounds of parallel scrutiny agents with DIFFERENT roles before asking user to approve plans. User rejected approval twice until scrutiny was done.
type: feedback
---

Run parallel scrutiny agents on plans/roadmaps BEFORE asking user to approve. Minimum 2 rounds with different perspectives.

**Why:** User rejected plan approval twice, demanding scrutiny passes first. Plans have blind spots that only emerge when reviewed by agents with different expertise (hook safety, Codex compat, review design, machinist perspective, token cost, completeness).

**How to apply:**
1. After writing a plan, launch 3 scrutiny agents in parallel (Round 1)
2. Apply all CRITICAL+HIGH findings to the plan
3. Launch 3 MORE agents with DIFFERENT roles (Round 2)
4. Apply Round 2 findings
5. THEN exit plan mode

Good role combinations:
- Round 1: Hook/infra safety, Codex compatibility, domain-specific design review
- Round 2: End-user/domain expert (machinist), token cost accountant, completeness/gap auditor
