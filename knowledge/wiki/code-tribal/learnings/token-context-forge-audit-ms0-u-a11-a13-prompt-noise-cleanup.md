# TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-A11-A13-PROMPT-NOISE-CLEANUP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-A11-A13-PROMPT-NOISE-CLEANUP (slot:alpha /loop iter4 next-units): two Phase-1 fixes from DORMANT-FEATURES-ENUMERATION shipped together. A11 (hook-registry-regen): drop the per-edit egen queued additionalContext — pure noise, 125 fires/session at 3032 tokens, operators never act on it; the action (detached child spawn) fires regardless. Re-enable via PRISM_HOOK_REGISTRY_REGEN_VERBOSE=1. A13 (tool-watchdog): quantize prev.durationMs to 10s buckets (30-40s, 100+s) so identical-bucket entries dedup at the prompt-injection layer; pre-fix 17 distinct entries observed in one audit window per unique-millisecond non-match. Smoke-test verified: 32962ms->30-40s, 138060ms->100+s, 10000ms->10-20s. PSN leg #6 (System Viz / token telemetry) prompt-context noise reduced ~3-5K tokens/session typical, ~7K worst-case watchdog-heavy session.

**Commit:** `11eb8c6fc9ee` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T14:08:46-05:00
**Tags:** token-context-forge-audit-ms0, u-a11-a13-prompt-noise-cleanup, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-A11-A13-PROMPT-NOISE-CLEANUP (slot:alpha /loop iter4 next-units): two Phase-1 fixes from DORMANT-FEATURES-ENUMERATION shipped together. A11 (hook-registry-regen): drop the per-edit egen queued additionalContext — pure noise, 125 fires/session at 3032 tokens, operators never act on it; the action (detached child spawn) fires regardless. Re-enable via PRISM_HOOK_REGISTRY_REGEN_VERBOSE=1. A13 (tool-watchdog): quantize prev.durationMs to 10s buckets (30-40s, 100+s) so identical-bucket entries dedup at the prompt-injection layer; pre-fix 17 distinct entries observed in one audit window per unique-millisecond non-match. Smoke-test verified: 32962ms->30-40s, 138060ms->100+s, 10000ms->10-20s. PSN leg #6 (System Viz / token telemetry) prompt-context noise reduced ~3-5K tokens/session typical, ~7K worst-case watchdog-heavy session.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-A11-A13-PROMPT-NOISE-CLEANUP (slot:alpha /loop iter4 next-units): two Phase-1 fixes from DORMANT-FEATURES-ENUMERATION shipped together. A11 (hook-registry-regen): drop the per-edit egen queued additionalContext — pure noise, 125 fires/session at 3032 tokens, operators never act on it; the action (detached child spawn) fires regardless. Re-enable via PRISM_HOOK_REGISTRY_REGEN_VERBOSE=1. A13 (tool-watchdog): quantize prev.durationMs to 10s buckets (30-40s, 100+s) so identical-bucket entries dedup at the prompt-injection layer; pre-fix 17 distinct entries observed in one audit window per unique-millisecond non-match. Smoke-test verified: 32962ms->30-40s, 138060ms->100+s, 10000ms->10-20s. PSN leg #6 (System Viz / token telemetry) prompt-context noise reduced ~3-5K tokens/session typical, ~7K worst-case watchdog-heavy session.
```

## Files touched (3)
- .claude/hooks/hook-registry-regen.mjs | 18 ++++++++++++++----
- .claude/hooks/tool-watchdog.mjs       | 12 +++++++++++-
- 2 files changed, 25 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 11eb8c6fc9ee`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-CONTEXT-FORGE-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._