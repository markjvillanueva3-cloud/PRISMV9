# FLEET-INJECTION-BUDGET-AUDIT/U-FIBA-PROMPT-CONTEXT-THROTTLE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-INJECTION-BUDGET-AUDIT]/U-FIBA-PROMPT-CONTEXT-THROTTLE (slot:alpha): kill the every-turn daemon-down notice + verify-correct the audit's false positives.

**Commit:** `791f2073ac6a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T10:55:55-05:00
**Tags:** fleet-injection-budget-audit, u-fiba-prompt-context-throttle, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-INJECTION-BUDGET-AUDIT]/U-FIBA-PROMPT-CONTEXT-THROTTLE (slot:alpha): kill the every-turn daemon-down notice + verify-correct the audit's false positives.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-INJECTION-BUDGET-AUDIT]/U-FIBA-PROMPT-CONTEXT-THROTTLE (slot:alpha): kill the every-turn daemon-down notice + verify-correct the audit's false positives.

A fleet injection-budget audit (10-agent workflow + live measure-injection-budget.mjs) found ~3.2KB/turn floor per slot x 26 slots. VERIFIED each top claim deterministically before acting -- 3 of the 4 'quick wins' were FALSE POSITIVES (sonnet agents miscounted):
 - 'dewire session-start-auto-resume x4 / pre-tool-savings-multi x4 / build-cache-guard x2' -> each is wired under a DIFFERENT matcher (compact/clear/startup/resume; Glob/Grep/Write/Bash; Pre+Post). Dewiring would BREAK auto-resume on 3 triggers. New guard scripts/dedupe-settings-hook-wirings.mjs (collapses ONLY event+matcher+command identical entries; backs up; never deletes a hook) confirms CLEAN.
 - mcp-broadcast-reconnect-inject '40B every turn' -> signal-gated, emits nothing normally.
 - slot-context-bundle-inject '3000B never-dedups lever' -> ALREADY deduped (U-OBS-SLOTBUNDLE-DEDUP, alpha 2026-06-09).

REAL fix shipped: prompt-context-inject re-emitted a 204B 'context-bundle daemon down' notice EVERY turn (daemon down ~32 days, context-bundle.json 46002min old) with no dedup. Now throttled to 1/30min/session via dedupedContext and SUPPRESSED to 0 bytes on repeat; the naive block.slice() is surrogate-guarded (ties to U-SURROGATE-CHOKEPOINT-FLEET). LIVE: fire1=204B, fire2=0B. Saves ~204B/turn x 26 slots on every repeat turn.

Plan + full verification addendum: state/shared/specs/FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md. Lesson (R12 + read-everything rule): a multi-agent audit's MAP + empirical measure are trustworthy; its per-hook sonnet CLAIMS must each be verified before acting -- blindly applying #1 would have broken fleet auto-resume.
```

## Files touched (4)
- .claude/hooks/prompt-context-inject.mjs                       |  23 +++++++--
- scripts/dedupe-settings-hook-wirings.mjs                      | Bin 0 -> 4288 bytes
- state/shared/specs/FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md | 179 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 197 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- Lesson (R12 + read-everything rule): a multi-agent audit's MAP + empirical measure are trustworthy; its per-hook sonnet CLAIMS must each be verified before acting -- blindly applying #1 would have broken fleet auto-resume.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 791f2073ac6a`
- Milestone envelope: `mcp-server/data/milestones/FLEET-INJECTION-BUDGET-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._