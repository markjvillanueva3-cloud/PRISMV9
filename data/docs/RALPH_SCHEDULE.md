# RALPH VALIDATION SCHEDULE — PRISM Roadmap v14.5
# When to run ralph_loop at what depth. Requires API key in .env.

## QUICK (1 iteration) — After each MS completion
- Validates deliverables exist and meet minimum quality
- ~30 seconds, ~$0.01 API cost
- Trigger: MS completion gate

## STANDARD (3 iterations) — Before phase gates + safety-critical changes
- Full scrutinize→improve→validate cycle
- ~2 minutes, ~$0.05 API cost
- Triggers: Phase gate, safety calc code changes, registry schema changes

## DEEP (5 iterations) — Before R2 safety gate + R6 production gate
- Full cycle with Opus assessment
- ~5 minutes, ~$0.15 API cost
- Triggers: R2-MS4 (safety validation gate), R6-MS3 (production release gate)

## SKIP CONDITIONS
- Haiku-level bulk ops (data loading, file scanning) — no ralph needed
- Documentation-only changes — quick at most
- CC_DEFERRED items — validate when CC available

## SCHEDULE BY PHASE
- DA: Quick after each MS. Standard at DA-MS5 (phase gate).
- R1: Quick after MS. Standard at R1-MS9 (data foundation gate).
- R2: Standard after each MS. DEEP at R2-MS4 (safety gate). MANDATORY.
- R3-R5: Quick after MS. Standard at phase gates.
- R6: Standard after each MS. DEEP at R6-MS3 (production gate). MANDATORY.
- R7-R11: Quick after MS. Standard at phase gates.