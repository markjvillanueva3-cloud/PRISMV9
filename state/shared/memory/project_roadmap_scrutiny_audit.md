---
name: 20-Agent Roadmap Scrutiny Audit (2026-03-30)
description: 20-agent /rgs compliance audit of 14 roadmaps. Average score 49/100. 0/14 fully compliant. Feature Cascade Protocol proposed. 3-loop scrutiny in progress.
type: project
---

## 20-Agent /rgs Protocol Scrutiny (2026-03-30, Loop 1 in progress)

14 roadmaps audited for /rgs SESSION block compliance, self-update capability, and ECC/PCCA activation.

### Scores (14 of 20 agents completed)

| Agent | Role | Score |
|-------|------|-------|
| A1 | Protocol Structure | 68 |
| A2 | Unit Naming | 32 |
| A3 | SMART CONFIG | 38 |
| A7 | Compaction Points | 53 |
| A8 | Physics Rigor | 72 |
| A9 | Machinist Trust | 62 |
| A10 | PCCA Activation | 25 |
| A11 | EIGC Gap Closure | 28 |
| A13 | Revenue Milestones | 86 |
| A15 | Quality/Compliance | 45 |
| A16 | Feature Utilization | 32 |
| A18 | SVI/Psi Integration | 51 |
| Average | | **49/100** |

### Unanimous Findings (all agents agree)
1. **Self-update is 0% implemented** — later sessions don't reference features built by earlier ones
2. **Feature Cascade Protocol missing** — no mechanism propagates new tools to downstream sessions
3. **Frozen baselines** — SVI/Psi, test counts, machine readiness all snapshots from 2026-03-23
4. **Built-but-unwired** — probing (4 engines), setup sheets, FAI, SPC, PCCA all designed but unconnected
5. **PCCA + EIGC stranded** — design specs complete but 0 SESSION blocks, PCCA has 0 milestone JSONs

### Feature Cascade Protocol (proposed by A16)
5-tier system for self-updating roadmaps:
1. Session artifact capture (auto-inventory hooks/actions/skills at exit)
2. Cumulative availability tracker (master timeline across sessions)
3. SMART CONFIG auto-refresh (inject available tools at session start)
4. Consumer verification (track which tools were actually used)
5. Dependency gates (declare and verify session dependencies)

### Physics Bug Found (A8)
MachiningPlaybookEngine.ts:2903 — Ti kc1.1 = 1400 N/mm² (WRONG). Should be 2800 per canonical constants. -50% force prediction = safety risk.

**Why:** This audit reveals the systemic gap between design and activation. PRISM has massive capability on paper but zero mechanism to propagate features forward through the roadmap.

**How to apply:** After Loop 2+3 complete, use the prioritized fix queue: Batch 1 (SESSION blocks, SMART CONFIG, unit naming) → Batch 2 (knowledge sources, forge-triple, exit gates) → Batch 3 (PCCA/EIGC activation) → Batch 4 (compaction, budgets, coherence).
