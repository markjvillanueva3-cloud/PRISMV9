## BUFFER ZONES — Advisory Indicators, NOT Limits

### THE KEY INSIGHT: Pressure governs everything, not call counts.
Buffer zones are LABELS for orientation. They do NOT force stops, limits, or restrictions.
The ONLY thing that controls response size is context pressure percentage.

### Zone Definitions (ADVISORY)
🟢 GREEN (0-20 calls): Normal. Work freely. Full 20KB responses.
🟡 YELLOW (21-30 calls): Consider planning a checkpoint soon.
🔴 RED (31-40 calls): Good time for prism_session→auto_checkpoint.
⚫ BLACK (41+ calls): Survival save fires. Keep working — NOT a stop signal.

### What Actually Controls Response Size
| Context Pressure | Max Response | Action |
|-----------------|-------------|--------|
| 0-59% | 20KB | Full responses, no trimming |
| 60-69% | 12KB | Moderate trimming. Key info only. |
| 70-84% | 8KB | Significant trimming. Essentials only. |
| 85%+ | 5KB | Critical. Bare minimum. |

### Survival Save Schedule (automatic, zero cost)
1. Every 15 calls (periodic backup)
2. At 41+ calls (high-call-count safety net)
3. At 60%+ pressure (during auto-compress)
All write to COMPACTION_SURVIVAL.json — triple overlapping.

### Common Misconceptions (FIXED IN v20)
❌ "Stop at 30 calls" — WRONG. No forced stops ever.
❌ "Reduce response size at yellow zone" — WRONG. Only pressure changes size.
❌ "Need to save state at red zone" — ADVISORY. Auto-saves handle it.
❌ "Black zone means stop working" — WRONG. Continue normally.

### What to Actually Do
- Check pressure with prism_context→context_pressure if curious
- Trust the auto-save system — it triple-saves your work
- Focus on the TASK, not on managing buffer zones
- If compaction happens, recovery is automatic (see start.md)

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Added misconceptions section. Clarified pressure-only.
- 2026-02-10: v2.0 — File-based. Complete rewrite for pressure-only architecture.
- 2026-02-09: v1.x — Had call-count-based caps and forced stops (removed).
