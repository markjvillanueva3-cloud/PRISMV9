# TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-A12-RECALL-COUNTER-NOISE-SUPPRESS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-A12-RECALL-COUNTER-NOISE-SUPPRESS (slot:alpha /loop iter5 next-units): default-silent the +1 recall-counter telemetry on BOTH read-side (recall-counter-track) and write-side (wiki-recall-on-write) hooks. A12 in DORMANT-FEATURES-ENUMERATION. Pre-fix: 21+ distinct injection entries per session like ecall-counter-write: +1 memory/source/reference_psn_* polluting prompt context — the state file write at wiki-recall-counts.json was the durable record, the additionalContext was redundant. Post-fix: success-telemetry silent, error-telemetry (could-not-derive-key, write-fail) still emits (debug visibility preserved). Re-enable full verbose: PRISM_RECALL_COUNTER_VERBOSE=1. Symmetric pattern with U-A11-A13-PROMPT-NOISE-CLEANUP env-knob discipline. PSN leg #4 (Memories) state file unchanged — recall counts still increment normally.

**Commit:** `a036e958fced` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T14:19:49-05:00
**Tags:** token-context-forge-audit-ms0, u-a12-recall-counter-noise-suppress, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-A12-RECALL-COUNTER-NOISE-SUPPRESS (slot:alpha /loop iter5 next-units): default-silent the +1 recall-counter telemetry on BOTH read-side (recall-counter-track) and write-side (wiki-recall-on-write) hooks. A12 in DORMANT-FEATURES-ENUMERATION. Pre-fix: 21+ distinct injection entries per session like ecall-counter-write: +1 memory/source/reference_psn_* polluting prompt context — the state file write at wiki-recall-counts.json was the durable record, the additionalContext was redundant. Post-fix: success-telemetry silent, error-telemetry (could-not-derive-key, write-fail) still emits (debug visibility preserved). Re-enable full verbose: PRISM_RECALL_COUNTER_VERBOSE=1. Symmetric pattern with U-A11-A13-PROMPT-NOISE-CLEANUP env-knob discipline. PSN leg #4 (Memories) state file unchanged — recall counts still increment normally.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-A12-RECALL-COUNTER-NOISE-SUPPRESS (slot:alpha /loop iter5 next-units): default-silent the +1 recall-counter telemetry on BOTH read-side (recall-counter-track) and write-side (wiki-recall-on-write) hooks. A12 in DORMANT-FEATURES-ENUMERATION. Pre-fix: 21+ distinct injection entries per session like ecall-counter-write: +1 memory/source/reference_psn_* polluting prompt context — the state file write at wiki-recall-counts.json was the durable record, the additionalContext was redundant. Post-fix: success-telemetry silent, error-telemetry (could-not-derive-key, write-fail) still emits (debug visibility preserved). Re-enable full verbose: PRISM_RECALL_COUNTER_VERBOSE=1. Symmetric pattern with U-A11-A13-PROMPT-NOISE-CLEANUP env-knob discipline. PSN leg #4 (Memories) state file unchanged — recall counts still increment normally.
```

## Files touched (3)
- .claude/hooks/recall-counter-track.mjs | 19 +++++++++++++++----
- .claude/hooks/wiki-recall-on-write.mjs | 15 ++++++++++-----
- 2 files changed, 25 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till emits (debug visibility preserved). Re-enable full verbose: PRISM_RECALL_COUNTER_VERBOSE=1. Symmetric pattern with U-A11-A13-PROMPT-NOISE-CLEANUP env-knob discipline. PSN leg #4 (Memories) state file unchanged — recall counts still increment normally.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a036e958fced`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-CONTEXT-FORGE-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._