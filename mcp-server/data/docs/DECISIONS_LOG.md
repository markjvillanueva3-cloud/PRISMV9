# DECISIONS LOG — PRISM Development
# Append decisions here during sessions. Read at boot for continuity.
# Format: [date] [MS] DECISION: [what] RATIONALE: [why]

[2026-02-17] DA-MS1 DECISION: W4 health_check uses GREEN/YELLOW/RED thresholds RATIONALE: Matches Recovery Card modes, enables proactive session management
[2026-02-17] DA-MS1 DECISION: autoPreCompactionDump fires at >=55% pressure RATIONALE: Gap between 55-70% had no protection. Proactive dump prevents data loss.
[2026-02-17] DA-MS1 DECISION: Recovery Card gets health-based modes RATIONALE: Post-compaction boot should adapt behavior to session health, not just compaction count.
## SCRIPT AUDIT RESULTS (DA-MS2 Step 1b)
- Registry: 211 scripts in ScriptRegistry.ts (TypeScript inline)
- On disk: 1672 files total, 1371 under materials_rebuild/ (data gen, not stubs)
- Actual utility scripts: ~301 files across 12 categories
- No SCRIPT_REGISTRY.json exists (roadmap "1320 stubs" claim was stale)
- Categories: core(126), __pycache__(19), testing(16), _archive(10), batch(8), validation(8), audit(7), integration(6), automation(5), extraction(5), state(5), agents(3), tools(2)
- ACTION: No stub cleanup needed. materials_rebuild/ is R1 territory. Registry accurate at 211.
